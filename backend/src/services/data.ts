import fs from 'fs';
import { Readable } from 'stream';
import csv from 'csv-parser';
import { RawCampaign } from '../types';

// Strip a leading UTF-8 BOM (code point 0xFEFF) from a header so the first
// column key is not corrupted when the CSV was saved with a BOM (common on
// Windows). 0xFEFF is used directly to keep this source ASCII-only.
function stripBom(header: string): string {
  return header.charCodeAt(0) === 0xfeff ? header.slice(1) : header;
}

// Collect parsed rows from any CSV byte/text stream. Rejects on stream error.
function collectRows(source: NodeJS.ReadableStream): Promise<RawCampaign[]> {
  return new Promise((resolve, reject) => {
    const rows: RawCampaign[] = [];
    source
      .pipe(csv({ mapHeaders: ({ header }) => stripBom(header) }))
      .on('data', (row: RawCampaign) => rows.push(row))
      .on('end', () => resolve(rows))
      .on('error', reject);
  });
}

// Read and parse a CSV file from disk (used to load the sample data at startup).
export function readCampaignCsv(filePath: string): Promise<RawCampaign[]> {
  return collectRows(fs.createReadStream(filePath));
}

// Parse CSV supplied as a string (used for user uploads).
export function parseCampaignCsv(text: string): Promise<RawCampaign[]> {
  return collectRows(Readable.from(text));
}
