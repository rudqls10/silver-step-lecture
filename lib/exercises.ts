/**
 * exercises.ts - 운동 타입 정의 및 포즈 분석 로직 모듈 (TypeScript 버전)
 */

export const ExerciseType = Object.freeze({
  MANSE: 'manse',       // 만세 운동
  KNEE_RAISE: 'knee_raise',  // 무릎 올리기
  SQUAT: 'squat',       // 스쿼트
} as const);

export type ExerciseTypeValue = typeof ExerciseType[keyof typeof ExerciseType];

export interface PoseAnalysisResult {
  detected: boolean;
  state: 'UP' | 'DOWN' | 'TRANSITIONING' | 'NOT_DETECTED';
  leftDebugValue: number;
  rightDebugValue: number;
  confidence: number;
}

export interface ExerciseConfigItem {
  name: string;
  icon: string;
  description: string;
  waitingPose: 'UP' | 'DOWN';
  waitingMessage: string;
  debugLabels: { left: string; right: string };
  analyze: (landmarks: any[]) => PoseAnalysisResult;
  highlightJoints: number[];
}

function calculateAngle(a: { x: number; y: number }, b: { x: number; y: number }, c: { x: number; y: number }): number {
  const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
  let angle = Math.abs((radians * 180.0) / Math.PI);
  if (angle > 180) angle = 360 - angle;
  return angle;
}

export const EXERCISE_CONFIG: Record<string, ExerciseConfigItem> = {
  [ExerciseType.MANSE]: {
    name: '만세 운동',
    icon: '🙌',
    description: '팔을 위로 올렸다 내려요',
    waitingPose: 'UP',
    waitingMessage: '두 팔을 높이 올려주세요',
    debugLabels: { left: '왼손목', right: '오른손목' },

    analyze(landmarks: any[]): PoseAnalysisResult {
      const leftShoulder = landmarks[11];
      const rightShoulder = landmarks[12];
      const leftElbow = landmarks[13];
      const rightElbow = landmarks[14];
      const leftWrist = landmarks[15];
      const rightWrist = landmarks[16];
      const leftHip = landmarks[23];
      const rightHip = landmarks[24];

      const shoulderY = (leftShoulder.y + rightShoulder.y) / 2;
      const hipY = (leftHip.y + rightHip.y) / 2;
      const bodyLength = hipY - shoulderY;

      const upThresholdY = shoulderY - bodyLength * 0.1;
      const downThresholdY = shoulderY + bodyLength * 0.3;

      const leftWristUp = leftWrist.y < upThresholdY;
      const rightWristUp = rightWrist.y < upThresholdY;
      const leftWristDown = leftWrist.y > downThresholdY;
      const rightWristDown = rightWrist.y > downThresholdY;

      const elbowsUp = leftElbow.y < shoulderY && rightElbow.y < shoulderY;
      const visibility =
        [leftShoulder, rightShoulder, leftWrist, rightWrist, leftHip, rightHip].reduce(
          (sum, lm) => sum + (lm.visibility || 0),
          0,
        ) / 6;

      let state: 'UP' | 'DOWN' | 'TRANSITIONING' = 'TRANSITIONING';
      if ((leftWristUp && rightWristUp) || (elbowsUp && leftWristUp) || (elbowsUp && rightWristUp)) {
        state = 'UP';
      } else if (leftWristDown && rightWristDown) {
        state = 'DOWN';
      }

      const leftDebug = Math.round((shoulderY - leftWrist.y) * 100);
      const rightDebug = Math.round((shoulderY - rightWrist.y) * 100);

      return {
        detected: true,
        state,
        leftDebugValue: leftDebug,
        rightDebugValue: rightDebug,
        confidence: Math.round(visibility * 100),
      };
    },

    highlightJoints: [11, 12, 13, 14, 15, 16],
  },

  [ExerciseType.KNEE_RAISE]: {
    name: '무릎 올리기',
    icon: '🦵',
    description: '무릎을 번갈아 올려요',
    waitingPose: 'DOWN',
    waitingMessage: '바르게 서 주세요',
    debugLabels: { left: '왼무릎 각도', right: '오른무릎 각도' },

    analyze(landmarks: any[]): PoseAnalysisResult {
      const leftHip = landmarks[23];
      const rightHip = landmarks[24];
      const leftKnee = landmarks[25];
      const rightKnee = landmarks[26];
      const leftAnkle = landmarks[27];
      const rightAnkle = landmarks[28];

      const leftKneeAngle = calculateAngle(leftHip, leftKnee, leftAnkle);
      const rightKneeAngle = calculateAngle(rightHip, rightKnee, rightAnkle);

      const visibility =
        [leftHip, rightHip, leftKnee, rightKnee, leftAnkle, rightAnkle].reduce(
          (sum, lm) => sum + (lm.visibility || 0),
          0,
        ) / 6;

      let state: 'UP' | 'DOWN' | 'TRANSITIONING' = 'TRANSITIONING';
      if (leftKneeAngle < 130 || rightKneeAngle < 130) {
        state = 'UP';
      } else if (leftKneeAngle > 155 && rightKneeAngle > 155) {
        state = 'DOWN';
      }

      return {
        detected: true,
        state,
        leftDebugValue: Math.round(leftKneeAngle),
        rightDebugValue: Math.round(rightKneeAngle),
        confidence: Math.round(visibility * 100),
      };
    },

    highlightJoints: [23, 24, 25, 26, 27, 28],
  },

  [ExerciseType.SQUAT]: {
    name: '스쿼트',
    icon: '🏋️',
    description: '천천히 앉았다 일어나요',
    waitingPose: 'UP',
    waitingMessage: '바르게 서 주세요',
    debugLabels: { left: '왼무릎 각도', right: '오른무릎 각도' },

    analyze(landmarks: any[]): PoseAnalysisResult {
      const leftHip = landmarks[23];
      const rightHip = landmarks[24];
      const leftKnee = landmarks[25];
      const rightKnee = landmarks[26];
      const leftAnkle = landmarks[27];
      const rightAnkle = landmarks[28];

      const leftKneeAngle = calculateAngle(leftHip, leftKnee, leftAnkle);
      const rightKneeAngle = calculateAngle(rightHip, rightKnee, rightAnkle);
      const avgKneeAngle = (leftKneeAngle + rightKneeAngle) / 2;

      const visibility =
        [leftHip, rightHip, leftKnee, rightKnee, leftAnkle, rightAnkle].reduce(
          (sum, lm) => sum + (lm.visibility || 0),
          0,
        ) / 6;

      let state: 'UP' | 'DOWN' | 'TRANSITIONING' = 'TRANSITIONING';
      if (avgKneeAngle > 150) {
        state = 'UP';
      } else if (avgKneeAngle < 125) {
        state = 'DOWN';
      }

      return {
        detected: true,
        state,
        leftDebugValue: Math.round(leftKneeAngle),
        rightDebugValue: Math.round(rightKneeAngle),
        confidence: Math.round(visibility * 100),
      };
    },

    highlightJoints: [23, 24, 25, 26, 27, 28],
  },
};

export function getExerciseConfig(exerciseType: string): ExerciseConfigItem {
  return EXERCISE_CONFIG[exerciseType] || EXERCISE_CONFIG[ExerciseType.MANSE];
}
