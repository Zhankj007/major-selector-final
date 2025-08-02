import { createClient } from '@supabase/supabase-js';

export default async function handler(request, response) {
    response.setHeader('Content-Type', 'application/json; charset=utf-8');

    try {
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
        const supabase = createClient(supabaseUrl, supabaseAnonKey);

        const { data, error } = await supabase.rpc('get_distinct_plan_options');

        if (error) { throw new Error(`数据库RPC调用错误: ${error.message}`); }
        if (!data) { throw new Error("数据库函数没有返回有效数据。"); }

        const planTypes = data.plan_types || [];
        const ownerships = data.ownerships || [];
        const eduLevels = data.edu_levels || [];
        const cityData = data.city_data || [];
        const subjectData = data.subject_data || [];

        // --- 城市数据处理 ---
        const provinceCityTree = cityData.reduce((acc, { 省份, 城市, 城市评级 }) => {
            const p = 省份?.trim();
            const c = 城市?.trim();
            if (!p || !c) return acc;
            if (!acc[p]) {
                acc[p] = { cities: new Map() };
            }
            if (!acc[p].cities.has(c)) {
                acc[p].cities.set(c, { tier: 城市评级 || '其他' }); // 如果评级为空，则设为'其他'
            }
            return acc;
        }, {});
        
        Object.keys(provinceCityTree).forEach(province => {
            provinceCityTree[province].cities = Array.from(provinceCityTree[province].cities.entries()).map(([name, cityInfo]) => ({ name, ...cityInfo }));
        });

        // --- 选科数据处理 ---
        const subjectTree = subjectData.reduce((acc, { 文理科归类, req }) => {
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
            subjectTree[cat] = [...subjectTree[cat]].sort((a,b) => a.localeCompare(b, 'zh-CN'));
        });
        
        const options = { planTypes, provinceCityTree, subjectTree, ownerships, eduLevels };
        
        return response.status(200).json(options);

    } catch (error) {
        console.error("API Error (getPlanFilterOptions):", error);
        return response.status(500).json({ error: `服务器内部错误: ${error.message}` });
    }
}
