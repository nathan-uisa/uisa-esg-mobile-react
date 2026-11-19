// O canal OTA (QLD ou PRD) é gravado na instalação: `OTA_ENVIRONMENT=PRD npx expo run:android --variant release`.
// Um pacote OTA não troca o canal do aparelho.
module.exports = ({ config }) => {
  const canal = String(process.env.OTA_ENVIRONMENT || 'QLD').trim().toUpperCase();
  if (!['QLD', 'PRD'].includes(canal)) throw new Error('OTA_ENVIRONMENT deve ser QLD ou PRD.');
  return {
    ...config,
    updates: { ...config.updates, requestHeaders: { 'x-uisa-environment': canal, 'expo-channel-name': canal } },
  };
};
