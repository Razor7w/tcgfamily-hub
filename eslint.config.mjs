import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended'

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Alineado con .eslintignore; ESLint 9 (flat) aplica ignores aquí.
  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'dist/**',
    'coverage/**',
    'node_modules/**',
    'next-env.d.ts',
    '.cursor/**',
    '**/.agents/**'
  ]),
  // Último: desactiva reglas de formato que chocan con Prettier y aplica `prettier/prettier`.
  eslintPluginPrettierRecommended
])

export default eslintConfig
