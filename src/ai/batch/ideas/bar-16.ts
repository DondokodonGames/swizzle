/**
 * ideas/bar-16.ts
 * バー向けミニゲームネタ帳 151〜160
 */

export const bar16Ideas = [
  {
    id: 'bar-151',
    title: '「自分あるある」確認',
    duration: 12,
    concept: '「居酒屋で隅の席を選びたがる」「注文してから後悔する」など「あるある行動」のリストが表示される。チェックボックスで当てはまるものを選ぶ。チェック数によって「○○タイプ」の診断。',
    objects: [
      { shape: 'button', role: 'あるある項目チェックボックス×10', note: '' },
    ],
    counters: [
      { id: 'checked', name: 'チェック数', target: 0, note: '記録' },
    ],
    winTrigger: '確認ボタンをタップ',
    resultTrigger: 'チェック数によるタイプ診断を表示',
  },
  {
    id: 'bar-152',
    title: '「もし○○だったら」シナリオ',
    duration: 10,
    concept: '「もし今日が人生最後の日なら何をしたい？」「もし宝くじで10億当たったら？」などのお題が表示される。会話のきっかけ機能として使う。お題はタップで次々変えられる。',
    objects: [
      { shape: 'rect', role: 'シナリオお題テキスト（全画面）', note: '' },
      { shape: 'button', role: '次のお題ボタン', note: '' },
    ],
    counters: [],
    winTrigger: 'お題が表示された',
    resultTrigger: 'お題テキストを全画面表示',
  },
  {
    id: 'bar-153',
    title: 'うそつきゲームお題',
    duration: 8,
    concept: '「3つの文の中に1つだけウソを混ぜて話してください」というゲームのお題ジェネレーター。話す内容のテーマ（「仕事」「旅行」「学生時代」など）をランダムで表示。聞く人が当てるゲームのセット。',
    objects: [
      { shape: 'rect', role: 'テーマテキスト（大きく）', note: '' },
      { shape: 'button', role: '次のテーマボタン', note: '' },
    ],
    counters: [],
    winTrigger: 'テーマが表示された',
    resultTrigger: 'テーマを全画面表示',
  },
  {
    id: 'bar-154',
    title: '今夜の願い事ランキング',
    duration: 15,
    concept: '「仕事でもっと評価されたい」「彼氏彼女ほしい」など10個の願い事が表示される。自分が思う「今一番叶えたい」順に1〜3位を選んでタップ。順位に応じた「その願い叶える方法」ヒントが出る。',
    objects: [
      { shape: 'button', role: '願い事選択ボタン×10', note: '' },
    ],
    counters: [],
    winTrigger: '1〜3位を選んだ',
    resultTrigger: '選んだ願い事と達成ヒントを表示',
  },
  {
    id: 'bar-155',
    title: '「引き寄せる言葉」生成',
    duration: 6,
    concept: '「あなたが今夜引き寄せる言葉は…」という演出後、ポジティブな単語が画面に流れる。止まった単語が「今夜のキーワード」として表示される。「縁」「運」「愛」「笑」など漢字一文字系。',
    objects: [
      { shape: 'rect', role: 'キーワード候補（流れる）', note: '' },
      { shape: 'button', role: '止めるボタン', note: '' },
    ],
    counters: [],
    winTrigger: '止めるボタンをタップ',
    resultTrigger: '止まったキーワードを大きく全画面表示',
  },
  {
    id: 'bar-156',
    title: '早口当て（聞き取り）',
    duration: 15,
    concept: '「これから早口で言います。何を言ったか当ててください」というゲーム。テキストで文章が超高速でスクロール表示される（読めないくらい速く）。「何だった？」と3択から選ぶ。',
    objects: [
      { shape: 'rect', role: '超高速スクロールテキスト', note: '読めないくらいの速さ' },
      { shape: 'button', role: '3択の選択肢ボタン', note: '' },
    ],
    counters: [],
    winTrigger: '選択肢をタップ',
    resultTrigger: '正解テキストと「見えた？」コメントを表示',
  },
  {
    id: 'bar-157',
    title: '「○○の熟語」クイズ',
    duration: 12,
    concept: '「この漢字を使った熟語を1分間でいくつ言えますか？」というゲームのお題ジェネレーター。「火・水・山・人」など馴染みのある漢字をランダムで表示して1分タイマーをセット。',
    objects: [
      { shape: 'rect', role: '漢字1文字（超大きく）', note: '' },
      { shape: 'rect', role: '1分タイマー', note: '' },
    ],
    counters: [],
    winTrigger: '1分経過',
    resultTrigger: 'テーマ漢字と「いくつ言えた？」自己申告ボタンを表示',
  },
  {
    id: 'bar-158',
    title: '「前の席の人」観察クイズ',
    duration: 15,
    concept: '電車の前の席の人を観察して「この人の職業は？」「この人は何歳？」などを当てる遊びを1人でできるアプリ風。選択肢を選んでタップすると「実はこういう可能性も…」という面白い解説が出る。',
    objects: [
      { shape: 'button', role: '職業・年齢の選択肢ボタン', note: '' },
    ],
    counters: [],
    winTrigger: '選択肢をタップ',
    resultTrigger: 'ユニークな「もしかしたら…」解説を表示',
  },
  {
    id: 'bar-159',
    title: '「今夜の注目星座」占い',
    duration: 8,
    concept: '「今夜最も運気が高い星座は？」というテーマで1〜3位の星座をランダムで発表。その星座の人が今夜気をつけることや「あなたの席は幸運の席です！」という演出付き。',
    objects: [
      { shape: 'star', role: '星座アイコン（ランダムで選ばれる）', note: '' },
    ],
    counters: [],
    winTrigger: '発表ボタンをタップ',
    resultTrigger: '今夜の運気上位3星座を順番に発表',
  },
  {
    id: 'bar-160',
    title: '記念品ジェネレーター',
    duration: 10,
    concept: '「今夜の飲み会を記念して！」というテーマで「今夜の一言」を生成。日付・参加者名・「今夜の名言」（ランダム）がセットになった「デジタル記念証」風の画像が生成される。スクリーンショット保存推奨。',
    objects: [
      { shape: 'rect', role: '記念証テンプレート', note: 'テキストが自動入力される' },
    ],
    counters: [],
    winTrigger: '生成ボタンをタップ',
    resultTrigger: '記念証デザインを表示（保存可能）',
  },
] as const;
