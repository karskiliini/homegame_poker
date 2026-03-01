import { useMemo } from 'react';
import * as THREE from 'three';

interface PokerTableMeshProps {
  position: [number, number, number];
}

// Create an elliptical cylinder shape
function createEllipseShape(radiusX: number, radiusZ: number, segments = 64): THREE.Shape {
  const shape = new THREE.Shape();
  for (let i = 0; i <= segments; i++) {
    const theta = (i / segments) * Math.PI * 2;
    const x = Math.cos(theta) * radiusX;
    const y = Math.sin(theta) * radiusZ;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  return shape;
}

export function PokerTableMesh({ position }: PokerTableMeshProps) {
  const railGeometry = useMemo(() => {
    const shape = createEllipseShape(2.2, 1.3);
    const extrudeSettings = { depth: 0.12, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.04, bevelSegments: 4 };
    return new THREE.ExtrudeGeometry(shape, extrudeSettings);
  }, []);

  const feltGeometry = useMemo(() => {
    const shape = createEllipseShape(2.05, 1.15);
    const extrudeSettings = { depth: 0.02, bevelEnabled: false };
    return new THREE.ExtrudeGeometry(shape, extrudeSettings);
  }, []);

  return (
    <group position={position}>
      {/* Rail (dark wood) */}
      <mesh
        geometry={railGeometry}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.06, 0]}
      >
        <meshStandardMaterial color="#3d2b1f" roughness={0.6} metalness={0.1} />
      </mesh>

      {/* Felt surface */}
      <mesh
        geometry={feltGeometry}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.01, 0]}
      >
        <meshStandardMaterial color="#1a6b3c" roughness={0.9} metalness={0} />
      </mesh>

      {/* Table base/pedestal */}
      <mesh position={[0, -0.4, 0]}>
        <cylinderGeometry args={[0.6, 0.8, 0.7, 32]} />
        <meshStandardMaterial color="#2a1f14" roughness={0.7} metalness={0.1} />
      </mesh>
    </group>
  );
}
