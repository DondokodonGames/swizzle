// 223-echo-pattern.js
// エコーパターン — 光ったパネルの順番を記憶し、同じ順でなぞり返す記憶反復ゲーム
// 操作: 光った順にパネルをタップ
// 成功: 3ラウンドクリア  失敗: 順番を間違える

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、記憶端末） ──
  var C = { bg:'#060408', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var PADCOL = [C.a, C.b, C.e, C.c];

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'ECHO PATTERN';
  var HOW_TO_PLAY = 'WATCH THE FLASHES · REPEAT THE ORDER';
  var NEEDED   = 3;           // 修正2: 10 → 3
  var TOP = 320, PAD = snap(W / 2 - 24);
  var PADS = [
    { x: 16, y: TOP, w: PAD, h: PAD, ci: 0 },
    { x: snap(W / 2 + 8), y: TOP, w: PAD, h: PAD, ci: 1 },
    { x: 16, y: TOP + PAD + 16, w: PAD, h: PAD, ci: 2 },
    { x: snap(W / 2 + 8), y: TOP + PAD + 16, w: PAD, h: PAD, ci: 3 }
  ];

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var sequence, playerSeq, round, phase, showIdx, showTimer, showOn, litPad, done, transTimer, feedback, feedbackOk;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function roundBar() {
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < Math.ceil(round / NEEDED * 12) ? C.b : '#1a0a20');
  }

  function background() { game.draw.clear(C.bg); }

  function drawPads() {
    for (var pi = 0; pi < PADS.length; pi++) {
      var p = PADS[pi], lit = pi === litPad;
      game.draw.rect(p.x, p.y, p.w, p.h, PADCOL[p.ci], lit ? 0.95 : 0.22);
      game.draw.rect(p.x, p.y, p.w, 12, C.g, lit ? 0.6 : 0.2);
      if (lit) for (var q = 0; q < p.w; q += 16) game.draw.rect(p.x + q, p.y, 8, p.h, C.g, 0.1);
    }
  }

  function nextRound() { sequence.push(Math.floor(Math.random() * 4)); playerSeq = []; round++; phase = 'showing'; showIdx = 0; showOn = true; showTimer = 0.4; litPad = -1; }

  function initGame() { sequence = []; playerSeq = []; round = 0; phase = 'showing'; showIdx = 0; showTimer = 0.4; showOn = true; litPad = -1; done = false; transTimer = 0; feedback = 0; feedbackOk = false; nextRound(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (round * 500 + 300) : (round - 1) * 200;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  // ── 入力 ──
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || phase !== 'player') return;
    for (var pi = 0; pi < PADS.length; pi++) {
      var p = PADS[pi];
      if (x >= p.x && x < p.x + p.w && y >= p.y && y < p.y + p.h) {
        playerSeq.push(pi); litPad = pi; setTimeout(function() { litPad = -1; }, 180);
        var idx = playerSeq.length - 1;
        if (playerSeq[idx] !== sequence[idx]) { feedbackOk = false; feedback = 0.5; finish(false); return; }
        game.audio.play('se_tap', 0.5);
        if (playerSeq.length === sequence.length) {
          feedbackOk = true; feedback = 0.4; game.audio.play('se_success', 0.6);
          if (round >= NEEDED) { finish(true); return; }
          phase = 'transition'; transTimer = 0.8;
        }
        break;
      }
    }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      background(); litPad = Math.floor(game.time.elapsed * 2) % 4; drawPads();
      txt(GAME_TITLE, W / 2, H * 0.14, 80, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.22, 28, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.95, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'FLAWLESS!' : 'WRONG!', W / 2, H * 0.35, 82, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      if (feedback > 0) feedback -= dt;
      if (phase === 'showing') {
        showTimer -= dt;
        if (showTimer <= 0) {
          if (showOn) { litPad = sequence[showIdx]; game.audio.play('se_tap', 0.4); showOn = false; showTimer = 0.5; }
          else { litPad = -1; showIdx++; if (showIdx >= sequence.length) { phase = 'player'; litPad = -1; } else { showOn = true; showTimer = 0.2; } }
        }
      } else if (phase === 'transition') { transTimer -= dt; if (transTimer <= 0) nextRound(); }
    }

    // ---- 描画 ----
    background(); drawPads();
    var statusY = TOP + PAD * 2 + 90;
    if (phase === 'showing') txt('WATCH', W / 2, statusY, 56, C.c);
    else if (phase === 'player') txt('REPEAT  ' + playerSeq.length + ' / ' + sequence.length, W / 2, statusY, 50, C.b);
    else txt('CORRECT!', W / 2, statusY, 56, C.b);
    if (feedback > 0) game.draw.rect(0, 0, W, H, feedbackOk ? C.b : C.a, feedback * 0.12);

    roundBar();
    txt('ROUND ' + round + ' / ' + NEEDED, W / 2, 100, 44, C.g);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.2);
    state = S.ATTRACT;
    initGame();
  });
})(game);
