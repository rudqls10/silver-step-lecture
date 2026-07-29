import React from 'react';
import { EXERCISE_CONFIG, ExerciseType } from '@/lib/exercises';

interface StartScreenProps {
  selectedExercise: string;
  onSelectExercise: (type: string) => void;
  onStartWorkout: () => void;
  onOpenSettings: () => void;
}

export const StartScreen: React.FC<StartScreenProps> = ({
  selectedExercise,
  onSelectExercise,
  onStartWorkout,
  onOpenSettings,
}) => {
  return (
    <div className="start-screen" id="start-screen">
      <button className="settings-button" onClick={onOpenSettings} title="설정">
        ⚙️
      </button>

      <div className="app-logo">
        <span className="app-logo-icon">🚶‍♂️</span>
        <h1 className="app-title">실버스텝</h1>
        <p className="app-subtitle">AI가 지켜보는 안심 홈트레이닝</p>
      </div>

      <div className="usage-guide">
        <div className="guide-item">
          <span className="guide-icon">📏</span>
          <span className="guide-text">스마트폰에서 3m 떨어져 주세요</span>
        </div>
        <div className="guide-item">
          <span className="guide-icon">🧍</span>
          <span className="guide-text">전신이 카메라에 보이게 서 주세요</span>
        </div>
        <div className="guide-item">
          <span className="guide-icon">🔊</span>
          <span className="guide-text">음성 안내를 따라 운동해 주세요</span>
        </div>
      </div>

      <div className="exercise-selector" id="exercise-selector">
        <h2 className="selector-title">오늘의 운동을 선택하세요</h2>
        <div className="exercise-cards">
          {Object.entries(EXERCISE_CONFIG).map(([key, config]) => {
            const isSelected = selectedExercise === key;
            return (
              <button
                key={key}
                className={`exercise-card ${isSelected ? 'selected' : ''}`}
                onClick={() => onSelectExercise(key)}
              >
                <span className="card-icon">{config.icon}</span>
                <span className="card-name">{config.name}</span>
                <span className="card-desc">{config.description}</span>
              </button>
            );
          })}
        </div>
      </div>

      <button className="start-button" onClick={onStartWorkout}>
        운동 시작하기
      </button>
    </div>
  );
};
