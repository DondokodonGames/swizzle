// 554-meteor-shield.js
// メテオシールド — 惑星に降りそそぐ流星を、タップで展開するシールドで受け止め守り抜く
// 操作: 惑星の外側をタップするとその方向にシールドを展開（同時3枚・各2.5秒で消滅）
// 成功: 12秒 生き残る  失敗: 惑星に 3回 被弾

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（アイスブルー、防衛衛星） ──
  var C = { bg:'#000010', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#3355ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var CX = W / 2, CY = snap(H * 0.46), PLANET_R = 110, SHIELD_DIST = 180, SHIELD_R = 58, SEGMENTS = 8, SHIELD_LIFE = 2.5, MAX_SHIELDS = 3;

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'METEOR SHIELD';
  var HOW_TO_PLAY = 'TAP AROUND THE PLANET TO RAISE SHIELDS · BLOCK THE METEORS';
  var MAX_TIME = 12;
  var MAX_HITS = 3;          // 修正2: 5 → 3

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var shields, meteors, planetHits, timeLeft, done, particles, flash, nextMeteor, stars, shieldCd;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.e : '#0a0a20');
  }

  function background() { game.draw.clear(C.bg); for (var s = 0; s < stars.length; s++) { var st = stars[s]; game.draw.rect(snap(st.x), snap(st.y), st.r, st.r, C.g, 0.3 + Math.sin(game.time.elapsed * 1.5 + st.tw) * 0.3); } }

  function spawnMeteor() { var ang = Math.random() * Math.PI * 2, dist = Math.max(W, H) * 0.7, aim = ang + Math.PI + (Math.random() - 0.5) * 0.4, sp = 380 + Math.random() * 260 + game.time.elapsed * 8; meteors.push({ x: CX + Math.cos(ang) * dist, y: CY + Math.sin(ang) * dist, vx: Math.cos(aim) * sp, vy: Math.sin(aim) * sp, r: 22 + Math.random() * 18, angle: Math.random() * Math.PI * 2, spin: (Math.random() - 0.5) * 4 }); }

  function addShield(tx, ty) {
    if (shields.length >= MAX_SHIELDS || shieldCd > 0) return;
    var seg = Math.round(Math.atan2(ty - CY, tx - CX) / (Math.PI * 2 / SEGMENTS)) * (Math.PI * 2 / SEGMENTS);
    for (var i = 0; i < shields.length; i++) { var diff = Math.abs(shields[i].angle - seg) % (Math.PI * 2); if (Math.min(diff, Math.PI * 2 - diff) < 0.2) return; }
    shields.push({ angle: seg, life: SHIELD_LIFE, maxLife: SHIELD_LIFE }); shieldCd = 0.3; game.audio.play('se_tap', 0.4);
  }

  function initGame() { shields = []; meteors = []; planetHits = 0; timeLeft = MAX_TIME; done = false; particles = []; flash = 0; nextMeteor = 0.8; shieldCd = 0; stars = []; for (var s = 0; s < 80; s++) stars.push({ x: Math.random() * W, y: Math.random() * H, r: 8, tw: Math.random() * Math.PI * 2 }); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (Math.round(MAX_TIME) * 400 + (MAX_HITS - planetHits) * 800) : (MAX_TIME - Math.ceil(timeLeft)) * 200;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    pc(CX, CY, PLANET_R + 20, C.d, 0.15); pc(CX, CY, PLANET_R, C.d, 0.95); pc(CX - 24, CY - 28, PLANET_R * 0.35, C.e, 0.4);
    for (var si = 0; si < shields.length; si++) { var sh = shields[si], shx = CX + Math.cos(sh.angle) * SHIELD_DIST, shy = CY + Math.sin(sh.angle) * SHIELD_DIST, lr = sh.life / sh.maxLife; pc(shx, shy, SHIELD_R + 6, C.e, lr * 0.5); pc(shx, shy, SHIELD_R, C.e, lr * 0.9); pc(shx, shy, SHIELD_R * 0.5, C.g, lr * 0.4); }
    for (var mi = 0; mi < meteors.length; mi++) { var m = meteors[mi]; pc(m.x, m.y, m.r + 6, C.f, 0.4); pc(m.x, m.y, m.r, C.f, 0.9); pc(m.x + Math.cos(m.angle) * m.r * 0.4, m.y + Math.sin(m.angle) * m.r * 0.4, m.r * 0.3, C.c, 0.6); }
  }

  // ── 入力 ──
  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    addShield(tx, ty);
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!stars) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.12, 76, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.165, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.86, 56, C.a);
        txt('TAP TO START', W / 2, H * 0.90, 42, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'PLANET SAVED!' : 'IMPACT', W / 2, H * 0.35, 64, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(true); return; }
      if (flash > 0) flash -= dt * 3; if (shieldCd > 0) shieldCd -= dt;
      for (var si2 = shields.length - 1; si2 >= 0; si2--) { shields[si2].life -= dt; if (shields[si2].life <= 0) shields.splice(si2, 1); }
      nextMeteor -= dt; if (nextMeteor <= 0) { spawnMeteor(); nextMeteor = Math.max(0.4, 0.8 - game.time.elapsed * 0.02); }
      for (var mi = meteors.length - 1; mi >= 0; mi--) {
        var m = meteors[mi]; m.x += m.vx * dt; m.y += m.vy * dt; m.angle += m.spin * dt;
        if (m.x < -200 || m.x > W + 200 || m.y < -200 || m.y > H + 200) { meteors.splice(mi, 1); continue; }
        var blocked = false;
        for (var si3 = shields.length - 1; si3 >= 0; si3--) { var sh = shields[si3], shx = CX + Math.cos(sh.angle) * SHIELD_DIST, shy = CY + Math.sin(sh.angle) * SHIELD_DIST; if (Math.hypot(m.x - shx, m.y - shy) < SHIELD_R + m.r) { blocked = true; shields.splice(si3, 1); game.audio.play('se_success', 0.5); for (var pi = 0; pi < 8; pi++) { var a = Math.random() * Math.PI * 2; particles.push({ x: shx, y: shy, vx: Math.cos(a) * 200, vy: Math.sin(a) * 200, life: 0.4, col: C.e }); } meteors.splice(mi, 1); break; } }
        if (blocked) continue;
        if (Math.hypot(m.x - CX, m.y - CY) < PLANET_R + m.r) { planetHits++; flash = 0.6; game.audio.play('se_failure', 0.6); for (var pi2 = 0; pi2 < 12; pi2++) { var a2 = Math.random() * Math.PI * 2; particles.push({ x: m.x, y: m.y, vx: Math.cos(a2) * 240, vy: Math.sin(a2) * 240, life: 0.5, col: C.f }); } meteors.splice(mi, 1); if (planetHits >= MAX_HITS) { finish(false); return; } }
      }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 2; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 6, snap(particles[pp2].y) - 6, 12, 12, particles[pp2].col, particles[pp2].life * 1.5);
    if (flash > 0) game.draw.rect(0, 0, W, H, C.a, flash * 0.15);

    timeBar();
    txt(Math.ceil(timeLeft) + 's', W / 2, 96, 44, C.g);
    txt('SHIELDS ' + (MAX_SHIELDS - shields.length) + '/' + MAX_SHIELDS, W / 2, 168, 40, C.e);
    for (var hi = 0; hi < MAX_HITS; hi++) game.draw.rect(snap(W / 2 + (hi - (MAX_HITS - 1) / 2) * 56) - 10, 224, 20, 20, hi < planetHits ? C.a : '#0a0a20');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.06);
    state = S.ATTRACT;
    initGame();
  });
})(game);
