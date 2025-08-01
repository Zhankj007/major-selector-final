import path from 'path';
import fs from 'fs/promises';
import Papa from 'papaparse';

export default async function handler(request, response) {
    try {
        // 1. 定位文件路径
        const filePath = path.join(process.cwd(), '_data', 'universities.csv');
        
        // 2. 读取文件内容
        const csvText = await fs.readFile(filePath, 'utf-8');
        
        // 3. 使用 Papaparse 进行专业解析
        const result = Papa.parse(csvText, {
            header: true,         // 将第一行作为标题行
            skipEmptyLines: true, // 自动跳过空行
            dynamicTyping: true,  // 自动转换数字等类型
        });

        // 4. 获取解析后的数据
        const jsonData = result.data;

        // 检查解析过程中是否有错误
        if (result.errors.length > 0) {
            console.error("CSV Parsing Errors:", result.errors);
            // 即使有错，我们依然尝试返回解析成功的部分
        }

        if (!jsonData || jsonData.length === 0) {
            throw new Error("CSV文件虽已读取，但解析后数据为空。请检查CSV文件格式是否正确。");
        }

        // 5. 返回成功的结果
        response.status(200)
            .setHeader('Content-Type', 'application/json')
            .setHeader('Cache-Control', 's-maxage=31536000, stale-while-revalidate')
            .json(jsonData);

    } catch (error) {
        console.error("API Error (getUniversities):", error);
        if (error.code === 'ENOENT') {
            return response.status(500).json({ error: '数据文件未找到。请确认 universities.csv 文件在 _data 文件夹中。' });
        }
        response.status(500).json({ error: `处理数据文件时发生错误: ${error.message}` });
    }
}
