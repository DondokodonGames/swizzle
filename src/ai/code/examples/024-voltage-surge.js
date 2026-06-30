// 024-voltage-surge.js
// ボルテージサージ — 電力過負荷寸前の綱渡り、上げすぎたら終わり
// 操作: タップでパワーを追加、過負荷になる前に止める
// 成功: 許容範囲内で2秒キープ  失敗: 過負荷 or 電力不足 or 20秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード） ──
  var C = { bg:'#1a0028', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  var GAME_TITLE  = 'VOLTAGE SURGE';
  var HOW_TO_PLAY = 'TAP TO CHARGE / HOLD IN OK ZONE';
  var MAX_TIME = 20;
  var NEEDED_SAFE = 2;       // 修正2: 生存系 5s → 2s
  var DRAIN_RATE = 0.06, TAP_BOOST = 0.14;
  var MIN_SAFE = 0.45, MAX_SAFE = 0.85, MAX_POWER = 1.0;
  // 修正1: 縦に長いゲージで全高活用
  var GAUGE_X = W * 0.32, GAUGE_Y = 320, GAUGE_W = W * 0.36, GAUGE_H = H - 700;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  var power, safeTimer, timeLeft, done, tapFlash;

  function snap(v) { return Math.round(v / 8) * 8; }
  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x,     y,     { size: sz, color: color,     bold: true, align: align || 'center' });
  }
  function scanlines() { for (var sy = 0; sy < H; sy += 8) game.draw.rect(0, sy, W, 2, '#000000', 0.18); }
  function timeBar() {
    var blocks = 12, lit = Math.ceil(timeLeft / MAX_TIME * blocks);
    for (var i = 0; i < blocks; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < lit ? C.b : '#003b00');
  }

  function initGame() { power = 0.2; safeTimer = 0; timeLeft = MAX_TIME; done = false; tapFlash = 0; }

  function finish(success) {
    if (done) return;
    done = true;
    resultSuccess = success;
    finalScore = success ? (Math.ceil(safeTimer * 100) + Math.ceil(timeLeft) * 40) : Math.floor(power * 100);
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT)  { state = S.ATTRACT; return; }
    if (done) return;
    power += TAP_BOOST; tapFlash = 0.12;
    game.audio.play('se_tap', 0.6);
    if (power > MAX_POWER) { power = MAX_POWER; finish(false); }
  });

  function background() {
    game.draw.clear(C.bg);
    for (var gy = 120; gy < H; gy += 80) game.draw.rect(0, gy, W, 2, C.d, 0.3);
  }

  function drawGauge() {
    game.draw.rect(snap(GAUGE_X - 12), snap(GAUGE_Y - 12), GAUGE_W + 24, GAUGE_H + 24, C.d);
    game.draw.rect(snap(GAUGE_X), snap(GAUGE_Y), GAUGE_W, GAUGE_H, '#0a0018');
    var szY1 = GAUGE_Y + GAUGE_H * (1 - MAX_SAFE), szY2 = GAUGE_Y + GAUGE_H * (1 - MIN_SAFE);
    game.draw.rect(snap(GAUGE_X), snap(szY1), GAUGE_W, snap(szY2 - szY1), C.b, 0.3);
    game.draw.rect(snap(GAUGE_X) - 24, snap(szY1) - 4, 24, 8, C.b);
    game.draw.rect(snap(GAUGE_X) - 24, snap(szY2) - 4, 24, 8, C.b);
    txt('OK', GAUGE_X - 70, (szY1 + szY2) / 2, 36, C.b);
    var fillH = GAUGE_H * power, fillY = GAUGE_Y + GAUGE_H - fillH;
    var col = power > MAX_SAFE ? C.a : (power >= MIN_SAFE ? C.b : C.f);
    game.draw.rect(snap(GAUGE_X), snap(fillY), GAUGE_W, snap(fillH), col);
    txt(Math.floor(power * 100) + '%', W / 2, GAUGE_Y + GAUGE_H + 70, 64, col);
    if (power >= MAX_SAFE && Math.floor(game.time.elapsed * 10) % 2 === 0) game.draw.rect(0, 0, W, H, C.a, 0.12);
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      background();
      power = 0.5 + 0.3 * Math.sin(game.time.elapsed * 2); safeTimer = 0;
      drawGauge();
      txt(GAME_TITLE,  W / 2, H * 0.1, 76, C.c);
      txt('TAP TO CHARGE', W / 2, H * 0.17, 42, C.b);
      if (Math.floor(game.time.elapsed * 1.67) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.86, 72, C.a);
        txt('TAP TO START', W / 2, H * 0.92, 52, C.g);
      }
      txt('INSERT COIN', W / 2, H * 0.97, 42, '#888888');
      scanlines();
      return;
    }
    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'CONGRATULATIONS!' : 'GAME OVER', W / 2, H * 0.35, 80, resultSuccess ? C.c : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 64, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 54, C.b);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      power -= DRAIN_RATE * dt;
      if (power < 0) power = 0;
      if (power >= MIN_SAFE && power <= MAX_SAFE) {
        safeTimer += dt;
        if (safeTimer >= NEEDED_SAFE) { finish(true); return; }
      } else {
        safeTimer = Math.max(0, safeTimer - dt * 0.5);
        if (power < 0.1 && safeTimer <= 0) { finish(false); return; }
      }
      if (tapFlash > 0) tapFlash -= dt;
    }

    // ---- draw ----
    background();
    drawGauge();
    timeBar();
    txt('KEEP ' + Math.ceil(NEEDED_SAFE - safeTimer) + 's', W / 2, 96, 48, safeTimer > 0 ? C.b : C.g);
    txt('TAP TO CHARGE!', W / 2, H - 120, 48, C.f);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
    state = S.ATTRACT;
    initGame();
  });
})(game);
