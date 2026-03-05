import antfu from '@antfu/eslint-config'

export default antfu({
  ignores: ['example/project/**/*.{js,json}'],
  type: 'lib',
  rules: {
    'ts/no-namespace': 'off',
    'ts/no-require-imports': 'warn',
    'unicorn/prefer-node-protocol': 'off',
    'no-eval': 'off',
    'new-cap': 'off',
  },
})
