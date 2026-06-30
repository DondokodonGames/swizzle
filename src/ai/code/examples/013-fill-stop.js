// 013-fill-stop.js
// 注ぎ止め — こぼれる寸前で止める最後の一秒
// 操作: 画面をタップして液体を止める（適切な量で止めると成功）
// 成功: 1回ちょうどよい量で止める  失敗: こぼれる or 空で止める

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（クラシックアーケード） ──
  var C = { bg:'#000011', a:'#0000ff', b:'#00ffff', c:'#ffffff', d:'#ffff00', e:'#ff0000', f:'#00ff00', g:'#ff00ff' };

  var GAME_TITLE  = 'FILL & STOP';
  var HOW_TO_PLAY = 'TAP TO STOP IN THE ZONE';
  var MAX_TIME = 25;
  var NEEDED = 1;            // 修正2: 3 → 1
  var MIN_FILL = 0.55, MAX_FILL = 0.90;
  var FILL_RATE = 0.35;
  // 修正1: グラスを縦に大きく
  var GLASS_W = 460, GLASS_H = 1100, GLASS_X = (W - 460) / 2, GLASS_Y = 360, GLASS_WALL = 24;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  var level, filling, score, done, timeLeft, phase, resultOk, resultTimer, poured, overflowed;

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

  function initGame() {
    score = 0; done = false; timeLeft = MAX_TIME;
    startRound();
  }
  function startRound() { level = 0; filling = true; poured = false; overflowed = false; phase = 'pouring'; }

  function finish(success) {
    if (done) return;
    done = true;
    resultSuccess = success;
    finalScore = success ? (score * 300 + Math.ceil(timeLeft) * 40) : score * 100;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT)  { state = S.ATTRACT; return; }
    if (done || phase !== 'pouring' || !filling) return;
    filling = false; poured = true;
    game.audio.play('se_tap', 0.8);
    resultOk = (level >= MIN_FILL && level <= MAX_FILL);
    phase = 'result'; resultTimer = 0.9;
    if (resultOk) { score++; if (score >= NEEDED) finish(true); }
    else finish(false);
  });

  // 世界観: 酒場のバーカウンター。グラスをちょうど良い量で注ぎ止める。
  function background() {
    game.draw.clear('#08040c');
    // 背後の棚（ボトルの列）
    game.draw.rect(0, 140, W, 200, '#1a0e08');
    for (var b = 0; b < 8; b++) {
      var bx = 60 + b * ((W - 120) / 8);
      game.draw.rect(snap(bx), 160, 56, 160, ['#ff2079', '#00ff9f', '#ffe600', '#00cfff'][b % 4], 0.6);
      game.draw.rect(snap(bx) + 20, 130, 16, 40, '#888888');  // ボトル首
    }
    // カウンター天板
    game.draw.rect(0, GLASS_Y + GLASS_H + 20, W, H, '#2a160a');
    game.draw.rect(0, GLASS_Y + GLASS_H + 20, W, 10, C.f, 0.4);
    txt('BAR', W / 2, 110, 36, C.c);
  }

  function drawGlass() {
    game.draw.rect(snap(GLASS_X - 12), snap(GLASS_Y - 12), GLASS_W + 24, GLASS_H + 24, C.a);
    game.draw.rect(snap(GLASS_X), snap(GLASS_Y), GLASS_W, GLASS_H, '#000033');
    var liquidH = level * (GLASS_H - GLASS_WALL);
    var liquidY = GLASS_Y + GLASS_H - GLASS_WALL - liquidH;
    var col = (phase === 'result' && !resultOk) ? C.e : C.b;
    if (liquidH > 0) {
      game.draw.rect(snap(GLASS_X + GLASS_WALL), snap(liquidY), GLASS_W - GLASS_WALL * 2, snap(liquidH), col);
      game.draw.rect(snap(GLASS_X + GLASS_WALL), snap(liquidY), GLASS_W - GLASS_WALL * 2, 8, C.g);
    }
    // OKゾーン
    var minY = GLASS_Y + GLASS_H - GLASS_WALL - MIN_FILL * (GLASS_H - GLASS_WALL);
    var maxY = GLASS_Y + GLASS_H - GLASS_WALL - MAX_FILL * (GLASS_H - GLASS_WALL);
    game.draw.rect(GLASS_X + GLASS_W + 16, snap(maxY), 64, snap(minY - maxY), C.f, 0.4);
    game.draw.rect(GLASS_X + GLASS_W + 16, snap(minY) - 4, 64, 8, C.f);
    game.draw.rect(GLASS_X + GLASS_W + 16, snap(maxY), 64, 8, C.f);
    txt('OK', GLASS_X + GLASS_W + 48, (minY + maxY) / 2, 36, C.f);
    // 注ぎ
    if (filling && phase === 'pouring') {
      var sw = 24 + (Math.floor(game.time.elapsed * 8) % 2) * 8;
      game.draw.rect(snap(W / 2 - sw / 2), snap(GLASS_Y - 240), sw, snap((liquidH > 0 ? liquidY : GLASS_Y + GLASS_H - GLASS_WALL) - (GLASS_Y - 240)), C.b, 0.85);
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      background();
      level = 0.4 + 0.4 * (0.5 + 0.5 * Math.sin(game.time.elapsed * 2)); filling = false; phase = 'attract';
      drawGlass();
      txt(GAME_TITLE,  W / 2, H * 0.1, 76, C.d);
      txt(HOW_TO_PLAY, W / 2, H * 0.18, 40, C.b);
      if (Math.floor(game.time.elapsed * 1.67) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.84, 72, C.g);
        txt('TAP TO START', W / 2, H * 0.9, 52, C.c);
      }
      txt('INSERT COIN', W / 2, H * 0.95, 42, '#888888');
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
      if (phase === 'pouring' && filling) {
        level += FILL_RATE * dt;
        if (level >= 1.0) { level = 1.0; filling = false; overflowed = true; resultOk = false; phase = 'result'; finish(false); }
      } else if (phase === 'result') {
        resultTimer -= dt;
        if (resultTimer <= 0 && !done) startRound();
      }
    }

    // ---- draw ----
    background();
    drawGlass();
    if (phase === 'result') {
      if (resultOk) txt('PERFECT!', W / 2, GLASS_Y - 80, 80, C.f);
      else if (overflowed) txt('OVERFLOW!', W / 2, GLASS_Y - 80, 72, C.e);
      else txt('TOO LOW!', W / 2, GLASS_Y - 80, 72, C.d);
    }
    timeBar();
    txt('SCORE ' + String(score).padStart(6, '0'), W / 2, 96, 48, C.c);
    txt(filling ? 'TAP TO STOP!' : (score + ' / ' + NEEDED), W / 2, H - 100, 56, C.b);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.35);
    state = S.ATTRACT;
    initGame();
  });
})(game);
