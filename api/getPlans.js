import { createClient } from '@supabase/supabase-js';

const getArray = (param) => param ? param.split(',') : null;

export default async function handler(request, response) {
    try {
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
        const supabase = createClient(supabaseUrl, supabaseAnonKey);

        const { searchParams } = new URL(request.url, `http://${request.headers.host}`);
        
        let query = supabase.from('2025gkplans').select('*', { count: 'exact' });

        // --- 其他筛选器保持不变 ---
        const uniKeyword = searchParams.get('uniKeyword'); if (uniKeyword) query = query.ilike('院校名称', `%${uniKeyword}%`);
        const planTypes = getArray(searchParams.get('planTypes')); if (planTypes) query = query.in('科类', planTypes);
        const cities = getArray(searchParams.get('cities')); if (cities) query = query.in('城市', cities);
        const ownerships = getArray(searchParams.get('ownerships')); if (ownerships) query = query.in('办学性质', ownerships);
        const eduLevels = getArray(searchParams.get('eduLevels')); if (eduLevels) query = query.in('本专科', eduLevels);

        const scoreLow = searchParams.get('scoreLow'); if (scoreLow) query = query.gte('25年分数线', parseInt(scoreLow, 10));
        const scoreHigh = searchParams.get('scoreHigh'); if (scoreHigh) query = query.lte('25年分数线', parseInt(scoreHigh, 10));
        const rankLow = searchParams.get('rankLow'); if (rankLow) query = query.gte('25年位次号', parseInt(rankLow, 10));
        const rankHigh = searchParams.get('rankHigh'); if (rankHigh) query = query.lte('25年位次号', parseInt(rankHigh, 10));
        
        const majorKeywords = getArray(searchParams.get('majorKeywords'));
        if (majorKeywords && majorKeywords.length > 0) {
            query = query.or(majorKeywords.map(kw => `专业名称.ilike.%${kw}%,专业简注.ilike.%${kw}%`).join(','));
        }
        const subjectReqs = getArray(searchParams.get('subjectReqs'));
        if (subjectReqs && subjectReqs.length > 0) {
            query = query.or(subjectReqs.map(req => `25年选科要求.ilike.%${req}%`).join(','));
        }

        // --- 【核心修改】调整“水平”(uniLevels)筛选逻辑 ---
        const uniLevels = getArray(searchParams.get('uniLevels'));
        if (uniLevels && uniLevels.length > 0) {
            const OTHER_UNDERGRAD_EXCLUSION_TERMS = [
                `院校水平或来历.ilike.%/985/%`, `院校水平或来历.ilike.%/211/%`,
                `院校水平或来历.ilike.%/双一流大学/%`, `院校水平或来历.ilike.%/基础学科拔尖/%`,
                `院校水平或来历.ilike.%/保研资格/%`, `办学性质.eq.中外合作办学`,
                `院校名称.ilike.%(省重点建设高校)%`, `院校名称.ilike.%(省市共建重点高校)%`
            ];

            // 使用 flatMap 来处理，确保最终得到一个扁平的条件数组
            const orConditions = uniLevels.flatMap(level => {
                // 条件A: “非上述普通本科” (逻辑不变)
                if (level === 'special:other_undergrad') {
                    const exclusionFilter = `not.or(${OTHER_UNDERGRAD_EXCLUSION_TERMS.join(',')})`;
                    return `and(本专科.eq.本科,${exclusionFilter})`;
                }
                
                // 【已修改】条件B: “浙江省重点高校”
                if (level === 'name:(省重点建设高校)|(省市共建重点高校)') {
                    // 返回一个包含两个独立条件的数组，而不是一个复杂的 or() 字符串
                    return [
                        `院校名称.ilike.%(省重点建设高校)%`,
                        `院校名称.ilike.%(省市共建重点高校)%`
                    ];
                }

                // 条件C: 其他所有普通选项 (逻辑不变)
                const [column, term] = level.split(/:(.*)/s);
                if (column === 'level') return `院校水平或来历.ilike.%${term}%`;
                if (column === 'owner') return `办学性质.eq.${term}`;
                
                return []; // 对于无法解析的选项，返回空数组，flatMap会将其移除
            });

            if (orConditions.length > 0) {
                query = query.or(orConditions.join(','));
            }
        }
        
        const { data, error, count } = await query.limit(1000);

        if (error) throw new Error(`数据库查询错误: ${error.message}`);
        
        return response.status(200).json({ data, count });

    } catch (error) {
        console.error("API Error (getPlans):", error);
        return response.status(500).json({ error: `处理招生计划数据时发生错误: ${error.message}` });
    }
}
