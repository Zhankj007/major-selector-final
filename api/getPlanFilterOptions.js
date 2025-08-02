import { createClient } from '@supabase/supabase-js';

export default async function handler(request, response) {
    response.setHeader('Content-Type', 'application/json; charset=utf-8');

    try {
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseAnonKey) {
            throw new Error("服务器配置错误: 缺少Supabase环境变量。");
        }

        const supabase = createClient(supabaseUrl, supabaseAnonKey);
        
        const { data, error } = await supabase.rpc('get_distinct_plan_options');

        if (error) {
            throw new Error(`数据库RPC调用错误: ${error.message}`);
        }
        
        if (!data) {
            throw new Error("数据库函数没有返回有效数据。");
        }

        // 现在处理 plan_types, ownerships, edu_levels, 以及 city_data
        const planTypes = data.plan_types || [];
        const ownerships = data.ownerships || [];
        const eduLevels = data.edu_levels || [];
        const cityData = data.city_data || []; // 新增

        // --- 城市数据处理 ---
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
            provinceCityTree[province].cities = Array.from(provinceCityTree[province].cities.entries()).map(([name, cityInfo]) => ({ name, ...cityInfo }));
        });

        const options = {
            planTypes,
            ownerships,
            eduLevels,
            cityTiers: uniqueCityTiers, // 新增
            provinceCityTree: provinceCityTree, // 新增
            // 为其他选项提供空的默认值
            subjectTree: {},
        };
        
        return response.status(200).json(options);

    } catch (error) {
        console.error("API Error (getPlanFilterOptions):", error);
        return response.status(500).json({ error: `服务器内部错误: ${error.message}` });
    }
}
