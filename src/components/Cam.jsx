import React, { useEffect, useRef, useState } from "react";
import { Hands } from "@mediapipe/hands";
import { Camera } from "@mediapipe/camera_utils";

export default function Cam() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!videoRef.current) return;

    // Inicializar modelo de manos
    const hands = new Hands({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
    });

    hands.setOptions({
      maxNumHands: 1,        // detectar 1 sola mano
      modelComplexity: 0,    // más rápido, menos pesado
      minDetectionConfidence: 0.7,
      minTrackingConfidence: 0.7,
    });

    hands.onResults((results) => {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");

      // limpiar canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // dibujar video
      ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);

      // dibujar puntos de la mano
      if (results.multiHandLandmarks) {
        for (const landmarks of results.multiHandLandmarks) {
          landmarks.forEach((point) => {
            ctx.beginPath();
            ctx.arc(point.x * canvas.width, point.y * canvas.height, 4, 0, 2 * Math.PI);
            ctx.fillStyle = "red";
            ctx.fill();
          });
        }
      }
    });

    let camera = null;
    try {
      camera = new Camera(videoRef.current, {
        onFrame: async () => {
          await hands.send({ image: videoRef.current });
        },
        width: 320,  // resolución más baja para mayor rapidez
        height: 340,
      });
      camera.start();
    } catch (err) {
      setError("Error al iniciar la cámara");
      console.error(err);
    }

    return () => {
      if (camera) camera.stop();
    };
  }, []);

  return (
    <div className="flex flex-col items-center">
      <h1 className="text-xl font-bold mb-2">Detección de mano</h1>
      {error && <p style={{ color: "red" }}>{error}</p>}
      <video ref={videoRef} className="hidden" /> {/* ocultamos el video real */}
      <canvas
        ref={canvasRef}
        width={320}
        height={240}
        className="rounded-lg shadow-lg"
      />
    </div>
  );
}
