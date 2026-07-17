import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { Line, OrbitControls, Text } from '@react-three/drei';
import type { PerspectiveCamera } from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import {
  BinaryLocation,
  LEVEL_SPACING,
  binaryToLocation,
  cylindricalPoint,
  getChildBinaries,
  getProperAncestorBinaries,
} from '../lib/binaryAtlas';
import { isValidLandmark, type Landmark } from '../lib/storage';

const SURFACE_OFFSET = 0.08;
const LOCAL_VERTICAL_WINDOW = 4.5;

type PointTuple = [number, number, number];

export type AtlasOverlayOptions = {
  showAncestors: boolean;
  showChildren: boolean;
  showSavedLandmarks: boolean;
  showSelectedSector: boolean;
};

export const DEFAULT_OVERLAYS: AtlasOverlayOptions = {
  showAncestors: false,
  showChildren: false,
  showSavedLandmarks: false,
  showSelectedSector: false,
};

export function getVisibleLocationBinaries(
  selectedBinary: string,
  landmarks: Landmark[],
  overlays: AtlasOverlayOptions,
): string[] {
  const values = new Set<string>([selectedBinary]);
  if (overlays.showAncestors) {
    getProperAncestorBinaries(selectedBinary).forEach((binary) => values.add(binary));
  }
  if (overlays.showChildren) {
    getChildBinaries(selectedBinary).forEach((binary) => values.add(binary));
  }
  if (overlays.showSavedLandmarks) {
    landmarks.filter(isValidLandmark).forEach((landmark) => values.add(landmark.binary));
  }
  return [...values];
}

function toSurfacePoint(loc: BinaryLocation): PointTuple {
  const point = cylindricalPoint(loc);
  const scale = (loc.radius + SURFACE_OFFSET) / loc.radius;
  return [point.x * scale, point.y, point.z * scale];
}

function Marker({ loc, color = '#54e5ff' }: { loc: BinaryLocation; color?: string }) {
  return (
    <mesh name={`atlas-marker:${loc.binary}`} position={toSurfacePoint(loc)}>
      <sphereGeometry args={[0.11, 24, 24]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.6} />
    </mesh>
  );
}

function LevelRing({ y, radius, color = '#244761' }: { y: number; radius: number; color?: string }) {
  const points = Array.from({ length: 129 }, (_, index) => {
    const angle = (Math.PI * 2 * index) / 128;
    return [radius * Math.cos(angle), y, radius * Math.sin(angle)] as PointTuple;
  });
  return <Line points={points} color={color} lineWidth={1} transparent opacity={0.65} />;
}

function SectorArc({ loc }: { loc: BinaryLocation }) {
  const points = Array.from({ length: 33 }, (_, index) => {
    const t = index / 32;
    const angle = loc.sectorStartRadians + t * loc.sectorWidthRadians;
    return [(loc.radius + 0.16) * Math.cos(angle), loc.visualY, (loc.radius + 0.16) * Math.sin(angle)] as PointTuple;
  });
  return <Line points={points} color="#ffd47a" lineWidth={4} />;
}

function Scene({
  selected,
  landmarks,
  overlays,
  focusToken,
}: {
  selected: BinaryLocation;
  landmarks: Landmark[];
  overlays: AtlasOverlayOptions;
  focusToken: number;
}) {
  const { camera } = useThree();
  const controlsRef = useRef<OrbitControlsImpl | null>(null);

  const locations = useMemo(() => {
    const binaries = getVisibleLocationBinaries(selected.binary, landmarks, overlays);
    return binaries.flatMap((binary) => {
      try {
        return [binaryToLocation(binary, selected.radius)];
      } catch {
        return [];
      }
    });
  }, [landmarks, overlays, selected.binary, selected.radius]);

  const ancestorLocations = overlays.showAncestors
    ? getProperAncestorBinaries(selected.binary).map((binary) => binaryToLocation(binary, selected.radius))
    : [];
  const childLocations = overlays.showChildren
    ? getChildBinaries(selected.binary).map((binary) => binaryToLocation(binary, selected.radius))
    : [];

  const minY = Math.max(0, selected.visualY - LOCAL_VERTICAL_WINDOW / 2);
  const maxY = selected.visualY + LOCAL_VERTICAL_WINDOW / 2;
  const cylinderHeight = maxY - minY;
  const cylinderMidY = minY + cylinderHeight / 2;
  const selectedPoint = cylindricalPoint(selected);

  useEffect(() => {
    const activeCamera = camera as PerspectiveCamera;
    const controls = controlsRef.current;
    if (!activeCamera || !controls || !('position' in activeCamera) || typeof activeCamera.position?.set !== 'function') return;
    controls.target.set(selectedPoint.x, selectedPoint.y, selectedPoint.z);
    activeCamera.position.set(selectedPoint.x + 4.5, selectedPoint.y + 1.6, selectedPoint.z + 4.5);
    activeCamera.lookAt(selectedPoint.x, selectedPoint.y, selectedPoint.z);
    controls.update();
  }, [camera, focusToken, selectedPoint.x, selectedPoint.y, selectedPoint.z]);

  return (
    <>
      <ambientLight intensity={0.6} />
      <pointLight position={[5, selected.visualY + 5, 5]} intensity={2} />
      <mesh position={[0, cylinderMidY, 0]}>
        <cylinderGeometry args={[selected.radius, selected.radius, cylinderHeight, 128, 12, true]} />
        <meshStandardMaterial color="#12304a" transparent opacity={0.16} wireframe />
      </mesh>
      {Array.from({ length: Math.floor(cylinderHeight / LEVEL_SPACING) + 2 }, (_, index) => minY + index * LEVEL_SPACING)
        .filter((y) => y <= maxY)
        .map((y) => (
          <LevelRing key={y.toFixed(3)} y={y} radius={selected.radius} />
        ))}
      <LevelRing y={selected.visualY} radius={selected.radius} color="#54e5ff" />
      <Text position={[-selected.radius - 0.7, selected.visualY, 0]} fontSize={0.18} color="#9fb5c7">
        L{selected.level}
      </Text>
      {overlays.showSelectedSector && <SectorArc loc={selected} />}
      {overlays.showAncestors &&
        ancestorLocations.slice(0, -1).map((location, index) => (
          <Line key={`ancestor-line-${location.binary}`} points={[toSurfacePoint(location), toSurfacePoint(ancestorLocations[index + 1])]} color="#7cf7b7" lineWidth={2} />
        ))}
      {overlays.showAncestors && ancestorLocations.length > 0 && (
        <Line points={[toSurfacePoint(ancestorLocations[ancestorLocations.length - 1]), toSurfacePoint(selected)]} color="#7cf7b7" lineWidth={2} />
      )}
      {overlays.showChildren &&
        childLocations.map((child) => (
          <Line key={`child-line-${child.binary}`} points={[toSurfacePoint(selected), toSurfacePoint(child)]} color="#ffd47a" lineWidth={2} />
        ))}
      {locations.map((location) => (
        <Marker
          key={location.binary}
          loc={location}
          color={location.binary === selected.binary ? '#54e5ff' : location.binary.startsWith(selected.binary) ? '#ffcc66' : '#8aa4ff'}
        />
      ))}
      <OrbitControls ref={controlsRef} makeDefault target={[selectedPoint.x, selectedPoint.y, selectedPoint.z]} />
      <gridHelper args={[10, 20, '#234', '#123']} />
    </>
  );
}

export function AtlasScene({
  selected,
  landmarks,
  overlays = DEFAULT_OVERLAYS,
  focusToken = 0,
}: {
  selected: BinaryLocation;
  landmarks: Landmark[];
  overlays?: AtlasOverlayOptions;
  focusToken?: number;
}) {
  return (
    <div className="scene" aria-label="Interactive procedural Binary Atlas cylinder">
      <Canvas camera={{ position: [7, 5, 7], fov: 50 }}>
        <Scene selected={selected} landmarks={landmarks} overlays={overlays} focusToken={focusToken} />
      </Canvas>
    </div>
  );
}
