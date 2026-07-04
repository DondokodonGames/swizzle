// 633-meteor-shield.js
// メテオシールド — 惑星の周りの6セクターをタップでシールド展開し、隕石を撃ち落とす
// 操作: 隕石が来る方向のセクターをタップで起動（再タップで解除）。エネルギー切れ注意
// 成功: 15秒 惑星を守る  失敗: 惑星HPが0 or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（アイスブルー、軌道防衛） ──
  var C = { bg:'#010208', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#3355ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'METEOR SHIELD';
  var HOW_TO_PLAY = 'TAP THE SECTOR FACING AN INCOMING METEOR TO SHIELD IT · WATCH YOUR ENERGY';
  var MAX_TIME = 15;         // 修正2: 60 → 15
  var CX = W / 2, CY = snap(H * 0.48), PLANET_R = 150, SHIELD_R = 270, NUM_SECTORS = 6;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var shieldActive, shieldCooldown, energy, meteorList, hp, timeLeft, done, spawnTimer, particles, flash, stars;
  var SHIELD_COST = 0.8;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.e : '#05070f');
  }

  function background() { game.draw.clear(C.bg); for (var st = 0; st < stars.length; st++) { var s = stars[st]; game.draw.rect(snap(s.x), snap(s.y), 8, 8, C.g, 0.2 + Math.sin(game.time.elapsed + s.p) * 0.1); } }

  function spawnMeteor() { var ang = Math.random() * Math.PI * 2, sr = 750; meteorList.push({ x: CX + Math.cos(ang) * sr, y: CY + Math.sin(ang) * sr, angle: ang + Math.PI + (Math.random() - 0.5) * 0.4, speed: 200 + (MAX_TIME - timeLeft) * 6 + Math.random() * 70, r: 20 + Math.random() * 18 }); }

  function getSector(angle) { var a = (angle % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2); return Math.floor(a / (Math.PI * 2) * NUM_SECTORS); }

  function initGame() { shieldActive = [false, false, false, false, false, false]; shieldCooldown = [0, 0, 0, 0, 0, 0]; energy = 100; meteorList = []; hp = 100; timeLeft = MAX_TIME; done = false; spawnTimer = 0; particles = []; flash = 0; stars = []; for (var i = 0; i < 40; i++) stars.push({ x: Math.random() * W, y: Math.random() * H, p: Math.random() * 6 }); spawnMeteor(); spawnMeteor(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (Math.ceil(hp) * 200 + MAX_TIME * 100) : Math.round(Math.ceil(hp) * 60);
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    for (var mi = 0; mi < meteorList.length; mi++) { var m = meteorList[mi]; pc(m.x, m.y, m.r, C.f, 0.9); pc(m.x - m.r * 0.3, m.y - m.r * 0.3, m.r * 0.4, C.c, 0.5); }
    for (var s3 = 0; s3 < NUM_SECTORS; s3++) {
      var sa = (s3 / NUM_SECTORS) * Math.PI * 2, ea = ((s3 + 1) / NUM_SECTORS) * Math.PI * 2, mid = (sa + ea) / 2;
      var act = shieldActive[s3], cd = shieldCooldown[s3] > 0, al = act ? (0.5 + Math.sin(game.time.elapsed * 6 + s3) * 0.2) : (cd ? 0.1 : 0.15), col = cd ? C.a : (act ? C.e : '#334155');
      for (var arc = 0; arc <= 8; arc++) { var aa = sa + (arc / 8) * (ea - sa); pc(CX + Math.cos(aa) * SHIELD_R, CY + Math.sin(aa) * SHIELD_R, act ? 20 : 12, col, al); }
      pc(CX + Math.cos(mid) * (SHIELD_R + 80), CY + Math.sin(mid) * (SHIELD_R + 80), 24, col, act ? 0.6 : 0.25);
    }
    pc(CX, CY, PLANET_R, C.d, 0.9); pc(CX - 50, CY - 50, PLANET_R * 0.35, C.e, 0.4); pc(CX - 40, CY - 40, PLANET_R * 0.15, C.g, 0.5);
  }

  // ── 入力 ──
  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    var dx = tx - CX, dy = ty - CY, d = Math.sqrt(dx * dx + dy * dy);
    if (d < 90) { for (var i = 0; i < NUM_SECTORS; i++) shieldActive[i] = false; return; }
    var sector = getSector(Math.atan2(dy, dx));
    if (shieldCooldown[sector] <= 0) { shieldActive[sector] = !shieldActive[sector]; game.audio.play('se_tap', 0.15); }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!stars) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.08, 76, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.12, 19, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.955, 46, C.a);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'PLANET SAVED!' : 'ANNIHILATED', W / 2, H * 0.35, 56, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(true); return; }
      if (flash > 0) flash -= dt * 4;
      var activeCount = 0;
      for (var s = 0; s < NUM_SECTORS; s++) { if (shieldCooldown[s] > 0) shieldCooldown[s] -= dt; if (shieldActive[s]) activeCount++; }
      energy -= activeCount * SHIELD_COST * dt * 10; energy = Math.max(0, Math.min(100, energy + dt * 8));
      if (energy <= 0) for (var s2 = 0; s2 < NUM_SECTORS; s2++) if (shieldActive[s2]) { shieldActive[s2] = false; shieldCooldown[s2] = 1.5; }
      spawnTimer += dt; if (spawnTimer > Math.max(0.5, 1.6 - (MAX_TIME - timeLeft) * 0.05)) { spawnTimer = 0; spawnMeteor(); }
      for (var mi = meteorList.length - 1; mi >= 0; mi--) {
        var m = meteorList[mi]; m.x += Math.cos(m.angle) * m.speed * dt; m.y += Math.sin(m.angle) * m.speed * dt;
        var dx2 = m.x - CX, dy2 = m.y - CY, dist = Math.sqrt(dx2 * dx2 + dy2 * dy2);
        if (dist <= SHIELD_R + m.r) {
          var sec = getSector(Math.atan2(dy2, dx2));
          if (shieldActive[sec] && energy > 5) { for (var p = 0; p < 6; p++) { var pa = Math.random() * Math.PI * 2; particles.push({ x: m.x, y: m.y, vx: Math.cos(pa) * 160, vy: Math.sin(pa) * 160, life: 0.4, col: C.e }); } meteorList.splice(mi, 1); game.audio.play('se_tap', 0.2); continue; }
        }
        if (dist <= PLANET_R + m.r) {
          hp = Math.max(0, hp - (12 + m.r * 0.3)); flash = 0.4; game.audio.play('se_failure', 0.3);
          for (var p2 = 0; p2 < 5; p2++) { var pa2 = Math.random() * Math.PI * 2; particles.push({ x: m.x, y: m.y, vx: Math.cos(pa2) * 200, vy: Math.sin(pa2) * 200, life: 0.35, col: C.f }); }
          meteorList.splice(mi, 1); if (hp <= 0) { finish(false); return; } continue;
        }
        if (dist > 950) meteorList.splice(mi, 1);
      }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p3 = particles[pp]; p3.x += p3.vx * dt; p3.y += p3.vy * dt; p3.life -= dt * 2.5; if (p3.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    if (flash > 0) game.draw.rect(0, 0, W, H, C.a, flash * 0.1);

    // HP + energy
    var hpR = hp / 100;
    game.draw.rect(W / 2 - 200, snap(H * 0.88), 400, 20, '#05070f', 0.8);
    game.draw.rect(W / 2 - 200, snap(H * 0.88), 400 * hpR, 20, hpR > 0.4 ? C.b : C.a, 0.9);
    txt('HP ' + Math.ceil(hp), W / 2, snap(H * 0.88) + 42, 30, hpR > 0.4 ? C.b : C.a);
    var eR = energy / 100;
    game.draw.rect(W / 2 - 200, snap(H * 0.93), 400, 16, '#05070f', 0.7);
    game.draw.rect(W / 2 - 200, snap(H * 0.93), 400 * eR, 16, C.c, 0.8);
    txt('EN', W / 2, snap(H * 0.93) + 34, 26, C.c);

    timeBar();
    txt(Math.ceil(timeLeft) + 's', W / 2, 96, 44, C.g);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.05);
    state = S.ATTRACT;
    initGame();
  });
})(game);
