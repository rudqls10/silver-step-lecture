import React from 'react';

interface ExerciseUIOverlayProps {
  statusText: string;
  isDetecting: boolean;
  timerText: string;
  exerciseName: string;
  exerciseIcon: string;
  count: number;
  targetCount: number;
  messageText: string;
  onSOSClick: () => void;
}

export const ExerciseUIOverlay: React.FC<ExerciseUIOverlayProps> = ({
  statusText,
  isDetecting,
  timerText,
  exerciseName,
  exerciseIcon,
  count,
  targetCount,
  messageText,
  onSOSClick,
}) => {
  const progressPercent = Math.min((count / targetCount) * 100, 100);

  return (
    <>
      <div className="ui-overlay">
        {/* 상단: 상태 표시 + 타이머 */}
        <div className="status-bar">
          <div className="status-indicator">
            <div className={`status-dot ${isDetecting ? 'active' : ''}`} id="status-dot" />
            <span className="status-text" id="status-text">{statusText}</span>
          </div>
          <div className="exercise-timer active" id="exercise-timer">
            <span className="timer-icon">⏱️</span>
            <span className="timer-text" id="timer-text">{timerText}</span>
          </div>
        </div>

        {/* 중앙: 운동 종류 + 카운트 표시 */}
        <div className="count-display">
          <div className="exercise-type active" id="exercise-type">
            {exerciseIcon} {exerciseName}
          </div>
          <div className="count-number" id="count-number">{count}</div>
          <div className="count-target" id="count-target">/ {targetCount}</div>
        </div>

        {/* 하단: 메시지 & 프로그레스 */}
        <div className="message-container">
          <div className="progress-container">
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${progressPercent}%` }} />
            </div>
            <div className="progress-text">{count} / {targetCount}</div>
          </div>
          <div className="message-display">
            <div className="message-text">{messageText}</div>
          </div>
        </div>
      </div>

      {/* SOS 멈춤 버튼 */}
      <button className="sos-button" onClick={onSOSClick}>
        <span className="sos-button-icon">🆘</span>
        <span className="sos-button-label">멈춤</span>
      </button>
    </>
  );
};
