import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist/**', 'node_modules/**', 'data/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      // The codebase uses `any` in several places (strict mode is off); surface it without failing.
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
);
