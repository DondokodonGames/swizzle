/**
 * ideas/bar-08.ts
 * バー向けミニゲームネタ帳 071〜080
 */

export const bar08Ideas = [
  {
    id: 'bar-071',
    title: 'ゾロ目チャレンジ',
    duration: 10,
    concept: 'サイコロ2個を振ってゾロ目を狙う。通常のサイコロと同様にランダムだが「今日のゾロ目運」として演出。ゾロ目が出ると盛大なエフェクトと「ゾロ目！ラッキー！」表示。',
    objects: [
      { shape: 'rect', role: 'サイコロ×2（転がる）', note: '' },
      { shape: 'button', role: '振るボタン', note: '' },
    ],
    counters: [],
    winTrigger: 'サイコロが止まった',
    resultTrigger: 'ゾロ目なら大エフェクト、それ以外は通常表示',
  },
  {
    id: 'bar-072',
    title: 'ロシアンルーレット（飲み）',
    duration: 8,
    concept: '回転するリボルバーの演出。6つのシリンダーのうち1つだけが「当たり（罰ゲーム）」。タップすると銃が発射——当たりなら「バン！ハズレたらカチッ。「一杯おごれ！」などの罰ゲームが発動。',
    objects: [
      { shape: 'circle', role: 'リボルバー（回転する）', note: '' },
      { shape: 'button', role: '引き金ボタン', note: '' },
    ],
    counters: [],
    winTrigger: '引き金をタップ',
    resultTrigger: '当たりなら「バン！罰ゲーム」外れなら「カチッ！セーフ」を表示',
  },
  {
    id: 'bar-073',
    title: '記念日カウンター',
    duration: 12,
    concept: '2つの日付（出会った日・付き合い始めた日など）を入力すると「出会って○○日目！」「付き合ってちょうど○年○ヶ月○日！」と計算して表示。次のアニバーサリーまでの日数も。',
    objects: [
      { shape: 'rect', role: '日付入力エリア×2', note: '' },
      { shape: 'rect', role: '経過日数の大きい表示', note: '' },
    ],
    counters: [],
    winTrigger: '日付を入力してタップ',
    resultTrigger: '経過日数と次のアニバーサリーを表示',
  },
  {
    id: 'bar-074',
    title: 'あっち向いてホイ',
    duration: 8,
    concept: '「上・下・左・右」のボタンが表示される。相手の「ホイ！」のタイミングでどちらかをタップ。AIも同時にランダムで方向を選ぶ。同じ方向なら「あっち向いた！負け」で演出。',
    objects: [
      { shape: 'button', role: '上・下・左・右ボタン', note: '' },
      { shape: 'face', role: 'AI相手キャラ（方向を指す）', note: '' },
    ],
    counters: [],
    winTrigger: '両者が同じ方向を選んだ',
    resultTrigger: '結果を大きく表示',
  },
  {
    id: 'bar-075',
    title: 'カタカナ語禁止チェッカー',
    duration: 20,
    concept: '「カタカナ語禁止ゲーム」をサポートするタイマー。しゃべった言葉の中にカタカナ語が含まれたら自己申告でボタンを押す。NG例のリストも表示できる。違反カウントを記録。',
    objects: [
      { shape: 'button', role: 'NG押しました！ボタン（大きく）', note: '' },
      { shape: 'rect', role: 'NGカウンター', note: '' },
      { shape: 'rect', role: '禁止ワード例リスト', note: '' },
    ],
    counters: [
      { id: 'ng', name: 'NG回数', target: 0, note: '記録' },
    ],
    winTrigger: 'ゲーム終了',
    resultTrigger: 'NG回数と結果を表示',
  },
  {
    id: 'bar-076',
    title: '音感テスト',
    duration: 15,
    concept: '「ドレミファソ」の5つの音のどれかが鳴る。「何の音？」という問いに5択で答える。音楽経験の差が出る盛り上がりゲーム。全5問で「音感スコア」を算出。',
    objects: [
      { shape: 'button', role: '音を鳴らすボタン', note: '' },
      { shape: 'button', role: '5択の音名ボタン（ド〜ソ）', note: '' },
    ],
    counters: [
      { id: 'correct', name: '正解数', target: 5, note: '5問で採点' },
    ],
    winTrigger: '5問回答した',
    resultTrigger: '正解数と音感スコアを表示',
  },
  {
    id: 'bar-077',
    title: '酔い度チェック',
    duration: 12,
    concept: '「現在の状態を選んでください」「何杯目ですか」「今何時か分かりますか」など3問の問いに答える。回答パターンから「シラフ・ほろ酔い・酔っぱらい・危険域」を診断して表示。',
    objects: [
      { shape: 'button', role: '状態選択ボタン×4段階', note: '' },
      { shape: 'button', role: '杯数選択ボタン', note: '' },
    ],
    counters: [],
    winTrigger: '3問回答した',
    resultTrigger: '酔い度レベルと「帰り方」アドバイスを表示',
  },
  {
    id: 'bar-078',
    title: '絵しりとり（お題生成）',
    duration: 8,
    concept: 'しりとりのお題となる「絵で描かなければならない言葉」をランダムで生成。「りんご」から始まって「ゴ」から始まる単語を次々表示。難易度別に「抽象的な単語」も出る。',
    objects: [
      { shape: 'rect', role: '絵で描く単語（大きく表示）', note: '' },
      { shape: 'button', role: '次のお題ボタン', note: '' },
    ],
    counters: [],
    winTrigger: 'お題が表示された',
    resultTrigger: 'お題テキストを全画面表示',
  },
  {
    id: 'bar-079',
    title: 'バーマスターの格言',
    duration: 6,
    concept: '「バーのマスターに人生の相談をする」という設定でランダムな格言が表示される。「お客さん、それは……」という前置きの後に短い名言が出る。ユーモア系の言葉が多め。',
    objects: [
      { shape: 'face', role: 'バーマスターのシルエット', note: '' },
      { shape: 'rect', role: '格言テキスト（吹き出し）', note: '' },
      { shape: 'button', role: 'もう一言聞くボタン', note: '' },
    ],
    counters: [],
    winTrigger: '格言が表示された',
    resultTrigger: 'バーマスターの格言を表示',
  },
  {
    id: 'bar-080',
    title: '輪投げ',
    duration: 15,
    concept: '画面の奥に3本の棒が立っている。手前からリングが転がってくる——棒の前を通過する瞬間にタップしてリングを投げる。入ったら1点、連続で入れると得点が増える。3回勝負。',
    objects: [
      { shape: 'circle', role: 'リング（手前から転がる）', note: '' },
      { shape: 'rect', role: '棒×3（奥に立っている）', note: '' },
    ],
    counters: [
      { id: 'score', name: '得点', target: 0, note: '3投合計' },
    ],
    winTrigger: '3回投げた',
    resultTrigger: '合計得点と評価を表示',
  },
] as const;
