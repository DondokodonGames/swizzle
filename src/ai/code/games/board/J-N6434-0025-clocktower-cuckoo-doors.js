// J-N6434-0025-clocktower-cuckoo-doors.js
// からくり時計塔の三つ扉 — 金の鳥が入った扉に指を置き、入れ替わり続ける扉から指を離さず最後まで追いかける
// 操作: 鳥が入った扉を押さえ、扉が入れ替わる間も指を当てたまま一緒に動かす(社内メモ。画面には出さない)
// 終わり: 全ての入れ替えを追い切って扉が開けば成功。指が扉から外れる/離れる/時間切れで失敗
// @mechanic: drag_follow
// @theme: clocktower_cuckoo_doors
// 世界観: からくり時計塔の番をするリスの見習いが、正時に金の鳥が飛び出す小扉を見失わないよう、機械仕掛けで入れ替わる三つの扉に指を添えて追い続ける
// 残るもの: 正誤(CLEAR/GAME OVER) + 追い切った入れ替え回数・指の密着率
// スタイル: TOON SHADE

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // TOON SHADE: 太い黒輪郭を先に描き、内側を明暗2色だけで塗る
  var STYLE = {
    bg: ['#2ec4b6', '#cbf3f0', '#1b8a80'],
    main: ['#ff9f1c', '#c96f00', '#fdfffc'],
    accent: ['#ffd60a', '#e63946'],
  };
  var C = {
    bgTop: STYLE.bg[0], bgLow: STYLE.bg[1], bgDark: STYLE.bg[2],
    door: STYLE.main[0], doorDark: STYLE.main[1], cream: STYLE.main[2],
    gold: STYLE.accent[0], red: STYLE.accent[1],
    line: '#1a1a1a', tower: '#8d99ae', towerDark: '#5c677d', green: '#52d273',
  };

  var GAME_TITLE = 'CUCKOO DOORS';
  var TIME_LIMIT = 16;
  var SWAPS = 14;
  var DOOR_Y = H * 0.50;
  var SLOT_X = [W * 0.2, W * 0.5, W * 0.8];
  var FOLLOW_R = 150;
  var GRACE = 0.28;
  var GRAB_WAIT = 2.5;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  // ── スプライト ──────────────────────────────────────
  var BIRD = [
    ['...kk...', '..kyyk..', '.kywyyk.', 'kyyyyyrr', '.kyyyyk.', '..kyyk..', '...kk...'],
    ['.k....k.', 'kyk..kyk', '.kywyyk.', 'kyyyyyrr', '.kyyyyk.', '..kyyk..', '...kk...'],
  ];
  var BIRD_PAL = { k: '#1a1a1a', y: '#ffd60a', w: '#ffffff', r: '#e63946' };
  var SQUIRREL = [
    ['..kk.......', '.kbbk...kk.', 'kbwbbk.kbbk', 'kbbbbk.kbbk', '.kbbk..kbbk', 'kbbbbkkbbk.', 'kbbbbbbbk..', '.kk..kk....'],
    ['..kk....kk.', '.kbbk..kbbk', 'kbwbbk.kbbk', 'kbbbbk.kbbk', '.kbbk.kbbk.', 'kbbbbkbbk..', 'kbbbbbbk...', '.kk..kk....'],
  ];
  var SQ_PAL = { k: '#1a1a1a', b: '#c96f00', w: '#ffffff' };
  var GEAR = ['..k.k..', '.kkkkk.', 'kkk.kkk', '.k...k.', 'kkk.kkk', '.kkkkk.', '..k.k..'];

  // ── 状態 ─────────────────────────────────────────
  var doors, winIdx, phase, phaseT, swapList, swapI, swap, timeLeft, followed, offT, onRatioAcc, onRatioN;
  var fx, fy, down, ready, stopT, doneT, ok, endReason, openT, halfShown, demoMode;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 4, y + 4, { size: sz, color: C.line, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function initGame(isDemo) {
    demoMode = isDemo;
    doors = [];
    for (var i = 0; i < 3; i++) doors.push({ x: SLOT_X[i], y: DOOR_Y, slot: i });
    winIdx = Math.floor(Math.random() * 3);
    swapList = [];
    for (var k = 0; k < SWAPS; k++) {
      var a = Math.floor(Math.random() * 3), b = (a + 1 + Math.floor(Math.random() * 2)) % 3;
      // 加速: 0.62秒 → 0.30秒。後半はフェイント(途中まで動いて戻る)が混ざる
      var feint = k >= 5 && Math.random() < 0.22;
      swapList.push({ a: a, b: b, dur: Math.max(0.30, 0.62 - k * 0.026), feint: feint });
    }
    swapI = 0; swap = null; timeLeft = TIME_LIMIT; followed = 0; offT = 0; onRatioAcc = 0; onRatioN = 0;
    fx = -999; fy = -999; down = false;
    ready = isDemo ? 0 : 0.8; phase = isDemo ? 'hide' : 'ready'; phaseT = 1.3;
    stopT = 0; doneT = 0; ok = false; endReason = ''; openT = 0; halfShown = false;
  }

  function doorAtSlot(s) { for (var i = 0; i < 3; i++) if (doors[i].slot === s) return i; return -1; }
  function doorUnder(x, y) {
    for (var i = 0; i < 3; i++) if (Math.abs(x - doors[i].x) < 125 && Math.abs(y - doors[i].y) < 165) return i;
    return -1;
  }

  // 指の入力(プレイヤーもデモAIも同じ関数を通る)
  function pointerDown(x, y, live) {
    fx = x; fy = y; down = true;
    if (phase !== 'grab') {
      if (live) game.audio.play('se_tap', 0.1);
      return;
    }
    var d = doorUnder(x, y);
    if (d === winIdx) {
      phase = 'shuffle'; phaseT = 0.35; offT = 0;
      if (live) { game.feedback.good(doors[d].x, doors[d].y - 200, { text: 'GOOD', color: C.green, size: 52, count: 8 }); }
      else game.fx.burst(doors[d].x, doors[d].y, { color: C.green, count: 8, speed: 200 });
    } else if (d >= 0) {
      fail('wrong', d, live);
    } else if (live) {
      game.audio.play('se_tap', 0.15);
      game.fx.burst(x, y, { color: C.cream, count: 4, speed: 100 });
    }
  }
  function pointerMove(x, y) { fx = x; fy = y; }
  function pointerUp() { down = false; }

  function fail(reason, doorIdx, live) {
    phase = 'stop'; stopT = 0.6; ok = false; endReason = reason; openT = 0.001;
    swap = null;
    if (live) {
      game.audio.stopBgm();
      game.feedback.bad(doors[winIdx].x, doors[winIdx].y - 220, { text: 'MISS', color: C.red, shake: 12 });
      game.audio.play('se_failure', 0.5);
    } else {
      game.fx.burst(doors[winIdx].x, doors[winIdx].y, { color: C.red, count: 10, speed: 220 });
    }
  }

  function clearRun(live) {
    phase = 'stop'; stopT = 0.8; ok = true; endReason = 'clear'; openT = 0.001;
    if (live) {
      game.audio.stopBgm();
      game.feedback.good(doors[winIdx].x, doors[winIdx].y - 240, { text: 'CLEAR', color: C.gold, size: 90, count: 30 });
      game.audio.play('se_success', 0.55);
    } else {
      game.fx.burst(doors[winIdx].x, doors[winIdx].y - 100, { color: C.gold, count: 16, speed: 260 });
    }
  }

  function startSwap(live) {
    var s = swapList[swapI];
    var ia = doorAtSlot(s.a), ib = doorAtSlot(s.b);
    swap = { ia: ia, ib: ib, ax: doors[ia].x, bx: doors[ib].x, t: 0, dur: s.dur, feint: s.feint };
    if (live) game.audio.tone(s.feint ? 'F4' : 'C5', 0.06, { wave: 'square', volume: 0.06, slide: s.feint ? -80 : 120 });
  }

  function stepWorld(dt, live) {
    if (openT > 0) openT += dt;
    if (phase === 'hide') {
      phaseT -= dt;
      if (live && phaseT < 1.0 && phaseT + dt >= 1.0) game.audio.play('se_coin', 0.3);
      if (phaseT <= 0) { phase = 'grab'; phaseT = GRAB_WAIT; }
      return;
    }
    if (phase === 'grab') {
      phaseT -= dt;
      if (phaseT <= 0) fail('late', winIdx, live);
      return;
    }
    if (phase !== 'shuffle') return;

    if (live) {
      timeLeft = Math.max(0, timeLeft - dt);
      if (timeLeft <= 0) { fail('time', winIdx, live); return; }
    }
    // 指の密着判定
    var wd = doors[winIdx];
    var dist = Math.hypot(fx - wd.x, (fy - wd.y) * 0.7);
    var on = down && dist < FOLLOW_R;
    onRatioN++; if (on) onRatioAcc++;
    if (on) offT = 0;
    else {
      offT += dt;
      if (offT > GRACE) { fail(down ? 'off' : 'lift', winIdx, live); return; }
    }

    if (!swap) {
      phaseT -= dt;
      if (phaseT <= 0) {
        if (swapI >= swapList.length) { clearRun(live); return; }
        startSwap(live);
      }
      return;
    }
    swap.t += dt;
    var p = Math.min(1, swap.t / swap.dur);
    var e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
    if (swap.feint) e = Math.sin(p * Math.PI) * 0.45;       // 途中まで動いて戻る
    var A = doors[swap.ia], B = doors[swap.ib];
    A.x = swap.ax + (swap.bx - swap.ax) * e; A.y = DOOR_Y - Math.sin(e * Math.PI) * 170;
    B.x = swap.bx + (swap.ax - swap.bx) * e; B.y = DOOR_Y + Math.sin(e * Math.PI) * 170;
    if (p >= 1) {
      A.y = DOOR_Y; B.y = DOOR_Y;
      if (!swap.feint) { var ts = A.slot; A.slot = B.slot; B.slot = ts; A.x = SLOT_X[A.slot]; B.x = SLOT_X[B.slot]; }
      else { A.x = swap.ax; B.x = swap.bx; }
      swap = null; swapI++; followed++;
      phaseT = Math.max(0.08, 0.22 - swapI * 0.01);
      if (live) {
        game.audio.play('se_tap', 0.2);
        if (followed === Math.floor(SWAPS / 2) && !halfShown) {
          halfShown = true;
          game.audio.play('se_milestone', 0.4);
          game.fx.popup(followed + ' / ' + SWAPS, W / 2, H * 0.28, { color: C.gold, size: 64 });
        } else if (followed % 3 === 0) {
          game.feedback.good(doors[winIdx].x, DOOR_Y - 230, { text: 'NICE', color: C.green, size: 40, count: 6 });
        }
      }
    }
  }

  // ── 描画 ─────────────────────────────────────────
  function drawBack() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, C.bgTop], [0.7, C.bgLow], [1, C.bgTop]]);
    game.draw.rect(0, 0, W, H, C.gold, 0.03 + 0.03 * Math.sin(t * 1.2));
    // 時計塔の壁
    game.draw.rect(40, 240, W - 80, H * 0.60, C.line);
    game.draw.rect(52, 252, W - 104, H * 0.60 - 24, C.tower);
    game.draw.rect(W * 0.62, 252, W * 0.38 - 52, H * 0.60 - 24, C.towerDark);
    // 回る歯車(遠景)
    var gs = Math.floor(t * 3) % 2;
    game.draw.sprite(GEAR, { k: C.towerDark }, 140 + (gs ? 4 : 0), 330, 14, { anchor: 'center' });
    game.draw.sprite(GEAR, { k: C.towerDark }, W - 140 - (gs ? 4 : 0), H * 0.74, 14, { anchor: 'center' });
    // 文字盤
    var cx = W / 2, cy = 330;
    game.draw.circle(cx, cy, 86, C.line);
    game.draw.circle(cx, cy, 74, C.cream);
    var a1 = t * 1.2, a2 = t * 0.2;
    game.draw.line(cx, cy, cx + Math.cos(a1) * 60, cy + Math.sin(a1) * 60, C.line, 8);
    game.draw.line(cx, cy, cx + Math.cos(a2) * 40, cy + Math.sin(a2) * 40, C.red, 10);
    // 床と親指ゾーンの台
    game.draw.rect(0, H * 0.76, W, 16, C.line);
    game.draw.rect(0, H * 0.76 + 16, W, H * 0.24, C.bgDark);
  }

  function drawDoor(i, highlight) {
    var d = doors[i];
    var t = game.time.elapsed;
    var idleBob = (phase === 'hide' || phase === 'grab') ? Math.sin(t * 3 + i) * 6 : 0;
    var x = d.x, y = d.y + idleBob;
    var isWin = i === winIdx;
    var opened = (phase === 'hide' && isWin && phaseT > 0.3 && phaseT < 1.1) || (openT > 0 && isWin);
    var glow = isWin && (phase === 'hide' || phase === 'grab');
    if (glow) game.draw.circle(x, y, 190 + 12 * Math.sin(t * 8), C.gold, 0.35);
    if (highlight) game.draw.circle(x, y, 220, C.cream, 0.35 + 0.3 * Math.sin(t * 30));
    game.draw.rect(x - 118, y - 160, 236, 320, C.line);
    if (opened) {
      game.draw.rect(x - 104, y - 146, 208, 292, '#3a2a1a');
      var f = Math.floor(t * 8) % 2;
      game.draw.sprite(BIRD[f], BIRD_PAL, x, y - 20 - (openT > 0 ? Math.min(60, openT * 200) : 0), 22, { anchor: 'center' });
      game.draw.rect(x - 104 - 60, y - 146, 60, 292, C.door);
    } else {
      game.draw.rect(x - 104, y - 146, 208, 292, C.door);
      game.draw.rect(x + 30, y - 146, 74, 292, C.doorDark);
      game.draw.circle(x, y - 60, 46, C.line);
      game.draw.circle(x, y - 60, 36, C.cream);
      game.draw.circle(x + 60, y + 40, 16, C.line);
      game.draw.circle(x + 60, y + 40, 9, C.gold);
    }
  }

  function drawFinger() {
    if (!down || phase === 'hide') return;
    var wd = doors[winIdx];
    var on = Math.hypot(fx - wd.x, (fy - wd.y) * 0.7) < FOLLOW_R;
    game.draw.circle(fx, fy, 60, phase === 'shuffle' ? (on ? C.green : C.red) : C.cream, 0.4);
    game.draw.circle(fx, fy, 22, C.cream, 0.8);
  }

  function drawSquirrel() {
    var t = game.time.elapsed;
    var f = Math.floor(t * 4) % 2;
    var hop = phase === 'stop' && ok ? Math.abs(Math.sin(t * 12)) * 50 : 0;
    var sad = phase === 'stop' && !ok;
    game.draw.sprite(SQUIRREL[f], SQ_PAL, W * 0.84 + Math.sin(t * 1.4) * 14, H * 0.87 - hop + (sad ? 20 : Math.sin(t * 5) * 5), 14, { anchor: 'center', flipY: sad });
  }

  function drawHud() {
    txt(followed + ' / ' + SWAPS, W / 2, 70, 50, C.cream);
    var low = timeLeft < 4 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(80, 130, W - 160, 18, C.line);
    game.draw.rect(84, 134, (W - 168) * (timeLeft / TIME_LIMIT), 10, low ? C.red : C.gold);
    for (var i = 0; i < SWAPS; i++) game.draw.circle(W / 2 - (SWAPS - 1) * 26 + i * 52, 190, 12, i < followed ? C.gold : C.towerDark);
    if (phase === 'grab') {
      // 押さえ待ちの残り(縮むリング)
      var wd = doors[winIdx];
      game.draw.circle(wd.x, wd.y + 230, 20 + 40 * (phaseT / GRAB_WAIT), C.gold, 0.6);
    }
  }

  function drawScene(highlight) {
    drawBack();
    // 動いている扉を後ろに、上に弧を描く扉を手前に
    var order = [0, 1, 2].sort(function(a, b) { return doors[b].y - doors[a].y; });
    for (var i = 0; i < 3; i++) drawDoor(order[i], highlight && order[i] === winIdx);
    drawFinger();
    drawSquirrel();
  }

  function drawResult() {
    game.draw.rect(0, H * 0.78, W, H * 0.13, C.line, 0.8);
    if (ok) {
      txt('CLEAR', W / 2, H * 0.815, 96, C.gold);
      txt(Math.round(onRatio() * 100) + '%', W / 2, H * 0.87, 46, C.green);
    } else {
      txt(endReason === 'time' ? 'TIME UP' : 'GAME OVER', W / 2, H * 0.815, 86, C.red);
      txt('あと' + Math.max(1, SWAPS - followed) + '回!', W / 2, H * 0.87, 46, C.gold);
    }
    txt('BEST ' + (game.best > 0 ? game.best : 0), W / 2, H * 0.74, 34, C.cream);
    if (ok && calcScore() > game.best) txt('NEW RECORD', W / 2, H * 0.70, 50, C.gold);
  }

  function onRatio() { return onRatioN > 0 ? onRatioAcc / onRatioN : 0; }
  function calcScore() { return followed * 60 + Math.round(onRatio() * 300) + Math.round(timeLeft * 20); }

  // ── 入力 ─────────────────────────────────────────
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) {
      game.audio.play('se_coin');
      state = S.PLAYING; initGame(false); startMusic();
      return;
    }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(true); demo.t = 0; startMusic(); return; }
    if (phase === 'hide' || phase === 'ready') game.audio.play('se_tap', 0.08);
  });
  game.onPress(function(x, y) {
    if (state !== S.PLAYING) return;
    game.fx.burst(x, y, { color: C.cream, count: 3, speed: 80 });
    pointerDown(x, y, true);
  });
  game.onMove(function(x, y) {
    if (state !== S.PLAYING) return;
    pointerMove(x, y);
    if (phase === 'shuffle' && Math.random() < 0.1) game.fx.burst(x, y, { color: C.cream, count: 2, speed: 60 });
  });
  game.onRelease(function(x, y) {
    if (state !== S.PLAYING) return;
    pointerUp();
    if (phase === 'shuffle') game.audio.tone('D4', 0.08, { wave: 'triangle', volume: 0.08, slide: -60 });
  });

  // ── ATTRACT デモ: AIの指が同じ pointerDown/Move で扉を追う ──────────
  // 偶数周は追い切って成功、奇数周は途中で遅れて外れる失敗例
  var demo = { t: 0, gx: W / 2, gy: H * 0.86, press: false, lag: 10 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 7;
    if (cyc < dt || demo.t <= dt) {
      initGame(true);
      // デモは入れ替え回数を減らして1周に収める
      swapList = swapList.slice(0, 7); for (var k = 0; k < swapList.length; k++) swapList[k].dur = Math.max(0.3, 0.5 - k * 0.03);
      down = false; demo.lag = 12;
    }
    var failRun = Math.floor(demo.t / 7) % 2 === 1;
    var wd = doors[winIdx];
    if (phase === 'hide') {
      demo.gx += (W / 2 - demo.gx) * dt * 3; demo.gy += (H * 0.86 - demo.gy) * dt * 3; demo.press = false;
    } else if (phase === 'grab') {
      demo.gx += (wd.x - demo.gx) * Math.min(1, dt * 10); demo.gy += (wd.y - demo.gy) * Math.min(1, dt * 10);
      if (Math.hypot(demo.gx - wd.x, demo.gy - wd.y) < 30) { pointerDown(demo.gx, demo.gy, false); }
    } else if (phase === 'shuffle') {
      if (failRun && swapI >= 3) demo.lag = 2.5;
      demo.gx += (wd.x - demo.gx) * Math.min(1, dt * demo.lag); demo.gy += (wd.y - demo.gy) * Math.min(1, dt * demo.lag);
      pointerMove(demo.gx, demo.gy);
      demo.press = true;
    }
    stepWorld(dt, false);
    if (phase === 'stop') demo.press = false;
  }

  function startMusic() {
    game.audio.melody([
      ['A4', 0.5], ['C5', 0.5], ['E5', 0.5], ['A5', 0.5], ['G5', 0.5], ['E5', 0.5], ['C5', 1],
      ['D5', 0.5], ['F5', 0.5], ['E5', 0.5], ['C5', 0.5], ['B4', 1], ['E4', 1],
    ], { tempo: 176, wave: 'square', volume: 0.045, loop: true, bass: true });
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (doors === undefined) initGame(true);
      stepDemo(dt);
      drawScene(phase === 'stop' && !ok);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 14 });
      txt(GAME_TITLE, W / 2, H * 0.06, 76, C.gold);
      txt('HI-SCORE ' + (game.best > 0 ? game.best : 0), W / 2, H * 0.105, 34, C.cream);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.965, 46, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.965, 40, C.cream);
      return;
    }

    if (state === S.RESULT) {
      drawScene(!ok);
      drawResult();
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.965, 40, C.cream);
      return;
    }

    // PLAYING
    if (phase === 'ready') {
      ready -= dt;
      if (ready <= 0) { phase = 'hide'; phaseT = 1.3; game.audio.play('se_tap', 0.4); }
    } else if (phase === 'stop') {
      stopT -= dt; openT += dt;
      if (stopT <= 0) { phase = 'done'; doneT = 1.4; }
    } else if (phase === 'done') {
      doneT -= dt; openT += dt;
      if (doneT <= 0) {
        state = S.RESULT;
        var stats = { swaps: followed, total: SWAPS, contact: Math.round(onRatio() * 100) };
        if (ok) game.end.success(calcScore(), stats);
        else game.end.failure(stats);
      }
    } else {
      stepWorld(dt, true);
    }

    drawScene((phase === 'stop' || phase === 'done') && !ok);
    drawHud();
    if (phase === 'ready') txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.30, 100, C.gold);
    if (phase === 'done') drawResult();
  });

  game.onStart(function() {
    state = S.ATTRACT;
    initGame(true);
    demo.t = 0;
    startMusic();
  });
})(game);
