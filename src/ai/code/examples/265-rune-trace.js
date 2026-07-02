// 265-rune-trace.js
// ルーントレース — 光るルーンのパスを記憶し、始点から終点へ指でなぞって魔法を発動させる
// 操作: パスを見たらタップ、続けてスワイプで始点→終点をなぞる
// 成功: 3個のルーンを発動  失敗: 3回失敗 or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、魔法陣） ──
  var C = { bg:'#03010a', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var RUNES = [
    [[0.3,0.8],[0.5,0.2],[0.7,0.8],[0.5,0.5],[0.7,0.3]],
    [[0.3,0.2],[0.3,0.8],[0.7,0.8],[0.7,0.2]],
    [[0.3,0.2],[0.3,0.8],[0.6,0.5],[0.3,0.5]],
    [[0.3,0.8],[0.5,0.2],[0.7,0.8],[0.4,0.5],[0.6,0.5]],
    [[0.6,0.2],[0.3,0.5],[0.6,0.8]]
  ];

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'RUNE TRACE';
  var HOW_TO_PLAY = 'MEMORIZE · TAP · SWIPE START TO END';
  var MAX_TIME = 15;
  var NEEDED   = 3;           // 修正2: 8 → 3
  var MAX_FAIL = 3;
  var CX = snap(W / 2), CY = snap(H * 0.42), SCALE = 240;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var rune, phase, showTimer, completed, failures, timeLeft, done, particles, fbText, fbCol, fbTimer;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function pline(x1, y1, x2, y2, color, alpha) { var len = Math.hypot(x2 - x1, y2 - y1), n = Math.max(1, Math.round(len / 10)); for (var i = 0; i <= n; i++) game.draw.rect(snap(x1 + (x2 - x1) * i / n) - 5, snap(y1 + (y2 - y1) * i / n) - 5, 10, 10, color, alpha); }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#1a0130');
  }

  function background() { game.draw.clear(C.bg); }

  function px(pt) { return { x: CX + (pt[0] - 0.5) * SCALE, y: CY + (pt[1] - 0.5) * SCALE }; }

  function nextRune() { rune = RUNES[Math.floor(Math.random() * RUNES.length)]; phase = 'show'; showTimer = 1.4; }

  function initGame() { completed = 0; failures = 0; timeLeft = MAX_TIME; done = false; particles = []; fbText = ''; fbCol = C.g; fbTimer = 0; nextRune(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (completed * 500 + Math.ceil(timeLeft) * 60) : completed * 150;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawRune(bright) {
    for (var i = 0; i < rune.length - 1; i++) { var a = px(rune[i]), b = px(rune[i + 1]); pline(a.x, a.y, b.x, b.y, bright ? C.d : C.g, bright ? 0.9 : (0.4 + 0.2 * (Math.floor(game.time.elapsed * 4) % 2))); }
    var sp = px(rune[0]), ep = px(rune[rune.length - 1]);
    pc(sp.x, sp.y, 18, C.b, 0.9); txt('S', sp.x, sp.y + 8, 22, '#000');
    pc(ep.x, ep.y, 16, C.f, 0.8); txt('E', ep.x, ep.y + 8, 20, '#000');
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    if (phase === 'show') { phase = 'trace'; game.audio.play('se_tap', 0.2); }
  });

  game.onSwipe(function(dir, x1, y1, x2, y2) {
    if (state !== S.PLAYING || done || phase !== 'trace' || x1 === undefined) return;
    var s = px(rune[0]), e = px(rune[rune.length - 1]);
    var startOk = Math.hypot(x1 - s.x, y1 - s.y) < 120, endOk = Math.hypot(x2 - e.x, y2 - e.y) < 120;
    if (startOk && endOk) {
      completed++; fbText = 'CAST!'; fbCol = C.b; fbTimer = 0.6; game.audio.play('se_success', 0.8);
      for (var pi = 0; pi < 10; pi++) { var a = Math.random() * Math.PI * 2; particles.push({ x: CX, y: CY, vx: Math.cos(a) * 200, vy: Math.sin(a) * 200, life: 0.6 }); }
      if (completed >= NEEDED) { finish(true); return; }
      phase = 'wait'; setTimeout(function() { if (!done && state === S.PLAYING) nextRune(); }, 700);
    } else { failures++; fbText = 'WRONG PATH'; fbCol = C.a; fbTimer = 0.6; game.audio.play('se_failure', 0.5); if (failures >= MAX_FAIL) { finish(false); return; } nextRune(); }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!rune) initGame(); background(); pc(CX, CY, SCALE * 0.62, C.d, 0.15); drawRune(true);
      txt(GAME_TITLE, W / 2, H * 0.16, 78, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.72, 26, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.88, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.93, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'MAGIC CAST!' : 'SPELL FIZZLED', W / 2, H * 0.35, 60, resultSuccess ? C.b : C.a);
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
      if (phase === 'show') { showTimer -= dt; if (showTimer <= 0) phase = 'trace'; }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 150 * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); pc(CX, CY, SCALE * 0.62, C.d, 0.12);
    drawRune(phase === 'show');
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, C.d, particles[pp2].life * 1.4);
    txt(phase === 'show' ? 'MEMORIZE · TAP' : 'SWIPE S ► E', W / 2, H * 0.2, 46, phase === 'trace' ? C.b : C.c);
    if (fbTimer > 0) txt(fbText, W / 2, H * 0.82, 54, fbCol);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(completed + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var fi = 0; fi < MAX_FAIL; fi++) game.draw.rect(snap(W / 2 + (fi - (MAX_FAIL - 1) / 2) * 56) - 10, 224, 20, 20, fi < failures ? C.a : '#1a0130');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.15);
    state = S.ATTRACT;
    initGame();
  });
})(game);
