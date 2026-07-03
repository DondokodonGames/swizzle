// 445-crystal-crack.js
// クリスタル割り — クリスタルの弱点（黄色マーカー）の方向へスワイプしてハンマーを叩き込み砕く
// 操作: 弱点マーカーが指す向きへスワイプ（角度が合えば割れる）
// 成功: 3個 割る  失敗: 3回 外す or 20秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（アイスブルー、鉱石加工） ──
  var C = { bg:'#04091a', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#3355ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'CRYSTAL CRACK';
  var HOW_TO_PLAY = 'SWIPE TOWARD THE YELLOW WEAK POINT TO SMASH THE CRYSTAL';
  var MAX_TIME = 20;
  var NEEDED   = 3;          // 修正2: 8 → 3
  var MAX_MISS = 3;
  var CX = snap(W / 2), CY = snap(H * 0.44), CR = 120;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var targetAngle, cracks, particles, iphase, swipeAngle, resultTimer, hammerAngle, hammerAnim, broken, misses, timeLeft, done, flash, flashCol;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function pline(x1, y1, x2, y2, color, alpha, w) { var dx = x2 - x1, dy = y2 - y1, n = Math.max(1, Math.ceil(Math.hypot(dx, dy) / 8)); w = w || 8; for (var i = 0; i <= n; i++) game.draw.rect(snap(x1 + dx * i / n) - w / 2, snap(y1 + dy * i / n) - w / 2, w, w, color, alpha); }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#0a1428');
  }

  function background() { game.draw.clear(C.bg); }

  function newCrystal() { targetAngle = Math.floor(Math.random() * 8) * Math.PI / 4 + (Math.random() - 0.5) * 0.3; cracks = []; iphase = 'aim'; swipeAngle = null; hammerAnim = 0; }

  function angleDiff(a, b) { return Math.abs(((a - b + Math.PI * 3) % (Math.PI * 2)) - Math.PI); }

  function initGame() { broken = 0; misses = 0; timeLeft = MAX_TIME; done = false; particles = []; flash = 0; flashCol = C.b; newCrystal(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (broken * 700 + Math.ceil(timeLeft) * 100) : broken * 300;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawCrystal() {
    pc(CX, CY, CR + 20, C.d, 0.15);
    for (var fi = 0; fi < 6; fi++) { var fa = fi * Math.PI / 3, fa2 = (fi + 1) * Math.PI / 3; pline(CX + Math.cos(fa) * CR, CY + Math.sin(fa) * CR, CX + Math.cos(fa2) * CR, CY + Math.sin(fa2) * CR, C.e, 0.9, 6); pline(CX, CY, CX + Math.cos(fa) * CR, CY + Math.sin(fa) * CR, C.e, 0.5, 3); }
    pc(CX, CY, CR - 20, C.e, 0.15); pc(CX - CR * 0.25, CY - CR * 0.25, CR * 0.18, C.g, 0.3);
    // 弱点マーカー
    var tx = CX + Math.cos(targetAngle) * (CR + 60), ty = CY + Math.sin(targetAngle) * (CR + 60); pline(CX + Math.cos(targetAngle) * CR, CY + Math.sin(targetAngle) * CR, tx, ty, C.c, 0.8, 4); pc(tx, ty, 26, C.c, 0.9); pc(tx, ty, 14, C.g, 0.7);
    for (var cr = 0; cr < cracks.length; cr++) { var cx2 = CX + Math.cos(targetAngle) * CR * 0.3, cy2 = CY + Math.sin(targetAngle) * CR * 0.3; pline(cx2, cy2, cx2 + Math.cos(cracks[cr].angle) * cracks[cr].len, cy2 + Math.sin(cracks[cr].angle) * cracks[cr].len, C.g, 0.8, 3); }
    if (iphase !== 'aim') { var hd = 200 + hammerAnim * 150, hx = CX + Math.cos(hammerAngle) * hd, hy = CY + Math.sin(hammerAngle) * hd; pline(CX, CY, hx, hy, C.g, 0.6, 8); pc(hx, hy, 34, '#8090a0', 0.9); pc(hx, hy, 20, C.g, 0.6); }
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
  });

  game.onSwipe(function(d, x1, y1, x2, y2) {
    if (state !== S.PLAYING || done || iphase !== 'aim') return;
    swipeAngle = Math.atan2(y2 - y1, x2 - x1); hammerAngle = swipeAngle; hammerAnim = 0.4; iphase = 'cracking'; game.audio.play('se_tap', 0.5);
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!cracks) initGame(); background(); drawCrystal();
      txt(GAME_TITLE, W / 2, H * 0.72, 74, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.78, 22, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.88, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.93, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'SHATTERED!' : 'MISSED THE MARK', W / 2, H * 0.35, 60, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt * 2; if (hammerAnim > 0) hammerAnim -= dt * 3;
      if (iphase === 'cracking' && hammerAnim <= 0) {
        var ok = angleDiff(swipeAngle, targetAngle) < Math.PI / 8; iphase = 'result'; resultTimer = 0;
        if (ok) { broken++; flash = 0.8; flashCol = C.b; game.audio.play('se_success', 0.7); for (var ci = 0; ci < 6; ci++) cracks.push({ angle: targetAngle + (Math.random() - 0.5) * 0.8, len: 40 + Math.random() * 80 }); for (var pi = 0; pi < 14; pi++) { var a = Math.random() * Math.PI * 2; particles.push({ x: CX + Math.cos(targetAngle) * CR * 0.7, y: CY + Math.sin(targetAngle) * CR * 0.7, vx: Math.cos(a) * 200, vy: Math.sin(a) * 200, life: 0.6, col: C.e }); } if (broken >= NEEDED) { finish(true); return; } }
        else { misses++; flash = 0.7; flashCol = C.a; game.audio.play('se_failure', 0.5); if (misses >= MAX_MISS) { finish(false); return; } }
      }
      if (iphase === 'result') { resultTimer += dt; if (resultTimer > 1.0) newCrystal(); }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawCrystal();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    if (iphase === 'aim') txt('SWIPE TO STRIKE', W / 2, snap(H * 0.80), 44, C.c);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.1);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(broken + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var mi = 0; mi < MAX_MISS; mi++) game.draw.rect(snap(W / 2 + (mi - (MAX_MISS - 1) / 2) * 56) - 10, 224, 20, 20, mi < misses ? C.a : '#0a1428');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.08);
    state = S.ATTRACT;
    initGame();
  });
})(game);
