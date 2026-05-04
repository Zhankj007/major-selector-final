/**
 * A robust CSV parser that handles quoted fields containing commas.
 * @param {string} csvText The raw CSV string.
 * @returns {Array<Object>} An array of objects representing the rows.
 */
function parseCSV(csvText) {
    // Normalize line endings and remove leading/trailing whitespace.
    const lines = csvText.trim().replace(/\r\n/g, '\n').split('\n');
    if (lines.length < 2) return [];

    // Extract headers and remove the BOM (Byte Order Mark) from the first header if it exists.
    const headers = lines[0].split(',').map((h, i) => {
        const header = h.trim();
        return i === 0 ? header.replace(/^\uFEFF/, '') : header;
    });

    const data = [];
    // Regex to properly split CSV row, handles quoted fields.
    const csvRegex = /(?:,|^)(?:"([^"]*(?:""[^"]*)*)"|([^",]*))/g;

    for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim() === '') continue; // Skip empty lines

        let values = [];
        let match;
        while (match = csvRegex.exec(lines[i])) {
            // If the field was quoted, use the content inside the quotes (group 1).
            // Otherwise, use the unquoted value (group 2).
            let value = match[1] !== undefined ? match[1].replace(/""/g, '"') : match[2];
            values.push(value.trim());
        }

        if (values.length === headers.length) {
            const entry = {};
            for (let j = 0; j < headers.length; j++) {
                entry[headers[j]] = values[j];
            }
            data.push(entry);
        } else {
            // Log lines that fail to parse correctly for debugging.
            console.warn(`Skipping malformed CSV line ${i + 1}: Expected ${headers.length} fields, but got ${values.length}. Line content: "${lines[i]}"`);
        }
    }
    return data;
}


/**
 * A function to structure flat data into a hierarchy.
 */
function buildHierarchy(data, type) {
    const hierarchy = {};
    const level1Key = (type === 'bachelor') ? '门类' : '专业大类';
    const level2Key = '专业类';
    data.forEach(item => {
        const level1Value = item[level1Key];
        const level2Value = item[level2Key];
        if (!level1Value || !level2Value) return;
        if (!hierarchy[level1Value]) {
            hierarchy[level1Value] = {};
        }
        if (!hierarchy[level1Value][level2Value]) {
            hierarchy[level1Value][level2Value] = [];
        }
        hierarchy[level1Value][level2Value].push(item);
    });
    return hierarchy;
}

// --- 添加带超时和重试机制的 fetch 函数 ---
async function fetchWithRetry(url, retries = 3, timeoutMs = 5000) {
    for (let i = 0; i < retries; i++) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
        try {
            const response = await fetch(url, { signal: controller.signal });
            clearTimeout(timeoutId);
            if (!response.ok) throw new Error(`HTTP 错误: ${response.status}`);
            return await response.text();
        } catch (error) {
            clearTimeout(timeoutId);
            console.warn(`⚠️ Google Docs 请求第 ${i + 1} 次失败: ${error.message}`);
            if (i === retries - 1) throw new Error(`请求 Google Docs 失败，已重试 ${retries} 次。原文错误: ${error.message}`);
            // 等待 1 秒后重试
            await new Promise(res => setTimeout(res, 1000));
        }
    }
}

// The main handler function remains the same.
export default async function handler(request, response) {
    const { searchParams } = new URL(request.url, `http://${request.headers.host}`);
    const type = searchParams.get('type') || 'bachelor';

    const urlBachelor = process.env.SHEET_URL_BACHELOR;
    const urlAssociate = process.env.SHEET_URL_ASSOCIATE;
    let targetUrl = (type === 'associate') ? urlAssociate : urlBachelor;

    if (!targetUrl) {
        return response.status(500).json({ error: `Server configuration error: URL for type '${type}' is not set.` });
    }

    try {
        // 使用带重试和超时机制的 fetch
        const csvText = await fetchWithRetry(targetUrl, 3, 6000); // 最多重试3次，每次超时6秒
        
        const flatData = parseCSV(csvText);
        const structuredData = buildHierarchy(flatData, type);
        
        response.status(200)
            .setHeader('Content-Type', 'application/json')
            // 让 Vercel CDN 缓存 2 小时，期间所有用户访问都是秒开
            .setHeader('Cache-Control', 's-maxage=7200, stale-while-revalidate')
            .json(structuredData);
    } catch (error) {
        console.error("API Error:", error);
        response.status(500).json({ error: error.message });
    }
}
