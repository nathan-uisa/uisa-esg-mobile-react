// CÓPIA de uisa-esg-back-nestjs/src/formularios/motor (docs/10 §11). Não edite aqui: altere lá e rode `npm run motor:copiar`.
/**
 * Formulários dinâmicos — regras e cálculos (§7.5, §11, §17). Formato JSON Logic com operações em português,
 * executado pelo `json-logic-engine` SEM as operações padrão: só a lista fechada abaixo existe. Nada de `eval`.
 *
 * ARQUIVO PURO E ESPELHADO: existe igual em `uisa-esg-front-nextjs/src/lib/formularios/expressoes.ts`.
 * Os casos de teste ficam em `expressoes.casos.json` (mesmos casos nos dois repositórios).
 */
import { LogicEngine } from 'json-logic-engine';
import { CTX_CALCULOS, CTX_PARAMETROS, CTX_TABELAS, LIMITES, chaveVersaoCalculo, ehObjeto, type CalculoCarregado, type Expressao, type TabelaCarregada } from './definicao';

type Dados = Record<string, unknown>;

/** Lista fechada de operações (§17). Qualquer outra é recusada. */
export const OPERACOES = {
  campo: 'valor de um campo',
  somar: 'soma',
  subtrair: 'subtração',
  multiplicar: 'multiplicação',
  dividir: 'divisão',
  media: 'média',
  minimo: 'mínimo',
  maximo: 'máximo',
  arredondar: 'arredondar',
  se: 'se … então … senão',
  e: 'e',
  ou: 'ou',
  nao: 'não',
  igual: 'igual a',
  diferente: 'diferente de',
  maior: 'maior que',
  maiorIgual: 'maior ou igual a',
  menor: 'menor que',
  menorIgual: 'menor ou igual a',
  vazio: 'está vazio',
  preenchido: 'está preenchido',
  contem: 'contém (múltipla escolha)',
  somaColuna: 'soma de uma coluna da grade',
  mediaColuna: 'média de uma coluna da grade',
  mediaPonderadaColuna: 'média de uma coluna ponderada por outra',
  contarLinhas: 'quantidade de linhas da grade',
  minimoColuna: 'menor valor de uma coluna da grade',
  maximoColuna: 'maior valor de uma coluna da grade',
  daTabela: 'valor de uma coluna do item de tabela escolhido',
  diferencaDatas: 'tempo entre duas datas (horas, dias ou minutos)',
  interpolar: 'interpolação numa tabela de referência',
  calculo: 'cálculo da biblioteca',
  param: 'parâmetro do cálculo',
} as const;
export type Operacao = keyof typeof OPERACOES;

/**
 * Argumentos de cada operação (docs/10 §30). O editor de fórmula do construtor e a validação leem daqui: operação nova
 * no motor = uma linha em OPERACOES + uma aqui, sem código novo na tela.
 * - `valor`: qualquer expressão (número, texto, campo ou outra operação); `condicao`: expressão que dá verdadeiro/falso.
 * - Chaves literais: `campo`, `grade`, `colunaGrade`, `campoTabela` (campo "Item de tabela"), `colunaTabela`,
 *   `tabela`, `colunaNumericaTabela`, `unidade` (minutos/horas/dias) e `inteiro` (ex.: casas do arredondamento).
 */
export type ArgFormula = 'valor' | 'condicao' | 'campo' | 'grade' | 'colunaGrade' | 'campoTabela' | 'colunaTabela' | 'tabela' | 'colunaNumericaTabela' | 'unidade' | 'inteiro';
export type GrupoOperacao = 'Contas' | 'Condições' | 'Comparações' | 'Grade' | 'Tabela de referência' | 'Datas';
/** Operações que não são blocos comuns do editor: `campo` e `param` são valores; `calculo` tem argumentos definidos pela biblioteca. */
export type OperacaoComum = Exclude<Operacao, 'campo' | 'param' | 'calculo'>;
export type AssinaturaOperacao = {
  grupo: GrupoOperacao;
  /** Argumentos fixos; com `repete`, o último tipo se repete (soma de vários campos). */
  args: ArgFormula[];
  repete?: boolean;
  /** Sinal para a fórmula legível (ex.: "+"); sem sinal, aparece como função. */
  sinal?: string;
  resultado: 'numero' | 'logico' | 'valor';
  /** Argumentos que podem faltar no fim (ex.: o "senão" do "se"). */
  opcionais?: number;
};
export const ASSINATURAS: Record<OperacaoComum, AssinaturaOperacao> = {
  somar: { grupo: 'Contas', args: ['valor'], repete: true, sinal: '+', resultado: 'numero' },
  subtrair: { grupo: 'Contas', args: ['valor', 'valor'], sinal: '−', resultado: 'numero' },
  multiplicar: { grupo: 'Contas', args: ['valor'], repete: true, sinal: '×', resultado: 'numero' },
  dividir: { grupo: 'Contas', args: ['valor', 'valor'], sinal: '÷', resultado: 'numero' },
  media: { grupo: 'Contas', args: ['valor'], repete: true, resultado: 'numero' },
  minimo: { grupo: 'Contas', args: ['valor'], repete: true, resultado: 'numero' },
  maximo: { grupo: 'Contas', args: ['valor'], repete: true, resultado: 'numero' },
  arredondar: { grupo: 'Contas', args: ['valor', 'inteiro'], resultado: 'numero' },
  se: { grupo: 'Condições', args: ['condicao', 'valor', 'valor'], opcionais: 1, resultado: 'valor' },
  e: { grupo: 'Condições', args: ['condicao'], repete: true, sinal: 'e', resultado: 'logico' },
  ou: { grupo: 'Condições', args: ['condicao'], repete: true, sinal: 'ou', resultado: 'logico' },
  nao: { grupo: 'Condições', args: ['condicao'], resultado: 'logico' },
  vazio: { grupo: 'Condições', args: ['valor'], resultado: 'logico' },
  preenchido: { grupo: 'Condições', args: ['valor'], resultado: 'logico' },
  igual: { grupo: 'Comparações', args: ['valor', 'valor'], sinal: '=', resultado: 'logico' },
  diferente: { grupo: 'Comparações', args: ['valor', 'valor'], sinal: '≠', resultado: 'logico' },
  maior: { grupo: 'Comparações', args: ['valor', 'valor'], sinal: '>', resultado: 'logico' },
  maiorIgual: { grupo: 'Comparações', args: ['valor', 'valor'], sinal: '≥', resultado: 'logico' },
  menor: { grupo: 'Comparações', args: ['valor', 'valor'], sinal: '<', resultado: 'logico' },
  menorIgual: { grupo: 'Comparações', args: ['valor', 'valor'], sinal: '≤', resultado: 'logico' },
  contem: { grupo: 'Comparações', args: ['valor', 'valor'], resultado: 'logico' },
  somaColuna: { grupo: 'Grade', args: ['grade', 'colunaGrade'], resultado: 'numero' },
  mediaColuna: { grupo: 'Grade', args: ['grade', 'colunaGrade'], resultado: 'numero' },
  mediaPonderadaColuna: { grupo: 'Grade', args: ['grade', 'colunaGrade', 'colunaGrade'], resultado: 'numero' },
  contarLinhas: { grupo: 'Grade', args: ['grade'], resultado: 'numero' },
  minimoColuna: { grupo: 'Grade', args: ['grade', 'colunaGrade'], resultado: 'numero' },
  maximoColuna: { grupo: 'Grade', args: ['grade', 'colunaGrade'], resultado: 'numero' },
  daTabela: { grupo: 'Tabela de referência', args: ['campoTabela', 'colunaTabela'], resultado: 'valor' },
  interpolar: { grupo: 'Tabela de referência', args: ['tabela', 'colunaNumericaTabela', 'colunaNumericaTabela', 'valor'], resultado: 'numero' },
  diferencaDatas: { grupo: 'Datas', args: ['valor', 'valor', 'unidade'], resultado: 'numero' },
};
const ARG_EXPRESSAO = new Set<ArgFormula>(['valor', 'condicao']);

const num = (v: unknown): number | null => {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'boolean') return v ? 1 : 0;
  return null;
};
const lista = (args: unknown): unknown[] => (Array.isArray(args) ? args : [args]);
/** Data/data e hora gravadas como texto ISO ("2026-11-14" ou "2026-11-14T08:30"): comparáveis como texto. */
const RE_DATA_ISO = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?)?$/;
/** Unidades da diferença entre datas, em milissegundos (§30). */
export const UNIDADES_TEMPO = { minutos: 60_000, horas: 3_600_000, dias: 86_400_000 } as const;
/**
 * Instante de uma data ISO. Data sem fuso ("2026-11-10" ou "2026-11-10T08:30", como os campos gravam) é lida como
 * hora de relógio, igual no navegador e no servidor (sem depender do fuso da máquina).
 */
function instante(v: unknown): number | null {
  if (typeof v !== 'string' || !RE_DATA_ISO.test(v)) return null;
  if (/(Z|[+-]\d{2}:?\d{2})$/.test(v) && v.length > 10) {
    const t = Date.parse(v);
    return Number.isFinite(t) ? t : null;
  }
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d+))?)?)?/.exec(v)!;
  const t = Date.UTC(+m[1], +m[2] - 1, +m[3], +(m[4] ?? 0), +(m[5] ?? 0), +(m[6] ?? 0), +(m[7] ?? '0').slice(0, 3).padEnd(3, '0'));
  return Number.isFinite(t) ? t : null;
}

/** Valor comparável por maior/menor: número, ou data ISO (só data com data; data com hora compara o dia). */
function comparaveis(a: unknown, b: unknown): [number, number] | [string, string] | null {
  const na = num(a), nb = num(b);
  if (na !== null && nb !== null) return [na, nb];
  if (typeof a === 'string' && typeof b === 'string' && RE_DATA_ISO.test(a) && RE_DATA_ISO.test(b)) {
    // Data × data e hora: compara só o dia (a data não tem hora para comparar).
    return a.length === 10 || b.length === 10 ? [a.slice(0, 10), b.slice(0, 10)] : [a, b];
  }
  return null;
}
const linhasDe = (ctx: Dados, chave: unknown): Dados[] => {
  const v = typeof chave === 'string' ? ctx[chave] : null;
  return Array.isArray(v) ? (v.filter(ehObjeto) as Dados[]) : [];
};
const vazioV = (v: unknown) => v === null || v === undefined || v === '' || (Array.isArray(v) && v.length === 0);

/** Aritmética com campo vazio dá vazio; divisão por zero dá vazio (§7.5). */
function aritmetica(f: (a: number, b: number) => number | null) {
  return (args: unknown) => {
    const vs = lista(args).map(num);
    if (!vs.length || vs.some((v) => v === null)) return null;
    let acc = vs[0] as number;
    for (let i = 1; i < vs.length; i++) {
      const r = f(acc, vs[i] as number);
      if (r === null || !Number.isFinite(r)) return null;
      acc = r;
    }
    return acc;
  };
}

function criarMotor(): LogicEngine {
  const m = new LogicEngine({}, { disableInline: true, maxDepth: LIMITES.profundidadeExpressao + 2 });
  m.addMethod('campo', (args, ctx) => {
    const k = lista(args)[0];
    return typeof k === 'string' ? ((ctx as Dados)?.[k] ?? null) : null;
  });
  m.addMethod('somar', (args) => {
    const vs = lista(args).map(num);
    return vs.some((v) => v === null) ? null : (vs as number[]).reduce((s, v) => s + v, 0);
  });
  m.addMethod('subtrair', aritmetica((a, b) => a - b));
  m.addMethod('multiplicar', aritmetica((a, b) => a * b));
  m.addMethod('dividir', aritmetica((a, b) => (b === 0 ? null : a / b)));
  m.addMethod('media', (args) => {
    const vs = lista(args).map(num).filter((v): v is number => v !== null);
    return vs.length ? vs.reduce((s, v) => s + v, 0) / vs.length : null;
  });
  m.addMethod('minimo', (args) => {
    const vs = lista(args).map(num).filter((v): v is number => v !== null);
    return vs.length ? Math.min(...vs) : null;
  });
  m.addMethod('maximo', (args) => {
    const vs = lista(args).map(num).filter((v): v is number => v !== null);
    return vs.length ? Math.max(...vs) : null;
  });
  m.addMethod('arredondar', (args) => {
    const [v, c] = lista(args);
    const x = num(v);
    const casas = Math.min(Math.max(Math.trunc(num(c) ?? 0), 0), 8);
    if (x === null) return null;
    const f = 10 ** casas;
    return Math.round((x + Number.EPSILON) * f) / f;
  });
  m.addMethod('se', {
    lazy: true,
    method: (args, ctx, _above, motor) => {
      const a = lista(args);
      return motor.run(motor.run(a[0], ctx) ? a[1] : a[2] ?? null, ctx);
    },
  });
  m.addMethod('e', {
    lazy: true,
    method: (args, ctx, _above, motor) => lista(args).every((x) => Boolean(motor.run(x, ctx))),
  });
  m.addMethod('ou', {
    lazy: true,
    method: (args, ctx, _above, motor) => lista(args).some((x) => Boolean(motor.run(x, ctx))),
  });
  m.addMethod('nao', (args) => !lista(args)[0]);
  // Números ou datas ISO (docs/10 §27.3). Antes as datas davam sempre falso: o texto não virava número.
  const comparar = (f: (a: number | string, b: number | string) => boolean) => (args: unknown) => {
    const [a, b] = lista(args);
    const par = comparaveis(a, b);
    return par ? f(par[0], par[1]) : false;
  };
  m.addMethod('igual', (args) => {
    const [a, b] = lista(args);
    return a === b || (num(a) !== null && num(a) === num(b));
  });
  m.addMethod('diferente', (args) => {
    const [a, b] = lista(args);
    return !(a === b || (num(a) !== null && num(a) === num(b)));
  });
  m.addMethod('maior', comparar((a, b) => a > b));
  m.addMethod('maiorIgual', comparar((a, b) => a >= b));
  m.addMethod('menor', comparar((a, b) => a < b));
  m.addMethod('menorIgual', comparar((a, b) => a <= b));
  m.addMethod('vazio', (args) => vazioV(lista(args)[0]));
  m.addMethod('preenchido', (args) => !vazioV(lista(args)[0]));
  m.addMethod('contem', (args) => {
    const [a, b] = lista(args);
    if (Array.isArray(a)) return a.some((x) => x === b);
    return typeof a === 'string' && typeof b === 'string' && b !== '' && a === b;
  });
  m.addMethod('somaColuna', (args, ctx) => {
    const [g, c] = lista(args);
    const vs = linhasDe(ctx as Dados, g).map((l) => num(l[String(c)])).filter((v): v is number => v !== null);
    return vs.reduce((s, v) => s + v, 0);
  });
  m.addMethod('mediaColuna', (args, ctx) => {
    const [g, c] = lista(args);
    const vs = linhasDe(ctx as Dados, g).map((l) => num(l[String(c)])).filter((v): v is number => v !== null);
    return vs.length ? vs.reduce((s, v) => s + v, 0) / vs.length : null;
  });
  m.addMethod('mediaPonderadaColuna', (args, ctx) => {
    const [g, c, p] = lista(args);
    let soma = 0;
    let pesos = 0;
    for (const l of linhasDe(ctx as Dados, g)) {
      const v = num(l[String(c)]);
      const w = num(l[String(p)]);
      if (v === null || w === null) continue;
      soma += v * w;
      pesos += w;
    }
    return pesos ? soma / pesos : null;
  });
  m.addMethod('contarLinhas', (args, ctx) => linhasDe(ctx as Dados, lista(args)[0]).length);
  const extremoColuna = (f: (vs: number[]) => number) => (args: unknown, ctx: unknown) => {
    const [g, c] = lista(args);
    const vs = linhasDe(ctx as Dados, g).map((l) => num(l[String(c)])).filter((v): v is number => v !== null);
    return vs.length ? f(vs) : null;
  };
  m.addMethod('minimoColuna', extremoColuna((vs) => Math.min(...vs)));
  m.addMethod('maximoColuna', extremoColuna((vs) => Math.max(...vs)));
  // Tempo entre duas datas (§30): fim − início na unidade pedida. Data vazia ou inválida = vazio.
  m.addMethod('diferencaDatas', (args) => {
    const [a, b, u] = lista(args);
    const ini = instante(a);
    const fim = instante(b);
    const ms = UNIDADES_TEMPO[String(u) as keyof typeof UNIDADES_TEMPO];
    return ini === null || fim === null || !ms ? null : (fim - ini) / ms;
  });
  // Biblioteca de cálculos (§31): parâmetro dentro da fórmula da biblioteca e chamada a um cálculo com versão fixada.
  m.addMethod('param', (args, ctx) => {
    const k = lista(args)[0];
    const ps = (ctx as Dados)?.[CTX_PARAMETROS] as Dados | undefined;
    return typeof k === 'string' && ps ? (ps[k] ?? null) : null;
  });
  m.addMethod('calculo', (args, ctx) => {
    const [k, v, ...valores] = lista(args);
    const c = ((ctx as Dados)?.[CTX_CALCULOS] as Record<string, CalculoCarregado> | undefined)?.[chaveVersaoCalculo(String(k), Number(v))];
    if (!c) return null;
    const parametros = Object.fromEntries(c.parametros.map((p, i) => [p.chave, valores[i] ?? null]));
    let r: unknown;
    try {
      r = motor().run(c.expressao, { [CTX_PARAMETROS]: parametros, [CTX_TABELAS]: (ctx as Dados)?.[CTX_TABELAS] });
    } catch {
      return null;
    }
    if (typeof r === 'number') {
      if (!Number.isFinite(r)) return null;
      if (c.casas !== undefined) { const f = 10 ** Math.min(Math.max(Math.trunc(c.casas), 0), 8); r = Math.round((r + Number.EPSILON) * f) / f; }
    }
    return r ?? null;
  });
  // Item de tabela (§28): lê a cópia da linha gravada no campo.
  m.addMethod('daTabela', (args, ctx) => {
    const [k, col] = lista(args);
    const v = typeof k === 'string' ? (ctx as Dados)?.[k] : null;
    if (!ehObjeto(v) || !ehObjeto(v.valores)) return null;
    const x = (v.valores as Dados)[String(col)];
    return x === undefined || x === '' ? null : x;
  });
  // Interpolação linear entre as linhas (ex.: régua da vinhaça, altura → vazão). Fora da faixa = vazio.
  m.addMethod('interpolar', (args, ctx) => {
    const [t, cx, cy, valor] = lista(args);
    const x = num(valor);
    const tabela = ((ctx as Dados)?.[CTX_TABELAS] as Record<string, TabelaCarregada> | undefined)?.[String(t)];
    if (x === null || !tabela) return null;
    const pontos = tabela.linhas
      .map((l) => [num(l.valores[String(cx)]), num(l.valores[String(cy)])] as const)
      .filter((p): p is readonly [number, number] => p[0] !== null && p[1] !== null)
      .sort((a, b) => a[0] - b[0]);
    for (let i = 0; i < pontos.length; i++) {
      const [x0, y0] = pontos[i];
      if (x === x0) return y0;
      const prox = pontos[i + 1];
      if (prox && x > x0 && x < prox[0]) return y0 + ((x - x0) * (prox[1] - y0)) / (prox[0] - x0);
    }
    return null;
  });
  return m;
}

let motorUnico: LogicEngine | null = null;
const motor = () => (motorUnico ??= criarMotor());

/** Operações cujos argumentos são chaves (texto literal) e não sub-expressões. */
const ARG_CHAVE: Partial<Record<Operacao, number>> = { campo: 1, param: 1, somaColuna: 2, mediaColuna: 2, mediaPonderadaColuna: 3, contarLinhas: 1, minimoColuna: 2, maximoColuna: 2, daTabela: 2, interpolar: 3 };

export type ProblemaExpressao = string;
export type ReferenciasExpressao = {
  campos: Set<string>;
  colunas: Array<{ grade: string; coluna: string }>;
  /** `daTabela`: campo "Item de tabela" e coluna lida. */
  daTabela: Array<{ campo: string; coluna: string }>;
  /** `interpolar`: tabela e colunas X e Y. */
  interpolacoes: Array<{ tabela: string; x: string; y: string }>;
  /** `calculo`: cálculo da biblioteca, versão e quantos valores foram passados. */
  calculos: Array<{ chave: string; versao: number; valores: number }>;
  /** `param`: parâmetros usados (só valem dentro da biblioteca). */
  parametros: Set<string>;
};
/** `parametros`: a expressão é a fórmula de um cálculo da biblioteca, com estes parâmetros (§31). */
export type OpcoesAnalise = { parametros?: Set<string> };

/**
 * Confere uma expressão sem executá-la: só operações da lista, até 500 nós e 20 níveis, objetos com uma única
 * operação e chaves literais onde a operação pede chave. Devolve também os campos referenciados.
 */
export function analisarExpressao(exp: Expressao, opcoes: OpcoesAnalise = {}): { problemas: ProblemaExpressao[]; refs: ReferenciasExpressao } {
  const problemas: string[] = [];
  const refs: ReferenciasExpressao = { campos: new Set(), colunas: [], daTabela: [], interpolacoes: [], calculos: [], parametros: new Set() };
  let nos = 0;
  const visitar = (n: unknown, nivel: number) => {
    nos++;
    if (nos > LIMITES.nosExpressao) return;
    if (nivel > LIMITES.profundidadeExpressao) {
      problemas.push(`expressão com mais de ${LIMITES.profundidadeExpressao} níveis`);
      return;
    }
    if (n === null || typeof n === 'number' || typeof n === 'boolean') return;
    if (typeof n === 'string') {
      if (n.length > 200) problemas.push('texto literal com mais de 200 caracteres');
      return;
    }
    if (Array.isArray(n)) {
      for (const x of n) visitar(x, nivel + 1);
      return;
    }
    if (!ehObjeto(n)) {
      problemas.push('valor inválido na expressão');
      return;
    }
    const chaves = Object.keys(n);
    if (chaves.length !== 1) {
      problemas.push('cada nó da expressão deve ter exatamente uma operação');
      return;
    }
    const op = chaves[0] as Operacao;
    if (!(op in OPERACOES)) {
      problemas.push(`operação não permitida: "${op}"`);
      return;
    }
    const args = lista(n[op]);
    if (op === 'calculo') {
      const [k, v] = args;
      if (typeof k !== 'string' || !k || !Number.isInteger(v) || (v as number) < 1) problemas.push(`"${OPERACOES.calculo}" está incompleta`);
      else refs.calculos.push({ chave: k, versao: v as number, valores: args.length - 2 });
      if (opcoes.parametros) problemas.push('um cálculo da biblioteca não chama outro');
      if (args.slice(2).some((a) => a === null || a === undefined)) problemas.push(`"${OPERACOES.calculo}" está incompleta`);
      for (const x of args.slice(2)) visitar(x, nivel + 1);
      return;
    }
    if (op === 'param') {
      const k = args[0];
      if (typeof k !== 'string' || !k) problemas.push(`"${OPERACOES.param}" está incompleta`);
      else if (!opcoes.parametros) problemas.push('parâmetro só vale dentro de um cálculo da biblioteca');
      else if (!opcoes.parametros.has(k)) problemas.push(`parâmetro inexistente "${k}"`);
      else refs.parametros.add(k);
      return;
    }
    const qtdChaves = ARG_CHAVE[op];
    if (qtdChaves) {
      const literais = args.slice(0, qtdChaves);
      if (literais.length < qtdChaves || literais.some((a) => typeof a !== 'string')) {
        problemas.push(`a operação "${op}" precisa de ${qtdChaves === 1 ? 'uma chave de campo' : 'chaves de grade e coluna'}`);
        return;
      }
      const assChave = ASSINATURAS[op as OperacaoComum];
      if (literais.some((a) => a === '') || (assChave && args.length < assChave.args.length) || args.slice(qtdChaves).some((a) => a === null || a === undefined)) {
        problemas.push(`"${OPERACOES[op]}" está incompleta`);
      }
      if (op === 'campo' || op === 'contarLinhas') refs.campos.add(literais[0] as string);
      else if (op === 'daTabela') {
        refs.campos.add(literais[0] as string);
        refs.daTabela.push({ campo: literais[0] as string, coluna: literais[1] as string });
      } else if (op === 'interpolar') {
        refs.interpolacoes.push({ tabela: literais[0] as string, x: literais[1] as string, y: literais[2] as string });
      } else {
        refs.campos.add(literais[0] as string);
        for (const c of literais.slice(1)) refs.colunas.push({ grade: literais[0] as string, coluna: c as string });
      }
      for (const x of args.slice(qtdChaves)) visitar(x, nivel + 1);
      return;
    }
    if (op === 'diferencaDatas' && !(String(args[2]) in UNIDADES_TEMPO)) problemas.push('a diferença entre datas precisa da unidade (minutos, horas ou dias)');
    // Fórmula incompleta (montada no editor e deixada pela metade): avisa em vez de calcular sempre vazio.
    const ass = ASSINATURAS[op as OperacaoComum];
    if (ass) {
      const obrigatorios = ass.args.length - (ass.opcionais ?? 0);
      const faltando = args.length < obrigatorios || ass.args.some((t, i) => ARG_EXPRESSAO.has(t) && i < obrigatorios && (args[i] === null || args[i] === undefined));
      if (faltando || (ass.repete && args.some((a) => a === null || a === undefined))) problemas.push(`"${OPERACOES[op]}" está incompleta`);
    }
    for (const x of args) visitar(x, nivel + 1);
  };
  visitar(exp, 0);
  if (nos > LIMITES.nosExpressao) problemas.push(`expressão com mais de ${LIMITES.nosExpressao} nós`);
  return { problemas: [...new Set(problemas)], refs };
}

/** Executa uma expressão já conferida. Erro de execução vira vazio (nunca derruba o salvamento). */
export function avaliar(exp: Expressao, dados: Dados): unknown {
  if (exp === undefined) return null;
  try {
    const r = motor().run(exp, dados);
    if (typeof r === 'number' && !Number.isFinite(r)) return null;
    return r ?? null;
  } catch {
    return null;
  }
}
