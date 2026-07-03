// 534-typewriter.js
// タイプライター — 指定された文字（かな）を素早く探してキーをタップし、原稿を打ち上げる
// 操作: 中央に光る指定文字を、下のかなキーボードから探してタップ（違うキーはミス）
// 成功: 8文字 正確入力  失敗: 3ミス or 20秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、活版印刷） ──
  var C = { bg:'#08050a', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // かな入力はゲーム内容そのもの → キー文字は維持し、周辺UIのみ英語化
  var KEYS = [
    ['あ', 'い', 'う', 'え', 'お'],
    ['か', 'き', 'く', 'け', 'こ'],
    ['さ', 'し', 'す', 'せ', 'そ'],
    ['た', 'ち', 'つ', 'て', 'と'],
    ['な', 'に', 'ぬ', 'ね', 'の']
  ];
  var ALL_KEYS = [];
  for (var ri = 0; ri < KEYS.length; ri++) for (var ci = 0; ci < KEYS[ri].length; ci++) ALL_KEYS.push(KEYS[ri][ci]);

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'TYPEWRITER';
  var HOW_TO_PLAY = 'FIND THE GLOWING KANA ON THE KEYBOARD · TAP IT FAST';
  var MAX_TIME = 20;
  var NEEDED   = 8;          // 修正2: 20 → 8
  var MAX_MISS = 3;          // 修正2: 8 → 3
  var BTN_W = 180, BTN_H = 120, BTN_GAP = 16;
  var BTN_OX = snap((W - (5 * (BTN_W + BTN_GAP) - BTN_GAP)) / 2), BTN_OY = snap(H * 0.52);

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var targetKey, typedText, score, misses, timeLeft, done, particles, flash, flashCol, keyAnim, wrongKey, wrongTimer;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.c : '#1a1210');
  }

  function background() { game.draw.clear(C.bg); }

  function pickTarget() { targetKey = ALL_KEYS[Math.floor(Math.random() * ALL_KEYS.length)]; }

  function initGame() { typedText = ''; score = 0; misses = 0; timeLeft = MAX_TIME; done = false; particles = []; flash = 0; flashCol = C.b; keyAnim = {}; wrongKey = ''; wrongTimer = 0; pickTarget(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (score * 500 + Math.ceil(timeLeft) * 100) : score * 200;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    // 原稿ディスプレイ
    game.draw.rect(60, snap(H * 0.15), W - 120, 200, '#0e1420', 0.9);
    game.draw.rect(60, snap(H * 0.15), W - 120, 6, C.e, 0.5);
    txt(typedText.slice(-16) || '_', W / 2, snap(H * 0.15) + 120, 48, C.b);
    // ターゲット
    txt('> ' + targetKey + ' <', W / 2, snap(H * 0.42), 80, C.c);
    // キーボード
    for (var r = 0; r < KEYS.length; r++) for (var c = 0; c < KEYS[r].length; c++) {
      var bx = BTN_OX + c * (BTN_W + BTN_GAP), by = BTN_OY + r * (BTN_H + BTN_GAP), k = KEYS[r][c];
      var isT = k === targetKey, isW = k === wrongKey && wrongTimer > 0, pa = keyAnim[k] || 0;
      var bgc = isT ? '#2a2400' : (isW ? '#2a0010' : '#1c1418'), bd = isT ? C.c : (isW ? C.a : C.d);
      game.draw.rect(bx + 4, by + 4 + pa * 6, BTN_W - 8, BTN_H - 8, bgc, 0.9);
      game.draw.rect(bx + 4, by + 4 + pa * 6, BTN_W - 8, 8, bd, isT ? 0.7 : 0.3);
      if (isT) game.draw.rect(bx + 4, by + 4, BTN_W - 8, BTN_H - 8, C.c, 0.12);
      txt(k, bx + BTN_W / 2, by + BTN_H * 0.62 + pa * 6, 52, isT ? C.c : C.g);
    }
  }

  // ── 入力 ──
  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    for (var r = 0; r < KEYS.length; r++) for (var c = 0; c < KEYS[r].length; c++) {
      var bx = BTN_OX + c * (BTN_W + BTN_GAP), by = BTN_OY + r * (BTN_H + BTN_GAP);
      if (tx >= bx && tx <= bx + BTN_W && ty >= by && ty <= by + BTN_H) {
        var key = KEYS[r][c]; keyAnim[key] = 0.25;
        if (key === targetKey) {
          score++; typedText += key; flash = 0.25; flashCol = C.b; game.audio.play('se_tap', 0.4);
          for (var pi = 0; pi < 5; pi++) { var a = Math.random() * Math.PI * 2; particles.push({ x: bx + BTN_W / 2, y: by + BTN_H / 2, vx: Math.cos(a) * 110, vy: Math.sin(a) * 110, life: 0.3, col: C.c }); }
          if (score >= NEEDED) { finish(true); return; }
          pickTarget();
        } else { misses++; wrongKey = key; wrongTimer = 0.5; flash = 0.3; flashCol = C.a; game.audio.play('se_failure', 0.3); if (misses >= MAX_MISS) { finish(false); return; } }
        return;
      }
    }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!targetKey) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.075, 76, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.11, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 52, C.a);
        txt('TAP TO START', W / 2, H * 0.975, 40, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'MANUSCRIPT DONE!' : 'TYPO!', W / 2, H * 0.35, 58, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt * 4; if (wrongTimer > 0) wrongTimer -= dt;
      for (var k in keyAnim) { keyAnim[k] -= dt * 4; if (keyAnim[k] <= 0) delete keyAnim[k]; }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 3; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.08);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(score + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var mi = 0; mi < MAX_MISS; mi++) game.draw.rect(snap(W / 2 + (mi - (MAX_MISS - 1) / 2) * 56) - 10, 224, 20, 20, mi < misses ? C.a : '#1a1210');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.07);
    state = S.ATTRACT;
    initGame();
  });
})(game);
