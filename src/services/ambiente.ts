import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';
import { expo } from '../../app.json';

/**
 * Servidor do app (docs/03_ARQUITETURA.md): Qualidade (QLD) ou Produção (PRD), escolhido na engrenagem do login.
 * Os endereços vêm de `expo.extra.apiUrls` no app.json, nunca do código. Sem o endereço de um ambiente, ele não
 * aparece para escolha. A OTA não muda com isso: segue o canal gravado na instalação.
 */
export type Ambiente = 'QLD' | 'PRD';
const NOMES: Record<Ambiente, string> = { QLD: 'Qualidade', PRD: 'Produção' };
const CHAVE = 'esg.ambiente';

const urls = (expo.extra.apiUrls ?? {}) as Partial<Record<Ambiente, string>>;
export const AMBIENTES: { id: Ambiente; nome: string }[] = (['PRD', 'QLD'] as Ambiente[])
  .filter((a) => Boolean(urls[a]?.trim()))
  .map((id) => ({ id, nome: NOMES[id] }));

const PADRAO: Ambiente = AMBIENTES.some((a) => a.id === 'PRD') ? 'PRD' : 'QLD';
let atual: Ambiente = PADRAO;
let carregado: Promise<Ambiente> | null = null;
const ouvintes = new Set<() => void>();

export const nomeDoAmbiente = (a: Ambiente) => NOMES[a];

export function urlDoAmbiente(a: Ambiente = atual): string {
  const url = urls[a]?.trim();
  if (!url) throw new Error(`Configure expo.extra.apiUrls.${a} no app.json com o endereço do backend do ESG.`);
  return url.replace(/\/+$/, '');
}

export function carregarAmbiente(): Promise<Ambiente> {
  carregado ??= AsyncStorage.getItem(CHAVE)
    .then((v) => {
      atual = AMBIENTES.some((a) => a.id === v) ? (v as Ambiente) : PADRAO;
      ouvintes.forEach((fn) => fn());
      return atual;
    })
    .catch(() => atual);
  return carregado;
}

export async function urlAtual() {
  await carregarAmbiente();
  return urlDoAmbiente();
}

export async function salvarAmbiente(novo: Ambiente) {
  await AsyncStorage.setItem(CHAVE, novo);
  carregado = Promise.resolve(novo);
  atual = novo;
  ouvintes.forEach((fn) => fn());
}

export function useAmbiente(): Ambiente {
  return useSyncExternalStore(
    (fn) => { ouvintes.add(fn); void carregarAmbiente(); return () => { ouvintes.delete(fn); }; },
    () => atual,
    () => atual,
  );
}
