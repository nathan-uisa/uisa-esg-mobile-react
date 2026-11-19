#!/usr/bin/env node
/**
 * Confere, sem aparelho, o motor dos formulários cadastrados dentro do app (src/formularios/motor, cópia do backend)
 * e a prévia local do "valor do registro anterior" (src/formularios/anteriores.ts), usada sem internet.
 * Com o backend ao lado, usa a definição real do piloto PIPAS (src/formularios/piloto-pipas.ts).
 */
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const ts = require('typescript');

const raiz = path.resolve(__dirname, '..', 'src', 'formularios');
const cache = {};
function carregar(arquivo) {
  if (cache[arquivo]) return cache[arquivo].exports;
  const fonte = fs.readFileSync(arquivo, 'utf8');
  const js = ts.transpileModule(fonte, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const m = { exports: {} };
  cache[arquivo] = m;
  const req = (p) => (p.startsWith('.') ? carregar(path.resolve(path.dirname(arquivo), `${p}.ts`)) : require(p));
  new Function('require', 'module', 'exports', js)(req, m, m.exports);
  return m.exports;
}

const def = carregar(path.join(raiz, 'motor', 'definicao.ts'));
const est = carregar(path.join(raiz, 'motor', 'estado.ts'));
const ant = carregar(path.join(raiz, 'anteriores.ts'));
let testes = 0;
const ok = (nome, fn) => { fn(); testes++; console.log(`  ✓ ${nome}`); };

console.log('Motor');
const pipasArq = path.resolve(__dirname, '..', '..', 'uisa-esg-back-nestjs', 'src', 'formularios', 'piloto-pipas.ts');
if (fs.existsSync(pipasArq)) {
  const motorBack = path.resolve(pipasArq, '..', 'motor', 'definicao.ts');
  cache[motorBack] = { exports: def };
  const { DEFINICAO_PIPAS } = carregar(pipasArq);
  ok('PIPAS: total soma a coluna volume da grade', () => {
    const r = est.calcular(DEFINICAO_PIPAS, { prefixo: '2135', abastecimentos: [{ volume: 15.5 }, { volume: 4.25 }] });
    assert.equal(r.total, 19.75);
  });
  ok('PIPAS: na 1ª etapa o prefixo é editável e o total só leitura', () => {
    const e = est.estadosEfetivos(DEFINICAO_PIPAS, DEFINICAO_PIPAS.etapas[0], {});
    assert.ok(['editavel', 'obrigatorio'].includes(e.prefixo));
    assert.equal(e.total, 'leitura');
  });
} else console.log('  (backend ao lado não encontrado: casos do PIPAS pulados)');

const mini = {
  formato: 1,
  campos: [
    { chave: 'leitura', rotulo: 'Leitura', tipo: 'numero' },
    { chave: 'anteriorLeitura', rotulo: 'Anterior', tipo: 'anterior', de: 'leitura', mesmo: ['hidrometro'], ordem: 'data' },
    { chave: 'hidrometro', rotulo: 'Hidrômetro', tipo: 'texto' },
    { chave: 'data', rotulo: 'Data', tipo: 'data' },
    { chave: 'volume', rotulo: 'Volume', tipo: 'calculado', casas: 3, expressao: { subtrair: [{ campo: 'leitura' }, { campo: 'anteriorLeitura' }] } },
  ],
  secoes: [{ chave: 's1', titulo: 'Leitura', campos: ['hidrometro', 'data', 'leitura', 'anteriorLeitura', 'volume'] }],
  etapas: [{ chave: 'e1', nome: 'Registrar', responsavel: [{ tipo: 'todos' }], campos: { hidrometro: 'obrigatorio', data: 'obrigatorio', leitura: 'obrigatorio' }, acoes: [{ chave: 'a1', nome: 'Enviar', vaiPara: 'fim' }] }],
  regras: [{ quando: { menor: [{ campo: 'volume' }, 0] }, entao: { acao: 'impedir', campo: 'leitura', mensagem: 'Leitura menor que a anterior.' } }],
};
const guardados = [
  { id: 'a', numero: 1, codigo: 'VZ-1', situacao: 'concluido', dados: { hidrometro: 'H1', data: '2026-11-10', leitura: 1000 } },
  { id: 'b', numero: 2, codigo: 'VZ-2', situacao: 'concluido', dados: { hidrometro: 'H1', data: '2026-11-15', leitura: 1200 } },
  { id: 'c', numero: 3, codigo: 'VZ-3', situacao: 'cancelado', dados: { hidrometro: 'H1', data: '2026-11-17', leitura: 9999 } },
  { id: 'd', numero: 4, codigo: 'VZ-4', situacao: 'concluido', dados: { hidrometro: 'H2', data: '2026-11-18', leitura: 50 } },
];

console.log('Anterior sem internet');
ok('pega o mais recente do mesmo hidrômetro antes da data, sem cancelado', () => {
  const r = ant.anterioresLocais(mini, { hidrometro: 'H1', data: '2026-11-19' }, guardados, 'VZ');
  assert.equal(r.valores.anteriorLeitura, 1200);
  assert.equal(r.origens.anteriorLeitura.registro, 'VZ-2');
});
ok('respeita a data: o anterior de 12/11 é o de 10/11', () => {
  assert.equal(ant.anterioresLocais(mini, { hidrometro: 'H1', data: '2026-11-12' }, guardados, 'VZ').valores.anteriorLeitura, 1000);
});
ok('sem hidrômetro preenchido não busca', () => {
  assert.equal(ant.anterioresLocais(mini, { data: '2026-11-19' }, guardados, 'VZ').valores.anteriorLeitura, null);
});
ok('volume calculado e a regra "impedir" funcionam com o anterior local', () => {
  const r = ant.anterioresLocais(mini, { hidrometro: 'H1', data: '2026-11-19' }, guardados, 'VZ');
  const c = est.calcular(mini, { hidrometro: 'H1', data: '2026-11-19', leitura: 1150, ...r.valores });
  assert.equal(c.volume, -50);
  const e = est.estadosEfetivos(mini, mini.etapas[0], c);
  assert.equal(est.bloqueiosDasRegras(mini, e, c).leitura, 'Leitura menor que a anterior.');
});

console.log(`\nFormulários OK: ${testes} verificações.`);
