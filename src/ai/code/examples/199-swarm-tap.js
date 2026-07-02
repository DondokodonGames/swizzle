// 199-swarm-tap.js
// スウォームタップ — 群れをなして逃げ回る小さな虫を指で追いかけて潰す快感
// 操作: タップで周囲の虫を潰す
// 成功: 8匹潰す  失敗: 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、夜の虫かご） ──
  var C = { bg:'#1a0028', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'SWARM TAP';
  var HOW_TO_PLAY = 'TAP TO SQUASH NEARBY BUGS';
  var MAX_TIME = 15;             // 修正2: 35 → 15
  var NEEDED   = 8;              // 修正2: 80 → 8
  var TOP    = 220, BOTTOM = H - 180;
  var TAP_R = 120, BUG_R = 20, BUG_SPEED = 180, NUM_BUGS = 40;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var bugs, splashes, score, timeLeft, done;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) {
    var step = 8; cx = snap(cx); cy = snap(cy);
    for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) {
      if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha);
    }
  }

  function ring(cx, cy, r, color, alpha) {
    for (var a = 0; a < Math.PI * 2; a += 0.12) game.draw.rect(snap(cx + Math.cos(a) * r) - 4, snap(cy + Math.sin(a) * r) - 4, 8, 8, color, alpha);
  }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#2a0a3a');
  }

  function background() { game.draw.clear(C.bg); }

  function drawBug(b) {
    var wx = Math.cos(b.wobble) * 4, wy = Math.sin(b.wobble * 1.3) * 3;
    pc(b.x + wx, b.y + wy, b.size, C.f, 0.9);
    pc(b.x + wx - b.size * 0.3, b.y + wy - b.size * 0.3, b.size * 0.3, C.c, 0.5);
    game.draw.rect(snap(b.x + wx) - b.size - 6, snap(b.y + wy) - 2, 6, 4, C.f);
    game.draw.rect(snap(b.x + wx) + b.size, snap(b.y + wy) - 2, 6, 4, C.f);
  }

  function initBugs() {
    bugs = [];
    for (var i = 0; i < NUM_BUGS; i++) {
      var ang = Math.random() * Math.PI * 2, sp = BUG_SPEED * (0.5 + Math.random() * 0.8);
      bugs.push({ x: snap(game.random(80, W - 80)), y: snap(game.random(TOP + 60, BOTTOM - 60)), vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, size: BUG_R * (0.8 + Math.random() * 0.5), wobble: Math.random() * Math.PI * 2 });
    }
  }

  function initGame() { initBugs(); splashes = []; score = 0; timeLeft = MAX_TIME; done = false; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (score * 200 + Math.ceil(timeLeft) * 30) : score * 60;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  // ── 入力 ──
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    var killed = 0;
    for (var bi = bugs.length - 1; bi >= 0; bi--) {
      var b = bugs[bi], dx = x - b.x, dy = y - b.y, dist = Math.hypot(dx, dy);
      if (dist < TAP_R) { bugs.splice(bi, 1); killed++; score++; }
      else if (dist < TAP_R * 2) { var flee = 1 - dist / (TAP_R * 2); b.vx -= dx / dist * BUG_SPEED * 2 * flee; b.vy -= dy / dist * BUG_SPEED * 2 * flee; }
    }
    if (killed > 0) {
      game.audio.play('se_tap', Math.min(1, 0.3 + killed * 0.1));
      splashes.push({ x: x, y: y, life: 0.5, killed: killed });
      if (score >= NEEDED) { finish(true); return; }
    } else game.audio.play('se_failure', 0.2);
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      background();
      for (var i = 0; i < 12; i++) drawBug({ x: W * (0.15 + (i % 4) * 0.23), y: H * (0.4 + Math.floor(i / 4) * 0.12), size: BUG_R, wobble: game.time.elapsed * 3 + i });
      txt(GAME_TITLE, W / 2, H * 0.14, 84, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.22, 30, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.82, 62, C.a);
        txt('TAP TO START', W / 2, H * 0.88, 48, C.g);
      }
      txt('INSERT COIN', W / 2, H * 0.94, 40, '#886699');
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'SQUASHED!' : 'TIME OUT', W / 2, H * 0.35, 78, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      for (var bi = 0; bi < bugs.length; bi++) {
        var b = bugs[bi];
        b.wobble += dt * 4;
        if (Math.random() < dt * 0.5) { var na = Math.random() * Math.PI * 2; b.vx += Math.cos(na) * BUG_SPEED * 0.3; b.vy += Math.sin(na) * BUG_SPEED * 0.3; }
        var spd = Math.hypot(b.vx, b.vy); if (spd > BUG_SPEED * 2) { b.vx = b.vx / spd * BUG_SPEED * 2; b.vy = b.vy / spd * BUG_SPEED * 2; }
        b.x += b.vx * dt; b.y += b.vy * dt;
        if (b.x < 20) { b.x = 20; b.vx = Math.abs(b.vx); } if (b.x > W - 20) { b.x = W - 20; b.vx = -Math.abs(b.vx); }
        if (b.y < TOP + 20) { b.y = TOP + 20; b.vy = Math.abs(b.vy); } if (b.y > BOTTOM - 20) { b.y = BOTTOM - 20; b.vy = -Math.abs(b.vy); }
        b.vx *= Math.pow(0.96, dt * 60); b.vy *= Math.pow(0.96, dt * 60);
      }
    }
    for (var si = splashes.length - 1; si >= 0; si--) { splashes[si].life -= dt; if (splashes[si].life <= 0) splashes.splice(si, 1); }

    // ---- 描画 ----
    background();
    for (var bi3 = 0; bi3 < bugs.length; bi3++) drawBug(bugs[bi3]);
    for (var si2 = 0; si2 < splashes.length; si2++) { var s = splashes[si2]; ring(s.x, s.y, TAP_R * (1 - s.life * 0.5), C.b, s.life * 0.6); if (s.killed > 1) txt('+' + s.killed, s.x, s.y - 30, 48, C.c); }

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(score + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    txt('BUGS ' + bugs.length, W / 2, H - 120, 40, C.f);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.25);
    state = S.ATTRACT;
    initGame();
  });
})(game);
