import { StreetResult, HouseNumberParts } from '../types';

// Helper to normalize street names for comparison
// Exported so the CSV parser can use the same normalization logic
export const normalizeStreetName = (name: string): string => {
  return name.toLowerCase()
    .replace('straße', 'str.')
    .replace('str', 'str.')
    .replace(/\.$/, '.') 
    .replace(/\s+/g, '-') 
    .replace(/-+/g, '-');
};

// Helper to parse house numbers (e.g., "71a" -> {num: 71, suffix: "a"})
const parseHouseNumber = (input: string): HouseNumberParts => {
  const match = input.match(/^(\d+)([a-zA-Z]*)$/);
  if (!match) return { num: 0, suffix: '' };
  return {
    num: parseInt(match[1], 10),
    suffix: match[2].toLowerCase()
  };
};

// Compare logic
const isLessOrEqual = (a: HouseNumberParts, b: HouseNumberParts): boolean => {
  if (a.num !== b.num) return a.num < b.num;
  return a.suffix <= b.suffix;
};

const isGreaterOrEqual = (a: HouseNumberParts, b: HouseNumberParts): boolean => {
  if (a.num !== b.num) return a.num > b.num;
  return a.suffix >= b.suffix;
};

// Main Logic Function
export const determineDistrict = (
  streetNameRaw: string, 
  houseNumberRaw: string,
  streetMap?: Map<string, string>, // Optional CSV Data
  streetBox?: number[],
  numberBox?: number[]
): StreetResult => {
  const streetName = normalizeStreetName(streetNameRaw);
  const hn = parseHouseNumber(houseNumberRaw);
  const isEven = hn.num % 2 === 0;

  // Base result object
  const baseResult: StreetResult = {
    name: streetNameRaw,
    number: houseNumberRaw,
    district: 'Bezirk Unbekannt',
    streetBox,
    numberBox
  };

  // --- SPECIAL HARDCODED LOGIC (Priority) ---

  // Logic for Gereonstr.
  if (streetName.includes('gereonstr')) {
    let isDistrict1 = false;

    if (!isEven) {
      // Odd: 1 bis 3 -> Bezirk 1
      if (hn.num >= 1 && hn.num <= 3) isDistrict1 = true;
    } else {
      // Even: 2 bis 2c -> Bezirk 1
      const start = { num: 2, suffix: '' };
      const end = { num: 2, suffix: 'c' };
      if (isGreaterOrEqual(hn, start) && isLessOrEqual(hn, end)) {
        isDistrict1 = true;
      }
    }

    return { ...baseResult, name: 'Gereonstraße', district: isDistrict1 ? 'Bezirk 1' : 'Bezirk 2' };
  }

  // Logic for Konrad-Adenauer-Str.
  if (streetName.includes('konrad-adenauer')) {
    // Konrad-Adenauer-Str. 1 bis 71a und 4 bis 44b -> Bezirk 1
    // Konrad-Adenauer-Str. 75 bis 151 und 46 bis 134 -> Bezirk 3

    if (!isEven) {
      // ODD Numbers
      const range1Start = { num: 1, suffix: '' };
      const range1End = { num: 71, suffix: 'a' };
      
      const range3Start = { num: 75, suffix: '' };
      const range3End = { num: 151, suffix: '' };

      if (isGreaterOrEqual(hn, range1Start) && isLessOrEqual(hn, range1End)) {
        return { ...baseResult, name: 'Konrad-Adenauer-Straße', district: 'Bezirk 1' };
      }
      if (isGreaterOrEqual(hn, range3Start) && isLessOrEqual(hn, range3End)) {
        return { ...baseResult, name: 'Konrad-Adenauer-Straße', district: 'Bezirk 3' };
      }

    } else {
      // EVEN Numbers
      const range1Start = { num: 4, suffix: '' };
      const range1End = { num: 44, suffix: 'b' };

      const range3Start = { num: 46, suffix: '' };
      const range3End = { num: 134, suffix: '' };

      if (isGreaterOrEqual(hn, range1Start) && isLessOrEqual(hn, range1End)) {
         return { ...baseResult, name: 'Konrad-Adenauer-Straße', district: 'Bezirk 1' };
      }
      if (isGreaterOrEqual(hn, range3Start) && isLessOrEqual(hn, range3End)) {
         return { ...baseResult, name: 'Konrad-Adenauer-Straße', district: 'Bezirk 3' };
      }
    }
    
    // Fallback if not in these ranges for Konrad Adenauer
    return { ...baseResult, name: 'Konrad-Adenauer-Straße' };
  }

  // Logic for Oberdorfstr.
  if (streetName.includes('oberdorfstr')) {
    // Oberdorfstr. 1 bis 21 ungerade  2 bis 18 gerade -> Bezirk 7
    if (!isEven) {
      if (hn.num >= 1 && hn.num <= 21) {
        return { ...baseResult, name: 'Oberdorfstraße', district: 'Bezirk 7' };
      }
    } else {
      if (hn.num >= 2 && hn.num <= 18) {
        return { ...baseResult, name: 'Oberdorfstraße', district: 'Bezirk 7' };
      }
    }
    return { ...baseResult, name: 'Oberdorfstraße' };
  }

  // Logic for Rheinblick
  if (streetName.includes('rheinblick')) {
    // Rheinblick 1 bis 19 ungerade und 2 bis 12 gerade -> Bezirk 8
    // Rheinblick 21 bis 25 und 12a -> Bezirk 7

    if (!isEven) {
      // Ungerade
      if (hn.num >= 1 && hn.num <= 19) {
        return { ...baseResult, name: 'Rheinblick', district: 'Bezirk 8' };
      }
      if (hn.num >= 21 && hn.num <= 25) {
        return { ...baseResult, name: 'Rheinblick', district: 'Bezirk 7' };
      }
    } else {
      // Gerade
      // Spezialfall 12a -> Bezirk 7
      if (hn.num === 12 && hn.suffix === 'a') {
        return { ...baseResult, name: 'Rheinblick', district: 'Bezirk 7' };
      }
      // 2 bis 12 (außer 12a oben abgefangen) -> Bezirk 8
      if (hn.num >= 2 && hn.num <= 12) {
        return { ...baseResult, name: 'Rheinblick', district: 'Bezirk 8' };
      }
    }
    return { ...baseResult, name: 'Rheinblick' };
  }

  // Logic for Rolandstr.
  if (streetName.includes('rolandstr')) {
    // Rolandstr. 1 bis 7b ungerade ,11 bis 27 ungerade -> Bezirk 1
    // Rolandstr. 2 bis 20 gerade -> Bezirk 1

    if (!isEven) {
      // 1 bis 7b
      const start1 = { num: 1, suffix: '' };
      const end1 = { num: 7, suffix: 'b' };
      if (isGreaterOrEqual(hn, start1) && isLessOrEqual(hn, end1)) {
        return { ...baseResult, name: 'Rolandstraße', district: 'Bezirk 1' };
      }

      // 11 bis 27
      if (hn.num >= 11 && hn.num <= 27) {
        return { ...baseResult, name: 'Rolandstraße', district: 'Bezirk 1' };
      }
    } else {
      // 2 bis 20
      if (hn.num >= 2 && hn.num <= 20) {
        return { ...baseResult, name: 'Rolandstraße', district: 'Bezirk 1' };
      }
    }
    return { ...baseResult, name: 'Rolandstraße' };
  }

  // --- CSV MAP LOOKUP (Fallback) ---
  if (streetMap) {
    // Attempt exact match with normalized key
    if (streetMap.has(streetName)) {
      return {
        ...baseResult,
        name: streetNameRaw,
        district: streetMap.get(streetName) || 'Bezirk Unbekannt'
      };
    }
  }

  // Default fallback
  return { 
    ...baseResult,
    district: 'Unbekannter Bezirk' 
  };
};