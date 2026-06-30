// 005-balance-tilt.js
// 天秤バランス — 傾く天秤を左右タップで水平に保つ緊張感
// 操作: 傾いた側と逆をタップして重さを足す
// 成功: 5秒間倒れずに生き延びる  失敗: 傾きが限界を超える

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード） ──
  var C = { bg:'#1a0028', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  var GAME_TITLE  = 'BALANCE BEAM';
  var HOW_TO_PLAY = 'TAP THE RAISED SIDE';
  var MAX_TIME = 5;            // 修正2: 生存系 15s → 5s（1/3）
  var LIMIT = Math.PI / 4;     // 45度で失敗

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  var angle, angularVel, timeLeft, done, hitFeedback, hitSide;

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

  function getGravity(elapsed) { return 0.8 + elapsed * 0.06; }

  function initGame() {
    angle = (Math.random() - 0.5) * 0.1;
    angularVel = 0;
    timeLeft = MAX_TIME;
    done = false;
    hitFeedback = 0;
    hitSide = 0;
  }

  function finish(success) {
    if (done) return;
    done = true;
    resultSuccess = success;
    finalScore = success ? 200 : 0;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT)  { state = S.ATTRACT; return; }
    if (done) return;
    if (x < W / 2) { angularVel -= 0.6; hitSide = -1; }
    else           { angularVel += 0.6; hitSide = 1; }
    hitFeedback = 0.25;
    game.audio.play('se_tap', 0.5);
  });

  function background() { game.draw.clear(C.bg); }

  function drawBeam() {
    var cx = W / 2, cy = H / 2, beamLen = 420;
    // 危険時の赤フラッシュ
    var danger = Math.abs(angle) / LIMIT;
    if (danger > 0.6) game.draw.rect(0, 0, W, H, C.a, (danger - 0.6) / 0.4 * 0.15);

    // 支柱（ドット）
    game.draw.rect(snap(cx - 24), snap(cy + 20), 48, 320, C.d);
    game.draw.rect(snap(cx - 80), snap(cy + 340), 160, 40, C.d);
    game.draw.rect(snap(cx - 32), snap(cy - 32), 64, 64, C.c);

    var cosA = Math.cos(angle), sinA = Math.sin(angle);
    var lx = cx - beamLen * cosA, ly = cy - beamLen * sinA;
    var rx = cx + beamLen * cosA, ry = cy + beamLen * sinA;
    game.draw.line(cx, cy, lx, ly, C.c, 24);
    game.draw.line(cx, cy, rx, ry, C.c, 24);

    var pW = 220;
    var lHit = hitFeedback > 0 && hitSide === -1;
    var rHit = hitFeedback > 0 && hitSide === 1;
    game.draw.rect(snap(lx - pW / 2), snap(ly), pW, 32, lHit ? C.g : C.e);
    game.draw.rect(snap(rx - pW / 2), snap(ry), pW, 32, rHit ? C.g : C.f);

    // 角度メーター
    var indW = 600, indY = H - 320;
    game.draw.rect(snap(cx - indW / 2), indY, indW, 48, '#003b00');
    game.draw.rect(snap(cx - indW * 0.15), indY, snap(indW * 0.3), 48, C.b, 0.6);
    var needleX = cx + (angle / LIMIT) * (indW / 2);
    game.draw.rect(snap(needleX - 8), indY - 8, 16, 64, danger > 0.7 ? C.a : C.g);
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (angle === undefined) initGame();
      background();
      angle = Math.sin(game.time.elapsed * 1.5) * 0.3; // デモ用に揺れる
      drawBeam();
      txt(GAME_TITLE,  W / 2, H * 0.18, 84, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.28, 46, C.e);
      if (Math.floor(game.time.elapsed * 1.67) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.72, 72, C.a);
        txt('TAP TO START', W / 2, H * 0.80, 52, C.g);
      }
      txt('INSERT COIN', W / 2, H * 0.9, 42, '#888888');
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
      if (timeLeft <= 0) { finish(true); return; }
      var noise = (Math.random() - 0.5) * getGravity(MAX_TIME - timeLeft) * dt;
      angularVel += angle * getGravity(MAX_TIME - timeLeft) * dt + noise;
      angularVel *= 0.96;
      angle += angularVel * dt;
      if (hitFeedback > 0) hitFeedback -= dt;
      if (Math.abs(angle) >= LIMIT) { finish(false); return; }
    }

    background();
    drawBeam();
    timeBar();
    txt('SURVIVE ' + Math.ceil(timeLeft) + 's', W / 2, 96, 48, C.c);
    txt('← TAP    TAP →', W / 2, H - 120, 48, C.e);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.35);
    state = S.ATTRACT;
    initGame();
  });
})(game);
