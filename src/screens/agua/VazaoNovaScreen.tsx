import React, { useEffect, useRef, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { formatarData, formatarNumero, hojeIso, somarDias } from '../../agua/numeros';
import {
  calcular, faltasVazao, hidrometroRecente, montarVazao, numeroVazao, pontoPorId, PONTOS, PROCESSO_VAZAO, rascunhoVazio,
  type Calculo, type CampoErro, type DadosVazao, type Rascunho,
} from '../../agua/vazao';
import { useRegistros } from '../../services/processos';
import { colors, radius, type } from '../../theme';
import { Aviso, Botao, Campo, Carregando, Cartao, Entrada, Escolhas, Nivel, Rotulo, Tela, useTipografia } from '../../ui';
import { SeletorData } from '../../ui/SeletorData';
import type { Rotas } from '../../navigation/tipos';

type Props = NativeStackScreenProps<Rotas, 'VazaoNova'>;

/** Nova leitura: um cartão por ponto outorgado. Volume e vazão saem da leitura anterior do mesmo hidrômetro. */
export default function VazaoNovaScreen({ navigation }: Props) {
  const { registros, carregando, registrar } = useRegistros<DadosVazao>(PROCESSO_VAZAO);
  const hoje = hojeIso();
  const [pontos, setPontos] = useState<Rascunho[]>(() => PONTOS.map((p) => rascunhoVazio(p.id, hoje)));
  const [tentou, setTentou] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const preparado = useRef(false);

  // Com o histórico carregado, cada ponto já vem com o hidrômetro lido da última vez.
  useEffect(() => {
    if (carregando || preparado.current) return;
    preparado.current = true;
    setPontos((l) => l.map((r) => (r.hidrometro ? r : { ...r, hidrometro: hidrometroRecente(registros, r.ponto) })));
  }, [carregando, registros]);

  const mudar = (id: string, x: Partial<Rascunho>) => setPontos((l) => l.map((r) => (r.ponto === id ? { ...r, ...x } : r)));
  const calculos = pontos.map((r) => calcular(r, registros, hoje));
  const faltas = faltasVazao(pontos, calculos);
  const proximo = numeroVazao(registros.reduce((m, r) => Math.max(m, r.numero), 0) + 1);

  async function enviar() {
    setTentou(true);
    if (faltas.length || enviando) return;
    setEnviando(true);
    try {
      const r = await registrar(montarVazao(pontos, calculos));
      navigation.replace('VazaoFicha', { registro: r, novo: true });
    } catch (e) {
      Alert.alert('Não foi possível registrar', `${e instanceof Error ? e.message : 'Tente de novo.'}\n\nAs leituras continuam aqui. Tocar de novo não duplica o registro.`);
    } finally { setEnviando(false); }
  }

  if (carregando && !preparado.current) return <Tela titulo="Nova leitura" descricao="Vazão de Água Industrial"><Carregando texto="Buscando as leituras anteriores…" /></Tela>;

  return (
    <Tela titulo="Nova leitura" descricao={`Vazão de Água Industrial · ${proximo}`}
      rodape={<Botao tom="principal" icone="checkmark" rotulo="Registrar leituras" ocupado={enviando} aoTocar={enviar} />}>
      <Aviso icone="information-circle-outline">Leia o visor do hidrômetro de cada ponto. Ponto que não foi lido hoje: toque em “Não lido”.</Aviso>
      {pontos.map((r, i) => <Entrada key={r.ponto} ordem={i}><CartaoPonto r={r} c={calculos[i]} hoje={hoje} tentou={tentou} mudar={(x) => mudar(r.ponto, x)} /></Entrada>)}
      {tentou && faltas.length ? <Aviso icone="alert-circle-outline" tom="vermelho">Falta: {faltas.join(' · ')}</Aviso> : null}
    </Tela>
  );
}

function CartaoPonto({ r, c, hoje, tentou, mudar }: { r: Rascunho; c: Calculo; hoje: string; tentou: boolean; mudar: (x: Partial<Rascunho>) => void }) {
  const t = useTipografia();
  const ponto = pontoPorId(r.ponto);
  const erro = (k: CampoErro) => tentou && c.erros.some(([campo]) => campo === k);
  const temHistorico = Boolean(c.anterior && !c.anterior.informada);

  if (!r.incluido) {
    return (
      <Cartao style={s.fora}>
        <View style={s.topo}>
          <MaterialCommunityIcons name="water-off-outline" size={22} color={colors.textDim} />
          <Text style={[type.bodyStrong, { flex: 1, color: colors.textMuted }]}>{ponto.nome}</Text>
          <Botao pequeno tom="suave" icone="add" rotulo="Incluir" aoTocar={() => mudar({ incluido: true })} />
        </View>
        <Text style={type.caption}>Sem leitura neste registro.</Text>
      </Cartao>
    );
  }

  return (
    <Cartao style={c.excedeu ? s.excedeu : undefined}>
      <View style={s.topo}>
        <View style={[s.icone, c.excedeu && { backgroundColor: colors.dangerSoft }]}><MaterialCommunityIcons name="gauge" size={22} color={c.excedeu ? colors.danger : colors.primary} /></View>
        <View style={{ flex: 1 }}>
          <Text style={[type.section, t.titulo]}>{ponto.nome}</Text>
          <Text style={type.caption}>Outorga: {formatarNumero(ponto.limite, 0)} m³/h</Text>
        </View>
        <Botao pequeno tom="perigo" rotulo="Não lido" aoTocar={() => mudar({ incluido: false })} />
      </View>

      <Rotulo obrigatorio>Hidrômetro ativo</Rotulo>
      <Escolhas rotulo="Hidrômetro ativo" opcoes={ponto.hidrometros.map((h) => ({ valor: h, rotulo: h }))} valor={r.hidrometro}
        aoEscolher={(hidrometro) => mudar({ hidrometro, anteriorLeitura: '', anteriorData: '' })} erro={erro('hidrometro')} />
      <SeletorData rotulo="Data da leitura" obrigatorio valor={r.data} aoMudar={(data) => mudar({ data })} erro={erro('data')} max={hoje} />
      <Campo rotulo="Leitura do hidrômetro" obrigatorio icone="speedometer-outline" placeholder="Número no visor, ex.: 1.254.300" keyboardType="decimal-pad" sufixo="m³"
        value={r.leitura} onChangeText={(leitura) => mudar({ leitura })} erro={erro('leitura')} />

      {temHistorico ? (
        <View style={s.anterior}>
          <Ionicons name="time-outline" size={18} color={colors.primaryInk} />
          <Text style={s.anteriorTexto}>Leitura anterior: <Text style={{ fontWeight: '700' }}>{formatarNumero(c.anterior!.leitura)} m³</Text> em {formatarData(c.anterior!.data)}</Text>
        </View>
      ) : r.hidrometro ? (
        <View style={s.semHistorico}>
          <Text style={type.caption}>Sem leitura guardada deste hidrômetro. Se tiver a anterior, informe para já calcular a vazão:</Text>
          <Campo rotulo="Leitura anterior" placeholder="Opcional" keyboardType="decimal-pad" sufixo="m³" value={r.anteriorLeitura} onChangeText={(anteriorLeitura) => mudar({ anteriorLeitura })} erro={erro('anterior')} />
          {r.anteriorLeitura.trim() ? (
            <SeletorData rotulo="Data da leitura anterior" valor={r.anteriorData} aoMudar={(anteriorData) => mudar({ anteriorData })} erro={erro('anterior')} max={somarDias(r.data || hoje, -1)} />
          ) : null}
        </View>
      ) : null}

      <Resultado c={c} limite={ponto.limite} temHidrometro={Boolean(r.hidrometro)} />

      {c.excedeu ? (
        <View style={s.corretiva}>
          <View style={s.corretivaTopo}><Ionicons name="warning" size={18} color={colors.danger} /><Text style={s.corretivaTitulo}>Acima da outorga: ação corretiva obrigatória</Text></View>
          <Campo rotulo="Análise de causa" obrigatorio multilinha placeholder="Por que a vazão passou do limite" maxLength={800} value={r.analise} onChangeText={(analise) => mudar({ analise })} erro={erro('analise')} />
          <Campo rotulo="Ação corretiva" obrigatorio multilinha placeholder="O que será feito para voltar ao limite" maxLength={800} value={r.acao} onChangeText={(acao) => mudar({ acao })} erro={erro('acao')} />
          <Campo rotulo="Responsável" obrigatorio icone="person-outline" placeholder="Quem conduz a ação" maxLength={120} value={r.responsavel} onChangeText={(responsavel) => mudar({ responsavel })} erro={erro('responsavel')} />
        </View>
      ) : null}
    </Cartao>
  );
}

function Resultado({ c, limite, temHidrometro }: { c: Calculo; limite: number; temHidrometro: boolean }) {
  if (c.vazao !== undefined) {
    const dias = c.horas! / 24;
    const pct = (c.vazao / limite) * 100;
    return (
      <View style={[s.resultado, c.excedeu && s.resultadoExcedeu]}>
        <View style={s.resultadoLinha}>
          <View><Text style={s.resultadoRotulo}>Volume</Text><Text style={s.resultadoValor}>{formatarNumero(c.volume!)} m³</Text></View>
          <View><Text style={s.resultadoRotulo}>Período</Text><Text style={s.resultadoValor}>{formatarNumero(dias, 1)} {dias === 1 ? 'dia' : 'dias'}</Text></View>
          <View style={{ alignItems: 'flex-end' }}><Text style={s.resultadoRotulo}>Vazão média</Text><Text style={[s.resultadoValor, s.vazao, c.excedeu && { color: colors.danger }]}>{formatarNumero(c.vazao)} m³/h</Text></View>
        </View>
        <Nivel pct={pct} cor={pct > 85 ? colors.warning : colors.cyan} />
        <View style={s.resultadoLinha}>
          <Ionicons name={c.excedeu ? 'alert-circle' : 'checkmark-circle'} size={17} color={c.excedeu ? colors.danger : colors.greenInk} />
          <Text style={[s.situacao, { color: c.excedeu ? colors.danger : colors.greenInk }]}>
            {c.excedeu ? `${formatarNumero(c.vazao - limite)} m³/h acima do limite` : `Dentro da outorga (${Math.round(pct)}% do limite)`}
          </Text>
        </View>
      </View>
    );
  }
  if (temHidrometro && !c.anterior) return <Text style={type.caption}>Primeira leitura deste hidrômetro: volume e vazão passam a ser calculados a partir da próxima.</Text>;
  return null;
}

const s = StyleSheet.create({
  fora: { backgroundColor: colors.surface },
  excedeu: { borderWidth: 1.5, borderColor: colors.danger },
  topo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icone: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  anterior: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: radius.lg, backgroundColor: colors.primarySoft },
  anteriorTexto: { flex: 1, fontSize: 14, color: colors.primaryInk },
  semHistorico: { gap: 10 },
  resultado: { gap: 12, padding: 16, borderRadius: radius.lg, backgroundColor: colors.cyanSoft },
  resultadoExcedeu: { backgroundColor: colors.dangerSoft },
  resultadoLinha: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  resultadoRotulo: { fontSize: 12, color: colors.textMuted },
  resultadoValor: { fontSize: 15, fontWeight: '700', color: colors.text },
  vazao: { fontSize: 18, color: colors.primary },
  situacao: { flex: 1, fontSize: 14, fontWeight: '600' },
  corretiva: { gap: 10, padding: 14, borderRadius: radius.lg, backgroundColor: colors.dangerSoft },
  corretivaTopo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  corretivaTitulo: { flex: 1, fontSize: 14.5, fontWeight: '700', color: colors.danger },
});
