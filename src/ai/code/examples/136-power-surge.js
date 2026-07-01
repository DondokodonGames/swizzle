// 136-power-surge.js
// パワーサージ — エネルギーゲージをゾーン内で止める精密なタイミングゲーム
// 操作: タップでチャージ開始、もう一度でリリース（ゾーン内で成功）
// 成功: 1回ゾーン内にリリース  失敗: 5回外す or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、発電装置） ──
  var C = { bg:'#1a0028', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'POWER SURGE';
  var HOW_TO_PLAY = 'TAP TO CHARGE · TAP AGAIN IN THE ZONE';
  var MAX_TIME = 15;             // 修正2: 35 → 15
  var NEEDED   = 1;              // 修正2: 8 → 1
  var MAX_MISS = 5;
  var TOP    = 220;
  var BOTTOM = H - 180;

  var BAR_X = snap(W * 0.15), BAR_W = snap(W * 0.7);
  var BAR_Y = snap(H * 0.5), BAR_H = 96;
  var CHARGE_SPEED = 0.7;        // 修正2: ゆっくりで狙いやすく
  var DRAIN_SPEED = 0.3;
  var ZONE_WIDTH = 0.24;         // 修正2: ゾーン広め

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var power, charging, zoneStart, zoneEnd, score, misses, timeLeft, done;
  var feedback, feedbackOk, particles, overloadFlash;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x,     y,     { size: sz, color: color,     bold: true, align: align || 'center' });
  }

  function scanlines() {
    for (var sy = 0; sy < H; sy += 8) game.draw.rect(0, sy, W, 2, '#000000', 0.18);
  }

  function timeBar() {
    var blocks = 12;
    var lit = Math.ceil(timeLeft / MAX_TIME * blocks);
    for (var i = 0; i < blocks; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < lit ? C.b : '#2a0a3a');
  }

  function background() {
    game.draw.clear(C.bg);
    // 装置の外枠
    game.draw.rect(BAR_X - 40, BAR_Y - 120, BAR_W + 80, BAR_H + 200, C.d, 0.4);
    game.draw.rect(BAR_X - 40, BAR_Y - 120, BAR_W + 80, 8, C.a);
  }

  function newZone() {
    zoneStart = 0.3 + Math.random() * 0.4;
    zoneEnd = zoneStart + ZONE_WIDTH;
    if (zoneEnd > 0.96) { zoneEnd = 0.96; zoneStart = zoneEnd - ZONE_WIDTH; }
  }

  function initGame() {
    power = 0; charging = false;
    score = 0; misses = 0;
    timeLeft = MAX_TIME; done = false;
    feedback = 0; particles = []; overloadFlash = 0;
    newZone();
  }

  function finish(success) {
    if (done) return;
    done = true;
    resultSuccess = success;
    finalScore = success ? (score * 300 + Math.ceil(timeLeft) * 25) : score * 80;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function registerMiss() {
    misses++; feedbackOk = false; feedback = 0.4;
    game.audio.play('se_failure', 0.6);
    if (misses >= MAX_MISS) { finish(false); return; }
    newZone();
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    if (!charging) { charging = true; game.audio.play('se_tap', 0.4); return; }
    charging = false;
    if (power >= zoneStart && power <= zoneEnd) {
      score++; feedbackOk = true; feedback = 0.5;
      game.audio.play('se_success');
      for (var pi = 0; pi < 12; pi++) {
        var ang = Math.random() * Math.PI * 2;
        particles.push({ x: BAR_X + power * BAR_W, y: BAR_Y + BAR_H / 2, vx: Math.cos(ang) * 150, vy: Math.sin(ang) * 150, life: 0.4 });
      }
      power = 0;
      if (score >= NEEDED) { finish(true); return; }
      newZone();
    } else {
      power = 0;
      registerMiss();
    }
  });

  // ── 更新 & 描画 ──
  function drawBar(showPower) {
    game.draw.rect(BAR_X - 4, BAR_Y - 4, BAR_W + 8, BAR_H + 8, '#2a0a3a');
    game.draw.rect(BAR_X, BAR_Y, BAR_W, BAR_H, '#0a0018');
    // ゾーン
    var zx = snap(BAR_X + zoneStart * BAR_W), zw = snap((zoneEnd - zoneStart) * BAR_W);
    game.draw.rect(zx, BAR_Y, zw, BAR_H, C.b, 0.35);
    game.draw.rect(zx, BAR_Y, 6, BAR_H, C.b);
    game.draw.rect(zx + zw - 6, BAR_Y, 6, BAR_H, C.b);
    txt('ZONE', zx + zw / 2, BAR_Y - 40, 36, C.b);
    // パワー（8pxブロックで充填）
    if (showPower) {
      var fillCol = power > 0.9 ? C.f : (charging ? C.c : C.e);
      var fw = snap(power * BAR_W);
      for (var x = 0; x < fw; x += 8) game.draw.rect(BAR_X + x, BAR_Y + 8, 8, BAR_H - 16, fillCol, 0.95);
      if (power > 0) game.draw.rect(snap(BAR_X + power * BAR_W) - 8, BAR_Y - 8, 16, BAR_H + 16, C.g, 0.8);
    }
    txt('0%', BAR_X, BAR_Y + BAR_H + 36, 30, '#886699');
    txt('100%', BAR_X + BAR_W, BAR_Y + BAR_H + 36, 30, '#886699');
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      background();
      power = (Math.sin(game.time.elapsed * 1.5) + 1) / 2;
      drawBar(true);
      txt(GAME_TITLE,  W / 2, H * 0.22, 84, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.30, 32, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.78, 64, C.a);
        txt('TAP TO START', W / 2, H * 0.84, 50, C.g);
      }
      txt('INSERT COIN', W / 2, H * 0.90, 40, '#886699');
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'CHARGED!' : 'BURNED OUT', W / 2, H * 0.35, 78, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (charging) {
        power += CHARGE_SPEED * dt;
        if (power >= 1) { power = 0; charging = false; overloadFlash = 0.5; registerMiss(); }
      } else {
        power -= DRAIN_SPEED * dt;
        if (power < 0) power = 0;
      }
    }
    for (var pi = 0; pi < particles.length; pi++) {
      particles[pi].x += particles[pi].vx * dt; particles[pi].y += particles[pi].vy * dt;
      particles[pi].vy += 300 * dt; particles[pi].life -= dt;
    }
    particles = particles.filter(function(p) { return p.life > 0; });
    if (feedback > 0) feedback -= dt;
    if (overloadFlash > 0) overloadFlash -= dt;

    // ---- 描画 ----
    background();
    if (overloadFlash > 0) game.draw.rect(0, 0, W, H, C.f, overloadFlash * 0.4);
    drawBar(true);
    for (var pp = 0; pp < particles.length; pp++) {
      var pt = particles[pp];
      game.draw.rect(snap(pt.x) - 4, snap(pt.y) - 4, 8, 8, C.c, pt.life * 2.5);
    }
    if (feedback > 0) txt(feedbackOk ? 'JUST!' : (overloadFlash > 0 ? 'OVERLOAD!' : 'MISS'), W / 2, H * 0.68, 64, feedbackOk ? C.b : C.a);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(score + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    txt(charging ? 'CHARGING... TAP TO RELEASE' : 'TAP TO CHARGE', W / 2, H - 130, 44, charging ? C.c : C.e);
    for (var mm = 0; mm < MAX_MISS; mm++) {
      var mx = snap(W / 2 + (mm - (MAX_MISS - 1) / 2) * 56);
      game.draw.rect(mx - 12, 216, 24, 24, mm < misses ? C.a : '#2a0a3a');
    }
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
    state = S.ATTRACT;
    initGame();
  });
})(game);
