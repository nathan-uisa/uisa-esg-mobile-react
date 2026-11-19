import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { formatarData, formatarDataHora, formatarNumero } from '../../agua/numeros';
import { numeroPipas, totalPipas } from '../../agua/pipas';
import { colors, radius, type } from '../../theme';
import { Aviso, Cartao, Dado, Entrada, Secao, Tela, useTipografia } from '../../ui';
import type { Rotas } from '../../navigation/tipos';

type Props = NativeStackScreenProps<Rotas, 'PipasFicha'>;

export default function PipasFichaScreen({ route }: Props) {
  const { registro, novo } = route.params;
  const t = useTipografia();
  const d = registro.dados;
  return (
    <Tela titulo={`Caminhão ${d.prefixo}`} descricao={`${numeroPipas(registro.numero)} · Consumo de Água — PIPAS`}>
      {novo ? <Entrada><Aviso icone="checkmark-circle" tom="verde">Registro {numeroPipas(registro.numero)} salvo. Ele já aparece no portal ESG.</Aviso></Entrada> : null}
      <Entrada ordem={1}>
        <View style={s.total}>
          <Text style={s.totalRotulo}>Total captado</Text>
          <Text style={[s.totalValor, t.titulo]}>{formatarNumero(totalPipas(d))} m³</Text>
          <Text style={s.totalRotulo}>{d.abastecimentos.length} {d.abastecimentos.length === 1 ? 'abastecimento' : 'abastecimentos'}</Text>
        </View>
      </Entrada>
      <Entrada ordem={2}>
        <Cartao>
          <Dado rotulo="Elaborador" valor={registro.elaborador} />
          <Dado rotulo="Data/hora do registro" valor={formatarDataHora(registro.criadoEm)} />
        </Cartao>
      </Entrada>
      <Secao>Abastecimentos</Secao>
      {d.abastecimentos.map((a, i) => (
        <Entrada key={i} ordem={i + 3}>
          <Cartao style={s.linha}>
            <View style={s.numero}><Text style={s.numeroTexto}>{i + 1}</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={type.bodyStrong}>{a.local}</Text>
              <Text style={type.caption}>{formatarData(a.data)} · código {a.codigo}</Text>
            </View>
            <Text style={s.volume}>{formatarNumero(a.volume)} m³</Text>
          </Cartao>
        </Entrada>
      ))}
    </Tela>
  );
}

const s = StyleSheet.create({
  total: { alignItems: 'center', padding: 22, borderRadius: radius.hero, backgroundColor: colors.primarySoft, gap: 2 },
  totalRotulo: { fontSize: 13.5, color: colors.primaryInk },
  totalValor: { fontSize: 34, lineHeight: 44, color: colors.primary, fontWeight: '700' },
  linha: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  numero: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.greenSoft, alignItems: 'center', justifyContent: 'center' },
  numeroTexto: { color: colors.greenInk, fontWeight: '700' },
  volume: { fontSize: 16, fontWeight: '700', color: colors.primary },
});
