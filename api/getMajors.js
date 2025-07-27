/**
 * A simple CSV parser.
 */
function parseCSV(csvText) {
    const lines = csvText.trim().replace(/\r/g, '').split('\n');
    if (lines.length < 2) return [];
    const headers = lines[0].split(',').map(h => h.trim());
    const data = [];
    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        if (values.length === headers.length) {
            const entry = {};
            for (let j = 0; j < headers.length; j++) {
                entry[headers[j]] = values[j];
            }
            data.push(entry);
        }
    }
    return data;
}

/**
 * A function to structure flat data into a hierarchy.
 * It intelligently determines the hierarchy keys based on the data type.
 */
function buildHierarchy(data, type) {
    const hierarchy = {};

    // *** FIX: Define keys explicitly for clarity ***
    const level1Key = (type === 'bachelor') ? '门类' : '专业大类';
    const level2Key = '专业类'; // This key is shared

    data.forEach(item => {
        const level1Value = item[level1Key];
        const level2Value = item[level2Key];

        if (!level1Value || !level2Value) return; // Skip rows with missing category info

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


export default async function handler(request, response) {
    const { searchParams } = new URL(request.url, `http://${request.headers.host}`);
    const type = searchParams.get('type') || 'bachelor'; // Default to bachelor

    const urlBachelor = process.env.SHEET_URL_BACHELOR;
    const urlAssociate = process.env.SHEET_URL_ASSOCIATE;

    let targetUrl;
    if (type === 'associate') {
        targetUrl = urlAssociate;
    } else {
        targetUrl = urlBachelor;
    }

    if (!targetUrl) {
        return response.status(500).json({ error: `Server configuration error: URL for type '${type}' is not set.` });
    }

    try {
        const fetchResponse = await fetch(targetUrl);
        if (!fetchResponse.ok) {
            throw new Error(`Failed to fetch from Google Sheets: ${fetchResponse.statusText}`);
        }
        const csvText = await fetchResponse.text();

        const flatData = parseCSV(csvText);
        const structuredData = buildHierarchy(flatData, type);

        response.status(200)
            .setHeader('Content-Type', 'application/json')
            .setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate')
            .json(structuredData);

    } catch (error) {
        console.error(error);
        response.status(500).json({ error: error.message });
    }
}
