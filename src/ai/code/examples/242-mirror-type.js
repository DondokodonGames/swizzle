// 242-mirror-type.js
// ミラータイプ — 鏡に映った文字を見て、元の正しい文字はどちらかを瞬時に選ぶ左右反転認知
// 操作: 2つの選択肢から元の文字をタップ
// 成功: 3問正解  失敗: 3問間違える or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、鏡の実験室） ──
  var C = { bg:'#04060c', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'MIRROR TYPE';
  var HOW_TO_PLAY = 'PICK THE ORIGINAL OF THE MIRRORED LETTER';
  var MAX_TIME = 15;
  var NEEDED   = 3;           // 修正2: 15 → 3
  var MAX_WRONG = 3;         // 修正2: 5 → 3
  var QUESTIONS = [
    { mirrored: 'b', choices: ['b', 'd'], correct: 'd' },
    { mirrored: 'p', choices: ['p', 'q'], correct: 'q' },
    { mirrored: '6', choices: ['6', '9'], correct: '9' },
    { mirrored: 'S', choices: ['S', 'Z'], correct: 'S' },
    { mirrored: 'E', choices: ['E', '3'], correct: 'E' },
    { mirrored: 'N', choices: ['N', 'И'], correct: 'N' }
  ];
  var CW = W / 2 - 60, CH = 220, CY = snap(H * 0.58), LX = 40, RX = snap(W / 2 + 20);

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var q, correct, wrongs, timeLeft, done, fbText, fbCol, fbTimer, particles;

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

  function nextQ() {
    var base = QUESTIONS[Math.floor(Math.random() * QUESTIONS.length)];
    q = { mirrored: base.mirrored, choices: Math.random() < 0.5 ? [base.choices[1], base.choices[0]] : [base.choices[0], base.choices[1]], correct: base.correct };
  }

  function drawChoices() {
    for (var ci = 0; ci < 2; ci++) {
      var bx = ci === 0 ? LX : RX;
      game.draw.rect(bx, CY, CW, CH, C.d, 0.5); game.draw.rect(bx, CY, CW, 8, C.e, 0.5);
      txt(q.choices[ci], bx + CW / 2, CY + CH / 2 + 40, 140, C.g);
    }
  }

  function initGame() { correct = 0; wrongs = 0; timeLeft = MAX_TIME; done = false; fbText = ''; fbCol = C.g; fbTimer = 0; particles = []; nextQ(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (correct * 400 + Math.ceil(timeLeft) * 50) : correct * 120;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  // ── 入力 ──
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || fbTimer > 0.3) return;
    var picked = -1;
    if (x >= LX && x < LX + CW && y >= CY && y < CY + CH) picked = 0;
    else if (x >= RX && x < RX + CW && y >= CY && y < CY + CH) picked = 1;
    if (picked < 0) return;
    if (q.choices[picked] === q.correct) {
      correct++; fbText = 'CORRECT!'; fbCol = C.b; fbTimer = 0.5; game.audio.play('se_success', 0.7);
      for (var pi = 0; pi < 6; pi++) { var a = Math.random() * Math.PI * 2; particles.push({ x: W / 2, y: CY, vx: Math.cos(a) * 150, vy: Math.sin(a) * 150, life: 0.5 }); }
      if (correct >= NEEDED) { finish(true); return; }
    } else { wrongs++; fbText = 'WRONG'; fbCol = C.a; fbTimer = 0.5; game.audio.play('se_failure', 0.5); if (wrongs >= MAX_WRONG) { finish(false); return; } }
    nextQ();
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      background(); game.draw.rect(W / 2 - 4, H * 0.28, 8, H * 0.16, C.e, 0.6); txt('b', W / 2, H * 0.4, 140, C.e); drawChoices();
      txt(GAME_TITLE, W / 2, H * 0.14, 74, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.20, 24, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.95, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'SHARP EYE!' : 'CONFUSED', W / 2, H * 0.35, 74, resultSuccess ? C.b : C.a);
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
      for (var pi = particles.length - 1; pi >= 0; pi--) { var p = particles[pi]; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 200 * dt; p.life -= dt; if (p.life <= 0) particles.splice(pi, 1); }
    }

    // ---- 描画 ----
    background();
    game.draw.rect(W / 2 - 4, H * 0.30, 8, H * 0.14, C.e, 0.6);
    txt('MIRRORED', W / 2, H * 0.28, 34, C.e);
    txt(q.mirrored, W / 2, H * 0.42, 150, C.e);
    txt('WHICH IS THE ORIGINAL?', W / 2, H * 0.50, 34, C.c);
    drawChoices();
    for (var pp = 0; pp < particles.length; pp++) game.draw.rect(snap(particles[pp].x) - 5, snap(particles[pp].y) - 5, 10, 10, C.b, particles[pp].life * 2);
    if (fbTimer > 0) txt(fbText, W / 2, H * 0.86, 56, fbCol);

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
