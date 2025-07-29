import path from 'path';
import fs from 'fs/promises';

export default async function handler(request, response) {
    const report = {
        testRunTime: new Date().toISOString(),
        status: "pending",
        stages: {}
    };

    try {
        // --- Stage 1: File Reading ---
        const filePath = path.join(process.cwd(), '_data', 'universities.csv');
        const csvText = await fs.readFile(filePath, 'utf-8');
        report.stages.fileReading = {
            status: "成功",
            filePath: filePath,
            fileSizeBytes: Buffer.byteLength(csvText, 'utf-8'),
            rawContentSample: csvText.substring(0, 500) + '...'
        };

        // --- Stage 2: Line Splitting ---
        const lines = csvText.trim().replace(/\r\n/g, '\n').split('\n');
        report.stages.lineSplitting = {
            status: "成功",
            totalLinesFound: lines.length
        };

        if (lines.length < 2) {
            throw new Error("CSV文件行数不足，至少需要表头和一行数据。");
        }

        // --- Stage 3: Header Parsing ---
        const headerLine = lines[0];
        const headers = headerLine.split(',').map((h, i) => {
            const header = h.trim();
            // Remove BOM character from the very first header if it exists
            return i === 0 ? header.replace(/^\uFEFF/, '') : header;
        });
        report.stages.headerParsing = {
            status: "成功",
            rawHeader: headerLine,
            parsedHeaders: headers,
            headerCount: headers.length
        };

        // --- Stage 4: Row Parsing ---
        const parsingReport = {
            totalDataRows: lines.length - 1,
            successfullyParsedRows: 0,
            failedRows: 0,
            firstFailedRow: null
        };
        
        const data = [];
        const csvRegex = /(?:,|^)(?:"([^"]*(?:""[^"]*)*)"|([^",]*))/g;

        for (let i = 1; i < lines.length; i++) {
            if (lines[i].trim() === '') {
                parsingReport.totalDataRows--;
                continue;
            }

            let values = [];
            let match;
            while (match = csvRegex.exec(lines[i])) {
                let value = match[1] !== undefined ? match[1].replace(/""/g, '"') : match[2];
                values.push(value.trim());
            }

            if (values.length === headers.length) {
                parsingReport.successfullyParsedRows++;
                const entry = {};
                for (let j = 0; j < headers.length; j++) {
                    entry[headers[j]] = values[j];
                }
                data.push(entry);
            } else {
                parsingReport.failedRows++;
                if (!parsingReport.firstFailedRow) {
                    parsingReport.firstFailedRow = {
                        lineNumber: i + 1,
                        expectedColumns: headers.length,
                        foundColumns: values.length,
                        rawData: lines[i]
                    };
                }
            }
        }
        report.stages.rowParsing = { status: "完成", report: parsingReport };
        
        // --- Final Report ---
        report.status = "诊断完成";
        report.finalDataSample = data.slice(0, 3); // Show a sample of 3 successfully parsed rows

        return response.status(200).json(report);

    } catch (error) {
        report.status = "诊断失败";
        report.error = {
            message: error.message,
            stage: report.stages.rowParsing ? "Row Parsing" : (report.stages.headerParsing ? "Header Parsing" : (report.stages.fileReading ? "File Reading" : "Unknown"))
        };
        return response.status(500).json(report);
    }
}
