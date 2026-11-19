import React, { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { LoginError, useSessao } from '../services/sessao';
import { colors, type } from '../theme';
import { Aviso, Botao, Tela } from '../ui';
import { CampoSenha } from '../ui/CampoSenha';
import type { Rotas } from '../navigation/tipos';

type Props = NativeStackScreenProps<Rotas, 'PrimeiroAcesso'>;

/** Mesmas regras do backend (src/auth/senha.ts): 8 a 128, letras e números, sem sequência óbvia. */
function regras(senha: string) {
  return [
    { ok: senha.length >= 8, texto: 'Pelo menos 8 caracteres' },
    { ok: /[a-z]/i.test(senha) && /\d/.test(senha), texto: 'Letras e números' },
    { ok: senha.length > 0 && !/^(.)\1+$/.test(senha) && !['12345678', 'senha123', 'uisa1234', 'portal123', 'esg12345'].includes(senha.toLowerCase()), texto: 'Nada óbvio (como 12345678)' },
  ];
}

/** Primeiro acesso (senha padrão ou senha temporária do administrador): a pessoa cria a própria senha e já entra. */
export default function PrimeiroAcessoScreen({ route }: Props) {
  const { criarSenha } = useSessao();
  const { tokenTroca, nome, mensagem } = route.params;
  const [nova, setNova] = useState('');
  const [confirma, setConfirma] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const lista = regras(nova);
  const pronta = lista.every((r) => r.ok) && nova === confirma;

  async function salvar() {
    if (!pronta || ocupado) return;
    setOcupado(true);
    try { await criarSenha(tokenTroca, nova); }
    catch (e) { Alert.alert('Não foi possível criar a senha', e instanceof LoginError ? e.message : 'Tente de novo.'); }
    finally { setOcupado(false); }
  }

  return (
    <Tela titulo="Crie sua senha" descricao={`Olá, ${nome.split(/\s+/)[0]}.`}
      rodape={<Botao tom="principal" rotulo="Criar senha e entrar" icone="checkmark" desabilitado={!pronta} ocupado={ocupado} aoTocar={salvar} />}>
      <Aviso icone="key-outline">{mensagem ?? 'Primeiro acesso: crie a sua senha.'} Ela vale aqui e no portal ESG.</Aviso>
      <CampoSenha valor={nova} aoMudar={setNova} placeholder="Nova senha" novo />
      <CampoSenha valor={confirma} aoMudar={setConfirma} placeholder="Repita a nova senha" novo erro={Boolean(confirma) && confirma !== nova} aoEnviar={salvar} />
      <View style={s.regras}>
        {lista.map((r) => (
          <View key={r.texto} style={s.regra}>
            <Ionicons name={r.ok ? 'checkmark-circle' : 'ellipse-outline'} size={18} color={r.ok ? colors.greenInk : colors.textDim} accessible={false} />
            <Text style={[type.caption, r.ok && { color: colors.greenInk }]}>{r.texto}</Text>
          </View>
        ))}
        <View style={s.regra}>
          <Ionicons name={confirma && confirma === nova ? 'checkmark-circle' : 'ellipse-outline'} size={18} color={confirma && confirma === nova ? colors.greenInk : colors.textDim} accessible={false} />
          <Text style={type.caption}>As duas iguais</Text>
        </View>
      </View>
    </Tela>
  );
}

const s = StyleSheet.create({
  regras: { gap: 8, paddingHorizontal: 6 },
  regra: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
