/**
 * ideas/bar-11.ts
 * バー向けミニゲームネタ帳 101〜110
 */

export const bar11Ideas = [
  {
    id: 'bar-101',
    title: 'ドミノ倒し',
    duration: 15,
    concept: '画面に一列のドミノが並んでいる。最初のドミノをタップして倒し始める。ドミノが端まで全部倒れたら成功。途中で止まったら「つながっていなかった」という演出。全部倒れると「スカッ！」',
    objects: [
      { shape: 'rect', role: 'ドミノ×10（一列）', note: 'タップで順番に倒れる' },
    ],
    counters: [],
    winTrigger: '全ドミノが倒れた',
    resultTrigger: '倒れた枚数と「スカッと感」コメントを表示',
  },
  {
    id: 'bar-102',
    title: '肝試し度診断',
    duration: 12,
    concept: '「真夜中に1人で外に出られる？」「心霊スポットに行ける？」など5問のYes/No問題。回答数から「肝試し度」をパーセンテージで表示。「無敵の肝っ玉」から「超ビビり」まで段階評価。',
    objects: [
      { shape: 'button', role: 'YESボタン（右）', note: '' },
      { shape: 'button', role: 'NOボタン（左）', note: '' },
    ],
    counters: [
      { id: 'yes', name: 'YES回答数', target: 5, note: '5問で採点' },
    ],
    winTrigger: '5問回答した',
    resultTrigger: '肝試し度%と評価コメントを表示',
  },
  {
    id: 'bar-103',
    title: '瞬間視野テスト',
    duration: 12,
    concept: '0.5秒間だけ画面の中に数字・色・記号が表示される。「いくつあったか？」「何色が多かった？」など瞬間的な視野と記憶力を問う。3問回答してスコアを出す。',
    objects: [
      { shape: 'rect', role: '数字・記号（0.5秒間表示）', note: '' },
      { shape: 'button', role: '答え入力・選択ボタン', note: '' },
    ],
    counters: [
      { id: 'correct', name: '正解数', target: 3, note: '3問' },
    ],
    winTrigger: '3問回答した',
    resultTrigger: '正解数と視野・記憶力評価を表示',
  },
  {
    id: 'bar-104',
    title: '腕相撲シミュレーター',
    duration: 15,
    concept: '2人がスマホを向かい合わせに傾けて「腕相撲」をシミュレート。お互いに画面を倒す方向に傾けて、先に90度倒れた方が負け。傾きセンサーで対戦。デバイスを1台で交互にやる簡易版も可。',
    objects: [
      { shape: 'rect', role: '腕相撲の腕（傾きに連動）', note: '' },
      { shape: 'rect', role: '傾きインジケーター（リアルタイム）', note: '' },
    ],
    counters: [],
    winTrigger: '相手より先に90度倒れた',
    resultTrigger: '勝者と傾き角度を表示',
  },
  {
    id: 'bar-105',
    title: '「○○あるある」お題',
    duration: 8,
    concept: '「居酒屋あるある」「職場あるある」「電車あるある」などのお題が次々と表示される。「あるある！」と思ったら大きくタップ。場の話題のきっかけとして使える。お題は50種以上。',
    objects: [
      { shape: 'rect', role: 'あるあるお題テキスト（大きく）', note: '' },
      { shape: 'button', role: '「あるある！」ボタン（大きく）', note: '' },
      { shape: 'button', role: '次のお題ボタン', note: '' },
    ],
    counters: [],
    winTrigger: 'お題が表示された',
    resultTrigger: 'お題テキストを全画面表示',
  },
  {
    id: 'bar-106',
    title: 'マッチ棒パズル（1問）',
    duration: 20,
    concept: 'マッチ棒で作られた間違った数式が表示される（例：「1+1=3」）。「1本だけ動かして正しい数式にしてください」という問題。答えボタンをタップすると正解の説明が表示。',
    objects: [
      { shape: 'rect', role: 'マッチ棒の数式（画面いっぱい）', note: '' },
      { shape: 'button', role: '答えを見るボタン', note: '' },
    ],
    counters: [],
    winTrigger: '答えを見るボタンをタップ',
    resultTrigger: '正解の移動先と解説を表示',
  },
  {
    id: 'bar-107',
    title: '「何分後に帰れる？」占い',
    duration: 8,
    concept: '「今夜、あと何分でこの場を出られる？」という問いに対し、ルーレットで「15分後・30分後・1時間後・2時間後・夜明けまで・永遠に」からランダムに答えが出る。笑える演出付き。',
    objects: [
      { shape: 'circle', role: '帰宅時刻ルーレット（6分割）', note: '' },
    ],
    counters: [],
    winTrigger: 'ルーレットが止まった',
    resultTrigger: '帰宅予測と「仕方ない…」系コメントを表示',
  },
  {
    id: 'bar-108',
    title: '花火打ち上げ',
    duration: 10,
    concept: '画面をタップすると打ち上げ花火が上がり、華やかに開く演出。色・形・大きさがランダムで変わる。「今夜の乾杯の代わりに！」という演出用途。音と光で場を盛り上げる。',
    objects: [
      { shape: 'circle', role: '花火（打ち上がって開く）', note: 'ランダムな色・形' },
    ],
    counters: [],
    winTrigger: '画面をタップ',
    resultTrigger: '花火が開いて一言メッセージを表示',
  },
  {
    id: 'bar-109',
    title: 'ドリンク診断',
    duration: 12,
    concept: '「今の気分は？」「甘い？辛い？」「強い？弱い？」など3問の質問に答えると「あなたに合う今夜のドリンクは○○です！」という診断が出る。実際のカクテルや日本酒の名前が出る。',
    objects: [
      { shape: 'button', role: '気分選択ボタン×4択', note: '' },
      { shape: 'button', role: '甘辛選択ボタン', note: '' },
      { shape: 'button', role: '強弱選択ボタン', note: '' },
    ],
    counters: [],
    winTrigger: '3問回答した',
    resultTrigger: 'おすすめドリンク名と説明を表示',
  },
  {
    id: 'bar-110',
    title: 'フリースロー（バスケット）',
    duration: 12,
    concept: 'バスケットのリングが揺れている。リングが中央（ゴール正面）に来た瞬間にタップしてシュート。入れたら1点、3本連続で成功すると「完璧フォーム！」の演出。外れは派手にリムに当たる。',
    objects: [
      { shape: 'circle', role: 'バスケットのリング（揺れる）', note: '正面で光る' },
      { shape: 'circle', role: 'バスケットボール（手前）', note: '' },
    ],
    counters: [
      { id: 'score', name: '得点', target: 3, note: '3本連続で完璧' },
    ],
    winTrigger: '3本シュートした',
    resultTrigger: '成功数と評価を表示',
  },
] as const;
