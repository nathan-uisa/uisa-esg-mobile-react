import type { Registro } from '../services/processos';
import { hojeIso, lerNumero } from './numeros';

/**
 * Consumo de Água — PIPAS (RESGI-022 Rev 02). Mesmo contrato do portal (uisa-esg-front-nextjs,
 * processos/consumo-pipas.tsx; backend docs/06_PROCESSOS.md): um registro = um caminhão-pipa (prefixo) e os
 * abastecimentos dele. O total captado é a soma das linhas.
 */
export const PROCESSO_PIPAS = 'consumo-agua-pipas';
export const CODIGOS = ['01', '02'] as const;
export type Codigo = (typeof CODIGOS)[number];

export type Abastecimento = { data: string; local: string; volume: number; codigo: Codigo };
export type DadosPipas = { prefixo: string; abastecimentos: Abastecimento[] };
export type LinhaPipas = { chave: string; data: string; local: string; volume: string; codigo: Codigo | '' };

export const numeroPipas = (n: number) => `PIPAS-${String(n).padStart(4, '0')}`;
export const totalPipas = (d: DadosPipas) => d.abastecimentos.reduce((s, a) => s + a.volume, 0);

let seq = 0;
export const linhaVazia = (data = hojeIso()): LinhaPipas => ({ chave: `l${Date.now()}-${seq++}`, data, local: '', volume: '', codigo: '' });

export function errosDaLinha(ln: LinhaPipas, hoje = hojeIso()) {
  const v = lerNumero(ln.volume);
  return {
    data: !ln.data ? 'data' : ln.data > hoje ? 'data no futuro' : '',
    local: ln.local.trim() ? '' : 'local de abastecimento',
    volume: v !== null && v > 0 ? '' : 'volume maior que zero',
    codigo: ln.codigo ? '' : 'código de consumo',
  };
}

/** O que falta para registrar (vazio = pode enviar). */
export function faltasPipas(prefixo: string, linhas: LinhaPipas[], hoje = hojeIso()) {
  const faltas: string[] = [];
  if (!prefixo.trim()) faltas.push('Prefixo do caminhão');
  linhas.forEach((ln, i) => {
    const itens = Object.values(errosDaLinha(ln, hoje)).filter(Boolean);
    if (itens.length) faltas.push(`Abastecimento ${i + 1}: ${itens.join(', ')}`);
  });
  return faltas;
}

export function montarPipas(prefixo: string, linhas: LinhaPipas[]): DadosPipas {
  return {
    prefixo: prefixo.trim().toUpperCase(),
    abastecimentos: linhas.map((ln) => ({ data: ln.data, local: ln.local.trim(), volume: lerNumero(ln.volume)!, codigo: ln.codigo as Codigo })),
  };
}

/** Sugestões: prefixos e pontos de captação já digitados antes (ainda não há cadastro deles). */
export function sugestoesPipas(registros: Registro<DadosPipas>[]) {
  const prefixos = [...new Set(registros.map((r) => r.dados.prefixo).filter(Boolean))].sort();
  const locais = [...new Set(registros.flatMap((r) => r.dados.abastecimentos.map((a) => a.local)).filter(Boolean))].sort();
  return { prefixos, locais };
}

export function resumoPipas(registros: Registro<DadosPipas>[]) {
  const mes = hojeIso().slice(0, 7);
  return {
    volume: registros.reduce((s, r) => s + totalPipas(r.dados), 0),
    volumeMes: registros.reduce((s, r) => s + r.dados.abastecimentos.filter((a) => a.data.startsWith(mes)).reduce((x, a) => x + a.volume, 0), 0),
    abastecimentos: registros.reduce((s, r) => s + r.dados.abastecimentos.length, 0),
    caminhoes: new Set(registros.map((r) => r.dados.prefixo.toUpperCase())).size,
  };
}

export function periodoPipas(d: DadosPipas) {
  const datas = d.abastecimentos.map((a) => a.data).sort();
  return { de: datas[0], ate: datas[datas.length - 1] };
}
