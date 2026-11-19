import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Device from 'expo-device';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { ApiError, request } from './api';

/**
 * Entrar pela digital (backend: /api/v1/auth/biometria, docs/03_ARQUITETURA.md). O servidor entrega um segredo do
 * aparelho; ele fica no cofre com `requireAuthentication` — o próprio Android só o devolve depois de conferir a
 * digital. O servidor nunca vê a digital. A credencial vale 30 dias e cai quando a senha muda.
 */
const SERVICO = 'com.uisa.esg.biometria';
const CHAVE = 'esg.biometria.credencial';
/** Só o que não é segredo: id do aparelho no servidor, validade e de quem é. */
const META = 'esg.biometria';

type Credencial = { dispositivoId: string; segredo: string; expiraEm: string };
export type BiometriaLocal = { dispositivoId: string; expiraEm: string; dono: string };

const opcoesCofre = {
  keychainService: SERVICO,
  requireAuthentication: true,
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  authenticationPrompt: 'Use sua digital para entrar no app ESG',
};

export async function lerBiometria(): Promise<BiometriaLocal | null> {
  try {
    const raw = await AsyncStorage.getItem(META);
    const m = raw ? JSON.parse(raw) : null;
    return typeof m?.dispositivoId === 'string' && typeof m?.dono === 'string' && Number.isFinite(Date.parse(m.expiraEm)) ? m : null;
  } catch { return null; }
}

/** O aparelho tem digital cadastrada e o cofre aceita guardar com ela? */
export async function digitalDisponivel() {
  try {
    return (await SecureStore.isAvailableAsync()) && SecureStore.canUseBiometricAuthentication()
      && (await LocalAuthentication.hasHardwareAsync()) && (await LocalAuthentication.isEnrolledAsync())
      && (await LocalAuthentication.supportedAuthenticationTypesAsync()).includes(LocalAuthentication.AuthenticationType.FINGERPRINT);
  } catch { return false; }
}

export async function apagarBiometriaLocal() {
  await SecureStore.deleteItemAsync(CHAVE, { keychainService: SERVICO }).catch(() => undefined);
  await AsyncStorage.removeItem(META);
}

/** Ativa logo depois de um login com senha (o servidor exige login de menos de 10 min). */
export async function ativarDigital(dono: string) {
  if (!(await digitalDisponivel())) throw new Error('Cadastre uma digital nas configurações do aparelho para usar esta opção.');
  const anterior = await lerBiometria();
  if (Platform.OS === 'ios') {
    const r = await LocalAuthentication.authenticateAsync({ promptMessage: 'Ativar digital no app ESG', disableDeviceFallback: true, cancelLabel: 'Cancelar' });
    if (!r.success) throw new Error('Ativação cancelada.');
  }
  const aparelho = [Device.manufacturer, Device.modelName].filter(Boolean).join(' ') || undefined;
  const c = await request<Credencial>('/auth/biometria/cadastrar', { method: 'POST', body: { anteriorId: anterior?.dispositivoId, aparelho }, timeoutMs: 20_000 });
  try {
    await SecureStore.setItemAsync(CHAVE, JSON.stringify(c), opcoesCofre);
    const meta: BiometriaLocal = { dispositivoId: c.dispositivoId, expiraEm: c.expiraEm, dono };
    await AsyncStorage.setItem(META, JSON.stringify(meta));
    return meta;
  } catch {
    await request('/auth/biometria/revogar', { method: 'POST', body: { dispositivoId: c.dispositivoId } }).catch(() => undefined);
    throw new Error('Não foi possível guardar a digital neste aparelho. Tente de novo.');
  }
}

/** Lê a credencial (o sistema pede a digital) e troca por uma sessão. */
export async function entrarComDigital<T>(): Promise<T> {
  const meta = await lerBiometria();
  if (!meta || Date.parse(meta.expiraEm) <= Date.now()) {
    await apagarBiometriaLocal();
    throw new Error('A digital venceu (vale 30 dias). Entre com usuário e senha para ativá-la de novo.');
  }
  let raw: string | null;
  try { raw = await SecureStore.getItemAsync(CHAVE, opcoesCofre); } catch { throw new Error('A digital não foi confirmada. Tente de novo ou entre com usuário e senha.'); }
  if (!raw) { await apagarBiometriaLocal(); throw new Error('A digital deste aparelho mudou. Entre com usuário e senha para ativá-la de novo.'); }
  const c = JSON.parse(raw) as Credencial;
  try {
    return await request<T>('/auth/biometria/entrar', { method: 'POST', body: { dispositivoId: c.dispositivoId, segredo: c.segredo }, anonimo: true, timeoutMs: 20_000 });
  } catch (e) {
    if (e instanceof ApiError && e.codigo === 'BIOMETRIA_INVALIDA') await apagarBiometriaLocal();
    throw e;
  }
}

export async function desativarDigital() {
  const meta = await lerBiometria();
  if (meta) await request('/auth/biometria/revogar', { method: 'POST', body: { dispositivoId: meta.dispositivoId } }).catch(() => undefined);
  await apagarBiometriaLocal();
}
