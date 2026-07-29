import React, { useEffect, useRef, useState } from 'react';
import { ExerciseType, getExerciseConfig } from '@/lib/exercises';

interface WorkoutCameraProps {
  exerciseType: string;
  isRunning: boolean;
  blurBackground: boolean;
  onPoseState: (poseState: any) => void;
  onFpsUpdate: (fps: number) => void;
  onError: (msg: string) => void;
}

export const WorkoutCamera: React.FC<WorkoutCameraProps> = ({
  exerciseType,
  isRunning,
  blurBackground,
  onPoseState,
  onFpsUpdate,
  onError,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [scriptsLoaded, setScriptsLoaded] = useState(false);

  const poseRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);
  const frameCountRef = useRef(0);
  const lastFpsTimeRef = useRef(performance.now());
  const currentPoseStateRef = useRef('NOT_DETECTED');
  const isRunningRef = useRef(isRunning);
  const exerciseTypeRef = useRef(exerciseType);

  useEffect(() => {
    // 카메라를 항시 켜서 랜드마크 분석 및 실시간 렌더링 유지
    isRunningRef.current = true;
  }, []);

  useEffect(() => {
    exerciseTypeRef.current = exerciseType;
  }, [exerciseType]);

  // MediaPipe 스크립트 동적 로드 및 전역 객체 체크
  useEffect(() => {
    const windowAny = window as any;
    if (windowAny.Pose && windowAny.Camera) {
      setScriptsLoaded(true);
      return;
    }

    const loadScript = (src: string): Promise<void> => {
      return new Promise((resolve, reject) => {
        if (document.querySelector(`script[src="${src}"]`)) {
          resolve();
          return;
        }
        const script = document.createElement('script');
        script.src = src;
        script.crossOrigin = 'anonymous';
        script.onload = () => resolve();
        script.onerror = (e) => reject(e);
        document.head.appendChild(script);
      });
    };

    Promise.all([
      loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js'),
      loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js'),
      loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/pose/pose.js'),
    ])
      .then(() => setScriptsLoaded(true))
      .catch(() => onError('MediaPipe 라이브러리를 로드하지 못했습니다.'));
  }, [onError]);

  // MediaPipe Pose & Camera 초기화
  useEffect(() => {
    if (!scriptsLoaded) return;

    let timerId: any;
    let cameraInstance: any = null;

    const initCamera = () => {
      if (!videoRef.current || !canvasRef.current) {
        timerId = setTimeout(initCamera, 100);
        return;
      }

      const windowAny = window as any;
      if (!windowAny.Pose || !windowAny.Camera) {
        onError('MediaPipe 전역 객체를 찾을 수 없습니다.');
        return;
      }

      try {
        let pose = poseRef.current;
        if (!pose) {
          pose = new windowAny.Pose({
            locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
          });

          pose.setOptions({
            modelComplexity: 1,
            smoothLandmarks: true,
            enableSegmentation: false,
            smoothSegmentation: false,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5,
          });
          poseRef.current = pose;
        }

        pose.onResults((results: any) => {
          // FPS
          frameCountRef.current++;
          const now = performance.now();
          if (now - lastFpsTimeRef.current >= 1000) {
            onFpsUpdate(frameCountRef.current);
            frameCountRef.current = 0;
            lastFpsTimeRef.current = now;
          }

          const canvas = canvasRef.current;
          if (!canvas) return;
          const ctx = canvas.getContext('2d');
          if (!ctx) return;

          const width = (canvas.width = videoRef.current?.videoWidth || 640);
          const height = (canvas.height = videoRef.current?.videoHeight || 480);

          ctx.save();
          ctx.clearRect(0, 0, width, height);

          if (blurBackground) {
            ctx.filter = 'blur(14px) brightness(1.4) saturate(1.1)';
            ctx.drawImage(results.image, 0, 0, width, height);
            ctx.filter = 'none';
            ctx.fillStyle = 'rgba(255, 249, 242, 0.15)';
            ctx.fillRect(0, 0, width, height);
          } else {
            ctx.drawImage(results.image, 0, 0, width, height);
          }

          if (results.poseLandmarks) {
            const config = getExerciseConfig(exerciseTypeRef.current);
            const analysis = config.analyze(results.poseLandmarks);
            currentPoseStateRef.current = analysis.state;

            drawSkeleton(ctx, results.poseLandmarks, analysis.state, config, windowAny);

            onPoseState({
              detected: true,
              state: analysis.state,
              leftDebugValue: analysis.leftDebugValue,
              rightDebugValue: analysis.rightDebugValue,
              confidence: analysis.confidence,
            });
          } else {
            currentPoseStateRef.current = 'NOT_DETECTED';
            onPoseState({
              detected: false,
              state: 'NOT_DETECTED',
              kneeAngle: 0,
              leftKneeAngle: 0,
              rightKneeAngle: 0,
              confidence: 0,
            });
          }

          ctx.restore();
        });

        poseRef.current = pose;

        const camera = new windowAny.Camera(videoRef.current, {
          onFrame: async () => {
            const video = videoRef.current;
            if (
              isRunningRef.current &&
              poseRef.current &&
              video &&
              video.readyState >= 2 &&
              video.videoWidth > 0
            ) {
              try {
                await poseRef.current.send({ image: video });
              } catch (err) {
                // frame 전송 중 비동기 취소 에러 무시
              }
            }
          },
          facingMode: 'user',
          width: 640,
          height: 480,
        });

        cameraRef.current = camera;
        cameraInstance = camera;
        camera.start().catch((err: any) => {
          onError('카메라를 시작할 수 없습니다. 권한을 확인해주세요.');
        });
      } catch (e: any) {
        onError(`카메라 초기화 에러: ${e?.message}`);
      }
    };

    initCamera();

    return () => {
      if (timerId) clearTimeout(timerId);
      if (cameraInstance) {
        try {
          cameraInstance.stop();
        } catch {}
      }
    };
  }, [scriptsLoaded, blurBackground, onFpsUpdate, onPoseState, onError]);

  return (
    <div className="camera-container">
      {!scriptsLoaded && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#FFF9F2', color: '#3D3028' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>📷</div>
          <p style={{ fontSize: 18, fontWeight: 700 }}>AI 카메라 엔진 준비 중...</p>
        </div>
      )}
      <video ref={videoRef} id="camera-video" autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      <canvas ref={canvasRef} id="pose-canvas" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
      <div className="camera-blur-overlay" id="camera-blur" />
      <div className="camera-vignette" />
    </div>
  );
};

function drawSkeleton(ctx: CanvasRenderingContext2D, landmarks: any[], state: string, config: any, windowAny: any) {
  const { drawConnectors, drawLandmarks, POSE_CONNECTIONS } = windowAny;
  if (!drawConnectors || !drawLandmarks || !POSE_CONNECTIONS) return;

  const stateColors: Record<string, { line: string; joint: string; glow: string }> = {
    UP: { line: '#4CAF50', joint: '#4CAF50', glow: 'rgba(76, 175, 80, 0.5)' },
    DOWN: { line: '#FF7043', joint: '#FF7043', glow: 'rgba(255, 112, 67, 0.5)' },
    TRANSITIONING: { line: '#42A5F5', joint: '#42A5F5', glow: 'rgba(66, 165, 245, 0.5)' },
    NOT_DETECTED: { line: '#42A5F5', joint: '#42A5F5', glow: 'rgba(66, 165, 245, 0.5)' },
  };

  const colors = stateColors[state] || stateColors.NOT_DETECTED;
  const FACE_INDICES = new Set([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  const bodyConnections = POSE_CONNECTIONS.filter(([a, b]: [number, number]) => !FACE_INDICES.has(a) && !FACE_INDICES.has(b));

  drawConnectors(ctx, landmarks, bodyConnections, {
    color: colors.line,
    lineWidth: 3,
  });

  const bodyLandmarks = landmarks.filter((_, i) => !FACE_INDICES.has(i));
  drawLandmarks(ctx, bodyLandmarks, {
    color: colors.joint,
    lineWidth: 1,
    radius: 5,
    fillColor: colors.joint,
  });

  const keyJoints = config.highlightJoints || [11, 12, 13, 14, 15, 16];
  const keyLandmarks = keyJoints.map((i: number) => landmarks[i]).filter(Boolean);
  drawLandmarks(ctx, keyLandmarks, {
    color: '#ffffff',
    lineWidth: 2,
    radius: 8,
    fillColor: colors.glow,
  });
}
