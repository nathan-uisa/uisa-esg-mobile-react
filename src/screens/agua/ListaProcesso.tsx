import React from 'react';
import { ImageSourcePropType, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, shadow } from '../../theme';
import { Aviso, Botao, BotaoRedondo, Carregando, Entrada, PainelFoto, useTipografia } from '../../ui';

/** Molde das listas de processo: foto com título, números do processo, a lista e o botão laranja de novo registro. */
export function ListaProcesso({ foto, titulo, descricao, numeros, carregando, erro, aoAtualizar, rotuloNovo, aoNovo, children, vazio }: {
  foto: ImageSourcePropType; titulo: string; descricao: string; numeros: { valor: string; rotulo: string; alerta?: boolean }[];
  carregando: boolean; erro: string; aoAtualizar: () => void; rotuloNovo?: string; aoNovo?: () => void; children: React.ReactNode; vazio: boolean;
}) {
  const nav = useNavigation();
  const t = useTipografia();
  const insets = useSafeAreaInsets();
  return (
    <View style={s.tela}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 + insets.bottom }} showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={carregando && !vazio} onRefresh={aoAtualizar} tintColor={colors.primary} colors={[colors.primary]} />}>
        <PainelFoto foto={foto} altura={230}>
          <BotaoRedondo icone="arrow-back" rotulo="Voltar" tom="vidro" aoTocar={() => nav.goBack()} />
          <Entrada>
            <Text style={[s.titulo, t.titulo]} accessibilityRole="header">{titulo}</Text>
            <Text style={[s.descricao, t.corpo]}>{descricao}</Text>
          </Entrada>
        </PainelFoto>
        <View style={s.corpo}>
          {!vazio ? (
            <Entrada style={s.numeros}>
              {numeros.map((n) => (
                <View key={n.rotulo} style={s.numero}>
                  <Text style={[s.numeroValor, t.titulo, n.alerta && { color: colors.danger }]}>{n.valor}</Text>
                  <Text style={s.numeroRotulo}>{n.rotulo}</Text>
                </View>
              ))}
            </Entrada>
          ) : null}
          {erro ? <Aviso icone="cloud-offline-outline" tom="laranja">{erro} Puxe para baixo para tentar de novo.</Aviso> : null}
          {carregando && vazio ? <Carregando texto="Buscando os registros…" /> : children}
        </View>
      </ScrollView>
      {rotuloNovo && aoNovo ? (
        <View style={[s.rodape, { paddingBottom: insets.bottom + 14 }]} pointerEvents="box-none">
          <Botao tom="principal" icone="add" rotulo={rotuloNovo} aoTocar={aoNovo} />
        </View>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  tela: { flex: 1, backgroundColor: colors.bg },
  titulo: { fontSize: 27, lineHeight: 35, color: colors.white, fontWeight: '700', includeFontPadding: true },
  descricao: { fontSize: 14.5, lineHeight: 20, color: colors.onDarkMuted, marginTop: 4 },
  corpo: { paddingHorizontal: 20, gap: 12 },
  numeros: { flexDirection: 'row', gap: 10, marginTop: -6 },
  numero: { flex: 1, padding: 14, borderRadius: radius.lg, backgroundColor: colors.white, gap: 2, ...shadow.card },
  numeroValor: { fontSize: 19, lineHeight: 26, fontWeight: '700', color: colors.primary },
  numeroRotulo: { fontSize: 12, lineHeight: 16, color: colors.textMuted },
  rodape: { position: 'absolute', left: 20, right: 20, bottom: 0 },
});
