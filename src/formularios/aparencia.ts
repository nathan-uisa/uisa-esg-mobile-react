import type { ImageSourcePropType } from 'react-native';
import type { MaterialCommunityIcons } from '@expo/vector-icons';

/**
 * Foto do topo e ícone de cada formulário cadastrado. Formulário novo no portal cai no padrão do módulo (ou no geral):
 * aparece no app sem atualização; uma foto própria pede só uma OTA.
 */
const POR_FORMULARIO: Record<string, { foto: ImageSourcePropType; icone: keyof typeof MaterialCommunityIcons.glyphMap }> = {
  'consumo-agua-pipas': { foto: require('../../assets/imagens/objetivos-metas.jpg'), icone: 'tanker-truck' },
  'vazao-agua-industrial': { foto: require('../../assets/imagens/indicadores-fontes.jpg'), icone: 'gauge' },
};
const POR_MODULO: Record<string, ImageSourcePropType> = {
  agua: require('../../assets/imagens/agua.jpg'),
};
const GERAL: ImageSourcePropType = require('../../assets/imagens/visao-geral.jpg');

export function aparenciaDo(chave: string, modulo?: string) {
  const p = POR_FORMULARIO[chave];
  return { foto: p?.foto ?? (modulo && POR_MODULO[modulo]) ?? GERAL, icone: p?.icone ?? ('file-document-edit-outline' as const) };
}
