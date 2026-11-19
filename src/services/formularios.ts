import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { carregarAmbiente, urlAtual } from './ambiente';
import { ApiError, request, tokenAtual } from './api';
import { acrescentarAoCache, DIAS_NO_APARELHO, lerCache, salvarCache } from './cacheRegistros';
import {
  calculosDaDefinicao, tabelasDaDefinicao, tabelasDosCalculos,
  type CalculoCarregado, type Definicao, type OrigemAnterior, type TabelaCarregada,
} from '../formularios/motor/definicao';

/**
 * Formulários cadastrados no portal (construtor, backend docs/10) dentro do app (docs/06_FORMULARIOS.md).
 *
 * A definição de um formulário é DADO, não código: o app baixa a versão vigente (com as tabelas de referência e os
 * cálculos que ela usa), guarda no aparelho e desenha a tela a partir dela. Publicou uma versão nova no portal? O app
 * troca sozinho, sem loja e sem OTA:
 *   - ao abrir o app e ao voltar para ele (no máximo a cada 5 min), compara a versão de cada formulário (/menu);
 *   - ao abrir um formulário, confere a versão dele;
 *   - em Perfil → "Atualizar formulários", na hora.
 * Sem internet, usa a última versão guardada. OTA só é preciso quando o MOTOR muda (tipo de campo ou operação nova).
 */

export type Dados = Record<string, unknown>;
export type ItemMenu = { chave: string; nome: string; descricao: string; modulo: string; podeAbrir: boolean; versaoId?: string | null };
export type Vigente = { formulario: { chave: string; nome: string; descricao: string; prefixo: string; modulo: string }; versao: { id: string; numero: number }; definicao: Definicao; podeAbrir: boolean };
export type ResumoRegistro = {
  id: string; numero: number; codigo: string; situacao: string; etapas: { nome: string; assumidaPorNome: string | null; minha: boolean; instanciaRotulo?: string | null }[];
  elaborador: string; elaboradorMatricula?: string | null; criadoEm: string; atualizadoEm: string; versaoId: string; dados: Dados;
};
export type Evento = { id: string; acao: string; acaoNome: string | null; etapaDe: string | null; etapaPara: string | null; autorNome: string; comentario: string | null; em: string };
export type Tarefa = { id: string; etapaChave: string; etapaNome: string; situacao: string; assumidaPorNome: string | null; prazo: string | null; minha: boolean; instanciaRotulo?: string | null };
export type DetalheRegistro = {
  formulario: { chave: string; nome: string; prefixo?: string }; versao: { id: string }; definicao: Definicao;
  registro: { id: string; numero: number; codigo: string; situacao: string; elaborador: string; criadoEm: string; atualizadoEm: string; dados: Dados };
  tarefas: Tarefa[]; eventos: Evento[];
};
export type Anexo = { chave: string; nome: string; bytes?: number; tipo?: string };
export type Pessoa = { id: string; nome: string; matricula: string; cargo: string };

/** Tudo o que a tela precisa para abrir o formulário sem internet. */
export type Pacote = { vigente: Vigente; tabelas: Record<string, TabelaCarregada>; calculos: Record<string, CalculoCarregado>; baixadoEm: string };

/** Erro da API de formulários com o erro de cada campo (`campo` ou `grade.linha.coluna`). */
export class ErroFormulario extends Error {
  constructor(mensagem: string, public status: number, public erros: Record<string, string> = {}, public codigo = '') { super(mensagem); }
}

const enc = encodeURIComponent;
const PREFIXO = 'esg.form.';
const RENOVAR_APOS_MS = 12 * 60 * 60 * 1000; // tabelas/cálculos vigentes podem mudar sem versão nova do formulário
const INTERVALO_AUTO_MS = 5 * 60 * 1000;

async function chamar<T>(caminho: string, o: { method?: 'GET' | 'POST'; body?: unknown; timeoutMs?: number } = {}): Promise<T> {
  try {
    return await request<T>(caminho, o);
  } catch (e) {
    if (e instanceof ApiError) throw new ErroFormulario(e.message, e.status, e.erros, e.codigo ?? '');
    throw new ErroFormulario('Não foi possível falar com o servidor do ESG.', 0);
  }
}

// ── API ──────────────────────────────────────────────────────────────────────────────────────────

export const fApi = {
  menu: () => chamar<{ formularios: ItemMenu[] }>('/formularios/menu'),
  vigente: (chave: string) => chamar<Vigente>(`/formularios/${enc(chave)}/vigente`),
  registros: (chave: string) => chamar<{ registros: ResumoRegistro[] }>(`/formularios/${enc(chave)}/registros`),
  detalhe: (id: string) => chamar<DetalheRegistro>(`/formularios/registros/${enc(id)}`),
  /** `chaveEnvio`: a mesma em todo envio do mesmo formulário aberto; repetir devolve o registro já criado. */
  abrir: (chave: string, dados: Dados, acao: string, comentario: string | undefined, chaveEnvio: string) =>
    chamar<DetalheRegistro>(`/formularios/${enc(chave)}/registros`, { method: 'POST', body: { dados, acao, comentario, chaveEnvio }, timeoutMs: 30_000 }),
  anteriores: (chave: string, dados: Dados) =>
    chamar<{ valores: Record<string, unknown>; origens: Record<string, OrigemAnterior | null> }>(`/formularios/${enc(chave)}/anteriores`, { method: 'POST', body: { dados } }),
  tabela: (chave: string) => chamar<TabelaCarregada>(`/tabelas-referencia/${enc(chave)}/conteudo`),
  calculo: (chave: string, versao: number) => chamar<CalculoCarregado>(`/calculos/${enc(chave)}/conteudo?versao=${versao}`),
  pessoas: (q: string) => chamar<{ pessoas: Pessoa[] }>(`/grupos/pessoas?q=${enc(q)}`),
};

/** Foto ou arquivo do aparelho para um campo "Anexo" (o servidor confere tipo e tamanho). */
export async function enviarAnexo(chave: string, arquivo: { uri: string; nome: string; tipo: string }): Promise<Anexo> {
  const base = await urlAtual();
  const token = await tokenAtual();
  const fd = new FormData();
  fd.append('arquivo', { uri: arquivo.uri, name: arquivo.nome, type: arquivo.tipo } as unknown as Blob);
  let res: Response;
  try {
    res = await fetch(`${base}/api/v1/formularios/${enc(chave)}/anexos`, {
      method: 'POST', body: fd, headers: { Accept: 'application/json', 'X-Esg-Client': 'app', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    });
  } catch {
    throw new ErroFormulario('Sem conexão com o servidor: a foto precisa de internet para subir.', 0);
  }
  const corpo = await res.json().catch(() => null);
  if (!res.ok) throw new ErroFormulario(corpo?.mensagem ?? 'Não foi possível enviar o arquivo.', res.status);
  return corpo as Anexo;
}

// ── Guardado no aparelho ─────────────────────────────────────────────────────────────────────────

async function chave(nome: string) { return `${PREFIXO}${await carregarAmbiente()}.${nome}`; }

async function ler<T>(nome: string): Promise<T | null> {
  try { const v = await AsyncStorage.getItem(await chave(nome)); return v ? (JSON.parse(v) as T) : null; } catch { return null; }
}
async function gravar(nome: string, v: unknown) {
  try { await AsyncStorage.setItem(await chave(nome), JSON.stringify(v)); } catch { /* conveniência */ }
}

export type MenuGuardado = { itens: ItemMenu[]; atualizadoEm: string };
export const lerMenu = () => ler<MenuGuardado>('_menu');
export const lerPacote = (form: string) => ler<Pacote>(`def.${form}`);

/** Sair da conta ou trocar de servidor: as definições guardadas vão junto. */
export async function apagarFormularios() {
  try {
    const chaves = (await AsyncStorage.getAllKeys()).filter((k) => k.startsWith(PREFIXO));
    if (chaves.length) await AsyncStorage.multiRemove(chaves);
  } catch { /* idem */ }
  avisar();
}

/** Baixa a versão vigente com as tabelas e os cálculos que ela usa. */
async function baixarPacote(form: string, vigente?: Vigente): Promise<Pacote> {
  const v = vigente ?? (await fApi.vigente(form));
  const calculos: Record<string, CalculoCarregado> = {};
  for (const c of calculosDaDefinicao(v.definicao)) {
    const k = `${c.chave}@${c.versao}`;
    calculos[k] = await fApi.calculo(c.chave, c.versao);
  }
  const tabelas: Record<string, TabelaCarregada> = {};
  for (const t of new Set([...tabelasDaDefinicao(v.definicao), ...tabelasDosCalculos(Object.values(calculos))])) tabelas[t] = await fApi.tabela(t);
  const p: Pacote = { vigente: v, tabelas, calculos, baixadoEm: new Date().toISOString() };
  await gravar(`def.${form}`, p);
  return p;
}

// Quem mostra formulários escuta aqui para redesenhar quando uma versão nova chega.
const ouvintes = new Set<() => void>();
function avisar() { ouvintes.forEach((f) => f()); }
export function useMudancaFormularios(fn: () => void) {
  useEffect(() => { ouvintes.add(fn); return () => { ouvintes.delete(fn); }; }, [fn]);
}

export type ResultadoSync = { total: number; atualizados: string[]; erro?: string };
let ultimaSync = 0;
let emCurso: Promise<ResultadoSync> | null = null;

/**
 * Compara a versão de cada formulário do menu com a guardada e baixa só o que mudou (ou tudo, com `forcar`).
 * Formulário que saiu do menu (desativado, sem acesso) sai do aparelho.
 */
export function sincronizarFormularios(forcar = false): Promise<ResultadoSync> {
  if (emCurso) return emCurso;
  emCurso = (async () => {
    try {
      const { formularios } = await fApi.menu();
      await gravar('_menu', { itens: formularios, atualizadoEm: new Date().toISOString() } satisfies MenuGuardado);
      const atualizados: string[] = [];
      for (const item of formularios) {
        const atual = await lerPacote(item.chave);
        const velho = !atual || Date.now() - Date.parse(atual.baixadoEm) > RENOVAR_APOS_MS;
        if (forcar || velho || atual?.vigente.versao.id !== item.versaoId) {
          try {
            const novo = await baixarPacote(item.chave);
            if (atual?.vigente.versao.id !== novo.vigente.versao.id) atualizados.push(item.nome);
          } catch { /* um formulário com problema não impede os outros */ }
        }
      }
      const manter = new Set(formularios.map((f) => `def.${f.chave}`));
      const raiz = `${PREFIXO}${await carregarAmbiente()}.def.`;
      const todas = (await AsyncStorage.getAllKeys()).filter((k) => k.startsWith(raiz));
      const sobra = todas.filter((k) => !manter.has(`def.${k.slice(raiz.length)}`));
      if (sobra.length) await AsyncStorage.multiRemove(sobra);
      ultimaSync = Date.now();
      return { total: formularios.length, atualizados };
    } catch (e) {
      return { total: 0, atualizados: [], erro: e instanceof Error ? e.message : 'Falha ao atualizar os formulários.' };
    } finally {
      emCurso = null;
      avisar();
    }
  })();
  return emCurso;
}

/** Automático: ao entrar e ao voltar ao app, no máximo a cada 5 min. Devolve a função que desliga. */
export function iniciarSincronizacaoFormularios(): () => void {
  const talvez = () => { if (Date.now() - ultimaSync > INTERVALO_AUTO_MS) void sincronizarFormularios(); };
  talvez();
  const sub = AppState.addEventListener('change', (e) => { if (e === 'active') talvez(); });
  return () => sub.remove();
}

/**
 * Pacote de um formulário para a tela: o guardado na hora e, com internet, a conferência da versão vigente
 * (troca sozinho se o portal publicou outra). `doAparelho` = não deu para conferir agora.
 */
export function useFormulario(form: string) {
  const [pacote, setPacote] = useState<Pacote | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [doAparelho, setDoAparelho] = useState(false);

  const conferir = useCallback(async () => {
    setCarregando(true);
    const guardado = await lerPacote(form);
    if (guardado) setPacote((p) => p ?? guardado);
    try {
      const v = await fApi.vigente(form);
      const velho = !guardado || Date.now() - Date.parse(guardado.baixadoEm) > RENOVAR_APOS_MS;
      const p = guardado && !velho && guardado.vigente.versao.id === v.versao.id ? { ...guardado, vigente: v } : await baixarPacote(form, v);
      setPacote(p);
      setDoAparelho(false);
      setErro('');
    } catch (e) {
      const semServidor = !(e instanceof ErroFormulario) || e.status === 0 || e.status >= 500;
      if (guardado && semServidor) {
        setDoAparelho(true);
        setErro('');
      } else {
        setErro(e instanceof Error ? e.message : 'Não foi possível abrir o formulário.');
      }
    } finally {
      setCarregando(false);
    }
  }, [form]);

  useEffect(() => { void conferir(); }, [conferir]);
  useMudancaFormularios(useCallback(() => { void lerPacote(form).then((p) => { if (p) setPacote(p); }); }, [form]));
  return { pacote, carregando, erro, doAparelho, conferir };
}

/** Uma chave por formulário aberto: o mesmo envio repetido (rede caiu) não duplica o registro. */
export const novaChaveEnvio = () => Crypto.randomUUID();

// ── Registros e menu para as telas ───────────────────────────────────────────────────────────────

/** Chave da cópia dos registros do formulário no aparelho (cacheRegistros.ts, últimos 30 dias). */
export const cacheDoFormulario = (form: string) => `form:${form}`;

/**
 * Registros do formulário que a pessoa pode ver: do servidor, ou da cópia dos últimos 30 dias sem ele.
 * Registro recém-enviado entra na lista na hora (`acrescentar`).
 */
export function useRegistrosFormulario(form: string) {
  const [registros, setRegistros] = useState<ResumoRegistro[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [doAparelho, setDoAparelho] = useState(false);
  const recarregar = useCallback(async () => {
    setCarregando(true);
    setErro('');
    try {
      const r = await fApi.registros(form);
      setRegistros(r.registros);
      setDoAparelho(false);
      void salvarCache(cacheDoFormulario(form), r.registros);
    } catch (e) {
      const semServidor = !(e instanceof ErroFormulario) || e.status === 0 || e.status >= 500;
      const copia = semServidor ? await lerCache<ResumoRegistro>(cacheDoFormulario(form)) : null;
      if (copia) {
        setRegistros(copia.registros);
        setDoAparelho(true);
        setErro(`Sem conexão com o servidor. Mostrando o que este aparelho guardou dos últimos ${DIAS_NO_APARELHO} dias.`);
      } else setErro(e instanceof Error ? e.message : 'Não foi possível carregar os registros.');
    } finally { setCarregando(false); }
  }, [form]);
  useEffect(() => { void recarregar(); }, [recarregar]);
  useEffect(() => {
    const f = (chave: string, r: ResumoRegistro) => { if (chave === form) setRegistros((l) => [r, ...l.filter((x) => x.id !== r.id)]); };
    novosRegistros.add(f);
    return () => { novosRegistros.delete(f); };
  }, [form]);
  return { registros, carregando, erro, doAparelho, recarregar };
}

const novosRegistros = new Set<(form: string, r: ResumoRegistro) => void>();

/** Depois de enviar: o registro entra na cópia do aparelho e nas listas abertas. */
export function registroEnviado(form: string, d: DetalheRegistro) {
  const r: ResumoRegistro = {
    id: d.registro.id, numero: d.registro.numero, codigo: d.registro.codigo, situacao: d.registro.situacao,
    etapas: d.tarefas.filter((t) => t.situacao === 'aberta').map((t) => ({ nome: t.etapaNome, assumidaPorNome: t.assumidaPorNome, minha: t.minha, instanciaRotulo: t.instanciaRotulo })),
    elaborador: d.registro.elaborador, criadoEm: d.registro.criadoEm, atualizadoEm: d.registro.atualizadoEm, versaoId: d.versao.id, dados: d.registro.dados,
  };
  void acrescentarAoCache(cacheDoFormulario(form), r);
  novosRegistros.forEach((f) => f(form, r));
}

/** Formulários do menu guardados no aparelho (redesenha quando a sincronização traz novidade). */
export function useMenuFormularios() {
  const [menu, setMenu] = useState<MenuGuardado | null>(null);
  const ler = useCallback(() => { void lerMenu().then(setMenu); }, []);
  useEffect(ler, [ler]);
  useMudancaFormularios(ler);
  return menu;
}
