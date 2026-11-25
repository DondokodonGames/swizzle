// J-N644-0006-clay-stretch-mold.js
// クレイストレッチモールド — 伸び縮みする粘土の3つの突起をお手本の枠まで引っ張り、型に合わせる
// 操作: 粘土の突起を指でつかんでドラッグし、対応する色の枠の中で指を離す。枠を外すと突起は戻ってしまう
// 終わり: 3つ全ての突起を対応する枠に合わせられれば成功。時間切れなら失敗
// @mechanic: gap_fit
// @theme: clay_shape_matching
// 世界観: 見世物小屋の粘土細工師が、伸び縮みする自慢の粘土玉の突起を引っ張り、お客の前でお手本の枠に寸分たがわず合わせてみせる
// 残るもの: 正誤(CLEAR/GAME OVER) + 合わせられた突起数
// スタイル: 2000s ARCADE POP

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2000s ARCADE POP: 原色 + 白縁、明るい背景、祝祭演出
  var C = {
    bg: '#fff4d6', bg2: '#ffe1a8', clay: '#ff8fab', clayDark: '#e0577f',
    zoneA: '#ffb703', zoneB: '#4cc9f0', zoneC: '#7bdc6a',
    good: '#2ec4b6', bad: '#e5383b', gold: '#ffb703', ink: '#3a2e39', white: '#ffffff',
  };
  var ZONE_COLORS = [C.zoneA, C.zoneB, C.zoneC];

  var GAME_TITLE = 'CLAY MOLD';
  var TIME_LIMIT = 18;
  var NEEDED = 3;
  var CX = W * 0.5, CY = H * 0.44;
  var TOL = 78, GRAB_R = 70;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var SCULPTOR_SPRITE = ['.##.', '####', '.##.', '.##.'];

  var ANGLES = [-Math.PI / 2, Math.PI / 6, Math.PI * 5 / 6];
  var TARGETS = ANGLES.map(function(a) { return { x: CX + Math.cos(a) * 300, y: CY + Math.sin(a) * 300 }; });

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    var bob = Math.sin(game.time.elapsed * 2) * 6;
    game.draw.sprite(SCULPTOR_SPRITE, { '#': C.ink }, W * 0.85, H * 0.88 + bob, 20, { anchor: 'center' });
  }

  var handles, placed, dragIdx, timeLeft, done, endWait, finished, ready, hitStop, shake, halfCalled;

  function initGame() {
    handles = [];
    for (var i = 0; i < NEEDED; i++) {
      var a = -Math.PI / 2 + i * (Math.PI * 2 / NEEDED) * 0.6 - 0.3;
      handles.push({ x: CX + Math.cos(a) * 70, y: CY + Math.sin(a) * 70 });
    }
    placed = [false, false, false];
    dragIdx = -1; timeLeft = TIME_LIMIT;
    done = false; endWait = 0; finished = false; halfCalled = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function placedCount() { return placed.filter(Boolean).length; }

  function beginDrag(x, y) {
    if (finished || ready > 0) return;
    var best = -1, bestD = GRAB_R;
    for (var i = 0; i < handles.length; i++) {
      if (placed[i]) continue;
      var d = Math.hypot(handles[i].x - x, handles[i].y - y);
      if (d < bestD) { bestD = d; best = i; }
    }
    if (best >= 0) { dragIdx = best; game.audio.play('se_tap', 0.15); }
  }

  function moveDrag(x, y) {
    if (dragIdx < 0) return;
    handles[dragIdx].x = x; handles[dragIdx].y = y;
  }

  function endDrag(x, y) {
    if (dragIdx < 0) return;
    var i = dragIdx; dragIdx = -1;
    var tgt = TARGETS[i];
    var d = Math.hypot(handles[i].x - tgt.x, handles[i].y - tgt.y);
    if (d <= TOL) {
      placed[i] = true;
      handles[i].x = tgt.x; handles[i].y = tgt.y;
      game.feedback.good(tgt.x, tgt.y, { text: 'GOOD', color: C.good });
      game.fx.burst(tgt.x, tgt.y, { color: ZONE_COLORS[i], count: 16, speed: 320 });
      game.audio.play('se_good', 0.4);
      var pc = placedCount();
      if (pc === 2 && !halfCalled) {
        halfCalled = true;
        game.fx.popup('NICE', CX, CY - 340, { color: C.gold, size: 32 });
        game.audio.play('se_milestone', 0.3);
      }
      if (pc >= NEEDED) {
        ok = true; finished = true; hitStop = 0.2;
        game.audio.play('se_success', 0.5);
        finish();
      }
    } else {
      var a = ANGLES[i] - 0.3 * (i % 2 === 0 ? 1 : -1);
      handles[i].x = CX + Math.cos(a) * 70; handles[i].y = CY + Math.sin(a) * 70;
      game.feedback.bad(x, y, { text: 'MISS' });
      game.audio.play('se_bad', 0.3);
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function(x, y) {
    if (state === S.PLAYING) { game.audio.play('se_tap', 0.08); beginDrag(x, y); }
  });
  game.onMove(function(x, y) {
    if (state === S.PLAYING && dragIdx >= 0) {
      if (Math.random() < 0.05) game.audio.play('se_tap', 0.02);
      moveDrag(x, y);
    }
  });
  game.onRelease(function(x, y) {
    if (state === S.PLAYING) { game.audio.play('se_tap', 0.05); endDrag(x, y); }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  function drawScene() {
    for (var i = 0; i < TARGETS.length; i++) {
      var t = TARGETS[i];
      game.draw.circle(t.x, t.y, TOL, ZONE_COLORS[i], placed[i] ? 0.9 : 0.25);
      game.draw.circle(t.x, t.y, TOL - 14, C.bg, placed[i] ? 0 : 0.4);
    }
    game.draw.circle(CX, CY, 90, C.clayDark);
    game.draw.circle(CX, CY, 76, C.clay);
    for (var j = 0; j < handles.length; j++) {
      game.draw.line(CX, CY, handles[j].x, handles[j].y, C.clay, 30);
      game.draw.circle(handles[j].x, handles[j].y, placed[j] ? 34 : 40, placed[j] ? ZONE_COLORS[j] : C.clay);
    }
  }

  var demo = { t: 0, gx: CX, gy: CY, press: false, idx: 0 };
  function resetDemo() { initGame(); demo.idx = 0; }
  function stepDemo(dt) {
    demo.t += dt;
    var per = 2.1;
    var cyc = demo.t % (per * NEEDED);
    if (cyc < dt || demo.t <= dt) resetDemo();
    var idx = Math.min(NEEDED - 1, Math.floor(cyc / per));
    var local = cyc - idx * per;
    var tgt = TARGETS[idx];
    if (local < 0.3) { demo.gx = handles[idx] ? handles[idx].x : CX; demo.gy = handles[idx] ? handles[idx].y : CY; demo.press = false; }
    else if (local < 1.7) {
      var t2 = (local - 0.3) / 1.4;
      var start = { x: CX + Math.cos(ANGLES[idx]) * 70, y: CY + Math.sin(ANGLES[idx]) * 70 };
      demo.gx = start.x + (tgt.x - start.x) * t2;
      demo.gy = start.y + (tgt.y - start.y) * t2;
      demo.press = true;
      if (handles[idx]) { handles[idx].x = demo.gx; handles[idx].y = demo.gy; }
    } else if (local < 1.85) {
      demo.press = true;
      if (!placed[idx]) {
        placed[idx] = true;
        game.feedback.good(tgt.x, tgt.y, { text: 'GOOD', color: C.good });
        game.audio.play('se_good', 0.2);
      }
    } else { demo.press = false; }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (handles === undefined) initGame();
      bg();
      stepDemo(dt);
      drawScene();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.09, 40, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.13, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 38, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 26, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawScene();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.09, 46, ok ? C.good : C.bad);
      txt(placedCount() + ' / ' + NEEDED, W / 2, H * 0.14, 28, C.gold);
      if (!ok) txt('あと' + (NEEDED - placedCount()) + '個!', W / 2, H * 0.18, 22, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 24, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(placedCount(), { placed: placedCount(), needed: NEEDED });
        else game.end.failure({ placed: placedCount(), needed: NEEDED });
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
        game.feedback.bad(CX, CY, { text: 'TIME UP' });
        game.audio.play('se_failure', 0.4);
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawScene();

    txt(placedCount() + ' / ' + NEEDED, W / 2, H * 0.06, 30, C.ink);
    var tbW = W - 120;
    var lowTime = timeLeft < 4 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(60, 150, tbW, 16, C.ink, 0.15);
    game.draw.rect(60, 150, tbW * Math.max(0, timeLeft / TIME_LIMIT), 16, lowTime ? C.bad : C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.68, 54, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['G4', 0.25], ['B4', 0.25], ['D5', 0.25], ['G5', 0.5]], { tempo: 128, wave: 'sine', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
