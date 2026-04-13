# 🚩 Font Awesome 使用指南

本文档介绍如何在项目中启用并使用 Font Awesome (FA) 型标。

## 1. 启用 Font Awesome

按 `Ctrl + F9` 进入编辑模式，找到 **Font Awesome** 配置项：

- **状态**: 设为 `启用`
- **类型**: 
  - `online` (在线加载，推荐)
  - `local` (本地加载，需手动下载文件)
- **URL**: 
  - **重要**: 本项目目前使用的是 **CSS (Web Fonts)** 加载方式，因此必须填写 `.css` 结尾的链接。
  - **推荐链接 (jsDelivr)**: 
    `https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@7.2.0/css/all.min.css`

> [!TIP]
> 为什么不能填 `.js` 链接？
> 官方提供的 JS 链接使用的是 SVG 模式，而本项目底层逻辑是通过 CSS 类名渲染的。使用 CSS 模式性能更好，且能完美配合现有的图标识别系统。

## 2. 如何使用图标

在配置链接的 `icon` 字段时，直接填写 Font Awesome 提供的 **Class 类名** 即可。

### 示例

如果你在 FA 官网看到如下代码：
```html
<i class="fa-solid fa-alarm-clock"></i>
```

在 `momo-nav.json` 中，你只需要填写：
```json
{
  "name": "闹钟工具",
  "icon": "fa-solid fa-alarm-clock"
}
```

### 识别原理
当系统检测到 `icon` 字段的值**包含空格**时，会判断其为类名图标（如 FA），并自动渲染为：
`<i class="fa-solid fa-alarm-clock" aria-hidden="true"></i>`

## 3. 常见问题

### Q: 为什么我填了 URL 后图标还是显示不出来？
1. 检查 URL 是否以 `.css` 结尾。如果是 `.js` 结尾，改为 CSS 链接。
2. 确保网络能访问该 CDN 地址。
3. 检查类名是否拼写正确（必须包含前缀，如 `fa-solid` 或 `fa-brands`）。

### Q: 如何修改图标颜色？
Font Awesome 本质是字体。你可以在 `theme.textColor` 中统一设置，或者在自定义 CSS 中通过类名（如 `.fa-solid`）来修改颜色、大小等。

### Q: 本地加载如何操作？
1. **下载完整包**: 必须从官网下载包含 `webfonts` 文件夹的完整包。只下载一个 `all.min.css` 文件是不够的，会导致图标显示为乱码方块。
2. **正确的文件结构**:
   由于 CSS 内部使用相对路径寻找字体，你的文件夹结构**必须**如下所示：
   ```text
   项目根目录/
   └── fontawesome/          <-- 你在 URL 填写的文件夹名
       ├── css/
       │   └── all.min.css    <-- 系统会自动寻找这个文件
       └── webfonts/          <-- 必须保持此名称，且与 css 文件夹同级
           ├── fa-brands-400.woff2
           ├── fa-solid-900.woff2
           └── ... (其他字体文件)
   ```
3. **填写 URL**:
   - 如果你按上述结构摆放，URL 填 `fontawesome` 即可（系统会自动补齐路径）。
   - 如果你想放在其他地方，请确保 `css/` 和 `webfonts/` 的相对层级关系不变。
