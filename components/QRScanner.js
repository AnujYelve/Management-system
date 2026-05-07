'use client';

/**
 * components/QRScanner.js
 *
 * Camera-based QR code scanner for store owners.
 * Uses html5-qrcode, loaded dynamically to avoid SSR issues.
 *
 * Props:
 *   onScan   {(issueId: string) => void}  — called with the decoded issueId
 *   onClose  {() => void}                 — called when the user dismisses the scanner
 */

import { useEffect, useRef, useState } from 'react';
import { Camera, CameraOff, X, Loader2 } from 'lucide-react';

// Unique DOM element ID for the html5-qrcode library
const SCANNER_ELEMENT_ID = 'lms-qr-scanner-region';

export default function QRScanner({ onScan, onClose }) {
  const [isScanning, setIsScanning] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [error,      setError]      = useState('');
  const [lastScan,   setLastScan]   = useState('');
  const scannerRef  = useRef(null);   // Html5Qrcode instance
  const cooldownRef = useRef(false);  // Prevents rapid duplicate scans

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopScanner();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function startScanner() {
    setError('');
    setIsStarting(true);

    try {
      const { Html5Qrcode } = await import('html5-qrcode');

      const scanner = new Html5Qrcode(SCANNER_ELEMENT_ID, { verbose: false });
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },   // Use rear camera on mobile
        {
          fps: 10,
          qrbox:         { width: 260, height: 260 },
          aspectRatio:   1.0,
          disableFlip:   false,
        },
        (decodedText) => {
          // Cooldown: ignore duplicate scans within 2 seconds
          if (cooldownRef.current) return;
          cooldownRef.current = true;

          setLastScan(decodedText);
          onScan(decodedText.trim());

          setTimeout(() => { cooldownRef.current = false; }, 2000);
        },
        () => {
          // Per-frame decode error — ignore, happens constantly when no QR visible
        }
      );

      setIsScanning(true);
    } catch (err) {
      const msg = err?.message || 'Could not access camera';
      if (msg.includes('Permission')) {
        setError('Camera permission denied. Please allow camera access in your browser settings.');
      } else if (msg.includes('NotFound') || msg.includes('not found')) {
        setError('No camera found. Please use a device with a camera.');
      } else {
        setError(`Camera error: ${msg}`);
      }
    } finally {
      setIsStarting(false);
    }
  }

  function stopScanner() {
    if (scannerRef.current) {
      scannerRef.current.stop().catch(() => {});
      scannerRef.current = null;
    }
    setIsScanning(false);
  }

  return (
    <div className="flex flex-col items-center gap-4 w-full">

      {/* Header */}
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-2">
          <Camera className="h-5 w-5 text-green-600" />
          <h3 className="font-semibold text-slate-800">QR Code Scanner</h3>
        </div>
        {onClose && (
          <button
            onClick={() => { stopScanner(); onClose(); }}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Instructions */}
      <p className="text-sm text-slate-500 text-center">
        Point the camera at a user's book return QR code to process the return instantly.
      </p>

      {/* Scanner viewport — html5-qrcode renders inside this div */}
      <div
        id={SCANNER_ELEMENT_ID}
        className="w-full max-w-sm rounded-2xl overflow-hidden border-2 border-dashed border-slate-300 bg-slate-50 min-h-[280px]"
      />

      {/* Error message */}
      {error && (
        <div className="w-full p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Last scanned value (for debugging / confirmation) */}
      {lastScan && (
        <div className="w-full p-3 bg-green-50 border border-green-200 rounded-xl text-xs text-green-700 break-all">
          <span className="font-semibold">Scanned:</span> {lastScan}
        </div>
      )}

      {/* Control buttons */}
      <div className="flex gap-3 w-full">
        {!isScanning ? (
          <button
            onClick={startScanner}
            disabled={isStarting}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-600
              text-white rounded-xl hover:bg-green-700 transition font-medium disabled:opacity-60"
          >
            {isStarting ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Starting camera…</>
            ) : (
              <><Camera className="h-4 w-4" /> Start Camera</>
            )}
          </button>
        ) : (
          <button
            onClick={stopScanner}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-500
              text-white rounded-xl hover:bg-red-600 transition font-medium"
          >
            <CameraOff className="h-4 w-4" /> Stop Camera
          </button>
        )}
      </div>
    </div>
  );
}
