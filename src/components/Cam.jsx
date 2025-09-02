import React, { useEffect, useRef, useState } from "react";
import { Hands } from "@mediapipe/hands";
import { Camera } from "@mediapipe/camera_utils";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";

// 👉 Componente para cargar el modelo
function Modelo({ position }) {
  const { scene } = useGLTF("/figure.glb"); // asegúrate de que esté en public/figure.glb
  return <primitive object={scene} scale={0.3} position={position} />;
}

export default function Cam() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [handPosition, setHandPosition] = useState(null);

  useEffect(() => {
    if (!videoRef.current) return;

    const hands = new Hands({
      locateFile: (file) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
    });

    hands.setOptions({
      maxNumHands: 1,
      modelComplexity: 0,
      minDetectionConfidence: 0.7,
      minTrackingConfidence: 0.7,
    });

    hands.onResults((results) => {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);

      if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        const wrist = results.multiHandLandmarks[0][0]; // Landmark de la muñeca
        const x = wrist.x * canvas.width;
        const y = wrist.y * canvas.height;

        setHandPosition([ (x / canvas.width - 0.5) * 2, -(y / canvas.height - 0.5) * 2, 0 ]);
      } else {
        setHandPosition(null); // si no hay mano → no mostrar modelo
      }
    });

    const camera = new Camera(videoRef.current, {
      onFrame: async () => {
        await hands.send({ image: videoRef.current });
      },
      width: 320,
      height: 240,
    });
    camera.start();

    return () => camera.stop();
  }, []);

  return (
    <div className="relative flex justify-center items-center">
      {/* Video oculto */}
      <video ref={videoRef} className="hidden" />

      {/* Canvas para la detección */}
      <canvas
        ref={canvasRef}
        width={320}
        height={240}
        className="rounded-lg shadow-lg"
      />

      {/* Overlay con modelo 3D */}
      <div className="absolute top-0 left-0 w-[320px] h-[240px] pointer-events-none">
        <Canvas camera={{ position: [0, 0, 3] }}>
          <ambientLight intensity={0.8} />
          <directionalLight position={[0, 1, 2]} />
          <OrbitControls enableZoom={false} enableRotate={false} />
          {handPosition && <Modelo position={handPosition} />}
        </Canvas>
      </div>
    </div>
  );
}
