import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, BackHandler, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { biometriaCadastrada, confirmarComAparelho, conferirPin, PIN_MAX, PIN_MIN, TENTATIVAS_PIN, travaDoAparelho } from '../services/desbloqueio';
import { MINUTOS_SEM_USO } from '../services/inatividade';
import { LoginError, useSessao } from '../services/sessao';
import { colors, gradients, radius } from '../theme';
import { Botao, Entrada, Onda, useTipografia } from '../ui';
import { CampoSenha } from '../ui/CampoSenha';
import { PontosPin, TecladoPin } from '../ui/TecladoPin';

/**
 * Tela de bloqueio (5 min sem uso ou app reaberto depois disso), por cima de tudo: o que estava aberto continua
 * por baixo. Sem internet, volta pela trava do aparelho (digital, rosto, PIN do Android) ou pelo PIN do app.
 * Com internet, também pela senha. "Sair" encerra a sessão e descarta o que estava aberto.
 */
export function BloqueioScreen() {
  const { usuario, desbloquear, temPin, login, logout } = useSessao();
  const t = useTipografia();
  const insets = useSafeAreaInsets();
  const [trava, setTrava] = useState<{ tem: boolean; digital: boolean } | null>(null);
  const [modo, setModo] = useState<'inicio' | 'pin' | 'senha'>('inicio');
  const [pin, setPin] = useState('');
  const [erroPin, setErroPin] = useState('');
  const [senha, setSenha] = useState('');
  const [ocupado, setOcupado] = useState(false);

  // O "voltar" do Android não fura o bloqueio.
  useEffect(() => { const sub = BackHandler.addEventListener('hardwareBackPress', () => true); return () => sub.remove(); }, []);

  const tentarAparelho = useCallback(async () => {
    if (await confirmarComAparelho()) desbloquear();
  }, [desbloquear]);

  useEffect(() => {
    void (async () => {
      const tem = await travaDoAparelho();
      setTrava({ tem, digital: tem && (await biometriaCadastrada()) });
      if (tem) void tentarAparelho(); // já abre pedindo a digital: é o caminho mais rápido
      else if (temPin) setModo('pin');
    })();
  }, [tentarAparelho, temPin]);

  async function confirmarPin(valor = pin) {
    if (valor.length < PIN_MIN) return;
    const r = await conferirPin(valor);
    if (r.ok) { desbloquear(); return; }
    setPin('');
    setErroPin(r.restantes > 0 ? `PIN errado. ${r.restantes} ${r.restantes === 1 ? 'tentativa' : 'tentativas'} antes de pedir a senha.` : 'PIN apagado depois de muitas tentativas. Entre com a senha.');
    if (r.restantes === 0) setModo('senha');
  }

  async function entrarComSenha() {
    if (!usuario || !senha || ocupado) return;
    setOcupado(true);
    try {
      const troca = await login(usuario.matricula || usuario.email, senha);
      if (troca) Alert.alert('Senha', 'Sua senha precisa ser trocada. Saia e entre de novo para criar a nova.');
    } catch (e) { Alert.alert('Não foi possível entrar', e instanceof LoginError ? e.message : 'Tente de novo.'); }
    finally { setOcupado(false); }
  }

  if (!usuario) return null;
  const primeiro = usuario.nome.split(/\s+/)[0];
  return (
    <View style={StyleSheet.absoluteFill} accessibilityViewIsModal>
      <LinearGradient colors={[...gradients.agua]} style={StyleSheet.absoluteFill} />
      <View style={s.ondaFundo} pointerEvents="none"><Onda cor={colors.glass} altura={50} /></View>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={[s.rolagem, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 24 }]} keyboardShouldPersistTaps="handled">
          <Entrada style={s.topo}>
            <View style={s.avatar}><Text style={[s.inicial, t.titulo]}>{primeiro.charAt(0).toUpperCase()}</Text></View>
            <Text style={[s.ola, t.titulo]} accessibilityRole="header">Olá, {primeiro}</Text>
            <Text style={[s.explica, t.corpo]}>O app foi bloqueado depois de {MINUTOS_SEM_USO} minutos sem uso. O que você estava fazendo continua aberto.</Text>
          </Entrada>

          {modo === 'pin' ? (
            <Entrada style={s.bloco}>
              <PontosPin quantos={pin.length} claro erro={Boolean(erroPin) && !pin} />
              {erroPin ? <Text style={s.erro} accessibilityRole="alert">{erroPin}</Text> : <Text style={s.dica}>Digite o PIN do app ESG</Text>}
              <TecladoPin claro
                aoDigitar={(d) => { if (pin.length >= PIN_MAX) return; const novo = pin + d; setPin(novo); setErroPin(''); }}
                aoApagar={() => setPin((p) => p.slice(0, -1))}
                aoConfirmar={() => void confirmarPin()} podeConfirmar={pin.length >= PIN_MIN} />
            </Entrada>
          ) : modo === 'senha' ? (
            <Entrada style={s.bloco}>
              <CampoSenha vidro valor={senha} aoMudar={setSenha} aoEnviar={entrarComSenha} desabilitado={ocupado} />
              <Botao tom="principal" rotulo="Entrar" icone="arrow-forward" ocupado={ocupado} desabilitado={!senha} aoTocar={entrarComSenha} />
              <Text style={s.dica}>Com a senha é preciso internet.</Text>
            </Entrada>
          ) : (
            <Entrada style={s.bloco}>
              {trava === null ? <ActivityIndicator color={colors.white} /> : null}
              {trava?.tem ? <Botao tom="principal" rotulo={trava.digital ? 'Usar a digital' : 'Usar a trava do aparelho'} icone={trava.digital ? 'finger-print' : 'phone-portrait-outline'} aoTocar={tentarAparelho} /> : null}
            </Entrada>
          )}

          <View style={s.outros}>
            {modo !== 'inicio' && trava?.tem ? <Opcao icone={trava.digital ? 'finger-print' : 'phone-portrait-outline'} texto={trava.digital ? 'Digital' : 'Trava do aparelho'} aoTocar={() => { setModo('inicio'); void tentarAparelho(); }} /> : null}
            {modo !== 'pin' && temPin ? <Opcao icone="keypad-outline" texto="PIN do app" aoTocar={() => { setModo('pin'); setErroPin(''); }} /> : null}
            {modo !== 'senha' ? <Opcao icone="lock-closed-outline" texto="Senha" aoTocar={() => setModo('senha')} /> : null}
          </View>
          {!trava?.tem && !temPin && modo !== 'senha' ? <Text style={s.dica}>Defina um PIN no Perfil para destravar sem internet. Sem ele, use a senha.</Text> : null}
          {temPin ? <Text style={s.miudo}>O PIN aceita {TENTATIVAS_PIN} erros seguidos.</Text> : null}

          <Pressable accessibilityRole="button" onPress={() => Alert.alert('Sair da conta?', 'O que estava aberto será descartado e o PIN deste aparelho apagado.', [{ text: 'Cancelar', style: 'cancel' }, { text: 'Sair', style: 'destructive', onPress: () => void logout() }])} style={s.sair}>
            <Text style={s.sairTexto}>Não é {primeiro}? Sair da conta</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function Opcao({ icone, texto, aoTocar }: { icone: keyof typeof Ionicons.glyphMap; texto: string; aoTocar: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Desbloquear com ${texto}`} onPress={aoTocar} style={({ pressed }) => [s.opcao, pressed && { opacity: 0.8 }]}>
      <Ionicons name={icone} size={18} color={colors.white} accessible={false} />
      <Text style={s.opcaoTexto}>{texto}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  rolagem: { flexGrow: 1, paddingHorizontal: 26, gap: 26 },
  topo: { alignItems: 'center', gap: 10 },
  avatar: { width: 88, height: 88, borderRadius: 44, backgroundColor: colors.glass, borderWidth: 2, borderColor: colors.glassBorder, alignItems: 'center', justifyContent: 'center' },
  inicial: { fontSize: 38, color: colors.white, fontWeight: '700' },
  ola: { fontSize: 28, lineHeight: 36, color: colors.white, fontWeight: '700' },
  explica: { fontSize: 15, lineHeight: 22, color: colors.onDarkMuted, textAlign: 'center' },
  bloco: { gap: 16 },
  dica: { fontSize: 14, color: colors.onDarkMuted, textAlign: 'center' },
  miudo: { fontSize: 12, color: colors.onDarkDim, textAlign: 'center' },
  erro: { fontSize: 14, fontWeight: '700', color: colors.white, textAlign: 'center', backgroundColor: colors.danger, alignSelf: 'center', paddingHorizontal: 14, paddingVertical: 6, borderRadius: radius.pill, overflow: 'hidden' },
  outros: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10 },
  opcao: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 44, paddingHorizontal: 16, borderRadius: radius.pill, backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.glassBorder },
  opcaoTexto: { color: colors.white, fontSize: 14.5, fontWeight: '600' },
  sair: { alignSelf: 'center', minHeight: 44, justifyContent: 'center', marginTop: 'auto' },
  sairTexto: { color: colors.onDarkMuted, fontSize: 14, textDecorationLine: 'underline' },
  ondaFundo: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 50 },
});
