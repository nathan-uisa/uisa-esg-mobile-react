#!/usr/bin/env node
/**
 * Confere as contas do módulo de Água (src/agua/*.ts) sem aparelho: números no jeito brasileiro, as regras do
 * PIPAS e a vazão (volume ÷ horas, outorga, ação corretiva) — as mesmas do portal web.
 */
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const ts = require('typescript');

const dir = path.resolve(__dirname, '..', 'src', 'agua');
const cache = {};
function carregar(nome) {
  if (cache[nome]) return cache[nome].exports;
  const fonte = fs.readFileSync(path.join(dir, `${nome}.ts`), 'utf8');
  const js = ts.transpileModule(fonte, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const m = { exports: {} };
  cache[nome] = m;
  new Function('require', 'module', 'exports', js)((p) => carregar(path.basename(p)), m, m.exports);
  return m.exports;
}

const n = carregar('numeros');
const pipas = carregar('pipas');
const vazao = carregar('vazao');
let testes = 0;
const ok = (nome, fn) => { fn(); testes++; console.log(`  ✓ ${nome}`); };

console.log('Números');
ok('vírgula é decimal', () => assert.equal(n.lerNumero('12,5'), 12.5));
ok('ponto com grupos de 3 é milhar', () => assert.equal(n.lerNumero('1.254.300'), 1254300));
ok('ponto solto é decimal', () => assert.equal(n.lerNumero('12.5'), 12.5));
ok('milhar com decimal', () => assert.equal(n.lerNumero('1.254,75'), 1254.75));
ok('inválido é null', () => { assert.equal(n.lerNumero('abc'), null); assert.equal(n.lerNumero(''), null); });
ok('formata pt-BR', () => { assert.equal(n.formatarNumero(1254300.5), '1.254.300,5'); assert.equal(n.formatarNumero(42), '42'); assert.equal(n.formatarNumero(0.125, 2), '0,13'); });
ok('datas', () => { assert.equal(n.formatarData('2026-11-19'), '19/11/2026'); assert.equal(n.somarDias('2026-03-01', -1), '2026-02-28'); assert.equal(n.dataAmigavel('2026-11-18', '2026-11-19'), 'Ontem'); });

console.log('PIPAS');
const linha = (x) => ({ chave: 'a', data: '2026-11-19', local: 'Poço 3', volume: '15,5', codigo: '01', ...x });
ok('linha completa não tem falta', () => assert.deepEqual(pipas.faltasPipas('2135', [linha()], '2026-11-19'), []));
ok('cobra prefixo, data futura, volume e código', () => {
  const f = pipas.faltasPipas('', [linha({ data: '2026-11-20', volume: '0', codigo: '' })], '2026-11-19');
  assert.equal(f[0], 'Prefixo do caminhão');
  assert.match(f[1], /data no futuro/); assert.match(f[1], /volume maior que zero/); assert.match(f[1], /código de consumo/);
});
ok('monta o registro como o portal', () => {
  const d = pipas.montarPipas(' ab12 ', [linha(), linha({ volume: '1.000', codigo: '02', local: ' Rio ' })]);
  assert.deepEqual(d, { prefixo: 'AB12', abastecimentos: [{ data: '2026-11-19', local: 'Poço 3', volume: 15.5, codigo: '01' }, { data: '2026-11-19', local: 'Rio', volume: 1000, codigo: '02' }] });
  assert.equal(pipas.totalPipas(d), 1015.5);
});

console.log('Vazão');
const reg = (leituras) => ({ id: 'r', numero: 1, criadoEm: '', elaborador: '', dados: { leituras } });
const historico = [reg([{ ponto: 'rio-angelim', data: '2026-11-17', hidrometro: '20943', leitura: 100000, excedeu: false }])];
const r = (x) => ({ ...vazao.rascunhoVazio('rio-angelim', '2026-11-19', '20943'), ...x });
ok('usa a leitura anterior do mesmo hidrômetro', () => {
  const c = vazao.calcular(r({ leitura: '120.000' }), historico, '2026-11-19');
  assert.equal(c.anterior.leitura, 100000);
  assert.equal(c.volume, 20000); assert.equal(c.horas, 48); assert.equal(c.vazao, 20000 / 48);
  assert.equal(c.excedeu, false); assert.deepEqual(c.erros, []);
});
ok('outro hidrômetro não tem anterior (primeira leitura)', () => {
  const c = vazao.calcular(r({ hidrometro: 'C16503077', leitura: '5' }), historico, '2026-11-19');
  assert.equal(c.anterior, undefined); assert.equal(c.vazao, undefined); assert.deepEqual(c.erros, []);
});
ok('acima da outorga exige ação corretiva', () => {
  const c = vazao.calcular(r({ leitura: '150.000' }), historico, '2026-11-19'); // 50.000 m³ em 48 h = 1041,67 m³/h > 900
  assert.equal(c.excedeu, true);
  assert.deepEqual(c.erros.map(([k]) => k), ['analise', 'acao', 'responsavel']);
  const ok2 = vazao.calcular(r({ leitura: '150.000', analise: 'Bomba extra ligada', acao: 'Desligar a bomba 3', responsavel: 'Fulano' }), historico, '2026-11-19');
  assert.deepEqual(ok2.erros, []);
});
ok('leitura menor que a anterior é erro', () => {
  const c = vazao.calcular(r({ leitura: '90.000' }), historico, '2026-11-19');
  assert.deepEqual(c.erros.map(([k]) => k), ['leitura']);
});
ok('data no futuro e anterior incompleta', () => {
  const c = vazao.calcular(r({ hidrometro: 'C16503077', leitura: '5', data: '2026-11-20', anteriorLeitura: '3' }), historico, '2026-11-19');
  assert.deepEqual(c.erros.map(([k]) => k), ['data', 'anterior']);
});
ok('monta só os pontos incluídos', () => {
  const pontos = [r({ leitura: '120.000' }), { ...vazao.rascunhoVazio('sao-lourenco-b01', '2026-11-19'), incluido: false }];
  const d = vazao.montarVazao(pontos, pontos.map((p) => vazao.calcular(p, historico, '2026-11-19')));
  assert.equal(d.leituras.length, 1);
  assert.equal(d.leituras[0].anterior.leitura, 100000);
  assert.equal('corretiva' in d.leituras[0], false);
});

console.log(`\nÁgua OK: ${testes} verificações.`);
