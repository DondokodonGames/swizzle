// 187-freeze-tag.js
// フリーズタグ — 追跡者から逃げながら凍った仲間を解凍するマルチタスク判断
// 操作: タップで移動先を指定
// 成功: 1人の仲間を解凍  失敗: 追跡者に触れる or 12秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、鬼ごっこ） ──
  var C = { bg:'#1a0028', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'FREEZE TAG';
  var HOW_TO_PLAY = 'TAP TO MOVE · THAW A FRIEND · DODGE RED';
  var NEEDED   = 1;              // 修正2: 4 → 1
  var TOP    = 220, BOTTOM = H - 180;
  var PLAYER_R = 36, CHASER_R = 34, FRIEND_R = 30, THAW_DIST = 90;
  var PLAYER_SPEED = 440, CHASER_SPEED = 210;   // 修正2: 追跡を遅く

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var px, py, pvx, pvy, targetX, targetY, chaser, friends, thawed, timeLeft, done, particles;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) {
    var step = 8; cx = snap(cx); cy = snap(cy);
    for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) {
      if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha);
    }
  }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / 12 * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#2a0a3a');
  }

  function background() {
    game.draw.clear(C.bg);
    for (var gy = TOP; gy < BOTTOM; gy += 96) game.draw.rect(0, gy, W, 2, C.d, 0.15);
  }

  function drawPlayer(x, y) { pc(x, y, PLAYER_R, C.b, 1); game.draw.rect(x - 14, y - 10, 10, 12, C.bg); game.draw.rect(x + 4, y - 10, 10, 12, C.bg); game.draw.rect(x - 10, y + 12, 20, 6, C.bg); }
  function drawChaser(x, y) { pc(x, y, CHASER_R, C.a, 1); game.draw.rect(x - 14, y - 10, 10, 12, C.g); game.draw.rect(x + 4, y - 10, 10, 12, C.g); game.draw.rect(x - 12, y + 12, 24, 6, C.g); }
  function drawFriend(f) {
    if (f.frozen) { pc(f.x, f.y, FRIEND_R, C.e, 0.9); game.draw.rect(f.x - 4, f.y - FRIEND_R + 4, 8, FRIEND_R * 2 - 8, C.g); game.draw.rect(f.x - FRIEND_R + 4, f.y - 4, FRIEND_R * 2 - 8, 8, C.g); }
    else { pc(f.x, f.y, FRIEND_R, C.c, 0.9); game.draw.rect(f.x - 4, f.y - 6, 8, 8, C.bg); }
  }

  function initGame() {
    px = W / 2; py = H * 0.6; pvx = 0; pvy = 0; targetX = px; targetY = py;
    chaser = { x: W * 0.15, y: TOP + 60 };
    friends = [{ x: snap(W * 0.25), y: snap(H * 0.4), frozen: true }, { x: snap(W * 0.75), y: snap(H * 0.4), frozen: true }, { x: snap(W * 0.5), y: snap(H * 0.72), frozen: true }];
    thawed = 0; timeLeft = 12; done = false; particles = [];
  }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (thawed * 400 + Math.ceil(timeLeft) * 40) : thawed * 100;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  // ── 入力 ──
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    targetX = x; targetY = Math.max(TOP + PLAYER_R, Math.min(BOTTOM - PLAYER_R, y));
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      background();
      drawFriend({ x: W * 0.3, y: H * 0.4, frozen: true }); drawFriend({ x: W * 0.7, y: H * 0.4, frozen: false });
      drawChaser(W * 0.2, H * 0.6); drawPlayer(W * 0.6, H * 0.62);
      txt(GAME_TITLE, W / 2, H * 0.16, 84, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.24, 28, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.80, 62, C.a);
        txt('TAP TO START', W / 2, H * 0.86, 48, C.g);
      }
      txt('INSERT COIN', W / 2, H * 0.92, 40, '#886699');
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'THAWED!' : 'TAGGED', W / 2, H * 0.35, 80, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      var dx = targetX - px, dy = targetY - py, dist = Math.hypot(dx, dy);
      if (dist > 8) { pvx = dx / dist * PLAYER_SPEED; pvy = dy / dist * PLAYER_SPEED; } else { pvx *= 0.85; pvy *= 0.85; }
      px = Math.max(PLAYER_R, Math.min(W - PLAYER_R, px + pvx * dt));
      py = Math.max(TOP + PLAYER_R, Math.min(BOTTOM - PLAYER_R, py + pvy * dt));
      var cdx = px - chaser.x, cdy = py - chaser.y, cd = Math.hypot(cdx, cdy);
      if (cd > 0) { chaser.x += cdx / cd * CHASER_SPEED * dt; chaser.y += cdy / cd * CHASER_SPEED * dt; }
      for (var fi = 0; fi < friends.length; fi++) {
        var f = friends[fi];
        if (!f.frozen) continue;
        if (Math.hypot(px - f.x, py - f.y) < PLAYER_R + FRIEND_R + THAW_DIST) {
          f.frozen = false; thawed++;
          game.audio.play('se_success', 0.7);
          for (var pi = 0; pi < 8; pi++) { var ang = Math.random() * Math.PI * 2; particles.push({ x: f.x, y: f.y, vx: Math.cos(ang) * 150, vy: Math.sin(ang) * 150, life: 0.5 }); }
          if (thawed >= NEEDED) { finish(true); return; }
        }
      }
      if (Math.hypot(px - chaser.x, py - chaser.y) < PLAYER_R + CHASER_R - 8) { finish(false); return; }
    }
    for (var p = 0; p < particles.length; p++) { particles[p].x += particles[p].vx * dt; particles[p].y += particles[p].vy * dt; particles[p].vy += 200 * dt; particles[p].life -= dt; }
    particles = particles.filter(function(pt) { return pt.life > 0; });

    // ---- 描画 ----
    background();
    for (var fi2 = 0; fi2 < friends.length; fi2++) drawFriend(friends[fi2]);
    var cd2 = Math.hypot(px - chaser.x, py - chaser.y);
    drawChaser(chaser.x, chaser.y);
    drawPlayer(px, py);
    for (var pp = 0; pp < particles.length; pp++) game.draw.rect(snap(particles[pp].x) - 5, snap(particles[pp].y) - 5, 10, 10, C.c, particles[pp].life * 2);
    if (cd2 < 200) game.draw.rect(0, 0, W, H, C.a, (1 - cd2 / 200) * 0.2);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt('THAW ' + thawed + ' / ' + NEEDED, W / 2, 168, 44, C.b);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.25);
    state = S.ATTRACT;
    initGame();
  });
})(game);
