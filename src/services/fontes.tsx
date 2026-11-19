import React, { createContext, useContext } from 'react';
import { useFonts } from 'expo-font';
import { brandFontFamily } from '../theme';

const Fontes = createContext({ carregadas: false, prontas: true });
const ARQUIVOS = {
  [brandFontFamily.headingUi]: require('../../assets/fonts/KobenhavnSans-SemiBold-UI.otf'),
  [brandFontFamily.heading]: require('../../assets/fonts/KobenhavnSans-SemiBold.otf'),
  [brandFontFamily.regular]: require('../../assets/fonts/KobenhavnSans-Regular.otf'),
  [brandFontFamily.body]: require('../../assets/fonts/Roboto-Regular.ttf'),
  [brandFontFamily.medium]: require('../../assets/fonts/Roboto-Medium.ttf'),
};

/** Fontes da marca (as mesmas do app do Safety). Sem elas o app abre com a fonte do sistema. */
export function FontesProvider({ children }: { children: React.ReactNode }) {
  const [carregadas, erro] = useFonts(ARQUIVOS);
  return <Fontes.Provider value={{ carregadas, prontas: carregadas || Boolean(erro) }}>{children}</Fontes.Provider>;
}
export const useFontes = () => useContext(Fontes);
