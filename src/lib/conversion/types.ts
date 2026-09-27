export type Direction = 'text-to-binary' | 'binary-to-text';
export type Encoding = 'ascii' | 'utf8' | 'unicode';

export interface ConversionRequest {
  direction: Direction;
  encoding: Encoding;
  input: string;
}

export interface TraceItem {
  character: string;
  label: string;
  decimal: number;
  binary: string;
  positions: number[];
  weights: string[];
  contributions: string[];
  sum: number;
}

export type ConversionResult =
  | { ok: true; output: string; items: TraceItem[] }
  | { ok: false; error: string };
