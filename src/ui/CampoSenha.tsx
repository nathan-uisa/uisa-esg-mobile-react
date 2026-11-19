import React, { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, size } from '../theme';

/** Campo de senha em pílula, com o olho para mostrar. `vidro` sobre a foto do login. */
export function CampoSenha({ valor, aoMudar, placeholder = 'Senha', vidro, erro, inputRef, aoEnviar, desabilitado, novo }: {
  valor: string; aoMudar: (v: string) => void; placeholder?: string; vidro?: boolean; erro?: boolean;
  inputRef?: React.Ref<TextInput>; aoEnviar?: () => void; desabilitado?: boolean; novo?: boolean;
}) {
  const [ver, setVer] = useState(false);
  const cor = vidro ? colors.white : colors.text;
  const apagada = vidro ? colors.onDarkDim : colors.textDim;
  return (
    <View style={[s.campo, vidro ? s.vidro : s.claro, erro && s.erro]}>
      <Ionicons name="lock-closed-outline" size={21} color={vidro ? colors.onDarkMuted : colors.textMuted} accessible={false} />
      <TextInput
        ref={inputRef} value={valor} onChangeText={aoMudar} placeholder={placeholder} placeholderTextColor={apagada}
        secureTextEntry={!ver} autoCapitalize="none" autoCorrect={false} autoComplete={novo ? 'new-password' : 'current-password'}
        textContentType={novo ? 'newPassword' : 'password'} editable={!desabilitado} returnKeyType="go" onSubmitEditing={aoEnviar}
        accessibilityLabel={placeholder} style={[s.input, { color: cor }]} cursorColor={cor} selectionColor={colors.cyanSoft}
      />
      <Pressable accessibilityRole="button" accessibilityLabel={ver ? 'Esconder senha' : 'Mostrar senha'} hitSlop={10} onPress={() => setVer((v) => !v)}>
        <Ionicons name={ver ? 'eye-off-outline' : 'eye-outline'} size={22} color={vidro ? colors.onDarkMuted : colors.textMuted} accessible={false} />
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  campo: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: size.campo + 2, paddingHorizontal: 22, borderRadius: radius.pill, borderWidth: 1.5 },
  vidro: { backgroundColor: colors.glass, borderColor: colors.glassBorder },
  claro: { backgroundColor: colors.surface, borderColor: colors.transparent },
  erro: { borderColor: colors.danger },
  input: { flex: 1, minHeight: size.campo - 2, fontSize: 17, paddingVertical: 0 },
});
