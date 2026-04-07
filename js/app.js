// 默默导航 - 主逻辑脚本

// 全局应用状态，避免过多全局变量
const appState = {
    navData: null,
    iconfontLoaded: false,
    hasIconfontConfig: false,
};

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
    const mobileStickyTop = 8;
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
                console.log('开始加载导航数据:', dataUrl, '当前页面 URL:', window.location.href);
                const response = await fetch(dataUrl, { cache: 'no-cache' });
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status} ${response.statusText}`);
                }

                appState.navData = await response.json();
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
            await loadIconfont(appState.navData.iconfont);
        }

        renderNav(appState.navData);
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
    }

    // 设置 Favicon
    if (data.favicon) {
        const favicon = document.getElementById('favicon');
        if (favicon) favicon.href = data.favicon;
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

    // 2. 设置背景（纹理 + 颜色）
    if (data.background) {
        const bg = data.background;
        
        // 设置背景色
        if (bg.color) {
            document.body.style.backgroundColor = bg.color;
        }
        
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
function getIconHtml(icon) {
    if (!icon) {
        return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
            <path d="M2 12h20"/>
        </svg>`;
    }

    if (isIconUrl(icon)) {
        if (icon.includes('iconify')) {
            return `<img src="${escapeHtml(icon)}" alt="icon" loading="lazy" width="24" height="24" onerror="this.src='mn-src/momonav-icon.svg'; this.style.filter='grayscale(100%) brightness(0.7)'">`;
        }
        if (isImageFile(icon)) {
            return `<img src="${escapeHtml(icon)}" alt="icon" loading="lazy" width="24" height="24" onerror="this.style.display='none'">`;
        }
    }

    if (appState.hasIconfontConfig && !isIconUrl(icon) && !icon.startsWith('#')) {
        return `<svg class="iconfont-symbol" aria-hidden="true"><use xlink:href="#${escapeHtml(icon)}"></use></svg>`;
    }

    if (icon.startsWith('#')) {
        return `<svg class="iconfont-symbol" aria-hidden="true"><use xlink:href="${escapeHtml(icon)}"></use></svg>`;
    }

    if (icon.includes(' ')) {
        return `<i class="${escapeHtml(icon)}" aria-hidden="true"></i>`;
    }

    return `<img src="${escapeHtml(icon)}" alt="icon" loading="lazy" width="24" height="24" onerror="this.src='mn-src/momonav-icon.svg'; this.style.filter='grayscale(100%) brightness(0.7)'">`;
}

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
    tabBtns.forEach(btn => {
        if (btn.dataset.engine === currentSearchEngine.engine) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
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
const OPTIONAL_GROUP_KEYS = ['theme', 'cover', 'background', 'iconfont'];

const DEFAULT_PAGE_CONFIG = {
    captured: false,
    title: '',
    favicon: '',
    siteDescription: '',
    siteKeywords: '',
    footerName: '',
    logoIconHtml: '',
    logoText: '',
    logoTextDisplay: '',
    cssVars: {},
};

appState.loadedIconfontUrl = '';
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
    },
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
    safeData.theme = safeData.theme && typeof safeData.theme === 'object' ? safeData.theme : {};
    safeData.cover = safeData.cover && typeof safeData.cover === 'object' ? safeData.cover : {};
    safeData.background = safeData.background && typeof safeData.background === 'object' ? safeData.background : {};
    safeData.iconfont = safeData.iconfont && typeof safeData.iconfont === 'object' ? safeData.iconfont : {};
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
    };
}

function captureDefaultPageConfig() {
    if (DEFAULT_PAGE_CONFIG.captured) return;

    const favicon = document.getElementById('favicon');
    const metaDescription = document.getElementById('metaDescription');
    const metaKeywords = document.getElementById('metaKeywords');
    const footerSiteName = document.getElementById('footerSiteName');
    const logoIcon = document.getElementById('logoIcon');
    const logoText = document.getElementById('logoText');

    DEFAULT_PAGE_CONFIG.title = document.title;
    DEFAULT_PAGE_CONFIG.favicon = favicon ? favicon.getAttribute('href') || '' : '';
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
    const metaDescription = document.getElementById('metaDescription');
    const metaKeywords = document.getElementById('metaKeywords');
    const footerSiteName = document.getElementById('footerSiteName');
    const logoIcon = document.getElementById('logoIcon');
    const logoText = document.getElementById('logoText');

    document.title = DEFAULT_PAGE_CONFIG.title;
    if (favicon) favicon.href = DEFAULT_PAGE_CONFIG.favicon;
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
        const storedToggles = parsed.toggles && typeof parsed.toggles === 'object' ? parsed.toggles : {};

        OPTIONAL_GROUP_KEYS.forEach(key => {
            if (typeof storedToggles[key] === 'boolean') {
                safeToggles[key] = storedToggles[key];
            }
        });

        return {
            data: ensureEditorDataShape(parsed.data),
            toggles: safeToggles,
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
        console.log('检测到本地编辑草稿，已优先加载 localStorage 配置。');
        return true;
    }

    appState.editor.data = ensureEditorDataShape(baseData);
    appState.editor.toggles = buildToggleStateFromData(baseData);
    return false;
}

function sanitizeThemeFromEditor(themeData) {
    if (!themeData || typeof themeData !== 'object') return null;
    const output = {};

    const primaryColor = sanitizeThemeColor(themeData.primaryColor || themeData.primary);
    if (primaryColor) output.primaryColor = primaryColor;

    const primaryHover = sanitizeThemeColor(themeData.primaryHover);
    if (primaryHover) output.primaryHover = primaryHover;

    const map = [
        'bgColor',
        'cardBg',
        'textColor',
        'textMuted',
        'borderColor',
    ];

    map.forEach(field => {
        const colorValue = sanitizeThemeColor(themeData[field]);
        if (colorValue) output[field] = colorValue;
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

function sanitizeBackgroundFromEditor(backgroundData) {
    if (!backgroundData || typeof backgroundData !== 'object') return null;
    const output = {};

    ['texture', 'color', 'textureColor'].forEach(field => {
        const value = trimToString(backgroundData[field]);
        if (value) output[field] = value;
    });

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

    const logo = sanitizeLogoFromEditor(editorData.logo);
    if (logo) output.logo = logo;

    if (toggles.theme) {
        const theme = sanitizeThemeFromEditor(editorData.theme);
        if (theme) output.theme = theme;
    }

    if (toggles.cover) {
        const cover = sanitizeCoverFromEditor(editorData.cover);
        if (cover) output.cover = cover;
    }

    if (toggles.background) {
        const background = sanitizeBackgroundFromEditor(editorData.background);
        if (background) output.background = background;
    }

    if (toggles.iconfont) {
        const iconfont = sanitizeIconfontFromEditor(editorData.iconfont);
        if (iconfont) output.iconfont = iconfont;
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
        try {
            await loadIconfont(appState.navData.iconfont);
        } catch (error) {
            console.warn('Iconfont 预览加载失败:', error);
            appState.hasIconfontConfig = false;
        }
    } else {
        appState.hasIconfontConfig = false;
    }

    const searchInput = document.getElementById('searchInput');
    const activeSearchTerm = (
        !appState.editor.active &&
        currentSearchEngine.engine === 'local' &&
        searchInput
    ) ? searchInput.value.trim() : '';

    renderNav(appState.navData, activeSearchTerm);
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
                </section>

                <section class="editor-section">
                    <h3>Logo</h3>
                    <label>logo.img<input type="text" data-editor-path="logo.img" id="editorFieldLogoImg" placeholder="Logo图片的URL"></label>
                    <label>logo.text<input type="text" data-editor-path="logo.text" id="editorFieldLogoText" placeholder="Logo显示的文字"></label>
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
                        <label>primaryColor<input type="color" data-editor-path="theme.primaryColor" id="editorFieldThemePrimaryColor" title="网站主色调"></label>
                        <label>primaryHover<input type="color" data-editor-path="theme.primaryHover" id="editorFieldThemePrimaryHover" title="主号悬停/焦点时的颜色"></label>
                        <label>bgColor<input type="color" data-editor-path="theme.bgColor" id="editorFieldThemeBgColor" title="页面背景色"></label>
                        <label>cardBg<input type="color" data-editor-path="theme.cardBg" id="editorFieldThemeCardBg" title="卡片背景色"></label>
                        <label>textColor<input type="color" data-editor-path="theme.textColor" id="editorFieldThemeTextColor" title="主文字颜色"></label>
                        <label>textMuted<input type="color" data-editor-path="theme.textMuted" id="editorFieldThemeTextMuted" title="次要/辅助文字颜色"></label>
                        <label>borderColor<input type="color" data-editor-path="theme.borderColor" id="editorFieldThemeBorderColor" title="边框和分割线颜色"></label>
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
                        <label>color<input type="color" data-editor-path="background.color" id="editorFieldBgColor" title="背景颜色"></label>
                        <label>opacity<input type="number" step="0.1" min="0" max="1" data-editor-path="background.opacity" id="editorFieldBgOpacity" placeholder="0.5" title="背景透明度 (0-1)"></label>
                        <label>textureColor<input type="color" data-editor-path="background.textureColor" id="editorFieldBgTextureColor" title="纹理的色调"></label>
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
                            <select data-editor-path="iconfont.type" id="editorFieldIconfontType" title="图标加载方式">
                                <option value="local">local (本地加载)</option>
                                <option value="online">online (在线加载)</option>
                            </select>
                        </label>
                        <label>url<input type="text" data-editor-path="iconfont.url" id="editorFieldIconfontUrl" placeholder="Iconfont库的URL或本地路径"></label>
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
                <button type="button" data-editor-action="clear-draft">清除本地草稿</button>
            </div>
        `;

        document.body.appendChild(panel);
        appState.editor.panelEl = panel;

        panel.addEventListener('click', handleEditorPanelClick);
        panel.addEventListener('input', handleEditorPanelInputChange);
        panel.addEventListener('change', handleEditorPanelInputChange);
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

            if (event.target === modalLayer) {
                closeEditorModal(null);
            }
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

function handleEditorShortcut(event) {
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

    if (!appState.editor.launcherVisible) {
        appState.editor.launcherVisible = true;
        showToast('编辑模式已启用', 3000, '#e05d00');
    } else if (!appState.editor.active) {
        appState.editor.launcherVisible = false;
        showToast('编辑模式已禁用', 3000, '#00bd06');
    }

    updateEditorLauncherVisibility();
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
    renderNav(appState.navData || buildConfigFromEditorState());
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
    renderNav(appState.navData || buildConfigFromEditorState());
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
        default:
            return;
    }
}

function handleEditorPanelInputChange(event) {
    const target = event.target;
    if (!target || appState.editor.syncFormLocked || !appState.editor.data) return;

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

        field.value = value === undefined || value === null ? '' : String(value);
    });

    OPTIONAL_GROUP_KEYS.forEach(key => {
        const checkbox = appState.editor.panelEl.querySelector(`[data-editor-toggle="${key}"]`);
        if (!checkbox) return;
        checkbox.checked = Boolean(appState.editor.toggles[key]);
        updateOptionalGroupReadonlyState(key);
    });

    appState.editor.syncFormLocked = false;
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

            const wrapper = document.createElement('label');
            wrapper.className = 'editor-modal-field';

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
            } else {
                inputEl = document.createElement('input');
                inputEl.type = trimToString(field.type) || 'text';
            }

            inputEl.name = name;
            inputEl.value = field.value === undefined || field.value === null ? '' : String(field.value);
            inputEl.placeholder = trimToString(field.placeholder);
            if (field.required) inputEl.dataset.required = 'true';

            wrapper.appendChild(inputEl);
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
                label: '标题 / 描述',
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
}

function clearEditorDragState() {
    clearEditorDropIndicators();
    document.querySelectorAll('.nav-card.is-dragging').forEach(node => node.classList.remove('is-dragging'));
    document.querySelectorAll('.category.is-drop-target').forEach(node => node.classList.remove('is-drop-target'));
    document.body.classList.remove('is-editor-dragging');
    appState.editor.drag = null;
}

function exportEditorConfig() {
    const payload = buildConfigFromEditorState();
    const json = JSON.stringify(payload, null, 2);
    const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'momo-nav.json';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
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
