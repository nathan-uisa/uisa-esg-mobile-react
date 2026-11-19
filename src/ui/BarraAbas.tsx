import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, shadow } from '../theme';
import type { Icone } from './index';

/** Abas em pílula flutuante, só nas telas de chegada (Início e Perfil). Dentro de um fluxo a tela é inteira da tarefa. */
export function BarraAbas({ abas, atual, aoTocar }: { abas: { chave: string; rotulo: string; icone: Icone }[]; atual: string; aoTocar: (chave: string) => void }) {
  const insets = useSafeAreaInsets();
  return (
    <View pointerEvents="box-none" style={[s.faixa, { paddingBottom: insets.bottom + 12 }]}>
      <View style={s.barra} accessibilityRole="tablist">
        {abas.map((a) => {
          const ativa = a.chave === atual;
          return (
            <Pressable key={a.chave} accessibilityRole="tab" accessibilityState={{ selected: ativa }} accessibilityLabel={a.rotulo}
              onPress={() => { Haptics.selectionAsync().catch(() => undefined); aoTocar(a.chave); }}
              style={({ pressed }) => [s.aba, ativa && s.abaAtiva, pressed && { opacity: 0.85 }]}>
              <Ionicons name={a.icone} size={22} color={ativa ? colors.white : colors.textMuted} accessible={false} />
              {ativa ? <Text style={s.rotulo}>{a.rotulo}</Text> : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  faixa: { position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center' },
  barra: { flexDirection: 'row', gap: 6, padding: 6, borderRadius: radius.pill, backgroundColor: colors.white, ...shadow.float },
  aba: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 52, minWidth: 64, paddingHorizontal: 18, borderRadius: radius.pill, justifyContent: 'center' },
  abaAtiva: { backgroundColor: colors.primary },
  rotulo: { color: colors.white, fontSize: 15, fontWeight: '700' },
});
