export default function handler(req, res) {
    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
    const key = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
    
    // 生成一个当前日期的版本号作为 fallback
    const date = new Date();
    const fallbackVersion = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
    const version = process.env.VERCEL_GIT_COMMIT_SHA ? process.env.VERCEL_GIT_COMMIT_SHA.substring(0, 7) : fallbackVersion;

    // plan_year 从环境变量读取，默认 2025
    const planYear = process.env.PLAN_YEAR || '2025';

    const js = `
        window.SUPABASE_URL = "${url}";
        window.SUPABASE_ANON_KEY = "${key}";
        window.APP_VERSION = "${version}";
        window.PLAN_YEAR = "${planYear}";
    `;
    
    res.setHeader('Content-Type', 'application/javascript');
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
    res.status(200).send(js);
}

