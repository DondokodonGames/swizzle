// 424-whirlpool.js
// 渦巻き脱出 — 中心へ引き込む渦の引力に、スワイプ／タップで逆らって舟を沈めず持ちこたえる
// 操作: スワイプした方向へ舟を漕ぐ／タップした位置へ加速（中心に吸い込まれると沈没）
// 成功: 10秒 持ちこたえる  失敗: 渦の中心に 吸い込まれる

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（アイスブルー、大渦） ──
  var C = { bg:'#030a18', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#3355ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'WHIRLPOOL';
  var HOW_TO_PLAY = 'PADDLE AGAINST THE PULL · DONT GET SUCKED INTO THE CENTER';
  var GOAL = 10;             // 修正2: 120秒 → 10秒
  var CX = snap(W / 2), CY = snap(H / 2), MAX_R = Math.min(W, H) * 0.42, PULL_BASE = 60;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var boatX, boatY, bvx, bvy, whirl, survived, done, particles, foam, danger;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function ring(cx, cy, r, color, alpha) { for (var a = 0; a < Math.PI * 2; a += 0.1) game.draw.rect(snap(cx + Math.cos(a) * r) - 3, snap(cy + Math.sin(a) * r) - 3, 6, 6, color, alpha); }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function survBar() {
    var t = Math.ceil(Math.min(1, survived / GOAL) * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#0a1a2e');
  }

  function background() {
    game.draw.clear(C.bg);
    for (var ri = 5; ri >= 1; ri--) ring(CX, CY, MAX_R * ri / 5, '#123a5a', 0.25);
    for (var si = 0; si < 6; si++) { var sa = whirl + si * Math.PI / 3; for (var sk = 1; sk <= 4; sk++) { var sr = MAX_R * sk / 5; pc(CX + Math.cos(sa + sk * 0.5) * sr, CY + Math.sin(sa + sk * 0.5) * sr, 8, C.e, 0.3); } }
    for (var fi = 0; fi < foam.length; fi++) pc(foam[fi].x, foam[fi].y, 6, C.g, foam[fi].life * 0.5);
    pc(CX, CY, 52, C.d, 0.8); pc(CX, CY, 30, C.e, 0.6); pc(CX, CY, 14, C.g, 0.5);
    if (danger > 0) ring(CX, CY, 170, C.a, danger * 0.3);
  }

  function initGame() { boatX = CX + MAX_R * 0.7; boatY = CY; bvx = 0; bvy = 0; whirl = 0; survived = 0; done = false; particles = []; foam = []; danger = 0; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (Math.round(survived) * 500 + 2000) : Math.round(survived * 200);
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawBoat() { pc(boatX, boatY, 22, C.f, 0.9); pc(boatX - 6, boatY - 8, 8, C.c, 0.7); if (Math.hypot(bvx, bvy) > 100) pc(boatX - bvx * 0.05, boatY - bvy * 0.05, 8, C.g, 0.5); }

  // ── 入力 ──
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return; var dx = x - boatX, dy = y - boatY, d = Math.max(1, Math.hypot(dx, dy)); bvx += dx / d * 400; bvy += dy / d * 400; game.audio.play('se_tap', 0.2);
  });

  game.onSwipe(function(d) {
    if (state !== S.PLAYING || done) return; var f = 550;
    if (d === 'up') bvy -= f; else if (d === 'down') bvy += f; else if (d === 'left') bvx -= f; else if (d === 'right') bvx += f; game.audio.play('se_tap', 0.2);
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    whirl += dt * 2.5;
    if (state === S.ATTRACT) {
      if (boatX === undefined) initGame(); background(); drawBoat();
      txt(GAME_TITLE, W / 2, H * 0.14, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.20, 22, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.86, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.91, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background(); drawBoat();
      txt(resultSuccess ? 'ESCAPED!' : 'SUNK', W / 2, H * 0.30, 80, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.42, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.54, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      survived += dt;
      if (survived >= GOAL) { finish(true); return; }
      var dx = CX - boatX, dy = CY - boatY, d = Math.max(1, Math.hypot(dx, dy));
      var pull = PULL_BASE * (1 + (1 - d / MAX_R) * 3) * (1 + survived * 0.05);
      var tx = -dy / d, ty = dx / d;
      bvx += (dx / d * pull + tx * pull * 0.8) * dt; bvy += (dy / d * pull + ty * pull * 0.8) * dt;
      bvx *= (1 - dt * 2); bvy *= (1 - dt * 2); boatX += bvx * dt; boatY += bvy * dt;
      danger = 1 - Math.min(1, d / (MAX_R * 0.4));
      if (d < 40) { for (var k = 0; k < 16; k++) { var a = Math.random() * Math.PI * 2; particles.push({ x: boatX, y: boatY, vx: Math.cos(a) * 200, vy: Math.sin(a) * 200, life: 0.7, col: C.f }); } finish(false); return; }
      if (Math.random() < 0.3) { var fa = Math.random() * Math.PI * 2, fr = MAX_R * (0.3 + Math.random() * 0.7); foam.push({ x: CX + Math.cos(fa) * fr, y: CY + Math.sin(fa) * fr, life: 1.5, angle: fa }); }
      for (var fi = foam.length - 1; fi >= 0; fi--) { var fd = Math.hypot(foam[fi].x - CX, foam[fi].y - CY); foam[fi].angle += dt * (1 + (MAX_R - fd) / MAX_R * 3); foam[fi].x = CX + Math.cos(foam[fi].angle) * fd * (1 - dt * 0.2); foam[fi].y = CY + Math.sin(foam[fi].angle) * fd * (1 - dt * 0.2); foam[fi].life -= dt; if (foam[fi].life <= 0) foam.splice(fi, 1); }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawBoat();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);

    survBar();
    txt(survived.toFixed(1) + 's', W / 2, 96, 44, C.g);
    txt(survived.toFixed(1) + ' / ' + GOAL + 's', W / 2, 168, 48, C.b);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.12);
    state = S.ATTRACT;
    initGame();
  });
})(game);
