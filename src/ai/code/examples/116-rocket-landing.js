// 116-rocket-landing.js
// ロケット着陸 — 燃料を節約しながらゆっくり降下してパッドに着地する精密制御の快感
// 操作: タップでスラスター点火/停止（燃料消費）
// 成功: 着地速度 < 260でパッドに着地  失敗: 速度オーバー or 場外 or 8秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（クラシックアーケード、宇宙） ──
  var C = { bg:'#000011', a:'#0000ff', b:'#00ffff', c:'#ffffff', d:'#ffff00', e:'#ff0000', f:'#00ff00', g:'#ff00ff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'ROCKET LANDING';
  var HOW_TO_PLAY = 'TAP TO FIRE THRUSTER · LAND SOFTLY';
  var MAX_TIME = 8;               // 修正2: 30 → 8（精密制御なので短め）
  var TOP    = 220;
  var BOTTOM = H - 180;

  var ROCKET_W = 48, ROCKET_H = 112;
  var GRAVITY = 130;              // 修正2: 降下をゆるやかに
  var THRUST  = 340;
  var SAFE_SPEED = 260;           // 修正2: 許容着地速度を上げて易化
  var PAD_W = 280;                // 修正2: パッドを広く
  var FUEL_RATE = 22;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var rocketX, rocketY, rocketVX, rocketVY, fuel, thrusting;
  var padX, padY, timeLeft, done, flash, stars;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function drawPixelCircle(cx, cy, r, color, alpha) {
    var step = 8;
    cx = snap(cx); cy = snap(cy);
    for (var py = -r; py <= r; py += step) {
      for (var px = -r; px <= r; px += step) {
        if (px * px + py * py <= r * r) {
          game.draw.rect(cx + px, cy + py, step, step, color, alpha);
        }
      }
    }
  }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x,     y,     { size: sz, color: color,     bold: true, align: align || 'center' });
  }

  function scanlines() {
    for (var sy = 0; sy < H; sy += 8) {
      game.draw.rect(0, sy, W, 2, '#000000', 0.18);
    }
  }

  function timeBar() {
    var blocks = 12;
    var lit = Math.ceil(timeLeft / MAX_TIME * blocks);
    for (var i = 0; i < blocks; i++) {
      game.draw.rect(40 + i * 84, 20, 72, 40, i < lit ? C.b : '#001133');
    }
  }

  // ── 星空背景 ──
  function background() {
    game.draw.clear(C.bg);
    for (var i = 0; i < stars.length; i++) {
      var st = stars[i];
      var blink = Math.floor((game.time.elapsed + st.o) * 8) % 2 === 0 ? 0.9 : 0.35;
      game.draw.rect(st.x, st.y, st.s, st.s, C.c, blink);
    }
  }

  // ── スプライト（多矩形でキャラクター性） ──
  function drawRocket(cx, cy, flame) {
    cx = snap(cx);
    var top = snap(cy - ROCKET_H / 2);
    // ノーズ（先細り）
    game.draw.rect(cx - 8,  top,      16, 16, C.e);
    game.draw.rect(cx - 16, top + 16, 32, 16, C.e);
    // 胴体
    game.draw.rect(cx - 24, top + 32, 48, 56, C.c);
    game.draw.rect(cx - 24, top + 32, 48, 8,  C.b);   // ハイライト帯
    // 窓
    drawPixelCircle(cx, top + 56, 12, C.a, 1);
    game.draw.rect(cx - 8, top + 48, 16, 8, C.b, 0.8);
    // フィン
    game.draw.rect(cx - 40, top + 72, 16, 24, C.e);
    game.draw.rect(cx + 24, top + 72, 16, 24, C.e);
    // 基部
    game.draw.rect(cx - 16, top + 88, 32, 16, C.a);
    // 炎（フレーム刻み点滅）
    if (flame && Math.floor(game.time.elapsed * 8) % 2 === 0) {
      game.draw.rect(cx - 12, top + 104, 24, 16, C.d);
      game.draw.rect(cx - 8,  top + 120, 16, 16, C.e);
    } else if (flame) {
      game.draw.rect(cx - 8, top + 104, 16, 24, C.d);
    }
  }

  function drawPad(px, py) {
    px = snap(px); py = snap(py);
    // 天板
    game.draw.rect(px - PAD_W / 2, py, PAD_W, 16, C.f);
    game.draw.rect(px - PAD_W / 2, py, PAD_W, 8, C.b);
    // 脚
    game.draw.rect(px - PAD_W / 2 + 16, py + 16, 16, 40, C.a);
    game.draw.rect(px + PAD_W / 2 - 32, py + 16, 16, 40, C.a);
    // 誘導灯（フレーム刻み点滅）
    var on = Math.floor(game.time.elapsed * 8) % 2 === 0;
    game.draw.rect(px - PAD_W / 2,      py - 8, 16, 8, on ? C.d : '#332200');
    game.draw.rect(px + PAD_W / 2 - 16, py - 8, 16, 8, on ? C.d : '#332200');
    txt('PAD', px, py + 40, 28, C.b);
  }

  // ── 初期化 ──
  function initGame() {
    done = false;
    timeLeft = MAX_TIME;
    rocketX = snap(W / 2);
    rocketY = snap(TOP + 100);
    rocketVX = game.random(-30, 30);
    rocketVY = 0;
    fuel = 100;
    thrusting = false;
    flash = 0;
    padY = snap(BOTTOM - 60);
    padX = snap(Math.max(PAD_W / 2 + 60, Math.min(W - PAD_W / 2 - 60,
           W / 2 + (Math.random() > 0.5 ? 1 : -1) * game.random(80, 220))));
    stars = [];
    for (var i = 0; i < 48; i++) {
      stars.push({ x: snap(game.random(0, W)), y: snap(game.random(0, BOTTOM)), s: 8, o: Math.random() });
    }
  }

  // ── 終了処理 ──
  function finish(success) {
    if (done) return;
    done = true;
    resultSuccess = success;
    finalScore = success
      ? Math.round(300 + (SAFE_SPEED - Math.abs(rocketVY)) + fuel * 3 + Math.ceil(timeLeft) * 10)
      : Math.round(fuel);
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() {
      if (success) game.end.success(finalScore);
      else         game.end.failure();
    }, 1800);
  }

  // ── 入力 ──
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) {
      game.audio.play('se_tap', 1.0);
      state = S.PLAYING;
      initGame();
      return;
    }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    // PLAYING: スラスター点火切替
    if (done) return;
    if (fuel > 0) { thrusting = !thrusting; game.audio.play('se_tap', 0.5); }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      background();
      drawRocket(W / 2, H * 0.5, true);
      drawPad(W / 2, H * 0.68);
      txt(GAME_TITLE,  W / 2, H * 0.24, 88, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.34, 38, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.80, 68, C.d);
        txt('TAP TO START', W / 2, H * 0.87, 50, C.c);
      }
      txt('INSERT COIN', W / 2, H * 0.93, 40, '#8888aa');
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      drawPad(padX, padY);
      txt(resultSuccess ? 'SAFE LANDING!' : 'CRASHED', W / 2, H * 0.35, 80, resultSuccess ? C.f : C.e);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.c);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) {
        txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.b);
      }
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }

      if (thrusting && fuel > 0) {
        rocketVY -= THRUST * dt;
        fuel -= FUEL_RATE * dt;
        if (fuel <= 0) { fuel = 0; thrusting = false; }
      }
      rocketVY += GRAVITY * dt;
      rocketY += rocketVY * dt;
      rocketX += rocketVX * dt;
      rocketVX *= Math.pow(0.98, dt * 60);

      if (rocketX < ROCKET_W / 2) { rocketX = ROCKET_W / 2; rocketVX = Math.abs(rocketVX) * 0.5; }
      if (rocketX > W - ROCKET_W / 2) { rocketX = W - ROCKET_W / 2; rocketVX = -Math.abs(rocketVX) * 0.5; }

      var rocketBottom = rocketY + ROCKET_H / 2;
      if (rocketBottom >= padY) {
        var onPad = rocketX > padX - PAD_W / 2 && rocketX < padX + PAD_W / 2;
        flash = 0.4;
        if (onPad && Math.abs(rocketVY) < SAFE_SPEED) finish(true);
        else finish(false);
        return;
      }
    }
    if (flash > 0) flash -= dt;

    // ---- 描画 ----
    background();
    drawPad(padX, padY);
    // 地面
    game.draw.rect(0, padY + 56, W, H - padY - 56, C.a, 0.4);
    drawRocket(rocketX, rocketY, thrusting && fuel > 0);

    if (flash > 0) game.draw.rect(0, 0, W, H, C.c, flash);

    // 燃料バー（下部）
    var speed = Math.round(Math.abs(rocketVY));
    var fuelW = 400;
    game.draw.rect(W / 2 - fuelW / 2, H - 120, fuelW, 32, '#001133');
    game.draw.rect(W / 2 - fuelW / 2, H - 120, snap(fuelW * (fuel / 100)), 32, fuel > 25 ? C.f : C.e);
    txt('FUEL ' + Math.round(fuel), W / 2, H - 148, 40, C.c);
    txt('SPD ' + speed, W / 2, H - 76, 44, speed < SAFE_SPEED ? C.b : C.e);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.c);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
    state = S.ATTRACT;
    initGame();
  });
})(game);
