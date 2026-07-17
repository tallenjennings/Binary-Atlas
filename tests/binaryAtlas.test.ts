import { describe, expect, it } from 'vitest';
import {
  binaryToKey,
  binaryToLocation,
  cylindricalPoint,
  getChildBinaries,
  getChildKeys,
  getParentKey,
  getProperAncestorBinaries,
  getSharedPrefixLength,
  keyToBinary,
  keyToLocation,
  radiansToDegrees,
} from '../src/lib/binaryAtlas';

describe('Binary Atlas math engine', () => {
  it('maps required key examples', () => {
    const cases: Array<[bigint, number, string]> = [[1n, 1, '0'], [2n, 1, '1'], [3n, 2, '00'], [4n, 2, '01'], [5n, 2, '10'], [6n, 2, '11'], [7n, 3, '000'], [12n, 3, '101'], [14n, 3, '111'], [15n, 4, '0000']];
    for (const [key, level, binary] of cases) {
      const loc = keyToLocation(key);
      expect(loc.level).toBe(level);
      expect(loc.binary).toBe(binary);
    }
  });

  it('uses node angles without adding half a sector', () => {
    const cases: Array<[string, bigint, number, bigint, number]> = [['0', 1n, 1, 0n, 0], ['1', 2n, 1, 1n, 180], ['00', 3n, 2, 0n, 0], ['01', 4n, 2, 1n, 90], ['10', 5n, 2, 2n, 180], ['11', 6n, 2, 3n, 270], ['101', 12n, 3, 5n, 225]];
    for (const [binary, key, level, localIndex, degrees] of cases) {
      const loc = binaryToLocation(binary);
      expect(loc.key).toBe(key);
      expect(loc.level).toBe(level);
      expect(loc.localIndex).toBe(localIndex);
      expect(radiansToDegrees(loc.nodeAngleRadians)).toBeCloseTo(degrees, 8);
    }
  });

  it('places binary 101 at the expected radius-4 coordinates', () => {
    const point = cylindricalPoint(binaryToLocation('101', 4));
    expect(point.x).toBeCloseTo(-2.828427, 5);
    expect(point.z).toBeCloseTo(-2.828427, 5);
  });

  it('round trips keys and binaries', () => {
    for (const key of [1n, 2n, 12n, 255n, 900719925474099112345n]) expect(binaryToKey(keyToBinary(key))).toBe(key);
    for (const binary of ['0', '1', '101', '0000', '1'.repeat(80)]) expect(keyToBinary(binaryToKey(binary))).toBe(binary);
  });

  it('supports a 256-bit value and records approximation metadata', () => {
    const binary = '1'.repeat(256);
    const loc = binaryToLocation(binary, 4, undefined, 20);
    expect(loc.level).toBe(256);
    expect(loc.key > 2n ** 256n).toBe(true);
    expect(loc.isApproximate).toBe(true);
    expect(loc.renderedPrefix).toBe('1'.repeat(20));
  });

  it('computes parent child relationships', () => {
    expect(getParentKey(12n)).toBe(5n);
    expect(getChildKeys(5n)).toEqual([11n, 12n]);
  });

  it('computes proper ancestors and children without duplicating the selected binary', () => {
    expect(getProperAncestorBinaries('101')).toEqual(['1', '10']);
    expect(getChildBinaries('101')).toEqual(['1010', '1011']);
  });

  it('computes shared prefixes', () => {
    expect(getSharedPrefixLength('10110', '10100')).toBe(3);
    expect(getSharedPrefixLength('0', '1')).toBe(0);
  });

  it('rejects invalid values', () => {
    expect(() => keyToBinary(0n)).toThrow();
    expect(() => binaryToKey('102')).toThrow();
    expect(() => binaryToKey('')).toThrow();
  });
});
