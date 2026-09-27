import { describe, expect, it } from 'vitest';
import { convert } from '../src/lib/conversion/converter';

describe('convertidor', () => {
  it('convierte ASCII a binario de 8 bits con traza', () => {
    const result = convert({ direction: 'text-to-binary', encoding: 'ascii', input: 'AZ' });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.output).toBe('01000001 01011010');
      expect(result.items[0].decimal).toBe(65);
      expect(result.items[0].contributions).toContain('64');
    }
  });

  it('decodifica un flujo UTF-8', () => {
    const result = convert({ direction: 'binary-to-text', encoding: 'utf8', input: '11110000 10011111 10011000 10000000' });
    expect(result).toMatchObject({ ok: true, output: '😀' });
  });

  it('usa bloques Unicode de al menos 16 bits y múltiplos de 16', () => {
    const result = convert({ direction: 'text-to-binary', encoding: 'unicode', input: 'A😀' });
    expect(result).toMatchObject({ ok: true, output: '0000000001000001 00000000000000011111011000000000' });
  });

  it('rechaza caracteres fuera de ASCII', () => {
    expect(convert({ direction: 'text-to-binary', encoding: 'ascii', input: 'á' })).toMatchObject({ ok: false });
  });

  it('rechaza bytes UTF-8 incompletos', () => {
    expect(convert({ direction: 'binary-to-text', encoding: 'utf8', input: '11000010' })).toMatchObject({ ok: false });
  });

  it('rechaza grupos que no son binarios', () => {
    expect(convert({ direction: 'binary-to-text', encoding: 'ascii', input: '0100000x' })).toMatchObject({ ok: false });
  });

  it('rechaza puntos de código Unicode fuera del rango válido', () => {
    expect(convert({ direction: 'binary-to-text', encoding: 'unicode', input: '00000000000100010000000000000000' })).toMatchObject({ ok: false });
  });
});
