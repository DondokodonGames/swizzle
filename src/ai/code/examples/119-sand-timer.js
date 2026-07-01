// 119-sand-timer.js
// 砂時計 — 砂が落ちきる前にタップしてひっくり返す反応速度ゲーム
// 操作: タップで砂時計をひっくり返す
// 成功: 1回反転に成功  失敗: 砂が落ちきる or 12秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（クラシックアーケード） ──
  var C = { bg:'#000011', a:'#0000ff', b:'#00ffff', c:'#ffffff', d:'#ffff00', e:'#ff0000', f:'#00ff00', g:'#ff00ff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'SAND TIMER';
  var HOW_TO_PLAY = 'TAP TO FLIP BEFORE SAND RUNS OUT';
  var MAX_TIME = 12;             // 修正2: 45 → 12
  var NEEDED   = 1;              // 修正2: 10 → 1
  var FALL_RATE = 0.14;

  var CX    = snap(W / 2);
  var MID_Y = snap(H * 0.5);
  var TOP_Y = snap(MID_Y - 288);
  var BOT_Y = snap(MID_Y + 288);
  var HW    = 168;               // 上下端の半幅
  var NECK  = 16;                // くびれ半幅

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var sand, flipped, flips, timeLeft, done, flash, urgency;

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

  function background() {
    game.draw.clear(C.bg);
  }

  // ── 砂時計スプライト（多矩形・木枠＋ガラス＋砂） ──
  function drawHourglass(sandFrac, flip, flashOn) {
    var glass = flashOn ? C.g : C.b;
    var topSand = flip ? (1 - sandFrac) : sandFrac;
    var botSand = flip ? sandFrac : (1 - sandFrac);
    // 木枠（上下キャップ＋側柱）
    game.draw.rect(CX - HW - 24, TOP_Y - 24, (HW + 24) * 2, 24, C.a);
    game.draw.rect(CX - HW - 24, BOT_Y,      (HW + 24) * 2, 24, C.a);
    game.draw.rect(CX - HW - 24, TOP_Y, 16, BOT_Y - TOP_Y, C.a);
    game.draw.rect(CX + HW + 8,  TOP_Y, 16, BOT_Y - TOP_Y, C.a);
    // 上チャンバー：ガラス縁＋砂
    var sandTopY = MID_Y - topSand * (MID_Y - TOP_Y);
    for (var y = TOP_Y; y < MID_Y; y += 8) {
      var f = (y - TOP_Y) / (MID_Y - TOP_Y);
      var hw = snap(HW * (1 - f) + NECK * f);
      game.draw.rect(CX - hw, y, 8, 8, glass);
      game.draw.rect(CX + hw - 8, y, 8, 8, glass);
      if (y >= sandTopY) game.draw.rect(CX - hw + 8, y, hw * 2 - 16, 8, C.d, 0.9);
    }
    // 下チャンバー：ガラス縁＋砂
    var sandBotY = BOT_Y - botSand * (BOT_Y - MID_Y);
    for (var y2 = MID_Y; y2 < BOT_Y; y2 += 8) {
      var f2 = (y2 - MID_Y) / (BOT_Y - MID_Y);
      var hw2 = snap(NECK * (1 - f2) + HW * f2);
      game.draw.rect(CX - hw2, y2, 8, 8, glass);
      game.draw.rect(CX + hw2 - 8, y2, 8, 8, glass);
      if (y2 >= sandBotY) game.draw.rect(CX - hw2 + 8, y2, hw2 * 2 - 16, 8, C.d, 0.9);
    }
    // 落下する砂の筋（フレーム刻み点滅）
    if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
      game.draw.rect(CX - 4, MID_Y - 48, 8, 96, C.d);
    }
  }

  // ── 初期化 ──
  function initGame() {
    sand = 1.0;
    flipped = false;
    flips = 0;
    timeLeft = MAX_TIME;
    done = false;
    flash = 0;
    urgency = 0;
  }

  // ── 終了処理 ──
  function finish(success) {
    if (done) return;
    done = true;
    resultSuccess = success;
    finalScore = success ? (flips * 100 + Math.ceil(timeLeft) * 20) : flips * 30;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() {
      if (success) game.end.success(finalScore);
      else         game.end.failure();
    }, 1800);
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) {
      game.audio.play('se_tap', 1.0);
      state = S.PLAYING;
      initGame();
      return;
    }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    // PLAYING
    if (done) return;
    flipped = !flipped;
    flips++;
    flash = 0.3;
    game.audio.play('se_tap', 0.7);
    if (flips >= NEEDED) finish(true);
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      background();
      drawHourglass((Math.sin(game.time.elapsed) + 1) / 2, false, false);
      txt(GAME_TITLE,  W / 2, H * 0.16, 88, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.24, 34, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.82, 66, C.d);
        txt('TAP TO START', W / 2, H * 0.88, 50, C.c);
      }
      txt('INSERT COIN', W / 2, H * 0.94, 40, '#8888aa');
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'FLIPPED!' : 'TIME OUT', W / 2, H * 0.35, 80, resultSuccess ? C.f : C.e);
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

      if (!flipped) { sand -= FALL_RATE * dt; urgency = 1 - sand; }
      else          { sand += FALL_RATE * dt; urgency = sand; }
      sand = Math.max(0, Math.min(1, sand));

      if ((sand <= 0 && !flipped) || (sand >= 1 && flipped)) { finish(false); return; }
    }
    if (flash > 0) flash -= dt;

    // ---- 描画 ----
    background();
    if (urgency > 0.7) game.draw.rect(0, 0, W, H, C.e, (urgency - 0.7) * 0.4);
    drawHourglass(sand, flipped, flash > 0);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.c);
    if (urgency > 0.75 && Math.floor(game.time.elapsed * 8) % 2 === 0) {
      txt('HURRY!', W / 2, H - 120, 64, C.e);
    } else {
      txt('TAP TO FLIP', W / 2, H - 120, 48, C.b);
    }
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
    state = S.ATTRACT;
    initGame();
  });
})(game);
