import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import { X, ScanBarcode, Camera, FlipHorizontal2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  onClose: () => void;
}

export function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    startScanner();
    
    return () => {
      stopScanner();
    };
  }, [facingMode]);

  const startScanner = async () => {
    if (!containerRef.current) return;
    
    try {
      setError(null);
      setIsScanning(true);
      
      const scanner = new Html5Qrcode("barcode-reader");
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode },
        {
          fps: 10,
          qrbox: { width: 250, height: 150 },
          aspectRatio: 1.5,
        },
        (decodedText) => {
          // バーコードを検出
          onScan(decodedText);
          stopScanner();
        },
        () => {
          // エラーは無視（スキャン中は常にエラーが発生するため）
        }
      );
    } catch (err) {
      console.error("Scanner error:", err);
      setError("カメラへのアクセスに失敗しました");
      setIsScanning(false);
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current = null;
      } catch (err) {
        console.error("Stop scanner error:", err);
      }
    }
    setIsScanning(false);
  };

  const toggleCamera = async () => {
    await stopScanner();
    setFacingMode(prev => prev === "environment" ? "user" : "environment");
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* ヘッダー */}
      <div className="relative z-10 flex items-center justify-between p-4 bg-gradient-to-b from-black/80 to-transparent">
        <Button variant="ghost" size="icon" onClick={onClose} className="text-white">
          <X className="w-6 h-6" />
        </Button>
        <div className="flex items-center gap-2 text-white">
          <ScanBarcode className="w-5 h-5" />
          <span className="font-medium">バーコードスキャン</span>
        </div>
        <Button variant="ghost" size="icon" onClick={toggleCamera} className="text-white">
          <FlipHorizontal2 className="w-6 h-6" />
        </Button>
      </div>

      {/* スキャナーエリア */}
      <div className="flex-1 flex items-center justify-center relative" ref={containerRef}>
        <div 
          id="barcode-reader" 
          className={cn(
            "w-full h-full max-w-md",
            !isScanning && "hidden"
          )}
        />
        
        {/* スキャンガイド */}
        {isScanning && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="relative">
              {/* スキャンエリアの枠 */}
              <div className="w-64 h-40 border-2 border-white/50 rounded-lg">
                {/* コーナーマーカー */}
                <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-primary rounded-tl-lg" />
                <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-primary rounded-tr-lg" />
                <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-primary rounded-bl-lg" />
                <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-primary rounded-br-lg" />
              </div>
              {/* スキャンライン */}
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-primary animate-scan" />
            </div>
          </div>
        )}

        {/* エラー表示 */}
        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 text-white p-4 text-center">
            <Camera className="w-12 h-12 mb-4 text-muted-foreground" />
            <p className="text-lg font-medium mb-2">カメラを使用できません</p>
            <p className="text-sm text-muted-foreground mb-4">{error}</p>
            <Button variant="outline" onClick={startScanner}>
              再試行
            </Button>
          </div>
        )}
      </div>

      {/* フッター */}
      <div className="relative z-10 p-4 bg-gradient-to-t from-black/80 to-transparent">
        <p className="text-center text-white/80 text-sm">
          バーコードを枠内に合わせてください
        </p>
      </div>

      <style>{`
        @keyframes scan {
          0%, 100% { top: 0; }
          50% { top: calc(100% - 2px); }
        }
        .animate-scan {
          animation: scan 2s ease-in-out infinite;
        }
        #barcode-reader video {
          width: 100% !important;
          height: 100% !important;
          object-fit: cover !important;
        }
        #barcode-reader > div {
          border: none !important;
        }
      `}</style>
    </div>
  );
}
