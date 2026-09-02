import { useEffect, useRef, useState } from "react";
import { Camera, Loader2 } from "lucide-react";
import { Button } from "@store-credit-platform/web-components";

interface QrScannerProps {
  onDecode: (phone: string) => void;
  onSwitchToManual: () => void;
}

const E164_REGEX = /^\+\d{10,15}$/;
const FALLBACK_MS = 10_000;

// html5-qrcode ships a UMD bundle; importing it here would run the camera
// init code on load. Lazy-load so dialog mount doesn't allocate a scanner.
async function getHtml5Qrcode(): Promise<{
  Html5Qrcode: new (id: string) => Html5QrcodeInstance;
}> {
  const mod = await import("html5-qrcode");
  return mod as unknown as {
    Html5Qrcode: new (id: string) => Html5QrcodeInstance;
  };
}

interface Html5QrcodeInstance {
  start(
    cameraConfig: { facingMode: string },
    config: { fps: number; qrbox: { width: number; height: number } },
    onSuccess: (decoded: string) => void,
  ): Promise<void>;
  stop(): Promise<void>;
}

export function QrScanner({ onDecode, onSwitchToManual }: QrScannerProps) {
  const containerId = "add-purchase-qr-reader";
  const scannerRef = useRef<Html5QrcodeInstance | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [showManual, setShowManual] = useState(false);
  const decodedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    let scanner: Html5QrcodeInstance | null = null;
    const fallbackTimer = setTimeout(() => {
      if (!decodedRef.current) setShowManual(true);
    }, FALLBACK_MS);

    (async () => {
      try {
        const { Html5Qrcode } = await getHtml5Qrcode();
        if (cancelled) return;
        scanner = new Html5Qrcode(containerId);
        scannerRef.current = scanner;
        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 240, height: 240 } },
          (decoded: string) => {
            if (decodedRef.current) return;
            if (E164_REGEX.test(decoded)) {
              decodedRef.current = true;
              onDecode(decoded);
            } else {
              setHint("Not a phone QR — try again");
              setTimeout(() => setHint(null), 2500);
            }
          },
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (
          msg.toLowerCase().includes("permission") ||
          msg.toLowerCase().includes("notallowed")
        ) {
          setError("Camera permission denied");
        } else {
          setError("Camera unavailable");
        }
      }
    })();

    return () => {
      cancelled = true;
      clearTimeout(fallbackTimer);
      const s = scannerRef.current;
      if (s) {
        s.stop().catch(() => undefined);
      }
    };
  }, [onDecode]);

  if (error) {
    return (
      <div className="bg-muted/30 space-y-3 rounded-md border p-6 text-center">
        <Camera className="text-muted-foreground mx-auto h-8 w-8" />
        <p className="text-sm font-medium">{error}</p>
        <p className="text-muted-foreground text-xs">
          Open browser settings to allow camera access, or enter the phone
          number manually.
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onSwitchToManual}
        >
          Enter phone number
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="bg-foreground/5 relative overflow-hidden rounded-md border">
        <div id={containerId} className="aspect-square w-full" />
        {!scannerRef.current && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
          </div>
        )}
      </div>
      <div className="text-muted-foreground flex items-center justify-between text-xs">
        <span>
          {hint ?? "Point the camera at the customer’s QR code"}
        </span>
        {showManual && (
          <button
            type="button"
            onClick={onSwitchToManual}
            className="text-primary hover:underline"
          >
            Switch to manual entry
          </button>
        )}
      </div>
    </div>
  );
}
