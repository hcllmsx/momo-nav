# ❤️ 默默导航 (Momo Nav)

一个简洁、美观的静态导航网站，通过 JSON 文件管理链接，轻松添加和分类你的常用网站。

## ✨ 特性

- 📝 **可视化配置** - 按Ctrl+F9显示编辑模式按钮
- 📁 **分类管理** - 支持多分类组织链接
- 🔍 **实时搜索** - 支持多搜索引擎和本地过滤
- 🎨 **响应式设计** - 适配桌面和移动设备
- ⚡ **纯静态** - 无需后端，直接部署
- 🖼️ **多种图标支持** - 支持 Iconify、Iconfont、自定义图片
- 📱 **主屏图标支持** - 支持 iOS/Android 添加到主屏幕图标配置

## 🚀 快速开始

1. **编辑链接**：打开 `momo-nav.json` 文件，按格式添加你的网站

2. **本地预览**：需要用本地服务器运行（直接双击打开会因浏览器安全限制无法加载数据）

   **方式一：使用 VS Code Live Server 插件（推荐）**
   - 安装 Live Server 插件
   - 右键点击 `index.html` → "Open with Live Server"

   **方式二：使用 Python**
   ```bash
   # Python 3
   python -m http.server 8080
   
   # 然后访问 http://localhost:8080
   ```

   **方式三：使用 Node.js**
   ```bash
   npx serve
   ```

3. **部署**：将整个文件夹上传到任意静态托管服务（GitHub Pages、Vercel、Netlify 等）

## 支持可视化编辑

在导航页面按Ctrl+F9即可显示进入编辑模式的按钮（位置在左上角logo右边），点击即可开始可视化编辑相关信息。

编辑好了之后导出`momo-nav.json`配置，替换掉原来的即可。不替换的话只是临时保存哦！

编辑模式底部还支持一键导出 `site.webmanifest`（用于移动端“添加到主屏幕”图标与主题色）。

## 📝 完整配置说明

### 基础配置

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

### Logo 配置

Logo 支持灵活配置，通过 `img`、`text`、`height` 三个可选字段组合：

#### 示例配置

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

#### 配置组合说明

| 配置方式 | 效果 |
|----------|------|
| 只配置 `img` | 只显示图片，不显示文字 |
| 配置 `img` + `text` | 图片 + 右侧文字 |
| 只配置 `text` | 只显示文字（无图片） |
| 不配置 logo 字段 | 默认显示 ❤️ + `siteName` |

### 顶部封面配置（视频/图片）

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

#### cover 渲染与加载顺序

| 配置方式 | 实际显示逻辑 |
|------|------|
| 只配 `poster` | 顶部封面显示这张图片 |
| 只配 `image` | 顶部封面显示这张图片 |
| 只配 `video` | 视频加载完成前先显示 `background.texture`，视频可播放后淡入显示 |
| 配 `video + poster` | 先显示 `poster`，视频加载完成后丝滑切换到视频 |
| 配 `video + image`（无 poster） | 先显示 `image`，视频加载完成后丝滑切换到视频 |

#### 封面显示特性

- 封面只在页面顶部区域显示，不是全屏铺满。
- 向下会有渐隐羽化，逐步过渡到 `background` 的纹理和底色。
- 页面滚动时，顶部封面会跟随页面一起滑出视口，不会固定在页面上。

### 背景纹理配置

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

#### 页面层次（从底到顶）

```
┌──────────────────────────┐
│  1. theme.bgColor 色块    │ ← body 背景色
│  2. background.texture    │ ← 纹理层（可调透明度）
│  3. cover 视频/图片       │ ← 顶部区域，向下渐隐
│  4. 渐变遮罩             │ ← 自动生成，提升可读性
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ │ ← 页面内容（Logo/搜索等）
└──────────────────────────┘
```

### 主题配置（theme）

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

### 移动端主屏图标与 Manifest

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

### 搜索引擎配置

默认支持 Bing、Google、百度、DuckDuckGo，以及本地过滤。用户选择的搜索引擎会自动记住。

如需调整顺序或修改默认，编辑 `index.html` 中的搜索选项卡。

#### 添加更多搜索引擎

编辑 `index.html`，在 `.search-tabs` 中添加：
```html
<button class="tab-btn" data-engine="yahoo" data-url="https://search.yahoo.com/search?p=">Yahoo</button>
```

### Iconfont 配置

#### 在线方式（推荐）

```json
{
  "iconfont": {
    "type": "online",
    "url": "//at.alicdn.com/t/c/font_xxxxxx.js"
  }
}
```

#### 本地方式

```json
{
  "iconfont": {
    "type": "local",
    "url": "font_xxxxxx_xxxxxxxx"
  }
}
```

使用 iconfont 图标时，直接填写图标名（从 iconfont 网站复制）：
```json
{
  "icon": "icon-google"
}
```

### 网站链接配置

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

#### 图标设置方式

| 方式 | 示例 | 说明 |
|------|------|------|
| **Iconify** | `"https://api.iconify.design/mdi:github.svg"` | 15万+图标 |
| **Iconfont Symbol** | `"icon-google"` | 彩色图标，需配置 iconfont |
| **自定义图片** | `"icons/my-icon.png"` | 本地图片 |
| **网站 Favicon** | `"https://example.com/favicon.ico"` | 直接引用 |

**Iconify 图标查找**：访问 [icon-sets.iconify.design](https://icon-sets.iconify.design/)
- 品牌图标在 **Simple Icons** 里（如 Apple、QQ、微信等）
- 格式：`https://api.iconify.design/{前缀}:{图标名}.svg`

## 📝 配置示例

见仓库根目录下 `example.json` 文件。

## vercel部署

一般正常部署即可，但想必你也是注意到了这个仓库的目录下有`vercel.json`文件，和`scripts/`文件夹，这个似乎不是正常静态网站部署所必须的。

那么，你如果想要玩点花活儿，可以参考：[Vercel构建时从 Vercel Blob 中拉取资源的实践](https://ihcll.cn/posts/use-vercel-blob-storage-for-build-time-assets/)，这里说明了这个是干啥的。

但只想安安静静的用一下导航，正常部署，大可不必理会，你甚至可以删掉这些文件。

## 📄 许可证

MIT License
