import { createClient } from '@supabase/supabase-js';

export default async function handler(request, response) {
    try {
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
        const supabase = createClient(supabaseUrl, supabaseAnonKey);

        // 并行执行多个查询以提高效率
        const [
            { data: planTypes, error: planTypesError },
            { data: cityData, error: cityDataError },
            { data: subjectData, error: subjectDataError },
            { data: ownerships, error: ownershipsError },
            { data: eduLevels, error: eduLevelsError }
        ] = await Promise.all([
            // 1. 获取所有唯一的“科类”
            supabase.from('2025gkplans').select('科类').neq('科类', null),
            // 2. 获取构建城市筛选器所需的所有数据
            supabase.from('2025gkplans').select('省份, 城市, 城市评级').neq('省份', null),
            // 3. 获取构建选科筛选器所需的数据
            supabase.from('2025gkplans').select('文理科归类, 25年选科要求').neq('25年选科要求', null),
            // 4. 获取所有唯一的“办学性质”
            supabase.from('2025gkplans').select('办学性质').neq('办学性质', null),
            // 5. 获取所有唯一的“本专科”层次
            supabase.from('2025gkplans').select('本专科').neq('本专科', null)
        ]);

        // 检查任何一个查询是否出错
        if (planTypesError || cityDataError || subjectDataError || ownershipsError || eduLevelsError) {
            throw new Error(
                planTypesError?.message ||
                cityDataError?.message ||
                subjectDataError?.message ||
                ownershipsError?.message ||
                eduLevelsError?.message
            );
        }

        // --- 数据处理与去重 ---

        // 提取唯一的科类
        const uniquePlanTypes = [...new Set(planTypes.map(item => item.科类))].sort();

        // 提取唯一的办学性质
        const uniqueOwnerships = [...new Set(ownerships.map(item => item.办学性质))].sort();

        // 提取唯一的本专科层次
        const uniqueEduLevels = [...new Set(eduLevels.map(item => item.本专科))].sort();

        // 处理城市数据，生成城市评级列表和省市树结构
        const uniqueCityTiers = [...new Set(cityData.map(item => item.城市评级).filter(Boolean))].sort();
        const provinceCityTree = cityData.reduce((acc, { 省份, 城市, 城市评级 }) => {
            if (!省份 || !城市) return acc;
            if (!acc[省份]) {
                acc[省份] = { cities: new Set(), tier: new Set() };
            }
            acc[省份].cities.add(城市);
            if(城市评级) acc[省份].tier.add(城市评级);
            return acc;
        }, {});
         // 将Set转换为数组
        Object.keys(provinceCityTree).forEach(province => {
            provinceCityTree[province].cities = [...provinceCityTree[province].cities].sort();
        });


        // 处理选科数据，生成树状结构
        const subjectTree = subjectData.reduce((acc, { 文理科归类, '25年选科要求': req }) => {
             const category = 文理科归类 || '不限';
             if (!acc[category]) {
                acc[category] = new Set();
            }
            // 分割选科要求（处理 "物理/化学" 或 "物理,化学" 等情况）
            req.split(/[/,、，\s]/).forEach(r => r && acc[category].add(r.trim()));
            return acc;
        }, {});
        // 将Set转换为数组
        Object.keys(subjectTree).forEach(cat => {
            subjectTree[cat] = [...subjectTree[cat]].sort();
        });

        // 最终返回给前端的JSON对象
        const options = {
            planTypes: uniquePlanTypes,
            cityTiers: uniqueCityTiers,
            provinceCityTree: provinceCityTree,
            subjectTree: subjectTree,
            ownerships: uniqueOwnerships,
            eduLevels: uniqueEduLevels,
        };

        return response.status(200).json(options);

    } catch (error) {
        console.error("API Error (getPlanFilterOptions):", error);
        return response.status(500).json({ error: `处理筛选选项数据时发生错误: ${error.message}` });
    }
}
