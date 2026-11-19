# UISA ESG — app do celular

App do Portal ESG da UISA (Expo SDK 57, React Native 0.86, pacote `com.uisa.esg`), criado em 19/11/2026 no estilo do
app do Uisa Safety: fluido, arredondado, com cara de água e verde. Por enquanto tem um módulo só, **Água e
Outorgas**, com os dois processos de registro do portal: **Consumo de Água — PIPAS** e **Vazão de Água Industrial**.

- Backend: `uisa-esg-back-nestjs` (as mesmas rotas do portal). No backend, a digital e a OTA estão no
  `docs/13_APP-MOBILE.md`.
- Portal: `uisa-esg-front-nextjs`. As atualizações do app são publicadas em **Administração → App ESG**.

## Comandos

| Comando | O que faz |
|---|---|
| `npm install` | Dependências (Node 24.22.1) |
| `npm start` | Metro / Expo (precisa de um *development build*: a digital e o cofre não funcionam no Expo Go) |
| `npm run android` | Gera o projeto nativo (`expo prebuild`) e instala no aparelho/emulador |
| `npm run verify:tudo` | `tsc`, cores só do tema e as contas do módulo de Água |
| `npm run ota:package:qld -- --notes "…"` | Pacote OTA do canal QLD em `dist-ota/` |

## Documentação

| # | Documento |
|---|---|
| 01 | [Design](docs/01_DESIGN.md) |
| 02 | [Fluxos: entrada, bloqueio, digital, PIN e Água](docs/02_FLUXOS.md) |
| 03 | [Arquitetura e dados](docs/03_ARQUITETURA.md) |
| 04 | [Operação: APK, canais e OTA](docs/04_OPERACAO-OTA.md) |
| 05 | [Decisões e pendências](docs/05_DECISOES-E-PENDENCIAS.md) |
| 06 | [Formulários do portal no app](docs/06_FORMULARIOS.md) |
