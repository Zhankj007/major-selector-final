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

// The main handler function remains the same.
export default async function handler(request, response) {
    try {
        // 设置CORS和请求来源限制
        const allowedOrigin = 'www.igaokao.top';
        const origin = request.headers.origin;
        
        // 开发环境允许本地请求
        if (process.env.NODE_ENV === 'development') {
            response.setHeader('Access-Control-Allow-Origin', '*');
        } else if (origin && origin.includes(allowedOrigin)) {
            response.setHeader('Access-Control-Allow-Origin', origin);
        } else {
            return response.status(403).json({ error: '禁止访问：只允许来自www.igaokao.top的请求' });
        }
        
        response.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        
        if (request.method === 'OPTIONS') {
            return response.status(200).end();
        }
        
        if (request.method !== 'GET') {
            return response.status(405).json({ error: 'Method Not Allowed' });
        }
        
        const { searchParams } = new URL(request.url, `http://${request.headers.host}`);
        const type = searchParams.get('type') || 'bachelor';

    const urlBachelor = process.env.SHEET_URL_BACHELOR;
    const urlAssociate = process.env.SHEET_URL_ASSOCIATE;
    let targetUrl = (type === 'associate') ? urlAssociate : urlBachelor;

    if (!targetUrl) {
        return response.status(500).json({ error: `Server configuration error: URL for type '${type}' is not set.` });
    }

    try {
        const fetchResponse = await fetch(targetUrl);
        if (!fetchResponse.ok) throw new Error(`Failed to fetch from Google Sheets: ${fetchResponse.statusText}`);
        const csvText = await fetchResponse.text();
        const flatData = parseCSV(csvText);
        const structuredData = buildHierarchy(flatData, type);
        response.status(200)
            .setHeader('Content-Type', 'application/json')
            .setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate')
            .json(structuredData);
    } catch (error) {
        console.error("API Error:", error);
        response.status(500).json({ error: error.message });
    }
}
