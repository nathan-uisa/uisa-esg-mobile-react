import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, Keyboard } from 'react-native';

/**
 * Bloqueio por inatividade (igual ao app do Safety): 5 minutos sem uso e o app pede para confirmar que é a mesma
 * pessoa. "Uso" é tocar na tela (captura no App.tsx) ou estar com o teclado aberto. O último uso fica salvo no
 * aparelho, para valer também quando o app é fechado e aberto de novo.
 */
export const MINUTOS_SEM_USO = 5;
const LIMITE_MS = MINUTOS_SEM_USO * 60_000;
const CHAVE = 'esg.ultimaAtividade';
const GRAVAR_A_CADA_MS = 20_000;

let ultima = Date.now();
let gravadoEm = 0;
let usouNestaExecucao = false;

function gravar() {
  gravadoEm = Date.now();
  void AsyncStorage.setItem(CHAVE, String(ultima)).catch(() => undefined);
}

export function marcarAtividade() {
  usouNestaExecucao = true;
  ultima = Date.now();
  if (ultima - gravadoEm >= GRAVAR_A_CADA_MS) gravar();
}

async function carregar() {
  const salvo = Number(await AsyncStorage.getItem(CHAVE).catch(() => null));
  if (!usouNestaExecucao && Number.isFinite(salvo) && salvo > 0) ultima = Math.min(Date.now(), salvo);
}

const passouDoLimite = (agora = Date.now()) => agora - ultima >= LIMITE_MS;

export async function expirouNaAbertura() {
  await carregar();
  return passouDoLimite();
}

/** Confere ao abrir, a cada 15 s com o app na frente e ao voltar do segundo plano. */
export function observarInatividade(aoExpirar: () => void): () => void {
  let encerrado = false;
  const conferir = () => {
    if (encerrado) return;
    if (Keyboard.isVisible() && AppState.currentState === 'active') { marcarAtividade(); return; }
    if (passouDoLimite()) aoExpirar();
  };
  void carregar().then(conferir);
  const timer = setInterval(() => { if (AppState.currentState === 'active') conferir(); }, 15_000);
  const estado = AppState.addEventListener('change', (s) => { if (s === 'active') conferir(); else gravar(); });
  const teclado = Keyboard.addListener('keyboardDidShow', marcarAtividade);
  return () => { encerrado = true; clearInterval(timer); estado.remove(); teclado.remove(); };
}
