import * as Crypto from 'expo-crypto';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

/**
 * Desbloqueio local, SEM internet (mesma ideia do app do Safety, docs/02_FLUXOS.md):
 *
 *   1. **Trava do próprio aparelho** — digital, rosto ou o PIN/padrão do Android. Quem confere é o sistema.
 *   2. **PIN do app ESG** — 4 a 8 números, para quem está de luva ou com a mão molhada (digital falha) e para
 *      aparelho sem trava de tela. Guardamos só o resumo (SHA-256 com sal), nunca o PIN, e há limite de tentativas:
 *      estouradas, o PIN some e só volta entrando com senha (e internet).
 *
 * O bloqueio não sai do aparelho: a sessão continua no cofre; a tela de bloqueio é que só deixa passar quem provar
 * ser a mesma pessoa.
 */
const SERVICO = 'com.uisa.esg.desbloqueio';
const CHAVE_PIN = 'esg.desbloqueio.pin';

export const TENTATIVAS_PIN = 5;
export const PIN_MIN = 4;
export const PIN_MAX = 8;

type PinGuardado = { sal: string; resumo: string; tentativas: number };
const opcoes = { keychainService: SERVICO, keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY };

/** O aparelho tem trava de tela (digital, rosto, PIN ou padrão)? */
export async function travaDoAparelho() {
  try { return (await LocalAuthentication.getEnrolledLevelAsync()) !== LocalAuthentication.SecurityLevel.NONE; } catch { return false; }
}

/** Tem digital ou rosto cadastrados? (para a tela dizer "digital" só quando é digital mesmo) */
export async function biometriaCadastrada() {
  try {
    const n = await LocalAuthentication.getEnrolledLevelAsync();
    return n === LocalAuthentication.SecurityLevel.BIOMETRIC_STRONG || n === LocalAuthentication.SecurityLevel.BIOMETRIC_WEAK;
  } catch { return false; }
}

export async function confirmarComAparelho(motivo = 'Confirme que é você para voltar ao app ESG') {
  if (!(await travaDoAparelho())) return false;
  const r = await LocalAuthentication.authenticateAsync({ promptMessage: motivo, cancelLabel: 'Usar outro jeito', disableDeviceFallback: false });
  return r.success;
}

const resumir = (sal: string, pin: string) => Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${sal}:${pin}`);

async function lerPin(): Promise<PinGuardado | null> {
  try {
    const raw = await SecureStore.getItemAsync(CHAVE_PIN, opcoes);
    const p = raw ? JSON.parse(raw) : null;
    return typeof p?.sal === 'string' && typeof p?.resumo === 'string' ? { sal: p.sal, resumo: p.resumo, tentativas: Number(p.tentativas ?? TENTATIVAS_PIN) } : null;
  } catch { return null; }
}
const gravarPin = (p: PinGuardado) => SecureStore.setItemAsync(CHAVE_PIN, JSON.stringify(p), opcoes);

export const pinValido = (pin: string) => /^\d+$/.test(pin) && pin.length >= PIN_MIN && pin.length <= PIN_MAX;
export async function temPin() { return Boolean(await lerPin()); }

/** PINs que qualquer um tenta primeiro. */
export function pinFraco(pin: string) {
  if (/^(\d)\1+$/.test(pin)) return true;
  const crescente = '0123456789012', decrescente = '9876543210987';
  return crescente.includes(pin) || decrescente.includes(pin);
}

export async function definirPin(pin: string) {
  if (!pinValido(pin)) throw new Error(`O PIN tem de ter de ${PIN_MIN} a ${PIN_MAX} números.`);
  if (pinFraco(pin)) throw new Error('Esse PIN é fácil de adivinhar (números repetidos ou em sequência). Escolha outro.');
  const sal = Array.from(await Crypto.getRandomBytesAsync(16), (b) => b.toString(16).padStart(2, '0')).join('');
  await gravarPin({ sal, resumo: await resumir(sal, pin), tentativas: TENTATIVAS_PIN });
}

export async function apagarPin() {
  await SecureStore.deleteItemAsync(CHAVE_PIN, opcoes).catch(() => undefined);
}

export type ResultadoPin = { ok: true } | { ok: false; restantes: number };

/** Confere o PIN. Errou todas: o PIN é apagado (só volta entrando com senha). */
export async function conferirPin(pin: string): Promise<ResultadoPin> {
  const g = await lerPin();
  if (!g) return { ok: false, restantes: 0 };
  if ((await resumir(g.sal, pin)) !== g.resumo) {
    const restantes = Math.max(0, g.tentativas - 1);
    if (restantes === 0) await apagarPin(); else await gravarPin({ ...g, tentativas: restantes });
    return { ok: false, restantes };
  }
  if (g.tentativas !== TENTATIVAS_PIN) await gravarPin({ ...g, tentativas: TENTATIVAS_PIN });
  return { ok: true };
}
