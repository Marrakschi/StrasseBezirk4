export enum AppStep {
  IDLE = 'IDLE',
  CAMERA = 'CAMERA',
  PROCESSING_IMAGE = 'PROCESSING_IMAGE',
  RESULT = 'RESULT',
  ERROR = 'ERROR'
}

export interface StreetResult {
  name: string;
  number?: string;
  district?: string;
  streetBox?: number[]; // [ymin, xmin, ymax, xmax] (0-1000)
  numberBox?: number[]; // [ymin, xmin, ymax, xmax] (0-1000)
}

export interface HouseNumberParts {
  num: number;
  suffix: string;
}