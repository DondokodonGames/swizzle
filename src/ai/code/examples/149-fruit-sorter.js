// 149-fruit-sorter.js
// フルーツ仕分け — 落ちてくるフルーツを色で判断して正しいカゴに仕分ける瞬発力ゲーム
// 操作: 左右タップ/スワイプでカゴをスライド
// 成功: 3個仕分け成功  失敗: 5個ミス or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード） ──
  var C = { bg:'#1a0028', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var FRUIT_COLORS = [C.f, C.e, C.b];

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'FRUIT SORTER';
  var HOW_TO_PLAY = 'TAP ◄► TO SLIDE THE BASKETS';
  var MAX_TIME = 15;             // 修正2: 40 → 15
  var NEEDED   = 3;              // 修正2: 30 → 3
  var MAX_MISS = 5;
  var TOP    = 220;
  var BASKET_Y = snap(H * 0.76), BASKET_W = 160, BASKET_H = 120;
  var FRUIT_R = 44, FRUIT_SPEED = 240, SPAWN_INTERVAL = 0.8;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var basketsX, fruits, particles, spawnTimer, score, misses, timeLeft, done, feedback, feedbackOk;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) {
    var step = 8; cx = snap(cx); cy = snap(cy);
    for (var py = -r; py <= r; py += step) for (var px = -r; px <= r; px += step) {
      if (px * px + py * py <= r * r) game.draw.rect(cx + px, cy + py, step, step, color, alpha);
    }
  }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var sy = 0; sy < H; sy += 8) game.draw.rect(0, sy, W, 2, '#000000', 0.18); }

  function timeBar() {
    var lit = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < lit ? C.b : '#2a0a3a');
  }

  function background() {
    game.draw.clear(C.bg);
    game.draw.rect(0, BASKET_Y + BASKET_H, W, H - BASKET_Y - BASKET_H, C.d, 0.4);
  }

  // ── スプライト（多矩形でキャラクター性） ──
  function drawFruit(x, y, colorIdx) {
    pc(x, y, FRUIT_R, FRUIT_COLORS[colorIdx], 1);
    pc(x - 14, y - 14, 10, C.g, 0.8);                 // 光沢
    game.draw.rect(snap(x) - 4, snap(y) - FRUIT_R - 12, 8, 14, C.b);   // ヘタ
    game.draw.rect(snap(x) + 4, snap(y) - FRUIT_R - 8, 16, 8, C.b);    // 葉
  }

  function drawBasket(x, colorIdx) {
    game.draw.rect(x - BASKET_W / 2, BASKET_Y, BASKET_W, BASKET_H, C.d, 0.9);
    game.draw.rect(x - BASKET_W / 2, BASKET_Y, BASKET_W, 12, C.g, 0.4);
    // 編み目
    for (var gx = -BASKET_W / 2 + 16; gx < BASKET_W / 2; gx += 24) game.draw.rect(x + gx, BASKET_Y + 16, 8, BASKET_H - 24, '#000000', 0.25);
    // 色ラベル
    pc(x, BASKET_Y + BASKET_H / 2, 28, FRUIT_COLORS[colorIdx], 1);
    pc(x - 8, BASKET_Y + BASKET_H / 2 - 8, 8, C.g, 0.7);
  }

  function spawnFruit() {
    fruits.push({ x: snap(game.random(W * 0.15, W * 0.85)), y: -FRUIT_R, colorIdx: Math.floor(Math.random() * 3) });
  }

  function slide(dir) {
    for (var i = 0; i < basketsX.length; i++) basketsX[i] = snap(Math.max(W * 0.15, Math.min(W * 0.85, basketsX[i] + dir * W * 0.3)));
    game.audio.play('se_tap', 0.4);
  }

  function initGame() {
    basketsX = [snap(W * 0.2), snap(W * 0.5), snap(W * 0.8)];
    fruits = []; particles = []; spawnTimer = 0.4;
    score = 0; misses = 0; timeLeft = MAX_TIME; done = false; feedback = 0;
    spawnFruit();
  }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (score * 300 + Math.ceil(timeLeft) * 25) : score * 80;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  // ── 入力 ──
  game.onTap(function(x) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    slide(x < W / 2 ? -1 : 1);
  });

  game.onSwipe(function(dir) {
    if (state !== S.PLAYING || done) return;
    if (dir === 'left') slide(-1); else if (dir === 'right') slide(1);
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      background();
      for (var b = 0; b < 3; b++) drawBasket(snap(W * (0.2 + b * 0.3)), b);
      drawFruit(W / 2, H * 0.4 + Math.sin(game.time.elapsed * 2) * 40, 0);
      txt(GAME_TITLE, W / 2, H * 0.14, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.22, 32, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.58, 64, C.a);
        txt('TAP TO START', W / 2, H * 0.64, 50, C.g);
      }
      txt('INSERT COIN', W / 2, H * 0.70, 40, '#886699');
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'SORTED!' : 'GAME OVER', W / 2, H * 0.35, 80, resultSuccess ? C.b : C.a);
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
      if (spawnTimer <= 0) { spawnTimer = SPAWN_INTERVAL * (0.7 + Math.random() * 0.6); spawnFruit(); }
      for (var fi = fruits.length - 1; fi >= 0; fi--) {
        var f = fruits[fi];
        f.y += FRUIT_SPEED * dt;
        if (f.y + FRUIT_R > BASKET_Y) {
          var caught = false;
          for (var bi = 0; bi < basketsX.length; bi++) {
            if (Math.abs(f.x - basketsX[bi]) < BASKET_W / 2 + FRUIT_R * 0.5) {
              caught = true;
              if (bi === f.colorIdx) {
                score++; feedbackOk = true; feedback = 0.35;
                game.audio.play('se_success', 0.6);
                for (var pi = 0; pi < 6; pi++) { var ang = Math.random() * Math.PI * 2; particles.push({ x: f.x, y: BASKET_Y, vx: Math.cos(ang) * 160, vy: Math.sin(ang) * 160 - 100, life: 0.4, color: FRUIT_COLORS[f.colorIdx] }); }
                if (score >= NEEDED) { fruits.splice(fi, 1); finish(true); return; }
              } else {
                misses++; feedbackOk = false; feedback = 0.4;
                game.audio.play('se_failure', 0.5);
                if (misses >= MAX_MISS) { fruits.splice(fi, 1); finish(false); return; }
              }
              break;
            }
          }
          if (!caught && f.y > BASKET_Y + 60) {
            misses++; feedbackOk = false; feedback = 0.4;
            game.audio.play('se_failure', 0.4);
            if (misses >= MAX_MISS) { fruits.splice(fi, 1); finish(false); return; }
          }
          fruits.splice(fi, 1);
        }
      }
    }
    for (var p = 0; p < particles.length; p++) { particles[p].x += particles[p].vx * dt; particles[p].y += particles[p].vy * dt; particles[p].vy += 500 * dt; particles[p].life -= dt; }
    particles = particles.filter(function(pt) { return pt.life > 0; });
    if (feedback > 0) feedback -= dt;

    // ---- 描画 ----
    background();
    for (var bi2 = 0; bi2 < basketsX.length; bi2++) drawBasket(basketsX[bi2], bi2);
    for (var fi2 = 0; fi2 < fruits.length; fi2++) drawFruit(fruits[fi2].x, fruits[fi2].y, fruits[fi2].colorIdx);
    for (var pp = 0; pp < particles.length; pp++) game.draw.rect(snap(particles[pp].x) - 4, snap(particles[pp].y) - 4, 8, 8, particles[pp].color, particles[pp].life * 2.5);
    if (feedback > 0) game.draw.rect(0, 0, W, H, feedbackOk ? C.b : C.a, feedback * 0.15);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(score + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var mm = 0; mm < MAX_MISS; mm++) {
      var mx = snap(W / 2 + (mm - (MAX_MISS - 1) / 2) * 56);
      game.draw.rect(mx - 12, 208, 24, 24, mm < misses ? C.a : '#2a0a3a');
    }
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
    state = S.ATTRACT;
    initGame();
  });
})(game);
