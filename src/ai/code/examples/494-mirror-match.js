// 494-mirror-match.js
// ミラーマッチ — 左のお手本パターンの「鏡像」を、右のグリッドにスワイプ/タップで再現する
// 操作: 右半分のマスをタップで塗り替え or スワイプでなぞって塗る（左右反転で一致させる）
// 成功: 3パターン 完成  失敗: 30秒 タイムアップ

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、鏡像ラボ） ──
  var C = { bg:'#0a0010', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'MIRROR MATCH';
  var HOW_TO_PLAY = 'PAINT THE RIGHT GRID AS A MIRROR OF THE LEFT';
  var MAX_TIME = 30;
  var NEEDED   = 3;          // 修正2: 8 → 3
  var GRID = 4, CELL = 180;
  var LOX = 40, ROX = W / 2 + 40, OY = snap(H * 0.30);

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var target, player, rounds, timeLeft, done, flash, particles, lastCell;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.d : '#120018');
  }

  function background() { game.draw.clear(C.bg); }

  function randPattern() {
    target = []; player = [];
    for (var r = 0; r < GRID; r++) { target.push([]); player.push([]); for (var c = 0; c < GRID; c++) { target[r].push(Math.random() < 0.45 ? 1 : 0); player[r].push(0); } }
  }

  function isComplete() { for (var r = 0; r < GRID; r++) for (var c = 0; c < GRID; c++) if (player[r][GRID - 1 - c] !== target[r][c]) return false; return true; }

  function initGame() { rounds = 0; timeLeft = MAX_TIME; done = false; flash = 0; particles = []; lastCell = null; randPattern(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (rounds * 900 + Math.ceil(timeLeft) * 100) : rounds * 300;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function paintCell(tx, ty, val) {
    var col = Math.floor((tx - ROX) / CELL), row = Math.floor((ty - OY) / CELL);
    if (col < 0 || col >= GRID || row < 0 || row >= GRID) return;
    var key = row + ',' + col; if (lastCell === key) return; lastCell = key;
    player[row][col] = val === undefined ? (player[row][col] ? 0 : 1) : val; game.audio.play('se_tap', 0.15);
    if (isComplete()) {
      rounds++; flash = 0.5; game.audio.play('se_success', 0.8);
      for (var pi = 0; pi < 12; pi++) { var a = Math.random() * Math.PI * 2; particles.push({ x: W / 2, y: OY + GRID * CELL / 2, vx: Math.cos(a) * 250, vy: Math.sin(a) * 250, life: 0.6, col: C.d }); }
      if (rounds >= NEEDED) { finish(true); return; }
      setTimeout(function() { if (!done) { randPattern(); lastCell = null; } }, 700);
    }
  }

  function drawGrids() {
    game.draw.rect(LOX - 8, OY - 8, GRID * CELL + 16, GRID * CELL + 16, '#120018', 0.9);
    game.draw.rect(ROX - 8, OY - 8, GRID * CELL + 16, GRID * CELL + 16, '#120018', 0.9);
    for (var r = 0; r < GRID; r++) for (var c = 0; c < GRID; c++) {
      var lx = LOX + c * CELL, ly = OY + r * CELL;
      game.draw.rect(lx + 6, ly + 6, CELL - 12, CELL - 12, target[r][c] ? C.d : '#1a0025', 0.9); if (target[r][c]) game.draw.rect(lx + 6, ly + 6, CELL - 12, 10, C.g, 0.2);
      var rx = ROX + c * CELL, ry = OY + r * CELL, needed = target[r][GRID - 1 - c], has = player[r][c];
      if (has) { game.draw.rect(rx + 6, ry + 6, CELL - 12, CELL - 12, has === needed ? C.b : C.a, 0.9); game.draw.rect(rx + 6, ry + 6, CELL - 12, 10, C.g, 0.2); }
      else game.draw.rect(rx + 6, ry + 6, CELL - 12, CELL - 12, '#1a0025', 0.9);
    }
    game.draw.rect(W / 2 - 3, OY - 20, 6, GRID * CELL + 40, C.d, 0.9);
    txt('MODEL', LOX + GRID * CELL / 2, OY - 30, 32, C.d); txt('COPY', ROX + GRID * CELL / 2, OY - 30, 32, C.b);
  }

  // ── 入力 ──
  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || tx < W / 2) return; lastCell = null; paintCell(tx, ty);
  });

  game.onSwipe(function(dir, x1, y1, x2, y2) {
    if (state !== S.PLAYING || done || x1 < W / 2) return;
    lastCell = null; for (var s = 0; s <= 20; s++) paintCell(x1 + (x2 - x1) * s / 20, y1 + (y2 - y1) * s / 20, 1);
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!target) initGame(); background(); drawGrids();
      txt(GAME_TITLE, W / 2, H * 0.14, 78, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.20, 22, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.95, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'REFLECTED!' : 'TIME UP', W / 2, H * 0.35, 66, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt * 3;
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawGrids();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 6, snap(particles[pp2].y) - 6, 12, 12, particles[pp2].col, particles[pp2].life * 1.5);
    if (flash > 0) game.draw.rect(0, 0, W, H, C.b, flash * 0.15);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(rounds + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.07);
    state = S.ATTRACT;
    initGame();
  });
})(game);
