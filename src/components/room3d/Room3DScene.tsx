import { useRef, useState, Suspense, useEffect } from "react";
import { Canvas, useFrame, useThree, ThreeEvent } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { RoomItem } from "@/hooks/useMyRoom";
import { FurnitureItem3D, RoomFurniture } from "./FurnitureItem3D";
import { FURNITURE_PRESETS } from "./furniturePresets";

interface Room3DSceneProps {
  roomItems: RoomItem[];
  roomFurniture?: RoomFurniture[];
  backgroundImage?: string | null;
  backgroundColor?: string | null;
  roomTitle?: string;
  isEditing?: boolean;
  onItemClick?: (item: RoomItem) => void;
  onItemMove?: (itemId: string, posX: number, posY: number) => void;
  onFurnitureClick?: (furniture: RoomFurniture) => void;
  onFurnitureMove?: (furnitureId: string, posX: number, posY: number) => void;
  avatarUrl?: string | null;
  selectedItemId?: string | null;
  selectedFurnitureId?: string | null;
  itemRotations?: Record<string, number>;
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
function RoomWalls({ backgroundColor }: { backgroundColor?: string }) {
  // 背景色から壁の色を派生させる
  const getWallColors = (bg: string) => {
    // 簡易的に明るさを調整した色を返す
    const baseColor = bg || "#1a1a2e";
    return {
      backWall: baseColor,
      leftWall: baseColor,
    };
  };
  
  const wallColors = getWallColors(backgroundColor || "#1a1a2e");
  
  return (
    <group>
      {/* 後ろの壁 */}
      <mesh position={[0, 3, -10]} receiveShadow>
        <planeGeometry args={[20, 6]} />
        <meshStandardMaterial 
          color={wallColors.backWall}
          roughness={0.9}
          metalness={0.1}
        />
      </mesh>
      {/* 左の壁 */}
      <mesh position={[-10, 3, 0]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[20, 6]} />
        <meshStandardMaterial 
          color={wallColors.leftWall}
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

// テクスチャ付きアイテム（ドラッグ対応）
function ItemWithTexture({ 
  item, 
  onClick,
  onMove,
  imageUrl,
  isEditing,
}: { 
  item: RoomItem; 
  onClick?: () => void;
  onMove?: (posX: number, posY: number) => void;
  imageUrl: string;
  isEditing?: boolean;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  const { camera, gl, raycaster } = useThree();
  
  // ドラッグ用の参照
  const intersectionPoint = useRef(new THREE.Vector3());
  const offset = useRef(new THREE.Vector3());
  
  // 配置に応じたドラッグプレーンを取得
  const getDragPlane = () => {
    const placement = item.placement || 'floor';
    switch (placement) {
      case 'back_wall':
        return new THREE.Plane(new THREE.Vector3(0, 0, 1), 9.9); // Z軸に垂直
      case 'left_wall':
        return new THREE.Plane(new THREE.Vector3(1, 0, 0), 9.9); // X軸に垂直
      default:
        return new THREE.Plane(new THREE.Vector3(0, 1, 0), 0); // Y軸に垂直（床）
    }
  };
  
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
  
  const { position: initialPosition, rotation } = getPositionAndRotation();
  const [position, setPosition] = useState<[number, number, number]>(initialPosition);
  const baseY = initialPosition[1];

  // item.position が変わったら位置を更新
  useEffect(() => {
    const { position: newPos } = getPositionAndRotation();
    setPosition(newPos);
  }, [item.position_x, item.position_y]);

  useFrame((state) => {
    if (meshRef.current && hovered && !isDragging) {
      const wobble = Math.sin(state.clock.elapsedTime * 3) * 0.02;
      meshRef.current.rotation.z = wobble;
    }
    if (groupRef.current && placement === 'floor' && !isDragging) {
      groupRef.current.position.y = baseY + Math.sin(state.clock.elapsedTime + position[0]) * 0.05;
    }
  });

  // ドラッグ開始
  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    if (!isEditing) return;
    
    e.stopPropagation();
    setIsDragging(true);
    
    gl.domElement.style.cursor = 'grabbing';
    
    const mouse = new THREE.Vector2(
      (e.nativeEvent.clientX / gl.domElement.clientWidth) * 2 - 1,
      -(e.nativeEvent.clientY / gl.domElement.clientHeight) * 2 + 1
    );
    
    const dragPlane = getDragPlane();
    raycaster.setFromCamera(mouse, camera);
    raycaster.ray.intersectPlane(dragPlane, intersectionPoint.current);
    
    if (groupRef.current) {
      offset.current.copy(intersectionPoint.current).sub(groupRef.current.position);
    }
  };

  // ドラッグ中
  useEffect(() => {
    if (!isDragging) return;

    const dragPlane = getDragPlane();

    const handlePointerMove = (e: PointerEvent) => {
      const mouse = new THREE.Vector2(
        (e.clientX / gl.domElement.clientWidth) * 2 - 1,
        -(e.clientY / gl.domElement.clientHeight) * 2 + 1
      );
      
      raycaster.setFromCamera(mouse, camera);
      raycaster.ray.intersectPlane(dragPlane, intersectionPoint.current);
      
      if (placement === 'floor') {
        const newX = intersectionPoint.current.x - offset.current.x;
        const newZ = intersectionPoint.current.z - offset.current.z;
        const clampedX = Math.max(-8, Math.min(8, newX));
        const clampedZ = Math.max(-8, Math.min(8, newZ));
        setPosition([clampedX, baseY, clampedZ]);
      } else if (placement === 'back_wall') {
        const newX = intersectionPoint.current.x - offset.current.x;
        const newY = intersectionPoint.current.y - offset.current.y;
        const clampedX = Math.max(-8, Math.min(8, newX));
        const clampedY = Math.max(1, Math.min(5, newY));
        setPosition([clampedX, clampedY, -9.9]);
      } else if (placement === 'left_wall') {
        const newZ = intersectionPoint.current.z - offset.current.z;
        const newY = intersectionPoint.current.y - offset.current.y;
        const clampedZ = Math.max(-8, Math.min(8, newZ));
        const clampedY = Math.max(1, Math.min(5, newY));
        setPosition([-9.9, clampedY, clampedZ]);
      }
    };

    const handlePointerUp = () => {
      setIsDragging(false);
      gl.domElement.style.cursor = 'auto';
      
      // 新しい位置を0-100のスケールに変換して保存
      let newPosX: number, newPosY: number;
      
      if (placement === 'floor') {
        newPosX = ((position[0] + 8) / 16) * 100;
        newPosY = ((position[2] + 8) / 16) * 100;
      } else if (placement === 'back_wall') {
        newPosX = ((position[0] + 8) / 16) * 100;
        newPosY = ((position[1] - 1) / 4) * 100;
      } else { // left_wall
        newPosX = ((position[2] + 8) / 16) * 100;
        newPosY = ((position[1] - 1) / 4) * 100;
      }
      
      onMove?.(Math.round(newPosX), Math.round(newPosY));
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [isDragging, camera, gl, raycaster, onMove, position, baseY]);

  return (
    <group ref={groupRef} position={position} rotation={rotation}>
      <mesh
        ref={meshRef}
        onClick={(e) => {
          if (!isDragging) {
            e.stopPropagation();
            onClick?.();
          }
        }}
        onPointerDown={handlePointerDown}
        onPointerOver={() => {
          setHovered(true);
          if (isEditing && placement === 'floor') {
            gl.domElement.style.cursor = 'grab';
          }
        }}
        onPointerOut={() => {
          setHovered(false);
          if (!isDragging) {
            gl.domElement.style.cursor = 'auto';
          }
        }}
        castShadow
        scale={isDragging ? scale * 1.15 : hovered ? scale * 1.1 : scale}
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
      
      {(hovered || isDragging) && (
        <pointLight color={isDragging ? "#22c55e" : "#a855f7"} intensity={1.5} distance={3} />
      )}
    </group>
  );
}

// GLBモデル表示コンポーネント
function GLBModel({ 
  item,
  modelUrl,
  onClick,
  isEditing,
  isSelected,
  customRotation,
}: { 
  item: RoomItem;
  modelUrl: string;
  onClick?: () => void;
  isEditing?: boolean;
  isSelected?: boolean;
  customRotation?: number;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const { scene } = useGLTF(modelUrl);
  
  const placement = item.placement || 'floor';
  const scale = Math.min(item.width, item.height) / 100;
  
  // 配置場所に応じた位置
  const getPosition = (): [number, number, number] => {
    const posX = (item.position_x / 100);
    const posY = (item.position_y / 100);
    
    switch (placement) {
      case 'back_wall':
        return [posX * 16 - 8, posY * 4 + 1, -9];
      case 'left_wall':
        return [-9, posY * 4 + 1, posX * 16 - 8];
      default:
        return [posX * 16 - 8, 0.5, posY * 16 - 8];
    }
  };

  useFrame((state) => {
    if (groupRef.current) {
      // カスタム回転が設定されている場合はそれを使用、なければ自動回転
      if (customRotation !== undefined) {
        groupRef.current.rotation.y = customRotation * (Math.PI / 180);
      } else if (!isSelected) {
        // 選択されていない場合のみ自動回転
        groupRef.current.rotation.y += 0.005;
      }
      
      // 浮遊アニメーション
      if (placement === 'floor') {
        groupRef.current.position.y = 0.5 + Math.sin(state.clock.elapsedTime) * 0.1;
      }
    }
  });

  return (
    <group
      ref={groupRef}
      position={getPosition()}
      scale={scale * 1.5}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      <primitive object={scene.clone()} />
      {(hovered || isSelected) && (
        <pointLight color={isSelected ? "#22c55e" : "#a855f7"} intensity={2} distance={5} />
      )}
    </group>
  );
}

// 3Dアイテム（床・壁対応）
function Item3D({ 
  item, 
  onClick,
  onMove,
  isEditing,
  isSelected,
  customRotation,
}: { 
  item: RoomItem; 
  onClick?: () => void;
  onMove?: (posX: number, posY: number) => void;
  isEditing?: boolean;
  isSelected?: boolean;
  customRotation?: number;
}) {
  // 3Dモデルがある場合はGLBを表示
  if (item.model_3d_url) {
    return (
      <Suspense fallback={null}>
        <GLBModel 
          item={item}
          modelUrl={item.model_3d_url}
          onClick={onClick}
          isEditing={isEditing}
          isSelected={isSelected}
          customRotation={customRotation}
        />
      </Suspense>
    );
  }

  // 2D画像の場合
  const imageUrl = item.custom_image_url || item.item_data?.image;
  if (!imageUrl) return null;

  return (
    <ItemWithTexture 
      item={item} 
      onClick={onClick} 
      onMove={onMove}
      imageUrl={imageUrl}
      isEditing={isEditing}
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

// デコレーション家具（デフォルトの装飾 - 家具が追加されていない場合のみ表示）
function DefaultFurniture({ hasCustomFurniture }: { hasCustomFurniture: boolean }) {
  if (hasCustomFurniture) return null;
  
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
  roomFurniture = [],
  backgroundColor, 
  onItemClick,
  onItemMove,
  onFurnitureClick,
  onFurnitureMove,
  isEditing,
  avatarUrl,
  selectedItemId,
  selectedFurnitureId,
  itemRotations,
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
      <RoomWalls backgroundColor={backgroundColor || undefined} />
      <DefaultFurniture hasCustomFurniture={roomFurniture.length > 0} />
      
      {/* カスタム家具 */}
      {roomFurniture.map((furniture) => {
        const preset = FURNITURE_PRESETS.find((p) => p.id === furniture.furniture_id);
        if (!preset) return null;
        return (
          <Suspense key={furniture.id} fallback={null}>
            <FurnitureItem3D
              furniture={furniture}
              preset={preset}
              onClick={() => onFurnitureClick?.(furniture)}
              onMove={(posX, posY) => onFurnitureMove?.(furniture.id, posX, posY)}
              isEditing={isEditing}
              isSelected={selectedFurnitureId === furniture.id}
            />
          </Suspense>
        );
      })}
      
      {/* アイテム */}
      {roomItems.map((item) => (
        <Item3D 
          key={item.id} 
          item={item} 
          onClick={() => onItemClick?.(item)}
          onMove={(posX, posY) => onItemMove?.(item.id, posX, posY)}
          isEditing={isEditing}
          isSelected={selectedItemId === item.id}
          customRotation={itemRotations?.[item.id]}
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
  const bgColor = props.backgroundColor || '#0f0f23';
  
  return (
    <div 
      className="relative w-full h-full min-h-[400px] rounded-2xl overflow-hidden"
      style={{ background: bgColor }}
    >
      <Suspense fallback={<LoaderOverlay />}>
        <Canvas
          shadows
          dpr={[1, 2]}
          gl={{ antialias: true, alpha: false }}
          style={{ background: bgColor }}
          camera={{ position: [12, 12, 12], fov: 50 }}
        >
          <Scene {...props} />
        </Canvas>
      </Suspense>
    </div>
  );
}
