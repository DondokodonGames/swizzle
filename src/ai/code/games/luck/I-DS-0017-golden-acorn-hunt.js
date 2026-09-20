// I-DS-0017-golden-acorn-hunt.js
// ゴールデンドングリ・ハント — 縁日の穴から一斉に顔を出すモグラの中から、金の帽子の一匹だけを探して触れる
// 操作: 一斉に顔を出す数匹のモグラの中から、金色の帽子をかぶった一匹だけを指で触れる
// 終わり: 規定回数(5回)続けて正解を当てれば成功。外す/触れずに引っ込ませれば失敗
// @mechanic: spot
// @theme: carnival_golden_hat_moles
// 世界観: 縁日のモグラ叩き屋台。店番のタヌキが見守る中、客は金の帽子のモグラだけを見抜いて当てる
// 残るもの: 正誤(CLEAR/GAME OVER) + 当てられた回数
// スタイル: 2000s HANDHELD PASTEL

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2000s HANDHELD PASTEL: パステル、白縁の丸い形
  var C = {
    bgTop: '#ffe9c9', bgBot: '#ffd0e0', hole: '#7a5230', holeEdge: '#4a3018',
    moleFur: '#c98a54', hatPlain: '#7fb8ff', hatGold: '#ffd23a',
    good: '#3fd17a', bad: '#ff5570', gold: '#ffd23a', white: '#ffffff', ink: '#3a2210',
  };

  var GAME_TITLE = 'ACORN HUNT';
  var MAX_TIME = 13;
  var ROUNDS = 5;
  var HOLE_N = 5;
  var HOLES = [];
  for (var h = 0; h < HOLE_N; h++) {
    HOLES.push({ x: W * (0.2 + h * 0.15), y: H * 0.42 + (h % 2 === 0 ? 0 : H * 0.10) });
  }
  var HOLE_R = 96;
  var POP_DUR = 1.35;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var round, hits, goldIdx, popT, resolved, done, endWait, finished, timeLeft;
  var ready, hitStop, shake;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var MOLE_UP = ['.####.', '######', '#.##.#', '######'];
  var MOLE_DOWN = ['......', '.####.', '######', '#.##.#'];
  var TANUKI = ['.####.', '######', '#.##.#', '######', '.#..#.'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bgTop], [1, C.bgBot]]);
    game.draw.rect(0, H * 0.30, W, H * 0.42, '#ffffff', 0.15);
  }

  function newRound() {
    goldIdx = Math.floor(game.random(0, HOLE_N));
    popT = 0; resolved = false;
  }

  function drawHoles(p) {
    for (var i = 0; i < HOLE_N; i++) {
      var hpos = HOLES[i];
      game.draw.circle(hpos.x, hpos.y + 30, HOLE_R, C.holeEdge, 0.9);
      game.draw.circle(hpos.x, hpos.y + 30, HOLE_R - 14, C.hole);
      var up = p > 0.06 && p < 0.86;
      var telegraph = p >= 0.62 && p < 0.86;
      var offset = up ? -70 : 20;
      if (telegraph && Math.floor(game.time.elapsed * 12) % 2 === 0) offset += 6;
      game.draw.sprite(up ? MOLE_UP : MOLE_DOWN, { '#': C.moleFur, '.': null }, hpos.x, hpos.y + offset, 12, { anchor: 'center' });
      if (up) {
        var hatCol = i === goldIdx ? C.hatGold : C.hatPlain;
        game.draw.circle(hpos.x, hpos.y + offset - 78, 30, hatCol);
      }
    }
  }

  function resolvePick(idx, x, y) {
    if (resolved || done || ready > 0 || finished) return;
    resolved = true;
    if (idx === goldIdx) {
      hits++;
      hitStop = 0.12;
      game.feedback.good(x, y, { text: 'NICE', color: C.good });
      game.fx.burst(x, y, { color: C.gold, count: 16, speed: 340 });
      game.audio.play('se_good', 0.4);
      if (hits === Math.ceil(ROUNDS / 2)) { game.fx.popup('50%', W / 2, H * 0.16, { color: C.gold, size: 36 }); game.audio.play('se_milestone', 0.4); }
      if (hits >= ROUNDS) { ok = true; finished = true; hitStop = 0.15; game.audio.play('se_success', 0.5); finish(); return; }
      round++;
      newRound();
    } else {
      hitStop = 0.35;
      game.feedback.bad(x, y, { text: 'MISS' });
      shake = 0.3;
      game.audio.play('se_bad', 0.4);
      ok = false; finished = true; finish();
    }
  }

  function initGame() {
    round = 0; hits = 0; timeLeft = MAX_TIME;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
    newRound();
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state !== S.PLAYING || done || ready > 0 || finished || resolved) return;
    if (popT < 0.06 || popT > 0.86) return; // まだ/もう顔を出していない
    game.audio.play('se_tap', 0.05);
    for (var i = 0; i < HOLE_N; i++) {
      if (Math.hypot(x - HOLES[i].x, y - (HOLES[i].y - 70)) <= HOLE_R + 20) { resolvePick(i, x, y); return; }
    }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.2;
  }

  var demo = { t: 0, gx: HOLES[0].x, gy: HOLES[0].y, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.2;
    if (cyc < dt || demo.t <= dt) { newRound(); demo.pressT = -1; }
    popT = Math.min(1, cyc / POP_DUR);
    if (popT > 0.35 && popT < 0.5 && demo.pressT !== Math.floor(demo.t)) {
      demo.pressT = Math.floor(demo.t);
      demo.gx = HOLES[goldIdx].x; demo.gy = HOLES[goldIdx].y - 70;
      demo.press = true;
    }
    if (popT >= 0.86) demo.press = false;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (round === undefined) initGame();
      bg();
      stepDemo(dt);
      drawHoles(popT);
      game.draw.sprite(TANUKI, { '#': '#c98a54', '.': null }, W * 0.85, H * 0.30, 12, { anchor: 'center' });
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 44, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.13, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.93, 38, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.93, 28, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawHoles(0);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 48, ok ? C.good : C.bad);
      txt(hits + ' / ' + ROUNDS, W / 2, H * 0.13, 30, C.gold);
      if (!ok) txt('あと' + (ROUNDS - hits) + '回!', W / 2, H * 0.18, 26, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.93, 24, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(hits, { hits: hits, rounds: ROUNDS }); else game.end.failure({ hits: hits, rounds: ROUNDS });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      popT += dt / POP_DUR;
      if (popT >= 1 && !resolved) {
        resolved = true;
        hitStop = 0.3;
        game.feedback.bad(HOLES[goldIdx].x, HOLES[goldIdx].y, { text: 'MISS' });
        shake = 0.25;
        game.audio.play('se_bad', 0.4);
        ok = false; finished = true; finish();
      }
      timeLeft -= dt;
      if (timeLeft <= 0 && !finished) {
        finished = true; ok = false; hitStop = 0.2;
        game.feedback.bad(W / 2, H * 0.5, { text: 'TIME UP' });
        game.audio.play('se_failure', 0.4);
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    if (!finished) drawHoles(popT);
    game.draw.sprite(TANUKI, { '#': '#c98a54', '.': null }, W * 0.85, H * 0.30, 12, { anchor: 'center' });

    txt(hits + ' / ' + ROUNDS, W / 2, H * 0.06, 32, C.ink);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.15);
    game.draw.rect(60, 150, (W - 120) * Math.max(0, timeLeft / MAX_TIME), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['G4', 0.25], ['B4', 0.25], ['D5', 0.25], ['G5', 0.5]], { tempo: 150, wave: 'triangle', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
