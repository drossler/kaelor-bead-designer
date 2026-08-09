import { Canvas } from "@react-three/fiber";
import { ContactShadows, Environment, OrbitControls } from "@react-three/drei";
import { useMemo } from "react";
import * as THREE from "three";
import type { Bead, Pattern } from "@/lib/kaelor";

type Bracelet3DProps = {
  beads: Bead[];
  pattern: Pattern;
};

const RED = "#a90718";
const RED_LIGHT = "#d20a20";
const GOLD = "#dcae32";

function Tube({ points, radius = 0.055, color = RED }: { points: THREE.Vector3[]; radius?: number; color?: string }) {
  const geometry = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3(points, false, "centripetal");
    return new THREE.TubeGeometry(curve, 120, radius, 8, false);
  }, [points, radius]);

  return (
    <mesh geometry={geometry} castShadow receiveShadow>
      <meshStandardMaterial color={color} roughness={0.58} metalness={0.03} />
    </mesh>
  );
}

function MacrameArc() {
  const arcPoints = useMemo(() => {
    return [
      new THREE.Vector3(-2.34, -0.86, -0.06),
      new THREE.Vector3(-2.72, 0.1, -0.1),
      new THREE.Vector3(-2.28, 1.58, -0.18),
      new THREE.Vector3(-1.18, 2.18, -0.2),
      new THREE.Vector3(0, 2.3, -0.2),
      new THREE.Vector3(1.18, 2.18, -0.2),
      new THREE.Vector3(2.28, 1.58, -0.18),
      new THREE.Vector3(2.72, 0.1, -0.1),
      new THREE.Vector3(2.34, -0.86, -0.06),
    ];
  }, []);

  const knots = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3(arcPoints, false, "centripetal");
    return Array.from({ length: 42 }, (_, i) => {
      const t = (i + 0.5) / 42;
      const point = curve.getPointAt(t);
      const tangent = curve.getTangentAt(t);
      return {
        position: [point.x, point.y, point.z + 0.015] as [number, number, number],
        rotation: [Math.PI / 2, 0, Math.atan2(tangent.y, tangent.x)] as [number, number, number],
      };
    });
  }, [arcPoints]);

  return (
    <group>
      <Tube points={arcPoints} radius={0.095} />
      {knots.map((k, index) => (
        <mesh key={index} position={k.position} rotation={k.rotation} castShadow>
          <torusGeometry args={[0.105, 0.034, 6, 12]} />
          <meshStandardMaterial color={index % 2 ? RED : RED_LIGHT} roughness={0.65} />
        </mesh>
      ))}
    </group>
  );
}

function ClosureAndTails() {
  const leftTail = useMemo(
    () => [new THREE.Vector3(-0.6, 2.36, -0.02), new THREE.Vector3(-1.65, 2.78, 0), new THREE.Vector3(-2.62, 2.73, 0.04)],
    [],
  );
  const rightTail = useMemo(
    () => [new THREE.Vector3(0.45, 2.38, 0.03), new THREE.Vector3(1.35, 2.86, 0.04), new THREE.Vector3(2.35, 2.56, 0.06)],
    [],
  );

  return (
    <group>
      <Tube points={leftTail} radius={0.045} color={RED_LIGHT} />
      <Tube points={rightTail} radius={0.045} color={RED_LIGHT} />
      <mesh position={[0, 2.42, 0.08]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <capsuleGeometry args={[0.13, 0.62, 8, 16]} />
        <meshStandardMaterial color={RED} roughness={0.72} />
      </mesh>
      {[-2.62, 2.35].map((x, index) => (
        <mesh key={x} position={[x, index === 0 ? 2.73 : 2.56, 0.05]} castShadow>
          <sphereGeometry args={[0.13, 12, 10]} />
          <meshStandardMaterial color={RED} roughness={0.7} />
        </mesh>
      ))}
    </group>
  );
}

function distribute(beads: Bead[], pattern: Pattern): Bead[][] {
  if (pattern === "3carriles") {
    const side = Math.floor(beads.length / 3);
    const center = beads.length - side * 2;
    return [beads.slice(0, side), beads.slice(side, side + center), beads.slice(side + center)];
  }
  if (pattern === "2carriles") {
    const first = Math.floor(beads.length / 2);
    return [beads.slice(0, first), beads.slice(first)];
  }
  return [beads];
}

function BeadMesh({ bead, position, faceted }: { bead: Bead; position: [number, number, number]; faceted: boolean }) {
  const isNeo = bead.type === "NEO";
  const radius = THREE.MathUtils.clamp(bead.mm * 0.052, 0.17, 0.4);
  const beadColor = isNeo ? "#151515" : GOLD;

  return (
    <group position={position}>
      <mesh rotation={[Math.PI / 2, 0, 0]} castShadow receiveShadow>
        {faceted ? (
          <icosahedronGeometry args={[radius, 2]} />
        ) : (
          <sphereGeometry args={[radius, 22, 18]} />
        )}
        <meshStandardMaterial
          color={beadColor}
          metalness={isNeo ? 0.05 : 0.92}
          roughness={isNeo ? 0.72 : faceted ? 0.18 : 0.1}
          envMapIntensity={isNeo ? 0.35 : 1.8}
        />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[radius * 0.17, radius * 0.17, radius * 2.05, 12]} />
        <meshStandardMaterial color={RED} roughness={0.6} />
      </mesh>
    </group>
  );
}

function BeadedFront({ beads, pattern }: Bracelet3DProps) {
  const lanes = useMemo(() => distribute(beads, pattern).filter((lane) => lane.length > 0), [beads, pattern]);
  const laneCount = lanes.length;
  const maxLength = Math.max(1, ...lanes.map((lane) => lane.length));

  return (
    <group>
      {lanes.map((lane, laneIndex) => {
        const y = -1.12 + (laneIndex - (laneCount - 1) / 2) * 0.34;
        const halfSpan = Math.min(2.2, Math.max(0, (lane.length - 1) * 0.205));
        return lane.map((bead, index) => {
          const normalized = lane.length === 1 ? 0.5 : index / (lane.length - 1);
          const x = THREE.MathUtils.lerp(-halfSpan, halfSpan, normalized);
          const curve = 0.24 * Math.pow(x / 2.2, 2);
          const z = 0.18 - curve * 0.12 + (laneIndex === Math.floor(laneCount / 2) ? 0.12 : 0);
          const centeredOffset = ((maxLength - lane.length) / Math.max(maxLength - 1, 1)) * 0.08;
          return (
            <BeadMesh
              key={`${laneIndex}-${index}-${bead.type}`}
              bead={bead}
              position={[x * (1 - centeredOffset), y + curve, z]}
              faceted={laneCount === 3 && laneIndex === 1}
            />
          );
        });
      })}
      {[-1, 1].map((offset) => {
        const points = [
          new THREE.Vector3(-2.34, -0.86 + offset * 0.15, -0.02),
          new THREE.Vector3(0, -1.13 + offset * 0.17, 0.02),
          new THREE.Vector3(2.34, -0.86 + offset * 0.15, -0.02),
        ];
        return <Tube key={offset} points={points} radius={0.035} color={RED_LIGHT} />;
      })}
    </group>
  );
}

function BraceletModel(props: Bracelet3DProps) {
  return (
    <group rotation={[-0.12, 0.05, 0]} position={[0, -0.15, 0]}>
      <MacrameArc />
      <ClosureAndTails />
      <BeadedFront {...props} />
    </group>
  );
}

export default function Bracelet3D(props: Bracelet3DProps) {
  return (
    <div className="h-full min-h-[390px] w-full touch-none md:min-h-[560px]" aria-label="Modelo 3D interactivo de la manilla">
      <Canvas camera={{ position: [0, 0.1, 8.7], fov: 42 }} dpr={[1, 1.7]} shadows>
        <color attach="background" args={["#121212"]} />
        <ambientLight intensity={0.65} />
        <directionalLight position={[-4, 6, 7]} intensity={4.2} castShadow shadow-mapSize={[1024, 1024]} />
        <directionalLight position={[5, 1, 4]} intensity={2.1} color="#ffd27a" />
        <BraceletModel {...props} />
        <ContactShadows position={[0, -2.05, -0.8]} opacity={0.5} scale={9} blur={2.6} far={4} />
        <Environment preset="studio" />
        <OrbitControls
          makeDefault
          enablePan={false}
          minDistance={6.7}
          maxDistance={11}
          minPolarAngle={Math.PI * 0.2}
          maxPolarAngle={Math.PI * 0.8}
          autoRotate={false}
        />
      </Canvas>
    </div>
  );
}