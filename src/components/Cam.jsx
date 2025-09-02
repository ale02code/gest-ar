import React, { useRef, useEffect, useState } from "react";
import { Hands } from "@mediapipe/hands";
import { Camera } from "@mediapipe/camera_utils";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";

export default function Cam() {
  const videoRef = useRef(null);
  const [palmPos, setPalmPos] = useState(null); // posición de la palma

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

        // Landmark de la palma (aprox: punto 0 = wrist o 9 = centro palma)
        const palm = landmarks[9]; // eje X, Y en rango [0,1]
        setPalmPos({
          x: (palm.x - 0.5) * 4, // escalamos para la escena 3D
          y: -(palm.y - 0.5) * 3,
          z: palm.z * 2,
        });
      } else {
        setPalmPos(null); // si no hay mano, quitamos el objeto
      }
    });

    let camera = new Camera(videoRef.current, {
      onFrame: async () => {
        await hands.send({ image: videoRef.current });
      },
      width: 640,
      height: 480,
    });
    camera.start();

    return () => camera.stop();
  }, []);

  return (
    <div style={{ position: "relative", width: 640, height: 480 }}>
      {/* video en vivo */}
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        width="640"
        height="480"
        style={{ position: "absolute", top: 0, left: 0, zIndex: 1 }}
      />

      {/* Canvas 3D encima */}
      <Canvas
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          zIndex: 2,
          pointerEvents: "none",
        }}
        camera={{ position: [0, 0, 5] }}
      >
        <ambientLight />
        <OrbitControls />

        {palmPos && (
          <mesh position={[palmPos.x, palmPos.y, palmPos.z]}>
            <boxGeometry args={[0.2, 0.2, 0.2]} />
            <meshStandardMaterial color="red" />
          </mesh>
        )}
      </Canvas>
    </div>
  );
}
