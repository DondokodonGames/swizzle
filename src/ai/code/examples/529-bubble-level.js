// 529-bubble-level.js
// バブルレベル — 傾く水準器の気泡をタップで押し戻し、中央にキープし続ける
// 操作: タップで気泡を押す（画面左タップ=右へ / 右タップ=左へ）中央に一定時間留めて得点
// 成功: 中央キープ 6回  失敗: 3回はみ出す or 20秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（アイスブルー、計器盤） ──
  var C = { bg:'#02050a', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#3355ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'BUBBLE LEVEL';
  var HOW_TO_PLAY = 'TAP TO NUDGE THE BUBBLE · HOLD IT IN THE CENTER';
  var MAX_TIME = 20;
  var NEEDED   = 6;          // 修正2: 10 → 6
  var MAX_MISS = 3;          // 修正2: 5 → 3
  var TUBE_W = 760, TUBE_H = 120, TUBE_X = snap((W - 760) / 2), TUBE_Y = snap(H * 0.42);
  var BUBBLE_R = 44, CENTER_ZONE = 84, CENTER_HOLD = 0.7;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var bubbleX, bubbleVX, tiltAngle, tiltVel, score, misses, timeLeft, done, particles, flash, flashCol, centerTimer;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.e : '#0a1020');
  }

  function background() { game.draw.clear(C.bg); }

  function initGame() { bubbleX = W / 2 + (Math.random() - 0.5) * 200; bubbleVX = 0; tiltAngle = 0; tiltVel = 0; score = 0; misses = 0; timeLeft = MAX_TIME; done = false; particles = []; flash = 0; flashCol = C.b; centerTimer = 0; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (score * 700 + Math.ceil(timeLeft) * 100) : score * 250;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    var by = TUBE_Y + TUBE_H / 2;
    game.draw.rect(TUBE_X - 8, TUBE_Y - 8, TUBE_W + 16, TUBE_H + 16, C.d, 0.6);
    game.draw.rect(TUBE_X, TUBE_Y, TUBE_W, TUBE_H, '#061024', 0.95);
    // 中央ゾーン
    game.draw.rect(W / 2 - CENTER_ZONE, TUBE_Y + 4, CENTER_ZONE * 2, TUBE_H - 8, C.b, 0.10);
    game.draw.rect(snap(W / 2) - 2, TUBE_Y, 4, TUBE_H, C.b, 0.7);
    game.draw.rect(snap(W / 2 - CENTER_ZONE) - 2, TUBE_Y, 4, TUBE_H, C.e, 0.6);
    game.draw.rect(snap(W / 2 + CENTER_ZONE) - 2, TUBE_Y, 4, TUBE_H, C.e, 0.6);
    // 端の危険帯
    game.draw.rect(TUBE_X, TUBE_Y, 64, TUBE_H, C.a, 0.16);
    game.draw.rect(TUBE_X + TUBE_W - 64, TUBE_Y, 64, TUBE_H, C.a, 0.16);
    // キープ進捗リング
    var inCenter = Math.abs(bubbleX - W / 2) < CENTER_ZONE;
    if (inCenter && centerTimer > 0) pc(W / 2, by, BUBBLE_R + 14, C.b, (centerTimer / CENTER_HOLD) * 0.35);
    // 気泡
    pc(bubbleX, by, BUBBLE_R + 4, C.e, 0.18);
    pc(bubbleX, by, BUBBLE_R, C.e, 0.9);
    pc(bubbleX - 12, by - 12, BUBBLE_R * 0.32, C.g, 0.6);
    // 傾きインジケータ
    var tiltPX = W / 2 + tiltAngle * 400;
    game.draw.rect(W / 2 - 160, TUBE_Y + TUBE_H + 70, 320, 4, C.d, 0.5);
    pc(tiltPX, TUBE_Y + TUBE_H + 72, 18, (tiltPX < W / 2 - 40 || tiltPX > W / 2 + 40) ? C.a : C.b, 0.9);
  }

  // ── 入力 ──
  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    if (tx < W / 2) bubbleVX += 300; else bubbleVX -= 300;
    game.audio.play('se_tap', 0.3);
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (bubbleX === undefined) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.20, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.255, 22, C.e);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.72, 56, C.a);
        txt('TAP TO START', W / 2, H * 0.76, 42, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'PERFECT LEVEL!' : 'OFF BALANCE', W / 2, H * 0.35, 62, resultSuccess ? C.b : C.a);
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

      tiltVel += (Math.random() - 0.5) * 0.8 * dt; tiltAngle += tiltVel * dt * 40; tiltAngle *= 0.98; tiltVel *= 0.95;
      if (Math.abs(tiltAngle) > 0.3) tiltVel -= tiltAngle * 0.5;
      var gravity = Math.sin(tiltAngle) * 600; bubbleVX += gravity * dt; bubbleVX *= 0.94; bubbleX += bubbleVX * dt;

      var leftB = TUBE_X + BUBBLE_R, rightB = TUBE_X + TUBE_W - BUBBLE_R;
      if (bubbleX < leftB) { bubbleX = leftB; bubbleVX = Math.abs(bubbleVX) * 0.5; misses++; flashCol = C.a; flash = 0.4; centerTimer = 0; game.audio.play('se_failure', 0.4); if (misses >= MAX_MISS) { finish(false); return; } }
      if (bubbleX > rightB) { bubbleX = rightB; bubbleVX = -Math.abs(bubbleVX) * 0.5; misses++; flashCol = C.a; flash = 0.4; centerTimer = 0; game.audio.play('se_failure', 0.4); if (misses >= MAX_MISS) { finish(false); return; } }

      var inCenter = Math.abs(bubbleX - W / 2) < CENTER_ZONE;
      if (inCenter) {
        centerTimer += dt;
        if (centerTimer >= CENTER_HOLD) {
          centerTimer = 0; score++; flashCol = C.b; flash = 0.3; game.audio.play('se_success', 0.6);
          for (var pi = 0; pi < 8; pi++) { var ang = Math.random() * Math.PI * 2; particles.push({ x: W / 2, y: TUBE_Y + TUBE_H / 2, vx: Math.cos(ang) * 140, vy: Math.sin(ang) * 140, life: 0.4, col: C.g }); }
          if (score >= NEEDED) { finish(true); return; }
        }
      } else centerTimer = 0;

      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 2; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 6, snap(particles[pp2].y) - 6, 12, 12, particles[pp2].col, particles[pp2].life * 1.5);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.12);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(score + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var mi = 0; mi < MAX_MISS; mi++) game.draw.rect(snap(W / 2 + (mi - (MAX_MISS - 1) / 2) * 56) - 10, 224, 20, 20, mi < misses ? C.a : '#0a1020');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.07);
    state = S.ATTRACT;
    initGame();
  });
})(game);
