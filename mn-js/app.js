// 默默导航 - 主逻辑脚本

// 应用程序版本号
const APP_VERSION = '2026.04.13.1554';

// 全局应用状态，避免过多全局变量
const appState = {
    navData: null,
    iconfontLoaded: false,
    hasIconfontConfig: false,
    iconfontPrefix: 'icon-',
};

// 暴露状态到全局，供自定义功能使用
window.appState = appState;

// 图标纠正工具函数
function correctIconValue(value) {
    if (!value) return value;
    let v = String(value).trim();

    // 1. 处理 Font Awesome HTML 标签 (如 <i class="fa fa-star"></i>)
    const faMatch = v.match(/class=["']([^"']+)["']/i);
    if (faMatch && (v.startsWith('<i') || v.startsWith('<span'))) {
        v = faMatch[1];
    }

    // 2. 处理 Windows 路径 \ 为 /
    v = v.replace(/\\/g, '/');

    // 3. 处理本地绝对路径 (增强版识别)
    const anchors = ['other-favicon/', 'mn-src/', 'mn-js/', 'mn-css/', 'tools/', 'assets/', 'icons/', 'img/', 'public/'];
    let anchorFound = false;
    for (const anchor of anchors) {
        const idx = v.toLowerCase().indexOf(anchor);
        if (idx !== -1) {
            v = v.substring(idx);
            anchorFound = true;
            break;
        }
    }

    // 兜底：如果是 Windows 绝对路径且没匹配到特征文件夹
    if (!anchorFound && /^[a-zA-Z]:\//.test(v)) {
        // 去掉盘符 (如 D:/)
        v = v.substring(3);
        // 尝试保留最后两级 (如 "my-project/icon.png")，这通常是 web 根目录下的结构
        const parts = v.split('/');
        if (parts.length > 2) {
            v = parts.slice(-2).join('/');
        }
    }

    // 4. 路径规范化：如果是路径样式且没加 /，则补齐
    if (!v.startsWith('http') && !v.startsWith('/') && !v.startsWith('./')) {
        if (v.includes('/') || /\.(png|jpg|jpeg|gif|svg|ico|webp|js)$/i.test(v)) {
            v = '/' + v;
        }
    }

    return v;
}

// 供面板使用的包装函数
function wrapInputWithFixBtn(input) {
    if (!input || input.parentElement.classList.contains('editor-field-wrapper')) return;

    const wrapper = document.createElement('div');
    wrapper.className = 'editor-field-wrapper';

    // 将 input 放入 wrapper
    input.parentNode.insertBefore(wrapper, input);
    wrapper.appendChild(input);

    const fixBtn = document.createElement('button');
    fixBtn.type = 'button';
    fixBtn.className = 'editor-field-fix-btn';
    fixBtn.textContent = '纠正';
    fixBtn.onclick = (e) => {
        e.preventDefault();
        const corrected = correctIconValue(input.value);
        if (corrected !== input.value) {
            input.value = corrected;
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
        }
    };
    wrapper.appendChild(fixBtn);
}

// 为 escapeHtml 创建一个全局复用元素
const escapeContainer = document.createElement('div');

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    // 设置页脚年份为当前年份
    const yearSpan = document.getElementById('footerYear');
    if (yearSpan) {
        yearSpan.textContent = new Date().getFullYear();
    }

    initPageScrollbarReveal();
    initResponsiveCategoryStickyFallback();
    loadData();
    setupSearch();
});

function initPageScrollbarReveal() {
    const root = document.documentElement;
    let hideTimer = null;

    const showScrollbar = () => {
        root.classList.add('show-page-scrollbar');

        if (hideTimer) {
            window.clearTimeout(hideTimer);
        }

        hideTimer = window.setTimeout(() => {
            root.classList.remove('show-page-scrollbar');
        }, 900);
    };

    window.addEventListener('scroll', showScrollbar, { passive: true });

    document.addEventListener('mousemove', event => {
        const nearRightEdge = window.innerWidth - event.clientX <= 48;
        if (nearRightEdge) {
            showScrollbar();
            return;
        }

        if (hideTimer) {
            window.clearTimeout(hideTimer);
        }

        hideTimer = window.setTimeout(() => {
            root.classList.remove('show-page-scrollbar');
        }, 180);
    });

    document.addEventListener('mouseleave', () => {
        root.classList.remove('show-page-scrollbar');
        if (hideTimer) {
            window.clearTimeout(hideTimer);
            hideTimer = null;
        }
    });
}

function initResponsiveCategoryStickyFallback() {
    const mediaQuery = window.matchMedia('(max-width: 768px)');
    const body = document.body;
    const container = document.querySelector('.container');
    const sidebar = document.getElementById('categorySidebar');

    if (!body || !container || !sidebar) return;

    let stickyStart = 0;
    let ticking = false;
    const mobileStickyTop = 0;
    const desktopStickyTop = 20;

    const clearFixedState = () => {
        body.classList.remove('mobile-sidebar-fixed', 'desktop-sidebar-fixed');
        body.style.removeProperty('--mobile-sidebar-height');
        body.style.removeProperty('--mobile-sidebar-left');
        body.style.removeProperty('--mobile-sidebar-width');
        body.style.removeProperty('--desktop-sidebar-left');
        body.style.removeProperty('--desktop-sidebar-top');
        body.style.removeProperty('--desktop-sidebar-width');
        body.style.removeProperty('--desktop-sidebar-gap');
    };

    const syncSidebarMetrics = () => {
        const containerRect = container.getBoundingClientRect();
        const containerStyles = window.getComputedStyle(container);
        const containerPaddingLeft = parseFloat(containerStyles.paddingLeft) || 0;
        const sidebarWidth = sidebar.offsetWidth;

        body.style.setProperty('--mobile-sidebar-left', (containerRect.left + 15) + 'px');
        body.style.setProperty('--mobile-sidebar-width', Math.max(containerRect.width - 30, 0) + 'px');
        body.style.setProperty('--mobile-sidebar-height', sidebar.offsetHeight + 'px');
        body.style.setProperty('--desktop-sidebar-left', (containerRect.left + containerPaddingLeft) + 'px');
        body.style.setProperty('--desktop-sidebar-top', desktopStickyTop + 'px');
        body.style.setProperty('--desktop-sidebar-width', sidebarWidth + 'px');
        body.style.setProperty('--desktop-sidebar-gap', '30px');
    };

    const updateStickyState = () => {
        syncSidebarMetrics();

        const stickyOffset = mediaQuery.matches ? mobileStickyTop : desktopStickyTop;

        if (window.scrollY >= Math.max(stickyStart - stickyOffset, 0)) {
            body.classList.add(mediaQuery.matches ? 'mobile-sidebar-fixed' : 'desktop-sidebar-fixed');
            body.classList.remove(mediaQuery.matches ? 'desktop-sidebar-fixed' : 'mobile-sidebar-fixed');
        } else {
            body.classList.remove('mobile-sidebar-fixed', 'desktop-sidebar-fixed');
        }
    };

    const recalcStickyStart = () => {
        clearFixedState();
        stickyStart = sidebar.getBoundingClientRect().top + window.scrollY;
        updateStickyState();
    };

    const requestUpdate = () => {
        if (ticking) return;
        ticking = true;
        window.requestAnimationFrame(() => {
            updateStickyState();
            ticking = false;
        });
    };

    window.addEventListener('scroll', requestUpdate, { passive: true });
    window.addEventListener('resize', recalcStickyStart);
    mediaQuery.addEventListener('change', recalcStickyStart);
    window.addEventListener('load', recalcStickyStart);

    recalcStickyStart();
    window.refreshCategorySidebarSticky = () => {
        recalcStickyStart();
        window.requestAnimationFrame(recalcStickyStart);
    };
}
// 加载导航数据
async function loadData() {
    const dataSources = ['momo-nav.json', 'example.json'];
    let loadedFrom = '';
    let lastError = null;

    try {
        for (const dataUrl of dataSources) {
            try {
                console.log('开始加载导航数据:', dataUrl);
                const response = await fetch(`${dataUrl}?t=${Date.now()}`, { cache: 'no-cache' });
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status} ${response.statusText}`);
                }

                const rawData = await response.json();
                console.log(`从 ${dataUrl} 获取到的原始数据:`, rawData);
                appState.navData = rawData;
                loadedFrom = dataUrl;
                break;
            } catch (error) {
                lastError = error;
                console.warn(`导航数据加载失败，尝试下一个数据源: ${dataUrl}`, error);
            }
        }

        if (!appState.navData) {
            throw lastError || new Error('未找到可用的导航数据文件');
        }

        console.log(`导航数据加载成功（来源: ${loadedFrom}），分类数:`, (appState.navData.categories || []).length);

        // 应用站点配置
        applySiteConfig(appState.navData);

        // 加载 Iconfont
        if (appState.navData.iconfont) {
            appState.hasIconfontConfig = true;
            appState.iconfontPrefix = trimToString(appState.navData.iconfont.prefix) || 'icon-';
            await loadIconfont(appState.navData.iconfont);
        }

        // 加载 Font Awesome
        if (appState.navData.fontawesome) {
            try {
                await loadFontawesome(appState.navData.fontawesome);
            } catch (error) {
                console.warn('Font Awesome 加载失败:', error);
            }
        }

        // 渲染顶部导航菜单
        console.log('检查 navLinks 数据:', appState.navData.navLinks);
        if (appState.navData.navLinks) {
            renderHeaderNav(appState.navData.navLinks);
        }

        renderNav(appState.navData);

        // 渲染完成后初始化下拉菜单和移动端交互
        initHeaderDropdown();
    } catch (error) {
        console.error('加载导航数据失败:', error);
        const container = document.getElementById('navContent');
        if (container) {
            container.innerHTML = `
            <div class="no-results">
                <div class="no-results-icon">⚠️</div>
                <p>加载数据失败，请检查 momo-nav.json 或 example.json 文件是否存在</p>
                <p>当前路径：${escapeHtml(window.location.href)}</p>
                <p style="font-size: 0.85rem; margin-top: 10px;">${escapeHtml(error.message)}</p>
                <p style="font-size: 0.75rem; color: #999; margin-top: 8px;">提示：请用 HTTP 服务打开页面（例如 Live Server 或 python -m http.server），不要直接使用 file:// 协议。</p>
            </div>
        `;
        }
    }
    console.log('默默导航 - github.com/hcllmsx/momo-nav');
}

function sanitizeThemeColor(value) {
    if (typeof value !== 'string') return '';

    const trimmed = value.trim();
    if (!trimmed) return '';

    if (window.CSS && typeof window.CSS.supports === 'function') {
        return window.CSS.supports('color', trimmed) ? trimmed : '';
    }

    const style = document.createElement('span').style;
    style.color = '';
    style.color = trimmed;
    return style.color ? trimmed : '';
}

function parseColorToRgb(colorValue) {
    const safeColor = sanitizeThemeColor(colorValue);
    if (!safeColor || !document.body) return null;

    const probe = document.createElement('span');
    probe.style.display = 'none';
    probe.style.color = safeColor;
    document.body.appendChild(probe);

    const computedColor = window.getComputedStyle(probe).color;
    probe.remove();

    const match = computedColor.match(/rgba?\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
    if (!match) return null;

    return [Number(match[1]), Number(match[2]), Number(match[3])];
}

function buildDarkerRgbColor(rgbValues, ratio = 0.16) {
    if (!Array.isArray(rgbValues) || rgbValues.length < 3) return '';

    const factor = Math.max(0, Math.min(1, ratio));
    const clamp = value => Math.max(0, Math.min(255, Math.round(value)));

    return `rgb(${clamp(rgbValues[0] * (1 - factor))}, ${clamp(rgbValues[1] * (1 - factor))}, ${clamp(rgbValues[2] * (1 - factor))})`;
}

function applyThemeConfig(themeConfig) {
    if (!themeConfig || typeof themeConfig !== 'object') return;

    const root = document.documentElement;
    const rootStyle = root.style;
    const currentVars = window.getComputedStyle(root);

    const fieldToVarMap = [
        ['bgColor', '--bg-color'],
        ['cardBg', '--card-bg'],
        ['textColor', '--text-color'],
        ['textMuted', '--text-muted'],
        ['borderColor', '--border-color']
    ];

    fieldToVarMap.forEach(([field, cssVar]) => {
        const colorValue = sanitizeThemeColor(themeConfig[field]);
        if (colorValue) {
            rootStyle.setProperty(cssVar, colorValue);
        }
    });

    const primaryColor = sanitizeThemeColor(themeConfig.primaryColor || themeConfig.primary);
    if (primaryColor) {
        rootStyle.setProperty('--primary-color', primaryColor);
    }

    const primaryHoverColor = sanitizeThemeColor(themeConfig.primaryHover);
    if (primaryHoverColor) {
        rootStyle.setProperty('--primary-hover', primaryHoverColor);
    }

    const effectivePrimaryColor = primaryColor || currentVars.getPropertyValue('--primary-color').trim();
    const primaryRgb = parseColorToRgb(effectivePrimaryColor);
    if (primaryRgb) {
        rootStyle.setProperty('--primary-rgb', `${primaryRgb[0]}, ${primaryRgb[1]}, ${primaryRgb[2]}`);
    }

    if (!primaryHoverColor && primaryColor && primaryRgb) {
        const autoHover = buildDarkerRgbColor(primaryRgb, 0.16);
        if (autoHover) {
            rootStyle.setProperty('--primary-hover', autoHover);
        }
    }

    const effectiveCardBgColor = sanitizeThemeColor(themeConfig.cardBg) || currentVars.getPropertyValue('--card-bg').trim();
    const cardBgRgb = parseColorToRgb(effectiveCardBgColor);
    if (cardBgRgb) {
        rootStyle.setProperty('--card-bg-rgb', `${cardBgRgb[0]}, ${cardBgRgb[1]}, ${cardBgRgb[2]}`);
    }
}

function isRasterIconFile(iconUrl) {
    return /\.(png|jpe?g|gif|webp|ico)(\?.*)?$/i.test(String(iconUrl || '').trim());
}

function normalizeWebAppIconsConfig(iconsConfig) {
    const safeConfig = iconsConfig && typeof iconsConfig === 'object' ? iconsConfig : {};
    return {
        appleTouchIcon: trimToString(safeConfig.appleTouchIcon),
        icon192: trimToString(safeConfig.icon192),
        icon512: trimToString(safeConfig.icon512),
    };
}

// 应用站点配置
async function applySiteConfig(data) {
    if (!data) return;

    // 从 JSON 中应用主题色
    if (data.theme) {
        applyThemeConfig(data.theme);
    }

    // 设置页面标题
    if (data.siteName) {
        document.title = data.siteName;
        const pageTitle = document.getElementById('pageTitle');
        if (pageTitle) pageTitle.textContent = data.siteName;

        // 设置页脚站点名（优先使用 footerName，否则用 siteName）
        const footerSiteName = document.getElementById('footerSiteName');
        if (footerSiteName) {
            footerSiteName.textContent = data.footerName || data.siteName || '默默导航';
        }

        // 设置页脚项目链接的版本提示
        const footerLink = document.querySelector('.footer a');
        if (footerLink) {
            footerLink.title = `版本: ${APP_VERSION}`;
        }
    }

    const favicon = document.getElementById('favicon');
    const favicon192 = document.getElementById('favicon192');
    const favicon512 = document.getElementById('favicon512');
    const appleTouchIcon = document.getElementById('appleTouchIcon');

    // 设置 Favicon（浏览器标签页）
    if (data.favicon) {
        if (favicon) favicon.href = data.favicon;
    }

    // 设置主屏图标（iOS/Android）
    const webAppIcons = normalizeWebAppIconsConfig(data.webAppIcons);
    const rasterFavicon = isRasterIconFile(data.favicon) ? trimToString(data.favicon) : '';
    const resolvedAppleTouchIcon = webAppIcons.appleTouchIcon || rasterFavicon;
    const resolvedIcon192 = webAppIcons.icon192 || rasterFavicon;
    const resolvedIcon512 = webAppIcons.icon512 || rasterFavicon;

    if (resolvedAppleTouchIcon && appleTouchIcon) appleTouchIcon.href = resolvedAppleTouchIcon;
    if (resolvedIcon192 && favicon192) favicon192.href = resolvedIcon192;
    if (resolvedIcon512 && favicon512) favicon512.href = resolvedIcon512;

    const themeColorMeta = document.getElementById('metaThemeColor');
    const themePrimaryColor = sanitizeThemeColor(
        data.theme && typeof data.theme === 'object'
            ? (data.theme.primaryColor || data.theme.primary)
            : ''
    );
    if (themeColorMeta && themePrimaryColor) {
        themeColorMeta.content = themePrimaryColor;
    }

    // 1. 设置顶部封面背景（视频/图片）- 独立于 background
    const bannerEl = document.getElementById('bannerBg');
    if (bannerEl) {
        bannerEl.innerHTML = '';
        bannerEl.classList.remove('is-video-ready', 'has-cover-poster');
    }
    document.body.classList.remove('has-cover-bg');

    if (data.cover && bannerEl) {
        const cover = data.cover;
        const videoSrc = typeof cover.video === 'string' ? cover.video.trim() : '';
        const imageSrc = typeof cover.image === 'string' ? cover.image.trim() : '';
        const posterSrc = typeof cover.poster === 'string' ? cover.poster.trim() : '';
        const previewSrc = posterSrc || imageSrc; // poster 优先，同时兼容 image 作为占位图

        const hasVideo = Boolean(videoSrc);
        const hasPreview = Boolean(previewSrc);
        const hasCoverSource = hasVideo || hasPreview;

        if (hasCoverSource) {
            document.body.classList.add('has-cover-bg');
        }

        if (hasPreview) {
            const posterImg = document.createElement('img');
            posterImg.className = 'banner-poster';
            posterImg.src = previewSrc;
            posterImg.alt = '封面背景';
            posterImg.loading = 'eager';
            posterImg.decoding = 'async';
            bannerEl.classList.add('has-cover-poster');
            bannerEl.appendChild(posterImg);
        }

        if (hasVideo) {
            const video = document.createElement('video');
            video.className = 'banner-video';
            video.autoplay = true;
            video.loop = true;
            video.muted = true;
            video.playsInline = true;
            video.preload = 'auto';
            if (posterSrc) {
                video.poster = posterSrc;
            }

            const source = document.createElement('source');
            source.src = videoSrc;
            const extMatch = videoSrc.match(/\.(webm|mp4|ogg)(\?.*)?$/i);
            if (extMatch && extMatch[1]) {
                source.type = `video/${extMatch[1].toLowerCase()}`;
            }
            video.appendChild(source);

            let switched = false;
            const switchToVideo = () => {
                if (switched) return;
                switched = true;
                bannerEl.classList.add('is-video-ready');

                const playPromise = video.play();
                if (playPromise && typeof playPromise.catch === 'function') {
                    playPromise.catch(error => {
                        console.warn('封面视频自动播放失败:', error);
                    });
                }
            };

            video.addEventListener('loadeddata', switchToVideo, { once: true });
            video.addEventListener('canplay', switchToVideo, { once: true });
            video.addEventListener('error', () => {
                bannerEl.classList.remove('is-video-ready');
            });

            bannerEl.appendChild(video);

            if (video.readyState >= 2) {
                switchToVideo();
            } else {
                video.load();
            }
        }

        if (hasCoverSource) {
            // 顶部柔化遮罩：下方保持透明，露出纹理背景
            const overlay = document.createElement('div');
            overlay.className = 'banner-overlay';
            bannerEl.appendChild(overlay);
        }
    }

    // 2. 设置背景纹理（底色统一由 theme.bgColor 控制）
    if (data.background) {
        const bg = data.background;

        // 3. 设置纹理图片（铺满页面底层）
        if (bg.texture) {
            const applyTextureBg = async () => {
                let textureUrl = escapeHtml(bg.texture);

                // 如果设置了纹理颜色，需要获取 SVG 并修改 fill
                if (bg.textureColor && bg.texture.endsWith('.svg')) {
                    try {
                        const response = await fetch(bg.texture);
                        const svgText = await response.text();
                        const modifiedSvg = svgText.replace(
                            /fill=['"][^'"]*['"]/g,
                            `fill='${bg.textureColor}'`
                        );
                        const blob = new Blob([modifiedSvg], { type: 'image/svg+xml' });
                        textureUrl = URL.createObjectURL(blob);
                    } catch (e) {
                        console.warn('修改 SVG 纹理颜色失败:', e);
                    }
                }

                document.body.dataset.hasBgTexture = 'true';

                // 创建或更新样式元素
                let bgStyle = document.getElementById('dynamic-bg-style');
                if (!bgStyle) {
                    bgStyle = document.createElement('style');
                    bgStyle.id = 'dynamic-bg-style';
                    document.head.appendChild(bgStyle);
                }

                const opacity = (bg.opacity !== undefined) ? bg.opacity : 1;
                bgStyle.textContent = `
                    body[data-has-bg-texture]::before {
                        content: '';
                        position: fixed;
                        top: 0;
                        left: 0;
                        width: 100%;
                        height: 100%;
                        background-image: url('${textureUrl}');
                        background-repeat: repeat;
                        background-size: auto;
                        pointer-events: none;
                        z-index: 0;
                        opacity: ${opacity};
                    }
                `;
            };

            await applyTextureBg();
        }
    }

    // 设置 Logo
    const logoIcon = document.getElementById('logoIcon');
    const logoText = document.getElementById('logoText');

    if (data.logo && (data.logo.img || data.logo.text)) {
        // 新配置格式：logo.img + logo.text + logo.height
        const logoHeight = data.logo.height || 24;

        if (data.logo.img) {
            // 显示图片
            if (logoIcon) {
                logoIcon.innerHTML = `<img src="${escapeHtml(data.logo.img)}" alt="logo" style="height:${logoHeight}px;width:auto;object-fit:contain;display:block;">`;
            }
        } else {
            // 无图片，隐藏 logoIcon
            if (logoIcon) logoIcon.innerHTML = '';
        }

        if (data.logo.text) {
            // 显示文字
            if (logoText) {
                logoText.style.display = '';
                logoText.textContent = data.logo.text;
            }
        } else {
            // 无文字，隐藏 logoText
            if (logoText) logoText.style.display = 'none';
        }
    } else {
        // 默认：使用 siteName 作为纯文字
        if (logoIcon) logoIcon.textContent = '❤️';
        if (logoText) {
            logoText.style.display = '';
            logoText.textContent = data.siteName || '默默导航';
        }
    }

    // 设置 SEO 描述
    if (data.siteDescription) {
        const metaDescription = document.getElementById('metaDescription');
        if (metaDescription) metaDescription.content = data.siteDescription;
    }

    // 设置 SEO 关键词（分类名称 + 用户自定义，自动去重）
    const keywordsSet = new Set();
    if (data.categories) {
        data.categories.forEach(cat => keywordsSet.add(cat.name));
    }
    if (data.siteKeywords) {
        // 支持逗号分隔的多个关键词
        data.siteKeywords.split(',').forEach(kw => {
            const trimmed = kw.trim();
            if (trimmed) keywordsSet.add(trimmed);
        });
    }
    if (keywordsSet.size > 0) {
        const metaKeywords = document.getElementById('metaKeywords');
        if (metaKeywords) metaKeywords.content = Array.from(keywordsSet).join(',');
    }

    // 3. 加载自定义资源 (Custom Features Hook)
    if (data.customFeatures) {
        console.log('检测到自定义资源配置，准备加载...', data.customFeatures);
        loadCustomFeatures(data.customFeatures);
    }
}

/**
 * 动态加载自定义样式和脚本 (Custom Features Hook)
 * @param {Object} customConfig - 自定义属性配置对象
 */
function loadCustomFeatures(customConfig) {
    if (!customConfig || typeof customConfig !== 'object') return;

    const { styles, scripts } = customConfig;

    // 动态加载 CSS
    if (Array.isArray(styles)) {
        styles.forEach(href => {
            const h = String(href).trim();
            if (!h) return;

            const versionedHref = h.includes('?') ? `${h}&v=${APP_VERSION}` : `${h}?v=${APP_VERSION}`;
            if (document.querySelector(`link[href="${versionedHref}"]`)) return;

            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = versionedHref;
            link.dataset.customAsset = 'true';
            document.head.appendChild(link);
        });
    }

    // 动态加载 JS
    if (Array.isArray(scripts)) {
        scripts.forEach(src => {
            const s = String(src).trim();
            if (!s) return;

            const versionedSrc = s.includes('?') ? `${s}&v=${APP_VERSION}` : `${s}?v=${APP_VERSION}`;
            if (document.querySelector(`script[src="${versionedSrc}"]`)) return;

            const script = document.createElement('script');
            script.src = versionedSrc;
            script.dataset.customAsset = 'true';
            script.async = true;
            document.body.appendChild(script);
        });
    }
}

// 普通 URL 规范化（Iconfont）
function normalizeIconfontUrl(url) {
    if (!url) return '';
    if (url.startsWith('//')) return 'https:' + url;
    if (!/^https?:\/\//i.test(url) && !url.startsWith('/')) return 'https://' + url;
    return url;
}

// 加载 Iconfont
function loadIconfont(iconfontConfig) {
    return new Promise((resolve, reject) => {
        if (!iconfontConfig || appState.iconfontLoaded) {
            resolve();
            return;
        }

        let url;
        if (iconfontConfig.type === 'local') {
            const folder = iconfontConfig.url || 'iconfont';
            url = `${folder.replace(/\/$/, '')}/iconfont.js`;
        } else {
            url = normalizeIconfontUrl(iconfontConfig.url);
        }

        if (!url) {
            reject(new Error('Iconfont 未配置 URL'));
            return;
        }

        const existingScript = document.querySelector(`script[src="${url}"]`);
        if (existingScript) {
            appState.iconfontLoaded = true;
            resolve();
            return;
        }

        const script = document.createElement('script');
        script.src = url;
        script.onload = () => {
            appState.iconfontLoaded = true;
            console.log('Iconfont 加载成功:', url);
            resolve();
        };
        script.onerror = () => {
            console.error('Iconfont 加载失败:', url);
            reject(new Error('Iconfont 加载失败'));
        };

        const loader = document.getElementById('iconfontLoader');
        if (loader && loader.parentNode) {
            loader.parentNode.insertBefore(script, loader.nextSibling);
        } else {
            document.head.appendChild(script);
        }
    });
}

function normalizeItemKeywords(keywords) {
    if (Array.isArray(keywords)) {
        return keywords
            .map(keyword => String(keyword).trim().toLowerCase())
            .filter(Boolean);
    }

    if (typeof keywords === 'string') {
        return keywords
            .split(',')
            .map(keyword => keyword.trim().toLowerCase())
            .filter(Boolean);
    }

    return [];
}

function itemMatchesSearch(item, searchTerm) {
    if (!searchTerm) return true;

    const term = searchTerm.toLowerCase();
    const keywords = normalizeItemKeywords(item.keywords);

    return String(item.name || '').toLowerCase().includes(term) ||
        String(item.title || '').toLowerCase().includes(term) ||
        String(item.url || '').toLowerCase().includes(term) ||
        keywords.some(keyword => keyword.includes(term));
}

// 渲染导航
function renderNav(data, searchTerm = '') {
    const container = document.getElementById('navContent');
    const sidebar = document.getElementById('categorySidebar');

    if (!data || !data.categories) {
        container.innerHTML = '<p style="text-align: center; color: #999;">暂无数据</p>';
        sidebar.innerHTML = '';
        return;
    }

    let html = '';
    let sidebarHtml = '';
    let hasResults = false;

    data.categories.forEach((category, index) => {
        // 过滤项目
        const filteredItems = category.items.filter(item => itemMatchesSearch(item, searchTerm));

        if (filteredItems.length === 0) return;
        hasResults = true;

        const catId = 'category-' + index;

        html += `
            <section class="category" id="${catId}">
                <h2 class="category-title">
                    ${escapeHtml(category.name)}
                    <span class="category-count">(${filteredItems.length})</span>
                </h2>
                <div class="nav-grid">
                    ${filteredItems.map(item => createNavCard(item)).join('')}
                </div>
            </section>
        `;

        sidebarHtml += `
            <a class="sidebar-link" data-target="${catId}">${escapeHtml(category.name)}</a>
        `;
    });

    if (!hasResults) {
        html = `
            <div class="no-results">
                <div class="no-results-icon">🔍</div>
                <p>没有找到匹配 "${escapeHtml(searchTerm)}" 的结果</p>
            </div>
        `;
        sidebarHtml = '';
    }

    container.innerHTML = html;
    sidebar.innerHTML = sidebarHtml;

    if (typeof window.refreshCategorySidebarSticky === 'function') {
        window.refreshCategorySidebarSticky();
    }

    // 绑定侧边栏点击事件
    if (hasResults) {
        setupSidebar();
    }
}

// 设置侧边栏功能
function setupSidebar() {
    const sidebar = document.getElementById('categorySidebar');
    const links = sidebar.querySelectorAll('.sidebar-link');

    links.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.dataset.target;
            const target = document.getElementById(targetId);
            if (!target) return;

            const isMobile = window.innerWidth <= 768;
            const sidebarOffset = isMobile ? sidebar.offsetHeight + 20 : 120;
            const targetTop = Math.max(target.getBoundingClientRect().top + window.scrollY - sidebarOffset, 0);

            links.forEach(l => l.classList.remove('active'));
            link.classList.add('active');

            if (isMobile) {
                sidebar.scrollTo({
                    left: Math.max(link.offsetLeft - 12, 0),
                    behavior: 'smooth'
                });
            }

            window.scrollTo({
                top: targetTop,
                behavior: 'smooth'
            });

            if (!isMobile) {
                setTimeout(() => {
                    const grid = target.querySelector('.nav-grid');
                    if (grid) {
                        const items = grid.querySelectorAll('.nav-card');
                        const cols = getComputedStyle(grid).gridTemplateColumns.split(' ').length;
                        if (items.length >= cols) {
                            target.style.setProperty('--bar-width', '100%');
                        } else {
                            const gridWidth = grid.offsetWidth;
                            const barWidth = Math.round((items.length / cols) * gridWidth);
                            target.style.setProperty('--bar-width', barWidth + 'px');
                        }
                    }

                    target.classList.remove('highlight');
                    void target.offsetWidth;
                    target.classList.add('highlight');
                    target.addEventListener('animationend', () => {
                        target.classList.remove('highlight');
                    }, { once: true });
                }, 500);
            }
        });
    });
}

// 创建导航卡片
function createNavCard(item) {
    const iconHtml = getIconHtml(item.icon);

    return `
        <a href="${escapeHtml(item.url)}" 
           class="nav-card" 
           title="${escapeHtml(item.title)}"
           target="_blank" 
           rel="nofollow noopener noreferrer">
            <div class="nav-icon">${iconHtml}</div>
            <div class="nav-name">${escapeHtml(item.name)}</div>
        </a>
    `;
}

function isIconUrl(icon) {
    return /^(https?:\/\/|\/)/i.test(icon);
}

function isImageFile(icon) {
    return /\.(png|jpe?g|gif|svg|webp|ico)(\?.*)?$/i.test(icon);
}

// 获取图标 HTML
// 统一默认图标（带灰度滤镜）
const DEFAULT_ICON_HTML = `<img src="mn-src/momonav-icon.svg" alt="icon" style="filter: grayscale(100%) brightness(0.7)">`;

function isIconfontIcon(icon) {
    if (!appState.hasIconfontConfig) return false;
    const prefix = appState.iconfontPrefix;
    // 支持 "imn-xxx" 和 "#imn-xxx" 两种写法
    return icon.startsWith(prefix) || icon.startsWith('#' + prefix);
}

function getIconHtml(icon) {
    if (!icon) {
        return DEFAULT_ICON_HTML;
    }

    // 1. URL 类图标 (http:// https:// /path)
    if (isIconUrl(icon)) {
        if (icon.includes('iconify')) {
            return `<img src="${escapeHtml(icon)}" alt="icon" loading="lazy" width="24" height="24" onerror="this.src='mn-src/momonav-icon.svg'; this.style.filter='grayscale(100%) brightness(0.7)'">`;
        }
        if (isImageFile(icon)) {
            return `<img src="${escapeHtml(icon)}" alt="icon" loading="lazy" width="24" height="24" onerror="this.src='mn-src/momonav-icon.svg'; this.style.filter='grayscale(100%) brightness(0.7)'">`;
        }
    }

    // 2. Iconfont 符号（必须匹配指定前缀）
    if (isIconfontIcon(icon)) {
        const symbolId = icon.startsWith('#') ? icon : '#' + icon;
        return `<svg class="iconfont-symbol" aria-hidden="true"><use xlink:href="${escapeHtml(symbolId)}"></use></svg>`;
    }

    // 3. Font Awesome 等 class 类图标 (如 "fa-solid fa-star")
    if (icon.includes(' ')) {
        return `<i class="${escapeHtml(icon)}" aria-hidden="true"></i>`;
    }

    // 4. 图片文件路径（无 http 前缀但匹配图片扩展名）
    if (isImageFile(icon)) {
        return `<img src="${escapeHtml(icon)}" alt="icon" loading="lazy" width="24" height="24" onerror="this.src='mn-src/momonav-icon.svg'; this.style.filter='grayscale(100%) brightness(0.7)'">`;
    }

    // 5. 其他情况（emoji、纯文本等）直接作为文本输出
    const chars = Array.from(icon);
    const isLong = chars.length >= 2;
    const displayText = chars.slice(0, 2).join('');

    return `<span class="icon-text ${isLong ? 'is-small' : ''}">${escapeHtml(displayText)}</span>`;
}

// 暴露到全局，供自定义功能模块（如 tools-panel.js）统一调用
window.getIconHtml = getIconHtml;

// 当前选中的搜索引擎（从 localStorage 读取，默认 Bing）
let currentSearchEngine = (() => {
    const saved = localStorage.getItem('momoNavSearchEngine');
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            // 如果保存的 URL 包含 %s，清除缓存（兼容旧数据）
            if (parsed.url && parsed.url.includes('%s')) {
                localStorage.removeItem('momoNavSearchEngine');
                console.log('清除旧版搜索引擎缓存');
            } else {
                return parsed;
            }
        } catch (e) {
            console.error('读取保存的搜索引擎失败:', e);
        }
    }
    return {
        engine: 'bing',
        url: 'https://www.bing.com/search?q='
    };
})();

const LOCAL_SEARCH_HISTORY_KEY = 'momoNavLocalSearchHistory';

function resetLocalSearch() {
    renderNav(appState.navData, '');
}

function syncSearchClearButton(searchInput, clearBtn) {
    if (!searchInput || !clearBtn) return;
    clearBtn.classList.toggle('visible', searchInput.value.trim().length > 0);
}

function scrollSearchTabIntoView(tabBtn, options = {}) {
    if (!tabBtn) return;

    const tabsContainer = tabBtn.closest('.search-tabs');
    if (!tabsContainer) return;

    const containerRect = tabsContainer.getBoundingClientRect();
    const tabRect = tabBtn.getBoundingClientRect();
    const edgePadding = 8;

    const hiddenOnLeft = tabRect.left < containerRect.left + edgePadding;
    const hiddenOnRight = tabRect.right > containerRect.right - edgePadding;

    if (!hiddenOnLeft && !hiddenOnRight) return;

    const currentScrollLeft = tabsContainer.scrollLeft;
    let targetScrollLeft = currentScrollLeft;

    if (hiddenOnLeft) {
        targetScrollLeft = currentScrollLeft - ((containerRect.left + edgePadding) - tabRect.left);
    } else if (hiddenOnRight) {
        targetScrollLeft = currentScrollLeft + (tabRect.right - (containerRect.right - edgePadding));
    }

    const maxScrollLeft = Math.max(tabsContainer.scrollWidth - tabsContainer.clientWidth, 0);
    const nextScrollLeft = Math.max(0, Math.min(targetScrollLeft, maxScrollLeft));
    const immediate = Boolean(options.immediate);

    tabsContainer.scrollTo({
        left: nextScrollLeft,
        behavior: immediate ? 'auto' : 'smooth'
    });
}

function getLocalSearchHistory() {
    try {
        const raw = localStorage.getItem(LOCAL_SEARCH_HISTORY_KEY);
        if (!raw) return [];
        const data = JSON.parse(raw);
        if (Array.isArray(data)) return data;
    } catch (e) {
        console.error('读取本地搜索历史失败:', e);
    }
    return [];
}

function setLocalSearchHistory(history) {
    try {
        localStorage.setItem(LOCAL_SEARCH_HISTORY_KEY, JSON.stringify(history));
    } catch (e) {
        console.error('保存本地搜索历史失败:', e);
    }
}

function removeLocalSearchHistory(term) {
    const cleaned = String(term || '').trim().toLowerCase();
    const keywords = getLocalSearchHistory().filter(item => item.toLowerCase() !== cleaned);
    setLocalSearchHistory(keywords);
    renderLocalSearchHistory();
}

function clearAllLocalSearchHistory() {
    setLocalSearchHistory([]);
    renderLocalSearchHistory();
}

function addLocalSearchHistory(term) {
    if (!term) return;
    const keywords = getLocalSearchHistory();
    const cleaned = term.trim();
    if (!cleaned) return;
    const existingIndex = keywords.findIndex(item => item.toLowerCase() === cleaned.toLowerCase());
    if (existingIndex >= 0) {
        keywords.splice(existingIndex, 1);
    }
    keywords.unshift(cleaned);
    if (keywords.length > 8) keywords.length = 8;
    setLocalSearchHistory(keywords);
    renderLocalSearchHistory();
}

function renderLocalSearchHistory() {
    const historyContainer = document.getElementById('searchHistory');
    if (!historyContainer) return;

    const history = getLocalSearchHistory();
    if (!history.length) {
        historyContainer.innerHTML = '';
        return;
    }

    historyContainer.innerHTML = `
        <span class="search-history-title">
            <button type="button" class="history-clear-all-btn" aria-label="清空全部历史" data-history-clear-all>×</button>
            <strong>历史搜索</strong>
        </span>
    ` + history.map(item => `
        <span class="search-history-item">
            <button type="button" aria-label="搜索历史 ${escapeHtml(item)}" data-history="${escapeHtml(item)}">${escapeHtml(item)}</button>
            <button type="button" class="history-delete-btn" aria-label="删除历史 ${escapeHtml(item)}" data-history-delete="${escapeHtml(item)}">×</button>
        </span>
    `).join('');

    const clearAllBtn = historyContainer.querySelector('[data-history-clear-all]');
    if (clearAllBtn) {
        clearAllBtn.addEventListener('click', event => {
            event.stopPropagation();
            clearAllLocalSearchHistory();
        });
    }

    Array.from(historyContainer.querySelectorAll('[data-history]')).forEach(btn => {
        btn.addEventListener('click', () => {
            const value = btn.dataset.history;
            const searchInput = document.getElementById('searchInput');
            const clearBtn = document.getElementById('searchClearBtn');
            if (!searchInput) return;
            searchInput.value = value;
            syncSearchClearButton(searchInput, clearBtn);
            performSearch(value);
        });
    });

    Array.from(historyContainer.querySelectorAll('[data-history-delete]')).forEach(btn => {
        btn.addEventListener('click', event => {
            event.stopPropagation();
            removeLocalSearchHistory(btn.dataset.historyDelete);
        });
    });
}
// 设置搜索功能
function setupSearch() {
    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');
    const clearBtn = document.getElementById('searchClearBtn');
    const tabBtns = document.querySelectorAll('.tab-btn');

    // 选项卡切换
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // 移除所有激活状态
            tabBtns.forEach(b => b.classList.remove('active'));
            // 激活当前选项卡
            btn.classList.add('active');
            scrollSearchTabIntoView(btn);
            // 保存当前搜索引擎
            currentSearchEngine.engine = btn.dataset.engine;
            currentSearchEngine.url = btn.dataset.url;

            // 保存到 localStorage
            localStorage.setItem('momoNavSearchEngine', JSON.stringify(currentSearchEngine));

            // 更新 placeholder
            if (currentSearchEngine.engine === 'local') {
                searchInput.placeholder = '在本页导航中搜索...';
                renderNav(appState.navData, searchInput.value.trim());
            } else {
                searchInput.placeholder = '你想看看什么...';
                resetLocalSearch();
            }

            syncSearchClearButton(searchInput, clearBtn);
        });
    });

    // 恢复上次选择的选项卡状态
    let activeTabBtn = null;
    tabBtns.forEach(btn => {
        if (btn.dataset.engine === currentSearchEngine.engine) {
            btn.classList.add('active');
            activeTabBtn = btn;
        } else {
            btn.classList.remove('active');
        }
    });
    if (activeTabBtn) {
        window.requestAnimationFrame(() => {
            scrollSearchTabIntoView(activeTabBtn, { immediate: true });
        });
    }
    // 更新 placeholder 为保存的状态
    if (currentSearchEngine.engine === 'local') {
        searchInput.placeholder = '在本页导航中搜索...';
    } else {
        searchInput.placeholder = '你想看看什么...';
    }

    renderLocalSearchHistory();
    syncSearchClearButton(searchInput, clearBtn);

    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            searchInput.value = '';
            syncSearchClearButton(searchInput, clearBtn);
            searchInput.focus();

            if (currentSearchEngine.engine === 'local') {
                resetLocalSearch();
            }
        });
    }

    // 点击搜索按钮
    searchBtn.addEventListener('click', () => {
        performSearch(searchInput.value.trim());
    });

    // 回车搜索
    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            performSearch(searchInput.value.trim());
        }
    });

    // 输入时实时过滤（仅在本地模式下）
    let debounceTimer;
    searchInput.addEventListener('input', (e) => {
        syncSearchClearButton(searchInput, clearBtn);
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            if (currentSearchEngine.engine === 'local') {
                const value = e.target.value.trim();
                if (value) {
                    renderNav(appState.navData, value);
                } else {
                    resetLocalSearch();
                }
            }
        }, 300);
    });
}

// 执行搜索
function performSearch(query) {
    if (!query) return;

    if (currentSearchEngine.engine === 'local') {
        addLocalSearchHistory(query);
        renderNav(appState.navData, query);
        return;
    }

    let searchUrl;
    if (currentSearchEngine.url.includes('%s')) {
        searchUrl = currentSearchEngine.url.replace('%s', encodeURIComponent(query));
    } else {
        searchUrl = currentSearchEngine.url + encodeURIComponent(query);
    }

    window.open(searchUrl, '_blank', 'noopener,noreferrer');
}

// HTML 转义，防止 XSS
function escapeHtml(text) {
    if (text === undefined || text === null) return '';
    escapeContainer.textContent = text;
    return escapeContainer.innerHTML;
}

// 显示气泡提示
function showToast(message, duration = 3000, backgroundColor = 'rgba(51, 51, 51, 0.95)') {
    const existing = document.getElementById('momo-toast');
    if (existing) {
        existing.remove();
    }

    const toast = document.createElement('div');
    toast.id = 'momo-toast';
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        bottom: 40px;
        left: 50%;
        transform: translateX(-50%);
        background-color: ${backgroundColor};
        color: #fff;
        padding: 14px 28px;
        border-radius: 28px;
        font-size: 14px;
        font-weight: 500;
        z-index: 99999;
        opacity: 0;
        transition: opacity 0.3s ease;
        word-break: break-word;
        max-width: 80%;
        pointer-events: none;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        white-space: nowrap;
    `;

    document.body.appendChild(toast);

    // 触发淡入
    requestAnimationFrame(() => {
        toast.style.opacity = '1';
    });

    // 自动消失
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => {
            if (toast.parentNode) {
                toast.remove();
            }
        }, 300);
    }, duration);
}

// =========================
// 编辑模式扩展（Ctrl + F9）
// =========================
const EDITOR_DRAFT_KEY = 'momoNavEditorDraftV1';
const EDITOR_DESKTOP_QUERY = '(min-width: 1024px)';
const OPTIONAL_GROUP_KEYS = ['theme', 'cover', 'background', 'iconfont', 'fontawesome'];
const COLOR_FIELD_PATHS = [
    'theme.primaryColor',
    'theme.primaryHover',
    'theme.bgColor',
    'theme.cardBg',
    'theme.textColor',
    'theme.textMuted',
    'theme.borderColor',
    'background.textureColor',
];

function buildDefaultColorToggleState(defaultValue = false) {
    return COLOR_FIELD_PATHS.reduce((state, path) => {
        state[path] = defaultValue;
        return state;
    }, {});
}

const DEFAULT_PAGE_CONFIG = {
    captured: false,
    title: '',
    favicon: '',
    favicon192: '',
    favicon512: '',
    appleTouchIcon: '',
    metaThemeColor: '',
    siteDescription: '',
    siteKeywords: '',
    footerName: '',
    logoIconHtml: '',
    logoText: '',
    logoTextDisplay: '',
    cssVars: {},
};

appState.loadedIconfontUrl = '';
appState.loadedFontawesomeUrl = '';
appState.editor = {
    active: false,
    launcherVisible: false,
    panelOpen: false,
    applying: false,
    pendingApply: false,
    commitTimer: null,
    syncFormLocked: false,
    data: null,
    toggles: {
        theme: false,
        cover: false,
        background: false,
        iconfont: false,
        fontawesome: false,
    },
    colorToggles: buildDefaultColorToggleState(false),
    launcherEl: null,
    panelEl: null,
    drag: null,
    modalLayerEl: null,
    modalResolver: null,
    modalFields: [],
};

const _baseApplySiteConfig = applySiteConfig;
applySiteConfig = async function applySiteConfigWithReset(data) {
    resetPageConfigToDefaults();
    await _baseApplySiteConfig(data);
};

// 追加一个 DOMContentLoaded 监听，不影响原有初始化流程
document.addEventListener('DOMContentLoaded', () => {
    initEditorUi();
    bindEditorGlobalEvents();
});

function isDesktopEditorViewport() {
    return window.matchMedia(EDITOR_DESKTOP_QUERY).matches;
}

function deepClone(value) {
    if (value === undefined) return undefined;
    try {
        return JSON.parse(JSON.stringify(value));
    } catch (error) {
        console.warn('深拷贝失败，返回原值:', error);
        return value;
    }
}

function trimToString(value) {
    if (value === undefined || value === null) return '';
    return String(value).trim();
}

function getValueByPath(obj, path) {
    const segments = path.split('.');
    let current = obj;
    for (const segment of segments) {
        if (!current || typeof current !== 'object') return undefined;
        current = current[segment];
    }
    return current;
}

function setValueByPath(obj, path, value) {
    const segments = path.split('.');
    let current = obj;
    segments.forEach((segment, index) => {
        if (index === segments.length - 1) {
            current[segment] = value;
            return;
        }
        if (!current[segment] || typeof current[segment] !== 'object') {
            current[segment] = {};
        }
        current = current[segment];
    });
}

function buildColorToggleStateFromData(data) {
    const safeData = data && typeof data === 'object' ? data : {};
    const state = buildDefaultColorToggleState(false);

    COLOR_FIELD_PATHS.forEach(path => {
        if (path === 'theme.primaryColor') {
            const primaryColor = sanitizeThemeColor(
                getValueByPath(safeData, 'theme.primaryColor') || getValueByPath(safeData, 'theme.primary')
            );
            state[path] = Boolean(primaryColor);
            return;
        }

        const rawValue = getValueByPath(safeData, path);

        if (path.startsWith('theme.')) {
            state[path] = Boolean(sanitizeThemeColor(rawValue));
            return;
        }

        state[path] = Boolean(trimToString(rawValue));
    });

    return state;
}

function isColorFieldToggleEnabled(colorToggles, path) {
    return Boolean(colorToggles && colorToggles[path]);
}

function normalizeColorInputValue(value, fallback = '#000000') {
    const raw = trimToString(value);
    const safeFallback = /^#[0-9a-f]{6}$/i.test(trimToString(fallback)) ? trimToString(fallback) : '#000000';
    if (!raw) return safeFallback;

    if (/^#[0-9a-f]{6}$/i.test(raw)) {
        return raw;
    }

    if (/^#[0-9a-f]{3}$/i.test(raw)) {
        return `#${raw[1]}${raw[1]}${raw[2]}${raw[2]}${raw[3]}${raw[3]}`.toLowerCase();
    }

    const rgb = parseColorToRgb(raw);
    if (!rgb) return safeFallback;

    const toHex = num => {
        const clamped = Math.max(0, Math.min(255, Number(num) || 0));
        return clamped.toString(16).padStart(2, '0');
    };

    return `#${toHex(rgb[0])}${toHex(rgb[1])}${toHex(rgb[2])}`;
}

function parseOptionalNumber(value) {
    if (value === undefined || value === null) return null;
    const raw = String(value).trim();
    if (!raw) return null;
    const num = Number(raw);
    if (!Number.isFinite(num)) return null;
    return num;
}

function normalizeEditableCategories(categories) {
    if (!Array.isArray(categories)) return [];
    return categories.map((category, categoryIndex) => {
        const safeCategory = category && typeof category === 'object' ? category : {};
        const safeItems = Array.isArray(safeCategory.items) ? safeCategory.items : [];
        return {
            name: typeof safeCategory.name === 'string' ? safeCategory.name : `分类 ${categoryIndex + 1}`,
            items: safeItems.map(item => {
                const safeItem = item && typeof item === 'object' ? item : {};
                return {
                    name: typeof safeItem.name === 'string' ? safeItem.name : '',
                    url: typeof safeItem.url === 'string' ? safeItem.url : '',
                    title: typeof safeItem.title === 'string' ? safeItem.title : '',
                    icon: typeof safeItem.icon === 'string' ? safeItem.icon : '',
                    keywords: Array.isArray(safeItem.keywords)
                        ? safeItem.keywords.map(keyword => String(keyword))
                        : (typeof safeItem.keywords === 'string' ? safeItem.keywords : ''),
                };
            }),
        };
    });
}

function ensureEditorDataShape(sourceData) {
    const safeData = deepClone(sourceData || {}) || {};
    safeData.logo = safeData.logo && typeof safeData.logo === 'object' ? safeData.logo : {};
    safeData.webAppIcons = safeData.webAppIcons && typeof safeData.webAppIcons === 'object' ? safeData.webAppIcons : {};
    safeData.theme = safeData.theme && typeof safeData.theme === 'object' ? safeData.theme : {};
    safeData.cover = safeData.cover && typeof safeData.cover === 'object' ? safeData.cover : {};
    safeData.background = safeData.background && typeof safeData.background === 'object' ? safeData.background : {};
    safeData.iconfont = safeData.iconfont && typeof safeData.iconfont === 'object' ? safeData.iconfont : {};
    safeData.fontawesome = safeData.fontawesome && typeof safeData.fontawesome === 'object' ? safeData.fontawesome : {};
    safeData.categories = normalizeEditableCategories(safeData.categories);
    return safeData;
}

function buildToggleStateFromData(data) {
    const safeData = data && typeof data === 'object' ? data : {};
    return {
        theme: Boolean(safeData.theme && typeof safeData.theme === 'object'),
        cover: Boolean(safeData.cover && typeof safeData.cover === 'object'),
        background: Boolean(safeData.background && typeof safeData.background === 'object'),
        iconfont: Boolean(safeData.iconfont && typeof safeData.iconfont === 'object'),
        fontawesome: Boolean(safeData.fontawesome && typeof safeData.fontawesome === 'object'),
    };
}

function captureDefaultPageConfig() {
    if (DEFAULT_PAGE_CONFIG.captured) return;

    const favicon = document.getElementById('favicon');
    const favicon192 = document.getElementById('favicon192');
    const favicon512 = document.getElementById('favicon512');
    const appleTouchIcon = document.getElementById('appleTouchIcon');
    const metaThemeColor = document.getElementById('metaThemeColor');
    const metaDescription = document.getElementById('metaDescription');
    const metaKeywords = document.getElementById('metaKeywords');
    const footerSiteName = document.getElementById('footerSiteName');
    const logoIcon = document.getElementById('logoIcon');
    const logoText = document.getElementById('logoText');

    DEFAULT_PAGE_CONFIG.title = document.title;
    DEFAULT_PAGE_CONFIG.favicon = favicon ? favicon.getAttribute('href') || '' : '';
    DEFAULT_PAGE_CONFIG.favicon192 = favicon192 ? favicon192.getAttribute('href') || '' : '';
    DEFAULT_PAGE_CONFIG.favicon512 = favicon512 ? favicon512.getAttribute('href') || '' : '';
    DEFAULT_PAGE_CONFIG.appleTouchIcon = appleTouchIcon ? appleTouchIcon.getAttribute('href') || '' : '';
    DEFAULT_PAGE_CONFIG.metaThemeColor = metaThemeColor ? metaThemeColor.getAttribute('content') || '' : '';
    DEFAULT_PAGE_CONFIG.siteDescription = metaDescription ? (metaDescription.getAttribute('content') || '') : '';
    DEFAULT_PAGE_CONFIG.siteKeywords = metaKeywords ? (metaKeywords.getAttribute('content') || '') : '';
    DEFAULT_PAGE_CONFIG.footerName = footerSiteName ? footerSiteName.textContent || '' : '';
    DEFAULT_PAGE_CONFIG.logoIconHtml = logoIcon ? logoIcon.innerHTML : '';
    DEFAULT_PAGE_CONFIG.logoText = logoText ? logoText.textContent || '' : '';
    DEFAULT_PAGE_CONFIG.logoTextDisplay = logoText ? (logoText.style.display || '') : '';

    const rootStyles = window.getComputedStyle(document.documentElement);
    [
        '--primary-color',
        '--primary-hover',
        '--primary-rgb',
        '--bg-color',
        '--card-bg',
        '--card-bg-rgb',
        '--text-color',
        '--text-muted',
        '--border-color',
    ].forEach(cssVar => {
        DEFAULT_PAGE_CONFIG.cssVars[cssVar] = rootStyles.getPropertyValue(cssVar).trim();
    });

    DEFAULT_PAGE_CONFIG.captured = true;
}

function resetPageConfigToDefaults() {
    captureDefaultPageConfig();

    const bannerEl = document.getElementById('bannerBg');
    const rootStyle = document.documentElement.style;
    const favicon = document.getElementById('favicon');
    const favicon192 = document.getElementById('favicon192');
    const favicon512 = document.getElementById('favicon512');
    const appleTouchIcon = document.getElementById('appleTouchIcon');
    const metaThemeColor = document.getElementById('metaThemeColor');
    const metaDescription = document.getElementById('metaDescription');
    const metaKeywords = document.getElementById('metaKeywords');
    const footerSiteName = document.getElementById('footerSiteName');
    const logoIcon = document.getElementById('logoIcon');
    const logoText = document.getElementById('logoText');

    document.title = DEFAULT_PAGE_CONFIG.title;
    if (favicon) favicon.href = DEFAULT_PAGE_CONFIG.favicon;
    if (favicon192) favicon192.href = DEFAULT_PAGE_CONFIG.favicon192;
    if (favicon512) favicon512.href = DEFAULT_PAGE_CONFIG.favicon512;
    if (appleTouchIcon) appleTouchIcon.href = DEFAULT_PAGE_CONFIG.appleTouchIcon;
    if (metaThemeColor) metaThemeColor.content = DEFAULT_PAGE_CONFIG.metaThemeColor;
    if (metaDescription) metaDescription.content = DEFAULT_PAGE_CONFIG.siteDescription;
    if (metaKeywords) metaKeywords.content = DEFAULT_PAGE_CONFIG.siteKeywords;
    if (footerSiteName) footerSiteName.textContent = DEFAULT_PAGE_CONFIG.footerName || '默默导航';
    if (logoIcon) logoIcon.innerHTML = DEFAULT_PAGE_CONFIG.logoIconHtml;
    if (logoText) {
        logoText.textContent = DEFAULT_PAGE_CONFIG.logoText || '默默导航';
        logoText.style.display = DEFAULT_PAGE_CONFIG.logoTextDisplay;
    }

    Object.entries(DEFAULT_PAGE_CONFIG.cssVars).forEach(([cssVar, value]) => {
        if (value) {
            rootStyle.setProperty(cssVar, value);
        } else {
            rootStyle.removeProperty(cssVar);
        }
    });

    document.body.style.removeProperty('background-color');
    delete document.body.dataset.hasBgTexture;

    const dynamicBgStyle = document.getElementById('dynamic-bg-style');
    if (dynamicBgStyle) dynamicBgStyle.remove();

    document.body.classList.remove('has-cover-bg');
    if (bannerEl) {
        bannerEl.innerHTML = '';
        bannerEl.classList.remove('is-video-ready', 'has-cover-poster');
    }
}

function readEditorDraftFromStorage() {
    try {
        const raw = localStorage.getItem(EDITOR_DRAFT_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') return null;
        if (!parsed.data || typeof parsed.data !== 'object') return null;

        const safeToggles = buildToggleStateFromData(parsed.data);
        const safeColorToggles = buildColorToggleStateFromData(parsed.data);
        const storedToggles = parsed.toggles && typeof parsed.toggles === 'object' ? parsed.toggles : {};
        const storedColorToggles = parsed.colorToggles && typeof parsed.colorToggles === 'object'
            ? parsed.colorToggles
            : {};

        OPTIONAL_GROUP_KEYS.forEach(key => {
            if (typeof storedToggles[key] === 'boolean') {
                safeToggles[key] = storedToggles[key];
            }
        });

        COLOR_FIELD_PATHS.forEach(path => {
            if (typeof storedColorToggles[path] === 'boolean') {
                safeColorToggles[path] = storedColorToggles[path];
            }
        });

        return {
            data: ensureEditorDataShape(parsed.data),
            toggles: safeToggles,
            colorToggles: safeColorToggles,
        };
    } catch (error) {
        console.warn('读取编辑草稿失败，将回退到文件配置:', error);
        return null;
    }
}

function persistEditorDraftToStorage() {
    if (!appState.editor.data) return;
    try {
        localStorage.setItem(EDITOR_DRAFT_KEY, JSON.stringify({
            version: 1,
            updatedAt: new Date().toISOString(),
            data: appState.editor.data,
            toggles: appState.editor.toggles,
            colorToggles: appState.editor.colorToggles,
        }));
    } catch (error) {
        console.warn('保存编辑草稿失败:', error);
    }
}

function applyEditorDraftState(baseData) {
    const draft = readEditorDraftFromStorage();

    if (draft) {
        appState.editor.data = draft.data;
        appState.editor.toggles = draft.toggles;
        appState.editor.colorToggles = draft.colorToggles || buildColorToggleStateFromData(draft.data);

        // 确保从基础数据中保留导航链接（因为草稿可能还没保存这个新字段）
        if (baseData.navLinks && !appState.editor.data.navLinks) {
            appState.editor.data.navLinks = deepClone(baseData.navLinks);
        }

        console.log('检测到本地编辑草稿，已优先加载 localStorage 配置。');
        return true;
    }

    appState.editor.data = ensureEditorDataShape(baseData);
    appState.editor.toggles = buildToggleStateFromData(baseData);
    appState.editor.colorToggles = buildColorToggleStateFromData(baseData);
    return false;
}

function sanitizeThemeFromEditor(themeData, colorToggles = {}) {
    if (!themeData || typeof themeData !== 'object') return null;
    const output = {};

    const primaryColor = sanitizeThemeColor(themeData.primaryColor || themeData.primary);
    if (primaryColor && isColorFieldToggleEnabled(colorToggles, 'theme.primaryColor')) {
        output.primaryColor = primaryColor;
    }

    const primaryHover = sanitizeThemeColor(themeData.primaryHover);
    if (primaryHover && isColorFieldToggleEnabled(colorToggles, 'theme.primaryHover')) {
        output.primaryHover = primaryHover;
    }

    const map = [
        ['bgColor', 'theme.bgColor'],
        ['cardBg', 'theme.cardBg'],
        ['textColor', 'theme.textColor'],
        ['textMuted', 'theme.textMuted'],
        ['borderColor', 'theme.borderColor'],
    ];

    map.forEach(([field, path]) => {
        const colorValue = sanitizeThemeColor(themeData[field]);
        if (colorValue && isColorFieldToggleEnabled(colorToggles, path)) {
            output[field] = colorValue;
        }
    });

    return Object.keys(output).length > 0 ? output : null;
}

function sanitizeCoverFromEditor(coverData) {
    if (!coverData || typeof coverData !== 'object') return null;
    const output = {};

    ['video', 'image', 'poster'].forEach(field => {
        const value = trimToString(coverData[field]);
        if (value) output[field] = value;
    });

    return Object.keys(output).length > 0 ? output : null;
}

function sanitizeBackgroundFromEditor(backgroundData, colorToggles = {}) {
    if (!backgroundData || typeof backgroundData !== 'object') return null;
    const output = {};

    const texture = trimToString(backgroundData.texture);
    if (texture) output.texture = texture;

    const textureColor = trimToString(backgroundData.textureColor);
    if (textureColor && isColorFieldToggleEnabled(colorToggles, 'background.textureColor')) {
        output.textureColor = textureColor;
    }

    const opacity = parseOptionalNumber(backgroundData.opacity);
    if (opacity !== null) {
        output.opacity = Math.max(0, Math.min(1, opacity));
    }

    return Object.keys(output).length > 0 ? output : null;
}

function sanitizeIconfontFromEditor(iconfontData) {
    if (!iconfontData || typeof iconfontData !== 'object') return null;

    const url = trimToString(iconfontData.url);
    if (!url) return null;

    const rawType = trimToString(iconfontData.type).toLowerCase();
    const type = rawType === 'online' ? 'online' : 'local';
    const prefix = trimToString(iconfontData.prefix);

    const result = { type, url };
    if (prefix) result.prefix = prefix;
    return result;
}

function sanitizeFontawesomeFromEditor(fontawesomeData) {
    if (!fontawesomeData || typeof fontawesomeData !== 'object') return null;

    const url = trimToString(fontawesomeData.url);
    if (!url) return null;

    const rawType = trimToString(fontawesomeData.type).toLowerCase();
    const type = rawType === 'online' ? 'online' : 'local';

    return { type, url };
}

function sanitizeLogoFromEditor(logoData) {
    if (!logoData || typeof logoData !== 'object') return null;
    const output = {};

    const img = trimToString(logoData.img);
    if (img) output.img = img;

    const text = trimToString(logoData.text);
    if (text) output.text = text;

    const height = parseOptionalNumber(logoData.height);
    if (height !== null && height > 0) {
        output.height = Math.round(height);
    }

    return Object.keys(output).length > 0 ? output : null;
}

function sanitizeWebAppIconsFromEditor(webAppIconsData) {
    if (!webAppIconsData || typeof webAppIconsData !== 'object') return null;
    const output = {};

    const appleTouchIcon = trimToString(webAppIconsData.appleTouchIcon);
    if (appleTouchIcon) output.appleTouchIcon = appleTouchIcon;

    const icon192 = trimToString(webAppIconsData.icon192);
    if (icon192) output.icon192 = icon192;

    const icon512 = trimToString(webAppIconsData.icon512);
    if (icon512) output.icon512 = icon512;

    return Object.keys(output).length > 0 ? output : null;
}

function sanitizeKeywordsFromEditor(keywords) {
    if (Array.isArray(keywords)) {
        const values = keywords.map(item => trimToString(item)).filter(Boolean);
        return values.length > 0 ? values : null;
    }

    const value = trimToString(keywords);
    return value ? value : null;
}

function sanitizeCategoriesFromEditor(categories) {
    if (!Array.isArray(categories)) return [];

    return categories.reduce((result, category, index) => {
        const safeCategory = category && typeof category === 'object' ? category : {};
        const categoryName = trimToString(safeCategory.name);
        const rawItems = Array.isArray(safeCategory.items) ? safeCategory.items : [];
        const items = rawItems.reduce((itemResults, item) => {
            const safeItem = item && typeof item === 'object' ? item : {};
            const name = trimToString(safeItem.name);
            const url = trimToString(safeItem.url);
            if (!name || !url) return itemResults;

            const normalizedItem = {
                name,
                url,
            };

            const title = trimToString(safeItem.title);
            if (title) normalizedItem.title = title;

            const icon = trimToString(safeItem.icon);
            if (icon) normalizedItem.icon = icon;

            const keywords = sanitizeKeywordsFromEditor(safeItem.keywords);
            if (keywords) normalizedItem.keywords = keywords;

            itemResults.push(normalizedItem);
            return itemResults;
        }, []);

        if (!categoryName && items.length === 0) return result;

        result.push({
            name: categoryName || `分类 ${index + 1}`,
            items,
        });

        return result;
    }, []);
}

function buildConfigFromEditorState() {
    const editorData = appState.editor.data || {};
    const toggles = appState.editor.toggles || {};
    const colorToggles = appState.editor.colorToggles || buildDefaultColorToggleState(false);
    const output = {};

    const siteName = trimToString(editorData.siteName);
    if (siteName) output.siteName = siteName;

    const footerName = trimToString(editorData.footerName);
    if (footerName) output.footerName = footerName;

    const siteDescription = trimToString(editorData.siteDescription);
    if (siteDescription) output.siteDescription = siteDescription;

    const siteKeywords = trimToString(editorData.siteKeywords);
    if (siteKeywords) output.siteKeywords = siteKeywords;

    const favicon = trimToString(editorData.favicon);
    if (favicon) output.favicon = favicon;

    const webAppIcons = sanitizeWebAppIconsFromEditor(editorData.webAppIcons);
    if (webAppIcons) output.webAppIcons = webAppIcons;

    const logo = sanitizeLogoFromEditor(editorData.logo);
    if (logo) output.logo = logo;

    if (toggles.theme) {
        const theme = sanitizeThemeFromEditor(editorData.theme, colorToggles);
        if (theme) output.theme = theme;
    }

    if (toggles.cover) {
        const cover = sanitizeCoverFromEditor(editorData.cover);
        if (cover) output.cover = cover;
    }

    if (toggles.background) {
        const background = sanitizeBackgroundFromEditor(editorData.background, colorToggles);
        if (background) output.background = background;
    }

    if (toggles.iconfont) {
        const iconfont = sanitizeIconfontFromEditor(editorData.iconfont);
        if (iconfont) output.iconfont = iconfont;
    }

    if (toggles.fontawesome) {
        const fontawesome = sanitizeFontawesomeFromEditor(editorData.fontawesome);
        if (fontawesome) output.fontawesome = fontawesome;
    }

    if (editorData.navLinks) {
        // 克隆并清洗：移除空的 children 数组
        output.navLinks = deepClone(editorData.navLinks).map(link => {
            if (Array.isArray(link.children) && link.children.length === 0) {
                const { children, ...rest } = link;
                return rest;
            }
            return link;
        });
    }

    output.categories = sanitizeCategoriesFromEditor(editorData.categories);
    return output;
}

async function applyEditorPreview() {
    if (appState.editor.applying) {
        appState.editor.pendingApply = true;
        return;
    }

    appState.editor.applying = true;
    do {
        appState.editor.pendingApply = false;
        appState.navData = buildConfigFromEditorState();
        persistEditorDraftToStorage();
        await refreshUiFromNavData();
    } while (appState.editor.pendingApply);
    appState.editor.applying = false;
}

function queueEditorPreview(delay = 120) {
    if (appState.editor.commitTimer) {
        clearTimeout(appState.editor.commitTimer);
    }
    appState.editor.commitTimer = window.setTimeout(() => {
        appState.editor.commitTimer = null;
        applyEditorPreview();
    }, delay);
}

async function refreshUiFromNavData() {
    if (!appState.navData) return;

    await applySiteConfig(appState.navData);

    if (appState.navData.iconfont) {
        appState.hasIconfontConfig = true;
        appState.iconfontPrefix = trimToString(appState.navData.iconfont.prefix) || 'icon-';
        try {
            await loadIconfont(appState.navData.iconfont);
        } catch (error) {
            console.warn('Iconfont 预览加载失败:', error);
            appState.hasIconfontConfig = false;
        }
    } else {
        appState.hasIconfontConfig = false;
        appState.iconfontPrefix = 'icon-';
    }

    if (appState.navData.fontawesome) {
        try {
            await loadFontawesome(appState.navData.fontawesome);
        } catch (error) {
            console.warn('Font Awesome 预览加载失败:', error);
        }
    } else {
        unloadFontawesome();
    }

    const searchInput = document.getElementById('searchInput');
    const activeSearchTerm = (
        !appState.editor.active &&
        currentSearchEngine.engine === 'local' &&
        searchInput
    ) ? searchInput.value.trim() : '';

    renderNav(appState.navData, activeSearchTerm);

    // 渲染顶部导航菜单
    if (appState.navData.navLinks) {
        renderHeaderNav(appState.navData.navLinks);
    }

    // 初始化下拉菜单交互
    initHeaderDropdown();
}

function initEditorUi() {
    const siteLogo = document.getElementById('siteLogo');
    if (!siteLogo) return;

    if (!appState.editor.launcherEl) {
        const launcherBtn = document.createElement('button');
        launcherBtn.type = 'button';
        launcherBtn.id = 'editorLauncherBtn';
        launcherBtn.className = 'editor-launcher-btn';
        launcherBtn.textContent = '进入编辑模式';
        launcherBtn.addEventListener('click', () => {
            if (appState.editor.active) {
                exitEditorMode();
            } else {
                enterEditorMode();
            }
        });
        siteLogo.appendChild(launcherBtn);
        appState.editor.launcherEl = launcherBtn;
    }

    if (!appState.editor.panelEl) {
        const panel = document.createElement('aside');
        panel.id = 'editorPanel';
        panel.className = 'editor-panel';
        panel.setAttribute('aria-hidden', 'true');
        panel.innerHTML = `
            <div class="editor-panel-head">
                <strong>可视化编辑</strong>
                <button type="button" class="editor-close-btn" data-editor-action="close-editor" aria-label="关闭编辑面板">×</button>
            </div>
            <div class="editor-panel-body">
                <section class="editor-section">
                    <h3>基础信息</h3>
                    <label>siteName<input type="text" data-editor-path="siteName" id="editorFieldSiteName" placeholder="例如：我的导航"></label>
                    <label>footerName<input type="text" data-editor-path="footerName" id="editorFieldFooterName" placeholder="例如：默默导航"></label>
                    <label>siteDescription<textarea rows="3" data-editor-path="siteDescription" id="editorFieldSiteDescription" placeholder="简单描述网站的目的和内容"></textarea></label>
                    <label>siteKeywords<input type="text" data-editor-path="siteKeywords" id="editorFieldSiteKeywords" placeholder="用逗号分隔的关键词，如：工具,资源,导航"></label>

                    <label>favicon<input type="text" data-editor-path="favicon" id="editorFieldFavicon" placeholder="网站图标的URL"></label>
                    <label>webAppIcons.appleTouchIcon<input type="text" data-editor-path="webAppIcons.appleTouchIcon" id="editorFieldAppleTouchIcon" placeholder="iOS 主屏图标（建议 180x180 PNG）"></label>
                    <label>webAppIcons.icon192<input type="text" data-editor-path="webAppIcons.icon192" id="editorFieldWebIcon192" placeholder="Android 图标（192x192 PNG）"></label>
                    <label>webAppIcons.icon512<input type="text" data-editor-path="webAppIcons.icon512" id="editorFieldWebIcon512" placeholder="PWA 图标（512x512 PNG）"></label>
                </section>

                <section class="editor-section">
                    <h3>Logo</h3>
                    <label>logo.img<input type="text" data-editor-path="logo.img" id="editorFieldLogoImg" placeholder="Logo图片的URL"></label>
                    <label>logo.text<input type="text" data-editor-path="logo.text" id="editorFieldLogoText" placeholder="Logo右边显示的文字"></label>
                    <label>logo.height<input type="number" step="1" min="1" data-editor-path="logo.height" id="editorFieldLogoHeight" placeholder="24" value="24"></label>
                </section>

                <section class="editor-section editor-optional-section" data-editor-group="theme">
                    <h3>
                        <label class="editor-group-toggle">
                            <input type="checkbox" data-editor-toggle="theme" id="editorToggleTheme">
                            <span>theme</span>
                        </label>
                    </h3>
                    <div class="editor-group-fields" data-editor-group-fields="theme">
                        <label class="editor-color-field">
                            <input type="checkbox" data-editor-color-toggle="theme.primaryColor" id="editorToggleThemePrimaryColor">
                            <span>primaryColor</span>
                            <input type="color" data-editor-path="theme.primaryColor" id="editorFieldThemePrimaryColor" title="网站主色调">
                        </label>
                        <label class="editor-color-field">
                            <input type="checkbox" data-editor-color-toggle="theme.primaryHover" id="editorToggleThemePrimaryHover">
                            <span>primaryHover</span>
                            <input type="color" data-editor-path="theme.primaryHover" id="editorFieldThemePrimaryHover" title="主号悬停/焦点时的颜色">
                        </label>
                        <label class="editor-color-field">
                            <input type="checkbox" data-editor-color-toggle="theme.bgColor" id="editorToggleThemeBgColor">
                            <span>bgColor</span>
                            <input type="color" data-editor-path="theme.bgColor" id="editorFieldThemeBgColor" title="页面背景色">
                        </label>
                        <label class="editor-color-field">
                            <input type="checkbox" data-editor-color-toggle="theme.cardBg" id="editorToggleThemeCardBg">
                            <span>cardBg</span>
                            <input type="color" data-editor-path="theme.cardBg" id="editorFieldThemeCardBg" title="卡片背景色">
                        </label>
                        <label class="editor-color-field">
                            <input type="checkbox" data-editor-color-toggle="theme.textColor" id="editorToggleThemeTextColor">
                            <span>textColor</span>
                            <input type="color" data-editor-path="theme.textColor" id="editorFieldThemeTextColor" title="主文字颜色">
                        </label>
                        <label class="editor-color-field">
                            <input type="checkbox" data-editor-color-toggle="theme.textMuted" id="editorToggleThemeTextMuted">
                            <span>textMuted</span>
                            <input type="color" data-editor-path="theme.textMuted" id="editorFieldThemeTextMuted" title="次要/辅助文字颜色">
                        </label>
                        <label class="editor-color-field">
                            <input type="checkbox" data-editor-color-toggle="theme.borderColor" id="editorToggleThemeBorderColor">
                            <span>borderColor</span>
                            <input type="color" data-editor-path="theme.borderColor" id="editorFieldThemeBorderColor" title="边框和分割线颜色">
                        </label>
                    </div>
                </section>

                <section class="editor-section editor-optional-section" data-editor-group="cover">
                    <h3>
                        <label class="editor-group-toggle">
                            <input type="checkbox" data-editor-toggle="cover" id="editorToggleCover">
                            <span>cover</span>
                        </label>
                    </h3>
                    <div class="editor-group-fields" data-editor-group-fields="cover">
                        <label>video<input type="text" data-editor-path="cover.video" id="editorFieldCoverVideo" placeholder="视频文件URL或本地路径"></label>
                        <label>image<input type="text" data-editor-path="cover.image" id="editorFieldCoverImage" placeholder="图片URL，视频加载失败时作为备选"></label>
                        <label>poster<input type="text" data-editor-path="cover.poster" id="editorFieldCoverPoster" placeholder="视频预览图，在视频加载前显示"></label>
                    </div>
                </section>

                <section class="editor-section editor-optional-section" data-editor-group="background">
                    <h3>
                        <label class="editor-group-toggle">
                            <input type="checkbox" data-editor-toggle="background" id="editorToggleBackground">
                            <span>background</span>
                        </label>
                    </h3>
                    <div class="editor-group-fields" data-editor-group-fields="background">
                        <label>texture<input type="text" data-editor-path="background.texture" id="editorFieldBgTexture" placeholder="背景纹理图片的URL"></label>
                        <label>opacity<input type="number" step="0.1" min="0" max="1" data-editor-path="background.opacity" id="editorFieldBgOpacity" placeholder="0.5" title="背景透明度 (0-1)"></label>
                        <label class="editor-color-field">
                            <input type="checkbox" data-editor-color-toggle="background.textureColor" id="editorToggleBgTextureColor">
                            <span>textureColor</span>
                            <input type="color" data-editor-path="background.textureColor" id="editorFieldBgTextureColor" title="纹理的色调">
                        </label>
                    </div>
                </section>

                <section class="editor-section editor-optional-section" data-editor-group="iconfont">
                    <h3>
                        <label class="editor-group-toggle">
                            <input type="checkbox" data-editor-toggle="iconfont" id="editorToggleIconfont">
                            <span>iconfont</span>
                        </label>
                    </h3>
                    <div class="editor-group-fields" data-editor-group-fields="iconfont">
                        <label>type
                            <select data-editor-path="iconfont.type" id="editorFieldIconfontType" title="图标加载方式" data-dynamic-placeholder-target="editorFieldIconfontUrl" data-placeholder-local="文件夹名 font_xxxxx" data-placeholder-online="//at.alicdn.com/t/.......js">
                                <option value="local">local (本地加载)</option>
                                <option value="online">online (在线加载)</option>
                            </select>
                        </label>
                        <label>url<input type="text" data-editor-path="iconfont.url" id="editorFieldIconfontUrl" placeholder="文件夹名 font_xxxxx"></label>
                        <label>prefix<input type="text" data-editor-path="iconfont.prefix" id="editorFieldIconfontPrefix" placeholder="默认 icon-" title="图标前缀，如 imn-、icon- 等，用于精确识别 iconfont 图标"></label>
                    </div>
                </section>

                <section class="editor-section editor-optional-section" data-editor-group="fontawesome">
                    <h3>
                        <label class="editor-group-toggle">
                            <input type="checkbox" data-editor-toggle="fontawesome" id="editorToggleFontawesome">
                            <span>fontawesome (Font Awesome)</span>
                        </label>
                    </h3>
                    <div class="editor-group-fields" data-editor-group-fields="fontawesome">
                        <label>type
                            <select data-editor-path="fontawesome.type" id="editorFieldFontawesomeType" title="图标加载方式" data-dynamic-placeholder-target="editorFieldFontawesomeUrl" data-placeholder-local="文件夹 fontawesome" data-placeholder-online="CDN地址 https://.......css">
                                <option value="local">local (本地加载)</option>
                                <option value="online">online (在线加载)</option>
                            </select>
                        </label>
                        <label>url
                            <input type="text" data-editor-path="fontawesome.url" id="editorFieldFontawesomeUrl" placeholder="文件夹 fontawesome">
                        </label>
                    </div>
                </section>

                <section class="editor-section">
                    <h3>分类与链接</h3>
                    <p class="editor-tip">在主体区域可拖拽排序、增删、编辑分类和链接。</p>
                    <div class="editor-inline-actions">
                        <button type="button" data-editor-action="add-category">新增分类</button>
                    </div>
                </section>
            </div>
            <div class="editor-panel-foot">
                <button type="button" class="editor-btn-primary" data-editor-action="export-config">导出配置</button>
                <button type="button" data-editor-action="export-manifest">导出 site.webmanifest</button>
                <button type="button" data-editor-action="clear-draft">清除本地草稿</button>
            </div>
        `;

        document.body.appendChild(panel);
        appState.editor.panelEl = panel;

        panel.addEventListener('click', handleEditorPanelClick);
        panel.addEventListener('input', handleEditorPanelInputChange);
        panel.addEventListener('change', handleEditorPanelInputChange);

        // 初始化动态 placeholder
        initDynamicPlaceholders();

        // 为面板中的路径类字段增加纠正按钮
        const fixPaths = [
            'editorFieldFavicon', 'editorFieldAppleTouchIcon', 'editorFieldWebIcon192', 'editorFieldWebIcon512',
            'editorFieldLogoImg', 'editorFieldCoverVideo', 'editorFieldCoverImage', 'editorFieldCoverPoster',
            'editorFieldBgTexture', 'editorFieldIconfontUrl', 'editorFieldFontawesomeUrl'
        ];
        fixPaths.forEach(id => {
            const input = document.getElementById(id);
            if (input) wrapInputWithFixBtn(input);
        });
    }

    if (!appState.editor.modalLayerEl) {
        const modalLayer = document.createElement('div');
        modalLayer.className = 'editor-modal-layer';
        modalLayer.setAttribute('aria-hidden', 'true');
        modalLayer.innerHTML = `
            <div class="editor-modal" role="dialog" aria-modal="true" aria-labelledby="editorModalTitle">
                <div class="editor-modal-head">
                    <strong id="editorModalTitle"></strong>
                    <button type="button" class="editor-modal-close" data-editor-modal-action="cancel" aria-label="关闭">×</button>
                </div>
                <div class="editor-modal-body">
                    <p class="editor-modal-desc" id="editorModalDesc"></p>
                    <form id="editorModalForm" class="editor-modal-form" novalidate>
                        <div class="editor-modal-fields" id="editorModalFields"></div>
                        <p class="editor-modal-error" id="editorModalError" aria-live="polite"></p>
                        <div class="editor-modal-foot">
                            <button type="button" data-editor-modal-action="cancel">取消</button>
                            <button type="submit" class="editor-btn-primary" id="editorModalSubmit">保存</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        document.body.appendChild(modalLayer);
        appState.editor.modalLayerEl = modalLayer;

        modalLayer.addEventListener('click', event => {
            const actionTarget = event.target.closest('[data-editor-modal-action]');
            if (actionTarget && actionTarget.dataset.editorModalAction === 'cancel') {
                event.preventDefault();
                closeEditorModal(null);
                return;
            }
            // 不响应点击遮罩层关闭，避免误触导致弹窗意外关闭
        });

        const modalForm = modalLayer.querySelector('#editorModalForm');
        if (modalForm) {
            modalForm.addEventListener('submit', handleEditorModalSubmit);
        }
    }

    updateEditorLauncherVisibility();
    updateEditorLauncherLabel();
    syncEditorFormFromState();
}

function bindEditorGlobalEvents() {
    const navContent = document.getElementById('navContent');
    const sidebar = document.getElementById('categorySidebar');

    document.addEventListener('keydown', handleEditorShortcut);

    if (navContent) {
        navContent.addEventListener('click', handleEditorNavClick);
        navContent.addEventListener('dragstart', handleEditorDragStart);
        navContent.addEventListener('dragover', handleEditorDragOver);
        navContent.addEventListener('drop', handleEditorDrop);
        navContent.addEventListener('dragend', clearEditorDragState);
    }

    const headerNav = document.getElementById('headerNav');
    if (headerNav) {
        headerNav.addEventListener('click', handleEditorNavClick);
        headerNav.addEventListener('dragstart', handleEditorDragStart);
        headerNav.addEventListener('dragover', handleEditorDragOver);
        headerNav.addEventListener('drop', handleEditorDrop);
        headerNav.addEventListener('dragend', clearEditorDragState);
    }

    if (sidebar) {
        sidebar.addEventListener('click', event => {
            if (!appState.editor.active) return;
            const actionTarget = event.target.closest('[data-editor-action]');
            if (!actionTarget) return;

            event.preventDefault();
            event.stopPropagation();
            void executeEditorAction(actionTarget.dataset.editorAction, actionTarget.dataset);
        });
    }

    window.addEventListener('resize', () => {
        if (appState.editor.active && !isDesktopEditorViewport()) {
            exitEditorMode();
        }
    });
}

async function handleEditorShortcut(event) {
    if (event.defaultPrevented) return;
    if (event.key === 'Escape' && appState.editor.modalResolver) {
        event.preventDefault();
        closeEditorModal(null);
        return;
    }

    if (!event.ctrlKey || event.altKey || event.metaKey || event.shiftKey) return;
    if (event.code !== 'F9') return;

    event.preventDefault();
    if (!isDesktopEditorViewport()) return;

    // 检查密码保护
    if (!appState.editor.launcherVisible) {
        const verified = await verifyEditorPassword('进入编辑模式');
        if (!verified) return;
    }

    if (!appState.editor.launcherVisible) {
        appState.editor.launcherVisible = true;
        showToast('编辑模式已启用', 3000, '#e05d00');
    } else if (!appState.editor.active) {
        appState.editor.launcherVisible = false;
        showToast('编辑模式已禁用', 3000, '#00bd06');
    }

    updateEditorLauncherVisibility();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

/**
 * 校验编辑器密码（如果已配置）
 * @param {string} actionName - 当前操作名称，用于模态框标题
 * @returns {Promise<boolean>}
 */
async function verifyEditorPassword(actionName) {
    // 优先从草稿中读取密码，因为用户可能刚刚设置或修改了它
    const currentData = appState.editor.data || appState.navData;
    const password = trimToString(currentData.password);

    // 校验规则：6-16位字符
    const isValid = password.length >= 6 && password.length <= 16;
    if (!isValid) return true;

    // 检查缓存
    const CACHE_KEY = 'momo_nav_verified_pwd';
    const cachedPwd = localStorage.getItem(CACHE_KEY);
    if (cachedPwd === password) return true;

    // 弹出校验模态框
    const result = await openEditorModalForm({
        title: actionName,
        description: '此操作受密码保护，请输入配置文件中设置的密码。',
        submitText: '验证',
        fields: [
            {
                name: 'verifyPassword',
                label: '密码',
                type: 'password',
                autocomplete: 'new-password',
                required: true,
                placeholder: '请输入密码'
            }
        ]
    });

    if (!result) return false;

    if (result.verifyPassword === password) {
        localStorage.setItem(CACHE_KEY, password);
        return true;
    } else {
        showToast('密码错误', 3000, '#ff4d4f');
        return false;
    }
}

function updateEditorLauncherLabel() {
    if (!appState.editor.launcherEl) return;
    appState.editor.launcherEl.textContent = appState.editor.active ? '退出编辑模式' : '进入编辑模式';
}

function updateEditorLauncherVisibility() {
    if (!appState.editor.launcherEl) return;
    const shouldShow = appState.editor.launcherVisible || appState.editor.active;
    appState.editor.launcherEl.classList.toggle('is-visible', shouldShow);
}

function enterEditorMode() {
    if (!isDesktopEditorViewport()) return;
    if (!appState.editor.panelEl) initEditorUi();

    appState.editor.active = true;
    appState.editor.panelOpen = true;
    appState.editor.launcherVisible = true;

    document.body.classList.add('editor-mode', 'editor-panel-open');
    if (appState.editor.panelEl) {
        appState.editor.panelEl.classList.add('is-open');
        appState.editor.panelEl.setAttribute('aria-hidden', 'false');
    }

    updateEditorLauncherLabel();
    updateEditorLauncherVisibility();
    syncEditorFormFromState();
    refreshUiFromNavData();
}

function exitEditorMode() {
    appState.editor.active = false;
    appState.editor.panelOpen = false;

    document.body.classList.remove('editor-mode', 'editor-panel-open');
    closeEditorModal(null);
    if (appState.editor.panelEl) {
        appState.editor.panelEl.classList.remove('is-open');
        appState.editor.panelEl.setAttribute('aria-hidden', 'true');
    }

    clearEditorDragState();
    updateEditorLauncherLabel();
    updateEditorLauncherVisibility();
    refreshUiFromNavData();
}

function handleEditorPanelClick(event) {
    const actionTarget = event.target.closest('[data-editor-action]');
    if (!actionTarget) return;

    event.preventDefault();
    void executeEditorAction(actionTarget.dataset.editorAction, actionTarget.dataset);
}

async function executeEditorAction(action, dataset = {}) {
    switch (action) {
        case 'close-editor':
            exitEditorMode();
            return;
        case 'export-config':
            exportEditorConfig();
            return;
        case 'export-manifest':
            exportSiteManifest();
            return;
        case 'clear-draft':
            clearEditorDraftWithConfirm();
            return;
        case 'add-category':
            await addCategoryFromEditor();
            return;
        case 'edit-category':
            await editCategoryFromEditor(Number(dataset.categoryIndex));
            return;
        case 'delete-category':
            deleteCategoryFromEditor(Number(dataset.categoryIndex));
            return;
        case 'add-link':
            await addLinkFromEditor(Number(dataset.categoryIndex));
            return;
        case 'edit-link':
            await editLinkFromEditor(Number(dataset.categoryIndex), Number(dataset.itemIndex));
            return;
        case 'delete-link':
            deleteLinkFromEditor(Number(dataset.categoryIndex), Number(dataset.itemIndex));
            return;
        case 'add-nav-link':
            await handleAddNavLink();
            return;
        case 'edit-nav-link':
            await handleEditNavLink(Number(dataset.index), dataset.childIndex !== undefined ? Number(dataset.childIndex) : undefined);
            return;
        case 'delete-nav-link':
            handleDeleteNavLink(Number(dataset.index), dataset.childIndex !== undefined ? Number(dataset.childIndex) : undefined);
            return;
        case 'add-nav-child':
            await handleAddNavChild(Number(dataset.index));
            return;
        case 'move-nav-up':
            moveNavLink(Number(dataset.index));
            return;
        case 'move-nav-down':
            moveNavLink(Number(dataset.index), true);
            return;
        default:
            return;
    }
}

function handleEditorPanelInputChange(event) {
    const target = event.target;
    if (!target || appState.editor.syncFormLocked || !appState.editor.data) return;

    if (target.dataset.editorColorToggle) {
        const colorPath = target.dataset.editorColorToggle;
        if (!Object.prototype.hasOwnProperty.call(appState.editor.colorToggles, colorPath)) {
            appState.editor.colorToggles[colorPath] = false;
        }
        appState.editor.colorToggles[colorPath] = target.checked;

        if (target.checked) {
            const currentValue = trimToString(getValueByPath(appState.editor.data, colorPath));
            if (!currentValue && appState.editor.panelEl) {
                const colorInput = appState.editor.panelEl.querySelector(`[data-editor-path="${colorPath}"]`);
                if (colorInput && colorInput.type === 'color' && colorInput.value) {
                    setValueByPath(appState.editor.data, colorPath, colorInput.value);
                }
            }
        }

        updateColorFieldReadonlyState(colorPath);
        queueEditorPreview(0);
        return;
    }

    if (target.dataset.editorToggle) {
        const toggleKey = target.dataset.editorToggle;
        appState.editor.toggles[toggleKey] = target.checked;
        updateOptionalGroupReadonlyState(toggleKey);
        queueEditorPreview(0);
        return;
    }

    const fieldPath = target.dataset.editorPath;
    if (!fieldPath) return;

    setValueByPath(appState.editor.data, fieldPath, target.value);
    updateManifestExportButtonState();
    queueEditorPreview();
}

function syncEditorFormFromState() {
    if (!appState.editor.panelEl || !appState.editor.data) return;

    const fieldSelectors = appState.editor.panelEl.querySelectorAll('[data-editor-path]');
    appState.editor.syncFormLocked = true;

    fieldSelectors.forEach(field => {
        const fieldPath = field.dataset.editorPath;
        if (!fieldPath) return;

        const value = getValueByPath(appState.editor.data, fieldPath);
        if (field.tagName === 'SELECT') {
            field.value = trimToString(value) || field.options[0].value;
            return;
        }

        if (field.type === 'number') {
            field.value = value === undefined || value === null ? '' : String(value);
            return;
        }

        if (field.type === 'color') {
            field.value = normalizeColorInputValue(value, field.value || '#000000');
            return;
        }

        field.value = value === undefined || value === null ? '' : String(value);
    });

    OPTIONAL_GROUP_KEYS.forEach(key => {
        const checkbox = appState.editor.panelEl.querySelector(`[data-editor-toggle="${key}"]`);
        if (!checkbox) return;
        checkbox.checked = Boolean(appState.editor.toggles[key]);
        updateOptionalGroupReadonlyState(key);
    });

    COLOR_FIELD_PATHS.forEach(path => {
        const checkbox = appState.editor.panelEl.querySelector(`[data-editor-color-toggle="${path}"]`);
        if (!checkbox) return;
        if (typeof appState.editor.colorToggles[path] !== 'boolean') {
            appState.editor.colorToggles[path] = false;
        }
        checkbox.checked = Boolean(appState.editor.colorToggles[path]);
        updateColorFieldReadonlyState(path);
    });

    updateManifestExportButtonState();

    appState.editor.syncFormLocked = false;

    // 同步后更新动态 placeholder
    initDynamicPlaceholders();
}

// 动态 placeholder 初始化
function initDynamicPlaceholders() {
    const panel = appState.editor.panelEl;
    if (!panel) return;

    // 查找所有带动态 placeholder 的 select
    const selects = panel.querySelectorAll('select[data-dynamic-placeholder-target]');
    selects.forEach(select => {
        updateDynamicPlaceholderForSelect(select);
        // 监听变化事件（避免重复绑定）
        select.removeEventListener('change', handleDynamicPlaceholderChange);
        select.addEventListener('change', handleDynamicPlaceholderChange);
    });
}

// 动态 placeholder 变化事件处理函数
function handleDynamicPlaceholderChange(event) {
    updateDynamicPlaceholderForSelect(event.target);
}

// 更新单个 select 的目标 input 的 placeholder
function updateDynamicPlaceholderForSelect(select) {
    const targetId = select.dataset.dynamicPlaceholderTarget;
    if (!targetId) return;

    const targetInput = document.getElementById(targetId);
    if (!targetInput) return;

    const selectedValue = select.value;
    const localPlaceholder = select.dataset.placeholderLocal || '';
    const onlinePlaceholder = select.dataset.placeholderOnline || '';

    targetInput.placeholder = selectedValue === 'online' ? onlinePlaceholder : localPlaceholder;
}

function updateOptionalGroupReadonlyState(groupKey) {
    if (!appState.editor.panelEl) return;
    const groupFields = appState.editor.panelEl.querySelector(`[data-editor-group-fields="${groupKey}"]`);
    if (!groupFields) return;

    const isEnabled = Boolean(appState.editor.toggles[groupKey]);
    groupFields.classList.toggle('is-disabled', !isEnabled);

    const controls = groupFields.querySelectorAll('input, textarea, select, button');
    controls.forEach(control => {
        control.disabled = !isEnabled;
    });

    const colorToggleControls = groupFields.querySelectorAll('[data-editor-color-toggle]');
    colorToggleControls.forEach(control => {
        const colorPath = control.dataset.editorColorToggle;
        if (!colorPath) return;
        updateColorFieldReadonlyState(colorPath);
    });
}

function updateColorFieldReadonlyState(colorPath) {
    if (!appState.editor.panelEl || !colorPath) return;

    const colorInput = appState.editor.panelEl.querySelector(`[data-editor-path="${colorPath}"]`);
    if (!colorInput) return;

    const groupFields = colorInput.closest('[data-editor-group-fields]');
    const groupKey = groupFields ? groupFields.dataset.editorGroupFields : '';
    const groupEnabled = groupKey ? Boolean(appState.editor.toggles[groupKey]) : true;
    const colorEnabled = isColorFieldToggleEnabled(appState.editor.colorToggles, colorPath);
    const shouldEnable = groupEnabled && colorEnabled;

    colorInput.disabled = !shouldEnable;

    const colorFieldRow = colorInput.closest('.editor-color-field');
    if (colorFieldRow) {
        colorFieldRow.classList.toggle('is-disabled', !shouldEnable);
    }
}

/**
 * 更新导出 Manifest 按钮的状态（校验必要条件）
 */
function updateManifestExportButtonState() {
    const panel = appState.editor.panelEl;
    if (!panel) return;

    const btn = panel.querySelector('[data-editor-action="export-manifest"]');
    if (!btn) return;

    const data = appState.editor.data || {};
    const siteName = trimToString(data.siteName);
    const icons = data.webAppIcons || {};
    const icon192 = trimToString(icons.icon192);
    const icon512 = trimToString(icons.icon512);

    const missing = [];
    if (!siteName) missing.push('网站名称 (siteName)');
    if (!icon192) missing.push('192px 图标 (webAppIcons.icon192)');
    if (!icon512) missing.push('512px 图标 (webAppIcons.icon512)');

    const isValid = missing.length === 0;
    btn.disabled = !isValid;

    if (isValid) {
        btn.title = '导出 site.webmanifest 文件';
        btn.style.opacity = '';
        btn.style.cursor = '';
    } else {
        btn.title = `请先配置以下必要信息以导出清单文件：\n- ${missing.join('\n- ')}`;
        btn.style.opacity = '0.5';
        btn.style.cursor = 'not-allowed';
    }
}

function getEditableCategoryByIndex(categoryIndex) {
    if (!appState.editor.data || !Array.isArray(appState.editor.data.categories)) return null;
    if (!Number.isInteger(categoryIndex) || categoryIndex < 0) return null;
    return appState.editor.data.categories[categoryIndex] || null;
}

function openEditorModalForm(config = {}) {
    if (!appState.editor.modalLayerEl) return Promise.resolve(null);

    if (appState.editor.modalResolver) {
        const previousResolver = appState.editor.modalResolver;
        appState.editor.modalResolver = null;
        previousResolver(null);
    }

    const modalLayer = appState.editor.modalLayerEl;
    const titleEl = modalLayer.querySelector('#editorModalTitle');
    const descEl = modalLayer.querySelector('#editorModalDesc');
    const fieldsEl = modalLayer.querySelector('#editorModalFields');
    const errorEl = modalLayer.querySelector('#editorModalError');
    const submitBtn = modalLayer.querySelector('#editorModalSubmit');

    const title = trimToString(config.title);
    const description = trimToString(config.description);
    const submitText = trimToString(config.submitText) || '保存';
    const fields = Array.isArray(config.fields) ? config.fields : [];

    if (titleEl) titleEl.textContent = title || '编辑';
    if (descEl) {
        descEl.textContent = description;
        descEl.style.display = description ? '' : 'none';
    }
    if (submitBtn) {
        submitBtn.textContent = submitText;
    }
    if (errorEl) {
        errorEl.textContent = '';
    }

    appState.editor.modalFields = fields;

    if (fieldsEl) {
        fieldsEl.innerHTML = '';
        fields.forEach(field => {
            const name = trimToString(field.name);
            if (!name) return;

            const isLabelable = field.type !== 'submenu-editor' && field.type !== 'textarea';
            const wrapper = document.createElement(isLabelable ? 'label' : 'div');
            wrapper.className = 'editor-modal-field' + (field.width === 'half' ? ' is-half' : '');

            const caption = document.createElement('span');
            caption.className = 'editor-modal-field-label';
            caption.textContent = field.required ? `${field.label} *` : field.label;
            wrapper.appendChild(caption);

            let inputEl;
            if (field.type === 'textarea') {
                inputEl = document.createElement('textarea');
                if (Number.isFinite(field.rows)) {
                    inputEl.rows = Math.max(2, Number(field.rows));
                } else {
                    inputEl.rows = 3;
                }
            } else if (field.type === 'select') {
                inputEl = document.createElement('select');
                const options = Array.isArray(field.options) ? field.options : [];
                options.forEach(opt => {
                    const optEl = document.createElement('option');
                    optEl.value = opt.value;
                    optEl.textContent = opt.text || opt.value;
                    if (opt.value === field.value) optEl.selected = true;
                    inputEl.appendChild(optEl);
                });
            } else {
                inputEl = document.createElement('input');
                inputEl.type = trimToString(field.type) || 'text';
                // 针对密码字段，禁用浏览器自动保存/填充建议
                if (inputEl.type === 'password') {
                    inputEl.autocomplete = 'new-password';
                }
            }

            if (field.autocomplete) {
                inputEl.autocomplete = field.autocomplete;
            }

            inputEl.name = name;
            inputEl.value = field.value === undefined || field.value === null ? '' : String(field.value);
            inputEl.placeholder = trimToString(field.placeholder);
            if (field.required) inputEl.dataset.required = 'true';

            if (field.type === 'submenu-editor') {
                const subEditor = document.createElement('div');
                subEditor.className = 'submenu-editor-container';
                subEditor.innerHTML = `
                    <div class="submenu-editor-list" id="modalSubmenuList">
                        ${(field.value || []).map((child, i) => renderSubmenuEditorRow(child, i)).join('')}
                    </div>
                    <button type="button" class="submenu-add-btn" id="modalAddSubmenu">+ 增加子菜单</button>
                `;
                wrapper.appendChild(subEditor);
                // 延时绑定事件，确保 DOM 已插入
                setTimeout(() => initModalSubmenuEditorActions(), 0);
            } else {
                // 如果是图标字段，增加包装层和纠正按钮
                if (field.name === 'icon') {
                    const inputWrapper = document.createElement('div');
                    inputWrapper.className = 'editor-field-wrapper';

                    const fixBtn = document.createElement('button');
                    fixBtn.type = 'button';
                    fixBtn.className = 'editor-field-fix-btn';
                    fixBtn.textContent = '纠正';
                    fixBtn.onclick = (e) => {
                        e.preventDefault();
                        const corrected = correctIconValue(inputEl.value);
                        if (corrected !== inputEl.value) {
                            inputEl.value = corrected;
                            // 触发一次 change 事件以更新状态
                            inputEl.dispatchEvent(new Event('change', { bubbles: true }));
                        }
                    };

                    inputWrapper.appendChild(inputEl);
                    inputWrapper.appendChild(fixBtn);
                    wrapper.appendChild(inputWrapper);
                } else {
                    wrapper.appendChild(inputEl);
                }
            }

            fieldsEl.appendChild(wrapper);
        });
    }

    modalLayer.classList.add('is-open');
    modalLayer.setAttribute('aria-hidden', 'false');
    document.body.classList.add('editor-modal-open');

    const firstInput = modalLayer.querySelector('#editorModalFields input, #editorModalFields textarea, #editorModalFields select');

    return new Promise(resolve => {
        appState.editor.modalResolver = resolve;
        window.requestAnimationFrame(() => {
            if (firstInput) firstInput.focus();
        });
    });
}

function closeEditorModal(result) {
    const modalLayer = appState.editor.modalLayerEl;
    if (modalLayer) {
        modalLayer.classList.remove('is-open');
        modalLayer.setAttribute('aria-hidden', 'true');
    }
    document.body.classList.remove('editor-modal-open');

    const resolver = appState.editor.modalResolver;
    appState.editor.modalResolver = null;
    appState.editor.modalFields = [];

    if (typeof resolver === 'function') {
        resolver(result);
    }
}

function handleEditorModalSubmit(event) {
    event.preventDefault();

    const modalLayer = appState.editor.modalLayerEl;
    if (!modalLayer) return;

    const form = event.currentTarget;
    const errorEl = modalLayer.querySelector('#editorModalError');
    const values = {};
    let firstInvalid = null;
    let invalidLabel = '';

    appState.editor.modalFields.forEach(field => {
        const name = trimToString(field.name);
        if (!name) return;
        if (field.type === 'submenu-editor') {
            const submenuRows = modalLayer.querySelectorAll('.submenu-editor-item');
            const children = [];
            submenuRows.forEach(row => {
                const name = row.querySelector('.sub-name').value.trim();
                const url = row.querySelector('.sub-url').value.trim();
                const target = row.querySelector('.sub-target').value;
                if (name || url) {
                    children.push({ name, url, target });
                }
            });
            values[name] = children;
            return;
        }

        const inputEl = form.elements.namedItem(name);
        const rawValue = inputEl ? String(inputEl.value || '') : '';
        values[name] = rawValue;

        if (field.required && !rawValue.trim() && !firstInvalid) {
            firstInvalid = inputEl;
            invalidLabel = trimToString(field.label) || name;
        }
    });

    if (firstInvalid) {
        if (errorEl) {
            errorEl.textContent = `${invalidLabel}不能为空`;
        }
        firstInvalid.focus();
        return;
    }

    if (errorEl) {
        errorEl.textContent = '';
    }

    closeEditorModal(values);
}

async function promptCategoryName(defaultValue = '') {
    const values = await openEditorModalForm({
        title: '分类设置',
        description: '请输入分类名称。',
        submitText: '保存分类',
        fields: [
            {
                name: 'name',
                label: '分类名称',
                type: 'text',
                required: true,
                placeholder: '例如：常用工具',
                value: defaultValue,
            },
        ],
    });

    if (!values) return null;
    const trimmed = trimToString(values.name);
    return trimmed || null;
}

async function promptLinkData(defaultItem = {}) {
    const defaultKeywords = Array.isArray(defaultItem.keywords)
        ? defaultItem.keywords.join(',')
        : (defaultItem.keywords || '');

    const values = await openEditorModalForm({
        title: '链接设置',
        description: '请填写链接信息，名称和地址为必填。',
        submitText: '保存链接',
        fields: [
            {
                name: 'name',
                label: '名称',
                type: 'text',
                required: true,
                placeholder: '例如：GitHub',
                value: defaultItem.name || '',
            },
            {
                name: 'url',
                label: 'URL',
                type: 'text',
                required: true,
                placeholder: 'https://',
                value: defaultItem.url || '',
            },
            {
                name: 'title',
                label: '描述',
                type: 'textarea',
                rows: 3,
                placeholder: '鼠标悬停时显示的描述',
                value: defaultItem.title || '',
            },
            {
                name: 'icon',
                label: '图标',
                type: 'text',
                placeholder: 'icon 名称 / 图片 URL',
                value: defaultItem.icon || '',
            },
            {
                name: 'keywords',
                label: '关键词',
                type: 'text',
                placeholder: '逗号分隔，例如：代码,仓库,开发',
                value: defaultKeywords,
            },
        ],
    });

    if (!values) return null;

    return {
        name: trimToString(values.name),
        url: trimToString(values.url),
        title: trimToString(values.title),
        icon: trimToString(values.icon),
        keywords: trimToString(values.keywords),
    };
}

async function addCategoryFromEditor() {
    if (!appState.editor.data) return;
    const name = await promptCategoryName('新分类');
    if (!name) return;

    appState.editor.data.categories.push({
        name,
        items: [],
    });

    applyEditorPreview();
}

async function editCategoryFromEditor(categoryIndex) {
    const category = getEditableCategoryByIndex(categoryIndex);
    if (!category) return;

    const name = await promptCategoryName(category.name || '');
    if (!name) return;
    category.name = name;

    applyEditorPreview();
}

function deleteCategoryFromEditor(categoryIndex) {
    if (!appState.editor.data || !Array.isArray(appState.editor.data.categories)) return;
    if (!Number.isInteger(categoryIndex) || categoryIndex < 0) return;
    const category = appState.editor.data.categories[categoryIndex];
    if (!category) return;

    const confirmDelete = window.confirm(`确定删除分类「${category.name || `分类 ${categoryIndex + 1}`}」吗？`);
    if (!confirmDelete) return;

    appState.editor.data.categories.splice(categoryIndex, 1);
    applyEditorPreview();
}

async function addLinkFromEditor(categoryIndex) {
    const category = getEditableCategoryByIndex(categoryIndex);
    if (!category) return;

    const newItem = await promptLinkData({
        name: '',
        url: '',
        title: '',
        icon: '',
        keywords: '',
    });
    if (!newItem) return;

    category.items.push(newItem);
    applyEditorPreview();
}

function getEditableItem(categoryIndex, itemIndex) {
    const category = getEditableCategoryByIndex(categoryIndex);
    if (!category || !Array.isArray(category.items)) return null;
    if (!Number.isInteger(itemIndex) || itemIndex < 0) return null;
    return category.items[itemIndex] || null;
}

async function editLinkFromEditor(categoryIndex, itemIndex) {
    const item = getEditableItem(categoryIndex, itemIndex);
    if (!item) return;

    const updatedItem = await promptLinkData(item);
    if (!updatedItem) return;
    appState.editor.data.categories[categoryIndex].items[itemIndex] = updatedItem;
    applyEditorPreview();
}

function deleteLinkFromEditor(categoryIndex, itemIndex) {
    const category = getEditableCategoryByIndex(categoryIndex);
    if (!category) return;

    const item = getEditableItem(categoryIndex, itemIndex);
    if (!item) return;

    const confirmDelete = window.confirm(`确定删除链接「${item.name || '未命名链接'}」吗？`);
    if (!confirmDelete) return;

    category.items.splice(itemIndex, 1);
    applyEditorPreview();
}

function handleEditorNavClick(event) {
    if (!appState.editor.active) return;

    const actionTarget = event.target.closest('[data-editor-action]');
    if (actionTarget) {
        event.preventDefault();
        event.stopPropagation();
        void executeEditorAction(actionTarget.dataset.editorAction, actionTarget.dataset);
        return;
    }

    const navCard = event.target.closest('.nav-card');
    if (navCard) {
        event.preventDefault();
    }
}

function handleEditorDragStart(event) {
    if (!appState.editor.active || !appState.editor.data) return;

    const categoryHandle = event.target.closest('.category-drag-handle');
    if (categoryHandle) {
        const categoryIndex = Number(categoryHandle.dataset.categoryIndex);
        if (!Number.isInteger(categoryIndex)) return;

        appState.editor.drag = {
            type: 'category',
            categoryIndex,
        };

        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', `category:${categoryIndex}`);
        document.body.classList.add('is-editor-dragging');
        return;
    }

    const navLinkWrapper = event.target.closest('.header-link-wrapper');
    if (navLinkWrapper) {
        const index = Number(navLinkWrapper.dataset.index);
        if (!Number.isInteger(index)) return;

        appState.editor.drag = {
            type: 'navLink',
            index,
        };

        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', `navLink:${index}`);
        document.body.classList.add('is-editor-dragging');
        return;
    }

    const navCard = event.target.closest('.nav-card');
    if (!navCard) return;

    const fromCategoryIndex = Number(navCard.dataset.categoryIndex);
    const fromItemIndex = Number(navCard.dataset.itemIndex);
    if (!Number.isInteger(fromCategoryIndex) || !Number.isInteger(fromItemIndex)) return;

    appState.editor.drag = {
        type: 'item',
        fromCategoryIndex,
        fromItemIndex,
    };

    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', `item:${fromCategoryIndex}:${fromItemIndex}`);
    navCard.classList.add('is-dragging');
    document.body.classList.add('is-editor-dragging');
}

function handleEditorDragOver(event) {
    if (!appState.editor.active || !appState.editor.drag) return;

    if (appState.editor.drag.type === 'category') {
        const category = event.target.closest('.category');
        if (!category) return;

        event.preventDefault();
        clearEditorDropIndicators();
        category.classList.add('is-drop-target');
        return;
    }

    if (appState.editor.drag.type === 'item') {
        const targetCard = event.target.closest('.nav-card');
        const targetGrid = event.target.closest('.nav-grid');
        if (!targetCard && !targetGrid) return;

        event.preventDefault();
        clearEditorDropIndicators();

        if (targetCard) {
            targetCard.classList.add('is-drop-target');
        } else if (targetGrid) {
            targetGrid.classList.add('is-drop-target-grid');
        }
        return;
    }

    if (appState.editor.drag.type === 'navLink') {
        const target = event.target.closest('.header-link-wrapper');
        if (!target) return;

        event.preventDefault();
        clearEditorDropIndicators();
        target.classList.add('is-drag-over');
    }
}

function handleEditorDrop(event) {
    if (!appState.editor.active || !appState.editor.drag || !appState.editor.data) return;

    event.preventDefault();

    if (appState.editor.drag.type === 'category') {
        const targetCategory = event.target.closest('.category');
        if (!targetCategory) {
            clearEditorDragState();
            return;
        }

        const fromIndex = appState.editor.drag.categoryIndex;
        const toIndex = Number(targetCategory.dataset.categoryIndex);
        if (!Number.isInteger(fromIndex) || !Number.isInteger(toIndex) || fromIndex === toIndex) {
            clearEditorDragState();
            return;
        }

        const categories = appState.editor.data.categories;
        const [moved] = categories.splice(fromIndex, 1);
        if (!moved) {
            clearEditorDragState();
            return;
        }
        categories.splice(toIndex, 0, moved);

        clearEditorDragState();
        applyEditorPreview();
        return;
    }

    if (appState.editor.drag.type === 'navLink') {
        const targetNav = event.target.closest('.header-link-wrapper');
        if (!targetNav) {
            clearEditorDragState();
            return;
        }

        const fromIndex = appState.editor.drag.index;
        const toIndex = Number(targetNav.dataset.index);

        if (!Number.isInteger(fromIndex) || !Number.isInteger(toIndex) || fromIndex === toIndex) {
            clearEditorDragState();
            return;
        }

        const navLinks = appState.editor.data.navLinks;
        const [moved] = navLinks.splice(fromIndex, 1);
        if (!moved) {
            clearEditorDragState();
            return;
        }
        navLinks.splice(toIndex, 0, moved);

        clearEditorDragState();
        onNavLinksChange();
        return;
    }

    if (appState.editor.drag.type === 'item') {
        const targetCard = event.target.closest('.nav-card');
        const targetGrid = event.target.closest('.nav-grid');
        if (!targetCard && !targetGrid) {
            clearEditorDragState();
            return;
        }

        const categories = appState.editor.data.categories;
        const sourceCategoryIndex = appState.editor.drag.fromCategoryIndex;
        const sourceItemIndex = appState.editor.drag.fromItemIndex;
        if (!Number.isInteger(sourceCategoryIndex) || !Number.isInteger(sourceItemIndex)) {
            clearEditorDragState();
            return;
        }

        const sourceCategory = categories[sourceCategoryIndex];
        if (!sourceCategory || !Array.isArray(sourceCategory.items)) {
            clearEditorDragState();
            return;
        }

        const [movedItem] = sourceCategory.items.splice(sourceItemIndex, 1);
        if (!movedItem) {
            clearEditorDragState();
            return;
        }

        let targetCategoryIndex;
        let targetItemIndex;
        if (targetCard) {
            targetCategoryIndex = Number(targetCard.dataset.categoryIndex);
            targetItemIndex = Number(targetCard.dataset.itemIndex);
        } else {
            targetCategoryIndex = Number(targetGrid.dataset.categoryIndex);
            targetItemIndex = Number.MAX_SAFE_INTEGER;
        }

        if (!Number.isInteger(targetCategoryIndex) || !categories[targetCategoryIndex]) {
            sourceCategory.items.splice(sourceItemIndex, 0, movedItem);
            clearEditorDragState();
            return;
        }

        const targetItems = categories[targetCategoryIndex].items;
        let insertAt = Number.isInteger(targetItemIndex) ? targetItemIndex : targetItems.length;

        if (sourceCategoryIndex === targetCategoryIndex && sourceItemIndex < insertAt) {
            insertAt -= 1;
        }

        if (insertAt < 0) insertAt = 0;
        if (insertAt > targetItems.length) insertAt = targetItems.length;

        targetItems.splice(insertAt, 0, movedItem);

        clearEditorDragState();
        applyEditorPreview();
    }
}

function clearEditorDropIndicators() {
    document.querySelectorAll('.is-drop-target').forEach(node => node.classList.remove('is-drop-target'));
    document.querySelectorAll('.is-drop-target-grid').forEach(node => node.classList.remove('is-drop-target-grid'));
    document.querySelectorAll('.is-drag-over').forEach(node => node.classList.remove('is-drag-over'));
}

function clearEditorDragState() {
    clearEditorDropIndicators();
    document.querySelectorAll('.nav-card.is-dragging').forEach(node => node.classList.remove('is-dragging'));
    document.querySelectorAll('.category.is-drop-target').forEach(node => node.classList.remove('is-drop-target'));
    document.body.classList.remove('is-editor-dragging');
    appState.editor.drag = null;
}

function downloadJsonFile(fileName, payload, mimeType = 'application/json;charset=utf-8') {
    const json = JSON.stringify(payload, null, 2);
    const blob = new Blob([json], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function inferImageMimeType(iconPath) {
    const path = trimToString(iconPath).toLowerCase();
    if (/\.(jpe?g)(\?.*)?$/.test(path)) return 'image/jpeg';
    if (/\.(webp)(\?.*)?$/.test(path)) return 'image/webp';
    if (/\.(gif)(\?.*)?$/.test(path)) return 'image/gif';
    if (/\.(ico)(\?.*)?$/.test(path)) return 'image/x-icon';
    return 'image/png';
}

function buildSiteManifestFromConfig(config) {
    const safeConfig = config && typeof config === 'object' ? config : {};
    const safeTheme = safeConfig.theme && typeof safeConfig.theme === 'object' ? safeConfig.theme : {};
    const rootStyles = window.getComputedStyle(document.documentElement);
    const defaultPrimaryColor = trimToString(rootStyles.getPropertyValue('--primary-color'));
    const defaultBgColor = trimToString(rootStyles.getPropertyValue('--bg-color'));

    const siteName = trimToString(safeConfig.siteName) || trimToString(document.title) || '默默导航';
    const shortName = trimToString(safeConfig.footerName) || siteName;
    const themeColor = sanitizeThemeColor(safeTheme.primaryColor || safeTheme.primary)
        || sanitizeThemeColor(defaultPrimaryColor)
        || '#fe902a';
    const backgroundColor = sanitizeThemeColor(safeTheme.bgColor)
        || sanitizeThemeColor(defaultBgColor)
        || '#f7f7f7';

    const iconLinks = normalizeWebAppIconsConfig(safeConfig.webAppIcons);
    const fallback192 = trimToString(document.getElementById('favicon192')?.getAttribute('href'));
    const fallback512 = trimToString(document.getElementById('favicon512')?.getAttribute('href'));
    const icon192 = iconLinks.icon192 || fallback192;
    const icon512 = iconLinks.icon512 || fallback512;
    const icons = [];

    if (icon192) {
        icons.push({
            src: icon192,
            sizes: '192x192',
            type: inferImageMimeType(icon192),
        });
    }

    if (icon512) {
        icons.push({
            src: icon512,
            sizes: '512x512',
            type: inferImageMimeType(icon512),
        });
    }

    return {
        name: siteName,
        short_name: shortName,
        start_url: '.',
        display: 'standalone',
        background_color: backgroundColor,
        theme_color: themeColor,
        icons,
    };
}

async function exportEditorConfig() {
    const verified = await verifyEditorPassword('导出配置文件');
    if (!verified) return;

    const editorState = buildConfigFromEditorState();
    // 合并保留的额外数据，确保 customFeatures 等字段被导出
    const payload = {
        ...editorState,
        ...(appState.extraData || {})
    };
    downloadJsonFile('momo-nav.json', payload);
}

function exportSiteManifest() {
    const config = buildConfigFromEditorState();
    const manifestPayload = buildSiteManifestFromConfig(config);
    downloadJsonFile('site.webmanifest', manifestPayload, 'application/manifest+json;charset=utf-8');
}

function clearEditorDraftWithConfirm() {
    const confirmed = window.confirm('确定清除本地草稿并恢复文件配置吗？');
    if (!confirmed) return;

    localStorage.removeItem(EDITOR_DRAFT_KEY);
    window.location.reload();
}

// 重新定义 loadData，支持编辑草稿恢复
async function loadData() {
    const dataSources = ['momo-nav.json', 'example.json'];
    let loadedFrom = '';
    let lastError = null;
    let fileData = null;

    try {
        for (const dataUrl of dataSources) {
            try {
                console.log('开始加载导航数据:', dataUrl, '当前页面 URL:', window.location.href);
                const response = await fetch(dataUrl, { cache: 'no-cache' });
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status} ${response.statusText}`);
                }
                fileData = await response.json();
                loadedFrom = dataUrl;
                break;
            } catch (error) {
                lastError = error;
                console.warn(`导航数据加载失败，尝试下一个数据源: ${dataUrl}`, error);
            }
        }

        if (!fileData) {
            throw lastError || new Error('未找到可用的导航数据文件');
        }

        const usedDraft = applyEditorDraftState(fileData);
        appState.navData = buildConfigFromEditorState();

        // --- 核心修复：自动识别并保留所有非标准扩展字段 (如 customFeatures, toolbox 等) ---
        appState.extraData = {};
        const standardKeys = ['siteName', 'footerName', 'siteDescription', 'siteKeywords', 'logo', 'background', 'theme', 'iconfont', 'fontawesome', 'webAppIcons', 'navLinks', 'categories', 'cover'];
        Object.keys(fileData).forEach(key => {
            if (!standardKeys.includes(key)) {
                appState.extraData[key] = fileData[key];
                // 同时也挂载到 navData 上供前端脚本实时使用 (比如 customFeatures)
                appState.navData[key] = fileData[key];
            }
        });

        // 加载自定义功能并发布就绪事件
        if (appState.navData.customFeatures && typeof loadCustomFeatures === 'function') {
            loadCustomFeatures(appState.navData.customFeatures);
        }
        window.dispatchEvent(new CustomEvent('momo-nav-ready', { detail: appState.navData }));

        console.log(`导航数据加载成功（来源: ${usedDraft ? 'localStorage 草稿' : loadedFrom}），分类数:`, (appState.navData.categories || []).length);

        await refreshUiFromNavData();
        syncEditorFormFromState();
    } catch (error) {
        console.error('加载导航数据失败:', error);
        const container = document.getElementById('navContent');
        if (container) {
            container.innerHTML = `
            <div class="no-results">
                <div class="no-results-icon">⚠️</div>
                <p>加载数据失败，请检查 momo-nav.json 或 example.json 文件是否存在</p>
                <p>当前路径：${escapeHtml(window.location.href)}</p>
                <p style="font-size: 0.85rem; margin-top: 10px;">${escapeHtml(error.message)}</p>
                <p style="font-size: 0.75rem; color: #999; margin-top: 8px;">提示：请用 HTTP 服务打开页面（例如 Live Server 或 python -m http.server），不要直接使用 file:// 协议。</p>
            </div>
        `;
        }
    }

    console.log('默默导航 - github.com/hcllmsx/momo-nav');
    console.log('按 Ctrl + F9 进入编辑模式');
}

// 重新定义 Iconfont 加载：支持编辑模式动态切换 URL
function loadIconfont(iconfontConfig) {
    return new Promise((resolve, reject) => {
        if (!iconfontConfig) {
            resolve();
            return;
        }

        let url = '';
        const iconType = trimToString(iconfontConfig.type).toLowerCase();
        const iconUrl = trimToString(iconfontConfig.url);

        if (iconType === 'local') {
            if (!iconUrl) {
                reject(new Error('Iconfont 本地路径为空'));
                return;
            }
            url = `${iconUrl.replace(/\/$/, '')}/iconfont.js`;
        } else {
            url = normalizeIconfontUrl(iconUrl);
        }

        if (!url) {
            reject(new Error('Iconfont URL 为空'));
            return;
        }

        if (appState.iconfontLoaded && appState.loadedIconfontUrl === url) {
            resolve();
            return;
        }

        const existingScript = document.querySelector(`script[src="${url}"]`);
        if (existingScript) {
            appState.iconfontLoaded = true;
            appState.loadedIconfontUrl = url;
            resolve();
            return;
        }

        const script = document.createElement('script');
        script.src = url;
        script.dataset.iconfontScript = 'true';
        script.onload = () => {
            appState.iconfontLoaded = true;
            appState.loadedIconfontUrl = url;
            console.log('Iconfont 加载成功:', url);
            resolve();
        };
        script.onerror = () => {
            console.error('Iconfont 加载失败:', url);
            reject(new Error('Iconfont 加载失败'));
        };

        const loader = document.getElementById('iconfontLoader');
        if (loader && loader.parentNode) {
            loader.parentNode.insertBefore(script, loader.nextSibling);
        } else {
            document.head.appendChild(script);
        }
    });
}

// 加载 Font Awesome
function loadFontawesome(fontawesomeConfig) {
    return new Promise((resolve, reject) => {
        const rawType = trimToString(fontawesomeConfig.type).toLowerCase();
        const iconType = rawType === 'online' ? 'online' : 'local';
        let url = trimToString(fontawesomeConfig.url);

        if (!url) {
            reject(new Error('Font Awesome URL 为空'));
            return;
        }

        // 本地模式：自动补全 all.min.css 路径
        if (iconType === 'local') {
            url = url.replace(/\/$/, '');
            if (!/\.css$/i.test(url)) {
                url = `${url}/all.min.css`;
            }
        }

        // 检查是否已加载相同 URL
        if (appState.loadedFontawesomeUrl === url) {
            resolve();
            return;
        }

        // 移除旧的 Font Awesome 链接
        unloadFontawesome();

        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = url;
        link.dataset.fontawesomeStylesheet = 'true';
        link.onload = () => {
            appState.loadedFontawesomeUrl = url;
            console.log('Font Awesome 加载成功:', url);
            resolve();
        };
        link.onerror = () => {
            console.error('Font Awesome 加载失败:', url);
            reject(new Error('Font Awesome 加载失败'));
        };

        document.head.appendChild(link);
    });
}

// 卸载 Font Awesome
function unloadFontawesome() {
    const existingLink = document.querySelector('link[data-fontawesome-stylesheet="true"]');
    if (existingLink) {
        existingLink.remove();
    }
    appState.loadedFontawesomeUrl = '';
}

// 重新定义渲染：编辑模式下支持可视化增删改与拖拽
function renderNav(data, searchTerm = '') {
    const container = document.getElementById('navContent');
    const sidebar = document.getElementById('categorySidebar');
    if (!container || !sidebar) return;

    if (!data || !Array.isArray(data.categories)) {
        container.innerHTML = '<p style="text-align: center; color: #999;">暂无数据</p>';
        sidebar.innerHTML = '';
        return;
    }

    const effectiveSearchTerm = appState.editor.active ? '' : searchTerm;
    let html = '';
    let sidebarHtml = '';
    let hasResults = false;

    data.categories.forEach((category, categoryIndex) => {
        const safeItems = Array.isArray(category.items) ? category.items : [];
        const filteredItems = effectiveSearchTerm
            ? safeItems.filter(item => itemMatchesSearch(item, effectiveSearchTerm))
            : safeItems;

        if (!appState.editor.active && filteredItems.length === 0) return;
        hasResults = true;

        const catId = `category-${categoryIndex}`;
        const categoryName = trimToString(category.name) || `分类 ${categoryIndex + 1}`;
        const categoryTools = appState.editor.active ? `
            <span class="category-editor-tools">
                <button type="button" class="editor-inline-btn" data-editor-action="add-link" data-category-index="${categoryIndex}">+ 链接</button>
                <button type="button" class="editor-inline-btn" data-editor-action="edit-category" data-category-index="${categoryIndex}">重命名</button>
                <button type="button" class="editor-inline-btn danger" data-editor-action="delete-category" data-category-index="${categoryIndex}">删除</button>
                <button type="button" class="editor-inline-btn category-drag-handle" draggable="true" data-category-index="${categoryIndex}" title="拖拽排序">拖拽排序</button>
            </span>
        ` : '';

        html += `
            <section class="category${appState.editor.active ? ' editor-category' : ''}" id="${catId}" data-category-index="${categoryIndex}">
                <h2 class="category-title">
                    <span class="category-title-text">${escapeHtml(categoryName)}</span>
                    <span class="category-count">(${filteredItems.length})</span>
                    ${categoryTools}
                </h2>
                <div class="nav-grid" data-category-index="${categoryIndex}">
                    ${filteredItems.map((item, itemIndex) => createNavCard(item, categoryIndex, itemIndex)).join('')}
                    ${appState.editor.active ? `<button type="button" class="editor-add-link-tile" data-editor-action="add-link" data-category-index="${categoryIndex}">+ 新增链接</button>` : ''}
                </div>
            </section>
        `;

        sidebarHtml += `<a class="sidebar-link" data-target="${catId}">${escapeHtml(categoryName)}</a>`;
    });

    if (!hasResults) {
        html = `
            <div class="no-results">
                <div class="no-results-icon">🔍</div>
                <p>没有找到匹配 "${escapeHtml(searchTerm)}" 的结果</p>
            </div>
        `;
        sidebarHtml = '';
    }

    if (appState.editor.active) {
        sidebarHtml = `
            <button type="button" class="sidebar-add-category-btn" data-editor-action="add-category">+ 新增分类</button>
            ${sidebarHtml}
        `;
    }

    container.innerHTML = html;
    sidebar.innerHTML = sidebarHtml;

    if (typeof window.refreshCategorySidebarSticky === 'function') {
        window.refreshCategorySidebarSticky();
    }

    if (hasResults) {
        setupSidebar();
    }
}

function createNavCard(item, categoryIndex, itemIndex) {
    const iconHtml = getIconHtml(item.icon);
    const name = trimToString(item.name) || '未命名链接';
    const title = trimToString(item.title) || name;
    const url = trimToString(item.url) || '#';
    const editable = appState.editor.active;

    return `
        <a href="${escapeHtml(url)}"
           class="nav-card${editable ? ' editor-nav-card' : ''}"
           title="${escapeHtml(title)}"
           target="_blank"
           rel="nofollow noopener noreferrer"
           ${editable ? `draggable="true" data-category-index="${categoryIndex}" data-item-index="${itemIndex}"` : ''}>
            <div class="nav-icon">${iconHtml}</div>
            <div class="nav-name">${escapeHtml(name)}</div>
            ${editable ? `
                <div class="card-editor-actions">
                    <button type="button" class="editor-inline-btn" data-editor-action="edit-link" data-category-index="${categoryIndex}" data-item-index="${itemIndex}">编辑</button>
                    <button type="button" class="editor-inline-btn danger" data-editor-action="delete-link" data-category-index="${categoryIndex}" data-item-index="${itemIndex}">删除</button>
                </div>
            ` : ''}
        </a>
    `;
}

// 初始化右上角头部下拉菜单
// --- 顶部导航菜单编辑器逻辑 ---

function renderSubmenuEditorRow(child = {}, index) {
    return `
        <div class="submenu-editor-item" draggable="true" data-index="${index}">
            <div class="submenu-drag-handle">≡</div>
            <input type="text" class="sub-name" placeholder="名称" value="${escapeHtml(child.name || '')}">
            <input type="text" class="sub-url" placeholder="链接" value="${escapeHtml(child.url || '')}">
            <select class="sub-target">
                <option value="_self" ${child.target === '_self' ? 'selected' : ''}>_self</option>
                <option value="_blank" ${child.target === '_blank' ? 'selected' : ''}>_blank</option>
            </select>
            <div class="delete-btn" title="删除">×</div>
        </div>
    `;
}

function initModalSubmenuEditorActions() {
    const list = document.getElementById('modalSubmenuList');
    const addBtn = document.getElementById('modalAddSubmenu');
    if (!list || !addBtn) return;

    addBtn.onclick = () => {
        const index = list.querySelectorAll('.submenu-editor-item').length;
        const rowHtml = renderSubmenuEditorRow({}, index);
        const temp = document.createElement('div');
        temp.innerHTML = rowHtml;
        list.appendChild(temp.firstElementChild);
    };

    list.addEventListener('click', (e) => {
        const deleteBtn = e.target.closest('.delete-btn');
        if (deleteBtn) {
            e.preventDefault();
            e.stopPropagation();
            const item = deleteBtn.closest('.submenu-editor-item');
            if (item) {
                console.log('Deleting submenu item', item.dataset.index);
                item.remove();
            }
        }
    });

    // 子菜单内部拖拽排序
    list.ondragstart = (e) => {
        const item = e.target.closest('.submenu-editor-item');
        if (item) {
            appState.editor.modalDragIndex = Array.from(list.children).indexOf(item);
            e.dataTransfer.effectAllowed = 'move';
        }
    };

    list.ondragover = (e) => {
        e.preventDefault();
        const item = e.target.closest('.submenu-editor-item');
        if (item) {
            item.style.borderTop = '2px solid var(--primary-color)';
        }
    };

    list.ondragleave = (e) => {
        const item = e.target.closest('.submenu-editor-item');
        if (item) {
            item.style.borderTop = '';
        }
    };

    list.ondrop = (e) => {
        e.preventDefault();
        const item = e.target.closest('.submenu-editor-item');
        if (item) {
            item.style.borderTop = '';
            const toIndex = Array.from(list.children).indexOf(item);
            const fromIndex = appState.editor.modalDragIndex;
            if (fromIndex !== toIndex && fromIndex !== -1) {
                const rows = Array.from(list.children);
                const moved = rows.splice(fromIndex, 1)[0];
                list.innerHTML = '';
                rows.splice(toIndex, 0, moved);
                rows.forEach(r => list.appendChild(r));
            }
        }
    };
}

async function handleAddNavLink() {
    const result = await openEditorModalForm({
        title: '新增导航菜单',
        fields: [
            { name: 'name', label: '菜单名称', type: 'text', value: '', required: true, width: 'half' },
            {
                name: 'target', label: '打开方式', type: 'select', value: '_self', width: 'half', options: [
                    { value: '_self', text: '当前窗口(_self)' },
                    { value: '_blank', text: '新窗口(_blank)' }
                ]
            },
            { name: 'url', label: '链接地址', type: 'text', value: '' },
            { name: 'children', label: '子菜单', type: 'submenu-editor', value: [] }
        ]
    });

    if (result) {
        if (!appState.editor.data.navLinks) appState.editor.data.navLinks = [];
        appState.editor.data.navLinks.push(result);
        onNavLinksChange();
    }
}

async function handleEditNavLink(index) {
    const navLinks = appState.editor.data.navLinks;
    const link = navLinks[index];
    if (!link) return;

    const result = await openEditorModalForm({
        title: '编辑导航菜单',
        fields: [
            { name: 'name', label: '菜单名称', type: 'text', value: link.name || '', required: true, width: 'half' },
            {
                name: 'target', label: '打开方式', type: 'select', value: link.target || '_self', width: 'half', options: [
                    { value: '_self', text: '当前窗口(_self)' },
                    { value: '_blank', text: '新窗口(_blank)' }
                ]
            },
            { name: 'url', label: '链接地址', type: 'text', value: link.url || '' },
            { name: 'children', label: '子菜单', type: 'submenu-editor', value: link.children || [] }
        ]
    });

    if (result) {
        navLinks[index] = result;
        onNavLinksChange();
    }
}

function handleDeleteNavLink(index) {
    const navLinks = appState.editor.data.navLinks;
    const name = navLinks[index].name;

    if (!window.confirm(`确定删除菜单项「${name}」吗？${navLinks[index].children && navLinks[index].children.length > 0 ? '这将同时删除其所有子菜单。' : ''}`)) {
        return;
    }

    navLinks.splice(index, 1);
    onNavLinksChange();
}

function onNavLinksChange() {
    applyEditorPreview();
}

// 渲染顶部和移动端导航菜单
function renderHeaderNav(navLinks) {
    const headerNav = document.getElementById('headerNav');
    const mobileMenuContent = document.getElementById('mobileMenuContent');

    if (!headerNav && !mobileMenuContent) return;

    const isEditMode = appState.editor.active;
    headerNav.className = `header-nav${isEditMode ? ' editor-mode' : ''}`;

    let desktopHtml = '';
    let mobileHtml = '';

    navLinks.forEach((link, index) => {
        const itemHtml = renderHeaderNavItem(link, index, isEditMode);
        desktopHtml += itemHtml;

        // 移动端处理
        if (link.children && link.children.length > 0) {
            mobileHtml += `
                <div class="mobile-menu-dropdown">
                    <button class="mobile-menu-link" type="button">${escapeHtml(link.name)}</button>
                    <div class="mobile-submenu">
                        ${link.children.map(child => `
                            <a href="${escapeHtml(child.url)}" target="${child.target || '_self'}">${escapeHtml(child.name)}</a>
                        `).join('')}
                    </div>
                </div>
            `;
        } else {
            const target = link.target || '_self';
            mobileHtml += `<a href="${escapeHtml(link.url)}" class="mobile-menu-link" target="${target}">${escapeHtml(link.name)}</a>`;
        }
    });

    if (isEditMode) {
        desktopHtml += `<button class="editor-add-nav-btn" data-editor-action="add-nav-link" type="button">+ 新增</button>`;
    }

    if (headerNav) headerNav.innerHTML = desktopHtml;
    if (mobileMenuContent) {
        mobileMenuContent.innerHTML = `
            <div class="mobile-menu-items">
                ${mobileHtml}
            </div>
            <div class="mobile-menu-footer">
                <a href="https://github.com/hcllmsx/momo-nav" target="_blank">MOMO-NAV</a>
                <div class="mobile-version-text">版本: ${APP_VERSION}</div>
            </div>
        `;
    }
}

function renderHeaderNavItem(link, index, isEditMode) {
    let html = '';
    const hasChildren = link.children && link.children.length > 0;

    if (hasChildren) {
        html = `
            <div class="header-dropdown">
                <a href="#" class="header-link">${escapeHtml(link.name)}</a>
                <div class="dropdown-menu">
                    ${link.children.map(child => `
                        <a href="${escapeHtml(child.url)}" target="${child.target || '_self'}">${escapeHtml(child.name)}</a>
                    `).join('')}
                </div>
            </div>
        `;
    } else {
        const target = link.target || '_self';
        html = `<a href="${escapeHtml(link.url)}" class="header-link" target="${target}">${escapeHtml(link.name)}</a>`;
    }

    if (isEditMode) {
        return `
            <div class="header-link-wrapper" draggable="true" data-index="${index}">
                <div class="header-link-actions">
                    <button type="button" data-editor-action="edit-nav-link" data-index="${index}">编辑</button>
                    <button type="button" data-editor-action="delete-nav-link" data-index="${index}">删除</button>
                </div>
                ${html}
            </div>
        `;
    }

    return html;
}

function initHeaderDropdown() {
    const headerDropdowns = document.querySelectorAll('.header-dropdown');

    headerDropdowns.forEach(dropdown => {
        const link = dropdown.querySelector('.header-link');
        if (!link) return;

        // 阻止点击下拉菜单父链接时的导航
        link.addEventListener('click', (e) => {
            if (dropdown.querySelector('.dropdown-menu')) {
                e.preventDefault();
            }
        });
    });

    // 在点击其他地方时关闭下拉菜单
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.header-nav')) {
            headerDropdowns.forEach(dropdown => {
                // 下拉菜单会通过CSS :hover自动关闭，这里仅作为备选方案
            });
        }
    });

    // 初始化移动端菜单
    initMobileMenu();
}

// 初始化移动端菜单
function initMobileMenu() {
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const mobileMenuPanel = document.getElementById('mobileMenuPanel');
    const mobileMenuOverlay = document.getElementById('mobileMenuOverlay');
    const mobileMenuDropdowns = document.querySelectorAll('.mobile-menu-dropdown');

    if (!mobileMenuBtn || !mobileMenuPanel) return;

    // 切换菜单打开/关闭状态
    const toggleMenu = (open) => {
        const isOpen = open !== undefined ? open : mobileMenuBtn.getAttribute('aria-expanded') === 'false';
        mobileMenuBtn.setAttribute('aria-expanded', isOpen);
        mobileMenuPanel.classList.toggle('active', isOpen);
        mobileMenuOverlay.classList.toggle('active', isOpen);

        // 同时锁定 html 和 body，防止移动端穿透滚动
        const overflowStyle = isOpen ? 'hidden' : '';
        document.body.style.overflow = overflowStyle;
        document.documentElement.style.overflow = overflowStyle;
    };

    // 点击菜单按钮
    mobileMenuBtn.addEventListener('click', () => {
        toggleMenu();
    });

    // 点击覆盖层关闭菜单
    mobileMenuOverlay.addEventListener('click', () => {
        toggleMenu(false);
    });

    // 移动端下拉菜单交互
    mobileMenuDropdowns.forEach(dropdown => {
        const button = dropdown.querySelector('.mobile-menu-link');
        const submenu = dropdown.querySelector('.mobile-submenu');

        if (!button || !submenu) return;

        button.addEventListener('click', (e) => {
            e.preventDefault();
            dropdown.classList.toggle('active');
        });

        // 点击子菜单项关闭菜单
        const submenuLinks = submenu.querySelectorAll('a');
        submenuLinks.forEach(link => {
            link.addEventListener('click', () => {
                toggleMenu(false);
            });
        });
    });

    // 点击非下拉菜单的链接关闭菜单
    const regularLinks = mobileMenuPanel.querySelectorAll('.mobile-menu-link:not(.mobile-menu-dropdown .mobile-menu-link)');
    regularLinks.forEach(link => {
        if (!link.closest('.mobile-menu-dropdown')) {
            link.addEventListener('click', () => {
                toggleMenu(false);
            });
        }
    });

    // 监听窗口大小改变，关闭菜单
    window.addEventListener('resize', () => {
        if (window.innerWidth > 768 && mobileMenuBtn.getAttribute('aria-expanded') === 'true') {
            toggleMenu(false);
        }
    });
}
