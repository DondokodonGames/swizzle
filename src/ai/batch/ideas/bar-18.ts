/**
 * ideas/bar-18.ts
 * バー向けミニゲームネタ帳 171〜180
 */

export const bar18Ideas = [
  {
    id: 'bar-171',
    title: '「自分の◯◯度」測定',
    duration: 12,
    concept: '「あなたの几帳面度は？」「あなたの天然度は？」など面白い測定テーマが表示される。3問のYes/No質問に答えるとパーセンテージで測定結果が出る。テーマは毎回ランダム。',
    objects: [
      { shape: 'rect', role: '測定テーマテキスト', note: '' },
      { shape: 'button', role: 'YESボタン・NOボタン', note: '' },
    ],
    counters: [],
    winTrigger: '3問回答した',
    resultTrigger: '測定結果のパーセンテージとコメントを表示',
  },
  {
    id: 'bar-172',
    title: 'タイムスリップ占い',
    duration: 10,
    concept: '「もし過去に戻れるなら何年に行く？」という問いをシミュレーションする占い。生まれた年を入力すると「あなたが最もイキイキとしていたのは○○年代」という診断と当時の出来事が表示される。',
    objects: [
      { shape: 'rect', role: '生まれ年入力エリア', note: '' },
      { shape: 'rect', role: '診断結果と年代説明', note: '' },
    ],
    counters: [],
    winTrigger: '生まれ年を入力してタップ',
    resultTrigger: '黄金期の年代と当時の流行を表示',
  },
  {
    id: 'bar-173',
    title: '「部屋の整理度」チェック',
    duration: 10,
    concept: '「本棚は整理されている？」「玄関に物が散らばっている？」など5問のYes/No。回答から「あなたの部屋の散らかり度」を診断。「片付けるべき理由」と「片付けのヒント1つ」が表示される。',
    objects: [
      { shape: 'button', role: 'YESボタン・NOボタン', note: '' },
    ],
    counters: [
      { id: 'questions', name: '回答数', target: 5, note: '5問で診断' },
    ],
    winTrigger: '5問回答した',
    resultTrigger: '部屋の散らかり度と一言アドバイスを表示',
  },
  {
    id: 'bar-174',
    title: 'コインマジック',
    duration: 12,
    concept: '「コインを右手に持ちました」という演出。左右どちらかの手に隠れているかを当てる。3回連続で当てると「超能力者！」。外れると「残念！反対側でした」。ランダムで変わる。',
    objects: [
      { shape: 'button', role: '左手ボタン・右手ボタン', note: '' },
      { shape: 'coin', role: 'コイン（どちらかの手に隠れる）', note: '' },
    ],
    counters: [
      { id: 'correct', name: '連続正解数', target: 3, note: '3回でクリア' },
    ],
    winTrigger: '3回連続正解',
    resultTrigger: '正解数と「超能力度」を表示',
  },
  {
    id: 'bar-175',
    title: '恋愛温度計',
    duration: 12,
    concept: '「相手の誕生日を知っている？」「最後に会ったのはいつ？」など5問の質問に答えると「今の恋愛温度」が温度計で表示される（0〜100℃）。「まだ仲間」から「煮えたぎってる！」まで段階評価。',
    objects: [
      { shape: 'rect', role: '温度計（0〜100℃）', note: '' },
      { shape: 'button', role: '質問の選択肢ボタン', note: '' },
    ],
    counters: [
      { id: 'questions', name: '回答数', target: 5, note: '5問で診断' },
    ],
    winTrigger: '5問回答した',
    resultTrigger: '恋愛温度と段階評価コメントを表示',
  },
  {
    id: 'bar-176',
    title: '「このお酒に合う料理は？」',
    duration: 8,
    concept: '今飲んでいるお酒の種類を選ぶと「このお酒に一番合う料理」をおすすめする。「日本酒×刺身」「ワイン×チーズ」などの定番から「泡盛×沖縄そば」など意外なペアリングも提案。',
    objects: [
      { shape: 'button', role: 'お酒の種類選択ボタン×10', note: '' },
      { shape: 'rect', role: 'おすすめ料理テキスト', note: '' },
    ],
    counters: [],
    winTrigger: 'お酒の種類を選んでタップ',
    resultTrigger: 'ペアリング料理と理由を表示',
  },
  {
    id: 'bar-177',
    title: '「幸せの玉」キャッチ',
    duration: 15,
    concept: '画面から光る玉が落ちてくる。通常の玉は白、「幸せの玉」は金色で珍しい。金色の玉が落ちてきた瞬間だけタップしてキャッチ。白い玉をタップすると失敗。30秒で何個金玉をキャッチできるか。',
    objects: [
      { shape: 'circle', role: '白い玉（多数・落ちてくる）', note: 'タップしてはダメ' },
      { shape: 'circle', role: '金色の玉（少数・落ちてくる）', note: 'タップでキャッチ' },
    ],
    counters: [
      { id: 'gold', name: '金玉キャッチ数', target: 0, note: '30秒間の記録' },
    ],
    winTrigger: '30秒経過',
    resultTrigger: 'キャッチした金玉数と「幸運度」を表示',
  },
  {
    id: 'bar-178',
    title: '背中文字当て',
    duration: 20,
    concept: '相手の背中に指で文字を書いて当ててもらう「背中文字ゲーム」のお題ジェネレーター。書く文字（漢字1文字・ひらがな2文字など）がランダムで表示される。難易度も設定可能。',
    objects: [
      { shape: 'rect', role: '書く文字のテキスト（大きく）', note: '' },
      { shape: 'button', role: '難易度設定ボタン', note: '' },
      { shape: 'button', role: '次の文字ボタン', note: '' },
    ],
    counters: [],
    winTrigger: '文字が表示された',
    resultTrigger: '文字を全画面表示',
  },
  {
    id: 'bar-179',
    title: '投資家診断',
    duration: 12,
    concept: '「100万円あったらどうする？」「リターンが大きいが失敗する可能性70%の案件に投資する？」など5問の問いに答える。回答から「あなたの投資家スタイル」を診断（守りの投資家・大胆型など）。',
    objects: [
      { shape: 'button', role: '選択肢ボタン×3〜4択', note: '' },
    ],
    counters: [
      { id: 'questions', name: '回答数', target: 5, note: '5問で診断' },
    ],
    winTrigger: '5問回答した',
    resultTrigger: '投資スタイル診断と解説を表示',
  },
  {
    id: 'bar-180',
    title: 'バーチャルパチンコ（1玉）',
    duration: 10,
    concept: 'パチンコ台のイメージで玉が落ちていく。釘に当たりながらランダムに方向を変えて「確変！」「通常」「外れ」のポケットに落ちる。演出と音で盛り上がるエンタメ系。',
    objects: [
      { shape: 'circle', role: 'パチンコ玉（落下・釘に当たる）', note: '' },
      { shape: 'rect', role: '釘（複数）', note: '' },
    ],
    counters: [],
    winTrigger: '玉がポケットに落ちた',
    resultTrigger: '落ちた場所と結果（確変！など）を表示',
  },
] as const;
