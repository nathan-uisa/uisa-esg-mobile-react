import React, { useEffect, useRef, useState } from 'react';
import { Alert, Modal, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { FormularioDinamico, resumoDosErros } from '../../formularios/FormularioDinamico';
import type { Acao } from '../../formularios/motor/definicao';
import { lerCache } from '../../services/cacheRegistros';
import {
  cacheDoFormulario, ErroFormulario, fApi, novaChaveEnvio, registroEnviado, useFormulario,
  type Dados, type Pacote, type ResumoRegistro,
} from '../../services/formularios';
import { colors, radius, shadow, type } from '../../theme';
import { Aviso, Botao, Campo, Carregando, Tela, Vazio } from '../../ui';
import type { Rotas } from '../../navigation/tipos';

type Props = NativeStackScreenProps<Rotas, 'FormularioNovo'>;

/**
 * Novo registro de um formulário cadastrado: a primeira etapa da versão guardada no aparelho, com os botões dela.
 * A versão fica fixa enquanto a tela está aberta (o que a pessoa já digitou não muda de forma no meio).
 */
export default function FormularioNovoScreen({ route, navigation }: Props) {
  const { chave } = route.params;
  const form = useFormulario(chave);
  const [pacote, setPacote] = useState<Pacote | null>(null);
  const [dados, setDados] = useState<Dados>({});
  const [erros, setErros] = useState<Record<string, string>>({});
  const [ocupado, setOcupado] = useState('');
  const [pedindo, setPedindo] = useState<Acao | null>(null);
  const [comentario, setComentario] = useState('');
  const [locais, setLocais] = useState<ResumoRegistro[]>([]);
  const emVoo = useRef(false);
  const chaveEnvio = useRef(novaChaveEnvio());

  useEffect(() => { if (form.pacote && !pacote) setPacote(form.pacote); }, [form.pacote, pacote]);
  useEffect(() => { void lerCache<ResumoRegistro>(cacheDoFormulario(chave)).then((c) => setLocais(c?.registros ?? [])); }, [chave]);

  if (!pacote) {
    if (form.carregando) return <Tela titulo="Novo registro"><Carregando texto="Abrindo o formulário…" /></Tela>;
    return (
      <Tela titulo="Novo registro">
        <Vazio icone="cloud-offline-outline" titulo="Formulário indisponível" texto={`${form.erro || 'Não foi possível abrir.'} Ele fica guardado no aparelho depois da primeira vez que abrir com internet.`}
          acao={<Botao icone="refresh" rotulo="Tentar de novo" aoTocar={() => void form.conferir()} />} />
      </Tela>
    );
  }

  const { vigente, tabelas, calculos } = pacote;
  const def = vigente.definicao;
  const etapa = def.etapas[0];
  const novaVersao = form.pacote && form.pacote.vigente.versao.id !== vigente.versao.id;

  async function agir(a: Acao, texto?: string) {
    if (emVoo.current) return;
    emVoo.current = true;
    setOcupado(a.chave);
    try {
      const d = await fApi.abrir(vigente.formulario.chave, dados, a.chave, texto, chaveEnvio.current);
      registroEnviado(chave, d);
      navigation.replace('FormularioFicha', { chave, id: d.registro.id, detalhe: d, novo: true });
    } catch (e) {
      const err = e instanceof ErroFormulario ? e : null;
      setErros(err?.erros ?? {});
      const faltas = resumoDosErros(def, err?.erros ?? {});
      Alert.alert('Não foi possível enviar', faltas.length ? `Falta: ${faltas.join('\n')}` : `${e instanceof Error ? e.message : 'Tente de novo.'}\n\nO que você preencheu continua aqui. Tocar de novo não duplica o registro.`);
    } finally { emVoo.current = false; setOcupado(''); }
  }

  const acoes = etapa?.acoes ?? [];
  return (
    <Tela titulo="Novo registro" descricao={`${vigente.formulario.nome} · versão ${vigente.versao.numero}`}
      rodape={acoes.length ? (
        <View style={s.acoes}>
          {acoes.map((a, i) => (
            <Botao key={a.chave} rotulo={a.nome} ocupado={ocupado === a.chave} desabilitado={Boolean(ocupado) && ocupado !== a.chave}
              tom={a.estilo === 'perigo' ? 'perigo' : a.estilo === 'secundaria' || i > 0 ? 'suave' : 'principal'} icone={i === 0 ? 'send' : undefined}
              aoTocar={() => (a.exigeComentario ? (setComentario(''), setPedindo(a)) : void agir(a))} />
          ))}
        </View>
      ) : undefined}>
      {form.doAparelho ? <Aviso icone="cloud-offline-outline" tom="laranja">Sem internet: o formulário é o guardado no aparelho. O envio precisa de internet; o que você preencher fica aqui até conseguir.</Aviso> : null}
      {novaVersao ? <Aviso icone="information-circle-outline">Saiu a versão {form.pacote!.vigente.versao.numero} deste formulário. Envie este registro ou volte e abra de novo para usar a nova.</Aviso> : null}
      {!etapa ? <Aviso icone="alert-circle-outline" tom="vermelho">Este formulário ainda não tem etapas no portal.</Aviso> : null}
      <FormularioDinamico definicao={def} etapaChave={etapa?.chave} dados={dados} aoMudar={setDados} erros={erros} chaveFormulario={vigente.formulario.chave}
        prefixo={vigente.formulario.prefixo} tabelas={tabelas} calculos={calculos} registrosLocais={locais} />

      <Modal visible={Boolean(pedindo)} transparent animationType="fade" onRequestClose={() => setPedindo(null)}>
        <View style={s.veu}>
          <View style={s.folha}>
            <Text style={type.section}>{pedindo?.nome}</Text>
            <Campo rotulo="Comentário" obrigatorio multilinha maxLength={2000} placeholder="Explique o motivo para quem recebe o registro" value={comentario} onChangeText={setComentario} autoFocus />
            <View style={s.acoes}>
              <Botao tom="principal" rotulo={pedindo?.nome ?? 'Enviar'} desabilitado={!comentario.trim()} aoTocar={() => { const a = pedindo!; setPedindo(null); void agir(a, comentario.trim()); }} />
              <Botao tom="suave" rotulo="Voltar" aoTocar={() => setPedindo(null)} />
            </View>
          </View>
        </View>
      </Modal>
    </Tela>
  );
}

const s = StyleSheet.create({
  acoes: { gap: 10 },
  veu: { flex: 1, backgroundColor: colors.veil, justifyContent: 'center', padding: 20 },
  folha: { backgroundColor: colors.white, borderRadius: radius.card, padding: 20, gap: 14, ...shadow.float },
});
