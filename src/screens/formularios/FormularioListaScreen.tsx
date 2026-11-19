import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { formatarDataHora, hojeIso } from '../../agua/numeros';
import { aparenciaDo } from '../../formularios/aparencia';
import { textoDoValor } from '../../formularios/FormularioDinamico';
import type { Campo, Definicao } from '../../formularios/motor/definicao';
import { useFormulario, useRegistrosFormulario, type ResumoRegistro } from '../../services/formularios';
import { colors, radius, type } from '../../theme';
import { Aviso, Cartao, Entrada, Vazio } from '../../ui';
import { ListaProcesso } from '../agua/ListaProcesso';
import type { Rotas } from '../../navigation/tipos';

type Props = NativeStackScreenProps<Rotas, 'FormularioLista'>;

/** Até 2 campos simples para resumir cada registro na lista (o mesmo critério do portal). */
const camposResumo = (def: Definicao): Campo[] => def.campos.filter((c) =>
  !c.arquivado && !c.pessoal && !['grade', 'anexo', 'textoLongo', 'multipla'].includes(c.tipo)).slice(0, 2);

const ROTULO_SITUACAO: Record<string, string> = { aberto: 'Em andamento', concluido: 'Concluído', cancelado: 'Cancelado' };

/** Registros de um formulário cadastrado no portal, desenhados a partir da definição guardada no aparelho. */
export default function FormularioListaScreen({ route, navigation }: Props) {
  const { chave, nome } = route.params;
  const form = useFormulario(chave);
  const lista = useRegistrosFormulario(chave);
  const v = form.pacote?.vigente;
  const visual = aparenciaDo(chave, v?.formulario.modulo);
  const resumo = useMemo(() => (v ? camposResumo(v.definicao) : []), [v]);
  const mes = hojeIso().slice(0, 7);
  const abertos = lista.registros.filter((r) => r.situacao === 'aberto').length;
  const doMes = lista.registros.filter((r) => r.criadoEm.slice(0, 7) === mes).length;
  const podeAbrir = Boolean(v?.podeAbrir && v.definicao.etapas.length);

  return (
    <ListaProcesso
      foto={visual.foto} titulo={v?.formulario.nome ?? nome ?? 'Formulário'}
      descricao={v?.formulario.descricao || 'Formulário do portal ESG.'}
      numeros={[
        { valor: `${lista.registros.length}`, rotulo: lista.registros.length === 1 ? 'registro' : 'registros' },
        { valor: `${doMes}`, rotulo: 'no mês' },
        { valor: `${abertos}`, rotulo: 'em andamento' },
      ]}
      carregando={lista.carregando || (form.carregando && !form.pacote)} erro={lista.erro || form.erro}
      aoAtualizar={() => { void lista.recarregar(); void form.conferir(); }} vazio={!lista.registros.length}
      rotuloNovo={podeAbrir ? 'Novo registro' : undefined} aoNovo={podeAbrir ? () => navigation.navigate('FormularioNovo', { chave }) : undefined}
    >
      {v ? <Text style={s.versao}>Versão {v.versao.numero} do portal{form.doAparelho ? ' · guardada no aparelho' : ''}</Text> : null}
      {!v && !form.carregando && form.erro ? <Aviso icone="alert-circle-outline" tom="vermelho">{form.erro}</Aviso> : null}
      {!lista.registros.length ? (
        <Vazio icone="document-text-outline" titulo="Nenhum registro ainda" texto={podeAbrir ? 'Os registros que você abrir ou puder ver aparecem aqui.' : 'Você ainda não participa de nenhum registro deste formulário.'} />
      ) : lista.registros.map((r, i) => (
        <Entrada key={r.id} ordem={Math.min(i, 8)}>
          <ItemRegistro r={r} resumo={resumo} icone={visual.icone} aoTocar={() => navigation.navigate('FormularioFicha', { chave, id: r.id, resumo: r })} />
        </Entrada>
      ))}
    </ListaProcesso>
  );
}

function ItemRegistro({ r, resumo, icone, aoTocar }: { r: ResumoRegistro; resumo: Campo[]; icone: keyof typeof MaterialCommunityIcons.glyphMap; aoTocar: () => void }) {
  const textos = resumo.map((c) => `${c.rotulo}: ${textoDoValor(c, r.dados?.[c.chave])}`);
  const etapa = r.situacao === 'aberto' && r.etapas.length ? r.etapas.map((e) => e.nome).join(' · ') : ROTULO_SITUACAO[r.situacao] ?? r.situacao;
  const minha = r.etapas.some((e) => e.minha);
  return (
    <Cartao aoTocar={aoTocar} rotulo={`${r.codigo}, ${etapa}`} style={s.item}>
      <View style={s.icone}><MaterialCommunityIcons name={icone} size={24} color={colors.primary} /></View>
      <View style={s.textos}>
        <Text style={type.bodyStrong}>{r.codigo}</Text>
        {textos.map((t) => <Text key={t} style={type.caption} numberOfLines={1}>{t}</Text>)}
        <Text style={s.quem}>{r.elaborador} · {formatarDataHora(r.criadoEm)}</Text>
      </View>
      <Text style={[s.situacao, r.situacao === 'concluido' && s.concluido, r.situacao === 'cancelado' && s.cancelado, minha && s.minha]} numberOfLines={2}>{etapa}</Text>
    </Cartao>
  );
}

const s = StyleSheet.create({
  versao: { fontSize: 12.5, color: colors.textMuted, textAlign: 'center' },
  item: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  icone: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  textos: { flex: 1, gap: 1 },
  quem: { fontSize: 12, color: colors.textDim },
  situacao: { maxWidth: 110, fontSize: 12, fontWeight: '700', color: colors.primaryInk, backgroundColor: colors.primarySoft, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.md, overflow: 'hidden', textAlign: 'center' },
  concluido: { color: colors.greenInk, backgroundColor: colors.greenSoft },
  cancelado: { color: colors.textMuted, backgroundColor: colors.surface },
  minha: { color: colors.accentInk, backgroundColor: colors.accentSoft },
});
