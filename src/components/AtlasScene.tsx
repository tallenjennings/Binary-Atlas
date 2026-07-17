import { Canvas } from '@react-three/fiber';
import { Line, OrbitControls, Text } from '@react-three/drei';
import {
  BinaryLocation,
  binaryToLocation,
  cylindricalPoint,
} from '../lib/binaryAtlas';
import type { Landmark } from '../lib/storage';

const LEVEL_LABELS = [1, 2, 3, 4, 8, 16, 32, 64, 128, 256];
const SURFACE_OFFSET = 0.08;

function surfacePoint(loc: BinaryLocation) {
  const point = cylindricalPoint(loc);
  const scale = (loc.radius + SURFACE_OFFSET) / loc.radius;
  return { x: point.x * scale, y: point.y, z: point.z * scale };
}

function Marker({ loc, color = '#54e5ff' }: { loc: BinaryLocation; color?: string }) {
  const point = surfacePoint(loc);
  return (
    <mesh position={[point.x, point.y, point.z]}>
      <sphereGeometry args={[0.11, 24, 24]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.6} />
    </mesh>
  );
}

function LevelRing({ level, radius }: { level: number; radius: number }) {
  const y = 1.35 * Math.log2(level + 1);
  const points = Array.from({ length: 97 }, (_, i) => {
    const angle = (Math.PI * 2 * i) / 96;
    return [radius * Math.cos(angle), y, radius * Math.sin(angle)] as [number, number, number];
  });

  return <Line points={points} color="#244761" lineWidth={1} transparent opacity={0.5} />;
}

function Scene({ selected, landmarks }: { selected: BinaryLocation; landmarks: Landmark[] }) {
  const ancestors = Array.from({ length: selected.level }, (_, index) =>
    binaryToLocation(selected.binary.slice(0, index + 1)),
  );
  const children = [binaryToLocation(`${selected.binary}0`), binaryToLocation(`${selected.binary}1`)];
  const landmarkLocations = landmarks.map((landmark) => binaryToLocation(landmark.binary));
  const maxVisualY = Math.max(
    1.35 * Math.log2(257),
    selected.visualY,
    ...landmarkLocations.map((landmark) => landmark.visualY),
  );
  const cylinderHeight = maxVisualY + 1;
  const linePoints = [...ancestors, selected, ...children]
    .map(surfacePoint)
    .map((point) => [point.x, point.y, point.z] as [number, number, number]);

  return (
    <>
      <ambientLight intensity={0.6} />
      <pointLight position={[5, 8, 5]} intensity={2} />
      <mesh position={[0, cylinderHeight / 2, 0]}>
        <cylinderGeometry args={[selected.radius, selected.radius, cylinderHeight, 128, 32, true]} />
        <meshStandardMaterial color="#12304a" transparent opacity={0.16} wireframe />
      </mesh>
      {LEVEL_LABELS.map((level) => (
        <group key={level}>
          <LevelRing level={level} radius={selected.radius} />
          <Text position={[-selected.radius - 0.7, 1.35 * Math.log2(level + 1), 0]} fontSize={0.18} color="#9fb5c7">
            L{level}
          </Text>
        </group>
      ))}
      <Line points={linePoints} color="#7cf7b7" lineWidth={2} />
      {ancestors.map((location, index) => (
        <Marker key={index} loc={location} color="#8aa4ff" />
      ))}
      {children.map((location, index) => (
        <Marker key={`child-${index}`} loc={location} color="#ffcc66" />
      ))}
      <Marker loc={selected} />
      {landmarkLocations.map((location, index) => (
        <Marker key={landmarks[index].id} loc={location} color="#ff5fd7" />
      ))}
      <OrbitControls makeDefault target={[0, selected.visualY, 0]} />
      <gridHelper args={[10, 20, '#234', '#123']} />
    </>
  );
}

export function AtlasScene({ selected, landmarks }: { selected: BinaryLocation; landmarks: Landmark[] }) {
  return (
    <div className="scene" aria-label="Interactive procedural Binary Atlas cylinder">
      <Canvas camera={{ position: [7, 5, 7], fov: 50 }}>
        <Scene selected={selected} landmarks={landmarks} />
      </Canvas>
    </div>
  );
}
