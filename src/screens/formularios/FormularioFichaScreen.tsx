import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { formatarDataHora } from '../../agua/numeros';
import { FormularioDinamico } from '../../formularios/FormularioDinamico';
import { fApi, useFormulario, type DetalheRegistro } from '../../services/formularios';
import { colors, radius, type } from '../../theme';
import { Aviso, Cartao, Carregando, Dado, Entrada, Secao, Tela } from '../../ui';
import type { Rotas } from '../../navigation/tipos';

type Props = NativeStackScreenProps<Rotas, 'FormularioFicha'>;

const ROTULO_SITUACAO: Record<string, string> = { aberto: 'Em andamento', concluido: 'Concluído', cancelado: 'Cancelado' };
const ROTULO_EVENTO: Record<string, string> = {
  abriu: 'Abriu', agiu: 'Agiu', assumiu: 'Assumiu', liberou: 'Liberou', transferiu: 'Transferiu', cancelou: 'Cancelou', reabriu: 'Reabriu', migrou: 'Passou para a versão nova',
};

/**
 * Ficha de um registro de formulário cadastrado: os dados (só leitura), em que etapa está e o histórico. Com internet
 * vem do servidor; sem ela, do resumo guardado no aparelho. Agir nas etapas seguintes (aprovar, devolver) é no portal.
 */
export default function FichaScreen({ route }: Props) {
  const { chave, id, novo } = route.params;
  const form = useFormulario(chave);
  const [d, setD] = useState<DetalheRegistro | null>(route.params.detalhe ?? null);
  const [falha, setFalha] = useState('');
  useEffect(() => {
    let vivo = true;
    fApi.detalhe(id).then((x) => vivo && setD(x)).catch((e: Error) => vivo && setFalha(e.message));
    return () => { vivo = false; };
  }, [id]);

  const resumo = route.params.resumo;
  const def = d?.definicao ?? form.pacote?.vigente.definicao;
  const dados = d?.registro.dados ?? resumo?.dados;
  const codigo = d?.registro.codigo ?? resumo?.codigo ?? 'Registro';
  const situacao = d?.registro.situacao ?? resumo?.situacao ?? '';
  const abertas = d ? d.tarefas.filter((t) => t.situacao === 'aberta') : [];

  return (
    <Tela titulo={codigo} descricao={d?.formulario.nome ?? form.pacote?.vigente.formulario.nome}>
      {novo ? <Aviso icone="checkmark-circle-outline" tom="verde">Registro {codigo} enviado. Ele já aparece no portal.</Aviso> : null}
      {!d && falha ? <Aviso icone="cloud-offline-outline" tom="laranja">{falha} Mostrando o que o aparelho guardou.</Aviso> : null}
      {!def || !dados ? <Carregando texto="Abrindo o registro…" /> : (
        <>
          <Entrada>
            <Cartao style={s.resumo}>
              <Dado rotulo="Situação" valor={situacao === 'aberto' && abertas.length ? abertas.map((t) => t.instanciaRotulo ? `${t.etapaNome} · ${t.instanciaRotulo}` : t.etapaNome).join(', ') : ROTULO_SITUACAO[situacao] ?? situacao} />
              <Dado rotulo="Elaborador" valor={d?.registro.elaborador ?? resumo?.elaborador ?? '—'} />
              <Dado rotulo="Aberto em" valor={formatarDataHora(d?.registro.criadoEm ?? resumo?.criadoEm)} />
              {abertas.some((t) => t.minha) ? <Text style={s.minha}>Há uma etapa sua aqui: ela se faz pelo portal por enquanto.</Text> : null}
            </Cartao>
          </Entrada>
          <FormularioDinamico definicao={def} dados={dados} somenteLeitura chaveFormulario={chave} tabelas={form.pacote?.tabelas ?? {}} calculos={form.pacote?.calculos ?? {}} />
          {d?.eventos.length ? (
            <>
              <Secao>Histórico</Secao>
              <Cartao style={s.historico}>
                {d.eventos.map((e, i) => (
                  <View key={e.id} style={[s.evento, i > 0 && s.eventoBorda]}>
                    <Text style={type.bodyStrong}>{e.acaoNome ?? ROTULO_EVENTO[e.acao] ?? e.acao}</Text>
                    <Text style={type.caption}>{e.autorNome} · {formatarDataHora(e.em)}</Text>
                    {e.comentario ? <Text style={s.comentario}>{e.comentario}</Text> : null}
                  </View>
                ))}
              </Cartao>
            </>
          ) : null}
        </>
      )}
    </Tela>
  );
}

const s = StyleSheet.create({
  resumo: { gap: 10 },
  minha: { fontSize: 13.5, fontWeight: '600', color: colors.accentInk, backgroundColor: colors.accentSoft, padding: 10, borderRadius: radius.md, overflow: 'hidden' },
  historico: { gap: 0 },
  evento: { gap: 2, paddingVertical: 10 },
  eventoBorda: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  comentario: { fontSize: 14, color: colors.textSoft, marginTop: 2 },
});
