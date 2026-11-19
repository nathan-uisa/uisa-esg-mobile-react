import * as Crypto from 'expo-crypto';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError, request } from './api';
import { acrescentarAoCache, DIAS_NO_APARELHO, lerCache, salvarCache } from './cacheRegistros';
import { formatarDataHora } from '../agua/numeros';

/**
 * Registros de um processo do Portal ESG (`/api/v1/processos/:processo/registros`, tabela `esg_processos_registros`).
 * Número, data/hora e elaborador são carimbados pelo servidor. O mesmo contrato do portal web (processos/registros.ts).
 */
export type Registro<D> = { id: string; numero: number; criadoEm: string; elaborador: string; elaboradorMatricula?: string | null; dados: D };

/** Quem grava avisa as outras telas abertas do mesmo processo (a lista atrás do formulário já mostra o novo). */
const ouvintes = new Map<string, Set<(r: Registro<unknown>) => void>>();
function avisar(processo: string, r: Registro<unknown>) { ouvintes.get(processo)?.forEach((f) => f(r)); }

/** Sem resposta do servidor (rede, tempo esgotado, 5xx): aí vale mostrar a cópia do aparelho. Erro 4xx é regra e não. */
const semServidor = (e: unknown) => !(e instanceof ApiError) || e.status === 0 || e.status >= 500;

/**
 * Lista e grava. A lista vem do servidor; sem resposta dele, vem da cópia dos últimos 30 dias guardada no aparelho
 * (`cacheRegistros.ts`) e `doAparelho` fica verdadeiro. Um envio por vez e uma `chaveEnvio` por envio: se a rede cair no meio e a pessoa tocar de novo com
 * os mesmos dados, vai a mesma chave e o servidor devolve o que já tinha gravado (não duplica).
 */
export function useRegistros<D>(processo: string, valido?: (dados: unknown) => boolean) {
  const [registros, setRegistros] = useState<Registro<D>[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [doAparelho, setDoAparelho] = useState(false);
  const emVoo = useRef<Promise<Registro<D>> | null>(null);
  const tentativa = useRef<{ json: string; chave: string } | null>(null);

  const recarregar = useCallback(async () => {
    setCarregando(true);
    setErro('');
    try {
      const r = await request<{ registros?: Registro<D>[] }>(`/processos/${encodeURIComponent(processo)}/registros`);
      // Registro de outro formato (ex.: feito pelo formulário cadastrado no portal) fica de fora: as contas não o entendem.
      const lista = (Array.isArray(r.registros) ? r.registros : []).filter((x) => !valido || valido(x.dados));
      setRegistros(lista);
      setDoAparelho(false);
      void salvarCache(processo, lista);
    } catch (e) {
      const copia = semServidor(e) ? await lerCache<Registro<D>>(processo) : null;
      if (copia) {
        setRegistros(copia.registros.filter((x) => !valido || valido(x.dados)));
        setDoAparelho(true);
        setErro(`Sem conexão com o servidor. Mostrando o que este aparelho guardou dos últimos ${DIAS_NO_APARELHO} dias (atualizado em ${formatarDataHora(copia.guardadoEm)}).`);
      } else {
        setDoAparelho(false);
        setErro(e instanceof ApiError ? e.message : 'Não foi possível carregar os registros.');
      }
    } finally {
      setCarregando(false);
    }
  }, [processo]);

  useEffect(() => { void recarregar(); }, [recarregar]);

  useEffect(() => {
    const f = (novo: Registro<unknown>) => setRegistros((l) => [novo as Registro<D>, ...l.filter((r) => r.id !== novo.id)]);
    if (!ouvintes.has(processo)) ouvintes.set(processo, new Set());
    ouvintes.get(processo)!.add(f);
    return () => { ouvintes.get(processo)?.delete(f); };
  }, [processo]);

  const registrar = useCallback((dados: D): Promise<Registro<D>> => {
    if (emVoo.current) return emVoo.current;
    const envio = (async () => {
      const json = JSON.stringify(dados);
      if (tentativa.current?.json !== json) tentativa.current = { json, chave: Crypto.randomUUID() };
      const novo = await request<Registro<D>>(`/processos/${encodeURIComponent(processo)}/registros`, {
        method: 'POST', body: { dados, chaveEnvio: tentativa.current.chave }, timeoutMs: 25_000,
      });
      tentativa.current = null;
      void acrescentarAoCache(processo, novo);
      avisar(processo, novo as Registro<unknown>);
      return novo;
    })();
    emVoo.current = envio;
    void envio.finally(() => { emVoo.current = null; }).catch(() => undefined);
    return envio;
  }, [processo]);

  return { registros, carregando, erro, doAparelho, recarregar, registrar };
}
