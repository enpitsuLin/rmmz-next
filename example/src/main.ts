import { Main } from '@rmmz-lib/runtime'
import { $plugins, loadPlugins } from 'virtual:rmmz-project'

new Main({ plugins: $plugins, loadPlugins }).run()
