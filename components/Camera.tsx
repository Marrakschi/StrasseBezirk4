import React, { useRef, useEffect, useState } from 'react';
import { Camera as CameraIcon, X } from 'lucide-react';

interface CameraProps {
  onCapture: (imageSrc: string) => void;
  onClose: () => void;
}

const Camera: React.FC<CameraProps> = ({ onCapture, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    let stream: MediaStream | null = null;

    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'environment' } 
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Camera error:", err);
        setError("Kamera konnte nicht gestartet werden. Bitte Berechtigungen prüfen.");
      }
    };

    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageSrc = canvas.toDataURL('image/jpeg', 0.8);
        onCapture(imageSrc);
      }
    }
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4 text-center">
        <p className="text-red-400 mb-4">{error}</p>
        <button onClick={onClose} className="px-4 py-2 bg-slate-700 rounded-lg">Zurück</button>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-black flex flex-col">
      <video 
        ref={videoRef} 
        autoPlay 
        playsInline 
        className="flex-1 object-cover w-full h-full"
      />
      <canvas ref={canvasRef} className="hidden" />

      {/* Overlay UI */}
      <div className="absolute top-4 right-4 z-20">
        <button 
          onClick={onClose} 
          className="flex items-center gap-2 px-4 py-2 bg-red-500/80 hover:bg-red-500 text-white rounded-lg font-bold shadow-lg backdrop-blur-sm transition-all"
        >
          <X size={18} />
          <span>Kamera stoppen</span>
        </button>
      </div>

      <div className="absolute bottom-0 w-full p-8 flex justify-center bg-gradient-to-t from-black/80 to-transparent z-20">
        <button 
          onClick={capturePhoto}
          className="w-20 h-20 bg-white rounded-full border-4 border-slate-300 shadow-lg flex items-center justify-center active:scale-95 transition-transform"
        >
          <div className="w-16 h-16 bg-slate-900 rounded-full border-2 border-white" />
        </button>
      </div>
    </div>
  );
};

export default Camera;