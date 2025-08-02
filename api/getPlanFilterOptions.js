import { createClient } from '@supabase/supabase-js';

export default async function handler(request, response) {
    try {
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
        const supabase = createClient(supabaseUrl, supabaseAnonKey);

        const [
            { data: planTypes, error: planTypesError },
            { data: cityData, error: cityDataError },
            { data: subjectData, error: subjectDataError },
            { data: ownerships, error: ownershipsError },
            { data: eduLevels, error: eduLevelsError }
        ] = await Promise.all([
            supabase.from('2025gkplans').select('科类').neq('科类', null),
            supabase.from('2025gkplans').select('省份, 城市, 城市评级').neq('省份', null),
            supabase.from('2025gkplans').select('文理科归类, 25年选科要求').neq('25年选科要求', null),
            supabase.from('2025gkplans').select('办学性质').neq('办学性质', null),
            supabase.from('2025gkplans').select('本专科').neq('本专科', null)
        ]);

        if (planTypesError || cityDataError || subjectDataError || ownershipsError || eduLevelsError) {
            throw new Error(planTypesError?.message || cityDataError?.message || subjectDataError?.message || ownershipsError?.message || eduLevelsError?.message);
        }

        // --- 数据处理与去重 ---

        const uniquePlanTypes = [...new Set(planTypes.map(item => item.科类.trim()).filter(Boolean))].sort();
        const uniqueOwnerships = [...new Set(ownerships.map(item => item.办学性质.trim()).filter(Boolean))].sort();
        const uniqueEduLevels = [...new Set(eduLevels.map(item => item.本专科.trim()).filter(Boolean))].sort();

        // 城市评级自定义排序
        const tierOrder = ['一线', '新一线', '二线', '三线', '四线', '五线'];
        const uniqueCityTiers = [...new Set(cityData.map(item => item.城市评级).filter(Boolean))].sort((a, b) => {
            const indexA = tierOrder.indexOf(a);
            const indexB = tierOrder.indexOf(b);
            if (indexA === -1) return 1;
            if (indexB === -1) return -1;
            return indexA - indexB;
        });

        // 省市树结构，城市信息包含评级
        const provinceCityTree = cityData.reduce((acc, { 省份, 城市, 城市评级 }) => {
            if (!省份 || !城市) return acc;
            if (!acc[省份]) {
                acc[省份] = { cities: new Map(), tier: new Set() };
            }
            if (!acc[省份].cities.has(城市)) {
                 acc[省份].cities.set(城市, { tier: 城市评级 || '' });
            }
            if(城市评级) acc[省份].tier.add(城市评级);
            return acc;
        }, {});
        
        Object.keys(provinceCityTree).forEach(province => {
            // 将Map转为数组，以便排序
            provinceCityTree[province].cities = Array.from(provinceCityTree[province].cities.entries()).map(([name, data]) => ({ name, ...data }));
        });

        const subjectTree = subjectData.reduce((acc, { 文理科归类, '25年选科要求': req }) => {
             const category = 文理科归类 ? 文理科归类.trim() : '其他';
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

        const options = {
            planTypes: uniquePlanTypes,
            cityTiers: uniqueCityTiers,
            provinceCityTree: provinceCityTree,
            subjectTree: subjectTree,
            ownerships: uniqueOwnerships,
            eduLevels: uniqueEduLevels,
        };
        
        // **关键修复：设置正确的响应头，防止乱码**
        response.setHeader('Content-Type', 'application/json; charset=utf-8');
        return response.status(200).json(options);

    } catch (error) {
        console.error("API Error (getPlanFilterOptions):", error);
        // 同样设置响应头
        response.setHeader('Content-Type', 'application/json; charset=utf-8');
        return response.status(500).json({ error: `处理筛选选项数据时发生错误: ${error.message}` });
    }
}
