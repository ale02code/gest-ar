import React, { useEffect, useRef, useState } from "react";
import { Hands } from "@mediapipe/hands";
import { Camera } from "@mediapipe/camera_utils";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import * as THREE from "three";

function Model({ position }) {
  const modelRef = useRef();

  useEffect(() => {
    const loader = new GLTFLoader();
    loader.load("/figure.glb", (gltf) => {
      modelRef.current.add(gltf.scene);
    });
  }, []);

  return <group ref={modelRef} position={position} scale={[0.5, 0.5, 0.5]} />;
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
      modelComplexity: 1,
      minDetectionConfidence: 0.7,
      minTrackingConfidence: 0.7,
    });

    hands.onResults((results) => {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);

      if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        const landmarks = results.multiHandLandmarks[0];
        const palm = landmarks[9]; // centro de la palma

        // convertir coords a espacio -1..1 para la escena 3D
        const x = (palm.x - 0.5) * 2;
        const y = -(palm.y - 0.5) * 2;

        setHandPosition([x, y, -2]); // -2 para que quede frente a la cámara 3D
      } else {
        setHandPosition(null); // no hay mano → ocultar
      }
    });

    const camera = new Camera(videoRef.current, {
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
    <div className="flex flex-col items-center">
      <h1>Detección de Mano con Figura 3D</h1>
      <video ref={videoRef} className="hidden" />
      <canvas ref={canvasRef} width={640} height={480} />

      {/* Escena 3D */}
      <Canvas style={{ width: 640, height: 480 }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[2, 2, 5]} />
        <OrbitControls />

        {/* Mostrar modelo solo si hay mano */}
        {handPosition && <Model position={handPosition} />}
      </Canvas>
    </div>
  );
}
