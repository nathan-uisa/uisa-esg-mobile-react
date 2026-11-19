# 06 — Formulários do portal no app

Pedido de 19/11/2026: **mudar qualquer formulário no portal e a mudança aparecer no app**, sem loja e sem OTA.

## Como funciona

A definição de um formulário (campos, seções, etapas, regras, cálculos) é **dado**, não código. O app baixa a versão
vigente do portal, guarda no aparelho e desenha a tela a partir dela, como o portal faz com o `<FormularioDinamico />`.

| Peça | Onde |
|---|---|
| Motor (cálculos, regras, estados dos campos) | `src/formularios/motor/` — **cópia** do backend (`uisa-esg-back-nestjs/src/formularios/motor/`) |
| Desenho dos 15 tipos de campo | `src/formularios/FormularioDinamico.tsx` |
| Baixar, guardar e trocar versões | `src/services/formularios.ts` |
| "Valor do registro anterior" sem internet | `src/formularios/anteriores.ts` |
| Telas | `src/screens/formularios/` (lista de formulários, registros, novo registro, ficha) |

## Quando o app pega a versão nova

- **Sozinho:**
  - ao entrar e ao voltar para o app, no máximo a cada 5 min;
  - o app pede o menu de formulários (`GET /formularios/menu`, que traz o `versaoId` vigente de cada um) e baixa só
    o que mudou;
  - ao abrir um formulário, ele também confere a versão daquele.
- **Na mão:** em Perfil → **Atualizar formulários**, ou no botão de atualizar da tela **Formulários**.
- **Formulário novo publicado no portal:** aparece em Início → **Formulários do portal**, para quem tem acesso a ele
  no portal.
- **Registro já aberto na tela:** fica na versão em que foi aberto. Se sair outra versão no meio, a tela avisa.

O pacote guardado leva a definição mais as **tabelas de referência** e os **cálculos da biblioteca** que ela usa. As
tabelas são renovadas a cada 12 h, mesmo sem versão nova do formulário.

## O que precisa de OTA ou APK

| Mudança no portal | Chega ao app |
|---|---|
| Campo novo, rótulo, opção, obrigatoriedade, seção, regra, cálculo, etapa, tabela | **Sozinha** (é dado) |
| Formulário novo | **Sozinha** (aparece em Formulários do portal) |
| Foto própria no topo de um formulário | OTA (`src/formularios/aparencia.ts`) |
| **Motor novo** no backend (tipo de campo ou operação nova) | `npm run motor:copiar` + OTA |
| Permissão nativa nova (ex.: câmera) | APK. A câmera e a galeria já vão no APK 1.0.1 |

`npm run verify:tudo` falha se o motor do app ficar diferente do backend ao lado (`verify:motor`).

## Sem internet

- **Abrir e preencher:** com a última versão guardada no aparelho. O formulário precisa ter sido aberto uma vez com
  internet.
- **Valor do registro anterior** (ex.: leitura anterior do hidrômetro): sai dos registros guardados no aparelho, dos
  últimos 30 dias. Ao gravar, o servidor busca de novo no banco.
- **Listas de registros:** cópia dos últimos 30 dias (doc 03, "Cache de registros").
- **Enviar, anexar foto e buscar usuário:** precisam de internet. O que foi preenchido continua na tela.

## Água e Outorgas

- **PIPAS:** já era formulário cadastrado no portal (o piloto), e agora o app usa o formulário. As telas fixas do PIPAS
  saíram do app.
- **Vazão:** continua na tela fixa enquanto o formulário `vazao-agua-industrial` **não tiver versão publicada**. Ao
  publicar, o card da Vazão passa a abrir o formulário, sozinho, como o portal faz (`CadastradoOuFixo`).
- **Contas da tela do módulo:** as da tela fixa ignoram registros de outro formato (`ehDadosPipas`, `ehDadosVazao`).
  Assim, um formulário publicado não quebra o app.

## Ainda não está no app

- **Agir nas etapas seguintes** (assumir, aprovar, devolver, transferir): a ficha mostra a etapa e avisa quando é da
  pessoa, mas a ação é no portal.
- **Fila de envio offline.**
- **PDF do registro.**
