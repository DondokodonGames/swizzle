// J-N6434-0005-slope-snowball-rub.js
// 斜面の雪玉ころがし — 指を左右にこすって雪玉を転がし、土の出た地面を避けて台座サイズまで育てる
// 操作: 画面を左右に素早くこすると雪玉が転がり、こすった側(左/右)の筋へ寄る。土の筋に乗ると削れて小さくなる
// 終わり: 目標の輪の大きさまで育てばCLEAR。削れて崩れる/時間切れでGAME OVER
// @mechanic: rub
// @theme: slope_snowball_growing
// 世界観: 雪祭りの前の朝、像づくりの見習いが斜面で雪玉をこすり転がし、日なたで土の出た筋を左右によけながら、台座にのる大きさまで育てきる
// 残るもの: 正誤(CLEAR/GAME OVER) + 最大の大きさ(%)と転がした距離
// スタイル: HYPERCASUAL 3D

(function (game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // HYPERCASUAL 3D: 白背景 + 単色、柔らかい影の丸い塊、当たり判定が見た目どおり
  var HC = {
    sky: '#eaf4ff', snow: '#ffffff', snow2: '#dfe9f5', shade: '#b8c8dc', soil: '#b08060', soil2: '#8a6048',
    powder: '#9fd8ff', accent: '#ff6b8a', ink: '#34405a', mitt: '#ff6b8a', coat: '#4a90e2', gold: '#ffc233'
  };

  var GAME_TITLE = 'SNOW ROLL';
  var TIME_LIMIT = 13;
  var BALL_Y = H * 0.56;
  var LANES = [W * 0.32, W * 0.68];
  var R_START = 60, R_GOAL = 165, R_MIN = 38;
  var MAX_SPEED = 1450;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var KID = [
    [
      '..hhhh..',
      '.hhhhhh.',
      '..ffff..',
      '.cccccc.',
      'mcccccm.',
      '.cccccc.',
      '..c..c..',
      '.bb..bb.'
    ],
    [
      '..hhhh..',
      '.hhhhhh.',
      '..ffff..',
      '.cccccc.',
      '.mccccm.',
      '.cccccc.',
      '..c..c..',
      '..bbbb..'
    ]
  ];
  var FLAG = ['aaaa', 'aaa.', 'aa..', 'p...', 'p...', 'p...'];
  var PINE = ['...g...', '..ggg..', '.ggggg.', '..ggg..', '.ggggg.', 'ggggggg', '...t...'];

  var radius, maxR, speed, dist, laneX, targetLane, items, spawnIn, onBare, onPowder, timeLeft, ready, hitStop, endWait, done, ok, why, flashT, lastMoveX, milestone;

  function initGame() {
    radius = R_START; maxR = R_START; speed = 0; dist = 0;
    targetLane = 1; laneX = LANES[1]; items = []; spawnIn = 500; onBare = false; onPowder = false;
    timeLeft = TIME_LIMIT; ready = 0.8; hitStop = 0; endWait = 0; done = false; ok = false; why = '';
    flashT = 0; lastMoveX = null; milestone = false;
  }

  // こする入力。移動量ぶん速度を足し、こすった側の筋へ寄せる
  function applyRub(x, dx) {
    speed = Math.min(MAX_SPEED, speed + Math.abs(dx) * 1.25);
    targetLane = x < W / 2 ? 0 : 1;
  }

  // 斜面の進行。返り値: 'bare' (土の筋に入った瞬間) | 'powder' | 'crumble' | 'goal' | null
  function stepSlope(dt) {
    speed *= Math.pow(0.5, dt);
    var d = speed * dt;
    dist += d;
    laneX += (LANES[targetLane] - laneX) * Math.min(1, dt * 6);
    spawnIn -= d;
    if (spawnIn <= 0) {
      var type = Math.random() < 0.7 ? 'bare' : 'powder';
      items.push({ lane: Math.random() < 0.5 ? 0 : 1, y: H * 0.14, len: type === 'bare' ? game.random(260, 380) : 220, type: type });
      spawnIn = game.random(520, 760);
    }
    var ev = null;
    var wasBare = onBare, wasPowder = onPowder;
    onBare = false; onPowder = false;
    for (var i = items.length - 1; i >= 0; i--) {
      var it = items[i];
      it.y += d;
      if (it.y - it.len > H) { items.splice(i, 1); continue; }
      var over = BALL_Y > it.y - it.len && BALL_Y - radius * 0.3 < it.y && Math.abs(laneX - LANES[it.lane]) < 150;
      if (over && it.type === 'bare') onBare = true;
      if (over && it.type === 'powder') onPowder = true;
    }
    if (onBare) radius -= d * 0.05;
    else radius += d * (onPowder ? 0.024 : 0.011);
    radius -= dt * 1.5;
    if (radius > maxR) maxR = radius;
    if (flashT > 0) flashT -= dt;
    if (onBare && !wasBare) ev = 'bare';
    if (onPowder && !wasPowder) ev = 'powder';
    if (radius <= R_MIN) return 'crumble';
    if (radius >= R_GOAL) return 'goal';
    return ev;
  }

  function pct() { return Math.max(0, Math.min(100, Math.round(((radius - R_START) / (R_GOAL - R_START)) * 100))); }

  function txt(str, x, y, size, color) {
    game.draw.text(str, x, y, { size: size, color: color || HC.ink, bold: true, align: 'center' });
  }

  function softShadow(x, y, rw, a) {
    for (var k = 3; k >= 1; k--) {
      var s = k / 3;
      for (var i = -12 * s; i <= 12 * s; i += 4) {
        var w = rw * s * Math.sqrt(Math.max(0, 1 - (i * i) / (144 * s * s)));
        game.draw.rect(x - w, y + i, w * 2, 4, HC.shade, a / 3);
      }
    }
  }

  function drawSlope() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, HC.sky], [0.25, HC.snow2], [1, HC.snow]]);
    // 遠景の木(常時ゆれ)
    for (var p = 0; p < 5; p++) {
      var px = 90 + p * 225, py = H * 0.12 + Math.sin(t * 1.2 + p) * 4;
      game.draw.sprite(PINE, { g: '#7fc8a9', t: HC.soil2 }, px, py, 12, { anchor: 'center' });
    }
    // 斜面の筋(2本)
    for (var l = 0; l < 2; l++) {
      game.draw.rect(LANES[l] - 150, H * 0.15, 300, H * 0.85, HC.snow2, 0.5);
    }
    // 雪面の流れる筋目(転がった距離に連動)
    for (var s = 0; s < 14; s++) {
      var sy = H * 0.15 + ((s * 140 + dist) % (H * 0.85));
      game.draw.rect(60 + (s * 173) % (W - 180), sy, 60, 6, HC.shade, 0.35);
    }
    // 土の筋・新雪
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      var top = Math.max(H * 0.15, it.y - it.len), bot = Math.min(H, it.y);
      if (bot <= top) continue;
      var near = it.y - it.len < BALL_Y && it.y > BALL_Y - 400;
      var blink = it.type === 'bare' && near && Math.floor(t * 8) % 2 === 0;
      if (it.type === 'bare') {
        game.draw.rect(LANES[it.lane] - 130, top, 260, bot - top, blink ? HC.soil2 : HC.soil);
        for (var d = top + 20; d < bot - 10; d += 60) game.draw.circle(LANES[it.lane] - 60 + (d % 120), d, 14, HC.soil2);
      } else {
        game.draw.rect(LANES[it.lane] - 130, top, 260, bot - top, HC.powder, 0.35);
        for (var k = 0; k < 5; k++) game.draw.circle(LANES[it.lane] - 100 + k * 50, top + ((k * 70 + t * 80) % Math.max(1, bot - top)), 8, HC.snow);
      }
      // 予告の旗
      if (it.type === 'bare' && it.y - it.len > H * 0.15 && it.y - it.len < H * 0.4) {
        game.draw.sprite(FLAG, { a: HC.accent, p: HC.ink }, LANES[it.lane] + 110, it.y - it.len - 40 + Math.sin(t * 6) * 4, 10, { anchor: 'center' });
      }
    }
    game.draw.rect(0, 0, W, H, HC.powder, 0.03 + 0.03 * Math.sin(t * 1.4));
  }

  function drawBall() {
    var t = game.time.elapsed;
    var x = laneX, y = BALL_Y;
    // 目標の輪(点線)
    for (var a = 0; a < 32; a++) {
      var ang = (a / 32) * Math.PI * 2 + t * 0.4;
      game.draw.circle(x + Math.cos(ang) * R_GOAL, y + Math.sin(ang) * R_GOAL, 6, HC.accent, 0.55);
    }
    softShadow(x, y + radius * 0.9, radius * 1.05, 0.5);
    var body = flashT > 0 ? HC.snow : HC.snow;
    game.draw.circle(x, y, radius, onBare ? '#e9dccf' : body);
    game.draw.circle(x + radius * 0.12, y + radius * 0.18, radius * 0.85, HC.snow2, 0.8);
    game.draw.circle(x - radius * 0.3, y - radius * 0.35, radius * 0.3, HC.snow);
    // 転がりの模様
    var ph = (dist * 0.02) % (Math.PI * 2);
    game.draw.circle(x + Math.cos(ph) * radius * 0.5, y + Math.sin(ph) * radius * 0.3, radius * 0.1, HC.shade, 0.7);
    if (flashT > 0) game.draw.circle(x, y, radius * 1.15, HC.snow, flashT * 1.5);
    // 見習い(雪玉のうしろで押す)
    var fr = speed > 200 ? Math.floor(t * 8) % 2 : 0;
    game.draw.sprite(KID[fr], { h: HC.coat, f: '#ffd9b3', c: HC.coat, m: HC.mitt, b: HC.ink }, x, y + radius + 90 + Math.sin(t * 3) * 4, 14, { anchor: 'center' });
  }

  function drawHud() {
    txt(pct() + '%', W / 2, 90, 60, HC.ink);
    game.draw.rect(80, 150, W - 160, 20, HC.snow2);
    game.draw.rect(80, 150, (W - 160) * (pct() / 100), 20, HC.coat);
    var low = timeLeft < 3 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(80, 190, W - 160, 12, HC.snow2);
    game.draw.rect(80, 190, (W - 160) * Math.max(0, timeLeft / TIME_LIMIT), 12, low ? HC.accent : HC.gold);
  }

  // ── ATTRACT: 右でこすって育てる → 土の筋が来たら左でこすって避ける(成功)→ 最後は避けずに削れる(失敗)
  var demo = { t: 0, gx: W * 0.7, gy: H * 0.82, prevX: W * 0.7 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 7;
    if (cyc < dt || demo.t <= dt) { initGame(); demo.prevX = W * 0.7; }
    var side = targetLane;
    if (cyc < 5.2) {
      for (var i = 0; i < items.length; i++) {
        var it = items[i];
        if (it.type === 'bare' && it.lane === side && it.y > BALL_Y - 520 && it.y - it.len < BALL_Y + 40) side = 1 - side;
      }
    }
    var cx = side === 0 ? W * 0.25 : W * 0.75;
    var nx = cx + Math.sin(demo.t * 18) * 110;
    applyRub(nx, nx - demo.prevX);
    demo.prevX = nx;
    demo.gx = nx; demo.gy = H * 0.82;
    var r = stepSlope(dt);
    if (r === 'bare') game.fx.popup('MISS', laneX, BALL_Y - radius - 60, { color: HC.soil2, size: 48 });
    if (r === 'powder') game.fx.popup('NICE', laneX, BALL_Y - radius - 60, { color: HC.coat, size: 48 });
    if (r === 'goal' || r === 'crumble') { radius = R_START; }
  }

  function endRound(success, reason) { ok = success; why = reason; hitStop = 0.5; flashT = 0.4; game.fx.flash('#ffffff', 0.15); }

  game.onTap(function (x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.3); state = S.ATTRACT; initGame(); demo.t = 0; return; }
    game.audio.play('se_tap', 0.1);
    game.fx.burst(x, y, { color: HC.snow2, count: 3, speed: 80 });
  });

  game.onPress(function (x, y) {
    lastMoveX = x;
    if (state !== S.PLAYING || ready > 0 || done) return;
    game.fx.burst(x, y, { color: HC.powder, count: 3, speed: 90 });
  });

  game.onMove(function (x, y) {
    if (state !== S.PLAYING || ready > 0 || done || hitStop > 0) return;
    var dx = lastMoveX === null ? 0 : x - lastMoveX;
    lastMoveX = x;
    applyRub(x, dx);
    if (Math.abs(dx) > 40 && Math.random() < 0.25) {
      game.audio.tone(300 + Math.random() * 120, 0.03, { wave: 'triangle', volume: 0.03 });
      game.fx.burst(laneX, BALL_Y + radius, { color: HC.snow, count: 2, speed: 100 });
    }
  });

  game.onUpdate(function (dt) {
    if (state === S.ATTRACT) {
      if (radius === undefined) initGame();
      stepDemo(dt);
      drawSlope(); drawBall();
      game.draw.hand(demo.gx, demo.gy, { press: true, scale: 14 });
      txt(GAME_TITLE, W / 2, H * 0.05, 80, HC.coat);
      txt('HI-SCORE ' + game.best, W / 2, H * 0.09, 32);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.96, 44, HC.accent);
      else txt('INSERT COIN', W / 2, H * 0.96, 40);
      return;
    }

    if (state === S.RESULT) {
      drawSlope(); drawBall();
      var score = Math.round(maxR * 3) + (ok ? Math.ceil(timeLeft) * 20 : 0);
      game.draw.rect(0, H * 0.22, W, H * 0.2, HC.snow, 0.85);
      txt(ok ? 'CLEAR' : (why === 'time' ? 'TIME UP' : 'GAME OVER'), W / 2, H * 0.26, 96, ok ? HC.coat : HC.accent);
      txt(pct() + '%', W / 2, H * 0.31, 52);
      txt('SCORE ' + score, W / 2, H * 0.35, 40);
      if (ok && score > game.best) txt('NEW RECORD', W / 2, H * 0.39, 44, HC.gold);
      else if (!ok) txt('あと' + (100 - pct()) + '%!', W / 2, H * 0.39, 44, HC.accent);
      txt('BEST ' + game.best, W / 2, H * 0.92, 30);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.96, 40);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        var stats = { size: pct(), distance: Math.round(dist) };
        if (ok) game.end.success(Math.round(maxR * 3) + Math.ceil(timeLeft) * 20, stats);
        else game.end.failure(stats);
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
      if (flashT > 0) flashT -= dt;
      if (hitStop <= 0) {
        done = true; endWait = 1.2; game.audio.stopBgm();
        if (ok) { game.feedback.good(laneX, BALL_Y - radius, { text: 'CLEAR', color: HC.coat, count: 28 }); game.audio.play('se_success', 0.5); }
        else { game.feedback.bad(laneX, BALL_Y, { text: why === 'time' ? 'TIME UP' : 'MISS' }); game.audio.play('se_failure', 0.5); }
      }
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_jump', 0.25);
    } else {
      timeLeft -= dt;
      var r = stepSlope(dt);
      if (r === 'bare') {
        game.feedback.bad(laneX, BALL_Y - radius, { text: 'MISS', shake: 5, flashColor: HC.soil });
      } else if (r === 'powder') {
        game.feedback.good(laneX, BALL_Y - radius, { text: 'NICE', color: HC.coat });
      } else if (r === 'goal') {
        radius = R_GOAL; endRound(true, 'clear');
      } else if (r === 'crumble') {
        endRound(false, 'crumble');
      } else if (timeLeft <= 0) {
        timeLeft = 0; endRound(false, 'time');
      }
      if (!milestone && pct() >= 50) { milestone = true; game.audio.play('se_milestone', 0.4); game.fx.popup('50%', laneX, BALL_Y - radius - 80, { color: HC.gold, size: 60 }); }
    }

    drawSlope(); drawBall(); drawHud();
    if (ready > 0) txt(ready > 0.3 ? 'READY?' : 'GO!', W / 2, H * 0.36, 100, HC.coat);
  });

  game.onStart(function () {
    game.audio.melody(
      [['E5', 0.5], ['G5', 0.5], ['A5', 0.5], ['G5', 0.5], ['E5', 1], ['C5', 0.5], ['D5', 0.5], ['E5', 1], ['D5', 1], ['C5', 1]],
      { tempo: 140, wave: 'triangle', volume: 0.05, loop: true, bass: [['C3', 2], ['G2', 2], ['A2', 2], ['E2', 2]] }
    );
    state = S.ATTRACT;
    initGame();
  });
})(game);
