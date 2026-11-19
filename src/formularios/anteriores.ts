import { CHAVE_ANTERIORES, ehObjeto, ehValorReferencia, vazio, type Campo, type Definicao, type OrigemAnterior } from './motor/definicao';

/** Só o que esta conta precisa de um registro guardado no aparelho (ResumoRegistro do serviço). */
export type RegistroLocal = { id: string; numero: number; codigo: string; situacao: string; dados: Record<string, unknown> };

const comparavel = (v: unknown): string | null => {
  if (vazio(v)) return null;
  if (ehValorReferencia(v)) return `ref:${v.linha}`;
  if (ehObjeto(v) && typeof v.id === 'string') return `id:${v.id}`;
  if (typeof v === 'number') return `n:${v}`;
  return `t:${String(v).trim().toLowerCase()}`;
};

/**
 * Prévia local do "valor do registro anterior" (§29), igual à do servidor: o registro mais recente (pela data de
 * `ordem`, depois pelo número) com os mesmos valores em `mesmo` e o campo `de` preenchido, fora os cancelados.
 * Serve só para mostrar sem internet: ao gravar, o servidor busca de novo no banco.
 */
export function anterioresLocais(def: Definicao, dados: Record<string, unknown>, registros: RegistroLocal[], prefixo: string) {
  const valores: Record<string, unknown> = {};
  const origens: Record<string, OrigemAnterior | null> = {};
  const campos = def.campos.filter((c: Campo) => c.tipo === 'anterior' && !c.arquivado && c.de);
  for (const c of campos) {
    valores[c.chave] = null;
    origens[c.chave] = null;
    const mesmo = (c.mesmo ?? []).map((k) => [k, comparavel(dados[k])] as const);
    if (mesmo.some(([, v]) => v === null)) continue;
    const dataAtual = c.ordem ? String(dados[c.ordem] ?? '') : '';
    if (c.ordem && !dataAtual) continue;
    const candidatos = registros.filter((r) => r.situacao !== 'cancelado' && !vazio(r.dados?.[c.de!])
      && mesmo.every(([k, v]) => comparavel(r.dados?.[k]) === v)
      && (!c.ordem || String(r.dados?.[c.ordem] ?? '') < dataAtual) && (!c.ordem || !vazio(r.dados?.[c.ordem])));
    candidatos.sort((a, b) => (c.ordem ? String(b.dados[c.ordem]).localeCompare(String(a.dados[c.ordem])) : 0) || b.numero - a.numero);
    const r = candidatos[0];
    if (!r) continue;
    valores[c.chave] = r.dados[c.de!];
    origens[c.chave] = { registro: r.codigo || `${prefixo}-${r.numero}`, registroId: r.id, data: c.ordem ? String(r.dados[c.ordem]) : null };
  }
  return { valores, origens, [CHAVE_ANTERIORES]: origens };
}

