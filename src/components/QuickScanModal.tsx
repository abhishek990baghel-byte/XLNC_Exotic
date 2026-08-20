import React, { useEffect, useRef } from 'react';
import toast from "react-hot-toast";
import { useNavigate } from 'react-router-dom';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { X } from 'lucide-react';
import type { Material } from '../types';

interface QuickScanModalProps {
  isOpen: boolean;
  onClose: () => void;
  materials: Material[];
}

export default function QuickScanModal({ isOpen, onClose, materials }: QuickScanModalProps) {
  const navigate = useNavigate();
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        scannerRef.current = new Html5QrcodeScanner(
          "quick-scan-reader",
          { fps: 10, qrbox: { width: 250, height: 250 }, rememberLastUsedCamera: true },
          false
        );
        scannerRef.current.render((decodedText) => {
          const mat = materials.find(m => m.sku === decodedText);
          if (mat) {
            if (scannerRef.current) {
              scannerRef.current.clear().catch(console.error);
            }
            onClose();
            navigate(`/materials/${mat.id}`);
          } else {
            toast.error(`No material found with SKU: ${decodedText}`);
          }
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
  }, [isOpen, materials, navigate, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-gray-700">
          <X className="w-5 h-5" />
        </button>
        <h2 className="text-xl font-bold mb-6">Quick Scan</h2>
        <div id="quick-scan-reader" className="w-full"></div>
      </div>
    </div>
  );
}
