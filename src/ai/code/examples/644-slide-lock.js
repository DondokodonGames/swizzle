// 644-slide-lock.js
// スライドロック — 各スロットのピンをタップで上下に動かし、緑の目標位置にそろえて開錠
// 操作: スロットのピンより上をタップで上へ、下をタップで下へ。全ピンを目標に合わせる
// 成功: 3錠 開錠  失敗: 手数超過 or 22秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（グリーンCRT、金庫室） ──
  var C = { bg:'#030a06', a:'#ff3300', b:'#00ff41', c:'#ffe600', d:'#00cc33', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'SLIDE LOCK';
  var HOW_TO_PLAY = 'TAP ABOVE OR BELOW EACH PIN TO SLIDE IT · ALIGN ALL PINS TO THE GREEN MARKS';
  var MAX_TIME = 22;
  var NEEDED   = 3;          // 修正2: 5 → 3
  var MAX_MOVES = 25;
  var NUM_PINS = 6, POSITIONS = 4, SLOT_W = 120, SLOT_H = 480, SLOT_GAP = 36, PIN_H = 120;
  var START_X = snap((W - (NUM_PINS * SLOT_W + (NUM_PINS - 1) * SLOT_GAP)) / 2), BOARD_Y = snap(H * 0.24);

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var pins, targets, moves, solvedCount, timeLeft, done, flash, flashCol, resultText, resultTimer, lock;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function arrow(cx, cy, size, dir, color) { cx = snap(cx); cy = snap(cy); for (var i = 0; i < size; i += 8) { var w = size - i; if (dir === 'up') game.draw.rect(cx - w / 2, cy - i - 8, w, 8, color); else game.draw.rect(cx - w / 2, cy + i, w, 8, color); } }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#04110a');
  }

  function background() { game.draw.clear(C.bg); }

  function genPuzzle() {
    pins = []; targets = [];
    for (var i = 0; i < NUM_PINS; i++) { targets.push(Math.floor(Math.random() * POSITIONS)); var p; do { p = Math.floor(Math.random() * POSITIONS); } while (p === targets[i]); pins.push(p); }
    moves = 0;
  }

  function initGame() { solvedCount = 0; timeLeft = MAX_TIME; done = false; flash = 0; flashCol = C.b; resultText = ''; resultTimer = 0; lock = false; genPuzzle(); }

  function checkSolved() { for (var i = 0; i < NUM_PINS; i++) if (pins[i] !== targets[i]) return false; return true; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (solvedCount * 700 + Math.ceil(timeLeft) * 100) : solvedCount * 200;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    for (var i = 0; i < NUM_PINS; i++) {
      var sx = START_X + i * (SLOT_W + SLOT_GAP), sy = BOARD_Y;
      game.draw.rect(sx + SLOT_W * 0.3, sy, SLOT_W * 0.4, SLOT_H, '#0f1f14', 0.8);
      var tY = sy + SLOT_H * (1 - targets[i] / (POSITIONS - 1)) - PIN_H / 2;
      game.draw.rect(sx + 4, tY, SLOT_W - 8, PIN_H, C.d, 0.35); game.draw.rect(sx + 4, tY, SLOT_W - 8, 6, C.b, 0.5);
      var pY = sy + SLOT_H * (1 - pins[i] / (POSITIONS - 1)) - PIN_H / 2, ok = pins[i] === targets[i];
      game.draw.rect(sx + 6, pY, SLOT_W - 12, PIN_H, ok ? C.b : C.f, 0.9); game.draw.rect(sx + 6, pY, SLOT_W - 12, 12, C.g, 0.4);
      arrow(sx + SLOT_W / 2, sy - 20, 26, 'up', pins[i] < POSITIONS - 1 ? C.b : '#33333355');
      arrow(sx + SLOT_W / 2, sy + SLOT_H + 20, 26, 'down', pins[i] > 0 ? C.b : '#33333355');
    }
    var lockY = BOARD_Y + SLOT_H + 100, allRight = checkSolved();
    game.draw.rect(W / 2 - 120, lockY, 240, 100, '#04110a', 0.9);
    pc(W / 2, lockY + 50, 34, allRight ? C.c : '#33333377', 0.9);
    txt(allRight ? 'OPEN' : 'LOCK', W / 2, lockY + 62, 34, allRight ? '#001008' : '#555555');
  }

  // ── 入力 ──
  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || lock) return;
    var pinIdx = -1;
    for (var i = 0; i < NUM_PINS; i++) { var slotX = START_X + i * (SLOT_W + SLOT_GAP); if (tx >= slotX && tx <= slotX + SLOT_W) { pinIdx = i; break; } }
    if (pinIdx < 0) return;
    var pinMidY = BOARD_Y + (SLOT_H * (1 - pins[pinIdx] / (POSITIONS - 1)));
    if (ty < pinMidY) { if (pins[pinIdx] < POSITIONS - 1) { pins[pinIdx]++; moves++; game.audio.play('se_tap', 0.15); } }
    else { if (pins[pinIdx] > 0) { pins[pinIdx]--; moves++; game.audio.play('se_tap', 0.15); } }
    if (checkSolved()) {
      solvedCount++; flash = 0.3; flashCol = C.b; resultText = 'UNLOCKED!'; resultTimer = 0.7; game.audio.play('se_success', 0.7);
      if (solvedCount >= NEEDED) { finish(true); return; }
      lock = true; setTimeout(function() { if (!done) { genPuzzle(); lock = false; } }, 600);
    } else if (moves >= MAX_MOVES) { finish(false); return; }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!pins) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.10, 78, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.145, 19, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) txt('► 100円 投入 ◄ TAP TO START', W / 2, H * 0.955, 40, C.a);
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'VAULT OPEN!' : 'JAMMED', W / 2, H * 0.35, 64, resultSuccess ? C.b : C.a);
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
    }

    // ---- 描画 ----
    background(); drawScene();
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.1);
    if (resultTimer > 0) txt(resultText, W / 2, snap(H * 0.92), 60, flashCol);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(solvedCount + ' / ' + NEEDED + '   MOVES ' + (MAX_MOVES - moves), W / 2, 158, 40, C.b);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    state = S.ATTRACT;
    initGame();
  });
})(game);
