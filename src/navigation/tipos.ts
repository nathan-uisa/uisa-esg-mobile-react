import type { Registro } from '../services/processos';
import type { DadosVazao } from '../agua/vazao';
import type { DetalheRegistro, ResumoRegistro } from '../services/formularios';

export type Rotas = {
  Login: undefined;
  PrimeiroAcesso: { tokenTroca: string; nome: string; mensagem?: string };
  Atualizacoes: undefined;
  Inicio: undefined;
  Perfil: undefined;
  DefinirPin: undefined;
  Agua: undefined;
  VazaoLista: undefined;
  VazaoNova: undefined;
  VazaoFicha: { registro: Registro<DadosVazao>; novo?: boolean };
  /** Formulários cadastrados no portal (docs/06_FORMULARIOS.md). */
  Formularios: undefined;
  FormularioLista: { chave: string; nome?: string };
  FormularioNovo: { chave: string };
  FormularioFicha: { chave: string; id: string; resumo?: ResumoRegistro; detalhe?: DetalheRegistro; novo?: boolean };
};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace ReactNavigation {
    interface RootParamList extends Rotas {}
  }
}
