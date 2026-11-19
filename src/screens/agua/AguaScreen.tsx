import React from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { formatarData, formatarNumero } from '../../agua/numeros';
import { PROCESSO_PIPAS, resumoPipas, type DadosPipas } from '../../agua/pipas';
import { excedidas, PROCESSO_VAZAO, ultimasVazoes, type DadosVazao } from '../../agua/vazao';
import { useRegistros } from '../../services/processos';
import { colors, radius, shadow, type } from '../../theme';
import { Aviso, BotaoRedondo, Cartao, Entrada, Nivel, PainelFoto, Secao, useTipografia } from '../../ui';

/** Água e Outorgas: como está cada captação frente à outorga e os dois processos de registro. */
export default function AguaScreen() {
  const nav = useNavigation();
  const t = useTipografia();
  const pipas = useRegistros<DadosPipas>(PROCESSO_PIPAS);
  const vazao = useRegistros<DadosVazao>(PROCESSO_VAZAO);
  const carregando = pipas.carregando || vazao.carregando;
  const rp = resumoPipas(pipas.registros);
  const alertas = excedidas(vazao.registros);
  const erro = pipas.erro || vazao.erro;

  return (
    <ScrollView style={s.tela} contentContainerStyle={s.conteudo} showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={carregando} onRefresh={() => { void pipas.recarregar(); void vazao.recarregar(); }} tintColor={colors.primary} colors={[colors.primary]} />}>
      <PainelFoto foto={require('../../../assets/imagens/agua.jpg')} altura={250}>
        <BotaoRedondo icone="arrow-back" rotulo="Voltar" tom="vidro" aoTocar={() => nav.goBack()} />
        <Entrada>
          <Text style={[s.titulo, t.titulo]} accessibilityRole="header">Água e Outorgas</Text>
          <Text style={[s.descricao, t.corpo]}>Captação nos rios Angelim e São Lourenço frente à outorga, e o uso de água pelos caminhões-pipa.</Text>
        </Entrada>
      </PainelFoto>

      <View style={s.corpo}>
        {erro ? <Aviso icone="cloud-offline-outline" tom="laranja">{erro} Puxe para baixo para tentar de novo.</Aviso> : null}

        <Secao>Outorgas agora</Secao>
        <Entrada ordem={1}>
          <Cartao>
            {ultimasVazoes(vazao.registros).map(({ ponto, leitura }, i) => {
              const pct = leitura?.vazao !== undefined ? (leitura.vazao / ponto.limite) * 100 : 0;
              return (
                <View key={ponto.id} style={[s.ponto, i > 0 && s.pontoBorda]}>
                  <View style={s.pontoTopo}>
                    <Text style={type.bodyStrong}>{ponto.nome}</Text>
                    <Text style={[s.pontoValor, leitura?.excedeu && { color: colors.danger }]}>
                      {leitura?.vazao !== undefined ? `${formatarNumero(leitura.vazao)} m³/h` : '—'}
                    </Text>
                  </View>
                  <Nivel pct={pct} cor={pct > 85 ? colors.warning : colors.cyan} />
                  <Text style={type.caption}>
                    {leitura?.vazao !== undefined
                      ? `${Math.round(pct)}% do limite de ${formatarNumero(ponto.limite, 0)} m³/h · leitura de ${formatarData(leitura.data)}`
                      : `Limite ${formatarNumero(ponto.limite, 0)} m³/h · precisa de duas leituras do mesmo hidrômetro`}
                  </Text>
                </View>
              );
            })}
          </Cartao>
        </Entrada>

        <Secao>Registrar</Secao>
        <Entrada ordem={2}>
          <Processo icone="gauge" cor={colors.primary} fundo={colors.primarySoft} titulo="Vazão de Água Industrial"
            texto="Leitura dos hidrômetros de cada ponto outorgado. O app calcula volume e vazão e cobra a ação corretiva quando passa do limite."
            numero={`${vazao.registros.length}`} rotulo={vazao.registros.length === 1 ? 'registro' : 'registros'} alerta={alertas ? `${alertas} acima da outorga` : undefined}
            aoTocar={() => nav.navigate('VazaoLista')} />
        </Entrada>
        <Entrada ordem={3}>
          <Processo icone="tanker-truck" cor={colors.greenDeep} fundo={colors.greenSoft} titulo="Consumo de Água — PIPAS"
            texto="Abastecimentos dos caminhões-pipa: data, ponto de captação, volume e código de consumo."
            numero={`${formatarNumero(rp.volumeMes, 0)} m³`} rotulo="no mês" aoTocar={() => nav.navigate('PipasLista')} />
        </Entrada>
      </View>
    </ScrollView>
  );
}

function Processo({ icone, cor, fundo, titulo, texto, numero, rotulo, alerta, aoTocar }: {
  icone: keyof typeof MaterialCommunityIcons.glyphMap; cor: string; fundo: string; titulo: string; texto: string; numero: string; rotulo: string; alerta?: string; aoTocar: () => void;
}) {
  const t = useTipografia();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={titulo} onPress={aoTocar} style={({ pressed }) => [s.processo, pressed && s.pressionado]}>
      <View style={[s.processoIcone, { backgroundColor: fundo }]}><MaterialCommunityIcons name={icone} size={30} color={cor} /></View>
      <View style={s.processoTextos}>
        <Text style={[s.processoTitulo, t.titulo]}>{titulo}</Text>
        <Text style={type.caption} numberOfLines={3}>{texto}</Text>
        <View style={s.processoRodape}>
          <Text style={[s.processoNumero, { color: cor }]}>{numero} <Text style={s.processoRotulo}>{rotulo}</Text></Text>
          {alerta ? <Text style={s.alerta}>{alerta}</Text> : null}
        </View>
      </View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  tela: { flex: 1, backgroundColor: colors.bg },
  conteudo: { paddingBottom: 40 },
  titulo: { fontSize: 30, lineHeight: 39, color: colors.white, fontWeight: '700', includeFontPadding: true },
  descricao: { fontSize: 15, lineHeight: 21, color: colors.onDarkMuted, marginTop: 4 },
  corpo: { paddingHorizontal: 20, gap: 14 },
  ponto: { gap: 8, paddingVertical: 6 },
  pontoBorda: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, paddingTop: 14 },
  pontoTopo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  pontoValor: { fontSize: 17, fontWeight: '700', color: colors.primary },
  processo: { flexDirection: 'row', gap: 16, padding: 18, borderRadius: radius.card, backgroundColor: colors.white, ...shadow.card },
  pressionado: { transform: [{ scale: 0.98 }], backgroundColor: colors.surface },
  processoIcone: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
  processoTextos: { flex: 1, gap: 4 },
  processoTitulo: { fontSize: 17, lineHeight: 23, fontWeight: '700', color: colors.text },
  processoRodape: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  processoNumero: { fontSize: 17, fontWeight: '700' },
  processoRotulo: { fontSize: 13, fontWeight: '400', color: colors.textMuted },
  alerta: { fontSize: 12, fontWeight: '700', color: colors.danger, backgroundColor: colors.dangerSoft, paddingHorizontal: 10, paddingVertical: 3, borderRadius: radius.pill, overflow: 'hidden' },
});
