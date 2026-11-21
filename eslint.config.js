import antfu from '@antfu/eslint-config'

export default antfu({
  ignores: ['example/basic/data/**', 'example/basic/js/libs/**', 'example/basic/js/plugins.js', 'example/basic/js/plugins/**', 'example/basic/.rmmz-dev/**', '**/*.md'],
  type: 'lib',
  rules: {
    'ts/no-namespace': 'off',
    'ts/no-require-imports': 'off',
    'unicorn/prefer-node-protocol': 'off',
    'no-eval': 'off',
    'new-cap': 'off',
  },
})
