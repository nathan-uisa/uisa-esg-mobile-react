#!/usr/bin/env node
/**
 * Motor dos formulários cadastrados (definição, expressões, estado): a fonte é o backend
 * (`uisa-esg-back-nestjs/src/formularios/motor/`). O app roda uma CÓPIA, igual à do portal, para calcular e mostrar
 * os campos na hora; quem decide o que é gravado é o servidor.
 *
 *   node scripts/sincronizar-motor.cjs           copia do backend para src/formularios/motor/
 *   node scripts/sincronizar-motor.cjs --conferir só confere (falha se a cópia estiver diferente)
 *
 * Sem o repositório do backend ao lado (ex.: outra máquina), a conferência avisa e não falha.
 * Mudou o motor no backend? Rode a cópia e publique uma OTA: definição nova que usa operação nova precisa do motor novo.
 */
const fs = require('node:fs');
const path = require('node:path');

const ARQUIVOS = ['definicao.ts', 'expressoes.ts', 'estado.ts'];
const origem = path.resolve(__dirname, '..', '..', 'uisa-esg-back-nestjs', 'src', 'formularios', 'motor');
const destino = path.resolve(__dirname, '..', 'src', 'formularios', 'motor');
const CABECALHO = '// CÓPIA de uisa-esg-back-nestjs/src/formularios/motor (docs/10 §11). Não edite aqui: altere lá e rode `npm run motor:copiar`.\n';
const conferir = process.argv.includes('--conferir');

if (!fs.existsSync(origem)) {
  console.log(`Motor: backend não encontrado em ${origem}; conferência pulada.`);
  process.exit(0);
}
fs.mkdirSync(destino, { recursive: true });
const diferentes = [];
for (const nome of ARQUIVOS) {
  const esperado = CABECALHO + fs.readFileSync(path.join(origem, nome), 'utf8');
  const alvo = path.join(destino, nome);
  const atual = fs.existsSync(alvo) ? fs.readFileSync(alvo, 'utf8') : null;
  if (atual === esperado) continue;
  if (conferir) diferentes.push(nome);
  else { fs.writeFileSync(alvo, esperado); console.log(`  copiado ${nome}`); }
}
if (diferentes.length) {
  console.error(`Motor DIFERENTE do backend: ${diferentes.join(', ')}. Rode: npm run motor:copiar`);
  process.exit(1);
}
console.log(conferir ? 'Motor OK: igual ao do backend.' : 'Motor copiado do backend.');
