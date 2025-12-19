import { useRef, useState, useEffect } from "react";
import { useFrame, useThree, ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { FurniturePreset } from "./furniturePresets";
import { PlacementType } from "@/hooks/useMyRoom";

export interface RoomFurniture {
  id: string;
  furniture_id: string;
  position_x: number;
  position_y: number;
  placement: PlacementType;
  scale: number;
  rotation_y: number;
}

interface FurnitureItem3DProps {
  furniture: RoomFurniture;
  preset: FurniturePreset;
  onClick?: () => void;
  onMove?: (posX: number, posY: number) => void;
  isEditing?: boolean;
  isSelected?: boolean;
}

// 家具パーツをレンダリング
function FurniturePart({ 
  part 
}: { 
  part: {
    type: 'box' | 'cylinder' | 'sphere';
    position: [number, number, number];
    args: number[];
    color: string;
  }
}) {
  const getGeometry = () => {
    switch (part.type) {
      case 'box':
        return <boxGeometry args={part.args as [number, number, number]} />;
      case 'cylinder':
        return <cylinderGeometry args={part.args as [number, number, number]} />;
      case 'sphere':
        return <sphereGeometry args={[part.args[0], 16, 16]} />;
      default:
        return <boxGeometry args={[0.5, 0.5, 0.5]} />;
    }
  };

  return (
    <mesh position={part.position} castShadow receiveShadow>
      {getGeometry()}
      <meshStandardMaterial 
        color={part.color} 
        roughness={0.7}
        metalness={0.1}
      />
    </mesh>
  );
}

export function FurnitureItem3D({
  furniture,
  preset,
  onClick,
  onMove,
  isEditing,
  isSelected,
}: FurnitureItem3DProps) {
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const { camera, gl, raycaster } = useThree();
  
  const intersectionPoint = useRef(new THREE.Vector3());
  const offset = useRef(new THREE.Vector3());
  
  const placement = furniture.placement || 'floor';
  const scale = furniture.scale || preset.defaultScale;
  
  // 配置に応じたドラッグプレーンを取得
  const getDragPlane = () => {
    switch (placement) {
      case 'back_wall':
        return new THREE.Plane(new THREE.Vector3(0, 0, 1), 9.9);
      case 'left_wall':
        return new THREE.Plane(new THREE.Vector3(1, 0, 0), 9.9);
      default:
        return new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    }
  };
  
  // 配置場所に応じた位置と回転を計算
  const getPositionAndRotation = () => {
    const posX = (furniture.position_x / 100);
    const posY = (furniture.position_y / 100);
    
    switch (placement) {
      case 'back_wall':
        return {
          position: [posX * 16 - 8, posY * 4 + 1.5, -9.9] as [number, number, number],
          rotation: [0, 0, 0] as [number, number, number],
        };
      case 'left_wall':
        return {
          position: [-9.9, posY * 4 + 1.5, posX * 16 - 8] as [number, number, number],
          rotation: [0, Math.PI / 2, 0] as [number, number, number],
        };
      default:
        return {
          position: [posX * 16 - 8, 0, posY * 16 - 8] as [number, number, number],
          rotation: [0, furniture.rotation_y * (Math.PI / 180), 0] as [number, number, number],
        };
    }
  };
  
  const { position: initialPosition, rotation } = getPositionAndRotation();
  const [position, setPosition] = useState<[number, number, number]>(initialPosition);

  useEffect(() => {
    const { position: newPos } = getPositionAndRotation();
    setPosition(newPos);
  }, [furniture.position_x, furniture.position_y]);

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
        setPosition([
          Math.max(-8, Math.min(8, newX)),
          0,
          Math.max(-8, Math.min(8, newZ)),
        ]);
      } else if (placement === 'back_wall') {
        const newX = intersectionPoint.current.x - offset.current.x;
        const newY = intersectionPoint.current.y - offset.current.y;
        setPosition([
          Math.max(-8, Math.min(8, newX)),
          Math.max(1.5, Math.min(5, newY)),
          -9.9,
        ]);
      } else if (placement === 'left_wall') {
        const newZ = intersectionPoint.current.z - offset.current.z;
        const newY = intersectionPoint.current.y - offset.current.y;
        setPosition([
          -9.9,
          Math.max(1.5, Math.min(5, newY)),
          Math.max(-8, Math.min(8, newZ)),
        ]);
      }
    };

    const handlePointerUp = () => {
      setIsDragging(false);
      gl.domElement.style.cursor = 'auto';
      
      let newPosX: number, newPosY: number;
      
      if (placement === 'floor') {
        newPosX = ((position[0] + 8) / 16) * 100;
        newPosY = ((position[2] + 8) / 16) * 100;
      } else if (placement === 'back_wall') {
        newPosX = ((position[0] + 8) / 16) * 100;
        newPosY = ((position[1] - 1.5) / 3.5) * 100;
      } else {
        newPosX = ((position[2] + 8) / 16) * 100;
        newPosY = ((position[1] - 1.5) / 3.5) * 100;
      }
      
      onMove?.(Math.round(newPosX), Math.round(newPosY));
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [isDragging, camera, gl, raycaster, onMove, position, placement]);

  return (
    <group
      ref={groupRef}
      position={position}
      rotation={rotation}
      scale={isDragging ? scale * 1.05 : hovered ? scale * 1.02 : scale}
      onClick={(e) => {
        if (!isDragging) {
          e.stopPropagation();
          onClick?.();
        }
      }}
      onPointerDown={handlePointerDown}
      onPointerOver={() => {
        setHovered(true);
        if (isEditing) {
          gl.domElement.style.cursor = 'grab';
        }
      }}
      onPointerOut={() => {
        setHovered(false);
        if (!isDragging) {
          gl.domElement.style.cursor = 'auto';
        }
      }}
    >
      {/* 家具パーツをレンダリング */}
      {preset.geometry.parts?.map((part, index) => (
        <FurniturePart key={index} part={part} />
      ))}
      
      {/* 選択/ホバー時のハイライト */}
      {(hovered || isSelected) && (
        <pointLight 
          color={isSelected ? "#22c55e" : "#a855f7"} 
          intensity={1.5} 
          distance={3} 
        />
      )}
    </group>
  );
}
