// 376-domino-push.js
// ドミノ倒し — 並んだドミノの先頭を押して、連鎖で最後の1枚まですべて倒しきる
// 操作: 倒したいドミノをタップ（先頭から押さないと手前が残る）
// 成功: 8枚 すべて倒す  失敗: 途中で止まる or 12秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、ドミノ台） ──
  var C = { bg:'#0a0818', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'DOMINO PUSH';
  var HOW_TO_PLAY = 'PUSH THE FIRST DOMINO · TOPPLE THEM ALL';
  var MAX_TIME = 12;
  var N = 8;                 // 修正2: 20 → 8
  var ROW_Y = snap(H * 0.56), DOM_H = 130;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var doms, falling, fallIdx, stopped, timeLeft, done, particles;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function ring(cx, cy, r, color, alpha) { for (var a = 0; a < Math.PI * 2; a += 0.2) game.draw.rect(snap(cx + Math.cos(a) * r) - 4, snap(cy + Math.sin(a) * r) - 4, 8, 8, color, alpha); }

  function pline(x1, y1, x2, y2, color, alpha, w) { var dx = x2 - x1, dy = y2 - y1, n = Math.max(1, Math.ceil(Math.hypot(dx, dy) / 8)); w = w || 8; for (var i = 0; i <= n; i++) game.draw.rect(snap(x1 + dx * i / n) - w / 2, snap(y1 + dy * i / n) - w / 2, w, w, color, alpha); }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#181030');
  }

  function background() { game.draw.clear(C.bg); game.draw.rect(0, ROW_Y + 4, W, H, C.d, 0.18); pline(40, ROW_Y + 4, W - 40, ROW_Y + 4, C.e, 0.4, 4); }

  function setup() { doms = []; var x = snap(W * 0.14), gap = snap((W * 0.72) / (N - 1)); for (var i = 0; i < N; i++) { doms.push({ x: x, angle: 0, standing: true }); x += gap; } }

  function initGame() { setup(); falling = false; fallIdx = 0; stopped = false; timeLeft = MAX_TIME; done = false; particles = []; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    var fallen = 0; for (var i = 0; i < N; i++) if (!doms[i].standing) fallen++;
    finalScore = success ? (N * 400 + Math.ceil(timeLeft) * 100) : fallen * 150;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawDoms() {
    for (var i = 0; i < N; i++) {
      var d = doms[i], rad = d.angle / 180 * Math.PI, tx = d.x + Math.sin(rad) * DOM_H, ty = ROW_Y - Math.cos(rad) * DOM_H;
      pline(d.x, ROW_Y, tx, ty, d.standing ? C.e : C.c, 0.95, 22);
      pc((d.x + tx) / 2, (ROW_Y + ty) / 2, 6, C.g, 0.6);
    }
    if (!falling && !done) { var h = 24 + 6 * (Math.floor(game.time.elapsed * 4) % 2); ring(doms[0].x, ROW_Y - DOM_H / 2, h, C.b, 0.6); txt('PUSH', doms[0].x, ROW_Y - DOM_H - 20, 32, C.b); }
  }

  // ── 入力 ──
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || falling) return;
    var best = -1, bd = 120;
    for (var i = 0; i < N; i++) if (doms[i].standing) { var dd = Math.hypot(x - doms[i].x, y - (ROW_Y - DOM_H / 2)); if (dd < bd) { bd = dd; best = i; } }
    if (best >= 0) { falling = true; fallIdx = best; game.audio.play('se_tap', 0.5); }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!doms) initGame(); background(); drawDoms();
      txt(GAME_TITLE, W / 2, H * 0.20, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.26, 24, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.84, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.89, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background(); drawDoms();
      txt(resultSuccess ? 'ALL DOWN!' : 'STOPPED', W / 2, H * 0.30, 80, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.44, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.60, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (falling && fallIdx < N && doms[fallIdx].standing) {
        doms[fallIdx].angle += 360 * dt;
        if (doms[fallIdx].angle >= 90) {
          doms[fallIdx].angle = 90; doms[fallIdx].standing = false; game.audio.play('se_tap', 0.2);
          for (var k = 0; k < 4; k++) { var a = Math.random() * Math.PI; particles.push({ x: doms[fallIdx].x, y: ROW_Y, vx: Math.cos(a) * 120, vy: -Math.sin(a) * 120 - 40, life: 0.5, col: C.c }); }
          if (fallIdx + 1 < N) fallIdx++;
          else {
            falling = false;
            var all = true; for (var i = 0; i < N; i++) if (doms[i].standing) all = false;
            if (all) { for (var k2 = 0; k2 < 16; k2++) { var a2 = Math.random() * Math.PI * 2; particles.push({ x: W / 2, y: ROW_Y, vx: Math.cos(a2) * 260, vy: Math.sin(a2) * 260, life: 0.7, col: C.b }); } finish(true); }
            else { stopped = true; setTimeout(function() { if (!done) finish(false); }, 1000); }
          }
        }
      }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 300 * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawDoms();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    if (stopped) txt('CHAIN BROKE!', W / 2, snap(H * 0.72), 52, C.a);

    var fallen = 0; for (var fi = 0; fi < N; fi++) if (!doms[fi].standing) fallen++;
    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(fallen + ' / ' + N, W / 2, 168, 48, C.b);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.1);
    state = S.ATTRACT;
    initGame();
  });
})(game);
