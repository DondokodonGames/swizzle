// I-Switch2-0006v2-yagura-drum-roll-count.js
// 櫓太鼓の打ち止め — 押している間は呼び出しが櫓太鼓を打ち続け、だんだん速くなる。札の数ちょうど打ったところで指を離して止める
// 操作: 画面を押すと最初の一打が鳴り、押している間は自動で打ち続ける(一打ごとに間が詰まって速くなる)。指を離すと打ち止め。札の数だけ鳴ったら次の一打が来る前に離す。押さずに待ちすぎると札を逃す。後の札ほど速くなり方が急になる
// 終わり: 22秒のうちに4枚の札でちょうど打ち止めればCLEAR。打ちすぎ/足りずに離すのが2回、または時間切れでGAME OVER
// @mechanic: count_exact
// @theme: sumo_tower_drum_count
// 世界観: 夜明けの相撲場で、櫓の上の呼び出しが場所入りを知らせる櫓太鼓を、だんだん速まる打ち込みのまま札の数ちょうどで打ち止める
// 残るもの: 正誤(CLEAR/GAME OVER) + ちょうど打ち止めた札の数・PERFECT数・打った総数・スコア
// スタイル: VOXEL BLOCK

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // VOXEL BLOCK: 立方体を上面/左面/右面の3明度で等角に積む。影は落とさない
  var STYLE = { bg: ['#ff9a6a', '#4a6ab8'], main: ['#c9935a', '#9a6a3a', '#6a4424'], accent: ['#e8402a', '#fff2c8'] };
  var WT = STYLE.main[0], WL = STYLE.main[1], WR = STYLE.main[2], RED = STYLE.accent[0], CREAM = STYLE.accent[1];
  var INK = '#1e1a24', GOLD = '#ffd23a', MISSC = '#ff3355', NAVY = '#24305a';

  var GAME_TITLE = 'DRUM TOWER';
  var TIME_LIMIT = 22;
  var NEEDED = 4;
  var MAX_MISS = 2;
  var TASKS = [4, 6, 5, 8, 7, 10, 9];
  var ROUND_IDLE = 3.5;
  var DRUM_X = 470, DRUM_Y = 650, HEAD_X = 610, YOB_X = 730;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var mode = S.ATTRACT;

  var taskI, N, holding, strikes, nextT, interval, int0, accel, sinceHit, idleT, hitFx, stickT, padT;
  var stopT, stopKind, gapT, good, perfects, misses, totalHits, score, finalScore, timeLeft, readyT, fin, cleared, postT;
  var joyT, sadT, warnT, endWhy;

  // 呼び出し(左向き)。撥を振り上げ / 振り下ろし
  var YOB_UP = ['k.........k.', '.k..hhhh.k..', '..k.hhhh.k..', '...kssssk...', '...sksskk...', '....ssss....', '..nnnnnnnn..', '.nnnwwwwnnn.', '.nnnwwwwnnn.', '..nnnnnnnn..', '..gggggggg..', '..gggggggg..', '..gg....gg..'];
  var YOB_DN = ['....hhhh....', '....hhhh....', '....ssss....', '...sksskk...', '....ssss....', '..nnnnnnnn..', 'knnnwwwwnnnk', '.knnwwwwnnk.', '..knnnnnnk..', '...knnnnk...', '..gggggggg..', '..gggggggg..', '..gg....gg..'];
  var YOB_SAD = ['............', '....hhhh....', '....hhhh....', '....ssss....', '...ksssks...', '....ssss....', '..nnnnnnnn..', '.nnnwwwwnnn.', 'knnnwwwwnnnk', '..nnnnnnnn..', '..gggggggg..', '..gggggggg..', '..gg....gg..'];
  var YOB_PAL = { k: '#d8b07a', h: INK, s: '#f2c79c', n: NAVY, w: CREAM, g: '#5a5a6e' };

  function out(str, x, y, sz, col) {
    game.draw.text(str, x + 4, y + 4, { size: sz, color: INK, bold: true });
    game.draw.text(str, x, y, { size: sz, color: col, bold: true });
  }
  // 等角の立方体(上面の中心が cx,cy)
  function cube(cx, cy, s, top, left, right) {
    var h = s / 2;
    for (var dy = -h; dy < h; dy += 6) { var w = s * (1 - Math.abs(dy + 3) / h); game.draw.rect(cx - w, cy + dy, w * 2, 6, top); }
    for (var dx = 0; dx < s; dx += 8) {
      game.draw.rect(cx - s + dx, cy + (dx / s) * h, 8, s, left);
      game.draw.rect(cx + dx, cy + h - ((dx + 8) / s) * h, 8, s, right);
    }
  }

  function startTask(i) {
    taskI = i; N = TASKS[i % TASKS.length];
    int0 = Math.max(0.3, 0.42 - i * 0.02); accel = Math.max(0.84, 0.92 - i * 0.015);
    holding = false; strikes = 0; nextT = 0; interval = int0; sinceHit = 9; idleT = 0;
  }

  function initGame() {
    good = 0; perfects = 0; misses = 0; totalHits = 0; score = 0; finalScore = 0;
    timeLeft = TIME_LIMIT; readyT = 0.8; stopT = 0; stopKind = ''; gapT = 0; hitFx = 0; stickT = 0; padT = 0;
    fin = false; cleared = false; postT = 0; joyT = 0; sadT = 0; warnT = 0; endWhy = '';
    startTask(0);
  }

  function strike() {
    strikes++; totalHits++; sinceHit = 0; hitFx = 0.16; stickT = 0.1;
    game.audio.tone(strikes % 2 ? 'C3' : 'D3', 0.14, { wave: 'triangle', volume: 0.2 });
    game.audio.tone(90, 0.06, { wave: 'square', volume: 0.06 });
    game.fx.shake(3, 0.06);
    if (strikes > N) {
      // 打ちすぎ: その一打で止め、太鼓を白く大きく
      holding = false; stopT = 0.5; stopKind = 'over';
      game.fx.flash(CREAM, 0.15);
      game.audio.tone('C2', 0.3, { wave: 'sawtooth', volume: 0.08 });
    }
  }

  // 押す/離す(本番もデモも同じ処理)
  function pressDrum() {
    padT = 0.15;
    if (holding || stopT > 0 || gapT > 0 || fin) { game.audio.tone('C4', 0.03, { wave: 'square', volume: 0.04 }); return; }
    holding = true; strikes = 0; interval = int0; nextT = interval;
    strike();
  }
  function releaseDrum() {
    if (!holding) return false;
    holding = false;
    if (strikes === N) judgeOk();
    else {
      // 足りずに離した: 止めて札を白く光らせる
      stopT = 0.45; stopKind = 'under';
      game.fx.flash(CREAM, 0.12);
      game.audio.tone('G2', 0.3, { wave: 'square', volume: 0.09 });
    }
    return true;
  }

  function judgeOk() {
    good++; joyT = 0.9;
    var perfect = sinceHit < interval * 0.6;
    if (perfect) perfects++;
    var pts = 200 + N * 20 + (perfect ? 120 : 0) + taskI * 30;
    if (mode === S.PLAYING) score += pts;
    game.feedback.good(DRUM_X, DRUM_Y - 200, { text: perfect ? 'PERFECT' : 'GOOD', color: GOLD, size: 64 });
    game.fx.popup('+' + pts, DRUM_X, DRUM_Y - 280, { color: CREAM, size: 44 });
    game.audio.tone('G5', 0.12, { wave: 'square', volume: 0.07 });
    if (good === 2 && mode === S.PLAYING) {
      game.audio.play('se_milestone', 0.5);
      game.fx.popup('NICE', W / 2, H * 0.24, { color: GOLD, size: 96 });
    }
    if (mode === S.PLAYING && good >= NEEDED) { stopT = 0.45; stopKind = 'win'; game.audio.play('se_powerup', 0.4); return; }
    gapT = 0.8;
  }

  function resolveStop() {
    if (stopKind === 'win') { ending(true); return; }
    misses++; sadT = 0.9;
    if (stopKind === 'over') game.feedback.bad(DRUM_X, DRUM_Y - 180, { text: 'MISS', color: MISSC, size: 64 });
    else {
      game.feedback.bad(W / 2, 860, { text: 'MISS', color: MISSC, size: 64 });
      game.fx.popup('あと' + (N - strikes) + '打', W / 2, 1010, { color: MISSC, size: 52 });
    }
    if (mode === S.PLAYING && misses >= MAX_MISS) { endWhy = 'miss'; ending(false); return; }
    gapT = 0.8;
  }

  function stepTower(dt) {
    if (joyT > 0) joyT -= dt;
    if (sadT > 0) sadT -= dt;
    if (hitFx > 0) hitFx -= dt;
    if (stickT > 0) stickT -= dt;
    if (padT > 0) padT -= dt;
    sinceHit += dt;
    if (fin) return;
    if (stopT > 0) { stopT -= dt; if (stopT <= 0) resolveStop(); return; }
    if (gapT > 0) {
      gapT -= dt;
      if (gapT <= 0) { startTask(taskI + 1); game.audio.tone('E5', 0.06, { wave: 'square', volume: 0.07 }); }
      return;
    }
    if (holding) {
      nextT -= dt;
      if (nextT <= 0) { interval = Math.max(0.11, interval * accel); nextT += interval; strike(); }
    } else {
      idleT += dt;
      if (idleT >= ROUND_IDLE) {
        stopT = 0.45; stopKind = 'under'; strikes = 0;
        game.audio.tone('G2', 0.3, { wave: 'square', volume: 0.09 });
      }
    }
  }

  function ending(win) {
    if (fin) return;
    fin = true; cleared = win; postT = 1.4; holding = false;
    finalScore = win ? score + Math.round(timeLeft * 40) + (MAX_MISS - misses) * 120 : 0;
    game.audio.stopBgm();
    game.audio.play(win ? 'se_success' : 'se_failure', 0.55);
    if (win) {
      for (var i = 0; i < 6; i++) game.fx.burst(120 + i * 170, H * 0.3 + (i % 2) * 140, { color: i % 2 ? GOLD : RED, count: 18, speed: 460 });
      game.fx.flash(CREAM, 0.2);
      joyT = 3;
    } else sadT = 3;
  }

  // ---- 入力 ----
  game.onPress(function(x, y) {
    if (mode !== S.PLAYING || fin || readyT > 0) return;
    if (y < 230) { game.audio.play('se_tap', 0.08); return; }
    game.fx.burst(x, y, { color: GOLD, count: 4, speed: 120 });
    pressDrum();
  });
  game.onRelease(function(x, y) {
    if (mode !== S.PLAYING || fin || readyT > 0) { holding = false; return; }
    if (releaseDrum()) game.audio.tone('A4', 0.03, { wave: 'square', volume: 0.05 });
  });
  game.onTap(function(x, y) {
    if (mode === S.ATTRACT) { game.audio.play('se_coin'); mode = S.PLAYING; initGame(); return; }
    if (mode === S.RESULT) { game.audio.play('se_tap'); mode = S.ATTRACT; initGame(); demo.t = 0; startBgm(); return; }
  });

  // ---- 描画 ----
  function drawWorld(t) {
    game.draw.clear(STYLE.bg[1]);
    game.draw.gradient(0, 1440, [[0, STYLE.bg[1]], [0.55, '#c88aa8'], [1, STYLE.bg[0]]]);
    game.draw.circle(W * 0.18, 1080, 70, '#ffe2a0');
    // 遠くの町(低い立方体)
    for (var b = 0; b < 9; b++) {
      var bx = 40 + b * 125, bh = 1 + (b * 7) % 3;
      for (var r = 0; r < bh; r++) cube(bx, 1300 - r * 40, 40, '#8a7aa8', '#6a5a88', '#4a3a68');
    }
    // 地面(土俵の外の砂)
    game.draw.rect(0, 1440, W, H - 1440, '#d8b884');
    for (var g = 0; g < 6; g++) game.draw.rect(0, 1460 + g * 70, W, 4, '#c4a070');
    // 幟(左右)
    for (var n = 0; n < 2; n++) {
      var nx = n ? W - 100 : 60, sw = Math.sin(t * 2 + n) * 10;
      game.draw.rect(nx, 480, 10, 960, '#5a3a20');
      for (var k = 0; k < 8; k++) game.draw.rect(nx + 12 + sw * k / 8, 500 + k * 60, 60, 60, k % 2 ? (n ? '#3a8ad8' : RED) : CREAM);
    }
  }

  function drawTower(t) {
    // 脚(立方体を積む)
    for (var r = 0; r < 12; r++) {
      var y = 1400 - r * 56;
      cube(360, y, 56, WT, WL, WR);
      cube(720, y, 56, WT, WL, WR);
      if (r % 4 === 2) for (var c = 1; c < 6; c++) cube(360 + c * 60, y, 30, WT, WL, WR);
    }
    // 台
    for (var p = 0; p < 7; p++) cube(270 + p * 90, 770, 50, '#d9a86a', WL, WR);
    // 札
    var big = (stopT > 0 && stopKind === 'under') ? 1.2 : 1;
    var fl = big > 1 && Math.floor(t * 16) % 2 === 0;
    var bx = W / 2, by = 900;
    game.draw.line(bx - 80, 800, bx - 80, by - 80 * big, INK, 4);
    game.draw.line(bx + 80, 800, bx + 80, by - 80 * big, INK, 4);
    game.draw.rect(bx - 110 * big, by - 85 * big, 220 * big, 170 * big, INK);
    game.draw.rect(bx - 100 * big, by - 75 * big, 200 * big, 150 * big, fl ? CREAM : '#f4e2b8');
    out('' + N, bx, by + 40 * big, 120 * big, fl ? MISSC : INK);
  }

  function drawDrum(t) {
    var big = (stopT > 0 && stopKind === 'over') ? 1.25 : 1;
    var fl = big > 1 && Math.floor(t * 16) % 2 === 0;
    var x = DRUM_X, y = DRUM_Y;
    // 胴(3明度の面)
    game.draw.rect(x - 140 * big, y - 100 * big, 280 * big, 200 * big, fl ? CREAM : '#b8382a');
    game.draw.rect(x - 140 * big, y - 100 * big, 280 * big, 40 * big, fl ? CREAM : '#e05a3a');
    game.draw.rect(x - 140 * big, y + 60 * big, 280 * big, 40 * big, fl ? CREAM : '#7a2418');
    for (var i = 0; i < 8; i++) game.draw.rect(x - 130 * big + i * 36 * big, y - 104 * big, 10, 10, GOLD);
    // 打面(右)
    var hc = hitFx > 0 || fl ? '#ffffff' : CREAM;
    game.draw.rect(HEAD_X - 20, y - 110 * big, 40, 220 * big, hc);
    game.draw.rect(HEAD_X + 14, y - 110 * big, 10, 220 * big, '#d8c8a0');
    if (hitFx > 0) for (var w = 0; w < 3; w++) game.draw.circle(HEAD_X, y, 80 + w * 50 + (0.16 - hitFx) * 900, CREAM, 0.12);
    // 呼び出し
    var fr = (fin && !cleared) || sadT > 0 ? YOB_SAD : stickT > 0 ? YOB_DN : (holding ? YOB_UP : (Math.floor(t * 1.5) % 2 ? YOB_UP : YOB_DN));
    var hop = joyT > 0 ? -Math.abs(Math.sin(t * 10)) * 16 : 0;
    game.draw.sprite(fr, YOB_PAL, YOB_X, y - 10 + hop, 13, { anchor: 'center', flipX: true });
  }

  function drawPad(t) {
    var cx = W / 2, cy = 1680, pr = padT > 0 || holding;
    game.draw.rect(cx - 300, cy - 110, 600, 220, INK, 0.35);
    cube(cx, cy - 40, 120, pr ? GOLD : '#e8c88a', pr ? '#c8a050' : '#b8945a', pr ? '#a07830' : '#8a6a3a');
    game.draw.line(cx - 160, cy + 70, cx - 60, cy - 40 + (pr ? 20 : 0), '#d8b07a', 14);
    game.draw.line(cx + 160, cy + 70, cx + 60, cy - 40 + (pr ? 20 : 0), '#d8b07a', 14);
    if (!holding && stopT <= 0 && gapT <= 0 && !fin && Math.floor(t * 3) % 2 === 0) game.draw.rect(cx - 306, cy - 116, 612, 6, CREAM);
  }

  function drawHud(t) {
    var low = timeLeft < 5 && Math.floor(t * 6) % 2 === 0;
    game.draw.rect(60, 30, W - 120, 22, INK, 0.5);
    game.draw.rect(60, 30, (W - 120) * Math.max(0, timeLeft / TIME_LIMIT), 22, low ? MISSC : GOLD);
    for (var i = 0; i < NEEDED; i++) cube(W / 2 - 150 + i * 100, 104, 30, i < good ? GOLD : '#8a8aa0', i < good ? '#c8a020' : '#6a6a80', i < good ? '#a08010' : '#4a4a60');
    out(good + ' / ' + NEEDED, W / 2, 200, 40, CREAM);
    for (var m = 0; m < MAX_MISS; m++) game.draw.rect(60 + m * 54, 90, 40, 40, m < misses ? MISSC : '#3a3a50');
    out('' + score, W - 140, 130, 46, CREAM);
  }

  function drawScene(t) {
    drawWorld(t);
    drawTower(t);
    drawDrum(t);
    drawPad(t);
  }

  // ---- ATTRACT: 本物の pressDrum()/releaseDrum() で実演。4の札は4打で離してPERFECT、6の札は7打目まで押し続けて打ちすぎMISS ----
  var demo = { t: 0, x: W / 2 + 60, y: 1700, press: false, wait: 0, task: -1 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 6.5;
    if (cyc < dt || demo.t <= dt) { initGame(); readyT = 0; demo.wait = 0.6; demo.task = 0; }
    stepTower(dt);
    if (demo.task !== taskI) { demo.task = taskI; demo.wait = 0.5; }
    if (taskI <= 1 && stopT <= 0 && gapT <= 0) {
      if (!holding) {
        demo.wait -= dt;
        if (demo.wait <= 0 && strikes === 0) pressDrum();
      } else if (taskI === 0 && strikes === N && sinceHit > 0.06) releaseDrum();
    }
    demo.press = holding;
    demo.y += ((holding ? 1690 : 1640) - demo.y) * Math.min(1, dt * 12);
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;

    if (mode === S.ATTRACT) {
      stepDemo(dt);
      drawScene(t);
      game.draw.hand(demo.x, demo.y, { press: demo.press, scale: 13 });
      out(GAME_TITLE, W / 2, 110 + Math.sin(t * 2) * 6, 96, GOLD);
      out('HI-SCORE ' + game.best, W / 2, 190, 38, CREAM);
      if (Math.floor(t * 1.8) % 2 === 0) out('► 100円 投入 ◄', W / 2, H * 0.975, 46, GOLD);
      else out('TAP TO START', W / 2, H * 0.975, 40, CREAM);
      return;
    }

    if (mode === S.RESULT) {
      drawScene(t);
      game.draw.rect(90, H * 0.3, W - 180, 540, INK, 0.9);
      game.draw.rect(90, H * 0.3, W - 180, 10, cleared ? GOLD : MISSC);
      out(cleared ? 'CLEAR' : (endWhy === 'time' ? 'TIME UP' : 'GAME OVER'), W / 2, H * 0.35, 100, cleared ? GOLD : MISSC);
      out('SCORE ' + finalScore, W / 2, H * 0.41, 60, CREAM);
      out(good + ' / ' + NEEDED + '   PERFECT ' + perfects, W / 2, H * 0.46, 44, CREAM);
      if (cleared && finalScore > game.best) out('NEW RECORD', W / 2, H * 0.51, 56, GOLD);
      else out('BEST ' + Math.max(game.best, finalScore), W / 2, H * 0.51, 42, GOLD);
      if (!cleared) out('あと' + (NEEDED - good) + '枚!', W / 2, H * 0.27, 64, MISSC);
      if (Math.floor(t * 2) % 2 === 0) out('TAP TO CONTINUE', W / 2, H * 0.975, 40, CREAM);
      return;
    }

    // ---- PLAYING ----
    if (fin) {
      postT -= dt;
      stepTower(dt);
      if (postT <= 0) {
        mode = S.RESULT;
        var stats = { exact: good, perfect: perfects, hits: totalHits, misses: misses, plaques: taskI + 1 };
        if (cleared) game.end.success(finalScore, stats);
        else game.end.failure(stats);
      }
    } else if (readyT > 0) {
      readyT -= dt;
      if (readyT <= 0) game.audio.play('se_tap', 0.4);
    } else {
      if (stopT <= 0) timeLeft -= dt;
      stepTower(dt);
      if (!fin && timeLeft < 5) {
        warnT -= dt;
        if (warnT <= 0) { warnT = 0.5; game.audio.tone(timeLeft < 2 ? 'A5' : 'E5', 0.05, { wave: 'square', volume: 0.06 }); }
      }
      if (!fin && stopT <= 0 && timeLeft <= 0) {
        timeLeft = 0; endWhy = 'time';
        game.feedback.bad(W / 2, H * 0.3, { text: 'TIME UP', color: MISSC, size: 72 });
        ending(false);
      }
    }

    drawScene(t);
    drawHud(t);
    if (readyT > 0) out(readyT > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 120, GOLD);
  });

  function startBgm() {
    game.audio.melody([
      ['D5', 1], ['R', 0.5], ['F5', 0.5], ['G5', 1], ['A5', 1],
      ['C6', 0.5], ['A5', 0.5], ['G5', 1], ['F5', 2],
      ['D5', 1], ['R', 0.5], ['C5', 0.5], ['D5', 1], ['F5', 1],
      ['G5', 0.5], ['F5', 0.5], ['D5', 1], ['D5', 2],
    ], { tempo: 96, wave: 'square', volume: 0.035, loop: true, bass: [['D2', 2], ['D2', 2], ['A2', 2], ['A2', 2], ['G2', 2], ['F2', 2], ['A2', 2], ['D2', 2]] });
  }

  game.onStart(function() {
    startBgm();
    mode = S.ATTRACT;
    initGame();
  });
})(game);
