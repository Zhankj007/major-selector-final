import { createClient } from '@supabase/supabase-js';

export default async function handler(request, response) {
    try {
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
        const supabase = createClient(supabaseUrl, supabaseAnonKey);

        const [
            { data: planTypesData, error: e1 },
            { data: cityData, error: e2 },
            { data: subjectData, error: e3 },
            { data: ownershipsData, error: e4 },
            { data: eduLevelsData, error: e5 }
        ] = await Promise.all([
            supabase.from('2025gkplans').select('科类'),
            supabase.from('2025gkplans').select('省份, 城市, 城市评级'),
            supabase.from('2025gkplans').select('文理科归类, 25年选科要求'),
            supabase.from('2025gkplans').select('办学性质'),
            supabase.from('2025gkplans').select('本专科')
        ]);

        if (e1 || e2 || e3 || e4 || e5) {
            throw new Error(e1?.message || e2?.message || e3?.message || e4?.message || e5?.message);
        }

        // --- 数据处理与去重 (已加强) ---
        const getUniqueSorted = (data, field) => [...new Set(data.map(item => item[field]?.trim()).filter(Boolean))].sort((a,b) => a.localeCompare(b, 'zh-CN'));

        const planTypes = getUniqueSorted(planTypesData, '科类');
        const ownerships = getUniqueSorted(ownershipsData, '办学性质');
        const eduLevels = getUniqueSorted(eduLevelsData, '本专科');

        const tierOrder = ['一线', '新一线', '二线', '三线', '四线', '五线'];
        const uniqueCityTiers = [...new Set(cityData.map(item => item.城市评级).filter(Boolean))].sort((a, b) => {
            const indexA = tierOrder.indexOf(a);
            const indexB = tierOrder.indexOf(b);
            return (indexA === -1 ? 99 : indexA) - (indexB === -1 ? 99 : indexB);
        });

        const provinceCityTree = cityData.reduce((acc, { 省份, 城市, 城市评级 }) => {
            const p = 省份?.trim();
            const c = 城市?.trim();
            if (!p || !c) return acc;
            if (!acc[p]) acc[p] = { cities: new Map(), tier: new Set() };
            if (!acc[p].cities.has(c)) acc[p].cities.set(c, { tier: 城市评级 || '' });
            if (城市评级) acc[p].tier.add(城市评级);
            return acc;
        }, {});
        
        Object.keys(provinceCityTree).forEach(province => {
            provinceCityTree[province].cities = Array.from(provinceCityTree[province].cities.entries()).map(([name, data]) => ({ name, ...data }));
        });

        const subjectTree = subjectData.reduce((acc, { 文理科归类, '25年选科要求': req }) => {
            if (!req) return acc;
            const category = 文理科归类?.trim() || '其他';
            if (!acc[category]) acc[category] = new Set();
            req.split(/[/,、，\s]/).forEach(r => {
                const trimmedReq = r.trim();
                if (trimmedReq) acc[category].add(trimmedReq);
            });
            return acc;
        }, {});
        
        Object.keys(subjectTree).forEach(cat => {
            subjectTree[cat] = [...subjectTree[cat]].sort();
        });

        const options = { planTypes, cityTiers, provinceCityTree, subjectTree, ownerships, eduLevels };
        
        response.setHeader('Content-Type', 'application/json; charset=utf-8');
        return response.status(200).json(options);

    } catch (error) {
        console.error("API Error (getPlanFilterOptions):", error);
        response.setHeader('Content-Type', 'application/json; charset=utf-8');
        return response.status(500).json({ error: `处理筛选选项数据时发生错误: ${error.message}` });
    }
}
