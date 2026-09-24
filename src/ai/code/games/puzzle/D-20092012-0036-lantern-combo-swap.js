// D-20092012-0036-lantern-combo-swap.js
// ランタン・コンボスワップ — 隣り合う提灯を光る側へ次々スワイプで送り込み、コンボ倍率を伸ばして得点を稼ぐ
// 操作: 光っている提灯の並びを見て、正しい側へ素早くスワイプして送り込む。テンポは徐々に加速する
// 終わり: 規定ラウンドを終えれば成功。既定回数外せば失敗
// @mechanic: swipe_direction
// @theme: festival_lantern_combo
// 世界観: 夜祭りの提灯係。次々と光る提灯を正しい側へ素早く送り込み、連続成功でコンボを伸ばして祭りを盛り上げる
// 残るもの: 正誤(CLEAR/GAME OVER) + 最終スコア(コンボ加点込み)
// スタイル: 2000s ARCADE POP
(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2000s ARCADE POP: 原色+白縁、明るいグラデ背景、太い白縁取り文字、光の柱
  var C = {
    bg1: '#fff1c9', bg2: '#ffd6e8', post: '#a8683a', lantern: '#ff8a3a',
    lanternGlow: '#ffe08a', good: '#3fbf6a', bad: '#ff4d6a', gold: '#ffb020',
    white: '#ffffff', ink: '#4a2410',
  };

  var GAME_TITLE = 'LANTERN COMBO';
  var CX = W * 0.5, CY = H * 0.42;
  var ROUNDS_TOTAL = 8;
  var STRIKES_LIMIT = 2;
  var GAP = 210;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var roundIdx, combo, maxCombo, score, strikes, dir, roundT, roundDur, resolved, milestoneShown, done, endWait, finished;
  var ready, hitStop, shake;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var LANTERN = ['.###.', '#####', '#####', '..#..'];

  function roundDurFor(i) { return Math.max(0.55, 1.15 - i * 0.08); }

  function newRound(i) {
    return { dir: Math.random() < 0.5 ? -1 : 1 };
  }

  function initGame() {
    roundIdx = 0; combo = 0; maxCombo = 0; score = 0; strikes = 0; milestoneShown = false;
    dir = newRound(0).dir; roundT = 0; roundDur = roundDurFor(0); resolved = false;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg1], [1, C.bg2]]);
    game.draw.circle(W * 0.15, H * 0.15, 120, C.white, 0.3);
    game.draw.circle(W * 0.85, H * 0.2, 90, C.white, 0.25);
  }

  function drawLanterns() {
    var urgency = Math.max(0, 1 - roundT / roundDur);
    var glowSide = dir; // side to swipe toward (the "lit" target side)
    for (var s = -1; s <= 1; s += 2) {
      var x = CX + s * GAP;
      game.draw.line(x, CY - 150, x, CY + 150, C.post, 10);
      var lit = s === glowSide;
      var pulse = lit ? (0.7 + Math.sin(game.time.elapsed * 14) * 0.3) : 0.15;
      game.draw.circle(x, CY, 100, C.lanternGlow, lit ? 0.35 * pulse : 0.08);
      game.draw.sprite(LANTERN, { '#': lit ? C.lantern : C.post }, x, CY, 30, { anchor: 'center' });
    }
    // urgency ring on the target
    if (!resolved) {
      game.draw.circle(CX + glowSide * GAP, CY, 120 * (0.5 + urgency * 0.5), C.gold, 0.15 + urgency * 0.15);
    }
  }

  function resolveSwipe(swipeDir) {
    if (ready > 0 || resolved || finished || done) return;
    resolved = true;
    var correct = swipeDir === dir;
    hitStop = correct ? 0.08 : 0.3;
    if (correct) {
      combo++;
      maxCombo = Math.max(maxCombo, combo);
      score += 10 * Math.min(4, combo);
      game.feedback.good(CX + dir * GAP, CY, { text: combo >= 3 ? 'PERFECT' : 'GOOD', color: C.good, size: 26 });
      game.fx.burst(CX + dir * GAP, CY, { color: C.gold, count: 14, speed: 300 });
      game.audio.play('se_good', 0.35);
      if (!milestoneShown && combo >= 3) {
        milestoneShown = true;
        game.fx.popup('NICE', CX, CY - 220, { color: C.gold, size: 38 });
        game.audio.play('se_milestone', 0.4);
      }
    } else {
      combo = 0;
      strikes++;
      game.feedback.bad(CX, CY, { text: 'MISS', size: 24 });
      shake = 0.2;
      game.audio.play('se_bad', 0.4);
      if (strikes >= STRIKES_LIMIT) {
        ok = false; finished = true; hitStop = 0.4; shake = 0.35;
        finish();
        return;
      }
    }
    roundIdx++;
    if (roundIdx >= ROUNDS_TOTAL) { ok = true; finished = true; finish(); return; }
    dir = newRound(roundIdx).dir; roundT = 0; roundDur = roundDurFor(roundIdx); resolved = false;
  }

  function timeoutMiss() {
    if (resolved || ready > 0 || finished || done) return;
    resolved = true;
    combo = 0; strikes++;
    game.feedback.bad(CX, CY, { text: 'MISS', size: 24 });
    shake = 0.2;
    game.audio.play('se_bad', 0.4);
    if (strikes >= STRIKES_LIMIT) {
      ok = false; finished = true; hitStop = 0.4; shake = 0.35;
      finish();
      return;
    }
    roundIdx++;
    if (roundIdx >= ROUNDS_TOTAL) { ok = true; finished = true; finish(); return; }
    dir = newRound(roundIdx).dir; roundT = 0; roundDur = roundDurFor(roundIdx); resolved = false;
  }

  game.onSwipe(function(d) {
    if (state !== S.PLAYING) return;
    game.audio.play('se_tap', 0.08);
    if (d === 'left') resolveSwipe(-1);
    else if (d === 'right') resolveSwipe(1);
  });

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING && ready <= 0 && !finished && !done) {
      game.audio.play('se_tap', 0.04);
    }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.2;
  }

  function tickRound(dt) {
    roundT += dt;
    if (!resolved && roundT >= roundDur) timeoutMiss();
  }

  var demo = { t: 0, gx: CX, gy: H * 0.86, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 2.4;
    if (cyc < dt || demo.t <= dt) { combo = 0; roundIdx = 0; dir = (Math.floor(demo.t / 2.4) % 2 === 0) ? -1 : 1; roundT = 0; roundDur = 1.1; resolved = false; demo._acted = false; }
    roundT += dt;
    if (roundT > roundDur * 0.55 && !demo._acted) {
      demo._acted = true;
      demo.gx = CX + dir * GAP; demo.press = true;
      combo++;
      game.feedback.good(CX + dir * GAP, CY, { text: 'GOOD', color: C.good, size: 26 });
      game.audio.play('se_good', 0.25);
    }
    if (roundT > roundDur * 0.8) demo.press = false;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (combo === undefined) initGame();
      bg();
      stepDemo(dt);
      drawLanterns();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 38, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 22, C.ink);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 36, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 26, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawLanterns();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 46, ok ? C.good : C.bad);
      txt('SCORE ' + score, W / 2, H * 0.13, 30, C.gold);
      if (!ok) txt('あと' + (ROUNDS_TOTAL - roundIdx) + '!', W / 2, H * 0.17, 24, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 24, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(score, { score: score, maxCombo: maxCombo });
        else game.end.failure({ score: score, maxCombo: maxCombo });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      tickRound(dt);
    }
    if (shake > 0) shake -= dt;

    bg();
    drawLanterns();

    txt('SCORE ' + score, W / 2, H * 0.06, 30, C.ink);
    txt(roundIdx + ' / ' + ROUNDS_TOTAL, W / 2, H * 0.10, 20, C.ink);
    txt('x' + Math.min(4, combo + 1), W / 2, H * 0.72, 40, C.gold);
    game.draw.rect(60, 130, W - 120, 12, C.ink, 0.3);
    game.draw.rect(60, 130, (W - 120) * (roundIdx / ROUNDS_TOTAL), 12, C.gold);
    for (var m = 0; m < STRIKES_LIMIT; m++) {
      game.draw.circle(W - 60 - m * 40, 180, 10, m < strikes ? C.bad : C.white);
    }
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 52, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['A4', 0.15], ['C5', 0.15], ['E5', 0.15], ['A5', 0.3]], { tempo: 170, wave: 'square', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
