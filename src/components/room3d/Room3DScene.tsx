import { useRef, useState, Suspense, useEffect } from "react";
import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { RoomItem } from "@/hooks/useMyRoom";

interface Room3DSceneProps {
  roomItems: RoomItem[];
  backgroundImage?: string | null;
  backgroundColor?: string | null;
  roomTitle?: string;
  isEditing?: boolean;
  onItemClick?: (item: RoomItem) => void;
  avatarUrl?: string | null;
}

// メインのルームフロア
function RoomFloor({ backgroundColor }: { backgroundColor?: string }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]} receiveShadow>
      <planeGeometry args={[20, 20]} />
      <meshStandardMaterial 
        color={backgroundColor || "#1a1a2e"} 
        roughness={0.8}
        metalness={0.2}
      />
    </mesh>
  );
}

// グリッドオーバーレイ
function GridOverlay() {
  return (
    <gridHelper 
      args={[20, 20, "#4a4a6a", "#2a2a4a"]} 
      position={[0, 0.01, 0]}
    />
  );
}

// 部屋の壁
function RoomWalls() {
  return (
    <group>
      {/* 後ろの壁 */}
      <mesh position={[0, 3, -10]} receiveShadow>
        <planeGeometry args={[20, 6]} />
        <meshStandardMaterial 
          color="#16213e" 
          roughness={0.9}
          metalness={0.1}
        />
      </mesh>
      {/* 左の壁 */}
      <mesh position={[-10, 3, 0]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[20, 6]} />
        <meshStandardMaterial 
          color="#1a1a2e" 
          roughness={0.9}
          metalness={0.1}
        />
      </mesh>
    </group>
  );
}

// ネオンライト効果
function NeonLight({ position, color }: { position: [number, number, number]; color: string }) {
  const lightRef = useRef<THREE.PointLight>(null);
  
  useFrame((state) => {
    if (lightRef.current) {
      lightRef.current.intensity = 2 + Math.sin(state.clock.elapsedTime * 2) * 0.5;
    }
  });

  return (
    <group position={position}>
      <pointLight ref={lightRef} color={color} intensity={2} distance={8} />
      <mesh>
        <sphereGeometry args={[0.1, 16, 16]} />
        <meshBasicMaterial color={color} />
      </mesh>
    </group>
  );
}

// テクスチャ付きアイテム
function ItemWithTexture({ 
  item, 
  onClick,
  imageUrl,
}: { 
  item: RoomItem; 
  onClick?: () => void;
  imageUrl: string;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  
  // テクスチャを読み込み
  useEffect(() => {
    const loader = new THREE.TextureLoader();
    loader.crossOrigin = 'anonymous';
    loader.load(
      imageUrl,
      (loadedTexture) => {
        loadedTexture.colorSpace = THREE.SRGBColorSpace;
        setTexture(loadedTexture);
      },
      undefined,
      (error) => {
        console.error('Failed to load texture:', error);
      }
    );
  }, [imageUrl]);
  
  const placement = item.placement || 'floor';
  const scale = Math.min(item.width, item.height) / 100;
  
  // 配置場所に応じた位置と回転を計算
  const getPositionAndRotation = () => {
    const posX = (item.position_x / 100);
    const posY = (item.position_y / 100);
    
    switch (placement) {
      case 'back_wall':
        return {
          position: [posX * 16 - 8, posY * 4 + 1, -9.9] as [number, number, number],
          rotation: [0, 0, 0] as [number, number, number],
        };
      case 'left_wall':
        return {
          position: [-9.9, posY * 4 + 1, posX * 16 - 8] as [number, number, number],
          rotation: [0, Math.PI / 2, 0] as [number, number, number],
        };
      default:
        return {
          position: [posX * 16 - 8, 0.5 + (item.z_index * 0.1), posY * 16 - 8] as [number, number, number],
          rotation: [-Math.PI / 2, 0, 0] as [number, number, number],
        };
    }
  };
  
  const { position, rotation } = getPositionAndRotation();
  const baseY = position[1];

  useFrame((state) => {
    if (meshRef.current && hovered) {
      const wobble = Math.sin(state.clock.elapsedTime * 3) * 0.02;
      meshRef.current.rotation.z = wobble;
    }
    if (groupRef.current && placement === 'floor') {
      groupRef.current.position.y = baseY + Math.sin(state.clock.elapsedTime + position[0]) * 0.05;
    }
  });

  return (
    <group ref={groupRef} position={position} rotation={rotation}>
      <mesh
        ref={meshRef}
        onClick={(e) => {
          e.stopPropagation();
          onClick?.();
        }}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
        castShadow
        scale={hovered ? scale * 1.1 : scale}
      >
        <planeGeometry args={[2, 2]} />
        {texture ? (
          <meshBasicMaterial 
            map={texture}
            side={THREE.DoubleSide}
            transparent
          />
        ) : (
          <meshStandardMaterial 
            color="#666666"
            roughness={0.3}
            side={THREE.DoubleSide}
          />
        )}
      </mesh>
      
      {hovered && (
        <pointLight color="#a855f7" intensity={1} distance={3} />
      )}
    </group>
  );
}

// 3Dアイテム（床・壁対応）
function Item3D({ 
  item, 
  onClick,
}: { 
  item: RoomItem; 
  onClick?: () => void;
}) {
  const imageUrl = item.custom_image_url || item.item_data?.image;
  
  if (!imageUrl) return null;

  return (
    <ItemWithTexture 
      item={item} 
      onClick={onClick} 
      imageUrl={imageUrl}
    />
  );
}

// アバター3D表示
function Avatar3D({ avatarUrl }: { avatarUrl: string }) {
  const [hovered, setHovered] = useState(false);
  const groupRef = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.position.y = 1 + Math.sin(state.clock.elapsedTime * 0.5) * 0.1;
    }
  });
  
  return (
    <group ref={groupRef} position={[0, 1, 5]}>
      <mesh
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
        scale={hovered ? 1.1 : 1}
      >
        <cylinderGeometry args={[1, 1, 0.1, 32]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      
      {/* アバターの光 */}
      <pointLight color="#a855f7" intensity={1} distance={3} position={[0, 1, 0]} />
    </group>
  );
}

// デコレーション家具
function Furniture() {
  return (
    <group>
      {/* 棚 */}
      <mesh position={[-8, 1.5, -8]} castShadow>
        <boxGeometry args={[4, 3, 0.5]} />
        <meshStandardMaterial color="#2d2d4a" roughness={0.7} />
      </mesh>
      
      {/* テーブル */}
      <mesh position={[5, 0.8, 0]} castShadow>
        <boxGeometry args={[3, 0.2, 2]} />
        <meshStandardMaterial color="#3d3d5a" roughness={0.6} />
      </mesh>
      
      {/* テーブルの脚 */}
      {[[-1, -1], [-1, 1], [1, -1], [1, 1]].map(([legX, legZ], i) => (
        <mesh key={i} position={[5 + legX * 1.2, 0.35, legZ * 0.8]} castShadow>
          <cylinderGeometry args={[0.08, 0.08, 0.7]} />
          <meshStandardMaterial color="#2d2d4a" />
        </mesh>
      ))}
    </group>
  );
}

// カメラコントローラー
function CameraController() {
  return (
    <OrbitControls
      enablePan={true}
      enableZoom={true}
      enableRotate={true}
      minDistance={5}
      maxDistance={25}
      minPolarAngle={Math.PI / 6}
      maxPolarAngle={Math.PI / 2.5}
    />
  );
}

// メインシーン
function Scene({ 
  roomItems, 
  backgroundColor, 
  onItemClick,
  avatarUrl
}: Room3DSceneProps) {
  return (
    <>
      {/* 環境光 */}
      <ambientLight intensity={0.3} />
      
      {/* メインライト */}
      <directionalLight
        position={[10, 15, 10]}
        intensity={0.8}
        castShadow
      />
      
      {/* ネオンライト */}
      <NeonLight position={[-8, 4, -8]} color="#a855f7" />
      <NeonLight position={[8, 4, -8]} color="#3b82f6" />
      <NeonLight position={[0, 5, -9]} color="#ec4899" />
      
      {/* 部屋の構造 */}
      <RoomFloor backgroundColor={backgroundColor || undefined} />
      <GridOverlay />
      <RoomWalls />
      <Furniture />
      
      {/* アイテム */}
      {roomItems.map((item) => (
        <Item3D 
          key={item.id} 
          item={item} 
          onClick={() => onItemClick?.(item)}
        />
      ))}
      
      {/* アバター */}
      {avatarUrl && <Avatar3D avatarUrl={avatarUrl} />}
      
      {/* カメラコントロール */}
      <CameraController />
    </>
  );
}

// ローディング表示（React DOM）
function LoaderOverlay() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0f0f23]">
      <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      <p className="text-white text-sm mt-4">ルームを読み込み中...</p>
    </div>
  );
}

export function Room3DScene(props: Room3DSceneProps) {
  return (
    <div className="relative w-full h-full min-h-[400px] bg-gradient-to-b from-[#0f0f23] to-[#1a1a2e] rounded-2xl overflow-hidden">
      <Suspense fallback={<LoaderOverlay />}>
        <Canvas
          shadows
          dpr={[1, 2]}
          gl={{ antialias: true, alpha: false }}
          style={{ background: '#0f0f23' }}
          camera={{ position: [12, 12, 12], fov: 50 }}
        >
          <Scene {...props} />
        </Canvas>
      </Suspense>
    </div>
  );
}
