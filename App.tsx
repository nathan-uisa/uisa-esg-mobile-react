import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Navegador from './src/navigation/Navegador';
import { BloqueioScreen } from './src/screens/BloqueioScreen';
import { iniciarAtualizacoes } from './src/services/atualizacoes';
import { FontesProvider, useFontes } from './src/services/fontes';
import { iniciarSincronizacaoFormularios } from './src/services/formularios';
import { marcarAtividade } from './src/services/inatividade';
import { SessaoProvider, useSessao } from './src/services/sessao';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

function Raiz() {
  const { pronto, usuario, bloqueado, geracao } = useSessao();
  const fontes = useFontes();
  useEffect(() => { if (pronto && fontes.prontas) SplashScreen.hideAsync().catch(() => undefined); }, [pronto, fontes.prontas]);
  // Definições dos formulários do portal: confere as versões ao entrar e ao voltar ao app (no máximo a cada 5 min).
  const logado = Boolean(usuario);
  useEffect(() => (logado ? iniciarSincronizacaoFormularios() : undefined), [logado, geracao]);
  if (!pronto || !fontes.prontas) return null;
  // Todo toque conta como uso (bloqueio por inatividade); a captura não rouba o toque. `key={geracao}`: outra pessoa
  // entrando descarta as telas da anterior; o desbloqueio da mesma pessoa mantém tudo montado por baixo.
  return (
    <View style={s.raiz} onStartShouldSetResponderCapture={() => { marcarAtividade(); return false; }}>
      <Navegador key={geracao} />
      {usuario && bloqueado ? <BloqueioScreen /> : null}
    </View>
  );
}

export default function App() {
  useEffect(() => iniciarAtualizacoes(), []);
  return (
    <SafeAreaProvider>
      <FontesProvider>
        <SessaoProvider>
          <Raiz />
        </SessaoProvider>
      </FontesProvider>
    </SafeAreaProvider>
  );
}

const s = StyleSheet.create({ raiz: { flex: 1 } });
