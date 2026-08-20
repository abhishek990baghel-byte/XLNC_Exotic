import React, { useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { X } from 'lucide-react';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (decodedText: string) => void;
}

export default function BarcodeScannerModal({ isOpen, onClose, onScan }: BarcodeScannerModalProps) {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        scannerRef.current = new Html5QrcodeScanner(
          "barcode-scanner-reader",
          { fps: 10, qrbox: { width: 250, height: 250 }, rememberLastUsedCamera: true },
          false
        );

        scannerRef.current.render((decodedText) => {
          if (scannerRef.current) {
            scannerRef.current.clear().catch(console.error);
          }
          onScan(decodedText);
          onClose();
        }, () => {});
      }, 100);
    } else {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(console.error);
        scannerRef.current = null;
      }
    }

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(console.error);
        scannerRef.current = null;
      }
    };
  }, [isOpen, onClose, onScan]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-gray-700">
          <X className="w-5 h-5" />
        </button>
        <h2 className="text-xl font-bold mb-6">Scan Barcode / QR Code</h2>
        <div id="barcode-scanner-reader" className="w-full"></div>
      </div>
    </div>
  );
}
