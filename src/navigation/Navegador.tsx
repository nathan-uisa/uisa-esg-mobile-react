import React from 'react';
import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { DefaultTheme, NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSessao } from '../services/sessao';
import { aoMudarDeTela } from '../services/atualizacoes';
import { colors } from '../theme';
import { BarraAbas } from '../ui/BarraAbas';
import type { Rotas } from './tipos';

import LoginScreen from '../screens/LoginScreen';
import PrimeiroAcessoScreen from '../screens/PrimeiroAcessoScreen';
import AtualizacoesScreen from '../screens/AtualizacoesScreen';
import InicioScreen from '../screens/InicioScreen';
import PerfilScreen from '../screens/PerfilScreen';
import DefinirPinScreen from '../screens/DefinirPinScreen';
import AguaScreen from '../screens/agua/AguaScreen';
import VazaoListaScreen from '../screens/agua/VazaoListaScreen';
import VazaoNovaScreen from '../screens/agua/VazaoNovaScreen';
import VazaoFichaScreen from '../screens/agua/VazaoFichaScreen';
import FormulariosScreen from '../screens/formularios/FormulariosScreen';
import FormularioListaScreen from '../screens/formularios/FormularioListaScreen';
import FormularioNovoScreen from '../screens/formularios/FormularioNovoScreen';
import FormularioFichaScreen from '../screens/formularios/FormularioFichaScreen';

const Pilha = createNativeStackNavigator<Rotas>();
export const navegacao = createNavigationContainerRef<Rotas>();

const tema = { ...DefaultTheme, colors: { ...DefaultTheme.colors, background: colors.bg, primary: colors.primary } };
/** Telas com foto/painel escuro no topo: ícones brancos na barra de status. */
const TOPO_ESCURO = new Set(['Login', 'PrimeiroAcesso', 'Inicio', 'Perfil', 'Agua', 'VazaoLista', 'FormularioLista']);
const COM_ABAS = new Set(['Inicio', 'Perfil']);

export default function Navegador() {
  const { usuario, pode } = useSessao();
  return (
    <NavigationContainer theme={tema} ref={navegacao}
      onReady={() => aoMudarDeTela(navegacao.getCurrentRoute()?.name)}
      onStateChange={() => aoMudarDeTela(navegacao.getCurrentRoute()?.name)}>
      <Pilha.Navigator
        layout={({ children, state, navigation }) => {
          const rota = state.routes[state.index]?.name ?? '';
          return (
            <View style={{ flex: 1 }}>
              <StatusBar style={TOPO_ESCURO.has(rota) ? 'light' : 'dark'} />
              {children}
              {usuario && COM_ABAS.has(rota) ? (
                <BarraAbas
                  abas={[{ chave: 'Inicio', rotulo: 'Início', icone: 'water' }, { chave: 'Perfil', rotulo: 'Perfil', icone: 'person' }]}
                  atual={rota}
                  aoTocar={(chave) => { if (chave !== rota) navigation.navigate(chave as never); }}
                />
              ) : null}
            </View>
          );
        }}
        screenOptions={{ headerShown: false, animation: 'fade_from_bottom', animationDuration: 260, contentStyle: { backgroundColor: colors.bg } }}
      >
        {usuario ? (
          <>
            <Pilha.Screen name="Inicio" component={InicioScreen} options={{ animation: 'fade' }} />
            <Pilha.Screen name="Perfil" component={PerfilScreen} options={{ animation: 'fade' }} />
            <Pilha.Screen name="DefinirPin" component={DefinirPinScreen} />
            <Pilha.Screen name="Atualizacoes" component={AtualizacoesScreen} />
            {pode('agua.view') ? (
              <Pilha.Group>
                <Pilha.Screen name="Agua" component={AguaScreen} />
                <Pilha.Screen name="VazaoLista" component={VazaoListaScreen} />
                <Pilha.Screen name="VazaoNova" component={VazaoNovaScreen} />
                <Pilha.Screen name="VazaoFicha" component={VazaoFichaScreen} />
              </Pilha.Group>
            ) : null}
            {/* Quem vê cada formulário é o próprio formulário (acesso no portal), não o papel do módulo. */}
            <Pilha.Screen name="Formularios" component={FormulariosScreen} />
            <Pilha.Screen name="FormularioLista" component={FormularioListaScreen} />
            <Pilha.Screen name="FormularioNovo" component={FormularioNovoScreen} />
            <Pilha.Screen name="FormularioFicha" component={FormularioFichaScreen} />
          </>
        ) : (
          <>
            <Pilha.Screen name="Login" component={LoginScreen} options={{ animation: 'fade' }} />
            <Pilha.Screen name="PrimeiroAcesso" component={PrimeiroAcessoScreen} />
            <Pilha.Screen name="Atualizacoes" component={AtualizacoesScreen} />
          </>
        )}
      </Pilha.Navigator>
    </NavigationContainer>
  );
}
