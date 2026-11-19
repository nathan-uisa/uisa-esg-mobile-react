import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { definirPin, PIN_MAX, PIN_MIN, pinFraco } from '../services/desbloqueio';
import { useSessao } from '../services/sessao';
import { colors, type } from '../theme';
import { Aviso, Tela } from '../ui';
import { PontosPin, TecladoPin } from '../ui/TecladoPin';
import type { Rotas } from '../navigation/tipos';

type Props = NativeStackScreenProps<Rotas, 'DefinirPin'>;

/** Define (ou troca) o PIN do app: digita, confirma, pronto. */
export default function DefinirPinScreen({ navigation }: Props) {
  const { atualizarAcessoRapido } = useSessao();
  const [etapa, setEtapa] = useState<'primeiro' | 'confirma'>('primeiro');
  const [primeiro, setPrimeiro] = useState('');
  const [atual, setAtual] = useState('');
  const [erro, setErro] = useState('');

  async function confirmar() {
    if (atual.length < PIN_MIN) return;
    if (etapa === 'primeiro') {
      if (pinFraco(atual)) { setErro('Esse PIN é fácil de adivinhar (números repetidos ou em sequência). Escolha outro.'); setAtual(''); return; }
      setPrimeiro(atual); setAtual(''); setErro(''); setEtapa('confirma');
      return;
    }
    if (atual !== primeiro) { setErro('Os dois PINs não são iguais. Comece de novo.'); setAtual(''); setPrimeiro(''); setEtapa('primeiro'); return; }
    try {
      await definirPin(atual);
      await atualizarAcessoRapido();
      navigation.goBack();
    } catch (e) { setErro(e instanceof Error ? e.message : 'Não foi possível guardar o PIN.'); setAtual(''); setEtapa('primeiro'); }
  }

  return (
    <Tela titulo={etapa === 'primeiro' ? 'Escolha um PIN' : 'Repita o PIN'} descricao={`De ${PIN_MIN} a ${PIN_MAX} números`} rolar={false}>
      <View style={s.centro}>
        <Text style={[type.body, s.texto]}>{etapa === 'primeiro' ? 'Ele destrava o app bloqueado, mesmo sem internet. Fica só neste aparelho.' : 'Digite o mesmo PIN mais uma vez.'}</Text>
        <PontosPin quantos={atual.length} erro={Boolean(erro) && !atual} />
        {erro ? <Aviso icone="alert-circle-outline" tom="vermelho">{erro}</Aviso> : <View style={{ height: 8 }} />}
        <TecladoPin
          aoDigitar={(d) => { if (atual.length < PIN_MAX) { setAtual(atual + d); setErro(''); } }}
          aoApagar={() => setAtual((p) => p.slice(0, -1))}
          aoConfirmar={() => void confirmar()} podeConfirmar={atual.length >= PIN_MIN} />
      </View>
    </Tela>
  );
}

const s = StyleSheet.create({
  centro: { flex: 1, justifyContent: 'center', gap: 18 },
  texto: { textAlign: 'center', color: colors.textSoft },
});
