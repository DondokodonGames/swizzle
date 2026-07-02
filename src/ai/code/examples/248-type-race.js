// 248-type-race.js
// タイプレース — 中央に流れてくる文字を読み取り、4択パネルから同じ文字を素早く押す反射認識
// 操作: 表示文字と同じパネルをタップ
// 成功: 3問正解  失敗: 3問ミス or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、データ端末） ──
  var C = { bg:'#020408', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'.split('');

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'TYPE RACE';
  var HOW_TO_PLAY = 'TAP THE MATCHING LETTER FAST';
  var MAX_TIME = 15;
  var NEEDED   = 3;           // 修正2: 25 → 3
  var MAX_WRONG = 3;         // 修正2: 5 → 3
  var CHAR_Y = snap(H * 0.36), BW = W / 2 - 30, BH = 220, BY0 = snap(H * 0.6);

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var current, choices, correct, wrongs, timeLeft, done, fbText, fbCol, fbTimer, particles;

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

  function background() { game.draw.clear(C.bg); }

  function btnRect(i) { var col = i % 2, row = Math.floor(i / 2); return { x: 20 + col * (BW + 20), y: BY0 + row * (BH + 20), w: BW, h: BH }; }

  function nextChar() {
    current = CHARS[Math.floor(Math.random() * CHARS.length)];
    var pool = CHARS.filter(function(c) { return c !== current; }); choices = [current];
    for (var i = 0; i < 3; i++) { var idx = Math.floor(Math.random() * pool.length); choices.push(pool[idx]); pool.splice(idx, 1); }
    for (var j = choices.length - 1; j > 0; j--) { var k = Math.floor(Math.random() * (j + 1)); var t = choices[j]; choices[j] = choices[k]; choices[k] = t; }
  }

  function drawChoices() { for (var i = 0; i < 4; i++) { var r = btnRect(i); game.draw.rect(r.x, r.y, r.w, r.h, C.d, 0.5); game.draw.rect(r.x, r.y, r.w, 8, C.e, 0.5); txt(choices[i], r.x + r.w / 2, r.y + r.h / 2 + 36, 120, C.g); } }

  function initGame() { correct = 0; wrongs = 0; timeLeft = MAX_TIME; done = false; fbText = ''; fbCol = C.g; fbTimer = 0; particles = []; nextChar(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (correct * 400 + Math.ceil(timeLeft) * 60) : correct * 120;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  // ── 入力 ──
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || fbTimer > 0.2) return;
    var picked = -1; for (var i = 0; i < 4; i++) { var r = btnRect(i); if (x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h) { picked = i; break; } }
    if (picked < 0) return;
    if (choices[picked] === current) { correct++; fbText = 'CORRECT!'; fbCol = C.b; fbTimer = 0.4; game.audio.play('se_success', 0.6); for (var pi = 0; pi < 6; pi++) { var a = Math.random() * Math.PI * 2; particles.push({ x: W / 2, y: CHAR_Y, vx: Math.cos(a) * 150, vy: Math.sin(a) * 150, life: 0.5 }); } if (correct >= NEEDED) { finish(true); return; } nextChar(); }
    else { wrongs++; fbText = 'MISS'; fbCol = C.a; fbTimer = 0.4; game.audio.play('se_failure', 0.5); if (wrongs >= MAX_WRONG) { finish(false); return; } }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      background(); game.draw.rect(0, H * 0.28, W, H * 0.18, C.d, 0.15); txt('A', W / 2, CHAR_Y + 24, 120, C.e); drawChoices();
      txt(GAME_TITLE, W / 2, H * 0.14, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.20, 28, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.95, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'FAST FINGERS!' : 'TOO SLOW', W / 2, H * 0.35, 62, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (fbTimer > 0) fbTimer -= dt;
      for (var pi = particles.length - 1; pi >= 0; pi--) { var p = particles[pi]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) particles.splice(pi, 1); }
    }

    // ---- 描画 ----
    background();
    game.draw.rect(0, H * 0.28, W, H * 0.18, C.d, 0.15);
    for (var i = 0; i < 12; i++) game.draw.rect((snap(game.time.elapsed * 300 + i * 120) % (W + 120)) - 60, snap(H * 0.30 + (i % 3) * 40), 60, 6, C.e, 0.2);
    txt('MATCH THIS', W / 2, H * 0.24, 32, C.e); txt(current, W / 2, CHAR_Y + 24, 130, C.g);
    drawChoices();
    for (var pp = 0; pp < particles.length; pp++) game.draw.rect(snap(particles[pp].x) - 5, snap(particles[pp].y) - 5, 10, 10, C.b, particles[pp].life * 2);
    if (fbTimer > 0) txt(fbText, W / 2, H * 0.19, 52, fbCol);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(correct + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var mm = 0; mm < MAX_WRONG; mm++) game.draw.rect(snap(W / 2 + (mm - (MAX_WRONG - 1) / 2) * 56) - 10, 224, 20, 20, mm < wrongs ? C.a : '#0a1420');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.2);
    state = S.ATTRACT;
    initGame();
  });
})(game);
