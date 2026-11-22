# rmmz-next

用于 RPG Maker MZ 工程的游戏运行时和 Vite 工具。它提供用 TypeScript 实现的 JGSS 核心，可通过 Vite 构建游戏，并在浏览器或 NW.js 中试玩。

## 快速开始

需要 Node.js 20.19+（20.x）或 22.12+。在包含 `game.rmmzproject` 的原版 RPG Maker MZ 工程目录运行：

```bash
pnpm dlx rmmz-next init
pnpm install
pnpm dev:server
```

打开终端显示的地址即可在浏览器试玩。开发服务器运行期间，也可以在 MZ 编辑器里点击试玩。要直接启动 NW.js 窗口，可运行 `pnpm dev`。

使用 npm 时，对应命令是 `npx rmmz-next init`、`npm install` 和 `npm run dev:server`。从其他目录迁移时，可以在 `init` 后加上工程路径。

## 开发与构建

| 命令 | 用途 |
| --- | --- |
| `pnpm dev` | 启动 Vite 和 NW.js 窗口 |
| `pnpm dev:server` | 启动 Vite，从浏览器或 MZ 编辑器试玩 |
| `pnpm typecheck` | 运行 TypeScript 类型检查 |
| `pnpm build` | 将游戏及其资源构建到 `dist/` |
| `pnpm preview` | 在浏览器预览已构建的游戏 |
| `pnpm exec rmmz-next game` | 使用 NW.js 运行 `dist` |

CLI 默认从 Steam 安装的 RPG Maker MZ 中查找 NW.js。使用 `pnpm exec rmmz-next find` 查看找到的路径，或将 `RMMZ_NW_PATH` 设为 NW.js 可执行文件的路径。

### 使用 RPG Maker MZ 编辑器部署

1. 在游戏工程目录运行 `pnpm build`。
2. 在 RPG Maker MZ 编辑器中选择「文件 → 打开项目」，打开构建后的 `dist/game.rmmzproject`。
3. 选择「文件 → 部署」，设置目标平台和输出目录，再导出分发包。[官方部署说明](https://rpgmakerofficial.com/product/MZ_help-en/01_11_03.html)

### 额外资源目录

构建会自动复制标准的 RPG Maker MZ 资源目录。如果工程还有 `models/` 等额外目录，可以把 `vite.config.ts` 中的 `rmmz()` 改为 `rmmz({ extraAssetDirs: ['models'] })`。目录相对于工程根目录，`models/maps/scene.glb` 会复制到 `dist/models/maps/scene.glb`。

## 迁移与恢复

`init` 会把 `js/main.js` 切换为 ESM 入口，生成 Vite 和 TypeScript 配置，并把 `RmmzGlobals` 放进插件列表首位。游戏数据、素材和窗口设置会保留，原有插件的加载顺序、启用状态和参数也会保留。

被替换的文件和旧引擎脚本会备份到 `.rmmz-next-backup/`。安装后，`postinstall` 会将 `package.json` 设为只读，防止 MZ 编辑器覆盖开发配置。启用只读保护后，如果编辑器提示「无法写入文件 package.json。」，可以忽略该提示，点击「确定」继续。

### 添加依赖

在游戏工程目录执行以下步骤。恢复只读保护前，请先暂停在 MZ 编辑器中保存工程。

1. 运行 `pnpm exec rmmz-next unprotect` 或 `npx rmmz-next unprotect`，临时解锁 `package.json`。
2. 使用 `pnpm add <包名>` 或 `npm install <包名>` 添加依赖。
3. 运行 `pnpm exec rmmz-next protect` 或 `npx rmmz-next protect` 恢复只读保护。

### 恢复原版工程

1. 如果 `package.json` 已锁定，运行 `pnpm exec rmmz-next unprotect` 或 `npx rmmz-next unprotect` 解锁。
2. 将 `.rmmz-next-backup/` 中的文件按原路径复制回工程，覆盖迁移后对应的文件。
3. 删除迁移时新增且没有备份的 `.gitignore`、`vite.config.ts`、`tsconfig.json` 和 `js/plugins/RmmzGlobals.js`。确认恢复后，可删除 `.rmmz-next-backup/`。

## 模块入口

| 导入路径 | 用途 |
| --- | --- |
| `rmmz-next` | 引擎 API |
| `rmmz-next/runtime` | 通过 `Main` 启动游戏 |
| `rmmz-next/vite` | 通过 `rmmz()` 接入 Vite |
| `rmmz-next/database-types` | RPG Maker 数据库类型 |

`init` 生成的 `tsconfig.json` 已载入引擎全局变量和 Vite 虚拟模块的类型声明。
