# 02 — Fluxos

## Entrada

- **Com senha:** matrícula, login ou e-mail mais a senha (`POST /auth/login`). Vale a conta da UISA (AD) ou a senha do
  portal, conforme Configurações do portal.
- **Primeiro acesso:** senha padrão, senha temporária ou cadastro livre. O servidor devolve `trocarSenha` e o app abre
  "Crie sua senha", com as mesmas regras do backend. A nova senha vale também no portal.
- **Oferta de digital:** depois de um login com senha, se o aparelho tem digital cadastrada, o app oferece ativá-la.

## Digital (entrar sem senha)

- A ativação pede ao servidor uma credencial do aparelho (doc 13 do backend), que fica no cofre do Android com
  `requireAuthentication`.
- Na tela de entrada, "Usar a digital" abre o leitor do sistema, lê a credencial e troca por uma sessão. Precisa de
  internet.
- A credencial vale **30 dias** e cai quando a senha muda ou o cadastro é inativado. Ela também cai quando a pessoa a
  desliga no Perfil ou troca de servidor.
- Sair da conta **não** desativa a digital: ela continua para a próxima entrada, como no Safety.

## Bloqueio por inatividade (sem internet)

- **Quando bloqueia:** depois de **5 minutos sem uso**, ou ao reabrir o app depois disso. Uma tela cobre tudo, e o que
  estava aberto continua por baixo.
- **A tela não pede nada sozinha** (19/11/2026): ela abre com as opções, porque quem pegou o celular pode ser outra
  pessoa. A primeira opção disponível fica em laranja.
- **Como volta:**
  - pela **trava do aparelho** (digital, rosto, PIN ou padrão do Android);
  - pelo **PIN do app** (4 a 8 números);
  - pela **senha**, que exige internet.
- **Regras do PIN:**
  - fica só no aparelho, guardado como resumo SHA-256 com sal;
  - PINs óbvios (repetidos ou em sequência) são recusados;
  - **5 erros** apagam o PIN, e aí só a senha devolve o acesso.
- **Entrar com outra conta** ("Não é Fulano?"): depois de confirmar, encerra a sessão, apaga o PIN e as leituras
  guardadas, descarta o que estava aberto e volta ao login.

## Água e Outorgas

Permissão `agua.view` (o papel no portal). Sem ela, o Início mostra que o módulo não está liberado.

- **Tela do módulo:**
  - "Outorgas agora": a última vazão de cada ponto (Rio Angelim 900 m³/h, São Lourenço B01 e B02 440 m³/h) e quanto
    ela ocupa do limite;
  - os dois processos, com os números do mês.
- **PIPAS (novo registro):**
  - prefixo do caminhão e um cartão por abastecimento: data, local, volume e código 01/02;
  - os prefixos e locais já usados aparecem como sugestões;
  - uma linha nova repete a data e o local da anterior;
  - o total é somado na hora e aparece no botão.
- **Vazão (nova leitura):**
  - um cartão por ponto, com "Não lido" para o ponto que ficou de fora;
  - o hidrômetro já vem escolhido com o que foi lido da última vez;
  - **volume = leitura − leitura anterior do mesmo hidrômetro** e **vazão = volume ÷ horas entre as duas leituras**;
  - sem histórico, dá para informar a leitura anterior (valor e data);
  - acima da outorga, o cartão fica vermelho e exige análise de causa, ação corretiva e responsável.
- **Envio:**
  - um envio por vez, com uma `chaveEnvio` por envio: se a rede cair e a pessoa tocar de novo, o servidor devolve o que
    já gravou e não duplica;
  - em caso de erro, o formulário continua preenchido;
  - número, data/hora e elaborador são do servidor;
  - o registro aparece no portal na hora.
- **Data:** sem calendário nativo. Há setas de dia anterior e seguinte e atalhos Hoje e Ontem, e nunca passa de hoje.

**Sem internet:** as listas e a leitura anterior vêm da cópia dos últimos 30 dias guardada no aparelho (doc 03,
"Cache de registros"), com um aviso. O **envio** ainda exige internet: falha com a mensagem e o formulário continua
preenchido. Ver o doc 05.
