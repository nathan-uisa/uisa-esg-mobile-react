import type { Registro } from '../services/processos';
import type { DadosPipas } from '../agua/pipas';
import type { DadosVazao } from '../agua/vazao';

export type Rotas = {
  Login: undefined;
  PrimeiroAcesso: { tokenTroca: string; nome: string; mensagem?: string };
  Atualizacoes: undefined;
  Inicio: undefined;
  Perfil: undefined;
  DefinirPin: undefined;
  Agua: undefined;
  PipasLista: undefined;
  PipasNovo: undefined;
  PipasFicha: { registro: Registro<DadosPipas>; novo?: boolean };
  VazaoLista: undefined;
  VazaoNova: undefined;
  VazaoFicha: { registro: Registro<DadosVazao>; novo?: boolean };
};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace ReactNavigation {
    interface RootParamList extends Rotas {}
  }
}
