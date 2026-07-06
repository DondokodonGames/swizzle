// 800-grand-finale.js
// グランドフィナーレ — 800本目！ 流れ星が輝きの頂点に達した瞬間をキャッチせよ
// 操作: タップ — 流れ星が輝きのピーク（PEAK）に達した瞬間
// 成功: 12個 キャッチ  失敗: 3回 ミス or 26秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、天の頂点） ──
  var C = { bg:'#020208', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var STAR = '#ffe600', STAR_HI = '#fff3c0', STAR_GLOW = '#5a4a08', PEAK = '#ffffff', TRAIL = '#a066ff';
  var BURST = ['#ffe600', '#fff3c0', '#a066ff', '#00cfff', '#00ff41', '#ff2079'];

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'GRAND FINALE';
  var HOW_TO_PLAY = 'GAME 800 · TAP EACH SHOOTING STAR AT THE PEAK OF ITS BRILLIANCE';
  var MAX_TIME = 26;
  var NEEDED   = 12;         // 修正2: 40 → 12
  var MAX_ERR  = 3;          // 修正2: 8 → 3
  var MAX_STARS = 5;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var stars, spawnTimer, score, errors, done, timeLeft, elapsed, bgStars, particles, flash, flashCol, resultText, resultTimer, titleFade;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.c : '#040412');
  }

  function background() {
    game.draw.clear(C.bg);
    for (var bi2 = 0; bi2 < bgStars.length; bi2++) { var bs = bgStars[bi2]; game.draw.rect(snap(bs.x), snap(bs.y), bs.r, bs.r, C.g, 0.1 + 0.2 * Math.sin(bs.twinkle)); }
  }

  function spawnStar() {
    var side = Math.floor(Math.random() * 3), x, y, vx, vy, speed = 180 + Math.random() * 130 + score * 4;
    if (side === 0) { x = Math.random() * W; y = -60; vx = (Math.random() - 0.5) * 120; vy = speed; }
    else if (side === 1) { x = -60; y = Math.random() * H * 0.7; vx = speed; vy = (Math.random() - 0.5) * 120; }
    else { x = W + 60; y = Math.random() * H * 0.7; vx = -speed; vy = (Math.random() - 0.5) * 120; }
    stars.push({ x: x, y: y, vx: vx, vy: vy, brightness: 0, growing: true, peakTimer: 0, peakDur: Math.max(0.24, 0.55 - score * 0.014), growSpeed: 0.5 + Math.random() * 0.4, answered: false, missed: false, size: 26 + Math.random() * 18, trail: [] });
  }

  function initGame() {
    stars = []; spawnTimer = 0; score = 0; errors = 0; done = false; timeLeft = MAX_TIME; elapsed = 0; particles = []; flash = 0; flashCol = C.b; resultText = ''; resultTimer = 0; titleFade = 1.0;
    bgStars = []; for (var i = 0; i < 80; i++) bgStars.push({ x: Math.random() * W, y: Math.random() * H, r: 6 + (Math.random() < 0.5 ? 0 : 6), twinkle: Math.random() * Math.PI * 2, speed: 0.5 + Math.random() * 2.5 });
    spawnStar(); spawnStar();
  }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (score * 600 + Math.ceil(timeLeft) * 200) : score * 180;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawStarSprite(s, atPeak) {
    var r = s.size * s.brightness, starCol = atPeak ? PEAK : STAR;
    if (atPeak) { pc(s.x, s.y, r * 3, STAR_GLOW, 0.15); pc(s.x, s.y, r * 2, STAR, 0.2); }
    for (var sj = 0; sj < 6; sj++) { var sa = sj * Math.PI * 2 / 6 + elapsed * 0.5; pc(s.x + Math.cos(sa) * r * 0.7, s.y + Math.sin(sa) * r * 0.7, r * 0.4, starCol, s.brightness * 0.8); }
    pc(s.x, s.y, r * 0.5, starCol, s.brightness * 0.95);
    if (atPeak) pc(s.x, s.y, r * 0.2, C.g, 0.95);
  }

  function drawScene() {
    for (var si2 = 0; si2 < stars.length; si2++) { var s2 = stars[si2]; for (var ti2 = 0; ti2 < s2.trail.length; ti2++) { var tr = s2.trail[ti2]; pc(tr.x, tr.y, s2.size * 0.3 * tr.life, TRAIL, tr.life * 0.4); } }
    for (var si3 = 0; si3 < stars.length; si3++) { var s3 = stars[si3]; if (s3.brightness <= 0) continue; drawStarSprite(s3, s3.brightness >= 0.88 && s3.peakTimer < s3.peakDur); }
    if (state === S.PLAYING) txt('TAP AT THE PEAK!', W / 2, snap(H * 0.88), 38, C.g);
  }

  // ── 入力 ──
  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    for (var i = stars.length - 1; i >= 0; i--) {
      var s = stars[i]; if (s.answered || s.missed) continue;
      var atPeak = s.brightness >= 0.88, dx = tx - s.x, dy = ty - s.y;
      if (Math.sqrt(dx * dx + dy * dy) < s.size + 40) {
        s.answered = true;
        if (atPeak) {
          score++; flash = 0.18; flashCol = C.b; resultText = score >= 9 ? 'STELLAR!' : 'CAUGHT!'; resultTimer = 0.35; game.audio.play('se_success', 0.7);
          var numP = score >= 9 ? 14 : 8;
          for (var p = 0; p < numP; p++) { var pa = Math.random() * Math.PI * 2, sp = 150 + Math.random() * 200; particles.push({ x: s.x, y: s.y, vx: Math.cos(pa) * sp, vy: Math.sin(pa) * sp - 60, life: 0.55, col: BURST[Math.floor(Math.random() * BURST.length)] }); }
          if (score >= NEEDED) { finish(true); return; }
        } else {
          errors++; flash = 0.28; flashCol = C.a; resultText = s.brightness < 0.88 ? 'TOO DIM!' : 'FADED!'; resultTimer = 0.4; game.audio.play('se_failure', 0.3);
          if (errors >= MAX_ERR) { finish(false); return; }
        }
        break;
      }
    }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!stars) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.10, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.145, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) txt('► 100円 投入 ◄ TAP TO START', W / 2, H * 0.90, 40, C.a);
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'GRAND FINALE!' : 'CURTAIN CALL', W / 2, H * 0.35, 56, resultSuccess ? C.c : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt; elapsed += dt;
      if (timeLeft <= 0) { finish(false); return; }
      spawnTimer -= dt; var spawnRate = Math.max(0.45, 1.0 - score * 0.02), active = 0;
      for (var i = 0; i < stars.length; i++) if (!stars[i].answered && !stars[i].missed) active++;
      if (spawnTimer <= 0 && active < MAX_STARS) { spawnTimer = spawnRate; spawnStar(); }
      for (var si = stars.length - 1; si >= 0; si--) {
        var s = stars[si]; s.x += s.vx * dt; s.y += s.vy * dt; s.trail.push({ x: s.x, y: s.y, life: 0.5 });
        for (var ti = s.trail.length - 1; ti >= 0; ti--) { s.trail[ti].life -= dt * 4; if (s.trail[ti].life <= 0) s.trail.splice(ti, 1); }
        if (!s.answered && !s.missed) {
          if (s.growing) { s.brightness += s.growSpeed * dt; if (s.brightness >= 1.0) { s.brightness = 1.0; s.growing = false; s.peakTimer = 0; } }
          else { s.peakTimer += dt; if (s.peakTimer >= s.peakDur) { s.brightness -= (s.growSpeed * 1.5) * dt; if (s.brightness <= 0) { s.brightness = 0; s.missed = true; errors++; flash = 0.24; flashCol = C.a; resultText = 'MISSED!'; resultTimer = 0.38; game.audio.play('se_failure', 0.24); if (errors >= MAX_ERR) { finish(false); return; } } } }
        }
        if (s.x < -200 || s.x > W + 200 || s.y > H + 200) stars.splice(si, 1);
      }
      if (titleFade > 0) titleFade -= dt * 0.6;
      for (var bi = 0; bi < bgStars.length; bi++) bgStars[bi].twinkle += bgStars[bi].speed * dt;
      if (flash > 0) flash -= dt * 3; if (resultTimer > 0) resultTimer -= dt;
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p2 = particles[pp]; p2.x += p2.vx * dt; p2.y += p2.vy * dt; p2.vy += 200 * dt; p2.life -= dt * 1.8; if (p2.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) { var p3 = particles[pp2]; game.draw.rect(snap(p3.x) - 5, snap(p3.y) - 5, 10, 10, p3.col, p3.life * 1.8); }
    if (titleFade > 0.05) { txt('GAME 800', W / 2, H * 0.48, 80, STAR_HI); txt('GRAND FINALE', W / 2, H * 0.55, 44, TRAIL); }
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.09);
    if (resultTimer > 0) txt(resultText, W / 2, snap(H * 0.19), 52, flashCol);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(score + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var ei = 0; ei < MAX_ERR; ei++) game.draw.rect(snap(W / 2 + (ei - (MAX_ERR - 1) / 2) * 56) - 10, 224, 20, 20, ei < errors ? C.a : '#040412');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.06);
    state = S.ATTRACT;
    initGame();
  });
})(game);
