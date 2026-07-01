// 174-catch-rain.js
// 雨水収穫 — 落ちてくる雨粒を移動バケツで受け止め、各色を集める集中力
// 操作: スワイプ/タップで3つのバケツを左右移動
// 成功: 3色を各2滴ずつ集める  失敗: 間違いを20滴 or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、雨の街） ──
  var C = { bg:'#1a0028', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var RAIN = [C.e, C.b, C.f];

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'CATCH RAIN';
  var HOW_TO_PLAY = 'TAP ◄► TO SLIDE BUCKETS UNDER DROPS';
  var MAX_TIME = 15;             // 修正2: 50 → 15
  var NEEDED_EACH = 2;           // 修正2: 10 → 2
  var MAX_WRONG = 20;
  var BUCKET_W = 176, BUCKET_H = 130, BUCKET_Y = snap(H * 0.76), RAIN_R = 24, RAIN_SPEED = 300, SHIFT = W * 0.3;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var bucketX, drops, particles, spawnTimer, collected, wrong, timeLeft, done, feedback, feedbackOk;

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
    var lit = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < lit ? C.b : '#2a0a3a');
  }

  function background() { game.draw.clear(C.bg); }

  function drawBucket(x, colorIdx) {
    game.draw.rect(x - BUCKET_W / 2, BUCKET_Y, BUCKET_W, BUCKET_H, C.d, 0.9);
    game.draw.rect(x - BUCKET_W / 2, BUCKET_Y, BUCKET_W, 12, C.g, 0.4);
    var fill = Math.min(1, collected[colorIdx] / NEEDED_EACH), fh = snap((BUCKET_H - 16) * fill);
    if (fh > 0) game.draw.rect(x - BUCKET_W / 2 + 8, BUCKET_Y + BUCKET_H - fh - 8, BUCKET_W - 16, fh, RAIN[colorIdx], 0.7);
    pc(x, BUCKET_Y - 32, 24, RAIN[colorIdx], 0.9);
    txt(collected[colorIdx] + '/' + NEEDED_EACH, x, BUCKET_Y + BUCKET_H + 30, 34, RAIN[colorIdx]);
  }

  function drawDrop(d) {
    pc(d.x, d.y, RAIN_R, RAIN[d.color], 0.95);
    pc(d.x, d.y - RAIN_R * 0.5, 8, C.g, 0.4);
    game.draw.rect(snap(d.x) - 3, snap(d.y) - RAIN_R - 16, 6, 16, RAIN[d.color], 0.4);
  }

  function shift(delta) { for (var i = 0; i < bucketX.length; i++) bucketX[i] = snap(Math.max(BUCKET_W / 2 + 20, Math.min(W - BUCKET_W / 2 - 20, bucketX[i] + delta))); }

  function initGame() {
    bucketX = [snap(W * 0.2), snap(W * 0.5), snap(W * 0.8)];
    drops = []; particles = []; spawnTimer = 0.3; collected = [0, 0, 0]; wrong = 0;
    timeLeft = MAX_TIME; done = false; feedback = 0;
    spawnDrop();
  }

  function spawnDrop() { drops.push({ x: snap(60 + Math.random() * (W - 120)), y: -RAIN_R, color: Math.floor(Math.random() * 3), speed: RAIN_SPEED + Math.random() * 80 }); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    var total = collected[0] + collected[1] + collected[2];
    finalScore = success ? (total * 80 + Math.ceil(timeLeft) * 30) : total * 30;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  // ── 入力 ──
  game.onTap(function(x) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    shift(x < W / 2 ? -SHIFT : SHIFT); game.audio.play('se_tap', 0.3);
  });

  game.onSwipe(function(dir) {
    if (state !== S.PLAYING || done) return;
    if (dir === 'left') { shift(-SHIFT); game.audio.play('se_tap', 0.3); }
    else if (dir === 'right') { shift(SHIFT); game.audio.play('se_tap', 0.3); }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      background();
      for (var b = 0; b < 3; b++) { collected = [0, 0, 0]; drawBucket(snap(W * (0.2 + b * 0.3)), b); }
      drawDrop({ x: W / 2, y: H * 0.4 + Math.sin(game.time.elapsed * 2) * 60, color: 0 });
      txt(GAME_TITLE, W / 2, H * 0.14, 84, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.22, 30, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.52, 62, C.a);
        txt('TAP TO START', W / 2, H * 0.58, 48, C.g);
      }
      txt('INSERT COIN', W / 2, H * 0.64, 40, '#886699');
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'HARVEST!' : 'GAME OVER', W / 2, H * 0.35, 78, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      spawnTimer -= dt;
      if (spawnTimer <= 0) { spawnTimer = 0.45 * (0.7 + Math.random() * 0.6); spawnDrop(); }
      for (var di = drops.length - 1; di >= 0; di--) {
        var d = drops[di];
        d.y += d.speed * dt;
        if (d.y + RAIN_R > BUCKET_Y) {
          var caught = false;
          for (var bi = 0; bi < bucketX.length; bi++) {
            if (d.x > bucketX[bi] - BUCKET_W / 2 && d.x < bucketX[bi] + BUCKET_W / 2) {
              caught = true;
              if (bi === d.color) {
                collected[d.color]++; feedbackOk = true; feedback = 0.2;
                game.audio.play('se_success', 0.5);
                for (var pi = 0; pi < 4; pi++) { var ang = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI; particles.push({ x: d.x, y: BUCKET_Y, vx: Math.cos(ang) * 120, vy: Math.sin(ang) * 120 - 60, life: 0.4, color: d.color }); }
              } else { wrong++; feedbackOk = false; feedback = 0.3; game.audio.play('se_failure', 0.4); if (wrong >= MAX_WRONG) { finish(false); return; } }
              break;
            }
          }
          if (!caught) wrong++;
          drops.splice(di, 1);
          continue;
        }
        if (d.y > H + 40) { drops.splice(di, 1); wrong++; }
      }
      if (collected[0] >= NEEDED_EACH && collected[1] >= NEEDED_EACH && collected[2] >= NEEDED_EACH) { finish(true); return; }
    }
    for (var p = 0; p < particles.length; p++) { particles[p].x += particles[p].vx * dt; particles[p].y += particles[p].vy * dt; particles[p].vy += 300 * dt; particles[p].life -= dt; }
    particles = particles.filter(function(pt) { return pt.life > 0; });
    if (feedback > 0) feedback -= dt;

    // ---- 描画 ----
    background();
    for (var di2 = 0; di2 < drops.length; di2++) drawDrop(drops[di2]);
    for (var bi2 = 0; bi2 < bucketX.length; bi2++) drawBucket(bucketX[bi2], bi2);
    for (var pp = 0; pp < particles.length; pp++) game.draw.rect(snap(particles[pp].x) - 4, snap(particles[pp].y) - 4, 8, 8, RAIN[particles[pp].color], particles[pp].life * 2.5);
    if (feedback > 0) game.draw.rect(0, 0, W, H, feedbackOk ? C.b : C.a, feedback * 0.1);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt('NG ' + wrong + '/' + MAX_WRONG, W / 2, 168, 40, C.a);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
    state = S.ATTRACT;
    initGame();
  });
})(game);
