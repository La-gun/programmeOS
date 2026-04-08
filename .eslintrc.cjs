/* Shared ESLint for workspace packages (not Next.js). */
module.exports = {
  root: true,
  ignorePatterns: [
    'node_modules/',
    'dist/',
    '.next/',
    'coverage/',
    '**/node_modules/**',
    '**/dist/**'
  ],
  overrides: [
    {
      files: ['packages/ui/**/*.{ts,tsx}', 'packages/prisma/**/*.ts'],
      parser: '@typescript-eslint/parser',
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module'
      },
      plugins: ['@typescript-eslint'],
      extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
      env: { node: true, es2022: true },
      rules: {
        '@typescript-eslint/no-unused-vars': [
          'warn',
          { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }
        ],
        '@typescript-eslint/no-explicit-any': 'off'
      }
    }
  ]
}
