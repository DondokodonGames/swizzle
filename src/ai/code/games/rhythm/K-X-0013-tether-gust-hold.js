// K-X-0013-tether-gust-hold.js
// 係留ロープ番 — 伸びる目印にロープを合わせ、指定の長さだけ押さえ続けて手を離す
// 操作: ロープが伸び始めたら押さえ続け、示された長さの目印にちょうど届いたら指を離す。突風で目印が急に伸びることもある
// 終わり: 5回のうち3回以上、長さを合わせて離せれば成功。3回外せば失敗
// @mechanic: hold_duration
// @theme: observation_balloon_mooring
// 世界観: 観測気球の係留員。突風のたびに伸びるロープの目印にちょうど合わせて指を離し、気球を安全な高さに留める
// 残るもの: 正誤(CLEAR/GAME OVER) + 合わせられた回数
// スタイル: 80s NEON

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 80s NEON: 黒背景に発光する原色ライン
  var C = {
    bg: '#08041a', bg2: '#140836', rope: '#2a1a55', ropeGlow: '#ff2ec2',
    balloon: '#3dd6ff', balloonDark: '#1a6a8a', mark: '#ffe600', gust: '#ff5540',
    good: '#3dffa0', bad: '#ff3d5a', gold: '#ffe600', white: '#f4eaff', ink: '#050214',
  };

  var GAME_TITLE = 'TETHER GUST';
  var TOTAL = 5;
  var MISS_LIMIT = 2;
  var TOL = 0.15;
  var GUST_ADD = 0.5;
  var PEG_X = W * 0.5, PEG_Y = H * 0.68;
  var MAX_LEN = 700;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var BALLOON_SPR = ['.####.', '######', '######', '.####.', '..##..'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    for (var i = 0; i < 6; i++) game.draw.circle(W * (0.15 + i * 0.18), H * 0.14, 3, '#ffffff30');
    game.draw.circle(PEG_X, PEG_Y, 26, C.ropeGlow, 0.6);
  }

  function lenAtDur(d) { return Math.min(MAX_LEN, (d / 1.6) * MAX_LEN); }

  var round, misses, holding, holdStart, holdDur, targetDur, gustArmed, gustFired, gustAt, resolved;
  var done, endWait, finished, ready, hitStop, shake, flashOk, flashT, nextMilestone;

  function newTarget(r) { return 0.55 + Math.random() * 0.55; }

  function initGame() {
    round = 0; misses = 0; holding = false; holdStart = 0; holdDur = 0;
    targetDur = newTarget(0); resolved = false;
    gustArmed = false; gustFired = false; gustAt = 0;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; flashOk = true; flashT = 0; nextMilestone = 3;
  }

  function armGustIfNeeded() {
    gustArmed = round >= 2 && Math.random() < 0.55;
    gustFired = false;
    gustAt = 0.32 + Math.random() * 0.18;
  }

  function beginHold() {
    if (ready > 0 || done || finished || hitStop > 0 || holding) return;
    holding = true; holdStart = game.time.elapsed; holdDur = 0;
    game.audio.play('se_tap', 0.15);
  }

  function endHold() {
    if (!holding) return;
    holding = false;
    var d = game.time.elapsed - holdStart;
    resolve(d);
  }

  function resolve(d) {
    if (resolved || finished) return;
    resolved = true;
    var diff = Math.abs(d - targetDur);
    if (diff <= TOL) {
      round++;
      hitStop = 0.08; flashOk = true; flashT = 0.16;
      game.feedback.good(PEG_X, PEG_Y - lenAtDur(targetDur), { text: 'HOLD!' });
      game.audio.play('se_good', 0.3);
      if (round >= nextMilestone && nextMilestone < TOTAL) {
        game.fx.popup(round + ' / ' + TOTAL, PEG_X, H * 0.2, { color: C.gold, size: 34 });
        game.audio.play('se_milestone', 0.3);
        nextMilestone += 3;
      }
      if (round >= TOTAL) { ok = true; finished = true; finish(); return; }
      targetDur = newTarget(round); resolved = false; armGustIfNeeded();
    } else {
      misses++;
      hitStop = 0.28; shake = 0.22; flashOk = false; flashT = 0.22;
      game.feedback.bad(PEG_X, PEG_Y - lenAtDur(d), { text: d < targetDur ? 'SHORT' : 'LONG' });
      game.audio.play('se_bad', 0.3);
      if (misses >= MISS_LIMIT) { ok = false; finished = true; finish(); return; }
      targetDur = newTarget(round); resolved = false; armGustIfNeeded();
    }
  }

  game.onPress(function(x, y) { if (state === S.PLAYING) beginHold(); });
  game.onRelease(function(x, y) { if (state === S.PLAYING) { game.audio.play('se_tap', 0.06); endHold(); } });
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });

  function finish() {
    if (done) return;
    done = true;
    holding = false;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.2;
  }

  function stepRound(dt) {
    if (holding) {
      holdDur = game.time.elapsed - holdStart;
      if (gustArmed && !gustFired && holdDur >= gustAt) {
        gustFired = true;
        targetDur += GUST_ADD;
        game.fx.popup('GUST!', PEG_X, PEG_Y - lenAtDur(holdDur) - 60, { color: C.gust, size: 36 });
        game.audio.play('se_tap', 0.35);
      }
      if (holdDur > targetDur + TOL + 0.3) {
        holding = false;
        resolve(holdDur);
      }
    }
  }

  function drawRope(len, gustSoon) {
    var topY = PEG_Y - len;
    game.draw.line(PEG_X, PEG_Y, PEG_X, topY, C.rope, 10);
    game.draw.line(PEG_X, PEG_Y, PEG_X, topY, C.ropeGlow, 3);
    var targetLen = lenAtDur(targetDur);
    var markY = PEG_Y - targetLen;
    var loY = PEG_Y - lenAtDur(targetDur - TOL);
    var hiY = PEG_Y - lenAtDur(targetDur + TOL);
    game.draw.line(PEG_X - 70, markY, PEG_X + 70, markY, gustSoon ? C.gust : C.mark, 5);
    game.draw.line(PEG_X - 40, loY, PEG_X + 40, loY, C.mark, 2);
    game.draw.line(PEG_X - 40, hiY, PEG_X + 40, hiY, C.mark, 2);
    game.draw.sprite(BALLOON_SPR, { '#': C.balloon }, PEG_X, topY - 70, 20, { anchor: 'center' });
  }

  var demo = { t: 0, gx: PEG_X, gy: PEG_Y, press: false, holding: false, holdStart: 0, target: 0.8, gust: false, gustFired: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.0;
    if (cyc < dt || demo.t <= dt) { demo.holding = false; demo.target = 0.9; demo.gust = true; demo.gustFired = false; }
    if (!demo.holding && cyc > 0.3 && cyc < 0.35) { demo.holding = true; demo.holdStart = cyc; }
    if (demo.holding) {
      holdDur = cyc - demo.holdStart;
      if (demo.gust && !demo.gustFired && holdDur >= 0.35) {
        demo.gustFired = true; demo.target += GUST_ADD;
        game.fx.popup('GUST!', PEG_X, PEG_Y - lenAtDur(holdDur) - 60, { color: C.gust, size: 32 });
      }
      if (holdDur >= demo.target) { demo.holding = false; game.feedback.good(PEG_X, PEG_Y - lenAtDur(demo.target), { text: 'HOLD!' }); game.audio.play('se_good', 0.15); }
    }
    demo.press = demo.holding;
    targetDur = demo.target;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      bg();
      stepDemo(dt);
      drawRope(lenAtDur(holdDur || 0), demo.gustFired);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 22 });
      txt(GAME_TITLE, W / 2, H * 0.08, 40, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.92, 38, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.92, 26, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawRope(lenAtDur(targetDur), false);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 46, ok ? C.good : C.bad);
      txt(round + ' / ' + TOTAL, W / 2, H * 0.13, 28, C.gold);
      if (!ok && TOTAL - round <= 2) txt('あと' + (TOTAL - round) + '回!', W / 2, H * 0.17, 24, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.92, 24, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(round, { round: round, total: TOTAL, misses: misses });
        else game.end.failure({ round: round, total: TOTAL, misses: misses });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) { game.audio.play('se_tap'); armGustIfNeeded(); }
    } else if (!finished) {
      stepRound(dt);
    }
    if (flashT > 0) flashT -= dt;
    if (shake > 0) shake -= dt;

    bg();
    drawRope(lenAtDur(holdDur), gustArmed && !gustFired);
    if (flashT > 0) game.draw.circle(PEG_X, PEG_Y - lenAtDur(holdDur), 60, flashOk ? C.good : C.bad, 0.35);

    txt(round + ' / ' + TOTAL, W / 2, H * 0.06, 30, C.white);
    for (var m = 0; m < MISS_LIMIT; m++) game.draw.circle(W - 50 - m * 32, 190, 9, m < misses ? C.bad : '#ffffff30');
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['A3', 0.4], ['C4', 0.4], ['E4', 0.6]], { tempo: 110, wave: 'sine', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
