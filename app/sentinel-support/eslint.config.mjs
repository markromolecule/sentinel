import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

const eslintConfig = defineConfig([
    ...nextVitals,
    ...nextTs,
    // Override default ignores of eslint-config-next.
    globalIgnores([
        // Default ignores of eslint-config-next:
        '.next/**',
        'out/**',
        'build/**',
        'next-env.d.ts',
    ]),
    {
        files: ['**/*.{js,mjs,cjs,ts,jsx,tsx}'],
        rules: {
            '@typescript-eslint/no-explicit-any': 'off',
            '@typescript-eslint/no-unsafe-function-type': 'off',
            '@typescript-eslint/no-unused-vars': [
                'warn',
                { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
            ],
            'react-hooks/set-state-in-effect': 'off',
            'react-hooks/globals': 'off',
            'react/no-unescaped-entities': 'off',
            '@next/next/no-img-element': 'off',
            'prefer-const': 'warn',
            'react-hooks/rules-of-hooks': 'warn',
            '@next/next/no-assign-module-variable': 'off',
            '@typescript-eslint/no-require-imports': 'off',
            'react-hooks/immutability': 'off',
            'react/display-name': 'off',
            'react-hooks/refs': 'off',
            'react-hooks/preserve-manual-memoization': 'off',
        },
    },
]);

export default eslintConfig;

