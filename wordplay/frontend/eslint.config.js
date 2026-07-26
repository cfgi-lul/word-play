// @ts-check
import taiga from '@taiga-ui/eslint-plugin-experience-next';

/**
 * Taiga UI's official ESLint preset (@taiga-ui/eslint-plugin-experience-next).
 * A few style rules are relaxed for this small app; core Angular/TS safety stays on.
 */
export default [
  ...taiga.configs.recommended,
  {
    ignores: ['dist/**', '.angular/**', 'node_modules/**', 'src/app/game/dictionaries/**'],
  },
  {
    files: ['**/*.{ts,js,mjs,cjs,html}'],
    rules: {
      '@stylistic/padding-line-between-statements': 'off',
      '@taiga-ui/experience-next/attrs-newline': 'off',
      '@taiga-ui/experience-next/injection-token-description': 'off',
      '@taiga-ui/experience-next/no-implicit-public': 'off',
      '@taiga-ui/experience-next/prefer-conditional-return': 'off',
      '@taiga-ui/experience-next/single-line-class-property-spacing': 'off',
      '@taiga-ui/experience-next/standalone-imports-sort': 'off',
      '@typescript-eslint/explicit-member-accessibility': 'off',
      '@typescript-eslint/max-params': 'off',
      '@typescript-eslint/no-unnecessary-condition': 'off',
      '@typescript-eslint/no-unnecessary-type-arguments': 'off',
      '@typescript-eslint/prefer-nullish-coalescing': 'off',
      '@typescript-eslint/sort-type-constituents': 'off',
      '@typescript-eslint/use-unknown-in-catch-callback-variable': 'off',
      'no-restricted-syntax': 'off',
      'perfectionist/sort-objects': 'off',
      'sonarjs/cognitive-complexity': 'off',
      'sonarjs/no-duplicate-string': 'off',
      'sonarjs/prefer-nullish-coalescing': 'off',
      'unicorn/no-array-callback-reference': 'off',
      'unicorn/no-array-reduce': 'off',
      'unicorn/prefer-global-this': 'off',
      'unicorn/prefer-string-replace-all': 'off',
    },
  },
];
