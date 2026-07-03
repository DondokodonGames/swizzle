// 537-rhythm-fall.js
// リズムフォール — 4レーンを落ちてくるノートを、判定ラインでレーンをタップして叩く
// 操作: 画面を縦4分割、落ちるノートがラインに来た瞬間その列をタップ
// 成功: 12ヒット  失敗: 5ミス or 20秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、音ゲー筐体） ──
  var C = { bg:'#03000a', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var LANE_COLS = [C.a, C.e, C.b, C.c];

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'RHYTHM FALL';
  var HOW_TO_PLAY = 'TAP THE LANE WHEN ITS NOTE HITS THE JUDGE LINE';
  var MAX_TIME = 20;
  var NEEDED   = 12;         // 修正2: 40 → 12
  var MAX_MISS = 5;          // 修正2: 15 → 5
  var LANES = 4, LANE_W = W / 4, HIT_Y = snap(H * 0.80), NOTE_R = 52, NOTE_SPEED = 520, JUDGE = 100;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var notes, hits, misses, timeLeft, done, particles, hitAnims, lastResult, lastTimer, lastCol, nextNote, laneFlash;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.e : '#0a0a1e');
  }

  function background() {
    game.draw.clear(C.bg);
    for (var li = 0; li < LANES; li++) { var lx = li * LANE_W; game.draw.rect(lx + 4, 280, LANE_W - 8, H - 280, LANE_COLS[li], 0.04); if (li > 0) game.draw.rect(lx - 1, 280, 2, H - 280, '#111122', 0.9); if (laneFlash && laneFlash[li] > 0) game.draw.rect(lx, HIT_Y - NOTE_R, LANE_W, NOTE_R * 2, LANE_COLS[li], laneFlash[li] * 0.3); }
    game.draw.rect(0, HIT_Y - 4, W, 8, C.g, 0.4);
  }

  function initGame() { notes = []; hits = 0; misses = 0; timeLeft = MAX_TIME; done = false; particles = []; hitAnims = [0, 0, 0, 0]; lastResult = ''; lastTimer = 0; lastCol = C.b; nextNote = 0.5; laneFlash = [0, 0, 0, 0]; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (hits * 300 + Math.ceil(timeLeft) * 100) : hits * 100;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    for (var li = 0; li < LANES; li++) { var lx = li * LANE_W + LANE_W / 2, ba = hitAnims[li] > 0 ? 0.9 : 0.5; pc(lx, HIT_Y, NOTE_R + 8, LANE_COLS[li], 0.15); pc(lx, HIT_Y, NOTE_R, LANE_COLS[li], ba); }
    for (var ni = 0; ni < notes.length; ni++) { var n = notes[ni]; if (n.hit) continue; var nx = n.lane * LANE_W + LANE_W / 2, al = Math.min(1, Math.max(0.3, 1 - (HIT_Y - n.y) / H)); pc(nx, n.y, NOTE_R, LANE_COLS[n.lane], al * 0.9); pc(nx, n.y, NOTE_R * 0.4, C.g, al * 0.5); }
  }

  // ── 入力 ──
  game.onTap(function(tx) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    var lane = Math.floor(tx / LANE_W); if (lane < 0 || lane >= LANES) return; laneFlash[lane] = 0.3;
    var best = null, bd = Infinity;
    for (var ni = 0; ni < notes.length; ni++) { if (notes[ni].lane !== lane || notes[ni].hit) continue; var d = Math.abs(notes[ni].y - HIT_Y); if (d < JUDGE && d < bd) { bd = d; best = notes[ni]; } }
    if (best) {
      best.hit = true; hits++; hitAnims[lane] = 0.4;
      if (bd < JUDGE * 0.35) { lastResult = 'PERFECT!'; lastCol = C.c; game.audio.play('se_success', 0.8); } else { lastResult = 'GOOD'; lastCol = C.b; game.audio.play('se_tap', 0.5); }
      lastTimer = 0.6;
      for (var pi = 0; pi < 8; pi++) { var a = Math.random() * Math.PI * 2; particles.push({ x: lane * LANE_W + LANE_W / 2, y: HIT_Y, vx: Math.cos(a) * 200, vy: Math.sin(a) * 200, life: 0.35, col: LANE_COLS[lane] }); }
      if (hits >= NEEDED) { finish(true); return; }
    } else { misses++; lastResult = 'MISS'; lastCol = C.a; lastTimer = 0.5; game.audio.play('se_failure', 0.3); if (misses >= MAX_MISS) { finish(false); return; } }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!notes) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.30, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.35, 22, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.52, 56, C.a);
        txt('TAP TO START', W / 2, H * 0.56, 42, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'FULL COMBO!' : 'GAME OVER', W / 2, H * 0.35, 68, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (lastTimer > 0) lastTimer -= dt;
      for (var li = 0; li < LANES; li++) { if (hitAnims[li] > 0) hitAnims[li] -= dt * 3; if (laneFlash[li] > 0) laneFlash[li] -= dt * 4; }
      nextNote -= dt;
      if (nextNote <= 0) { notes.push({ lane: Math.floor(Math.random() * LANES), y: 280 - NOTE_R, hit: false }); if (game.time.elapsed > 8 && Math.random() < 0.25) notes.push({ lane: Math.floor(Math.random() * LANES), y: 280 - NOTE_R, hit: false }); nextNote = 0.5 + Math.random() * 0.4; }
      for (var ni = notes.length - 1; ni >= 0; ni--) {
        var n = notes[ni]; n.y += NOTE_SPEED * dt;
        if (n.y > HIT_Y + JUDGE && !n.hit) { misses++; notes.splice(ni, 1); game.audio.play('se_failure', 0.2); if (misses >= MAX_MISS) { finish(false); return; } }
        else if (n.hit && n.y > HIT_Y + 100) notes.splice(ni, 1);
      }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 2.5; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 7, snap(particles[pp2].y) - 7, 14, 14, particles[pp2].col, particles[pp2].life * 1.5);
    if (lastTimer > 0) txt(lastResult, W / 2, HIT_Y - 160, 64, lastCol);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(hits + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var mi = 0; mi < MAX_MISS; mi++) game.draw.rect(snap(W / 2 + (mi - (MAX_MISS - 1) / 2) * 56) - 10, 224, 20, 20, mi < misses ? C.a : '#0a0a1e');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.09);
    state = S.ATTRACT;
    initGame();
  });
})(game);
