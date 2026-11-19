import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';
import { useTipografia } from './index';

/** "uisa esg" com o e verde, o s azul-claro e o g laranja, como no portal (sobre fundo escuro). */
export function Marca({ tamanho = 26 }: { tamanho?: number }) {
  const t = useTipografia();
  return (
    <View style={s.linha} accessible accessibilityLabel="uisa esg">
      <Image source={require('../../assets/brand/uisa-logo-branca.png')} style={{ width: tamanho * 3.7, height: tamanho * 0.78 }} resizeMode="contain" />
      <Text style={[s.esg, t.titulo, { fontSize: tamanho, paddingVertical: tamanho * 0.3, paddingHorizontal: tamanho * 0.15, marginLeft: -tamanho * 0.15 }]}>
        <Text style={{ color: colors.green }}>e</Text>
        <Text style={{ color: colors.cyan }}>s</Text>
        <Text style={{ color: colors.accent }}>g</Text>
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  linha: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  // Sem lineHeight (a altura vem da própria fonte) e com folga em volta: com lineHeight fixo o Android corta a perna do g.
  esg: { fontWeight: '700', includeFontPadding: true },
});
