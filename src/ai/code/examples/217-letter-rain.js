// 217-letter-rain.js
// レターレイン — 降ってくる文字群から、指定された文字だけを素早く叩き落とす反射神経
// 操作: 指定文字をタップ
// 成功: 5個正解  失敗: 5回誤タップ or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、文字コード雨） ──
  var C = { bg:'#060410', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'LETTER RAIN';
  var HOW_TO_PLAY = 'TAP ONLY THE TARGET LETTER';
  var MAX_TIME = 15;
  var NEEDED   = 5;           // 修正2: 30 → 5
  var MAX_WRONG = 5;         // 修正2: 10 → 5
  var TARGETS = ['A', 'S', 'D', 'F'];
  var DECOYS = ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', 'G', 'H', 'J', 'K'];
  var TOP = 240, LR = 60;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var letters, currentTarget, targetIdx, score, wrongs, timeLeft, done, spawnTimer, targetTimer, feedback, feedbackOk;

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
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#1a1030');
  }

  function background() { game.draw.clear(C.bg); }

  function drawLetter(l) {
    var isT = l.ch === currentTarget, col = isT ? C.b : C.e;
    if (l.hit) pc(l.x, l.y, LR + 12, isT ? C.b : C.a, l.hitTimer * 2);
    pc(l.x, l.y, LR, col, l.hit ? 0.3 : 0.85);
    txt(l.ch, l.x, l.y + 18, 56, '#000000');
  }

  function spawnLetter() {
    var isTarget = Math.random() < 0.4, ch = isTarget ? currentTarget : DECOYS[Math.floor(Math.random() * DECOYS.length)];
    letters.push({ x: snap(game.random(90, W - 90)), y: TOP - 40, ch: ch, isTarget: ch === currentTarget, vy: 240 + Math.random() * 100, hit: false, hitTimer: 0 });
  }

  function initGame() { letters = []; targetIdx = 0; currentTarget = TARGETS[0]; score = 0; wrongs = 0; timeLeft = MAX_TIME; done = false; spawnTimer = 0.3; targetTimer = 5; feedback = 0; feedbackOk = false; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (score * 400 + Math.ceil(timeLeft) * 50) : score * 120;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function addWrong() { wrongs++; feedbackOk = false; feedback = 0.3; game.audio.play('se_failure', 0.3); if (wrongs >= MAX_WRONG) finish(false); }

  // ── 入力 ──
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    for (var li = letters.length - 1; li >= 0; li--) {
      var l = letters[li]; if (l.hit) continue;
      if (Math.hypot(x - l.x, y - l.y) < LR + 16) {
        l.hit = true; l.hitTimer = 0.3;
        if (l.isTarget) { score++; feedbackOk = true; feedback = 0.2; game.audio.play('se_success', 0.5); if (score >= NEEDED) { finish(true); return; } }
        else { addWrong(); if (done) return; }
        return;
      }
    }
    addWrong();
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      background();
      drawLetter({ x: W * 0.3, y: H * 0.4, ch: 'A', hit: false }); drawLetter({ x: W * 0.7, y: H * 0.5, ch: 'Q', hit: false });
      txt(GAME_TITLE, W / 2, H * 0.14, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.22, 30, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.84, 62, C.a);
        txt('TAP TO START', W / 2, H * 0.90, 48, C.g);
      }
      txt('INSERT COIN', W / 2, H * 0.96, 40, '#554466');
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'CLEARED!' : 'GLITCHED', W / 2, H * 0.35, 82, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (feedback > 0) feedback -= dt;
      targetTimer -= dt; if (targetTimer <= 0) { targetIdx = (targetIdx + 1) % TARGETS.length; currentTarget = TARGETS[targetIdx]; targetTimer = 5 + Math.random() * 3; for (var u = 0; u < letters.length; u++) letters[u].isTarget = letters[u].ch === currentTarget; }
      spawnTimer -= dt; if (spawnTimer <= 0) { spawnLetter(); spawnTimer = 0.55 * (0.7 + Math.random() * 0.6); }
      for (var li = letters.length - 1; li >= 0; li--) {
        var l = letters[li]; l.y += l.vy * dt;
        if (l.hit) { l.hitTimer -= dt; if (l.hitTimer <= 0) letters.splice(li, 1); }
        else if (l.y > H + 60) letters.splice(li, 1);
      }
    }

    // ---- 描画 ----
    background();
    // ターゲット表示
    pc(W / 2, H * 0.135, 70, C.b, 0.3 + 0.2 * (Math.floor(game.time.elapsed * 4) % 2));
    txt('HIT', W / 2, 130, 34, C.b); txt(currentTarget, W / 2, 200, 80, C.c);
    for (var li2 = 0; li2 < letters.length; li2++) drawLetter(letters[li2]);
    if (feedback > 0) game.draw.rect(0, 0, W, H, feedbackOk ? C.b : C.a, feedback * 0.1);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2 - 200, 96, 44, C.g);
    txt(score + ' / ' + NEEDED, W / 2 + 200, 96, 44, C.b);
    for (var mm = 0; mm < MAX_WRONG; mm++) game.draw.rect(snap(W / 2 + (mm - (MAX_WRONG - 1) / 2) * 52) - 10, H - 120, 20, 20, mm < wrongs ? C.a : '#1a1030');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.25);
    state = S.ATTRACT;
    initGame();
  });
})(game);
