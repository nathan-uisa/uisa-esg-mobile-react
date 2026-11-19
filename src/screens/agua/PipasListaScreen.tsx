import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { formatarData, formatarDataHora, formatarNumero } from '../../agua/numeros';
import { numeroPipas, periodoPipas, PROCESSO_PIPAS, resumoPipas, totalPipas, type DadosPipas } from '../../agua/pipas';
import { useRegistros } from '../../services/processos';
import { colors, type } from '../../theme';
import { Cartao, Entrada, Vazio } from '../../ui';
import { ListaProcesso } from './ListaProcesso';

export default function PipasListaScreen() {
  const nav = useNavigation();
  const { registros, carregando, erro, recarregar } = useRegistros<DadosPipas>(PROCESSO_PIPAS);
  const r = resumoPipas(registros);
  return (
    <ListaProcesso
      foto={require('../../../assets/imagens/objetivos-metas.jpg')}
      titulo="Consumo de Água — PIPAS" descricao="Um registro por caminhão-pipa, com cada abastecimento numa linha."
      numeros={[
        { valor: `${formatarNumero(r.volumeMes, 0)} m³`, rotulo: 'no mês' },
        { valor: `${r.abastecimentos}`, rotulo: 'abastecimentos' },
        { valor: `${r.caminhoes}`, rotulo: r.caminhoes === 1 ? 'caminhão' : 'caminhões' },
      ]}
      carregando={carregando} erro={erro} aoAtualizar={() => void recarregar()} vazio={!registros.length}
      rotuloNovo="Novo registro" aoNovo={() => nav.navigate('PipasNovo')}
    >
      {!registros.length ? (
        <Vazio icone="water-outline" titulo="Nenhum registro ainda" texto="Cada registro reúne os abastecimentos de um caminhão-pipa." />
      ) : registros.map((reg, i) => {
        const p = periodoPipas(reg.dados);
        return (
          <Entrada key={reg.id} ordem={i}>
            <Cartao aoTocar={() => nav.navigate('PipasFicha', { registro: reg })} rotulo={`${numeroPipas(reg.numero)}, caminhão ${reg.dados.prefixo}`} style={s.item}>
              <View style={s.icone}><MaterialCommunityIcons name="tanker-truck" size={24} color={colors.greenDeep} /></View>
              <View style={s.textos}>
                <Text style={type.bodyStrong}>Caminhão {reg.dados.prefixo}</Text>
                <Text style={type.caption}>{numeroPipas(reg.numero)} · {p.de === p.ate ? formatarData(p.de) : `${formatarData(p.de)} a ${formatarData(p.ate)}`}</Text>
                <Text style={s.quem}>{reg.elaborador} · {formatarDataHora(reg.criadoEm)}</Text>
              </View>
              <View style={s.total}>
                <Text style={s.totalValor}>{formatarNumero(totalPipas(reg.dados))}</Text>
                <Text style={s.totalRotulo}>m³ · {reg.dados.abastecimentos.length}x</Text>
              </View>
            </Cartao>
          </Entrada>
        );
      })}
    </ListaProcesso>
  );
}

const s = StyleSheet.create({
  item: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  icone: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.greenSoft, alignItems: 'center', justifyContent: 'center' },
  textos: { flex: 1, gap: 1 },
  quem: { fontSize: 12, color: colors.textDim },
  total: { alignItems: 'flex-end' },
  totalValor: { fontSize: 19, fontWeight: '700', color: colors.primary },
  totalRotulo: { fontSize: 12, color: colors.textMuted },
});
