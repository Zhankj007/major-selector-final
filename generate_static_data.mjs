import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// 加载环境变量
function loadEnv() {
    const envPath = path.join(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, 'utf-8');
        content.split('\n').forEach(line => {
            const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
            if (match) {
                let value = match[2] || '';
                value = value.replace(/^["']|["']$/g, '');
                process.env[match[1]] = value;
            }
        });
    }
}
loadEnv();

const supabase = createClient(
    process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

async function generateStaticData() {
    console.log("正在从数据库拉取最新数据...");
    
    // 1. 获取 Filter Options (复用 API 逻辑)
    const { data: filterData, error: filterError } = await supabase.rpc('get_distinct_plan_options');
    if (filterError) throw filterError;

    const {
        plan_types: planTypes = [],
        ownerships = [],
        edu_levels: eduLevels = [],
        city_data: cityData = [],
        subject_data: subjectData = [],
        cities_table: citiesTable = []
    } = filterData;

    const ownershipOrder = ['公办', '独立学院', '民办', '中外合作办学'];
    const eduLevelOrder = ['本科', '专科'];
    const sortedOwnerships = ownerships.sort((a, b) => {
        const iA = ownershipOrder.indexOf(a); const iB = ownershipOrder.indexOf(b);
        if (iA === -1) return 1; if (iB === -1) return -1; return iA - iB;
    });
    const sortedEduLevels = eduLevels.sort((a, b) => {
        const iA = eduLevelOrder.indexOf(a); const iB = eduLevelOrder.indexOf(b);
        if (iA === -1) return 1; if (iB === -1) return -1; return iA - iB;
    });

    const subjectTree = subjectData.reduce((acc, { 文理科归类, req }) => {
        if (!req) return acc;
        let category = 文理科归类?.trim() || '其他';
        if (category === '文科') category = '文科类';
        if (category === '理科') category = '理科类';
        if (!acc[category]) acc[category] = new Set();
        req.split(/[/,、，\s]/).forEach(r => { if (r.trim()) acc[category].add(r.trim()); });
        return acc;
    }, {});
    Object.keys(subjectTree).forEach(cat => {
        subjectTree[cat] = [...subjectTree[cat]].sort((a,b) => a.localeCompare(b, 'zh-CN'));
    });

    const provinceCodeMap = new Map();
    const cityCodeMap = new Map();
    for (const item of citiesTable) {
        if (item.省份 && (item.城市 === null || item.省份 === item.城市)) provinceCodeMap.set(item.省份, item.地区编码);
        if (item.省份 && item.城市) cityCodeMap.set(`${item.省份}|${item.城市}`, item.地区编码);
    }
    
    // 这里的 provinceCityTree 是为 plans.js 准备的
    const provinceCityTree = cityData.reduce((acc, { 省份, 城市, 城市评级 }) => {
        const p = 省份?.trim(); const c = 城市?.trim();
        if (!p || !c) return acc;
        if (!acc[p]) acc[p] = { cities: new Map(), code: provinceCodeMap.get(p) || null };
        if (!acc[p].cities.has(c)) acc[p].cities.set(c, { tier: 城市评级 || '其他', code: cityCodeMap.get(`${p}|${c}`) || null });
        return acc;
    }, {});
    Object.keys(provinceCityTree).forEach(province => {
        provinceCityTree[province].cities = Array.from(provinceCityTree[province].cities.entries()).map(([name, cityInfo]) => ({ name, ...cityInfo }));
    });

    const options = { planTypes, provinceCityTree, subjectTree, ownerships: sortedOwnerships, eduLevels: sortedEduLevels };

    // 确保 public/data 目录存在
    const dataDir = path.join(process.cwd(), 'public', 'data');
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

    // 保存为静态 JSON
    fs.writeFileSync(path.join(dataDir, 'planFilterOptions.json'), JSON.stringify(options, null, 2));
    console.log("✅ public/data/planFilterOptions.json 已生成！");


    // 2. 生成 universities.js 需要的完整省市官方排序
    const { data: citiesData, error: citiesError } = await supabase.from('cities').select('*').order('地区编码', { ascending: true });
    if (citiesError) throw citiesError;
    
    const provOrder = [];
    const fullCityTree = {};
    for (const item of citiesData) {
        if (item['省份'] && !provOrder.includes(item['省份'])) provOrder.push(item['省份']);
        if (item['省份'] && item['城市']) {
            if (!fullCityTree[item['省份']]) fullCityTree[item['省份']] = [];
            if (!fullCityTree[item['省份']].includes(item['城市'])) fullCityTree[item['省份']].push(item['城市']);
        }
    }
    
    const citiesOrderJson = { provOrder, cityTree: fullCityTree };
    fs.writeFileSync(path.join(dataDir, 'citiesOrder.json'), JSON.stringify(citiesOrderJson, null, 2));
    console.log("✅ public/data/citiesOrder.json 已生成！");
}

generateStaticData().catch(console.error);
