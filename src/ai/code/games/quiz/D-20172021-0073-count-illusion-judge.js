// D-20172021-0073-count-illusion-judge.js
// カウント・イリュージョン・ジャッジ — 見た目の並びに惑わされず、本当に一番多いカプセルの列を見抜く
// 操作: 3つの列のうち、実際の個数が一番多い列をタップする。見た目の広がりに騙されないこと
// 終わり: 2問連続で正しい列を選べば成功。誤答すれば即座に失敗
// @mechanic: judge
// @theme: count_illusion_examiner
// 世界観: 検品場の検査官見習いが、間隔をわざと広げて多く見せかけたカプセルの列に惑わされず、本当に個数が一番多い列を2問連続で見抜く
// 残るもの: 正誤(CLEAR/GAME OVER) + 正解した問題数
// スタイル: NEO-RETRO

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // NEO-RETRO: 限定4〜6色パレット、大きいドット、1色だけ強い差し色
  var STYLE = { bg: ['#1a1830', '#0e0c1c'], main: ['#4a3a7a', '#2a2050'], accent: ['#ffd400', '#3dd6c8'] };
  var C = {
    bg: STYLE.bg[0], bg2: STYLE.bg[1], zone: '#2a2050', zoneSel: '#4a3a7a',
    cap: '#3dd6c8', capAlt: '#ff8fd8',
    good: '#2bd67b', bad: '#ff4d5e', gold: '#ffd400', ink: '#f0eaff', white: '#ffffff',
  };

  var GAME_TITLE = 'COUNT JUDGE';
  var ZONE_Y = [H * 0.30, H * 0.46, H * 0.62];
  var ZONE_H = 130;
  var ROUNDS_TARGET = 2;
  var ROUND_TIME = 6.5;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var CAPSULE = ['.##.', '####', '####', '.##.'];
  var EXAMINER = ['.##.', '####', '.##.', '#..#'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    game.draw.sprite(EXAMINER, { '#': C.gold }, W * 0.85, H * 0.86, 10, { anchor: 'center' });
  }

  function genRound() {
    // 3列それぞれ個数(5〜10)と間隔(詰め/広げ)をランダムに決める。正解=実個数最大の列
    var counts = [];
    var spreads = [];
    var used = {};
    for (var i = 0; i < 3; i++) {
      var n;
      do { n = 5 + Math.floor(game.random(0, 6)); } while (used[n]);
      used[n] = true;
      counts.push(n);
      spreads.push(0.55 + game.random(0, 0.9));
    }
    var best = 0;
    for (var j = 1; j < counts.length; j++) if (counts[j] > counts[best]) best = j;
    return { counts: counts, spreads: spreads, answer: best };
  }

  var round, roundsWon, timeLeft, done, endWait, finished, ready, hitStop, shake, revealT, chosenZone, roundOk;

  function initGame() {
    round = genRound();
    roundsWon = 0; timeLeft = ROUND_TIME;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
    revealT = 0; chosenZone = -1; roundOk = null;
  }

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  function drawZones(showAnswer) {
    for (var z = 0; z < 3; z++) {
      var y = ZONE_Y[z];
      var col = (z === chosenZone && revealT > 0) ? (roundOk ? C.good : C.bad) : (showAnswer && z === round.answer ? C.gold : C.zone);
      game.draw.rect(90, y - ZONE_H / 2, W - 180, ZONE_H, col, 0.9);
      var n = round.counts[z], spread = round.spreads[z];
      var usable = (W - 260);
      var step = Math.min(usable / n, 150 * spread);
      var totalW = step * (n - 1);
      var startX = W / 2 - totalW / 2;
      for (var i = 0; i < n; i++) {
        var cx = startX + i * step;
        game.draw.sprite(CAPSULE, { '#': (i % 2 === 0) ? C.cap : C.capAlt }, cx, y, 14, { anchor: 'center' });
      }
    }
  }

  function pickZone(z, x, y) {
    if (chosenZone >= 0) return;
    chosenZone = z;
    roundOk = (z === round.answer);
    revealT = 0.5;
    if (roundOk) {
      roundsWon++;
      game.feedback.good(x, y, { text: 'GOOD', color: C.good });
      game.audio.play('se_good', 0.35);
      if (roundsWon >= ROUNDS_TARGET) {
        ok = true; finished = true; hitStop = 0.3;
        game.audio.play('se_success', 0.5);
        finish();
      } else {
        game.fx.popup('NICE', x, y - 100, { color: C.gold, size: 30 });
        game.audio.play('se_milestone', 0.3);
      }
    } else {
      ok = false; finished = true; hitStop = 0.35; shake = 0.25;
      game.feedback.bad(x, y, { text: 'MISS' });
      game.audio.play('se_bad', 0.4);
      finish();
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING && ready <= 0 && hitStop <= 0 && !finished && chosenZone < 0) {
      game.audio.play('se_tap', 0.1);
      for (var z = 0; z < 3; z++) {
        if (Math.abs(y - ZONE_Y[z]) < ZONE_H / 2) { pickZone(z, x, y); return; }
      }
    }
  });

  var demo = { t: 0, gx: W * 0.5, gy: ZONE_Y[0], press: false };
  function nextRoundDemo() {
    round = genRound();
    chosenZone = -1; revealT = 0; roundOk = null;
    timeLeft = ROUND_TIME;
  }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.2;
    if (cyc < dt || demo.t <= dt) { initGame(); }
    if (revealT > 0) revealT -= dt;
    if (cyc < 2.0) {
      var target = round.answer;
      demo.gx = W * 0.5; demo.gy = H * 0.95 + (ZONE_Y[target] - H * 0.95) * (cyc / 2.0);
      demo.press = false;
    } else if (cyc < 2.15) {
      demo.press = true;
      if (chosenZone < 0) pickZone(round.answer, demo.gx, demo.gy);
    } else {
      demo.press = false;
    }
  }

  game.onUpdate(function(dt) {
    if (revealT > 0 && state === S.PLAYING) revealT -= dt;

    if (state === S.ATTRACT) {
      if (!round) { initGame(); }
      stepDemo(dt);
      bg();
      drawZones(revealT > 0);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 38, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.95, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.95, 28, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawZones(true);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.09, 46, ok ? C.good : C.bad);
      txt(roundsWon + ' / ' + ROUNDS_TARGET, W / 2, H * 0.14, 28, C.gold);
      if (!ok) txt('あと1問!', W / 2, H * 0.18, 24, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.95, 26, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(roundsWon, { correct: roundsWon, target: ROUNDS_TARGET });
        else game.end.failure({ correct: roundsWon, target: ROUNDS_TARGET });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      if (revealT <= 0 && chosenZone >= 0) {
        // 正解して次の問題へ
        chosenZone = -1; roundOk = null;
        round = genRound();
        timeLeft = ROUND_TIME;
      }
      timeLeft -= dt;
      if (timeLeft <= 0) {
        ok = false; finished = true; hitStop = 0.3; shake = 0.2;
        game.feedback.bad(W / 2, ZONE_Y[1], { text: 'MISS' });
        game.audio.play('se_bad', 0.4);
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawZones(revealT > 0);

    txt(roundsWon + ' / ' + ROUNDS_TARGET, W / 2, H * 0.06, 30, C.ink);
    var tbW = W - 120;
    var lowTime = timeLeft < 2 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(60, 150, tbW, 16, C.zone, 1);
    game.draw.rect(60, 150, tbW * Math.max(0, timeLeft / ROUND_TIME), 16, lowTime ? C.bad : C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['B3', 0.2], ['D4', 0.2], ['F#4', 0.2], ['B4', 0.4]], { tempo: 132, wave: 'triangle', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
