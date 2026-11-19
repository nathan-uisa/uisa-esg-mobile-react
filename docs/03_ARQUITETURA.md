# 03 — Arquitetura e dados

```
App.tsx                      Splash, fontes, sessão, navegador + tela de bloqueio por cima, OTA
src/theme.ts                 Cores, degradês, raios, sombras (única fonte de cor)
src/services/
  ambiente.ts                Servidor QLD/PRD a partir de expo.extra.apiUrls (app.json)
  api.ts                     fetch com token do cofre (expo-secure-store), erros { codigoErro, mensagem }, 401 → login
  sessao.tsx                 Login, primeiro acesso, digital, bloqueio, logout, permissões (pode)
  biometria.ts               Credencial do aparelho (/auth/biometria/*) no cofre com requireAuthentication
  desbloqueio.ts             Trava do aparelho (expo-local-authentication) e PIN do app
  inatividade.ts             5 min sem uso (toque ou teclado), salvo no aparelho
  atualizacoes.ts            Expo Updates: procura ao abrir e ao voltar, aplica só em tela de chegada
  processos.ts               useRegistros: lista/grava /processos/:id/registros com chaveEnvio
src/agua/                    Regras puras (sem React): numeros.ts, pipas.ts, vazao.ts — testadas em scripts/verify-agua.cjs
src/ui/                      Peças: Tela, PainelFoto, Onda, Botao, Campo, Escolhas, Nivel, Contador, SeletorData, TecladoPin…
src/screens/                 Login, PrimeiroAcesso, Inicio, Perfil, DefinirPin, Atualizacoes, Bloqueio, agua/*
```

**O que fica no aparelho:**

- **token** da sessão: no cofre (`esg.token`, Keystore);
- **usuário**: AsyncStorage (`esg.usuario`);
- **último uso**: AsyncStorage (`esg.ultimaAtividade`);
- **credencial da digital**: no cofre com digital (`com.uisa.esg.biometria`); só metadados no AsyncStorage
  (`esg.biometria`);
- **PIN**: resumo com sal no cofre (`com.uisa.esg.desbloqueio`);
- **servidor escolhido**: AsyncStorage (`esg.ambiente`).

**Sessão:**

- O token vale `ESG_SESSAO_HORAS` (8 h no backend).
- Quando o servidor recusa o token (`401 SESSAO_INVALIDA` ou `METODO_DESATIVADO`), o app volta ao login e explica.
- Na abertura e a cada desbloqueio, `/auth/me` atualiza papel e permissões sem travar a tela.

**Navegação:**

- Pilha nativa sem cabeçalho.
- As telas do módulo de Água só existem com `agua.view`.
- Outra pessoa entrando muda a `key` do navegador, e as telas da anterior somem.

**Atualizações:** as telas "seguras" para aplicar a atualização são Login, Início, Perfil e Atualizações. Mudou o nome
de uma delas? Ajuste `TELAS_SEGURAS` em `atualizacoes.ts`.
