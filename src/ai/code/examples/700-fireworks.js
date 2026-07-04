// 700-fireworks.js
// ファイアワークス — タップした場所へ花火を打ち上げ、夜空を彩る
// 操作: タップで花火を発射。打ち上げた花火が自動で炸裂する
// 成功: 10発 打ち上げる  失敗: 25秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、夜空／花火色は保持） ──
  var C = { bg:'#000108', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var ROCKET = '#ffe600';
  var PALETTES = [
    ['#ff2079', '#fca5a5', '#fee2e2'], ['#ff6600', '#fdba74', '#ffedd5'],
    ['#ffe600', '#fde68a', '#fef9c3'], ['#00ff41', '#86efac', '#dcfce7'],
    ['#00cfff', '#7dd3fc', '#e0f2fe'], ['#7700ff', '#a5b4fc', '#e0e7ff'],
    ['#e879f9', '#f0abfc', '#fae8ff'], ['#ff2079', '#f9a8d4', '#fce7f3']
  ];

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'FIREWORKS';
  var HOW_TO_PLAY = 'TAP ANYWHERE TO LAUNCH A FIREWORK · PAINT THE NIGHT SKY';
  var MAX_TIME = 25;
  var NEEDED   = 10;         // 修正2: 30 → 10

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var rockets, explosions, stars, launched, timeLeft, done, elapsed;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.f : '#000208');
  }

  function background() {
    game.draw.clear(C.bg);
    for (var sti = 0; sti < stars.length; sti++) { var s = stars[sti]; var tw = 0.3 + 0.7 * Math.abs(Math.sin(elapsed * 1.5 + s.p)); game.draw.rect(snap(s.x), snap(s.y), s.r, s.r, C.g, tw * 0.5); }
    game.draw.rect(0, H * 0.88, W, H * 0.12, '#020410', 1.0);
    var buildings = [80, 120, 60, 100, 150, 80, 200, 70, 110, 90, 160, 75, 130], bw = W / buildings.length;
    for (var bi = 0; bi < buildings.length; bi++) game.draw.rect(bi * bw + 4, H * 0.88 - buildings[bi], bw - 8, buildings[bi] + H * 0.12, '#050510', 1.0);
  }

  function launchRocket(tx, ty) {
    var targetY = Math.max(H * 0.12, Math.min(H * 0.55, ty)), palette = PALETTES[Math.floor(Math.random() * PALETTES.length)];
    rockets.push({ x: tx, y: H * 0.95, targetY: targetY, vy: -(H * 0.95 - targetY) / 0.9, trail: [], palette: palette, exploded: false });
  }

  function explodeRocket(r) {
    r.exploded = true; var palette = r.palette, count = 60 + Math.floor(Math.random() * 40), parts = [], style = Math.floor(Math.random() * 3);
    for (var i = 0; i < count; i++) {
      var angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.4, speed, life;
      if (style === 0) { speed = 200 + Math.random() * 300; life = 0.8 + Math.random() * 0.5; }
      else if (style === 1) { speed = 280 + Math.random() * 40; life = 0.6 + Math.random() * 0.3; }
      else { speed = 120 + Math.random() * 180; life = 1.2 + Math.random() * 0.6; }
      parts.push({ x: r.x, y: r.y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - (style === 2 ? 0 : 50), life: life, maxLife: life, col: palette[Math.floor(Math.random() * palette.length)], gravity: style === 2 ? 200 : 80, r: 4 + Math.random() * 5 });
    }
    explosions.push({ x: r.x, y: r.y, particles: parts, glow: 1.0, palette: palette });
    game.audio.play('se_success', 0.4 + Math.random() * 0.3);
  }

  function initGame() { rockets = []; explosions = []; launched = 0; timeLeft = MAX_TIME; done = false; elapsed = 0; stars = []; for (var si = 0; si < 80; si++) stars.push({ x: Math.random() * W, y: Math.random() * H * 0.85, r: Math.random() < 0.7 ? 8 : 16, p: Math.random() * Math.PI * 2 }); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (launched * 600 + Math.ceil(timeLeft) * 100) : launched * 200;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function updateFx(dt) {
    for (var ri = rockets.length - 1; ri >= 0; ri--) {
      var r = rockets[ri]; r.trail.push({ x: r.x, y: r.y, life: 0.3 }); r.y += r.vy * dt;
      if (r.y <= r.targetY && !r.exploded) { explodeRocket(r); rockets.splice(ri, 1); continue; }
      for (var tr = r.trail.length - 1; tr >= 0; tr--) { r.trail[tr].life -= dt * 4; if (r.trail[tr].life <= 0) r.trail.splice(tr, 1); }
    }
    for (var ei = explosions.length - 1; ei >= 0; ei--) {
      var exp = explosions[ei]; exp.glow -= dt * 2;
      for (var pi = exp.particles.length - 1; pi >= 0; pi--) { var p = exp.particles[pi]; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += p.gravity * dt; p.vx *= 1 - dt * 0.8; p.life -= dt; if (p.life <= 0) exp.particles.splice(pi, 1); }
      if (exp.particles.length === 0) explosions.splice(ei, 1);
    }
  }

  function drawFx() {
    for (var ri2 = 0; ri2 < rockets.length; ri2++) {
      var r2 = rockets[ri2];
      for (var tr2 = 0; tr2 < r2.trail.length; tr2++) { var t = r2.trail[tr2]; pc(t.x, t.y, 6 * t.life, ROCKET, t.life * 0.8); }
      pc(r2.x, r2.y, 8, ROCKET, 0.95);
    }
    for (var ei2 = 0; ei2 < explosions.length; ei2++) {
      var exp2 = explosions[ei2];
      if (exp2.glow > 0) pc(exp2.x, exp2.y, 60 * exp2.glow, exp2.palette[0], exp2.glow * 0.3);
      for (var pi2 = 0; pi2 < exp2.particles.length; pi2++) { var p2 = exp2.particles[pi2], lifeRatio = p2.life / p2.maxLife; game.draw.rect(snap(p2.x) - snap(p2.r * lifeRatio), snap(p2.y) - snap(p2.r * lifeRatio), snap(p2.r * lifeRatio * 2) + 4, snap(p2.r * lifeRatio * 2) + 4, p2.col, lifeRatio * 0.9); }
    }
  }

  // ── 入力 ──
  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    launchRocket(tx, ty); launched++; game.audio.play('se_tap', 0.1);
    if (launched >= NEEDED) { finish(true); return; }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!stars) initGame(); elapsed += dt; background();
      txt(GAME_TITLE, W / 2, H * 0.28, 90, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.33, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) txt('► 100円 投入 ◄ TAP TO START', W / 2, H * 0.60, 40, C.a);
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      elapsed += dt; background(); updateFx(dt); drawFx();
      txt(resultSuccess ? 'GRAND FINALE!' : 'SKY WENT DARK', W / 2, H * 0.35, 58, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt; elapsed += dt;
      if (timeLeft <= 0) { finish(launched >= NEEDED); return; }
      updateFx(dt);
    }

    // ---- 描画 ----
    background(); drawFx();

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(launched + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    txt('TAP FOR FIREWORKS!', W / 2, snap(H * 0.93), 40, '#ffffff33');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.05);
    state = S.ATTRACT;
    initGame();
  });
})(game);
