/**
 * ideas/bar-06.ts
 * バー向けミニゲームネタ帳 051〜060
 */

export const bar06Ideas = [
  {
    id: 'bar-051',
    title: 'ポーカー（1ハンド）',
    duration: 10,
    concept: '5枚のカードが配られる（トランプアニメーション）。手持ちのカードを見て役を自分で宣言する。「ペア・ツーペア・スリーカード」など正しく宣言できたら「ポーカー上級者！」と表示。',
    objects: [
      { shape: 'rect', role: 'トランプカード×5', note: '裏→表のめくりアニメ' },
      { shape: 'button', role: '役名の選択肢ボタン', note: '' },
    ],
    counters: [],
    winTrigger: '正しい役を選択してタップ',
    resultTrigger: '役の正解・不正解と役の説明を表示',
  },
  {
    id: 'bar-052',
    title: '神経衰弱（1ペア）',
    duration: 15,
    concept: '4×4の裏向きカード16枚から2枚をめくってペアを当てる。1回だけカードを記憶するチャンスがある。素早く当てるとタイムボーナス付き。全8ペアを当てるか3分以内に何ペア当てられるかで勝負。',
    objects: [
      { shape: 'rect', role: 'トランプカード×16（裏向き）', note: 'めくるとめくり返す' },
    ],
    counters: [
      { id: 'pairs', name: '揃えたペア数', target: 8, note: '8ペアでクリア' },
    ],
    winTrigger: '全8ペア揃える',
    resultTrigger: 'クリアタイムとペア数を表示',
  },
  {
    id: 'bar-053',
    title: 'ブラックジャック（1勝負）',
    duration: 15,
    concept: 'ディーラーと1対1のブラックジャック。カードを引いて21に近づける。「HIT（もう1枚）」「STAND（止める）」を選ぶ。バスト（21超）すると負け。21以下でディーラーより高い数で勝ち。',
    objects: [
      { shape: 'rect', role: 'カード（プレイヤー・ディーラーに配られる）', note: '' },
      { shape: 'button', role: 'HITボタン', note: '' },
      { shape: 'button', role: 'STANDボタン', note: '' },
    ],
    counters: [],
    winTrigger: '21以下でディーラーより高い',
    resultTrigger: '勝敗と各手の合計を表示',
  },
  {
    id: 'bar-054',
    title: 'バーチャル乾杯',
    duration: 5,
    concept: '2台のスマホを隣同士に並べて「乾杯！」とタップすると、画面にビールジョッキが表示されて音が鳴る演出。1台だけでも「グラスをぶつける動作」で乾杯音が鳴る簡易版もあり。',
    objects: [
      { shape: 'rect', role: 'ビールジョッキ（中央）', note: '' },
    ],
    counters: [],
    winTrigger: '画面をタップ',
    resultTrigger: '乾杯の音と「カンパーイ！」テキストを表示',
  },
  {
    id: 'bar-055',
    title: 'コイン積み上げ',
    duration: 20,
    concept: 'コインが1枚ずつ落ちてくる。傾かないように積み上げるゲーム。デバイスを水平に保つとコインが真っ直ぐ落ちる。傾けると崩れる。何枚積めたかを競う。',
    objects: [
      { shape: 'coin', role: 'コイン（上から落ちてくる）', note: '' },
      { shape: 'rect', role: '積み上がったコインの塔', note: '' },
    ],
    counters: [
      { id: 'coins', name: '積んだ枚数', target: 0, note: '記録として表示' },
    ],
    winTrigger: '崩れるまで続ける',
    resultTrigger: '最高積み枚数を表示',
  },
  {
    id: 'bar-056',
    title: 'ダーツ（1投）',
    duration: 10,
    concept: '的が左右に揺れている。的が中央（ブルズアイ方向）に来た瞬間に縦の狙いを合わせ、もう一度タップで投げる。命中した点数（ブルは50点）を表示してトータルスコアを計算。',
    objects: [
      { shape: 'circle', role: 'ダーツの的（左右に揺れる）', note: '' },
      { shape: 'star', role: 'ブルズアイ（中心）', note: '' },
    ],
    counters: [
      { id: 'score', name: '得点', target: 0, note: '3投合計で記録' },
    ],
    winTrigger: '2回タップで投げた',
    resultTrigger: '命中した場所の点数を表示',
  },
  {
    id: 'bar-057',
    title: '占い師に聞く',
    duration: 10,
    concept: 'テキストを1行入力して「占い師に相談」ボタンをタップ。占い師キャラが「……そうですね……」と間を置いてからランダムで短い格言や予言を返す。同じ質問でも毎回答えが変わる。',
    objects: [
      { shape: 'rect', role: 'テキスト入力エリア（質問）', note: '' },
      { shape: 'face', role: '占い師キャラ（考え中→回答）', note: '' },
    ],
    counters: [],
    winTrigger: '質問を入力してタップ',
    resultTrigger: 'ランダムな格言・予言を表示',
  },
  {
    id: 'bar-058',
    title: '息止め記録',
    duration: 30,
    concept: 'スタートをタップして息を止める。苦しくなったらタップして止める。「○秒間、息を止めました！」と表示。世界記録（24分37秒）との比率でコメントが変わる。',
    objects: [
      { shape: 'button', role: 'スタート/ストップボタン', note: '' },
      { shape: 'rect', role: 'カウントアップタイマー', note: '' },
    ],
    counters: [],
    winTrigger: 'ストップボタンをタップ',
    resultTrigger: '記録時間と評価コメントを表示',
  },
  {
    id: 'bar-059',
    title: 'スマホ傾き水平テスト',
    duration: 15,
    concept: 'デバイスを机の端に置いて少しずつ端に近づける。傾きセンサーを使い「まだ大丈夫・危険ゾーン・危険！」とリアルタイム表示。どこまで端まで置けるかを測定。実際には落とさないよう注意喚起付き。',
    objects: [
      { shape: 'rect', role: '傾き表示インジケーター（リアルタイム）', note: '' },
    ],
    counters: [],
    winTrigger: '止めるボタンをタップ',
    resultTrigger: '最大傾き角度と評価を表示',
  },
  {
    id: 'bar-060',
    title: '今夜の運試し',
    duration: 6,
    concept: 'タップすると5個の星が順番に灯って「今夜の運勢」スコアが決まる。0〜5個灯った数でメッセージが変わる。「今夜は何でもうまくいく！」「今夜は大人しくしておいて…」など。',
    objects: [
      { shape: 'star', role: '星×5（順番に灯る）', note: '' },
    ],
    counters: [],
    winTrigger: '星が全部灯った',
    resultTrigger: '灯った星の数とメッセージを表示',
  },
] as const;
