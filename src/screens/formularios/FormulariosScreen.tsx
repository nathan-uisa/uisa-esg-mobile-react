import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { formatarDataHora } from '../../agua/numeros';
import { aparenciaDo } from '../../formularios/aparencia';
import { sincronizarFormularios, useMenuFormularios } from '../../services/formularios';
import { colors, type } from '../../theme';
import { Aviso, Botao, Cartao, Carregando, Entrada, Tela, Vazio } from '../../ui';
import type { Rotas } from '../../navigation/tipos';

type Props = NativeStackScreenProps<Rotas, 'Formularios'>;

/** Todos os formulários do portal que a pessoa vê no menu: aparecem aqui assim que são publicados, sem atualizar o app. */
export default function FormulariosScreen({ navigation }: Props) {
  const menu = useMenuFormularios();
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState('');

  async function atualizar() {
    setOcupado(true);
    const r = await sincronizarFormularios(true);
    setOcupado(false);
    setAviso(r.erro ? r.erro : r.atualizados.length ? `Versão nova: ${r.atualizados.join(', ')}.` : 'Os formulários já estavam na versão mais nova.');
  }
  useEffect(() => { void sincronizarFormularios(); }, []);

  return (
    <Tela titulo="Formulários" descricao={menu ? `${menu.itens.length} no aparelho · conferidos em ${formatarDataHora(menu.atualizadoEm)}` : 'Formulários do portal ESG'}
      acoes={[{ icone: 'refresh', rotulo: 'Atualizar formulários', aoTocar: () => void atualizar() }]}>
      {aviso ? <Aviso icone={aviso.startsWith('Versão nova') ? 'sparkles-outline' : 'information-circle-outline'}>{aviso}</Aviso> : null}
      {ocupado ? <Carregando texto="Conferindo as versões no portal…" /> : null}
      {!menu ? <Carregando texto="Buscando os formulários…" /> : !menu.itens.length ? (
        <Vazio icone="document-text-outline" titulo="Nenhum formulário" texto="Os formulários publicados no portal que você pode ver aparecem aqui."
          acao={<Botao icone="refresh" rotulo="Atualizar" aoTocar={() => void atualizar()} />} />
      ) : menu.itens.map((f, i) => {
        const a = aparenciaDo(f.chave, f.modulo);
        return (
          <Entrada key={f.chave} ordem={Math.min(i, 8)}>
            <Cartao aoTocar={() => navigation.navigate('FormularioLista', { chave: f.chave, nome: f.nome })} rotulo={f.nome} style={s.item}>
              <View style={s.icone}><MaterialCommunityIcons name={a.icone} size={24} color={colors.primary} /></View>
              <View style={s.textos}>
                <Text style={type.bodyStrong}>{f.nome}</Text>
                {f.descricao ? <Text style={type.caption} numberOfLines={2}>{f.descricao}</Text> : null}
              </View>
              <MaterialCommunityIcons name="chevron-right" size={24} color={colors.textDim} />
            </Cartao>
          </Entrada>
        );
      })}
    </Tela>
  );
}

const s = StyleSheet.create({
  item: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  icone: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  textos: { flex: 1, gap: 2 },
});
