import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { ApiError, definirAoExpirarSessao, request, setToken, tokenAtual } from './api';
import { salvarAmbiente, type Ambiente } from './ambiente';
import { apagarBiometriaLocal, ativarDigital as ativarNoServidor, desativarDigital as desativarNoServidor, digitalDisponivel, entrarComDigital, lerBiometria } from './biometria';
import { apagarPin, temPin as haPin } from './desbloqueio';
import { apagarCaches } from './cacheRegistros';
import { expirouNaAbertura, marcarAtividade, observarInatividade } from './inatividade';

/** Usuário como o backend devolve em /auth/login e /auth/me. */
export type Usuario = {
  id: string; matricula: string; nome: string; email: string; cargo: string; unidade: string; setor: string;
  papelId: string; papelNome: string; admin: boolean; permissoes: string[]; authProvider: 'ad' | 'senha'; temSenhaPropria: boolean;
};
type Sessao = { token: string; usuario: Usuario };
export type PedidoTroca = { trocarSenha: true; tokenTroca: string; nome: string; mensagem?: string };

type Ctx = {
  pronto: boolean;
  usuario: Usuario | null;
  /** Tela de bloqueio por cima de tudo (5 min sem uso ou app reaberto): as telas continuam montadas por baixo. */
  bloqueado: boolean;
  aviso: string | null;
  digitalAtiva: boolean;
  digitalNoAparelho: boolean;
  temPin: boolean;
  /** Muda quando outra pessoa entra ou a sessão acaba: o App usa como `key` para descartar as telas anteriores. */
  geracao: number;
  login: (identificador: string, senha: string) => Promise<PedidoTroca | null>;
  criarSenha: (tokenTroca: string, novaSenha: string) => Promise<void>;
  loginDigital: () => Promise<void>;
  desbloquear: () => void;
  logout: (aviso?: string) => Promise<void>;
  ativarDigital: () => Promise<void>;
  desativarDigital: () => Promise<void>;
  atualizarAcessoRapido: () => Promise<void>;
  trocarAmbiente: (novo: Ambiente) => Promise<void>;
  pode: (permissao: string) => boolean;
};

const USUARIO = 'esg.usuario';
const Contexto = createContext<Ctx | null>(null);

export class LoginError extends Error {}

function mensagemDe(e: unknown, padrao: string) {
  if (e instanceof ApiError) return e.status >= 500 ? 'O servidor do ESG não respondeu. Tente de novo em instantes.' : e.message;
  return e instanceof Error ? e.message : padrao;
}

export function SessaoProvider({ children }: { children: React.ReactNode }) {
  const [pronto, setPronto] = useState(false);
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [bloqueado, setBloqueado] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [geracao, setGeracao] = useState(0);
  const [digitalAtiva, setDigitalAtiva] = useState(false);
  const [digitalNoAparelho, setDigitalNoAparelho] = useState(false);
  const [temPin, setTemPin] = useState(false);
  const usuarioRef = useRef<Usuario | null>(null);
  useEffect(() => { usuarioRef.current = usuario; }, [usuario]);

  const atualizarAcessoRapido = useCallback(async () => {
    const [meta, disp, pin] = await Promise.all([lerBiometria(), digitalDisponivel(), haPin()]);
    setDigitalAtiva(Boolean(meta));
    setDigitalNoAparelho(disp);
    setTemPin(pin);
  }, []);

  /** Confere a sessão no servidor e atualiza papel e permissões (sem bloquear a tela). */
  const revalidar = useCallback(async () => {
    try {
      const r = await request<{ usuario: Usuario }>('/auth/me');
      setUsuario(r.usuario);
      await AsyncStorage.setItem(USUARIO, JSON.stringify(r.usuario));
    } catch { /* sem rede: segue com o que tem; 401 já é tratado pelo aoExpirar */ }
  }, []);

  const iniciar = useCallback(async (s: Sessao) => {
    const anterior = usuarioRef.current;
    if (anterior && anterior.id !== s.usuario.id) setGeracao((g) => g + 1);
    await setToken(s.token);
    await AsyncStorage.setItem(USUARIO, JSON.stringify(s.usuario));
    marcarAtividade();
    setAviso(null);
    setBloqueado(false);
    setUsuario(s.usuario);
  }, []);

  const logout = useCallback(async (motivo?: string) => {
    if (await tokenAtual()) await request('/auth/logout', { method: 'POST', timeoutMs: 6000 }).catch(() => undefined);
    await setToken(null);
    await AsyncStorage.removeItem(USUARIO);
    await apagarPin();
    await apagarCaches();
    setGeracao((g) => g + 1);
    setBloqueado(false);
    setUsuario(null);
    setAviso(motivo ?? null);
    await atualizarAcessoRapido();
  }, [atualizarAcessoRapido]);

  // Abertura: restaura a sessão salva; reaberto depois de 5 min sem uso, já abre bloqueado.
  useEffect(() => {
    void (async () => {
      try {
        await atualizarAcessoRapido();
        const raw = await AsyncStorage.getItem(USUARIO);
        if (raw && (await tokenAtual())) {
          setUsuario(JSON.parse(raw) as Usuario);
          if (await expirouNaAbertura()) setBloqueado(true);
          else void revalidar();
        }
      } finally {
        setPronto(true);
      }
    })();
  }, [atualizarAcessoRapido, revalidar]);

  // Token recusado pelo servidor (expirou, senha trocada, cadastro inativado): volta ao login explicando.
  useEffect(() => {
    definirAoExpirarSessao(() => { void logout('Sua sessão terminou. Entre de novo para continuar.'); });
    return () => definirAoExpirarSessao(null);
  }, [logout]);

  useEffect(() => {
    if (!usuario || bloqueado) return;
    return observarInatividade(() => setBloqueado(true));
  }, [usuario, bloqueado]);

  const oferecerDigital = useCallback(async (u: Usuario) => {
    const meta = await lerBiometria();
    if (meta && meta.dono !== u.id) await apagarBiometriaLocal();
    await atualizarAcessoRapido();
    if ((meta?.dono === u.id && Date.parse(meta.expiraEm) > Date.now()) || !(await digitalDisponivel())) return;
    Alert.alert('Entrar com a digital?', 'Nos próximos acessos você entra só com o dedo. Sua senha não fica no aparelho.', [
      { text: 'Agora não', style: 'cancel' },
      { text: 'Ativar', onPress: () => { void ativarNoServidor(u.id).then(atualizarAcessoRapido).catch((e) => Alert.alert('Digital', mensagemDe(e, 'Não foi possível ativar a digital.'))); } },
    ]);
  }, [atualizarAcessoRapido]);

  const login = useCallback(async (identificador: string, senha: string) => {
    let r: Sessao | PedidoTroca;
    try {
      r = await request<Sessao | PedidoTroca>('/auth/login', { method: 'POST', body: { identificador: identificador.trim(), senha }, anonimo: true, timeoutMs: 35_000 });
    } catch (e) { throw new LoginError(mensagemDe(e, 'Não foi possível entrar.')); }
    if ('trocarSenha' in r) return r;
    await iniciar(r);
    void oferecerDigital(r.usuario);
    return null;
  }, [iniciar, oferecerDigital]);

  const criarSenha = useCallback(async (tokenTroca: string, novaSenha: string) => {
    let r: Sessao;
    try {
      r = await request<Sessao>('/auth/senha/primeiro-acesso', { method: 'POST', body: { tokenTroca, novaSenha }, anonimo: true, timeoutMs: 20_000 });
    } catch (e) { throw new LoginError(mensagemDe(e, 'Não foi possível criar a senha.')); }
    await iniciar(r);
    void oferecerDigital(r.usuario);
  }, [iniciar, oferecerDigital]);

  const loginDigital = useCallback(async () => {
    try { await iniciar(await entrarComDigital<Sessao>()); }
    catch (e) { await atualizarAcessoRapido(); throw new LoginError(mensagemDe(e, 'Não foi possível entrar com a digital.')); }
  }, [iniciar, atualizarAcessoRapido]);

  const desbloquear = useCallback(() => {
    marcarAtividade();
    setBloqueado(false);
    void revalidar();
  }, [revalidar]);

  const ativarDigital = useCallback(async () => {
    const u = usuarioRef.current;
    if (!u) return;
    try { await ativarNoServidor(u.id); }
    catch (e) {
      if (e instanceof ApiError && e.codigo === 'LOGIN_NORMAL_NECESSARIO') throw new Error('Para ativar a digital, saia e entre de novo com a senha (o servidor exige um login recente).');
      throw new Error(mensagemDe(e, 'Não foi possível ativar a digital.'));
    } finally { await atualizarAcessoRapido(); }
  }, [atualizarAcessoRapido]);

  const desativarDigital = useCallback(async () => {
    await desativarNoServidor();
    await atualizarAcessoRapido();
  }, [atualizarAcessoRapido]);

  /** Trocar de servidor apaga a sessão e a digital (são do servidor anterior). */
  const trocarAmbiente = useCallback(async (novo: Ambiente) => {
    await setToken(null);
    await AsyncStorage.removeItem(USUARIO);
    await apagarBiometriaLocal();
    await apagarCaches();
    await salvarAmbiente(novo);
    setUsuario(null);
    await atualizarAcessoRapido();
  }, [atualizarAcessoRapido]);

  const pode = useCallback((p: string) => Boolean(usuario && (usuario.admin || usuario.permissoes.includes(p))), [usuario]);

  const valor = useMemo<Ctx>(() => ({
    pronto, usuario, bloqueado, aviso, digitalAtiva, digitalNoAparelho, temPin, geracao,
    login, criarSenha, loginDigital, desbloquear, logout, ativarDigital, desativarDigital, atualizarAcessoRapido, trocarAmbiente, pode,
  }), [pronto, usuario, bloqueado, aviso, digitalAtiva, digitalNoAparelho, temPin, geracao, login, criarSenha, loginDigital, desbloquear, logout, ativarDigital, desativarDigital, atualizarAcessoRapido, trocarAmbiente, pode]);

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useSessao() {
  const v = useContext(Contexto);
  if (!v) throw new Error('SessaoProvider ausente.');
  return v;
}
