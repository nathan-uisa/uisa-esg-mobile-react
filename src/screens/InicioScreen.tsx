import React from 'react';
import { ImageBackground, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { dataPorExtenso, formatarNumero, saudacao } from '../agua/numeros';
import { ehDadosPipas, PROCESSO_PIPAS, resumoPipas, type DadosPipas } from '../agua/pipas';
import { ehDadosVazao, excedidas, PROCESSO_VAZAO, type DadosVazao } from '../agua/vazao';
import { useMenuFormularios } from '../services/formularios';
import { useRegistros } from '../services/processos';
import { useSessao } from '../services/sessao';
import { colors, gradients, radius, shadow, type } from '../theme';
import { Contador, Entrada, PainelFoto, Secao, useTipografia, Vazio } from '../ui';

const FRASES = {
  'Bom dia': 'Um novo dia para cuidar do amanhã.',
  'Boa tarde': 'Cada escolha de hoje é parte do futuro que a gente constrói.',
  'Boa noite': 'Obrigado por cuidar das pessoas e do ambiente hoje.',
} as const;

/** Início: saudação (como a Visão geral do portal) e os módulos do app — por enquanto, Água e Outorgas. */
export default function InicioScreen() {
  const { usuario, pode } = useSessao();
  const t = useTipografia();
  const ola = saudacao();
  const primeiro = usuario?.nome.split(/\s+/)[0] ?? '';
  return (
    <ScrollView style={s.tela} contentContainerStyle={s.conteudo} showsVerticalScrollIndicator={false}>
      <PainelFoto foto={require('../../assets/imagens/visao-geral.jpg')} altura={290}>
        <View />
        <Entrada>
          <Text style={s.data}>{dataPorExtenso().toUpperCase()}</Text>
          <Text style={[s.ola, t.titulo]} accessibilityRole="header">{ola}, {primeiro}.</Text>
          <Text style={[s.frase, t.corpo]}>{FRASES[ola]}</Text>
        </Entrada>
      </PainelFoto>

      <View style={s.corpo}>
        <Secao>Seus módulos</Secao>
        {pode('agua.view') ? <CartaoAgua /> : (
          <Vazio icone="lock-closed-outline" titulo="Nenhum módulo liberado" texto="Seu papel ainda não tem acesso a Água e Outorgas. Peça a liberação a quem administra os acessos no portal ESG." />
        )}
        <CartaoFormularios />
      </View>
    </ScrollView>
  );
}

function CartaoAgua() {
  const nav = useNavigation();
  const t = useTipografia();
  const pipas = useRegistros<DadosPipas>(PROCESSO_PIPAS, ehDadosPipas);
  const vazao = useRegistros<DadosVazao>(PROCESSO_VAZAO, ehDadosVazao);
  const r = resumoPipas(pipas.registros);
  const alertas = excedidas(vazao.registros);
  return (
    <Entrada ordem={1}>
      <Pressable accessibilityRole="button" accessibilityLabel="Abrir Água e Outorgas" onPress={() => nav.navigate('Agua')} style={({ pressed }) => [s.cartao, pressed && s.pressionado]}>
        <ImageBackground source={require('../../assets/imagens/agua.jpg')} style={s.cartaoFoto} imageStyle={s.cartaoImagem} resizeMode="cover">
          <LinearGradient colors={[...gradients.veuFoto]} style={[StyleSheet.absoluteFill, s.cartaoImagem]} />
          <View style={s.cartaoTopo}>
            <View style={s.icone}><Ionicons name="water" size={22} color={colors.white} /></View>
            <Ionicons name="arrow-forward-circle" size={34} color={colors.white} accessible={false} />
          </View>
          <View>
            <Text style={[s.cartaoTitulo, t.titulo]}>Água e Outorgas</Text>
            <Text style={s.cartaoTexto}>Captação nos rios Angelim e São Lourenço, caminhões-pipa e hidrômetros.</Text>
          </View>
        </ImageBackground>
        <View style={s.numeros}>
          <View style={s.numero}>
            <Contador valor={r.volumeMes} formatar={(n) => `${formatarNumero(n, 0)} m³`} style={[s.numeroValor, t.titulo]} />
            <Text style={s.numeroRotulo}>captados por pipas no mês</Text>
          </View>
          <View style={s.divisor} />
          <View style={s.numero}>
            <Contador valor={alertas} formatar={(n) => String(Math.round(n))} style={[s.numeroValor, t.titulo, alertas > 0 && { color: colors.danger }]} />
            <Text style={s.numeroRotulo}>{alertas === 1 ? 'leitura acima da outorga' : 'leituras acima da outorga'}</Text>
          </View>
        </View>
      </Pressable>
    </Entrada>
  );
}

/** Formulários do portal: um formulário publicado lá aparece aqui sem atualizar o app. */
function CartaoFormularios() {
  const nav = useNavigation();
  const menu = useMenuFormularios();
  const n = menu?.itens.length ?? 0;
  return (
    <Entrada ordem={2}>
      <Pressable accessibilityRole="button" accessibilityLabel="Abrir os formulários do portal" onPress={() => nav.navigate('Formularios')} style={({ pressed }) => [s.embreve, pressed && s.pressionado]}>
        <Ionicons name="document-text-outline" size={22} color={colors.greenInk} accessible={false} />
        <View style={{ flex: 1 }}>
          <Text style={[type.bodyStrong, { color: colors.greenInk }]}>Formulários do portal</Text>
          <Text style={[type.caption, s.embreveTexto]}>{menu ? `${n} ${n === 1 ? 'formulário disponível' : 'formulários disponíveis'} · versão nova chega sozinha` : 'Publicados no portal, chegam aqui sem atualizar o app.'}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.greenInk} accessible={false} />
      </Pressable>
    </Entrada>
  );
}

const s = StyleSheet.create({
  tela: { flex: 1, backgroundColor: colors.bg },
  conteudo: { paddingBottom: 120 },
  data: { fontSize: 12, letterSpacing: 1.4, fontWeight: '700', color: colors.onDarkMuted },
  ola: { fontSize: 32, lineHeight: 42, color: colors.white, fontWeight: '700', marginTop: 4, includeFontPadding: true },
  frase: { fontSize: 15.5, lineHeight: 22, color: colors.onDarkMuted, marginTop: 6 },
  corpo: { paddingHorizontal: 20, gap: 14, marginTop: 4 },
  cartao: { backgroundColor: colors.white, borderRadius: radius.hero, overflow: 'hidden', ...shadow.card },
  pressionado: { transform: [{ scale: 0.98 }] },
  cartaoFoto: { height: 210, padding: 20, justifyContent: 'space-between' },
  cartaoImagem: { borderTopLeftRadius: radius.hero, borderTopRightRadius: radius.hero },
  cartaoTopo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  icone: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.glassBorder, alignItems: 'center', justifyContent: 'center' },
  cartaoTitulo: { fontSize: 25, lineHeight: 33, color: colors.white, fontWeight: '700', includeFontPadding: true },
  cartaoTexto: { fontSize: 14, lineHeight: 20, color: colors.onDarkMuted, marginTop: 2 },
  numeros: { flexDirection: 'row', padding: 18, gap: 14 },
  numero: { flex: 1, gap: 2 },
  numeroValor: { fontSize: 22, lineHeight: 30, fontWeight: '700', color: colors.primary },
  numeroRotulo: { fontSize: 12.5, lineHeight: 17, color: colors.textMuted },
  divisor: { width: 1, backgroundColor: colors.border },
  embreve: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 16, borderRadius: radius.lg, backgroundColor: colors.greenSoft },
  embreveTexto: { flex: 1, color: colors.greenInk },
});
