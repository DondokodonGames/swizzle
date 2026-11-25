// K-GBA-0011-cue-stroke-line.js
// キューストローク — 合図の太鼓に合わせて筆を一気に引き、まっすぐな線を書き切る
// 操作: 太鼓が鳴るまでは触れずに待ち、鳴った瞬間に始点から終点まで一気に指をまっすぐ引く
// 終わり: 4本すべて合図通り・線通りに引き切れば成功。早触り/脱線/時間切れは失敗
// @mechanic: slice
// @theme: ink_dojo_stroke
// 世界観: 墨一色の書道道場。太鼓の合図ぴったりに筆を構え、一気に一本の線を引き切る一発勝負
// 残るもの: 正誤(CLEAR/GAME OVER) + 引き切った本数
// スタイル: 1BIT INK

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 1BIT INK: 墨(黒)と紙(白)の二値基調、差し色は朱の一色のみ
  var C = {
    bg: '#f2ead8', bg2: '#e8dcc0', ink: '#1a1410', inkFaint: '#1a141030',
    paper: '#faf4e6', red: '#c02818', good: '#1a6a3a', bad: '#c02818',
    gold: '#c02818', white: '#1a1410',
  };

  var GAME_TITLE = 'CUE STROKE';
  var TOTAL = 4;
  var LINES = [
    { ax: W * 0.5, ay: H * 0.60, bx: W * 0.5, by: H * 0.34 },
    { ax: W * 0.32, ay: H * 0.47, bx: W * 0.68, by: H * 0.47 },
    { ax: W * 0.34, ay: H * 0.60, bx: W * 0.66, by: H * 0.34 },
    { ax: W * 0.66, ay: H * 0.60, bx: W * 0.34, by: H * 0.34 },
  ];
  var TOL = 60;
  var STROKE_TIME = 0.9;
  var TELE = 0.65;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var drawn, done, endWait, finished, ready, hitStop, shake, round, phase, phaseT, curLine, strokeT, touching;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: '#00000030', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function distToSeg(px, py, ax, ay, bx, by) {
    var vx = bx - ax, vy = by - ay;
    var wx = px - ax, wy = py - ay;
    var len2 = vx * vx + vy * vy;
    var t = len2 > 0 ? Math.max(0, Math.min(1, (wx * vx + wy * vy) / len2)) : 0;
    return Math.hypot(px - (ax + vx * t), py - (ay + vy * t));
  }

  var MONK = ['.##.', '####', '.##.', '####', '#.##'];
  function bg() {
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    game.draw.sprite(MONK, { '#': C.ink }, W * 0.5, H * 0.86, 18, { anchor: 'center' });
    game.draw.rect(W * 0.5 - 320, H * 0.30, 640, 340, C.paper);
    game.draw.rect(W * 0.5 - 320, H * 0.30, 640, 8, C.ink, 0.3);
  }

  function initGame() {
    drawn = 0; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; round = 0;
    curLine = LINES[0]; phase = 'wait'; phaseT = TELE; strokeT = 0; touching = false;
  }

  function failStroke(x, y) {
    hitStop = 0.32;
    game.feedback.bad(x, y, { text: 'MISS' });
    shake = 0.3;
    game.audio.play('se_bad', 0.4);
    ok = false; finished = true; finish();
  }

  function successStroke() {
    drawn++;
    hitStop = 0.1;
    game.feedback.good(curLine.bx, curLine.by, { text: 'GOOD', color: C.good });
    game.fx.burst(curLine.bx, curLine.by, { color: C.red, count: 14, speed: 300 });
    game.audio.play('se_good', 0.4);
    if (drawn === Math.ceil(TOTAL / 2)) game.fx.popup('HALFWAY!', W / 2, H * 0.24, { color: C.red, size: 36 });
    if (drawn >= TOTAL) { ok = true; finished = true; finish(); return; }
    round++;
    curLine = LINES[round % LINES.length];
    phase = 'wait'; phaseT = TELE; strokeT = 0; touching = false;
  }

  game.onPress(function(x, y) {
    if (state !== S.PLAYING || ready > 0 || done || finished) return;
    if (phase === 'wait') { failStroke(x, y); return; }
    if (phase === 'go') {
      var d = Math.hypot(x - curLine.ax, y - curLine.ay);
      if (d > TOL) { failStroke(x, y); return; }
      touching = true;
      game.audio.play('se_tap', 0.2);
    }
  });
  game.onMove(function(x, y) {
    if (state !== S.PLAYING || phase !== 'go' || !touching || finished) return;
    var d = distToSeg(x, y, curLine.ax, curLine.ay, curLine.bx, curLine.by);
    if (d > TOL) { failStroke(x, y); return; }
    var dist = Math.hypot(x - curLine.bx, y - curLine.by);
    if (dist < TOL) successStroke();
  });
  game.onRelease(function() { touching = false; });

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function drawLine(l, prog) {
    game.draw.line(l.ax, l.ay, l.bx, l.by, C.ink, 3);
    if (prog !== undefined) {
      var ex = l.ax + (l.bx - l.ax) * prog, ey = l.ay + (l.by - l.ay) * prog;
      game.draw.line(l.ax, l.ay, ex, ey, C.red, 16);
    }
    var readyBlink = phase === 'wait' && phaseT < 0.35 && Math.floor(game.time.elapsed * 10) % 2 === 0;
    game.draw.circle(l.ax, l.ay, readyBlink ? 26 : 18, C.red);
    game.draw.circle(l.bx, l.by, 14, C.inkFaint);
  }

  var demo = { t: 0, gx: 0, gy: 0, press: false, phase: 'wait', phaseT: TELE, prog: 0, line: LINES[0] };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % (TELE + STROKE_TIME + 0.5);
    if (cyc < dt || demo.t <= dt) { demo.phase = 'wait'; demo.prog = 0; demo.line = LINES[0]; demo.gx = demo.line.ax; demo.gy = demo.line.ay; demo.press = false; }
    if (demo.phase === 'wait') {
      demo.gx = demo.line.ax; demo.gy = demo.line.ay; demo.press = false;
      if (cyc >= TELE) {
        demo.phase = 'go'; demo.strokeStart = cyc;
        game.audio.play('se_tap', 0.2);
      }
    } else if (demo.phase === 'go') {
      var p = Math.min(1, (cyc - demo.strokeStart) / STROKE_TIME);
      demo.prog = p;
      demo.gx = demo.line.ax + (demo.line.bx - demo.line.ax) * p;
      demo.gy = demo.line.ay + (demo.line.by - demo.line.ay) * p;
      demo.press = true;
      if (p >= 1) {
        game.feedback.good(demo.line.bx, demo.line.by, { text: 'GOOD', color: C.good });
        game.audio.play('se_good', 0.25);
        demo.phase = 'hold';
      }
    }
    curLine = demo.line;
    phase = demo.phase === 'go' ? 'go' : 'wait';
    phaseT = demo.phase === 'wait' ? (TELE - cyc) : 0;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      bg();
      stepDemo(dt);
      drawLine(demo.line, demo.phase === 'go' || demo.phase === 'hold' ? demo.prog : undefined);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.10, 42, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.14, 22, C.red);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.92, 40, C.red);
      } else {
        txt('INSERT COIN', W / 2, H * 0.92, 28, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawLine(curLine || LINES[0]);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.10, 48, ok ? C.good : C.bad);
      txt(drawn + ' / ' + TOTAL, W / 2, H * 0.15, 30, C.red);
      if (!ok) txt('あと' + (TOTAL - drawn) + '本!', W / 2, H * 0.20, 26, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.92, 26, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(drawn, { drawn: drawn, total: TOTAL });
        else game.end.failure({ drawn: drawn, total: TOTAL });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      if (phase === 'wait') {
        phaseT -= dt;
        if (phaseT <= 0) { phase = 'go'; strokeT = 0; }
      } else if (phase === 'go') {
        strokeT += dt;
        if (strokeT >= STROKE_TIME) { failStroke(curLine.bx, curLine.by); }
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    if (!finished) drawLine(curLine, phase === 'go' && touching ? Math.min(1, strokeT / STROKE_TIME) : undefined);

    txt(drawn + ' / ' + TOTAL, W / 2, H * 0.24, 28, C.ink);
    game.draw.rect(W * 0.5 - 300, H * 0.90, 600, 14, C.ink, 0.2);
    game.draw.rect(W * 0.5 - 300, H * 0.90, 600 * (drawn / TOTAL), 14, C.red);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.72, 54, C.red);
  });

  game.onStart(function() {
    game.audio.melody([['C4', 0.4], ['C4', 0.4]], { tempo: 90, wave: 'sine', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
