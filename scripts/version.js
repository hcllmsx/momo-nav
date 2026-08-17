/**
 * 核心版本号管理脚本（自适应路径版）
 *
 * 作用：用当前时间（UTC+8）更新 VERSION 文件。
 *      该文件是"核心版本号"的唯一来源，sync.js 会读取它写入 app.js 的 APP_VERSION，
 *      页脚 MOMO-NAV 的 title 提示会显示这个版本号。
 *
 * 自适应两种使用形态：
 *   形态 A（数据仓维护者）：在数据仓根目录运行，VERSION 在 ./core-momo-nav/VERSION
 *   形态 B（纯使用者 fork）：直接把核心仓当根目录运行，VERSION 在 ./VERSION
 *
 * 使用场景：当你修改了核心代码、准备推送之前，先跑一次：
 *   npm run version
 *
 * 用法:
 *   npm run version              # 用当前时间更新 VERSION
 *   npm run version 2026.08.17   # 手动指定版本号
 */
const fs = require('fs');
const path = require('path');

function getUTCP8Date() {
    const now = new Date();
    return new Date(now.getTime() + 8 * 60 * 60 * 1000);
}

function generateVersion() {
    const now = getUTCP8Date();
    const y = now.getUTCFullYear();
    const m = String(now.getUTCMonth() + 1).padStart(2, '0');
    const d = String(now.getUTCDate()).padStart(2, '0');
    const hh = String(now.getUTCHours()).padStart(2, '0');
    const mm = String(now.getUTCMinutes()).padStart(2, '0');
    return `${y}.${m}.${d}.${hh}${mm}`;
}

// 探测 VERSION 文件路径
//   形态 A：cwd/core-momo-nav/VERSION
//   形态 B：cwd/VERSION
function detectVersionFile() {
    const cwd = process.cwd();
    const subDir = path.join(cwd, 'core-momo-nav');
    if (fs.existsSync(subDir) && fs.existsSync(path.join(subDir, 'VERSION'))) {
        return path.join(subDir, 'VERSION'); // 形态 A
    }
    const local = path.join(cwd, 'VERSION');
    if (fs.existsSync(local)) {
        return local; // 形态 B
    }
    return null;
}

function main() {
    // 命令行参数优先（允许手动指定版本号）
    const arg = process.argv.slice(2)[0];
    const version = arg || generateVersion();

    const VERSION_FILE = detectVersionFile();
    if (!VERSION_FILE) {
        console.error('❌ 错误: 找不到 VERSION 文件。');
        console.error('    请在以下任一位置运行：');
        console.error('      - 数据仓根目录（含 core-momo-nav/ 子目录）');
        console.error('      - 核心仓根目录（含 VERSION 文件）');
        process.exit(1);
    }

    fs.writeFileSync(VERSION_FILE, `${version}\n`, 'utf8');
    console.log('✨ 核心版本号已更新');
    console.log('====================');
    console.log(`📁 文件: ${path.relative(process.cwd(), VERSION_FILE)}`);
    console.log(`🔢 版本: ${version}`);
    console.log('');
    console.log('💡 提示: 推送核心仓前请先运行此脚本。');
    console.log('         部署前运行 npm run sync 会把这个版本号同步到 app.js 的 APP_VERSION。');
}

main();
