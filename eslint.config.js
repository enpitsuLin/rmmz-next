import antfu from '@antfu/eslint-config'

export default antfu({
  ignores: ['example/project/**/*.{js,json}'],
  type: 'lib',
  rules: {
    'ts/no-namespace': 'off'
  }
})
