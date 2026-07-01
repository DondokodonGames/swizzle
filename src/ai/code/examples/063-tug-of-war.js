// 063-tug-of-war.js
// 綱引き — 素早くタップして綱を引き、中心を自陣に引き込む筋力勝負
// 操作: 連打でロープを引く
// 成功: ロープを自陣まで引ける  失敗: 15秒で中心を引き込まれる

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（クラシックアーケード） ──
  var C = { bg:'#000011', a:'#0000ff', b:'#00ffff', c:'#ffffff', d:'#ffff00', e:'#ff0000', f:'#00ff00', g:'#ff00ff' };

  var GAME_TITLE  = 'TUG OF WAR';
  var HOW_TO_PLAY = 'TAP RAPIDLY TO PULL';
  var MAX_TIME = 15;
  var PLAYER_WIN = 0.30, ENEMY_WIN = 0.85;    // 修正2: 自陣勝利ラインを近づけて易化
  var PULL_STRENGTH = 0.024, ENEMY_STRENGTH = 0.0045;
  var ROPE_Y = H * 0.5;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  var position, timeLeft, done, ropeShake, tapFlash;

  function snap(v) { return Math.round(v / 8) * 8; }
  function drawPixelCircle(px, py, r, color, alpha) {
    var step = 8; px = snap(px); py = snap(py);
    for (var yy = -r; yy <= r; yy += step)
      for (var xx = -r; xx <= r; xx += step)
        if (xx * xx + yy * yy <= r * r) game.draw.rect(px + xx, py + yy, step, step, color, alpha);
  }
  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x,     y,     { size: sz, color: color,     bold: true, align: align || 'center' });
  }
  function scanlines() { for (var sy = 0; sy < H; sy += 8) game.draw.rect(0, sy, W, 2, '#000000', 0.18); }
  function timeBar() {
    var blocks = 12, lit = Math.ceil(timeLeft / MAX_TIME * blocks);
    for (var i = 0; i < blocks; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < lit ? C.b : '#003b00');
  }

  function initGame() { position = 0.5; timeLeft = MAX_TIME; done = false; ropeShake = 0; tapFlash = 0; }

  function finish(success) {
    if (done) return;
    done = true;
    resultSuccess = success;
    finalScore = success ? (300 + Math.ceil(timeLeft) * 40) : 0;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT)  { state = S.ATTRACT; return; }
    if (done) return;
    position = Math.max(0, position - PULL_STRENGTH); ropeShake = 0.1; tapFlash = 0.08; game.audio.play('se_tap', 0.5);
    if (position <= PLAYER_WIN) finish(true);
  });

  // 世界観: 綱引きの決勝戦。連打で綱を自陣（左）へ引き込む。
  function background() {
    game.draw.clear('#000011');
    game.draw.rect(0, ROPE_Y - 220, snap(W * position), 440, C.a, 0.15);   // 自陣
    game.draw.rect(snap(W * position), ROPE_Y - 220, W - snap(W * position), 440, C.e, 0.15);  // 敵陣
    game.draw.rect(0, ROPE_Y + 80, W, H, '#0a0a22');
  }

  function drawRope() {
    var shake = ropeShake > 0 ? (Math.floor(game.time.elapsed * 40) % 2 === 0 ? 8 : -8) : 0;
    // ロープ
    game.draw.rect(0, snap(ROPE_Y - 20 + shake), W, 40, C.d);
    for (var s = 0; s < 16; s++) game.draw.rect(snap(s / 16 * W), snap(ROPE_Y - 20 + shake), 8, 40, C.f, 0.4);
    // 結び目
    drawPixelCircle(W * position, ROPE_Y + shake, 40, C.c, 1);
    drawPixelCircle(W * position, ROPE_Y + shake, 16, C.g, 1);
    // 勝敗ライン
    game.draw.rect(snap(W * PLAYER_WIN) - 4, ROPE_Y - 160, 8, 320, C.a);
    txt('WIN', W * PLAYER_WIN, ROPE_Y - 200, 40, C.b);
    game.draw.rect(snap(W * ENEMY_WIN) - 4, ROPE_Y - 160, 8, 320, C.e);
    txt('LOSE', W * ENEMY_WIN, ROPE_Y - 200, 40, C.e);
    if (tapFlash > 0) game.draw.rect(0, 0, W, H, C.c, tapFlash / 0.08 * 0.1);
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (position === undefined) initGame();
      background();
      position = 0.5 + Math.sin(game.time.elapsed * 2) * 0.15;
      drawRope();
      txt(GAME_TITLE,  W / 2, H * 0.22, 84, C.d);
      txt(HOW_TO_PLAY, W / 2, H * 0.3, 40, C.b);
      if (Math.floor(game.time.elapsed * 1.67) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.72, 72, C.g);
        txt('TAP TO START', W / 2, H * 0.79, 52, C.c);
      }
      txt('INSERT COIN', W / 2, H * 0.87, 42, '#888888');
      scanlines();
      return;
    }
    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'YOU WIN!' : 'YOU LOSE', W / 2, H * 0.35, 80, resultSuccess ? C.d : C.e);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 64, C.c);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 54, C.b);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(position < 0.5); return; }
      position += ENEMY_STRENGTH * (1 + (MAX_TIME - timeLeft) * 0.04) * dt * 60 * 0.5;
      if (position >= ENEMY_WIN) { finish(false); return; }
      if (ropeShake > 0) ropeShake -= dt;
      if (tapFlash > 0) tapFlash -= dt;
    }

    // ---- draw ----
    background();
    drawRope();
    timeBar();
    txt('YOU', W * 0.12, ROPE_Y + 160, 48, C.b);
    txt('ENEMY', W * 0.88, ROPE_Y + 160, 48, C.e);
    txt('TAP! TAP! TAP!', W / 2, H - 100, 52, C.d);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.35);
    state = S.ATTRACT;
    initGame();
  });
})(game);
