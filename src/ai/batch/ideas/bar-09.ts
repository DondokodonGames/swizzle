/**
 * ideas/bar-09.ts
 * バー向けミニゲームネタ帳 081〜090
 */

export const bar09Ideas = [
  {
    id: 'bar-081',
    title: 'ゴミ箱シュート',
    duration: 12,
    concept: '丸めた紙をゴミ箱に投げるシミュレーション。スワイプの勢いと角度で飛距離が変わる。何回でも投げられる。入ったら「ナイスシュート！」外れたら「惜しい！」と表示。3投のうち何回入るかを記録。',
    objects: [
      { shape: 'circle', role: '丸めた紙（スワイプで投げる）', note: '' },
      { shape: 'rect', role: 'ゴミ箱（奥に置いてある）', note: '' },
    ],
    counters: [
      { id: 'score', name: '成功数', target: 3, note: '3投中の成功数' },
    ],
    winTrigger: '3投完了',
    resultTrigger: '成功率と「センスあり」コメントを表示',
  },
  {
    id: 'bar-082',
    title: 'ペットボトルキャップ飛ばし',
    duration: 10,
    concept: 'キャップが指の下で圧縮されている演出。圧縮ゲージが最大に達した瞬間にタップして弾くと最大距離が出る。弱すぎると「ポト」と落ち、最高タイミングで「ビュッ！○cm」と記録表示。',
    objects: [
      { shape: 'circle', role: 'キャップ（圧縮される）', note: '最大圧縮時に光る' },
      { shape: 'rect', role: '圧縮ゲージ', note: '' },
    ],
    counters: [],
    winTrigger: '最大圧縮の瞬間タップ',
    resultTrigger: '飛んだ距離（演出）を表示',
  },
  {
    id: 'bar-083',
    title: '消しゴム落とし',
    duration: 10,
    concept: '机の端に消しゴムが乗っている。「落とせ！」「落とすな！」の指示がランダムで出る。指示が「落とせ」の時だけタップで落とす。間違えた方向は失敗。3回正しく反応できたら成功。',
    objects: [
      { shape: 'rect', role: '消しゴム（机の端）', note: '' },
      { shape: 'rect', role: '指示テキスト（「落とせ」「落とすな」）', note: '' },
    ],
    counters: [
      { id: 'correct', name: '正反応数', target: 3, note: '3回でクリア' },
    ],
    winTrigger: '3回正しく反応',
    resultTrigger: '成功数と評価を表示',
  },
  {
    id: 'bar-084',
    title: '脈拍測定（演出）',
    duration: 15,
    concept: '指をカメラに当てる演出をしながら「心拍数を測定中…」と表示。数秒後にランダムな数値（60〜100程度）が表示されて「現在の心拍数は○bpm・平常心です」などと判定。エンタメ演出のみ。',
    objects: [
      { shape: 'circle', role: '指認識エリア（演出）', note: '' },
      { shape: 'rect', role: '心拍波形アニメーション', note: '' },
    ],
    counters: [],
    winTrigger: '測定完了',
    resultTrigger: '心拍数（演出）と状態コメントを表示',
  },
  {
    id: 'bar-085',
    title: 'ジャンケン列車（お題）',
    duration: 8,
    concept: 'グループ全員でじゃんけん列車をやる前に「今夜の先頭は誰？」の演出として使う。最大8人の名前を入力してランダムで「先頭の人」を決める。その人が最初の挑戦者になる。',
    objects: [
      { shape: 'rect', role: '名前入力欄×最大8', note: '' },
      { shape: 'face', role: '選ばれた先頭の人（アニメーション）', note: '' },
    ],
    counters: [],
    winTrigger: '決定ボタンをタップ',
    resultTrigger: '選ばれた人の名前を大きく表示',
  },
  {
    id: 'bar-086',
    title: '利き手テスト',
    duration: 15,
    concept: '「いつもと違う手でスマホを持ってください」という指示後、簡単な操作（ボタン連打や線を描く）を行う。利き手と逆の手でやると明らかに記録が落ちる体験を通じて「あなたの利き手は○○です」と判定。',
    objects: [
      { shape: 'button', role: '操作エリア（利き手テスト用）', note: '' },
      { shape: 'rect', role: '記録インジケーター', note: '' },
    ],
    counters: [],
    winTrigger: 'テスト完了',
    resultTrigger: '利き手診断結果を表示',
  },
  {
    id: 'bar-087',
    title: '「昭和・平成・令和」クイズ',
    duration: 12,
    concept: '流行語・出来事・ヒット曲の「これは何年代？」を3択で答える。「○○が流行ったのはいつ？」という形式。時代感の知識差が出て盛り上がる。10問中の正解数でスコア。',
    objects: [
      { shape: 'rect', role: 'お題テキスト', note: '' },
      { shape: 'button', role: '昭和・平成・令和の3択ボタン', note: '' },
    ],
    counters: [
      { id: 'correct', name: '正解数', target: 10, note: '10問' },
    ],
    winTrigger: '10問回答した',
    resultTrigger: '正解数と「時代感センス」評価を表示',
  },
  {
    id: 'bar-088',
    title: 'タイピング速さ対決',
    duration: 15,
    concept: '「今日もお疲れ様でした！」などの10文字前後の文章が表示される。スタートから文章を全部タップ入力完了するまでの時間を測定。早いほど「鬼タイパー！」のコメントが出る。',
    objects: [
      { shape: 'rect', role: '入力するテキスト表示', note: '' },
      { shape: 'rect', role: 'テキスト入力エリア', note: '' },
      { shape: 'rect', role: 'タイマー', note: '' },
    ],
    counters: [],
    winTrigger: '全文字入力完了',
    resultTrigger: '入力タイムと評価を表示',
  },
  {
    id: 'bar-089',
    title: 'テキーラチャレンジ',
    duration: 8,
    concept: '6つのショットグラスが並んでいる。そのうち1つだけに「当たり（激辛or激甘など）」が入っている演出。グラスを1つタップして「飲む！」を選ぶと結果発表。当たりなら「ヒット！おめでとう（ご愁傷様）」。',
    objects: [
      { shape: 'rect', role: 'ショットグラス×6（並ぶ）', note: '' },
      { shape: 'button', role: '「飲む！」確認ボタン', note: '' },
    ],
    counters: [],
    winTrigger: 'グラスを選んで「飲む！」をタップ',
    resultTrigger: '当たり・外れの結果を表示',
  },
  {
    id: 'bar-090',
    title: 'バーバリアンスラム（声量テスト）',
    duration: 10,
    concept: 'マイクに向かって叫ぶ・話す声の大きさを測定。「今夜の気合いを声で示せ！」という演出で音量を測定。dBで表示して「最強の一喝」「優しい声」などコメントが変わる。',
    objects: [
      { shape: 'circle', role: 'マイクアイコン（音量反応）', note: '' },
      { shape: 'rect', role: '音量メーター（リアルタイム）', note: '' },
    ],
    counters: [],
    winTrigger: '音量ピークを記録',
    resultTrigger: '最大音量と評価コメントを表示',
  },
] as const;
