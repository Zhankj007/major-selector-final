import { createClient } from '@supabase/supabase-js';

const getArray = (param) => param ? param.split(',') : null;

export default async function handler(request, response) {
    try {
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
        const supabase = createClient(supabaseUrl, supabaseAnonKey);

        const { searchParams } = new URL(request.url, `http://${request.headers.host}`);
        
        const uniKeyword = searchParams.get('uniKeyword');
        const majorKeywords = getArray(searchParams.get('majorKeywords'));
        const cities = getArray(searchParams.get('cities'));
        const subjectReqs = getArray(searchParams.get('subjectReqs'));
        const uniLevels = getArray(searchParams.get('uniLevels')); // 新的复杂参数
        const ownerships = getArray(searchParams.get('ownerships'));
        const eduLevels = getArray(searchParams.get('eduLevels'));
        const planTypes = getArray(searchParams.get('planTypes'));

        let query = supabase.from('2025gkplans').select('*');

        if (uniKeyword) query = query.ilike('院校名称', `%${uniKeyword}%`);
        if (planTypes) query = query.in('科类', planTypes);
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

        // **新增：处理复杂的“院校水平”筛选**
        if (uniLevels && uniLevels.length > 0) {
            const levelOrs = [];
            const nameOrs = [];
            const ownerOrs = [];

            uniLevels.forEach(level => {
                const [column, term] = level.split(':');
                if (column === 'level') {
                    levelOrs.push(`院校水平或来历.ilike.%${term}%`);
                } else if (column === 'name') {
                    // 处理 "term1|term2" 的情况
                    const nameTerms = term.split('|');
                    nameTerms.forEach(t => nameOrs.push(`院校名称.ilike.%${t}%`));
                } else if (column === 'owner') {
                    ownerOrs.push(`办学性质.eq.${term}`);
                }
            });
            
            const allOrConditions = [...levelOrs, ...nameOrs, ...ownerOrs].join(',');
            if(allOrConditions) {
                query = query.or(allOrConditions);
            }
        }
        
        const { data, error } = await query.limit(500);

        if (error) throw new Error(`数据库查询错误: ${error.message}`);
        
        return response.status(200).json(data);

    } catch (error) {
        console.error("API Error (getPlans):", error);
        return response.status(500).json({ error: `处理招生计划数据时发生错误: ${error.message}` });
    }
}
