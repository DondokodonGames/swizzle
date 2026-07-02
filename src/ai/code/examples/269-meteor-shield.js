// 269-meteor-shield.js
// メテオシールド — 惑星を囲む回転盾をタップで向け、四方から降る流星を弾き返す最後の防衛
// 操作: タップした方向へ盾を回す
// 成功: 3個弾く  失敗: 惑星に3個当たる or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、周回防衛） ──
  var C = { bg:'#020510', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'METEOR SHIELD';
  var HOW_TO_PLAY = 'TAP TO AIM THE ORBITING SHIELD';
  var MAX_TIME = 15;
  var NEEDED   = 3;           // 修正2: 30 → 3
  var MAX_HIT = 3;           // 修正2: 5 → 3
  var CX = snap(W / 2), CY = snap(H * 0.5), PLANET_R = 96, SHIELD_R = 180, ARC = Math.PI * 0.6;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var shieldAngle, meteors, deflected, hits, timeLeft, done, spawnTimer, particles, stars, hitFlash;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#0a1424');
  }

  function background() { game.draw.clear(C.bg); for (var si = 0; si < stars.length; si++) game.draw.rect(stars[si].x, stars[si].y, 4, 4, C.g, 0.3 + 0.15 * (Math.floor(game.time.elapsed * 2 + si) % 2)); }

  function drawPlanet() { pc(CX, CY, PLANET_R, C.e, 0.9); pc(CX - 28, CY - 28, PLANET_R * 0.3, C.g, 0.3); }

  function drawShield() { for (var a = -ARC / 2; a <= ARC / 2; a += 0.1) { var ang = shieldAngle + a; game.draw.rect(snap(CX + Math.cos(ang) * SHIELD_R) - 7, snap(CY + Math.sin(ang) * SHIELD_R) - 7, 14, 14, C.b, 0.9); } }

  function drawMeteor(m) { pc(m.x, m.y, m.r, C.f, 0.9); game.draw.rect(snap(m.x) - 4, snap(m.y) - 4, 8, 8, C.c, 0.8); }

  function spawnMeteor() { var ang = Math.random() * Math.PI * 2, dist = Math.max(W, H) * 0.6, mx = CX + Math.cos(ang) * dist, my = CY + Math.sin(ang) * dist, dx = CX - mx, dy = CY - my, len = Math.hypot(dx, dy), sp = 260 + Math.random() * 120; meteors.push({ x: mx, y: my, vx: dx / len * sp, vy: dy / len * sp, r: 22, deflected: false }); }

  function initGame() { shieldAngle = -Math.PI / 2; meteors = []; deflected = 0; hits = 0; timeLeft = MAX_TIME; done = false; spawnTimer = 0.6; particles = []; hitFlash = 0; stars = []; for (var i = 0; i < 40; i++) stars.push({ x: snap(Math.random() * W), y: snap(Math.random() * H) }); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (deflected * 400 + Math.ceil(timeLeft) * 60) : deflected * 120;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  // ── 入力 ──
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    shieldAngle = Math.atan2(y - CY, x - CX); game.audio.play('se_tap', 0.2);
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!stars) initGame(); background(); drawPlanet(); drawShield(); drawMeteor({ x: CX + 240, y: CY - 120, r: 22 });
      txt(GAME_TITLE, W / 2, H * 0.14, 74, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.20, 26, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.86, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.92, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background(); drawPlanet();
      txt(resultSuccess ? 'DEFENDED!' : 'IMPACT', W / 2, H * 0.35, 80, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (hitFlash > 0) hitFlash -= dt;
      spawnTimer -= dt; if (spawnTimer <= 0) { spawnMeteor(); spawnTimer = 0.9 + Math.random() * 0.6; }
      for (var mi = meteors.length - 1; mi >= 0; mi--) {
        var m = meteors[mi]; m.x += m.vx * dt; m.y += m.vy * dt; var dx = m.x - CX, dy = m.y - CY, dist = Math.hypot(dx, dy);
        if (!m.deflected && dist < SHIELD_R + m.r && dist > SHIELD_R - 20) { var ang = Math.atan2(dy, dx), diff = ang - shieldAngle; while (diff > Math.PI) diff -= Math.PI * 2; while (diff < -Math.PI) diff += Math.PI * 2; if (Math.abs(diff) < ARC / 2) { m.deflected = true; var nx = dx / dist, ny = dy / dist, dot = m.vx * nx + m.vy * ny; m.vx -= 2 * dot * nx; m.vy -= 2 * dot * ny; deflected++; game.audio.play('se_success', 0.4); for (var pi = 0; pi < 8; pi++) { var a = Math.random() * Math.PI * 2; particles.push({ x: m.x, y: m.y, vx: Math.cos(a) * 200, vy: Math.sin(a) * 200, life: 0.5 }); } if (deflected >= NEEDED) { finish(true); return; } } }
        if (dist < PLANET_R + m.r) { hits++; hitFlash = 0.4; game.audio.play('se_failure', 0.6); meteors.splice(mi, 1); if (hits >= MAX_HIT) { finish(false); return; } continue; }
        if (m.x < -200 || m.x > W + 200 || m.y < -200 || m.y > H + 200) meteors.splice(mi, 1);
      }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background();
    if (hitFlash > 0) game.draw.rect(0, 0, W, H, C.a, hitFlash * 0.3);
    drawPlanet(); drawShield();
    for (var mi2 = 0; mi2 < meteors.length; mi2++) drawMeteor(meteors[mi2]);
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, C.b, particles[pp2].life * 2);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(deflected + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var hi = 0; hi < MAX_HIT; hi++) game.draw.rect(snap(W / 2 + (hi - (MAX_HIT - 1) / 2) * 56) - 10, 224, 20, 20, hi < hits ? C.a : '#0a1424');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.2);
    state = S.ATTRACT;
    initGame();
  });
})(game);
