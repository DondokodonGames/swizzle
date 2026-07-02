// 253-crop-harvest.js
// クロップハーベスト — 畑の野菜が熟した一瞬を見計らってタップ収穫、採りごろほど高得点
// 操作: 熟した野菜をタップ（ピークで最大得点）
// 成功: 20ポイント獲得  失敗: 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、ドット畑） ──
  var C = { bg:'#0a0e04', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#3a2410', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var VEG = [C.f, C.b, C.a, C.c];

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'CROP HARVEST';
  var HOW_TO_PLAY = 'TAP RIPE CROPS AT THEIR PEAK';
  var MAX_TIME = 15;
  var NEEDED   = 20;          // 修正2: 100 → 20
  var GC = 3, GR = 3, CW = snap((W - 60) / GC), CH = snap((H * 0.5) / GR), GX = 30, GY = snap(H * 0.32);

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var crops, score, timeLeft, done, particles;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#1a1a0a');
  }

  function background() { game.draw.clear(C.bg); game.draw.rect(0, GY - 20, W, GR * CH + 40, C.d, 0.5); }

  function scoreFor(c) { var f = c.ripeTimer / c.ripeDur; return f < 0.5 ? Math.round(4 + f * 8) : Math.round(8 - (f - 0.5) * 8); }

  function initCrops() {
    crops = [];
    for (var row = 0; row < GR; row++) for (var col = 0; col < GC; col++) crops.push({ cx: GX + col * CW + CW / 2, cy: GY + row * CH + CH / 2, growTimer: Math.random() * 3, growDur: 2 + Math.random() * 2, ripeTimer: 0, ripeDur: 1.2 + Math.random() * 0.8, overTimer: 0, overDur: 1.2, state: 'seed', type: Math.floor(Math.random() * VEG.length), flash: 0, growP: 0, replant: 0 });
  }

  function initGame() { initCrops(); score = 0; timeLeft = MAX_TIME; done = false; particles = []; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (score * 100 + Math.ceil(timeLeft) * 50) : score * 40;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawCrop(c, ci) {
    if (c.state === 'growing') { var sz = 20 + c.growP * 30; pc(c.cx, c.cy, sz, VEG[c.type], 0.5 * c.growP + 0.2); }
    else if (c.state === 'ripe') { var pulse = 0.85 + 0.15 * (Math.floor(game.time.elapsed * 6 + ci) % 2); pc(c.cx, c.cy, 48 * pulse, VEG[c.type], 0.9); pc(c.cx - 14, c.cy - 14, 8, C.g, 0.6); txt('+' + scoreFor(c), c.cx, c.cy - 56, 30, C.c); }
    else if (c.state === 'over') { pc(c.cx, c.cy, 36, '#5a3a10', 0.7); }
    else if (c.state === 'harvested' && c.flash > 0) pc(c.cx, c.cy, 44 * c.flash / 0.5, C.b, c.flash);
  }

  // ── 入力 ──
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    for (var ci = 0; ci < crops.length; ci++) {
      var c = crops[ci]; if (c.state !== 'ripe' && c.state !== 'growing') continue;
      if ((x - c.cx) * (x - c.cx) + (y - c.cy) * (y - c.cy) < (CW * 0.42) * (CW * 0.42)) {
        var pts = c.state === 'ripe' ? scoreFor(c) : 1; score += pts; c.state = 'harvested'; c.flash = 0.5; c.replant = 1.5 + Math.random() * 1.5; game.audio.play('se_success', 0.5);
        for (var pi = 0; pi < 5; pi++) { var a = Math.random() * Math.PI * 2; particles.push({ x: c.cx, y: c.cy, vx: Math.cos(a) * 100, vy: Math.sin(a) * 100, life: 0.5 }); }
        if (score >= NEEDED) { finish(true); return; }
        return;
      }
    }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!crops) initGame(); background(); for (var i = 0; i < crops.length; i++) pc(crops[i].cx, crops[i].cy, 40, VEG[crops[i].type], 0.8);
      txt(GAME_TITLE, W / 2, H * 0.16, 78, C.c);
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
      txt(resultSuccess ? 'BIG HARVEST!' : 'WITHERED', W / 2, H * 0.35, 66, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      for (var ci = 0; ci < crops.length; ci++) {
        var c = crops[ci]; if (c.flash > 0) c.flash -= dt;
        if (c.state === 'seed') { c.growTimer -= dt; if (c.growTimer <= 0) { c.state = 'growing'; c.growP = 0; } }
        else if (c.state === 'growing') { c.growP = Math.min(1, c.growP + dt / c.growDur); if (c.growP >= 1) { c.state = 'ripe'; c.ripeTimer = 0; game.audio.play('se_tap', 0.1); } }
        else if (c.state === 'ripe') { c.ripeTimer += dt; if (c.ripeTimer >= c.ripeDur) { c.state = 'over'; c.overTimer = 0; } }
        else if (c.state === 'over') { c.overTimer += dt; if (c.overTimer >= c.overDur) { c.state = 'harvested'; c.replant = 1.5; } }
        else if (c.state === 'harvested') { if (c.replant > 0) { c.replant -= dt; if (c.replant <= 0) { c.state = 'seed'; c.growTimer = 0.5 + Math.random() * 1.5; c.growDur = 2 + Math.random() * 2; c.ripeDur = 1 + Math.random(); c.type = Math.floor(Math.random() * VEG.length); } } }
      }
      for (var pi = particles.length - 1; pi >= 0; pi--) { var p = particles[pi]; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 200 * dt; p.life -= dt; if (p.life <= 0) particles.splice(pi, 1); }
    }

    // ---- 描画 ----
    background();
    for (var ci2 = 0; ci2 < crops.length; ci2++) drawCrop(crops[ci2], ci2);
    for (var pp = 0; pp < particles.length; pp++) game.draw.rect(snap(particles[pp].x) - 5, snap(particles[pp].y) - 5, 10, 10, C.b, particles[pp].life * 1.6);

    game.draw.rect(0, H - 60, W * Math.min(1, score / NEEDED), 14, C.b, 0.8);
    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(score + ' / ' + NEEDED + ' PT', W / 2, 168, 48, C.b);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.2);
    state = S.ATTRACT;
    initGame();
  });
})(game);
