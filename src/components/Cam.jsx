import React, { useRef, useEffect, useState } from "react";
import { Hands } from "@mediapipe/hands";
import { Camera } from "@mediapipe/camera_utils";
import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";

function Model({ targetPos, targetRot }) {
  const ref = useRef();
  const currentPos = useRef(new THREE.Vector3());
  const currentRot = useRef(new THREE.Euler());

  useFrame(() => {
    if (!ref.current || !targetPos) return;

    // Suavizado de posición
    currentPos.current.lerp(targetPos, 0.2);
    ref.current.position.copy(currentPos.current);

    // Suavizado de rotación
    currentRot.current.x += (targetRot.x - currentRot.current.x) * 0.2;
    currentRot.current.y += (targetRot.y - currentRot.current.y) * 0.2;
    currentRot.current.z += (targetRot.z - currentRot.current.z) * 0.2;
    ref.current.rotation.copy(currentRot.current);
  });

  const { scene } = useGLTF("/figure.glb");
  return <primitive ref={ref} object={scene} scale={[0.3, 0.3, 0.3]} />;
}

export default function Cam() {
  const videoRef = useRef(null);
  const [targetPos, setTargetPos] = useState(null);
  const [targetRot, setTargetRot] = useState(new THREE.Euler());

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
      if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
        setTargetPos(null);
        return;
      }

      const lms = results.multiHandLandmarks[0];

      // Centro de la palma (promedio de 0,1,5,9,13,17)
      const palmIndices = [0, 1, 5, 9, 13, 17];
      let sumX = 0, sumY = 0, sumZ = 0;
      palmIndices.forEach((i) => {
        sumX += lms[i].x;
        sumY += lms[i].y;
        sumZ += lms[i].z;
      });
      const cx = (sumX / palmIndices.length - 0.5) * 4; // escalar a -2..2 aprox
      const cy = -(sumY / palmIndices.length - 0.5) * 3;
      const cz = sumZ / palmIndices.length * 2;

      setTargetPos(new THREE.Vector3(cx, cy, cz));

      // Orientación: usar 0 (wrist), 5 (base dedo indice), 17 (base dedo meñique)
      const p0 = new THREE.Vector3(lms[0].x, lms[0].y, lms[0].z);
      const p5 = new THREE.Vector3(lms[5].x, lms[5].y, lms[5].z);
      const p17 = new THREE.Vector3(lms[17].x, lms[17].y, lms[17].z);

      const v1 = new THREE.Vector3().subVectors(p5, p0);
      const v2 = new THREE.Vector3().subVectors(p17, p0);
      const normal = new THREE.Vector3().crossVectors(v1, v2).normalize();

      const rot = new THREE.Euler(normal.x, normal.y, normal.z);
      setTargetRot(rot);
    });

    const camera = new Camera(videoRef.current, {
      onFrame: async () => await hands.send({ image: videoRef.current }),
      width: 640,
      height: 480,
    });
    camera.start();

    return () => camera.stop();
  }, []);

  return (
    <div style={{ position: "relative", width: 640, height: 480 }}>
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        width="640"
        height="480"
        style={{ position: "absolute", top: 0, left: 0, zIndex: 1 }}
      />

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
        <ambientLight intensity={1} />
        <Model targetPos={targetPos} targetRot={targetRot} />
      </Canvas>
    </div>
  );
}
