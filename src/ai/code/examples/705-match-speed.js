// 705-match-speed.js
// マッチスピード — 流れ落ちるラインがゾーンに重なった瞬間にタップして同期する
// 操作: ラインが緑ゾーンに入った瞬間タップ。ズレるとミス
// 成功: 8回 同期  失敗: 3回 ミス or 22秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、リズム） ──
  var C = { bg:'#030a14', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'MATCH SPEED';
  var HOW_TO_PLAY = 'TAP THE MOMENT A LINE HITS THE GREEN ZONE · STAY IN SYNC';
  var MAX_TIME = 22;
  var NEEDED   = 8;          // 修正2: 20 → 8
  var MAX_MISS = 3;          // 修正2: 10 → 3
  var LINE_SPEED = 560, LINE_INTERVAL = H * 0.55, ZONE_Y = snap(H * 0.78), ZONE_H = 80;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var lines, syncs, misses, timeLeft, done, elapsed, particles, flash, flashCol, resultText, resultTimer, hitFlash;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.e : '#040c18');
  }

  function background() { game.draw.clear(C.bg); }

  function initGame() { lines = [{ y: H * 0.1 }, { y: H * 0.1 - LINE_INTERVAL }, { y: H * 0.1 - LINE_INTERVAL * 2 }]; syncs = 0; misses = 0; timeLeft = MAX_TIME; done = false; elapsed = 0; particles = []; flash = 0; flashCol = C.b; resultText = ''; resultTimer = 0; hitFlash = 0; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (syncs * 500 + Math.ceil(timeLeft) * 100) : syncs * 150;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    game.draw.rect(W / 2 - 20, 0, 40, H, '#0a1a2a', 0.6);
    game.draw.rect(0, ZONE_Y - ZONE_H / 2, W, ZONE_H, C.b, 0.06);
    game.draw.line(0, ZONE_Y - ZONE_H / 2, W, ZONE_Y - ZONE_H / 2, C.b, 3); game.draw.line(0, ZONE_Y + ZONE_H / 2, W, ZONE_Y + ZONE_H / 2, C.b, 3);
    txt('ZONE', W / 2, ZONE_Y + 14, 36, '#00ff9f88');
    if (hitFlash > 0) game.draw.rect(0, ZONE_Y - ZONE_H / 2, W, ZONE_H, C.b, hitFlash * 0.3);
    for (var li = 0; li < lines.length; li++) {
      var ly = lines[li].y; if (ly < -10 || ly > H + 10) continue;
      var inZone = ly >= ZONE_Y - ZONE_H / 2 && ly <= ZONE_Y + ZONE_H / 2, lCol = inZone ? C.c : C.e, lAlpha = inZone ? 0.95 : 0.7;
      game.draw.rect(0, ly - 6, W, 12, lCol, lAlpha * 0.15); game.draw.rect(0, ly - 3, W, 6, lCol, lAlpha);
    }
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    var hit = false;
    for (var i = 0; i < lines.length; i++) {
      if (lines[i].y >= ZONE_Y - ZONE_H / 2 && lines[i].y <= ZONE_Y + ZONE_H / 2) {
        hit = true; var err = Math.abs(lines[i].y - ZONE_Y), accuracy = 1 - err / (ZONE_H / 2);
        syncs++; hitFlash = 0.3; flash = 0.25; flashCol = C.b; resultText = accuracy > 0.7 ? 'PERFECT!' : 'NICE!'; resultTimer = 0.4; game.audio.play('se_tap', 0.12 + accuracy * 0.1);
        for (var p = 0; p < 5; p++) { var pa = Math.random() * Math.PI * 2; particles.push({ x: W / 2 + (Math.random() - 0.5) * 400, y: ZONE_Y, vx: Math.cos(pa) * 200, vy: Math.sin(pa) * 200, life: 0.4, col: C.b }); }
        if (syncs >= NEEDED) { finish(true); return; }
        break;
      }
    }
    if (!hit) {
      misses++; flash = 0.3; flashCol = C.a; resultText = 'MISSED!'; resultTimer = 0.5; game.audio.play('se_failure', 0.3);
      if (misses >= MAX_MISS) { finish(false); return; }
    }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!lines) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.12, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.165, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) txt('► 100円 投入 ◄ TAP TO START', W / 2, H * 0.94, 40, C.a);
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'IN THE GROOVE!' : 'LOST THE BEAT', W / 2, H * 0.35, 54, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt; elapsed += dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt * 3; if (resultTimer > 0) resultTimer -= dt; if (hitFlash > 0) hitFlash -= dt * 4;
      for (var i = 0; i < lines.length; i++) lines[i].y += LINE_SPEED * dt;
      for (var i2 = lines.length - 1; i2 >= 0; i2--) if (lines[i2].y > H + 60) lines[i2].y = lines[i2].y - lines.length * LINE_INTERVAL;
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 2.5; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 4, snap(particles[pp2].y) - 4, 8, 8, particles[pp2].col, particles[pp2].life * 1.6);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.07);
    if (resultTimer > 0) txt(resultText, W / 2, snap(H * 0.88), 60, flashCol);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(syncs + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var mi = 0; mi < MAX_MISS; mi++) game.draw.rect(snap(W / 2 + (mi - (MAX_MISS - 1) / 2) * 56) - 10, 224, 20, 20, mi < misses ? C.a : '#040c18');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    state = S.ATTRACT;
    initGame();
  });
})(game);
