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
  cacheRegistros.ts          Cópia dos registros dos últimos 30 dias no aparelho (usada sem servidor)
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
- **servidor escolhido**: AsyncStorage (`esg.ambiente`);
- **registros dos últimos 30 dias** de cada processo: AsyncStorage (`esg.cache.registros.<servidor>.<processo>`).

## Cache de registros (19/11/2026)

Pedido: sem internet, as leituras anteriores da Vazão têm de aparecer.

- **Fonte:** o servidor, sempre. Toda busca bem-sucedida regrava a cópia, e todo registro gravado pelo app entra nela.
- **Quando a cópia é usada:** só quando o servidor não responde (sem rede, tempo esgotado ou erro 5xx). Erro de regra
  (4xx, como sem permissão) não mostra a cópia. A tela avisa que os dados vêm do aparelho e de quando são.
- **30 dias:** pela data em que o servidor gravou o registro (`criadoEm`). Mais velho que isso sai **só da cópia**,
  ao ler ou gravar; no servidor continua tudo. Prazo em `DIAS_NO_APARELHO`.
- **Apagada:** ao sair da conta e ao trocar de servidor (uma cópia por servidor). O bloqueio de 5 min não apaga.
- **Nova leitura sem internet:** com cópia, a leitura anterior vem dela; se a última leitura do hidrômetro tem mais de
  30 dias, a pessoa a informa à mão. Sem cópia, a tela diz que não conseguiu buscar o histórico e oferece tentar de
  novo, em vez de parecer que o hidrômetro não tem leitura. O envio continua exigindo internet (não há fila).
- Vale para os dois processos (PIPAS e Vazão), porque é o mesmo `useRegistros`.

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
