import { createClient } from '@supabase/supabase-js';

const getArray = (param) => param ? param.split(',') : null;

// 定义所有“特殊”院校的判断条件，用于排除
const SPECIAL_UNI_LEVEL_TERMS = [
    'level:/985/', 'level:/211/', 'level:/双一流大学/',
    'level:/基础学科拔尖/', 'level:/保研资格/',
    'name:(省重点建设高校)|(省市共建重点高校)', 'owner:中外合作办学',
    'level:高水平学校', 'level:高水平专业群'
];

export default async function handler(request, response) {
    try {
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
        const supabase = createClient(supabaseUrl, supabaseAnonKey);

        const { searchParams } = new URL(request.url, `http://${request.headers.host}`);
        
        let query = supabase.from('2025gkplans').select('*');

        // --- Handle standard filters ---
        const planTypes = getArray(searchParams.get('planTypes')); if (planTypes) query = query.in('科类', planTypes);
        const cities = getArray(searchParams.get('cities')); if (cities) query = query.in('城市', cities);
        const ownerships = getArray(searchParams.get('ownerships')); if (ownerships) query = query.in('办学性质', ownerships);
        const eduLevels = getArray(searchParams.get('eduLevels')); if (eduLevels) query = query.in('本专科', eduLevels);
        const uniKeyword = searchParams.get('uniKeyword'); if (uniKeyword) query = query.ilike('院校名称', `%${uniKeyword}%`);

        const majorKeywords = getArray(searchParams.get('majorKeywords'));
        if (majorKeywords && majorKeywords.length > 0) {
            query = query.or(majorKeywords.map(kw => `专业名称.ilike.%${kw}%,专业简注.ilike.%${kw}%`).join(','));
        }
        const subjectReqs = getArray(searchParams.get('subjectReqs'));
        if (subjectReqs && subjectReqs.length > 0) {
            query = query.or(subjectReqs.map(req => `25年选科要求.ilike.%${req}%`).join(','));
        }

        // --- Handle complex "uniLevels" filter ---
        const uniLevels = getArray(searchParams.get('uniLevels'));
        if (uniLevels && uniLevels.length > 0) {
            const hasOtherUndergrad = uniLevels.includes('special:other_undergrad');
            const positiveUniLevels = uniLevels.filter(l => l !== 'special:other_undergrad');

            if (hasOtherUndergrad) {
                // 如果勾选了“非上述”，则执行排除法
                query = query.eq('本专科', '本科');
                const negativeOrs = [];
                SPECIAL_UNI_LEVEL_TERMS.forEach(level => {
                    const [column, term] = level.split(/:(.*)/s); // 分割列和条件
                    if (column === 'level') negativeOrs.push(`院校水平或来历.ilike.%${term}%`);
                    else if (column === 'name') term.split('|').forEach(t => negativeOrs.push(`院校名称.ilike.%${t}%`));
                    else if (column === 'owner') negativeOrs.push(`办学性质.eq.${term}`);
                });
                query = query.not.or(negativeOrs.join(','));

            } else if (positiveUniLevels.length > 0) {
                // 否则，执行常规的“或”查询
                const positiveOrs = [];
                positiveUniLevels.forEach(level => {
                    const [column, term] = level.split(/:(.*)/s);
                    if (column === 'level') positiveOrs.push(`院校水平或来历.ilike.%${term}%`);
                    else if (column === 'name') term.split('|').forEach(t => positiveOrs.push(`院校名称.ilike.%${t}%`));
                    else if (column === 'owner') positiveOrs.push(`办学性质.eq.${term}`);
                });
                if (positiveOrs.length > 0) {
                    query = query.or(positiveOrs.join(','));
                }
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
