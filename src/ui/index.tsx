import React, { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo, ActivityIndicator, Animated, Easing, ImageBackground, ImageSourcePropType, KeyboardAvoidingView, Platform, Pressable,
  ScrollView, StyleProp, StyleSheet, Text, TextInput, TextInputProps, View, ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { brandFontFamily, colors, gradients, radius, shadow, size, space, type } from '../theme';
import { useFontes } from '../services/fontes';
import { Onda } from './Onda';

export { Onda } from './Onda';
export type Icone = keyof typeof Ionicons.glyphMap;

const toque = () => { Haptics.selectionAsync().catch(() => undefined); };

/** Respeita "remover animações" do aparelho. */
export function useMenosMovimento() {
  const [menos, setMenos] = useState(false);
  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setMenos).catch(() => undefined);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setMenos);
    return () => sub.remove();
  }, []);
  return menos;
}

/** Fontes da marca quando carregadas; senão a do sistema com o mesmo peso. */
export function useTipografia() {
  const { carregadas } = useFontes();
  return {
    titulo: carregadas ? { fontFamily: brandFontFamily.heading, fontWeight: 'normal' as const } : null,
    corpo: carregadas ? { fontFamily: brandFontFamily.body } : null,
    medio: carregadas ? { fontFamily: brandFontFamily.medium, fontWeight: 'normal' as const } : null,
  };
}

/* ---------------- Movimento ---------------- */

/** Entra subindo e aparecendo (a "fluidez" do app). `ordem` escalona listas: cada item chega um pouco depois. */
export function Entrada({ children, ordem = 0, style }: { children: React.ReactNode; ordem?: number; style?: StyleProp<ViewStyle> }) {
  const v = useRef(new Animated.Value(0)).current;
  const menos = useMenosMovimento();
  useEffect(() => {
    Animated.timing(v, { toValue: 1, duration: menos ? 0 : 420, delay: menos ? 0 : Math.min(ordem, 8) * 60, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [v, ordem, menos]);
  return <Animated.View style={[style, { opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }] }]}>{children}</Animated.View>;
}

/** Número que conta até o valor (como os indicadores do portal). */
export function Contador({ valor, formatar, style }: { valor: number; formatar: (n: number) => string; style?: StyleProp<any> }) {
  const [mostrado, setMostrado] = useState(0);
  const menos = useMenosMovimento();
  useEffect(() => {
    if (menos || !Number.isFinite(valor)) { setMostrado(valor); return; }
    const v = new Animated.Value(0);
    const id = v.addListener(({ value }) => setMostrado(value));
    Animated.timing(v, { toValue: valor, duration: 900, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start(() => setMostrado(valor));
    return () => v.removeListener(id);
  }, [valor, menos]);
  return <Text style={style}>{formatar(mostrado)}</Text>;
}

/** Barra que enche até `pct` (0–100), como um nível d'água. Passou de 100: fica vermelha. */
export function Nivel({ pct, cor = colors.cyan, altura = 10 }: { pct: number; cor?: string; altura?: number }) {
  const v = useRef(new Animated.Value(0)).current;
  const menos = useMenosMovimento();
  const alvo = Math.max(0, Math.min(100, pct));
  useEffect(() => { Animated.timing(v, { toValue: alvo, duration: menos ? 0 : 900, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start(); }, [v, alvo, menos]);
  return (
    <View style={[s.nivel, { height: altura, borderRadius: altura / 2 }]} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(pct) }}>
      <Animated.View style={{ height: '100%', borderRadius: altura / 2, backgroundColor: pct > 100 ? colors.danger : cor, width: v.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }) }} />
    </View>
  );
}

/* ---------------- Tela ---------------- */

type TelaProps = {
  titulo?: string;
  descricao?: string;
  voltar?: boolean;
  acoes?: { icone: Icone; rotulo: string; aoTocar: () => void; ocupado?: boolean }[];
  rodape?: React.ReactNode;
  children?: React.ReactNode;
  rolar?: boolean;
  aoAtualizar?: () => void;
  conteudo?: StyleProp<ViewStyle>;
};

/** Molde das telas internas: fundo claro, cabeçalho com voltar redondo à esquerda, conteúdo e rodapé fixo opcional. */
export function Tela({ titulo, descricao, voltar = true, acoes = [], rodape, children, rolar = true, conteudo }: TelaProps) {
  const nav = useNavigation();
  const insets = useSafeAreaInsets();
  const t = useTipografia();
  const Corpo = rolar ? ScrollView : View;
  return (
    <View style={[s.tela, { paddingTop: insets.top + space.sm, paddingBottom: rodape ? 0 : insets.bottom }]}>
      <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {titulo || voltar ? (
          <View style={s.cabecalho}>
            {voltar ? <BotaoRedondo icone="arrow-back" rotulo="Voltar" aoTocar={() => nav.goBack()} /> : null}
            <View style={s.cabecalhoTextos}>
              {titulo ? <Text style={[s.cabecalhoTitulo, t.titulo]} numberOfLines={2} accessibilityRole="header">{titulo}</Text> : null}
              {descricao ? <Text style={[s.cabecalhoDescricao, t.corpo]} numberOfLines={2}>{descricao}</Text> : null}
            </View>
            {acoes.map((a) => <BotaoRedondo key={a.rotulo} icone={a.icone} rotulo={a.rotulo} aoTocar={a.aoTocar} ocupado={a.ocupado} tom="azul" />)}
          </View>
        ) : null}
        <Corpo style={s.flex} contentContainerStyle={rolar ? [s.conteudo, conteudo] : undefined} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {rolar ? children : <View style={[s.flex, s.conteudo, conteudo]}>{children}</View>}
        </Corpo>
        {rodape ? <View style={[s.rodape, { paddingBottom: insets.bottom + space.md }]}>{rodape}</View> : null}
      </KeyboardAvoidingView>
    </View>
  );
}

/** Círculo de 48 com ícone (voltar, ações do cabeçalho). `vidro` sobre foto/painel escuro. */
export function BotaoRedondo({ icone, rotulo, aoTocar, tom = 'claro', ocupado }: { icone: Icone; rotulo: string; aoTocar: () => void; tom?: 'claro' | 'azul' | 'vidro'; ocupado?: boolean }) {
  const fundo = tom === 'vidro' ? colors.glass : tom === 'azul' ? colors.primarySoft : colors.surface;
  const cor = tom === 'vidro' ? colors.white : tom === 'azul' ? colors.primary : colors.text;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={rotulo} hitSlop={8} disabled={ocupado}
      onPress={() => { toque(); aoTocar(); }}
      style={({ pressed }) => [s.redondo, { backgroundColor: fundo }, tom === 'vidro' && s.redondoVidro, pressed && s.pressionado]}>
      {ocupado ? <ActivityIndicator color={cor} /> : <Ionicons name={icone} size={22} color={cor} accessible={false} />}
    </Pressable>
  );
}

/* ---------------- Painel com foto e onda ---------------- */

/**
 * Cabeçalho grande das telas de chegada (início, módulo, processo): foto, véu azul-escuro por cima para o texto
 * ler, e a onda na borda de baixo. Os filhos ficam sobre o véu.
 */
export function PainelFoto({ foto, children, altura = 300, corDaOnda = colors.bg }: { foto: ImageSourcePropType; children: React.ReactNode; altura?: number; corDaOnda?: string }) {
  const insets = useSafeAreaInsets();
  return (
    <ImageBackground source={foto} style={[s.painelFoto, { minHeight: altura + insets.top }]} imageStyle={s.painelImagem} resizeMode="cover" accessibilityIgnoresInvertColors>
      <LinearGradient colors={[...gradients.veuFoto]} style={StyleSheet.absoluteFill} />
      <View style={[s.painelConteudo, { paddingTop: insets.top + space.md }]}>{children}</View>
      <Onda cor={corDaOnda} />
    </ImageBackground>
  );
}

/* ---------------- Botões ---------------- */

type BotaoProps = {
  rotulo: string; aoTocar: () => void; icone?: Icone; desabilitado?: boolean; ocupado?: boolean;
  /** `principal` é o laranja (uma por tela); `azul` é o padrão; `suave` fundo claro; `vidro` sobre foto. */
  tom?: 'principal' | 'azul' | 'suave' | 'vidro' | 'perigo';
  /** Pílula baixa, para dentro de cartões. */
  pequeno?: boolean;
};

export function Botao({ rotulo, aoTocar, icone, desabilitado, ocupado, tom = 'azul', pequeno }: BotaoProps) {
  const t = useTipografia();
  const fundo = { principal: colors.accent, azul: colors.primary, suave: colors.primarySoft, vidro: colors.glass, perigo: colors.dangerSoft }[tom];
  const tinta = { principal: colors.white, azul: colors.white, suave: colors.primaryInk, vidro: colors.white, perigo: colors.danger }[tom];
  const inativo = desabilitado || ocupado;
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ disabled: inativo, busy: ocupado }} disabled={inativo}
      onPress={() => { toque(); aoTocar(); }}
      style={({ pressed }) => [s.botao, pequeno && s.botaoPequeno, { backgroundColor: fundo }, tom === 'principal' && s.botaoSombra, tom === 'vidro' && s.botaoVidro, pressed && s.pressionado, inativo && s.apagado]}>
      {ocupado ? <ActivityIndicator color={tinta} /> : (
        <View style={s.botaoLinha}>
          {icone ? <Ionicons name={icone} size={pequeno ? 17 : 21} color={tinta} accessible={false} /> : null}
          <Text style={[s.botaoTexto, pequeno && s.botaoTextoPequeno, t.medio, { color: tinta }]}>{rotulo}</Text>
        </View>
      )}
    </Pressable>
  );
}

/* ---------------- Peças ---------------- */

export function Cartao({ children, style, aoTocar, rotulo }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; aoTocar?: () => void; rotulo?: string }) {
  if (!aoTocar) return <View style={[s.cartao, style]}>{children}</View>;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={rotulo} onPress={() => { toque(); aoTocar(); }}
      style={({ pressed }) => [s.cartao, style, pressed && s.cartaoPressionado]}>{children}</Pressable>
  );
}

export function Secao({ children, acao }: { children: React.ReactNode; acao?: React.ReactNode }) {
  const t = useTipografia();
  return <View style={s.secao}><Text style={[type.section, t.titulo]} accessibilityRole="header">{children}</Text>{acao}</View>;
}

export function Rotulo({ children, obrigatorio }: { children: React.ReactNode; obrigatorio?: boolean }) {
  return <Text style={s.rotulo}>{children}{obrigatorio ? <Text style={s.obrigatorio}> *</Text> : null}</Text>;
}

/** Aviso curto: ícone + frase, no tom da situação. */
export function Aviso({ icone, children, tom = 'azul' }: { icone: Icone; children: React.ReactNode; tom?: 'azul' | 'verde' | 'laranja' | 'vermelho' }) {
  const fundo = { azul: colors.primarySoft, verde: colors.greenSoft, laranja: colors.accentSoft, vermelho: colors.dangerSoft }[tom];
  const tinta = { azul: colors.primaryInk, verde: colors.greenInk, laranja: colors.accentInk, vermelho: colors.danger }[tom];
  return (
    <View style={[s.aviso, { backgroundColor: fundo }]} accessibilityRole={tom === 'vermelho' ? 'alert' : undefined}>
      <Ionicons name={icone} size={20} color={tinta} accessible={false} />
      <Text style={[s.avisoTexto, { color: tinta }]}>{children}</Text>
    </View>
  );
}

/** Campo em pílula. A explicação vai no placeholder, nunca embaixo (regra do portal). */
export function Campo({ rotulo, obrigatorio, erro, icone, multilinha, sufixo, ...input }: TextInputProps & { rotulo?: string; obrigatorio?: boolean; erro?: boolean; icone?: Icone; multilinha?: boolean; sufixo?: string }) {
  const [foco, setFoco] = useState(false);
  return (
    <View style={s.campoGrupo}>
      {rotulo ? <Rotulo obrigatorio={obrigatorio}>{rotulo}</Rotulo> : null}
      <View style={[s.campo, multilinha && s.campoMulti, foco && s.campoFoco, erro && s.campoErro]}>
        {icone ? <Ionicons name={icone} size={20} color={foco ? colors.primary : colors.textMuted} accessible={false} /> : null}
        <TextInput
          placeholderTextColor={colors.textDim}
          {...input}
          multiline={multilinha}
          accessibilityLabel={input.accessibilityLabel ?? rotulo}
          onFocus={(e) => { setFoco(true); input.onFocus?.(e); }}
          onBlur={(e) => { setFoco(false); input.onBlur?.(e); }}
          style={[s.campoInput, multilinha && s.campoInputMulti]}
          cursorColor={colors.primary}
          selectionColor={colors.cyanSoft}
        />
        {sufixo ? <Text style={s.sufixo}>{sufixo}</Text> : null}
      </View>
    </View>
  );
}

/** Pílulas de escolha única. */
export function Escolhas<T extends string>({ opcoes, valor, aoEscolher, erro, rotulo }: { opcoes: { valor: T; rotulo: string }[]; valor: T | ''; aoEscolher: (v: T) => void; erro?: boolean; rotulo: string }) {
  return (
    <View style={s.escolhas} accessibilityRole="radiogroup" accessibilityLabel={rotulo}>
      {opcoes.map((o) => {
        const ativo = o.valor === valor;
        return (
          <Pressable key={o.valor} accessibilityRole="radio" accessibilityState={{ checked: ativo }} onPress={() => { toque(); aoEscolher(o.valor); }}
            style={({ pressed }) => [s.escolha, ativo && s.escolhaAtiva, erro && !valor && s.escolhaErro, pressed && s.pressionado]}>
            {ativo ? <Ionicons name="checkmark-circle" size={18} color={colors.white} accessible={false} /> : null}
            <Text style={[s.escolhaTexto, ativo && s.escolhaTextoAtivo]}>{o.rotulo}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Sugestões tocáveis abaixo de um campo (o que já foi digitado em registros anteriores). */
export function Sugestoes({ itens, aoEscolher }: { itens: string[]; aoEscolher: (v: string) => void }) {
  if (!itens.length) return null;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.sugestoes} keyboardShouldPersistTaps="handled">
      {itens.slice(0, 12).map((i) => (
        <Pressable key={i} onPress={() => { toque(); aoEscolher(i); }} style={({ pressed }) => [s.sugestao, pressed && s.pressionado]} accessibilityRole="button" accessibilityLabel={`Usar ${i}`}>
          <Ionicons name="time-outline" size={14} color={colors.primaryInk} accessible={false} />
          <Text style={s.sugestaoTexto}>{i}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

export function Carregando({ texto = 'Carregando…' }: { texto?: string }) {
  return <View style={s.carregando} accessibilityRole="progressbar" accessibilityLabel={texto}><ActivityIndicator color={colors.primary} size="large" /><Text style={type.caption}>{texto}</Text></View>;
}

export function Vazio({ icone, titulo, texto, acao }: { icone: Icone; titulo: string; texto: string; acao?: React.ReactNode }) {
  const t = useTipografia();
  return (
    <View style={s.vazio}>
      <LinearGradient colors={[colors.cyanSoft, colors.greenSoft]} style={s.vazioIcone}><Ionicons name={icone} size={34} color={colors.primary} accessible={false} /></LinearGradient>
      <Text style={[type.section, t.titulo, s.centro]}>{titulo}</Text>
      <Text style={[type.caption, s.centro]}>{texto}</Text>
      {acao}
    </View>
  );
}

/** Linha "rótulo — valor" das fichas. */
export function Dado({ rotulo, valor, destaque }: { rotulo: string; valor: string; destaque?: 'vermelho' | 'verde' }) {
  return (
    <View style={s.dado}>
      <Text style={s.dadoRotulo}>{rotulo}</Text>
      <Text style={[s.dadoValor, destaque === 'vermelho' && { color: colors.danger }, destaque === 'verde' && { color: colors.greenInk }]}>{valor}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  centro: { textAlign: 'center' },
  pressionado: { opacity: 0.88, transform: [{ scale: 0.97 }] },
  apagado: { opacity: 0.45 },

  tela: { flex: 1, backgroundColor: colors.bg },
  cabecalho: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 10 },
  cabecalhoTextos: { flex: 1, minWidth: 0, gap: 2 },
  cabecalhoTitulo: { fontSize: 22, lineHeight: 29, fontWeight: '700', color: colors.text, includeFontPadding: true },
  cabecalhoDescricao: { fontSize: 13, lineHeight: 17, color: colors.textMuted },
  conteudo: { paddingHorizontal: 20, paddingTop: space.sm, paddingBottom: space.xl, gap: space.md },
  rodape: { paddingHorizontal: 20, paddingTop: space.md, backgroundColor: colors.bg, borderTopLeftRadius: radius.hero, borderTopRightRadius: radius.hero, ...shadow.float },

  redondo: { width: size.back, height: size.back, borderRadius: size.back / 2, alignItems: 'center', justifyContent: 'center' },
  redondoVidro: { borderWidth: 1, borderColor: colors.glassBorder },

  painelFoto: { borderBottomLeftRadius: radius.panel, borderBottomRightRadius: radius.panel, overflow: 'hidden', justifyContent: 'flex-end' },
  painelImagem: { borderBottomLeftRadius: radius.panel, borderBottomRightRadius: radius.panel },
  painelConteudo: { flex: 1, paddingHorizontal: 22, paddingBottom: 48, justifyContent: 'space-between' },

  botao: { minHeight: size.cta, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  botaoPequeno: { minHeight: 40, paddingHorizontal: 14 },
  botaoTextoPequeno: { fontSize: 14 },
  botaoSombra: { elevation: 8, shadowColor: colors.accent, shadowOpacity: 0.45, shadowRadius: 14, shadowOffset: { width: 0, height: 8 } },
  botaoVidro: { borderWidth: 1, borderColor: colors.glassBorder },
  botaoLinha: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  botaoTexto: { fontSize: 17, fontWeight: '600' },

  cartao: { backgroundColor: colors.white, borderRadius: radius.card, padding: 18, gap: 10, ...shadow.card },
  cartaoPressionado: { transform: [{ scale: 0.98 }], backgroundColor: colors.surface },
  secao: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: space.sm },
  rotulo: { ...type.label, marginLeft: 6 },
  obrigatorio: { color: colors.accent },

  aviso: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingHorizontal: 16, paddingVertical: 14, borderRadius: radius.lg },
  avisoTexto: { flex: 1, fontSize: 14, lineHeight: 20 },

  campoGrupo: { gap: 6 },
  campo: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: size.campo, paddingHorizontal: 20, borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.transparent },
  campoMulti: { borderRadius: radius.lg, alignItems: 'flex-start', paddingVertical: 12 },
  campoFoco: { borderColor: colors.cyan, backgroundColor: colors.white },
  campoErro: { borderColor: colors.danger, backgroundColor: colors.dangerSoft },
  campoInput: { flex: 1, minHeight: size.campo - 4, fontSize: 17, color: colors.text, paddingVertical: 0 },
  campoInputMulti: { minHeight: 76, textAlignVertical: 'top' },
  sufixo: { fontSize: 15, fontWeight: '600', color: colors.textMuted },

  escolhas: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  escolha: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 46, paddingHorizontal: 18, borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.transparent },
  escolhaAtiva: { backgroundColor: colors.primary },
  escolhaErro: { borderColor: colors.danger },
  escolhaTexto: { fontSize: 15, fontWeight: '600', color: colors.textSoft },
  escolhaTextoAtivo: { color: colors.white },

  sugestoes: { gap: 8, paddingVertical: 2 },
  sugestao: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 36, paddingHorizontal: 14, borderRadius: radius.pill, backgroundColor: colors.primarySoft },
  sugestaoTexto: { fontSize: 14, color: colors.primaryInk, fontWeight: '600' },

  nivel: { width: '100%', backgroundColor: colors.surface, overflow: 'hidden' },
  carregando: { alignItems: 'center', gap: 12, paddingVertical: 48 },
  vazio: { alignItems: 'center', gap: 10, paddingVertical: 36, paddingHorizontal: 12 },
  vazioIcone: { width: 84, height: 84, borderRadius: 42, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },

  dado: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  dadoRotulo: { flexShrink: 0, fontSize: 14, color: colors.textMuted },
  dadoValor: { flex: 1, fontSize: 15, fontWeight: '600', color: colors.text, textAlign: 'right' },
});
