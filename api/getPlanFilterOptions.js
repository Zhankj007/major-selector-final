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

        // 现在处理 plan_types, ownerships, 和 edu_levels
        const options = {
            planTypes: data.plan_types || [],
            ownerships: data.ownerships || [],
            eduLevels: data.edu_levels || [],
            // 为其他选项提供空的默认值，防止前端JS出错
            cityTiers: [],
            provinceCityTree: {},
            subjectTree: {},
        };
        
        return response.status(200).json(options);

    } catch (error) {
        console.error("API Error (getPlanFilterOptions):", error);
        return response.status(500).json({ error: `服务器内部错误: ${error.message}` });
    }
}
