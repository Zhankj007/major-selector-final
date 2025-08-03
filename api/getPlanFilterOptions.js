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
            cities_table: citiesTable = [] // 获取新的编码表数据
        } = data;

        // --- 建立地区编码的快速查找字典 ---
        const provinceCodeMap = new Map();
        const cityCodeMap = new Map();
        for (const item of citiesTable) {
            if (item.省份 && (item.城市 === null || item.省份 === item.城市)) {
                // 这是一条省份记录
                if (!provinceCodeMap.has(item.省份)) {
                    provinceCodeMap.set(item.省份, item.地区编码);
                }
            }
            if (item.省份 && item.城市) {
                // 这是一条城市记录
                const key = `${item.省份}|${item.城市}`;
                if (!cityCodeMap.has(key)) {
                    cityCodeMap.set(key, item.地区编码);
                }
            }
        }
        
        // --- 城市数据处理 (附加编码信息) ---
        const provinceCityTree = cityData.reduce((acc, { 省份, 城市, 城市评级 }) => {
            const p = 省份?.trim();
            const c = 城市?.trim();
            if (!p || !c) return acc;

            if (!acc[p]) {
                acc[p] = {
                    cities: new Map(),
                    code: provinceCodeMap.get(p) || null // 附加省份编码
                };
            }
            if (!acc[p].cities.has(c)) {
                const cityKey = `${p}|${c}`;
                acc[p].cities.set(c, {
                    tier: 城市评级 || '其他',
                    code: cityCodeMap.get(cityKey) || null // 附加城市编码
                });
            }
            return acc;
        }, {});
        
        Object.keys(provinceCityTree).forEach(province => {
            provinceCityTree[province].cities = Array.from(provinceCityTree[province].cities.entries()).map(([name, cityInfo]) => ({ name, ...cityInfo }));
        });

        // --- 其他数据处理 (无变化) ---
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
