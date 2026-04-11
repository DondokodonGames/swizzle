/**
 * ideas/bar-12.ts
 * バー向けミニゲームネタ帳 111〜120
 */

export const bar12Ideas = [
  {
    id: 'bar-111',
    title: '折り紙飛行機',
    duration: 12,
    concept: '紙飛行機が飛んでいく。スワイプで投げる向きと強さを決めて発射。的（遠くの輪）を通り抜けるかどうか判定。風の影響（ランダム）が毎回変わる。3回投げて最高飛距離を記録。',
    objects: [
      { shape: 'triangle', role: '紙飛行機（飛ぶ）', note: '' },
      { shape: 'circle', role: '的・輪（遠方）', note: '' },
    ],
    counters: [
      { id: 'best', name: '最高飛距離', target: 0, note: '記録' },
    ],
    winTrigger: '3回投げた',
    resultTrigger: '最高飛距離と「滞空時間」を表示',
  },
  {
    id: 'bar-112',
    title: 'モールス信号',
    duration: 15,
    concept: '「SOS」「LOVE」などの短い単語がモールス信号（点と線）で表示される。何と書いてあるか当てる。3択から選ぶ。正解すると次の単語へ。5問連続正解で「モールス達人！」',
    objects: [
      { shape: 'rect', role: 'モールス信号パターン（点と線）', note: '' },
      { shape: 'button', role: '3択の意味ボタン', note: '' },
    ],
    counters: [
      { id: 'correct', name: '正解数', target: 5, note: '5問連続でクリア' },
    ],
    winTrigger: '5問連続正解',
    resultTrigger: '正解数とモールス達人レベルを表示',
  },
  {
    id: 'bar-113',
    title: '無言の法則（サイレントゲームお題）',
    duration: 8,
    concept: '「○○という言葉を使わないでこのお題を説明してください」というゲームのお題と禁止ワードを同時に表示。禁止ワードを使わずに説明する口頭ゲームのお題生成機能。30秒タイマー付き。',
    objects: [
      { shape: 'rect', role: 'お題テキスト（大きく）', note: '' },
      { shape: 'rect', role: '禁止ワードテキスト（赤字）', note: '' },
      { shape: 'rect', role: '30秒タイマー', note: '' },
    ],
    counters: [],
    winTrigger: '30秒タイマー終了',
    resultTrigger: '成功・失敗を自己申告する画面',
  },
  {
    id: 'bar-114',
    title: '数字記憶対決',
    duration: 20,
    concept: '2人が交互に1桁の数字を追加していくゲームのサポートアプリ。1人が数字を追加すると全員に見えた後に隠れる。次の人が全部の数字を順番に入力。間違えたら終了。何桁まで記憶できるかを競う。',
    objects: [
      { shape: 'button', role: '数字ボタン0〜9', note: '' },
      { shape: 'rect', role: '現在の数字列（一時的に表示）', note: '' },
    ],
    counters: [
      { id: 'digits', name: '記憶桁数', target: 0, note: '最大記録' },
    ],
    winTrigger: '間違えるまで続ける',
    resultTrigger: '最大記憶桁数と「記憶力レベル」を表示',
  },
  {
    id: 'bar-115',
    title: 'おかしな法律クイズ',
    duration: 12,
    concept: '「世界には本当にある変な法律」を題材に「ウソかホントか？」クイズ。「〇〇ではビーチでアイスを食べることが禁止されている」などを3択で本当かどうか当てる。正解すると法律の説明。',
    objects: [
      { shape: 'rect', role: '変な法律テキスト', note: '' },
      { shape: 'button', role: '本当・ウソ・分からない 3択ボタン', note: '' },
    ],
    counters: [],
    winTrigger: '選択肢をタップ',
    resultTrigger: '正解・不正解と法律の詳細を表示',
  },
  {
    id: 'bar-116',
    title: '漢字の読み（超難読）',
    duration: 10,
    concept: '「驫」「鱫」「龘」など超難読漢字が表示される。「これ何と読む？」と3択で問う。一般の人がほぼ読めない漢字なので笑いが生まれる。正解するとレア感のある褒め言葉が出る。',
    objects: [
      { shape: 'rect', role: '難読漢字（超大きく全画面）', note: '' },
      { shape: 'button', role: '読み方の3択ボタン', note: '' },
    ],
    counters: [],
    winTrigger: '選択肢をタップ',
    resultTrigger: '正解の読みと漢字の意味を表示',
  },
  {
    id: 'bar-117',
    title: '腹話術チャレンジ',
    duration: 15,
    concept: '「口を動かさずに話してください」というチャレンジのお題を表示。お題の文章（「今日は天気がいいですね」など）を口を動かさずに言って隣の人に聞き取らせる口頭ゲームのお題生成。',
    objects: [
      { shape: 'rect', role: '読む文章テキスト（大きく）', note: '' },
      { shape: 'button', role: '次の文章ボタン', note: '' },
    ],
    counters: [],
    winTrigger: '文章が表示された',
    resultTrigger: '文章を全画面表示',
  },
  {
    id: 'bar-118',
    title: '指の長さ占い',
    duration: 12,
    concept: '「人差し指と薬指を並べて比べてください」「どちらが長い？」をセルフ診断。選択結果から「あなたの胎児期のホルモンバランスから○○な傾向があります」というエンタメ診断を表示。',
    objects: [
      { shape: 'button', role: '「人差し指が長い」「薬指が長い」「同じ」3択', note: '' },
    ],
    counters: [],
    winTrigger: '選択肢をタップ',
    resultTrigger: '指の長さによる性格傾向を表示',
  },
  {
    id: 'bar-119',
    title: '夢占い',
    duration: 10,
    concept: '「最近見た夢のシーン」を選択肢から選ぶ（「空を飛ぶ・歯が抜ける・追いかけられる」など）。選んだシーンの夢占いの意味と「今の心理状態」の解説が表示される。',
    objects: [
      { shape: 'button', role: '夢のシーン選択ボタン×8', note: '' },
    ],
    counters: [],
    winTrigger: 'シーンを選んでタップ',
    resultTrigger: '夢占いの意味と心理解説を表示',
  },
  {
    id: 'bar-120',
    title: 'バーチャルお賽銭',
    duration: 8,
    concept: '神社の賽銭箱が表示される。コインを選んで（1円・5円・10円・100円・500円）賽銭を投げる。投げる動作（スワイプ）で賽銭箱に入ると「チャリーン」という音と共に「ご縁がありますように」のメッセージ。',
    objects: [
      { shape: 'coin', role: 'コイン（複数種類）', note: 'スワイプで投げる' },
      { shape: 'rect', role: '賽銭箱', note: '' },
    ],
    counters: [],
    winTrigger: 'コインが賽銭箱に入った',
    resultTrigger: '「ご縁がありますように」のメッセージ表示',
  },
] as const;
