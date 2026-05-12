import xlsx from 'xlsx';
import Papa from 'papaparse';
import fs from 'fs';
import path from 'path';

/**
 * 高校库增量更新与格式转换脚本
 * 
 * 功能:
 * 1. 将 Excel 转换为结构化的 CSV (universities.csv)
 * 2. 自动合并历年推免率、升本率等字段为结构化字符串 (例如 2026:15%;2025:12%)
 * 3. 支持院校编码缺失 (港校) 和 重复编码 (不同校区) 的情况
 * 4. 增量更新: 保留现有 CSV 中 Excel 未提及的字段或历史数据 (如果需要)
 */

const CONFIG = {
    excelPath: './_data/全国高校库20260510.xlsx',
    csvPath: './_data/universities.csv',
    backupPath: `./_data/universities_backup_${new Date().toISOString().replace(/[:.]/g, '-')}.csv`,
    
    // 字段映射 [Excel列名]: [CSV目标列名]
    // 如果目标列名是 function，则用于特殊处理
    mapping: {
        '省份': '省份',
        '所在地': '城市',
        '院校名': '院校名',
        '主管部门': '主管部门',
        '院校编码': '院校编码',
        '院校水平': '院校水平',
        '院校来历': '院校来历',
        '建校时间': '建校时间',
        '院校类型': '院校类型',
        '软科校排': '软科校排',
        '城市评级': '城市评级',
        '招生电话': '招生电话',
        '院校地址': '院校地址',
        '办学层次': '办学层次',
        '办学性质': '办学性质',
        '校硕点': '校硕点',
        '校博点': '校博点',
        '学科评估统计': '第四轮学科评估统计',
        '第四轮学科评估': '第四轮学科评估结果',
        '一流学科数量': '一流学科数量',
        '一流学科': '一流学科',
        '招生章程': '招生章程',
        '学校招生信息': '学校招生信息',
        '校园VR': '校园VR',
        '院校百科': '院校百科',
        '就业质量': '就业质量',
        '24落实率': '就业落实率' // 新增字段
    },
    
    // 年度数据合并配置
    yearlyFields: [
        { regex: /^(\d{2})推免率$/, target: '推免率' },
        { regex: /^(\d{2})升本率$/, target: '升本率' }
    ]
};

async function main() {
    console.log('--- 开始更新高校库 ---');

    // 1. 备份现有文件 (如果存在)
    if (fs.existsSync(CONFIG.csvPath)) {
        fs.copyFileSync(CONFIG.csvPath, CONFIG.backupPath);
        console.log(`已备份原始 CSV 到: ${CONFIG.backupPath}`);
    }

    // 2. 读取 Excel
    console.log(`正在读取 Excel: ${CONFIG.excelPath}...`);
    const workbook = xlsx.readFile(CONFIG.excelPath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const excelData = xlsx.utils.sheet_to_json(sheet);
    console.log(`Excel 读取完成，共 ${excelData.length} 条记录。`);

    // 3. 读取现有 CSV (用于合并)
    let existingData = [];
    if (fs.existsSync(CONFIG.csvPath)) {
        const csvText = fs.readFileSync(CONFIG.csvPath, 'utf-8');
        const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true });
        existingData = parsed.data;
    }

    // 4. 处理数据：以 Excel 为准 (Master List)
    const resultData = [];

    // 创建旧数据的索引，优先使用院校编码
    const codeMap = new Map(); // 院校编码 -> row
    const nameMap = new Map(); // 院校名 -> row (用于无编码的情况)
    
    existingData.forEach(row => {
        const code = String(row['院校编码'] || '').trim();
        const name = String(row['院校名'] || '').trim();
        if (code && code !== 'undefined') {
            codeMap.set(code, row);
        } else {
            nameMap.set(name, row);
        }
    });

    excelData.forEach(excelRow => {
        const code = String(excelRow['院校编码'] || '').trim();
        const name = String(excelRow['院校名'] || '').trim();
        
        // 查找旧记录：优先查编码，查不到再查名称
        let existingRow = null;
        if (code && code !== 'undefined') {
            existingRow = codeMap.get(code);
        } else {
            existingRow = nameMap.get(name);
        }

        const newRow = {};
        
        // A. 基础字段映射 (以 Excel 最新的为准)
        for (const [exCol, csvCol] of Object.entries(CONFIG.mapping)) {
            newRow[csvCol] = excelRow[exCol] ?? '';
        }

        // B. 处理年度合并字段 (合并旧 CSV 的历史和 Excel 的新数据)
        CONFIG.yearlyFields.forEach(fieldCfg => {
            const targetCol = fieldCfg.target;
            
            // 1. 获取旧 CSV 里的历史数据
            const dataMap = parseStructuredField(existingRow ? existingRow[targetCol] : '');
            
            // 2. 从当前 Excel 行中提取新数据
            Object.entries(excelRow).forEach(([colName, value]) => {
                const match = colName.match(fieldCfg.regex);
                if (match && value) {
                    const year = '20' + match[1];
                    dataMap.set(year, String(value).trim());
                }
            });

            newRow[targetCol] = serializeStructuredField(dataMap);
        });

        // C. 清理冗余字段：删除所有旧的 XX年推免率 和 XX年升本率 格式的列
        Object.keys(newRow).forEach(key => {
            if (/^\d{2}年推免率$/.test(key) || /^\d{2}年升本率$/.test(key)) {
                delete newRow[key];
            }
        });

        resultData.push(newRow);
    });

    // 5. 写入 CSV
    const csvOutput = Papa.unparse(resultData);
    fs.writeFileSync(CONFIG.csvPath, csvOutput, 'utf-8');
    
    console.log(`--- 更新完成 ---`);
    console.log(`最终高校库总数: ${resultData.length}`);
    console.log(`数据已成功写入: ${CONFIG.csvPath}`);
}

/**
 * 解析结构化字段 "2025:60%;2024:58%" -> Map
 */
function parseStructuredField(str) {
    const map = new Map();
    if (!str || typeof str !== 'string') return map;
    
    const parts = str.split(';').filter(Boolean);
    parts.forEach(p => {
        const [year, val] = p.split(':');
        if (year && val) map.set(year.trim(), val.trim());
    });
    return map;
}

/**
 * 序列化 Map -> "2025:60%;2024:58%" (按年份降序)
 */
function serializeStructuredField(map) {
    const sortedKeys = Array.from(map.keys()).sort((a, b) => b - a);
    return sortedKeys.map(year => `${year}:${map.get(year)}`).join(';');
}

main().catch(err => {
    console.error('脚本运行出错:', err);
    process.exit(1);
});
