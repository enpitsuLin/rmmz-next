import antfu from '@antfu/eslint-config'

export default antfu({
  ignores: ['example/*/data/**', 'example/*/js/libs/**', 'example/*/js/plugins.js', 'example/*/js/plugins/**', 'example/*/.rmmz-dev/**', 'example/*/.rmmz-next-backup/**', 'packages/rmmz-next/test/fixtures/**', '**/*.md'],
  type: 'lib',
  rules: {
    'ts/no-namespace': 'off',
    'ts/no-require-imports': 'off',
    'unicorn/prefer-node-protocol': 'off',
    'no-eval': 'off',
    'new-cap': 'off',
  },
}, {
  files: ['packages/rmmz-next/templates/package.json'],
  rules: {
    // Generated projects do not share this workspace's catalogs.
    'pnpm/json-enforce-catalog': 'off',
  },
})
