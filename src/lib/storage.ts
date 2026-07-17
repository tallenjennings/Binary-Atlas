import { validateBinary, type BinaryLocation } from './binaryAtlas';

export type Landmark = {
  id: string;
  name: string;
  description: string;
  inputType: string;
  binary: string;
  key: string;
  level: number;
  coordinate: { angle: number; visualY: number; radius: number };
  thumbnail?: string;
  createdAt: string;
  exact: boolean;
  hash?: string;
};

const KEY = 'binary-atlas-landmarks';

export function isValidLandmark(value: unknown): value is Landmark {
  if (!value || typeof value !== 'object') return false;
  const landmark = value as Partial<Landmark>;
  if (typeof landmark.id !== 'string' || typeof landmark.name !== 'string' || typeof landmark.binary !== 'string') return false;
  try {
    validateBinary(landmark.binary);
  } catch {
    return false;
  }
  return typeof landmark.key === 'string' && Number.isInteger(landmark.level) && landmark.level === landmark.binary.length;
}

export function loadLandmarks(): Landmark[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(parsed) ? parsed.filter(isValidLandmark) : [];
  } catch {
    return [];
  }
}

export function saveLandmarks(items: Landmark[]) {
  localStorage.setItem(KEY, JSON.stringify(items.filter(isValidLandmark)));
}

export function landmarkFromLocation(
  name: string,
  inputType: string,
  loc: BinaryLocation,
  exact = true,
  description = '',
  thumbnail?: string,
  hash?: string,
): Landmark {
  return {
    id: crypto.randomUUID(),
    name,
    description,
    inputType,
    binary: loc.binary,
    key: loc.key.toString(),
    level: loc.level,
    coordinate: { angle: loc.nodeAngleRadians, visualY: loc.visualY, radius: loc.radius },
    thumbnail,
    createdAt: new Date().toISOString(),
    exact,
    hash,
  };
}
