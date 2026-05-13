// api/maintenance.js
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';

export const config = {
    api: {
        bodyParser: {
            sizeLimit: '10mb',
        },
    },
};

export default async function handler(request, response) {
    if (request.method !== 'POST') {
        return response.status(405).json({ error: 'Method Not Allowed' });
    }

    const { action } = request.body;

    if (action === 'update_universities') {
        return handleUpdateUniversities(request, response);
    } else {
        return handleScriptExecution(request, response);
    }
}

async function handleUpdateUniversities(req, res) {
    try {
        const { universityData } = req.body;
        if (!universityData || !Array.isArray(universityData)) {
            return res.status(400).json({ error: '无效的数据格式：缺少 universityData 数组' });
        }

        const dataDir = path.join(process.cwd(), '_data');
        const csvPath = path.join(dataDir, 'universities.csv');
        const backupName = `universities_backup_${new Date().toISOString().replace(/[:.]/g, '-')}.csv`;
        const backupPath = path.join(dataDir, backupName);

        // 1. 备份
        if (fs.existsSync(csvPath)) {
            fs.copyFileSync(csvPath, backupPath);
        }

        // 2. 读取现有数据
        let existingData = [];
        if (fs.existsSync(csvPath)) {
            const csvText = fs.readFileSync(csvPath, 'utf-8');
            const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true });
            existingData = parsed.data;
        }

        // 3. 索引
        const codeMap = new Map();
        const nameMap = new Map();
        existingData.forEach(row => {
            const code = String(row['院校编码'] || '').trim();
            const name = String(row['院校名'] || '').trim();
            if (code && code !== 'undefined') codeMap.set(code, row);
            else nameMap.set(name, row);
        });

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

        const resultData = universityData.map(excelRow => {
            const code = String(excelRow['院校编码'] || '').trim();
            const name = String(excelRow['院校名'] || '').trim();
            let existingRow = (code && code !== 'undefined') ? codeMap.get(code) : nameMap.get(name);

            const newRow = {};
            for (const [exCol, csvCol] of Object.entries(mapping)) {
                newRow[csvCol] = excelRow[exCol] ?? '';
            }

            yearlyFields.forEach(fieldCfg => {
                const targetCol = fieldCfg.target;
                const dataMap = parseStructuredField(existingRow ? existingRow[targetCol] : '');
                Object.entries(excelRow).forEach(([colName, value]) => {
                    const match = colName.match(fieldCfg.regex);
                    if (match && value) dataMap.set('20' + match[1], String(value).trim());
                });
                newRow[targetCol] = serializeStructuredField(dataMap);
            });
            return newRow;
        });

        fs.writeFileSync(csvPath, Papa.unparse(resultData), 'utf-8');
        res.status(200).json({ success: true, count: resultData.length, backupFile: backupName });
    } catch (error) {
        res.status(500).json({ error: `服务器错误: ${error.message}` });
    }
}

function handleScriptExecution(request, response) {
    const { action, filename, fileBase64 } = request.body;
    const cwd = process.cwd();
    let command = '';

    if (action === 'generate_static_data') {
        command = 'node generate_static_data.mjs';
    } else if (action === 'convert_ranking') {
        if (fileBase64) {
            const targetDir = path.join(cwd, '_data', 'ranking');
            if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
            fs.writeFileSync(path.join(targetDir, filename), Buffer.from(fileBase64.replace(/^data:.*?;base64,/, ""), 'base64'));
        }
        command = `node _data/ranking/convert.mjs ${filename}`;
    } else {
        return response.status(400).json({ error: '未知的操作类型' });
    }

    exec(command, { cwd }, (error, stdout, stderr) => {
        if (error) return response.status(500).json({ error: error.message, stderr, stdout });
        return response.status(200).json({ message: '执行成功', stdout, stderr });
    });
}

function parseStructuredField(str) {
    const map = new Map();
    if (!str || typeof str !== 'string') return map;
    str.split(';').filter(Boolean).forEach(p => {
        const [year, val] = p.split(':');
        if (year && val) map.set(year.trim(), val.trim());
    });
    return map;
}

function serializeStructuredField(map) {
    return Array.from(map.keys()).sort((a, b) => b - a).map(year => `${year}:${map.get(year)}`).join(';');
}
