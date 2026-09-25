// D-20172021-0024-plank-screw-twist.js
// プランクスクリュー・ツイスト — 木箱のねじを指で円を描くように回して緩め、板をばらばらに解体する
// 操作: ねじの周りを指でなぞって円を描き続け、規定の回転量に達すると緩んで抜ける。3本すべて緩めて板を外す
// 終わり: 3本のねじを回し切れば成功。制限時間内に回し切れなければ失敗
// @mechanic: rotate_gesture
// @theme: plank_screw_teardown
// 世界観: 木工見習いが、組み上がった木箱の留めねじを一本ずつ指で回し緩め、板を一枚ずつ解体していく
// 残るもの: 正誤(CLEAR/GAME OVER) + 緩めたねじ本数
// スタイル: 80s ISO

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 80s ISO: 菱形グリッド基調、6〜8色、影で高さを示す
  var C = {
    bg: '#5a4632', bg2: '#3c2e1e', board: '#a4763e', boardDark: '#7a5628',
    screw: '#c8c8c8', screwDark: '#6a6a6a', slot: '#3a3a3a',
    good: '#5ad169', bad: '#ff5d5d', gold: '#ffd24a', ink: '#f4e8d4',
  };

  var GAME_TITLE = 'SCREW TWIST';
  var TIME_LIMIT = 10;
  var NEEDED = 3;
  var DEG_NEEDED = 540;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 1, y + 2, { size: sz, color: '#201408', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var TOOL_SPRITE = ['.##.', '####', '.##.'];

  var SCREW_POS = [
    { x: W * 0.32, y: H * 0.36 },
    { x: W * 0.68, y: H * 0.36 },
    { x: W * 0.5, y: H * 0.60 },
  ];
  var SCREW_R = 60, MIN_R = 20, MAX_R = 130;

  var screwDeg, screwDone, lastAngle, activeIdx, pressing, done, endWait, finished, ready, hitStop, shake, timeLeft, doneCount, halfCalled;

  function bg() {
    var pulse = 0.03 + 0.03 * Math.sin(game.time.elapsed * 1.3);
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    game.draw.rect(0, 0, W, H, '#ffffff', pulse);
  }

  function drawBoard() {
    game.draw.rect(W * 0.14, H * 0.24, W * 0.72, H * 0.46, C.boardDark);
    game.draw.rect(W * 0.14 + 10, H * 0.24 + 10, W * 0.72 - 20, H * 0.46 - 20, C.board);
    for (var i = 0; i < SCREW_POS.length; i++) {
      var p = SCREW_POS[i];
      if (screwDone[i]) {
        game.draw.circle(p.x, p.y, 34, C.slot);
        continue;
      }
      var spin = screwDeg[i] * (Math.PI / 180);
      game.draw.circle(p.x, p.y, 40, C.screwDark);
      game.draw.circle(p.x, p.y, 32, C.screw);
      var ang1 = spin, ang2 = spin + Math.PI;
      game.draw.line(p.x + Math.cos(ang1) * 24, p.y + Math.sin(ang1) * 24, p.x + Math.cos(ang2) * 24, p.y + Math.sin(ang2) * 24, C.slot, 6);
      if (i === activeIdx && pressing) {
        game.draw.circle(p.x, p.y, MAX_R, '#ffffff', 0.06);
        var pct = Math.min(1, screwDeg[i] / DEG_NEEDED);
        game.draw.circle(p.x, p.y, 50, C.gold, 0.2 + 0.3 * pct);
      }
    }
  }

  function initGame() {
    screwDeg = [0, 0, 0]; screwDone = [false, false, false]; doneCount = 0; halfCalled = false;
    activeIdx = -1; lastAngle = 0; pressing = false;
    done = false; endWait = 0; finished = false; ready = 0.8; hitStop = 0; shake = 0;
    timeLeft = TIME_LIMIT;
  }

  function angleAt(x, y, cx, cy) { return Math.atan2(y - cy, x - cx); }
  function norm(a) { while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; return a; }

  function findScrew(x, y) {
    for (var i = 0; i < SCREW_POS.length; i++) {
      if (screwDone[i]) continue;
      var d = Math.hypot(x - SCREW_POS[i].x, y - SCREW_POS[i].y);
      if (d >= MIN_R && d <= MAX_R) return i;
    }
    return -1;
  }

  function onGripStart(x, y) {
    if (finished || ready > 0) return;
    var idx = findScrew(x, y);
    if (idx < 0) return;
    activeIdx = idx; pressing = true;
    lastAngle = angleAt(x, y, SCREW_POS[idx].x, SCREW_POS[idx].y);
    game.audio.play('se_tap', 0.08);
  }
  function onGripMove(x, y) {
    if (finished || ready > 0 || activeIdx < 0 || !pressing) return;
    var p = SCREW_POS[activeIdx];
    var d = Math.hypot(x - p.x, y - p.y);
    if (d < MIN_R || d > MAX_R) return;
    var a = angleAt(x, y, p.x, p.y);
    var delta = Math.abs(norm(a - lastAngle));
    lastAngle = a;
    screwDeg[activeIdx] += delta * (180 / Math.PI);
    if (screwDeg[activeIdx] >= DEG_NEEDED) {
      screwDone[activeIdx] = true;
      doneCount++;
      game.feedback.good(p.x, p.y, { text: 'GOOD', color: C.good });
      game.fx.burst(p.x, p.y, { color: C.gold, count: 16, speed: 320 });
      game.audio.play('se_break', 0.35);
      activeIdx = -1; pressing = false;
      if (doneCount === Math.ceil(NEEDED / 2) && !halfCalled) {
        halfCalled = true;
        game.fx.popup('NICE', W / 2, H * 0.2, { color: C.gold, size: 34 });
        game.audio.play('se_milestone', 0.3);
      }
      if (doneCount >= NEEDED) {
        finished = true; ok = true; hitStop = 0.3;
        game.feedback.good(p.x, p.y, { text: 'CLEAR', color: C.good });
        game.audio.play('se_success', 0.5);
        finish();
      }
    }
  }
  function onGripEnd() { pressing = false; activeIdx = -1; }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function(x, y) { if (state === S.PLAYING) onGripStart(x, y); });
  game.onMove(function(x, y) {
    if (state !== S.PLAYING) return;
    if (Math.random() < 0.08 && pressing) game.audio.play('se_tap', 0.02);
    onGripMove(x, y);
  });
  game.onRelease(function() { if (state === S.PLAYING) onGripEnd(); });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  var demo = { t: 0, gx: SCREW_POS[0].x, gy: SCREW_POS[0].y - 60, press: false };
  function resetDemo() { initGame(); }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.8;
    if (cyc < dt || demo.t <= dt) resetDemo();
    var seg = 4.8 / NEEDED;
    var idx = Math.min(NEEDED - 1, Math.floor(cyc / seg));
    var localCyc = cyc - idx * seg;
    var p = SCREW_POS[idx];
    var spinSpeed = 3.4;
    var ang = localCyc * spinSpeed;
    demo.gx = p.x + Math.cos(ang) * 80;
    demo.gy = p.y + Math.sin(ang) * 80;
    demo.press = true;
    if (!screwDone[idx]) {
      screwDeg[idx] += dt * spinSpeed * (180 / Math.PI);
      if (screwDeg[idx] >= DEG_NEEDED) {
        screwDone[idx] = true; doneCount++;
        game.feedback.good(p.x, p.y, { text: 'GOOD', color: C.good });
        game.audio.play('se_good', 0.2);
      }
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (screwDeg === undefined) initGame();
      stepDemo(dt);
      bg();
      drawBoard();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 14 });
      txt(GAME_TITLE, W / 2, H * 0.10, 40, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.14, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 38, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 26, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawBoard();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.10, 44, ok ? C.good : C.bad);
      txt(doneCount + ' / ' + NEEDED, W / 2, H * 0.15, 26, C.gold);
      if (!ok) txt('あと' + (NEEDED - doneCount) + '本!', W / 2, H * 0.19, 22, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 24, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(doneCount, { screws: doneCount, total: NEEDED });
        else game.end.failure({ screws: doneCount, total: NEEDED });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      timeLeft -= dt;
      if (timeLeft <= 0) {
        timeLeft = 0; finished = true; ok = false; hitStop = 0.3; shake = 0.2;
        game.feedback.bad(W / 2, H * 0.4, { text: 'MISS' });
        game.audio.play('se_bad', 0.4);
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawBoard();
    game.draw.sprite(TOOL_SPRITE, { '#': C.gold }, W * 0.5, H * 0.86, 12, { anchor: 'center' });

    txt(doneCount + ' / ' + NEEDED, W / 2, H * 0.08, 28, C.ink);
    var tbW = W - 120;
    var lowTime = timeLeft < 4 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(60, 160, tbW, 16, C.boardDark, 1);
    game.draw.rect(60, 160, tbW * Math.max(0, timeLeft / TIME_LIMIT), 16, lowTime ? C.bad : C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 52, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['G3', 0.2], ['B3', 0.2], ['D4', 0.2], ['G4', 0.4]], { tempo: 124, wave: 'sawtooth', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
