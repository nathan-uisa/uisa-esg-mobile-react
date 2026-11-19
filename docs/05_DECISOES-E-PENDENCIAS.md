# 05 — Decisões e pendências

## Decisões (19/11/2026)

- **Só Água e Outorgas** no começo, a pedido. Outros módulos chegam aos poucos. O Início já tem o espaço para eles.
- **Telas próprias para PIPAS e Vazão**, com o mesmo contrato e as mesmas contas das telas fixas do portal. No portal,
  a Vazão pode virar o **formulário cadastrado** (construtor, doc 10 do backend) quando tiver versão publicada. Se
  isso acontecer, o app precisa acompanhar (ler a definição publicada ou ajustar a tela).
- **Bloqueio diferente do Safety:**
  - o token fica sempre no cofre do aparelho, e a tela de bloqueio é quem o protege;
  - a trava do aparelho ou o PIN do app liberam sem internet;
  - a **digital no login** usa a credencial do servidor (30 dias), que funciona mesmo depois de a sessão de 8 h vencer.
- **Leituras dos últimos 30 dias no aparelho** (19/11/2026, pedido): sem internet as listas e a leitura anterior da
  Vazão continuam aparecendo. Mais de 30 dias sai só do aparelho. Detalhe no doc 03.
- **Sem segundo plano nem fila offline:** o app só registra com internet. Se a captação no campo ficar sem sinal,
  falta portar a fila (`outbox`) do Safety.
- **Sem calendário nativo:** a data usa setas e Hoje/Ontem, sem dependência a mais.
- **Arquivos da OTA servidos pelo backend:** sem URL assinada, porque o Cloud Run do ESG usa a credencial padrão.

## Pendências

- [ ] Gerar o primeiro APK (QLD) e testar no aparelho: login, digital, bloqueio, PIN, registro de PIPAS e Vazão, OTA.
- [ ] Backend e APK de **produção** (`apiUrls.PRD` e `updates.url`).
- [ ] Publicar a primeira OTA de verdade e conferir o `GET /updates/assets` saindo do bucket.
- [ ] Decidir se os registros feitos no campo precisam funcionar sem internet (fila offline).
- [ ] Pontos de captação e hidrômetros estão fixos no código (como no portal). Quando houver tabela de referência no
      portal, ler de lá.
