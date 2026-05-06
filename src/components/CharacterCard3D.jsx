import { useRef, useMemo, useState, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { useTexture, Text } from '@react-three/drei'
import * as THREE from 'three'
import characterImages from '../assets/characters.png'

const CARD_W = 0.85
const CARD_H = 1.25
const CARD_D = 0.04
const GAP_X = 1.15
const GAP_Z = 1.7
const COLS = 6

export default function CharacterCard3D({ character, eliminated, isSecret, onToggleEliminate }) {
  const groupRef = useRef()
  const rotX = useRef(0)
  const [hovered, setHovered] = useState(false)

  const baseTexture = useTexture(characterImages)

  const frontTex = useMemo(() => {
    const t = baseTexture.clone()
    t.needsUpdate = true
    t.wrapS = THREE.ClampToEdgeWrapping
    t.wrapT = THREE.ClampToEdgeWrapping
    // The CSS used background-size: 900% 600% on a 6×4 grid, meaning each cell
    // is 1.5× the element size and the element shows the center 2/3 of each dimension.
    // Repeat = 2/(3*COLS) × 2/(3*ROWS), offset adds a half-padding shift inward.
    const COLS = 6, ROWS = 4
    t.repeat.set(2 / (3 * COLS), 2 / (3 * ROWS))          // 1/9 × 1/6
    t.offset.set(
      character.col / COLS + 1 / (6 * COLS),               // col/6 + 1/36
      (ROWS - 1 - character.row) / ROWS + 1 / (6 * ROWS)   // (3-row)/4 + 1/24
    )
    return t
  }, [baseTexture, character.row, character.col])

  useEffect(() => () => frontTex.dispose(), [frontTex])

  const x = (character.col - (COLS - 1) / 2) * GAP_X
  const z = (character.row - 1.5) * GAP_Z
  const targetRot = eliminated ? -Math.PI / 2 : 0

  useFrame(() => {
    if (!groupRef.current) return
    rotX.current = THREE.MathUtils.lerp(rotX.current, targetRot, 0.07)
    groupRef.current.rotation.x = rotX.current
  })

  const cardColor = isSecret ? '#14532d' : eliminated ? '#1e293b' : '#0f2744'
  const edgeColor = isSecret ? '#16a34a' : eliminated ? '#374151' : '#1e40af'
  const glowIntensity = hovered && !eliminated ? 0.15 : 0

  return (
    <group
      ref={groupRef}
      position={[x, 0, z]}
      onClick={(e) => { e.stopPropagation(); onToggleEliminate() }}
      onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer' }}
      onPointerOut={(e) => { e.stopPropagation(); setHovered(false); document.body.style.cursor = 'auto' }}
    >
      {/* Card body — pivot at y=0 (card base), center at CARD_H/2 */}
      <group position={[0, CARD_H / 2, 0]}>
        {/* Card backing box */}
        <mesh castShadow>
          <boxGeometry args={[CARD_W, CARD_H, CARD_D]} />
          <meshStandardMaterial color={cardColor} roughness={0.6} metalness={0.1} emissive={edgeColor} emissiveIntensity={glowIntensity} />
        </mesh>

        {/* Portrait plane on front face */}
        <mesh position={[0, 0, CARD_D / 2 + 0.001]}>
          <planeGeometry args={[CARD_W, CARD_H]} />
          <meshStandardMaterial
            map={frontTex}
            roughness={0.4}
            transparent
            opacity={eliminated ? 0.35 : 1}
          />
        </mesh>

        {/* Back face — decorative */}
        <mesh position={[0, 0, -(CARD_D / 2 + 0.001)]} rotation={[0, Math.PI, 0]}>
          <planeGeometry args={[CARD_W, CARD_H]} />
          <meshStandardMaterial color={isSecret ? '#15803d' : '#1e3a8a'} roughness={0.5} />
        </mesh>

        {/* Hover glow border */}
        {hovered && !eliminated && (
          <mesh position={[0, 0, CARD_D / 2 + 0.002]}>
            <planeGeometry args={[CARD_W + 0.06, CARD_H + 0.06]} />
            <meshBasicMaterial color="#60a5fa" transparent opacity={0.3} />
          </mesh>
        )}

        {/* Secret character crown indicator */}
        {isSecret && (
          <mesh position={[0, CARD_H / 2 + 0.07, CARD_D / 2 + 0.001]}>
            <planeGeometry args={[0.5, 0.12]} />
            <meshBasicMaterial color="#22c55e" transparent opacity={0.9} />
          </mesh>
        )}
      </group>

      {/* Name label — sits at the base of the card front face */}
      <Text
        position={[0, 0.12, CARD_D / 2 + 0.01]}
        fontSize={0.13}
        color={eliminated ? '#4b5563' : isSecret ? '#4ade80' : '#e2e8f0'}
        anchorX="center"
        anchorY="bottom"
        renderOrder={2}
      >
        {character.name}
      </Text>

      {isSecret && (
        <Text
          position={[0, CARD_H + 0.18, CARD_D / 2 + 0.01]}
          fontSize={0.11}
          color="#4ade80"
          anchorX="center"
          anchorY="bottom"
          renderOrder={2}
        >
          YOU
        </Text>
      )}
    </group>
  )
}
