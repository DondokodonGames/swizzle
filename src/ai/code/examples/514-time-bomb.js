// 514-time-bomb.js
// タイムボム — カウントダウン中の爆弾を、指示された順番でワイヤーボタンをタップして解除する
// 操作: 「CUT ORDER」の色の順にワイヤーボタンをタップ（順番を間違えると即爆発）
// 成功: 3個 解除  失敗: 1回でも誤爆 or 30秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（グリーンCRT、爆発物処理） ──
  var C = { bg:'#000a00', a:'#ff3300', b:'#00ff41', c:'#ffe600', d:'#00cc33', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var WIRE_COLS = [C.a, C.e, C.b, C.c, C.f];
  var WIRE_NAMES = ['RED', 'BLU', 'GRN', 'YEL', 'ORG'];

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'TIME BOMB';
  var HOW_TO_PLAY = 'CUT THE WIRES IN THE ORDER SHOWN · ONE MISTAKE AND BOOM';
  var MAX_TIME = 30;
  var NEEDED   = 3;          // 修正2: 5 → 3
  var WIRE_COUNT = 4;
  var BTN_W = 420, BTN_H = 110, BOX = snap((W - 420) / 2), BOY = snap(H * 0.52), GAP = 24;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var bombs, sequence, cutIdx, cutWires, wireOrder, bombTimer, timeLeft, done, particles, flash, flashCol;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#1a0000');
  }

  function background() { game.draw.clear(C.bg); }

  function newBomb() {
    wireOrder = [0, 1, 2, 3].sort(function() { return Math.random() - 0.5; });
    var seqLen = 2 + Math.floor(Math.random() * 2), avail = wireOrder.slice(); sequence = [];
    for (var i = 0; i < seqLen && avail.length > 0; i++) { var pick = Math.floor(Math.random() * avail.length); sequence.push(avail[pick]); avail.splice(pick, 1); }
    cutIdx = 0; cutWires = [false, false, false, false]; bombTimer = 12;
  }

  function initGame() { bombs = 0; timeLeft = MAX_TIME; done = false; particles = []; flash = 0; flashCol = C.b; newBomb(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (bombs * 1000 + Math.ceil(timeLeft) * 100) : bombs * 400;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function boom() { flash = 0.8; flashCol = C.a; game.audio.play('se_failure', 0.9); for (var pi = 0; pi < 20; pi++) { var a = Math.random() * Math.PI * 2; particles.push({ x: W / 2, y: H * 0.30, vx: Math.cos(a) * 300, vy: Math.sin(a) * 300, life: 0.7, col: C.a }); } finish(false); }

  function drawBomb() {
    var secs = Math.ceil(bombTimer);
    game.draw.rect(W / 2 - 200, H * 0.14, 400, 200, '#1a0000', 0.95);
    game.draw.rect(W / 2 - 100, H * 0.18, 200, 80, '#001a00', 0.95);
    txt(secs + '', W / 2, H * 0.235, 72, bombTimer < 5 ? C.a : C.b);
    // CUT ORDER
    txt('CUT ORDER', W / 2, H * 0.42, 34, C.d);
    for (var si = 0; si < sequence.length; si++) { var x = W / 2 - (sequence.length - 1) * 90 + si * 180; txt(si < cutIdx ? 'OK' : WIRE_NAMES[sequence[si]], x, H * 0.47, 40, si < cutIdx ? C.d : WIRE_COLS[sequence[si]]); }
    for (var bi = 0; bi < WIRE_COUNT; bi++) {
      var bx = BOX, by = BOY + bi * (BTN_H + GAP), wi = wireOrder[bi], cut = cutWires[wi];
      game.draw.rect(bx + 4, by + 4, BTN_W - 8, BTN_H - 8, cut ? '#204020' : WIRE_COLS[wi], cut ? 0.4 : 0.9);
      game.draw.rect(bx + 4, by + 4, BTN_W - 8, 10, C.g, cut ? 0.05 : 0.2);
      txt(cut ? 'CUT' : WIRE_NAMES[wi], bx + BTN_W / 2, by + BTN_H / 2 + 16, 44, cut ? '#406040' : C.bg);
    }
  }

  // ── 入力 ──
  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    for (var bi = 0; bi < WIRE_COUNT; bi++) {
      var bx = BOX, by = BOY + bi * (BTN_H + GAP);
      if (tx >= bx && tx <= bx + BTN_W && ty >= by && ty <= by + BTN_H) {
        var wi = wireOrder[bi]; if (cutWires[wi]) return;
        if (wi === sequence[cutIdx]) {
          cutWires[wi] = true; cutIdx++; game.audio.play('se_tap', 0.5);
          for (var pi = 0; pi < 6; pi++) { var a = Math.random() * Math.PI * 2; particles.push({ x: bx + BTN_W / 2, y: by + BTN_H / 2, vx: Math.cos(a) * 120, vy: Math.sin(a) * 120, life: 0.35, col: WIRE_COLS[wi] }); }
          if (cutIdx >= sequence.length) { bombs++; flash = 0.5; flashCol = C.b; game.audio.play('se_success', 0.8); if (bombs >= NEEDED) { finish(true); return; } setTimeout(function() { if (!done) newBomb(); }, 600); }
        } else boom();
        return;
      }
    }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!sequence) initGame(); background(); drawBomb();
      txt(GAME_TITLE, W / 2, H * 0.08, 76, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.115, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) txt('► 100円 投入 ◄ TAP TO START', W / 2, H * 0.95, 40, C.a);
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'DEFUSED!' : 'BOOM!', W / 2, H * 0.35, 80, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt; bombTimer -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (bombTimer <= 0) { boom(); return; }
      if (flash > 0) flash -= dt * 3;
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawBomb();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 6, snap(particles[pp2].y) - 6, 12, 12, particles[pp2].col, particles[pp2].life * 1.5);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.2);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(bombs + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.06);
    state = S.ATTRACT;
    initGame();
  });
})(game);
