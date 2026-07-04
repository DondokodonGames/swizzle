// 653-quake-run.js
// クエイクラン — 地震で崩れる足場を走り、タップジャンプで裂け目を飛び越えて進む
// 操作: 画面上半分タップ（または上スワイプ）でジャンプ、下半分タップでダッシュ加速
// 成功: 200m 走破  失敗: 3回 落下 or 18秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、崩壊都市） ──
  var C = { bg:'#080400', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'QUAKE RUN';
  var HOW_TO_PLAY = 'TAP UPPER HALF (OR SWIPE UP) TO JUMP THE CRACKS · TAP LOWER TO DASH';
  var MAX_TIME = 18;
  var NEEDED_DIST = 200;     // 修正2: 500 → 200
  var MAX_FELL = 3;          // 修正2: 5 → 3
  var PLAYER_X = W * 0.25, PLAYER_R = 36, GROUND_Y = snap(H * 0.74), JUMP_POWER = -900, GRAVITY = 1800;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var playerY, playerVY, onGround, segments, scrollX, scrollSpeed, distance, fell, timeLeft, done, particles, flash, quakeAmt, quakeTimer;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.f : '#150800');
  }

  function background() { game.draw.clear(C.bg); }

  function genSegment(x) { var isGap = Math.random() < 0.22 + (MAX_TIME - timeLeft) * 0.006, width = isGap ? (80 + Math.random() * 80) : (180 + Math.random() * 200); segments.push({ x: x, w: width, isGap: isGap }); return x + width; }

  function initTrack() { segments = []; segments.push({ x: 0, w: 600, isGap: false }); var x = 600; for (var i = 0; i < 20; i++) x = genSegment(x); }

  function initGame() { playerY = GROUND_Y - PLAYER_R; playerVY = 0; onGround = true; scrollX = 0; scrollSpeed = 300; distance = 0; fell = 0; timeLeft = MAX_TIME; done = false; particles = []; flash = 0; quakeAmt = 0; quakeTimer = 3; initTrack(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (Math.floor(distance) * 20 + Math.ceil(timeLeft) * 100) : Math.floor(distance) * 10;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene(shake) {
    game.draw.rect(0, 0, W, H * 0.72, '#0c0a00', 0.7);
    for (var si = 0; si < segments.length; si++) {
      var seg = segments[si]; if (seg.isGap) continue; var sx = seg.x - scrollX, sy = GROUND_Y + shake;
      game.draw.rect(sx, sy, seg.w, H - sy, '#78350f', 0.85); game.draw.rect(sx, sy, seg.w, 16, C.f, 0.5);
    }
    pc(PLAYER_X, playerY + shake, PLAYER_R, C.b, 0.9); pc(PLAYER_X - 10, playerY + shake - 10, PLAYER_R * 0.3, C.g, 0.5);
  }

  // ── 入力 ──
  game.onSwipe(function(dir) {
    if (state !== S.PLAYING || done) return;
    if (dir === 'up' && onGround) { playerVY = JUMP_POWER * 1.2; onGround = false; game.audio.play('se_tap', 0.2); }
  });

  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    if (onGround) { if (ty < H * 0.6) { playerVY = JUMP_POWER; onGround = false; game.audio.play('se_tap', 0.15); } else scrollSpeed = Math.min(700, scrollSpeed + 80); }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!segments) initGame(); background(); drawScene(0);
      txt(GAME_TITLE, W / 2, H * 0.12, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.165, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) txt('► 100円 投入 ◄ TAP TO START', W / 2, H * 0.30, 40, C.a);
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'ESCAPED!' : 'SWALLOWED', W / 2, H * 0.35, 64, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    var shake = 0;
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(true); return; }
      if (flash > 0) flash -= dt * 4;
      quakeTimer -= dt; if (quakeTimer <= 0) { quakeTimer = 2 + Math.random() * 3; quakeAmt = 8 + Math.random() * 12; game.audio.play('se_failure', 0.1); }
      quakeAmt *= (1 - dt * 4); shake = (Math.random() - 0.5) * quakeAmt;
      scrollSpeed = Math.max(300, scrollSpeed - dt * 60); scrollX += scrollSpeed * dt; distance += scrollSpeed * dt / 100;
      var lastSeg = segments[segments.length - 1];
      while (lastSeg && lastSeg.x + lastSeg.w - scrollX < W + 200) { genSegment(lastSeg.x + lastSeg.w); lastSeg = segments[segments.length - 1]; }
      while (segments.length > 0 && segments[0].x + segments[0].w < scrollX - 100) segments.shift();
      if (!onGround) { playerVY += GRAVITY * dt; playerY += playerVY * dt; }
      var pax = scrollX + PLAYER_X, gf = false;
      for (var si = 0; si < segments.length; si++) { var seg = segments[si]; if (seg.isGap) continue; if (pax + PLAYER_R > seg.x && pax - PLAYER_R < seg.x + seg.w) { if (playerY + PLAYER_R >= GROUND_Y && playerVY >= 0) { playerY = GROUND_Y - PLAYER_R; playerVY = 0; onGround = true; gf = true; } break; } }
      if (!gf && playerY > GROUND_Y - PLAYER_R) onGround = false;
      if (playerY > H) {
        fell++; flash = 0.5; game.audio.play('se_failure', 0.4);
        for (var p = 0; p < 6; p++) { var pa = Math.random() * Math.PI * 2; particles.push({ x: PLAYER_X, y: GROUND_Y, vx: Math.cos(pa) * 200, vy: Math.sin(pa) * 200, life: 0.5, col: C.f }); }
        if (fell >= MAX_FELL) { finish(false); return; }
        playerY = GROUND_Y - PLAYER_R - 10; playerVY = 0; onGround = true; scrollX -= 200;
      }
      if (distance >= NEEDED_DIST) { finish(true); return; }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p2 = particles[pp]; p2.x += p2.vx * dt; p2.y += p2.vy * dt; p2.life -= dt * 2; if (p2.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene(shake);
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    if (flash > 0) game.draw.rect(0, 0, W, H, C.a, flash * 0.1);

    // distance bar
    var dr = Math.min(1, distance / NEEDED_DIST);
    game.draw.rect(40, snap(H * 0.88), W - 80, 20, '#150800', 0.8); game.draw.rect(40, snap(H * 0.88), (W - 80) * dr, 20, C.b, 0.8);
    txt(Math.floor(distance) + 'm / ' + NEEDED_DIST + 'm', W / 2, snap(H * 0.88) + 44, 32, C.g);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    for (var fi = 0; fi < MAX_FELL; fi++) game.draw.rect(snap(W / 2 + (fi - (MAX_FELL - 1) / 2) * 56) - 10, 168, 20, 20, fi < fell ? C.a : '#150800');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.06);
    state = S.ATTRACT;
    initGame();
  });
})(game);
