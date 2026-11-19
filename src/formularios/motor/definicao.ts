// CÓPIA de uisa-esg-back-nestjs/src/formularios/motor (docs/10 §11). Não edite aqui: altere lá e rode `npm run motor:copiar`.
/**
 * Formulários dinâmicos — estrutura da definição (JSON de uma versão). Doc: docs/10_FORMULARIOS-DINAMICOS.md §7.
 *
 * ARQUIVO PURO E ESPELHADO: existe igual em `uisa-esg-front-nextjs/src/lib/formularios/definicao.ts`.
 * Não importar nada do NestJS nem do React aqui. Ao mudar, copiar para o outro repositório.
 */

export const FORMATO_DEFINICAO = 1;

/** Limites do §17 (proteção do servidor). */
export const LIMITES = {
  nosExpressao: 500,
  profundidadeExpressao: 20,
  camposPorFormulario: 500,
  linhasPorGrade: 2000,
  bytesDefinicao: 1024 * 1024,
  bytesDados: 2 * 1024 * 1024,
  msCalculo: 2000,
  etapasPorFormulario: 60,
  opcoesPorCampo: 500,
  colunasPorGrade: 40,
  /** Tabelas de referência (§7.7, §28). */
  linhasPorTabela: 10000,
  colunasPorTabela: 30,
} as const;

export type EstadoCampo = 'oculto' | 'leitura' | 'editavel' | 'obrigatorio';
export const ESTADOS_CAMPO: EstadoCampo[] = ['oculto', 'leitura', 'editavel', 'obrigatorio'];

export type TipoCampo =
  | 'texto'
  | 'textoLongo'
  | 'numero'
  | 'moeda'
  | 'data'
  | 'dataHora'
  | 'lista'
  | 'multipla'
  | 'simNao'
  | 'usuario'
  | 'anexo'
  | 'calculado'
  | 'grade'
  | 'referencia'
  | 'anterior';

/** Tipos disponíveis na fase 1 (os demais do §7.1 entram nas fases seguintes como novos blocos). */
export const TIPOS_CAMPO: { tipo: TipoCampo; rotulo: string; emGrade: boolean }[] = [
  { tipo: 'texto', rotulo: 'Texto curto', emGrade: true },
  { tipo: 'textoLongo', rotulo: 'Texto longo', emGrade: false },
  { tipo: 'numero', rotulo: 'Número', emGrade: true },
  { tipo: 'moeda', rotulo: 'Moeda (R$)', emGrade: true },
  { tipo: 'data', rotulo: 'Data', emGrade: true },
  { tipo: 'dataHora', rotulo: 'Data e hora', emGrade: false },
  { tipo: 'lista', rotulo: 'Lista (uma opção)', emGrade: true },
  { tipo: 'multipla', rotulo: 'Múltipla escolha', emGrade: false },
  { tipo: 'simNao', rotulo: 'Sim / Não', emGrade: true },
  { tipo: 'usuario', rotulo: 'Usuário do portal', emGrade: false },
  { tipo: 'anexo', rotulo: 'Anexo', emGrade: false },
  { tipo: 'calculado', rotulo: 'Calculado', emGrade: true },
  { tipo: 'grade', rotulo: 'Grade (tabela de linhas)', emGrade: false },
  { tipo: 'referencia', rotulo: 'Item de tabela', emGrade: true },
  { tipo: 'anterior', rotulo: 'Valor do registro anterior', emGrade: false },
];

export type Opcao = { chave: string; rotulo: string; arquivada?: boolean };

/** Árvore JSON Logic com as operações em português da lista fechada (expressoes.ts). */
export type Expressao = unknown;

export type Campo = {
  chave: string;
  rotulo: string;
  tipo: TipoCampo;
  /** Orientação dentro do campo (regra do portal: nunca texto abaixo do campo). */
  placeholder?: string;
  arquivado?: boolean;
  largo?: boolean;
  /** Número/moeda. */
  min?: number;
  max?: number;
  casas?: number;
  /** Texto. */
  maxCaracteres?: number;
  /** Data: não aceita data futura. */
  maxHoje?: boolean;
  /** Lista/múltipla. */
  opcoes?: Opcao[];
  /** Calculado. */
  expressao?: Expressao;
  /** Item de tabela: chave da tabela de referência (§28). */
  tabela?: string;
  /**
   * Valor do registro anterior (§29): campo lido (`de`) no registro anterior do mesmo formulário com os mesmos valores
   * em `mesmo` (ex.: ponto e hidrômetro) e, se houver `ordem` (campo de data), com data anterior à deste registro.
   */
  de?: string;
  mesmo?: string[];
  ordem?: string;
  /** Grade: colunas (campos simples) e limites de linhas. */
  colunas?: Campo[];
  minLinhas?: number;
  maxLinhas?: number;
  /** Coluna de grade: obrigatória em cada linha quando a grade é obrigatória/editável. */
  obrigatorio?: boolean;
  /** Coluna de grade: o mesmo valor não pode aparecer em duas linhas (ex.: horário da medição), §36. */
  unico?: boolean;
  /**
   * Coluna calculada de grade (§36): com as colunas usadas pela conta preenchidas e sem resultado (ex.: altura fora da
   * tabela da régua), a linha é recusada com esta mensagem.
   */
  exigeResultado?: string;
  /** Dado pessoal (LGPD): só aparece para participantes e responsáveis. */
  pessoal?: boolean;
};

export type Secao = { chave: string; titulo: string; campos: string[] };

/**
 * "Quem?" do construtor (§6.2, §7.3). Um alvo é um grupo do portal, um papel, uma pessoa, uma permissão do portal,
 * o solicitante, os participantes do registro, todos os usuários ou a pessoa escolhida num campo "usuário".
 */
export type Alvo =
  | { tipo: 'solicitante' }
  | { tipo: 'participantes' }
  | { tipo: 'todos' }
  | { grupo: string; nome?: string }
  | { papel: string; nome?: string }
  | { usuario: string; nome?: string }
  | { permissao: string; nome?: string }
  | { campo: string };

/** Destino de uma ação: uma etapa, "fim" ou várias etapas ao mesmo tempo (divisão paralela). Doc §22. */
export type Destino = string | string[];

/** Desvio condicional: avaliado em ordem no servidor; o primeiro verdadeiro decide o destino. */
export type Desvio = { quando: Expressao; vaiPara: Destino };

/**
 * Prazo da etapa em dias corridos (docs/10 §13 e §23). Ao abrir a tarefa o servidor grava a data-limite; a rotina
 * `prazos` avisa quem deve agir `avisarAntes` dias antes, cobra no vencimento e, com `escalonarApos`, avisa os
 * administradores do formulário depois de tantos dias de atraso.
 */
export type Prazo = {
  dias: number;
  avisarAntes?: number;
  escalonarApos?: number;
  /** Por onde saem os lembretes deste prazo. Ausente = só e-mail. */
  canais?: CanalAviso[];
};

/** Canal de um aviso (docs/10 §23.8). WhatsApp vai para o celular do cadastro do usuário. */
export type CanalAviso = 'email' | 'whatsapp';

export const CANAIS_AVISO: Record<CanalAviso, string> = { email: 'E-mail', whatsapp: 'WhatsApp' };

/** Canais efetivos (ausente ou vazio = só e-mail, como era antes do WhatsApp). */
export function canaisDe(x: { canais?: CanalAviso[] } | undefined): CanalAviso[] {
  const lista = (x?.canais ?? []).filter((c): c is CanalAviso => c in CANAIS_AVISO);
  return lista.length ? [...new Set(lista)] : ['email'];
}

/** Quando um aviso (e-mail ou WhatsApp) dispara. */
export type GatilhoAviso = 'tarefa-aberta' | 'acao' | 'concluido' | 'cancelado';

/**
 * Aviso por e-mail e/ou WhatsApp (docs/10 §23). `para` usa os mesmos "Quem?" das etapas (`todos` é ignorado).
 * - `tarefa-aberta`: `etapa` vazia = qualquer etapa; `responsaveis` = quem deve agir na tarefa aberta.
 * - `acao`: `acao` = "chaveEtapa.chaveAcao" do botão usado.
 */
export type Aviso = {
  chave: string;
  quando: GatilhoAviso;
  etapa?: string;
  acao?: string;
  responsaveis?: boolean;
  para: Alvo[];
  /** Por onde o aviso sai. Ausente = só e-mail. */
  canais?: CanalAviso[];
  /** E-mails digitados em campos de texto do registro (ex.: e-mail do gestor da área), §32. */
  paraCampos?: string[];
  /** Endereços fixos, de fora do portal (até 10), §32. */
  paraEmails?: string[];
  /** Assunto e mensagem próprios, com marcadores {chave_do_campo}, {registro}, {formulario}, {etapa}… (§32). */
  assunto?: string;
  mensagem?: string;
};

/** Marcadores que todo aviso aceita além das chaves dos campos (§32). */
export const MARCADORES_AVISO: Record<string, string> = {
  registro: 'Código do registro', formulario: 'Nome do formulário', etapa: 'Etapa', solicitante: 'Quem abriu',
  acao: 'Botão usado', comentario: 'Comentário', link: 'Link do registro',
};
export const RE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const GATILHOS_AVISO: Record<GatilhoAviso, string> = {
  'tarefa-aberta': 'Uma tarefa for aberta',
  acao: 'Um botão for usado',
  concluido: 'O registro for concluído',
  cancelado: 'O registro for cancelado',
};

export type Acao = {
  chave: string;
  nome: string;
  /** Chave da próxima etapa, "fim" ou lista de etapas (abre todas em paralelo). Vale quando nenhum desvio for verdadeiro. */
  vaiPara: Destino;
  /** "Se ... então vai para ...". Avaliados em ordem; o primeiro verdadeiro vence. */
  desvios?: Desvio[];
  /** Ao agir, cancela as outras tarefas abertas do mesmo ramo paralelo (ex.: "Reprovar"). */
  encerraParalelas?: boolean;
  exigeComentario?: boolean;
  /** false = não confere obrigatórios (ex.: devolver). Padrão: true. */
  validar?: boolean;
  estilo?: 'primaria' | 'secundaria' | 'perigo';
};

export type Etapa = {
  chave: string;
  nome: string;
  responsavel: Alvo[];
  /** "solicitante" ou chave de etapa (quem agiu nela não pode agir nesta). */
  naoPodeSer?: string[];
  visivelPara?: Alvo[];
  prazo?: Prazo;
  /** Estado de cada campo nesta etapa. Campo ausente = "leitura". */
  campos: Record<string, EstadoCampo>;
  acoes: Acao[];
  /** Junção: espera "todas" as tarefas paralelas do ramo terminarem ou segue na primeira ("qualquer"). */
  juncao?: 'todas' | 'qualquer';
  /** Campo "múltipla escolha": abre uma tarefa desta etapa para cada opção marcada. */
  paraCada?: string;
  /** Com paraCada: responsável por opção (chave da opção → alvos). Opção sem entrada usa `responsavel`. */
  responsavelPorItem?: Record<string, Alvo[]>;
  /** Com paraCada: campos que cada tarefa preenche separadamente (guardados por opção). */
  camposDaInstancia?: string[];
  /** Posição do nó no editor em grafo. */
  posicao?: { x: number; y: number };
};

/** Lista de etapas de destino (sem repetição) de um destino simples ou múltiplo. */
export function listaDestino(d: Destino | undefined): string[] {
  if (Array.isArray(d)) return [...new Set(d.filter((x) => typeof x === 'string' && x))];
  return typeof d === 'string' && d ? [d] : [];
}

/** Todos os destinos possíveis de uma ação (padrão + desvios). */
export function destinosDe(acao: Acao): string[] {
  const todos = [...listaDestino(acao.vaiPara)];
  for (const d of acao.desvios ?? []) todos.push(...listaDestino(d.vaiPara));
  return [...new Set(todos)];
}

/** Chave interna onde ficam os valores por instância (paraCada): dados._instancias[etapa][opcao][campo]. */
export const CHAVE_INSTANCIAS = '_instancias';

// ── Tabelas de referência (docs/10 §7.7 e §28) ──

export type TipoColunaTabela = 'texto' | 'numero';
export type ColunaTabela = { chave: string; rotulo: string; tipo: TipoColunaTabela };
export type ValorCelula = string | number | null;
export type LinhaTabela = { chave: string; valores: Record<string, ValorCelula> };
/** Conteúdo de uma versão da tabela. `colunaRotulo` é a coluna (texto) que identifica a linha para quem escolhe. */
export type ConteudoTabela = { colunas: ColunaTabela[]; colunaRotulo: string; linhas: LinhaTabela[] };
/** Tabela pronta para o motor: conteúdo de uma versão publicada. */
export type TabelaCarregada = ConteudoTabela & { chave: string; nome: string; versao: number };

/**
 * Valor de um campo "Item de tabela": a linha escolhida e uma CÓPIA dos valores dela na versão usada. Assim o
 * registro não muda quando a tabela muda, e os cálculos leem a cópia.
 */
export type ValorReferencia = { linha: string; rotulo: string; tabela: string; versao: number; valores: Record<string, ValorCelula> };

// ── Valor do registro anterior (docs/10 §29) ──

/** De onde veio cada "valor do registro anterior" (`dados._anteriores`): campo → registro de origem. */
export const CHAVE_ANTERIORES = '_anteriores';
export type OrigemAnterior = { registro: string; registroId: string; data: string | null };
/** Tipos que podem ser chave de comparação ("mesmo valor em"). */
export const TIPOS_MESMO = new Set<TipoCampo>(['texto', 'numero', 'moeda', 'data', 'dataHora', 'lista', 'simNao', 'usuario', 'referencia', 'calculado']);
/** Tipos que o "valor do registro anterior" pode ler. */
export const TIPOS_DE_ANTERIOR = new Set<TipoCampo>(['texto', 'textoLongo', 'numero', 'moeda', 'data', 'dataHora', 'lista', 'simNao', 'usuario', 'referencia', 'calculado']);
/** Campo de onde o "valor do registro anterior" lê (para mostrar, comparar e calcular como esse tipo). */
export function fonteDoAnterior(campos: Campo[], c: Campo | undefined): Campo | undefined {
  if (c?.tipo !== 'anterior') return c;
  const f = campos.find((x) => x.chave === c.de);
  return f && f.tipo !== 'anterior' ? f : undefined;
}

// ── Biblioteca de cálculos (docs/10 §31) ──

/** Tipo esperado de um parâmetro (orienta o editor e o teste; o motor aceita qualquer valor). */
export type TipoParametro = 'numero' | 'data' | 'texto' | 'valor';
export type ParametroCalculo = { chave: string; rotulo: string; tipo: TipoParametro };
/** Conteúdo de uma versão de um cálculo da biblioteca: parâmetros e a fórmula que os usa (`{"param": "p_x"}`). */
export type ConteudoCalculo = { parametros: ParametroCalculo[]; expressao: Expressao; casas?: number; unidade?: string };
export type CalculoCarregado = ConteudoCalculo & { chave: string; nome: string; versao: number };
/** Chaves internas do contexto do motor (nunca gravadas). */
export const CTX_CALCULOS = '__calculos';
export const CTX_PARAMETROS = '__parametros';
export const chaveVersaoCalculo = (chave: string, versao: number) => `${chave}@${versao}`;

/** Todas as expressões de cálculo da definição: campos calculados e colunas calculadas das grades (§36). */
export function expressoesDaDefinicao(def: Definicao): Expressao[] {
  const saida: Expressao[] = [];
  for (const c of def.campos) {
    if (c.expressao) saida.push(c.expressao);
    for (const col of c.colunas ?? []) if (col.expressao) saida.push(col.expressao);
  }
  return saida;
}

/** Tipos de coluna de grade que aceitam "sem repetir" (§36). */
export const TIPOS_UNICO_GRADE = new Set<TipoCampo>(['texto', 'numero', 'data', 'lista', 'referencia']);

/** Cálculos da biblioteca que uma definição usa, com a versão fixada: `{"calculo": ["k_vazao", 2, …]}`. */
export function calculosDaDefinicao(def: Definicao): Array<{ chave: string; versao: number }> {
  const vistos = new Map<string, { chave: string; versao: number }>();
  const visitar = (n: unknown) => {
    if (Array.isArray(n)) return n.forEach(visitar);
    if (!n || typeof n !== 'object') return;
    for (const [k, v] of Object.entries(n)) {
      if (k === 'calculo' && Array.isArray(v) && typeof v[0] === 'string' && v[0] && Number.isInteger(v[1]) && (v[1] as number) > 0) {
        vistos.set(chaveVersaoCalculo(v[0], v[1] as number), { chave: v[0], versao: v[1] as number });
      }
      visitar(v);
    }
  };
  for (const e of expressoesDaDefinicao(def)) visitar(e);
  return [...vistos.values()];
}

/** Tabelas usadas dentro de cálculos da biblioteca (interpolação), para carregar junto com as do formulário. */
export function tabelasDosCalculos(calculos: ConteudoCalculo[]): Set<string> {
  const saida = new Set<string>();
  const visitar = (n: unknown) => {
    if (Array.isArray(n)) return n.forEach(visitar);
    if (!n || typeof n !== 'object') return;
    for (const [k, v] of Object.entries(n)) {
      if (k === 'interpolar' && Array.isArray(v) && typeof v[0] === 'string' && v[0]) saida.add(v[0]);
      visitar(v);
    }
  };
  for (const c of calculos) visitar(c.expressao);
  return saida;
}

/** Versões das tabelas que o registro usou (`dados._tabelas`): chave da tabela → número da versão. */
export const CHAVE_TABELAS = '_tabelas';
/** Chave interna do contexto de cálculo com o conteúdo das tabelas (nunca gravada). */
export const CTX_TABELAS = '__tabelas';

export const rotuloDaLinha = (t: ConteudoTabela, l: LinhaTabela): string => String(l.valores[t.colunaRotulo] ?? '').trim();

/** Cópia gravada no registro a partir de uma linha da tabela. */
export function valorReferencia(t: TabelaCarregada, l: LinhaTabela): ValorReferencia {
  return { linha: l.chave, rotulo: rotuloDaLinha(t, l), tabela: t.chave, versao: t.versao, valores: { ...l.valores } };
}

export const ehValorReferencia = (v: unknown): v is ValorReferencia =>
  Boolean(v) && typeof v === 'object' && !Array.isArray(v) && typeof (v as ValorReferencia).linha === 'string' && typeof (v as ValorReferencia).valores === 'object';

/** Tabelas que uma definição usa (campos "Item de tabela", colunas de grade e cálculos com interpolação). */
export function tabelasDaDefinicao(def: Definicao): Set<string> {
  const saida = new Set<string>();
  const ver = (c: Campo) => {
    if (c.tipo === 'referencia' && c.tabela) saida.add(c.tabela);
    for (const col of c.colunas ?? []) ver(col);
  };
  for (const c of def.campos) ver(c);
  const visitar = (n: unknown) => {
    if (Array.isArray(n)) return n.forEach(visitar);
    if (!n || typeof n !== 'object') return;
    for (const [k, v] of Object.entries(n)) {
      if (k === 'interpolar' && Array.isArray(v) && typeof v[0] === 'string' && v[0]) saida.add(v[0]);
      visitar(v);
    }
  };
  for (const e of expressoesDaDefinicao(def)) visitar(e);
  return saida;
}

/**
 * Regra do formulário (docs/10 §9 e §27): "se [condição] então …".
 * - `obrigar` / `ocultar`: mudam o campo enquanto a pessoa preenche.
 * - `impedir`: recusa o envio com `mensagem`, mostrada no `campo` (ex.: "se Data fim < Data início então impedir:
 *   A data fim não pode ser antes do início"). Só cobra na etapa em que alguém pode corrigir (§27.2).
 */
export type AcaoRegra = 'obrigar' | 'ocultar' | 'impedir';
export type Regra = {
  quando: Expressao;
  entao: { acao: AcaoRegra; campo: string; mensagem?: string };
};

export type Validacao = { tipo: 'unico'; campos: string[]; mensagem: string };

export type Definicao = {
  formato: number;
  secoes: Secao[];
  campos: Campo[];
  /** A primeira etapa é a de abertura. */
  etapas: Etapa[];
  regras?: Regra[];
  validacoes?: Validacao[];
  /** Quem vê os registros (além de participantes e responsáveis), quando a etapa não diz. */
  visivelPara?: Alvo[];
  /** Gera o PDF do registro ao concluir (guardado e anexado nos avisos de conclusão), §32. */
  pdfAoConcluir?: boolean;
  /** Avisos por e-mail/WhatsApp (versionados com o fluxo). Ausente = nenhum aviso. */
  avisos?: Aviso[];
};

export type AcessoFormulario = { verNoMenu: Alvo[]; abrir: Alvo[] };

export const ETAPA_FIM = 'fim';

export const RE_CHAVE = /^[a-z][A-Za-z0-9_]{0,47}$/;
export const RE_CHAVE_OPCAO = /^[A-Za-z0-9_-]{1,48}$/;

export function novaChave(prefixo: 'c' | 's' | 'e' | 'a' | 'o' | 'g' | 'v'): string {
  const letras = 'abcdefghijkmnpqrstuvwxyz23456789';
  let s = '';
  for (let i = 0; i < 8; i++) s += letras[Math.floor(Math.random() * letras.length)];
  return `${prefixo}_${s}`;
}

export function definicaoVazia(): Definicao {
  return {
    formato: FORMATO_DEFINICAO,
    secoes: [{ chave: 's_dados', titulo: 'Dados', campos: [] }],
    campos: [],
    etapas: [
      {
        chave: 'e_abertura',
        nome: 'Abertura',
        responsavel: [{ tipo: 'solicitante' }],
        campos: {},
        acoes: [{ chave: 'a_enviar', nome: 'Enviar', vaiPara: ETAPA_FIM, estilo: 'primaria' }],
      },
    ],
    regras: [],
    validacoes: [],
    visivelPara: [],
    avisos: [{ chave: 'v_tarefa', quando: 'tarefa-aberta', responsaveis: true, para: [] }],
  };
}

export const ehObjeto = (v: unknown): v is Record<string, unknown> => Boolean(v && typeof v === 'object' && !Array.isArray(v));

export function campoPorChave(def: Definicao, chave: string): Campo | undefined {
  return def.campos.find((c) => c.chave === chave);
}

export function estadoNaEtapa(etapa: Etapa | undefined, campo: Campo): EstadoCampo {
  if (!etapa) return 'leitura';
  if (campo.tipo === 'calculado') {
    const e = etapa.campos[campo.chave];
    return e === 'oculto' ? 'oculto' : 'leitura';
  }
  return etapa.campos[campo.chave] ?? 'leitura';
}

export function vazio(v: unknown): boolean {
  return v === null || v === undefined || (typeof v === 'string' && !v.trim()) || (Array.isArray(v) && v.length === 0);
}

export function descreverAlvo(a: Alvo): string {
  if ('tipo' in a) return a.tipo === 'solicitante' ? 'Solicitante' : a.tipo === 'participantes' ? 'Participantes do registro' : 'Todos os usuários';
  if ('grupo' in a) return `Grupo ${a.nome ?? a.grupo}`;
  if ('papel' in a) return `Papel ${a.nome ?? a.papel}`;
  if ('usuario' in a) return a.nome ?? a.usuario;
  if ('permissao' in a) return `Permissão ${a.nome ?? a.permissao}`;
  return `Pessoa do campo ${a.campo}`;
}
