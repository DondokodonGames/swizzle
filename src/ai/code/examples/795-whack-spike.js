// 795-whack-spike.js
// ワックスパイク — 地面の穴から飛び出すスパイクを、引っ込む前に叩き落とせ
// 操作: タップ — 飛び出したスパイクを素早く叩く
// 成功: 12本 叩く  失敗: 3本 逃す or 24秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、地下） ──
  var C = { bg:'#040608', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var GROUND = '#0f172a', GROUND_HI = '#1e293b', SPIKE = '#ff6600', SPIKE_HI = '#ffd8a0', SPIKE_GLOW = '#5a1c08';

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'WHACK SPIKE';
  var HOW_TO_PLAY = 'TAP THE SPIKES AS THEY POP UP FROM THE HOLES BEFORE THEY DUCK BACK DOWN';
  var MAX_TIME = 24;
  var NEEDED     = 12;       // 修正2: 50 → 12
  var MAX_ESCAPE = 3;        // 修正2: 12 → 3
  var GROUND_Y = snap(H * 0.78), HOLE_COUNT = 6, MAX_ACTIVE = 3;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var holes, spikes, spawnTimer, score, escaped, done, timeLeft, elapsed, particles, flash, flashCol, resultText, resultTimer;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.f : '#04060a');
  }

  function background() { game.draw.clear(C.bg); }

  function initHoles() { holes = []; var cols = 3; for (var hi2 = 0; hi2 < HOLE_COUNT; hi2++) { var col = hi2 % cols, row = Math.floor(hi2 / cols); holes.push({ x: snap(W * 0.18 + col * W * 0.32), y: GROUND_Y - 20 + row * 80, active: false }); } }

  function spawnSpike() {
    var idle = []; for (var i = 0; i < HOLE_COUNT; i++) if (!holes[i].active) idle.push(i);
    if (idle.length === 0) return;
    var idx = idle[Math.floor(Math.random() * idle.length)]; holes[idx].active = true;
    spikes.push({ holeIdx: idx, phase: 'rising', t: 0, alive: true, riseT: Math.max(0.25, 0.45 - score * 0.008), peakT: Math.max(0.3, 0.8 - score * 0.016), height: 0 });
  }

  function initGame() { initHoles(); spikes = []; spawnTimer = 0; score = 0; escaped = 0; done = false; timeLeft = MAX_TIME; elapsed = 0; particles = []; flash = 0; flashCol = C.b; resultText = ''; resultTimer = 0; spawnSpike(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (score * 400 + Math.ceil(timeLeft) * 120) : score * 120;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    game.draw.rect(0, GROUND_Y, W, H - GROUND_Y, GROUND, 1.0); game.draw.rect(0, GROUND_Y, W, 10, GROUND_HI, 0.6);
    for (var hi = 0; hi < HOLE_COUNT; hi++) { var hole = holes[hi]; pc(hole.x, hole.y, 32, '#050c18', 0.95); pc(hole.x, hole.y, 22, '#020409', 0.95); }
    for (var si2 = 0; si2 < spikes.length; si2++) {
      var sp2 = spikes[si2]; if (sp2.height <= 0) continue;
      var h2 = holes[sp2.holeIdx], tipY2 = h2.y - sp2.height, spikeW = 24, col2 = sp2.alive ? SPIKE : '#5a5a5a', alpha = sp2.alive ? 0.9 : 0.4;
      if (sp2.alive) pc(h2.x, tipY2 + sp2.height * 0.3, spikeW + 18, SPIKE_GLOW, 0.2);
      for (var st = 0; st < 8; st++) { var fy = tipY2 + (st / 8) * sp2.height, fw = spikeW * (st / 8) * (0.5 + (8 - st) / 8 * 0.5); pc(h2.x, fy, fw * 0.8, col2, alpha); }
      if (sp2.alive) pc(h2.x, tipY2, 12, SPIKE_HI, 0.8);
    }
  }

  // ── 入力 ──
  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    for (var i = spikes.length - 1; i >= 0; i--) {
      var sp = spikes[i]; if (!sp.alive) continue;
      var h = holes[sp.holeIdx], tipY = h.y - sp.height, dx = tx - h.x, dy = ty - tipY;
      if (Math.sqrt(dx * dx + dy * dy) < 60 || (Math.abs(dx) < 50 && ty > tipY - 10 && ty < h.y + 20)) {
        sp.alive = false; holes[sp.holeIdx].active = false; score++; flash = 0.15; flashCol = C.b; resultText = 'WHACK!'; resultTimer = 0.3; game.audio.play('se_tap', 0.09);
        for (var p = 0; p < 5; p++) { var pa = Math.random() * Math.PI * 2; particles.push({ x: h.x, y: tipY, vx: Math.cos(pa) * 140, vy: Math.sin(pa) * 140 - 60, life: 0.38, col: SPIKE_HI }); }
        if (score >= NEEDED) { finish(true); return; }
        break;
      }
    }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!holes) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.12, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.165, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) txt('► 100円 投入 ◄ TAP TO START', W / 2, H * 0.40, 40, C.a);
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'SPIKE SMASHER!' : 'OUTPOKED', W / 2, H * 0.35, 54, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt; elapsed += dt;
      if (timeLeft <= 0) { finish(score >= NEEDED); return; }
      spawnTimer -= dt; var spawnRate = Math.max(0.4, 0.8 - score * 0.02), activeCount = 0;
      for (var i = 0; i < spikes.length; i++) if (spikes[i].alive) activeCount++;
      if (spawnTimer <= 0 && activeCount < MAX_ACTIVE) { spawnTimer = spawnRate; spawnSpike(); }
      for (var si = spikes.length - 1; si >= 0; si--) {
        var sp = spikes[si];
        if (!sp.alive) { if (sp.height > 0) sp.height = Math.max(0, sp.height - 400 * dt); else { spikes.splice(si, 1); continue; } }
        sp.t += dt;
        if (sp.phase === 'rising') { sp.height = (sp.t / sp.riseT) * 140; if (sp.t >= sp.riseT) { sp.phase = 'peak'; sp.t = 0; sp.height = 140; } }
        else if (sp.phase === 'peak') { if (sp.t >= sp.peakT) { sp.phase = 'falling'; sp.t = 0; } }
        else if (sp.phase === 'falling') { sp.height = 140 * (1 - sp.t / sp.riseT); if (sp.t >= sp.riseT) { sp.alive = false; holes[sp.holeIdx].active = false; escaped++; flash = 0.28; flashCol = C.a; resultText = 'ESCAPED!'; resultTimer = 0.38; game.audio.play('se_failure', 0.28); if (escaped >= MAX_ESCAPE) { finish(false); return; } } }
      }
      if (flash > 0) flash -= dt * 3; if (resultTimer > 0) resultTimer -= dt;
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p2 = particles[pp]; p2.x += p2.vx * dt; p2.y += p2.vy * dt; p2.vy += 300 * dt; p2.life -= dt * 2.5; if (p2.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) { var p3 = particles[pp2]; game.draw.rect(snap(p3.x) - 5, snap(p3.y) - 5, 10, 10, p3.col, p3.life * 2.5); }
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.09);
    if (resultTimer > 0) txt(resultText, W / 2, snap(H * 0.19), 52, flashCol);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(score + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var esi = 0; esi < MAX_ESCAPE; esi++) game.draw.rect(snap(W / 2 + (esi - (MAX_ESCAPE - 1) / 2) * 56) - 10, 224, 20, 20, esi < escaped ? C.a : '#04060a');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    state = S.ATTRACT;
    initGame();
  });
})(game);
