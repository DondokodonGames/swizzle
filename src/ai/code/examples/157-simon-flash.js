// 157-simon-flash.js
// サイモンフラッシュ — 光るパターンを記憶して同じ順に再現する記憶ゲーム
// 操作: タップで色を選ぶ
// 成功: 1ラウンドクリア  失敗: 1回ミス or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、記憶端末） ──
  var C = { bg:'#1a0028', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var PADS = [
    { base: C.e, hi: C.g }, { base: C.a, hi: C.g },
    { base: C.f, hi: C.g }, { base: C.c, hi: C.g }
  ];

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'SIMON FLASH';
  var HOW_TO_PLAY = 'WATCH · THEN REPEAT THE ORDER';
  var MAX_TIME = 15;             // 修正2: 40 → 15
  var NEEDED   = 1;              // 修正2: 8 → 1
  var BTN = 300, GAP = 24;
  var CX = snap(W / 2), CY = snap(H * 0.5);
  var LAYOUT = [
    { x: CX - BTN - GAP / 2, y: CY - BTN - GAP / 2 }, { x: CX + GAP / 2, y: CY - BTN - GAP / 2 },
    { x: CX - BTN - GAP / 2, y: CY + GAP / 2 }, { x: CX + GAP / 2, y: CY + GAP / 2 }
  ];
  var SHOW_ON = 0.5, SHOW_OFF = 0.25;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var sequence, playerSeq, round, phase, showIdx, showTimer, showOn, litBtn;
  var timeLeft, done, feedback, feedbackOk, pressedBtn, pressTimer;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var lit = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < lit ? C.b : '#2a0a3a');
  }

  function drawPad(bi, isLit) {
    var l = LAYOUT[bi], col = PADS[bi];
    game.draw.rect(l.x, l.y, BTN, BTN, col.base, isLit ? 1 : 0.4);
    game.draw.rect(l.x, l.y, BTN, 12, col.hi, isLit ? 0.7 : 0.2);
    game.draw.rect(l.x, l.y + BTN - 12, BTN, 12, '#000000', 0.3);
    if (isLit) { game.draw.rect(l.x + 40, l.y + 40, BTN - 80, BTN - 80, col.hi, 0.4); }
  }

  function addToSequence() { sequence.push(Math.floor(Math.random() * 4)); round++; }

  function startShowing() { phase = 'showing'; showIdx = 0; showTimer = 0.4; showOn = false; litBtn = -1; }

  function initGame() {
    sequence = []; playerSeq = []; round = 0;
    phase = 'showing'; showIdx = 0; showTimer = 0.4; showOn = false; litBtn = -1;
    timeLeft = MAX_TIME; done = false; feedback = 0; pressedBtn = -1; pressTimer = 0;
    addToSequence();
    setTimeout(function() { if (state === S.PLAYING && !done) startShowing(); }, 500);
  }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (round * 400 + Math.ceil(timeLeft) * 30) : round * 100;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  // ── 入力 ──
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || phase !== 'input') return;
    for (var bi = 0; bi < LAYOUT.length; bi++) {
      var l = LAYOUT[bi];
      if (x >= l.x && x <= l.x + BTN && y >= l.y && y <= l.y + BTN) {
        pressedBtn = bi; pressTimer = 0.2; playerSeq.push(bi);
        game.audio.play('se_tap', 0.5);
        if (playerSeq[playerSeq.length - 1] !== sequence[playerSeq.length - 1]) { feedbackOk = false; feedback = 0.5; finish(false); return; }
        if (playerSeq.length === sequence.length) {
          feedbackOk = true; feedback = 0.5;
          game.audio.play('se_success');
          if (round >= NEEDED) { finish(true); return; }
          playerSeq = [];
          setTimeout(function() { if (state === S.PLAYING && !done) { addToSequence(); startShowing(); } }, 600);
        }
        return;
      }
    }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      game.draw.clear(C.bg);
      for (var bi = 0; bi < 4; bi++) drawPad(bi, Math.floor(game.time.elapsed * 2) % 4 === bi);
      txt(GAME_TITLE, W / 2, H * 0.12, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.20, 32, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.84, 62, C.a);
        txt('TAP TO START', W / 2, H * 0.90, 48, C.g);
      }
      txt('INSERT COIN', W / 2, H * 0.95, 40, '#886699');
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      game.draw.clear(C.bg);
      txt(resultSuccess ? 'MEMORIZED!' : 'GAME OVER', W / 2, H * 0.35, 78, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (pressTimer > 0) pressTimer -= dt; if (pressTimer <= 0) pressedBtn = -1;
      if (phase === 'showing') {
        showTimer -= dt;
        if (showTimer <= 0) {
          if (!showOn) { litBtn = sequence[showIdx]; showOn = true; showTimer = SHOW_ON; game.audio.play('se_tap', 0.4); }
          else { litBtn = -1; showOn = false; showIdx++; if (showIdx >= sequence.length) { phase = 'input'; playerSeq = []; } else showTimer = SHOW_OFF; }
        }
      }
    }
    if (feedback > 0) feedback -= dt;

    // ---- 描画 ----
    game.draw.clear(C.bg);
    for (var bi2 = 0; bi2 < 4; bi2++) drawPad(bi2, litBtn === bi2 || pressedBtn === bi2);
    // 中央ラウンド表示
    game.draw.rect(CX - 60, CY - 60, 120, 120, '#0a0018', 0.9);
    txt(round + '', CX, CY - 12, 56, C.g);
    if (feedback > 0) game.draw.rect(0, 0, W, H, feedbackOk ? C.b : C.a, feedback * 0.15);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(phase === 'showing' ? 'WATCH!' : 'REPEAT ' + playerSeq.length + '/' + sequence.length, W / 2, 168, 44, phase === 'showing' ? C.c : C.b);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.25);
    state = S.ATTRACT;
    initGame();
  });
})(game);
