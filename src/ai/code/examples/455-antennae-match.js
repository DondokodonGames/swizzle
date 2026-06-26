// 455-antennae-match.js
// アンテナ合わせ — 2つのアンテナを同じ角度に揃えて電波を受信
// 操作: 左右タップで自分のアンテナを回転させる
// 成功: 10回受信成功  失敗: 5回外れ or 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#04080f',
    sky:    '#0a1628',
    tower:  '#1e3a5f',
    towerHi:'#2563eb',
    antenna:'#94a3b8',
    antennaHi:'#e2e8f0',
    signal: '#22d3ee',
    signalHi:'#cffafe',
    match:  '#22c55e',
    matchHi:'#bbf7d0',
    wrong:  '#ef4444',
    text:   '#f1f5f9',
    ui:     '#475569',
    stars:  '#e2e8f0'
  };

  var STATION_X = W * 0.18;
  var PLAYER_X = W * 0.82;
  var BASE_Y = H * 0.62;
  var ANTENNA_LEN = 200;
  var ROTATE_SPEED = 2.2;

  var stationAngle = 0;
  var playerAngle = 0;
  var targetAngle = 0;
  var turning = 0;  // -1, 0, 1
  var matchTimer = 0;
  var MATCH_HOLD = 0.8;
  var signalWaves = [];

  var received = 0;
  var NEEDED = 10;
  var misses = 0;
  var MAX_MISS = 5;
  var done = false;
  var timeLeft = 60;
  var elapsed = 0;
  var flashAnim = 0;
  var flashCol = C.match;
  var particles = [];

  // Stars
  var stars = [];
  for (var si = 0; si < 60; si++) {
    stars.push({ x: Math.random() * W, y: Math.random() * H * 0.55, r: 1 + Math.random() * 2 });
  }

  function newSignal() {
    targetAngle = (Math.random() - 0.5) * Math.PI * 0.8;
    stationAngle = targetAngle;
    matchTimer = 0;
    signalWaves = [];
    // Emit waves from station
    for (var i = 0; i < 3; i++) {
      signalWaves.push({ x: STATION_X, r: 10 + i * 40, alpha: 1 - i * 0.3, maxR: 300 + i * 50 });
    }
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    if (tx < W / 2) {
      turning = -1;
    } else {
      turning = 1;
    }
    setTimeout(function() { turning = 0; }, 100);
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) {
        done = true;
        game.audio.play('se_failure', 0.6);
        game.end.failure();
        return;
      }
    }

    if (flashAnim > 0) flashAnim -= dt * 2;

    // Rotate player antenna
    playerAngle += turning * ROTATE_SPEED * dt;
    if (playerAngle > Math.PI/2) playerAngle = Math.PI/2;
    if (playerAngle < -Math.PI/2) playerAngle = -Math.PI/2;

    // Signal waves expand
    for (var wi = 0; wi < signalWaves.length; wi++) {
      signalWaves[wi].r += 200 * dt;
      signalWaves[wi].alpha -= dt * 0.8;
    }
    signalWaves = signalWaves.filter(function(w) { return w.alpha > 0 && w.r < w.maxR; });
    // Respawn
    if (signalWaves.length === 0 && !done) {
      for (var i2 = 0; i2 < 3; i2++) {
        signalWaves.push({ x: STATION_X, r: 10 + i2 * 40, alpha: 0.8 - i2 * 0.25, maxR: 280 });
      }
    }

    // Check angle match
    var diff = Math.abs(playerAngle - targetAngle);
    var TOLERANCE = 0.12;
    if (diff < TOLERANCE) {
      matchTimer += dt;
      if (matchTimer >= MATCH_HOLD) {
        // Success!
        received++;
        flashCol = C.match;
        flashAnim = 0.8;
        game.audio.play('se_success', 0.7);
        for (var pi = 0; pi < 12; pi++) {
          var ang = Math.random() * Math.PI * 2;
          particles.push({ x: PLAYER_X, y: BASE_Y - ANTENNA_LEN * 0.6, vx: Math.cos(ang)*150, vy: Math.sin(ang)*150, life: 0.6, col: C.signalHi });
        }
        if (received >= NEEDED && !done) {
          done = true;
          setTimeout(function() { game.end.success(received * 500 + Math.ceil(timeLeft) * 80); }, 700);
          return;
        }
        setTimeout(function() { newSignal(); }, 900);
      }
    } else {
      if (matchTimer > 0.4) {
        // Was matching then moved away
        misses++;
        flashCol = C.wrong;
        flashAnim = 0.5;
        game.audio.play('se_failure', 0.3);
        if (misses >= MAX_MISS && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 500);
        }
      }
      matchTimer = 0;
    }

    // Particles
    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // --- draw ---
    game.draw.rect(0, 0, W, H, C.bg);
    game.draw.rect(0, 0, W, H * 0.6, C.sky, 0.5);

    // Stars
    for (var sti = 0; sti < stars.length; sti++) {
      game.draw.circle(stars[sti].x, stars[sti].y, stars[sti].r, C.stars, 0.6);
    }

    // Signal waves from station
    for (var wi2 = 0; wi2 < signalWaves.length; wi2++) {
      var w2 = signalWaves[wi2];
      game.draw.circle(w2.x, BASE_Y - 80, w2.r, C.signal, Math.max(0, w2.alpha));
    }

    // Station tower
    game.draw.rect(STATION_X - 15, BASE_Y - 120, 30, 120, C.tower, 0.9);
    game.draw.rect(STATION_X - 20, BASE_Y - 20, 40, 30, C.towerHi, 0.6);
    // Station antenna
    var staTipX = STATION_X + Math.sin(stationAngle) * ANTENNA_LEN;
    var staTipY = (BASE_Y - 120) - Math.cos(stationAngle) * ANTENNA_LEN;
    game.draw.line(STATION_X, BASE_Y - 120, staTipX, staTipY, C.antenna, 6);
    game.draw.circle(staTipX, staTipY, 14, C.signal, 0.8);

    // Player tower
    game.draw.rect(PLAYER_X - 15, BASE_Y - 120, 30, 120, C.tower, 0.9);
    game.draw.rect(PLAYER_X - 20, BASE_Y - 20, 40, 30, C.towerHi, 0.6);
    // Player antenna
    var diff2 = Math.abs(playerAngle - targetAngle);
    var matched = diff2 < 0.12;
    var matchRatio = Math.max(0, 1 - diff2 / 0.5);
    var pCol = matched ? C.match : C.antenna;
    var plaTipX = PLAYER_X + Math.sin(playerAngle) * ANTENNA_LEN;
    var plaTipY = (BASE_Y - 120) - Math.cos(playerAngle) * ANTENNA_LEN;
    game.draw.line(PLAYER_X, BASE_Y - 120, plaTipX, plaTipY, pCol, 6);
    game.draw.circle(plaTipX, plaTipY, 14, matched ? C.matchHi : C.antennaHi, 0.8);
    if (matched) {
      game.draw.circle(PLAYER_X, BASE_Y - 120, matchTimer / MATCH_HOLD * 80, C.match, 0.2);
    }

    // Signal strength bar
    game.draw.rect(W*0.35, H*0.73, W*0.3, 24, C.ui, 0.4);
    game.draw.rect(W*0.35, H*0.73, W*0.3*matchRatio, 24, matched ? C.match : C.signal, 0.8);
    game.draw.text('受信強度', W/2, H*0.77 + 20, { size: 32, color: C.ui });

    // Button hints
    game.draw.text('←', W * 0.14, H * 0.85, { size: 72, color: C.ui });
    game.draw.text('→', W * 0.86, H * 0.85, { size: 72, color: C.ui });

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 8 * p.life, p.col, p.life * 0.9);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.1);

    // Miss dots
    for (var mi = 0; mi < MAX_MISS; mi++) {
      game.draw.circle(W/2 - (MAX_MISS-1)*44 + mi*88, H*0.955, 18, mi < misses ? C.wrong : C.ui, 0.9);
    }

    game.draw.text(received + ' / ' + NEEDED, W/2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.signal : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W/2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.08);
    newSignal();
  });
})(game);
