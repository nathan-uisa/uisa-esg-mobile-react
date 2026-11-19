import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { formatarDataHora, formatarNumero } from '../../agua/numeros';
import { excedidas, numeroVazao, PONTOS, PROCESSO_VAZAO, type DadosVazao } from '../../agua/vazao';
import { useRegistros } from '../../services/processos';
import { colors, radius, type } from '../../theme';
import { Cartao, Entrada, Vazio } from '../../ui';
import { ListaProcesso } from './ListaProcesso';

export default function VazaoListaScreen() {
  const nav = useNavigation();
  const { registros, carregando, erro, recarregar } = useRegistros<DadosVazao>(PROCESSO_VAZAO);
  const alertas = excedidas(registros);
  return (
    <ListaProcesso
      foto={require('../../../assets/imagens/indicadores-fontes.jpg')}
      titulo="Vazão de Água Industrial" descricao="Leituras dos hidrômetros de Rio Angelim e São Lourenço."
      numeros={[
        { valor: `${registros.length}`, rotulo: registros.length === 1 ? 'registro' : 'registros' },
        { valor: `${alertas}`, rotulo: 'acima da outorga', alerta: alertas > 0 },
      ]}
      carregando={carregando} erro={erro} aoAtualizar={() => void recarregar()} vazio={!registros.length}
      rotuloNovo="Nova leitura" aoNovo={() => nav.navigate('VazaoNova')}
    >
      {!registros.length ? (
        <Vazio icone="speedometer-outline" titulo="Nenhuma leitura ainda" texto="Cada registro reúne as leituras dos hidrômetros dos pontos outorgados." />
      ) : registros.map((reg, i) => {
        const excedeu = reg.dados.leituras.some((l) => l.excedeu);
        return (
          <Entrada key={reg.id} ordem={i}>
            <Cartao aoTocar={() => nav.navigate('VazaoFicha', { registro: reg })} rotulo={numeroVazao(reg.numero)}>
              <View style={s.topo}>
                <View style={[s.icone, excedeu && { backgroundColor: colors.dangerSoft }]}>
                  <MaterialCommunityIcons name={excedeu ? 'water-alert' : 'gauge'} size={22} color={excedeu ? colors.danger : colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={type.bodyStrong}>{numeroVazao(reg.numero)}</Text>
                  <Text style={type.caption}>{reg.elaborador} · {formatarDataHora(reg.criadoEm)}</Text>
                </View>
              </View>
              <View style={s.pontos}>
                {PONTOS.map((p) => {
                  const l = reg.dados.leituras.find((x) => x.ponto === p.id);
                  const texto = !l ? 'não lido' : l.vazao === undefined ? '1ª leitura' : `${formatarNumero(l.vazao)} m³/h`;
                  return (
                    <View key={p.id} style={[s.ponto, l?.excedeu && s.pontoExcedeu]}>
                      <Text style={s.pontoNome} numberOfLines={1}>{p.curto}</Text>
                      <Text style={[s.pontoValor, !l?.vazao && { color: colors.textDim }, l?.excedeu && { color: colors.danger }]}>{texto}</Text>
                    </View>
                  );
                })}
              </View>
            </Cartao>
          </Entrada>
        );
      })}
    </ListaProcesso>
  );
}

const s = StyleSheet.create({
  topo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icone: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  pontos: { flexDirection: 'row', gap: 8 },
  ponto: { flex: 1, paddingVertical: 8, paddingHorizontal: 10, borderRadius: radius.md, backgroundColor: colors.surface, gap: 2 },
  pontoExcedeu: { backgroundColor: colors.dangerSoft },
  pontoNome: { fontSize: 11.5, color: colors.textMuted },
  pontoValor: { fontSize: 13.5, fontWeight: '700', color: colors.primary },
});
