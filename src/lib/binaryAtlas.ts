export type BinaryLocation = {
  key: bigint;
  level: number;
  localIndex: bigint;
  binary: string;
  nodeAngleRadians: number;
  sectorStartRadians: number;
  sectorEndRadians: number;
  sectorCentreRadians: number;
  sectorWidthRadians: number;
  radius: number;
  visualY: number;
  isApproximate: boolean;
  renderedPrefix: string;
};

export const DEFAULT_RADIUS = 4;
export const DEFAULT_RENDER_PRECISION = 20;
export const LEVEL_SPACING = 0.75;

const TWO_PI = Math.PI * 2;
const pow2 = (level: number) => 1n << BigInt(level);

export function validateBinary(binary: string) {
  if (!binary || !/^[01]+$/.test(binary)) {
    throw new Error('Binary value must contain only 0 and 1 and cannot be empty.');
  }
}

export function validateKey(key: bigint) {
  if (typeof key !== 'bigint' || key < 1n) {
    throw new Error('Key must be an integer greater than or equal to 1.');
  }
}

export function getFirstKeyForLevel(level: number): bigint {
  if (!Number.isInteger(level) || level < 1) {
    throw new Error('Level must be a positive integer.');
  }
  return pow2(level) - 1n;
}

export function getLastKeyForLevel(level: number): bigint {
  return pow2(level + 1) - 2n;
}

export function bitLength(value: bigint): number {
  if (value < 0n) throw new Error('bitLength requires a non-negative bigint.');
  return value === 0n ? 0 : value.toString(2).length;
}

export function getLevelFromKey(key: bigint): number {
  validateKey(key);
  return bitLength(key + 1n) - 1;
}

export function binaryToKey(binary: string): bigint {
  validateBinary(binary);
  return getFirstKeyForLevel(binary.length) + BigInt(`0b${binary}`);
}

export function keyToBinary(key: bigint): string {
  validateKey(key);
  const level = getLevelFromKey(key);
  const localIndex = key - getFirstKeyForLevel(level);
  return localIndex.toString(2).padStart(level, '0');
}

export function getApproximatePrefix(binary: string, precision: number): string {
  validateBinary(binary);
  if (!Number.isInteger(precision) || precision < 1) {
    throw new Error('Precision must be a positive integer.');
  }
  return binary.slice(0, Math.min(binary.length, precision));
}

export function fractionFromPrefix(binary: string, precision = DEFAULT_RENDER_PRECISION): number {
  const prefix = getApproximatePrefix(binary, precision);
  return Number(BigInt(`0b${prefix}`)) / 2 ** prefix.length;
}

function sectorFraction(binary: string, offset: 0 | 0.5 | 1, precision: number): number {
  const prefix = getApproximatePrefix(binary, precision);
  return (Number(BigInt(`0b${prefix}`)) + offset) / 2 ** prefix.length;
}

export function binaryToLocation(
  binary: string,
  radius = DEFAULT_RADIUS,
  _levelScale = LEVEL_SPACING,
  renderPrecision = DEFAULT_RENDER_PRECISION,
): BinaryLocation {
  validateBinary(binary);
  const level = binary.length;
  const renderedPrefix = getApproximatePrefix(binary, renderPrecision);
  const localIndex = BigInt(`0b${binary}`);
  const key = binaryToKey(binary);
  const nodeAngleRadians = TWO_PI * fractionFromPrefix(binary, renderPrecision);
  const sectorStartRadians = TWO_PI * sectorFraction(binary, 0, renderPrecision);
  const sectorEndRadians = TWO_PI * sectorFraction(binary, 1, renderPrecision);
  const sectorCentreRadians = TWO_PI * sectorFraction(binary, 0.5, renderPrecision);
  const sectorWidthRadians = sectorEndRadians - sectorStartRadians;

  return {
    key,
    level,
    localIndex,
    binary,
    nodeAngleRadians,
    sectorStartRadians,
    sectorEndRadians,
    sectorCentreRadians,
    sectorWidthRadians,
    radius,
    visualY: (level - 1) * LEVEL_SPACING,
    isApproximate: renderedPrefix.length < binary.length,
    renderedPrefix,
  };
}

export function keyToLocation(key: bigint): BinaryLocation {
  return binaryToLocation(keyToBinary(key));
}

export function getParentKey(key: bigint): bigint | null {
  const binary = keyToBinary(key);
  return binary.length <= 1 ? null : binaryToKey(binary.slice(0, -1));
}

export function getChildKeys(key: bigint): [bigint, bigint] {
  const binary = keyToBinary(key);
  return [binaryToKey(`${binary}0`), binaryToKey(`${binary}1`)];
}

export function getProperAncestorBinaries(binary: string): string[] {
  validateBinary(binary);
  return Array.from({ length: Math.max(0, binary.length - 1) }, (_, index) => binary.slice(0, index + 1));
}

export function getChildBinaries(binary: string): [string, string] {
  validateBinary(binary);
  return [`${binary}0`, `${binary}1`];
}

export function getSharedPrefixLength(a: string, b: string): number {
  validateBinary(a);
  validateBinary(b);
  let index = 0;
  for (; index < Math.min(a.length, b.length) && a[index] === b[index]; index += 1);
  return index;
}

export function formatBigInt(value: bigint): string {
  return value.toString(10);
}

export function radiansToDegrees(radians: number) {
  return (radians * 180) / Math.PI;
}

export function cylindricalPoint(loc: BinaryLocation) {
  return {
    x: loc.radius * Math.cos(loc.nodeAngleRadians),
    y: loc.visualY,
    z: loc.radius * Math.sin(loc.nodeAngleRadians),
  };
}

export function isAncestorPrefix(a: string, b: string) {
  validateBinary(a);
  validateBinary(b);
  return b.startsWith(a) && a.length < b.length;
}

export function angularSeparation(a: string, b: string, precision = DEFAULT_RENDER_PRECISION) {
  const delta = Math.abs(fractionFromPrefix(a, precision) - fractionFromPrefix(b, precision)) * TWO_PI;
  return Math.min(delta, TWO_PI - delta);
}
