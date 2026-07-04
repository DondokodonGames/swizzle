// 669-dial-lock.js
// ダイヤルロック — 3つのダイヤルをタップで回し、上に出た目標の数字にそろえて解錠する
// 操作: ダイヤルをタップすると数字が1増える。3桁すべてを目標値に合わせると解錠
// 成功: 3回 解錠  失敗: 25タップ 超過 or 25秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（アイスブルー、金庫室） ──
  var C = { bg:'#030308', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#3355ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'DIAL LOCK';
  var HOW_TO_PLAY = 'TAP A DIAL TO SPIN IT · MATCH ALL 3 DIALS TO THE TARGET CODE TO UNLOCK';
  var MAX_TIME = 25;
  var NEEDED   = 3;          // 修正2: 10 → 3
  var MAX_TAPS = 25;         // 修正2: 30 → 25
  var NUM_DIALS = 3, DIAL_R = 130, DIAL_X = [W * 0.22, W * 0.5, W * 0.78], DIAL_Y = snap(H * 0.50);

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var dials, targets, activeDial, unlocked, taps, timeLeft, done, particles, flash, flashCol, resultText, resultTimer, lock;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function ring(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) { var d = qx * qx + qy * qy; if (d <= r * r && d >= (r - 12) * (r - 12)) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); } }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.d : '#05050e');
  }

  function background() { game.draw.clear(C.bg); }

  function newTargets() { for (var i = 0; i < NUM_DIALS; i++) targets[i] = Math.floor(Math.random() * 10); }

  function initGame() { dials = [0, 0, 0]; targets = [0, 0, 0]; activeDial = 0; unlocked = 0; taps = 0; timeLeft = MAX_TIME; done = false; particles = []; flash = 0; flashCol = C.b; resultText = ''; resultTimer = 0; lock = false; newTargets(); }

  function checkUnlock() { for (var i = 0; i < NUM_DIALS; i++) if (dials[i] !== targets[i]) return false; return true; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (unlocked * 800 + Math.ceil(timeLeft) * 100) : unlocked * 250;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    game.draw.rect(W * 0.08, DIAL_Y - 180, W * 0.84, 360, '#0a0a14', 0.9);
    game.draw.rect(W * 0.22, DIAL_Y - 260, W * 0.56, 90, '#1e293b', 0.8);
    txt('CODE  ' + targets[0] + '-' + targets[1] + '-' + targets[2], W / 2, DIAL_Y - 205, 48, C.c);
    for (var di = 0; di < NUM_DIALS; di++) {
      var dx = DIAL_X[di], act = di === activeDial, ok = dials[di] === targets[di];
      pc(dx, DIAL_Y, DIAL_R, ok ? C.b : (act ? C.d : '#1e293b'), 0.85);
      pc(dx, DIAL_Y, DIAL_R * 0.72, C.bg, 0.6);
      for (var ni = 0; ni < 10; ni++) { var na = (ni / 10) * Math.PI * 2 - Math.PI / 2; pc(dx + Math.cos(na) * DIAL_R * 0.88, DIAL_Y + Math.sin(na) * DIAL_R * 0.88, 6, C.e, 0.5); }
      txt(dials[di] + '', dx, DIAL_Y + 24, 76, ok ? C.g : C.e);
      if (act) ring(dx, DIAL_Y, DIAL_R + 8, C.e, 0.4);
    }
  }

  // ── 入力 ──
  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || lock) return;
    var hit = false;
    for (var i = 0; i < NUM_DIALS; i++) { var dx = tx - DIAL_X[i], dy = ty - DIAL_Y; if (dx * dx + dy * dy < (DIAL_R + 20) * (DIAL_R + 20)) { activeDial = i; dials[i] = (dials[i] + 1) % 10; taps++; game.audio.play('se_tap', 0.12); hit = true; break; } }
    if (!hit) return;
    if (checkUnlock()) {
      unlocked++; flash = 0.4; flashCol = C.b; resultText = 'UNLOCKED!'; resultTimer = 0.65; game.audio.play('se_success', 0.75);
      for (var p = 0; p < 8; p++) { var pa = Math.random() * Math.PI * 2; particles.push({ x: W / 2, y: DIAL_Y, vx: Math.cos(pa) * 220, vy: Math.sin(pa) * 220, life: 0.5, col: C.c }); }
      if (unlocked >= NEEDED) { finish(true); return; }
      lock = true; setTimeout(function() { if (!done) { newTargets(); dials = [0, 0, 0]; activeDial = 0; taps = 0; lock = false; } }, 700);
    } else if (taps >= MAX_TAPS) { finish(false); return; }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!dials) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.12, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.165, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) txt('► 100円 投入 ◄ TAP TO START', W / 2, H * 0.90, 40, C.a);
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'CRACKED IT!' : 'JAMMED', W / 2, H * 0.35, 64, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt * 3; if (resultTimer > 0) resultTimer -= dt;
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 2.5; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.1);
    if (resultTimer > 0) txt(resultText, W / 2, snap(H * 0.78), 68, flashCol);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(unlocked + ' / ' + NEEDED + '   TAPS ' + (MAX_TAPS - taps), W / 2, 168, 40, C.b);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    state = S.ATTRACT;
    initGame();
  });
})(game);
