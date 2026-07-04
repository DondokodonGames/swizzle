// 632-shadow-puppet.js
// ハンドシャドウ — 4方向のゾーンをタップで手の形を作り、お手本の影絵と一致させる
// 操作: 上下左右のゾーンをタップでON/OFF切替 → 中央の決定を押して判定
// 成功: 8形 一致  失敗: 3形 ミス or 22秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、影絵劇場） ──
  var C = { bg:'#060408', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'HAND SHADOW';
  var HOW_TO_PLAY = 'TAP THE 4 ZONES TO SHAPE YOUR HAND · MATCH THE TARGET · TAP CENTER TO LOCK';
  var MAX_TIME = 22;
  var NEEDED    = 8;         // 修正2: 15 → 8
  var MAX_WRONG = 3;         // 修正2: 5 → 3
  var SHAPE_TIME = 4;

  var SHAPES = [
    { name: 'SCISSORS', zones: [true, false, true, false] },
    { name: 'ROCK', zones: [false, false, false, false] },
    { name: 'PAPER', zones: [true, true, true, true] },
    { name: 'BIRD', zones: [true, true, false, true] },
    { name: 'DOG', zones: [true, false, true, true] },
    { name: 'MOTH', zones: [false, true, true, false] },
    { name: 'RABBIT', zones: [true, true, false, false] },
    { name: 'FISH', zones: [false, false, true, true] }
  ];

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var currentShape, playerZones, correct, wrong, timeLeft, done, flash, flashCol, shapeTimer, resultText, resultTimer;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.d : '#130d1a');
  }

  function background() { game.draw.clear(C.bg); }

  function nextShape() { currentShape = SHAPES[Math.floor(Math.random() * SHAPES.length)]; playerZones = [false, false, false, false]; shapeTimer = SHAPE_TIME; }

  function initGame() { correct = 0; wrong = 0; timeLeft = MAX_TIME; done = false; flash = 0; flashCol = C.b; resultText = ''; resultTimer = 0; nextShape(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (correct * 500 + Math.ceil(timeLeft) * 80) : correct * 150;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawHand(cx, cy, zones, col) {
    game.draw.rect(cx - 60, cy - 60, 120, 120, col, 0.9);
    if (zones[0]) game.draw.rect(cx - 28, cy - 180, 56, 120, col, 0.85);
    if (zones[1]) game.draw.rect(cx - 180, cy - 40, 120, 80, col, 0.85);
    if (zones[2]) game.draw.rect(cx + 60, cy - 40, 120, 80, col, 0.85);
    if (zones[3]) game.draw.rect(cx - 28, cy + 60, 56, 120, col, 0.85);
  }

  function checkMatch() {
    var ok = true;
    for (var i = 0; i < 4; i++) if (playerZones[i] !== currentShape.zones[i]) { ok = false; break; }
    if (ok) { correct++; flash = 0.25; flashCol = C.b; resultText = 'MATCH!'; resultTimer = 0.5; game.audio.play('se_success', 0.5); if (correct >= NEEDED) { finish(true); return; } }
    else { wrong++; flash = 0.3; flashCol = C.a; resultText = 'MISS!'; resultTimer = 0.5; game.audio.play('se_failure', 0.3); if (wrong >= MAX_WRONG) { finish(false); return; } }
    if (!done) setTimeout(nextShape, 400);
  }

  function drawScene() {
    var CXp = W * 0.30, CY = H * 0.46;
    drawHand(CXp, CY, currentShape.zones, C.d);
    txt(currentShape.name, CXp, snap(CY - 240), 42, C.e);
    var CXq = W * 0.70;
    drawHand(CXq, CY, playerZones, C.c);
    txt('YOU', CXq, snap(CY - 240), 42, C.c);
    // zone hints
    txt('TAP', W / 2, snap(H * 0.20), 30, playerZones[0] ? C.c : '#ffffff55');
    txt('TAP', W * 0.14, snap(H * 0.46), 30, playerZones[1] ? C.c : '#ffffff55');
    txt('TAP', W * 0.86, snap(H * 0.46), 30, playerZones[2] ? C.c : '#ffffff55');
    txt('TAP', W / 2, snap(H * 0.72), 30, playerZones[3] ? C.c : '#ffffff55');
    // confirm
    game.draw.rect(W / 2 - 170, snap(H * 0.82), 340, 84, C.d, 0.7);
    txt('LOCK (CENTER)', W / 2, snap(H * 0.82) + 52, 32, C.g);
    // shape timer
    var tr = Math.max(0, shapeTimer / SHAPE_TIME);
    game.draw.rect(W / 2 - 200, snap(H * 0.90), 400, 16, '#130d1a', 0.8);
    game.draw.rect(W / 2 - 200, snap(H * 0.90), 400 * tr, 16, tr > 0.4 ? C.d : C.a, 0.9);
  }

  // ── 入力 ──
  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    // center confirm zone
    if (ty >= H * 0.82 && ty <= H * 0.82 + 84 && tx >= W / 2 - 170 && tx <= W / 2 + 170) { checkMatch(); return; }
    var zone = -1;
    if (ty < H * 0.30) zone = 0; else if (ty > H * 0.70 && ty < H * 0.82) zone = 3; else if (ty >= H * 0.30 && ty <= H * 0.70) { zone = tx < W / 2 ? 1 : 2; }
    if (zone >= 0) { playerZones[zone] = !playerZones[zone]; game.audio.play('se_tap', 0.1); }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!currentShape) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.08, 78, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.12, 19, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.955, 46, C.a);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'SHADOW ARTIST!' : 'MISMATCH', W / 2, H * 0.35, 56, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt * 3; if (resultTimer > 0) resultTimer -= dt;
      shapeTimer -= dt;
      if (shapeTimer <= 0) { wrong++; flash = 0.25; flashCol = C.a; resultText = 'TIME UP'; resultTimer = 0.4; game.audio.play('se_failure', 0.25); if (wrong >= MAX_WRONG) { finish(false); return; } if (!done) nextShape(); }
    }

    // ---- 描画 ----
    background(); drawScene();
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.08);
    if (resultTimer > 0) txt(resultText, W / 2, snap(H * 0.46), 76, flashCol);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(correct + ' / ' + NEEDED, W / 2, 158, 44, C.b);
    for (var wi = 0; wi < MAX_WRONG; wi++) game.draw.rect(snap(W / 2 + (wi - (MAX_WRONG - 1) / 2) * 56) - 10, 210, 20, 20, wi < wrong ? C.a : '#130d1a');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    state = S.ATTRACT;
    initGame();
  });
})(game);
