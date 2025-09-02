import React, { useRef, useEffect, useState } from "react";
import { Hands } from "@mediapipe/hands";
import { Camera } from "@mediapipe/camera_utils";
import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";

// Modelo 3D
function Model({ targetPos, targetQuat, targetScale }) {
  const ref = useRef();
  const currentPos = useRef(new THREE.Vector3());
  const currentQuat = useRef(new THREE.Quaternion());
  const currentScale = useRef(new THREE.Vector3(1, 1, 1));

  useFrame(() => {
    if (!ref.current || !targetPos || !targetQuat) return;

    // Posición suavizada
    currentPos.current.lerp(targetPos, 0.2);
    ref.current.position.copy(currentPos.current);

    // Rotación suavizada
    THREE.Quaternion.slerp(currentQuat.current, targetQuat, currentQuat.current, 0.2);
    ref.current.quaternion.copy(currentQuat.current);

    // Escala suavizada
    currentScale.current.lerp(targetScale, 0.2);
    ref.current.scale.copy(currentScale.current);
  });

  const { scene } = useGLTF("/figure.glb");
  return <primitive ref={ref} object={scene} />;
}

export default function Cam() {
  const videoRef = useRef(null);
  const [targetPos, setTargetPos] = useState(null);
  const [targetQuat, setTargetQuat] = useState(null);
  const [targetScale, setTargetScale] = useState(new THREE.Vector3(0.3, 0.3, 0.3));

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
        setTargetQuat(null);
        return;
      }

      const lms = results.multiHandLandmarks[0];

      // ---------- CENTRO DE LA PALMA ----------
      const palmIndices = [0, 1, 5, 9, 13, 17];
      let sumX = 0, sumY = 0, sumZ = 0;
      palmIndices.forEach(i => {
        sumX += lms[i].x;
        sumY += lms[i].y;
        sumZ += lms[i].z;
      });
      const avgX = sumX / palmIndices.length;
      const avgY = sumY / palmIndices.length;
      const avgZ = sumZ / palmIndices.length;

      // Convertimos a coordenadas Three.js
      const cx = (avgX - 0.5) * 4;
      const cy = -(avgY - 0.5) * 3;
      const cz = -avgZ * 2;
      setTargetPos(new THREE.Vector3(cx, cy, cz));

      // ---------- ORIENTACIÓN PALMA ----------
      const p0 = new THREE.Vector3(lms[0].x, lms[0].y, lms[0].z);
      const p5 = new THREE.Vector3(lms[5].x, lms[5].y, lms[5].z);
      const p17 = new THREE.Vector3(lms[17].x, lms[17].y, lms[17].z);

      const v1 = new THREE.Vector3().subVectors(p5, p0).normalize();
      const v2 = new THREE.Vector3().subVectors(p17, p0).normalize();
      const normal = new THREE.Vector3().crossVectors(v1, v2).normalize();

      const forward = new THREE.Vector3(0, 0, 1);
      const quat = new THREE.Quaternion().setFromUnitVectors(forward, normal);
      setTargetQuat(quat);

      // ---------- ESCALADO DINÁMICO ----------
      const scaleFactor = THREE.MathUtils.clamp(0.3 / (Math.abs(avgZ) + 0.5), 0.1, 1);
      setTargetScale(new THREE.Vector3(scaleFactor, scaleFactor, scaleFactor));
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
        {targetPos && targetQuat && targetScale && (
          <Model
            targetPos={targetPos}
            targetQuat={targetQuat}
            targetScale={targetScale}
          />
        )}
      </Canvas>
    </div>
  );
}
