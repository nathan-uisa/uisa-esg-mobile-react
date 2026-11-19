import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors, radius, size } from '../theme';
import { dataAmigavel, formatarData, hojeIso, somarDias } from '../agua/numeros';
import { Rotulo } from './index';

/**
 * Data sem calendário nativo: ← dia → numa pílula, e os atalhos Hoje / Ontem. No campo, quase todo registro é de
 * hoje ou de ontem, e dois toques resolvem; datas mais antigas vão pelas setas. Não passa de hoje.
 */
export function SeletorData({ rotulo, valor, aoMudar, erro, max = hojeIso(), obrigatorio }: { rotulo: string; valor: string; aoMudar: (iso: string) => void; erro?: boolean; max?: string; obrigatorio?: boolean }) {
  const mudar = (iso: string) => { Haptics.selectionAsync().catch(() => undefined); aoMudar(iso > max ? max : iso); };
  const atual = valor || max;
  const ontem = somarDias(max, -1);
  return (
    <View style={s.grupo}>
      <Rotulo obrigatorio={obrigatorio}>{rotulo}</Rotulo>
      <View style={[s.pilula, erro && s.erro]} accessibilityRole="adjustable" accessibilityLabel={`${rotulo}: ${valor ? formatarData(valor) : 'sem data'}`}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(e) => mudar(somarDias(atual, e.nativeEvent.actionName === 'increment' ? 1 : -1))}>
        <Pressable accessibilityRole="button" accessibilityLabel="Dia anterior" hitSlop={8} onPress={() => mudar(somarDias(atual, -1))} style={({ pressed }) => [s.seta, pressed && s.pressionado]}>
          <Ionicons name="chevron-back" size={22} color={colors.primary} accessible={false} />
        </Pressable>
        <View style={s.meio}>
          <Text style={s.amigavel}>{valor ? dataAmigavel(valor, max) : 'Escolha a data'}</Text>
          {valor ? <Text style={s.data}>{formatarData(valor)}</Text> : null}
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Dia seguinte" hitSlop={8} disabled={atual >= max} onPress={() => mudar(somarDias(atual, 1))} style={({ pressed }) => [s.seta, pressed && s.pressionado, atual >= max && s.apagado]}>
          <Ionicons name="chevron-forward" size={22} color={colors.primary} accessible={false} />
        </Pressable>
      </View>
      <View style={s.atalhos}>
        {[{ r: 'Hoje', v: max }, { r: 'Ontem', v: ontem }].map((a) => (
          <Pressable key={a.r} accessibilityRole="button" accessibilityState={{ selected: valor === a.v }} onPress={() => mudar(a.v)} style={({ pressed }) => [s.atalho, valor === a.v && s.atalhoAtivo, pressed && s.pressionado]}>
            <Text style={[s.atalhoTexto, valor === a.v && s.atalhoTextoAtivo]}>{a.r}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  grupo: { gap: 6 },
  pilula: { flexDirection: 'row', alignItems: 'center', minHeight: size.campo + 6, borderRadius: radius.pill, backgroundColor: colors.surface, paddingHorizontal: 6, borderWidth: 1.5, borderColor: colors.transparent },
  erro: { borderColor: colors.danger, backgroundColor: colors.dangerSoft },
  seta: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white },
  meio: { flex: 1, alignItems: 'center' },
  amigavel: { fontSize: 16, fontWeight: '700', color: colors.text },
  data: { fontSize: 12.5, color: colors.textMuted, marginTop: 1 },
  atalhos: { flexDirection: 'row', gap: 8, paddingLeft: 4 },
  atalho: { height: 34, paddingHorizontal: 14, borderRadius: radius.pill, backgroundColor: colors.primarySoft, justifyContent: 'center' },
  atalhoAtivo: { backgroundColor: colors.primary },
  atalhoTexto: { fontSize: 13.5, fontWeight: '600', color: colors.primaryInk },
  atalhoTextoAtivo: { color: colors.white },
  pressionado: { opacity: 0.85, transform: [{ scale: 0.95 }] },
  apagado: { opacity: 0.35 },
});
