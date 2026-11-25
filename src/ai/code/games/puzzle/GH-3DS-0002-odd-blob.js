// GH-3DS-0002-odd-blob.js
// オッドブロブ — 並んだ塊の中で、わずかに息づく1つだけを探して触る。3回外すと閉じ込められたまま終わり
// 操作: 静かに脈打っている1つを探してタップ
// 終わり: 見つけたか(正誤) + 何回外したか + 何秒かかったか
// @mechanic: spot
// @theme: quiet_room
// 世界観: 白い部屋に並ぶ塊。ほとんどは完全に静止しているが、1つだけかすかに息づいている。3回外すと部屋に閉じ込められる
// 残るもの: 正誤(CLEAR/GAME OVER) + 外した回数 + 見つけた秒数
// スタイル: HYPERCASUAL 3D

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // HYPERCASUAL 3D: 白背景 + 単色。柔らかい影の丸い塊。当たり判定が見た目どおり
  var C = {
    bg: '#f7f7f5', blob: '#c9c4e8', blobLine: '#a49ad8', shadow: '#00000022',
    good: '#4dcf8a', bad: '#ff5a6a', gold: '#ffb020', ink: '#2a2733', white: '#ffffff',
  };

  var GAME_TITLE = 'ODD BLOB';
  var MISS_LIMIT = 3, ROWS = 3, COLS = 3, R = 68;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false, misses = 0, elapsedRound = 0;

  var blobs, oddIdx, done, endWait, finished;
  var ready, hitStop, shake;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var GSPACE = 170;
  var GX0 = W * 0.5 - (COLS - 1) * GSPACE / 2, GY0 = H * 0.38 - (ROWS - 1) * GSPACE / 2;

  var DECOR = [
    { x: W * 0.18, y: H * 0.60, r: 40 }, { x: W * 0.82, y: H * 0.58, r: 30 },
    { x: W * 0.30, y: H * 0.70, r: 22 }, { x: W * 0.72, y: H * 0.72, r: 26 },
    { x: W * 0.50, y: H * 0.66, r: 18 },
  ];

  function roomBg() {
    game.draw.gradient(0, H, [[0, '#ffffff'], [1, C.bg]]);
    game.draw.rect(0, H * 0.14, W, 4, '#eaeaea');
    game.draw.rect(0, H * 0.80, W, 4, '#eaeaea');
    // 部屋の調度(小さく淡い、下部の空きを埋める。当たり判定なし)
    for (var d = 0; d < DECOR.length; d++) {
      var o = DECOR[d];
      game.draw.circle(o.x, o.y + o.r * 0.5, o.r * 0.9, C.shadow, 0.3);
      game.draw.circle(o.x, o.y, o.r, C.blob, 0.18);
    }
  }

  var EYE_SPRITE = ['.###.', '#####', '.###.'];
  var EYE_PAL = { '#': C.blobLine };

  function drawBlob(i, t) {
    var b = blobs[i];
    var pulse = i === oddIdx ? 1 + Math.sin(t * 3.2) * 0.06 : 1;
    var rr = R * pulse;
    game.draw.circle(b.x, b.y + rr * 0.55, rr * 0.9, C.shadow, 0.5);
    game.draw.circle(b.x, b.y, rr, C.blob);
    game.draw.circle(b.x, b.y, rr, C.blobLine, 0.0);
    game.draw.circle(b.x - rr * 0.28, b.y - rr * 0.32, rr * 0.32, '#ffffff', 0.5);
  }

  function initGame() {
    blobs = [];
    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) blobs.push({ x: GX0 + c * GSPACE, y: GY0 + r * GSPACE });
    }
    oddIdx = Math.floor(Math.random() * blobs.length);
    misses = 0; done = false; endWait = 0; finished = false; elapsedRound = 0;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function attempt(x, y) {
    if (done || ready > 0 || hitStop > 0 || finished) return;
    var hitIdx = -1, best = 999;
    for (var i = 0; i < blobs.length; i++) {
      var d = Math.hypot(x - blobs[i].x, y - blobs[i].y);
      if (d < R && d < best) { best = d; hitIdx = i; }
    }
    if (hitIdx === -1) return;
    hitStop = 0.08;
    if (hitIdx === oddIdx) {
      ok = true; finished = true;
      game.feedback.good(blobs[hitIdx].x, blobs[hitIdx].y, { text: 'FOUND', color: C.good });
      game.fx.burst(blobs[hitIdx].x, blobs[hitIdx].y, { color: C.good, count: 16, speed: 360 });
      game.audio.play('se_success', 0.5);
      finish();
    } else {
      misses++;
      game.feedback.bad(blobs[hitIdx].x, blobs[hitIdx].y, { text: 'MISS' });
      shake = 0.15;
      game.audio.play('se_bad', 0.4);
      if (misses >= MISS_LIMIT) { ok = false; finished = true; finish(); }
      else game.fx.popup(misses + ' / ' + MISS_LIMIT, W / 2, H * 0.20, { color: C.bad, size: 44 });
    }
  }

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    if (!ok) game.audio.play('se_failure', 0.5);
    endWait = 1.3;
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); return; }
    game.audio.play('se_tap', 0.1);
    attempt(x, y);
  });

  // ── ATTRACT ゴースト実演: 息づく1つを見つけてタップ ──
  var demo = { t: 0, gx: W / 2, gy: H * 0.70, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.2;
    var target = blobs[oddIdx];
    if (cyc < 2.2) {
      demo.gx += (target.x - demo.gx) * Math.min(1, dt * 2.2);
      demo.gy += ((target.y + 90) - demo.gy) * Math.min(1, dt * 2.2);
      demo.press = false;
    } else {
      demo.press = cyc < 2.4;
      if (cyc > 2.2 && cyc < 2.23) { game.feedback.good(target.x, target.y, { text: 'FOUND', color: C.good }); game.fx.burst(target.x, target.y, { color: C.good, count: 10, speed: 300 }); }
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (blobs === undefined) initGame();
      roomBg();
      for (var i = 0; i < blobs.length; i++) drawBlob(i, game.time.elapsed);
      stepDemo(dt);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      game.draw.sprite(EYE_SPRITE, EYE_PAL, W * 0.12, H * 0.10, 8, { anchor: 'center' });
      txt(GAME_TITLE, W / 2, H * 0.10, 56, C.ink);
      txt('BEST ' + (game.best > 0 ? 'CLEAR' : '-'), W / 2, H * 0.15, 30, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 46, C.gold);
        txt('TAP TO START', W / 2, H * 0.95, 36, C.ink);
      } else {
        txt('INSERT COIN', W / 2, H * 0.95, 32, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      roomBg();
      for (var i2 = 0; i2 < blobs.length; i2++) drawBlob(i2, game.time.elapsed);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.10, 58, ok ? C.good : C.bad);
      txt('MISS ' + misses + ' / ' + MISS_LIMIT, W / 2, H * 0.17, 38, C.ink);
      txt(elapsedRound.toFixed(1) + 's', W / 2, H * 0.23, 40, C.gold);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 34, C.ink);
      return;
    }

    // ── PLAYING ──
    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success({ misses: misses, time: elapsedRound.toFixed(1) });
        else game.end.failure({ misses: misses, time: elapsedRound.toFixed(1) });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      elapsedRound += dt;
    }
    if (shake > 0) shake -= dt;

    roomBg();
    for (var i3 = 0; i3 < blobs.length; i3++) drawBlob(i3, game.time.elapsed);

    txt('MISS ' + misses + ' / ' + MISS_LIMIT, W / 2, H * 0.09, 38, misses > 0 ? C.bad : C.ink);

    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.86, 70, C.gold);
  });

  game.onStart(function() {
    game.audio.bgm('bgm_cute', 0.06);
    state = S.ATTRACT;
    initGame();
  });
})(game);
