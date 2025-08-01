import { createClient } from '@supabase/supabase-js';

// Helper to safely get array from query params
const getArray = (param) => param ? param.split(',') : null;

export default async function handler(request, response) {
    try {
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
        const supabase = createClient(supabaseUrl, supabaseAnonKey);

        const { searchParams } = new URL(request.url, `http://${request.headers.host}`);
        
        // --- 1. 获取所有可能的筛选参数 ---
        const uniKeyword = searchParams.get('uniKeyword');
        const majorKeywords = getArray(searchParams.get('majorKeywords'));
        const cityTiers = getArray(searchParams.get('cityTiers'));
        const cities = getArray(searchParams.get('cities'));
        const subjectReqs = getArray(searchParams.get('subjectReqs'));
        const uniLevels = getArray(searchParams.get('uniLevels'));
        const ownerships = getArray(searchParams.get('ownerships'));
        const eduLevels = getArray(searchParams.get('eduLevels'));
        const planTypes = getArray(searchParams.get('planTypes'));

        // --- 2. 构建基础查询 ---
        // 注意：这里的表名 '2025gkplans' 是根据您之前的信息来的，如果不同请修改
        let query = supabase.from('2025gkplans').select('*');

        // --- 3. 根据参数动态添加筛选条件 ---
        if (uniKeyword) query = query.ilike('院校名称', `%${uniKeyword}%`);
        if (planTypes) query = query.in('科类', planTypes);
        if (cityTiers) query = query.in('城市评级', cityTiers);
        if (cities) query = query.in('城市', cities);
        if (ownerships) query = query.in('办学性质', ownerships);
        if (eduLevels) query = query.in('本专科', eduLevels);

        if (majorKeywords && majorKeywords.length > 0) {
            const orConditions = majorKeywords.map(kw => `专业名称.ilike.%${kw}%,专业简注.ilike.%${kw}%`).join(',');
            query = query.or(orConditions);
        }
        if (subjectReqs && subjectReqs.length > 0) {
            const orConditions = subjectReqs.map(req => `25年选科要求.ilike.%${req}%`).join(',');
            query = query.or(orConditions);
        }
        if (uniLevels && uniLevels.length > 0) {
            const orConditions = uniLevels.map(level => `院校水平或来历.ilike.%${level}%`).join(',');
            query = query.or(orConditions);
        }
        
        // --- 4. 执行查询，并限制返回数量 ---
        const { data, error } = await query.limit(500);

        if (error) throw new Error(`数据库查询错误: ${error.message}`);
        
        return response.status(200).json(data);

    } catch (error) {
        console.error("API Error (getPlans):", error);
        return response.status(500).json({ error: `处理招生计划数据时发生错误: ${error.message}` });
    }
}
