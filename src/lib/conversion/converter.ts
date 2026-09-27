import type { ConversionRequest, ConversionResult, Encoding, TraceItem } from './types';

const MAX_ITEMS = 100;
const bytePattern = /^[01]{8}$/;
const unicodePattern = /^(?:[01]{16}|[01]{32})$/;

function binaryFor(value: number, minimumWidth: number): string {
  const raw = value.toString(2);
  const width = Math.max(minimumWidth, Math.ceil(raw.length / 16) * 16);
  return raw.padStart(width, '0');
}

function trace(character: string, value: number, binary: string, label: string): TraceItem {
  const positions = Array.from(binary, (_, index) => binary.length - index - 1);
  const weights = positions.map((position) => `2^${position}`);
  const contributions = Array.from(binary, (bit, index) => bit === '1' ? String(2 ** positions[index]) : '0');
  return { character, label, decimal: value, binary, positions, weights, contributions, sum: value };
}

function tokenize(input: string): string[] {
  return input.trim() ? input.trim().split(/\s+/) : [];
}

function fail(error: string): ConversionResult {
  return { ok: false, error };
}

function validateCount(values: unknown[]): ConversionResult | undefined {
  if (values.length > MAX_ITEMS) return fail(`El límite es de ${MAX_ITEMS} caracteres o grupos.`);
  return undefined;
}

function encodeText(input: string, encoding: Encoding): ConversionResult {
  const characters = Array.from(input);
  const countError = validateCount(characters);
  if (countError) return countError;

  if (encoding === 'ascii') {
    for (const character of characters) if ((character.codePointAt(0) ?? 0) > 127) return fail(`«${character}» no pertenece a ASCII de 8 bits.`);
    const items = characters.map((character) => {
      const value = character.charCodeAt(0);
      return trace(character, value, value.toString(2).padStart(8, '0'), `ASCII ${value}`);
    });
    return { ok: true, output: items.map((item) => item.binary).join(' '), items };
  }

  if (encoding === 'utf8') {
    const encoder = new TextEncoder();
    const items = characters.flatMap((character) => Array.from(encoder.encode(character), (value) => trace(character, value, value.toString(2).padStart(8, '0'), `UTF-8 · byte ${value}`)));
    return { ok: true, output: items.map((item) => item.binary).join(' '), items };
  }

  const items = characters.map((character) => {
    const value = character.codePointAt(0) ?? 0;
    return trace(character, value, binaryFor(value, 16), `U+${value.toString(16).toUpperCase().padStart(4, '0')}`);
  });
  return { ok: true, output: items.map((item) => item.binary).join(' '), items };
}

function decodeBinary(input: string, encoding: Encoding): ConversionResult {
  const groups = tokenize(input);
  const countError = validateCount(groups);
  if (countError) return countError;
  if (!groups.length) return { ok: true, output: '', items: [] };

  const pattern = encoding === 'unicode' ? unicodePattern : bytePattern;
  if (groups.some((group) => !pattern.test(group))) {
    return fail(encoding === 'unicode' ? 'Cada grupo Unicode debe tener 16 o 32 bits.' : 'Cada byte debe contener exactamente 8 bits (0 o 1).');
  }

  const values = groups.map((group) => Number.parseInt(group, 2));
  if (encoding === 'ascii') {
    if (values.some((value) => value > 127)) return fail('ASCII de 8 bits solo admite valores entre 0 y 127.');
    const items = values.map((value, index) => trace(String.fromCharCode(value), value, groups[index], `ASCII ${value}`));
    return { ok: true, output: items.map((item) => item.character).join(''), items };
  }

  if (encoding === 'utf8') {
    try {
      const output = new TextDecoder('utf-8', { fatal: true }).decode(new Uint8Array(values));
      const items = values.map((value, index) => trace('', value, groups[index], `UTF-8 · byte ${value}`));
      return { ok: true, output, items };
    } catch {
      return fail('La secuencia UTF-8 no es válida o está incompleta.');
    }
  }

  if (values.some((value) => value > 0x10ffff || (value >= 0xd800 && value <= 0xdfff))) return fail('El punto de código Unicode está fuera de rango o es un sustituto UTF-16.');
  const items = values.map((value, index) => {
    const character = String.fromCodePoint(value);
    return trace(character, value, groups[index], `U+${value.toString(16).toUpperCase().padStart(4, '0')}`);
  });
  return { ok: true, output: items.map((item) => item.character).join(''), items };
}

export function convert(request: ConversionRequest): ConversionResult {
  return request.direction === 'text-to-binary'
    ? encodeText(request.input, request.encoding)
    : decodeBinary(request.input, request.encoding);
}

export const examples: Record<Encoding, { text: string; binary: string }> = {
  ascii: { text: 'Hola', binary: '01001000 01101111 01101100 01100001' },
  utf8: { text: '¡Hola!', binary: '11000010 10100001 01001000 01101111 01101100 01100001 00100001' },
  unicode: { text: 'A😀', binary: '0000000001000001 00000000000000011111011000000000' },
};
