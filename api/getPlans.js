import { createClient } from '@supabase/supabase-js';

export default async function handler(request, response) {
    try {
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseAnonKey) {
            throw new Error("在Vercel环境变量中未找到Supabase的URL或密钥。");
        }

        const supabase = createClient(supabaseUrl, supabaseAnonKey);

        // For this initial test, we fetch the first 10 rows.
        // Make sure your table name is 'plans'. If you named it '2025gkplans', change it here.
        const { data, error } = await supabase
            .from('plans') // <--- 如果您的表名是 2025gkplans, 请在这里修改
            .select('*')
            .limit(10);

        if (error) {
            throw new Error(`数据库查询失败: ${error.message}`);
        }
        
        return response.status(200).json(data);

    } catch (error) {
        console.error("API Error (getPlans):", error);
        return response.status(500).json({ error: `处理招生计划数据时发生错误: ${error.message}` });
    }
}
