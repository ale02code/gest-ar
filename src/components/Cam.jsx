import { useEffect, useRef, useState } from "react";
import { Hands } from "@mediapipe/hands";
import { Camera } from "@mediapipe/camera_utils";

export default function Cam() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const videoEl = videoRef.current;
    const canvasEl = canvasRef.current;
    if (!videoEl || !canvasEl) return; // a estas alturas, en useEffect, ya deben existir

    const ctx = canvasEl.getContext("2d");

    // 1) Inicializar MediaPipe Hands
    const hands = new Hands({
      locateFile: (file) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
    });

    hands.setOptions({
      selfieMode: true, // espejo: más natural
      maxNumHands: 1,
      modelComplexity: 1,
      minDetectionConfidence: 0.7,
      minTrackingConfidence: 0.7,
    });

    // 2) Dibujo por frame
    hands.onResults((results) => {
      const img = results.image;

      // Ajusta el canvas al tamaño real del frame
      const w = img.width || 640;
      const h = img.height || 480;
      if (canvasEl.width !== w) canvasEl.width = w;
      if (canvasEl.height !== h) canvasEl.height = h;

      ctx.save();
      ctx.clearRect(0, 0, w, h);

      // Dibuja el video
      ctx.drawImage(img, 0, 0, w, h);

      // Dibuja landmarks
      if (results.multiHandLandmarks?.length) {
        for (const lm of results.multiHandLandmarks) {
          for (const p of lm) {
            ctx.beginPath();
            ctx.arc(p.x * w, p.y * h, 4, 0, Math.PI * 2);
            ctx.fillStyle = "#ff4d4f";
            ctx.fill();
          }
        }
      }
      ctx.restore();
    });

    // 3) Iniciar cámara
    let cam;
    (async () => {
      try {
        cam = new Camera(videoEl, {
          onFrame: async () => {
            await hands.send({ image: videoEl });
          },
          width: 640,
          height: 480,
        });
        await cam.start();
      } catch (e) {
        console.error(e);
        setError(e?.message || "No se pudo iniciar la cámara");
      }
    })();

    // 4) Cleanup
    return () => {
      if (cam) cam.stop();
      const stream = videoEl.srcObject;
      if (stream) stream.getTracks().forEach((t) => t.stop());
      hands.close();
    };
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-black relative">
      {error && (
        <p className="absolute top-3 left-3 text-red-400 bg-black/50 px-2 py-1 rounded">
          {error}
        </p>
      )}

      {/* ¡El video debe estar en el DOM! (puede ir oculto) */}
      <video ref={videoRef} autoPlay playsInline muted className="hidden" />

      {/* Aquí ves el video + landmarks dibujados */}
      <canvas
        ref={canvasRef}
        className="max-w-full h-auto rounded-lg shadow-lg"
      />
    </div>
  );
}
