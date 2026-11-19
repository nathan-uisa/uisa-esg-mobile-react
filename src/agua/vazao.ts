import type { Registro } from '../services/processos';
import { hojeIso, lerNumero } from './numeros';

/**
 * Vazão de Água Industrial. Mesmo contrato e mesma conta do portal (uisa-esg-front-nextjs,
 * processos/vazao-agua-industrial.tsx; backend docs/06_PROCESSOS.md):
 * volume = leitura atual − leitura anterior DO MESMO HIDRÔMETRO; vazão média = volume ÷ horas entre as duas
 * leituras. Vazão acima do limite da outorga exige análise de causa, ação corretiva e responsável.
 */
export const PROCESSO_VAZAO = 'vazao-agua-industrial';
/** Formato da tela fixa da Vazão (o formulário cadastrado, quando publicado, tem outro e fica de fora destas contas). */
export const ehDadosVazao = (d: unknown): d is DadosVazao => Boolean(d && typeof d === 'object' && Array.isArray((d as DadosVazao).leituras));

export type PontoId = 'rio-angelim' | 'sao-lourenco-b01' | 'sao-lourenco-b02';
export type Ponto = { id: PontoId; nome: string; curto: string; limite: number; hidrometros: string[] };

/** Limites (m³/h) e hidrômetros como estão no portal (formulário de origem 327229). */
export const PONTOS: Ponto[] = [
  { id: 'rio-angelim', nome: 'Rio Angelim', curto: 'Angelim', limite: 900, hidrometros: ['20943', 'C16503077'] },
  { id: 'sao-lourenco-b01', nome: 'São Lourenço — B01', curto: 'S. Lourenço B01', limite: 440, hidrometros: ['8324', '8323', 'C071668', 'C078355'] },
  { id: 'sao-lourenco-b02', nome: 'São Lourenço — B02', curto: 'S. Lourenço B02', limite: 440, hidrometros: ['8324', '8323', 'C071668', 'C078355'] },
];
export const pontoPorId = (id: PontoId) => PONTOS.find((p) => p.id === id)!;

export type Anterior = { leitura: number; data: string; informada: boolean };
export type Corretiva = { analise: string; acao: string; responsavel: string };
export type LeituraPonto = {
  ponto: PontoId; data: string; hidrometro: string; leitura: number;
  anterior?: Anterior; volume?: number; horas?: number; vazao?: number;
  excedeu: boolean; corretiva?: Corretiva;
};
export type DadosVazao = { leituras: LeituraPonto[] };

export const numeroVazao = (n: number) => `VAZAO-${String(n).padStart(4, '0')}`;
const horasEntre = (de: string, ate: string) => (Date.parse(`${ate}T00:00:00Z`) - Date.parse(`${de}T00:00:00Z`)) / 3_600_000;

/** Última leitura guardada do mesmo ponto e hidrômetro, anterior à data. */
export function ultimaLeitura(registros: Registro<DadosVazao>[], ponto: PontoId, hidrometro: string, antesDe: string): Anterior | undefined {
  let melhor: Anterior | undefined;
  for (const r of registros) for (const l of r.dados.leituras) {
    if (l.ponto !== ponto || l.hidrometro !== hidrometro || (antesDe && l.data >= antesDe)) continue;
    if (!melhor || l.data > melhor.data) melhor = { leitura: l.leitura, data: l.data, informada: false };
  }
  return melhor;
}

/** O hidrômetro lido por último naquele ponto, para já vir escolhido. */
export function hidrometroRecente(registros: Registro<DadosVazao>[], ponto: PontoId) {
  let melhor: { data: string; hidrometro: string } | undefined;
  for (const r of registros) for (const l of r.dados.leituras) if (l.ponto === ponto && (!melhor || l.data > melhor.data)) melhor = l;
  return melhor?.hidrometro ?? '';
}

export type Rascunho = {
  ponto: PontoId; incluido: boolean; data: string; hidrometro: string; leitura: string;
  anteriorLeitura: string; anteriorData: string; analise: string; acao: string; responsavel: string;
};
export const rascunhoVazio = (ponto: PontoId, hoje: string, hidrometro = ''): Rascunho =>
  ({ ponto, incluido: true, data: hoje, hidrometro, leitura: '', anteriorLeitura: '', anteriorData: '', analise: '', acao: '', responsavel: '' });

export type CampoErro = 'data' | 'hidrometro' | 'leitura' | 'anterior' | 'analise' | 'acao' | 'responsavel';
export type Calculo = { anterior?: Anterior; leitura: number | null; volume?: number; horas?: number; vazao?: number; excedeu: boolean; erros: [CampoErro, string][] };

export function calcular(r: Rascunho, registros: Registro<DadosVazao>[], hoje = hojeIso()): Calculo {
  const ponto = pontoPorId(r.ponto);
  const erros: [CampoErro, string][] = [];
  const leitura = lerNumero(r.leitura);
  if (!r.data) erros.push(['data', 'data']); else if (r.data > hoje) erros.push(['data', 'data no futuro']);
  if (!r.hidrometro) erros.push(['hidrometro', 'hidrômetro']);
  if (leitura === null || leitura < 0) erros.push(['leitura', 'leitura']);

  let anterior = r.hidrometro ? ultimaLeitura(registros, r.ponto, r.hidrometro, r.data) : undefined;
  if (!anterior && (r.anteriorLeitura.trim() || r.anteriorData)) {
    const v = lerNumero(r.anteriorLeitura);
    if (v === null || !r.anteriorData) erros.push(['anterior', 'leitura anterior completa (valor e data)']);
    else anterior = { leitura: v, data: r.anteriorData, informada: true };
  }
  let volume: number | undefined, horas: number | undefined, vazao: number | undefined;
  if (anterior && leitura !== null) {
    if (leitura < anterior.leitura) erros.push(['leitura', 'leitura menor que a anterior']);
    else if (r.data && r.data <= anterior.data) erros.push(['data', 'data depois da leitura anterior']);
    else if (r.data) { volume = leitura - anterior.leitura; horas = horasEntre(anterior.data, r.data); vazao = volume / horas; }
  }
  const excedeu = vazao !== undefined && vazao > ponto.limite;
  if (excedeu) {
    if (r.analise.trim().length < 5) erros.push(['analise', 'análise de causa']);
    if (r.acao.trim().length < 5) erros.push(['acao', 'ação corretiva']);
    if (!r.responsavel.trim()) erros.push(['responsavel', 'responsável']);
  }
  return { anterior, leitura, volume, horas, vazao, excedeu, erros };
}

export function faltasVazao(pontos: Rascunho[], calculos: Calculo[]) {
  const faltas: string[] = [];
  if (!pontos.some((r) => r.incluido)) faltas.push('pelo menos um ponto lido');
  pontos.forEach((r, i) => { if (r.incluido && calculos[i].erros.length) faltas.push(`${pontoPorId(r.ponto).nome}: ${calculos[i].erros.map(([, t]) => t).join(', ')}`); });
  return faltas;
}

export function montarVazao(pontos: Rascunho[], calculos: Calculo[]): DadosVazao {
  return {
    leituras: pontos.flatMap((r, i): LeituraPonto[] => {
      if (!r.incluido) return [];
      const c = calculos[i];
      return [{
        ponto: r.ponto, data: r.data, hidrometro: r.hidrometro, leitura: c.leitura!,
        ...(c.anterior ? { anterior: c.anterior } : {}),
        ...(c.vazao !== undefined ? { volume: c.volume, horas: c.horas, vazao: c.vazao } : {}),
        excedeu: c.excedeu,
        ...(c.excedeu ? { corretiva: { analise: r.analise.trim(), acao: r.acao.trim(), responsavel: r.responsavel.trim() } } : {}),
      }];
    }),
  };
}

/** Última vazão calculada de cada ponto. */
export function ultimasVazoes(registros: Registro<DadosVazao>[]) {
  return PONTOS.map((p) => {
    let ult: LeituraPonto | undefined;
    for (const r of registros) for (const l of r.dados.leituras) if (l.ponto === p.id && l.vazao !== undefined && (!ult || l.data > ult.data)) ult = l;
    return { ponto: p, leitura: ult };
  });
}

export const excedidas = (registros: Registro<DadosVazao>[]) => registros.reduce((s, r) => s + r.dados.leituras.filter((l) => l.excedeu).length, 0);
