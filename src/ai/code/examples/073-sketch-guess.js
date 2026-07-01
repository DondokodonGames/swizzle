// 073-sketch-guess.js
// スケッチゲス — 少しずつ現れるスケッチが何かを当てる早押しクイズ
// 操作: 3択からタップで回答
// 成功: 1問正解  失敗: 3問不正解 or 25秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード） ──
  var C = { bg:'#1a0028', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  var GAME_TITLE  = 'SKETCH GUESS';
  var HOW_TO_PLAY = 'GUESS THE DRAWING (3 CHOICES)';
  var MAX_TIME = 25;
  var NEEDED = 1;           // 修正2: 5 → 1
  var MAX_WRONG = 3, REVEAL_TIME = 3.0;
  var SCX = W / 2, SCY = H * 0.4, BTN_Y = H * 0.72;

  var PUZZLES = [
    { answer: 0, choices: ['SUN', 'MOON', 'STAR'], draw: function(t) {
        game.draw.rect(SCX - 60 * t, SCY - 60 * t, 120 * t, 120 * t, C.c);
        for (var i = 0; i < 8; i++) { var a = i / 8 * Math.PI * 2; game.draw.line(SCX + Math.cos(a) * 80 * t, SCY + Math.sin(a) * 80 * t, SCX + Math.cos(a) * 120 * t, SCY + Math.sin(a) * 120 * t, C.d, 6 * t); } } },
    { answer: 2, choices: ['CAR', 'PLANE', 'TRAIN'], draw: function(t) {
        game.draw.rect(SCX - 130 * t, SCY - 60 * t, 260 * t, 100 * t, C.e);
        for (var w = 0; w < 3; w++) game.draw.rect(SCX - 100 * t + w * 84 * t, SCY - 44 * t, 56 * t, 40 * t, C.g);
        game.draw.rect(SCX - 90 * t, SCY + 40 * t, 40 * t, 40 * t, C.d); game.draw.rect(SCX + 50 * t, SCY + 40 * t, 40 * t, 40 * t, C.d); } },
    { answer: 0, choices: ['APPLE', 'GRAPE', 'LEMON'], draw: function(t) {
        game.draw.rect(SCX - 80 * t, SCY - 60 * t, 160 * t, 150 * t, C.a);
        game.draw.rect(SCX - 8 * t, SCY - 120 * t, 16 * t, 60 * t, C.f); game.draw.rect(SCX + 8 * t, SCY - 120 * t, 40 * t, 24 * t, C.b); } },
    { answer: 1, choices: ['TENT', 'MOUNTAIN', 'ARROW'], draw: function(t) {
        for (var row = 0; row < 140; row += 8) { var rw = row / 140 * 220 * t; game.draw.rect(SCX - rw, SCY - 140 * t + row * t, rw * 2, 8 * t + 1, '#888888'); }
        for (var sr = 0; sr < 40; sr += 8) { var srw = sr / 40 * 56 * t; game.draw.rect(SCX - srw, SCY - 140 * t + sr * t, srw * 2, 8 * t + 1, C.g); } } }
  ];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  var puzzles, cur, revealTimer, phase, selected, feedbackTimer, score, wrongs, timeLeft, done;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x,     y,     { size: sz, color: color,     bold: true, align: align || 'center' });
  }
  function scanlines() { for (var sy = 0; sy < H; sy += 8) game.draw.rect(0, sy, W, 2, '#000000', 0.18); }
  function timeBar() {
    var blocks = 12, lit = Math.ceil(timeLeft / MAX_TIME * blocks);
    for (var i = 0; i < blocks; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < lit ? C.b : '#003b00');
  }

  function initGame() {
    puzzles = PUZZLES.slice();
    for (var s = puzzles.length - 1; s > 0; s--) { var r = Math.floor(Math.random() * (s + 1)); var t = puzzles[s]; puzzles[s] = puzzles[r]; puzzles[r] = t; }
    cur = 0; revealTimer = 0; phase = 'reveal'; selected = -1; feedbackTimer = 0; score = 0; wrongs = 0; timeLeft = MAX_TIME; done = false;
  }
  function nextPuzzle() { cur = (cur + 1) % puzzles.length; revealTimer = 0; phase = 'reveal'; selected = -1; }

  function finish(success) {
    if (done) return;
    done = true;
    resultSuccess = success;
    finalScore = success ? (score * 300 + Math.ceil(timeLeft) * 40) : score * 100;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT)  { state = S.ATTRACT; return; }
    if (done || phase !== 'choose') return;
    for (var i = 0; i < 3; i++) {
      var bx = W / 2 + (i - 1) * 300;
      if (Math.abs(x - bx) < 130 && y >= BTN_Y - 20 && y <= BTN_Y + 180) {
        selected = i; var pz = puzzles[cur];
        if (i === pz.answer) { score++; game.audio.play('se_tap', 0.9); } else { wrongs++; game.audio.play('se_failure', 0.6); }
        phase = 'feedback'; feedbackTimer = 0.7;
        if (score >= NEEDED) finish(true); else if (wrongs >= MAX_WRONG) finish(false);
        break;
      }
    }
  });

  // 世界観: お絵かきクイズ番組。少しずつ現れる線画の正体を3択で当てる。
  function background() {
    game.draw.clear('#0a0018');
    game.draw.rect(100, H * 0.2, W - 200, H * 0.42, '#12102a');
    game.draw.rect(112, H * 0.2 + 12, W - 224, H * 0.42 - 24, '#05000f');
    txt('QUIZ SHOW', W / 2, H * 0.16, 34, C.b);
  }

  function drawButtons() {
    var pz = puzzles[cur];
    txt('WHAT IS IT?', W / 2, H * 0.66, 52, C.c);
    for (var i = 0; i < 3; i++) {
      var bx = W / 2 + (i - 1) * 300, sel = selected === i;
      var ok = phase === 'feedback' && i === pz.answer, ng = phase === 'feedback' && sel && i !== pz.answer;
      var col = ok ? C.b : (ng ? C.a : (sel ? C.d : '#1a0a2a'));
      game.draw.rect(bx - 120, BTN_Y, 240, 170, col);
      txt(pz.choices[i], bx, BTN_Y + 90, 44, C.g);
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!puzzles) initGame();
      background();
      puzzles[cur].draw(1);
      txt(GAME_TITLE,  W / 2, H * 0.68, 76, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.74, 34, C.b);
      if (Math.floor(game.time.elapsed * 1.67) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.86, 64, C.a);
        txt('TAP TO START', W / 2, H * 0.91, 48, C.g);
      }
      scanlines();
      return;
    }
    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'CONGRATULATIONS!' : 'GAME OVER', W / 2, H * 0.35, 80, resultSuccess ? C.c : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 64, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 54, C.b);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (phase === 'reveal') { revealTimer += dt; if (revealTimer >= REVEAL_TIME) { phase = 'choose'; game.audio.play('se_tap', 0.3); } }
      else if (phase === 'feedback') { feedbackTimer -= dt; if (feedbackTimer <= 0 && !done) nextPuzzle(); }
    }

    // ---- draw ----
    background();
    var t = Math.min(1, revealTimer / REVEAL_TIME);
    puzzles[cur].draw(t);
    if (phase === 'reveal') { game.draw.rect(112, H * 0.63, (W - 224) * t, 12, C.e, 0.7); txt('REVEALING...', W / 2, H * 0.66, 40, '#555577'); }
    else drawButtons();
    timeBar();
    for (var s = 0; s < NEEDED; s++) game.draw.rect(W / 2 - 20, 130, 40, 40, s < score ? C.b : '#113322');
    for (var w = 0; w < MAX_WRONG; w++) game.draw.rect(W / 2 + (w - 1) * 64 - 20, 190, 40, 40, w < wrongs ? C.a : '#330011');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
    state = S.ATTRACT;
    initGame();
  });
})(game);
