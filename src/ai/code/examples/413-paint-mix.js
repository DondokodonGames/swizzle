// 413-paint-mix.js
// ペイントミックス — 赤・黄・青の三原色を配合し、見本と同じ色を作って提出する調色ゲーム
// 操作: R/Y/Bボタンで絵の具を足し、MIXで提出、RESETでやり直し
// 成功: 4色 完成  失敗: 3回 大外れ or 25秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、アトリエ） ──
  var C = { bg:'#0a0812', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff', red:'#ee3344', yel:'#eec522', blu:'#3377ee' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'PAINT MIX';
  var HOW_TO_PLAY = 'ADD R/Y/B PAINT TO MATCH THE TARGET · MIX TO SUBMIT';
  var MAX_TIME = 25;
  var NEEDED   = 4;          // 修正2: 8 → 4
  var MAX_WRONG = 3;
  var MAX_AMT = 5;
  var TARGETS = [{ r: 3, y: 0, b: 0 }, { r: 0, y: 3, b: 0 }, { r: 0, y: 0, b: 3 }, { r: 2, y: 2, b: 0 }, { r: 0, y: 2, b: 2 }, { r: 2, y: 0, b: 2 }, { r: 1, y: 1, b: 1 }, { r: 3, y: 1, b: 0 }];
  var BSY = snap(H * 0.74), BH = 190, BW3 = W / 3;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var rA, yA, bA, targetIdx, correct, wrong, timeLeft, done, particles, flash, flashCol, fbText;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#181030');
  }

  function background() { game.draw.clear(C.bg); }

  function amtRGB(r, y, b) { return [Math.min(255, r * 50 + y * 30), Math.min(255, y * 40), Math.min(255, b * 55)]; }
  function hex(rgb) { return '#' + rgb.map(function(v) { return Math.round(v).toString(16).padStart(2, '0'); }).join(''); }
  function dist(a, b) { return Math.sqrt(Math.pow(a[0] - b[0], 2) + Math.pow(a[1] - b[1], 2) + Math.pow(a[2] - b[2], 2)); }
  function tgt() { return TARGETS[targetIdx % TARGETS.length]; }

  function initGame() { rA = 0; yA = 0; bA = 0; targetIdx = 0; correct = 0; wrong = 0; timeLeft = MAX_TIME; done = false; particles = []; flash = 0; flashCol = C.b; fbText = ''; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (correct * 600 + Math.ceil(timeLeft) * 100) : correct * 250;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function submit() {
    var t = tgt(), d = dist(amtRGB(rA, yA, bA), amtRGB(t.r, t.y, t.b));
    if (d < 40) { correct++; flashCol = C.b; flash = 0.8; fbText = 'PERFECT!'; game.audio.play('se_success', 0.6); for (var p = 0; p < 12; p++) { var ang = Math.random() * Math.PI * 2; particles.push({ x: W / 2, y: H * 0.44, vx: Math.cos(ang) * 200, vy: Math.sin(ang) * 200, life: 0.7, col: hex(amtRGB(rA, yA, bA)) }); } if (correct >= NEEDED) { finish(true); return; } targetIdx++; }
    else if (d < 90) { flashCol = C.c; flash = 0.6; fbText = 'CLOSE'; game.audio.play('se_failure', 0.2); }
    else { wrong++; flashCol = C.a; flash = 0.7; fbText = 'WAY OFF'; game.audio.play('se_failure', 0.4); if (wrong >= MAX_WRONG) { finish(false); return; } }
    rA = 0; yA = 0; bA = 0;
  }

  function drawUI() {
    var t = tgt(), th = hex(amtRGB(t.r, t.y, t.b)), mh = (rA + yA + bA) > 0 ? hex(amtRGB(rA, yA, bA)) : '#2a2040';
    txt('TARGET', W / 2 - 200, H * 0.20, 40, C.g); pc(W / 2 + 80, H * 0.20, 70, th, 0.95);
    txt('R ' + rA + '  Y ' + yA + '  B ' + bA, W / 2, H * 0.32, 42, C.e);
    pc(W / 2, H * 0.44, 110, mh, 0.95); pc(W / 2 - 34, H * 0.44 - 38, 40, C.g, 0.25);
    // MIX / RESET
    game.draw.rect(W / 3 + 20, snap(H * 0.62), W / 3 - 40, snap(H * 0.08), C.d, 0.8); txt('MIX', W / 2, snap(H * 0.66), 48, C.b);
    game.draw.rect(20, snap(H * 0.62), W / 4 - 40, snap(H * 0.08), C.d, 0.5); txt('RESET', W / 8, snap(H * 0.66), 34, C.g);
    // buttons
    game.draw.rect(0, BSY, BW3, BH, C.red, 0.9); txt('R', BW3 / 2, BSY + BH / 2 + 20, 72, C.g);
    game.draw.rect(BW3, BSY, BW3, BH, C.yel, 0.9); txt('Y', BW3 + BW3 / 2, BSY + BH / 2 + 20, 72, C.g);
    game.draw.rect(BW3 * 2, BSY, BW3, BH, C.blu, 0.9); txt('B', BW3 * 2 + BW3 / 2, BSY + BH / 2 + 20, 72, C.g);
    for (var di = 0; di < MAX_AMT; di++) { game.draw.rect(snap(BW3 / 2 - (MAX_AMT - 1) * 16 + di * 32) - 6, BSY + BH - 26, 12, 12, di < rA ? C.g : '#3a1010'); game.draw.rect(snap(BW3 + BW3 / 2 - (MAX_AMT - 1) * 16 + di * 32) - 6, BSY + BH - 26, 12, 12, di < yA ? C.g : '#3a2d00'); game.draw.rect(snap(BW3 * 2 + BW3 / 2 - (MAX_AMT - 1) * 16 + di * 32) - 6, BSY + BH - 26, 12, 12, di < bA ? C.g : '#0a1a3a'); }
  }

  // ── 入力 ──
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    if (y >= BSY && y <= BSY + BH) { if (x < BW3) rA = Math.min(MAX_AMT, rA + 1); else if (x < BW3 * 2) yA = Math.min(MAX_AMT, yA + 1); else bA = Math.min(MAX_AMT, bA + 1); game.audio.play('se_tap', 0.3); return; }
    if (y > H * 0.62 && y < H * 0.70) { if (x > W / 3 && x < W * 2 / 3) { if (rA + yA + bA > 0) submit(); } else if (x < W / 4) { rA = 0; yA = 0; bA = 0; } }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (rA === undefined) initGame(); background(); drawUI();
      txt(GAME_TITLE, W / 2, H * 0.10, 76, C.c);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.54, 56, C.a);
        txt('TAP TO START', W / 2, H * 0.585, 42, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'MASTER MIXER!' : 'OFF PALETTE', W / 2, H * 0.35, 64, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt * 2;
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawUI();
    if (flash > 0) { game.draw.rect(0, 0, W, H, flashCol, flash * 0.1); if (flash > 0.4) txt(fbText, W / 2, H * 0.55, 56, flashCol); }
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(correct + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var wi = 0; wi < MAX_WRONG; wi++) game.draw.rect(snap(W / 2 + (wi - (MAX_WRONG - 1) / 2) * 56) - 10, 224, 20, 20, wi < wrong ? C.a : '#181030');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.1);
    state = S.ATTRACT;
    initGame();
  });
})(game);
