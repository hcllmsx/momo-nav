/**
 * 导航数据时间戳脚本（自适应路径版）
 *
 * 作用：当你修改了 momo-nav.json 里的导航数据后，运行此脚本，
 *      用当前时间刷新 updatedAt 字段（ISO 8601）。
 *
 *      updatedAt 是唯一的时间源，前端展示的"数据版本号"（YYYY.MM.DD.HHMM）
 *      和版本切换开关的对比逻辑，都从它派生 / 直接使用它，不再有独立的 dataVersion 字段。
 *
 * 自适应两种使用形态（同 sync.js）：
 *   形态 A（数据仓维护者）：在数据仓根目录运行，含 core-momo-nav/ 子目录
 *   形态 B（纯使用者 fork）：直接把核心仓当根目录运行
 *
 * 使用场景：每次改完 momo-nav.json、准备提交并部署之前，先跑一次：
 *   npm run data
 *
 * 用法:
 *   npm run data                              # 用当前时间刷新 updatedAt
 *   npm run data 2026-08-17T05:00:43.059Z     # 手动指定 updatedAt（一般用不到）
 *
 * 注意：此脚本只改 momo-nav.json，不会动其他文件。
 *      Vercel 部署时的 npm run sync 不会覆盖这个字段，所以这里写什么值，线上就是什么值。
 */
const fs = require('fs');
const path = require('path');

/**
 * 探测数据仓根目录。两种形态下 momo-nav.json 都在根目录：
 *   形态 A：cwd 下有 core-momo-nav/ → rootDir = cwd
 *   形态 B：cwd 就是核心仓 → rootDir = cwd
 * 两者其实都是 cwd，但为了和 sync.js 保持一致的探测逻辑，这里也做一次校验。
 */
function detectRootDir() {
    const cwd = process.cwd();
    const subDir = path.join(cwd, 'core-momo-nav');
    if (fs.existsSync(subDir) && fs.existsSync(path.join(subDir, 'VERSION'))) {
        return cwd; // 形态 A
    }
    if (fs.existsSync(path.join(cwd, 'VERSION'))) {
        return cwd; // 形态 B
    }
    // 兜底：只要当前目录有 momo-nav.json 就当作根目录
    if (fs.existsSync(path.join(cwd, 'momo-nav.json'))) {
        return cwd;
    }
    return null;
}

function generateUpdatedAt() {
    // ISO 8601 UTC，带毫秒，浏览器 Date.parse 能正确解析
    return new Date().toISOString();
}

function updateMomoNavTimestamps() {
    const rootDir = detectRootDir();
    if (!rootDir) {
        console.error('❌ 错误: 无法识别数据仓根目录。');
        console.error('    请在含 momo-nav.json 的根目录运行（数据仓根目录或核心仓根目录）。');
        process.exit(1);
    }
    const JSON_PATH = path.join(rootDir, 'momo-nav.json');

    if (!fs.existsSync(JSON_PATH)) {
        console.error(`❌ 错误: 找不到 momo-nav.json ("${JSON_PATH}")。`);
        process.exit(1);
    }

    const updatedAt = process.argv.slice(2)[0] || generateUpdatedAt();

    let content = fs.readFileSync(JSON_PATH, 'utf8');

    // 更新 updatedAt（如果不存在则在 siteName 之后插入）
    if (/"updatedAt"\s*:\s*"[^"]*"/.test(content)) {
        content = content.replace(/("updatedAt"\s*:\s*")[^"]*(")/, `$1${updatedAt}$2`);
    } else if (/"siteName"\s*:\s*"[^"]*"\s*,/.test(content)) {
        content = content.replace(/("siteName"\s*:\s*"[^"]*"\s*,)/, `$1\n  "updatedAt": "${updatedAt}",`);
    } else {
        console.error('❌ 错误: 无法在 momo-nav.json 中找到合适的插入位置（siteName 字段）。请检查 JSON 结构。');
        process.exit(1);
    }

    fs.writeFileSync(JSON_PATH, content, 'utf8');
    console.log('✨ 导航数据时间戳已更新');
    console.log('====================');
    console.log(`📁 文件: ${path.relative(rootDir, JSON_PATH) || 'momo-nav.json'}`);
    console.log(`🕐 updatedAt: ${updatedAt}`);
    console.log('');
    console.log('💡 提示: 改完导航数据后、提交部署前请先运行此脚本。');
    console.log('    前端展示的"数据版本号"会由 sync 脚本从 updatedAt 自动格式化派生，无需单独维护。');
}

updateMomoNavTimestamps();
