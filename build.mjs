/**
 * 构建脚本：生成 public/version.js 注入当前日期版本号
 * 
 * 策略：
 * - 每次 Vercel 构建或本地 npm run build 时，生成静态的 version.js
 * - index.html 永远不被修改，保持 Git 干净
 */
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = resolve(__dirname, 'public');

if (!existsSync(publicDir)) {
    mkdirSync(publicDir, { recursive: true });
}

// 生成日期版本号 YYYYMMDD
const now = new Date();
const version = `v${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;

// 生成 version.js
const versionJsPath = resolve(publicDir, 'version.js');
writeFileSync(versionJsPath, `window.APP_VERSION="${version}";\n`, 'utf-8');

console.log(`✅ 版本号 ${version} 已写入 public/version.js`);
