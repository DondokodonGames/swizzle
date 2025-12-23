/**
 * GenerationLogger
 *
 * 各生成ステップでの判断をログに記録
 * デバッグと品質改善のための詳細ログを出力
 */

import * as fs from 'fs';
import * as path from 'path';

export interface LogEntry {
  timestamp: string;
  step: string;
  type: 'decision' | 'input' | 'output' | 'error' | 'validation';
  message: string;
  data?: unknown;
}

export interface GenerationSession {
  sessionId: string;
  startTime: string;
  conceptTitle?: string;
  logs: LogEntry[];
}

export class GenerationLogger {
  private logDir: string;
  private currentSession: GenerationSession | null = null;
  private enabled: boolean;

  constructor(logDir?: string) {
    this.logDir = logDir || path.resolve(process.cwd(), 'logs/generation');
    this.enabled = process.env.GENERATION_LOGGING !== 'false';

    if (this.enabled) {
      this.ensureLogDirectory();
    }
  }

  /**
   * 新しいセッションを開始
   */
  startSession(conceptTitle?: string): string {
    const sessionId = this.generateSessionId();
    this.currentSession = {
      sessionId,
      startTime: new Date().toISOString(),
      conceptTitle,
      logs: []
    };

    this.log('session', 'decision', `Session started: ${conceptTitle || 'unnamed'}`);
    return sessionId;
  }

  /**
   * セッションを終了して保存
   */
  endSession(success: boolean): void {
    if (!this.currentSession) return;

    this.log('session', 'decision', `Session ended: ${success ? 'SUCCESS' : 'FAILED'}`);

    if (this.enabled) {
      this.saveSession();
    }

    this.currentSession = null;
  }

  /**
   * ログエントリを追加
   */
  log(
    step: string,
    type: LogEntry['type'],
    message: string,
    data?: unknown
  ): void {
    if (!this.currentSession) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      step,
      type,
      message,
      data
    };

    this.currentSession.logs.push(entry);

    // コンソールにも出力（デバッグ用）
    if (process.env.GENERATION_LOG_VERBOSE === 'true') {
      console.log(`[${step}] ${type}: ${message}`);
      if (data) {
        console.log('  Data:', JSON.stringify(data, null, 2).substring(0, 200));
      }
    }
  }

  /**
   * Step 1: コンセプト生成の判断をログ
   */
  logConceptGeneration(concept: {
    title: string;
    theme: string;
    playerGoal: string;
    selfEvaluation?: { reasoning: string };
  }): void {
    this.log('GameConceptGenerator', 'output', 'Concept generated', {
      title: concept.title,
      theme: concept.theme,
      playerGoal: concept.playerGoal,
      reasoning: concept.selfEvaluation?.reasoning
    });
  }

  /**
   * Step 2: コンセプトバリデーションをログ
   */
  logConceptValidation(passed: boolean, issues: string[]): void {
    this.log('ConceptValidator', 'validation',
      passed ? 'Concept validated' : 'Concept validation failed',
      { passed, issues }
    );
  }

  /**
   * Step 3: ゲームデザイン生成の判断をログ
   */
  logGameDesignGeneration(design: {
    coreLoop: string;
    mechanics: string[];
    objectRoles: Array<{ id: string; role: string }>;
    decisions: string[];
  }): void {
    this.log('GameDesignGenerator', 'output', 'Game design generated', {
      coreLoop: design.coreLoop,
      mechanics: design.mechanics,
      objectCount: design.objectRoles.length,
      decisions: design.decisions
    });
  }

  /**
   * Step 4: 仕様生成の判断をログ
   */
  logSpecificationGeneration(spec: {
    objects: Array<{ id: string; behavior: string }>;
    rules: Array<{ trigger: string; action: string }>;
    successPath: string;
    decisions: string[];
  }): void {
    this.log('SpecificationGenerator', 'output', 'Specification generated', {
      objectCount: spec.objects.length,
      ruleCount: spec.rules.length,
      successPath: spec.successPath,
      decisions: spec.decisions
    });
  }

  /**
   * Step 5: エディターマッピングの判断をログ
   */
  logEditorMapping(mapping: {
    objectIds: string[];
    counterIds: string[];
    ruleCount: number;
    mappingDecisions: string[];
  }): void {
    this.log('EditorMapper', 'output', 'Editor mapping completed', mapping);
  }

  /**
   * ロジックバリデーションをログ
   */
  logLogicValidation(valid: boolean, errors: Array<{ code: string; message: string }>): void {
    this.log('LogicValidator', 'validation',
      valid ? 'Logic validated' : 'Logic validation failed',
      { valid, errors: errors.map(e => `[${e.code}] ${e.message}`) }
    );
  }

  /**
   * エラーをログ
   */
  logError(step: string, error: Error | string): void {
    this.log(step, 'error', typeof error === 'string' ? error : error.message, {
      stack: error instanceof Error ? error.stack : undefined
    });
  }

  /**
   * 判断理由をログ
   */
  logDecision(step: string, decision: string, reasoning: string): void {
    this.log(step, 'decision', decision, { reasoning });
  }

  /**
   * 入力データをログ
   */
  logInput(step: string, inputName: string, data: unknown): void {
    this.log(step, 'input', `Input: ${inputName}`, data);
  }

  /**
   * セッションIDを生成
   */
  private generateSessionId(): string {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const timeStr = now.toISOString().slice(11, 19).replace(/:/g, '');
    const random = Math.random().toString(36).substring(2, 6);
    return `gen_${dateStr}_${timeStr}_${random}`;
  }

  /**
   * ログディレクトリを作成
   */
  private ensureLogDirectory(): void {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  /**
   * セッションをファイルに保存
   */
  private saveSession(): void {
    if (!this.currentSession) return;

    const safeTitle = (this.currentSession.conceptTitle || 'unnamed')
      .replace(/[^a-zA-Z0-9\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/g, '_')
      .substring(0, 30);

    const filename = `${this.currentSession.sessionId}_${safeTitle}.json`;
    const filepath = path.join(this.logDir, filename);

    try {
      fs.writeFileSync(filepath, JSON.stringify(this.currentSession, null, 2), 'utf-8');
    } catch (error) {
      console.error('Failed to save generation log:', (error as Error).message);
    }
  }

  /**
   * 過去のログを読み込み
   */
  loadSession(sessionId: string): GenerationSession | null {
    try {
      const files = fs.readdirSync(this.logDir);
      const file = files.find(f => f.startsWith(sessionId));
      if (!file) return null;

      const filepath = path.join(this.logDir, file);
      const content = fs.readFileSync(filepath, 'utf-8');
      return JSON.parse(content) as GenerationSession;
    } catch {
      return null;
    }
  }

  /**
   * 最近のセッション一覧を取得
   */
  getRecentSessions(limit = 10): string[] {
    try {
      const files = fs.readdirSync(this.logDir)
        .filter(f => f.endsWith('.json'))
        .sort()
        .reverse()
        .slice(0, limit);
      return files.map(f => f.replace('.json', ''));
    } catch {
      return [];
    }
  }

  /**
   * 現在のセッションを取得
   */
  getCurrentSession(): GenerationSession | null {
    return this.currentSession;
  }
}

export default GenerationLogger;
