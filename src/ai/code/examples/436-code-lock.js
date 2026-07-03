// 436-code-lock.js
// 暗号錠 — 一瞬光る3桁の暗証番号を記憶し、ダイヤルを合わせて金庫を解錠する
// 操作: 上下スワイプで数字を変更、左右スワイプ／タップでダイヤル移動、UNLOCKをタップで確定
// 成功: 2回 解錠  失敗: 3回 ミス or 30秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、金庫室） ──
  var C = { bg:'#060408', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'CODE LOCK';
  var HOW_TO_PLAY = 'MEMORIZE THE 3-DIGIT CODE · DIAL IT IN · UNLOCK';
  var MAX_TIME = 30;
  var DIGITS = 3;            // 修正2: 5 → 3
  var NEEDED   = 2;          // 修正2: 3 → 2
  var MAX_MISS = 3;
  var PEEK_DUR = 2.2;
  var DW = snap(W * 0.2), DH = snap(H * 0.11), GAP = 20, TW = DIGITS * DW + (DIGITS - 1) * GAP, DX0 = snap((W - TW) / 2), DY = snap(H * 0.48);

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var code, dials, sel, iphase, peekTimer, flashDigit, flashTimer, solved, misses, timeLeft, done, particles, flash, flashCol;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#181018');
  }

  function background() { game.draw.clear(C.bg); game.draw.rect(snap(W * 0.08), snap(H * 0.20), snap(W * 0.84), snap(H * 0.60), '#1a1830', 0.9); pc(W * 0.5, snap(H * 0.32), 56, C.f, 0.7); pc(W * 0.5, snap(H * 0.32), 24, '#1a1830', 0.9); }

  function genCode() { code = []; for (var i = 0; i < DIGITS; i++) code.push(Math.floor(Math.random() * 10)); dials = []; for (var j = 0; j < DIGITS; j++) dials.push(0); sel = 0; iphase = 'peek'; peekTimer = 0; flashDigit = 0; flashTimer = 0; }

  function initGame() { solved = 0; misses = 0; timeLeft = MAX_TIME; done = false; particles = []; flash = 0; flashCol = C.b; genCode(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (solved * 900 + Math.ceil(timeLeft) * 100) : solved * 400;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function submit() {
    var ok = true; for (var i = 0; i < DIGITS; i++) if (dials[i] !== code[i]) ok = false;
    if (ok) { solved++; flash = 0.9; flashCol = C.b; game.audio.play('se_success', 0.8); for (var p = 0; p < 16; p++) { var a = Math.random() * Math.PI * 2; particles.push({ x: W / 2, y: DY, vx: Math.cos(a) * 200, vy: Math.sin(a) * 200 - 100, life: 0.8, col: C.c }); } if (solved >= NEEDED) { finish(true); return; } iphase = 'result'; setTimeout(function() { if (!done && state === S.PLAYING) genCode(); }, 1000); }
    else { misses++; flash = 0.7; flashCol = C.a; game.audio.play('se_failure', 0.5); if (misses >= MAX_MISS) { finish(false); return; } iphase = 'result'; setTimeout(function() { if (!done && state === S.PLAYING) genCode(); }, 900); }
  }

  function drawDials() {
    for (var di = 0; di < DIGITS; di++) {
      var dx = DX0 + di * (DW + GAP) + DW / 2;
      game.draw.rect(dx - DW / 2, DY - DH / 2, DW, DH, '#2a2848', 0.9);
      if (iphase === 'peek') { var fl = di === flashDigit; game.draw.rect(dx - DW / 2, DY - DH / 2, DW, DH, C.c, fl ? 0.25 : 0); txt(code[di] + '', dx, DY + 24, 90, fl ? C.c : C.g); }
      else { var selHi = di === sel && iphase === 'enter', ok = iphase === 'result' && dials[di] === code[di], nc = ok ? C.b : iphase === 'result' ? C.a : C.g; if (selHi) { game.draw.rect(dx - DW / 2, DY - DH / 2, DW, 6, C.c, 0.8); game.draw.rect(dx - DW / 2, DY + DH / 2 - 6, DW, 6, C.c, 0.8); } txt(((dials[di] + 9) % 10) + '', dx, DY - DH * 0.32 + 12, 44, '#556'); txt(dials[di] + '', dx, DY + 24, 82, nc); txt(((dials[di] + 1) % 10) + '', dx, DY + DH * 0.32 + 12, 44, '#556'); }
    }
    if (iphase === 'enter') { game.draw.rect(W * 0.3, snap(H * 0.66), W * 0.4, 70, C.d, 0.8); txt('UNLOCK', W / 2, snap(H * 0.695), 48, C.c); txt('SWIPE UP/DOWN=NUM  L/R=MOVE', W / 2, snap(H * 0.76), 26, '#889'); }
  }

  // ── 入力 ──
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || iphase !== 'enter') return;
    for (var di = 0; di < DIGITS; di++) { var dx = DX0 + di * (DW + GAP) + DW / 2; if (Math.abs(x - dx) < DW / 2 && Math.abs(y - DY) < DH) { sel = di; game.audio.play('se_tap', 0.2); return; } }
    if (y > H * 0.64 && y < H * 0.72) submit();
  });

  game.onSwipe(function(d) {
    if (state !== S.PLAYING || done || iphase !== 'enter') return;
    if (d === 'up') dials[sel] = (dials[sel] + 1) % 10; else if (d === 'down') dials[sel] = (dials[sel] + 9) % 10; else if (d === 'right') sel = Math.min(DIGITS - 1, sel + 1); else if (d === 'left') sel = Math.max(0, sel - 1);
    game.audio.play('se_tap', 0.25);
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!code) initGame(); background();
      txt(GAME_TITLE, W / 2, H * 0.62, 78, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.68, 22, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.86, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.91, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'CRACKED IT!' : 'LOCKED OUT', W / 2, H * 0.55, 66, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.62, 56, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.70, 46, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt * 1.5;
      if (iphase === 'peek') { peekTimer += dt; flashTimer += dt; if (flashTimer > 0.45) { flashTimer = 0; flashDigit++; } if (peekTimer >= PEEK_DUR) { iphase = 'enter'; flashDigit = -1; } }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 300 * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawDials();
    if (iphase === 'peek') txt('MEMORIZE  ' + (PEEK_DUR - peekTimer).toFixed(1), W / 2, snap(H * 0.66), 48, C.c);
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.1);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(solved + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var mi = 0; mi < MAX_MISS; mi++) game.draw.rect(snap(W / 2 + (mi - (MAX_MISS - 1) / 2) * 56) - 10, 224, 20, 20, mi < misses ? C.a : '#181018');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.1);
    state = S.ATTRACT;
    initGame();
  });
})(game);
