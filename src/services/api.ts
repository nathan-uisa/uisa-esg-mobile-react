import * as SecureStore from 'expo-secure-store';
import NetInfo from '@react-native-community/netinfo';
import { urlAtual } from './ambiente';

/**
 * Cliente do backend do ESG (`/api/v1`). O token da sessão fica no cofre do aparelho (expo-secure-store / Keystore),
 * nunca no AsyncStorage. Quem reabre o app depois de 5 min (ou fica 5 min sem usar) passa pela tela de bloqueio
 * — digital, trava do aparelho ou PIN do app — antes de voltar a usá-lo (services/desbloqueio.ts).
 */
const TOKEN_KEY = 'esg.token';
let tokenCache: string | null | undefined;

export async function setToken(token: string | null) {
  tokenCache = token;
  if (token) await SecureStore.setItemAsync(TOKEN_KEY, token);
  else await SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => undefined);
}

export async function tokenAtual() {
  if (tokenCache === undefined) tokenCache = await SecureStore.getItemAsync(TOKEN_KEY).catch(() => null);
  return tokenCache;
}

export class ApiError extends Error {
  constructor(public status: number, message: string, public codigo?: string) {
    super(message);
  }
}

/** Erros de regra do backend vêm como `{ codigoErro, mensagem }` (às vezes dentro de `message`). */
function lerErro(corpo: any, status: number): ApiError {
  const interno = corpo?.message && typeof corpo.message === 'object' ? corpo.message : corpo;
  const lista = Array.isArray(corpo?.message) ? corpo.message.join(' · ') : undefined;
  const mensagem = interno?.mensagem ?? lista ?? (typeof corpo?.message === 'string' ? corpo.message : undefined) ?? corpo?.error;
  return new ApiError(status, mensagem ? String(mensagem) : `O servidor respondeu ${status}.`, interno?.codigoErro);
}

type Opcoes = { method?: 'GET' | 'POST' | 'PUT' | 'DELETE'; body?: unknown; timeoutMs?: number; anonimo?: boolean };

let aoExpirar: (() => void) | null = null;
/** A sessão registra aqui o que fazer quando o servidor recusar o token (voltar ao login). */
export function definirAoExpirarSessao(fn: (() => void) | null) { aoExpirar = fn; }

export async function request<T>(caminho: string, o: Opcoes = {}): Promise<T> {
  const rede = await NetInfo.fetch().catch(() => null);
  if (rede && rede.isConnected === false) throw new ApiError(0, 'Sem internet. Conecte-se e tente de novo.', 'SEM_CONEXAO');
  const base = await urlAtual();
  const token = o.anonimo ? null : await tokenAtual();
  const controle = new AbortController();
  const timer = setTimeout(() => controle.abort(), o.timeoutMs ?? 15_000);
  try {
    const res = await fetch(`${base}/api/v1${caminho}`, {
      method: o.method ?? 'GET',
      signal: controle.signal,
      headers: {
        Accept: 'application/json',
        'X-Esg-Client': 'app',
        ...(o.body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: o.body === undefined ? undefined : JSON.stringify(o.body),
    });
    const texto = await res.text();
    let corpo: unknown = undefined;
    try { corpo = texto ? JSON.parse(texto) : undefined; } catch { /* sem JSON */ }
    if (!res.ok) {
      const erro = lerErro(corpo, res.status);
      if (token && res.status === 401 && ['SESSAO_INVALIDA', 'METODO_DESATIVADO'].includes(erro.codigo ?? '')) aoExpirar?.();
      throw erro;
    }
    return corpo as T;
  } catch (e) {
    if (e instanceof ApiError) throw e;
    if (controle.signal.aborted) throw new ApiError(0, 'O servidor demorou para responder. Tente de novo em instantes.', 'TEMPO_ESGOTADO');
    throw new ApiError(0, 'Não foi possível falar com o servidor do ESG. Confira a internet e tente de novo.', 'SEM_CONEXAO');
  } finally {
    clearTimeout(timer);
  }
}
