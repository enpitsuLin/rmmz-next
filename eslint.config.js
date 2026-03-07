import antfu from '@antfu/eslint-config'

export default antfu({
  ignores: ['example/project/**/*.{js,json}', '**/*.md'],
  type: 'lib',
  rules: {
    'ts/no-namespace': 'off',
    'ts/no-require-imports': 'off',
    'unicorn/prefer-node-protocol': 'off',
    'no-eval': 'off',
    'new-cap': 'off',
  },
})
