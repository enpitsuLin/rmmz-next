# GLB 场景与独立 Prop

1. **资源与地图绑定**

   `models/maps/graveyard.glb` 是标准 glTF 2.0 二进制场景，内含原版装饰几何、材质、PNG 贴图、Prop 布局、碰撞和光效挂点。`models/props/` 提供火盆、墓穴、墓碑、树木、围栏等可复用模型。不在运行时拼接外部 GLB，也没有 Prop JSON 清单。

   草地、道路和散布泥地使用 RMMZ 的 `Map001.json`、`Tilesets.json` 和 `img/tilesets/`。原生 `Tilemap` 将地图的四个图块层、自动图块和地图阴影绘制到 `RenderTexture`，再将结果贴到世界 `Y=0` 的水平面，参与当前三维光照、阴影和雾。图块动画随世界暂停冻结。只缓存相机可见区域，避免为整张地图分配巨型贴图；编辑器中修改铺地后，重新进入场景即可显示。

   墓碑脚下的泥地保留为墓碑 Prop 的原版三维网格，使用 GLB 内嵌的 dirt 颜色、法线贴图和顶点透明度，随墓碑变换、显隐同步。地图第二层只铺道路和散布泥地，避免重复覆盖墓碑泥斑；GLB 不包含草地或道路泥地网格。石路等原版装饰仍由 GLB 叠加。

   `NightwardGround.png` 使用标准 384×768 的 A5 布局：前八行是完整的 8×8 草地图案，第 9–12 行前四列是 4×4 泥地图案。每格 48 像素对应一世界单位，保留原版草地每八单位、泥地每四单位重复的比例。第一图块层铺草地，第二图块层画泥地轮廓，其余层用于装饰；大块铺设时选择整组图块。

   `NightwardDirtEdgesB/C/D.png` 是原生 B–D 图块页，保存道路泥地边缘的透明渐变。进入场景时按第二图块层的八邻域补齐外边缘、转角和内凹角，内部保留 A5 图块；在编辑器中用 A5 泥地绘制或擦除轮廓即可。边缘在半格内平滑渐隐，颜色与法线使用同一透明度，因此道路无需额外的三维泥地网格或每帧计算渐变。B 页左上角保持空白。

   Tileset 备注 `<normalTilesets:{"4":"NightwardGround-normal","5":"NightwardDirtEdgesB-normal","6":"NightwardDirtEdgesC-normal","7":"NightwardDirtEdgesD-normal"}>` 按原生 tileset 槽位绑定法线图。运行时使用同一份地图图块位置绘制，地图阴影只作用于颜色；未配置法线的图块使用平面法线。

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

   `id` 是稳定标识，复制节点后需要为副本设置唯一 ID；名称、节点顺序和位置不作为身份。`model` 标记模型资源键，例如 `brazier`、`crypt`、`tomb-0001`。碰撞框为模型局部 X/Z 坐标，支持多个框；装饰可使用空数组。`active:false` 可设置初始隐藏，`onBreak` 可填写破坏后调用的 RMMZ 公共事件 ID。

   火焰、烛火、窗光和墓穴光使用命名子节点，`extras.nightward.light` 保存种类、颜色、亮度、范围等配置，子节点变换决定挂点位置。双扇门子节点名为 `door-left`、`door-right`，`extras.nightward.doorSide` 分别为 `-1`、`1`，节点原点就是转轴。

   GLB 网格和材质由 Pixi3D 原生解析。Nightward 只读取同一份 GLB 的 `extras`，没有补丁依赖。源模型、材质、纹理共用；销毁一个 Prop 或结束对局不会销毁这些共享资源。

3. **运行状态与渲染**

   每局新建 `Game_NightwardProps`，保存独立的生命、破坏时间、门状态和当前变换。下一局从 GLB 初始布局重新创建，不把战斗结果写回资源。

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
   | `PickupVacuum` | 将地图上全部经验宝石吸向主角 |
   | `PickupRelic` | `radius`、`delay`；延迟后清除范围内敌人 |
   | `PickupChest` | 触发 1–3 次装备升级（满构筑时改给金币）并打开宝箱界面 |
   | `PropMove` | `target`、`x/y/z`、`relative`；世界坐标移动，或按增量平移 |
   | `PropVisible` | `target`、`visible`；同步控制模型、碰撞、光效 |
   | `PropBreak` | `target`；破坏一次，火盆沿用现有掉落和特效 |
   | `PropDoor` | `target`、`amount`、`duration`。开度 0 为关闭、1 为打开。持续时间以秒计，默认 0 表示立即生效 |
   | `PropCommonEvent` | `target`、`commonEvent`；按 Prop 排队调用原生公共事件 |
   | `PropContext` | `variable`；把当前 Prop 公共事件的 ID 写入指定变量 |

   `target` 可以是稳定 ID，例如 `brazier:1`，也可以是标签，例如 `#brazier`。在 Prop 公共事件中，`@context` 表示本次调用对应的 Prop。这类调用由地图解释器执行。绑定事件的位置持续驱动 Prop，调整位置时可直接移动绑定事件。带有 `<nightwardSpawn:reaper>`（可选 `<spawnOffset:dx,dz>`）的地图事件用于指定死神出生点；图块集中标记为不可通行（`×`）的图块会自动加入地面静态碰撞。

5. **阶段演出**

   在 RMMZ 的「公共事件」中将触发条件设为「无」，首条指令使用注释 `<nightwardPhase:60>`，表示对局时间到达 60 秒时执行一次。`start` 对应开始对局，`boss`、`bossDeath` 和 `victory` 分别对应死神登场、被击败与胜利结算。加上 `,demo` 可同时在标题演示中运行，例如 `<nightwardPhase:170,demo>`。

   | 公共事件 | 默认内容 |
   | --- | --- |
   | 002 | 死神登场的 BGM、SE 和横幅 |
   | 003 | 胜利时的黎明 BGM（`Dawn`，在胜利 ME 结束后淡入） |
   | 005–007 | 开场横幅、1:00 和 2:00 的短提示 |
   | 008 | 2:50 显示 `#crypt`，10 秒内开门，标题演示也执行 |
   | 009–010 | 2:50 警告横幅、每秒响一次的倒计时、头三秒额外警报，3:00 结束倒计时 |
   | 011 | 击败死神的 SE |
   | 012–018 | 拾取物公共事件（经验宝石、金币、磁吸、圣物、宝箱） |

   提示使用 `PhaseNotice` 和 `PhaseBanner`，计时器颜色和脉冲使用 `TimerWarning`。音效、等待和调用其他公共事件使用 RMMZ 原生命令。通过 `PropVisible` 可在同一阶段控制物件、碰撞和光效的显隐。每个阶段事件独立执行，等待随对局暂停，重开时从头开始。门旋转与墓穴光效共用同一开度，对局暂停时开度保持当前值。

6. **布局迁移**

   当前工程的旧布局已迁入 GLB。迁移读取保存的事件坐标、注释和偏移，外圈墓碑组拆回单体并保留组的整体位移。纯摆件事件删除，有条件页、事件指令或移动路线的事件保留为 ID 绑定。地图原点与其他备注保留。
