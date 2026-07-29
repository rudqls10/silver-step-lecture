/**
 * webhook.ts - Make(Integromat) 웹훅 연동 모듈 (TypeScript 버전)
 */

export interface WebhookSettings {
  webhookUrl: string;
  seniorName: string;
  childName: string;
  targetCount: number;
  autoNotify: boolean;
  autoStart: boolean;
}

export interface WebhookResult {
  success: boolean;
  simulated: boolean;
  message: string;
  payload: Record<string, any>;
  status?: number;
}

export class WebhookManager {
  private STORAGE_KEYS = {
    WEBHOOK_URL: 'silverstep_webhook_url',
    SENIOR_NAME: 'silverstep_senior_name',
    CHILD_NAME: 'silverstep_child_name',
    TARGET_COUNT: 'silverstep_target_count',
    AUTO_NOTIFY: 'silverstep_auto_notify',
    SEND_LOG: 'silverstep_webhook_log',
    AUTO_START: 'silverstep_auto_start',
  };

  webhookUrl: string = '';
  seniorName: string = '어르신';
  childName: string = '자녀';
  targetCount: number = 10;
  autoNotify: boolean = false;
  autoStart: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.loadSettings();
    }
  }

  loadSettings() {
    this.webhookUrl = localStorage.getItem(this.STORAGE_KEYS.WEBHOOK_URL) || '';
    this.seniorName = localStorage.getItem(this.STORAGE_KEYS.SENIOR_NAME) || '어르신';
    this.childName = localStorage.getItem(this.STORAGE_KEYS.CHILD_NAME) || '자녀';
    this.targetCount = parseInt(localStorage.getItem(this.STORAGE_KEYS.TARGET_COUNT) || '10', 10);
    this.autoNotify = localStorage.getItem(this.STORAGE_KEYS.AUTO_NOTIFY) === 'true';
    this.autoStart = localStorage.getItem(this.STORAGE_KEYS.AUTO_START) === 'true';
  }

  saveSettings(settings: Partial<WebhookSettings>) {
    if (settings.webhookUrl !== undefined) {
      this.webhookUrl = settings.webhookUrl.trim();
      localStorage.setItem(this.STORAGE_KEYS.WEBHOOK_URL, this.webhookUrl);
    }
    if (settings.seniorName !== undefined) {
      this.seniorName = settings.seniorName.trim() || '어르신';
      localStorage.setItem(this.STORAGE_KEYS.SENIOR_NAME, this.seniorName);
    }
    if (settings.childName !== undefined) {
      this.childName = settings.childName.trim() || '자녀';
      localStorage.setItem(this.STORAGE_KEYS.CHILD_NAME, this.childName);
    }
    if (settings.targetCount !== undefined) {
      this.targetCount = typeof settings.targetCount === 'number' ? settings.targetCount : parseInt(settings.targetCount, 10);
      localStorage.setItem(this.STORAGE_KEYS.TARGET_COUNT, String(this.targetCount));
    }
    if (settings.autoNotify !== undefined) {
      this.autoNotify = !!settings.autoNotify;
      localStorage.setItem(this.STORAGE_KEYS.AUTO_NOTIFY, String(this.autoNotify));
    }
    if (settings.autoStart !== undefined) {
      this.autoStart = !!settings.autoStart;
      localStorage.setItem(this.STORAGE_KEYS.AUTO_START, String(this.autoStart));
    }
  }

  getSettings(): WebhookSettings {
    return {
      webhookUrl: this.webhookUrl,
      seniorName: this.seniorName,
      childName: this.childName,
      targetCount: this.targetCount,
      autoNotify: this.autoNotify,
      autoStart: this.autoStart,
    };
  }

  get isConfigured(): boolean {
    return this.webhookUrl.length > 0 && this._isValidWebhookUrl(this.webhookUrl);
  }

  private _isValidWebhookUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'https:' || parsed.hostname === 'localhost';
    } catch {
      return false;
    }
  }

  async sendExerciseComplete(exerciseData: {
    exerciseName: string;
    exerciseIcon: string;
    totalReps: number;
    durationSeconds: number;
  }): Promise<WebhookResult> {
    const payload = this._buildPayload(exerciseData);
    if (!this.isConfigured) {
      await this._delay(1000);
      return {
        success: true,
        simulated: true,
        message: '시뮬레이션 모드: 설정에서 Make 웹훅 URL을 입력하면 실제 알림이 전송됩니다.',
        payload,
      };
    }
    return await this._sendWithRetry(payload);
  }

  async sendSOSAlert(): Promise<WebhookResult> {
    const now = new Date();
    const timeString = now.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: true });
    const dateString = now.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });

    const sosPayload = {
      seniorName: this.seniorName,
      childName: this.childName,
      isSOS: true,
      date: dateString,
      time: timeString,
      timestamp: now.toISOString(),
      message: `[실버스텝 🆘] ${this.seniorName}님이 운동 중 쉬어가기 버튼을 눌렀습니다.\n\n📅 ${dateString} ${timeString}\n\n안부 전화를 드려보세요. 📞`,
    };

    if (!this.isConfigured) {
      await this._delay(500);
      return { success: true, simulated: true, message: 'SOS 시뮬레이션', payload: sosPayload };
    }
    return await this._sendWithRetry(sosPayload);
  }

  async sendTestNotification(): Promise<WebhookResult> {
    const testPayload = this._buildPayload({
      exerciseName: '테스트',
      exerciseIcon: '🧪',
      totalReps: 0,
      durationSeconds: 0,
    });
    if (!this.isConfigured) {
      return {
        success: false,
        simulated: false,
        message: '웹훅 URL을 먼저 입력해주세요.',
        payload: testPayload,
      };
    }
    return await this._sendWithRetry(testPayload);
  }

  private _buildPayload(exerciseData: {
    exerciseName: string;
    exerciseIcon: string;
    totalReps: number;
    durationSeconds: number;
  }) {
    const now = new Date();
    const timeString = now.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: true });
    const dateString = now.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });

    const durationMin = Math.floor((exerciseData.durationSeconds || 0) / 60);
    const durationSec = (exerciseData.durationSeconds || 0) % 60;
    const durationText = durationMin > 0 ? `${durationMin}분 ${durationSec}초` : `${durationSec}초`;

    return {
      seniorName: this.seniorName,
      childName: this.childName,
      exerciseName: exerciseData.exerciseName || '운동',
      exerciseIcon: exerciseData.exerciseIcon || '🏃',
      totalReps: exerciseData.totalReps || 0,
      duration: durationText,
      date: dateString,
      time: timeString,
      timestamp: now.toISOString(),
      message: `[실버스텝] ${this.seniorName}님이 ${exerciseData.exerciseIcon || '🏃'} ${exerciseData.exerciseName || '운동'}을 완료했습니다!\n\n📊 횟수: ${exerciseData.totalReps || 0}회\n⏱️ 시간: ${durationText}\n📅 ${dateString} ${timeString}\n\n오늘도 건강하게 운동을 마쳤습니다. 안심하세요! 💪`,
    };
  }

  private async _sendWithRetry(payload: Record<string, any>): Promise<WebhookResult> {
    try {
      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok || response.status === 200 || response.status === 202) {
        return {
          success: true,
          simulated: false,
          message: '알림이 성공적으로 전송되었습니다!',
          payload,
          status: response.status,
        };
      }
      throw new Error(`HTTP ${response.status}`);
    } catch (e: any) {
      return {
        success: false,
        simulated: false,
        message: `알림 전송 실패: ${e?.message || '네트워크 오류'}`,
        payload,
      };
    }
  }

  private _delay(ms: number) {
    return new Promise((r) => setTimeout(r, ms));
  }
}
