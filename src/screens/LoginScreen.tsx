import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, ImageBackground, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AMBIENTES, useAmbiente, type Ambiente } from '../services/ambiente';
import { LoginError, useSessao } from '../services/sessao';
import { colors, gradients, radius, shadow, space, type } from '../theme';
import { CampoSenha } from '../ui/CampoSenha';
import { Entrada, Onda, useTipografia } from '../ui';
import { Marca } from '../ui/Marca';
import type { Rotas } from '../navigation/tipos';

type Props = NativeStackScreenProps<Rotas, 'Login'>;
const ENTRAR = 84;

/**
 * Entrada do app: a foto do rio (Visão aérea, acervo de Sustentabilidade da UISA) com o véu azul de água, campos de
 * vidro e o botão de entrar num círculo laranja que atravessa a onda — o único laranja da tela. Embaixo, fora da
 * foto, a digital e a engrenagem (servidor e atualizações).
 */
export default function LoginScreen({ navigation }: Props) {
  const { login, loginDigital, digitalAtiva, digitalNoAparelho, aviso } = useSessao();
  const t = useTipografia();
  const insets = useSafeAreaInsets();
  const senhaRef = useRef<TextInput>(null);
  const [identificador, setIdentificador] = useState('');
  const [senha, setSenha] = useState('');
  const [tentou, setTentou] = useState(false);
  const [ocupado, setOcupado] = useState<'' | 'senha' | 'digital'>('');
  const [ajustes, setAjustes] = useState(false);
  const ultimoAviso = useRef<string | null>(null);

  useEffect(() => {
    if (aviso && aviso !== ultimoAviso.current) { ultimoAviso.current = aviso; Alert.alert('Sessão encerrada', aviso); }
  }, [aviso]);

  async function entrar() {
    if (ocupado) return;
    setTentou(true);
    if (!identificador.trim() || !senha) {
      Alert.alert('Preencha os campos', !identificador.trim() ? 'Informe sua matrícula, login ou e-mail.' : 'Informe sua senha.');
      return;
    }
    setOcupado('senha');
    try {
      const troca = await login(identificador, senha);
      if (troca) { setSenha(''); navigation.navigate('PrimeiroAcesso', { tokenTroca: troca.tokenTroca, nome: troca.nome, mensagem: troca.mensagem }); }
    } catch (e) {
      Alert.alert('Não foi possível entrar', e instanceof LoginError ? e.message : 'Tente de novo.');
    } finally { setOcupado(''); }
  }

  async function entrarDigital() {
    if (ocupado) return;
    setOcupado('digital');
    try { await loginDigital(); }
    catch (e) { Alert.alert('Entrar com a digital', e instanceof Error ? e.message : 'Não foi possível entrar com a digital.'); }
    finally { setOcupado(''); }
  }

  return (
    <View style={s.tela}>
      <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView style={s.flex} contentContainerStyle={s.rolagem} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <ImageBackground source={require('../../assets/imagens/agua.jpg')} style={[s.painel, { paddingTop: insets.top + 28 }]} resizeMode="cover">
            <LinearGradient colors={[...gradients.veuLogin]} style={StyleSheet.absoluteFill} />
            <Entrada><Marca /></Entrada>
            <View style={s.meio}>
              <Entrada ordem={1}><Text style={[s.titulo, t.titulo]} accessibilityRole="header">O futuro que queremos{'\n'}<Text style={s.destaque}>começa hoje.</Text></Text></Entrada>
              <Entrada ordem={2}><Text style={[s.subtitulo, t.corpo]}>Entre com sua matrícula, login ou e-mail.</Text></Entrada>
              <Entrada ordem={3} style={s.campos}>
                <View style={[s.campo, tentou && !identificador.trim() && s.campoErro]}>
                  <Ionicons name="person-outline" size={21} color={colors.onDarkMuted} accessible={false} />
                  <TextInput
                    value={identificador} onChangeText={setIdentificador} placeholder="Matrícula, login ou e-mail" placeholderTextColor={colors.onDarkDim}
                    autoCapitalize="none" autoCorrect={false} autoComplete="username" textContentType="username" editable={!ocupado}
                    returnKeyType="next" onSubmitEditing={() => senhaRef.current?.focus()} accessibilityLabel="Matrícula, login ou e-mail"
                    style={s.input} cursorColor={colors.white} selectionColor={colors.cyanSoft}
                  />
                </View>
                <CampoSenha vidro inputRef={senhaRef} valor={senha} aoMudar={setSenha} erro={tentou && !senha} desabilitado={Boolean(ocupado)} aoEnviar={entrar} />
              </Entrada>
            </View>
            <Onda />
            <View style={s.entrarFaixa} pointerEvents="box-none">
              <Pressable testID="login-entrar" accessibilityRole="button" accessibilityLabel={ocupado === 'senha' ? 'Entrando' : 'Entrar'} disabled={Boolean(ocupado)} onPress={entrar}
                style={({ pressed }) => [s.entrar, pressed && { transform: [{ scale: 0.93 }] }]}>
                {ocupado === 'senha' ? <ActivityIndicator color={colors.white} /> : <Ionicons name="arrow-forward" size={32} color={colors.white} accessible={false} />}
              </Pressable>
            </View>
          </ImageBackground>

          <View style={s.abaixo}>
            <Text style={s.entrarRotulo}>{ocupado === 'senha' ? 'Entrando…' : 'Entrar'}</Text>
            {digitalAtiva && digitalNoAparelho ? (
              <Pressable accessibilityRole="button" accessibilityLabel="Entrar com a digital" disabled={Boolean(ocupado)} onPress={entrarDigital}
                style={({ pressed }) => [s.digital, pressed && { opacity: 0.8 }]}>
                {ocupado === 'digital' ? <ActivityIndicator color={colors.primary} /> : <Ionicons name="finger-print" size={24} color={colors.primary} accessible={false} />}
                <Text style={[s.digitalTexto, t.medio]}>Usar a digital</Text>
              </Pressable>
            ) : null}
          </View>

          <View style={[s.rodape, { paddingBottom: insets.bottom + space.md }]}>
            <Pressable accessibilityRole="button" accessibilityLabel="Servidor e atualizações do aplicativo" onPress={() => setAjustes(true)} style={({ pressed }) => [s.engrenagem, pressed && { backgroundColor: colors.surfacePressed }]}>
              <Ionicons name="settings-outline" size={22} color={colors.textMuted} accessible={false} />
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      <Ajustes visivel={ajustes} aoFechar={() => setAjustes(false)} aoAbrirAtualizacoes={() => { setAjustes(false); navigation.navigate('Atualizacoes'); }} />
    </View>
  );
}

/** Engrenagem: servidor (Qualidade/Produção, os que estão no app.json) e atualizações. */
function Ajustes({ visivel, aoFechar, aoAbrirAtualizacoes }: { visivel: boolean; aoFechar: () => void; aoAbrirAtualizacoes: () => void }) {
  const { trocarAmbiente } = useSessao();
  const ambiente = useAmbiente();
  const [trocando, setTrocando] = useState<Ambiente | null>(null);
  async function escolher(a: Ambiente) {
    if (a === ambiente || trocando) return;
    setTrocando(a);
    try { await trocarAmbiente(a); aoFechar(); } finally { setTrocando(null); }
  }
  return (
    <Modal visible={visivel} transparent animationType="fade" onRequestClose={aoFechar}>
      <Pressable style={s.veu} onPress={aoFechar} accessibilityLabel="Fechar">
        <Pressable style={s.folha} onPress={() => undefined}>
          <Text style={type.section}>Servidor</Text>
          <Text style={type.caption}>Ao trocar, a sessão e a digital deste aparelho são apagadas (elas pertencem ao servidor anterior).</Text>
          {AMBIENTES.map((a) => {
            const ativo = a.id === ambiente;
            return (
              <Pressable key={a.id} accessibilityRole="radio" accessibilityState={{ checked: ativo }} onPress={() => void escolher(a.id)} style={[s.opcao, ativo && s.opcaoAtiva]}>
                {trocando === a.id ? <ActivityIndicator color={colors.primary} /> : <Ionicons name={ativo ? 'radio-button-on' : 'radio-button-off'} size={22} color={ativo ? colors.primary : colors.textMuted} />}
                <Text style={[s.opcaoTexto, ativo && { color: colors.primary, fontWeight: '700' }]}>{a.nome}</Text>
              </Pressable>
            );
          })}
          <Pressable accessibilityRole="button" onPress={aoAbrirAtualizacoes} style={s.link}>
            <Ionicons name="cloud-download-outline" size={20} color={colors.primary} />
            <Text style={s.linkTexto}>Atualizações do aplicativo</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  tela: { flex: 1, backgroundColor: colors.bg },
  rolagem: { flexGrow: 1 },
  // A borda de baixo é a onda (não um canto arredondado); `visible` deixa o botão de entrar atravessá-la.
  painel: { minHeight: 600, paddingHorizontal: 26, paddingBottom: 86, overflow: 'visible' },
  meio: { flex: 1, justifyContent: 'center', paddingVertical: space.xl },
  destaque: { color: colors.destaque },
  // Folga embaixo: sem ela o Android corta o ç e o j da última linha.
  titulo: { fontSize: 33, lineHeight: 46, paddingBottom: 8, fontWeight: '700', color: colors.white, includeFontPadding: true },
  subtitulo: { fontSize: 16, lineHeight: 23, color: colors.onDarkMuted, marginTop: 12 },
  campos: { marginTop: 28, gap: 12 },
  campo: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 60, paddingHorizontal: 22, borderRadius: radius.pill, backgroundColor: colors.glass, borderWidth: 1.5, borderColor: colors.glassBorder },
  campoErro: { borderColor: colors.danger },
  input: { flex: 1, minHeight: 56, fontSize: 17, color: colors.white, paddingVertical: 0 },
  entrarFaixa: { position: 'absolute', left: 0, right: 0, bottom: -ENTRAR / 2, alignItems: 'center' },
  entrar: {
    width: ENTRAR, height: ENTRAR, borderRadius: ENTRAR / 2, borderWidth: 6, borderColor: colors.bg, backgroundColor: colors.accent,
    alignItems: 'center', justifyContent: 'center', elevation: 8, shadowColor: colors.accent, shadowOpacity: 0.5, shadowRadius: 14, shadowOffset: { width: 0, height: 8 },
  },
  abaixo: { alignItems: 'center', gap: 14, paddingTop: ENTRAR / 2 + 16 },
  entrarRotulo: { fontSize: 14, color: colors.textMuted },
  digital: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 52, paddingHorizontal: 22, borderRadius: radius.pill, backgroundColor: colors.primarySoft },
  digitalTexto: { fontSize: 15.5, fontWeight: '600', color: colors.primary },
  rodape: { marginTop: 'auto', alignItems: 'center', paddingHorizontal: 22, paddingTop: space.lg },
  engrenagem: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  veu: { flex: 1, backgroundColor: colors.veil, justifyContent: 'flex-end' },
  folha: { backgroundColor: colors.white, borderTopLeftRadius: radius.hero, borderTopRightRadius: radius.hero, padding: 24, paddingBottom: 36, gap: 12, ...shadow.float },
  opcao: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, borderRadius: radius.pill, backgroundColor: colors.surface },
  opcaoAtiva: { backgroundColor: colors.primarySoft },
  opcaoTexto: { fontSize: 16, color: colors.text },
  link: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 8 },
  linkTexto: { fontSize: 15, fontWeight: '600', color: colors.primary },
});
