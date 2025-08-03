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

        const {
            plan_types: planTypes = [],
            ownerships = [],
            edu_levels: eduLevels = [],
            city_data: cityData = [],
            subject_data: subjectData = [],
            cities_table: citiesTable = []
        } = data;

        // **新增：为办学性质和本专科定义排序规则**
        const ownershipOrder = ['公办', '独立学院', '民办', '中外合作办学'];
        const eduLevelOrder = ['本科', '专科'];

        const customSort = (arr, order) => arr.sort((a, b) => {
            const indexA = order.indexOf(a);
            const indexB = order.indexOf(b);
            if (indexA === -1) return 1; // 未在规则内的排在后面
            if (indexB === -1) return -1;
            return indexA - indexB;
        });

        const sortedOwnerships = customSort(ownerships, ownershipOrder);
        const sortedEduLevels = customSort(eduLevels, eduLevelOrder);
        
        // **修改：重命名选科类别**
        const subjectTree = subjectData.reduce((acc, { 文理科归类, req }) => {
            if (!req) return acc;
            let category = 文理科归类?.trim() || '其他';
            if (category === '文科') category = '文科类';
            if (category === '理科') category = '理科类';

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

        // ... (其他数据处理逻辑无变化) ...
        const provinceCodeMap = new Map();
        const cityCodeMap = new Map();
        for (const item of citiesTable) {
            if (item.省份 && (item.城市 === null || item.省份 === item.城市)) {
                if (!provinceCodeMap.has(item.省份)) provinceCodeMap.set(item.省份, item.地区编码);
            }
            if (item.省份 && item.城市) {
                const key = `${item.省份}|${item.城市}`;
                if (!cityCodeMap.has(key)) cityCodeMap.set(key, item.地区编码);
            }
        }
        const provinceCityTree = cityData.reduce((acc, { 省份, 城市, 城市评级 }) => {
            const p = 省份?.trim(); const c = 城市?.trim();
            if (!p || !c) return acc;
            if (!acc[p]) acc[p] = { cities: new Map(), code: provinceCodeMap.get(p) || null };
            if (!acc[p].cities.has(c)) acc[p].cities.set(c, { tier: 城市评级 || '其他', code: cityCodeMap.get(`${p}|${c}`) || null });
            return acc;
        }, {});
        Object.keys(provinceCityTree).forEach(province => {
            provinceCityTree[province].cities = Array.from(provinceCityTree[province].cities.entries()).map(([name, cityInfo]) => ({ name, ...cityInfo }));
        });
        
        const options = {
            planTypes,
            provinceCityTree,
            subjectTree,
            ownerships: sortedOwnerships, // 使用排序后的结果
            eduLevels: sortedEduLevels,   // 使用排序后的结果
        };
        
        return response.status(200).json(options);

    } catch (error) {
        console.error("API Error (getPlanFilterOptions):", error);
        return response.status(500).json({ error: `服务器内部错误: ${error.message}` });
    }
}
