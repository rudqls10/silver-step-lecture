import React, { useState } from 'react';

interface CompleteScreenProps {
  totalReps: number;
  durationText: string;
  todaySummary: { totalSessions: number; totalReps: number; totalDuration: number };
  onRestart: () => void;
  onSendNotify: () => Promise<{ success: boolean; message: string }>;
}

export const CompleteScreen: React.FC<CompleteScreenProps> = ({
  totalReps,
  durationText,
  todaySummary,
  onRestart,
  onSendNotify,
}) => {
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  const handleNotify = async () => {
    setLoading(true);
    setStatusMsg('');
    try {
      const res = await onSendNotify();
      setStatusMsg(res.message);
    } catch {
      setStatusMsg('알림 전송 실패');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="complete-screen active" id="complete-screen">
      <div className="confetti-container">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="confetti" />
        ))}
      </div>

      <div className="complete-icon">🎉</div>
      <h2 className="complete-title">오늘의 운동 완료!</h2>

      <div className="complete-stats">
        <div className="stat-card">
          <div className="stat-value">{totalReps}</div>
          <div className="stat-label">총 횟수</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{durationText}</div>
          <div className="stat-label">운동 시간</div>
        </div>
      </div>

      <div className="complete-actions">
        <button className="notify-button" onClick={handleNotify} disabled={loading}>
          <span className="notify-btn-content">
            <span className="notify-icon">📱</span>
            <span className="notify-label">{loading ? '전송 중...' : '자녀에게 알림 보내기'}</span>
          </span>
        </button>
        {statusMsg && <div className="notify-status" style={{ display: 'block' }}>{statusMsg}</div>}
        <button className="restart-button" onClick={onRestart}>
          다시 운동하기
        </button>
      </div>

      <div className="today-summary">
        <h3 className="today-summary-title">📊 오늘의 운동</h3>
        <div className="today-summary-stats">
          <div className="today-stat">
            <span className="today-stat-value">{todaySummary.totalSessions}</span>
            <span className="today-stat-label">회 운동</span>
          </div>
          <div className="today-stat">
            <span className="today-stat-value">{todaySummary.totalReps}</span>
            <span className="today-stat-label">총 횟수</span>
          </div>
          <div className="today-stat">
            <span className="today-stat-value">{Math.round(todaySummary.totalDuration)}초</span>
            <span className="today-stat-label">총 시간</span>
          </div>
        </div>
      </div>
    </div>
  );
};
