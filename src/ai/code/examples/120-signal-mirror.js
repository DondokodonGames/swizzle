// 120-signal-mirror.js
// 信号ミラー — 反射する光線を鏡の角度で操作してターゲットに照準を合わせる
// 操作: スワイプ左右で鏡の角度を調整
// 成功: 1つのターゲットを照射  失敗: 10秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、光学装置） ──
  var C = { bg:'#1a0028', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'SIGNAL MIRROR';
  var HOW_TO_PLAY = 'SWIPE ◄► TO AIM THE BEAM AT TARGET';
  var MAX_TIME = 10;             // 修正2: 30 → 10
  var NEEDED   = 1;              // 修正2: 5 → 1
  var HIT_HOLD = 0.4;
  var TOP    = 220;
  var BOTTOM = H - 180;

  var MIRROR_X = snap(W / 2);
  var MIRROR_Y = snap(H * 0.72);  // 下部三分の一
  var MIRROR_L = 160;
  var MIRROR_SPEED = Math.PI / 12;

  var SOURCE_X = snap(140);
  var SOURCE_Y = snap(TOP + 60);

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var targets, mirrorAngle, score, timeLeft, done, hitFlash, hitTargetIdx, hitTimer;

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
      game.draw.rect(40 + i * 84, 20, 72, 40, i < lit ? C.b : '#2a0a3a');
    }
  }

  function background() {
    game.draw.clear(C.bg);
    // 光学台のグリッド
    for (var gx = 0; gx < W; gx += 96) game.draw.rect(gx, TOP, 2, BOTTOM - TOP, C.d, 0.2);
    for (var gy = TOP; gy < BOTTOM; gy += 96) game.draw.rect(0, gy, W, 2, C.d, 0.2);
  }

  // ── ピクセル光線（8pxブロックで軌跡を描く） ──
  function pixelBeam(x1, y1, x2, y2, color) {
    var steps = Math.ceil(Math.sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1)) / 8);
    for (var i = 0; i <= steps; i++) {
      var t = i / steps;
      game.draw.rect(snap(x1 + (x2 - x1) * t) - 4, snap(y1 + (y2 - y1) * t) - 4, 8, 8, color, 0.9);
    }
  }

  // ── スプライト ──
  function drawSource() {
    game.draw.rect(SOURCE_X - 32, SOURCE_Y - 32, 64, 64, C.g);
    game.draw.rect(SOURCE_X - 24, SOURCE_Y - 24, 48, 48, C.c);
    drawPixelCircle(SOURCE_X, SOURCE_Y, 16, C.f, 1);
    txt('SRC', SOURCE_X, SOURCE_Y + 56, 26, C.e);
  }

  function drawTarget(t, being) {
    var col = t.hit ? C.b : (being ? C.c : C.a);
    // 装置の筐体
    game.draw.rect(t.x - 48, t.y - 48, 96, 96, C.d, 0.6);
    drawPixelCircle(t.x, t.y, 40, col, t.hit ? 1 : 0.7);
    drawPixelCircle(t.x, t.y, 20, C.bg, 1);
    drawPixelCircle(t.x, t.y, 10, col, 1);
    // 照準リング角（キャラクター性）
    game.draw.rect(t.x - 48, t.y - 48, 16, 8, col);
    game.draw.rect(t.x + 32, t.y - 48, 16, 8, col);
    game.draw.rect(t.x - 48, t.y + 40, 16, 8, col);
    game.draw.rect(t.x + 32, t.y + 40, 16, 8, col);
  }

  function drawMirror(flashOn) {
    var mx1 = MIRROR_X + Math.cos(mirrorAngle) * MIRROR_L;
    var my1 = MIRROR_Y + Math.sin(mirrorAngle) * MIRROR_L;
    var mx2 = MIRROR_X - Math.cos(mirrorAngle) * MIRROR_L;
    var my2 = MIRROR_Y - Math.sin(mirrorAngle) * MIRROR_L;
    pixelBeam(mx1, my1, mx2, my2, flashOn ? C.g : C.e);
    // 台座
    game.draw.rect(MIRROR_X - 24, MIRROR_Y - 24, 48, 48, C.g);
    game.draw.rect(MIRROR_X - 16, MIRROR_Y - 16, 32, 32, C.e);
  }

  // ── ビーム計算 ──
  function computeBeam() {
    var idx = MIRROR_X - SOURCE_X, idy = MIRROR_Y - SOURCE_Y;
    var iLen = Math.sqrt(idx * idx + idy * idy);
    var inx = idx / iLen, iny = idy / iLen;
    var nx = -Math.sin(mirrorAngle), ny = Math.cos(mirrorAngle);
    var dot = inx * nx + iny * ny;
    return { rx: inx - 2 * dot * nx, ry: iny - 2 * dot * ny };
  }

  function checkTargetHit() {
    var ref = computeBeam();
    for (var i = 0; i < targets.length; i++) {
      var t = targets[i];
      if (t.hit) continue;
      var dx = t.x - MIRROR_X, dy = t.y - MIRROR_Y;
      var tp = dx * ref.rx + dy * ref.ry;
      if (tp < 0) continue;
      var px = dx - tp * ref.rx, py = dy - tp * ref.ry;
      if (Math.sqrt(px * px + py * py) < t.r) return i;
    }
    return -1;
  }

  // ── 初期化 ──
  function initGame() {
    targets = [
      { x: snap(W * 0.82), y: snap(H * 0.24), r: 56, hit: false },
      { x: snap(W * 0.18), y: snap(H * 0.40), r: 56, hit: false },
      { x: snap(W * 0.84), y: snap(H * 0.50), r: 56, hit: false }
    ];
    mirrorAngle = Math.PI / 4;
    score = 0;
    timeLeft = MAX_TIME;
    done = false;
    hitFlash = 0;
    hitTargetIdx = -1;
    hitTimer = 0;
  }

  // ── 終了処理 ──
  function finish(success) {
    if (done) return;
    done = true;
    resultSuccess = success;
    finalScore = success ? (score * 300 + Math.ceil(timeLeft) * 30) : score * 100;
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
  });

  game.onSwipe(function(dir) {
    if (state !== S.PLAYING || done) return;
    if (dir === 'left')  mirrorAngle -= MIRROR_SPEED;
    if (dir === 'right') mirrorAngle += MIRROR_SPEED;
    mirrorAngle = Math.max(-Math.PI * 0.8, Math.min(Math.PI * 0.8, mirrorAngle));
    game.audio.play('se_tap', 0.3);
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      background();
      mirrorAngle = Math.PI / 4 + Math.sin(game.time.elapsed) * 0.3;
      drawSource();
      drawMirror(false);
      var ref0 = computeBeam();
      pixelBeam(SOURCE_X, SOURCE_Y, MIRROR_X, MIRROR_Y, C.c);
      pixelBeam(MIRROR_X, MIRROR_Y, MIRROR_X + ref0.rx * 1400, MIRROR_Y + ref0.ry * 1400, C.c);
      txt(GAME_TITLE,  W / 2, H * 0.14, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.21, 32, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.84, 64, C.a);
        txt('TAP TO START', W / 2, H * 0.90, 50, C.g);
      }
      txt('INSERT COIN', W / 2, H * 0.95, 40, '#886699');
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'LOCKED ON!' : 'TIME OUT', W / 2, H * 0.35, 80, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) {
        txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      }
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }

      var hitIdx = checkTargetHit();
      if (hitIdx >= 0) {
        if (hitIdx === hitTargetIdx) {
          hitTimer += dt;
          if (hitTimer >= HIT_HOLD) {
            targets[hitIdx].hit = true;
            score++;
            hitFlash = 0.5;
            hitTargetIdx = -1;
            hitTimer = 0;
            game.audio.play('se_success');
            if (score >= NEEDED) { finish(true); return; }
          }
        } else { hitTargetIdx = hitIdx; hitTimer = 0; }
      } else { hitTargetIdx = -1; hitTimer = 0; }
    }
    if (hitFlash > 0) hitFlash -= dt;

    // ---- 描画 ----
    background();
    drawSource();

    for (var ti = 0; ti < targets.length; ti++) {
      drawTarget(targets[ti], ti === hitTargetIdx);
      if (ti === hitTargetIdx) {
        var prog = Math.round(hitTimer / HIT_HOLD * 100);
        txt(prog + '%', targets[ti].x, targets[ti].y - 72, 32, C.c);
      }
    }

    // 入射光 → 鏡 → 反射光
    pixelBeam(SOURCE_X, SOURCE_Y, MIRROR_X, MIRROR_Y, C.c);
    var ref = computeBeam();
    pixelBeam(MIRROR_X, MIRROR_Y, MIRROR_X + ref.rx * 1600, MIRROR_Y + ref.ry * 1600, C.c);
    drawMirror(hitFlash > 0);

    if (hitFlash > 0) game.draw.rect(0, 0, W, H, C.b, hitFlash * 0.2);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(score + ' / ' + NEEDED, W / 2, H - 120, 52, C.b);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
    state = S.ATTRACT;
    initGame();
  });
})(game);
