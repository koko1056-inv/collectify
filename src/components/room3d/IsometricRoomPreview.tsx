import { useRef, Suspense } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { PerspectiveCamera, Html } from "@react-three/drei";
import * as THREE from "three";
import { RoomItem } from "@/hooks/useMyRoom";

interface IsometricRoomPreviewProps {
  roomItems: RoomItem[];
  backgroundImage?: string | null;
  backgroundColor?: string | null;
  onClick?: () => void;
  className?: string;
}

// シンプルなプレビュー用の床
function PreviewFloor() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
      <planeGeometry args={[10, 10]} />
      <meshStandardMaterial 
        color="#1a1a2e" 
        roughness={0.8}
        metalness={0.2}
      />
    </mesh>
  );
}

// プレビュー用の壁
function PreviewWalls() {
  return (
    <group>
      <mesh position={[0, 2.5, -5]} receiveShadow>
        <planeGeometry args={[10, 5]} />
        <meshStandardMaterial color="#16213e" roughness={0.9} />
      </mesh>
      <mesh position={[-5, 2.5, 0]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[10, 5]} />
        <meshStandardMaterial color="#1a1a2e" roughness={0.9} />
      </mesh>
    </group>
  );
}

// プレビュー用のアイテム（シンプル版）
function PreviewItem({ item }: { item: RoomItem }) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  const x = (item.position_x / 100) * 8 - 4;
  const z = (item.position_y / 100) * 8 - 4;
  const y = 0.3;
  const scale = Math.min(item.width, item.height) / 150;

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.position.y = y + Math.sin(state.clock.elapsedTime + x) * 0.05;
    }
  });

  const imageUrl = item.custom_image_url || item.item_data?.image;
  if (!imageUrl) return null;

  return (
    <group position={[x, y, z]}>
      <mesh ref={meshRef} scale={scale}>
        <boxGeometry args={[1.5, 1.5, 0.1]} />
        <meshStandardMaterial color="#ffffff" roughness={0.3} metalness={0.5} />
      </mesh>
    </group>
  );
}

// ネオンアクセント
function NeonAccents() {
  const ref1 = useRef<THREE.PointLight>(null);
  const ref2 = useRef<THREE.PointLight>(null);
  
  useFrame((state) => {
    if (ref1.current) {
      ref1.current.intensity = 1 + Math.sin(state.clock.elapsedTime * 2) * 0.3;
    }
    if (ref2.current) {
      ref2.current.intensity = 1 + Math.cos(state.clock.elapsedTime * 2) * 0.3;
    }
  });

  return (
    <>
      <pointLight ref={ref1} position={[-4, 3, -4]} color="#a855f7" intensity={1} distance={6} />
      <pointLight ref={ref2} position={[4, 3, -4]} color="#3b82f6" intensity={1} distance={6} />
    </>
  );
}

// 自動回転カメラ
function AutoRotateCamera() {
  const cameraRef = useRef<THREE.PerspectiveCamera>(null);
  
  useFrame((state) => {
    if (cameraRef.current) {
      const angle = state.clock.elapsedTime * 0.1;
      const radius = 12;
      cameraRef.current.position.x = Math.sin(angle) * radius;
      cameraRef.current.position.z = Math.cos(angle) * radius;
      cameraRef.current.lookAt(0, 0, 0);
    }
  });

  return (
    <PerspectiveCamera 
      ref={cameraRef}
      makeDefault 
      position={[8, 8, 8]} 
      fov={40}
    />
  );
}

// プレビューシーン
function PreviewScene({ roomItems }: { roomItems: RoomItem[] }) {
  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 10, 5]} intensity={0.6} />
      
      <NeonAccents />
      
      <PreviewFloor />
      <PreviewWalls />
      
      {/* 装飾的なボックス */}
      <mesh position={[-4, 0.75, -3]}>
        <boxGeometry args={[2, 1.5, 0.3]} />
        <meshStandardMaterial color="#2d2d4a" />
      </mesh>
      
      {roomItems.slice(0, 6).map((item) => (
        <PreviewItem key={item.id} item={item} />
      ))}
      
      <AutoRotateCamera />
    </>
  );
}

// ローダー
function Loader() {
  return (
    <Html center>
      <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
    </Html>
  );
}

export function IsometricRoomPreview({ 
  roomItems, 
  onClick,
  className = ""
}: IsometricRoomPreviewProps) {
  return (
    <div 
      className={`relative overflow-hidden rounded-2xl bg-[#0f0f23] cursor-pointer group ${className}`}
      onClick={onClick}
    >
      <Canvas
        shadows
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: false }}
        style={{ touchAction: 'none' }}
      >
        <color attach="background" args={["#0f0f23"]} />
        <fog attach="fog" args={["#0f0f23", 15, 30]} />
        
        <Suspense fallback={<Loader />}>
          <PreviewScene roomItems={roomItems} />
        </Suspense>
      </Canvas>
      
      {/* ホバーオーバーレイ */}
      <div className="absolute inset-0 bg-purple-500/0 group-hover:bg-purple-500/10 transition-colors pointer-events-none" />
      
      {/* グロー効果 */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-t from-purple-500/20 to-transparent" />
      </div>
    </div>
  );
}