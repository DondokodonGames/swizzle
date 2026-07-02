// 246-color-memory.js
// カラーメモリー — 一瞬光る色パネルの並びを記憶し、同じ順にタップして再現する記憶ゲーム
// 操作: 光った順に色パネルをタップ
// 成功: 3ラウンドクリア  失敗: 2回ミス or 30秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、記憶パネル） ──
  var C = { bg:'#050508', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var PANELS = [
    { col: C.a, name: 'R' }, { col: C.e, name: 'B' }, { col: C.b, name: 'G' },
    { col: C.c, name: 'Y' }, { col: C.d, name: 'P' }, { col: C.f, name: 'O' }
  ];

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'COLOR MEMORY';
  var HOW_TO_PLAY = 'WATCH THE FLASHES · REPEAT THE ORDER';
  var MAX_TIME = 30;
  var NEEDED   = 3;           // 修正2: 8 → 3
  var MAX_MISS = 2;
  var PW = snap((W - 80) / 3), PH = 240, PM = 20, PY0 = snap(H * 0.44);

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var phase, sequence, round, inputIdx, showIdx, showTimer, misses, timeLeft, done, flash, flashCol, hi, hiTimer;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function roundBar() { for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < Math.ceil(round / NEEDED * 12) ? C.b : '#1a1a2a'); }

  function background() { game.draw.clear(C.bg); }

  function panelXY(idx) { var col = idx % 3, row = Math.floor(idx / 3); return { x: 40 + col * (PW + PM), y: PY0 + row * (PH + PM) }; }

  function panelAt(x, y) { for (var i = 0; i < 6; i++) { var p = panelXY(i); if (x >= p.x && x < p.x + PW && y >= p.y && y < p.y + PH) return i; } return -1; }

  function drawPanels() {
    for (var i = 0; i < 6; i++) {
      var p = panelXY(i), lit = (phase === 'show' && showIdx >= 0 && sequence[showIdx] === i) || (hi === i && hiTimer > 0);
      game.draw.rect(p.x, p.y, PW, PH, PANELS[i].col, lit ? 1 : 0.3);
      game.draw.rect(p.x, p.y, PW, 8, C.g, lit ? 0.6 : 0.2);
      txt(PANELS[i].name, p.x + PW / 2, p.y + PH / 2 + 18, 60, '#000');
    }
  }

  function startRound() { round++; sequence = []; var len = 1 + round; for (var i = 0; i < len; i++) sequence.push(Math.floor(Math.random() * 6)); phase = 'show'; showIdx = -1; showTimer = 0.6; inputIdx = 0; }

  function initGame() { round = 0; misses = 0; timeLeft = MAX_TIME; done = false; flash = 0; flashCol = C.b; hi = -1; hiTimer = 0; startRound(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (round * 500 + (misses === 0 ? 500 : 0)) : (round - 1) * 200;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  // ── 入力 ──
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || phase !== 'input') return;
    var idx = panelAt(x, y); if (idx < 0) return;
    hi = idx; hiTimer = 0.2;
    if (idx === sequence[inputIdx]) {
      game.audio.play('se_tap', 0.4); inputIdx++;
      if (inputIdx >= sequence.length) { flash = 0.3; flashCol = C.b; game.audio.play('se_success', 0.6); if (round >= NEEDED) { finish(true); return; } phase = 'wait'; setTimeout(function() { if (!done && state === S.PLAYING) startRound(); }, 700); }
    } else { misses++; flash = 0.4; flashCol = C.a; game.audio.play('se_failure', 0.5); if (misses >= MAX_MISS) { finish(false); return; } phase = 'wait'; setTimeout(function() { if (!done && state === S.PLAYING) startRound(); }, 700); }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      background(); phase = 'attract'; hi = Math.floor(game.time.elapsed * 2) % 6; hiTimer = 1; drawPanels();
      txt(GAME_TITLE, W / 2, H * 0.16, 74, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.24, 26, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.95, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'PERFECT RECALL!' : 'FORGOTTEN', W / 2, H * 0.35, 58, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt; if (hiTimer > 0) hiTimer -= dt;
      if (phase === 'show') { showTimer -= dt; if (showTimer <= 0) { showIdx++; if (showIdx >= sequence.length) { phase = 'input'; showIdx = -1; } else { showTimer = 0.6; game.audio.play('se_tap', 0.25); } } }
    }

    // ---- 描画 ----
    background();
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.3);
    drawPanels();
    if (phase === 'show') txt('WATCH', W / 2, H * 0.36, 56, C.c);
    else if (phase === 'input') txt('REPEAT  ' + inputIdx + ' / ' + sequence.length, W / 2, H * 0.36, 48, C.b);

    roundBar();
    txt('ROUND ' + round + ' / ' + NEEDED, W / 2, 100, 44, C.g);
    for (var mm = 0; mm < MAX_MISS; mm++) game.draw.rect(snap(W / 2 + (mm - (MAX_MISS - 1) / 2) * 56) - 10, 168, 20, 20, mm < misses ? C.a : '#1a1a2a');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.2);
    state = S.ATTRACT;
    initGame();
  });
})(game);
