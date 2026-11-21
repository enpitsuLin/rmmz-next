import antfu from '@antfu/eslint-config'

export default antfu({
  ignores: ['example/data/**', 'example/js/libs/**', 'example/js/plugins.js', 'example/js/plugins/**', 'example/.rmmz-dev/**', '**/*.md'],
  type: 'lib',
  rules: {
    'ts/no-namespace': 'off',
    'ts/no-require-imports': 'off',
    'unicorn/prefer-node-protocol': 'off',
    'no-eval': 'off',
    'new-cap': 'off',
  },
})
