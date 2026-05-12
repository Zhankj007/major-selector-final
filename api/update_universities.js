import path from 'path';
import fs from 'fs';
import Papa from 'papaparse';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { universityData } = req.body;
        if (!universityData || !Array.isArray(universityData)) {
            return res.status(400).json({ error: '无效的数据格式：缺少 universityData 数组' });
        }

        const dataDir = path.join(process.cwd(), '_data');
        const csvPath = path.join(dataDir, 'universities.csv');
        const backupName = `universities_backup_${new Date().toISOString().replace(/[:.]/g, '-')}.csv`;
        const backupPath = path.join(dataDir, backupName);

        // 1. 备份原文件
        if (fs.existsSync(csvPath)) {
            fs.copyFileSync(csvPath, backupPath);
        }

        // 2. 读取现有数据（用于合并历史推免率/升本率）
        let existingData = [];
        if (fs.existsSync(csvPath)) {
            const csvText = fs.readFileSync(csvPath, 'utf-8');
            const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true });
            existingData = parsed.data;
        }

        // 3. 构建历史数据索引 (优先级：院校编码 > 院校名)
        const codeMap = new Map();
        const nameMap = new Map();
        existingData.forEach(row => {
            const code = String(row['院校编码'] || '').trim();
            const name = String(row['院校名'] || '').trim();
            if (code && code !== 'undefined') codeMap.set(code, row);
            else nameMap.set(name, row);
        });

        // 4. 配置字段映射与合并逻辑 (同步 scripts/update_universities.mjs 的逻辑)
        const mapping = {
            '省份': '省份', '所在地': '城市', '院校名': '院校名', '主管部门': '主管部门',
            '院校编码': '院校编码', '院校水平': '院校水平', '院校来历': '院校来历',
            '建校时间': '建校时间', '院校类型': '院校类型', '软科校排': '软科校排',
            '城市评级': '城市评级', '招生电话': '招生电话', '院校地址': '院校地址',
            '办学层次': '办学层次', '办学性质': '办学性质', '校硕点': '校硕点',
            '校博点': '校博点', '学科评估统计': '第四轮学科评估统计',
            '第四轮学科评估': '第四轮学科评估结果', '一流学科数量': '一流学科数量',
            '一流学科': '一流学科', '招生章程': '招生章程', '学校招生信息': '学校招生信息',
            '校园VR': '校园VR', '院校百科': '院校百科', '就业质量': '就业质量',
            '24落实率': '就业落实率'
        };

        const yearlyFields = [
            { regex: /^(\d{2})推免率$/, target: '推免率' },
            { regex: /^(\d{2})升本率$/, target: '升本率' }
        ];

        // 5. 核心合并逻辑 (以传入的 universityData 为准)
        const resultData = universityData.map(excelRow => {
            const code = String(excelRow['院校编码'] || '').trim();
            const name = String(excelRow['院校名'] || '').trim();
            
            let existingRow = null;
            if (code && code !== 'undefined') existingRow = codeMap.get(code);
            else existingRow = nameMap.get(name);

            const newRow = {};
            // A. 基础映射
            for (const [exCol, csvCol] of Object.entries(mapping)) {
                newRow[csvCol] = excelRow[exCol] ?? '';
            }

            // B. 年度数据合并
            yearlyFields.forEach(fieldCfg => {
                const targetCol = fieldCfg.target;
                const dataMap = parseStructuredField(existingRow ? existingRow[targetCol] : '');
                
                Object.entries(excelRow).forEach(([colName, value]) => {
                    const match = colName.match(fieldCfg.regex);
                    if (match && value) {
                        const year = '20' + match[1];
                        dataMap.set(year, String(value).trim());
                    }
                });
                newRow[targetCol] = serializeStructuredField(dataMap);
            });

            return newRow;
        });

        // 6. 保存新 CSV
        const csvOutput = Papa.unparse(resultData);
        fs.writeFileSync(csvPath, csvOutput, 'utf-8');

        res.status(200).json({ 
            success: true, 
            count: resultData.length, 
            backupFile: backupName 
        });

    } catch (error) {
        console.error('API Error (update_universities):', error);
        res.status(500).json({ error: `服务器错误: ${error.message}` });
    }
}

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

function serializeStructuredField(map) {
    const sortedKeys = Array.from(map.keys()).sort((a, b) => b - a);
    return sortedKeys.map(year => `${year}:${map.get(year)}`).join(';');
}
