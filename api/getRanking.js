import { readFileSync, readdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default function handler(req, res) {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        const rankingDir = resolve(__dirname, '..', '_data', 'ranking');
        const { year } = req.query;

        // 如果请求 ?year=list，返回所有可用年份
        if (year === 'list') {
            const files = readdirSync(rankingDir).filter(f => /^\d{4}\.json$/.test(f));
            const years = files.map(f => parseInt(f.replace('.json', ''))).sort((a, b) => b - a);
            res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
            return res.status(200).json({ years });
        }

        // 否则返回指定年份的数据
        if (!year || !/^\d{4}$/.test(year)) {
            return res.status(400).json({ error: '请指定合法的年份参数，如 ?year=2025' });
        }

        const filePath = resolve(rankingDir, `${year}.json`);
        const rawData = readFileSync(filePath, 'utf-8');
        const data = JSON.parse(rawData);

        // 设置 CDN 缓存 2 小时
        res.setHeader('Cache-Control', 's-maxage=7200, stale-while-revalidate');
        return res.status(200).json({ year: parseInt(year), count: data.length, data });
    } catch (err) {
        if (err.code === 'ENOENT') {
            return res.status(404).json({ error: '该年份数据不存在' });
        }
        console.error('getRanking Error:', err);
        return res.status(500).json({ error: '服务器内部错误' });
    }
}
