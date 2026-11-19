// CÓPIA de uisa-esg-back-nestjs/src/formularios/motor (docs/10 §11). Não edite aqui: altere lá e rode `npm run motor:copiar`.
/**
 * Formulários dinâmicos — cálculo dos campos e estado efetivo de cada campo numa etapa (§7.2, §7.5, §11).
 * A tela usa para mostrar na hora; o servidor usa para gravar. A palavra final é do servidor.
 *
 * ARQUIVO PURO E ESPELHADO: existe igual em `uisa-esg-front-nextjs/src/lib/formularios/estado.ts`.
 */
import { CTX_CALCULOS, CTX_TABELAS, ehObjeto, ehValorReferencia, estadoNaEtapa, vazio, type CalculoCarregado, type Campo, type Definicao, type EstadoCampo, type Etapa, type TabelaCarregada } from './definicao';
import { analisarExpressao, avaliar } from './expressoes';

type Dados = Record<string, unknown>;

/** Ordem de cálculo dos campos calculados (dependências primeiro). Ciclo devolve `ciclo` com as chaves envolvidas. */
export function ordemDosCalculos(def: Definicao): { ordem: Campo[]; ciclo: string[] } {
  const calculados = def.campos.filter((c) => c.tipo === 'calculado' && !c.arquivado);
  const porChave = new Map(calculados.map((c) => [c.chave, c]));
  const deps = new Map<string, string[]>();
  for (const c of calculados) {
    const { refs } = analisarExpressao(c.expressao);
    deps.set(c.chave, [...refs.campos].filter((k) => porChave.has(k)));
  }
  const ordem: Campo[] = [];
  const estado = new Map<string, 1 | 2>();
  const ciclo: string[] = [];
  const visitar = (k: string, pilha: string[]) => {
    if (estado.get(k) === 2) return;
    if (estado.get(k) === 1) {
      ciclo.push(...pilha.slice(pilha.indexOf(k)));
      return;
    }
    estado.set(k, 1);
    for (const d of deps.get(k) ?? []) visitar(d, [...pilha, k]);
    estado.set(k, 2);
    ordem.push(porChave.get(k)!);
  };
  for (const c of calculados) visitar(c.chave, []);
  return { ordem, ciclo: [...new Set(ciclo)] };
}

function arredondarCasas(v: unknown, casas?: number): unknown {
  if (typeof v !== 'number' || casas === undefined) return v;
  const f = 10 ** Math.min(Math.max(Math.trunc(casas), 0), 8);
  return Math.round((v + Number.EPSILON) * f) / f;
}

/**
 * Recalcula todos os campos calculados sobre uma cópia dos dados. `tabelas` (chave → conteúdo da versão usada) serve à
 * interpolação (§28); fica só no contexto do cálculo e nunca vai para os dados.
 */
export function calcular(def: Definicao, dados: Dados, tabelas?: Record<string, TabelaCarregada>, calculos?: Record<string, CalculoCarregado>): Dados {
  const saida: Dados = { ...dados };
  // Conteúdo das tabelas (§28) e dos cálculos da biblioteca (§31) só no contexto do cálculo; nunca nos dados.
  const ctx: Dados = tabelas || calculos ? { ...dados, [CTX_TABELAS]: tabelas, [CTX_CALCULOS]: calculos } : saida;
  calcularGrades(def, saida, ctx);
  const { ordem } = ordemDosCalculos(def);
  for (const c of ordem) {
    const v = arredondarCasas(avaliar(c.expressao, ctx), c.casas);
    saida[c.chave] = v;
    ctx[c.chave] = v;
  }
  return saida;
}

/**
 * Colunas calculadas das grades (§36), antes dos campos do registro (que podem resumir a grade: média, máximo…).
 * Linha a linha, na ordem das colunas: a conta enxerga as colunas da própria linha e os campos do registro.
 */
function calcularGrades(def: Definicao, saida: Dados, ctx: Dados) {
  for (const g of def.campos) {
    if (g.tipo !== 'grade' || g.arquivado) continue;
    const calc = (g.colunas ?? []).filter((c) => c.tipo === 'calculado' && !c.arquivado);
    const linhas = saida[g.chave];
    if (!calc.length || !Array.isArray(linhas)) continue;
    const novas = linhas.map((l) => {
      if (!ehObjeto(l)) return l;
      const linha: Dados = { ...l };
      const ctxLinha: Dados = { ...ctx, ...linha };
      for (const c of calc) {
        const v = arredondarCasas(avaliar(c.expressao, ctxLinha), c.casas);
        linha[c.chave] = v;
        ctxLinha[c.chave] = v;
      }
      return linha;
    });
    saida[g.chave] = novas;
    ctx[g.chave] = novas;
  }
}

/** Campos que uma expressão usa, abrindo os calculados até os campos que alguém preenche. */
function camposUsados(def: Definicao, expressao: unknown): Set<string> {
  const porChave = new Map(def.campos.map((c) => [c.chave, c]));
  const saida = new Set<string>();
  const pilha = [...analisarExpressao(expressao).refs.campos];
  while (pilha.length) {
    const k = pilha.pop()!;
    if (saida.has(k)) continue;
    saida.add(k);
    const c = porChave.get(k);
    if (c?.tipo === 'calculado') pilha.push(...analisarExpressao(c.expressao).refs.campos);
  }
  return saida;
}

const podeEditar = (e: EstadoCampo | undefined) => e === 'editavel' || e === 'obrigatorio';

/**
 * Regras "impedir" verdadeiras nesta etapa (docs/10 §27): chave do campo → mensagem. Só cobra de quem pode
 * corrigir: a regra vale na etapa em que o campo da mensagem, ou algum campo usado na condição (inclusive através
 * de um calculado), é editável. Em outras etapas ela não trava ninguém.
 */
export function bloqueiosDasRegras(def: Definicao, estados: Record<string, EstadoCampo>, dadosCalculados: Dados): Record<string, string> {
  const saida: Record<string, string> = {};
  for (const r of def.regras ?? []) {
    if (r.entao?.acao !== 'impedir') continue;
    const alvo = r.entao.campo;
    if (!alvo || saida[alvo]) continue;
    const usados = camposUsados(def, r.quando);
    if (!podeEditar(estados[alvo]) && ![...usados].some((k) => podeEditar(estados[k]))) continue;
    if (!avaliar(r.quando, dadosCalculados)) continue;
    saida[alvo] = r.entao.mensagem?.trim() || 'Valor não permitido.';
  }
  return saida;
}

/** Valor comparável para "sem repetir": item de tabela pela linha escolhida, o resto pelo próprio valor. */
const valorUnico = (v: unknown) => (ehValorReferencia(v) ? `ref:${v.linha}` : typeof v === 'number' ? `n:${v}` : `t:${String(v).trim().toLowerCase()}`);

/**
 * Travas por linha das grades editáveis nesta etapa (§36): chave `grade.linha.coluna` → mensagem.
 * - Coluna "sem repetir": a segunda linha com o mesmo valor é recusada.
 * - Coluna calculada com `exigeResultado`: com as colunas da conta preenchidas e sem resultado, a linha é recusada. O
 *   erro vai para a primeira coluna preenchida que a conta usa (é ali que a pessoa corrige).
 */
export function bloqueiosDasGrades(def: Definicao, estados: Record<string, EstadoCampo>, dadosCalculados: Dados): Record<string, string> {
  const saida: Record<string, string> = {};
  for (const g of def.campos) {
    const linhas = dadosCalculados[g.chave];
    if (g.tipo !== 'grade' || g.arquivado || !podeEditar(estados[g.chave]) || !Array.isArray(linhas)) continue;
    const colunas = (g.colunas ?? []).filter((c) => !c.arquivado);
    for (const col of colunas.filter((c) => c.unico)) {
      const vistos = new Map<string, number>();
      linhas.forEach((l, i) => {
        const v = ehObjeto(l) ? l[col.chave] : null;
        if (vazio(v)) return;
        const k = valorUnico(v);
        const ja = vistos.get(k);
        if (ja === undefined) vistos.set(k, i + 1);
        else saida[`${g.chave}.${i + 1}.${col.chave}`] ??= `Repetido: já está na linha ${ja}.`;
      });
    }
    const porChave = new Map(colunas.map((c) => [c.chave, c]));
    for (const col of colunas.filter((c) => c.tipo === 'calculado' && c.exigeResultado)) {
      const usadas = [...analisarExpressao(col.expressao).refs.campos].filter((k) => porChave.has(k) && porChave.get(k)!.tipo !== 'calculado');
      linhas.forEach((l, i) => {
        if (!ehObjeto(l) || !vazio(l[col.chave]) || !usadas.length || usadas.some((k) => vazio(l[k]))) return;
        saida[`${g.chave}.${i + 1}.${usadas[0]}`] ??= col.exigeResultado!;
      });
    }
  }
  return saida;
}

/** Estado efetivo de cada campo na etapa, depois das regras ("quando … então obrigar/ocultar"). */
export function estadosEfetivos(def: Definicao, etapa: Etapa | undefined, dadosCalculados: Dados): Record<string, EstadoCampo> {
  const estados: Record<string, EstadoCampo> = {};
  for (const c of def.campos) estados[c.chave] = c.arquivado ? 'oculto' : estadoNaEtapa(etapa, c);
  for (const r of def.regras ?? []) {
    const alvo = r.entao?.campo;
    if (!alvo || !(alvo in estados)) continue;
    if (!avaliar(r.quando, dadosCalculados)) continue;
    if (r.entao.acao === 'obrigar' && estados[alvo] === 'editavel') estados[alvo] = 'obrigatorio';
    if (r.entao.acao === 'ocultar') estados[alvo] = 'oculto';
  }
  return estados;
}
