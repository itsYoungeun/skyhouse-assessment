import fs from 'fs';
import csv from 'csv-parser';
import { RawCampaign } from './types';

// Strip a leading UTF-8 BOM (code point 0xFEFF) from a header so the first
// column key is not corrupted when the CSV was saved with a BOM (common on
// Windows). 0xFEFF is used directly to keep this source ASCII-only.
function stripBom(header: string): string {
  return header.charCodeAt(0) === 0xfeff ? header.slice(1) : header;
}

// Read and parse a CSV file into raw rows. Rejects on any stream/read error.
export function readCampaignCsv(filePath: string): Promise<RawCampaign[]> {
  return new Promise((resolve, reject) => {
    const rows: RawCampaign[] = [];
    fs.createReadStream(filePath)
      .pipe(csv({ mapHeaders: ({ header }) => stripBom(header) }))
      .on('data', (row: RawCampaign) => rows.push(row))
      .on('end', () => resolve(rows))
      .on('error', reject);
  });
}
