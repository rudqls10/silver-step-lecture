import React, { useEffect, useRef, useState, useCallback } from 'react';
import { WorkoutCamera } from './WorkoutCamera';
import { StartScreen } from './StartScreen';
import { ExerciseUIOverlay } from './ExerciseUIOverlay';
import { CompleteScreen } from './CompleteScreen';
import { SettingsModal } from './SettingsModal';
import { SOSConfirmModal } from './SOSConfirmModal';

import { ExerciseType, EXERCISE_CONFIG, getExerciseConfig } from '@/lib/exercises';
import { ExerciseCounter } from '@/lib/counter';
import { AudioManager } from '@/lib/audio';
import { WebhookManager, WebhookSettings } from '@/lib/webhook';
import { ExerciseHistory } from '@/lib/history';
import { logActivity } from '@/lib/activity';

type AppScreenState = 'START' | 'COUNTDOWN' | 'WORKOUT' | 'COMPLETE' | 'ERROR';

interface WorkoutMainProps {
  user: { id: string; email: string; fullName: string; avatarUrl?: string };
  onLogout: () => void;
}

export const WorkoutMain: React.FC<WorkoutMainProps> = ({ user, onLogout }) => {
  const [screenState, setScreenState] = useState<AppScreenState>('START');
  const [exerciseType, setExerciseType] = useState<string>(ExerciseType.MANSE);
  const [countdownNumber, setCountdownNumber] = useState<number>(3);
  const [count, setCount] = useState<number>(0);
  const [targetCount, setTargetCount] = useState<number>(10);
  const [statusText, setStatusText] = useState<string>('대기 중');
  const [isDetecting, setIsDetecting] = useState<boolean>(false);
  const [timerText, setTimerText] = useState<string>('00:00');
  const [messageText, setMessageText] = useState<string>('시작 버튼을 눌러주세요');
  const [errorMsg, setErrorMsg] = useState<string>('');

  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [showSOSModal, setShowSOSModal] = useState<boolean>(false);
  const [workoutDuration, setWorkoutDuration] = useState<number>(0);

  const audioRef = useRef<AudioManager | null>(null);
  const counterRef = useRef<ExerciseCounter | null>(null);
  const webhookRef = useRef<WebhookManager | null>(null);
  const historyRef = useRef<ExerciseHistory | null>(null);
  const timerIntervalRef = useRef<any>(null);
  const startTimeRef = useRef<number>(0);

  // 싱글톤 모듈 초기화
  useEffect(() => {
    audioRef.current = new AudioManager();
    webhookRef.current = new WebhookManager();
    historyRef.current = new ExerciseHistory();

    const settings = webhookRef.current.getSettings();
    setTargetCount(settings.targetCount);

    // 메인 화면 진입 시 다정한 환영 음성 코칭 출력 (Zero-Touch VUI)
    setTimeout(() => {
      if (audioRef.current) {
        audioRef.current.speakMessage('GREETING');
      }
    }, 500);

    if (settings.autoStart) {
      handleStartWorkout();
    }

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (audioRef.current) audioRef.current.stop();
    };
  }, []);

  const handleStartWorkout = () => {
    const config = getExerciseConfig(exerciseType);
    setMessageText(config.waitingMessage);

    // 3초 카운트다운
    setScreenState('COUNTDOWN');
    setCountdownNumber(3);
    if (audioRef.current) audioRef.current.speakMessage('COUNTDOWN_3');

    let current = 3;
    const interval = setInterval(() => {
      current--;
      if (current > 0) {
        setCountdownNumber(current);
        if (audioRef.current) {
          audioRef.current.speakMessage(`COUNTDOWN_${current}`);
        }
      } else {
        clearInterval(interval);
        startActualWorkout();
      }
    }, 1000);
  };

  const startActualWorkout = () => {
    const settings = webhookRef.current?.getSettings();
    const activeTarget = settings?.targetCount || 10;
    setTargetCount(activeTarget);
    setCount(0);
    setScreenState('WORKOUT');

    startTimeRef.current = Date.now();
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);

    timerIntervalRef.current = setInterval(() => {
      const elapsedSec = Math.floor((Date.now() - startTimeRef.current) / 1000);
      setWorkoutDuration(elapsedSec);
      const m = String(Math.floor(elapsedSec / 60)).padStart(2, '0');
      const s = String(elapsedSec % 60).padStart(2, '0');
      setTimerText(`${m}:${s}`);
    }, 1000);

    const counter = new ExerciseCounter({
      targetCount: activeTarget,
      onCountUpdate: (c) => {
        setCount(c);
        setMessageText(`${c}회 성공! 아주 잘 하셨습니다.`);
      },
      onMilestone: () => {
        if (audioRef.current) audioRef.current.speakMessage('ENCOURAGE');
      },
      onComplete: (total) => {
        handleWorkoutComplete(total);
      },
      onCountBeep: () => {
        if (audioRef.current) audioRef.current.playBeep(880, 150);
      },
    });

    counterRef.current = counter;
    if (audioRef.current) {
      if (exerciseType === ExerciseType.KNEE_RAISE) {
        audioRef.current.speakMessage('KNEE_RAISE_START');
      } else {
        audioRef.current.speakMessage('START');
      }
    }

    logActivity('WORKOUT_START', { exerciseType, targetCount: activeTarget });
  };

  const handleWorkoutComplete = async (total: number) => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    const duration = Math.floor((Date.now() - startTimeRef.current) / 1000);
    setWorkoutDuration(duration);
    setScreenState('COMPLETE');

    const config = getExerciseConfig(exerciseType);
    if (historyRef.current) {
      historyRef.current.addRecord({
        exerciseName: config.name,
        exerciseIcon: config.icon,
        totalReps: total,
        targetReps: targetCount,
        durationSeconds: duration,
      });
    }

    if (audioRef.current) {
      audioRef.current.playCompleteSound();
      audioRef.current.speakMessage('COMPLETE');
    }

    logActivity('WORKOUT_COMPLETE', { exerciseType, totalReps: total, durationSeconds: duration });

    const settings = webhookRef.current?.getSettings();
    if (settings?.autoNotify) {
      handleSendNotify();
    }
  };

  const handlePoseState = useCallback((poseState: any) => {
    if (!poseState.detected) {
      setIsDetecting(false);
      setStatusText('카메라 감지 중');
      return;
    }

    setIsDetecting(true);
    setStatusText('자세 감지 됨');

    if (counterRef.current && screenState === 'WORKOUT') {
      counterRef.current.update(poseState.state);
    }
  }, [screenState]);

  const handleFpsUpdate = useCallback(() => {}, []);

  const handleCameraError = useCallback((msg: string) => {
    setErrorMsg(msg);
    setScreenState('ERROR');
  }, []);

  const handleSendNotify = async (): Promise<{ success: boolean; message: string }> => {
    const config = getExerciseConfig(exerciseType);
    if (webhookRef.current) {
      const res = await webhookRef.current.sendExerciseComplete({
        exerciseName: config.name,
        exerciseIcon: config.icon,
        totalReps: count,
        durationSeconds: workoutDuration,
      });
      return { success: res.success, message: res.message };
    }
    return { success: false, message: '웹훅 모듈 미로드' };
  };

  const handleSOSStop = () => {
    setShowSOSModal(false);
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    setScreenState('START');
    if (webhookRef.current) {
      webhookRef.current.sendSOSAlert();
    }
  };

  const handleSOSResume = () => {
    setShowSOSModal(false);
    if (audioRef.current) {
      audioRef.current.speakMessage('SOS_RESUMED');
    }
  };

  const config = getExerciseConfig(exerciseType);
  const todaySummary = historyRef.current ? historyRef.current.getTodaySummary() : { totalSessions: 0, totalReps: 0, totalDuration: 0 };

  return (
    <div className="app-container" style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      {/* 상단 프로필 및 로그아웃 헤더 (모든 화면에 표시) */}
      <header
        style={{
          position: 'absolute',
          top: 12,
          right: 16,
          zIndex: 999,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          background: 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(8px)',
          padding: '6px 14px',
          borderRadius: 30,
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
        }}
      >
        <span style={{ fontSize: 14, fontWeight: 700, color: '#3D3028' }}>
          👤 {user.fullName || user.email}
        </span>
        <button
          onClick={onLogout}
          style={{
            border: 'none',
            background: '#EF5350',
            color: '#fff',
            padding: '4px 10px',
            borderRadius: 16,
            fontSize: 13,
            cursor: 'pointer',
            fontWeight: 700,
          }}
        >
          로그아웃
        </button>
      </header>

      {/* 카메라 및 캔버스 레이어 */}
      <WorkoutCamera
        exerciseType={exerciseType}
        isRunning={screenState === 'WORKOUT' || screenState === 'COUNTDOWN'}
        blurBackground={false}
        onPoseState={handlePoseState}
        onFpsUpdate={handleFpsUpdate}
        onError={handleCameraError}
      />

      {/* 1. 시작 화면 */}
      {screenState === 'START' && (
        <StartScreen
          selectedExercise={exerciseType}
          onSelectExercise={setExerciseType}
          onStartWorkout={handleStartWorkout}
          onOpenSettings={() => setShowSettings(true)}
        />
      )}

      {/* 2. 카운트다운 화면 */}
      {screenState === 'COUNTDOWN' && (
        <div className="countdown-overlay" style={{ display: 'flex' }}>
          <div className="countdown-number">{countdownNumber}</div>
        </div>
      )}

      {/* 3. 운동 진행 HUD 화면 */}
      {screenState === 'WORKOUT' && (
        <ExerciseUIOverlay
          statusText={statusText}
          isDetecting={isDetecting}
          timerText={timerText}
          exerciseName={config.name}
          exerciseIcon={config.icon}
          count={count}
          targetCount={targetCount}
          messageText={messageText}
          onSOSClick={() => setShowSOSModal(true)}
        />
      )}

      {/* 4. 운동 완료 화면 */}
      {screenState === 'COMPLETE' && (
        <CompleteScreen
          totalReps={count}
          durationText={`${workoutDuration}초`}
          todaySummary={todaySummary}
          onRestart={() => setScreenState('START')}
          onSendNotify={handleSendNotify}
        />
      )}

      {/* 5. 에러 화면 */}
      {screenState === 'ERROR' && (
        <div className="error-screen" style={{ display: 'flex' }}>
          <div className="error-icon">📷</div>
          <h2 className="error-title">카메라를 켜 주세요</h2>
          <p className="error-message">{errorMsg}</p>
          <button className="error-retry-button" onClick={() => setScreenState('START')}>
            다시 시도하기
          </button>
        </div>
      )}

      {/* 6. 설정 모달 */}
      {showSettings && webhookRef.current && (
        <SettingsModal
          initialSettings={webhookRef.current.getSettings()}
          onSave={(newSettings) => {
            webhookRef.current?.saveSettings(newSettings);
            if (newSettings.targetCount) setTargetCount(newSettings.targetCount);
          }}
          onClose={() => setShowSettings(false)}
          onTestWebhook={() => webhookRef.current?.sendTestNotification() || Promise.resolve({ success: false, message: '' })}
        />
      )}

      {/* 7. SOS 멈춤 확인 모달 */}
      {showSOSModal && (
        <SOSConfirmModal onStop={handleSOSStop} onResume={handleSOSResume} />
      )}
    </div>
  );
};
