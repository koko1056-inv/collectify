import { useRef, useState, Suspense, useEffect, useMemo, useCallback } from "react";
import { Canvas, useFrame, useThree, ThreeEvent } from "@react-three/fiber";
import {
  OrbitControls,
  useGLTF,
  Environment,
  ContactShadows,
  RoundedBox,
  Float,
  Sparkles,
  MeshReflectorMaterial,
  Text3D,
  Center,
} from "@react-three/drei";
import * as THREE from "three";
import { RoomItem, PlacementType } from "@/hooks/useMyRoom";
import { FurnitureItem3D, RoomFurniture } from "./FurnitureItem3D";
import { FURNITURE_PRESETS } from "./furniturePresets";
import { getThemeById, RoomTheme } from "./roomThemes";

const THEME_PREFIX = "theme:";

// --- Constants ---
const ROOM_SIZE = 16;
const HALF = ROOM_SIZE / 2;
const WALL_HEIGHT = 7;
const GRID_CELL = 1; // snap grid in world units

// --- Types ---
export interface Room3DSceneProps {
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
  roomTheme?: string;
}

// --- Utility ---
function normalizedToWorld(nx: number, ny: number, placement: PlacementType): [number, number, number] {
  const px = (nx / 100) * ROOM_SIZE - HALF;
  const py = (ny / 100);
  switch (placement) {
    case "back_wall":
      return [px, py * (WALL_HEIGHT - 1) + 1, -HALF + 0.05];
    case "left_wall":
      return [-HALF + 0.05, py * (WALL_HEIGHT - 1) + 1, px];
    default:
      return [px, 0.01, (ny / 100) * ROOM_SIZE - HALF];
  }
}

function worldToNormalized(pos: THREE.Vector3, placement: PlacementType): [number, number] {
  switch (placement) {
    case "back_wall":
      return [((pos.x + HALF) / ROOM_SIZE) * 100, ((pos.y - 1) / (WALL_HEIGHT - 1)) * 100];
    case "left_wall":
      return [((pos.z + HALF) / ROOM_SIZE) * 100, ((pos.y - 1) / (WALL_HEIGHT - 1)) * 100];
    default:
      return [((pos.x + HALF) / ROOM_SIZE) * 100, ((pos.z + HALF) / ROOM_SIZE) * 100];
  }
}

function snap(v: number, grid: number): number {
  return Math.round(v / grid) * grid;
}

// --- Room Structure ---
function RoomStructure({ backgroundColor, wallColor: wallColorProp }: { backgroundColor?: string; wallColor?: string }) {
  const floorColor = backgroundColor || "#1e1e30";
  const wallColor = useMemo(() => {
    if (wallColorProp) return new THREE.Color(wallColorProp);
    const c = new THREE.Color(floorColor);
    c.multiplyScalar(1.15);
    return c;
  }, [floorColor, wallColorProp]);

  const wallOpacity = 0.92;

  return (
    <group>
      {/* Floor with reflections */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[ROOM_SIZE, ROOM_SIZE]} />
        <MeshReflectorMaterial
          mirror={0.15}
          blur={[300, 100]}
          resolution={512}
          mixBlur={1}
          mixStrength={0.4}
          roughness={0.7}
          depthScale={1}
          minDepthThreshold={0.4}
          maxDepthThreshold={1.4}
          color={floorColor}
          metalness={0.3}
        />
      </mesh>

      {/* Back wall */}
      <mesh position={[0, WALL_HEIGHT / 2, -HALF]} receiveShadow>
        <planeGeometry args={[ROOM_SIZE, WALL_HEIGHT]} />
        <meshStandardMaterial
          color={wallColor}
          roughness={0.85}
          metalness={0.05}
          transparent
          opacity={wallOpacity}
        />
      </mesh>

      {/* Left wall */}
      <mesh position={[-HALF, WALL_HEIGHT / 2, 0]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[ROOM_SIZE, WALL_HEIGHT]} />
        <meshStandardMaterial
          color={wallColor}
          roughness={0.85}
          metalness={0.05}
          transparent
          opacity={wallOpacity}
        />
      </mesh>

      {/* Subtle baseboard trim */}
      <mesh position={[0, 0.05, -HALF + 0.02]}>
        <boxGeometry args={[ROOM_SIZE, 0.1, 0.04]} />
        <meshStandardMaterial color="#ffffff" roughness={0.5} metalness={0.2} opacity={0.15} transparent />
      </mesh>
      <mesh position={[-HALF + 0.02, 0.05, 0]} rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[ROOM_SIZE, 0.1, 0.04]} />
        <meshStandardMaterial color="#ffffff" roughness={0.5} metalness={0.2} opacity={0.15} transparent />
      </mesh>

      {/* Floor edge glow */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
        <planeGeometry args={[ROOM_SIZE + 0.5, ROOM_SIZE + 0.5]} />
        <meshBasicMaterial color={floorColor} transparent opacity={0.3} />
      </mesh>
    </group>
  );
}

// --- Grid overlay (editing mode) ---
function EditGrid({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <group position={[0, 0.02, 0]}>
      <gridHelper
        args={[ROOM_SIZE, ROOM_SIZE, "#6366f1", "#4338ca"]}
        material-transparent
        material-opacity={0.2}
      />
    </group>
  );
}

// --- Ambient particles ---
function RoomParticles({ color, count = 40 }: { color: string; count?: number }) {
  return (
    <Sparkles
      count={count}
      scale={[ROOM_SIZE, WALL_HEIGHT, ROOM_SIZE]}
      position={[0, WALL_HEIGHT / 2, 0]}
      size={1.5}
      speed={0.3}
      opacity={0.15}
      color={color}
    />
  );
}

// --- Draggable Item ---
function DraggableItem({
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
  // 3D model path
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

  const imageUrl = item.custom_image_url || item.item_data?.image;
  if (!imageUrl) return null;

  return (
    <ItemCard
      item={item}
      imageUrl={imageUrl}
      onClick={onClick}
      onMove={onMove}
      isEditing={isEditing}
      isSelected={isSelected}
    />
  );
}

// --- 2D Image Item displayed as a card in 3D space ---
function ItemCard({
  item,
  imageUrl,
  onClick,
  onMove,
  isEditing,
  isSelected,
}: {
  item: RoomItem;
  imageUrl: string;
  onClick?: () => void;
  onMove?: (posX: number, posY: number) => void;
  isEditing?: boolean;
  isSelected?: boolean;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  const { camera, gl, raycaster } = useThree();

  const intersectionPoint = useRef(new THREE.Vector3());
  const offset = useRef(new THREE.Vector3());

  const placement = item.placement || "floor";
  const scale = Math.min(item.width, item.height) / 80;

  // Load texture
  useEffect(() => {
    const loader = new THREE.TextureLoader();
    loader.crossOrigin = "anonymous";
    loader.load(
      imageUrl,
      (t) => {
        t.colorSpace = THREE.SRGBColorSpace;
        setTexture(t);
      },
      undefined,
      () => {}
    );
  }, [imageUrl]);

  const worldPos = useMemo(
    () => normalizedToWorld(item.position_x, item.position_y, placement),
    [item.position_x, item.position_y, placement]
  );
  const [pos, setPos] = useState<[number, number, number]>(worldPos);

  useEffect(() => {
    setPos(normalizedToWorld(item.position_x, item.position_y, placement));
  }, [item.position_x, item.position_y, placement]);

  const rotation: [number, number, number] = useMemo(() => {
    switch (placement) {
      case "back_wall": return [0, 0, 0];
      case "left_wall": return [0, Math.PI / 2, 0];
      default: return [-Math.PI / 2, 0, 0];
    }
  }, [placement]);

  // Floating + hover animation
  useFrame((state) => {
    if (!groupRef.current || isDragging) return;
    if (placement === "floor") {
      groupRef.current.position.y = 0.6 + Math.sin(state.clock.elapsedTime * 0.8 + pos[0]) * 0.08;
    }
    if (meshRef.current && hovered) {
      meshRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 3) * 0.03;
    }
  });

  // Drag plane
  const getDragPlane = useCallback(() => {
    switch (placement) {
      case "back_wall": return new THREE.Plane(new THREE.Vector3(0, 0, 1), HALF - 0.05);
      case "left_wall": return new THREE.Plane(new THREE.Vector3(1, 0, 0), HALF - 0.05);
      default: return new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    }
  }, [placement]);

  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    if (!isEditing) return;
    e.stopPropagation();
    setIsDragging(true);
    gl.domElement.style.cursor = "grabbing";

    const mouse = new THREE.Vector2(
      (e.nativeEvent.clientX / gl.domElement.clientWidth) * 2 - 1,
      -(e.nativeEvent.clientY / gl.domElement.clientHeight) * 2 + 1
    );
    raycaster.setFromCamera(mouse, camera);
    raycaster.ray.intersectPlane(getDragPlane(), intersectionPoint.current);
    if (groupRef.current) {
      offset.current.copy(intersectionPoint.current).sub(groupRef.current.position);
    }
  };

  useEffect(() => {
    if (!isDragging) return;
    const dragPlane = getDragPlane();

    const onMove = (e: PointerEvent) => {
      const mouse = new THREE.Vector2(
        (e.clientX / gl.domElement.clientWidth) * 2 - 1,
        -(e.clientY / gl.domElement.clientHeight) * 2 + 1
      );
      raycaster.setFromCamera(mouse, camera);
      raycaster.ray.intersectPlane(dragPlane, intersectionPoint.current);

      if (placement === "floor") {
        setPos([
          snap(Math.max(-HALF, Math.min(HALF, intersectionPoint.current.x - offset.current.x)), GRID_CELL),
          0.6,
          snap(Math.max(-HALF, Math.min(HALF, intersectionPoint.current.z - offset.current.z)), GRID_CELL),
        ]);
      } else if (placement === "back_wall") {
        setPos([
          snap(Math.max(-HALF, Math.min(HALF, intersectionPoint.current.x - offset.current.x)), GRID_CELL),
          Math.max(1, Math.min(WALL_HEIGHT - 1, intersectionPoint.current.y - offset.current.y)),
          -HALF + 0.05,
        ]);
      } else {
        setPos([
          -HALF + 0.05,
          Math.max(1, Math.min(WALL_HEIGHT - 1, intersectionPoint.current.y - offset.current.y)),
          snap(Math.max(-HALF, Math.min(HALF, intersectionPoint.current.z - offset.current.z)), GRID_CELL),
        ]);
      }
    };

    const onUp = () => {
      setIsDragging(false);
      gl.domElement.style.cursor = "auto";
      const v = new THREE.Vector3(...pos);
      const [nx, ny] = worldToNormalized(v, placement);
      onMove?.(Math.round(nx), Math.round(ny));
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [isDragging, pos, placement, camera, gl, raycaster, getDragPlane]);

  const cardScale = isDragging ? scale * 1.15 : hovered ? scale * 1.08 : scale;

  return (
    <group ref={groupRef} position={pos} rotation={rotation}>
      {/* Card backing with rounded corners */}
      <RoundedBox
        ref={meshRef}
        args={[2, 2, 0.08]}
        radius={0.08}
        smoothness={4}
        scale={cardScale}
        onClick={(e) => { if (!isDragging) { e.stopPropagation(); onClick?.(); } }}
        onPointerDown={handlePointerDown}
        onPointerOver={() => { setHovered(true); if (isEditing) gl.domElement.style.cursor = "grab"; }}
        onPointerOut={() => { setHovered(false); if (!isDragging) gl.domElement.style.cursor = "auto"; }}
        castShadow
      >
        {texture ? (
          <meshStandardMaterial
            map={texture}
            side={THREE.DoubleSide}
            transparent
            roughness={0.3}
            metalness={0.1}
          />
        ) : (
          <meshStandardMaterial color="#555" roughness={0.4} />
        )}
      </RoundedBox>

      {/* Selection ring */}
      {isSelected && (
        <mesh scale={cardScale * 1.15}>
          <ringGeometry args={[1.1, 1.2, 32]} />
          <meshBasicMaterial color="#22c55e" transparent opacity={0.6} side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* Hover glow */}
      {(hovered || isSelected) && (
        <pointLight
          color={isSelected ? "#22c55e" : "#a855f7"}
          intensity={3}
          distance={4}
          decay={2}
        />
      )}
    </group>
  );
}

// --- GLB Model ---
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

  const placement = item.placement || "floor";
  const scale = Math.min(item.width, item.height) / 80;
  const position = useMemo(
    () => normalizedToWorld(item.position_x, item.position_y, placement),
    [item.position_x, item.position_y, placement]
  );

  // Ensure position[1] is elevated for floor items
  const adjustedPos: [number, number, number] = placement === "floor"
    ? [position[0], 0.5, position[2]]
    : position;

  useFrame((state) => {
    if (!groupRef.current) return;
    if (customRotation !== undefined) {
      groupRef.current.rotation.y = customRotation * (Math.PI / 180);
    } else if (!isSelected) {
      groupRef.current.rotation.y += 0.003;
    }
    if (placement === "floor") {
      groupRef.current.position.y = 0.5 + Math.sin(state.clock.elapsedTime * 0.6) * 0.08;
    }
  });

  return (
    <Float speed={1} rotationIntensity={0} floatIntensity={placement === "floor" ? 0.3 : 0}>
      <group
        ref={groupRef}
        position={adjustedPos}
        scale={scale * 1.5}
        onClick={(e) => { e.stopPropagation(); onClick?.(); }}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <primitive object={scene.clone()} />
        {(hovered || isSelected) && (
          <pointLight color={isSelected ? "#22c55e" : "#a855f7"} intensity={4} distance={5} decay={2} />
        )}
      </group>
    </Float>
  );
}

// --- Avatar ---
function Avatar3D({ avatarUrl }: { avatarUrl: string }) {
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  const groupRef = useRef<THREE.Group>(null);

  useEffect(() => {
    const loader = new THREE.TextureLoader();
    loader.crossOrigin = "anonymous";
    loader.load(avatarUrl, (t) => {
      t.colorSpace = THREE.SRGBColorSpace;
      setTexture(t);
    });
  }, [avatarUrl]);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.position.y = 1.2 + Math.sin(state.clock.elapsedTime * 0.5) * 0.1;
      groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.3) * 0.15;
    }
  });

  return (
    <group ref={groupRef} position={[0, 1.2, 4]}>
      {/* Avatar disc */}
      <mesh castShadow>
        <cylinderGeometry args={[0.8, 0.8, 0.12, 32]} />
        {texture ? (
          <meshStandardMaterial map={texture} roughness={0.3} metalness={0.1} />
        ) : (
          <meshStandardMaterial color="#a855f7" roughness={0.3} metalness={0.3} />
        )}
      </mesh>
      {/* Glow ring */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <ringGeometry args={[0.85, 0.95, 32]} />
        <meshBasicMaterial color="#a855f7" transparent opacity={0.4} side={THREE.DoubleSide} />
      </mesh>
      <pointLight color="#a855f7" intensity={2} distance={4} decay={2} />
    </group>
  );
}

// --- Camera ---
function CameraController() {
  return (
    <OrbitControls
      enablePan
      enableZoom
      enableRotate
      minDistance={4}
      maxDistance={22}
      minPolarAngle={Math.PI / 8}
      maxPolarAngle={Math.PI / 2.2}
      dampingFactor={0.08}
      enableDamping
      panSpeed={0.5}
      zoomSpeed={0.8}
    />
  );
}

// --- Main Scene ---
function Scene(props: Room3DSceneProps) {
  const {
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
  } = props;

  // Resolve theme from backgroundColor (format: "theme:<id>" or raw color)
  const theme: RoomTheme | undefined = useMemo(() => {
    if (backgroundColor?.startsWith(THEME_PREFIX)) {
      return getThemeById(backgroundColor.slice(THEME_PREFIX.length));
    }
    return undefined;
  }, [backgroundColor]);

  const floorColor = theme?.floorColor || backgroundColor || "#1e1e30";

  const accentColor = useMemo(() => {
    if (theme) return theme.accentColor.replace("#", "");
    const bg = new THREE.Color(floorColor);
    const hsl = { h: 0, s: 0, l: 0 };
    bg.getHSL(hsl);
    return new THREE.Color().setHSL((hsl.h + 0.5) % 1, 0.7, 0.6).getHexString();
  }, [theme, floorColor]);

  return (
    <>
      {/* Lighting — driven by theme or sensible defaults */}
      <ambientLight intensity={theme?.ambientIntensity ?? 0.4} />
      <directionalLight
        position={[8, 12, 8]}
        intensity={theme?.mainLightIntensity ?? 1.2}
        color={theme?.mainLightColor ?? "#ffffff"}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-far={30}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
        shadow-bias={-0.001}
      />
      <directionalLight
        position={[-5, 8, -5]}
        intensity={0.3}
        color={theme?.fillLightColor ?? "#6366f1"}
      />

      {/* Environment for realistic reflections */}
      <Environment preset={theme?.environmentPreset ?? "city"} background={false} />

      {/* Room structure */}
      <RoomStructure
        backgroundColor={theme ? theme.floorColor : (backgroundColor?.startsWith(THEME_PREFIX) ? undefined : backgroundColor) || undefined}
        wallColor={theme?.wallColor}
      />
      <EditGrid visible={!!isEditing} />

      {/* Contact shadows for grounding */}
      <ContactShadows
        position={[0, 0.01, 0]}
        opacity={0.4}
        scale={ROOM_SIZE + 2}
        blur={2}
        far={6}
        color="#000000"
      />

      {/* Ambient particles */}
      <RoomParticles
        color={theme?.particleColor || `#${accentColor}`}
        count={theme?.particleCount}
      />

      {/* Furniture */}
      {roomFurniture.map((furniture) => {
        const preset = FURNITURE_PRESETS.find((p) => p.id === furniture.furniture_id);
        if (!preset) return null;
        return (
          <FurnitureItem3D
            key={furniture.id}
            furniture={furniture}
            preset={preset}
            onClick={() => onFurnitureClick?.(furniture)}
            onMove={(px, py) => onFurnitureMove?.(furniture.id, px, py)}
            isEditing={isEditing}
            isSelected={selectedFurnitureId === furniture.id}
          />
        );
      })}

      {/* Items */}
      {roomItems.map((item) => (
        <DraggableItem
          key={item.id}
          item={item}
          onClick={() => onItemClick?.(item)}
          onMove={(px, py) => onItemMove?.(item.id, px, py)}
          isEditing={isEditing}
          isSelected={selectedItemId === item.id}
          customRotation={itemRotations?.[item.id]}
        />
      ))}

      {/* Avatar */}
      {avatarUrl && <Avatar3D avatarUrl={avatarUrl} />}

      {/* Camera */}
      <CameraController />
    </>
  );
}

// --- Loader ---
function LoaderOverlay() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0f0f23]">
      <div className="relative">
        <div className="w-16 h-16 border-4 border-primary/30 rounded-full" />
        <div className="absolute inset-0 w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
      <p className="text-white/60 text-sm mt-4 font-medium">ルームを準備中...</p>
    </div>
  );
}

// --- Export ---
export function Room3DScene(props: Room3DSceneProps) {
  const theme = useMemo(() => {
    if (props.backgroundColor?.startsWith(THEME_PREFIX)) {
      return getThemeById(props.backgroundColor.slice(THEME_PREFIX.length));
    }
    return undefined;
  }, [props.backgroundColor]);

  const bgColor = theme?.floorColor || (props.backgroundColor?.startsWith(THEME_PREFIX) ? "#0f0f23" : props.backgroundColor) || "#0f0f23";

  return (
    <div
      className="relative w-full h-full min-h-[400px] rounded-2xl overflow-hidden"
      style={{ background: bgColor }}
    >
      <Suspense fallback={<LoaderOverlay />}>
        <Canvas
          shadows
          dpr={[1, 2]}
          gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
          style={{ background: bgColor }}
          camera={{ position: [10, 10, 10], fov: 45, near: 0.1, far: 100 }}
        >
          <Scene {...props} />
        </Canvas>
      </Suspense>
    </div>
  );
}
