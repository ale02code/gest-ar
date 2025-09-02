import React, { useEffect, useRef, useState } from "react";
import { Hands } from "@mediapipe/hands";
import { Camera } from "@mediapipe/camera_utils";

export default function App() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!videoRef.current) return;

    // Inicializar modelo de manos
    const hands = new Hands({
      locateFile: (file) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
    });

    hands.setOptions({
      maxNumHands: 1, // detectar 1 mano
      modelComplexity: 1, // precisión
      minDetectionConfidence: 0.7,
      minTrackingConfidence: 0.7,
    });

    hands.onResults((results) => {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");

      // Limpiar canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Dibujar video
      ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);

      // Dibujar puntos de la mano
      if (results.multiHandLandmarks) {
        for (const landmarks of results.multiHandLandmarks) {
          landmarks.forEach((point) => {
            ctx.beginPath();
            ctx.arc(
              point.x * canvas.width,
              point.y * canvas.height,
              5,
              0,
              2 * Math.PI
            );
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
        width: 640,
        height: 480,
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
    <div>
      <h1>Detección de mano en React</h1>
      {error && <p style={{ color: "red" }}>{error}</p>}
      <video ref={videoRef} className="hidden" /> {/* video oculto */}
      <canvas
        ref={canvasRef}
        width={640}
        height={480}
        className="rounded-lg shadow-lg"
      />
    </div>
  );
}
