export default function handler(req, res) {
    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
    const key = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
    
    // plan_year 从环境变量读取，默认 2025
    const planYear = process.env.PLAN_YEAR || '2025';

    const js = `
        window.SUPABASE_URL = "${url}";
        window.SUPABASE_ANON_KEY = "${key}";
        window.PLAN_YEAR = "${planYear}";
    `;
    
    res.setHeader('Content-Type', 'application/javascript');
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
    res.status(200).send(js);
}

