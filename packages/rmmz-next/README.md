# rmmz-next

在原版 RPG Maker MZ 工程中使用 rmmz-next、Vite 和 TypeScript。

## 迁移已有工程

```sh
rmmz-next init /path/to/game
```

在工程目录执行时，可以省略路径：

```sh
rmmz-next init
pnpm install
pnpm dev
```

当前仓库尚未发布 npm 包，可直接运行本地 CLI：

```sh
node packages/rmmz-next/bin/cli.js init /path/to/game
```

本地未发布版本会自动生成指向此仓库的 `link:` 依赖；发布版本使用 CLI 自身的版本号。已有的 `rmmz-next` 依赖声明会保留。

1. 将 `js/main.js` 切换为 ESM 入口，使用 `rmmz-next/runtime` 启动游戏。
2. 生成与 `example/basic` 一致的 Vite、TypeScript 配置和开发脚本。
3. 保留 HTML 标题、窗口设置、游戏数据、素材及原有插件的顺序、启用状态和参数；在插件列表首位加入 `RmmzGlobals`。
4. 备份被替换的文件至 `.rmmz-next-backup`，并将旧引擎脚本及已由 npm 依赖替代的库移入备份。Effekseer 和 Vorbis 文件继续保留在 `js/libs`。
5. 安装依赖后，`postinstall` 会调用 `rmmz-next protect`，避免编辑器覆盖 `package.json`；已有 `postinstall` 会先执行。

同一工程存在迁移备份时，`init` 会拒绝重复执行。恢复原版时，将备份目录中的文件复制回工程，移除新增的配置、`js/plugins/RmmzGlobals.js` 和备份目录。

## 开发与构建

| 命令 | 用途 |
| --- | --- |
| `pnpm dev` | 启动 Vite 和 NW.js |
| `pnpm dev:server` | 仅启动 Vite，可从浏览器或 MZ 编辑器试玩 |
| `pnpm typecheck` | 检查类型 |
| `pnpm build` | 生成包含游戏资源及运行库的 `dist` |
| `pnpm preview` | 在浏览器预览构建结果 |
| `pnpm exec rmmz-next game` | 使用 NW.js 运行 `dist` |

NW.js 沿用 CLI 的 Steam 自动发现机制，也可通过 `RMMZ_NW_PATH` 指定可执行文件。
