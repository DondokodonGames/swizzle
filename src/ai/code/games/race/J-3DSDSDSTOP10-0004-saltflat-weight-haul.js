// J-3DSDSDSTOP10-0004-saltflat-weight-haul.js
// 塩原の重り引き — 鉄の重りを積んだ橇を、連打の一引きごとに地平の旗まで引きずっていく
// 操作: 画面をとにかく連打(1打=1引き)。速い連打が続くと綱が張ってFEVER。砂丘の上では橇が重くなる
// 終わり: 13秒以内に90m先の旗に着けばCLEAR。間に合わなければGAME OVER
// @mechanic: mash
// @theme: saltflat_weight_haul
// 世界観: 白い塩原の塩運び人が、交易所の締めの鐘までに鉄の重り付きの橇を地平線の旗まで引き切り、隣の組より先に荷を納める
// 残るもの: 正誤(CLEAR/GAME OVER) + 到達距離・引いた回数・FEVER回数
// スタイル: MODE7 PSEUDO

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // MODE7 PSEUDO: 少色+地平グラデ、横ストリップを奥ほど圧縮した床
  var STYLE = { bg: ['#6fa8ff', '#cfe4ff', '#fff2dc'], main: ['#f4f4ec', '#d8d8cc', '#b0a890'], accent: ['#ff5a36', '#3a3aa0'] };
  var C = { salt1: '#f4f4ec', salt2: '#dcdccf', dune1: '#e8c890', dune2: '#d0a868', ink: '#20203a', red: '#ff5a36', blue: '#3a3aa0', gold: '#ffc83a', good: '#3ac860', bad: '#e83040', rope: '#a07040', white: '#ffffff' };

  var GAME_TITLE = 'SALT HAUL';
  var TIME_LIMIT = 13;
  var GOAL = 90;
  var IMPULSE = 1.35;
  var RETAIN = 0.5;   // 1秒あたりの速度保持率
  var DUNE_A = 40, DUNE_B = 55;
  var HOR = H * 0.3, FLOOR_B = H * 0.76, KZ = 620;

  var HAULER = ['...####...', '..######..', '..######..', '...####...', '.########.', '##.####.##', '#..####..#', '...####...', '...#..#...', '..##..##..'];
  var HAULER2 = ['...####...', '..######..', '..######..', '...####...', '.########.', '##.####.##', '#..####..#', '...####...', '..#....#..', '.##....##.'];
  var SLED = ['.##.##.##.', '.##.##.##.', '##########', '#oooooooo#', '##########', '#........#'];
  var FLAG = ['##....', '####..', '######', '####..', '##....', '#.....', '#.....', '#.....'];
  var RIVAL = ['.##.', '####', '.##.', '#..#'];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var dist, vel, taps, tapTimes, fever, feverCount, timeLeft, ready, ended, ok, hitStop, endWait, score, milestone, gripPulse, lastTapAge, rivalX;

  function initGame() {
    dist = 0; vel = 0; taps = 0; tapTimes = []; fever = false; feverCount = 0;
    timeLeft = TIME_LIMIT; ready = 0.8; ended = false; ok = false; hitStop = 0; endWait = 0; score = 0;
    milestone = false; gripPulse = 0; lastTapAge = 0; rivalX = [0, 0];
  }

  function onDune(d) { return d >= DUNE_A && d <= DUNE_B; }

  // 実ロジック: 1打=1引き(デモも同じ関数)
  function heave(now, demoMode) {
    taps++; gripPulse = 0.15; lastTapAge = 0;
    tapTimes.push(now);
    while (tapTimes.length && now - tapTimes[0] > 1) tapTimes.shift();
    var wasFever = fever;
    fever = tapTimes.length >= 6;
    var imp = IMPULSE * (fever ? 1.4 : 1) * (onDune(dist) ? 0.55 : 1);
    vel += imp;
    if (!demoMode) {
      if (fever && !wasFever) { feverCount++; game.audio.play('se_powerup', 0.5); game.fx.popup('FEVER', W / 2, H * 0.42, { color: C.gold, size: 72 }); }
      else game.audio.play('se_tap', 0.25);
      if (taps % 10 === 0) game.feedback.good(W / 2, H * 0.62, { text: fever ? 'NICE' : 'GOOD', color: fever ? C.gold : C.good, sound: 'se_good', volume: 0.3 });
    }
  }

  function stepHaul(dt) {
    vel *= Math.pow(RETAIN, dt);
    dist += vel * dt;
    lastTapAge += dt;
    if (lastTapAge > 0.5) fever = false;
    if (gripPulse > 0) gripPulse -= dt;
    rivalX[0] += dt * (6.5 + Math.sin(game.time.elapsed) * 1);
    rivalX[1] += dt * (5.8 + Math.cos(game.time.elapsed * 1.3) * 1);
  }

  function txt(str, x, y, sz, color) {
    game.draw.text(str, x + 3, y + 4, { size: sz, color: C.ink, bold: true, align: 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: 'center' });
  }

  function drawWorld(t) {
    game.draw.gradient(0, HOR, [[0, STYLE.bg[0]], [1, STYLE.bg[1]]]);
    game.draw.circle(W * 0.78, HOR * 0.45, 70, '#fff6d0', 0.9);
    // 遠くの山並み(帯)
    for (var m = 0; m < 8; m++) game.draw.rect(m * 140 - 20, HOR - 30 - (m % 3) * 14, 150, 40 + (m % 3) * 14, '#a8b8d8', 0.8);
    // 奥ほど圧縮する床ストリップ
    for (var y = HOR; y < FLOOR_B; y += 5) {
      var dy = y - HOR + 4;
      var z = KZ / dy;
      var wpos = z * 4 + dist;
      var band = Math.floor(wpos / 2) % 2 === 0;
      var dune = onDune(wpos);
      var col = dune ? (band ? C.dune1 : C.dune2) : (band ? C.salt1 : C.salt2);
      game.draw.rect(0, y, W, 5, col, 1);
      if (dune && dy < 60 && Math.floor(t * 8) % 2 === 0) game.draw.rect(0, y, W, 5, C.red, 0.12);
    }
    // 轍(消失点へ収束)
    game.draw.line(W * 0.5, HOR, W * 0.28, FLOOR_B, '#c8c8b8', 8);
    game.draw.line(W * 0.5, HOR, W * 0.72, FLOOR_B, '#c8c8b8', 8);
    // ゴールの旗: 残り距離で地平から近づく
    var rem = GOAL - dist;
    if (rem < 60 && rem > -2) {
      var fy = HOR + KZ / Math.max(0.5, rem / 4) - 4;
      var fs = Math.max(3, Math.min(20, 60 / Math.max(1, rem / 4)));
      game.draw.sprite(FLAG, { '#': C.red }, W * 0.5 + Math.sin(t * 5) * 2, Math.min(FLOOR_B - 40, fy) - fs * 4, fs, { anchor: 'center' });
    }
    // 隣の組(演出のみ): 左右の遠景を進む影
    for (var r = 0; r < 2; r++) {
      var rz = Math.max(1, 30 - (rivalX[r] - dist) * 0.3);
      var ry = HOR + KZ / (rz * 4) + 10;
      game.draw.sprite(RIVAL, { '#': '#8888a0' }, r === 0 ? W * 0.12 : W * 0.88, Math.min(FLOOR_B - 20, ry) + Math.sin(t * 6 + r) * 3, 7, { anchor: 'center', alpha: 0.6 });
    }
    game.draw.rect(0, 0, W, H, C.gold, 0.025 + 0.025 * Math.sin(t * 1.6));
    // 手前の綱の握り台(親指ゾーン)
    game.draw.gradient(FLOOR_B, H, [[0, '#c8b890'], [1, '#8a7650']]);
  }

  function drawHaulers(t) {
    var step = Math.floor(dist * 1.5) % 2 === 0;
    var lean = Math.min(30, vel * 3);
    var hx = W * 0.5 + Math.sin(t * 1.5) * 6, hy = H * 0.5 + Math.sin(dist * 3) * 6;
    var sx = W * 0.5, sy = H * 0.7 + Math.sin(t * 2) * 3;
    game.draw.line(sx, sy - 50, hx, hy + 40, C.ink, 14);
    game.draw.line(sx, sy - 50, hx, hy + 40, fever ? C.gold : C.rope, 8);
    game.draw.sprite(step ? HAULER : HAULER2, { '#': C.blue }, hx, hy - lean * 0.3, 14, { anchor: 'center' });
    game.draw.sprite(SLED, { '#': '#6a4a2a', 'o': '#505060' }, sx, sy + (onDune(dist) ? Math.sin(t * 30) * 4 : 0), 22, { anchor: 'center' });
    if (fever) game.draw.circle(hx, hy, 130, C.gold, 0.18 + 0.1 * Math.sin(t * 20));
  }

  function drawGrip(t) {
    var s = 1 + (gripPulse > 0 ? gripPulse * 2 : 0);
    game.draw.circle(W / 2, H * 0.87, 130 * s, C.ink, 0.3);
    game.draw.circle(W / 2, H * 0.87, 115 * s, fever ? C.gold : C.red, 1);
    game.draw.line(W / 2 - 80 * s, H * 0.87, W / 2 + 80 * s, H * 0.87, C.rope, 26);
  }

  function drawHud(t) {
    txt(Math.floor(Math.min(dist, GOAL)) + ' / ' + GOAL + 'm', W / 2, H * 0.05, 60, C.white);
    game.draw.rect(60, 150, W - 120, 20, C.ink, 0.6);
    game.draw.rect(60, 150, (W - 120) * Math.min(1, dist / GOAL), 20, C.good);
    game.draw.rect(60 + (W - 120) * DUNE_A / GOAL, 150, (W - 120) * (DUNE_B - DUNE_A) / GOAL, 20, C.dune2, 0.8);
    game.draw.rect(60, 180, W - 120, 14, C.ink, 0.5);
    var low = timeLeft < 3 && Math.floor(t * 6) % 2 === 0;
    game.draw.rect(60, 180, (W - 120) * Math.max(0, timeLeft / TIME_LIMIT), 14, low ? C.bad : C.gold);
    if (fever) txt('FEVER', W * 0.82, H * 0.05, 40, C.gold);
    txt('SCORE ' + score, W * 0.17, H * 0.05, 30, C.white);
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { game.audio.play('se_tap'); state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (ready > 0 || ended) { game.audio.play('se_tap', 0.05); return; }
    heave(game.time.elapsed, false);
  });

  // ── ATTRACT ゴースト実演(3秒周期: 速い連打→FEVER→手を止めると失速) ──
  var demo = { t: 0, next: 0, press: 0, gx: W / 2, gy: H * 0.87 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.0;
    if (cyc < dt || demo.t <= dt) { initGame(); ready = 0; demo.next = 0.1; }
    var mashing = cyc < 1.9;
    if (mashing && cyc >= demo.next) { heave(game.time.elapsed, true); demo.press = 0.08; demo.next = cyc + (cyc < 0.6 ? 0.22 : 0.14); }
    if (demo.press > 0) demo.press -= dt;
    stepHaul(dt);
    demo.gx = W / 2 + Math.sin(demo.t * 2) * 20; demo.gy = H * 0.87 - (demo.press > 0 ? 10 : 0);
  }

  function finish(success) {
    ended = true; ok = success; hitStop = 0.45; endWait = 1.1;
    game.fx.flash('#ffffff', 0.2);
    score = Math.round(Math.min(dist, GOAL) * 10 + (success ? timeLeft * 100 : 0));
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;
    if (state === S.ATTRACT) {
      if (dist === undefined) initGame();
      stepDemo(dt);
      drawWorld(t); drawHaulers(t); drawGrip(t);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press > 0, scale: 14 });
      txt(GAME_TITLE, W / 2, H * 0.08 + Math.sin(t * 2) * 6, 90, C.red);
      txt('HI-SCORE ' + (game.best || 0), W / 2, H * 0.135, 36, C.ink);
      if (Math.floor(t * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.96, 46, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.96, 40, C.white);
      return;
    }
    if (state === S.RESULT) { drawWorld(t); drawHaulers(t); drawResult(t); return; }

    if (ended) {
      if (hitStop > 0) {
        hitStop -= dt;
        if (hitStop <= 0) {
          if (ok) { game.audio.play('se_success', 0.7); game.fx.burst(W / 2, H * 0.4, { color: C.red, count: 50, speed: 700 }); }
          else { game.feedback.bad(W / 2, H * 0.7, { text: 'TIME UP' }); game.audio.play('se_failure', 0.6); }
        }
      } else {
        endWait -= dt;
        if (endWait <= 0) {
          state = S.RESULT;
          var stats = { distance: Math.floor(Math.min(dist, GOAL)), taps: taps, fever: feverCount };
          drawWorld(t); drawHaulers(t); drawResult(t);
          if (ok) game.end.success(score, stats); else game.end.failure(stats);
          return;
        }
      }
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap', 0.5);
    } else {
      timeLeft -= dt;
      var before = dist;
      stepHaul(dt);
      score = Math.round(dist * 10);
      if (!milestone && dist >= GOAL / 2) {
        milestone = true; game.audio.play('se_milestone', 0.6);
        game.fx.popup(Math.floor(GOAL / 2) + 'm', W / 2, H * 0.38, { color: C.gold, size: 80 });
      }
      if (before < DUNE_A - 8 && dist >= DUNE_A - 8) game.audio.tone('E4', 0.35, { wave: 'square', volume: 0.05, slide: -120 });
      if (dist >= GOAL) finish(true);
      else if (timeLeft <= 0) { timeLeft = 0; finish(false); }
    }

    drawWorld(t); drawHaulers(t); drawGrip(t); drawHud(t);
    if (ended && hitStop > 0 && !ok) game.draw.circle(W / 2, H * 0.7, 170, C.white, 0.35);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.42, 110, C.red);
  });

  function drawResult(t) {
    game.draw.rect(60, H * 0.3, W - 120, H * 0.38, C.ink, 0.8);
    if (ok) {
      txt('CLEAR', W / 2, H * 0.37, 130, C.good);
      game.draw.sprite(FLAG, { '#': C.red }, W / 2, H * 0.46 + Math.sin(t * 4) * 8, 14, { anchor: 'center' });
    } else {
      txt('GAME OVER', W / 2, H * 0.37, 104, C.bad);
      txt('あと' + Math.max(1, Math.ceil(GOAL - dist)) + 'm!', W / 2, H * 0.46, 64, C.gold);
    }
    txt(Math.floor(Math.min(dist, GOAL)) + ' / ' + GOAL + 'm', W / 2, H * 0.53, 56, C.white);
    txt('SCORE ' + score, W / 2, H * 0.59, 46, C.white);
    var isNew = ok && score > (game.best || 0);
    txt(isNew ? 'NEW RECORD' : 'BEST ' + (game.best || 0), W / 2, H * 0.645, 44, isNew ? C.gold : C.white);
    if (Math.floor(t * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.93, 44, C.white);
  }

  game.onStart(function() {
    game.audio.melody([
      ['A4', 0.5], ['C5', 0.5], ['E5', 0.5], ['A5', 0.5], ['G5', 0.5], ['E5', 0.5], ['D5', 1],
      ['A4', 0.5], ['C5', 0.5], ['D5', 0.5], ['E5', 0.5], ['C5', 0.5], ['B4', 0.5], ['A4', 1]
    ], { tempo: 168, wave: 'sawtooth', volume: 0.035, loop: true, bass: [['A2', 1], ['A2', 1], ['E2', 1], ['E2', 1]] });
    state = S.ATTRACT;
    initGame();
  });
})(game);
