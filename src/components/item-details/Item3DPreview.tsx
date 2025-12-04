import { Suspense, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, useGLTF, Environment, Center } from "@react-three/drei";
import { Button } from "@/components/ui/button";
import { Box, Loader2 } from "lucide-react";

interface Item3DPreviewProps {
  modelUrl: string;
  title?: string;
}

function Model({ url }: { url: string }) {
  const { scene } = useGLTF(url);
  
  return (
    <Center>
      <primitive object={scene} scale={2} />
    </Center>
  );
}

export function Item3DPreview({ modelUrl, title }: Item3DPreviewProps) {
  const [show3D, setShow3D] = useState(false);

  if (!show3D) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShow3D(true)}
        className="w-full"
      >
        <Box className="w-4 h-4 mr-2" />
        3Dプレビューを見る
      </Button>
    );
  }

  return (
    <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-muted border border-border">
      <Suspense
        fallback={
          <div className="absolute inset-0 flex items-center justify-center bg-muted">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        }
      >
        <Canvas
          camera={{ position: [0, 0, 5], fov: 45 }}
          style={{ background: 'transparent' }}
        >
          <ambientLight intensity={0.6} />
          <directionalLight position={[5, 5, 5]} intensity={1} />
          <directionalLight position={[-5, -5, -5]} intensity={0.3} />
          <Model url={modelUrl} />
          <OrbitControls 
            enablePan={false}
            minDistance={2}
            maxDistance={10}
          />
          <Environment preset="studio" />
        </Canvas>
      </Suspense>
      <div className="absolute bottom-2 left-2 right-2 flex justify-between items-center">
        <span className="text-xs text-muted-foreground bg-background/80 px-2 py-1 rounded">
          ドラッグで回転
        </span>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setShow3D(false)}
          className="text-xs h-7"
        >
          閉じる
        </Button>
      </div>
    </div>
  );
}
