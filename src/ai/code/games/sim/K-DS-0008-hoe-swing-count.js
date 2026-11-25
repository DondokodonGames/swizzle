// K-DS-0008-hoe-swing-count.js
// 耕しカウント — 一定のリズムで鍬を振り下ろし、示された回数ちょうどで止める畑仕事
// 操作: 鍬が自動で振り下ろされる拍に合わせ、回数表示が目標とちょうど一致した瞬間にタップして止める
// 終わり: 規定回数(6区画)ちょうど止めれば成功。2回外せば失敗
// @mechanic: count_exact
// @theme: furrow_tilling_rhythm
// 世界観: 早朝の畑。鍬を一定のリズムで振り下ろし続け、区画ごとに示された回数ぴったりで手を止めて次の畝へ進む農作業
// 残るもの: 正誤(CLEAR/GAME OVER) + ちょうど止められた区画数
// スタイル: 70s MONO

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 70s MONO: 褐色〜アンバーの単色調、差し色は1つだけ
  var C = {
    bg: '#2b2114', bg2: '#19130c', soil: '#4a3820', soilDark: '#302410', soilTilled: '#6a4e28',
    farmer: '#d8c090', hoe: '#8a6a3a',
    good: '#8fbf6a', bad: '#c85a4a', gold: '#e8b84a', white: '#efe6d4', ink: '#120e08',
  };

  var GAME_TITLE = 'FURROW COUNT';
  var NEEDED = 6;
  var MISS_LIMIT = 2;
  var PERIOD = 0.55;
  var CX = W * 0.5, CY = H * 0.46;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var FARMER_UP = ['..##.', '.###.', '..#..', '.#.#.'];
  var FARMER_DOWN = ['.##..', '####.', '.#...', '.#.#.'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    var driftX = ((game.time.elapsed * 46) % (W + 300)) - 150;
    game.draw.circle(driftX, H * 0.15, 90, C.gold, 0.06);
    game.draw.circle(driftX + 140, H * 0.19, 60, C.gold, 0.04);
    for (var i = 0; i < 6; i++) game.draw.rect(0, H * (0.62 + i * 0.03), W, 2, '#00000030');
  }

  var round, cleared, misses, target, tally, swingT, judged, judgeGood, judgeT;
  var done, endWait, finished, readyIn, hitStop, shake;

  function newRound() {
    round++;
    target = 3 + Math.floor(Math.random() * 6);
    tally = 0; swingT = PERIOD; judged = false; judgeT = 0;
  }

  function initGame() {
    round = -1; cleared = 0; misses = 0;
    done = false; endWait = 0; finished = false;
    readyIn = 0.8; hitStop = 0; shake = 0;
    newRound();
  }

  function stop() {
    if (done || readyIn > 0 || hitStop > 0 || finished || judged) return;
    judged = true; judgeT = 0.5;
    var exact = tally === target;
    hitStop = 0.14;
    if (exact) {
      cleared++; judgeGood = true;
      game.feedback.good(CX, CY, { text: 'GOOD' });
      game.audio.play('se_good', 0.3);
      if (cleared === Math.floor(NEEDED / 2)) { game.fx.popup(cleared + ' / ' + NEEDED, CX, H * 0.18, { color: C.gold, size: 36 }); game.audio.play('se_milestone', 0.3); }
      if (cleared >= NEEDED) { ok = true; finished = true; finish(); return; }
    } else {
      misses++; judgeGood = false;
      game.feedback.bad(CX, CY, { text: 'MISS' });
      shake = 0.18;
      game.audio.play('se_bad', 0.3);
      if (misses >= MISS_LIMIT) { ok = false; finished = true; finish(); return; }
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) stop();
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.2;
  }

  function stepSwing(dt) {
    swingT -= dt;
    if (swingT <= 0) {
      swingT += PERIOD;
      tally++;
      game.audio.tone(220, 0.06, { wave: 'square', volume: 0.08 });
      if (tally > target && !judged) {
        judged = true; judgeT = 0.5; misses++; judgeGood = false;
        game.feedback.bad(CX, CY, { text: 'MISS' });
        shake = 0.18;
        game.audio.play('se_bad', 0.3);
        if (misses >= MISS_LIMIT) { ok = false; finished = true; finish(); }
      }
    }
  }

  var demo = { t: 0, gx: CX, gy: CY + 120, press: false, target: 5, tally: 0, swingT: PERIOD, judged: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.0;
    if (cyc < dt || demo.t <= dt) { demo.target = 5; demo.tally = 0; demo.swingT = PERIOD; demo.judged = false; }
    demo.swingT -= dt;
    if (demo.swingT <= 0) { demo.swingT += PERIOD; demo.tally++; }
    demo.press = false;
    if (demo.tally === demo.target && !demo.judged) {
      demo.judged = true; demo.press = true;
      game.feedback.good(CX, CY, { text: 'GOOD' });
      game.audio.play('se_good', 0.15);
    }
    target = demo.target; tally = demo.tally; swingT = demo.swingT;
  }

  function drawScene(downPhase, swingPhase) {
    bg();
    game.draw.rect(CX - 260, CY - 40, 520, 100, C.soilDark);
    for (var i = 0; i < 8; i++) {
      var tx = CX - 240 + i * 62;
      game.draw.rect(tx, CY - 20, 50, 60, i < (tally % 9) ? C.soilTilled : C.soil);
    }
    var bob = Math.sin(swingPhase * Math.PI) * 10;
    // 鍬の腕: 連続的に振り上げ〜振り下ろしの角度が変化する(2フレームの切り替えだけに頼らない)
    var armAng = -1.1 + swingPhase * 1.5;
    var handX = CX + 30, handY = CY - 150 - bob;
    var tipX = handX + Math.sin(armAng) * 130, tipY = handY + Math.cos(armAng) * 130;
    game.draw.line(handX, handY, tipX, tipY, C.hoe, 10);
    game.draw.circle(tipX, tipY, 12, C.hoe);
    game.draw.sprite(downPhase ? FARMER_DOWN : FARMER_UP, { '#': C.farmer }, CX, CY - 140 - bob, 20, { anchor: 'center' });
    game.draw.rect(CX - 120, H * 0.24, 240, 110, C.soilDark);
    txt(String(target), CX, H * 0.30, 84, C.gold);
    txt(String(tally), CX, CY - 220, 54, C.white);
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      stepDemo(dt);
      drawScene(demo.swingT > PERIOD * 0.6, 1 - demo.swingT / PERIOD);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 26 });
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
      drawScene(false, 0);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 46, ok ? C.good : C.bad);
      txt(cleared + ' / ' + NEEDED, W / 2, H * 0.13, 30, C.gold);
      if (!ok && NEEDED - cleared <= 2) txt('あと' + (NEEDED - cleared) + '区画!', W / 2, H * 0.18, 24, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.92, 24, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(cleared, { cleared: cleared, total: NEEDED, misses: misses });
        else game.end.failure({ cleared: cleared, total: NEEDED, misses: misses });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (readyIn > 0) {
      readyIn -= dt;
      if (readyIn <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      if (!judged) stepSwing(dt);
      else { judgeT -= dt; if (judgeT <= 0) newRound(); }
    }
    if (shake > 0) shake -= dt;

    drawScene(swingT > PERIOD * 0.6, 1 - swingT / PERIOD);

    txt(cleared + ' / ' + NEEDED, W / 2, H * 0.06, 30, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * (cleared / NEEDED), 16, C.gold);
    for (var m = 0; m < MISS_LIMIT; m++) {
      game.draw.circle(W - 60 - m * 34, 190, 10, m < misses ? C.bad : '#ffffff20');
    }
    if (readyIn > 0) txt(readyIn > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.74, 54, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['D3', 0.4], ['F3', 0.4], ['A3', 0.4]], { tempo: 92, wave: 'triangle', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
