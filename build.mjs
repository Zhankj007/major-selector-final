/**
 * 构建脚本：将 index.html 中的 __VERSION__ 占位符替换为当前日期版本号
 * 
 * 策略：
 * - Vercel 云端部署时：自动检测 VERCEL 环境变量，执行替换
 * - 本地开发时：跳过替换，不修改任何源文件，避免 Git 脏文件
 */
import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// 只在 Vercel 环境中执行替换
if (!process.env.VERCEL) {
    console.log('ℹ️  本地开发环境，跳过版本号注入。');
    process.exit(0);
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const htmlPath = resolve(__dirname, 'public', 'index.html');

// 生成日期版本号 YYYYMMDD
const now = new Date();
const version = `v${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;

// 读取 HTML 并替换
let html = readFileSync(htmlPath, 'utf-8');
if (html.includes('__VERSION__')) {
    html = html.replace(/__VERSION__/g, version);
    writeFileSync(htmlPath, html, 'utf-8');
    console.log(`✅ 版本号已注入: ${version}`);
} else {
    console.log(`ℹ️  未找到 __VERSION__ 占位符，跳过。`);
}
