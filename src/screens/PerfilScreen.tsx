import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Application from 'expo-application';
import { useNavigation } from '@react-navigation/native';
import { expo } from '../../app.json';
import { nomeDoAmbiente, useAmbiente } from '../services/ambiente';
import { apagarPin, travaDoAparelho } from '../services/desbloqueio';
import { sincronizarFormularios, useMenuFormularios } from '../services/formularios';
import { useSessao } from '../services/sessao';
import { formatarDataHora } from '../agua/numeros';
import { colors, radius, shadow, type } from '../theme';
import { Cartao, Entrada, PainelFoto, Secao, useTipografia, type Icone } from '../ui';

/** Perfil: quem está no app, o acesso rápido (digital e PIN), atualizações e sair. */
export default function PerfilScreen() {
  const nav = useNavigation();
  const t = useTipografia();
  const ambiente = useAmbiente();
  const { usuario, digitalAtiva, digitalNoAparelho, temPin, ativarDigital, desativarDigital, atualizarAcessoRapido, logout } = useSessao();
  const [mudandoDigital, setMudandoDigital] = useState(false);
  const [trava, setTrava] = useState<boolean | null>(null);
  useEffect(() => { void travaDoAparelho().then(setTrava); }, []);
  if (!usuario) return null;

  async function alternarDigital(ligar: boolean) {
    setMudandoDigital(true);
    try { if (ligar) await ativarDigital(); else await desativarDigital(); }
    catch (e) { Alert.alert('Digital', e instanceof Error ? e.message : 'Não foi possível mudar a digital.'); }
    finally { setMudandoDigital(false); }
  }

  function removerPin() {
    Alert.alert('Remover o PIN?', 'Sem ele, o app bloqueado só volta pela trava do aparelho ou pela senha (com internet).', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Remover', style: 'destructive', onPress: () => { void apagarPin().then(atualizarAcessoRapido); } },
    ]);
  }

  const primeiro = usuario.nome.split(/\s+/)[0];
  return (
    <ScrollView style={s.tela} contentContainerStyle={s.conteudo} showsVerticalScrollIndicator={false}>
      <PainelFoto foto={require('../../assets/imagens/araras.jpg')} altura={260}>
        <View />
        <Entrada style={s.quem}>
          <View style={s.avatar}><Text style={[s.inicial, t.titulo]}>{primeiro.charAt(0).toUpperCase()}</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={[s.nome, t.titulo]} numberOfLines={2}>{usuario.nome}</Text>
            <Text style={s.papel}>{usuario.papelNome}{usuario.matricula ? ` · ${usuario.matricula}` : ''}</Text>
          </View>
        </Entrada>
      </PainelFoto>

      <View style={s.corpo}>
        <Secao>Acesso rápido</Secao>
        <Entrada ordem={1}>
          <Cartao>
            <Linha icone="finger-print" titulo="Entrar com a digital"
              texto={digitalNoAparelho ? 'Na tela de entrada, só o dedo. Vale 30 dias; a senha não fica no aparelho.' : 'Cadastre uma digital nas configurações do aparelho para usar.'}
              direita={mudandoDigital ? <ActivityIndicator color={colors.primary} /> : (
                <Switch value={digitalAtiva} disabled={!digitalNoAparelho} onValueChange={(v) => void alternarDigital(v)}
                  trackColor={{ false: colors.border, true: colors.cyan }} thumbColor={colors.white} accessibilityLabel="Entrar com a digital" />
              )} />
            <View style={s.separador} />
            <Linha icone="keypad-outline" titulo={temPin ? 'PIN do app definido' : 'Definir um PIN'}
              texto="Destrava o app bloqueado sem internet, mesmo de luva ou com a mão molhada."
              aoTocar={() => nav.navigate('DefinirPin')}
              direita={<Ionicons name="chevron-forward" size={20} color={colors.textDim} />} />
            {temPin ? <Pressable accessibilityRole="button" onPress={removerPin} style={s.remover}><Text style={s.removerTexto}>Remover PIN</Text></Pressable> : null}
            <View style={s.separador} />
            <Linha icone="phone-portrait-outline" titulo="Trava do aparelho"
              texto={trava === null ? '…' : trava ? 'Ativa: o app bloqueado também volta com a digital, o rosto ou o PIN do celular.' : 'O celular não tem trava de tela. Use o PIN do app.'} />
          </Cartao>
        </Entrada>

        <Secao>Aplicativo</Secao>
        <Entrada ordem={2}>
          <Cartao>
            <Linha icone="cloud-download-outline" titulo="Atualizações" texto={`Versão ${Application.nativeApplicationVersion ?? expo.version} · servidor ${nomeDoAmbiente(ambiente)}`}
              aoTocar={() => nav.navigate('Atualizacoes')} direita={<Ionicons name="chevron-forward" size={20} color={colors.textDim} />} />
            <AtualizarFormularios />
          </Cartao>
        </Entrada>

        <Entrada ordem={3}>
          <Pressable accessibilityRole="button" onPress={() => Alert.alert('Sair da conta?', 'O PIN deste aparelho será apagado. A digital continua ativada para a próxima entrada.', [
            { text: 'Cancelar', style: 'cancel' }, { text: 'Sair', style: 'destructive', onPress: () => void logout() },
          ])} style={({ pressed }) => [s.sair, pressed && { opacity: 0.85 }]}>
            <Ionicons name="log-out-outline" size={21} color={colors.danger} />
            <Text style={s.sairTexto}>Sair da conta</Text>
          </Pressable>
        </Entrada>
      </View>
    </ScrollView>
  );
}

function Linha({ icone, titulo, texto, direita, aoTocar }: { icone: Icone; titulo: string; texto: string; direita?: React.ReactNode; aoTocar?: () => void }) {
  const conteudo = (
    <View style={s.linha}>
      <View style={s.linhaIcone}><Ionicons name={icone} size={21} color={colors.primary} /></View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={type.bodyStrong}>{titulo}</Text>
        <Text style={type.caption}>{texto}</Text>
      </View>
      {direita}
    </View>
  );
  return aoTocar ? <Pressable accessibilityRole="button" accessibilityLabel={titulo} onPress={aoTocar} style={({ pressed }) => pressed && { opacity: 0.8 }}>{conteudo}</Pressable> : conteudo;
}

/**
 * Formulários do portal: o app troca sozinho quando sai versão nova (ao abrir e ao voltar ao app); aqui a pessoa
 * força a conferência na hora (docs/06_FORMULARIOS.md).
 */
function AtualizarFormularios() {
  const menu = useMenuFormularios();
  const [ocupado, setOcupado] = useState(false);
  async function atualizar() {
    setOcupado(true);
    const r = await sincronizarFormularios(true);
    setOcupado(false);
    Alert.alert('Formulários', r.erro ? `${r.erro}

O app continua com os formulários guardados.` : r.atualizados.length ? `Versão nova baixada: ${r.atualizados.join(', ')}.` : `Os ${r.total} formulários já estavam na versão mais nova.`);
  }
  return (
    <Linha icone="document-text-outline" titulo="Atualizar formulários"
      texto={menu ? `${menu.itens.length} no aparelho · conferidos em ${formatarDataHora(menu.atualizadoEm)}` : 'Ainda não baixados'}
      aoTocar={() => void atualizar()} direita={ocupado ? <ActivityIndicator color={colors.primary} /> : <Ionicons name="refresh" size={20} color={colors.textDim} />} />
  );
}

const s = StyleSheet.create({
  tela: { flex: 1, backgroundColor: colors.bg },
  conteudo: { paddingBottom: 130 },
  quem: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.glass, borderWidth: 2, borderColor: colors.glassBorder, alignItems: 'center', justifyContent: 'center' },
  inicial: { fontSize: 30, color: colors.white, fontWeight: '700' },
  nome: { fontSize: 22, lineHeight: 29, color: colors.white, fontWeight: '700', includeFontPadding: true },
  papel: { fontSize: 14, color: colors.onDarkMuted, marginTop: 2 },
  corpo: { paddingHorizontal: 20, gap: 12 },
  linha: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 4 },
  linhaIcone: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  separador: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginVertical: 4 },
  remover: { alignSelf: 'flex-start', marginLeft: 56, minHeight: 36, justifyContent: 'center' },
  removerTexto: { fontSize: 14, color: colors.danger, fontWeight: '600' },
  sair: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, minHeight: 58, borderRadius: radius.pill, backgroundColor: colors.white, marginTop: 8, ...shadow.card },
  sairTexto: { fontSize: 16, fontWeight: '700', color: colors.danger },
});
