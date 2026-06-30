// 004-shooting-star.js
// 流れ星タップ — 消える前につかまえる緊張感
// 操作: 流れ星をタップ
// 成功: 1回キャッチ  失敗: 12秒以内にキャッチできず

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（クラシックアーケード） ──
  var C = { bg:'#000011', a:'#0000ff', b:'#00ffff', c:'#ffffff', d:'#ffff00', e:'#ff0000', f:'#00ff00', g:'#ff00ff' };

  var GAME_TITLE  = 'SHOOTING STAR';
  var HOW_TO_PLAY = 'TAP THE STAR';
  var MAX_TIME = 12;
  var NEEDED   = 1;            // 修正2: 3 → ceil(3/10) = 1
  var TOP = 220, BOTTOM = H - 180;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  var score, timeLeft, done, star, trail, hitFx, spawnCooldown, bgStars;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }
  function drawPixelCircle(cx, cy, r, color, alpha) {
    var step = 8; cx = snap(cx); cy = snap(cy);
    for (var py = -r; py <= r; py += step)
      for (var px = -r; px <= r; px += step)
        if (px * px + py * py <= r * r) game.draw.rect(cx + px, cy + py, step, step, color, alpha);
  }
  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x,     y,     { size: sz, color: color,     bold: true, align: align || 'center' });
  }
  function scanlines() { for (var sy = 0; sy < H; sy += 8) game.draw.rect(0, sy, W, 2, '#000000', 0.18); }
  function timeBar() {
    var blocks = 12, lit = Math.ceil(timeLeft / MAX_TIME * blocks);
    for (var i = 0; i < blocks; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < lit ? C.b : '#003b00');
  }

  function background() {
    game.draw.clear(C.bg);
    for (var i = 0; i < bgStars.length; i++) {
      var bs = bgStars[i];
      var twinkle = Math.floor(game.time.elapsed * 4 + bs.phase) % 2 === 0 ? 0.9 : 0.3;
      game.draw.rect(bs.x, bs.y, bs.s, bs.s, C.c, twinkle);
    }
  }

  function initGame() {
    score = 0;
    timeLeft = MAX_TIME;
    done = false;
    star = null; trail = []; hitFx = null;
    spawnCooldown = 0.4;
    bgStars = [];
    for (var i = 0; i < 70; i++)
      bgStars.push({ x: snap(game.random(0, W)), y: snap(game.random(60, H - 60)), s: 8 * Math.ceil(game.random(1, 3)), phase: Math.floor(game.random(0, 4)) });
    spawnStar();
  }

  function spawnStar() {
    var fromLeft = Math.random() < 0.5;
    star = {
      x:  fromLeft ? -60 : W + 60,
      y:  snap(game.random(TOP + 60, BOTTOM - 60)),
      vx: fromLeft ? game.random(1100, 1700) : -game.random(1100, 1700),
      vy: game.random(400, 800) * (Math.random() < 0.5 ? 1 : -1),
      r:  40, hit: false, fadeOut: 0
    };
    trail = [];
  }

  function finish(success) {
    if (done) return;
    done = true;
    resultSuccess = success;
    finalScore = success ? (score * 300 + Math.ceil(timeLeft) * 60) : 0;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT)  { state = S.ATTRACT; return; }
    if (done || !star || star.hit) return;
    var dx = x - star.x, dy = y - star.y, hit = Math.max(star.r + 40, 80);
    if (dx * dx + dy * dy <= hit * hit) {
      star.hit = true;
      hitFx = { x: star.x, y: star.y, t: 0 };
      score++;
      game.audio.play('se_tap', 0.9);
      if (score >= NEEDED) finish(true);
    }
  });

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!bgStars) initGame();
      background();
      // デモ: 流れ星が横切る
      var dx0 = snap((game.time.elapsed * 900) % (W + 200) - 100);
      var dy0 = snap(H * 0.5 + Math.sin(game.time.elapsed * 2) * 200);
      drawPixelCircle(dx0, dy0, 40, C.d, 1);
      txt(GAME_TITLE,  W / 2, H * 0.28, 88, C.d);
      txt(HOW_TO_PLAY, W / 2, H * 0.40, 50, C.b);
      if (Math.floor(game.time.elapsed * 1.67) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.62, 72, C.g);
        txt('TAP TO START', W / 2, H * 0.72, 52, C.c);
      }
      txt('HI-SCORE  000300', W / 2, H * 0.85, 48, C.c);
      txt('INSERT COIN', W / 2, H * 0.91, 42, '#888888');
      scanlines();
      return;
    }
    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'CONGRATULATIONS!' : 'GAME OVER', W / 2, H * 0.35, 80, resultSuccess ? C.d : C.e);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 64, C.c);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 54, C.b);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
    }

    if (star) {
      trail.unshift({ x: star.x, y: star.y });
      if (trail.length > 12) trail.pop();
      if (star.hit) {
        star.fadeOut += dt * 3;
        if (star.fadeOut >= 1) { star = null; spawnCooldown = 0.5; }
      } else {
        star.x += star.vx * dt; star.y += star.vy * dt;
        if (star.y < TOP) { star.y = TOP; star.vy = Math.abs(star.vy); }
        if (star.y > BOTTOM) { star.y = BOTTOM; star.vy = -Math.abs(star.vy); }
        if (star.x < -200 || star.x > W + 200) { star = null; spawnCooldown = 0.4; }
      }
    } else if (!done) {
      spawnCooldown -= dt;
      if (spawnCooldown <= 0) spawnStar();
    }

    if (hitFx) { hitFx.t += dt; if (hitFx.t > 0.5) hitFx = null; }

    // ---- draw ----
    background();

    // trail
    for (var k = 0; k < trail.length; k++) {
      var tk = trail[k];
      var a = (1 - k / trail.length) * (star ? 1 - (star.fadeOut || 0) : 0);
      game.draw.rect(snap(tk.x) - 12, snap(tk.y) - 12, 24, 24, C.b, a * 0.6);
    }

    if (star) {
      var fade = 1 - (star.fadeOut || 0);
      drawPixelCircle(star.x, star.y, star.r, C.c, fade);
      drawPixelCircle(star.x, star.y, 16, C.d, fade);
    }

    if (hitFx) {
      var p = hitFx.t / 0.5;
      drawPixelCircle(hitFx.x, hitFx.y, 40 + p * 100, C.b, (1 - p) * 0.8);
      txt('★', hitFx.x, hitFx.y - 60 * p, 80, C.d);
    }

    timeBar();
    txt('SCORE ' + String(score).padStart(6, '0'), W / 2, 96, 48, C.c);
    txt(score + ' / ' + NEEDED, W / 2, H - 120, 56, C.b);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
    state = S.ATTRACT;
    initGame();
  });
})(game);
