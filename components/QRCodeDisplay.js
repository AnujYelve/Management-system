'use client';

/**
 * components/QRCodeDisplay.js
 *
 * Renders a scannable QR code for a given string value (typically an issueId).
 * Uses the `qrcode` npm package, imported dynamically to avoid SSR issues.
 *
 * Props:
 *   value   {string}  — The data to encode (issue ID)
 *   size    {number}  — Canvas dimension in px (default 200)
 *   label   {string}  — Used as the download filename
 */

import { useEffect, useState } from 'react';
import { Download, Loader2 } from 'lucide-react';

export default function QRCodeDisplay({ value, size = 200, label = 'book' }) {
  const [dataUrl, setDataUrl] = useState(null);
  const [error,   setError]   = useState(false);

  useEffect(() => {
    if (!value) return;
    setDataUrl(null);
    setError(false);

    // Dynamic import keeps qrcode out of the SSR bundle
    import('qrcode')
      .then((QRCode) =>
        QRCode.default.toDataURL(value, {
          width:  size,
          margin: 2,
          color:  { dark: '#1e293b', light: '#ffffff' },
          errorCorrectionLevel: 'M',
        })
      )
      .then(setDataUrl)
      .catch(() => setError(true));
  }, [value, size]);

  const handleDownload = () => {
    if (!dataUrl) return;
    const a = document.createElement('a');
    a.href     = dataUrl;
    a.download = `return-qr-${label.replace(/\s+/g, '-').toLowerCase()}.png`;
    a.click();
  };

  if (error) {
    return (
      <div className="flex items-center justify-center w-48 h-48 bg-red-50 border border-red-200 rounded-xl">
        <p className="text-xs text-red-500 text-center px-2">Failed to generate QR</p>
      </div>
    );
  }

  if (!dataUrl) {
    return (
      <div
        className="flex items-center justify-center bg-slate-100 rounded-xl animate-pulse"
        style={{ width: size, height: size }}
      >
        <Loader2 className="h-6 w-6 text-slate-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3">
      {/* QR image with a clean white frame */}
      <div className="p-3 bg-white rounded-2xl shadow-md border border-slate-200">
        <img
          src={dataUrl}
          alt={`QR code to return ${label}`}
          style={{ width: size, height: size, display: 'block' }}
          className="rounded-lg"
        />
      </div>

      <p className="text-xs text-slate-500 text-center">
        Show this to the store owner to return the book
      </p>

      <button
        onClick={handleDownload}
        className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-xs
          font-medium rounded-lg hover:bg-indigo-700 transition"
      >
        <Download className="h-3.5 w-3.5" />
        Download QR
      </button>
    </div>
  );
}
