import { createClient } from '@supabase/supabase-js';

export default async function handler(request, response) {
    try {
        // 1. 安全地连接到Supabase数据库
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
        const supabase = createClient(supabaseUrl, supabaseAnonKey);

        // 2. 从前端请求中获取所有筛选条件
        const { searchParams } = new URL(request.url, `http://${request.headers.host}`);
        const keyword = searchParams.get('keyword'); // 院校或专业关键字
        // (我们为后续的筛选功能预留了接口)
        // const level = searchParams.get('level'); 
        // const type = searchParams.get('type');

        // 3. 构建查询
        let query = supabase
            .from('2025gkplans') // 确保这是您的表名
            .select('*');

        // 如果有关键字，则进行模糊查询
        if (keyword) {
            // 这条规则会查找“院校名称”或“专业名称”中包含关键字的记录
            query = query.or(`院校名称.ilike.%${keyword}%,专业名称.ilike.%${keyword}%`);
        }

        // (后续我们可以在这里添加更多 .eq() 或 .in() 的筛选)
        // if (level) {
        //     query = query.eq('办学层次', level);
        // }

        // 4. 执行查询，并设置最多返回500条记录的限制
        const { data, error } = await query.limit(500);

        if (error) {
            throw new Error(`数据库查询错误: ${error.message}`);
        }
        
        // 5. 成功返回查询结果
        return response.status(200).json(data);

    } catch (error) {
        console.error("API Error (getPlans):", error);
        return response.status(500).json({ error: `处理招生计划数据时发生错误: ${error.message}` });
    }
}
