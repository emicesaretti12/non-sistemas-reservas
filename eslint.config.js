import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      // `motion` entra en la lista porque se usa como `<motion.div>` y la regla
      // base de ESLint no reconoce identificadores dentro de un
      // JSXMemberExpression (los marca como no usados por error).
      'no-unused-vars': ['error', {
        varsIgnorePattern: '^(motion|[A-Z_])',
        argsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      }],
      // Los contexts exportan su provider y su hook desde el mismo archivo:
      // es el patrón idiomático y no rompe el fast refresh en la práctica.
      'react-refresh/only-export-components': ['warn', {
        allowExportNames: ['useToast', 'useConfirm', 'useTheme', 'useTour'],
      }],
    },
  },
])
