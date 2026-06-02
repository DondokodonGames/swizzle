# ショートゲームプラットフォーム エディター機能仕様書

**Phase 6: エディター機能実装**  
**対象期間**: 21日間（Week 6-8）  
**最終更新**: 2025年9月1日  

---

## 📋 エディター機能概要

### 核心コンセプト
「小学生でも使える簡単ゲーム作成」+ 「TikTok世代向けUX」

### 機能フロー
```
ゲーム中の作成ボタン
    ↓
ゲーム作成画面（新規/編集選択）
    ↓
4タブ切り替え式エディター
├── 絵管理画面
├── 音管理画面  
├── スクリプト画面
└── 設定・公開画面
```

---

## 🏗️ システムアーキテクチャ

### メインコンポーネント構造
```
src/components/editor/
├── GameEditor.tsx              # メインエディター画面
├── ProjectSelector.tsx         # 新規/編集プロジェクト選択
├── tabs/
│   ├── AssetsTab.tsx          # 絵管理画面
│   ├── AudioTab.tsx           # 音管理画面
│   ├── ScriptTab.tsx          # スクリプト画面
│   └── SettingsTab.tsx        # 設定・公開画面
├── modals/
│   ├── AnimationEditor.tsx    # アニメーション編集モーダル
│   ├── ObjectEditor.tsx       # オブジェクト編集モーダル
│   └── RuleEditor.tsx         # ルール編集モーダル
├── preview/
│   └── GamePreview.tsx        # リアルタイムプレビュー
└── common/
    ├── FileUploader.tsx       # ファイルアップロード共通
    ├── AssetThumbnail.tsx     # アセットサムネイル表示
    └── CapacityMeter.tsx      # 容量メーター表示
```

### データ管理構造
```
src/types/editor/
├── GameProject.ts             # プロジェクト全体型定義
├── ProjectAssets.ts           # アセット管理型定義
├── GameScript.ts              # スクリプト・ロジック型定義
└── EditorConstants.ts         # 制限値・定数定義

src/hooks/editor/
├── useGameProject.ts          # プロジェクト管理Hook
├── useAssetManager.ts         # アセット管理Hook
├── useScriptEditor.ts         # スクリプト編集Hook
└── useCapacityManager.ts      # 容量管理Hook

src/services/editor/
├── ProjectStorage.ts          # プロジェクト保存・読み込み
├── AssetProcessor.ts          # アセット最適化・検証
├── ScriptCompiler.ts          # スクリプト→実行可能形式変換
└── GameExporter.ts            # 完成ゲーム出力
```

---

## 💾 データ構造仕様

### GameProject（プロジェクト全体）
```typescript
interface GameProject {
  // 基本情報
  id: string;
  name: string;
  createdAt: string;
  lastModified: string;
  version: string; // エディターバージョン管理
  
  // アセット管理
  assets: ProjectAssets;
  
  // スクリプト・ロジック
  script: GameScript;
  
  // ゲーム設定
  settings: GameSettings;
  
  // ステータス・メタデータ
  status: 'draft' | 'testing' | 'published';
  totalSize: number; // 現在の総容量（bytes）
  thumbnailDataUrl?: string; // プロジェクトサムネイル
  
  // エディター固有情報
  editorState?: {
    activeTab: 'assets' | 'audio' | 'script' | 'settings';
    lastSaved: string;
    autoSaveEnabled: boolean;
  };
}
```

### ProjectAssets（アセット管理）
```typescript
interface ProjectAssets {
  // 背景（1枚、最大4フレームアニメーション）
  background: BackgroundAsset | null;
  
  // オブジェクト（最大15個、各8フレームアニメーション）
  objects: ObjectAsset[]; // 最大15個
  
  // テキスト（最大5個、8文字以内）
  texts: TextAsset[]; // 最大5個
  
  // 音声アセット
  audio: {
    bgm: AudioAsset | null;
    se: AudioAsset[]; // 最大15個
  };
  
  // アセット統計
  statistics: {
    totalImageSize: number;
    totalAudioSize: number;
    usedSlots: {
      objects: number;
      texts: number;
      sounds: number;
    };
  };
}

interface BackgroundAsset {
  id: string;
  name: string;
  frames: AssetFrame[]; // 最大4枚
  animationSettings: {
    speed: number; // fps
    loop: boolean;
    pingPong: boolean; // 往復再生
  };
  totalSize: number;
  createdAt: string;
}

interface ObjectAsset {
  id: string;
  name: string; // ユーザー設定名（デフォルト: "オブジェクト1"等）
  frames: AssetFrame[]; // 最大8枚
  animationSettings: {
    speed: number;
    loop: boolean;
    pingPong: boolean;
  };
  totalSize: number;
  createdAt: string;
  
  // オブジェクト固有設定
  collisionBox?: {
    x: number; y: number;
    width: number; height: number;
  };
}

interface TextAsset {
  id: string;
  content: string; // 8文字制限
  style: {
    fontSize: number;
    color: string; // hex color
    fontWeight: 'normal' | 'bold';
    fontFamily?: string;
    outline?: {
      color: string;
      thickness: number;
    };
    shadow?: {
      color: string;
      offsetX: number;
      offsetY: number;
      blur: number;
    };
  };
  createdAt: string;
}

interface AssetFrame {
  id: string;
  dataUrl: string; // base64画像データ
  originalName: string; // アップロード時のファイル名
  width: number;
  height: number;
  fileSize: number;
  uploadedAt: string;
}

interface AudioAsset {
  id: string;
  name: string; // ユーザー設定名
  dataUrl: string; // base64音声データ
  originalName: string;
  duration: number; // 秒
  fileSize: number;
  format: string; // 'mp3', 'wav', 'ogg'
  uploadedAt: string;
  
  // 音声固有設定
  volume: number; // 0.0-1.0
  loop: boolean; // SEの場合のループ設定
}
```

### GameScript（スクリプト・ロジック）
```typescript
interface GameScript {
  // 初期レイアウト設定
  layout: GameLayout;
  
  // ゲームフラグ（カスタム変数）
  flags: Array<{
    id: string;
    name: string;
    initialValue: boolean;
    description?: string;
  }>;
  
  // 条件・アクション設定
  rules: GameRule[];
  
  // 成功条件設定
  successConditions: SuccessCondition[];
  
  // スクリプト統計
  statistics: {
    totalRules: number;
    totalConditions: number;
    totalActions: number;
    complexityScore: number; // 0-100の複雑度スコア
  };
}

interface GameLayout {
  // 背景設定
  background: {
    visible: boolean;
    initialAnimation: number; // どのフレームから開始（0-3）
    animationSpeed: number; // fps
    autoStart: boolean;
  };
  
  // オブジェクト配置
  objects: Array<{
    objectId: string; // ProjectAssets.objectsのid
    position: { x: number; y: number }; // ステージ座標（0-1正規化）
    scale: { x: number; y: number }; // スケール倍率
    rotation: number; // 角度（degree）
    zIndex: number; // 描画順序
    
    initialState: {
      visible: boolean;
      animation: number; // 初期アニメーション（0-7）
      animationSpeed: number;
      autoStart: boolean;
    };
  }>;
  
  // テキスト配置
  texts: Array<{
    textId: string;
    position: { x: number; y: number };
    scale: number;
    rotation: number;
    zIndex: number;
    visible: boolean;
  }>;
  
  // ステージ設定
  stage: {
    backgroundColor: string;
    backgroundImage?: string; // 背景以外の装飾画像
  };
}

interface GameRule {
  id: string;
  name: string; // ユーザー設定名
  enabled: boolean; // ON/OFF切り替え
  priority: number; // 実行優先度
  
  // 対象オブジェクト
  targetObjectId: string; // 'stage'の場合は全体対象
  
  // 発動条件（AND/OR組み合わせ）
  triggers: {
    operator: 'AND' | 'OR';
    conditions: TriggerCondition[];
  };
  
  // 実行アクション
  actions: GameAction[];
  
  // 実行回数制限
  executionLimit?: {
    maxCount: number; // 最大実行回数
    resetOnRestart: boolean; // ゲーム再開時にリセットするか
  };
  
  // 作成日時
  createdAt: string;
}

// 発動条件の詳細定義
type TriggerCondition = 
  // タッチ条件
  | {
      type: 'touch';
      target: 'self' | 'stage' | string; // オブジェクトID
      touchType: 'down' | 'up' | 'hold'; // タッチの種類
      holdDuration?: number; // ホールド時間（秒）
    }
  
  // 衝突条件
  | {
      type: 'collision';
      target: 'background' | 'stage' | string; // オブジェクトID
      collisionType: 'enter' | 'stay' | 'exit'; // 衝突の種類
      checkMode: 'hitbox' | 'pixel'; // 判定方式
    }
  
  // アニメーション条件
  | {
      type: 'animation';
      target: string; // オブジェクトID
      condition: 'frame' | 'end' | 'start' | 'loop';
      frameNumber?: number; // 特定フレーム番号
      animationIndex?: number; // 対象アニメーション
    }
  
  // 時間条件
  | {
      type: 'time';
      timeType: 'exact' | 'range' | 'interval';
      seconds?: number; // 正確な秒数
      range?: { min: number; max: number }; // 時間範囲
      interval?: number; // 間隔（繰り返し）
    }
  
  // フラグ条件
  | {
      type: 'flag';
      flagId: string;
      condition: 'ON' | 'OFF' | 'CHANGED' | 'ON_TO_OFF' | 'OFF_TO_ON';
    }
  
  // ゲーム状態条件
  | {
      type: 'gameState';
      state: 'success' | 'failure' | 'playing' | 'paused';
      checkType: 'is' | 'not' | 'became'; // 状態チェック方式
    }
  
  // 位置条件
  | {
      type: 'position';
      target: string; // オブジェクトID
      area: 'inside' | 'outside' | 'crossing';
      region: {
        shape: 'rect' | 'circle';
        x: number; y: number;
        width?: number; height?: number; // 矩形の場合
        radius?: number; // 円の場合
      };
    };

// アクションの詳細定義
type GameAction =
  // ゲーム制御
  | { type: 'success'; score?: number; message?: string }
  | { type: 'failure'; message?: string }
  | { type: 'pause'; duration?: number }
  | { type: 'restart' }
  
  // 音響制御
  | { type: 'playSound'; soundId: string; volume?: number }
  | { type: 'stopSound'; soundId: string }
  | { type: 'playBGM'; volume?: number }
  | { type: 'stopBGM' }
  
  // フラグ制御
  | { type: 'setFlag'; flagId: string; value: boolean }
  | { type: 'toggleFlag'; flagId: string }
  
  // オブジェクト制御
  | { type: 'switchAnimation'; targetId: string; animationIndex: number; speed?: number }
  | { type: 'show'; targetId: string; fadeIn?: boolean }
  | { type: 'hide'; targetId: string; fadeOut?: boolean }
  
  // 移動制御
  | { type: 'move'; targetId: string; movement: MovementPattern }
  
  // エフェクト
  | { type: 'effect'; targetId: string; effect: EffectPattern }
  
  // スコア（注: showMessage は廃止・エンジン未実装）
  | { type: 'addScore'; points: number };

interface MovementPattern {
  type: 'straight' | 'teleport' | 'wander' | 'stop' | 'swap' | 'approach' | 'orbit' | 'bounce' | 'arc';
  
  // 移動パラメータ
  target?: { x: number; y: number } | string; // 座標またはオブジェクトID
  speed?: number; // 移動速度（px/sec）
  duration?: number; // 移動時間（秒）
  easing?: 'linear' | 'ease-in' | 'ease-out' | 'bounce'; // イージング
  
  // パターン固有設定
  wanderRadius?: number; // wander用の半径
  orbitRadius?: number; // orbit用の半径
  bounceStrength?: number; // bounce用の反発力
}

interface EffectPattern {
  type: 'flash' | 'shake' | 'scale' | 'rotate' | 'particles';
  duration: number;
  intensity: number; // 0.0-1.0
  
  // エフェクト固有設定
  color?: string; // flash用
  frequency?: number; // shake用
  scaleAmount?: number; // scale用
  rotationAmount?: number; // rotate用
  particleCount?: number; // particles用
}

interface SuccessCondition {
  id: string;
  name: string;
  operator: 'AND' | 'OR';
  conditions: Array<{
    type: 'flag' | 'score' | 'time' | 'objectState';
    flagId?: string; // flag用
    flagValue?: boolean;
    scoreValue?: number; // score用
    scoreComparison?: '>=' | '>' | '==' | '<' | '<=';
    timeValue?: number; // time用
    objectId?: string; // objectState用
    objectCondition?: 'visible' | 'hidden' | 'position' | 'animation';
  }>;
}
```

### GameSettings（ゲーム設定）
```typescript
interface GameSettings {
  // 基本設定
  name: string; // ゲーム名
  description?: string; // ゲーム説明（50文字以内）
  
  // ゲーム時間設定
  duration: {
    type: 'fixed' | 'unlimited'; // 固定時間 or 成功条件まで無制限
    seconds?: 5 | 10 | 15 | 20 | 30; // 固定時間の場合
    maxSeconds?: number; // 無制限の場合の最大時間（安全措置）
  };
  
  // 難易度設定
  difficulty: 'easy' | 'normal' | 'hard';
  
  // 公開設定
  publishing: {
    isPublished: boolean;
    publishedAt?: string;
    visibility: 'public' | 'unlisted' | 'private';
    allowComments: boolean;
    allowRemix: boolean; // 他ユーザーによる改変を許可
  };
  
  // プレビュー設定
  preview: {
    thumbnailDataUrl?: string; // ゲームサムネイル
    previewGif?: string; // プレビューGIFアニメーション
  };
  
  // エクスポート設定
  export: {
    includeSourceData: boolean; // ソースデータを含めるか
    compressionLevel: 'low' | 'medium' | 'high'; // 圧縮レベル
  };
}
```

---

## 🎨 画面仕様詳細

### 1. 絵管理画面（AssetsTab）

#### レイアウト構成
```
┌─────────────────────────────────────┐
│ 容量メーター [使用量/制限] [最適化]   │
├─────────────────────────────────────┤
│ 背景 [サムネイル] [編集] [削除]      │
├─────────────────────────────────────┤
│ オブジェクト (1/15)                 │
│ [サムネイル1][サムネイル2][NEW]...   │
│ [サムネイル4][サムネイル5][NEW]...   │
│ [編集][削除] 選択時ボタン            │
├─────────────────────────────────────┤
│ テキスト (1/5)                      │
│ [テキスト1][テキスト2][NEW]...       │
│ [編集][削除] 選択時ボタン            │
└─────────────────────────────────────┘
```

#### 機能詳細
- **背景管理**: 1枚固定、最大4フレームアニメーション
- **オブジェクト管理**: 15個まで、各8フレームアニメーション
- **テキスト管理**: 5個まで、8文字制限、スタイル設定
- **サムネイル管理**: タッチで編集モーダル表示
- **容量監視**: リアルタイム容量表示・警告

### 2. 音管理画面（AudioTab）

#### レイアウト構成
```
┌─────────────────────────────────────┐
│ 容量メーター [音声使用量/制限]       │
├─────────────────────────────────────┤
│ BGM                                │
│ [音声ファイル名][▶再生][編集][削除]  │
│ または [アップロード]               │
├─────────────────────────────────────┤
│ SE (1/15)                         │
│ [SE1名前][▶][編集][削除]            │
│ [SE2名前][▶][編集][削除]            │
│ [NEW][NEW][NEW]...                │
└─────────────────────────────────────┘
```

#### 機能詳細
- **BGM管理**: 1個まで、5MB制限、30秒以内
- **SE管理**: 15個まで、各1MB制限、5秒以内推奨
- **再生テスト**: アップロード後即座に再生確認
- **名前管理**: ユーザーが分かりやすい名前を設定
- **フォーマット対応**: MP3, WAV, OGG

### 3. スクリプト画面（ScriptTab）

#### レイアウト構成
```
┌─────────────────────────────────────┐
│ [レイアウトモード][ルールモード]     │
├─────────────────────────────────────┤
│ ゲームプレビューエリア              │
│ （背景+オブジェクト配置）            │
│ ドラッグ&ドロップで配置変更         │
├─────────────────────────────────────┤
│ 選択オブジェクト: [オブジェクト1]    │
│ 初期状態: [アニメ0][速度1.0][表示]  │
├─────────────────────────────────────┤
│ ルール一覧:                        │
│ [ルール1: タップで移動] [編集][削除] │
│ [ルール2: 衝突で成功] [編集][削除]   │
│ [新規ルール追加]                   │
└─────────────────────────────────────┘
```

#### 機能詳細
- **レイアウトモード**: オブジェクト配置・初期状態設定
- **ルールモード**: 条件・アクション設定
- **ビジュアル編集**: ドラッグ&ドロップによる直感的配置
- **ルール管理**: 複数ルールの優先度管理
- **成功条件設定**: AND/OR組み合わせでの複合条件

### 4. 設定・公開画面（SettingsTab）

#### レイアウト構成
```
┌─────────────────────────────────────┐
│ ゲーム名: [_______________]         │
│ 説明: [_________________________] │
│ ゲーム時間: [5秒][10秒][無制限]     │
│ 難易度: [簡単][普通][難しい]        │
├─────────────────────────────────────┤
│ [テストプレイ] → 実際にゲーム実行    │
├─────────────────────────────────────┤
│ 公開設定:                          │
│ □ 公開する                        │
│ □ コメント許可                     │
│ □ リミックス許可                   │
├─────────────────────────────────────┤
│ [保存] [公開] [エクスポート]        │
└─────────────────────────────────────┘
```

#### 機能詳細
- **基本情報設定**: ゲーム名・説明文入力
- **時間設定**: 5秒/10秒/無制限選択
- **テストプレイ**: 実際のゲーム実行・デバッグ
- **公開機能**: プラットフォームへの投稿
- **エクスポート**: 独立ファイルとしての出力

---

## 💾 容量制限・最適化仕様

### 制限値定義
```typescript
export const EDITOR_LIMITS = {
  // 画像制限
  IMAGE: {
    BACKGROUND_FRAME_MAX_SIZE: 2 * 1024 * 1024,    // 2MB/フレーム
    BACKGROUND_TOTAL_MAX_SIZE: 8 * 1024 * 1024,    // 8MB（4フレーム合計）
    OBJECT_FRAME_MAX_SIZE: 1 * 1024 * 1024,        // 1MB/フレーム
    OBJECT_TOTAL_MAX_SIZE: 8 * 1024 * 1024,        // 8MB（8フレーム合計）
    
    MAX_WIDTH: 2048,
    MAX_HEIGHT: 2048,
    MIN_WIDTH: 32,
    MIN_HEIGHT: 32,
    
    SUPPORTED_FORMATS: ['image/jpeg', 'image/png', 'image/webp'],
    COMPRESSION_QUALITY: 0.8, // JPEG圧縮品質
    AUTO_RESIZE_THRESHOLD: 1920 // この解像度を超えたら自動リサイズ
  },
  
  // 音声制限
  AUDIO: {
    BGM_MAX_SIZE: 5 * 1024 * 1024,       // 5MB
    BGM_MAX_DURATION: 30,                // 30秒
    SE_MAX_SIZE: 1 * 1024 * 1024,        // 1MB/個
    SE_MAX_DURATION: 10,                 // 10秒
    
    SUPPORTED_FORMATS: ['audio/mp3', 'audio/wav', 'audio/ogg'],
    DEFAULT_COMPRESSION: 128, // kbps
    SAMPLE_RATE: 44100 // Hz
  },
  
  // テキスト制限
  TEXT: {
    MAX_LENGTH: 8,           // 8文字
    MAX_COUNT: 5,            // 5個まで
    MIN_FONT_SIZE: 12,       // 最小フォントサイズ
    MAX_FONT_SIZE: 72        // 最大フォントサイズ
  },
  
  // プロジェクト全体制限
  PROJECT: {
    TOTAL_MAX_SIZE: 50 * 1024 * 1024,    // 50MB
    MAX_OBJECTS: 15,                     // オブジェクト最大数
    MAX_SE_COUNT: 15,                    // SE最大数
    MAX_RULES: 50,                       // ルール最大数
    MAX_FLAGS: 20,                       // フラグ最大数
    
    AUTO_SAVE_INTERVAL: 30000,           // 30秒間隔で自動保存
    VERSION_HISTORY_COUNT: 10            // バージョン履歴保持数
  },
  
  // パフォーマンス制限
  PERFORMANCE: {
    MAX_ANIMATION_FPS: 30,               // アニメーション最大FPS
    MAX_PARTICLES: 100,                  // パーティクル最大数
    MAX_CONCURRENT_SOUNDS: 8,            // 同時再生音数
    SCRIPT_EXECUTION_TIMEOUT: 5000       // スクリプト実行タイムアウト(ms)
  }
} as const;
```

### 自動最適化機能
```typescript
interface OptimizationSettings {
  // 画像最適化
  imageOptimization: {
    autoResize: boolean;           // 自動リサイズ
    autoCompress: boolean;         // 自動圧縮
    convertToWebP: boolean;        // WebP変換
    removeMetadata: boolean;       // メタデータ削除
  };
  
  // 音声最適化
  audioOptimization: {
    autoCompress: boolean;         // 自動圧縮
    convertToMP3: boolean;         // MP3変換
    normalizeVolume: boolean;      // 音量正規化
    trimSilence: boolean;          // 無音部分削除
  };
  
  // プロジェクト最適化
  projectOptimization: {
    removeUnusedAssets: boolean;   // 未使用アセット削除
    compressProject: boolean;      // プロジェクト圧縮
    optimizeScripts: boolean;      // スクリプト最適化
  };
}
```

---

## 🔄 開発フェーズ詳細計画

### Phase 6.1: データ構造・基盤実装（Day 1-3）

#### Day 1: 型定義・インターフェース
- [ ] `src/types/editor/` 全型定義実装
- [ ] `src/constants/EditorLimits.ts` 制限値定義
- [ ] 基本バリデーション関数実装

#### Day 2: メインエディター画面
- [ ] `GameEditor.tsx` メイン画面実装
- [ ] `ProjectSelector.tsx` プロジェクト選択
- [ ] タブ切り替え基本UI実装

#### Day 3: プロジェクト管理システム
- [ ] `useGameProject.ts` Hook実装
- [ ] `ProjectStorage.ts` 保存・読み込み
- [ ] 新規作成・編集・削除機能

### Phase 6.2: アセット管理実装（Day 4-10）

#### Day 4-5: 絵管理画面（基本）
- [ ] `AssetsTab.tsx` 基本レイアウト
- [ ] `FileUploader.tsx` 共通アップロード
- [ ] `AssetThumbnail.tsx` サムネイル表示
- [ ] 容量監視・制限チェック

#### Day 6-7: アニメーション管理
- [ ] `AnimationEditor.tsx` モーダル実装
- [ ] パラパラ漫画プレビュー機能
- [ ] フレーム順序変更・削除機能
- [ ] アニメーション設定（速度・ループ等）

#### Day 8-9: 音管理画面
- [ ] `AudioTab.tsx` 基本レイアウト
- [ ] 音声ファイルアップロード・管理
- [ ] 再生テスト機能
- [ ] BGM・SE分類管理

#### Day 10: テキスト管理・統合テスト
- [ ] テキスト編集機能実装
- [ ] スタイル設定（フォント・色・アウトライン等）
- [ ] アセット管理統合テスト
- [ ] 容量制限・最適化テスト

### Phase 6.3: スクリプト機能実装（Day 11-17）

#### Day 11-12: レイアウトモード
- [ ] `ScriptTab.tsx` 基本レイアウト
- [ ] ドラッグ&ドロップによる配置システム
- [ ] オブジェクト初期状態設定
- [ ] ビジュアルプレビュー機能

#### Day 13-14: ルールエディター（基本）
- [ ] `RuleEditor.tsx` モーダル実装
- [ ] 基本条件設定（タッチ・時間・衝突）
- [ ] 基本アクション設定（移動・音再生・成功失敗）
- [ ] ルール一覧管理

#### Day 15-16: ルールエディター（高度）
- [ ] 複合条件（AND/OR）システム
- [ ] 高度アクション（アニメーション切り替え・エフェクト）
- [ ] フラグ管理システム
- [ ] ルール優先度・実行制限

#### Day 17: 成功条件・スクリプト統合
- [ ] 成功条件エディター
- [ ] スクリプト全体の整合性チェック
- [ ] スクリプト→実行形式変換
- [ ] デバッグ・エラー表示機能

### Phase 6.4: 設定・公開機能（Day 18-21）

#### Day 18-19: 設定画面・テストプレイ
- [ ] `SettingsTab.tsx` 基本設定UI
- [ ] ゲーム情報入力（名前・説明・時間設定）
- [ ] テストプレイ機能実装
- [ ] ゲーム実行→エディター統合

#### Day 20: 公開・エクスポート機能
- [ ] 公開設定UI（可視性・権限等）
- [ ] Supabaseへの投稿機能
- [ ] エクスポート機能（独立ファイル生成）
- [ ] サムネイル自動生成

#### Day 21: 統合テスト・最終調整
- [ ] 全機能統合テスト
- [ ] パフォーマンス最適化
- [ ] エラーハンドリング強化
- [ ] ユーザビリティ改善

---

## 🎯 継続的開発・引き継ぎ指針

### プロジェクトファイル管理
```bash
# エディター仕様書の保存場所
docs/editor/
├── editor-specification.md           # 本仕様書
├── data-structures.md                # データ構造詳細
├── ui-wireframes/                    # UI設計図
├── implementation-progress.json       # 実装進捗管理
└── testing-checklist.md             # テストチェックリスト
```

### 実装進捗管理JSON
```json
{
  "editorDevelopment": {
    "currentPhase": "6.1",
    "startDate": "2025-09-01",
    "phases": {
      "6.1": {
        "name": "データ構造・基盤実装",
        "duration": 3,
        "progress": 0,
        "tasks": [
          {
            "day": 1,
            "task": "型定義・インターフェース",
            "status": "pending",
            "files": ["src/types/editor/GameProject.ts", "src/types/editor/ProjectAssets.ts"]
          }
        ]
      }
    }
  }
}
```

### 新チャット引き継ぎテンプレート
```
ショートゲームプラットフォーム エディター機能開発を継続します。

現在状況：
- Phase: 6.{現在のサブフェーズ}
- 実装対象: {現在のタスク}
- 完了済み: {完了済み機能}

リポジトリ：
- GitHub: https://github.com/DondokodonGames/swizzle
- Codespace: zany-yodel

仕様書参照：
プロジェクト内の docs/editor/editor-specification.md を参照して、
データ構造とUI仕様に従った実装をお願いします。

次の作業：
{具体的な次のタスク内容}
```

### 重要な実装原則

#### 1. 既存機能完全保護
- Phase 1-5の完成機能に影響を与えない
- EditableTemplateシステムとの互換性維持
- RandomGameManagerとの統合

#### 2. 段階的実装・テスト
- 各Day完了時に動作確認必須
- 小さな単位で確実に実装
- エラーハンドリング・フォールバック準備

#### 3. ユーザビリティ優先
- 「小学生でも使える」を基準
- 直感的操作・ビジュアルフィードバック重視
- エラー時の分かりやすい説明

#### 4. パフォーマンス考慮
- 50MB制限の厳格管理
- リアルタイムプレビューの軽量化
- メモリリーク防止

#### 5. 拡張性確保
- 新しいテンプレート追加容易
- 条件・アクション種類の追加容易
- 将来の3D対応考慮

---

## 🔧 技術実装ガイドライン

### Hook設計パターン
```typescript
// useGameProject.ts の基本構造例
export const useGameProject = () => {
  const [currentProject, setCurrentProject] = useState<GameProject | null>(null);
  const [projects, setProjects] = useState<GameProject[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 基本CRUD操作
  const createProject = useCallback(async (name: string) => {
    // 新規プロジェクト作成
  }, []);

  const loadProject = useCallback(async (id: string) => {
    // プロジェクト読み込み
  }, []);

  const saveProject = useCallback(async (project: GameProject) => {
    // プロジェクト保存（自動保存対応）
  }, []);

  const deleteProject = useCallback(async (id: string) => {
    // プロジェクト削除
  }, []);

  // 自動保存機能
  useEffect(() => {
    if (currentProject && currentProject.editorState?.autoSaveEnabled) {
      const interval = setInterval(() => {
        saveProject(currentProject);
      }, EDITOR_LIMITS.PROJECT.AUTO_SAVE_INTERVAL);
      
      return () => clearInterval(interval);
    }
  }, [currentProject, saveProject]);

  return {
    currentProject,
    projects,
    loading,
    error,
    createProject,
    loadProject,
    saveProject,
    deleteProject
  };
};
```

### コンポーネント設計パターン
```typescript
// AssetsTab.tsx の基本構造例
interface AssetsTabProps {
  project: GameProject;
  onProjectUpdate: (project: GameProject) => void;
}

export const AssetsTab: React.FC<AssetsTabProps> = ({ project, onProjectUpdate }) => {
  const [selectedAssetType, setSelectedAssetType] = useState<'background' | 'objects' | 'texts'>('background');
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [showAnimationEditor, setShowAnimationEditor] = useState(false);

  // 容量管理
  const { totalSize, limits, warnings } = useCapacityManager(project.assets);

  // アセット操作
  const handleAssetUpload = useCallback((files: FileList) => {
    // アップロード処理
  }, [project, onProjectUpdate]);

  const handleAssetEdit = useCallback((assetId: string) => {
    setSelectedAssetId(assetId);
    setShowAnimationEditor(true);
  }, []);

  const handleAssetDelete = useCallback((assetId: string) => {
    // 削除処理
  }, [project, onProjectUpdate]);

  return (
    <div className="assets-tab">
      {/* 容量メーター */}
      <CapacityMeter 
        current={totalSize} 
        limit={limits.total} 
        warnings={warnings}
      />
      
      {/* アセットタイプ選択 */}
      <div className="asset-type-tabs">
        {/* タブUI */}
      </div>
      
      {/* アセット一覧 */}
      <div className="asset-grid">
        {/* サムネイル表示 */}
      </div>
      
      {/* アニメーションエディターモーダル */}
      {showAnimationEditor && (
        <AnimationEditor
          assetId={selectedAssetId}
          onClose={() => setShowAnimationEditor(false)}
          onSave={handleAssetUpdate}
        />
      )}
    </div>
  );
};
```

### ストレージ管理パターン
```typescript
// ProjectStorage.ts の基本構造例
export class ProjectStorage {
  private static readonly STORAGE_KEY = 'editor_projects';
  
  // IndexedDB使用（大容量対応）
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    // IndexedDB初期化
  }

  async saveProject(project: GameProject): Promise<void> {
    // プロジェクト保存（圧縮・暗号化）
  }

  async loadProject(id: string): Promise<GameProject> {
    // プロジェクト読み込み
  }

  async listProjects(): Promise<GameProject[]> {
    // プロジェクト一覧取得
  }

  async deleteProject(id: string): Promise<void> {
    // プロジェクト削除
  }

  // 容量管理
  async getStorageUsage(): Promise<{ used: number; available: number }> {
    // ストレージ使用量確認
  }

  // エクスポート・インポート
  async exportProject(id: string): Promise<Blob> {
    // プロジェクト出力（ZIP形式）
  }

  async importProject(file: File): Promise<GameProject> {
    // プロジェクト取り込み
  }
}
```

---

## 📊 品質保証・テスト戦略

### 単体テスト要件
```typescript
// 各機能の必須テストケース
describe('GameProject Management', () => {
  test('新規プロジェクト作成', () => {
    // デフォルト値設定確認
    // ID生成確認
    // 初期状態確認
  });

  test('アセット容量制限', () => {
    // 各種制限値確認
    // 超過時のエラー処理
    // 自動最適化動作
  });

  test('スクリプト実行', () => {
    // 条件判定ロジック
    // アクション実行順序
    // 成功条件評価
  });
});
```

### 統合テスト要件
- エディター→ゲーム実行の完全フロー
- 既存RandomGameManagerとの統合
- 大容量プロジェクトでのパフォーマンス
- オフライン動作（PWA対応）

### ユーザビリティテスト要件
- 小学生レベルでの操作テスト
- タッチデバイスでの操作性
- エラー時の分かりやすさ
- チュートリアル・ヘルプの有効性

---

## 🔄 継続開発・メンテナンス

### バージョン管理戦略
- **メジャー版**: データ構造変更・大機能追加
- **マイナー版**: 新機能追加・UI改善
- **パッチ版**: バグ修正・性能改善

### 後方互換性保証
- 古いプロジェクトファイルの自動変換
- エディターバージョン情報の記録
- 段階的な機能非推奨・削除

### 拡張計画
- **Phase 7**: AIアシスト機能（自動ゲーム生成）
- **Phase 8**: コミュニティ機能（共有・リミックス）
- **Phase 9**: 3D対応・高度エディター
- **Phase 10**: VR/AR対応・没入型エディター

---

## 📝 実装開始時の確認事項

### 開発環境確認
- [ ] GitHub Codespace (zany-yodel) アクセス確認
- [ ] npm run dev でサーバー起動確認
- [ ] 既存機能（Phase 1-5）の動作確認
- [ ] EditableTemplateシステム動作確認

### 仕様理解確認
- [ ] 4つのタブ構成理解
- [ ] データ構造全体理解
- [ ] 容量制限・最適化要件理解
- [ ] スクリプトシステム（条件・アクション）理解

### 実装準備
- [ ] 型定義ファイル作成準備
- [ ] コンポーネント設計確認
- [ ] 既存システムとの統合ポイント確認
- [ ] テスト戦略・品質基準確認

---

**このエディター仕様書により、Phase 6の21日間開発と、その後の継続開発において一貫した実装が可能になります。新しいチャットでもこの仕様書を参照して、品質の高いエディター機能を実現してください。**