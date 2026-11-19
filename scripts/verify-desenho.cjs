#!/usr/bin/env node
/**
 * Toda cor do app sai de src/theme.ts (docs/01_DESIGN.md). Reprova hexadecimal ou rgb()/rgba() escritos em
 * qualquer outro arquivo de src/ ou no App.tsx.
 */
const fs = require('node:fs');
const path = require('node:path');

const raiz = path.resolve(__dirname, '..');
const permitido = path.join(raiz, 'src', 'theme.ts');
const COR = /#[0-9a-fA-F]{3,8}\b|rgba?\(/g;
const falhas = [];

function varrer(dir) {
  for (const nome of fs.readdirSync(dir)) {
    const p = path.join(dir, nome);
    if (fs.statSync(p).isDirectory()) varrer(p);
    else if (/\.(ts|tsx)$/.test(nome) && p !== permitido) conferir(p);
  }
}
function conferir(p) {
  fs.readFileSync(p, 'utf8').split('\n').forEach((linha, i) => {
    const semComentario = linha.replace(/\/\/.*$/, '');
    const achou = semComentario.match(COR);
    if (achou) falhas.push(`${path.relative(raiz, p)}:${i + 1}  ${achou.join(', ')}`);
  });
}

varrer(path.join(raiz, 'src'));
conferir(path.join(raiz, 'App.tsx'));
if (falhas.length) {
  console.error('Cor escrita fora de src/theme.ts (use colors/gradients do tema):\n' + falhas.join('\n'));
  process.exit(1);
}
console.log('Desenho OK: nenhuma cor fora de src/theme.ts.');
