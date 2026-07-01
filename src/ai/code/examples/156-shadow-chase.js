// 156-shadow-chase.js
// 影踏み鬼 — 動くスポットライトの外に出たら即アウト、追い詰められる息苦しさ
// 操作: タップ/スワイプで逃げる方向を指定
// 成功: 5秒生き延びる  失敗: スポットライト外に出る

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（クラシックアーケード、暗闇の舞台） ──
  var C = { bg:'#000011', a:'#0000ff', b:'#00ffff', c:'#ffffff', d:'#ffff00', e:'#ff0000', f:'#00ff00', g:'#ff00ff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'SHADOW CHASE';
  var HOW_TO_PLAY = 'STAY IN THE LIGHT · TAP TO MOVE';
  var NEEDED   = 5;              // 修正2: 20 → 5（サバイバル短縮）
  var PLAYER_R = 40, SPOT_R = 260, MIN_SPOT_R = 150;
  var PLAYER_SPEED = 520, FRICTION = 0.82, SPOT_SPEED = 170, GRACE = 0.14;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var px, py, pvx, pvy, sx, sy, spotAngle, spotR, survived, timeLeft, done, particles, outsideTimer;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) {
    var step = 8; cx = snap(cx); cy = snap(cy);
    for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) {
      if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha);
    }
  }

  function ring(cx, cy, r, color, alpha) {
    for (var a = 0; a < Math.PI * 2; a += 0.08) game.draw.rect(snap(cx + Math.cos(a) * r) - 4, snap(cy + Math.sin(a) * r) - 4, 8, 8, color, alpha);
  }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var lit = Math.ceil(timeLeft / NEEDED * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < lit ? C.f : '#001133');
  }

  function drawSpot(cx, cy, r, inLight) {
    game.draw.rect(cx - r, cy - r, r * 2, r * 2, C.d, 0.06);   // ぼんやり
    pc(cx, cy, r, C.d, 0.12);
    pc(cx, cy, r * 0.6, C.d, 0.10);
    ring(cx, cy, r, inLight ? C.d : C.e, 0.7);
  }

  function drawPlayer(cx, cy, inLight) {
    var col = inLight ? C.d : C.e;
    pc(cx, cy, PLAYER_R, col, 1);                    // 体
    game.draw.rect(cx - 16, cy - 12, 12, 12, C.bg);  // 目
    game.draw.rect(cx + 4, cy - 12, 12, 12, C.bg);
    game.draw.rect(cx - 12, cy + 12, 24, 6, C.bg);   // 口
  }

  function initGame() {
    px = snap(W / 2); py = snap(H / 2); pvx = 0; pvy = 0;
    sx = W / 2; sy = H / 2; spotAngle = 0; spotR = SPOT_R;
    survived = 0; timeLeft = NEEDED; done = false; particles = []; outsideTimer = 0;
  }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (1000 + Math.round(survived) * 100) : Math.round(survived * 120);
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  // ── 入力 ──
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    var dx = x - px, dy = y - py, len = Math.hypot(dx, dy);
    if (len < 10) return;
    pvx = (dx / len) * PLAYER_SPEED; pvy = (dy / len) * PLAYER_SPEED;
    game.audio.play('se_tap', 0.2);
  });

  game.onSwipe(function(dir) {
    if (state !== S.PLAYING || done) return;
    if (dir === 'up') pvy = -PLAYER_SPEED; else if (dir === 'down') pvy = PLAYER_SPEED;
    else if (dir === 'left') pvx = -PLAYER_SPEED; else if (dir === 'right') pvx = PLAYER_SPEED;
    game.audio.play('se_tap', 0.2);
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      game.draw.clear(C.bg);
      var da = game.time.elapsed;
      drawSpot(W / 2 + Math.sin(da) * 120, H / 2 + Math.cos(da * 1.3) * 120, SPOT_R, true);
      drawPlayer(W / 2, H / 2, true);
      txt(GAME_TITLE, W / 2, H * 0.16, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.24, 32, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.80, 62, C.d);
        txt('TAP TO START', W / 2, H * 0.86, 48, C.c);
      }
      txt('INSERT COIN', W / 2, H * 0.92, 40, '#8888aa');
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      game.draw.clear(C.bg);
      txt(resultSuccess ? 'SURVIVED!' : 'CAUGHT', W / 2, H * 0.35, 80, resultSuccess ? C.f : C.e);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.c);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.b);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt; survived += dt;
      if (timeLeft <= 0) { finish(true); return; }
      spotAngle += dt;
      var prog = survived / NEEDED;
      sx = W / 2 + Math.sin(spotAngle * 0.9) * (W * 0.28);
      sy = H / 2 + Math.sin(spotAngle * 1.4) * (H * 0.26);
      spotR = SPOT_R - prog * (SPOT_R - MIN_SPOT_R);
      pvx *= Math.pow(FRICTION, dt * 60); pvy *= Math.pow(FRICTION, dt * 60);
      px = Math.max(PLAYER_R, Math.min(W - PLAYER_R, px + pvx * dt));
      py = Math.max(PLAYER_R, Math.min(H - PLAYER_R, py + pvy * dt));
      var inLight = Math.hypot(px - sx, py - sy) < spotR - PLAYER_R;
      if (!inLight) {
        outsideTimer += dt;
        if (outsideTimer >= GRACE) {
          for (var pi = 0; pi < 16; pi++) { var ang = Math.random() * Math.PI * 2; particles.push({ x: px, y: py, vx: Math.cos(ang) * 300, vy: Math.sin(ang) * 300, life: 0.6 }); }
          finish(false); return;
        }
      } else outsideTimer = 0;
    }
    for (var p = 0; p < particles.length; p++) { particles[p].x += particles[p].vx * dt; particles[p].y += particles[p].vy * dt; particles[p].vy += 400 * dt; particles[p].life -= dt; }
    particles = particles.filter(function(pt) { return pt.life > 0; });

    // ---- 描画 ----
    game.draw.clear(C.bg);
    var inL = Math.hypot(px - sx, py - sy) < spotR - PLAYER_R;
    drawSpot(sx, sy, spotR, inL);
    drawPlayer(px, py, inL);
    for (var pp = 0; pp < particles.length; pp++) game.draw.rect(snap(particles[pp].x) - 6, snap(particles[pp].y) - 6, 12, 12, C.e, particles[pp].life);
    if (outsideTimer > 0) game.draw.rect(0, 0, W, H, C.e, (outsideTimer / GRACE) * 0.3);

    timeBar();
    txt(timeLeft.toFixed(1) + 's', W / 2, 96, 44, C.c);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.2);
    state = S.ATTRACT;
    initGame();
  });
})(game);
