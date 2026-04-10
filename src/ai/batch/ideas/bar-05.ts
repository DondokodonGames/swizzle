/**
 * ideas/bar-05.ts
 * バー向けミニゲームネタ帳 041〜050
 */

export const bar05Ideas = [
  {
    id: 'bar-041',
    title: '暗算チャレンジ',
    duration: 15,
    concept: '3秒間だけ「24+37」「58-19」などの計算式が表示される。3秒後に隠れてから答えを入力して正解かどうか判定。難易度が3段階（1桁・2桁・3桁）から選べる。',
    objects: [
      { shape: 'rect', role: '計算式（3秒表示後隠れる）', note: '' },
      { shape: 'rect', role: '答え入力エリア', note: '' },
    ],
    counters: [],
    winTrigger: '答えを入力してタップ',
    resultTrigger: '正解・不正解と正解の数字を表示',
  },
  {
    id: 'bar-042',
    title: '瞬間記憶テスト',
    duration: 12,
    concept: '0.8秒間だけ3桁の数字（例：「742」）が表示される。消えた後に数字を入力して答え合わせ。正解すると4桁に増えて次のラウンドへ。何桁まで記憶できるかチャレンジ。',
    objects: [
      { shape: 'rect', role: '数字（0.8秒だけ表示）', note: '' },
      { shape: 'rect', role: '入力エリア（消えてから入力）', note: '' },
    ],
    counters: [
      { id: 'digits', name: '記憶できた桁数', target: 0, note: '最大記録を表示' },
    ],
    winTrigger: '正解して次のラウンドへ',
    resultTrigger: '最大記憶桁数を表示',
  },
  {
    id: 'bar-043',
    title: 'リズム感テスト',
    duration: 15,
    concept: '一定のテンポで光るメトロノームが表示される。16回光った後に消えて「同じテンポを維持してください」と表示。その後4回タップして、テンポの誤差率を計算して評価。',
    objects: [
      { shape: 'circle', role: 'メトロノーム（一定テンポで光る）', note: '' },
      { shape: 'button', role: 'タップエリア（テンポを入力）', note: '' },
    ],
    counters: [],
    winTrigger: '4回タップ完了',
    resultTrigger: 'テンポ誤差率と評価を表示',
  },
  {
    id: 'bar-044',
    title: '右脳左脳診断',
    duration: 12,
    concept: '「今から10秒で思い浮かんだ数字を書いてください」「直感で1〜4から選んでください」など4つのミニ質問。回答パターンから「あなたは左脳派・右脳派」と診断して解説。',
    objects: [
      { shape: 'rect', role: '質問テキスト（1問ずつ表示）', note: '' },
      { shape: 'button', role: '選択肢ボタン', note: '' },
    ],
    counters: [],
    winTrigger: '4問回答した',
    resultTrigger: '左脳・右脳の割合と解説を表示',
  },
  {
    id: 'bar-045',
    title: '空間認識テスト',
    duration: 15,
    concept: '折り紙を折って穴を開ける図が表示される。「広げるとどんな形？」という問いに3択で答える。1問だけで「あなたの空間認識力は○○レベル」と判定。',
    objects: [
      { shape: 'rect', role: '折り紙図（折った状態）', note: '' },
      { shape: 'button', role: '展開図の選択肢×3', note: '' },
    ],
    counters: [],
    winTrigger: '選択肢をタップ',
    resultTrigger: '正解・不正解と正答の展開図を表示',
  },
  {
    id: 'bar-046',
    title: 'カロリー当て',
    duration: 15,
    concept: '有名な食べ物の画像（テキスト表示）が出て「100gあたりのカロリーは？」と問う。スライダーで数値を選んでタップ。誤差100kcal以内で正解。食べ物の豆知識も表示。',
    objects: [
      { shape: 'rect', role: '食べ物名テキスト', note: '' },
      { shape: 'rect', role: 'カロリー予想スライダー', note: '' },
    ],
    counters: [],
    winTrigger: 'スライダーで答えてタップ',
    resultTrigger: '正解カロリーと誤差・豆知識を表示',
  },
  {
    id: 'bar-047',
    title: '世界一クイズ',
    duration: 10,
    concept: '「世界で一番高い山は？」など「世界一」に関する1問クイズ。4択で答えて正解・不正解。正解すると難易度が上がって次の問題へ。全3問連続正解で「世界一クイズ王！」',
    objects: [
      { shape: 'rect', role: '問題テキスト', note: '' },
      { shape: 'button', role: '4択ボタン', note: '' },
    ],
    counters: [
      { id: 'correct', name: '連続正解数', target: 3, note: '3問でクリア' },
    ],
    winTrigger: '3問連続正解',
    resultTrigger: '正誤と解説を表示',
  },
  {
    id: 'bar-048',
    title: '色の英語名',
    duration: 12,
    concept: '「Crimson（クリムゾン）って何色？」など微妙な色の英語名を3択で当てる。正解すると実際の色見本と由来説明が表示。色盲チェックを意図せず兼ねる設計。',
    objects: [
      { shape: 'rect', role: '英語の色名テキスト（大きく表示）', note: '' },
      { shape: 'button', role: '色見本の選択肢×3', note: '' },
    ],
    counters: [],
    winTrigger: '選択肢をタップ',
    resultTrigger: '正解色と語源の豆知識を表示',
  },
  {
    id: 'bar-049',
    title: '難読名前読み',
    duration: 10,
    concept: '芸能人や歴史上の人物・地名の難読名前が表示される。「月島○○（なんと読む？）」など。フリガナを入力するか3択から選んで正解チェック。知識の差が出る盛り上がりゲーム。',
    objects: [
      { shape: 'rect', role: '難読名前テキスト', note: '' },
      { shape: 'button', role: '読み方の選択肢×3', note: '' },
    ],
    counters: [],
    winTrigger: '選択肢をタップ',
    resultTrigger: '正しい読みと人物の説明を表示',
  },
  {
    id: 'bar-050',
    title: 'ことわざ虫食い',
    duration: 10,
    concept: '「○○も木から落ちる」「転ばぬ先の○○」など1文字が空白になったことわざが表示される。正しい言葉を入力するか3択から選ぶ。正解するとことわざの意味も表示。',
    objects: [
      { shape: 'rect', role: 'ことわざテキスト（○が空白）', note: '' },
      { shape: 'button', role: '選択肢×3', note: '' },
    ],
    counters: [],
    winTrigger: '選択肢をタップ',
    resultTrigger: '正解ことわざと意味を表示',
  },
] as const;
