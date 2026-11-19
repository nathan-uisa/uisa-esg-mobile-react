/** @type {import('@expo/fingerprint').Config} */
const config = {
  sourceSkips: [
    'ExpoConfigRuntimeVersionIfString',
    'ExpoConfigVersions',
    'PackageJsonAndroidAndIosScriptsIfNotContainRun',
    'PackageJsonScriptsAll',
    'GitIgnore',
  ],
  ignorePaths: [
    'README.md',
    'docs/**/*',
    'dist-ota/**/*',
    'scripts/**/*',
    'android/build/**/*',
    'android/app/build/**/*',
    'android/.gradle/**/*',
  ],
};

module.exports = config;
