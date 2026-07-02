// 284-beat-boxer.js
// ビートボクサー — ビートで現れるパンチ/キックの合図を、左右タップで正しく叩き込む格闘リズム
// 操作: 左タップでパンチ、右タップでキック（合図の種類に合わせて）
// 成功: 3コンボ  失敗: 3回外す or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、格闘リング） ──
  var C = { bg:'#040208', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'BEAT BOXER';
  var HOW_TO_PLAY = 'TAP ◄ PUNCH · KICK ► ON THE CUE';
  var MAX_TIME = 15;
  var NEEDED   = 3;           // 修正2: 30 → 3
  var MAX_MISS = 3;          // 修正2: 10 → 3
  var BEAT = 0.7, CUE_LIFE = 1.0, TOP = 220;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var beatTimer, beat, combo, misses, cues, timeLeft, done, particles, fbText, fbCol, fbTimer, lastAct, actTimer;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function ring(cx, cy, r, color, alpha) { for (var a = 0; a < Math.PI * 2; a += 0.25) game.draw.rect(snap(cx + Math.cos(a) * r) - 4, snap(cy + Math.sin(a) * r) - 4, 8, 8, color, alpha); }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#1a1030');
  }

  function background() { game.draw.clear(C.bg); game.draw.rect(0, H * 0.5, W / 2, H * 0.36, C.e, 0.05); game.draw.rect(W / 2, H * 0.5, W / 2, H * 0.36, C.b, 0.05); }

  function drawCue(cue) { var lr = cue.life / CUE_LIFE, col = cue.type === 'punch' ? C.e : C.b, r = 60 * (0.5 + 0.5 * lr); ring(cue.x, cue.y, r + 14, col, lr * 0.6); pc(cue.x, cue.y, r, col, 0.85 * lr); txt(cue.type === 'punch' ? 'P' : 'K', cue.x, cue.y + 16, 52, '#000'); }

  function spawnCue() { var type = Math.random() < 0.5 ? 'punch' : 'kick'; cues.push({ type: type, x: type === 'punch' ? W * 0.3 : W * 0.7, y: snap(game.random(H * 0.5, H * 0.72)), life: CUE_LIFE }); }

  function initGame() { beatTimer = 0.5; beat = 0; combo = 0; misses = 0; cues = []; timeLeft = MAX_TIME; done = false; particles = []; fbText = ''; fbCol = C.g; fbTimer = 0; lastAct = null; actTimer = 0; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (combo * 500 + Math.ceil(timeLeft) * 60) : combo * 120;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function addMiss() { misses++; combo = 0; fbText = 'MISS'; fbCol = C.a; fbTimer = 0.4; game.audio.play('se_failure', 0.4); if (misses >= MAX_MISS) finish(false); }

  // ── 入力 ──
  game.onTap(function(x) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    var side = x < W / 2 ? 'punch' : 'kick';
    lastAct = side; actTimer = 0.3;
    for (var i = cues.length - 1; i >= 0; i--) { var cue = cues[i]; if (cue.type === side && cue.life > 0.1) { combo++; fbText = side === 'punch' ? 'PUNCH!' : 'KICK!'; fbCol = side === 'punch' ? C.e : C.b; fbTimer = 0.4; game.audio.play('se_success', 0.5); for (var pk = 0; pk < 6; pk++) { var a = Math.random() * Math.PI * 2; particles.push({ x: cue.x, y: cue.y, vx: Math.cos(a) * 200, vy: Math.sin(a) * 200, life: 0.4, col: fbCol }); } cues.splice(i, 1); if (combo >= NEEDED) { finish(true); return; } return; } }
    addMiss();
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      background(); drawCue({ type: 'punch', x: W * 0.3, y: H * 0.55, life: CUE_LIFE }); drawCue({ type: 'kick', x: W * 0.7, y: H * 0.6, life: CUE_LIFE });
      txt(GAME_TITLE, W / 2, H * 0.14, 80, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.22, 26, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.88, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.93, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'KO COMBO!' : 'DOWN', W / 2, H * 0.35, 80, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (fbTimer > 0) fbTimer -= dt; if (actTimer > 0) actTimer -= dt;
      beatTimer -= dt; if (beatTimer <= 0) { beatTimer = BEAT; beat++; spawnCue(); }
      for (var i = cues.length - 1; i >= 0; i--) { cues[i].life -= dt; if (cues[i].life <= 0) { cues.splice(i, 1); addMiss(); if (done) return; } }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background();
    var fx = W / 2 + (lastAct === 'punch' && actTimer > 0 ? -30 : lastAct === 'kick' && actTimer > 0 ? 30 : 0);
    game.draw.rect(snap(fx) - 24, snap(H * 0.62), 48, 90, C.f, 0.9); pc(fx, H * 0.62 - 24, 30, C.c, 0.9);
    for (var i2 = 0; i2 < cues.length; i2++) drawCue(cues[i2]);
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 2);
    if (fbTimer > 0) txt(fbText, W / 2, H * 0.4, 56, fbCol);
    txt('◄ PUNCH', W * 0.25, H - 90, 40, C.e); txt('KICK ►', W * 0.75, H - 90, 40, C.b);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt('COMBO ' + combo + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var mm = 0; mm < MAX_MISS; mm++) game.draw.rect(snap(W / 2 + (mm - (MAX_MISS - 1) / 2) * 56) - 10, 224, 20, 20, mm < misses ? C.a : '#1a1030');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.25);
    state = S.ATTRACT;
    initGame();
  });
})(game);
