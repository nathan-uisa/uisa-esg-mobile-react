import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors } from '../theme';
import { PIN_MAX } from '../services/desbloqueio';

/** Bolinhas do PIN digitado (sem mostrar os números). */
export function PontosPin({ quantos, total = PIN_MAX, erro, claro }: { quantos: number; total?: number; erro?: boolean; claro?: boolean }) {
  const mostrar = Math.max(4, Math.min(total, Math.max(quantos, 4)));
  return (
    <View style={s.pontos} accessibilityLabel={`${quantos} números digitados`}>
      {Array.from({ length: mostrar }, (_, i) => (
        <View key={i} style={[s.ponto, claro ? s.pontoClaro : s.pontoEscuro, i < quantos && (claro ? s.cheioClaro : s.cheioEscuro), erro && s.pontoErro]} />
      ))}
    </View>
  );
}

/** Teclado numérico grande, redondo (dá para usar de luva). `claro` sobre o fundo azul do bloqueio. */
export function TecladoPin({ aoDigitar, aoApagar, aoConfirmar, podeConfirmar, claro }: { aoDigitar: (d: string) => void; aoApagar: () => void; aoConfirmar?: () => void; podeConfirmar?: boolean; claro?: boolean }) {
  const tecla = (conteudo: React.ReactNode, rotulo: string, acao: () => void, desabilitada = false) => (
    <Pressable key={rotulo} accessibilityRole="button" accessibilityLabel={rotulo} disabled={desabilitada}
      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined); acao(); }}
      style={({ pressed }) => [s.tecla, claro ? s.teclaClara : s.teclaEscura, pressed && s.pressionada, desabilitada && { opacity: 0.3 }]}>
      {conteudo}
    </Pressable>
  );
  const cor = claro ? colors.white : colors.text;
  const linhas = [['1', '2', '3'], ['4', '5', '6'], ['7', '8', '9']];
  return (
    <View style={s.teclado}>
      {linhas.map((l) => <View key={l.join()} style={s.linha}>{l.map((d) => tecla(<Text style={[s.digito, { color: cor }]}>{d}</Text>, d, () => aoDigitar(d)))}</View>)}
      <View style={s.linha}>
        {tecla(<Ionicons name="backspace-outline" size={26} color={cor} />, 'Apagar', aoApagar)}
        {tecla(<Text style={[s.digito, { color: cor }]}>0</Text>, '0', () => aoDigitar('0'))}
        {aoConfirmar ? tecla(<Ionicons name="checkmark" size={30} color={cor} />, 'Confirmar', aoConfirmar, !podeConfirmar) : <View style={s.tecla} />}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  pontos: { flexDirection: 'row', gap: 14, justifyContent: 'center', paddingVertical: 8 },
  ponto: { width: 16, height: 16, borderRadius: 8, borderWidth: 2 },
  pontoClaro: { borderColor: colors.onDarkMuted },
  pontoEscuro: { borderColor: colors.textDim },
  cheioClaro: { backgroundColor: colors.white, borderColor: colors.white },
  cheioEscuro: { backgroundColor: colors.primary, borderColor: colors.primary },
  pontoErro: { borderColor: colors.danger, backgroundColor: colors.danger },
  teclado: { gap: 14, alignItems: 'center' },
  linha: { flexDirection: 'row', gap: 22 },
  tecla: { width: 76, height: 76, borderRadius: 38, alignItems: 'center', justifyContent: 'center' },
  teclaClara: { backgroundColor: colors.glass },
  teclaEscura: { backgroundColor: colors.surface },
  pressionada: { transform: [{ scale: 0.92 }], opacity: 0.8 },
  digito: { fontSize: 30, fontWeight: '500' },
});
