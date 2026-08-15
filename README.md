# LYD 个人站点

李弈德的个人简历 + 两个网页游戏作品的静态站点，零依赖、单文件夹可直接部署到任意静态托管平台。

## 站点结构

```
lyd-site/
├── index.html        # 个人简历（站点主页）
├── *.png             # 15 张 AI 技能认证证书图片
├── plane/            # LYD的飞机大战（弹幕射击）
├── tank/             # LYD的坦克大战（基地守卫）
├── 游戏升级说明.html  # 两个游戏的玩法与机制说明
└── README.md
```

## 部署方式（任选其一）

### 方式 A：Netlify Drop（最快，无需命令行）

1. 打开 <https://app.netlify.com/drop>（需注册/登录 Netlify 账号，免费）
2. 把整个 `lyd-site` 文件夹拖进页面
3. 部署完成后进入 Site settings → Change site name，把站点名改成 `lyd`
4. 访问地址：<https://lyd.netlify.app>

### 方式 B：Netlify CLI（命令行）

```bash
npm install -g netlify-cli
netlify login                 # 浏览器登录
netlify deploy --prod --dir lyd-site --site lyd
# 或首次部署：netlify deploy --prod --dir lyd-site 然后按提示命名站点为 lyd
```

### 方式 C：GitHub Pages

1. GitHub 新建仓库 `lyd`，把 `lyd-site` 内容推上去
2. 仓库 Settings → Pages → 选择分支部署
3. 访问地址：`https://<你的用户名>.github.io/lyd`（GitHub Pages 的地址由用户名决定，无法自定义为纯 `lyd`；若需要 `lyd.xxx.com` 需购买域名 + CNAME）

## 线上地址规划

| 页面 | 地址 |
|---|---|
| 个人简历（主页） | `https://lyd.netlify.app/` |
| 飞机大战 | `https://lyd.netlify.app/plane/` |
| 坦克大战 | `https://lyd.netlify.app/tank/` |

## 本地预览

直接用浏览器打开 `lyd-site/index.html` 即可；或在本目录运行 `python -m http.server 8080` 后访问 <http://localhost:8080>。

## 内容修改指南

- 简历个人信息：编辑 `index.html` 中 `<script>` 里的 `resume` 数据对象（姓名/电话/标签/高光/经历/项目/技能/证书/教育/爱好都在这里）
- 证书图片：替换根目录同名 PNG 即可（文件名需与 `resume.certificates` 中的 `img` 字段一致）
- 游戏内容：`plane/` 和 `tank/` 各自独立，改游戏本体不影响简历
- 站点名：Netlify 后台 Settings → Site details → Change site name
