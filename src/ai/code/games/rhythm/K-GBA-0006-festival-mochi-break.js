// K-GBA-0006-festival-mochi-break.js
// もちわり合わせ — 左手で的を支え続け、合図の太鼓に合わせて右手で叩き割る
// 操作: 左半分を指で押さえ続けたまま、太鼓が鳴った瞬間に右半分をタップして振り下ろす
// 終わり: 5回すべて息を合わせて叩き割れば成功。左手を離す/右手の拍を外すと失敗
// @mechanic: coop_2zone
// @theme: festival_target_break
// 世界観: 縁日の的割りブース。相方役の左手で的を支え続けたまま、右手を太鼓の合図ぴったりに振り下ろして割る
// 残るもの: 正誤(CLEAR/GAME OVER) + 割れた回数
// スタイル: TOON SHADE

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // TOON SHADE: 太い黒アウトライン+平坦な塗り、彩度高めの3色+アクセント2色
  var C = {
    bg: '#3a2a1a', bg2: '#241608', mat: '#c8862a', matDark: '#7a5218',
    left: '#4a9cff', right: '#ff6a3a', target: '#f0e0b0', targetDark: '#a08048',
    good: '#3dff8a', bad: '#ff3d5a', gold: '#ffe600', white: '#fff6e0', ink: '#100a04',
  };

  var GAME_TITLE = 'FESTIVAL BREAK';
  var TOTAL = 5;
  var BEAT = 3.2;
  var WIN = 0.28;
  var LX = W * 0.26, RX = W * 0.74, ZY = H * 0.46, ZR = 170;
  var GRACE = 0.7;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var broken, done, endWait, finished, ready, hitStop, shake, beatIdx, beatStart, resolvedThis;
  var holdingLeft, leftTouchId, graceT, started;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    game.draw.rect(0, H * 0.62, W, H * 0.38, C.matDark);
    game.draw.rect(0, H * 0.62, W, 10, C.mat);
    game.draw.line(W * 0.5, H * 0.20, W * 0.5, H * 0.62, C.matDark, 6);
  }

  function beatTime(i) { return GRACE + 0.6 + i * BEAT; }

  function initGame() {
    broken = 0; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; beatIdx = 0; beatStart = beatTime(0); resolvedThis = false;
    holdingLeft = false; leftTouchId = null; graceT = GRACE; started = false;
  }

  function failNow(x, y, reason) {
    hitStop = 0.32;
    game.feedback.bad(x, y, { text: reason === 'drop' ? 'MISS' : 'MISS' });
    shake = 0.3;
    game.audio.play('se_bad', 0.4);
    ok = false; finished = true; finish();
  }

  function successBreak() {
    broken++;
    hitStop = 0.12;
    game.feedback.good(RX, ZY, { text: 'BREAK!', color: C.good });
    game.fx.burst((LX + RX) / 2, ZY, { color: C.gold, count: 20, speed: 360 });
    game.audio.play('se_break', 0.45);
    if (broken === Math.ceil(TOTAL / 2)) game.fx.popup('HALFWAY!', W / 2, ZY - 220, { color: C.gold, size: 40 });
    if (broken >= TOTAL) { ok = true; finished = true; finish(); return; }
    beatIdx++;
    beatStart = beatTime(beatIdx);
    resolvedThis = false;
  }

  function tryStrike(x, y) {
    if (ready > 0 || done || finished || resolvedThis) return;
    if (!holdingLeft) { failNow(x, y, 'drop'); return; }
    var t = game.time.elapsed - beatStart;
    resolvedThis = true;
    if (Math.abs(t) <= WIN) successBreak();
    else failNow(x, y, 'timing');
  }

  game.onPress(function(x, y, id) {
    if (state === S.ATTRACT) return;
    if (state === S.RESULT) return;
    if (state !== S.PLAYING) return;
    if (x < W * 0.5) {
      leftTouchId = id; holdingLeft = true; started = true;
      game.fx.popup('HOLD', LX, ZY - 120, { color: C.left, size: 26 });
      game.audio.play('se_tap', 0.2);
    } else {
      tryStrike(x, y);
    }
  });

  game.onRelease(function(x, y, id) {
    if (state !== S.PLAYING) return;
    if (id === leftTouchId) {
      holdingLeft = false; leftTouchId = null;
      if (started && !finished && !done && ready <= 0) failNow(LX, ZY, 'drop');
    }
  });

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

  var TARGET_FACE = ['.####.', '#.##.#', '######', '.####.'];
  function drawScene() {
    game.draw.circle(LX, ZY, ZR, C.left, holdingLeft ? 0.35 : 0.18);
    game.draw.circle(RX, ZY, ZR, C.right, 0.18);
    var soon = false;
    if (!finished && !done && ready <= 0) {
      var t = beatStart - game.time.elapsed;
      soon = t < 0.6 && t > 0 && Math.floor(game.time.elapsed * 10) % 2 === 0;
    }
    if (soon) game.draw.circle(RX, ZY, ZR * 0.6, C.gold, 0.5);
    var wobble = broken * 6;
    game.draw.rect(W * 0.5 - 90 - wobble * 0.2, ZY - 90, 180, 180, C.targetDark);
    game.draw.sprite(TARGET_FACE, { '#': C.target }, W * 0.5 - wobble * 0.2, ZY, 22, { anchor: 'center' });
    txt('L', LX, ZY + 16, 46, C.ink);
    txt('R', RX, ZY + 16, 46, C.ink);
  }

  var demo = { t: 0, lx: LX, ly: ZY, rx: RX, ry: ZY, lpress: false, rpress: false, idx: 0, start: GRACE + 0.6 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % (BEAT + GRACE + 0.6);
    if (cyc < dt || demo.t <= dt) { demo.idx = 0; demo.pressedThis = false; broken = 0; }
    demo.lpress = cyc > 0.15;
    var bt = beatTime(0);
    var tt = cyc - bt;
    if (tt > -0.06 && tt < 0.06 && !demo.pressedThis) {
      demo.pressedThis = true;
      demo.rpress = true;
      game.feedback.good(RX, ZY, { text: 'BREAK!', color: C.good });
      game.audio.play('se_break', 0.3);
      broken = 1;
    } else if (tt < -0.06) {
      demo.rpress = false;
    } else if (tt > 0.25) {
      demo.rpress = false;
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      bg();
      stepDemo(dt);
      drawScene();
      game.draw.hand(demo.lx, demo.ly, { press: demo.lpress, scale: 14 });
      game.draw.hand(demo.rx, demo.ry, { press: demo.rpress, scale: 14 });
      txt(GAME_TITLE, W / 2, H * 0.08, 40, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.92, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.92, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawScene();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 48, ok ? C.good : C.bad);
      txt(broken + ' / ' + TOTAL, W / 2, H * 0.13, 30, C.gold);
      if (!ok) txt('あと' + (TOTAL - broken) + '回!', W / 2, H * 0.18, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.92, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(broken, { broken: broken, total: TOTAL });
        else game.end.failure({ broken: broken, total: TOTAL });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      if (started && !holdingLeft) {
        failNow(LX, ZY, 'drop');
      } else {
        var t = game.time.elapsed - beatStart;
        if (t > WIN && !resolvedThis) { resolvedThis = true; failNow(RX, ZY, 'timing'); }
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    if (!finished) drawScene();

    txt(broken + ' / ' + TOTAL, W / 2, H * 0.08, 30, C.white);
    game.draw.rect(60, 170, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 170, (W - 120) * (broken / TOTAL), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.72, 54, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['D4', 0.4], ['A4', 0.4], ['D5', 0.8]], { tempo: 100, wave: 'square', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
