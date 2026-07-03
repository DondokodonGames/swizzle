// 599-comet-surf.js
// コメットサーフ — 画面を横切る彗星の尾に乗り、スワイプで前後位置を変えて宇宙の破片を避ける
// 操作: 左右スワイプ/タップで尾の上の乗る位置を前後に移動。飛来する破片に当たらないよう回避
// 成功: 12秒 生き残る  失敗: 破片に 3回 衝突

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（アイスブルー、深宇宙サーフ） ──
  var C = { bg:'#000005', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#3355ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'COMET SURF';
  var HOW_TO_PLAY = 'SWIPE / TAP TO SLIDE ALONG THE COMET TAIL · DODGE THE DEBRIS';
  var MAX_TIME = 12;
  var MAX_HITS = 3;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var cometX, cometVX, tailPos, path, surferX, surferY, hits, timeLeft, done, particles, debris, stars, flash, invincible, nextDebris;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.e : '#0a0a2a');
  }

  function background() { game.draw.clear(C.bg); for (var s = 0; s < stars.length; s++) { var st = stars[s]; game.draw.rect(snap(st.x), snap(st.y), st.r, st.r, C.g, 0.4 + Math.sin(st.b) * 0.3); } }

  function initGame() { cometX = -100; cometVX = 400; tailPos = 0.3; path = []; surferX = 0; surferY = 0; hits = 0; timeLeft = MAX_TIME; done = false; particles = []; debris = []; flash = 0; invincible = 0; nextDebris = 1.0; stars = []; for (var s = 0; s < 60; s++) stars.push({ x: Math.random() * W, y: Math.random() * H, r: 8, b: Math.random() * Math.PI * 2 }); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (Math.round(MAX_TIME) * 400 + (MAX_HITS - hits) * 800) : (MAX_TIME - Math.ceil(timeLeft)) * 200;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    for (var ti = 1; ti < Math.min(path.length, 30); ti++) { var p1 = path[ti - 1], p2 = path[ti], tw = (1 - ti / 30) * 12 + 3; game.draw.line(p1.x, p1.y, p2.x, p2.y, C.d, tw); }
    if (path.length) { pc(path[0].x, path[0].y, 26, C.e, 0.9); pc(path[0].x, path[0].y, 38, C.d, 0.3); }
    for (var di = 0; di < debris.length; di++) { var d = debris[di]; pc(d.x, d.y, d.r, C.a, 0.9); pc(d.x - d.r * 0.3, d.y - d.r * 0.3, d.r * 0.3, C.g, 0.5); }
    var blink = invincible > 0 ? (Math.floor(game.time.elapsed * 8) % 2 ? 0.3 : 0.9) : 0.9;
    pc(surferX, surferY, 24, flash > 0 ? C.a : C.f, blink); pc(surferX - 8, surferY - 8, 8, C.c, 0.5 * blink);
  }

  // ── 入力 ──
  game.onSwipe(function(dir) {
    if (state !== S.PLAYING || done) return;
    if (dir === 'left') tailPos = Math.max(0.05, tailPos - 0.12); else if (dir === 'right') tailPos = Math.min(0.95, tailPos + 0.12);
    game.audio.play('se_tap', 0.15);
  });

  game.onTap(function(tx) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    if (tx < W / 2) tailPos = Math.max(0.05, tailPos - 0.08); else tailPos = Math.min(0.95, tailPos + 0.08); game.audio.play('se_tap', 0.1);
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!stars) initGame(); background();
      txt(GAME_TITLE, W / 2, H * 0.30, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.345, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.55, 56, C.a);
        txt('TAP TO START', W / 2, H * 0.59, 42, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'RODE THE COMET!' : 'WIPEOUT', W / 2, H * 0.35, 58, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(true); return; }
      if (flash > 0) flash -= dt * 3; if (invincible > 0) invincible -= dt;
      cometX += cometVX * dt; var cometY = H / 2 + Math.sin((MAX_TIME - timeLeft) * 0.3) * H * 0.28;
      if (cometX > W + 200) { cometX = -100; path = []; }
      path.unshift({ x: cometX, y: cometY }); if (path.length > 80) path.pop();
      var pt = path[Math.min(Math.floor(tailPos * (path.length - 1)), path.length - 1)]; if (pt) { surferX = pt.x; surferY = pt.y; }
      nextDebris -= dt; if (nextDebris <= 0) { debris.push({ x: W + 60, y: 300 + Math.random() * (H - 400), r: 18 + Math.random() * 12, vx: -(200 + Math.random() * 200 * (1 + (MAX_TIME - timeLeft) / 8)), vy: (Math.random() - 0.5) * 80 }); nextDebris = Math.max(0.25, 1.1 - (MAX_TIME - timeLeft) * 0.05); }
      for (var di = debris.length - 1; di >= 0; di--) {
        var d = debris[di]; d.x += d.vx * dt; d.y += d.vy * dt; if (d.x < -100) { debris.splice(di, 1); continue; }
        if (invincible <= 0 && (surferX - d.x) * (surferX - d.x) + (surferY - d.y) * (surferY - d.y) < (d.r + 22) * (d.r + 22)) { hits++; invincible = 1.2; flash = 0.5; game.audio.play('se_failure', 0.5); for (var pi = 0; pi < 8; pi++) { var a = Math.random() * Math.PI * 2; particles.push({ x: surferX, y: surferY, vx: Math.cos(a) * 200, vy: Math.sin(a) * 200, life: 0.4, col: C.a }); } debris.splice(di, 1); if (hits >= MAX_HITS) { finish(false); return; } break; }
      }
      for (var s = 0; s < stars.length; s++) { stars[s].b += dt * 2; stars[s].x -= 20 * dt; if (stars[s].x < 0) stars[s].x += W; }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 2.5; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    if (flash > 0) game.draw.rect(0, 0, W, H, C.a, flash * 0.12);

    timeBar();
    txt(Math.ceil(timeLeft) + 's', W / 2, 96, 44, C.g);
    for (var hi = 0; hi < MAX_HITS; hi++) game.draw.rect(snap(W / 2 + (hi - (MAX_HITS - 1) / 2) * 56) - 10, 168, 20, 20, hi < hits ? C.a : C.b);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.06);
    state = S.ATTRACT;
    initGame();
  });
})(game);
