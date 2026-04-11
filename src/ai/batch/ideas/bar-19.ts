/**
 * ideas/bar-19.ts
 * バー向けミニゲームネタ帳 181〜190
 */

export const bar19Ideas = [
  {
    id: 'bar-181',
    title: '「モテる言動」診断',
    duration: 12,
    concept: '「初デートでどこに行く？」「相手が悩んでいる時どうする？」など5問の行動パターンを選ぶ。回答から「あなたのモテ度」をパーセンテージで表示。高い人は「自然体の王様」低い人は「努力系」のコメント。',
    objects: [
      { shape: 'button', role: '行動パターン選択肢ボタン', note: '' },
    ],
    counters: [
      { id: 'questions', name: '回答数', target: 5, note: '5問で診断' },
    ],
    winTrigger: '5問回答した',
    resultTrigger: 'モテ度%とタイプ名・アドバイスを表示',
  },
  {
    id: 'bar-182',
    title: '「この話はいくら？」交渉ゲーム',
    duration: 15,
    concept: '「あなたが今夜持っているエピソード（面白い話・感動話・黒歴史）をいくらで売りますか？」というゲーム。スライダーで金額を設定して「発表！」。全員が同じ形式で競りをする会話ゲームのお題。',
    objects: [
      { shape: 'rect', role: '売るエピソードのカテゴリ選択', note: '' },
      { shape: 'rect', role: '値段スライダー（0〜100万円）', note: '' },
    ],
    counters: [],
    winTrigger: '金額を設定してタップ',
    resultTrigger: '設定金額と「バイヤーコメント」を表示',
  },
  {
    id: 'bar-183',
    title: '歌詞の虫食い',
    duration: 12,
    concept: '有名な歌の歌詞の一部が虫食いになっている。正しい言葉を3択から選ぶ。「♪○○な 気持ちを 伝えたくて……の次は？」という形式。J-POP・昭和歌謡・アニソンのバリエーション。',
    objects: [
      { shape: 'rect', role: '歌詞テキスト（虫食い部分あり）', note: '' },
      { shape: 'button', role: '3択ボタン（歌詞の選択肢）', note: '' },
    ],
    counters: [],
    winTrigger: '選択肢をタップ',
    resultTrigger: '正解の歌詞と曲名・アーティストを表示',
  },
  {
    id: 'bar-184',
    title: '「明日の天気」賭け',
    duration: 10,
    concept: '明日の天気を全員で予想して記録する。「晴れ・曇り・雨・雪」の4択でそれぞれが予想してタップ。翌日に答え合わせをするためのシンプルな記録アプリ。予想者の名前もセットで記録。',
    objects: [
      { shape: 'button', role: '天気選択ボタン（晴・曇・雨・雪）', note: '' },
      { shape: 'rect', role: '名前入力エリア（予想者）', note: '' },
    ],
    counters: [],
    winTrigger: '全員が予想してタップ',
    resultTrigger: '全員の予想一覧を保存・表示',
  },
  {
    id: 'bar-185',
    title: '「100回言え」チャレンジ',
    duration: 20,
    concept: '「バナナ」「チョコレート」などの言いやすい言葉を高速で100回言うチャレンジ。自分でタップするたびにカウントが増え、100回到達で「完了！○秒で言い切りました！」と記録。',
    objects: [
      { shape: 'button', role: '100回カウンターボタン（大きく）', note: '' },
      { shape: 'rect', role: 'カウンター表示（あと○回）', note: '' },
      { shape: 'rect', role: 'タイマー', note: '' },
    ],
    counters: [
      { id: 'count', name: '言った回数', target: 100, note: '100回でクリア' },
    ],
    winTrigger: '100回カウントした',
    resultTrigger: '100回言い終えるのにかかった秒数を表示',
  },
  {
    id: 'bar-186',
    title: 'スマホ落とし（胆力テスト）',
    duration: 15,
    concept: 'スマホを持った腕を完全に伸ばして「このまま手を放せますか？」という胆力テスト設定。実際には放さないが「放す決意をした度」をスライダーで入力する面白い心理テスト。',
    objects: [
      { shape: 'rect', role: '決意スライダー（0〜100%）', note: '' },
      { shape: 'rect', role: '「本当に放す気がある度」表示', note: '' },
    ],
    counters: [],
    winTrigger: 'スライダーを設定してタップ',
    resultTrigger: '決意度%と「大胆さ」コメントを表示',
  },
  {
    id: 'bar-187',
    title: '隠し絵クイズ',
    duration: 12,
    concept: '一見するとただの画像（テキストで説明）に「隠れた動物・人・顔」があるという問題。「何が隠れている？」を3択で当てる。正解すると「どこにあるか」のヒントが表示される。',
    objects: [
      { shape: 'rect', role: '隠し絵の説明テキスト', note: '' },
      { shape: 'button', role: '3択ボタン（隠れているもの）', note: '' },
    ],
    counters: [],
    winTrigger: '選択肢をタップ',
    resultTrigger: '正解と「隠れている場所のヒント」を表示',
  },
  {
    id: 'bar-188',
    title: '「過去の自分へ」一言',
    duration: 10,
    concept: '「5年前の自分に一言アドバイスを送るとしたら？」というお題が表示される。ランダムなアドバイス例が表示されて会話のきっかけになる。タップするたびに新しいお題（年数・シチュエーション）に変わる。',
    objects: [
      { shape: 'rect', role: 'お題テキスト（「○年前の自分へ」）', note: '' },
      { shape: 'button', role: '次のお題ボタン', note: '' },
    ],
    counters: [],
    winTrigger: 'お題が表示された',
    resultTrigger: 'お題とランダムなアドバイス例を表示',
  },
  {
    id: 'bar-189',
    title: '「この漢字の書き方」チェック',
    duration: 12,
    concept: '「薔薇」「鬱」「憂鬱」など書くのが難しい漢字のリストが表示される。「実際に書いてみてください！」という問いかけ後に「書けた！書けなかった」を自己申告。書けた場合はかなりの知識人と認定。',
    objects: [
      { shape: 'rect', role: '難しい漢字テキスト（大きく）', note: '' },
      { shape: 'button', role: '「書けた！」「書けなかった…」ボタン', note: '' },
    ],
    counters: [],
    winTrigger: '自己申告ボタンをタップ',
    resultTrigger: '漢字の読み方と書き順ポイントを表示',
  },
  {
    id: 'bar-190',
    title: '「今夜の一番星」探し',
    duration: 10,
    concept: '「今夜の一番星は○番テーブルの○○さんです！」という演出。参加者の名前を入力してタップ。スターアニメーションとともに1人が選ばれて「今夜のスター」として大きく表示される。',
    objects: [
      { shape: 'rect', role: '名前入力欄×複数', note: '' },
      { shape: 'star', role: 'スターアニメーション', note: '' },
    ],
    counters: [],
    winTrigger: '決定ボタンをタップ',
    resultTrigger: '選ばれた「今夜のスター」を大きく発表',
  },
] as const;
