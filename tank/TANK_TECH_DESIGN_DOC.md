# LYD的坦克大战 — 技术设计文档 v1.0

> **项目名称**：LYD的坦克大战  
> **风格**：校园青春 + 霓虹科技混搭  
> **技术栈**：HTML5 Canvas + 原生 JavaScript (ES6+) + ES Modules  
> **目标**：单文件零依赖、浏览器直接运行、Solo Builder 可独立完成  

---

## 一、项目概述

### 1.1 游戏简介

一款俯视角坦克对战网页游戏，致敬经典《坦克大战》（Battle City）并结合现代弹幕射击元素。玩家操控校园主题坦克，在带有"浩源""浪尖儿"字样的地图中与敌方坦克 AI 对战，保护基地不被摧毁。

### 1.2 核心需求清单

| # | 需求 | 说明 |
|---|------|------|
| 1 | 页面美观 | 霓虹科技风 UI + 校园配色（天蓝/草绿/暖橙），发光描边、粒子特效 |
| 2 | 玩法多样 | 经典战役(守卫基地) + 无尽生存 + 道具系统 + 多种坦克/弹种 |
| 3 | 校园风格 | 地图砖墙刻有"浩源""浪尖儿"字样；坦克外观校园主题；BGM 轻快电子风 |
| 4 | 敌方坦克 AI | 自动移动、追击/巡逻/射击，简单但有趣的 AI 行为树 |
| 5 | 砖墙/障碍物 | 可破坏砖墙、不可破坏钢墙、草丛(隐蔽)、水路(阻挡) |
| 6 | 碰撞检测 | 坦克-墙壁、坦克-坦克、子弹-墙壁、子弹-坦克、子弹-子弹 |
| 7 | 胜负判定 | 守卫基地模式(基地被毁=失败/全灭敌军=胜利)、生存模式(3条命耗尽=结束) |

### 1.3 市面爆火玩法融合

| 玩法来源 | 融合要素 |
|----------|---------|
| 经典 Battle City (FC) | 基地守卫、砖墙破坏、关卡推进、敌方刷怪点 |
| Tanks! (Wii Play) | 双人对战、道具掉落、护盾/加速/火力升级 |
| 现代弹幕射击 | 蓄力炮、散射弹、激光、Boss坦克 |
| 吃鸡类 | 缩圈/毒圈机制(无尽模式)、空投道具 |
| 塔防元素 | 可部署地雷/炮塔(道具获取) |

---

## 二、技术架构

### 2.1 目录结构

```
tank/
├── index.html                 # 入口HTML（Canvas + UI层）
├── styles/
│   └── main.css               # 霓虹校园风样式
├── src/
│   ├── main.js                # 启动入口
│   ├── core/
│   │   ├── Game.js            # 游戏主类（状态机+主循环）
│   │   ├── Renderer.js        # Canvas渲染器（背景/视差/特效）
│   │   ├── InputManager.js    # 键盘+触屏输入
│   │   ├── AudioManager.js    # Web Audio合成音效/BGM
│   │   ├── Storage.js         # localStorage存档
│   │   ├── ObjectPool.js      # 对象池（子弹/粒子）
│   │   └── Utils.js           # 数学/碰撞/绘制工具
│   ├── config/
│   │   ├── Colors.js          # 校园霓虹配色常量
│   │   ├── TankData.js        # 坦克属性表（玩家/敌方）
│   │   ├── MapData.js         # 关卡地图数据
│   │   └── EnemyAIData.js     # 敌方AI配置
│   ├── entities/
│   │   ├── Entity.js          # 实体基类
│   │   ├── Tank.js            # 坦克基类（移动/射击/碰撞）
│   │   ├── PlayerTank.js      # 玩家坦克
│   │   ├── EnemyTank.js       # 敌方坦克（含AI）
│   │   ├── Bullet.js          # 子弹实体
│   │   ├── Wall.js            # 墙壁/障碍物实体
│   │   ├── Powerup.js         # 道具实体
│   │   └── Particle.js        # 粒子特效
│   ├── systems/
│   │   ├── CollisionSystem.js # 碰撞检测系统
│   │   ├── AISystem.js        # 敌方AI行为树
│   │   ├── SpawnSystem.js     # 敌方刷新系统
│   │   └── LevelManager.js    # 关卡/波次管理
│   └── ui/
│       └── UIManager.js       # HUD/菜单/结算UI
└── TANK_TECH_DESIGN_DOC.md    # 本文档
```

### 2.2 游戏状态机

```
                 ┌──────────┐
                 │   MENU   │ ← 主菜单（开始/机库/排行）
                 └────┬─────┘
                      ▼
              ┌───────────────┐
              │   PLAYING     │ ← 游戏中
              └──┬──────┬─────┘
                 │      │
          ┌──────▼──┐ ┌─▼──────────┐
          │ PAUSED  │ │   RESULT   │
          └─────────┘ └────────────┘
```

### 2.3 核心循环 (60fps)

```
Game._loop(t):
  1. 计算 dt = t - lastT (上限50ms防止跳帧)
  2. input.beginFrame(dt)
  3. if PLAYING:
       a. update(dt) → AI思考 → 坦克移动 → 子弹移动 → 碰撞检测 → 道具拾取 → 波次刷新
       b. draw(dt)   → 背景 → 墙壁 → 道具 → 坦克 → 子弹 → 粒子 → HUD
  4. input.endFrame()
```

---

## 三、地图系统

### 3.1 网格地图

地图采用**格子坐标系**，每格 32×32 像素，标准地图 **26×26 格**（832×832px）。

```
格子类型 (TileType):
  0 = 空地（可通行）
  1 = 砖墙（可破坏，4次击毁，每次破碎1/4）
  2 = 钢墙（不可破坏）
  3 = 草丛（可通行，遮挡视线，坦克进入后半透明）
  4 = 水路（坦克不可通行，子弹可飞越）
  5 = 基地（玩家大本营，被击中=失败）
  6 = 冰面（可通行，坦克有惯性滑动）
```

### 3.2 "浩源""浪尖儿"字样

在地图中央区域，用**砖墙拼出文字**，作为标志性装饰：

```
地图布局示意（26×26，中央 10×4 区域）：

  ····浩······浪尖儿····
  ██████  ██  ████████████
  ██████  ██  ████████████
  ██████  ██  ████████████
  ██████  ██  ████████████

  "浩源" 在左半区，"浪尖儿" 在右半区
  用砖墙(类型1)拼字，既装饰又可被打破
  打破后不影响游戏（纯装饰性砖墙）
```

**实现方式**：在 `MapData.js` 中用字符串数组定义字形：

```javascript
// "浩源" 字形 — 每个字符 5×5 格，1=砖墙 0=空
const HAO_YUAN = [
  // 浩
  "10111 10101 11101 10001 10111",
  // 源
  "10110 10111 00101 10111 10110",
];

// "浪尖儿" 字形
const LANG_JIAN_ER = [
  // 浪
  "10110 11101 10101 11101 10110",
  // 尖
  "00100 01110 11111 10101 10001",
  // 儿
  "10001 10010 10100 01010 00100",
];
```

### 3.3 关卡地图数据格式

```javascript
// MapData.js — 每关用字符串数组表示，直观可编辑
export const Level1 = {
  id: 1,
  name: "校园 · 操场",
  grid: [
    "..........................",
    "..SSSS....SSSS....SSSS....",   // S=钢墙
    "..S..S....S..S....S..S....",
    "..S..S....S..S....S..S....",
    "..SSSS....SSSS....SSSS....",
    "..........................",
    "....BBBBBBBBBBBBBBBBBB....",   // B=砖墙（浩源浪尖儿字样区）
    "....B  浩  B  浪尖儿  B....",
    "....BBBBBBBBBBBBBBBBBB....",
    "..........................",
    "..WWWW....GGGG....WWWW....",   // W=水路 G=草丛
    "..WWWW....GGGG....WWWW....",
    "..........................",
    "..........BBEEBB..........",   // E=基地
    "..........................",
    "...SS....BBBBBB....SS.....",
    "...SS....BBBBBB....SS.....",
    "..........................",
    "..........................",
  ],
  // 敌方刷新点（格子坐标）
  enemySpawns: [{x:1,y:1}, {x:12,y:1}, {x:24,y:1}],
  // 玩家出生点
  playerSpawn: {x:12, y:24},
  // 本关敌人波次
  waves: [
    {count: 4, types: ['scout','scout','gunner','scout'], interval: 3000},
    {count: 4, types: ['gunner','scout','heavy','gunner'], interval: 2500},
    {count: 2, types: ['boss'], interval: 4000},
  ],
};
```

### 3.4 墙壁破坏系统

砖墙有 **4 级耐久**，每次被子弹击中掉 1 级：

```
HP=4: 完整砖墙 ████████
HP=3: 有裂纹   ██████░░
HP=2: 半破损   ████░░░░
HP=1: 残骸     ██░░░░░░
HP=0: 摧毁     (变为空地)
```

每格砖墙按 2×2 子格子存储耐久，子弹打中哪一半就破坏哪一半（经典 Battle City 玩法）。

---

## 四、坦克系统

### 4.1 坦克类型

#### 玩家坦克（3种可选）

| 名称 | 校园主题 | HP | 速度 | 弹种 | 特殊技能 |
|------|---------|-----|------|------|---------|
| 学霸号 | 蓝色·知识 | 3 | 中 | 单发直射 | 蓄力炮（长按蓄能，松手发大弹） |
| 体育生 | 橙色·活力 | 4 | 快 | 散射3连 | 冲刺（短时无敌冲刺） |
| 文艺委员 | 紫色·优雅 | 2 | 中 | 穿甲弹 | 护盾（3秒无敌护盾） |

#### 敌方坦克（5种）

| 名称 | 外观 | HP | 速度 | AI类型 | 弹种 | 特点 |
|------|------|-----|------|--------|------|------|
| 新生 | 灰色小 | 1 | 慢 | 巡逻 | 慢单发 | 最弱，成群出现 |
| 突击兵 | 红色 | 2 | 中 | 追击 | 快单发 | 主动追玩家 |
| 重装 | 深绿 | 4 | 慢 | 防守 | 重炮 | 血厚，守据点 |
| 狙击手 | 黄色 | 1 | 中 | 埋伏 | 远程预判 | 预判玩家位置射击 |
| Boss | 彩色 | 10 | 中 | 综合 | 散射+激光 | 多阶段，每关1只 |

### 4.2 坦克属性数据结构

```javascript
// TankData.js
export const PlayerTanks = {
  scholar: {
    id: 'scholar',
    name: '学霸号',
    maxHp: 3,
    speed: 2.0,          // 格/秒
    fireRate: 400,       // 射击间隔ms
    bulletSpeed: 6,
    bulletDamage: 1,
    bulletType: 'normal',
    color: '#00aaff',
    skill: 'charge',     // 蓄力炮
    chargeTime: 1200,    // 蓄满时间
    chargeDamage: 3,
    chargeRadius: 16,
  },
  athlete: {
    id: 'athlete',
    name: '体育生',
    maxHp: 4,
    speed: 3.0,
    fireRate: 350,
    bulletSpeed: 5,
    bulletDamage: 1,
    bulletType: 'spread3',
    color: '#ff8800',
    skill: 'dash',
    dashTime: 300,
    dashCD: 4000,
  },
  artist: {
    id: 'artist',
    name: '文艺委员',
    maxHp: 2,
    speed: 2.2,
    fireRate: 450,
    bulletSpeed: 7,
    bulletDamage: 1,
    bulletType: 'pierce',  // 穿甲弹（穿透砖墙）
    color: '#aa00ff',
    skill: 'shield',
    shieldTime: 3000,
    shieldCD: 8000,
  },
};

export const EnemyTanks = {
  scout: {
    name: '新生', hp: 1, speed: 1.2, fireRate: 1500,
    bulletSpeed: 3, bulletDamage: 1, score: 100,
    color: '#888888', ai: 'patrol',
  },
  striker: {
    name: '突击兵', hp: 2, speed: 1.8, fireRate: 1000,
    bulletSpeed: 4, bulletDamage: 1, score: 200,
    color: '#ff4444', ai: 'chase',
  },
  heavy: {
    name: '重装', hp: 4, speed: 0.8, fireRate: 2000,
    bulletSpeed: 3, bulletDamage: 2, score: 300,
    color: '#446644', ai: 'guard',
  },
  sniper: {
    name: '狙击手', hp: 1, speed: 1.5, fireRate: 1800,
    bulletSpeed: 8, bulletDamage: 1, score: 250,
    color: '#ffdd00', ai: 'ambush',
  },
  boss: {
    name: 'Boss坦克', hp: 10, speed: 1.5, fireRate: 800,
    bulletSpeed: 4, bulletDamage: 1, score: 2000,
    color: '#ff00ff', ai: 'boss',
    phases: 3,
  },
};
```

### 4.3 坦克移动与朝向

坦克为**四方向移动**（上下左右），不支持斜向（经典坦克手感）：

```
方向常量:
  UP    = 0  (dy=-1)
  RIGHT = 1  (dx=+1)
  DOWN  = 2  (dy=+1)
  LEFT  = 3  (dx=-1)

移动逻辑:
  1. 输入决定目标方向
  2. 坦克朝向立即切换到目标方向
  3. 检测前方格子是否可通行（碰撞检测）
  4. 可通行则按 speed 移动
  5. 移动时做格子对齐（接近格子中心时自动吸附，方便转弯）
```

**格子对齐**是经典坦克手感的核心：转弯时坦克会自动微调到格子中线，避免卡墙。

### 4.4 射击系统

```javascript
子弹类型:
  normal   — 普通弹（直线，1伤害）
  spread3  — 散射弹（3发扇形，中列直+两侧斜）
  pierce   — 穿甲弹（穿透砖墙，2伤害）
  charged  — 蓄力弹（大体积，3伤害，破墙）
  heavy    — 重炮弹（慢速，2伤害，爆炸范围）
  laser    — 激光（Boss专用，瞬时命中）

子弹属性:
  x, y, dir, speed, damage, owner(玩家/敌方), type, life

射击冷却:
  每辆坦克有 fireRate 间隔，防止高频射击
  场上同时最多存在的子弹数有限制（玩家2发，敌方1发）
```

---

## 五、敌方AI系统

### 5.1 AI行为树

采用**简化行为树**，每辆敌方坦克根据AI类型执行不同策略：

```
AI执行频率: 每 500ms 做一次决策（非每帧，节省性能）
移动执行: 按决策结果持续移动，直到撞墙或到下次决策

行为节点:
  Patrol(巡逻)   — 随机选方向移动，遇墙换方向
  Chase(追击)    — 向玩家方向移动（A*简化版/方向贪心）
  Guard(防守)    — 在据点附近巡逻，玩家靠近时追击
  Ambush(埋伏)   — 草丛中静止，玩家进入射程时射击
  Flee(逃跑)     — HP低时远离玩家

射击逻辑:
  - 正面有玩家/基地 → 立即射击
  - 随机射击概率 → 10%~30%（视AI类型）
  - 子弹飞出后等冷却结束才能再射
```

### 5.2 AI类型配置

```javascript
// EnemyAIData.js
export const AIConfig = {
  patrol: {
    thinkInterval: 800,     // 思考间隔ms
    shootChance: 0.1,       // 随机射击概率
    preferDirections: null, // 无偏好
  },
  chase: {
    thinkInterval: 500,
    shootChance: 0.2,
    trackPlayer: true,      // 追踪玩家
    trackBase: 0.3,         // 30%概率追基地
  },
  guard: {
    thinkInterval: 600,
    shootChance: 0.15,
    guardRadius: 5,         // 守卫半径(格)
    chaseOnSight: true,     // 发现玩家时追击
  },
  ambush: {
    thinkInterval: 400,
    shootChance: 0.5,       // 发现目标时高频射击
    hideInGrass: true,
    detectRange: 7,         // 发现距离(格)
    aimAhead: true,         // 预判射击
  },
  boss: {
    thinkInterval: 300,
    shootChance: 0.4,
    phases: [
      { hpRange: [0.66, 1.0], pattern: 'spread', moveSpeed: 1.2 },
      { hpRange: [0.33, 0.66], pattern: 'laser', moveSpeed: 1.5, summon: true },
      { hpRange: [0, 0.33], pattern: 'barrage', moveSpeed: 2.0 },
    ],
  },
};
```

### 5.3 AI寻路（简化A*）

```javascript
// 简化版A*：仅计算下一步方向，不做完整路径
// 多数情况用"方向贪心"（向目标方向走，遇墙则尝试垂直方向）
function aiNextStep(enemy, target, map):
  dx = target.x - enemy.x
  dy = target.y - enemy.y
  // 优先距离更大的轴
  if abs(dx) > abs(dy):
    dir = dx > 0 ? RIGHT : LEFT
    if canMove(enemy, dir) return dir
  if dy != 0:
    dir = dy > 0 ? DOWN : UP
    if canMove(enemy, dir) return dir
  // 都走不通则随机
  return randomValidDir(enemy)
```

---

## 六、碰撞检测系统

### 6.1 碰撞分类

| 检测对 | 方式 | 响应 |
|--------|------|------|
| 坦克 vs 墙壁 | AABB + 格子查询 | 阻止移动 |
| 坦克 vs 坦克 | AABB | 阻止移动 |
| 子弹 vs 墙壁 | AABB + 格子查询 | 砖墙HP-1/钢墙弹跳消失 |
| 子弹 vs 坦克 | AABB | 坦克HP-1，子弹消失 |
| 子弹 vs 子弹 | AABB | 同归于尽（仅玩家弹vs敌方弹） |
| 子弹 vs 基地 | AABB | 基地HP-1，若HP=0则游戏失败 |
| 坦克 vs 道具 | AABB(拾取范围) | 拾取道具 |
| 坦克 vs 草丛 | 格子查询 | 进入草丛后半透明(视觉) |

### 6.2 格子查询优化

```javascript
// 不用遍历所有墙壁，直接查格子数组 O(1)
function getTileAt(gridX, gridY):
  return mapGrid[gridY][gridX]

function canTankMoveTo(tank, newX, newY):
  // 检查坦克AABB覆盖的所有格子
  cells = getOverlappingCells(newX, newY, tank.size)
  for cell in cells:
    tile = getTileAt(cell.x, cell.y)
    if tile is WALL or STEEL or WATER: return false
  // 检查与其他坦克碰撞
  for other in allTanks:
    if other != tank and AABB(tank, other): return false
  return true
```

### 6.3 子弹与砖墙的半格破坏

```javascript
// 砖墙按 2×2 子格子存储，每格 16×16px
// 子弹命中时判断打中了哪个子格子
function bulletHitBrick(bullet, brickCell):
  subX = bullet.x > brickCell.centerX ? 1 : 0
  subY = bullet.y > brickCell.centerY ? 1 : 0
  brickCell.hp[subY][subX]--
  if brickCell.hp[subY][subX] <= 0:
    // 该子格子摧毁，更新碰撞/渲染
```

---

## 七、道具系统

### 7.1 道具类型

| 道具 | 图标 | 效果 | 持续 |
|------|------|------|------|
| 火力升级 | ⭐ | 子弹伤害+1 / 散射弹升级 | 永久(本局) |
| 速度提升 | ⚡ | 移动速度+50% | 10秒 |
| 护盾 | 🛡 | 无敌 | 8秒 |
| 加生命 | ❤ | HP+1 | 永久 |
| 炸弹 | 💣 | 清屏(全灭敌方) | 即时 |
| 冻结 | ❄ | 敌方冻结5秒 | 5秒 |
| 基地加固 | 🏠 | 基地砖墙变钢墙10秒 | 10秒 |
| 空投(随机) | ❓ | 随机一个上述效果 | - |

### 7.2 道具掉落与刷新

```
掉落规则:
  - 击毁敌方坦克 15% 概率掉落
  - 击毁 Boss 100% 掉落
  - 关卡中固定时间点刷新道具（地图随机空位）
  - 无尽模式每30秒空投一个
```

---

## 八、渲染系统

### 8.1 校园霓虹视觉风格

```
配色方案 (Colors.js):
  背景:   #0a1628 (深蓝夜色)
  地面:   #1a2a3a (深灰蓝)
  砖墙:   #d4782a (暖橙砖色) + 发光描边
  钢墙:   #6090c0 (金属蓝) + 高光
  草丛:   #2a8a3a (草绿)
  水路:   #1a6aaa (水蓝) + 波纹动画
  基地:   #ffaa00 (暖金) + 脉冲发光
  
  玩家坦克: 视型号(蓝/橙/紫)
  敌方坦克: 视类型(灰/红/绿/黄)
  
  UI主色:  #00f0ff (霓虹青)
  强调色:  #ff00d4 (霓虹粉)
  警告色:  #ff3366 (红)
  文字色:  #ffffff
```

### 8.2 渲染层级（从底到顶）

```
1. 地面背景（深色 + 网格线 + 校园纹理）
2. 水路（波纹动画）
3. 墙壁底层（砖墙/钢墙，含"浩源""浪尖儿"字形）
4. 道具
5. 坦克（敌方 → 玩家）
6. 子弹
7. 粒子特效（爆炸/火花/拖尾）
8. 草丛（覆盖坦克，实现隐蔽效果）
9. 基地
10. UI叠加层（震屏/闪白/扫描线）
```

### 8.3 坦克绘制

```javascript
// 坦克由几何图形组合绘制，无图片资源
drawTank(ctx, tank):
  1. 履带（两侧矩形 + 横纹）
  2. 车身（圆角矩形 + 校园色 + 发光描边）
  3. 炮塔（中心圆形 + 旋转）
  4. 炮管（矩形，随方向旋转）
  5. 装饰（型号标识/表情/编号）
  6. 特效层（护盾光环/蓄力光圈/受击闪烁）
```

### 8.4 "浩源""浪尖儿"字样绘制

```javascript
// 砖墙拼字：绘制砖墙时，如果该格子属于字形区域，
// 用砖墙颜色 + 轻微高亮描边绘制，让字样清晰可读
function drawWall(ctx, cell):
  baseColor = Colors.WALL.BRICK
  if cell.isTextChar:
    baseColor = lighten(baseColor, 0.15)  // 略亮
    ctx.shadowBlur = 4                     // 轻微发光
  // 绘制砖墙纹理...
```

### 8.5 视觉特效

| 特效 | 实现 |
|------|------|
| 爆炸 | 粒子放射 + 冲击波环 + 屏幕震动 |
| 子弹拖尾 | 渐变线段 |
| 蓄力光圈 | 旋转圆环 + 粒子吸入 |
| 护盾 | 半透明球 + 旋转六边形 |
| 基地受伤 | 红色脉冲 + 警告闪烁 |
| 击杀文字 | DOM浮动文字 "+100" |
| 关卡过渡 | 黑幕 + 关卡名淡入 |
| 胜利烟花 | 多点粒子爆发 |

---

## 九、UI系统

### 9.1 HUD布局

```
┌─────────────────────────────────────────┐
│ SCORE: 01200    LV 1    HP:♥♥♥   ENEMY:6│  ← 顶部HUD
├─────────────────────────────────────────┤
│                                         │
│              游戏画面区域                 │
│           (832×832 Canvas)               │
│                                         │
├─────────────────────────────────────────┤
│  ████████████░░░░  WAVE 1/3             │  ← 底部进度
└─────────────────────────────────────────┘
```

### 9.2 菜单系统

```
主菜单:
  ┌───────────────────────┐
  │   LYD的坦克大战        │
  │   TANK BATTLE         │
  │                       │
  │   ▶ 开始战役           │
  │   🎮 无尽生存           │
  │   🏆 排行榜            │
  │   ⚙ 设置              │
  │                       │
  │   Best: 12800         │
  └───────────────────────┘

坦克选择(机库):
  ┌──────────────────────────────┐
  │  🛡 坦克选择                   │
  │  ┌─────┐ ┌─────┐ ┌─────┐    │
  │  │学霸号│ │体育生│ │文艺委│    │
  │  │ 蓝色 │ │ 橙色 │ │ 紫色 │    │
  │  │蓄力炮│ │冲刺  │ │护盾  │    │
  │  └─────┘ └─────┘ └─────┘    │
  │  ◀ 返回                      │
  └──────────────────────────────┘

结算界面:
  ┌───────────────────────┐
  │   ✦ 胜利 / 失败 ✦      │
  │   评级: S              │
  │   得分: 12800          │
  │   击杀: 18             │
  │   用时: 02:35          │
  │   奖励: +500           │
  │                       │
  │   ▶ 下一关  🔄 重玩  🏠│
  └───────────────────────┘
```

---

## 十、关卡与波次系统

### 10.1 战役模式

```
共 5 关:
  Level 1: 校园·操场 (教学关，简单)
  Level 2: 校园·教学楼 (中等，引入草丛/水路)
  Level 3: 校园·体育馆 (困难，引入狙击手)
  Level 4: 校园·图书馆 (困难，Boss战)
  Level 5: 校园·天台 (最终关，终极Boss)

每关结构:
  - 3 波敌人 (最后一波含Boss)
  - 波间有2秒间隔
  - 全灭敌人且基地存活 → 胜利
  - 基地被毁 或 玩家生命耗尽 → 失败
```

### 10.2 无尽生存模式

```
规则:
  - 无限波次，难度递增
  - 每5波出现一个Mini-Boss
  - 玩家3条命，耗尽结束
  - 每波击杀奖励金币(用于持久升级)
  - 地图随波次变化(随机生成)
```

---

## 十一、音效系统

### 11.1 Web Audio API 程序化合成

全部音效用 Web Audio API 实时合成，**无需音频文件**：

```
音效列表:
  sfxShoot      — 射击（方波 短促 "biu"）
  sfxHit        — 命中（噪声脉冲）
  sfxExplosion  — 爆炸（低频锯齿 + 噪声）
  sfxBrickBreak — 砖墙破碎（短噪声）
  sfxPowerup    — 拾取道具（上升音阶）
  sfxPlayerHit  — 玩家受伤（下降音）
  sfxBaseAlert  — 基地警报（双音交替）
  sfxLevelStart — 关卡开始（号角）
  sfxVictory    — 胜利（欢快旋律）
  sfxDefeat     — 失败（低沉下降）
  sfxButton     — UI按钮（短"嘀"）

BGM:
  menu    — 轻快电子旋律 (校园风)
  stage1  — 中速节奏
  boss    — 紧张快节奏
  victory — 凯旋旋律
```

---

## 十二、存档系统

```javascript
// Storage.js — localStorage
存档结构:
{
  bestScore: 0,           // 最高分
  gold: 0,                // 金币(用于升级)
  selectedTank: 'scholar',// 当前选中坦克
  clearedLevels: [],      // 通关记录
  ranking: [],            // 排行榜 top10
  totalKills: 0,          // 累计击杀
  settings: { sfx: 1, bgm: 1 },
}
```

---

## 十三、操作说明

### 13.1 PC操作

```
移动:   WASD 或 方向键
射击:   空格 或 J
技能:   K 或 Shift
暂停:   ESC 或 P
```

### 13.2 移动端操作

```
虚拟摇杆: 左下角（方向控制）
射击按钮: 右下角
技能按钮: 射击按钮上方
```

---

## 十四、开发里程碑

| 阶段 | 内容 | 产出 |
|------|------|------|
| M1 | 核心框架 | Game主循环 + 状态机 + Canvas渲染 + 输入 |
| M2 | 地图系统 | 格子地图 + 墙壁绘制 + "浩源""浪尖儿"字样 + 碰撞查询 |
| M3 | 坦克系统 | 玩家坦克移动/射击 + 3种坦克 + 蓄力/冲刺/护盾技能 |
| M4 | 敌方AI | 5种敌方坦克 + 行为树AI + 刷新系统 |
| M5 | 碰撞/战斗 | 全碰撞检测 + 子弹/砖墙/坦克/基地交互 |
| M6 | 道具/UI | 8种道具 + HUD + 菜单 + 结算 |
| M7 | 关卡/音效 | 5关战役 + 无尽模式 + 程序化音效 |
| M8 | 打磨优化 | 特效/性能/平衡性/移动端适配 |

---

## 十五、配色方案速查（供Builder直接复制）

```javascript
// Colors.js
export const Colors = {
  BG_DARK:    '#0a1628',
  BG_GROUND:  '#1a2a3a',
  GRID_LINE:  'rgba(0, 240, 255, 0.08)',

  WALL: {
    BRICK:     '#d4782a',    // 砖墙暖橙
    BRICK_DARK:'#a05a1a',
    BRICK_GLOW:'#ff9a3a',
    STEEL:     '#6090c0',    // 钢墙金属蓝
    STEEL_DARK:'#3a6090',
    STEEL_GLOW:'#80b0e0',
  },
  TERRAIN: {
    GRASS:     '#2a8a3a',
    GRASS_DARK:'#1a6a2a',
    WATER:     '#1a6aaa',
    WATER_DARK:'#0a4a8a',
    ICE:       '#88ccff',
  },
  BASE:       '#ffaa00',
  BASE_GLOW:  '#ffdd44',

  PLAYER: {
    SCHOLAR:  '#00aaff',    // 学霸·蓝
    ATHLETE:  '#ff8800',    // 体育生·橙
    ARTIST:   '#aa00ff',    // 文艺委员·紫
  },
  ENEMY: {
    SCOUT:    '#888888',    // 新生·灰
    STRIKER:  '#ff4444',    // 突击兵·红
    HEAVY:    '#446644',    // 重装·深绿
    SNIPER:   '#ffdd00',    // 狙击手·黄
    BOSS:     '#ff00ff',    // Boss·品红
  },

  NEON_CYAN:   '#00f0ff',
  NEON_PINK:   '#ff00d4',
  NEON_YELLOW: '#fff200',
  NEON_GREEN:  '#00ff88',
  NEON_RED:    '#ff3366',
  NEON_PURPLE: '#a200ff',
  WHITE:       '#ffffff',

  BULLET: {
    PLAYER:      '#eaffff',
    PLAYER_GLOW: '#00f0ff',
    ENEMY:       '#ff8844',
    ENEMY_GLOW:  '#ff4400',
  },
  FX: {
    EXPLOSION_IN:  '#fff200',
    EXPLOSION_MID: '#ff8800',
    EXPLOSION_OUT: '#ff3366',
    SHOCKWAVE:     'rgba(0, 240, 255, 0.5)',
    SPARK:         '#ffdd00',
  },
};
```

---

## 十六、关键算法伪代码

### 16.1 主循环

```
loop(timestamp):
  dt = min(50, timestamp - lastTime)
  lastTime = timestamp
  
  input.beginFrame(dt)
  
  switch(state):
    case MENU:    drawMenuBackground(dt)
    case PLAYING: update(dt); draw(dt)
    case PAUSED:  drawPauseOverlay()
    case RESULT:  // 结算界面由DOM处理
  
  input.endFrame()
  requestAnimationFrame(loop)

update(dt):
  spawnSystem.update(dt)        // 刷新敌人
  aiSystem.update(dt, enemies)  // AI决策
  for tank in allTanks: tank.update(dt)
  for bullet in allBullets: bullet.update(dt)
  for powerup in powerups: powerup.update(dt)
  for particle in particles: particle.update(dt)
  collisionSystem.process()     // 全碰撞检测
  checkWinLose()                // 胜负判定
  cleanupDeadEntities()         // 清理+对象池回收
  ui.update()
```

### 16.2 胜负判定

```
checkWinLose():
  // 失败条件
  if base.hp <= 0:
    finishRun(false)  // 基地被毁
  if player.lives <= 0 and player.hp <= 0:
    finishRun(false)  // 生命耗尽
  
  // 胜利条件(仅战役模式)
  if mode == 'campaign':
    if spawnSystem.allWavesDone and enemies.length == 0:
      finishRun(true)  // 全灭敌军
```

### 16.3 坦克格子对齐移动

```
tank.update(dt):
  // 输入确定目标方向
  desiredDir = input.getDirection()
  
  // 格子对齐：如果转弯，先吸附到当前格子中线
  if desiredDir != currentDir and isNearGridCenter(tank):
    snapToGridCenter(tank)
    currentDir = desiredDir
  
  // 计算目标位置
  nextX = x + dirVec.x * speed * dt
  nextY = y + dirVec.y * speed * dt
  
  // 碰撞检测
  if canMoveTo(nextX, nextY):
    x = nextX; y = nextY
  else:
    // 撞墙时吸附到格子边界
    snapToGridEdge(tank, currentDir)
  
  // 射击
  if input.firePressed and fireCD <= 0:
    fire()
```

---

> **文档结束** — 请在此基础上优化调整，确认后交给 Builder 生成代码。
