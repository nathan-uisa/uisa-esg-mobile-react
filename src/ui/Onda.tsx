import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { colors } from '../theme';

/**
 * Borda de baixo dos painéis em forma de onda (a marca visual do app: "água"). Duas ondas sobrepostas, a de trás
 * mais clara, que deslizam devagar de lado — movimento de água parada, não de tempestade. Respeita quem pediu
 * menos movimento no aparelho (o Animated para quando `parado`).
 */
const CAMINHO_FRENTE = 'M0 26 C 60 6, 120 6, 180 22 S 300 40, 360 20 S 480 4, 540 22 S 660 40, 720 22 L 720 60 L 0 60 Z';
const CAMINHO_TRAS = 'M0 18 C 70 36, 140 36, 200 18 S 320 0, 380 16 S 500 36, 560 18 S 680 2, 720 16 L 720 60 L 0 60 Z';

export function Onda({ cor = colors.bg, altura = 34, parado = false }: { cor?: string; altura?: number; parado?: boolean }) {
  const x = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (parado) return;
    const vaiEVolta = Animated.loop(Animated.sequence([
      Animated.timing(x, { toValue: 1, duration: 6000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(x, { toValue: 0, duration: 6000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    vaiEVolta.start();
    return () => vaiEVolta.stop();
  }, [x, parado]);

  const frente = x.interpolate({ inputRange: [0, 1], outputRange: [0, -60] });
  const tras = x.interpolate({ inputRange: [0, 1], outputRange: [-60, 0] });
  return (
    <View pointerEvents="none" style={[s.caixa, { height: altura }]}>
      <Animated.View style={[s.camada, { opacity: 0.45, transform: [{ translateX: tras }] }]}>
        <Svg width="130%" height="100%" viewBox="0 0 720 60" preserveAspectRatio="none"><Path d={CAMINHO_TRAS} fill={cor} /></Svg>
      </Animated.View>
      <Animated.View style={[s.camada, { transform: [{ translateX: frente }] }]}>
        <Svg width="130%" height="100%" viewBox="0 0 720 60" preserveAspectRatio="none"><Path d={CAMINHO_FRENTE} fill={cor} /></Svg>
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  caixa: { position: 'absolute', left: 0, right: 0, bottom: -1, overflow: 'hidden' },
  camada: { position: 'absolute', top: 0, bottom: 0, left: '-10%', right: 0 },
});
