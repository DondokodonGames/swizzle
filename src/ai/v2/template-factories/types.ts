/**
 * テンプレートファクトリー共通型定義
 */

// ファクトリーが生成するスクリプト出力
export interface FactoryScript {
  layout: {
    objects: Array<{
      objectId: string;
      position: { x: number; y: number };
      scale: { x: number; y: number };
    }>;
  };
  counters: Array<{
    id: string;
    name: string;
    initialValue: number;
  }>;
  rules: Array<{
    id: string;
    name: string;
    targetObjectId: string;
    priority: number;
    triggers: {
      operator: 'AND' | 'OR';
      conditions: unknown[];
    };
    actions: unknown[];
  }>;
}

// アセット計画
export interface FactoryAssetPlan {
  objects: Array<{
    id: string;
    name: string;
    purpose: string;
    visualDescription: string;
    initialPosition: { x: number; y: number };
    size: 'small' | 'medium' | 'large';
  }>;
  background: {
    description: string;
    mood: string;
  };
  sounds: Array<{
    id: string;
    trigger: string;
    type: 'tap' | 'success' | 'failure' | 'collect' | 'pop' | 'whoosh' | 'bounce' | 'ding' | 'buzz' | 'splash';
  }>;
}

// ファクトリー出力
export interface FactoryOutput {
  mechanic: string;
  script: FactoryScript;
  assetPlan: FactoryAssetPlan;
  gameDuration: number;
}

// ---- 各ファクトリーのパラメータ型 ----

export interface CounterTapParams {
  targetCount: number;
  duration: number;
  targetObjectDescription: string;
  backgroundDescription: string;
  successMessage: string;
  failureMessage: string;
}

export interface TimingWindowParams {
  requiredHits: number;
  duration: number;
  allowedMisses: number;
  movingSpeed: number;
  targetObjectDescription: string;
  backgroundDescription: string;
  successMessage: string;
  failureMessage: string;
}

export interface MultiChoiceParams {
  choiceCount: number;
  duration: number;
  questionDescription: string;
  correctDescription: string;
  wrongDescription: string;
  backgroundDescription: string;
  successMessage: string;
  failureMessage: string;
}

export interface DragDropParams {
  itemCount: number;
  duration: number;
  dragObjectDescription: string;
  targetZoneDescription: string;
  backgroundDescription: string;
  successMessage: string;
  failureMessage: string;
}

export interface ScrollDodgeParams {
  mode: 'dodge' | 'collect';
  duration: number;
  targetCount: number;
  playerDescription: string;
  obstacleDescription: string;
  backgroundDescription: string;
  successMessage: string;
  failureMessage: string;
}

export interface ProjectileParams {
  requiredHits: number;
  duration: number;
  projectileDescription: string;
  targetDescription: string;
  backgroundDescription: string;
  successMessage: string;
  failureMessage: string;
}

export interface HoldParams {
  holdDuration: number;
  duration: number;
  holdObjectDescription: string;
  backgroundDescription: string;
  successMessage: string;
  failureMessage: string;
}
