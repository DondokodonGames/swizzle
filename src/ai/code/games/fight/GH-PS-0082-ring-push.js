// GH-PS-0082-ring-push.js
// リングプッシュ — 相手の構え(押す/引く/はたく)を読み、正しい返し技で押し返す
// 操作: 相手の構えを見て、それに勝つ技を選んでタップ(押す<引く<はたく<押す の三すくみ)
// 終わり: 土俵の外まで押し切れば勝ち、押し出されれば負け。ラリー数が残る
// @mechanic: turn_attack
// @theme: ring_duel
// 世界観: 土俵の上、二人が組み合う。相手は毎回どれかの構えを見せる。三すくみで勝つ技を選べば押し、外せば押される
// 残るもの: 勝敗(CLEAR/GAME OVER) + ラリー数 + 正答数
// スタイル: 90s 16bit

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // 90s 16bit: 多色・高彩度。2〜3層の背景で奥行き、表情のあるスプライト
  var C = {
    sky1: '#ffd98a', sky2: '#ff9a5a', far: '#e8875a', mid: '#c96a48', ring: '#e0b060', ringLine: '#8a5a2a',
    p1: '#4a7ae8', p2: '#e84a4a', good: '#4dcf8a', bad: '#ff5a6a', gold: '#ffd400', white: '#ffffff', ink: '#2a1a10',
  };

  var GAME_TITLE = 'RING PUSH';
  var MOVES = ['push', 'pull', 'slap'];
  var BEATS = { push: 'slap', pull: 'push', slap: 'pull' };   // key が勝つ相手
  var COUNTER = { push: 'pull', pull: 'slap', slap: 'push' }; // 相手の技に勝つ技

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false, rounds = 0, correct = 0;

  var oppMove, decideT, decideMax, position, done, endWait, finished;
  var ready, hitStop, shake;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var CX = W / 2, RY = H * 0.42, RR = 280;

  var CROWD = (function() {
    var arr = [];
    for (var i = 0; i < 16; i++) arr.push({ x: (i * 71 + 23) % W, y: H * (0.62 + (i % 4) * 0.045), r: 16 + (i % 3) * 4, c: i % 2 === 0 ? C.p1 : C.p2 });
    return arr;
  })();

  function ringBg() {
    game.draw.gradient(0, H * 0.5, [[0, C.sky1], [1, C.sky2]]);
    game.draw.rect(0, H * 0.5, W, H * 0.5, C.far);
    game.draw.circle(CX, H * 0.17, 46, '#fff2c8', 0.7);
    for (var i = 0; i < 6; i++) game.draw.rect(i * 190 + 10, H * 0.20, 14, H * 0.20, C.mid, 0.5);
    game.draw.circle(CX, RY + 40, RR, C.ring);
    game.draw.circle(CX, RY + 40, RR, C.ringLine, 0.0);
    game.draw.circle(CX, RY + 40, RR - 14, C.ringLine, 0.25);
    for (var a = 0; a < 24; a++) {
      var ang = (a / 24) * Math.PI * 2;
      game.draw.circle(CX + Math.cos(ang) * RR, RY + 40 + Math.sin(ang) * RR * 0.7, 6, C.ringLine, 0.6);
    }
    // 観客(下部の空きを埋める)
    game.draw.rect(0, H * 0.58, W, H * 0.28, C.mid, 0.25);
    for (var c = 0; c < CROWD.length; c++) {
      var o = CROWD[c];
      game.draw.circle(o.x, o.y, o.r, o.c, 0.35);
    }
  }

  var MOVE_ICON = {
    push: ['.#.#.', '#####', '.#.#.'],
    pull: ['#...#', '.###.', '#...#'],
    slap: ['##...', '.##..', '..###'],
  };
  var ICON_PAL_P1 = { '#': C.p1 };
  var ICON_PAL_P2 = { '#': C.p2 };

  var P1_SPRITE = ['.###.', '#####', '.#.#.', '#####', '#.#.#'];
  var P2_SPRITE = ['.###.', '#####', '.#.#.', '#####', '#.#.#'];

  function initGame() {
    rounds = 0; correct = 0; position = 0; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
    newRound();
  }

  function newRound() {
    oppMove = MOVES[Math.floor(Math.random() * 3)];
    decideMax = Math.max(0.65, 1.3 - rounds * 0.06);
    decideT = decideMax;
  }

  var ZONE_X = [W * 0.22, W * 0.5, W * 0.78];

  function choose(idx) {
    if (done || ready > 0 || hitStop > 0 || finished) return;
    var picked = MOVES[idx];
    hitStop = 0.08;
    rounds++;
    if (picked === COUNTER[oppMove]) {
      correct++;
      position += 0.22;
      game.feedback.good(ZONE_X[idx], H * 0.86, { text: 'HIT', color: C.good });
      game.fx.burst(CX, RY + 40, { color: C.good, count: 12, speed: 320 });
      game.audio.play('se_good', 0.35);
    } else {
      position -= 0.22;
      game.feedback.bad(ZONE_X[idx], H * 0.86, { text: 'MISS' });
      shake = 0.14;
      game.audio.play('se_bad', 0.35);
    }
    if (position >= 1) { ok = true; finished = true; resolve(); }
    else if (position <= -1) { ok = false; finished = true; resolve(); }
    else { newRound(); if (rounds % 3 === 0) game.fx.popup(rounds + '本', W / 2, H * 0.20, { color: C.gold, size: 44 }); }
  }

  function resolve() {
    if (ok) { game.audio.play('se_success', 0.5); } else { shake = 0.3; game.audio.play('se_failure', 0.5); }
    finish();
  }

  function timeoutMiss() {
    if (done || finished) return;
    rounds++;
    position -= 0.18;
    game.feedback.bad(CX, RY, { text: 'MISS' });
    shake = 0.12;
    game.audio.play('se_bad', 0.3);
    if (position <= -1) { ok = false; finished = true; resolve(); }
    else newRound();
  }

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.4;
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (y < H * 0.72) return;
    var idx = -1, best = 999;
    for (var i = 0; i < 3; i++) { var d = Math.abs(x - ZONE_X[i]); if (d < best) { best = d; idx = i; } }
    choose(idx);
  });

  function drawZones() {
    for (var i = 0; i < 3; i++) {
      var m = MOVES[i];
      game.draw.circle(ZONE_X[i], H * 0.86, 78, C.p1, 0.85);
      game.draw.sprite(MOVE_ICON[m], ICON_PAL_P2, ZONE_X[i], H * 0.86, 12, { anchor: 'center' });
    }
  }

  function drawWrestlers() {
    game.draw.circle(CX - 130, RY + 60, 60, '#000000', 0.25);
    game.draw.circle(CX + 130, RY + 60, 60, '#000000', 0.25);
    game.draw.sprite(P1_SPRITE, ICON_PAL_P1, CX - 130, RY, 22, { anchor: 'center' });
    game.draw.sprite(P2_SPRITE, ICON_PAL_P2, CX + 130, RY, 22, { anchor: 'center' });
    if (oppMove && !done) {
      game.draw.circle(CX + 130, RY - 90, 44, C.p2, 0.9);
      game.draw.sprite(MOVE_ICON[oppMove], ICON_PAL_P1, CX + 130, RY - 90, 10, { anchor: 'center' });
    }
    // 位置バー(綱引き)
    var barX = CX + position * 220;
    game.draw.line(CX - 260, RY + 140, CX + 260, RY + 140, C.ringLine, 4);
    game.draw.circle(barX, RY + 140, 18, C.gold);
  }

  // ── ATTRACT ゴースト実演: 相手の構えを見て正しい技を選ぶ ──
  var demo = { t: 0, gx: ZONE_X[1], gy: H * 0.86, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 2.6;
    if (cyc < dt) oppMove = MOVES[Math.floor(Math.random() * 3)];
    var idx = MOVES.indexOf(COUNTER[oppMove] || 'push');
    var tx = ZONE_X[idx];
    demo.gx += (tx - demo.gx) * Math.min(1, dt * 5);
    demo.press = cyc > 1.8 && cyc < 2.0;
    if (cyc > 1.8 && cyc < 1.83) { game.feedback.good(tx, H * 0.86, { text: 'HIT', color: C.good }); game.fx.burst(CX, RY + 40, { color: C.good, count: 10, speed: 300 }); }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (position === undefined) initGame();
      ringBg();
      stepDemo(dt);
      drawWrestlers();
      drawZones();
      game.draw.hand(demo.gx, demo.gy - 90, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.06, 56, C.ink);
      txt('BEST ' + (game.best > 0 ? 'CLEAR' : '-'), W / 2, H * 0.11, 28, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.95, 44, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.95, 32, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      ringBg();
      drawWrestlers();
      drawZones();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.06, 54, ok ? C.good : C.bad);
      txt(correct + ' / ' + rounds, W / 2, H * 0.12, 34, C.gold);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.95, 32, C.ink);
      return;
    }

    // ── PLAYING ──
    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success({ rounds: rounds, correct: correct });
        else game.end.failure({ rounds: rounds, correct: correct });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      decideT -= dt;
      if (decideT <= 0) timeoutMiss();
    }
    if (shake > 0) shake -= dt;

    ringBg();
    drawWrestlers();
    drawZones();

    if (!finished && !done) {
      var frac = Math.max(0, decideT / decideMax);
      game.draw.rect(60, 40, W - 120, 20, C.ink, 0.5);
      game.draw.rect(60, 40, (W - 120) * frac, 20, frac < 0.3 ? C.bad : C.gold);
    }
    txt(rounds + '本目', W / 2, 106, 34, C.white);

    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.30, 78, C.gold);
  });

  game.onStart(function() {
    game.audio.bgm('bgm_cute', 0.10);
    state = S.ATTRACT;
    initGame();
  });
})(game);
