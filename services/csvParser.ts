import { normalizeStreetName } from './streetLogic';

export const parseCSV = async (file: File): Promise<Map<string, string>> => {
  const text = await file.text();
  const lines = text.split(/\r?\n/);
  const map = new Map<string, string>();

  lines.forEach(line => {
    if (!line.trim()) return;

    // Detect delimiter (semicolon preferred, comma fallback)
    let delimiter = ';';
    if (line.indexOf(';') === -1 && line.indexOf(',') > -1) {
      delimiter = ',';
    }

    const parts = line.split(delimiter);

    if (parts.length >= 2) {
      const rawStreet = parts[0].trim();
      // Assume the last column is the district if there are multiple columns, 
      // or the second column. We'll take the second column as standard.
      const district = parts[1].trim();

      if (rawStreet && district) {
        // Normalize the key so lookups are consistent
        const key = normalizeStreetName(rawStreet);
        map.set(key, district);
      }
    }
  });

  return map;
};