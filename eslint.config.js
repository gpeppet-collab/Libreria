const expoConfig = require('eslint-config-expo/flat');
const { defineConfig } = require('eslint/config');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['node_modules/**', '.expo/**', 'dist/**', 'android/**', 'ios/**', 'coverage/**'],
  },
  {
    rules: {
      // Il dominio non deve dipendere da React Native o Expo (vedi docs/02-architettura.md).
      'no-restricted-imports': 'off',
    },
  },
  {
    files: ['src/domain/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                'react',
                'react-native',
                'expo',
                'expo-*',
                '@/data/*',
                '@/services/*',
                '@/hooks/*',
                '@/ui/*',
              ],
              message:
                'src/domain deve restare puro: niente dipendenze da UI, Expo o livelli superiori.',
            },
          ],
        },
      ],
    },
  },
]);
