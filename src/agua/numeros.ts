/**
 * Números e datas no jeito brasileiro, sem depender do Intl do Hermes (o app formata sempre igual em todo aparelho).
 * `lerNumero` é a mesma regra do portal (processos/formulario.tsx): vírgula é decimal ("12,5"); ponto seguido de
 * grupos de 3 dígitos é milhar ("1.254.300"); qualquer outro ponto é decimal ("12.5"). Vazio ou inválido = null.
 */
export function lerNumero(texto: string): number | null {
  const t = String(texto ?? '').trim().replace(/\s/g, '');
  if (!t) return null;
  const normal = t.includes(',') ? t.replace(/\./g, '').replace(',', '.') : /^-?\d{1,3}(\.\d{3})+$/.test(t) ? t.replace(/\./g, '') : t;
  if (!/^-?\d+(\.\d+)?$/.test(normal)) return null;
  return Number(normal);
}

/** 1254300.5 → "1.254.300,5" (até `casas` decimais, sem zeros à direita). */
export function formatarNumero(n: number, casas = 2): string {
  if (!Number.isFinite(n)) return '—';
  const negativo = n < 0;
  const [int, dec = ''] = Math.abs(n).toFixed(casas).split('.');
  const milhar = int.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const decimais = dec.replace(/0+$/, '');
  return `${negativo ? '-' : ''}${milhar}${decimais ? `,${decimais}` : ''}`;
}

const doisDigitos = (n: number) => String(n).padStart(2, '0');

/** Data local de hoje em aaaa-mm-dd. */
export function hojeIso(d = new Date()) {
  return `${d.getFullYear()}-${doisDigitos(d.getMonth() + 1)}-${doisDigitos(d.getDate())}`;
}

/** Soma dias a uma data aaaa-mm-dd. */
export function somarDias(iso: string, dias: number) {
  const [a, m, d] = iso.split('-').map(Number);
  return hojeIso(new Date(a, m - 1, d + dias));
}

/** aaaa-mm-dd → dd/mm/aaaa */
export const formatarData = (iso?: string) => (iso && /^\d{4}-\d{2}-\d{2}/.test(iso) ? iso.slice(0, 10).split('-').reverse().join('/') : '—');

export function formatarDataHora(iso?: string) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return `${doisDigitos(d.getDate())}/${doisDigitos(d.getMonth() + 1)}/${d.getFullYear()} ${doisDigitos(d.getHours())}:${doisDigitos(d.getMinutes())}`;
}

const DIAS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

/** "Hoje", "Ontem" ou "quarta, 12 de novembro". */
export function dataAmigavel(iso: string, hoje = hojeIso()) {
  if (iso === hoje) return 'Hoje';
  if (iso === somarDias(hoje, -1)) return 'Ontem';
  const [a, m, d] = iso.split('-').map(Number);
  const dt = new Date(a, m - 1, d);
  return `${DIAS[dt.getDay()]}, ${d} de ${MESES[m - 1]}${a !== Number(hoje.slice(0, 4)) ? ` de ${a}` : ''}`;
}

/** Saudação pela hora: igual à Visão geral do portal. */
export function saudacao(d = new Date()) {
  const h = d.getHours();
  return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
}

export function dataPorExtenso(d = new Date()) {
  return `${DIAS[d.getDay()]}, ${d.getDate()} de ${MESES[d.getMonth()]}`;
}
