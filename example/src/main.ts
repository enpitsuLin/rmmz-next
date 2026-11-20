import { Main } from 'rmmz-next/runtime'
import { $plugins, loadPlugins } from 'virtual:rmmz-project'

new Main({ plugins: $plugins, loadPlugins }).run()
