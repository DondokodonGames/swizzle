// D-20172021-0074-coin-pile-inspector.js
// コインパイル・インスペクター — 見た目の高さに惑わされず、本当に枚数が一番多い山を選ぶ
// 操作: 3つのコイン山のうち、実際の枚数が最も多い山の下のゾーンをタップする(高さは当てにならない)
// 終わり: 規定回数(4回)連続で本当の最多枚数を選べば成功。誤答か時間切れが1回でもあれば失敗
// @mechanic: judge
// @theme: coin_pile_illusion_judge
// 世界観: 硬貨検品ロボットが、山の見た目の高さに惑わされず、実際の枚数が一番多い山を毎回見極めてタップする
// 残るもの: 正誤(CLEAR/GAME OVER) + 見極めた回数
// スタイル: 2000s ARCADE POP

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2000s ARCADE POP: 明るい原色背景 + 白縁、光の柱で祝祭感
  var C = {
    bg: '#2a1a4a', bg2: '#170c2e', belt: '#1c1038', beltLine: '#3a2a66',
    coin: '#ffd23f', coinDark: '#c98f10', coinRim: '#fff6d0',
    zone: '#3a2a66', zoneOn: '#ff5fa2',
    good: '#39ff9e', bad: '#ff3355', gold: '#ffd23f', white: '#fdf6ff', ink: '#120a24',
  };

  var GAME_TITLE = 'PILE CHECK';
  var TOTAL = 4;
  var ZONES = [
    { x: W * 0.22, y: H * 0.82 },
    { x: W * 0.5, y: H * 0.82 },
    { x: W * 0.78, y: H * 0.82 },
  ];
  var ZONE_R = 108;
  var BASE_Y = H * 0.68;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var BOT = ['.###.', '#####', '.#.#.', '##.##'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    var pulse = 0.04 + 0.04 * Math.sin(game.time.elapsed * 1.4);
    for (var i = 0; i < 4; i++) {
      var lx = W * (0.16 + i * 0.24);
      game.draw.rect(lx, 0, 26, H * 0.7, C.zoneOn, pulse * 0.4);
    }
    game.draw.rect(0, H * 0.6, W, 20, C.beltLine, 0.6);
    game.draw.sprite(BOT, { '#': C.gold }, W * 0.5, H * 0.14, 22, { anchor: 'center' });
  }

  var piles, radii, correctIdx, round, halfShown;
  var roundT, roundDur, done, endWait, finished, ready, hitStop, shake;

  function newRound(idx) {
    var counts = [];
    while (counts.length < 3) {
      var v = 3 + Math.floor(game.random(0, 6));
      counts.push(v);
    }
    // タイになったら片方を1増やして必ず単独最多にする
    if (counts[0] === counts[1] && counts[0] === counts[2]) counts[0] += 2;
    else if (counts[0] === counts[1] && counts[0] >= counts[2]) counts[0] += 1;
    else if (counts[1] === counts[2] && counts[1] >= counts[0]) counts[1] += 1;
    else if (counts[0] === counts[2] && counts[0] >= counts[1]) counts[0] += 1;
    var rads = [
      16 + game.random(0, 20),
      16 + game.random(0, 20),
      16 + game.random(0, 20),
    ];
    var best = 0;
    for (var i = 1; i < counts.length; i++) if (counts[i] > counts[best]) best = i;
    return { counts: counts, rads: rads, correct: best, dur: Math.max(2.0, 3.3 - idx * 0.35) };
  }

  function drawPile(i, alpha) {
    var x = ZONES[i].x, r = radii[i];
    var n = piles[i];
    for (var k = 0; k < n; k++) {
      var cy = BASE_Y - k * (r * 1.15);
      game.draw.circle(x, cy, r, C.coinDark, alpha);
      game.draw.circle(x, cy, r * 0.82, C.coin, alpha);
      game.draw.circle(x - r * 0.25, cy - r * 0.25, r * 0.22, C.coinRim, alpha * 0.9);
    }
  }

  function drawPiles() {
    for (var i = 0; i < 3; i++) drawPile(i, 1);
  }

  function drawZones(showBest) {
    for (var i = 0; i < ZONES.length; i++) {
      var z = ZONES[i];
      var on = showBest && i === correctIdx;
      game.draw.circle(z.x, z.y, ZONE_R, on ? C.zoneOn : C.zone, on ? 0.85 : 0.55);
      game.draw.circle(z.x, z.y, ZONE_R, C.white, 0.15);
    }
  }

  function initGame() {
    round = 0; halfShown = false;
    var r = newRound(0); piles = r.counts; radii = r.rads; correctIdx = r.correct; roundDur = r.dur; roundT = 0;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function zoneAt(x, y) {
    for (var i = 0; i < ZONES.length; i++) {
      if (game.hit.circle(x, y, 1, ZONES[i].x, ZONES[i].y, ZONE_R)) return i;
    }
    return -1;
  }

  function pick(i) {
    if (done || ready > 0 || finished) return;
    if (i === correctIdx) {
      round++;
      hitStop = 0.1;
      game.feedback.good(ZONES[i].x, ZONES[i].y, { text: 'GOOD', color: C.good });
      game.audio.play('se_good', 0.35);
      if (!halfShown && round >= Math.ceil(TOTAL / 2)) {
        halfShown = true;
        game.fx.popup('HALFWAY!', W / 2, H * 0.3, { color: C.gold, size: 36 });
        game.audio.play('se_milestone', 0.4);
      }
      if (round >= TOTAL) { ok = true; finished = true; hitStop = 0.18; finish(); return; }
      var r = newRound(round); piles = r.counts; radii = r.rads; correctIdx = r.correct; roundDur = r.dur; roundT = 0;
    } else {
      hitStop = 0.35; shake = 0.3;
      game.feedback.bad(ZONES[i].x, ZONES[i].y, { text: 'MISS' });
      game.audio.play('se_bad', 0.4);
      ok = false; finished = true; finish();
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) {
      var i = zoneAt(x, y);
      if (i < 0) { game.audio.play('se_tap', 0.05); return; }
      pick(i);
    }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  var demo = { t: 0, gx: ZONES[0].x, gy: ZONES[0].y, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 2.4;
    if (cyc < dt || demo.t <= dt) {
      var r = newRound(0); piles = r.counts; radii = r.rads; correctIdx = r.correct; roundDur = 1.8; roundT = 0;
      demo.fired = false;
    }
    roundT += dt;
    if (roundT > roundDur * 0.55 && !demo.fired) {
      demo.fired = true;
      demo.gx = ZONES[correctIdx].x; demo.gy = ZONES[correctIdx].y; demo.press = true;
      game.feedback.good(ZONES[correctIdx].x, ZONES[correctIdx].y, { text: 'GOOD', color: C.good });
      game.audio.play('se_good', 0.22);
    }
    if (roundT > roundDur * 0.55 + 0.25) demo.press = false;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (piles === undefined) initGame();
      bg();
      stepDemo(dt);
      drawZones(false);
      drawPiles();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.06, 40, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.095, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.95, 38, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.95, 26, C.white);
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawZones(false);
      drawPiles();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.06, 44, ok ? C.good : C.bad);
      txt(round + ' / ' + TOTAL, W / 2, H * 0.10, 28, C.gold);
      if (!ok) txt('あと' + (TOTAL - round) + '回!', W / 2, H * 0.14, 24, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.95, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        var stats = { correct: round, total: TOTAL };
        if (ok) game.end.success(round, stats); else game.end.failure(stats);
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      roundT += dt;
      if (roundT >= roundDur) {
        hitStop = 0.3; shake = 0.3;
        game.feedback.bad(ZONES[correctIdx].x, ZONES[correctIdx].y, { text: 'MISS' });
        game.audio.play('se_bad', 0.4);
        ok = false; finished = true; finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawZones(false);
    if (!finished) drawPiles();
    else drawPiles();

    if (!finished) {
      var p = 1 - roundT / roundDur;
      var warn = p < 0.3;
      var blink = warn && Math.floor(game.time.elapsed * 12) % 2 === 0;
      game.draw.rect(W / 2 - 140, H * 0.24, 280, 16, C.ink, 0.5);
      game.draw.rect(W / 2 - 140, H * 0.24, 280 * Math.max(0, p), 16, blink ? C.bad : C.gold);
    }

    txt(round + ' / ' + TOTAL, W / 2, H * 0.06, 28, C.white);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.44, 54, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['C5', 0.18], ['E5', 0.18], ['G5', 0.18], ['C6', 0.36]], { tempo: 168, wave: 'square', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
