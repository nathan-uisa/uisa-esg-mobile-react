import AsyncStorage from '@react-native-async-storage/async-storage';
import { carregarAmbiente } from './ambiente';

/**
 * Cópia no aparelho dos registros dos últimos 30 dias de cada processo (docs/03_ARQUITETURA.md, "Cache de registros").
 *
 * - Para que serve: sem internet, as listas e a leitura anterior da Vazão continuam aparecendo.
 * - O servidor é sempre a fonte: a cópia é regravada a cada busca bem-sucedida e só é usada quando o servidor não
 *   responde (sem rede, tempo esgotado ou erro 5xx).
 * - Registro com mais de 30 dias (pela data em que o servidor o gravou) sai só da cópia, nunca do servidor.
 * - Uma cópia por servidor (QLD/PRD) e por processo; sair da conta ou trocar de servidor apaga todas.
 */
export const DIAS_NO_APARELHO = 30;
const PREFIXO = 'esg.cache.registros.';

type Guardado<R> = { guardadoEm: string; registros: R[] };
type ComData = { criadoEm: string };

async function chave(processo: string) { return `${PREFIXO}${await carregarAmbiente()}.${processo}`; }

/** Só o que tem até 30 dias. Data ilegível conta como vencida (não ocupa espaço à toa). */
export function dentroDoPrazo<R extends ComData>(registros: R[], agora = Date.now()): R[] {
  const limite = agora - DIAS_NO_APARELHO * 24 * 60 * 60 * 1000;
  return registros.filter((r) => { const t = Date.parse(r.criadoEm); return Number.isFinite(t) && t >= limite; });
}

/** Lê a cópia já sem os vencidos; se havia vencidos, regrava sem eles. */
export async function lerCache<R extends ComData>(processo: string): Promise<Guardado<R> | null> {
  try {
    const k = await chave(processo);
    const bruto = await AsyncStorage.getItem(k);
    if (!bruto) return null;
    const g = JSON.parse(bruto) as Guardado<R>;
    if (!Array.isArray(g?.registros)) { await AsyncStorage.removeItem(k); return null; }
    const validos = dentroDoPrazo(g.registros);
    if (validos.length !== g.registros.length) {
      if (validos.length) await AsyncStorage.setItem(k, JSON.stringify({ ...g, registros: validos }));
      else await AsyncStorage.removeItem(k);
    }
    return validos.length ? { guardadoEm: g.guardadoEm, registros: validos } : null;
  } catch {
    return null;
  }
}

/** Grava o que veio do servidor (só os últimos 30 dias). */
export async function salvarCache<R extends ComData>(processo: string, registros: R[]) {
  try {
    const k = await chave(processo);
    const validos = dentroDoPrazo(registros);
    if (validos.length) await AsyncStorage.setItem(k, JSON.stringify({ guardadoEm: new Date().toISOString(), registros: validos }));
    else await AsyncStorage.removeItem(k);
  } catch { /* cache é conveniência: falhar aqui não pode quebrar a tela */ }
}

/** Registro recém-gravado entra na cópia sem esperar a próxima busca (mantém a data da última sincronização). */
export async function acrescentarAoCache<R extends ComData & { id: string }>(processo: string, novo: R) {
  try {
    const atual = await lerCache<R>(processo);
    const registros = dentroDoPrazo([novo, ...(atual?.registros ?? []).filter((r) => r.id !== novo.id)]);
    await AsyncStorage.setItem(await chave(processo), JSON.stringify({ guardadoEm: atual?.guardadoEm ?? new Date().toISOString(), registros }));
  } catch { /* idem */ }
}

/** Sair da conta ou trocar de servidor: nenhum registro fica para a próxima pessoa. */
export async function apagarCaches() {
  try {
    const chaves = (await AsyncStorage.getAllKeys()).filter((k) => k.startsWith(PREFIXO));
    if (chaves.length) await AsyncStorage.multiRemove(chaves);
  } catch { /* idem */ }
}
