import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { formatarData, formatarDataHora, formatarNumero, hojeIso, lerNumero } from '../agua/numeros';
import { anterioresLocais } from './anteriores';
import { enviarAnexo, fApi, type Anexo, type Dados, type Pessoa, type ResumoRegistro } from '../services/formularios';
import { colors, radius, shadow, type } from '../theme';
import { Botao, Campo as CampoUi, Cartao, Escolhas, Rotulo, useTipografia } from '../ui';
import { SeletorData } from '../ui/SeletorData';
import {
  CHAVE_ANTERIORES, ehValorReferencia, fonteDoAnterior, rotuloDaLinha, valorReferencia, vazio,
  type CalculoCarregado, type Campo, type Definicao, type EstadoCampo, type OrigemAnterior, type TabelaCarregada,
} from './motor/definicao';
import { bloqueiosDasGrades, bloqueiosDasRegras, calcular, estadosEfetivos } from './motor/estado';

/**
 * Desenha um formulário cadastrado no portal a partir da definição (o mesmo papel do `<FormularioDinamico />` do
 * portal). Cada campo aparece oculto, só leitura, editável ou obrigatório conforme a etapa e as regras; os cálculos
 * rodam com o mesmo motor do servidor (src/formularios/motor, cópia do backend). Quem decide o que é gravado é o servidor.
 */
export type PropsFormulario = {
  definicao: Definicao;
  etapaChave?: string | null;
  dados: Dados;
  aoMudar?: (dados: Dados) => void;
  erros?: Record<string, string>;
  chaveFormulario: string;
  prefixo?: string;
  somenteLeitura?: boolean;
  tabelas: Record<string, TabelaCarregada>;
  calculos: Record<string, CalculoCarregado>;
  /** Registros guardados no aparelho: prévia do "valor do registro anterior" sem internet. */
  registrosLocais?: ResumoRegistro[];
};

const TabelasCtx = createContext<Record<string, TabelaCarregada>>({});

/** Prévia do "valor do registro anterior" (§29): do servidor com internet; sem ela, dos registros do aparelho. */
function useAnteriores(def: Definicao, chave: string, prefixo: string, dados: Dados, ativo: boolean, locais: ResumoRegistro[]) {
  const campos = useMemo(() => def.campos.filter((c) => c.tipo === 'anterior' && !c.arquivado && c.de), [def]);
  const chaves = useMemo(() => [...new Set(campos.flatMap((c) => [...(c.mesmo ?? []), c.ordem ?? '']).filter(Boolean))], [campos]);
  const assinatura = ativo && campos.length ? JSON.stringify(chaves.map((k) => dados[k] ?? null)) : '';
  const [r, setR] = useState<{ de: string; valores: Record<string, unknown>; origens: Record<string, OrigemAnterior | null>; local: boolean } | null>(null);
  useEffect(() => {
    if (!assinatura) return;
    let vivo = true;
    const t = setTimeout(() => {
      const enviar = Object.fromEntries(chaves.map((k) => [k, dados[k] ?? null]));
      fApi.anteriores(chave, enviar)
        .then((x) => vivo && setR({ de: assinatura, ...x, local: false }))
        .catch(() => { if (vivo) { const l = anterioresLocais(def, enviar, locais, prefixo); setR({ de: assinatura, valores: l.valores, origens: l.origens, local: true }); } });
    }, 400);
    return () => { vivo = false; clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assinatura, chave]);
  return r;
}

export function FormularioDinamico({ definicao, etapaChave, dados: brutos, aoMudar, erros: errosServidor = {}, chaveFormulario, prefixo = '', somenteLeitura, tabelas, calculos, registrosLocais = [] }: PropsFormulario) {
  const previa = useAnteriores(definicao, chaveFormulario, prefixo, brutos, !somenteLeitura && Boolean(etapaChave), registrosLocais);
  const dados = useMemo(() => (previa ? { ...brutos, ...previa.valores, [CHAVE_ANTERIORES]: { ...(brutos[CHAVE_ANTERIORES] as object), ...previa.origens } } : brutos), [brutos, previa]);
  const { calc, estados, bloqueios } = useMemo(() => {
    const calc = calcular(definicao, dados, tabelas, calculos);
    const etapa = etapaChave ? definicao.etapas.find((e) => e.chave === etapaChave) : undefined;
    const estados = estadosEfetivos(definicao, etapa, calc);
    if (somenteLeitura || !etapa) for (const k of Object.keys(estados)) if (estados[k] !== 'oculto') estados[k] = 'leitura';
    const bloqueios = somenteLeitura || !etapa ? {} : { ...bloqueiosDasGrades(definicao, estados, calc), ...bloqueiosDasRegras(definicao, estados, calc) };
    return { calc, estados, bloqueios };
  }, [definicao, etapaChave, dados, somenteLeitura, tabelas, calculos]);
  const porChave = useMemo(() => new Map(definicao.campos.map((c) => [c.chave, c])), [definicao]);
  const erros = { ...errosServidor, ...bloqueios };
  const mudar = (chave: string, v: unknown) => aoMudar?.({ ...brutos, [chave]: v });
  const origens = (dados[CHAVE_ANTERIORES] ?? {}) as Record<string, OrigemAnterior | null>;
  const t = useTipografia();

  return (
    <TabelasCtx.Provider value={tabelas}>
      <View style={s.form}>
        {erros._formulario ? <Text style={s.erroGeral} accessibilityRole="alert">{erros._formulario}</Text> : null}
        {definicao.secoes.map((sec) => {
          const campos = sec.campos.map((k) => porChave.get(k)).filter((c): c is Campo => Boolean(c && !c.arquivado && estados[c.chave] !== 'oculto'));
          if (!campos.length) return null;
          return (
            <Cartao key={sec.chave} style={s.secao}>
              <Text style={[type.section, t.titulo]} accessibilityRole="header">{sec.titulo}</Text>
              {campos.map((c) => c.tipo === 'anterior'
                ? <CampoAnterior key={c.chave} campo={c} def={definicao} valor={calc[c.chave]} origem={origens[c.chave]} buscado={c.chave in origens} local={Boolean(previa?.local)}
                    faltam={[...(c.mesmo ?? []), c.ordem ?? ''].filter((k) => k && vazio(calc[k])).map((k) => porChave.get(k)?.rotulo ?? k)} />
                : <CampoDinamico key={c.chave} campo={c} estado={estados[c.chave]} valor={calc[c.chave]} erros={erros} chaveFormulario={chaveFormulario} aoMudar={(v) => mudar(c.chave, v)} />)}
            </Cartao>
          );
        })}
      </View>
    </TabelasCtx.Provider>
  );
}

function CampoDinamico({ campo, estado, valor, erros, chaveFormulario, aoMudar }: {
  campo: Campo; estado: EstadoCampo; valor: unknown; erros: Record<string, string>; chaveFormulario: string; aoMudar: (v: unknown) => void;
}) {
  const leitura = estado === 'leitura';
  const erro = erros[campo.chave];
  const obrigatorio = estado === 'obrigatorio';
  if (campo.tipo === 'grade') return <Grade campo={campo} valor={valor} leitura={leitura} obrigatorio={obrigatorio} erros={erros} erro={erro} aoMudar={aoMudar} />;
  return (
    <View style={s.campo}>
      {leitura ? <Leitura campo={campo} valor={valor} />
        : <Entrada campo={campo} valor={valor} obrigatorio={obrigatorio} invalido={Boolean(erro)} chaveFormulario={chaveFormulario} aoMudar={aoMudar} />}
      {erro ? <Text style={s.erro} accessibilityRole="alert">{erro}</Text> : null}
    </View>
  );
}

/** "Valor do registro anterior" (§29): só leitura, com o registro de onde veio. */
function CampoAnterior({ campo, def, valor, origem, buscado, local, faltam }: { campo: Campo; def: Definicao; valor: unknown; origem?: OrigemAnterior | null; buscado: boolean; local: boolean; faltam: string[] }) {
  const fonte = fonteDoAnterior(def.campos, campo);
  const nota = origem ? `De ${origem.registro}${origem.data ? ` (${formatarData(origem.data.slice(0, 10))})` : ''}${local ? ' · do aparelho' : ''}`
    : faltam.length ? `Preencha ${faltam.join(' e ')} para buscar`
    : buscado ? (local ? 'Sem registro anterior guardado no aparelho' : 'Sem registro anterior') : 'Buscando…';
  return (
    <View style={s.campo}>
      <Rotulo>{campo.rotulo}</Rotulo>
      <View style={[s.leitura, s.calculado]}>
        <Text style={s.leituraTexto}>{vazio(valor) || !fonte ? '—' : textoDoValor(fonte, valor)}</Text>
        <Text style={s.nota}>{nota}</Text>
      </View>
    </View>
  );
}

/** Texto de um valor em leitura (também nas listas de registros). */
export function textoDoValor(campo: Campo, valor: unknown): string {
  if (vazio(valor)) return '—';
  switch (campo.tipo) {
    case 'numero': case 'calculado': return typeof valor === 'number' ? formatarNumero(valor, campo.casas ?? 3) : String(valor);
    case 'moeda': return typeof valor === 'number' ? `R$ ${formatarNumero(valor, 2)}` : String(valor);
    case 'data': return formatarData(String(valor));
    case 'dataHora': return formatarDataHora(String(valor));
    case 'lista': return campo.opcoes?.find((o) => o.chave === valor)?.rotulo ?? String(valor);
    case 'multipla': return (Array.isArray(valor) ? valor : []).map((v) => campo.opcoes?.find((o) => o.chave === v)?.rotulo ?? String(v)).join(', ');
    case 'simNao': return valor === true ? 'Sim' : valor === false ? 'Não' : '—';
    case 'usuario': return (valor as { nome?: string })?.nome ?? '—';
    case 'anexo': { const n = (valor as Anexo[]).length; return `${n} ${n === 1 ? 'anexo' : 'anexos'}`; }
    case 'grade': { const n = (valor as unknown[]).length; return `${n} ${n === 1 ? 'linha' : 'linhas'}`; }
    case 'referencia': return ehValorReferencia(valor) ? valor.rotulo || '—' : '—';
    case 'anterior': return typeof valor === 'number' ? formatarNumero(valor, 3) : ehValorReferencia(valor) ? valor.rotulo : typeof valor === 'object' ? ((valor as { nome?: string }).nome ?? '—') : String(valor);
    default: return String(valor);
  }
}

function Leitura({ campo, valor }: { campo: Campo; valor: unknown }) {
  return (
    <View>
      <Rotulo>{campo.rotulo}</Rotulo>
      {campo.tipo === 'anexo' && Array.isArray(valor) && valor.length
        ? <ListaAnexos anexos={valor as Anexo[]} />
        : <View style={[s.leitura, campo.tipo === 'calculado' && s.calculado]}><Text style={s.leituraTexto}>{textoDoValor(campo, valor)}</Text></View>}
    </View>
  );
}

/** Número no jeito brasileiro: o texto fica local enquanto digita; o valor enviado é number. */
function EntradaNumero({ campo, valor, obrigatorio, invalido, aoMudar, rotulo }: { campo: Campo; valor: unknown; obrigatorio?: boolean; invalido?: boolean; aoMudar: (v: number | null) => void; rotulo?: string }) {
  const externo = typeof valor === 'number' ? valor : null;
  const [texto, setTexto] = useState(externo === null ? '' : formatarNumero(externo, 8).replace(/,?0+$/, ''));
  const [ultimo, setUltimo] = useState<number | null>(externo);
  if (externo !== ultimo) { setUltimo(externo); if (lerNumero(texto) !== externo) setTexto(externo === null ? '' : formatarNumero(externo, 8).replace(/,?0+$/, '')); }
  return (
    <CampoUi rotulo={rotulo ?? campo.rotulo} obrigatorio={obrigatorio} erro={invalido} keyboardType="decimal-pad" placeholder={campo.placeholder ?? (campo.tipo === 'moeda' ? 'R$ 0,00' : '')}
      sufixo={campo.tipo === 'moeda' ? 'R$' : undefined} value={texto} onChangeText={(t) => { setTexto(t); const n = lerNumero(t); setUltimo(n); aoMudar(n); }} />
  );
}

function Entrada({ campo, valor, obrigatorio, invalido, chaveFormulario, aoMudar, rotulo }: { campo: Campo; valor: unknown; obrigatorio?: boolean; invalido?: boolean; chaveFormulario: string; aoMudar: (v: unknown) => void; rotulo?: string }) {
  const nome = rotulo ?? campo.rotulo;
  const opcoes = (campo.opcoes ?? []).filter((o) => !o.arquivada || o.chave === valor || (Array.isArray(valor) && valor.includes(o.chave)));
  switch (campo.tipo) {
    case 'texto':
      return <CampoUi rotulo={nome} obrigatorio={obrigatorio} erro={invalido} maxLength={campo.maxCaracteres ?? 400} placeholder={campo.placeholder} value={String(valor ?? '')} onChangeText={aoMudar} />;
    case 'textoLongo':
      return <CampoUi rotulo={nome} obrigatorio={obrigatorio} erro={invalido} multilinha maxLength={campo.maxCaracteres ?? 8000} placeholder={campo.placeholder} value={String(valor ?? '')} onChangeText={aoMudar} />;
    case 'numero': case 'moeda':
      return <EntradaNumero campo={campo} valor={valor} obrigatorio={obrigatorio} invalido={invalido} aoMudar={aoMudar} rotulo={nome} />;
    case 'data':
      return <SeletorData rotulo={nome} obrigatorio={obrigatorio} erro={invalido} valor={typeof valor === 'string' ? valor : ''} max={campo.maxHoje ? hojeIso() : '2999-12-31'} aoMudar={(v) => aoMudar(v || null)} />;
    case 'dataHora':
      return <EntradaDataHora campo={campo} rotulo={nome} valor={valor} obrigatorio={obrigatorio} invalido={invalido} aoMudar={aoMudar} />;
    case 'lista':
      if (opcoes.length > 8) {
        return <Escolher rotulo={nome} obrigatorio={obrigatorio} invalido={invalido} placeholder={campo.placeholder || 'Escolha…'}
          itens={opcoes.map((o) => ({ chave: o.chave, rotulo: o.rotulo }))} valor={typeof valor === 'string' ? valor : ''} aoEscolher={(k) => aoMudar(k || null)} />;
      }
      return <View><Rotulo obrigatorio={obrigatorio}>{nome}</Rotulo>
        <Escolhas rotulo={nome} erro={invalido} opcoes={opcoes.map((o) => ({ valor: o.chave, rotulo: o.rotulo }))} valor={typeof valor === 'string' ? valor : ''} aoEscolher={(k) => aoMudar(k === valor ? null : k)} /></View>;
    case 'multipla': {
      const atuais = Array.isArray(valor) ? (valor as string[]) : [];
      return <View><Rotulo obrigatorio={obrigatorio}>{nome}</Rotulo>
        <View style={s.chips}>{opcoes.map((o) => {
          const ativo = atuais.includes(o.chave);
          return <Pressable key={o.chave} accessibilityRole="checkbox" accessibilityState={{ checked: ativo }} onPress={() => aoMudar(ativo ? atuais.filter((x) => x !== o.chave) : [...atuais, o.chave])}
            style={[s.chip, ativo && s.chipAtivo, invalido && s.chipErro]}>
            {ativo ? <Ionicons name="checkmark" size={16} color={colors.white} /> : null}
            <Text style={[s.chipTexto, ativo && s.chipTextoAtivo]}>{o.rotulo}</Text>
          </Pressable>;
        })}</View></View>;
    }
    case 'simNao':
      return <View><Rotulo obrigatorio={obrigatorio}>{nome}</Rotulo>
        <Escolhas rotulo={nome} erro={invalido} opcoes={[{ valor: 'sim', rotulo: 'Sim' }, { valor: 'nao', rotulo: 'Não' }]}
          valor={valor === true ? 'sim' : valor === false ? 'nao' : ''} aoEscolher={(k) => { const b = k === 'sim'; aoMudar(valor === b ? null : b); }} /></View>;
    case 'usuario':
      return <SeletorPessoa rotulo={nome} obrigatorio={obrigatorio} invalido={invalido} placeholder={campo.placeholder} valor={(valor as Pessoa | null) ?? null} aoEscolher={aoMudar} />;
    case 'anexo':
      return <EntradaAnexo rotulo={nome} obrigatorio={obrigatorio} invalido={invalido} valor={Array.isArray(valor) ? (valor as Anexo[]) : []} chaveFormulario={chaveFormulario} aoMudar={aoMudar} />;
    case 'referencia':
      return <EntradaReferencia campo={campo} rotulo={nome} obrigatorio={obrigatorio} invalido={invalido} valor={valor} aoMudar={aoMudar} />;
    default:
      return <Leitura campo={campo} valor={valor} />;
  }
}

/** Data e hora: o dia pelas setas e a hora digitada (HH:MM). Valor "AAAA-MM-DDTHH:MM". */
function EntradaDataHora({ campo, rotulo, valor, obrigatorio, invalido, aoMudar }: { campo: Campo; rotulo: string; valor: unknown; obrigatorio?: boolean; invalido?: boolean; aoMudar: (v: unknown) => void }) {
  const atual = typeof valor === 'string' ? valor : '';
  const dia = atual.slice(0, 10);
  const [hora, setHora] = useState(atual.slice(11, 16));
  const montar = (d: string, h: string) => (d && /^\d{2}:\d{2}$/.test(h) ? `${d}T${h}` : null);
  return (
    <View style={{ gap: 10 }}>
      <SeletorData rotulo={rotulo} obrigatorio={obrigatorio} erro={invalido} valor={dia} max={campo.maxHoje ? hojeIso() : '2999-12-31'} aoMudar={(d) => aoMudar(montar(d, hora))} />
      <CampoUi rotulo="Hora" placeholder="Ex.: 14:30" keyboardType="numbers-and-punctuation" maxLength={5} erro={invalido} value={hora}
        onChangeText={(t) => { const h = t.replace(/[^\d:]/g, ''); const f = /^\d{3,4}$/.test(h) ? `${h.slice(0, h.length - 2)}:${h.slice(-2)}`.padStart(5, '0') : h; setHora(f); aoMudar(montar(dia, f)); }} />
    </View>
  );
}

/** Lista longa ou tabela de referência: abre uma folha com busca. */
function Escolher({ rotulo, obrigatorio, invalido, placeholder, itens, valor, aoEscolher, rotuloAtual }: {
  rotulo: string; obrigatorio?: boolean; invalido?: boolean; placeholder: string; itens: { chave: string; rotulo: string }[]; valor: string; aoEscolher: (chave: string) => void; rotuloAtual?: string;
}) {
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState('');
  const escolhido = rotuloAtual ?? itens.find((i) => i.chave === valor)?.rotulo;
  const filtrados = useMemo(() => { const b = busca.trim().toLowerCase(); return b ? itens.filter((i) => i.rotulo.toLowerCase().includes(b)) : itens; }, [itens, busca]);
  return (
    <View>
      <Rotulo obrigatorio={obrigatorio}>{rotulo}</Rotulo>
      <Pressable accessibilityRole="button" accessibilityLabel={`${rotulo}: ${escolhido ?? 'escolher'}`} onPress={() => { setBusca(''); setAberto(true); }} style={[s.seletor, invalido && s.seletorErro]}>
        <Text style={[s.seletorTexto, !escolhido && { color: colors.textDim }]} numberOfLines={1}>{escolhido ?? placeholder}</Text>
        <Ionicons name="chevron-down" size={20} color={colors.textMuted} />
      </Pressable>
      <Modal visible={aberto} animationType="slide" transparent onRequestClose={() => setAberto(false)}>
        <View style={s.veu}>
          <View style={s.folha}>
            <View style={s.folhaTopo}>
              <Text style={[type.section, { flex: 1 }]}>{rotulo}</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="Fechar" onPress={() => setAberto(false)} style={s.fechar}><Ionicons name="close" size={24} color={colors.text} /></Pressable>
            </View>
            {itens.length > 8 ? <CampoUi icone="search" placeholder="Digite para buscar" value={busca} onChangeText={setBusca} autoFocus /> : null}
            <FlatList data={filtrados} keyExtractor={(i) => i.chave} keyboardShouldPersistTaps="handled" initialNumToRender={30}
              ListEmptyComponent={<Text style={[type.caption, { padding: 16 }]}>Nada encontrado.</Text>}
              renderItem={({ item }) => (
                <Pressable accessibilityRole="button" onPress={() => { aoEscolher(item.chave === valor ? '' : item.chave); setAberto(false); }} style={({ pressed }) => [s.item, pressed && { backgroundColor: colors.surface }]}>
                  <Text style={[s.itemTexto, item.chave === valor && { color: colors.primary, fontWeight: '700' }]}>{item.rotulo}</Text>
                  {item.chave === valor ? <Ionicons name="checkmark" size={20} color={colors.primary} /> : null}
                </Pressable>
              )} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

/** Item de tabela (§28): o valor guarda a cópia da linha (o servidor refaz a cópia na versão do registro). */
function EntradaReferencia({ campo, rotulo, obrigatorio, invalido, valor, aoMudar }: { campo: Campo; rotulo: string; obrigatorio?: boolean; invalido?: boolean; valor: unknown; aoMudar: (v: unknown) => void }) {
  const tabela = useContext(TabelasCtx)[campo.tabela ?? ''];
  const atual = ehValorReferencia(valor) ? valor : null;
  const itens = useMemo(() => (tabela ? [...tabela.linhas].map((l) => ({ chave: l.chave, rotulo: rotuloDaLinha(tabela, l) })).sort((a, b) => a.rotulo.localeCompare(b.rotulo, 'pt-BR', { numeric: true })) : []), [tabela]);
  if (!tabela) return <View><Rotulo obrigatorio={obrigatorio}>{rotulo}</Rotulo><Text style={type.caption}>Tabela indisponível neste aparelho. Atualize os formulários com internet.</Text></View>;
  return <Escolher rotulo={rotulo} obrigatorio={obrigatorio} invalido={invalido} placeholder={campo.placeholder || 'Escolha…'} itens={itens} valor={atual?.linha ?? ''} rotuloAtual={atual?.rotulo}
    aoEscolher={(k) => { const l = tabela.linhas.find((x) => x.chave === k); aoMudar(l ? valorReferencia(tabela, l) : null); }} />;
}

/** Usuário do portal: busca por nome ou matrícula (precisa de internet). */
function SeletorPessoa({ rotulo, obrigatorio, invalido, placeholder, valor, aoEscolher }: { rotulo: string; obrigatorio?: boolean; invalido?: boolean; placeholder?: string; valor: Pessoa | null; aoEscolher: (p: Pessoa | null) => void }) {
  const [termo, setTermo] = useState('');
  const [lista, setLista] = useState<Pessoa[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [falha, setFalha] = useState('');
  useEffect(() => {
    const q = termo.trim();
    if (q.length < 2) { setLista([]); return; }
    let vivo = true;
    const t = setTimeout(() => {
      setBuscando(true);
      fApi.pessoas(q).then((r) => { if (vivo) { setLista(r.pessoas.slice(0, 8)); setFalha(''); } })
        .catch((e: Error) => { if (vivo) setFalha(e.message); }).finally(() => vivo && setBuscando(false));
    }, 350);
    return () => { vivo = false; clearTimeout(t); };
  }, [termo]);
  if (valor) {
    return <View><Rotulo obrigatorio={obrigatorio}>{rotulo}</Rotulo>
      <View style={s.pessoa}>
        <Ionicons name="person-circle-outline" size={26} color={colors.primary} />
        <Text style={[s.itemTexto, { flex: 1 }]}>{valor.nome}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel={`Trocar ${valor.nome}`} onPress={() => aoEscolher(null)} style={s.fechar}><Ionicons name="close" size={20} color={colors.textMuted} /></Pressable>
      </View></View>;
  }
  return (
    <View style={{ gap: 6 }}>
      <CampoUi rotulo={rotulo} obrigatorio={obrigatorio} erro={invalido} icone="search" placeholder={placeholder || 'Nome ou matrícula'} value={termo} onChangeText={setTermo} autoCorrect={false} />
      {buscando ? <ActivityIndicator color={colors.primary} /> : null}
      {falha ? <Text style={s.erro}>{falha}</Text> : null}
      {lista.map((p) => (
        <Pressable key={p.id} accessibilityRole="button" onPress={() => { aoEscolher(p); setTermo(''); setLista([]); }} style={({ pressed }) => [s.item, s.itemBorda, pressed && { backgroundColor: colors.surface }]}>
          <View style={{ flex: 1 }}><Text style={s.itemTexto}>{p.nome}</Text><Text style={type.caption}>{[p.matricula, p.cargo].filter(Boolean).join(' · ')}</Text></View>
        </Pressable>
      ))}
    </View>
  );
}

function ListaAnexos({ anexos, aoRemover }: { anexos: Anexo[]; aoRemover?: (a: Anexo) => void }) {
  return (
    <View style={{ gap: 8 }}>
      {anexos.map((a) => (
        <View key={a.chave} style={s.anexo}>
          <Ionicons name={a.tipo?.startsWith('image/') ? 'image-outline' : 'document-attach-outline'} size={20} color={colors.primary} />
          <Text style={[s.itemTexto, { flex: 1 }]} numberOfLines={1}>{a.nome}</Text>
          {a.bytes ? <Text style={type.caption}>{formatarNumero(a.bytes / 1024 / 1024, 1)} MB</Text> : null}
          {aoRemover ? <Pressable accessibilityRole="button" accessibilityLabel={`Remover ${a.nome}`} onPress={() => aoRemover(a)} style={s.fechar}><Ionicons name="trash-outline" size={20} color={colors.danger} /></Pressable> : null}
        </View>
      ))}
    </View>
  );
}

/** Anexo: foto da câmera ou da galeria; sobe na hora (precisa de internet) e o campo guarda a referência. */
function EntradaAnexo({ rotulo, obrigatorio, invalido, valor, chaveFormulario, aoMudar }: { rotulo: string; obrigatorio?: boolean; invalido?: boolean; valor: Anexo[]; chaveFormulario: string; aoMudar: (v: unknown) => void }) {
  const [enviando, setEnviando] = useState(false);
  async function pegar(origem: 'camera' | 'galeria') {
    try {
      const perm = origem === 'camera' ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) { Alert.alert('Permissão', origem === 'camera' ? 'Libere a câmera para o app ESG nas configurações do celular.' : 'Libere as fotos para o app ESG nas configurações do celular.'); return; }
      const r = origem === 'camera'
        ? await ImagePicker.launchCameraAsync({ quality: 0.6, exif: false })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.6, allowsMultipleSelection: true, selectionLimit: 10 - valor.length });
      if (r.canceled || !r.assets?.length) return;
      setEnviando(true);
      const novos: Anexo[] = [];
      for (const a of r.assets.slice(0, 10 - valor.length)) {
        const ext = (a.fileName?.split('.').pop() || a.mimeType?.split('/')[1] || 'jpg').toLowerCase();
        novos.push(await enviarAnexo(chaveFormulario, { uri: a.uri, nome: a.fileName || `foto-${Date.now()}.${ext}`, tipo: a.mimeType || 'image/jpeg' }));
      }
      aoMudar([...valor, ...novos]);
    } catch (e) {
      Alert.alert('Anexo', e instanceof Error ? e.message : 'Não foi possível anexar.');
    } finally { setEnviando(false); }
  }
  return (
    <View style={{ gap: 8 }}>
      <Rotulo obrigatorio={obrigatorio}>{rotulo}</Rotulo>
      {valor.length ? <ListaAnexos anexos={valor} aoRemover={(a) => aoMudar(valor.filter((x) => x.chave !== a.chave))} /> : null}
      {valor.length < 10 ? (
        <View style={[s.anexoBotoes, invalido && s.seletorErro]}>
          {enviando ? <ActivityIndicator color={colors.primary} /> : <>
            <Botao pequeno tom="suave" icone="camera-outline" rotulo="Tirar foto" aoTocar={() => void pegar('camera')} />
            <Botao pequeno tom="suave" icone="images-outline" rotulo="Da galeria" aoTocar={() => void pegar('galeria')} />
          </>}
        </View>
      ) : null}
    </View>
  );
}

/** Grade: cada linha vira um cartão com as colunas; "Adicionar linha" embaixo. */
function Grade({ campo, valor, leitura, obrigatorio, erros, erro, aoMudar }: { campo: Campo; valor: unknown; leitura: boolean; obrigatorio: boolean; erros: Record<string, string>; erro?: string; aoMudar: (v: unknown) => void }) {
  const colunas = (campo.colunas ?? []).filter((c) => !c.arquivado);
  const linhas = Array.isArray(valor) ? (valor as Dados[]) : [];
  const max = campo.maxLinhas ?? 200;
  useEffect(() => { if (!leitura && !linhas.length && (campo.minLinhas ?? 0) > 0) aoMudar([{}]); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const mudarLinha = (i: number, col: string, v: unknown) => aoMudar(linhas.map((l, j) => (j === i ? { ...l, [col]: v } : l)));
  return (
    <View style={s.campo}>
      <Rotulo obrigatorio={obrigatorio}>{campo.rotulo}</Rotulo>
      {!linhas.length ? <Text style={type.caption}>Nenhuma linha.</Text> : null}
      {linhas.map((l, i) => (
        <View key={i} style={s.linha}>
          <View style={s.linhaTopo}>
            <Text style={s.linhaTitulo}>Linha {i + 1}</Text>
            {!leitura ? <Pressable accessibilityRole="button" accessibilityLabel={`Remover a linha ${i + 1}`} onPress={() => aoMudar(linhas.filter((_, j) => j !== i))} style={s.fechar}><Ionicons name="trash-outline" size={20} color={colors.danger} /></Pressable> : null}
          </View>
          {colunas.map((c) => {
            const e = erros[`${campo.chave}.${i + 1}.${c.chave}`];
            return (
              <View key={c.chave} style={{ gap: 4 }}>
                {leitura || c.tipo === 'calculado'
                  ? <View><Rotulo>{c.rotulo}</Rotulo><View style={[s.leitura, c.tipo === 'calculado' && s.calculado]}><Text style={s.leituraTexto}>{textoDoValor(c, l[c.chave])}</Text></View></View>
                  : <Entrada campo={c} valor={l[c.chave]} obrigatorio={c.obrigatorio} invalido={Boolean(e)} chaveFormulario="" rotulo={c.rotulo} aoMudar={(v) => mudarLinha(i, c.chave, v)} />}
                {e ? <Text style={s.erro}>{e}</Text> : null}
              </View>
            );
          })}
        </View>
      ))}
      {!leitura && linhas.length < max ? <Botao pequeno tom="suave" icone="add" rotulo="Adicionar linha" aoTocar={() => aoMudar([...linhas, linhas.length ? copiaParaNovaLinha(colunas, linhas[linhas.length - 1]) : {}])} /> : null}
      {erro ? <Text style={s.erro} accessibilityRole="alert">{erro}</Text> : null}
    </View>
  );
}

/** Linha nova repete data e itens de tabela da anterior (o jeito do campo: mesmo dia, mesmo local). */
function copiaParaNovaLinha(colunas: Campo[], anterior: Dados): Dados {
  const nova: Dados = {};
  for (const c of colunas) if ((c.tipo === 'data' || c.tipo === 'referencia') && !c.unico && !vazio(anterior[c.chave])) nova[c.chave] = anterior[c.chave];
  return nova;
}

/** Erros do servidor numa lista legível ("Falta: …"). */
export function resumoDosErros(def: Definicao, erros: Record<string, string>): string[] {
  const porChave = new Map(def.campos.map((c) => [c.chave, c]));
  return Object.entries(erros).map(([k, msg]) => {
    if (k === '_formulario') return msg;
    const [campo, linha, coluna] = k.split('.');
    const c = porChave.get(campo);
    if (!c) return msg;
    if (!linha) return `${c.rotulo}: ${msg}`;
    const col = c.colunas?.find((x) => x.chave === coluna);
    return `${c.rotulo}, linha ${linha}${col ? ` (${col.rotulo})` : ''}: ${msg}`;
  });
}

const s = StyleSheet.create({
  form: { gap: 14 },
  secao: { gap: 16 },
  campo: { gap: 6 },
  erro: { color: colors.danger, fontSize: 13.5, fontWeight: '600' },
  erroGeral: { color: colors.danger, fontSize: 14.5, fontWeight: '700', backgroundColor: colors.dangerSoft, padding: 12, borderRadius: radius.md, overflow: 'hidden' },
  leitura: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 16, paddingVertical: 10, borderRadius: radius.md, backgroundColor: colors.surface },
  calculado: { backgroundColor: colors.primarySoft },
  leituraTexto: { fontSize: 16, color: colors.text, fontWeight: '600' },
  nota: { fontSize: 12.5, color: colors.textMuted, marginTop: 2 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44, paddingHorizontal: 16, borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border },
  chipAtivo: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipErro: { borderColor: colors.danger },
  chipTexto: { fontSize: 15, color: colors.text, fontWeight: '600' },
  chipTextoAtivo: { color: colors.white },
  seletor: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 18, borderRadius: radius.pill, backgroundColor: colors.white, borderWidth: 1.5, borderColor: colors.border },
  seletorErro: { borderColor: colors.danger },
  seletorTexto: { flex: 1, fontSize: 16, color: colors.text },
  veu: { flex: 1, backgroundColor: colors.veil, justifyContent: 'flex-end' },
  folha: { maxHeight: '85%', backgroundColor: colors.white, borderTopLeftRadius: radius.hero, borderTopRightRadius: radius.hero, padding: 20, paddingBottom: 32, gap: 12, ...shadow.float },
  folhaTopo: { flexDirection: 'row', alignItems: 'center' },
  fechar: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  item: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, borderRadius: radius.md },
  itemBorda: { borderWidth: 1, borderColor: colors.border },
  itemTexto: { fontSize: 16, color: colors.text },
  pessoa: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 10, paddingLeft: 14, borderRadius: radius.pill, backgroundColor: colors.primarySoft },
  anexo: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 10, paddingLeft: 14, borderRadius: radius.md, backgroundColor: colors.surface },
  anexoBotoes: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, padding: 4, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.transparent },
  linha: { gap: 12, padding: 14, borderRadius: radius.lg, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border },
  linhaTopo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  linhaTitulo: { fontSize: 14, fontWeight: '700', color: colors.primaryInk },
});
