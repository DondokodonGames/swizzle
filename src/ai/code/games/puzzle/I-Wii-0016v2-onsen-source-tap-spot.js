// I-Wii-0016v2-onsen-source-tap-spot.js
// 湯守りの見張り — 源泉小屋の壁に並んだ蛇口のうち、圧が上がって湯気を吹く間隔が詰まってきた1本を見抜き、吹き出す前にタップして締める
// 操作: 蛇口はどれも時々ふっと湯気を吐く。圧が上がっている1本だけは湯気の間隔がだんだん詰まり、やがて震え出して赤くなり(シューと鳴る)、最後に噴き出す。それをタップすると締まる。早く見抜くほど高得点。違う蛇口を締めると湯気が噴いてしくじり
// 終わり: 15秒で7本締めればCLEAR。噴き出し/締め違いが3回になるか、時間切れでGAME OVER
// @mechanic: spot
// @theme: onsen_source_hut_faucet_watch
// 世界観: 山の温泉旅館の源泉小屋で、湯守りの老人が壁一面の配管に並んだ蛇口を見張り、湯気の吹き方が速まってきた1本を見抜いて噴き出す前に締めていく
// 残るもの: 正誤(CLEAR/GAME OVER) + 締めた本数・PERFECT数(早く見抜けた数)・しくじり回数・スコア
// スタイル: 90s 16bit

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s 16bit: 空グラデ+遠景の山+近景の板壁の3層。暗い輪郭+ハイライト
  var STYLE = { bg: ['#ffb36b', '#6b3a5a'], main: ['#c8743a', '#f2e6c8', '#4a8fd0'], accent: ['#ff3b3b', '#fff7a8'] };
  var C = {
    copper: STYLE.main[0], copperLt: '#f0a060', copperDk: '#7a3e1c', steam: STYLE.main[1], blue: STYLE.main[2], red: STYLE.accent[0], hi: STYLE.accent[1],
    plank: '#8a5a3a', plankDk: '#5e3a24', plankLt: '#a8744c', ink: '#1e1424', water: '#7fd0d8', waterDk: '#3d9aa8', mount: '#7a5a8a',
  };

  var GAME_TITLE = 'YUMORI';
  var TIME_LIMIT = 15;
  var NEEDED = 7;
  var LIVES = 3;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var mode = S.ATTRACT;

  var taps, puffs, hot, p, rise, taskN, closed, perfects, slips, combo, score, finalScore, gapT, sumP;
  var timeLeft, readyT, stopT, stopTap, stopKind, fin, cleared, postT, joyT, sadT, warnT, endWhy, hissT;

  // 湯守り(手ぬぐいを頭に)
  var MAN_A = ['...wwwwww...', '..wwbwwbww..', '..ssssssss..', '..skssssks..', '..ssssssss..', '..sggggggs..', '...gggggg...', '.hhhhhhhhhh.', 'hhhyhhhhyhhh', 's.hhhhhhhh.s', '..hhhhhhhh..', '..dd....dd..'];
  var MAN_B = ['...wwwwww...', '..wwbwwbww..', '..ssssssss..', '..skssssks..', '..ssssssss..', '..sggmmggs..', '...gggggg...', '.hhhhhhhhhh.', 'hhhyhhhhyhhh', 's.hhhhhhhh.s', '..hhhhhhhh..', '..dd....dd..'];
  var MAN_JOY = ['...wwwwww...', '..wwbwwbww..', '..ssssssss..', '..s.ssss.s..', '..ssssssss..', '..sgmmmmgs..', 's..gggggg..s', 'shhhhhhhhhhs', '.hhyhhhhyhh.', '..hhhhhhhh..', '..hhhhhhhh..', '..dd....dd..'];
  var MAN_SAD = ['............', '...wwwwww...', '..wwbwwbww..', '..ssssssss..', '..sskssks...', '..ssssssss..', '..sgmmmmgs..', '.hhhhhhhhhh.', 'hhhyhhhhyhhh', 's.hhhhhhhh.s', '..hhhhhhhh..', '..dd....dd..'];
  var MAN_PAL = { w: '#ffffff', b: '#4a8fd0', s: '#f0b890', k: '#1e1424', g: '#d8d8d8', m: '#8a3a3a', h: '#2c4a8a', y: '#fff7a8', d: '#3a2a20' };

  function out(str, x, y, sz, color) {
    game.draw.text(str, x + 4, y + 4, { size: sz, color: C.ink, bold: true });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true });
  }

  // 配管の並び(段ごとに増える)
  function layout(n) {
    var rows = n < 2 ? 2 : 3, cols = n < 4 ? 4 : 5;
    var list = [];
    for (var r = 0; r < rows; r++) {
      var y = rows === 2 ? (r === 0 ? H * 0.34 : H * 0.52) : H * 0.3 + r * H * 0.15;
      for (var c = 0; c < cols; c++) {
        var x = W / 2 + (c - (cols - 1) / 2) * (cols === 4 ? 220 : 185);
        list.push({ x: x, y: y, puffT: 0.3 + Math.random() * 2.2, shut: 0, spit: 0, row: r });
      }
    }
    return list;
  }

  function newTask() {
    taps = layout(taskN);
    hot = Math.floor(Math.random() * taps.length);
    p = 0; rise = Math.max(1.55, 2.6 - taskN * 0.16); hissT = 0;
    puffs = [];
  }

  function initGame() {
    taskN = 0; closed = 0; perfects = 0; slips = 0; combo = 0; score = 0; finalScore = 0; gapT = 0; sumP = 0;
    timeLeft = TIME_LIMIT; readyT = 0.8; stopT = 0; stopTap = null; stopKind = ''; fin = false; cleared = false; postT = 0;
    joyT = 0; sadT = 0; warnT = 0; endWhy = '';
    newTask();
  }

  function addPuff(t, big) {
    puffs.push({ x: t.x + game.random(-6, 6), y: t.y + 116, r: big ? 36 : 22, t: 0, life: big ? 1.1 : 0.8 });
  }

  function tapAt(x, y) {
    for (var i = 0; i < taps.length; i++) if (Math.abs(x - taps[i].x) < 90 && y > taps[i].y - 80 && y < taps[i].y + 150) return i;
    return -1;
  }

  // 締める(本番もデモも同じ処理)
  function closeTap(i) {
    if (gapT > 0 || stopT > 0) return;
    var tp = taps[i];
    if (i === hot) {
      tp.shut = 0.001;
      closed++; combo++; sumP += p;
      var perfect = p < 0.38;
      if (perfect) perfects++;
      var pts = 100 + Math.round((1 - p) * 200) + combo * 20;
      score += pts; joyT = 0.6;
      game.feedback.good(tp.x, tp.y - 90, { text: perfect ? 'PERFECT' : 'GOOD', color: perfect ? C.hi : C.steam, size: 60 });
      game.fx.popup('+' + pts, tp.x, tp.y - 160, { color: C.hi, size: 42 });
      game.audio.tone('G5', 0.06, { wave: 'square', volume: 0.07, slide: -300 });
      if (closed === 4 && mode === S.PLAYING) {
        game.audio.play('se_milestone', 0.5);
        game.fx.popup('NICE', W / 2, H * 0.24, { color: C.hi, size: 90 });
      }
      gapT = 0.4;
      if (mode === S.PLAYING && closed >= NEEDED) { stopT = 0.4; stopKind = 'win'; stopTap = tp; game.audio.play('se_powerup', 0.4); }
    } else {
      // 締め違い: その蛇口から湯気が噴く。止めて白く光らせてから判定
      tp.spit = 0.6; combo = 0;
      stopT = 0.4; stopKind = 'wrong'; stopTap = tp;
      addPuff(tp, true);
      game.fx.flash('#ffffff', 0.12);
      game.audio.tone('D3', 0.25, { wave: 'sawtooth', volume: 0.09, slide: -60 });
    }
  }

  function resolveStop() {
    if (stopKind === 'win') { ending(true); return; }
    slips++; sadT = 0.8;
    game.feedback.bad(stopTap.x, stopTap.y - 90, { text: 'MISS', color: C.red, size: 60 });
    if (stopKind === 'burst') { taskN++; newTask(); gapT = 0.35; }
    if (mode === S.PLAYING && slips >= LIVES) { endWhy = 'slip'; ending(false); }
  }

  function stepHut(dt) {
    if (joyT > 0) joyT -= dt;
    if (sadT > 0) sadT -= dt;
    for (var k = puffs.length - 1; k >= 0; k--) {
      var pf = puffs[k]; pf.t += dt; pf.y -= 110 * dt; pf.r += 44 * dt;
      if (pf.t > pf.life) puffs.splice(k, 1);
    }
    if (stopT > 0) { stopT -= dt; if (stopT <= 0) resolveStop(); return; }
    for (var i = 0; i < taps.length; i++) {
      var tp = taps[i];
      if (tp.spit > 0) tp.spit -= dt;
      if (tp.shut > 0 && tp.shut < 1) tp.shut = Math.min(1, tp.shut + dt * 4);
      if (tp.shut > 0) continue;
      tp.puffT -= dt;
      if (tp.puffT <= 0) {
        if (i === hot) { addPuff(tp, p > 0.5); tp.puffT = 0.95 - p * 0.82; }
        else { addPuff(tp, Math.random() < 0.15); tp.puffT = 1.2 + Math.random() * 1.6; }
      }
    }
    if (gapT > 0) {
      gapT -= dt;
      if (gapT <= 0 && taps[hot].shut > 0) { taskN++; newTask(); }
      return;
    }
    p += dt / rise;
    if (p > 0.78) {
      hissT -= dt;
      if (hissT <= 0) { hissT = 0.12; game.audio.tone(2400 + Math.random() * 600, 0.05, { wave: 'sawtooth', volume: 0.025 }); }
    }
    if (p >= 1) {
      // 噴き出し: 止めて白く光らせる
      p = 1; combo = 0;
      stopT = 0.45; stopKind = 'burst'; stopTap = taps[hot];
      for (var b = 0; b < 4; b++) addPuff(taps[hot], true);
      game.fx.flash('#ffffff', 0.15);
      game.audio.tone('C3', 0.35, { wave: 'sawtooth', volume: 0.1, slide: -80 });
    }
  }

  function ending(win) {
    if (fin) return;
    fin = true; cleared = win; postT = 1.4;
    finalScore = win ? score + Math.round(timeLeft * 60) + (LIVES - slips) * 150 : 0;
    game.audio.stopBgm();
    game.audio.play(win ? 'se_success' : 'se_failure', 0.55);
    if (win) {
      for (var i = 0; i < 5; i++) game.fx.burst(160 + i * 190, H * 0.4 + (i % 2) * 120, { color: i % 2 ? C.hi : C.steam, count: 18, speed: 480 });
      game.fx.flash('#ffffff', 0.2);
    } else sadT = 3;
  }

  // ---- 入力 ----
  game.onTap(function(x, y) {
    if (mode === S.ATTRACT) { game.audio.play('se_coin'); mode = S.PLAYING; initGame(); return; }
    if (mode === S.RESULT) { game.audio.play('se_tap'); mode = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (fin || readyT > 0 || stopT > 0 || gapT > 0) { game.audio.play('se_tap', 0.06); return; }
    var i = tapAt(x, y);
    if (i >= 0) { game.audio.play('se_tap', 0.25); closeTap(i); }
    else game.audio.tone('E4', 0.04, { wave: 'triangle', volume: 0.05 });
  });

  // ---- 描画 ----
  function drawHut(t) {
    // 層1: 窓の外の夕空と山
    game.draw.gradient(0, H, [[0, STYLE.bg[0]], [0.25, '#c86a6a'], [1, STYLE.bg[1]]]);
    for (var m = 0; m < 6; m++) game.draw.circle(80 + m * 200, H * 0.2, 130 + (m % 2) * 40, C.mount);
    // 層2: 板壁(窓の穴を残す)
    game.draw.rect(0, 0, W, 230, C.plankDk);
    game.draw.rect(0, H * 0.2, W, H * 0.6, C.plank);
    for (var x = 0; x < W; x += 120) {
      game.draw.rect(x, H * 0.2, 6, H * 0.6, C.plankDk);
      game.draw.rect(x + 8, H * 0.2, 4, H * 0.6, C.plankLt);
    }
    game.draw.rect(0, H * 0.2, W, 12, C.ink);
    // 層3: 湯船と湯気のもや
    game.draw.rect(0, H * 0.74, W, H * 0.26, C.plankDk);
    game.draw.rect(40, H * 0.75, W - 80, 170, C.ink);
    game.draw.rect(52, H * 0.755, W - 104, 150, C.waterDk);
    game.draw.rect(52, H * 0.755, W - 104, 50, C.water);
    for (var b = 0; b < 6; b++) game.draw.circle(120 + b * 170 + Math.sin(t * 3 + b) * 10, H * 0.765 + Math.abs(Math.sin(t * 4 + b)) * 30, 10, '#ffffff', 0.6);
    for (var h = 0; h < 5; h++) game.draw.circle(((t * 30 + h * 250) % (W + 300)) - 150, H * 0.72, 120, '#ffffff', 0.08);
  }

  function drawTaps(t) {
    // 配管(段ごと)
    var rowsY = {};
    for (var i = 0; i < taps.length; i++) rowsY[taps[i].row] = taps[i].y;
    for (var r in rowsY) {
      var y = rowsY[r] - 60;
      game.draw.rect(30, y - 4, W - 60, 44, C.ink);
      game.draw.rect(30, y, W - 60, 36, C.copper);
      game.draw.rect(30, y + 4, W - 60, 8, C.copperLt);
      game.draw.rect(30, y + 26, W - 60, 10, C.copperDk);
    }
    for (var k = 0; k < taps.length; k++) {
      var tp = taps[k], isHot = k === hot && tp.shut <= 0;
      var shake = 0, tint = 0;
      if (isHot && p > 0.55) shake = Math.sin(t * 50) * (p - 0.55) * 22;
      if (isHot && p > 0.78) tint = Math.floor(t * 12) % 2 === 0 ? 1 : 0.5;
      var big = stopT > 0 && stopTap === tp && stopKind !== 'win' ? 1.3 : 1;
      var flash = big > 1 && Math.floor(t * 16) % 2 === 0;
      var x = tp.x + shake, y = tp.y;
      var body = flash ? '#ffffff' : tint ? C.red : C.copper;
      // 首と本体と吐水口
      game.draw.rect(x - 16 * big, y - 30, 32 * big, 50, C.ink);
      game.draw.rect(x - 12 * big, y - 30, 24 * big, 50, flash ? '#ffffff' : C.copperDk);
      game.draw.rect(x - 44 * big, y + 10, 88 * big, 60 * big, C.ink);
      game.draw.rect(x - 40 * big, y + 14, 80 * big, 52 * big, body);
      game.draw.rect(x - 36 * big, y + 18, 72 * big, 10, flash ? '#ffffff' : C.copperLt);
      game.draw.rect(x - 12 * big, y + 64 * big, 24 * big, 46 * big, C.ink);
      game.draw.rect(x - 8 * big, y + 64 * big, 16 * big, 42 * big, body);
      // 取っ手(締めると回る)
      var a = tp.shut > 0 ? tp.shut * Math.PI : 0;
      var hy = y - 46;
      game.draw.circle(x, hy, 16, C.ink);
      game.draw.line(x - Math.cos(a) * 46, hy - Math.sin(a) * 10, x + Math.cos(a) * 46, hy + Math.sin(a) * 10, C.ink, 18);
      game.draw.line(x - Math.cos(a) * 42, hy - Math.sin(a) * 10, x + Math.cos(a) * 42, hy + Math.sin(a) * 10, tp.shut > 0 ? C.blue : C.red, 10);
      if (tp.shut >= 1) game.draw.circle(x, y + 120, 12, C.blue, 0.8);
    }
    for (var q = 0; q < puffs.length; q++) {
      var pf = puffs[q];
      game.draw.circle(pf.x, pf.y, pf.r, C.steam, 0.9 * (1 - pf.t / pf.life));
      game.draw.circle(pf.x - pf.r * 0.3, pf.y - pf.r * 0.3, pf.r * 0.4, '#ffffff', 0.5 * (1 - pf.t / pf.life));
    }
  }

  function drawMan(t) {
    var f = sadT > 0 || (fin && !cleared) ? MAN_SAD : joyT > 0 || (fin && cleared) ? MAN_JOY : (Math.floor(t * 2) % 2 ? MAN_A : MAN_B);
    var x = W * 0.5, y = H * 0.9 + Math.sin(t * 2) * 5;
    game.draw.circle(x, y + 100, 110, C.ink, 0.3);
    game.draw.sprite(f, MAN_PAL, x, y, 16, { anchor: 'center' });
  }

  function drawHud(t) {
    var low = timeLeft < 4 && Math.floor(t * 6) % 2 === 0;
    game.draw.rect(60, 34, W - 120, 22, C.ink);
    game.draw.rect(64, 38, (W - 128) * Math.max(0, timeLeft / TIME_LIMIT), 14, low ? C.red : C.hi);
    out(closed + ' / ' + NEEDED, W / 2, 140, 66, C.steam);
    for (var l = 0; l < LIVES; l++) game.draw.circle(90 + l * 60, 140, 22, l < LIVES - slips ? C.water : C.ink);
    out('' + score, W - 150, 140, 44, C.hi);
  }

  function drawScene(t) {
    drawHut(t);
    drawTaps(t);
    drawMan(t);
  }

  // ---- ATTRACT: 本物の closeTap()/stepHut() で実演。1本目は詰まってきた所で締め、2本目は別の蛇口を締めてMISS、3本目は見逃して噴き出す ----
  var demo = { t: 0, x: W / 2, y: H * 0.6, press: false, k: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 8.5;
    if (cyc < dt || demo.t <= dt) { initGame(); readyT = 0; demo.k = 0; demo.done = -1; }
    stepHut(dt);
    demo.press = false;
    var tx = W / 2, ty = H * 0.62;
    if (gapT <= 0 && stopT <= 0 && demo.done !== taskN) {
      var wrongIdx = (hot + 1) % taps.length;
      if (taskN === 0) { tx = taps[hot].x; ty = taps[hot].y + 40; if (p > 0.45) { demo.press = true; closeTap(hot); demo.done = taskN; } }
      else if (taskN === 1) {
        if (demo.k === 0) { tx = taps[wrongIdx].x; ty = taps[wrongIdx].y + 40; if (p > 0.25) { demo.press = true; closeTap(wrongIdx); demo.k = 1; } }
        else { tx = taps[hot].x; ty = taps[hot].y + 40; if (p > 0.6) { demo.press = true; closeTap(hot); demo.done = taskN; } }
      } else { tx = W * 0.8; ty = H * 0.62; }
    }
    if (stopT > 0 || gapT > 0) demo.press = true;
    demo.x += (tx - demo.x) * Math.min(1, dt * 7);
    demo.y += (ty - demo.y) * Math.min(1, dt * 7);
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;

    if (mode === S.ATTRACT) {
      stepDemo(dt);
      drawScene(t);
      game.draw.hand(demo.x, demo.y, { press: demo.press, scale: 13 });
      out(GAME_TITLE, W / 2, H * 0.06 + Math.sin(t * 2) * 5, 100, C.hi);
      out('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.105, 38, C.steam);
      if (Math.floor(t * 1.8) % 2 === 0) out('► 100円 投入 ◄', W / 2, H * 0.975, 46, C.hi);
      else out('TAP TO START', W / 2, H * 0.975, 40, C.steam);
      return;
    }

    if (mode === S.RESULT) {
      drawScene(t);
      game.draw.rect(90, H * 0.3, W - 180, 520, C.ink, 0.88);
      game.draw.rect(90, H * 0.3, W - 180, 10, cleared ? C.hi : C.red);
      out(cleared ? 'CLEAR' : (endWhy === 'time' ? 'TIME UP' : 'GAME OVER'), W / 2, H * 0.35, 100, cleared ? C.hi : C.red);
      out('SCORE ' + finalScore, W / 2, H * 0.41, 60, C.steam);
      out(closed + ' / ' + NEEDED + '   PERFECT ' + perfects, W / 2, H * 0.46, 44, C.steam);
      if (cleared && finalScore > game.best) out('NEW RECORD', W / 2, H * 0.51, 56, C.hi);
      else out('BEST ' + Math.max(game.best, finalScore), W / 2, H * 0.51, 42, C.hi);
      if (!cleared) out('あと' + (NEEDED - closed) + '本!', W / 2, H * 0.27, 64, C.red);
      if (Math.floor(t * 2) % 2 === 0) out('TAP TO CONTINUE', W / 2, H * 0.975, 40, C.steam);
      return;
    }

    // ---- PLAYING ----
    if (fin) {
      postT -= dt;
      if (postT <= 0) {
        mode = S.RESULT;
        var stats = { closed: closed, perfects: perfects, slips: slips, avgPressure: closed > 0 ? Math.round(sumP / closed * 100) : 0 };
        if (cleared) game.end.success(finalScore, stats);
        else game.end.failure(stats);
      }
    } else if (readyT > 0) {
      readyT -= dt;
      if (readyT <= 0) game.audio.play('se_tap', 0.4);
    } else {
      if (stopT <= 0) timeLeft -= dt;
      stepHut(dt);
      if (!fin && timeLeft < 4) {
        warnT -= dt;
        if (warnT <= 0) { warnT = 0.5; game.audio.tone(timeLeft < 2 ? 'A5' : 'E5', 0.05, { wave: 'square', volume: 0.06 }); }
      }
      if (!fin && stopT <= 0 && timeLeft <= 0) {
        timeLeft = 0; endWhy = 'time';
        game.fx.flash('#ffffff', 0.15);
        game.feedback.bad(W / 2, H * 0.24, { text: 'TIME UP', color: C.red, size: 72 });
        ending(false);
      }
    }

    drawScene(t);
    drawHud(t);
    if (readyT > 0) out(readyT > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.45, 120, C.hi);
  });

  game.onStart(function() {
    game.audio.melody([
      ['A4', 0.5], ['C5', 0.5], ['E5', 1], ['D5', 0.5], ['C5', 0.5], ['A4', 1],
      ['G4', 0.5], ['A4', 0.5], ['C5', 1], ['B4', 0.5], ['G4', 0.5], ['E4', 1],
      ['A4', 0.5], ['E5', 0.5], ['D5', 0.5], ['C5', 0.5], ['A4', 2],
    ], { tempo: 120, wave: 'square', volume: 0.055, loop: true, bass: [['A2', 2], ['E2', 2], ['G2', 2], ['E2', 2], ['A2', 2], ['E2', 2]] });
    mode = S.ATTRACT;
    initGame();
  });
})(game);
