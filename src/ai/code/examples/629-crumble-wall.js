// 629-crumble-wall.js
// クランブルウォール — 崩れながら迫る壁の穴の列へ、左右移動でプレイヤーを合わせて通す
// 操作: 左右スワイプ/画面タップで列移動。壁の空いた穴の列にいれば通過、外れると衝突
// 成功: 12枚 突破  失敗: 3回 衝突 or 18秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、崩落壁） ──
  var C = { bg:'#080404', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'CRUMBLE WALL';
  var HOW_TO_PLAY = 'SWIPE OR TAP LEFT/RIGHT TO LINE UP WITH THE GAP · SLIP THROUGH EACH WALL';
  var MAX_TIME = 18;
  var NEEDED   = 12;         // 修正2: 20 → 12
  var MAX_HITS = 3;          // 修正2: 5 → 3
  var PLAYER_Y = snap(H * 0.74), PLAYER_R = 34, COLS = 5, COL_W = W / COLS, WALL_H = 70;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var playerCol, targetCol, walls, passed, hits, timeLeft, done, particles, flash, spawnTimer, wallSpeed, invincible;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.f : '#1a0a06');
  }

  function background() { game.draw.clear(C.bg); for (var ci = 1; ci < COLS; ci++) game.draw.rect(snap(ci * COL_W) - 1, 0, 2, H, '#1a0a06', 0.5); }

  function spawnWall() {
    var holeCount = timeLeft > MAX_TIME - 6 ? 2 : 1, holes = [], available = [0, 1, 2, 3, 4];
    for (var i = 0; i < holeCount; i++) { var idx = Math.floor(Math.random() * available.length); holes.push(available.splice(idx, 1)[0]); }
    walls.push({ y: -WALL_H, holes: holes, crumble: 0 });
  }

  function initGame() { playerCol = 2; targetCol = 2; walls = []; passed = 0; hits = 0; timeLeft = MAX_TIME; done = false; particles = []; flash = 0; spawnTimer = 0; wallSpeed = 300; invincible = 0; spawnWall(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (passed * 400 + Math.ceil(timeLeft) * 100) : passed * 120;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    for (var wi = 0; wi < walls.length; wi++) {
      var w = walls[wi], shake = w.crumble > 0.5 ? (Math.random() - 0.5) * w.crumble * 8 : 0;
      for (var ci = 0; ci < COLS; ci++) {
        var isHole = false;
        for (var hi = 0; hi < w.holes.length; hi++) if (w.holes[hi] === ci) { isHole = true; break; }
        if (!isHole) { var wx = ci * COL_W + shake; game.draw.rect(snap(wx) + 4, snap(w.y), COL_W - 8, WALL_H, '#5a2a1a', 0.9 - w.crumble * 0.4); game.draw.rect(snap(wx) + 4, snap(w.y), COL_W - 8, 8, C.f, 0.5); }
      }
    }
    var px = COL_W * playerCol + COL_W / 2;
    var pa = (invincible > 0 && Math.floor(game.time.elapsed * 10) % 2 === 0) ? 0.3 : 0.9;
    pc(px, PLAYER_Y, PLAYER_R, C.e, pa); pc(px - 10, PLAYER_Y - 10, PLAYER_R * 0.3, C.g, pa * 0.6);
  }

  function moveTo(col) { targetCol = col; game.audio.play('se_tap', 0.15); }

  // ── 入力 ──
  game.onSwipe(function(dir) {
    if (state !== S.PLAYING || done) return;
    if (dir === 'left' && targetCol > 0) moveTo(targetCol - 1); else if (dir === 'right' && targetCol < COLS - 1) moveTo(targetCol + 1);
  });

  game.onTap(function(tx) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    moveTo(Math.max(0, Math.min(COLS - 1, Math.floor(tx / COL_W))));
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!walls) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.12, 78, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.165, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 56, C.a);
        txt('TAP TO START', W / 2, H * 0.94, 42, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'BROKE THROUGH!' : 'CRUSHED', W / 2, H * 0.35, 56, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(true); return; }
      if (flash > 0) flash -= dt * 4; if (invincible > 0) invincible -= dt;
      playerCol += (targetCol - playerCol) * Math.min(1, dt * 12);
      wallSpeed = 300 + (MAX_TIME - timeLeft) * 8 + passed * 5;
      spawnTimer += dt; if (spawnTimer > 1.1) { spawnTimer = 0; spawnWall(); }
      var px = COL_W * playerCol + COL_W / 2;
      for (var wi = walls.length - 1; wi >= 0; wi--) {
        var w = walls[wi]; w.y += wallSpeed * dt; w.crumble = Math.max(0, Math.min(1, (w.y - H * 0.5) / 200));
        if (invincible <= 0 && w.y + WALL_H >= PLAYER_Y - PLAYER_R && w.y <= PLAYER_Y + PLAYER_R) {
          var exactCol = px / COL_W - 0.5, inHole = false;
          for (var hi = 0; hi < w.holes.length; hi++) if (Math.abs(exactCol - w.holes[hi]) < 0.45) { inHole = true; break; }
          if (!inHole) {
            hits++; invincible = 0.8; flash = 0.4; game.audio.play('se_failure', 0.5);
            for (var p = 0; p < 8; p++) { var a = Math.random() * Math.PI * 2; particles.push({ x: px, y: PLAYER_Y, vx: Math.cos(a) * 200, vy: Math.sin(a) * 200, life: 0.4, col: C.e }); }
            if (hits >= MAX_HITS) { finish(false); return; }
          }
        }
        if (w.y > H + WALL_H) { walls.splice(wi, 1); passed++; if (passed >= NEEDED) { finish(true); return; } }
      }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p2 = particles[pp]; p2.x += p2.vx * dt; p2.y += p2.vy * dt; p2.vy += 400 * dt; p2.life -= dt * 2; if (p2.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    if (flash > 0) game.draw.rect(0, 0, W, H, C.a, flash * 0.1);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(passed + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var hi4 = 0; hi4 < MAX_HITS; hi4++) game.draw.rect(snap(W / 2 + (hi4 - (MAX_HITS - 1) / 2) * 56) - 10, 224, 20, 20, hi4 < hits ? C.a : '#1a0a06');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.06);
    state = S.ATTRACT;
    initGame();
  });
})(game);
