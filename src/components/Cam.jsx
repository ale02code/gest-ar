import React, { useEffect, useRef, useState } from "react";
import { Hands } from "@mediapipe/hands";
import { Camera } from "@mediapipe/camera_utils";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";

function CocaColaModel({ position }) {
  const { scene } = useGLTF("/models/figure.glb"); // Modelo en public/
  return <primitive object={scene} scale={0.2} position={position} />;
}

export default function App() {
  const videoRef = useRef(null);
  const [palmPos, setPalmPos] = useState([0, 0, 0]); // posición 3D de la palma

  useEffect(() => {
    if (!videoRef.current) return;

    const hands = new Hands({
      locateFile: (file) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
    });

    hands.setOptions({
      maxNumHands: 1,
      modelComplexity: 1,
      minDetectionConfidence: 0.7,
      minTrackingConfidence: 0.7,
    });

    hands.onResults((results) => {
      if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        const landmarks = results.multiHandLandmarks[0];

        // Landmark 0 = "wrist" y 9 = "center of palm approx"
        const palm = landmarks[9];
        setPalmPos([
          (palm.x - 0.5) * 2, // normalizado a espacio 3D
          (0.5 - palm.y) * 2,
          -0.5,
        ]);
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
      console.error("Error al iniciar cámara", err);
    }

    return () => {
      if (camera) camera.stop();
    };
  }, []);

  return (
    <div className="w-full h-screen flex">
      {/* Cámara oculta */}
      <video ref={videoRef} className="hidden" />

      {/* Escena 3D */}
      <Canvas camera={{ position: [0, 0, 3] }}>
        <ambientLight intensity={0.8} />
        <directionalLight position={[5, 5, 5]} />
        <CocaColaModel position={palmPos} />
        <OrbitControls />
      </Canvas>
    </div>
  );
}
