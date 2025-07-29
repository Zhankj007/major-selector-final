/**
 * A robust CSV parser that handles quoted fields containing commas.
 */
function parseCSV(csvText) {
    const lines = csvText.trim().replace(/\r\n/g, '\n').split('\n');
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map((h, i) => {
        const header = h.trim();
        return i === 0 ? header.replace(/^\uFEFF/, '') : header;
    });

    const data = [];
    const csvRegex = /(?:,|^)(?:"([^"]*(?:""[^"]*)*)"|([^",]*))/g;

    for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim() === '') continue;
        let values = [];
        let match;
        while (match = csvRegex.exec(lines[i])) {
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
            console.warn(`Skipping malformed CSV line in Universities data: line ${i + 1}`);
        }
    }
    return data;
}

export default async function handler(request, response) {
    const universitySheetUrl = process.env.SHEET_URL_UNIVERSITIES;

    if (!universitySheetUrl) {
        return response.status(500).json({ error: 'Server configuration error: SHEET_URL_UNIVERSITIES is not set.' });
    }

    try {
        const fetchResponse = await fetch(universitySheetUrl);
        if (!fetchResponse.ok) {
            throw new Error(`Failed to fetch from Google Sheets: ${fetchResponse.statusText}`);
        }
        const csvText = await fetchResponse.text();
        const jsonData = parseCSV(csvText);

        response.status(200)
            .setHeader('Content-Type', 'application/json')
            .setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate') // Cache for 1 hour
            .json(jsonData);

    } catch (error) {
        console.error("API Error (getUniversities):", error);
        response.status(500).json({ error: error.message });
    }
}