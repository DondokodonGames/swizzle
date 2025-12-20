/**
 * Step 1: GameConceptGenerator
 *
 * 4つの評価基準を前提条件として、自由な発想でゲームを考える
 */

import Anthropic from '@anthropic-ai/sdk';
import { GameConcept } from './types';

const CONCEPT_PROMPT = `あなたはスマホ向け10秒ミニゲームのゲームデザイナーです。

# 絶対に守る前提条件

以下の4つを満たさないゲームは存在価値がありません。
これらを満たした上で、自由に創造してください。

1. **目標明確性**
   プレイヤーが画面を見た瞬間に「何をすべきか」がわかる
   - ✅ 「赤いものを全部タップして消す」
   - ❌ 「画面をなんとなく触る」

2. **操作明確性**
   プレイヤーが「どう操作すればいいか」がわかる
   - ✅ 「落ちてくるリンゴの下にキャラを移動してキャッチ」
   - ❌ 「うまくやる」

3. **判定明確性**
   成功と失敗の基準が数値で明確
   - ✅ 「5個キャッチで成功、3個落としたら失敗」
   - ❌ 「なんとなく終わる」「時間切れで終了」

4. **納得感**
   結果に対してプレイヤーが納得できる
   - ✅ 自分の操作ミスで失敗 → 納得
   - ❌ 運だけで決まる、理不尽な判定 → 不満

# ゲーム基本制約
- 制限時間: 5〜15秒
- 画面: スマホ縦画面
- 操作: タッチのみ（タップ、スワイプ、ドラッグ、長押し）

# テーマ例（この中からランダムに1つ選ぶか、全く新しいテーマを考えてもOK）

【宇宙・天体】星座、流星群、ブラックホール、彗星、月面、火星探査、土星の輪、銀河、超新星爆発、宇宙ステーション、人工衛星、ロケット発射、宇宙遊泳、太陽フレア、オーロラ、惑星直列、小惑星帯、宇宙塵、暗黒物質、重力波

【深海・海洋】深海魚、クラゲ、タコ、イカ、サンゴ礁、海底火山、熱水噴出孔、マリアナ海溝、沈没船、海藻、プランクトン、イルカ、クジラ、サメ、ウミガメ、貝殻、真珠、潮の満ち引き、海流、氷山

【昆虫・小動物】蝶、蜂、蟻、カブトムシ、クワガタ、蛍、トンボ、バッタ、カマキリ、テントウムシ、蜘蛛、カタツムリ、ミミズ、ダンゴムシ、セミ、コオロギ、蚊、蛾、ゴキブリ、ハエ

【鳥類】ペンギン、フクロウ、ワシ、タカ、ハチドリ、カラス、スズメ、ツバメ、フラミンゴ、クジャク、オウム、インコ、カモメ、白鳥、鶴、キツツキ、ペリカン、ダチョウ、キウイ、コンドル

【哺乳類】猫、犬、うさぎ、ハムスター、リス、狐、狼、熊、パンダ、コアラ、カンガルー、象、キリン、ライオン、虎、豹、チーター、ゴリラ、チンパンジー、オランウータン

【爬虫類・両生類】カメレオン、ヤモリ、イグアナ、ワニ、カエル、イモリ、サンショウウオ、ヘビ、トカゲ、亀、コモドドラゴン、アホロートル、ウーパールーパー

【植物・花】桜、向日葵、薔薇、チューリップ、蓮、竹、盆栽、サボテン、多肉植物、食虫植物、苔、シダ、ツタ、キノコ、タンポポ、クローバー、紅葉、イチョウ、松、杉

【天気・気象】雷、竜巻、台風、ハリケーン、吹雪、霧、虹、にわか雨、ひょう、霜、露、雲、積乱雲、朝焼け、夕焼け、蜃気楼、かげろう、つむじ風、砂嵐、酸性雨

【四季・時間】春分、夏至、秋分、冬至、花見、紅葉狩り、雪景色、真夏、夜明け、黄昏、深夜、真昼、月夜、星空、満月、新月、日食、月食

【音楽・楽器】ピアノ、バイオリン、ギター、ドラム、トランペット、フルート、ハープ、オルゴール、太鼓、三味線、琴、尺八、オーケストラ、ロックバンド、DJ、シンセサイザー、リズム、メロディー、ハーモニー

【数学・図形】円、三角形、四角形、球体、立方体、フラクタル、螺旋、対称、黄金比、素数、無限、パラドックス、確率、統計、グラフ、座標、ベクトル、行列

【物理・科学】磁石、電気、原子、分子、DNA、細胞、結晶、プリズム、レンズ、鏡、振り子、てこ、滑車、浮力、慣性、摩擦、熱伝導、化学反応、核融合

【忍者・武士】手裏剣、忍術、煙玉、変わり身、隠れ身、刀、弓矢、城、甲冑、兜、旗、馬、武道、剣術、槍、薙刀、鎧、巻物

【妖怪・伝説】河童、天狗、鬼、狐の嫁入り、座敷童、一反木綿、ぬりかべ、猫又、化け狸、雪女、ろくろ首、唐傘お化け、提灯お化け、のっぺらぼう、小豆洗い

【ファンタジー】ドラゴン、ユニコーン、フェニックス、グリフィン、ペガサス、ゴーレム、エルフ、ドワーフ、オーク、魔法使い、魔女、妖精、人魚、ケンタウロス、スライム、ゴブリン

【ロボット・機械】アンドロイド、サイボーグ、ドローン、AI、歯車、ネジ、バネ、ピストン、タービン、発電機、時計仕掛け、蒸気機関、工場、組み立てライン、3Dプリンター

【乗り物】飛行機、ヘリコプター、気球、飛行船、ロケット、潜水艦、船、ヨット、電車、蒸気機関車、自転車、オートバイ、スケートボード、ホバーボード、タイムマシン

【スポーツ】サッカー、野球、バスケ、テニス、卓球、バドミントン、バレーボール、ゴルフ、ボウリング、ダーツ、アーチェリー、フェンシング、ボクシング、柔道、空手、相撲、水泳、スキー、スノボ

【職業】消防士、警察官、医者、看護師、先生、パイロット、宇宙飛行士、科学者、探偵、考古学者、写真家、画家、彫刻家、建築家、プログラマー、魔法使い

【建築・建造物】城、寺院、神社、教会、ピラミッド、塔、橋、ダム、灯台、風車、水車、井戸、迷路、地下室、秘密基地、ツリーハウス

【道具・日用品】はさみ、鍵、錠前、鏡、時計、コンパス、虫眼鏡、望遠鏡、顕微鏡、電球、蝋燭、マッチ、傘、扇子、風鈴、万華鏡

【食器・調理器具】お皿、お椀、箸、フォーク、スプーン、ナイフ、鍋、フライパン、包丁、まな板、泡立て器、おたま、しゃもじ

【文房具】鉛筆、消しゴム、定規、コンパス、ノート、ハサミ、のり、テープ、クリップ、ホチキス、シャープペン、万年筆、筆、墨、硯

【玩具・ゲーム】積み木、ブロック、パズル、ルービックキューブ、けん玉、コマ、ヨーヨー、風船、シャボン玉、折り紙、紙飛行機、凧、ビー玉、おはじき、トランプ

【宝石・鉱物】ダイヤモンド、ルビー、サファイア、エメラルド、アメジスト、トパーズ、オパール、真珠、琥珀、翡翠、水晶、金、銀、銅、鉄、溶岩

【感情・概念】喜び、悲しみ、怒り、恐怖、驚き、好奇心、勇気、希望、夢、記憶、時間、空間、重力、光、影、音、静寂、カオス、秩序、バランス

【色・光】虹色、プリズム、グラデーション、モノクロ、セピア、ネオン、蛍光、発光、反射、屈折、透明、半透明、影絵、シルエット

【質感・素材】ふわふわ、もちもち、ツルツル、ザラザラ、ベタベタ、サラサラ、カチカチ、プニプニ、弾力、柔軟、硬質、液体、気体、固体、ゼリー、スライム

【抽象・パターン】渦巻き、波紋、縞模様、水玉、チェック、迷彩、幾何学模様、万華鏡、モザイク、ピクセル、ノイズ、グリッチ、歪み

【場所・風景】砂漠、ジャングル、草原、山岳、洞窟、火山、滝、川、湖、沼、氷河、オアシス、島、断崖、峡谷、渓谷、遺跡、廃墟

【異世界・SF】パラレルワールド、タイムトラベル、テレポート、バーチャル空間、電脳世界、マトリックス、ホログラム、クローン、突然変異、進化、退化

【祭り・イベント】花火大会、盆踊り、縁日、運動会、文化祭、クリスマス、ハロウィン、バレンタイン、誕生日、お正月、ひな祭り、七夕、お月見

【食べ物（参考用・避けるべき）】※これらは避けてください：寿司、ラーメン、うどん、そば、カレー、ピザ、ハンバーガー、ステーキ、ケーキ、アイス、フルーツ全般

# ビジュアルスタイル例
シンプル、派手、レトロ、モダン、ダーク、ネオン、水彩、8bit、ドット絵、アニメ調、リアル、デフォルメ、ミニマル、サイケデリック、グリッチアート、ボクセル、ペーパークラフト、ステンドグラス、影絵、切り絵

# 重要：多様性を保つ
上記のリストからランダムに選ぶか、リストにない独創的なテーマを考えてください。
寿司・料理・食べ物関連は絶対に避けてください。

# 出力（JSON形式）

{
  "title": "タイトル（日本語）",
  "titleEn": "English Title",
  "description": "一文でゲーム説明",
  "duration": 10,
  "theme": "テーマ（自由記述）",
  "visualStyle": "ビジュアルスタイル（自由記述）",
  "playerGoal": "プレイヤーの目標（具体的に、数値を含む）",
  "playerOperation": "具体的な操作方法（タップ/スワイプ/ドラッグ/長押しを明記）",
  "successCondition": "成功条件（必ず数値を含む）",
  "failureCondition": "失敗条件（必ず数値を含む、時間切れ以外も）",
  "selfEvaluation": {
    "goalClarity": 8,
    "operationClarity": 8,
    "judgmentClarity": 8,
    "acceptance": 8,
    "reasoning": "各項目について1文ずつ理由を記述"
  }
}

JSONのみを出力してください。`;

export interface ConceptGeneratorConfig {
  model?: string;
  minScore?: number;
  dryRun?: boolean;
  apiKey?: string;
}

export class GameConceptGenerator {
  private client: Anthropic;
  private config: Required<Omit<ConceptGeneratorConfig, 'apiKey'>>;
  private usedThemes: Set<string> = new Set();

  constructor(config?: ConceptGeneratorConfig) {
    this.client = new Anthropic({
      apiKey: config?.apiKey || process.env.ANTHROPIC_API_KEY
    });
    this.config = {
      model: config?.model || 'claude-sonnet-4-20250514',
      minScore: config?.minScore || 7,
      dryRun: config?.dryRun || false
    };
  }

  /**
   * ゲームコンセプトを生成
   */
  async generate(feedback?: string): Promise<GameConcept> {
    if (this.config.dryRun) {
      return this.generateMockConcept();
    }

    let prompt = CONCEPT_PROMPT;

    // 既存テーマを避けるための追加指示
    if (this.usedThemes.size > 0) {
      prompt += `\n\n# 避けるべきテーマ（既出）\n${Array.from(this.usedThemes).join(', ')}\n\n上記とは異なる新しいテーマを考えてください。`;
    }

    // フィードバックがある場合（再生成時）
    if (feedback) {
      prompt += `\n\n# 前回の問題点\n${feedback}\n\n上記の問題を解決したコンセプトを生成してください。`;
    }

    const response = await this.client.messages.create({
      model: this.config.model,
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }]
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type');
    }

    // JSONを抽出
    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const concept = JSON.parse(jsonMatch[0]) as GameConcept;

    // スコアチェック
    const { goalClarity, operationClarity, judgmentClarity, acceptance } = concept.selfEvaluation;
    const allAboveMin = [goalClarity, operationClarity, judgmentClarity, acceptance]
      .every(score => score >= this.config.minScore);

    if (!allAboveMin) {
      throw new Error(`Self-evaluation scores below minimum (${this.config.minScore}): ${JSON.stringify(concept.selfEvaluation)}`);
    }

    // テーマを記録
    this.usedThemes.add(concept.theme);

    return concept;
  }

  /**
   * モックコンセプト生成（ドライラン用）
   */
  private generateMockConcept(): GameConcept {
    return {
      title: 'テストゲーム',
      titleEn: 'Test Game',
      description: 'テスト用のゲームです',
      duration: 10,
      theme: 'テスト',
      visualStyle: 'シンプル',
      playerGoal: '画面に表示される5つの赤いターゲットを全てタップして消す',
      playerOperation: 'ターゲットをタップして消す',
      successCondition: '5つ全てのターゲットをタップ',
      failureCondition: '3つ以上タップし損ねる、または時間切れ',
      selfEvaluation: {
        goalClarity: 9,
        operationClarity: 9,
        judgmentClarity: 9,
        acceptance: 8,
        reasoning: 'テスト用のシンプルなコンセプト'
      }
    };
  }

  /**
   * キャッシュクリア
   */
  clearCache(): void {
    this.usedThemes.clear();
  }

  /**
   * デバッグ情報
   */
  getDebugInfo(): object {
    return {
      config: this.config,
      usedThemesCount: this.usedThemes.size
    };
  }
}
