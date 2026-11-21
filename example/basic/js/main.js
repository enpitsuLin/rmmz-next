// =============================================================================
// main.js v2.0.0
// =============================================================================

import { Main } from 'rmmz-next/runtime'
import { $plugins, loadPlugins } from 'virtual:rmmz-project'

const game = new Main({ plugins: $plugins, loadPlugins })

void game.run()
