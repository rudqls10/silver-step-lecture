/**
 * audio.ts - 음성 재생 및 비프음 관리 모듈 (TypeScript 버전)
 */

export class AudioManager {
  private synth: SpeechSynthesis | null = null;
  private isSpeaking: boolean = false;
  private koreanVoice: SpeechSynthesisVoice | null = null;
  private audioElements: Map<string, HTMLAudioElement> = new Map();
  private audioContext: AudioContext | null = null;
  private mp3Available: Record<string, boolean> = {};

  static readonly AUDIO_FILES: Record<string, string> = {
    GREETING: '/audio/greeting.mp3',
    START: '/audio/start.mp3',
    ENCOURAGE: '/audio/encourage.mp3',
    COMPLETE: '/audio/complete.mp3',
    WAITING: '/audio/waiting.mp3',
    POSE_FOUND: '/audio/pose_found.mp3',
    POSE_LOST: '/audio/pose_lost.mp3',
    NOTIFY_SENT: '/audio/notify_sent.mp3',
    SAFETY_TIMER: '/audio/safety_timer.mp3',
    SOS_CONFIRM: '/audio/sos_confirm.mp3',
    SOS_RESUMED: '/audio/sos_resumed.mp3',
    KNEE_RAISE_START: '/audio/knee_raise_start.mp3',
    KNEE_RAISE_ENCOURAGE: '/audio/knee_raise_encourage.mp3',
    COUNTDOWN_3: '/audio/countdown_3.mp3',
    COUNTDOWN_2: '/audio/countdown_2.mp3',
    COUNTDOWN_1: '/audio/countdown_1.mp3',
    ENCOURAGE_1: '/audio/encourage_1.mp3',
    ENCOURAGE_2: '/audio/encourage_2.mp3',
    ENCOURAGE_3: '/audio/encourage_3.mp3',
    ENCOURAGE_4: '/audio/encourage_4.mp3',
  };

  static readonly MESSAGES: Record<string, string> = {
    GREETING: '안녕하십니꺼~ 오늘도 운동 한 번 해봅시더!',
    START: '좋습니더! 운동 시작합니더~',
    ENCOURAGE: '다섯 번이나 했심더! 조금만 더 힘내봅시더~',
    COMPLETE: '오늘 운동 다 했심더! 수고 많았심더~',
    WAITING: '초록색 자리에 서 봅시더~',
    POSE_FOUND: '자세 잘 잡았심더! 곧 시작합니더~',
    POSE_LOST: '카메라 앞에 서 봅시더~',
    NOTIFY_SENT: '자녀한테 알림 보냈심더~',
    KNEE_RAISE_START: '무릎을 번갈아가며 높이 올려봅시더~',
    KNEE_RAISE_ENCOURAGE: '무릎 좀 더 높이 올려봅시더! 잘 하고 있심더~',
  };

  constructor() {
    if (typeof window !== 'undefined') {
      this.synth = window.speechSynthesis || null;
      this.initVoice();
      this.initAudioContext();
      this.preloadAllAudio();
    }
  }

  private initVoice() {
    if (!this.synth) return;
    const findKoreanVoice = () => {
      const voices = this.synth?.getVoices() || [];
      this.koreanVoice =
        voices.find((v) => v.lang === 'ko-KR' && v.name.includes('Google')) ||
        voices.find((v) => v.lang.startsWith('ko')) ||
        voices[0] ||
        null;
    };
    findKoreanVoice();
    if (this.synth.onvoiceschanged !== undefined) {
      this.synth.onvoiceschanged = findKoreanVoice;
    }
  }

  private initAudioContext() {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.audioContext = new AudioCtx();
      }
    } catch (e) {
      console.warn('[AudioManager] Web Audio API not available:', e);
    }
  }

  private preloadAllAudio() {
    Object.values(AudioManager.AUDIO_FILES).forEach((src) => {
      if (!this.audioElements.has(src)) {
        const audio = new Audio();
        audio.preload = 'auto';
        audio.src = src;
        audio.oncanplaythrough = () => {
          this.mp3Available[src] = true;
        };
        audio.onerror = () => {
          this.mp3Available[src] = false;
        };
        this.audioElements.set(src, audio);
      }
    });
  }

  async speakMessage(messageKey: string): Promise<void> {
    const text = AudioManager.MESSAGES[messageKey];
    if (!text) return;

    // AudioContext 활성화 (Autoplay 정책 해제)
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume().catch(() => {});
    }

    // 시니어 친화 다정한 음성 코칭 (TTS 최우선 구동)
    await this.speak(text);
  }

  speak(text: string): Promise<void> {
    return new Promise((resolve) => {
      if (typeof window === 'undefined' || !window.speechSynthesis) {
        resolve();
        return;
      }

      try {
        window.speechSynthesis.cancel(); // 이전 멘트 중단 후 새 멘트
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'ko-KR';
        utterance.rate = 0.88; // 시니어 맞춤 조금 천천히, 다정한 속도
        utterance.pitch = 1.05; // 맑고 따뜻한 톤

        if (this.koreanVoice) {
          utterance.voice = this.koreanVoice;
        }

        utterance.onend = () => {
          this.isSpeaking = false;
          resolve();
        };

        utterance.onerror = (e) => {
          console.warn('[AudioManager] TTS error:', e);
          this.isSpeaking = false;
          resolve();
        };

        this.isSpeaking = true;
        window.speechSynthesis.speak(utterance);
      } catch (e) {
        console.warn('[AudioManager] speak exception:', e);
        this.isSpeaking = false;
        resolve();
      }
    });
  }

  playBeep(frequency = 880, durationMs = 150) {
    if (!this.audioContext) return;
    try {
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }
      const osc = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();
      osc.type = 'sine';
      osc.frequency.value = frequency;
      gain.gain.setValueAtTime(0.3, this.audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + durationMs / 1000);
      osc.connect(gain);
      gain.connect(this.audioContext.destination);
      osc.start();
      osc.stop(this.audioContext.currentTime + durationMs / 1000);
    } catch {
      /* ignore audio context errors */
    }
  }

  async playCompleteSound() {
    this.playBeep(523, 150);
    await this.delay(150);
    this.playBeep(659, 150);
    await this.delay(150);
    this.playBeep(784, 150);
    await this.delay(150);
    this.playBeep(1047, 300);
  }

  playAudio(src: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.synth) this.synth.cancel();
      let audio = this.audioElements.get(src);
      if (!audio) {
        audio = new Audio(src);
        this.audioElements.set(src, audio);
      }
      audio.currentTime = 0;
      audio.onended = () => {
        this.isSpeaking = false;
        resolve();
      };
      audio.onerror = (e) => {
        this.isSpeaking = false;
        reject(e);
      };
      this.isSpeaking = true;
      audio.play().catch((err) => {
        this.isSpeaking = false;
        reject(err);
      });
    });
  }

  stop() {
    if (this.synth) this.synth.cancel();
    this.isSpeaking = false;
    this.audioElements.forEach((audio) => {
      audio.pause();
      audio.currentTime = 0;
    });
  }

  private delay(ms: number) {
    return new Promise((r) => setTimeout(r, ms));
  }
}
