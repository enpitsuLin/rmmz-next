# GLB 场景与独立 Prop

1. **资源与地图绑定**

   `models/maps/graveyard.glb` 是标准 glTF 2.0 二进制场景，内含原版几何、材质、PNG 贴图、Prop 布局、碰撞和光效挂点。`models/props/` 提供火盆、墓穴、墓碑、树木、围栏等可复用模型。地图场景自身完整，不在运行时拼接外部 GLB，也没有 Prop JSON 清单。

   Map001 备注：

   ```text
   <propScene:models/maps/graveyard.glb>
   ```

   Vite 配置通过 `rmmz({ extraAssetDirs: ['models'] })` 将模型目录原样复制到构建输出，标准 RMMZ 资源目录照常包含。

   世界坐标为 X/Z 水平、Y 向上；MZ 地图中心 `(90,90)` 对应世界 `(0,0,0)`。场景节点采用标准 `translation`、四元数 `rotation`、`scale` 或 `matrix`。可以在支持 glTF 的三维编辑器中修改布局，导出时保留自定义属性。

2. **模型与配置**

   每个 Prop 根节点使用 `extras.nightward`：

   ```json
   {
     "id": "brazier:1",
     "model": "brazier",
     "kind": "brazier",
     "tags": ["brazier"],
     "hp": 10,
     "radius": 0.45,
     "colliders": [{ "x": 0, "z": 0, "width": 0.8, "depth": 0.8 }]
   }
   ```

   `id` 是稳定标识，复制节点后需要为副本设置唯一 ID；名称、节点顺序和位置不作为身份。`model` 标记生成器中的资源键，例如 `brazier`、`crypt`、`tomb-0001`。碰撞框为模型局部 X/Z 坐标，支持多个框；装饰可使用空数组。`active:false` 可设置初始隐藏，`onBreak` 可填写破坏后调用的 RMMZ 公共事件 ID。

   火焰、烛火、窗光和墓穴光使用命名子节点，`extras.nightward.light` 保存种类、颜色、亮度、范围等配置，子节点变换决定挂点位置。双扇门子节点名为 `door-left`、`door-right`，`extras.nightward.doorSide` 分别为 `-1`、`1`，节点原点就是转轴。

   GLB 网格和材质由 Pixi3D 原生解析。Nightward 只读取同一份 GLB 的 `extras`，没有补丁依赖。源模型、材质、纹理共用；销毁一个 Prop 或结束对局不会销毁这些共享资源。

3. **运行状态与渲染**

   每局新建 `PropManager`，保存独立的生命、破坏时间、门状态和当前变换。下一局从 GLB 初始布局重新创建，不把战斗结果写回资源。

   静态 Prop 不创建 Game_Event。按材质合批，只有 Prop 状态或变换改变时更新顶点和法线缓冲；碰撞同步转换为世界 AABB 并更新空间索引。移动、旋转、缩放和显隐共同影响模型、碰撞、门和附属光效。火盆破坏继续使用现有掉落、Effekseer 闪光/余辉与 Pixi3D 灯光。

4. **RMMZ 事件与插件指令**

   普通摆件直接编辑 GLB。真正需要事件页、移动路线或原生事件逻辑时，给少量逻辑事件添加：

   ```text
   <prop:brazier:1>
   <propOffset:0.4,0,-0.2>
   ```

   当前生效页控制绑定和显隐。事件被消除、没有有效页或切换到无绑定页时停用其 Prop；移动读取 `_realX/_realY`，仍按世界 X = 事件 X - center + offsetX、Z = 事件 Y - center + offsetZ 随动。注释无需执行。一个事件可以绑定多个 Prop，每个绑定紧跟自己的偏移。

   Nightward 插件新增：

   | 指令 | 参数与行为 |
   | --- | --- |
   | `PropMove` | `target`、`x/y/z`、`relative`；世界坐标移动，或按增量平移 |
   | `PropVisible` | `target`、`visible`；同步控制模型、碰撞、光效 |
   | `PropBreak` | `target`；破坏一次，火盆沿用现有掉落和特效 |
   | `PropDoor` | `target`、`amount`；0 关闭、1 打开；未指定时保留原版 170–180 秒开门时序 |
   | `PropCommonEvent` | `target`、`commonEvent`；按 Prop 排队调用原生公共事件 |
   | `PropContext` | `variable`；把当前 Prop 公共事件的 ID 写入指定变量 |

   `target` 可以是稳定 ID，例如 `brazier:1`，也可以是标签，例如 `#brazier`。在 Prop 公共事件中，`@context` 表示本次调用对应的 Prop。公共事件继续由地图解释器执行，不创建第二套消费器。绑定事件的位置仍持续驱动 Prop，因此要永久调整绑定物件位置时应移动该事件。

5. **迁移与资源重制**

   当前工程的旧布局已迁入 GLB。迁移读取保存的事件坐标、注释和偏移，外圈墓碑组拆回单体并保留组的整体位移。纯摆件事件删除，有条件页、事件指令或移动路线的事件保留为 ID 绑定。地图原点与其他备注保留。

   正常重新生成保留场景已有节点层级、变换、稳定 ID、自定义属性，以及手工增加、删除和复制的布局；只更新原版网格和材质。生成网格的 `extras.nightward.key` 是资源键，编辑导出时需保留；没有原版资源键的自定义网格和材质继续保留。`generate:content` 保留 Map001 和 MapInfos，不重新铺设 Prop。

   只更新模型资产：

   ```sh
   node scripts/import-reference-assets.mjs --world-only
   ```

   显式重置为原版默认布局（覆盖手工场景布局）：

   ```sh
   node scripts/import-reference-assets.mjs --world-only --reset-layout
   ```

   原版源脚本可通过 `NIGHTWARD_REFERENCE_SOURCE` 与 `NIGHTWARD_REFERENCE_LOADER` 指向本地快照。普通运行不依赖这些脚本。
