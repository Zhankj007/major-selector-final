import xlsx from 'xlsx';
import path from 'path';

const excelPath = 'c:/Users/zhank/OneDrive - 温州肯恩大学/antigravity_data/scratch/Gaokao-Tools/_data/全国高校库20260510.xlsx';
const workbook = xlsx.readFile(excelPath);
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const data = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
const header = data[0];

console.log('Excel Columns:', JSON.stringify(header, null, 2));
