// I-GBA-0023-star-tracer.js
// 星結び観測員 — 見習い観測員が、夜空に浮かぶ二つの発光体を指でなぞって結び軌道図を作る
// 操作: 光点Aに触れたまま光点Bまで指を運んで離す
// 終わり: 規定数の結線に成功すればCLEAR。見失い(未結線のまま消灯)が既定数に達すればGAME OVER
// @mechanic: connect
// @theme: star_tracer
// 世界観: 夜間観測所の見習いが、望遠鏡モニターに浮かぶ二つの発光体を指でなぞって結び、軌道図を完成させていく
// 残るもの: 正誤(CLEAR/GAME OVER) + 結線数
// スタイル: 70s VECTOR

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 70s VECTOR: 黒背景 + 細い発光ライン、単色グロー中心
  var C = {
    bg: '#05070c', bg2: '#0a0f1a', line: '#39e6ff', a: '#39e6ff', b: '#ffd400',
    good: '#4dff8a', bad: '#ff4d5e', gold: '#ffd400', white: '#eaf6ff', ink: '#03050a',
  };

  var GAME_TITLE = 'STAR TRACER';
  var TARGET = 6, MAX_MISS = 3, PAIR_LIFE = 3.0, WARN_AT = 0.6;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var done, endWait, finished, ready, hitStop, shake;
  var connCount, missCount, pairA, pairB, pairT, warned, dragging, dragX, dragY;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var SCOPE_SPRITE = ['..##..', '.####.', '##..##', '..##..'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    for (var i = 0; i < 18; i++) {
      var sx = (i * 137) % W, sy = 200 + ((i * 271) % (H - 300));
      game.draw.rect(sx, sy, 3, 3, '#ffffff22');
    }
    game.draw.sprite(SCOPE_SPRITE, { '#': C.line }, W * 0.5, H * 0.90, 10, { anchor: 'center' });
  }

  function newPair() {
    var ax = W * (0.20 + Math.random() * 0.22), ay = H * (0.20 + Math.random() * 0.42);
    var bx = W * (0.58 + Math.random() * 0.22), by = H * (0.20 + Math.random() * 0.42);
    if (Math.random() < 0.5) { var t = ax; ax = bx; bx = t; t = ay; ay = by; by = t; }
    pairA = { x: ax, y: ay }; pairB = { x: bx, y: by }; pairT = PAIR_LIFE; warned = false;
  }

  function initGame() {
    connCount = 0; missCount = 0; dragging = false; dragX = 0; dragY = 0;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
    newPair();
  }

  function trySuccess(x, y) {
    connCount++;
    hitStop = 0.12;
    game.feedback.good(x, y, { text: 'LINK', color: C.good });
    game.fx.burst(x, y, { color: C.a, count: 16, speed: 340 });
    game.audio.play('se_success', 0.35);
    if (connCount === 3) {
      game.fx.popup(connCount + ' / ' + TARGET, W / 2, H * 0.18, { color: C.gold, size: 40 });
      game.audio.play('se_milestone', 0.5);
    }
    if (connCount >= TARGET) { ok = true; finished = true; finish(); }
    else newPair();
  }

  function tryMiss(x, y) {
    missCount++;
    hitStop = 0.15;
    game.feedback.bad(x, y, { text: 'MISS' });
    shake = 0.2;
    game.audio.play('se_bad', 0.35);
    if (missCount >= MAX_MISS) { ok = false; finished = true; finish(); }
    else newPair();
  }

  function onPressField(x, y) {
    if (state !== S.PLAYING || done || ready > 0 || hitStop > 0 || finished) return;
    if (Math.hypot(x - pairA.x, y - pairA.y) < 78) {
      dragging = true; dragX = x; dragY = y;
      game.audio.play('se_tap', 0.15);
    }
  }
  function onMoveField(x, y) {
    if (!dragging) return;
    dragX = x; dragY = y;
  }
  function onReleaseField(x, y) {
    if (!dragging) return;
    dragging = false;
    if (Math.hypot(x - pairB.x, y - pairB.y) < 96) trySuccess(pairB.x, pairB.y);
    else tryMiss(x, y);
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function(x, y) { if (state === S.PLAYING) onPressField(x, y); });
  game.onMove(function(x, y) { if (state === S.PLAYING) onMoveField(x, y); });
  game.onRelease(function(x, y) { if (state === S.PLAYING) onReleaseField(x, y); });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    if (ok) game.audio.play('se_success', 0.5); else game.audio.play('se_failure', 0.4);
    endWait = 1.3;
  }

  function drawField(a, b, isDragging, dx, dy, isWarned) {
    var blink = isWarned && Math.floor(game.time.elapsed * 8) % 2 === 0;
    var ca = blink ? C.bad : C.a;
    game.draw.circle(a.x, a.y, 42, ca, 0.22);
    game.draw.circle(a.x, a.y, 24, ca);
    game.draw.circle(b.x, b.y, 42, C.b, 0.22);
    game.draw.circle(b.x, b.y, 24, C.b);
    if (isDragging) game.draw.line(a.x, a.y, dx, dy, C.line, 9);
  }

  // ── ATTRACT ゴースト実演: A→Bへ実際にドラッグして結線する1サイクル ──
  var demo = { t: 0, gx: 0, gy: 0, press: false, a: { x: W * 0.30, y: H * 0.30 }, b: { x: W * 0.68, y: H * 0.54 } };
  function stepDemo(dt) {
    demo.t += dt;
    var period = 3.2, dragT = 2.2;
    var prevCyc = (demo.t - dt) % period; if (prevCyc < 0) prevCyc += period;
    var cyc = demo.t % period;
    pairA = demo.a; pairB = demo.b;
    if (cyc < dragT) {
      var p = cyc / dragT;
      demo.gx = demo.a.x + (demo.b.x - demo.a.x) * p;
      demo.gy = demo.a.y + (demo.b.y - demo.a.y) * p;
      demo.press = true; dragging = true; dragX = demo.gx; dragY = demo.gy;
    } else {
      dragging = false; demo.press = false;
      demo.gx = demo.b.x; demo.gy = demo.b.y;
      if (prevCyc < dragT) {
        game.feedback.good(demo.b.x, demo.b.y, { text: 'LINK', color: C.good });
        game.fx.burst(demo.b.x, demo.b.y, { color: C.a, count: 14, speed: 300 });
      }
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      bg();
      stepDemo(dt);
      drawField(pairA, pairB, dragging, dragX, dragY, false);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 46, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawField(pairA, pairB, false, 0, 0, false);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      txt(connCount + ' / ' + TARGET, W / 2, H * 0.13, 32, C.gold);
      if (!ok && TARGET - connCount <= 2) txt('あと' + (TARGET - connCount) + 'つ!', W / 2, H * 0.18, 30, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.white);
      return;
    }

    // ── PLAYING ──
    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(connCount, { conn: connCount, miss: missCount });
        else game.end.failure({ conn: connCount, miss: missCount });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      pairT -= dt;
      if (!warned && pairT <= WARN_AT) { warned = true; game.audio.play('se_tap', 0.25); }
      if (pairT <= 0) tryMiss(pairA.x, pairA.y);
    }
    if (shake > 0) shake -= dt;

    bg();
    drawField(pairA, pairB, dragging, dragX, dragY, warned);

    txt(connCount + ' / ' + TARGET, W / 2, H * 0.06, 34, C.white);
    for (var m = 0; m < MAX_MISS; m++) {
      game.draw.circle(W * 0.5 - 36 + m * 36, H * 0.115, 9, m < missCount ? C.bad : '#ffffff33');
    }
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.86, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.bgm('bgm_tense', 0.07);
    state = S.ATTRACT;
    initGame();
  });
})(game);
