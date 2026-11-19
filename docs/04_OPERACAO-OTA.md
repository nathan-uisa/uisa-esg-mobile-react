# 04 — Operação: APK, canais e OTA

## Primeira build (APK)

O repositório não versiona `android/`. A pasta sai do `expo prebuild` na primeira build:

```bash
npm install
OTA_ENVIRONMENT=QLD npx expo prebuild -p android      # gera android/ com o canal QLD gravado
cd android && ./gradlew assembleRelease                # ou: npx expo run:android --variant release
```

Use `OTA_ENVIRONMENT=PRD` para o APK de produção. O `app.config.js` grava o canal nos cabeçalhos do Expo Updates.

Se `android/` passar a ter ajuste nativo feito à mão (assinatura, network security), versione a pasta e tire `/android`
do `.gitignore`. A partir daí, não rode `prebuild` de novo: ele apagaria os ajustes, como no Safety.

**Assinatura:** a chave de release (`*.jks`) **não** vai para o git (`.gitignore`). Guarde-a junto com a do Safety.

## OTA (sem loja)

1. Mude o código JS/TS ou as imagens. Mudança nativa (dependência nova, permissão, plugin, ícone) **não** vai por
   OTA: exige APK novo.
2. Gere o pacote: `npm run ota:package:qld -- --notes "o que muda"`. O resultado é
   `dist-ota/uisa-esg-ota-qld-v<versão>-<data>.zip`.
3. No portal, em **Administração → App ESG**, escolha o canal, envie o .zip e publique. É preciso a permissão
   "Publicar e desfazer atualizações do app".
4. Os aparelhos do canal **com o APK da mesma versão** baixam o pacote ao abrir o app ou ao voltar a ele. O pacote é
   aplicado na próxima tela de chegada (Início, Login ou Perfil), nunca no meio de um registro. Em Perfil →
   Atualizações dá para procurar e aplicar na hora.

**Desfazer:** na mesma tela do portal, **Reativar** volta a uma versão anterior e **APK original** manda todos os
aparelhos de volta ao código que veio instalado.

**Versão:**

- `runtimeVersion` é igual à `expo.version` (`policy: appVersion`).
- Ao gerar um APK novo, suba `version` e `android.versionCode` no `app.json`.
- Mudar a versão sem gerar APK faz os pacotes não chegarem a ninguém, porque o runtime não bate.

## Servidores

O `app.json` tem só `expo.extra.apiUrls.QLD` (o backend de QA) e `updates.url` apontando para ele. Quando existir o
backend de produção:

- acrescente `apiUrls.PRD` (o app passa a abrir em Produção e mostra a escolha na engrenagem);
- gere o APK PRD com `updates.url` do backend de produção.

## Verificação sem aparelho

`npm run verify:tudo` roda três checagens:

- `tsc`;
- cores só no tema;
- 16 checagens das contas de números, PIPAS e Vazão, as mesmas do portal.

O que essa verificação não cobre: abrir o app num aparelho, entrar pela digital, o bloqueio, o PIN e receber uma OTA.
