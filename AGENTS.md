# UISA ESG (app) — orientações

Leia o [README](README.md) e os documentos de `docs/` antes de alterar um fluxo. As regras de negócio do módulo de
Água são as **mesmas do portal web** (`uisa-esg-front-nextjs/src/components/processos/consumo-pipas.tsx` e
`vazao-agua-industrial.tsx`): mudou uma conta lá, mude em `src/agua/` e em `scripts/verify-agua.cjs`.

- **Cor e medida** só em `src/theme.ts`. Tela nenhuma escreve hexadecimal ou rgba (`npm run verify:desenho` reprova).
- **Laranja** é a ação principal, uma por tela. Azul é a estrutura e verde o segundo tom.
- **Formulário:** explicação vai no placeholder, nunca em texto abaixo do campo (regra do portal).
- **Endereço de servidor** só em `app.json` (`expo.extra.apiUrls` e `updates.url`), nunca no código.
- **Não compile o app** (APK/OTA ficam com o Nathan). Pare em `npm run verify:tudo`.
- **Estados diferentes:** código alterado, pacote gerado, OTA publicada, OTA aplicada e APK instalado são coisas
  distintas. Não registre validação simulada como teste no aparelho.
- Atualize a documentação quando mudar design, navegação, regras ou contratos.
