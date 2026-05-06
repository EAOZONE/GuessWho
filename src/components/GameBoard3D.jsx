import { Suspense, useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import CharacterCard3D from './CharacterCard3D'

const CARD_W = 0.85
const CARD_H = 1.25
const GAP_X = 1.15
const GAP_Z = 1.7
const COLS = 6
const ROWS = 4

function BoardSurface() {
  const boardW = (COLS - 1) * GAP_X + CARD_W + 1.4
  const boardD = (ROWS - 1) * GAP_Z + CARD_H + 1.4

  return (
    <>
      {/* Table top */}
      <mesh position={[0, -0.18, 0]} receiveShadow>
        <boxGeometry args={[30, 0.35, 30]} />
        <meshStandardMaterial color="#120c08" roughness={0.98} />
      </mesh>

      {/* Board outer frame */}
      <mesh position={[0, 0.03, 0]} receiveShadow>
        <boxGeometry args={[boardW + 0.45, 0.07, boardD + 0.45]} />
        <meshStandardMaterial color="#1e3a8a" roughness={0.4} metalness={0.3} />
      </mesh>

      {/* Board surface */}
      <mesh position={[0, 0.07, 0]} receiveShadow>
        <boxGeometry args={[boardW + 0.1, 0.06, boardD + 0.1]} />
        <meshStandardMaterial color="#0c1e3d" roughness={0.55} metalness={0.15} />
      </mesh>
    </>
  )
}

function Lights() {
  return (
    <>
      <ambientLight intensity={0.55} color="#c8d8ff" />
      <directionalLight
        position={[6, 14, 10]}
        intensity={1.3}
        color="#ffffff"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-near={0.5}
        shadow-camera-far={40}
        shadow-camera-left={-12}
        shadow-camera-right={12}
        shadow-camera-top={12}
        shadow-camera-bottom={-12}
      />
      <pointLight position={[-8, 7, 5]} intensity={0.5} color="#3b82f6" />
      <pointLight position={[8, 5, -4]} intensity={0.35} color="#f97316" />
      <pointLight position={[0, 10, 0]} intensity={0.25} color="#7c3aed" />
    </>
  )
}

export default function GameBoard3D({ characters, playerBoard, secretCharId, onToggleEliminate }) {
  const eliminatedSet = useMemo(
    () => new Set(playerBoard.filter(c => c.eliminated).map(c => c.id)),
    [playerBoard]
  )

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <Canvas
        shadows
        gl={{ antialias: true, alpha: false }}
        camera={{ position: [0, 11, 13.5], fov: 44 }}
        style={{ background: 'linear-gradient(160deg, #060b18 0%, #0a1428 60%, #0f1f38 100%)' }}
      >
        <Lights />
        <Suspense fallback={null}>
          <BoardSurface />
          {characters.map(char => (
            <CharacterCard3D
              key={char.id}
              character={char}
              eliminated={eliminatedSet.has(char.id)}
              isSecret={char.id === secretCharId}
              onToggleEliminate={() => onToggleEliminate(char.id)}
            />
          ))}
        </Suspense>
        <OrbitControls
          target={[0, 1, 0]}
          maxPolarAngle={Math.PI / 2.05}
          minPolarAngle={Math.PI / 6}
          minDistance={7}
          maxDistance={24}
          enablePan={false}
        />
      </Canvas>
    </div>
  )
}
