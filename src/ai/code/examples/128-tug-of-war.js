// 128-tug-of-war.js
// 綱引き — 力強くタップ連打してロープを自陣に引き込む純粋な連打快感
// 操作: ひたすらタップ連打
// 成功: ロープを自陣に引き込む  失敗: 相手に引き込まれる or 12秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（クラシックアーケード、スポーツ） ──
  var C = { bg:'#000011', a:'#0000ff', b:'#00ffff', c:'#ffffff', d:'#ffff00', e:'#ff0000', f:'#00ff00', g:'#ff00ff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'TUG OF WAR';
  var HOW_TO_PLAY = 'MASH TAP TO PULL THE ROPE!';
  var MAX_TIME = 12;             // 修正2: 20 → 12
  var WIN_DIST = 0.6;            // 修正2: 0.85 → 0.6（引き込み易化）
  var PLAYER_POWER = 0.06;       // 修正2: 連打の効きを強く
  var ENEMY_POWER = 0.012;       // 修正2: 相手の圧を弱く
  var FRICTION = 0.92;
  var ROPE_Y = snap(H * 0.5);
  var CENTER_X = snap(W / 2);

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var rope, ropeVel, taps, tapRate, tapHistory, timeLeft, done, tapFlash, shakeX, particles;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

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
    // 地面
    game.draw.rect(0, ROPE_Y + 120, W, H - ROPE_Y - 120, C.a, 0.3);
    game.draw.rect(0, ROPE_Y + 120, W, 8, C.b);
    // 中央ライン
    game.draw.rect(CENTER_X - 4, ROPE_Y - 160, 8, 320, C.c, 0.5);
  }

  // ── 綱引き選手スプライト（多矩形でキャラクター性） ──
  function drawFighter(cx, color, hi, armDir) {
    cx = snap(cx);
    var y = ROPE_Y;
    // 頭
    game.draw.rect(cx - 24, y - 128, 48, 40, color);
    game.draw.rect(cx - 16 + (armDir > 0 ? 8 : -8), y - 116, 12, 12, C.c); // 目
    // ハチマキ
    game.draw.rect(cx - 24, y - 128, 48, 8, hi);
    // 胴（後傾）
    game.draw.rect(cx - 32 - armDir * 8, y - 84, 64, 88, color);
    game.draw.rect(cx - 32 - armDir * 8, y - 84, 64, 8, hi);
    // ロープを引く腕（中央方向へ伸ばす）
    game.draw.rect(cx, y - 56, armDir * 72, 16, color);
    game.draw.rect(cx + armDir * 56, y - 56, 16, 24, hi); // 拳
    // 踏ん張る脚
    game.draw.rect(cx - 28, y + 4, 18, 56, color);
    game.draw.rect(cx + 10, y + 4, 18, 56, color);
    game.draw.rect(cx - 40, y + 52, 30, 12, hi);
    game.draw.rect(cx + 10, y + 52, 30, 12, hi);
  }

  function drawRope(offset) {
    var startX = CENTER_X + offset - W * 0.42;
    var endX = CENTER_X + offset + W * 0.42;
    for (var x = startX; x <= endX; x += 8) {
      game.draw.rect(snap(x), ROPE_Y - 8, 8, 16, C.d);
    }
    // 結び目
    for (var k = 0; k < 8; k++) {
      var kx = snap(startX + (k + 0.5) / 8 * (endX - startX));
      game.draw.rect(kx - 12, ROPE_Y - 12, 24, 24, C.f);
    }
    // 中央旗
    var flagX = snap(CENTER_X + offset);
    game.draw.rect(flagX - 4, ROPE_Y - 80, 8, 72, C.c);
    game.draw.rect(flagX + 4, ROPE_Y - 80, 40, 28, C.e);
  }

  // ── 初期化 ──
  function initGame() {
    rope = 0; ropeVel = 0;
    taps = 0; tapRate = 0; tapHistory = [];
    timeLeft = MAX_TIME;
    done = false;
    tapFlash = 0; shakeX = 0;
    particles = [];
  }

  // ── 終了処理 ──
  function finish(success) {
    if (done) return;
    done = true;
    resultSuccess = success;
    finalScore = success ? (300 + taps * 10 + Math.ceil(timeLeft) * 30) : taps * 10;
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
    ropeVel += PLAYER_POWER;
    taps++;
    tapFlash = 0.12;
    shakeX = 8 * (Math.random() - 0.5);
    tapHistory.push(timeLeft);
    tapHistory = tapHistory.filter(function(t) { return timeLeft - t < 1.0 && t - timeLeft < 1.0; });
    tapRate = tapHistory.length;
    particles.push({ x: W * 0.28, y: ROPE_Y + (Math.random() - 0.5) * 60, vx: -80, vy: (Math.random() - 0.5) * 100, life: 0.3 });
    game.audio.play('se_tap', 0.5);
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      background();
      drawRope(Math.sin(game.time.elapsed) * 60);
      drawFighter(160, C.a, C.b, 1);
      drawFighter(W - 160, C.e, C.g, -1);
      txt(GAME_TITLE,  W / 2, H * 0.18, 88, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.26, 34, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.80, 66, C.d);
        txt('TAP TO START', W / 2, H * 0.86, 50, C.c);
      }
      txt('INSERT COIN', W / 2, H * 0.92, 40, '#8888aa');
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'YOU WIN!' : 'YOU LOSE', W / 2, H * 0.35, 84, resultSuccess ? C.f : C.e);
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
      if (timeLeft <= 0) { finish(rope > 0); return; }
      var pressure = ENEMY_POWER * (1 + (MAX_TIME - timeLeft) * 0.05);
      ropeVel -= pressure;
      ropeVel *= Math.pow(FRICTION, dt * 60);
      rope += ropeVel * dt;
      rope = Math.max(-1, Math.min(1, rope));
      if (rope >= WIN_DIST) { finish(true); return; }
      if (rope <= -WIN_DIST) { finish(false); return; }
    }
    shakeX *= 0.85;
    if (tapFlash > 0) tapFlash -= dt;
    for (var pi = 0; pi < particles.length; pi++) {
      particles[pi].x += particles[pi].vx * dt;
      particles[pi].y += particles[pi].vy * dt;
      particles[pi].life -= dt;
    }
    particles = particles.filter(function(p) { return p.life > 0; });

    // ---- 描画 ----
    background();
    var offset = rope * (W * 0.32) + shakeX;
    drawRope(offset);
    drawFighter(160 + offset * 0.3, C.a, C.b, 1);
    drawFighter(W - 160 + offset * 0.3, C.e, C.g, -1);
    for (var pp = 0; pp < particles.length; pp++) {
      var pt = particles[pp];
      game.draw.rect(snap(pt.x) - 4, snap(pt.y) - 4, 8, 8, C.b, pt.life * 3);
    }
    if (tapFlash > 0) game.draw.rect(0, 0, W, H, C.a, tapFlash * 0.15);

    // 引き込みメーター（下部）
    var barW = W - 200;
    game.draw.rect(100, H - 120, barW, 32, '#001133');
    game.draw.rect(100 + barW / 2, H - 120, snap(rope * barW / 2), 32, rope > 0 ? C.f : C.e, 0.9);
    game.draw.rect(100 + snap(barW * (0.5 + WIN_DIST / 2)) - 4, H - 128, 8, 48, C.d);
    game.draw.rect(100 + snap(barW * (0.5 - WIN_DIST / 2)) - 4, H - 128, 8, 48, C.d);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.c);
    var rc = tapRate >= 8 ? C.f : (tapRate >= 4 ? C.d : C.b);
    txt('COMBO ' + tapRate + '/s', W / 2, 168, 48, rc);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.4);
    state = S.ATTRACT;
    initGame();
  });
})(game);
