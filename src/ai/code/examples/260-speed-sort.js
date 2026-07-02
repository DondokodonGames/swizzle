// 260-speed-sort.js
// スピードソート — 並んだ2つの数字のうち大きい方を上スワイプで仕分ける、瞬間比較のリフレックス
// 操作: 大きい方の数字を上へスワイプ
// 成功: 3問正解  失敗: 3回ミス or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、数値端末） ──
  var C = { bg:'#030508', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'SPEED SORT';
  var HOW_TO_PLAY = 'SWIPE UP ON THE BIGGER NUMBER';
  var MAX_TIME = 15;
  var NEEDED   = 3;           // 修正2: 20 → 3
  var MAX_MISS = 3;          // 修正2: 5 → 3

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var leftNum, rightNum, sorted, mistakes, timeLeft, done, particles, fbText, fbCol, fbTimer;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#0a1420');
  }

  function background() { game.draw.clear(C.bg); game.draw.rect(W / 2 - 2, snap(H * 0.4), 4, snap(H * 0.36), C.d, 0.5); }

  function genPair() { leftNum = Math.floor(Math.random() * 98) + 1; do { rightNum = Math.floor(Math.random() * 98) + 1; } while (rightNum === leftNum); }

  function drawCards() {
    game.draw.rect(snap(W * 0.06), snap(H * 0.44), snap(W * 0.4), snap(H * 0.3), C.d, 0.4); game.draw.rect(snap(W * 0.06), snap(H * 0.44), snap(W * 0.4), 8, C.e, 0.5); txt(leftNum + '', W * 0.26, H * 0.6, 130, C.g);
    game.draw.rect(snap(W * 0.54), snap(H * 0.44), snap(W * 0.4), snap(H * 0.3), C.d, 0.4); game.draw.rect(snap(W * 0.54), snap(H * 0.44), snap(W * 0.4), 8, C.f, 0.5); txt(rightNum + '', W * 0.74, H * 0.6, 130, C.g);
  }

  function initGame() { sorted = 0; mistakes = 0; timeLeft = MAX_TIME; done = false; particles = []; fbText = ''; fbCol = C.g; fbTimer = 0; genPair(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (sorted * 400 + Math.ceil(timeLeft) * 60) : sorted * 120;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
  });

  game.onSwipe(function(dir, x1, y1, x2, y2) {
    if (state !== S.PLAYING || done || fbTimer > 0.1) return;
    if (dir !== 'up') return;
    var swiped = x1 < W / 2 ? leftNum : rightNum, other = x1 < W / 2 ? rightNum : leftNum;
    if (swiped > other) { sorted++; fbText = 'CORRECT!'; fbCol = C.b; fbTimer = 0.4; game.audio.play('se_success', 0.6); for (var pi = 0; pi < 5; pi++) { var a = Math.random() * Math.PI * 2; particles.push({ x: x1 || W / 2, y: y1 || H / 2, vx: Math.cos(a) * 140, vy: Math.sin(a) * 140, life: 0.4 }); } if (sorted >= NEEDED) { finish(true); return; } genPair(); }
    else { mistakes++; fbText = 'WRONG'; fbCol = C.a; fbTimer = 0.5; game.audio.play('se_failure', 0.5); if (mistakes >= MAX_MISS) { finish(false); return; } }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      background(); leftNum = 42; rightNum = 17; drawCards();
      txt(GAME_TITLE, W / 2, H * 0.16, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.24, 28, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.86, 62, C.a);
        txt('TAP TO START', W / 2, H * 0.92, 48, C.g);
      }
      txt('INSERT COIN', W / 2, H * 0.97, 40, '#445566');
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'SORTED!' : 'MISSORT', W / 2, H * 0.35, 80, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) { timeLeft -= dt; if (timeLeft <= 0) { finish(false); return; } if (fbTimer > 0) fbTimer -= dt; for (var pi = particles.length - 1; pi >= 0; pi--) { var p = particles[pi]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) particles.splice(pi, 1); } }

    // ---- 描画 ----
    background(); drawCards();
    txt('SWIPE UP THE BIGGER', W / 2, H * 0.80, 36, C.c);
    for (var pp = 0; pp < particles.length; pp++) game.draw.rect(snap(particles[pp].x) - 5, snap(particles[pp].y) - 5, 10, 10, C.b, particles[pp].life * 2.5);
    if (fbTimer > 0) txt(fbText, W / 2, H * 0.86, 52, fbCol);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(sorted + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var mm = 0; mm < MAX_MISS; mm++) game.draw.rect(snap(W / 2 + (mm - (MAX_MISS - 1) / 2) * 56) - 10, 224, 20, 20, mm < mistakes ? C.a : '#0a1420');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.2);
    state = S.ATTRACT;
    initGame();
  });
})(game);
