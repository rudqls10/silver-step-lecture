import React, { useState } from 'react';
import { WebhookSettings } from '@/lib/webhook';

interface SettingsModalProps {
  initialSettings: WebhookSettings;
  onSave: (settings: Partial<WebhookSettings>) => void;
  onClose: () => void;
  onTestWebhook: () => Promise<{ success: boolean; message: string }>;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  initialSettings,
  onSave,
  onClose,
  onTestWebhook,
}) => {
  const [webhookUrl, setWebhookUrl] = useState(initialSettings.webhookUrl);
  const [seniorName, setSeniorName] = useState(initialSettings.seniorName);
  const [childName, setChildName] = useState(initialSettings.childName);
  const [targetCount, setTargetCount] = useState(initialSettings.targetCount);
  const [autoNotify, setAutoNotify] = useState(initialSettings.autoNotify);
  const [autoStart, setAutoStart] = useState(initialSettings.autoStart);
  const [testResult, setTestResult] = useState('');
  const [testing, setTesting] = useState(false);

  const handleSave = () => {
    onSave({
      webhookUrl,
      seniorName,
      childName,
      targetCount,
      autoNotify,
      autoStart,
    });
    onClose();
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult('');
    try {
      const res = await onTestWebhook();
      setTestResult(res.message);
    } catch {
      setTestResult('테스트 전송 에러');
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="settings-modal-overlay" style={{ display: 'flex' }}>
      <div className="settings-modal">
        <div className="settings-header">
          <h2 className="settings-title">⚙️ 설정</h2>
          <button className="settings-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="settings-body">
          <div className="settings-section">
            <h3 className="settings-section-title">📡 알림 연동 (Make 웹훅)</h3>
            <div className="settings-field">
              <label className="settings-label" htmlFor="setting-webhook-url">
                웹훅 URL
              </label>
              <input
                type="url"
                className="settings-input"
                id="setting-webhook-url"
                placeholder="https://hook.make.com/..."
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
              />
              <p className="settings-hint">Make(Integromat) 시나리오의 웹훅 URL을 입력하세요</p>
            </div>
          </div>

          <div className="settings-section">
            <h3 className="settings-section-title">👤 이름 설정</h3>
            <div className="settings-field">
              <label className="settings-label" htmlFor="setting-senior-name">
                어르신 이름
              </label>
              <input
                type="text"
                className="settings-input"
                id="setting-senior-name"
                value={seniorName}
                onChange={(e) => setSeniorName(e.target.value)}
              />
            </div>
            <div className="settings-field">
              <label className="settings-label" htmlFor="setting-child-name">
                자녀 이름
              </label>
              <input
                type="text"
                className="settings-input"
                id="setting-child-name"
                value={childName}
                onChange={(e) => setChildName(e.target.value)}
              />
            </div>
          </div>

          <div className="settings-section">
            <h3 className="settings-section-title">🏋️ 운동 설정</h3>
            <div className="settings-field">
              <label className="settings-label" htmlFor="setting-target-count">
                목표 운동 횟수
              </label>
              <select
                className="settings-select"
                id="setting-target-count"
                value={targetCount}
                onChange={(e) => setTargetCount(parseInt(e.target.value, 10))}
              >
                <option value={3}>3회 (테스트용)</option>
                <option value={5}>5회</option>
                <option value={10}>10회</option>
                <option value={15}>15회</option>
                <option value={20}>20회</option>
              </select>
            </div>
            <div className="settings-field settings-toggle-field">
              <label className="settings-label" htmlFor="setting-auto-notify">
                운동 완료 시 자동 알림
              </label>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  id="setting-auto-notify"
                  checked={autoNotify}
                  onChange={(e) => setAutoNotify(e.target.checked)}
                />
                <span className="toggle-slider" />
              </label>
            </div>
          </div>

          <div className="settings-section">
            <h3 className="settings-section-title">🚀 자동 시작</h3>
            <div className="settings-field settings-toggle-field">
              <label className="settings-label" htmlFor="setting-auto-start">
                앱 실행 시 자동 시작
              </label>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  id="setting-auto-start"
                  checked={autoStart}
                  onChange={(e) => setAutoStart(e.target.checked)}
                />
                <span className="toggle-slider" />
              </label>
            </div>
          </div>

          <div className="settings-section">
            <h3 className="settings-section-title">🧪 테스트</h3>
            <button className="settings-test-button" onClick={handleTest} disabled={testing}>
              {testing ? '전송 중...' : '테스트 알림 전송'}
            </button>
            {testResult && <div className="settings-test-result">{testResult}</div>}
          </div>
        </div>

        <div className="settings-footer">
          <button className="settings-save-button" onClick={handleSave}>
            💾 저장하기
          </button>
        </div>
      </div>
    </div>
  );
};
