import { createClient } from '@supabase/supabase-js';

export default async function handler(request, response) {
    const report = {
        testRunTime: new Date().toISOString(),
        stages: {}
    };

    try {
        // --- Stage 1: Check for Environment Variables ---
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseAnonKey) {
            throw new Error("在Vercel环境变量中未找到 SUPABASE_URL 或 SUPABASE_ANON_KEY。");
        }
        report.stages.envCheck = {
            status: "成功",
            details: "已成功读取到Supabase的URL和密钥。"
        };

        // --- Stage 2: Create Supabase Client ---
        const supabase = createClient(supabaseUrl, supabaseAnonKey);
        report.stages.clientCreation = {
            status: "成功",
            details: "Supabase客户端已成功创建。"
        };

        // --- Stage 3: Attempt to Fetch Data ---
        // We try to fetch just one row from your table to test the connection.
        // IMPORTANT: Replace '2025gkplans' with the exact name of your table if it's different.
        const { data, error } = await supabase
            .from('2025gkplans') // <--- 请确保这里的表名和您在Supabase中创建的完全一致
            .select('*')
            .limit(1);
        
        if (error) {
            // If Supabase returns an error object, something is wrong with the query or permissions.
            throw new Error(`数据库查询失败: ${error.message}`);
        }

        if (!data || data.length === 0) {
            throw new Error("连接成功，但未能从'2025gkplans'表中获取到任何数据。请检查表是否为空。");
        }
        
        report.stages.dataFetch = {
            status: "成功",
            details: "已成功从您的数据库中读取到第一条数据。",
            sampleData: data[0]
        };

        // --- Final Report ---
        report.status = "连接测试成功！";
        report.conclusion = "您的Vercel应用已成功连接到Supabase数据库并读取了数据。我们可以开始进行下一步开发了。";

        return response.status(200).json(report);

    } catch (error) {
        report.status = "连接测试失败！";
        report.errorDetails = error.message;
        return response.status(500).json(report);
    }
}
