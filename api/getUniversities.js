import path from 'path';
import fs from 'fs/promises';

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
    try {
        // Construct the path to the CSV file within the project.
        const filePath = path.join(process.cwd(), '_data', 'universities.csv');
        
        // Read the file from the filesystem. This is extremely fast.
        const csvText = await fs.readFile(filePath, 'utf-8');
        
        const jsonData = parseCSV(csvText);

        response.status(200)
            .setHeader('Content-Type', 'application/json')
            .setHeader('Cache-Control', 's-maxage=31536000, stale-while-revalidate')
            .json(jsonData);

    } catch (error) {
        console.error("API Error (getUniversities):", error);
        if (error.code === 'ENOENT') {
            return response.status(500).json({ error: 'Data file not found on the server. Make sure universities.csv is in the _data folder.' });
        }
        response.status(500).json({ error: 'An error occurred while processing the data file.' });
    }
}