// 159-tug-of-war.js
// 綱引き — 連打で綱を引き、相手チームを引きずり込む筋肉の燃え感
// 操作: タップ連打で引く
// 成功: 1本先取  失敗: 1本取られる or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（クラシックアーケード、競技場） ──
  var C = { bg:'#000011', a:'#0000ff', b:'#00ffff', c:'#ffffff', d:'#ffff00', e:'#ff0000', f:'#00ff00', g:'#ff00ff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'TUG OF WAR';
  var HOW_TO_PLAY = 'MASH TAP TO PULL THE ROPE';
  var MAX_TIME = 15;             // 修正2: 60 → 15
  var MAX_WINS = 1;              // 修正2: 3 → 1
  var WIN_DIST = 300;
  var ROPE_Y = snap(H * 0.5), CENTER_X = snap(W / 2);
  var TAP_BOOST = 26, TAP_DECAY = 0.88, AI_POWER = 11, AI_INTERVAL = 0.08;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var ropeOffset, tapPower, aiTimer, playerWins, enemyWins, roundOver, roundTimer, timeLeft, done, shakeX;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) {
    var step = 8; cx = snap(cx); cy = snap(cy);
    for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) {
      if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha);
    }
  }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var lit = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < lit ? C.b : '#001133');
  }

  function background(ox) {
    game.draw.clear(C.bg);
    game.draw.rect(0, ROPE_Y - 220, W, 440, C.a, 0.15);
    game.draw.rect(0, ROPE_Y - 3, W, 6, C.a, 0.4);
    game.draw.rect(CENTER_X + WIN_DIST - 4, ROPE_Y - 180, 8, 360, C.a);
    game.draw.rect(CENTER_X - WIN_DIST - 4, ROPE_Y - 180, 8, 360, C.e);
  }

  function drawTeam(cx, color, hi, armDir) {
    cx = snap(cx);
    var y = ROPE_Y;
    pc(cx, y - 96, 32, color, 1);                       // 頭
    game.draw.rect(cx - 24, y - 128, 48, 8, hi);        // 鉢巻
    game.draw.rect(cx - 28 - armDir * 8, y - 60, 56, 72, color); // 胴
    game.draw.rect(cx, y - 40, armDir * 60, 14, color); // 腕
    game.draw.rect(cx - 20, y + 12, 16, 48, color);     // 脚
    game.draw.rect(cx + 4, y + 12, 16, 48, color);
  }

  function drawRope(ox) {
    for (var x = snap(64); x <= W - 64; x += 8) game.draw.rect(x, ROPE_Y - 10 + ox, 8, 20, C.d);
    var mx = snap(CENTER_X + ropeOffset);
    pc(mx, ROPE_Y + ox, 28, C.c, 1);
    game.draw.rect(mx - 4, ROPE_Y - 60 + ox, 8, 52, C.g); // 旗竿
    game.draw.rect(mx + 4, ROPE_Y - 60 + ox, 36, 24, C.d);
  }

  function resetRound() { ropeOffset = 0; tapPower = 0; roundOver = false; aiTimer = 0; }

  function initGame() {
    ropeOffset = 0; tapPower = 0; aiTimer = 0; playerWins = 0; enemyWins = 0;
    roundOver = false; roundTimer = 0; timeLeft = MAX_TIME; done = false; shakeX = 0;
  }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (500 + Math.ceil(timeLeft) * 40) : 100;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || roundOver) return;
    tapPower = Math.min(120, tapPower + TAP_BOOST);
    game.audio.play('se_tap', 0.25);
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      background(0);
      drawRope(0); drawTeam(150, C.a, C.b, 1); drawTeam(W - 150, C.e, C.g, -1);
      txt(GAME_TITLE, W / 2, H * 0.20, 88, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.28, 34, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.78, 64, C.d);
        txt('TAP TO START', W / 2, H * 0.84, 50, C.c);
      }
      txt('INSERT COIN', W / 2, H * 0.90, 40, '#8888aa');
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background(0);
      txt(resultSuccess ? 'YOU WIN!' : 'YOU LOSE', W / 2, H * 0.35, 84, resultSuccess ? C.f : C.e);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.c);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.b);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(ropeOffset > 0); return; }
      if (roundOver) { roundTimer -= dt; if (roundTimer <= 0) resetRound(); }
      else {
        tapPower *= Math.pow(TAP_DECAY, dt * 60);
        ropeOffset += tapPower * dt;
        aiTimer -= dt;
        if (aiTimer <= 0) { aiTimer = AI_INTERVAL; ropeOffset -= (AI_POWER + Math.random() * 6); }
        if (ropeOffset >= WIN_DIST) { playerWins++; roundOver = true; roundTimer = 1.2; shakeX = 18; game.audio.play('se_success'); if (playerWins >= MAX_WINS) { finish(true); return; } }
        else if (ropeOffset <= -WIN_DIST) { enemyWins++; roundOver = true; roundTimer = 1.2; game.audio.play('se_failure', 0.7); if (enemyWins >= MAX_WINS) { finish(false); return; } }
      }
    }
    if (shakeX > 0) shakeX *= 0.75;
    var ox = Math.random() * shakeX * 2 - shakeX;

    // ---- 描画 ----
    background(ox);
    drawRope(ox);
    drawTeam(150 + ropeOffset * 0.4, C.a, C.b, 1);
    drawTeam(W - 150 + ropeOffset * 0.4, C.e, C.g, -1);
    if (roundOver) { var won = ropeOffset >= WIN_DIST; txt(won ? 'WIN!' : 'LOSE!', W / 2, H / 2 - 260, 80, won ? C.f : C.e); }
    // パワーバー
    game.draw.rect(W / 2 - 200, H - 130, 400, 28, '#001133');
    game.draw.rect(W / 2 - 200, H - 130, snap(400 * tapPower / 120), 28, C.b, 0.9);
    if (!roundOver) txt('MASH TAP!', W / 2, H - 80, 44, C.d);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.c);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.35);
    state = S.ATTRACT;
    initGame();
  });
})(game);
