# 📝 完整配置说明

这里详细介绍了 `momo-nav.json` 的所有配置项及其用法。

## 基础配置

```json
{
  "siteName": "默默导航",
  "footerName": "默默导航",
  "siteDescription": "便捷的网址导航收藏夹",
  "siteKeywords": "导航,书签,收藏夹",
  "favicon": "https://api.iconify.design/mdi:compass.svg",
  "webAppIcons": {
    "appleTouchIcon": "mn-src/momonav-icon-180px.png",
    "icon192": "mn-src/momonav-icon-192px.png",
    "icon512": "mn-src/momonav-icon-512px.png"
  },
  "theme": {
    "primaryColor": "#4a90d9"
  },
  "navLinks": [
    {
      "name": "官方网站",
      "url": "https://...",
      "target": "_blank",
      "children": [
        { "name": "子菜单1", "url": "..." }
      ]
    }
  ],
  "categories": [...]
}
```

| 字段 | 说明 | 示例 |
|------|------|------|
| `siteName` | 网站名称（显示在标题、Logo） | `"默默导航"` |
| `footerName` | 页脚显示的名称（可选，默认用 siteName） | `"默默导航"` |
| `siteDescription` | 网站描述（SEO用） | `"便捷的网址导航"` |
| `siteKeywords` | 额外关键词（SEO用，与分类名自动合并去重） | `"导航,书签"` |
| `favicon` | 浏览器标签页图标（非主屏图标） | `"https://.../icon.svg"` |
| `webAppIcons` | 主屏图标配置（iOS/Android/PWA） | `{"icon192":"...png","icon512":"...png"}` |
| `theme` | 主题颜色配置（可选） | `{"primaryColor":"#4a90d9"}` |
| `navLinks` | 顶部导航菜单配置 | 见下方详细说明 |
| `password` | 管理员密码（用于保护编辑模式） | `"12345678"` |

## 顶部导航菜单 (navLinks)

支持一级链接和二级下拉菜单：

| 字段 | 说明 | 默认值 |
|------|------|--------|
| `name` | 菜单显示的名称 | - |
| `url` | 链接地址（作为父菜单时可为空） | `#` |
| `target` | 打开方式 (`_self`, `_blank`) | `_self` |
| `children` | 子菜单列表（结构同上，仅支持二级） | - |

```json
"navLinks": [
  {
    "name": "莫莫项目",
    "children": [
      { "name": "代码仓库", "url": "https://github.com/hcllmsx/momo-nav" },
      { "name": "演示站点", "url": "https://nav.ihcll.cn" }
    ]
  }
]
```

## Logo 配置

Logo 支持灵活配置，通过 `img`、`text`、`height` 三个可选字段组合：

### 示例配置

```json
{
  "logo": {
    "img": "mn-src/momonav-text.svg",
    "text": "默默导航",
    "height": 32
  }
}
```

| 字段 | 说明 | 默认值 |
|------|------|--------|
| `img` | Logo 图片路径（相对路径或完整 URL） | - |
| `text` | Logo 文字（显示在图片右侧） | - |
| `height` | Logo 高度（单位 px） | `24` |

### 配置组合说明

| 配置方式 | 效果 |
|----------|------|
| 只配置 `img` | 只显示图片，不显示文字 |
| 配置 `img` + `text` | 图片 + 右侧文字 |
| 只配置 `text` | 只显示文字（无图片） |
| 不配置 logo 字段 | 默认显示 ❤️ + `siteName` |

## 顶部封面配置（视频/图片）

可设置顶部视频或图片作为页面封面背景，向下会渐变羽化到背景纹理：

```json
{
  "cover": {
    "video": "mn-src/cover.webm",
    "poster": "mn-src/cover.webp"
  }
}
```

| 字段 | 说明 |
|------|------|
| `video` | 视频路径（支持 mp4/webm/ogg） |
| `image` | 图片路径（支持 webp/jpg/png/svg，可单独使用，也可作为占位图） |
| `poster` | 视频封面图（优先于 image 作为占位图） |

> 视频会自动静音循环播放。不配置则无封面背景。

### cover 渲染与加载顺序

| 配置方式 | 实际显示逻辑 |
|------|------|
| 只配 `poster` | 顶部封面显示这张图片 |
| 只配 `image` | 顶部封面显示这张图片 |
| 只配 `video` | 视频加载完成前先显示 `background.texture`，视频可播放后淡入显示 |
| 配 `video + poster` | 先显示 `poster`，视频加载完成后丝滑切换到视频 |
| 配 `video + image`（无 poster） | 先显示 `image`，视频加载完成后丝滑切换到视频 |

### 封面显示特性

- 封面只在页面顶部区域显示，不是全屏铺满。
- 向下会有渐隐羽化，逐步过渡到 `background` 的纹理和底色。
- 页面滚动时，顶部封面会跟随页面一起滑出视口，不会固定在页面上。

## 背景纹理配置

可设置背景纹理图片（支持无缝循环的纹理图）：

```json
{
  "background": {
    "texture": "mn-src/grid-me.png",
    "opacity": 0.3
  }
}
```

| 字段 | 说明 | 默认值 |
|------|------|--------|
| `texture` | 纹理图片路径（相对路径或完整 URL） | - |
| `opacity` | 纹理透明度（0-1，值越小越淡） | `1`（不透明） |
| `textureColor` | 纹理图案颜色（仅 SVG 有效） | 原原始颜色 |

### 页面层次（从底到顶）

```
┌──────────────────────────┐
│  1. theme.bgColor 色块    │ ← body 背景色
│  2. background.texture    │ ← 纹理层（可调透明度）
│  3. cover 视频/图片       │ ← 顶部区域，向下渐隐
│  4. 渐变遮罩             │ ← 自动生成，提升可读性
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ │ ← 页面内容（Logo/搜索等）
└──────────────────────────┘
```

## 主题配置（theme）

推荐直接在 `momo-nav.json` 中配置主题：

```json
{
  "theme": {
    "primaryColor": "#3fb2ff",
    "primaryHover": "#2d6fd3",
    "bgColor": "#f6f8fc",
    "cardBg": "#ffffff",
    "textColor": "#2f3440",
    "textMuted": "#6f7785",
    "borderColor": "#dce3ee"
  }
}
```

| 字段 | 说明 |
|------|------|
| `primaryColor` / `primary` | 主色（按钮、高亮、标签等） |
| `primaryHover` | 主色悬停/聚焦态，不填会自动生成更深一档 |
| `bgColor` | 页面背景色（CSS `--bg-color`） |
| `cardBg` | 卡片背景色（CSS `--card-bg`） |
| `textColor` | 主文字颜色 |
| `textMuted` | 次级文字颜色 |
| `borderColor` | 边框颜色 |

> 页面底层背景色统一由 `theme.bgColor` 控制，`background` 仅负责纹理层。

## 密码保护 (password)

你可以为导航站设置一个管理密码，用于保护“可视化编辑模式”和“配置文件导出”功能。

> [!IMPORTANT]
> **配置方式：** 为了安全性，密码**只能**通过手动修改 JSON 配置文件（`momo-nav.json` 或 `example.json`）来设置，可视化面板中不提供修改入口。

```json
{
  "password": "your-secret-password"
}
```

| 字段 | 说明 | 校验规则 |
|------|------|----------|
| `password` | 管理员密码 | 需为 6-16 位字符。若不符合规则或未配置，则不启用保护。 |

### 保护场景
- **进入编辑模式**：在启用状态下按下 `Ctrl + F9` 进入编辑模式前需要验证。
- **导出配置文件**：在编辑面板点击“导出配置”时需要验证。

### 特性说明
- **缓存验证**：一旦在当前浏览器成功验证过密码，系统会将其加密缓存（浏览器本地存储）。只要密码未在 JSON 中更改且未清除浏览器数据，后续操作无需重复输入。
- **数据保留**：执行“导出配置”时，系统会自动保留并写回你手动设置的 `password` 字段。
- **安全建议**：建议设置 8 位以上的强密码。如果想取消密码保护，只需从 JSON 中删除该字段或将其值设为空即可。

## 移动端主屏图标与 Manifest

移动端“添加到主屏幕”主要读取的是 `apple-touch-icon` / `site.webmanifest`，不是普通 `favicon`。

推荐在 `momo-nav.json` 中配置：

```json
{
  "webAppIcons": {
    "appleTouchIcon": "mn-src/momonav-icon-180px.png",
    "icon192": "mn-src/momonav-icon-192px.png",
    "icon512": "mn-src/momonav-icon-512px.png"
  }
}
```

| 字段 | 用途 | 建议尺寸 |
|------|------|----------|
| `webAppIcons.appleTouchIcon` | iOS 主屏图标 | `180x180` |
| `webAppIcons.icon192` | Android/PWA 图标 | `192x192` |
| `webAppIcons.icon512` | PWA 高分辨率图标 | `512x512` |

补充说明：
- 图标推荐使用不透明背景 PNG（兼容性与观感更稳）。
- 如果 `webAppIcons` 未配置，程序会尝试用位图 `favicon` 兜底。
- 根目录的 `site.webmanifest` 可通过编辑模式一键导出。
- `site.webmanifest` 中：
  - `background_color` 默认取 `theme.bgColor`
  - `theme_color` 默认取 `theme.primaryColor`（兼容 `theme.primary`）

## 搜索引擎配置

默认支持 Bing、Google、百度、DuckDuckGo，以及本地过滤。用户选择的搜索引擎会自动记住。

如需调整顺序或修改默认，编辑 `index.html` 中的搜索选项卡。

### 添加更多搜索引擎

编辑 `index.html`，在 `.search-tabs` 中添加：
```html
<button class="tab-btn" data-engine="yahoo" data-url="https://search.yahoo.com/search?p=">Yahoo</button>
```

### 方式三：图标识别优先级

系统按以下顺序自动识别 `icon` 字段的内容：

1.  **图片 URL**: 以 `http/https` 或 `/` 开头，或者以 `.png`, `.jpg`, `.svg` 等图片格式结尾。
2.  **Iconfont Symbol**: 匹配 `iconfont.prefix` 配置的前缀（默认为 `icon-`）。支持 `imn-xxx` 或 `#imn-xxx` 格式。
3.  **Font Awesome**: 包含空格（如 `fa-solid fa-star`）。
4.  **Emoji / 纯文本**: 以上皆不匹配时。
    - **长度建议**: 系统会自动通过 `Array.from` 安全处理，最多显示前 **2个** 字符（如一个 Emoji 或两个英文字母/数字）。
    - **动态字号**: 1个字符（或1个Emoji）时显示特大号；2个字符时字号自动缩小以适配圆角矩形。

## Iconfont 配置

支持阿里图标库（Iconfont）的 Symbol 引用方式（彩色图标）。

```json
{
  "iconfont": {
    "type": "online",
    "url": "//at.alicdn.com/t/c/font_xxxxxx.js",
    "prefix": "imn-"
  }
}
```

| 字段 | 说明 | 默认值 |
|------|------|--------|
| `type` | 加载方式 (`online` 或 `local`) | `local` |
| `url` | 在线 JS 地址或本地文件夹名 | - |
| `prefix` | 图标前缀，用于精确识别 iconfont（防止与文字图标冲突） | `icon-` |

> **注意：** 设置 `prefix` 后，只有以前缀开头的图标才会被视为 iconfont 图标。例如设置 `"prefix": "imn-"`，则 `imn-google` 会被识别为图标，而 `google` 会被识别为纯文本图标。

## 网站链接配置

```json
{
  "categories": [
    {
      "name": "常用工具",
      "items": [
        {
          "name": "GitHub",
          "url": "https://github.com",
          "title": "代码托管平台",
          "keywords": ["代码", "仓库", "git"],
          "icon": "https://api.iconify.design/mdi:github.svg"
        }
      ]
    }
  ]
}
```
本地搜索默认会匹配 `name`、`title`、`url`，现在也支持每个链接单独配置 `keywords`。

`keywords` 支持两种写法：
- 字符串：`"keywords": "代码,仓库,git"`
- 数组：`"keywords": ["代码", "仓库", "git"]`

### 图标设置方式

| 方式 | 示例 | 说明 |
|------|------|------|
| **Iconify** | `"https://api.iconify.design/mdi:github.svg"` | 15万+图标 |
| **Iconfont Symbol** | `"imn-google"` | 彩色图标，需匹配 `prefix` |
| **Emoji** | `"🙂"` | 直接填写表情，自动居中显示 |
| **纯文本** | `"Ab"` | 支持 1-2 个字符，自动转换展示 |
| **自定义图片** | `"icons/my-icon.png"` | 本地图片路径 |
| **网站 Favicon** | `"https://example.com/favicon.ico"` | 直接引用 URL |

**Iconify 图标查找**：访问 [icon-sets.iconify.design](https://icon-sets.iconify.design/)
- 品牌图标在 **Simple Icons** 里（如 Apple、QQ、微信等）
- 格式：`https://api.iconify.design/{前缀}:{图标名}.svg`

