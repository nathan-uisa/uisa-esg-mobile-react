# 01 — Design

Pedido em 19/11/2026: um app **fluido, arredondado, que lembre água e verde, no estilo do uisa-safety-mobile**.

## Cores (`src/theme.ts`)

As cores são as oficiais do portal (`palette.css`):

| Cor | Valor | Uso |
|---|---|---|
| Azul ESG | `#0080B3` | Estrutura: botões, ícones, abas |
| Ciano | `#00ADEF` | Brilho da água: foco dos campos, nível da vazão, degradê |
| Verde ESG | `#61BB46` | Segundo tom, letra "e" da marca, avisos de sucesso |
| Verde UISA | `#007960` | PIPAS e fim do degradê "mangue" |
| Laranja UISA | `#F58220` | **Só** a ação principal da tela (entrar, registrar) e a letra "g" |

## Formas e movimento

- **Cantos arredondados em tudo:** cartões com raio 28, painéis 44 e campos e botões em pílula.
- **Onda (`src/ui/Onda.tsx`):** a borda de baixo dos painéis de foto é uma onda dupla que desliza devagar. Ela é a
  marca visual do app.
- **Entrada (`Entrada`):** cada bloco entra subindo e aparecendo; as listas chegam em cascata.
- **Números e níveis:** os números contam até o valor (`Contador`) e o nível da vazão enche como água (`Nivel`).
- **Menos movimento:** quem pediu "remover animações" no aparelho vê tudo parado.
- **Toque:** botões encolhem levemente ao toque, com vibração curta.
- **Cartões que boiam:** sombra azul-escura macia.

## Imagens

As fotos são do acervo de Sustentabilidade da UISA, as mesmas capas do portal (`public/capas/origem.json`),
reduzidas para 1280 px em `assets/imagens/`:

| Arquivo | Onde | Foto |
|---|---|---|
| `agua.jpg` | Login, cartão e tela de Água | Rio com reflexo do céu (Visão Aérea 44) |
| `visao-geral.jpg` | Início | Rio entre os canaviais (Visão Aérea 63) |
| `indicadores-fontes.jpg` | Vazão | Vista aérea com o reservatório |
| `objetivos-metas.jpg` | PIPAS | Canavial |
| `araras.jpg` | Perfil | Araras (a foto do login do portal) |

O ícone do app sai do `icon_app_esg.svg` oficial (folha branca no degradê ciano → azul), renderizado em
`assets/icon.png` e nos dois PNGs do ícone adaptativo do Android. A logo branca da uisa está em
`assets/brand/uisa-logo-branca.png`.

## Telas

- **Login:** foto do rio com véu azul, a marca "uisa **e**s**g**", campos de vidro e o botão de entrar num círculo
  laranja que atravessa a onda. Embaixo ficam "Usar a digital" (quando ativada) e a engrenagem (servidor e
  atualizações).
- **Início e Perfil:** abas em pílula flutuante, só nessas duas telas. Dentro de um fluxo, a tela é inteira da tarefa.
- **Telas internas:** voltar redondo de 48 à esquerda, título e descrição, como o `CabecalhoTela` do Safety. Rodapé
  arredondado com a ação principal.
- **Bloqueio:** fundo com o degradê de água, avatar com a inicial, teclado de PIN redondo e grande (dá para usar de
  luva).
