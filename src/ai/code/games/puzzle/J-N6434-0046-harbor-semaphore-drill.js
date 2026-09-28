// J-N6434-0046-harbor-semaphore-drill.js
// 港の腕木信号ドリル — 沖の灯台が光らせた腕木の手順を覚え、同じ順に信号柱の腕木を上げ続けて船を港まで導く
// 操作: 灯台の十字灯が上下左右の順に光るのを見て、終わったら下の4つの信号ボタンを同じ順にタップする
// 終わり: 3回の手順(3→4→5手)を1つも間違えずに返せばCLEAR。間違い/3秒迷う/時間切れでGAME OVER
// @mechanic: memory_sequence
// @theme: harbor_semaphore_drill
// 世界観: 霧の夜の港で信号所の見習い手旗番が、沖の灯台が送る腕木信号の手順を一手も違えずに返し続け、入港待ちの貨物船を桟橋まで誘導しきる
// 残るもの: 正誤(CLEAR/GAME OVER) + 正しく返した手数
// スタイル: 70s VECTOR
var STYLE = { bg: ['#02060f', '#08142a'], main: ['#6ff7ff', '#ffffff', '#1a3a55'], accent: ['#ffe066', '#ff4f6d'] };

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg1: '#02060f', bg2: '#08142a', cyan: '#6ff7ff', dim: '#1a3a55', white: '#ffffff', yellow: '#ffe066', red: '#ff4f6d', green: '#7dff9a',
  };

  var GAME_TITLE = 'SIGNAL DRILL';
  var TIME_LIMIT = 20;
  var NEEDED = 12; // 3+4+5 手
  var ROUNDS = [3, 4, 5];
  var WAIT_LIMIT = 3;
  var DIRS = ['up', 'right', 'down', 'left'];
  var DV = { up: [0, -1], right: [1, 0], down: [0, 1], left: [-1, 0] };
  var LAMP_X = W * 0.5, LAMP_Y = H * 0.25;
  var MAST_X = W * 0.5, MAST_Y = H * 0.56;
  var PAD_C = { x: W * 0.5, y: H * 0.83 };
  var PAD_OFF = 200;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var SHIP = [
    '.....c......',
    '.....cc.....',
    '.....ccc....',
    '.....c......',
    'cccccccccccc',
    '.cccccccccc.',
    '..cccccccc..',
  ];
  var TOWER = ['..yy..', '.yyyy.', '..cc..', '..cc..', '.cccc.', '.c..c.', 'cccccc'];
  var KEEPER = ['..cc..', '..cc..', 'cccccc', '..cc..', '..cc..', '.c..c.', 'c....c'];

  var seq, round, phase, pt, idx, wait, done, timeLeft, ready, hitStop, focus, pendingEnd, finished, ok, endWait;
  var lampDir, lampT, armDir, armT, shipX, padFlash;

  function newSeq() {
    seq = [];
    for (var i = 0; i < ROUNDS[ROUNDS.length - 1]; i++) {
      var d = DIRS[Math.floor(game.random(0, 3.99))];
      if (i > 0 && d === seq[i - 1] && game.random(0, 1) < 0.6) d = DIRS[(DIRS.indexOf(d) + 1) % 4];
      seq.push(d);
    }
  }

  function initGame() {
    newSeq();
    round = 0; phase = 'gap'; pt = 0.4; idx = 0; wait = 0; done = 0;
    timeLeft = TIME_LIMIT; ready = 0.8; hitStop = 0; focus = null; pendingEnd = null;
    finished = false; ok = false; endWait = 0;
    lampDir = ''; lampT = 0; armDir = ''; armT = 0; shipX = W * 0.14; padFlash = { up: 0, right: 0, down: 0, left: 0 };
  }

  function txt(str, x, y, sz, color) {
    game.draw.text(str, x, y, { size: sz, color: C.dim, bold: true, align: 'center', font: 'monospace' });
    game.draw.text(str, x - 2, y - 2, { size: sz, color: color, bold: true, align: 'center', font: 'monospace' });
  }

  function ring(x, y, r, color, width) {
    game.draw.circle(x, y, r, color, 0.9);
    game.draw.circle(x, y, r - (width || 6), C.bg2);
  }

  function padPos(d) { return { x: PAD_C.x + DV[d][0] * PAD_OFF, y: PAD_C.y + DV[d][1] * PAD_OFF * 0.62 }; }

  function stepShow(dt, demoMode) {
    var len = ROUNDS[round];
    var stepT = round === 2 ? 0.42 : 0.52;
    pt -= dt;
    if (phase === 'gap') {
      if (pt <= 0) { phase = 'show'; idx = 0; pt = stepT; lampDir = seq[0]; lampT = stepT * 0.75; game.audio.tone(noteFor(seq[0]), 0.18, { wave: 'sine', volume: 0.1 }); }
    } else if (phase === 'show') {
      if (pt <= 0) {
        idx++;
        if (idx >= len) { phase = 'input'; idx = 0; wait = WAIT_LIMIT; lampDir = ''; game.audio.play('se_tap', 0.2); }
        else { pt = stepT; lampDir = seq[idx]; lampT = stepT * 0.75; game.audio.tone(noteFor(seq[idx]), 0.18, { wave: 'sine', volume: 0.1 }); }
      }
    } else if (phase === 'input') {
      wait -= dt;
      if (wait <= 0) {
        if (demoMode) { wait = WAIT_LIMIT; return; }
        focus = { dir: seq[idx] }; hitStop = 0.5; pendingEnd = 'fail'; finished = true;
        game.audio.play('se_break', 0.4);
      }
    }
  }

  function noteFor(d) { return d === 'up' ? 'E5' : d === 'right' ? 'G5' : d === 'down' ? 'C5' : 'A4'; }

  function signal(d, demoMode) {
    if (phase !== 'input') { game.audio.play('se_tap', 0.08); padFlash[d] = 0.12; return; }
    padFlash[d] = 0.25; armDir = d; armT = 0.3;
    if (d === seq[idx]) {
      done++; idx++; wait = WAIT_LIMIT;
      game.audio.tone(noteFor(d), 0.14, { wave: 'square', volume: 0.08 });
      var p = padPos(d);
      game.feedback.good(p.x, p.y - 90, { text: 'GOOD', color: C.green, count: 8, volume: 0.25 });
      if (idx >= ROUNDS[round]) {
        round++;
        shipX = W * 0.14 + (W * 0.62) * (round / ROUNDS.length);
        if (round >= ROUNDS.length) {
          if (!demoMode) { focus = { ship: true }; hitStop = 0.45; pendingEnd = 'clear'; finished = true; }
          else { round = 0; phase = 'gap'; pt = 0.6; }
        } else {
          game.audio.play('se_milestone', 0.4);
          game.fx.popup('NICE', W / 2, H * 0.42, { color: C.yellow, size: 64 });
          phase = 'gap'; pt = 0.7;
        }
      }
    } else {
      var q = padPos(d);
      if (demoMode) { game.feedback.bad(q.x, q.y - 90, { text: 'MISS', shake: 4 }); round = 0; phase = 'gap'; pt = 0.9; shipX = W * 0.14; return; }
      focus = { dir: seq[idx], wrong: d }; hitStop = 0.5; pendingEnd = 'fail'; finished = true;
      game.audio.play('se_break', 0.4);
    }
  }

  function drawBg(pulse) {
    game.draw.gradient(0, H, [[0, C.bg1], [0.5, C.bg2], [1, C.bg1]]);
    game.draw.rect(0, 0, W, H, C.cyan, pulse);
    // 星と海の走査線
    for (var s = 0; s < 14; s++) {
      var tw = 0.4 + 0.5 * Math.sin(game.time.elapsed * 2 + s * 1.7);
      game.draw.circle((s * 173) % W, H * 0.12 + (s * 97) % (H * 0.2), 3, C.white, tw);
    }
    var seaY = H * 0.44;
    for (var l = 0; l < 6; l++) {
      var y = seaY + l * 28;
      var off = Math.sin(game.time.elapsed * 1.5 + l) * 30;
      game.draw.line(0, y + off * 0.2, W, y - off * 0.2, C.dim, 3);
    }
    // 港の桟橋
    game.draw.line(W * 0.8, seaY + 20, W * 0.98, seaY + 20, C.cyan, 4);
    game.draw.line(W * 0.82, seaY + 20, W * 0.82, seaY + 80, C.cyan, 4);
    game.draw.line(W * 0.94, seaY + 20, W * 0.94, seaY + 80, C.cyan, 4);
    // 灯台
    var bob = Math.sin(game.time.elapsed * 1.1) * 4;
    game.draw.sprite(TOWER, { y: C.yellow, c: C.cyan }, W * 0.14, LAMP_Y + 60 + bob, 18, { anchor: 'center' });
  }

  function drawLamp() {
    var sway = Math.sin(game.time.elapsed * 1.7) * 3;
    ring(LAMP_X + sway, LAMP_Y, 60, C.cyan, 5);
    for (var i = 0; i < 4; i++) {
      var d = DIRS[i];
      var on = lampDir === d && lampT > 0;
      var hl = focus && focus.dir === d;
      var ex = LAMP_X + sway + DV[d][0] * 150, ey = LAMP_Y + DV[d][1] * 150;
      game.draw.line(LAMP_X + sway + DV[d][0] * 60, LAMP_Y + DV[d][1] * 60, ex, ey, on || hl ? C.yellow : C.dim, on || hl ? 14 : 6);
      if (on || hl) {
        game.draw.circle(ex, ey, 44, C.yellow, 0.9);
        game.draw.circle(ex, ey, 90, C.yellow, 0.2);
      } else {
        ring(ex, ey, 30, C.dim, 4);
      }
    }
  }

  function drawMast(pose) {
    var bob = Math.sin(game.time.elapsed * 2.3) * 5;
    game.draw.line(MAST_X, MAST_Y - 110, MAST_X, MAST_Y + 150, C.cyan, 6);
    for (var i = 0; i < 4; i++) {
      var d = DIRS[i];
      var up = armDir === d && armT > 0;
      var len = up ? 150 : 70;
      game.draw.line(MAST_X, MAST_Y - 40, MAST_X + DV[d][0] * len, MAST_Y - 40 + DV[d][1] * len, up ? C.yellow : C.dim, up ? 12 : 5);
    }
    var jump = pose === 'cheer' ? -Math.abs(Math.sin(game.time.elapsed * 7)) * 50 : 0;
    game.draw.sprite(KEEPER, { c: pose === 'down' ? C.red : C.cyan }, MAST_X + 150, MAST_Y + 110 + bob + jump, 14, { anchor: 'center', flipY: pose === 'down' });
    // 船
    var sb = Math.sin(game.time.elapsed * 2) * 6;
    var hl = focus && focus.ship;
    if (hl) game.draw.circle(shipX, H * 0.46, 130, C.white, 0.3);
    game.draw.sprite(SHIP, { c: hl ? C.white : C.cyan }, shipX, H * 0.46 + sb, 14, { anchor: 'center' });
  }

  function drawPads(active) {
    for (var i = 0; i < 4; i++) {
      var d = DIRS[i];
      var p = padPos(d);
      var lit = padFlash[d] > 0 || (lampDir === d && lampT > 0);
      var hl = focus && (focus.dir === d || focus.wrong === d);
      var col = hl ? (focus.wrong === d ? C.red : C.yellow) : lit ? C.yellow : (active ? C.cyan : C.dim);
      if (active && !lit && !hl) game.draw.circle(p.x, p.y, 104, C.cyan, 0.08 + 0.06 * Math.sin(game.time.elapsed * 4));
      ring(p.x, p.y, 86, col, lit || hl ? 12 : 6);
      // 矢印(線画)
      var ax = DV[d][0], ay = DV[d][1];
      game.draw.line(p.x - ax * 36, p.y - ay * 36, p.x + ax * 36, p.y + ay * 36, col, 8);
      game.draw.line(p.x + ax * 36, p.y + ay * 36, p.x + ax * 10 - ay * 24, p.y + ay * 10 - ax * 24, col, 8);
      game.draw.line(p.x + ax * 36, p.y + ay * 36, p.x + ax * 10 + ay * 24, p.y + ay * 10 + ax * 24, col, 8);
    }
  }

  function drawHud() {
    for (var i = 0; i < NEEDED; i++) {
      var x = W * 0.08 + i * 60;
      if (i < done) game.draw.circle(x, H * 0.045, 18, C.green);
      else ring(x, H * 0.045, 18, C.dim, 4);
    }
    txt(done + '/' + NEEDED, W * 0.87, H * 0.045, 46, C.cyan);
    var frac = Math.max(0, timeLeft / TIME_LIMIT);
    var low = timeLeft < 4 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.line(60, H * 0.085, W - 60, H * 0.085, C.dim, 10);
    game.draw.line(60, H * 0.085, 60 + (W - 120) * frac, H * 0.085, low ? C.red : C.cyan, 10);
    if (phase === 'input' && !finished) {
      // 迷い時間の収縮リング
      var wf = Math.max(0, wait / WAIT_LIMIT);
      game.draw.circle(PAD_C.x, PAD_C.y, 60 * wf + 6, wf < 0.35 ? C.red : C.yellow, 0.7);
      game.draw.circle(PAD_C.x, PAD_C.y, Math.max(0, 60 * wf - 2), C.bg2);
    }
  }

  // ── ATTRACTデモ: 1回目は正しく返し、2回目は3手目をわざと間違える ──
  var demo = { t: 0, gx: W / 2, gy: H * 0.8, press: false, next: 0, tries: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 9;
    if (cyc < dt || demo.t <= dt) { initGame(); ready = 0; demo.tries = 0; demo.next = 0; }
    timers(dt);
    stepShow(dt, true);
    var target = phase === 'input' ? padPos(seq[idx]) : { x: PAD_C.x, y: PAD_C.y };
    var wrongOne = phase === 'input' && round === 1 && idx === 2 && demo.tries === 0;
    if (wrongOne) target = padPos(DIRS[(DIRS.indexOf(seq[idx]) + 1) % 4]);
    demo.gx += (target.x - demo.gx) * Math.min(1, dt * 12);
    demo.gy += (target.y - demo.gy) * Math.min(1, dt * 12);
    demo.next -= dt;
    demo.press = phase === 'input' && demo.next < 0.1;
    if (phase === 'input' && demo.next <= 0 && Math.hypot(target.x - demo.gx, target.y - demo.gy) < 30) {
      demo.next = 0.34;
      var d = wrongOne ? DIRS[(DIRS.indexOf(seq[idx]) + 1) % 4] : seq[idx];
      if (wrongOne) demo.tries = 1;
      signal(d, true);
    }
  }

  function timers(dt) {
    if (lampT > 0) lampT -= dt;
    if (armT > 0) armT -= dt;
    for (var i = 0; i < 4; i++) if (padFlash[DIRS[i]] > 0) padFlash[DIRS[i]] -= dt;
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.4); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state !== S.PLAYING || finished || ready > 0) return;
    var best = null, bd = 1e9;
    for (var i = 0; i < 4; i++) {
      var p = padPos(DIRS[i]);
      var dd = Math.hypot(x - p.x, y - p.y);
      if (dd < bd) { bd = dd; best = DIRS[i]; }
    }
    if (best && bd < 150) {
      signal(best, false);
    } else {
      game.audio.play('se_tap', 0.06);
      game.fx.burst(x, y, { color: C.dim, count: 3, speed: 120 });
    }
  });

  function finishNow() {
    if (pendingEnd === 'clear') {
      ok = true;
      game.feedback.good(shipX, H * 0.42, { text: 'CLEAR', color: C.yellow, count: 30 });
      game.audio.play('se_success', 0.6);
    } else {
      ok = false;
      var p = focus && focus.dir ? padPos(focus.dir) : { x: W / 2, y: H * 0.6 };
      game.feedback.bad(p.x, p.y - 100, { text: pendingEnd === 'time' ? 'TIME UP' : 'MISS' });
      game.audio.play('se_failure', 0.6);
    }
    endWait = 1.2; pendingEnd = null;
  }

  game.onUpdate(function(dt) {
    var pulse = 0.015 + 0.015 * Math.sin(game.time.elapsed * 1.3);

    if (state === S.ATTRACT) {
      if (seq === undefined) initGame();
      stepDemo(dt);
      drawBg(pulse);
      drawLamp();
      drawMast('');
      drawPads(phase === 'input');
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 14 });
      txt(GAME_TITLE, W / 2, H * 0.045, 78, C.cyan);
      txt('BEST ' + (game.best || 0), W / 2, H * 0.095, 38, C.yellow);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.97, 44, C.yellow);
      else txt('INSERT COIN', W / 2, H * 0.97, 40, C.cyan);
      return;
    }

    if (state === S.RESULT) {
      timers(dt);
      drawBg(pulse);
      drawLamp();
      drawMast(ok ? 'cheer' : 'down');
      if (ok && Math.floor(game.time.elapsed * 5) % 2 === 0) game.fx.burst(game.random(W * 0.2, W * 0.8), H * 0.2, { color: C.yellow, count: 4 });
      game.draw.rect(0, H * 0.62, W, H * 0.3, C.bg1, 0.9);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.67, 100, ok ? C.green : C.red);
      txt(done + '/' + NEEDED, W / 2, H * 0.74, 64, C.cyan);
      if (ok && done > (game.best || 0)) txt('NEW RECORD', W / 2, H * 0.8, 50, C.yellow);
      else txt('BEST ' + (game.best || 0), W / 2, H * 0.8, 42, C.white);
      if (!ok) txt('あと' + (NEEDED - done) + '手!', W / 2, H * 0.85, 46, C.yellow);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.97, 40, C.cyan);
      return;
    }

    if (endWait > 0) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(done, { steps: done, rounds: round });
        else game.end.failure({ steps: done, rounds: round });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
      if (hitStop <= 0) finishNow();
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_jump', 0.3);
    } else if (!finished) {
      timeLeft -= dt;
      timers(dt);
      stepShow(dt, false);
      if (!finished && timeLeft <= 0) {
        timeLeft = 0; finished = true; pendingEnd = 'time'; hitStop = 0.45; focus = null;
        game.fx.popup('TIME UP', W / 2, H * 0.45, { color: C.red, size: 80 });
      }
    }

    drawBg(pulse);
    drawLamp();
    drawMast('');
    drawPads(phase === 'input' && !finished);
    drawHud();
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.42, 110, C.yellow);
  });

  game.onStart(function() {
    game.audio.melody([
      ['A3', 1], ['E4', 1], ['C4', 1], ['G3', 1], ['F3', 1], ['C4', 1], ['E4', 2],
    ], { tempo: 84, wave: 'sine', volume: 0.06, loop: true, bass: [['A2', 4], ['F2', 4]] });
    state = S.ATTRACT;
    initGame();
  });
})(game);
