#!/usr/bin/env node
/**
 * Empacota uma atualização OTA do app ESG (docs/04_OPERACAO-OTA.md).
 *
 *   npm run ota:package:qld -- --notes "Módulo de Água: ajuste no formulário de vazão"
 *   npm run ota:package:prd -- --notes "..."
 *
 * Gera em dist-ota/ um .zip com o `npx expo export` (metadata.json, bundles/, assets/) e o descritor
 * uisa-esg-update.json. Publique no backend: POST /api/v1/updates/publish (campo file), permissão "app.ota".
 * O runtimeVersion é a versão do app (policy appVersion): só aparelhos com o MESMO APK recebem o pacote.
 */
import { execFileSync, execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function argumentos(argv) {
  const r = { canal: process.env.OTA_ENVIRONMENT || 'QLD', plataforma: 'android', notas: '' };
  for (let i = 2; i < argv.length; i += 1) {
    const a = argv[i];
    if ((a === '--environment' || a === '-e') && argv[i + 1]) r.canal = argv[++i];
    else if ((a === '--platform' || a === '-p') && argv[i + 1]) r.plataforma = argv[++i];
    else if ((a === '--notes' || a === '-n') && argv[i + 1]) r.notas = argv[++i];
  }
  r.canal = String(r.canal).trim().toUpperCase();
  r.plataforma = String(r.plataforma).trim().toLowerCase();
  if (!['QLD', 'PRD'].includes(r.canal)) throw new Error('Canal deve ser QLD ou PRD.');
  if (!['android', 'ios'].includes(r.plataforma)) throw new Error('Plataforma deve ser android ou ios.');
  return r;
}

function main() {
  const args = argumentos(process.argv);
  const expo = JSON.parse(fs.readFileSync(path.join(raiz, 'app.json'), 'utf8')).expo;
  const versao = String(expo.version).trim();
  const rv = expo.runtimeVersion;
  const runtimeVersion = typeof rv === 'string' ? rv : rv?.policy === 'appVersion' ? versao : null;
  if (!runtimeVersion) throw new Error('Este script só sabe ler runtimeVersion fixo ou { policy: "appVersion" } no app.json.');

  const pasta = path.join(raiz, 'dist-ota', `export-${args.canal.toLowerCase()}`);
  fs.rmSync(pasta, { recursive: true, force: true });
  fs.mkdirSync(pasta, { recursive: true });

  console.log(`OTA do app ESG · canal ${args.canal} · ${args.plataforma} · versão ${versao} · runtime ${runtimeVersion}`);
  console.log('\n[1/3] npx expo export…');
  execSync(`npx expo export --platform ${args.plataforma} --output-dir "${pasta}"`, { cwd: raiz, stdio: 'inherit', env: { ...process.env, OTA_ENVIRONMENT: args.canal } });

  console.log('\n[2/3] Descritor uisa-esg-update.json…');
  fs.writeFileSync(path.join(pasta, 'uisa-esg-update.json'), JSON.stringify({
    schemaVersion: 1, app: 'uisa-esg-mobile', environment: args.canal, appVersion: versao, runtimeVersion, platform: args.plataforma,
    notes: args.notas || undefined, createdAt: new Date().toISOString(),
    extra: { expoClient: { name: expo.name, slug: expo.slug, version: versao, runtimeVersion } },
  }, null, 2), 'utf8');

  const zip = path.join(raiz, 'dist-ota', `uisa-esg-ota-${args.canal.toLowerCase()}-v${versao}-${new Date().toISOString().replace(/[:.]/g, '-')}.zip`);
  console.log(`\n[3/3] Compactando em ${zip}…`);
  if (process.platform === 'win32') {
    execFileSync('powershell.exe', ['-NoProfile', '-Command', `Compress-Archive -Path '${pasta}\\*' -DestinationPath '${zip}' -Force`], { stdio: 'inherit' });
  } else {
    execSync(`cd "${pasta}" && zip -r "${zip}" .`, { stdio: 'inherit' });
  }
  console.log(`\nPacote pronto: ${zip}\nPublique em POST /api/v1/updates/publish (campo "file"), com a permissão "Publicar e desfazer atualizações do app".`);
}

main();
