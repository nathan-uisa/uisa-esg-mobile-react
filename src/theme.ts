/**
 * Paleta do app ESG (docs/01_DESIGN.md): água e verde. Azul ESG para a estrutura, ciano para o brilho da água,
 * verde ESG como segundo tom e laranja UISA **só** para a ação principal de cada tela (como no app do Safety).
 * Toda cor nova entra aqui — tela nenhuma escreve hexadecimal (`npm run verify:desenho` reprova).
 */
const AZUL = '#0080B3';
const CIANO = '#00ADEF';
const VERDE = '#61BB46';
const VERDE_UISA = '#007960';

export const colors = {
  /** Fundo das telas: branco com um toque de água. */
  bg: '#F7FBFD',
  white: '#FFFFFF',
  surface: '#EEF5F9',
  surfacePressed: '#E1EDF4',
  border: '#DCE8EF',
  text: '#0B1B26',
  textSoft: '#33495A',
  textMuted: '#62798A',
  textDim: '#A4B5C1',

  primary: AZUL,
  primaryPressed: '#006E9A',
  primaryDeep: '#00557A',
  primarySoft: '#E3F2F9',
  primaryInk: '#00648C',
  cyan: CIANO,
  cyanSoft: '#DDF4FD',

  green: VERDE,
  greenDeep: VERDE_UISA,
  greenSoft: '#EDF7E9',
  greenInk: '#3F8A2B',

  accent: '#F58220',
  accentPressed: '#DB6E10',
  accentSoft: '#FFF1E4',
  accentInk: '#B8590A',

  danger: '#D93B3B',
  dangerSoft: '#FCE9E9',
  warning: '#E8740C',
  warningSoft: '#FDEEDF',

  /** Sombra azul-escura das peças que flutuam (cartões, abas, botão principal). */
  shadow: '#00314A',
  /** Véu escuro sobre as fotos, para o texto branco ler bem. */
  veil: 'rgba(0,30,46,0.55)',
  veilSoft: 'rgba(0,30,46,0.18)',
  glass: 'rgba(255,255,255,0.16)',
  glassBorder: 'rgba(255,255,255,0.32)',
  onDarkMuted: 'rgba(255,255,255,0.82)',
  onDarkDim: 'rgba(255,255,255,0.6)',
  transparent: 'transparent',
};

/** Degradês: o “mergulho” (ciano → azul → azul fundo) e o “mangue” (azul → verde UISA). */
export const gradients = {
  agua: [CIANO, AZUL, '#00557A'] as const,
  aguaVerde: [AZUL, '#00898F', VERDE_UISA] as const,
  vidro: ['rgba(255,255,255,0.22)', 'rgba(255,255,255,0.06)'] as const,
  veuFoto: ['rgba(0,30,46,0)', 'rgba(0,30,46,0.35)', 'rgba(0,30,46,0.85)'] as const,
  /** Véu do login sobre a foto do rio: a água escurece de cima para baixo até o azul fundo dos campos. */
  veuLogin: ['rgba(0,85,122,0.35)', 'rgba(0,85,122,0.72)', 'rgba(0,49,74,0.94)'] as const,
};

export const brandFontFamily = {
  headingUi: 'UisaKobenhavnUISemiBold',
  heading: 'UisaKobenhavnSemiBold',
  regular: 'UisaKobenhavnRegular',
  body: 'UisaRobotoRegular',
  medium: 'UisaRobotoMedium',
};

export const space = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 };

/** Tudo arredondado: o app é “de água”. */
export const radius = {
  md: 16,
  lg: 22,
  card: 28,
  hero: 36,
  /** Canto inferior dos painéis de cabeçalho (login, início, módulo). */
  panel: 44,
  pill: 999,
};

export const size = { back: 48, acao: 44, campo: 58, cta: 60, linha: 76 };

export const type = {
  hero: { fontSize: 30, lineHeight: 38, fontWeight: '700' as const, color: colors.text },
  title: { fontSize: 22, lineHeight: 29, fontWeight: '700' as const, color: colors.text },
  section: { fontSize: 17, lineHeight: 23, fontWeight: '700' as const, color: colors.text },
  label: { fontSize: 13, lineHeight: 17, fontWeight: '500' as const, color: colors.textMuted },
  body: { fontSize: 16, lineHeight: 23, fontWeight: '400' as const, color: colors.text },
  bodyStrong: { fontSize: 16, lineHeight: 23, fontWeight: '600' as const, color: colors.text },
  caption: { fontSize: 13.5, lineHeight: 19, fontWeight: '400' as const, color: colors.textMuted },
};

/** Sombra macia, para cartões que “boiam”. */
export const shadow = {
  card: { elevation: 3, shadowColor: colors.shadow, shadowOpacity: 0.1, shadowRadius: 16, shadowOffset: { width: 0, height: 6 } },
  float: { elevation: 8, shadowColor: colors.shadow, shadowOpacity: 0.22, shadowRadius: 18, shadowOffset: { width: 0, height: 10 } },
};
