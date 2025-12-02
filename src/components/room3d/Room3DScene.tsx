import { useRef, useState, Suspense } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { 
  OrbitControls, 
  PerspectiveCamera,
  Html
} from "@react-three/drei";
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

// 3Dアイテム
function Item3D({ 
  item, 
  onClick,
  isEditing 
}: { 
  item: RoomItem; 
  onClick?: () => void;
  isEditing?: boolean;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  
  // 位置を3D空間に変換（パーセンテージから3D座標へ）
  const x = (item.position_x / 100) * 16 - 8;
  const z = (item.position_y / 100) * 16 - 8;
  const baseY = 0.5 + (item.z_index * 0.1);
  
  // サイズをスケールに変換
  const scale = Math.min(item.width, item.height) / 100;

  useFrame((state) => {
    if (meshRef.current && hovered) {
      meshRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 2) * 0.1;
    }
    // フローティングアニメーション
    if (groupRef.current) {
      groupRef.current.position.y = baseY + Math.sin(state.clock.elapsedTime + x) * 0.05;
    }
  });

  const imageUrl = item.custom_image_url || item.item_data?.image;
  
  if (!imageUrl) return null;

  return (
    <group ref={groupRef} position={[x, baseY, z]}>
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
        <boxGeometry args={[2, 2, 0.1]} />
        <meshStandardMaterial 
          color={hovered ? "#ffffff" : "#f0f0f0"}
          roughness={0.3}
          metalness={0.5}
        />
        {/* 画像をテクスチャとして適用 */}
        <Html
          position={[0, 0, 0.06]}
          style={{
            width: '100px',
            height: '100px',
            pointerEvents: 'none',
          }}
        >
          <img 
            src={imageUrl} 
            alt={item.item_data?.title || "item"}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              borderRadius: '8px',
            }}
          />
        </Html>
      </mesh>
      
      {/* ホバー時のグロー効果 */}
      {hovered && (
        <pointLight color="#a855f7" intensity={1} distance={3} />
      )}
      
      {/* アイテム名 */}
      {hovered && item.item_data?.title && (
        <Html position={[0, 1.5, 0]} center>
          <div className="bg-black/80 text-white px-3 py-1 rounded-full text-sm whitespace-nowrap backdrop-blur-sm">
            {item.item_data.title}
          </div>
        </Html>
      )}
    </group>
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
        <Html
          position={[0, 0.06, 0]}
          style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            overflow: 'hidden',
          }}
        >
          <img 
            src={avatarUrl} 
            alt="avatar"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              borderRadius: '50%',
            }}
          />
        </Html>
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
      {[[-1, -1], [-1, 1], [1, -1], [1, 1]].map(([x, z], i) => (
        <mesh key={i} position={[5 + x * 1.2, 0.35, z * 0.8]} castShadow>
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
      target={[0, 0, 0]}
    />
  );
}

// メインシーン
function Scene({ 
  roomItems, 
  backgroundColor, 
  onItemClick,
  isEditing,
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
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
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
          isEditing={isEditing}
        />
      ))}
      
      {/* アバター */}
      {avatarUrl && <Avatar3D avatarUrl={avatarUrl} />}
      
      {/* カメラコントロール */}
      <CameraController />
    </>
  );
}

// ローディング表示
function Loader() {
  return (
    <Html center>
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-white text-sm">ルームを読み込み中...</p>
      </div>
    </Html>
  );
}

export function Room3DScene(props: Room3DSceneProps) {
  return (
    <div className="w-full h-full min-h-[400px] bg-gradient-to-b from-[#0f0f23] to-[#1a1a2e] rounded-2xl overflow-hidden">
      <Canvas
        shadows
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: false }}
      >
        <PerspectiveCamera 
          makeDefault 
          position={[12, 12, 12]} 
          fov={50}
        />
        <color attach="background" args={["#0f0f23"]} />
        <fog attach="fog" args={["#0f0f23", 20, 50]} />
        
        <Suspense fallback={<Loader />}>
          <Scene {...props} />
        </Suspense>
      </Canvas>
    </div>
  );
}