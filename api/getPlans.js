import { createClient } from '@supabase/supabase-js';

const getArray = (param) => param ? param.split(',') : null;

export default async function handler(request, response) {
    try {
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
        const supabase = createClient(supabaseUrl, supabaseAnonKey);

        const { searchParams } = new URL(request.url, `http://${request.headers.host}`);
        
        let query = supabase.from('2025gkplans').select('*', { count: 'exact' });

        // --- 常规筛选 (保持不变) ---
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

        // --- 【核心修改】将“选科”筛选从模糊匹配改为精确匹配 ---
        const subjectReqs = getArray(searchParams.get('subjectReqs'));
        if (subjectReqs && subjectReqs.length > 0) {
            // 原来是 .or( ... .ilike ... )，现在改为 .in()，实现精确匹配
            query = query.in('25年选科要求', subjectReqs);
        }

        // --- “水平”(uniLevels)筛选逻辑 (保持不变) ---
        const uniLevels = getArray(searchParams.get('uniLevels'));
        if (uniLevels && uniLevels.length > 0) {
            
            const ZHEJIANG_FILTER_1 = '院校名称.ilike.%省重点建设高校%';
            const ZHEJIANG_FILTER_2 = '院校名称.ilike.%省市共建重点高校%';
            
            const createLevelFilter = (term) => `院校水平或来历.ilike.%/${term}%`;

            const OTHER_UNDERGRAD_EXCLUSION_TERMS = [
                createLevelFilter('985'), createLevelFilter('211'),
                createLevelFilter('双一流大学'), createLevelFilter('基础学科拔尖'),
                createLevelFilter('保研资格'), '办学性质.eq.中外合作办学',
                ZHEJIANG_FILTER_1, ZHEJIANG_FILTER_2
            ];

            const orConditions = uniLevels.flatMap(level => {
                if (level === 'special:other_undergrad') {
                    const exclusionFilter = `not.or(${OTHER_UNDERGRAD_EXCLUSION_TERMS.join(',')})`;
                    return [`and(本专科.eq.本科,${exclusionFilter})`];
                }
                
                if (level === 'name:(省重点建设高校)|(省市共建重点高校)') {
                    return [ZHEJIANG_FILTER_1, ZHEJIANG_FILTER_2];
                }
                
                const [column, term] = level.split(/:(.*)/s, 2);

                if (column === 'owner') {
                    return [`办学性质.eq.${term}`];
                }

                if (column === 'level') {
                    if (term === '高水平学校' || term === '高水平专业群') {
                        return [`院校水平或来历.ilike.%${term}%`];
                    } 
                    else {
                        const cleanTerm = term.replace(/\//g, '');
                        return [createLevelFilter(cleanTerm)];
                    }
                }
                
                return [];
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
