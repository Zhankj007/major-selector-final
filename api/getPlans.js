import { createClient } from '@supabase/supabase-js';

export default async function handler(request, response) {
    try {
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseAnonKey) {
            throw new Error("在Vercel环境变量中未找到Supabase的URL或密钥。");
        }

        const supabase = createClient(supabaseUrl, supabaseAnonKey);

        // --- CORE FIX: Using the correct table name '2025gkplans' ---
        const { data, error } = await supabase
            .from('2025gkplans') // <--- 已修正为您正确的表名
            .select('*')
            .limit(10); // We still only fetch 10 rows for this test

        if (error) {
            throw new Error(`数据库查询失败: ${error.message}`);
        }
        
        return response.status(200).json(data);

    } catch (error) {
        console.error("API Error (getPlans):", error);
        return response.status(500).json({ error: `处理招生计划数据时发生错误: ${error.message}` });
    }
}
