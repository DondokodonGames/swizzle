// 741-color-filter.js
// カラーフィルター — 浮かぶ泡から指定色だけをタップして弾く。色は4個ごとに変わる
// 操作: お題の色の泡をタップ。違う色を弾くとミス
// 成功: 12個 弾く  失敗: 3回 ミス or 22秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード。泡色はゲーム内容として保持） ──
  var C = { bg:'#060412', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var COLORS = [
    { name: 'RED', hex: '#ff2079', dark: '#7f1d1d' },
    { name: 'BLUE', hex: '#00cfff', dark: '#1e3a8a' },
    { name: 'YELLOW', hex: '#ffe600', dark: '#78350f' },
    { name: 'GREEN', hex: '#00ff41', dark: '#14532d' },
    { name: 'PURPLE', hex: '#a855f7', dark: '#3b0764' }
  ];
  var CHANGE_EVERY = 4;

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'COLOR FILTER';
  var HOW_TO_PLAY = 'POP ONLY THE BUBBLES OF THE TARGET COLOR · IT CHANGES EVERY FEW POPS';
  var MAX_TIME = 22;
  var NEEDED   = 12;         // 修正2: 40 → 12
  var MAX_ERR  = 3;          // 修正2: 8 → 3

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var targetIdx, bubbles, spawnTimer, score, errors, timeLeft, done, elapsed, particles, flash, flashCol, resultText, resultTimer;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.d : '#0d0820');
  }

  function background() { game.draw.clear(C.bg); }

  function spawnBubble() { var r = 40 + Math.random() * 28; bubbles.push({ x: r + Math.random() * (W - r * 2), y: H + r + 20, r: r, ci: Math.floor(Math.random() * COLORS.length), vx: (Math.random() - 0.5) * 60, vy: -(80 + Math.random() * 70), wobble: Math.random() * Math.PI * 2 }); }

  function initGame() { targetIdx = 0; bubbles = []; spawnTimer = 0.5; score = 0; errors = 0; timeLeft = MAX_TIME; done = false; elapsed = 0; particles = []; flash = 0; flashCol = C.b; resultText = ''; resultTimer = 0; spawnBubble(); spawnBubble(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (score * 500 + Math.ceil(timeLeft) * 100) : score * 150;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    var tgt = COLORS[targetIdx];
    game.draw.rect(W / 2 - 200, 300 - 80, 400, 160, tgt.dark, 0.7);
    pc(W / 2 - 90, 300, 52, tgt.hex, 0.9); txt(tgt.name, W / 2 + 60, 300 + 18, 52, tgt.hex);
    txt('POP THIS', W / 2, 300 - 52, 30, '#ffffff88');
    txt((CHANGE_EVERY - (score % CHANGE_EVERY)) + ' MORE TO CHANGE', W / 2, 480, 32, '#ffffff55');
    for (var bi2 = 0; bi2 < bubbles.length; bi2++) { var b2 = bubbles[bi2]; pc(b2.x, b2.y, b2.r, COLORS[b2.ci].hex, 0.85); pc(b2.x - b2.r * 0.3, b2.y - b2.r * 0.35, b2.r * 0.25, C.g, 0.4); }
  }

  // ── 入力 ──
  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    for (var i = bubbles.length - 1; i >= 0; i--) {
      var b = bubbles[i], dx = tx - b.x, dy = ty - b.y;
      if (dx * dx + dy * dy < (b.r + 12) * (b.r + 12)) {
        if (b.ci === targetIdx) {
          bubbles.splice(i, 1); score++; flash = 0.2; flashCol = C.b; resultText = COLORS[targetIdx].name + '!'; resultTimer = 0.3; game.audio.play('se_tap', 0.1);
          for (var p = 0; p < 6; p++) { var pa = Math.random() * Math.PI * 2; particles.push({ x: tx, y: ty, vx: Math.cos(pa) * 180, vy: Math.sin(pa) * 180, life: 0.35, col: COLORS[targetIdx].hex }); }
          if (score % CHANGE_EVERY === 0) targetIdx = (targetIdx + 1) % COLORS.length;
          if (score >= NEEDED) { finish(true); return; }
        } else {
          errors++; flash = 0.3; flashCol = C.a; resultText = 'WRONG!'; resultTimer = 0.35; game.audio.play('se_failure', 0.25);
          if (errors >= MAX_ERR) { finish(false); return; }
        }
        break;
      }
    }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!bubbles) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.06, 74, C.c);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) txt('► 100円 投入 ◄ TAP TO START', W / 2, H * 0.90, 40, C.a);
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'SHARP EYE!' : 'MIXED UP', W / 2, H * 0.35, 62, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt; elapsed += dt;
      if (timeLeft <= 0) { finish(false); return; }
      spawnTimer -= dt; var rate = Math.max(0.38, 0.55 - score * 0.01); if (spawnTimer <= 0) { spawnTimer = rate; if (bubbles.length < 9) spawnBubble(); }
      for (var bi = bubbles.length - 1; bi >= 0; bi--) { var b = bubbles[bi]; b.wobble += dt * 2.5; b.x += (b.vx + Math.sin(b.wobble) * 18) * dt; b.y += b.vy * dt; if (b.y < -b.r - 40) bubbles.splice(bi, 1); }
      if (flash > 0) flash -= dt * 3; if (resultTimer > 0) resultTimer -= dt;
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 2.8; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 4, snap(particles[pp2].y) - 4, 8, 8, particles[pp2].col, particles[pp2].life * 1.6);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.08);
    if (resultTimer > 0) txt(resultText, W / 2, snap(H * 0.87), 52, flashCol);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(score + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var ei = 0; ei < MAX_ERR; ei++) game.draw.rect(snap(W / 2 + (ei - (MAX_ERR - 1) / 2) * 56) - 10, 224, 20, 20, ei < errors ? C.a : '#0d0820');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    state = S.ATTRACT;
    initGame();
  });
})(game);
