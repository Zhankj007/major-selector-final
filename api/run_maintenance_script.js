import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';

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

    const { action, filename, fileBase64 } = request.body;
    let command = '';
    const cwd = process.cwd();

    if (action === 'generate_static_data') {
        command = 'node generate_static_data.mjs';
    } else if (action === 'convert_ranking') {
        if (!filename || !/^[a-zA-Z0-9_.-]+$/.test(filename)) {
            return response.status(400).json({ error: '无效的文件名，请确保文件名不包含特殊字符' });
        }
        
        // 如果前端传来了文件内容，先将其保存到 _data/ranking/ 目录下
        if (fileBase64) {
            try {
                const targetDir = path.join(cwd, '_data', 'ranking');
                if (!fs.existsSync(targetDir)) {
                    fs.mkdirSync(targetDir, { recursive: true });
                }
                const targetPath = path.join(targetDir, filename);
                // 去除可能存在的 Base64 头 (如 data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,)
                const base64Data = fileBase64.replace(/^data:.*?;base64,/, "");
                fs.writeFileSync(targetPath, Buffer.from(base64Data, 'base64'));
                console.log(`已成功将上传文件保存至: ${targetPath}`);
            } catch (err) {
                console.error(`保存上传文件失败: ${err.message}`);
                return response.status(500).json({ error: `保存文件失败: ${err.message}` });
            }
        }

        // 使用相对路径，Node 会在当前工作目录执行
        command = `node _data/ranking/convert.mjs ${filename}`;
    } else {
        return response.status(400).json({ error: '未知的操作类型' });
    }

    exec(command, { cwd }, (error, stdout, stderr) => {
        if (error) {
            console.error(`执行出错: ${error.message}`);
            return response.status(500).json({ error: error.message, stderr, stdout });
        }
        return response.status(200).json({ message: '执行成功', stdout, stderr });
    });
}
