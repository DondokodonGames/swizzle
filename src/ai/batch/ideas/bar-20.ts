/**
 * ideas/bar-20.ts
 * バー向けミニゲームネタ帳 191〜200
 */

export const bar20Ideas = [
  {
    id: 'bar-191',
    title: '「次のトレンド」予言',
    duration: 8,
    concept: '「来年ヒットするものを予言します！」という演出でランダムな「次のトレンド予言」が表示される。「○○と○○が融合したビジネスが来る」「△△が再流行する」などシュールで笑えるものが多め。',
    objects: [
      { shape: 'rect', role: 'トレンド予言テキスト（全画面）', note: '' },
      { shape: 'button', role: '次の予言ボタン', note: '' },
    ],
    counters: [],
    winTrigger: '予言が表示された',
    resultTrigger: 'トレンド予言を全画面表示',
  },
  {
    id: 'bar-192',
    title: '「あなたの残り時間」演出',
    duration: 10,
    concept: '「今日あなたが残り使える時間は…」という設定で今何時かを入力。そこから「今夜の残り自由時間」「今月の残り週末数」「今年の残り日数」を計算して表示。時間の大切さを感じるコンテンツ。',
    objects: [
      { shape: 'rect', role: '現在時刻・今日の日付入力', note: '' },
      { shape: 'rect', role: '残り時間計算結果（複数表示）', note: '' },
    ],
    counters: [],
    winTrigger: '時刻を入力してタップ',
    resultTrigger: '残り時間を複数の単位で表示',
  },
  {
    id: 'bar-193',
    title: 'バーチャル手相占い',
    duration: 12,
    concept: '「利き手の生命線は長い？短い？」「感情線は深い？浅い？」など自己観察の質問を5問。回答から「あなたの手相タイプ」と今後の展望を簡単に表示。実際の手相の見方も学べる。',
    objects: [
      { shape: 'button', role: '手相の特徴選択ボタン（各質問の選択肢）', note: '' },
    ],
    counters: [
      { id: 'questions', name: '回答数', target: 5, note: '5問で診断' },
    ],
    winTrigger: '5問回答した',
    resultTrigger: '手相タイプと今後の展望を表示',
  },
  {
    id: 'bar-194',
    title: '「今夜のテーマソング」抽選',
    duration: 8,
    concept: '「今夜の○○さんのテーマソングは……」という演出でランダムに曲のジャンルと雰囲気が決まる。「80年代バラード」「熱血アニソン」「しみじみ演歌」など20種以上から抽選。実際に聴いてみるきっかけに。',
    objects: [
      { shape: 'rect', role: '名前入力エリア', note: '' },
      { shape: 'rect', role: 'テーマソングジャンル（全画面発表）', note: '' },
    ],
    counters: [],
    winTrigger: '名前を入力してタップ',
    resultTrigger: '今夜のテーマソングジャンルと演出を表示',
  },
  {
    id: 'bar-195',
    title: '猫じゃらし',
    duration: 15,
    concept: '画面の中に猫が座っている。画面を動かすと猫じゃらしが動いて猫が追いかける。バーチャルで猫と遊ぶ癒やし系。猫が「飽きる」まで何秒付き合ってくれるかを計測。',
    objects: [
      { shape: 'face', role: '猫（動きに反応する）', note: '' },
      { shape: 'star', role: '猫じゃらし（指の動きに連動）', note: '' },
    ],
    counters: [],
    winTrigger: '猫が飽きるまで遊ぶ',
    resultTrigger: '猫が遊んでくれた秒数と「なつかれ度」を表示',
  },
  {
    id: 'bar-196',
    title: '「全集中」タイミング',
    duration: 15,
    concept: '「今から全集中します…」という演出の後、呼吸ゲージが上下する。ゲージが「最高集中ポイント」に達した瞬間にタップ。ゲージが整った瞬間を逃すと「集中が乱れた…」のメッセージ。',
    objects: [
      { shape: 'rect', role: '呼吸ゲージ（上下動）', note: '最高集中ポイントで光る' },
      { shape: 'button', role: '全集中！ボタン', note: '' },
    ],
    counters: [],
    winTrigger: '最高集中ポイントでタップ',
    resultTrigger: '「全集中完了！」または「集中が乱れた…」を表示',
  },
  {
    id: 'bar-197',
    title: '「この素材、正しく分別できる？」',
    duration: 12,
    concept: '「ペットボトルのキャップは？」「割り箸は？」などのゴミの分別クイズ。住んでいる地域によって違うことを踏まえ「一般的な分別ルール」で正解・不正解を判定。意外と知らない豆知識が満載。',
    objects: [
      { shape: 'rect', role: 'ゴミの品目テキスト', note: '' },
      { shape: 'button', role: '分別の選択肢ボタン（燃えるゴミ・資源・プラ等）', note: '' },
    ],
    counters: [],
    winTrigger: '選択肢をタップ',
    resultTrigger: '正解・不正解と正しい分別方法を表示',
  },
  {
    id: 'bar-198',
    title: '「最後の一問」ゲーム',
    duration: 15,
    concept: '会を締めくくるための「最後の一問」をランダムで生成。「今夜一番楽しかった瞬間は？」「次回はどこに行きたい？」など振り返り系の質問が表示されて全員で答え合う用途。',
    objects: [
      { shape: 'rect', role: '締め質問テキスト（全画面・大きく）', note: '' },
      { shape: 'button', role: '次の質問ボタン', note: '' },
    ],
    counters: [],
    winTrigger: '質問が表示された',
    resultTrigger: '締め質問を全画面で大きく表示',
  },
  {
    id: 'bar-199',
    title: '「明日のやること」コミット',
    duration: 12,
    concept: '「明日の朝一番にやることを1つ宣言してください」というコミットメント機能。宣言した内容とともに「これは○○さんとの約束です」という演出で記録。翌日の通知設定も可能。',
    objects: [
      { shape: 'rect', role: '宣言テキスト入力エリア', note: '' },
      { shape: 'button', role: '「コミットする！」ボタン', note: '' },
    ],
    counters: [],
    winTrigger: '「コミットする！」をタップ',
    resultTrigger: '宣言内容を「証明書」風のデザインで表示',
  },
  {
    id: 'bar-200',
    title: 'おやすみ占い',
    duration: 8,
    concept: '今夜の締めくくりに「今夜はどんな夢を見る？」という占い。タップすると「今夜見る夢」のテーマがランダムで表示される。「楽しい夢・怖い夢・不思議な夢・懐かしい夢」など。「良い夢を！」のメッセージで締め。',
    objects: [
      { shape: 'star', role: '星空のアニメーション（眠りの演出）', note: '' },
      { shape: 'rect', role: '「今夜の夢」テキスト', note: '' },
    ],
    counters: [],
    winTrigger: '画面をタップ',
    resultTrigger: '今夜の夢テーマと「良い夢を！」メッセージを表示',
  },
] as const;
