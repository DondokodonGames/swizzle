// K-DS-0060-crowd-clap-sync.js
// 客席手拍子合わせ — 周りの手拍子に合わせて正確に打ち、指揮の合図でぴったり止める
// 操作: 観客の手が上がる拍のタイミングでタップし続け、指揮者が手を止めた瞬間には自分も止める(押さない)
// 終わり: 規定拍数(12拍)を正確に打ち切り、最後の静止指示でも打たずに終われば成功。3回ズレれば失敗
// @mechanic: count_exact
// @theme: crowd_clap_sync
// 世界観: 満員の客席。声援を送る観客の一人が、周りの手拍子にぴったり合わせて打ち続け、指揮者の静止合図が出た瞬間だけ手を止めてみせる
// 残るもの: 正誤(拍手成功/浮いた手拍子)+ 合わせられた拍数
// スタイル: 2000s ARCADE POP

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2000s ARCADE POP: 彩度高めのグラデ、丸みのある太い縁、白ハイライト
  var C = {
    bg: '#ff8a3a', bg2: '#ff5a7a', crowdA: '#ffd23a', crowdB: '#3ad8ff',
    good: '#3affa0', bad: '#ff3a5a', gold: '#fff23a', white: '#ffffff', ink: '#2a0a10',
  };

  var GAME_TITLE = 'CLAP SYNC';
  var TOTAL = 12;
  var MAX_MISS = 3;
  var CX = W * 0.5, ROW_Y = H * 0.44;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var claps, miss, done, endWait, finished;
  var ready, hitStop, shake;
  var beatT, beatDur, beatPhase, stopSignal, stopHandled;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var FAN = ['..##..', '.####.', '..##..', '.####.', '#.##.#'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    for (var r = 0; r < 3; r++) {
      for (var i = 0; i < 6; i++) {
        var x = W * (0.1 + i * 0.16);
        var y = H * (0.7 + r * 0.09);
        game.draw.circle(x, y, 20, (i + r) % 2 === 0 ? C.crowdA : C.crowdB, 0.5);
      }
    }
  }

  function nextBeatDur() {
    return 0.62;
  }

  function initGame() {
    claps = 0; miss = 0; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
    beatT = 0; beatDur = nextBeatDur(); beatPhase = 0;
    stopSignal = false; stopHandled = false;
  }

  function isStopRound() { return claps === TOTAL - 1; } // 最後の1拍は「止め」の指示

  function clap() {
    if (ready > 0 || done || hitStop > 0 || finished) return;
    game.audio.play('se_tap', 0.05);
    var inWindow = beatPhase > 0.3 && beatPhase < 0.7;
    if (isStopRound()) {
      // 止めの合図で叩いたら失敗(浮いた手拍子)
      miss++;
      hitStop = 0.28;
      game.feedback.bad(CX, ROW_Y, { text: 'MISS' });
      shake = 0.24;
      game.audio.play('se_bad', 0.4);
      if (miss >= MAX_MISS) { ok = false; finished = true; finish(); }
      else { beatT = 0; }
      return;
    }
    if (inWindow) {
      claps++;
      hitStop = 0.06;
      game.feedback.good(CX, ROW_Y, { text: 'GOOD', color: C.good });
      game.fx.burst(CX, ROW_Y, { color: C.gold, count: 10, speed: 240 });
      game.audio.play('se_good', 0.28);
      if (claps === Math.ceil(TOTAL / 2)) game.fx.popup('HALFWAY!', CX, ROW_Y - 220, { color: C.gold, size: 40 });
      beatT = 0;
    } else {
      miss++;
      hitStop = 0.24;
      game.feedback.bad(CX, ROW_Y, { text: 'MISS' });
      shake = 0.2;
      game.audio.play('se_bad', 0.4);
      beatT = 0;
      if (miss >= MAX_MISS) { ok = false; finished = true; finish(); }
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) clap();
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function drawConductor() {
    var raised = isStopRound();
    game.draw.circle(CX, ROW_Y - 40, 56, raised ? C.bad : C.white, 0.85);
    game.draw.sprite(FAN, { '#': C.ink }, CX, ROW_Y - 40, 22, { anchor: 'center' });
    if (raised) txt('STOP', CX, ROW_Y - 130, 30, C.white);
  }

  function drawHandsMeter(phase, stop) {
    var blink = phase > 0.3 && phase < 0.7 && Math.floor(game.time.elapsed * 12) % 2 === 0;
    var col = stop ? C.bad : (blink ? C.gold : '#ffffff44');
    game.draw.circle(CX, ROW_Y + 220, 70, col);
  }

  var demo = { t: 0, gx: CX, gy: ROW_Y + 220, press: false, bt: 0, bd: 0.62, n: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 5.2;
    if (cyc < dt || demo.t <= dt) { demo.bt = 0; demo.n = 0; demo.struck = false; }
    demo.bt += dt;
    var p = demo.bt / demo.bd;
    beatPhase = Math.min(1, p);
    var stopNow = demo.n >= 6;
    claps = Math.min(TOTAL - 1, demo.n);
    if (p > 0.3 && p < 0.7 && !demo.struck) {
      demo.struck = true;
      demo.press = !stopNow;
      if (!stopNow) {
        game.audio.play('se_good', 0.16);
        demo.n++;
      }
    }
    if (p >= 1) { demo.bt = 0; demo.struck = false; demo.press = false; }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      bg();
      stepDemo(dt);
      drawConductor();
      drawHandsMeter(beatPhase, claps >= 6);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 22 });
      txt(GAME_TITLE, W / 2, H * 0.08, 44, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.white);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawConductor();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      txt(claps + ' / ' + (TOTAL - 1), W / 2, H * 0.13, 32, C.gold);
      if (!ok) txt('あと' + Math.max(0, (TOTAL - 1) - claps) + '拍!', W / 2, H * 0.18, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(claps, { claps: claps, total: TOTAL - 1 });
        else game.end.failure({ claps: claps, miss: miss });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      beatT += dt;
      beatPhase = Math.min(1, beatT / beatDur);
      if (beatPhase >= 1) {
        if (isStopRound()) {
          // 止めの合図を無事にやり過ごせた = クリア
          ok = true; finished = true; finish();
        } else {
          miss++;
          hitStop = 0.24;
          game.feedback.bad(CX, ROW_Y, { text: 'MISS' });
          shake = 0.2;
          game.audio.play('se_bad', 0.4);
          beatT = 0;
          if (miss >= MAX_MISS) { ok = false; finished = true; finish(); }
        }
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawConductor();
    drawHandsMeter(finished ? 0 : beatPhase, isStopRound());

    txt(claps + ' / ' + (TOTAL - 1), W / 2, H * 0.06, 32, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.4);
    game.draw.rect(60, 150, (W - 120) * (claps / (TOTAL - 1)), 16, C.gold);
    for (var mi = 0; mi < MAX_MISS; mi++) {
      game.draw.circle(W - 70 - mi * 44, 200, 14, mi < miss ? C.bad : '#ffffff33');
    }
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.62, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['C4', 0.25], ['C4', 0.25], ['G4', 0.25], ['G4', 0.25]], { tempo: 145, wave: 'square', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
