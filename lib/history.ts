/**
 * history.ts - 운동 이력 저장 및 통계 모듈 (TypeScript 버전)
 */

export interface ExerciseRecord {
  id: string;
  timestamp: string;
  date: string;
  exerciseName: string;
  exerciseIcon: string;
  totalReps: number;
  targetReps: number;
  durationSeconds: number;
  notificationSent?: boolean;
}

export class ExerciseHistory {
  private STORAGE_KEY = 'silverstep_exercise_history';
  private MAX_DAYS = 30;

  addRecord(record: {
    exerciseName: string;
    exerciseIcon: string;
    totalReps: number;
    targetReps: number;
    durationSeconds: number;
    notificationSent?: boolean;
  }): ExerciseRecord {
    const records = this.getRecords();
    const entry: ExerciseRecord = {
      id: `ex_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      timestamp: new Date().toISOString(),
      date: new Date().toLocaleDateString('ko-KR'),
      exerciseName: record.exerciseName || '운동',
      exerciseIcon: record.exerciseIcon || '🏃',
      totalReps: record.totalReps || 0,
      targetReps: record.targetReps || 10,
      durationSeconds: record.durationSeconds || 0,
      notificationSent: record.notificationSent || false,
    };

    records.unshift(entry);
    this._saveRecords(records);
    return entry;
  }

  getRecords(): ExerciseRecord[] {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      let records: ExerciseRecord[] = raw ? JSON.parse(raw) : [];
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - this.MAX_DAYS);
      const cutoffISO = cutoff.toISOString();
      records = records.filter((r) => r.timestamp >= cutoffISO);
      return records;
    } catch {
      return [];
    }
  }

  getTodayRecords(): ExerciseRecord[] {
    const today = new Date().toLocaleDateString('ko-KR');
    return this.getRecords().filter((r) => r.date === today);
  }

  getTodaySummary() {
    const today = this.getTodayRecords();
    return {
      totalSessions: today.length,
      totalReps: today.reduce((sum, r) => sum + (r.totalReps || 0), 0),
      totalDuration: today.reduce((sum, r) => sum + (r.durationSeconds || 0), 0),
    };
  }

  private _saveRecords(records: ExerciseRecord[]) {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(records));
    } catch (e) {
      console.warn('[History] Save failed:', e);
    }
  }
}
