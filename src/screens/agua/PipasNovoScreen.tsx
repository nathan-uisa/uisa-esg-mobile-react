import React, { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { formatarNumero, hojeIso, lerNumero } from '../../agua/numeros';
import { CODIGOS, errosDaLinha, faltasPipas, linhaVazia, montarPipas, numeroPipas, PROCESSO_PIPAS, sugestoesPipas, type DadosPipas, type LinhaPipas } from '../../agua/pipas';
import { useRegistros } from '../../services/processos';
import { useSessao } from '../../services/sessao';
import { colors, radius, type } from '../../theme';
import { Aviso, Botao, Campo, Carregando, Cartao, Entrada, Escolhas, Rotulo, Secao, Sugestoes, Tela, useTipografia } from '../../ui';
import { SeletorData } from '../../ui/SeletorData';
import type { Rotas } from '../../navigation/tipos';

type Props = NativeStackScreenProps<Rotas, 'PipasNovo'>;

/** Novo registro de consumo: um caminhão-pipa e os abastecimentos dele, cada um num cartão. */
export default function PipasNovoScreen({ navigation }: Props) {
  const { usuario } = useSessao();
  const t = useTipografia();
  const { registros, carregando, registrar } = useRegistros<DadosPipas>(PROCESSO_PIPAS);
  const hoje = hojeIso();
  const [prefixo, setPrefixo] = useState('');
  const [linhas, setLinhas] = useState<LinhaPipas[]>(() => [linhaVazia(hoje)]);
  const [tentou, setTentou] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const sug = useMemo(() => sugestoesPipas(registros), [registros]);
  const faltas = faltasPipas(prefixo, linhas, hoje);
  const total = linhas.reduce((s, ln) => { const v = lerNumero(ln.volume); return s + (v && v > 0 ? v : 0); }, 0);
  const proximo = numeroPipas(registros.reduce((m, r) => Math.max(m, r.numero), 0) + 1);

  const mudar = (chave: string, x: Partial<LinhaPipas>) => setLinhas((l) => l.map((ln) => (ln.chave === chave ? { ...ln, ...x } : ln)));
  const adicionar = () => setLinhas((l) => { const ult = l[l.length - 1]; return [...l, { ...linhaVazia(ult?.data || hoje), local: ult?.local ?? '' }]; });

  async function enviar() {
    setTentou(true);
    if (faltas.length || enviando) return;
    setEnviando(true);
    try {
      const r = await registrar(montarPipas(prefixo, linhas));
      navigation.replace('PipasFicha', { registro: r, novo: true });
    } catch (e) {
      Alert.alert('Não foi possível registrar', `${e instanceof Error ? e.message : 'Tente de novo.'}\n\nO que você preencheu continua aqui. Tocar de novo não duplica o registro.`);
    } finally { setEnviando(false); }
  }

  if (carregando && !registros.length) return <Tela titulo="Novo registro" descricao="Consumo de Água — PIPAS"><Carregando /></Tela>;

  return (
    <Tela titulo="Novo registro" descricao={`Consumo de Água — PIPAS · ${proximo}`}
      rodape={<Botao tom="principal" icone="checkmark" rotulo={total > 0 ? `Registrar ${formatarNumero(total)} m³` : 'Registrar consumo'} ocupado={enviando} aoTocar={enviar} />}>
      <Entrada>
        <Cartao>
          <Text style={[type.section, t.titulo]}>Caminhão-pipa</Text>
          <Campo rotulo="Prefixo do caminhão" obrigatorio icone="bus-outline" placeholder="Ex.: 2135" value={prefixo} onChangeText={(v) => setPrefixo(v.toUpperCase())}
            autoCapitalize="characters" maxLength={20} erro={tentou && !prefixo.trim()} />
          <Sugestoes itens={sug.prefixos.filter((p) => p !== prefixo)} aoEscolher={setPrefixo} />
          <Text style={type.caption}>Elaborador: {usuario?.nome}. Data e hora saem do servidor ao registrar.</Text>
        </Cartao>
      </Entrada>

      <Secao>Abastecimentos</Secao>
      {linhas.map((ln, i) => {
        const e = tentou ? errosDaLinha(ln, hoje) : null;
        return (
          <Entrada key={ln.chave}>
            <Cartao>
              <View style={s.cartaoTopo}>
                <View style={s.numero}><Text style={s.numeroTexto}>{i + 1}</Text></View>
                <Text style={[type.bodyStrong, { flex: 1 }]}>Abastecimento {i + 1}</Text>
                {linhas.length > 1 ? (
                  <Pressable accessibilityRole="button" accessibilityLabel={`Tirar o abastecimento ${i + 1}`} hitSlop={8} onPress={() => setLinhas((l) => l.filter((x) => x.chave !== ln.chave))} style={s.tirar}>
                    <Ionicons name="trash-outline" size={19} color={colors.danger} />
                  </Pressable>
                ) : null}
              </View>
              <SeletorData rotulo="Data" obrigatorio valor={ln.data} aoMudar={(data) => mudar(ln.chave, { data })} erro={Boolean(e?.data)} />
              <Campo rotulo="Local de abastecimento" obrigatorio icone="location-outline" placeholder="Ponto de captação" value={ln.local} onChangeText={(local) => mudar(ln.chave, { local })} maxLength={120} erro={Boolean(e?.local)} />
              <Sugestoes itens={sug.locais.filter((l) => l !== ln.local)} aoEscolher={(local) => mudar(ln.chave, { local })} />
              <Campo rotulo="Volume captado" obrigatorio icone="water-outline" placeholder="Ex.: 15,5" keyboardType="decimal-pad" sufixo="m³" value={ln.volume} onChangeText={(volume) => mudar(ln.chave, { volume })} erro={Boolean(e?.volume)} />
              <Rotulo obrigatorio>Código de consumo</Rotulo>
              <Escolhas rotulo="Código de consumo" opcoes={CODIGOS.map((c) => ({ valor: c, rotulo: c }))} valor={ln.codigo} aoEscolher={(codigo) => mudar(ln.chave, { codigo })} erro={Boolean(e?.codigo)} />
            </Cartao>
          </Entrada>
        );
      })}
      <Botao tom="suave" icone="add-circle-outline" rotulo="Adicionar abastecimento" aoTocar={adicionar} />

      <View style={s.total}>
        <Text style={s.totalRotulo}>Total captado</Text>
        <Text style={[s.totalValor, t.titulo]}>{formatarNumero(total)} m³</Text>
      </View>
      {tentou && faltas.length ? <Aviso icone="alert-circle-outline" tom="vermelho">Falta: {faltas.join(' · ')}</Aviso> : null}
    </Tela>
  );
}

const s = StyleSheet.create({
  cartaoTopo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  numero: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  numeroTexto: { color: colors.white, fontWeight: '700' },
  tirar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.dangerSoft, alignItems: 'center', justifyContent: 'center' },
  total: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 18, borderRadius: radius.card, backgroundColor: colors.primarySoft },
  totalRotulo: { fontSize: 15, color: colors.primaryInk, fontWeight: '600' },
  totalValor: { fontSize: 24, color: colors.primary, fontWeight: '700' },
});
