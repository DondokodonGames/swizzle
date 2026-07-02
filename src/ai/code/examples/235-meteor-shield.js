// 235-meteor-shield.js
// メテオシールド — 街へ降り注ぐ隕石を、タップで向けたシールドで弾き返す防衛戦
// 操作: タップした方向にシールドを向ける
// 成功: 10秒守り切る  失敗: 隕石が3回着弾

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、隕石防衛） ──
  var C = { bg:'#02040a', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'METEOR SHIELD';
  var HOW_TO_PLAY = 'TAP TO AIM THE SHIELD AND DEFLECT';
  var NEEDED   = 10;          // 修正2: 30 → 10（サバイバル短縮）
  var MAX_HITS = 3;
  var CX = snap(W / 2), SHIELD_Y = snap(H * 0.62), SHIELD_W = 220, CITY_Y = snap(H * 0.78), TOP = 220;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var shieldAngle, meteors, particles, survived, timeLeft, done, hits, spawnTimer, stars;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) {
    var step = 8; cx = snap(cx); cy = snap(cy);
    for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) {
      if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha);
    }
  }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / NEEDED * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#101828');
  }

  function background() {
    game.draw.clear(C.bg);
    for (var si = 0; si < stars.length; si++) game.draw.rect(stars[si].x, stars[si].y, 4, 4, C.g, 0.2 + 0.1 * (Math.floor(game.time.elapsed * 2 + si) % 2));
    // 街
    var bw = W / 5, bh = [120, 200, 160, 220, 140];
    for (var bi = 0; bi < 5; bi++) { game.draw.rect(bi * bw + 10, H - bh[bi] - 30, bw - 20, bh[bi], C.d, 0.7); game.draw.rect(bi * bw + 10, H - bh[bi] - 30, bw - 20, 8, C.e, 0.4); }
    game.draw.rect(0, H - 30, W, 30, C.e, 0.6);
  }

  function drawShield() {
    var x1 = CX + Math.cos(shieldAngle) * SHIELD_W / 2, y1 = SHIELD_Y + Math.sin(shieldAngle) * SHIELD_W / 2;
    var x2 = CX - Math.cos(shieldAngle) * SHIELD_W / 2, y2 = SHIELD_Y - Math.sin(shieldAngle) * SHIELD_W / 2;
    var n = 14;
    for (var i = 0; i <= n; i++) game.draw.rect(snap(x2 + (x1 - x2) * i / n) - 6, snap(y2 + (y1 - y2) * i / n) - 6, 12, 12, C.b, 0.9);
    pc(CX, SHIELD_Y, 16, C.g, 0.8);
  }

  function drawMeteor(m) { pc(m.x, m.y, m.r, C.f, 0.9); game.draw.rect(snap(m.x) - 4, snap(m.y) - 4, 8, 8, C.c, 0.8); }

  function spawnMeteor() {
    var x = game.random(60, W - 60), speed = 250 + survived * 12, txx = W / 2 + game.random(-380, 380), dx = txx - x, dy = CITY_Y + 60, dist = Math.hypot(dx, dy);
    meteors.push({ x: x, y: TOP, vx: dx / dist * speed, vy: dy / dist * speed, r: 22 + Math.random() * 12, deflected: false });
  }

  function initGame() {
    shieldAngle = 0; meteors = []; particles = []; survived = 0; timeLeft = NEEDED; done = false; hits = 0; spawnTimer = 0.6;
    stars = []; for (var i = 0; i < 40; i++) stars.push({ x: snap(Math.random() * W), y: snap(Math.random() * H * 0.6 + TOP) });
  }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (600 + Math.ceil(survived) * 100 + (hits === 0 ? 400 : 0)) : Math.round(survived * 120);
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  // ── 入力 ──
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    shieldAngle = Math.atan2(y - SHIELD_Y, x - CX); game.audio.play('se_tap', 0.2);
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!stars) initGame(); background(); drawShield(); drawMeteor({ x: W * 0.5, y: TOP + 120, r: 24 });
      txt(GAME_TITLE, W / 2, H * 0.14, 72, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.20, 26, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.40, 62, C.a);
        txt('TAP TO START', W / 2, H * 0.46, 48, C.g);
      }
      txt('INSERT COIN', W / 2, H * 0.52, 40, '#556677');
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'CITY SAVED!' : 'DESTROYED', W / 2, H * 0.32, 72, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.46, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.6, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      survived += dt; timeLeft -= dt;
      if (timeLeft <= 0) { finish(true); return; }
      spawnTimer -= dt; if (spawnTimer <= 0) { spawnMeteor(); spawnTimer = 1.2 * (0.6 + Math.random() * 0.7); }
      var sNX = -Math.sin(shieldAngle), sNY = Math.cos(shieldAngle);
      for (var mi = meteors.length - 1; mi >= 0; mi--) {
        var m = meteors[mi]; m.x += m.vx * dt; m.y += m.vy * dt;
        if (!m.deflected) {
          var dsx = m.x - CX, dsy = m.y - SHIELD_Y, along = dsx * Math.cos(shieldAngle) + dsy * Math.sin(shieldAngle), perp = dsx * sNX + dsy * sNY;
          if (Math.abs(along) < SHIELD_W / 2 + m.r && Math.abs(perp) < 22 + m.r && m.y > SHIELD_Y - 100 && m.y < SHIELD_Y + 60) {
            var dot = m.vx * sNX + m.vy * sNY; m.vx -= 2 * dot * sNX; m.vy -= 2 * dot * sNY; m.deflected = true; game.audio.play('se_success', 0.5);
            for (var pi = 0; pi < 6; pi++) { var a = shieldAngle + Math.PI + game.random(-0.8, 0.8); particles.push({ x: m.x, y: m.y, vx: Math.cos(a) * 150, vy: Math.sin(a) * 150, life: 0.4, col: C.c }); }
          }
        }
        if (m.x < -100 || m.x > W + 100 || m.y < TOP - 200) { meteors.splice(mi, 1); continue; }
        if (m.y > CITY_Y) { hits++; meteors.splice(mi, 1); for (var pj = 0; pj < 8; pj++) { var a2 = Math.random() * Math.PI * 2; particles.push({ x: m.x, y: CITY_Y, vx: Math.cos(a2) * 100, vy: Math.sin(a2) * 100 - 200, life: 0.6, col: C.a }); } game.audio.play('se_failure', 0.6); if (hits >= MAX_HITS) { finish(false); return; } continue; }
      }
      for (var pi3 = particles.length - 1; pi3 >= 0; pi3--) { var p = particles[pi3]; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 300 * dt; p.life -= dt; if (p.life <= 0) particles.splice(pi3, 1); }
    }

    // ---- 描画 ----
    background();
    for (var mi2 = 0; mi2 < meteors.length; mi2++) drawMeteor(meteors[mi2]);
    for (var pp = 0; pp < particles.length; pp++) game.draw.rect(snap(particles[pp].x) - 5, snap(particles[pp].y) - 5, 10, 10, particles[pp].col, particles[pp].life * 1.6);
    drawShield();

    timeBar();
    txt(timeLeft.toFixed(1) + 's', W / 2, 96, 44, C.g);
    for (var hh = 0; hh < MAX_HITS; hh++) game.draw.rect(snap(W / 2 + (hh - (MAX_HITS - 1) / 2) * 56) - 10, 168, 20, 20, hh < hits ? C.a : '#101828');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.2);
    state = S.ATTRACT;
    initGame();
  });
})(game);
