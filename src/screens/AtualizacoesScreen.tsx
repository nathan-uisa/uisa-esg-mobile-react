import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Application from 'expo-application';
import { expo } from '../../app.json';
import { aplicarAgora, procurarAtualizacao, useAtualizacoes, versaoEmUso } from '../services/atualizacoes';
import { colors, radius, type } from '../theme';
import { Aviso, Botao, Cartao, Dado, Entrada, Tela, useTipografia } from '../ui';

/** Versão em uso e procura manual de atualização (OTA). */
export default function AtualizacoesScreen() {
  const t = useTipografia();
  const estado = useAtualizacoes();
  const v = versaoEmUso();
  const [resultado, setResultado] = useState<string | null>(null);

  async function procurar() {
    setResultado(null);
    const r = await procurarAtualizacao(true);
    setResultado(r === 'baixada' ? 'baixada' : r === 'sem-atualizacao' ? 'Você já está com a versão mais nova.' : 'Atualizações só funcionam no aplicativo instalado (não no modo de desenvolvimento).');
  }

  return (
    <Tela titulo="Atualizações" descricao="O app se atualiza sozinho, sem loja">
      <Entrada>
        <View style={s.selo}>
          <MaterialCommunityIcons name="water-sync" size={44} color={colors.primary} />
          <Text style={[s.versao, t.titulo]}>Versão {Application.nativeApplicationVersion ?? expo.version}</Text>
          <Text style={type.caption}>{v.embarcada ? 'Código original do aplicativo instalado' : `Atualização de ${v.criadaEm ? v.criadaEm.toLocaleDateString('pt-BR') : '—'}`}</Text>
        </View>
      </Entrada>
      {estado.pronta || resultado === 'baixada' ? (
        <Aviso icone="checkmark-circle" tom="verde">Atualização baixada. Ela entra sozinha quando você voltar ao Início, ou agora:</Aviso>
      ) : resultado ? <Aviso icone="information-circle-outline">{resultado}</Aviso> : null}
      {estado.erro ? <Aviso icone="cloud-offline-outline" tom="laranja">{estado.erro}</Aviso> : null}
      {estado.pronta ? <Botao tom="principal" icone="refresh" rotulo="Aplicar agora" aoTocar={() => void aplicarAgora()} /> : (
        <Botao icone="search" rotulo="Procurar atualização" ocupado={estado.procurando} aoTocar={() => void procurar()} />
      )}
      <Cartao>
        <Dado rotulo="Canal" valor={v.canal} />
        <Dado rotulo="Runtime" valor={v.runtimeVersion} />
        <Dado rotulo="Pacote" valor={v.updateId ? v.updateId.slice(0, 8) : 'original'} />
        <Dado rotulo="Última verificação" valor={estado.ultimaVerificacao ? new Date(estado.ultimaVerificacao).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '—'} />
      </Cartao>
    </Tela>
  );
}

const s = StyleSheet.create({
  selo: { alignItems: 'center', gap: 6, padding: 26, borderRadius: radius.hero, backgroundColor: colors.primarySoft },
  versao: { fontSize: 24, lineHeight: 32, fontWeight: '700', color: colors.text },
});
