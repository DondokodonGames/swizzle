// 251-memory-palace.js
// メモリーパレス — 記憶宮殿。一瞬光ったアイテムの置き場所を覚え、消えた後に同じマスをタップ
// 操作: アイテムが消えたら元あったマスをタップ
// 成功: 3問正解  失敗: 3問外す or 20秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、記憶の間） ──
  var C = { bg:'#060310', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var ITEMS = ['A', 'B', 'C', 'D', 'E', 'F'];

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'MEMORY PALACE';
  var HOW_TO_PLAY = 'REMEMBER THE SPOT · TAP IT AFTER IT HIDES';
  var MAX_TIME = 20;
  var NEEDED   = 3;           // 修正2: 10 → 3
  var MAX_WRONG = 3;
  var GC = 3, GR = 3, CW = snap((W - 80) / GC), CH = snap((H * 0.5) / GR), GX = 40, GY = snap(H * 0.32);
  var SHOW_DUR = 1.4;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var phase, item, pos, correct, wrongs, round, showTimer, timeLeft, done, fbText, fbCol, fbTimer, particles;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#1a1030');
  }

  function background() { game.draw.clear(C.bg); game.draw.rect(GX - 12, GY - 12, GC * CW + 24, GR * CH + 24, C.d, 0.3); }

  function cell(p) { var col = p % GC, row = Math.floor(p / GC); return { x: GX + col * CW, y: GY + row * CH, cx: GX + col * CW + CW / 2, cy: GY + row * CH + CH / 2 }; }

  function drawGrid() { for (var i = 0; i < GC * GR; i++) { var r = cell(i); game.draw.rect(r.x + 4, r.y + 4, CW - 8, CH - 8, '#1a1030', 0.6); } }

  function startRound() { round++; phase = 'show'; showTimer = SHOW_DUR; pos = Math.floor(Math.random() * (GC * GR)); item = ITEMS[Math.floor(Math.random() * ITEMS.length)]; }

  function initGame() { correct = 0; wrongs = 0; round = 0; timeLeft = MAX_TIME; done = false; fbText = ''; fbCol = C.g; fbTimer = 0; particles = []; startRound(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (correct * 500 + Math.ceil(timeLeft) * 60) : correct * 150;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  // ── 入力 ──
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || phase !== 'input') return;
    var picked = -1; for (var i = 0; i < GC * GR; i++) { var r = cell(i); if (x >= r.x && x < r.x + CW && y >= r.y && y < r.y + CH) { picked = i; break; } }
    if (picked < 0) return;
    if (picked === pos) { correct++; fbText = 'CORRECT!'; fbCol = C.b; fbTimer = 0.5; game.audio.play('se_success', 0.7); var r2 = cell(picked); for (var pi = 0; pi < 8; pi++) { var a = Math.random() * Math.PI * 2; particles.push({ x: r2.cx, y: r2.cy, vx: Math.cos(a) * 140, vy: Math.sin(a) * 140, life: 0.5 }); } if (correct >= NEEDED) { finish(true); return; } phase = 'wait'; setTimeout(function() { if (!done && state === S.PLAYING) startRound(); }, 600); }
    else { wrongs++; fbText = 'WRONG'; fbCol = C.a; fbTimer = 0.5; game.audio.play('se_failure', 0.5); if (wrongs >= MAX_WRONG) { finish(false); return; } phase = 'reveal'; setTimeout(function() { if (!done && state === S.PLAYING) startRound(); }, 700); }
  });

  // ── 更新 & 描画 ──
  function drawItem() { var r = cell(pos), glow = Math.floor(game.time.elapsed * 6) % 2; game.draw.rect(r.x + 4, r.y + 4, CW - 8, CH - 8, C.d, glow ? 0.6 : 0.3); game.draw.rect(r.cx - 40, r.cy - 40, 80, 80, C.c, 0.9); txt(item, r.cx, r.cy + 24, 60, '#000'); }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      background(); drawGrid(); pos = Math.floor(game.time.elapsed) % (GC * GR); item = 'A'; drawItem();
      txt(GAME_TITLE, W / 2, H * 0.16, 72, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.24, 26, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.88, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.93, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'PERFECT RECALL!' : 'FORGOTTEN', W / 2, H * 0.35, 58, resultSuccess ? C.b : C.a);
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
      if (phase === 'show') { showTimer -= dt; if (showTimer <= 0) { phase = 'input'; game.audio.play('se_tap', 0.2); } }
      for (var pi = particles.length - 1; pi >= 0; pi--) { var p = particles[pi]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) particles.splice(pi, 1); }
    }

    // ---- 描画 ----
    background(); drawGrid();
    if (phase === 'show' || phase === 'reveal') drawItem();
    for (var pp = 0; pp < particles.length; pp++) game.draw.rect(snap(particles[pp].x) - 5, snap(particles[pp].y) - 5, 10, 10, C.b, particles[pp].life * 2);
    txt(phase === 'show' ? 'MEMORIZE!' : phase === 'input' ? 'WHERE WAS ' + item + '?' : 'THERE!', W / 2, H * 0.88, 48, phase === 'input' ? C.c : C.b);
    if (fbTimer > 0) txt(fbText, W / 2, H * 0.94, 48, fbCol);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(correct + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var mm = 0; mm < MAX_WRONG; mm++) game.draw.rect(snap(W / 2 + (mm - (MAX_WRONG - 1) / 2) * 56) - 10, 224, 20, 20, mm < wrongs ? C.a : '#1a1030');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.15);
    state = S.ATTRACT;
    initGame();
  });
})(game);
