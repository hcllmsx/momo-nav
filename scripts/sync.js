/**
 * 核心文件同步脚本（自适应路径版）
 *
 * 作用：把核心引擎的文件（index.html / site.webmanifest / mn-js / mn-css / mn-src）
 *      复制到数据仓根目录，并刷新各处版本号。
 *
 * 自适应两种使用形态：
 *   形态 A（数据仓维护者）：在数据仓根目录运行，当前目录下有 core-momo-nav/ 子目录
 *                           → 从 ./core-momo-nav/ 复制到 ./
 *   形态 B（纯使用者 fork）：直接把核心仓当根目录运行，当前目录就是核心仓
 *                           → 无需复制（已经在根目录），只刷新版本号
 *
 * 用法: npm run sync
 */
const fs = require('fs');
const path = require('path');

const filesToSync = ['index.html', 'site.webmanifest', 'mn-js', 'mn-css', 'mn-src'];

/**
 * 探测当前形态，返回 { mode, coreDir, rootDir }
 *   mode: 'A' | 'B'
 *   coreDir: 核心引擎所在目录（复制源）
 *   rootDir: 数据目录（复制目标，含 momo-nav.json / index.html 等）
 */
function detectLayout() {
    const cwd = process.cwd();
    const subDir = path.join(cwd, 'core-momo-nav');
    if (fs.existsSync(subDir) && fs.existsSync(path.join(subDir, 'VERSION'))) {
        return { mode: 'A', coreDir: subDir, rootDir: cwd };
    }
    // 形态 B：当前目录就是核心仓
    if (fs.existsSync(path.join(cwd, 'VERSION'))) {
        return { mode: 'B', coreDir: cwd, rootDir: cwd };
    }
    return null;
}

function getUTCP8Date() {
    const now = new Date();
    return new Date(now.getTime() + 8 * 60 * 60 * 1000);
}

// 把 ISO 8601 时间字符串格式化成 YYYY.MM.DD.HHMM（东八区）
function formatDataVersionFromISO(iso) {
    const ms = Date.parse(iso);
    const base = Number.isFinite(ms) ? new Date(ms) : new Date();
    const now = new Date(base.getTime() + 8 * 60 * 60 * 1000);
    const y = now.getUTCFullYear();
    const m = String(now.getUTCMonth() + 1).padStart(2, '0');
    const d = String(now.getUTCDate()).padStart(2, '0');
    const hh = String(now.getUTCHours()).padStart(2, '0');
    const mm = String(now.getUTCMinutes()).padStart(2, '0');
    return `${y}.${m}.${d}.${hh}${mm}`;
}

function getDataVersion(rootDir) {
    // 从 momo-nav.json 的 updatedAt 字段（ISO 8601，由 npm run data 写入）派生出
    // 展示用的数据版本号 YYYY.MM.DD.HHMM（东八区）。
    // updatedAt 是唯一的时间源，不再有独立的 dataVersion 字段。
    try {
        const jsonPath = path.join(rootDir, 'momo-nav.json');
        if (fs.existsSync(jsonPath)) {
            const content = fs.readFileSync(jsonPath, 'utf8');
            const match = content.match(/"updatedAt"\s*:\s*"([^"]*)"/);
            if (match && match[1]) {
                return formatDataVersionFromISO(match[1]);
            }
        }
    } catch (e) {
        // 忽略读取错误，走下面的退化逻辑
    }
    // 退化：momo-nav.json 中没有 updatedAt 字段时，用当前时间生成
    console.warn('⚠️  警告: momo-nav.json 中未配置 updatedAt 字段，已用当前时间生成。');
    console.warn('    建议改完导航数据后运行 npm run data，让版本号反映数据修改时间。');
    return formatDataVersionFromISO(new Date().toISOString());
}

function getPackageVersion() {
    const now = getUTCP8Date();
    const y = now.getUTCFullYear();
    const m = String(now.getUTCMonth() + 1).padStart(2, '0');
    const d = String(now.getUTCDate()).padStart(2, '0');
    return `${y}.${m}.${d}`;
}

function copyCoreFiles(layout) {
    if (layout.mode === 'B') {
        console.log('ℹ️  当前为核心仓根目录形态（模式 B），核心文件已在目标位置，跳过复制。');
        return;
    }
    console.log('🚀 开始从 core-momo-nav 同步核心文件...');
    filesToSync.forEach(file => {
        const src = path.join(layout.coreDir, file);
        const dest = path.join(layout.rootDir, file);

        if (fs.existsSync(src)) {
            try {
                if (fs.cpSync) {
                    fs.cpSync(src, dest, { recursive: true, force: true });
                } else {
                    if (fs.lstatSync(src).isDirectory()) {
                        fs.cpSync(src, dest, { recursive: true });
                    } else {
                        fs.copyFileSync(src, dest);
                    }
                }
                console.log(`✅ 已同步: ${file}`);
            } catch (err) {
                console.error(`❌ 同步 ${file} 失败:`, err.message);
            }
        } else {
            console.warn(`⚠️  警告: 找不到源文件 "${src}"，已跳过。`);
        }
    });
    console.log('✨ 同步完成！');
}

function updateVersions(layout) {
    const { rootDir, coreDir } = layout;
    const dataVersion = getDataVersion(rootDir);
    const packageVersion = getPackageVersion();
    const now = getUTCP8Date();
    const timestamp = `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, '0')}${String(now.getUTCDate()).padStart(2, '0')}_${String(now.getUTCHours()).padStart(2, '0')}${String(now.getUTCMinutes()).padStart(2, '0')}`;

    updateIndexVersion(rootDir, dataVersion, timestamp);
    // package.json 的 version 字段已固定为数据仓首发版本 2026.4.10（仅纪念，无功能作用），
    // 不再随 sync 自动更新为当天日期。
    // updatePackageJson(rootDir, packageVersion);

    // 读取核心版本号（来自 VERSION 文件），写入根目录 app.js 的 APP_VERSION
    const coreVersion = readCoreVersion(coreDir);
    if (coreVersion) {
        updateAppJsVersion(rootDir, coreVersion);
    }

    // 注意：momo-nav.json 的 updatedAt 不在 sync 时生成，
    // 而是由 npm run data 脚本单独维护（反映"你实际修改导航数据的时间"）。
    // 这样 Vercel 重复部署时不会误伤这个时间戳。前端展示的数据版本号由它派生。

    console.log(`====================`);
    console.log(`✅ 包版本: ${packageVersion}`);
    console.log(`✅ 数据版本: ${dataVersion}`);
    if (coreVersion) {
        console.log(`✅ 核心版本: ${coreVersion}`);
    }
}

function updateIndexVersion(rootDir, dataVersion, timestamp) {
    const indexPath = path.join(rootDir, 'index.html');
    if (!fs.existsSync(indexPath)) return;

    console.log('🔄 正在自动更新 index.html 中的 js 文件引用链接版本号...');
    let content = fs.readFileSync(indexPath, 'utf8');

    content = content
        .replace(/(app\.js\?v=)[^"']*/g, `$1${timestamp}`)
        .replace(/(style\.css\?v=)[^"']*/g, `$1${timestamp}`)
        .replace(/(search-suggestions\.js\?v=)[^"']*/g, `$1${timestamp}`)
        .replace(/(search-suggestions\.css\?v=)[^"']*/g, `$1${timestamp}`);

    const dataVersionScript = `\n<script>var DATA_VERSION = '${dataVersion}';</script>\n`;
    if (content.includes('var DATA_VERSION')) {
        content = content.replace(/var DATA_VERSION = '[^']*';/g, `var DATA_VERSION = '${dataVersion}';`);
    } else {
        content = content.replace('</body>', dataVersionScript + '</body>');
    }

    fs.writeFileSync(indexPath, content, 'utf8');
    console.log(`✅ index.html 中的 js 文件引用链接版本号已更新为: ?v=${timestamp}`);
}

function updatePackageJson(rootDir, version) {
    const pkgPath = path.join(rootDir, 'package.json');
    if (!fs.existsSync(pkgPath)) return;

    let content = fs.readFileSync(pkgPath, 'utf8');
    const match = content.match(/"version":\s*"([^"]*)"/);
    if (match && match[1] === version) {
        console.log(`ℹ️  package.json 版本号已是 ${version}，跳过写入。`);
        return;
    }

    console.log('🔄 正在更新 package.json 版本号...');
    content = content.replace(/"version":\s*"[^"]*"/, `"version": "${version}"`);
    fs.writeFileSync(pkgPath, content, 'utf8');
    console.log(`✅ package.json 版本号已更新为: ${version}`);
}

// 读取 VERSION 文件，返回核心版本号（去掉首尾空白）
function readCoreVersion(coreDir) {
    const versionPath = path.join(coreDir, 'VERSION');
    if (!fs.existsSync(versionPath)) {
        console.warn(`⚠️  警告: 找不到 VERSION 文件，APP_VERSION 将保持不变。`);
        console.warn(`    如果你想让页脚显示核心版本号，请运行 npm run version。`);
        return null;
    }
    const raw = fs.readFileSync(versionPath, 'utf8').trim();
    if (!raw) {
        console.warn('⚠️  警告: VERSION 文件为空，APP_VERSION 将保持不变。');
        return null;
    }
    return raw;
}

// 将根目录 app.js 顶部的 APP_VERSION 替换为读到的核心版本号
function updateAppJsVersion(rootDir, coreVersion) {
    const appJsPath = path.join(rootDir, 'mn-js', 'app.js');
    if (!fs.existsSync(appJsPath)) {
        console.warn('⚠️  警告: 找不到 mn-js/app.js，APP_VERSION 未更新（sync 是否已复制核心文件？）');
        return;
    }

    console.log('🔄 正在更新 mn-js/app.js 中的 APP_VERSION...');
    let content = fs.readFileSync(appJsPath, 'utf8');
    const pattern = /(const APP_VERSION\s*=\s*['"])[^'"]*(['"])/;
    if (!pattern.test(content)) {
        console.warn('⚠️  警告: 未在 mn-js/app.js 中匹配到 APP_VERSION 定义，跳过。');
        return;
    }
    content = content.replace(pattern, `$1${coreVersion}$2`);
    fs.writeFileSync(appJsPath, content, 'utf8');
    console.log(`✅ mn-js/app.js 的 APP_VERSION 已更新为: ${coreVersion}`);
}

function main() {
    const layout = detectLayout();
    if (!layout) {
        console.error('❌ 错误: 无法识别目录形态。');
        console.error('    请在以下任一位置运行：');
        console.error('      - 数据仓根目录（含 core-momo-nav/ 子目录）');
        console.error('      - 核心仓根目录（含 VERSION 文件）');
        process.exit(1);
    }
    console.log(`📍 识别为形态 ${layout.mode}：${layout.mode === 'A' ? '数据仓根目录' : '核心仓根目录'}`);
    copyCoreFiles(layout);
    updateVersions(layout);
}

main();
