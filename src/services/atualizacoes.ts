import * as Updates from 'expo-updates';
import { AppState } from 'react-native';
import { useSyncExternalStore } from 'react';

/**
 * Atualizações OTA (Expo Updates v1, servidor no backend do ESG: /api/v1/updates/manifest, docs/04_OPERACAO-OTA.md).
 *
 * O app procura ao abrir e sempre que volta para a frente. Achou: baixa em segundo plano e só aplica (recarrega)
 * numa tela de chegada — Início, Login ou Perfil —, nunca no meio de um registro. Sem atualização, nada acontece.
 */
const TELAS_SEGURAS = new Set(['Login', 'Inicio', 'Perfil', 'Atualizacoes']);
const INTERVALO_MIN_MS = 10 * 60_000;

type Estado = { procurando: boolean; pronta: boolean; ultimaVerificacao: number | null; erro: string | null };
let estado: Estado = { procurando: false, pronta: false, ultimaVerificacao: null, erro: null };
const ouvintes = new Set<() => void>();
const mudar = (x: Partial<Estado>) => { estado = { ...estado, ...x }; ouvintes.forEach((f) => f()); };

let telaAtual: string | undefined;
let aplicando = false;

async function aplicarSeSeguro() {
  if (!estado.pronta || aplicando || !telaAtual || !TELAS_SEGURAS.has(telaAtual)) return;
  aplicando = true;
  try { await Updates.reloadAsync(); } catch { aplicando = false; }
}

/** Procura e baixa. `manual` ignora o intervalo mínimo (botão da tela de atualizações). */
export async function procurarAtualizacao(manual = false): Promise<'sem-atualizacao' | 'baixada' | 'indisponivel'> {
  if (!Updates.isEnabled || __DEV__) return 'indisponivel';
  if (estado.procurando) return 'sem-atualizacao';
  if (!manual && estado.ultimaVerificacao && Date.now() - estado.ultimaVerificacao < INTERVALO_MIN_MS) return estado.pronta ? 'baixada' : 'sem-atualizacao';
  mudar({ procurando: true, erro: null });
  try {
    const r = await Updates.checkForUpdateAsync();
    if (!r.isAvailable && !r.isRollBackToEmbedded) { mudar({ procurando: false, ultimaVerificacao: Date.now() }); return 'sem-atualizacao'; }
    await Updates.fetchUpdateAsync();
    mudar({ procurando: false, pronta: true, ultimaVerificacao: Date.now() });
    void aplicarSeSeguro();
    return 'baixada';
  } catch (e) {
    mudar({ procurando: false, ultimaVerificacao: Date.now(), erro: e instanceof Error ? e.message : 'Não foi possível procurar atualização.' });
    return 'indisponivel';
  }
}

/** Liga a procura automática (ao voltar para a frente). Devolve quem desliga. */
export function iniciarAtualizacoes() {
  void procurarAtualizacao();
  const sub = AppState.addEventListener('change', (s) => { if (s === 'active') void procurarAtualizacao(); });
  return () => sub.remove();
}

/** O navegador avisa a tela atual: chegando numa tela de chegada com atualização pronta, aplica. */
export function aoMudarDeTela(tela: string | undefined) {
  telaAtual = tela;
  void aplicarSeSeguro();
}

export const aplicarAgora = () => Updates.reloadAsync();

export function useAtualizacoes() {
  return useSyncExternalStore((f) => { ouvintes.add(f); return () => { ouvintes.delete(f); }; }, () => estado, () => estado);
}

/** O que está rodando agora, para a tela de atualizações e para o suporte. */
export function versaoEmUso() {
  return {
    canal: Updates.channel || '—',
    runtimeVersion: Updates.runtimeVersion || '—',
    updateId: Updates.updateId,
    embarcada: Updates.isEmbeddedLaunch,
    criadaEm: Updates.createdAt,
  };
}
