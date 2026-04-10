/**
 * ideas/bar-04.ts
 * バー向けミニゲームネタ帳 031〜040
 */

export const bar04Ideas = [
  {
    id: 'bar-031',
    title: '前世占い',
    duration: 10,
    concept: '名前を入力してタップ。名前の文字数・画数・音の組み合わせから「前世は○○だったあなた」とメッセージを表示。前世の職業や時代とともに一言アドバイスが出る。',
    objects: [
      { shape: 'rect', role: '名前入力エリア', note: '' },
      { shape: 'rect', role: '前世イメージの絵（シルエット）', note: '' },
    ],
    counters: [],
    winTrigger: '名前を入力してタップ',
    resultTrigger: '前世の設定とコメントを表示',
  },
  {
    id: 'bar-032',
    title: '星座運勢（今日）',
    duration: 8,
    concept: '12星座から自分の星座を選ぶ。今日の総合運・恋愛運・仕事運・金運を星5つで表示し、ラッキーカラーとラッキーアイテムを添える。毎日内容が変わる。',
    objects: [
      { shape: 'star', role: '星座アイコン×12', note: '' },
      { shape: 'rect', role: '運勢スコア表示（星5段階）', note: '' },
    ],
    counters: [],
    winTrigger: '星座を選んでタップ',
    resultTrigger: '各運勢スコアとラッキー情報を表示',
  },
  {
    id: 'bar-033',
    title: 'ペンジュラム占い',
    duration: 15,
    concept: '振り子（ペンジュラム）が画面の中で揺れている。質問を心に浮かべてタップすると振り子の揺れ方が変わり、「右回り＝YES」「左回り＝NO」「直線＝保留」で答えが出る。',
    objects: [
      { shape: 'ellipse', role: '振り子の錘（揺れる）', note: '' },
      { shape: 'rect', role: '振り子の糸', note: '' },
    ],
    counters: [],
    winTrigger: 'タップして振り子の動きが変わる',
    resultTrigger: '揺れ方からYES・NO・保留を判定して表示',
  },
  {
    id: 'bar-034',
    title: '水晶球占い',
    duration: 12,
    concept: '薄紫色の水晶球が画面に浮かんでいる。タップすると中に霧が渦巻き始め、ゆっくりクリアになりながら一言メッセージが現れる。内容はポジティブな予言系。',
    objects: [
      { shape: 'circle', role: '水晶球（霧がかかっている）', note: 'タップで霧が晴れる' },
    ],
    counters: [],
    winTrigger: '水晶球をタップ',
    resultTrigger: '霧が晴れて予言の一言を表示',
  },
  {
    id: 'bar-035',
    title: 'ルーン文字占い',
    duration: 10,
    concept: '裏向きのルーン文字のタイルが並んでいる。1枚をタップしてひっくり返すと古代文字と名前・意味が表示される。「フェフ（富）」「アンスズ（知恵）」など24種類から1枚。',
    objects: [
      { shape: 'rect', role: 'ルーンタイル×複数（裏向き）', note: '' },
      { shape: 'rect', role: '選んだタイル（ひっくり返る）', note: 'ルーン文字と意味を表示' },
    ],
    counters: [],
    winTrigger: 'タイルを1枚タップ',
    resultTrigger: 'ルーン文字の名前・意味・メッセージを表示',
  },
  {
    id: 'bar-036',
    title: '数秘術診断',
    duration: 12,
    concept: '生年月日をすべて足して1桁に還元する「数秘術」。生年月日を入力してタップすると「あなたのライフパスナンバーは○」と出て、その数字の意味とキャラクター説明が表示。',
    objects: [
      { shape: 'rect', role: '生年月日入力欄', note: '' },
      { shape: 'rect', role: 'ナンバーと解説テキスト', note: '' },
    ],
    counters: [],
    winTrigger: '生年月日を入力してタップ',
    resultTrigger: 'ライフパスナンバーと性格説明を表示',
  },
  {
    id: 'bar-037',
    title: '透視チャレンジ',
    duration: 15,
    concept: '相手が心の中で1〜4の数字を決める。「透視中…」の演出の後「○！」と表示。25%の確率で当たるが外れた場合でも「本当は○でしたね？（惜しい！）」と盛り上げる演出。',
    objects: [
      { shape: 'rect', role: '透視アニメーション（波形・目など）', note: '' },
    ],
    counters: [],
    winTrigger: '演出終了',
    resultTrigger: '答えを発表して相手に確認させる演出',
  },
  {
    id: 'bar-038',
    title: '今夜のお告げ',
    duration: 6,
    concept: '画面をタップすると「今夜は○○しなさい」というランダムなお告げが表示される。「早く帰りなさい」「もう1杯飲みなさい」「隣の人と仲良くしなさい」など30種以上。',
    objects: [
      { shape: 'rect', role: 'お告げテキスト（全画面）', note: '' },
      { shape: 'star', role: '神々しい演出エフェクト', note: '' },
    ],
    counters: [],
    winTrigger: '画面をタップ',
    resultTrigger: 'お告げを全画面表示',
  },
  {
    id: 'bar-039',
    title: '花びら占い',
    duration: 15,
    concept: '大きな花が中央に表示されている。タップするたびに花びらが1枚ずつちぎれて「好き」「嫌い」「好き」と交互に変わる。最後の1枚で結果が決まる演出。',
    objects: [
      { shape: 'star', role: '花びら×複数（タップでちぎれる）', note: '' },
      { shape: 'circle', role: '花の中心', note: '' },
    ],
    counters: [],
    winTrigger: '最後の花びらをタップ',
    resultTrigger: '「好き」か「嫌い」かを大きく表示',
  },
  {
    id: 'bar-040',
    title: '縁起物ガチャ',
    duration: 8,
    concept: 'ガチャポンマシンのハンドルを回す演出。出てきたカプセルが開くと縁起物（招き猫・だるま・四葉のクローバー・富士山・鶴など）が出て、対応する開運メッセージが表示。',
    objects: [
      { shape: 'circle', role: 'ガチャポンマシン', note: '' },
      { shape: 'rect', role: 'カプセル（弾き出される）', note: '' },
      { shape: 'star', role: '縁起物アイコン（カプセルから出る）', note: '' },
    ],
    counters: [],
    winTrigger: 'ハンドルを回した',
    resultTrigger: '縁起物と開運メッセージを表示',
  },
] as const;
