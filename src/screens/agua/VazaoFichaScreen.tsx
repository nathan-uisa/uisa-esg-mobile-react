import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { formatarData, formatarDataHora, formatarNumero } from '../../agua/numeros';
import { numeroVazao, pontoPorId, PONTOS } from '../../agua/vazao';
import { colors, radius, type } from '../../theme';
import { Aviso, Cartao, Dado, Entrada, Nivel, Tela, useTipografia } from '../../ui';
import type { Rotas } from '../../navigation/tipos';

type Props = NativeStackScreenProps<Rotas, 'VazaoFicha'>;

export default function VazaoFichaScreen({ route }: Props) {
  const { registro, novo } = route.params;
  const t = useTipografia();
  return (
    <Tela titulo={numeroVazao(registro.numero)} descricao={`Vazão de Água Industrial · ${registro.dados.leituras.length} de ${PONTOS.length} pontos lidos`}>
      {novo ? <Entrada><Aviso icone="checkmark-circle" tom="verde">Leituras salvas. Elas já aparecem no portal ESG.</Aviso></Entrada> : null}
      <Entrada ordem={1}>
        <Cartao>
          <Dado rotulo="Elaborador" valor={registro.elaborador} />
          <Dado rotulo="Data/hora do registro" valor={formatarDataHora(registro.criadoEm)} />
        </Cartao>
      </Entrada>
      {registro.dados.leituras.map((l, i) => {
        const p = pontoPorId(l.ponto);
        return (
          <Entrada key={l.ponto} ordem={i + 2}>
            <Cartao style={l.excedeu ? s.excedeu : undefined}>
              <View style={s.topo}>
                <Text style={[type.section, t.titulo, { flex: 1 }]}>{p.nome}</Text>
                <Text style={s.hidrometro}>hidrômetro {l.hidrometro}</Text>
              </View>
              {l.vazao !== undefined ? (
                <View style={s.vazao}>
                  <Text style={[s.vazaoValor, t.titulo, l.excedeu && { color: colors.danger }]}>{formatarNumero(l.vazao)} m³/h</Text>
                  <Nivel pct={(l.vazao / p.limite) * 100} cor={colors.cyan} />
                  <Text style={type.caption}>Limite da outorga: {formatarNumero(p.limite, 0)} m³/h</Text>
                </View>
              ) : null}
              <Dado rotulo="Data da leitura" valor={formatarData(l.data)} />
              <Dado rotulo="Leitura" valor={`${formatarNumero(l.leitura)} m³`} />
              <Dado rotulo="Leitura anterior" valor={l.anterior ? `${formatarNumero(l.anterior.leitura)} m³ (${formatarData(l.anterior.data)}${l.anterior.informada ? ', informada' : ''})` : '— (primeira leitura)'} />
              <Dado rotulo="Volume" valor={l.volume !== undefined ? `${formatarNumero(l.volume)} m³` : '—'} />
              {l.corretiva ? (
                <View style={s.corretiva}>
                  <View style={s.corretivaTopo}><Ionicons name="warning" size={17} color={colors.danger} /><Text style={s.corretivaTitulo}>Ação corretiva</Text></View>
                  <Text style={s.corretivaTexto}><Text style={{ fontWeight: '700' }}>Análise de causa: </Text>{l.corretiva.analise}</Text>
                  <Text style={s.corretivaTexto}><Text style={{ fontWeight: '700' }}>Ação: </Text>{l.corretiva.acao}</Text>
                  <Text style={s.corretivaTexto}><Text style={{ fontWeight: '700' }}>Responsável: </Text>{l.corretiva.responsavel}</Text>
                </View>
              ) : null}
            </Cartao>
          </Entrada>
        );
      })}
    </Tela>
  );
}

const s = StyleSheet.create({
  excedeu: { borderWidth: 1.5, borderColor: colors.danger },
  topo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  hidrometro: { fontSize: 12, color: colors.textMuted, backgroundColor: colors.surface, paddingHorizontal: 10, paddingVertical: 3, borderRadius: radius.pill, overflow: 'hidden' },
  vazao: { gap: 8, padding: 14, borderRadius: radius.lg, backgroundColor: colors.cyanSoft },
  vazaoValor: { fontSize: 26, lineHeight: 34, fontWeight: '700', color: colors.primary },
  corretiva: { gap: 6, padding: 14, borderRadius: radius.lg, backgroundColor: colors.dangerSoft, marginTop: 4 },
  corretivaTopo: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  corretivaTitulo: { fontSize: 14.5, fontWeight: '700', color: colors.danger },
  corretivaTexto: { fontSize: 14, lineHeight: 20, color: colors.text },
});
