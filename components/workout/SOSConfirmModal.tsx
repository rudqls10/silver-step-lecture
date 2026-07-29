import React from 'react';

interface SOSConfirmModalProps {
  onStop: () => void;
  onResume: () => void;
}

export const SOSConfirmModal: React.FC<SOSConfirmModalProps> = ({ onStop, onResume }) => {
  return (
    <div className="sos-confirm-overlay" style={{ display: 'flex' }}>
      <div className="sos-confirm-card">
        <div className="sos-confirm-icon">🤚</div>
        <div className="sos-confirm-title">운동을 중단할까요?</div>
        <div className="sos-confirm-desc">
          괜찮으세요? 잠시 쉬었다가
          <br />
          다시 시작할 수 있어요.
        </div>
        <div className="sos-confirm-actions">
          <button className="sos-btn-stop" onClick={onStop}>
            🛑 운동 중단하기
          </button>
          <button className="sos-btn-resume" onClick={onResume}>
            ✅ 계속 운동하기
          </button>
        </div>
      </div>
    </div>
  );
};
