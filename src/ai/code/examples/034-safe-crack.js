// 034-safe-crack.js
// 金庫破り — コチコチ回る回転式ダイヤルを耳で感じる緊張感
// 操作: スワイプ右で時計回り、左で反時計回りに回す
// 成功: 1つの秘密の数字に合わせる  失敗: 30秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（クラシックアーケード） ──
  var C = { bg:'#000011', a:'#0000ff', b:'#00ffff', c:'#ffffff', d:'#ffff00', e:'#ff0000', f:'#00ff00', g:'#ff00ff' };

  var GAME_TITLE  = 'SAFE CRACK';
  var HOW_TO_PLAY = 'SWIPE TO TURN THE DIAL';
  var MAX_TIME = 30;
  var TOTAL_NOTCHES = 40;
  var COMBO_COUNT = 1;      // 修正2: 3 → ceil(3/10) = 1

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  var dialPosition, combo, solved, currentTarget, timeLeft, done, clickFlash, solvedFlash;
  var dcx = W / 2, dcy = H * 0.5, dialR = 320;   // 修正1: ダイヤルを大きく縦中央に

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

  function generateCombo() {
    combo = [];
    while (combo.length < COMBO_COUNT) { var n = Math.floor(Math.random() * TOTAL_NOTCHES); if (combo.indexOf(n) === -1) combo.push(n); }
    solved = []; currentTarget = 0;
  }
  function initGame() { dialPosition = 0; timeLeft = MAX_TIME; done = false; clickFlash = 0; solvedFlash = 0; generateCombo(); }

  function tryRotate(dir) {
    dialPosition = (dialPosition + dir + TOTAL_NOTCHES) % TOTAL_NOTCHES;
    game.audio.play('se_tap', 0.3);
    if (dialPosition === combo[currentTarget]) {
      var reqDir = (currentTarget % 2 === 0) ? 1 : -1;
      if (dir === reqDir) {
        clickFlash = 0.4; solved.push(dialPosition); currentTarget++;
        game.audio.play('se_tap', 0.9);
        if (currentTarget >= COMBO_COUNT) { solvedFlash = 1.0; finish(true); }
      }
    }
  }

  function finish(success) {
    if (done) return;
    done = true;
    resultSuccess = success;
    finalScore = success ? (300 + Math.ceil(timeLeft) * 30) : solved.length * 100;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1500);
  }

  game.onSwipe(function(dir) {
    if (state !== S.PLAYING || done) return;
    if (dir === 'right') for (var i = 0; i < 3; i++) tryRotate(1);
    else if (dir === 'left') for (var j = 0; j < 3; j++) tryRotate(-1);
  });

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT)  { state = S.ATTRACT; return; }
    if (!done) tryRotate(1);
  });

  function background() { game.draw.clear(C.bg); }

  function drawDial() {
    drawPixelCircle(dcx, dcy, dialR, '#000044', 1);
    drawPixelCircle(dcx, dcy, dialR - 16, C.a, 1);
    for (var n = 0; n < TOTAL_NOTCHES; n++) {
      var rotated = (n - dialPosition + TOTAL_NOTCHES) % TOTAL_NOTCHES;
      var ang = (rotated / TOTAL_NOTCHES) * Math.PI * 2 - Math.PI / 2;
      var major = n % 5 === 0, len = major ? 32 : 18;
      var ox = dcx + Math.cos(ang) * (dialR - 24), oy = dcy + Math.sin(ang) * (dialR - 24);
      var ix = dcx + Math.cos(ang) * (dialR - 24 - len), iy = dcy + Math.sin(ang) * (dialR - 24 - len);
      game.draw.line(ix, iy, ox, oy, major ? C.c : C.b, major ? 5 : 3);
      if (major) txt('' + n, dcx + Math.cos(ang) * (dialR - 70), dcy + Math.sin(ang) * (dialR - 70), 28, C.b);
    }
    // 上部マーカー
    game.draw.rect(snap(dcx) - 8, snap(dcy - dialR - 36), 16, 44, C.d);
    drawPixelCircle(dcx, dcy, 64, C.e, 1);
    txt('' + dialPosition, dcx, dcy, 72, C.c);
    if (clickFlash > 0) drawPixelCircle(dcx, dcy, dialR + 24, C.f, clickFlash / 0.4 * 0.3);
    if (solvedFlash > 0) game.draw.rect(0, 0, W, H, C.f, solvedFlash * 0.3);
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (combo === undefined) initGame();
      background();
      dialPosition = Math.floor(game.time.elapsed * 4) % TOTAL_NOTCHES;
      drawDial();
      txt(GAME_TITLE,  W / 2, H * 0.12, 84, C.d);
      txt(HOW_TO_PLAY, W / 2, H * 0.19, 40, C.b);
      if (Math.floor(game.time.elapsed * 1.67) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.84, 72, C.g);
        txt('TAP TO START', W / 2, H * 0.9, 52, C.c);
      }
      txt('INSERT COIN', W / 2, H * 0.96, 42, '#888888');
      scanlines();
      return;
    }
    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'CONGRATULATIONS!' : 'GAME OVER', W / 2, H * 0.35, 80, resultSuccess ? C.d : C.e);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 64, C.c);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 54, C.b);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (clickFlash > 0) clickFlash -= dt;
      if (solvedFlash > 0) solvedFlash -= dt;
    }

    // ---- draw ----
    background();
    drawDial();
    timeBar();
    var dirHint = (currentTarget % 2 === 0) ? 'SWIPE RIGHT' : 'SWIPE LEFT';
    txt('TARGET ' + combo[currentTarget] + '  ' + dirHint, W / 2, 100, 44, C.d);
    txt('TURN TO THE NUMBER!', W / 2, H - 100, 44, C.b);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.25);
    state = S.ATTRACT;
    initGame();
  });
})(game);
