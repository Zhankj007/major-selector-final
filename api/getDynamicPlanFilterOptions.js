import { createClient } from '@supabase/supabase-js';

const getArray = (param) => param ? param.split(',') : null;

export default async function handler(request, response) {
    try {
        const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
        const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
        const supabase = createClient(supabaseUrl, supabaseAnonKey);

        const { searchParams } = new URL(request.url, `http://${request.headers.host}`);
        
        // 核心优化：只拉取需要聚合的列，避免拉取整行数据导致内存溢出和 500 错误
        let query = supabase.from('gkplans').select('城市, 本专科, 办学性质, 科类, 当年选科要求');

        // --- 提取用户当前选中的过滤条件 ---
        const uniKeyword = searchParams.get('uniKeyword'); if (uniKeyword) query = query.ilike('院校名称', `%${uniKeyword}%`);
        const planTypes = getArray(searchParams.get('planTypes')); if (planTypes) query = query.in('科类', planTypes);
        const cities = getArray(searchParams.get('cities')); if (cities) query = query.in('城市', cities);
        const ownerships = getArray(searchParams.get('ownerships')); if (ownerships) query = query.in('办学性质', ownerships);
        const eduLevels = getArray(searchParams.get('eduLevels')); if (eduLevels) query = query.in('本专科', eduLevels);

        const scoreLow = searchParams.get('scoreLow'); if (scoreLow) query = query.gte('当年分数线', parseInt(scoreLow, 10));
        const scoreHigh = searchParams.get('scoreHigh'); if (scoreHigh) query = query.lte('当年分数线', parseInt(scoreHigh, 10));
        const rankLow = searchParams.get('rankLow'); if (rankLow) query = query.gte('当年位次号', parseInt(rankLow, 10));
        const rankHigh = searchParams.get('rankHigh'); if (rankHigh) query = query.lte('当年位次号', parseInt(rankHigh, 10));
        
        const majorKeywords = getArray(searchParams.get('majorKeywords'));
        if (majorKeywords && majorKeywords.length > 0) {
            query = query.or(majorKeywords.map(kw => `专业名称.ilike.%${kw}%,专业简注.ilike.%${kw}%`).join(','));
        }

        const subjectReqs = getArray(searchParams.get('subjectReqs'));
        if (subjectReqs && subjectReqs.length > 0) {
            query = query.in('当年选科要求', subjectReqs);
        }

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
                if (level.startsWith('level:')) {
                    const val = level.replace('level:', '');
                    if (val === '高水平学校' || val === '高水平专业群') {
                        return [`and(本专科.eq.专科,院校水平或来历.ilike.%${val}%)`];
                    }
                    return [`院校水平或来历.ilike.%${val}%`];
                }
                if (level.startsWith('owner:')) return [`办学性质.eq.${level.replace('owner:', '')}`];
                if (level.startsWith('name:')) {
                    const terms = level.replace('name:', '').split('|');
                    return terms.map(term => `院校名称.ilike.%${term.replace(/[()]/g, '')}%`);
                }
                return [];
            });
            if (orConditions.length > 0) {
                query = query.or(orConditions.join(','));
            }
        }

        // 为了解决筛选器的“自我排斥”问题（勾选A后同组B消失），我们需要对每个筛选组排除自身的过滤条件
        // 提取各种条件的构造函数
        const buildBaseQuery = () => {
            let q = supabase.from('gkplans').select('城市, 本专科, 办学性质, 科类, 当年选科要求');
            if (uniKeyword) q = q.ilike('院校名称', `%${uniKeyword}%`);
            const scoreLow = searchParams.get('scoreLow'); if (scoreLow) q = q.gte('当年分数线', parseInt(scoreLow, 10));
            const scoreHigh = searchParams.get('scoreHigh'); if (scoreHigh) q = q.lte('当年分数线', parseInt(scoreHigh, 10));
            const rankLow = searchParams.get('rankLow'); if (rankLow) q = q.gte('当年位次号', parseInt(rankLow, 10));
            const rankHigh = searchParams.get('rankHigh'); if (rankHigh) q = q.lte('当年位次号', parseInt(rankHigh, 10));
            if (majorKeywords && majorKeywords.length > 0) {
                q = q.or(majorKeywords.map(kw => `专业名称.ilike.%${kw}%,专业简注.ilike.%${kw}%`).join(','));
            }
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
                    if (level.startsWith('level:')) {
                        const val = level.replace('level:', '');
                        if (val === '高水平学校' || val === '高水平专业群') {
                            return [`and(本专科.eq.专科,院校水平或来历.ilike.%${val}%)`];
                        }
                        return [`院校水平或来历.ilike.%${val}%`];
                    }
                    if (level.startsWith('owner:')) return [`办学性质.eq.${level.replace('owner:', '')}`];
                    if (level.startsWith('name:')) {
                        const terms = level.replace('name:', '').split('|');
                        return terms.map(term => `院校名称.ilike.%${term.replace(/[()]/g, '')}%`);
                    }
                    return [];
                });
                if (orConditions.length > 0) q = q.or(orConditions.join(','));
            }
            return q;
        };

        const applyFilter = (q, key, values) => {
            if (values && values.length > 0) {
                if (key === '当年选科要求') return q.in(key, values);
                return q.in(key, values);
            }
            return q;
        };

        // 并发执行 5 个查询，每个查询都排除自身的过滤条件
        const queries = [
            applyFilter(applyFilter(applyFilter(applyFilter(buildBaseQuery(), '城市', cities), '办学性质', ownerships), '本专科', eduLevels), '当年选科要求', subjectReqs), // for planTypes (no planTypes filter)
            applyFilter(applyFilter(applyFilter(applyFilter(buildBaseQuery(), '科类', planTypes), '办学性质', ownerships), '本专科', eduLevels), '当年选科要求', subjectReqs), // for cities
            applyFilter(applyFilter(applyFilter(applyFilter(buildBaseQuery(), '科类', planTypes), '城市', cities), '本专科', eduLevels), '当年选科要求', subjectReqs), // for ownerships
            applyFilter(applyFilter(applyFilter(applyFilter(buildBaseQuery(), '科类', planTypes), '城市', cities), '办学性质', ownerships), '当年选科要求', subjectReqs), // for eduLevels
            applyFilter(applyFilter(applyFilter(applyFilter(buildBaseQuery(), '科类', planTypes), '城市', cities), '办学性质', ownerships), '本专科', eduLevels)  // for subjectReqs
        ];

        const results = await Promise.all(queries);
        results.forEach((res, idx) => {
            if (res.error) throw new Error(`数据库查询错误 (query ${idx}): ${res.error.message}`);
        });

        const validPlanTypes = new Set(results[0].data.map(row => row.科类).filter(Boolean));
        const validCities = new Set(results[1].data.map(row => row.城市).filter(Boolean));
        const validOwnerships = new Set(results[2].data.map(row => row.办学性质).filter(Boolean));
        const validEduLevels = new Set(results[3].data.map(row => row.本专科).filter(Boolean));
        const validSubjectReqs = new Set(results[4].data.map(row => row.当年选科要求).filter(Boolean));

        return response.status(200).json({
            planTypes: Array.from(validPlanTypes),
            cities: Array.from(validCities),
            ownerships: Array.from(validOwnerships),
            eduLevels: Array.from(validEduLevels),
            subjectReqs: Array.from(validSubjectReqs)
        });

    } catch (error) {
        console.error("API Error (getDynamicPlanFilterOptions):", error);
        return response.status(500).json({ error: `服务器内部错误: ${error.message}` });
    }
}
