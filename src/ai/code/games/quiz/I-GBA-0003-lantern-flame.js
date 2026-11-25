// I-GBA-0003-lantern-flame.js
// ランタンフレイム — 夜市に並ぶ3つの提灯から、本物の炎が灯る1つを見分けて選ぶ
// 操作: 3つの提灯のうち、揺れ方が本物の炎らしい1つをタップして選ぶ。偽物を選ぶと失敗
// 終わり: 規定回数(3回)連続で本物を当て続ければ成功。1度でも偽物を選べば失敗
// @mechanic: judge
// @theme: night_market_lantern
// 世界観: 夜の縁日の屋台。3つ並んだ提灯のうち2つは偽の明かり、1つだけ本物の炎が揺れている。鑑定人がそれを見抜き続ける
// 残るもの: 正誤(CLEAR/GAME OVER) + 連続で見抜いた数
// スタイル: 2000s HANDHELD PASTEL

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2000s HANDHELD PASTEL: パステル、白縁の丸い形、上下に情報帯
  var C = {
    bg: '#2a1f3a', bg2: '#4a3560', lantern: '#ffd9a0', lanternDark: '#c99a55',
    flame: '#ff8a5c', flameCore: '#ffe27a',
    good: '#7de88a', bad: '#ff7d9c', gold: '#ffd166', white: '#fff6ea', ink: '#241733',
  };

  var GAME_TITLE = 'LANTERN FLAME';
  var ROUNDS = 3;
  var CY = H * 0.46;
  var SLOT_X = [W * 0.24, W * 0.5, W * 0.76];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var correct, done, endWait, finished, ready, hitStop, shake;
  var realIdx, lanterns, revealT, revealed;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var LANTERN_SPRITE = ['.####.', '######', '######', '.####.', '..##..'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    for (var i = 0; i < 6; i++) game.draw.circle(W * (0.1 + i * 0.18), H * 0.12, 5, '#ffffff40');
    game.draw.rect(0, H * 0.62, W, H * 0.38, '#00000022');
  }

  function newRound() {
    realIdx = Math.floor(game.random(0, 3));
    lanterns = [];
    for (var i = 0; i < 3; i++) lanterns.push({ x: SLOT_X[i], real: i === realIdx, phase: game.random(0, 6.28) });
    revealT = 0.3; revealed = false;
  }

  function initGame() {
    correct = 0; done = false; endWait = 0; finished = false; ready = 0.8; hitStop = 0; shake = 0;
    newRound();
  }

  function drawFlame(l, t, lit) {
    game.draw.sprite(LANTERN_SPRITE, { '#': C.lantern }, l.x, CY, 20, { anchor: 'center' });
    if (!lit) return;
    var wob = l.real
      ? Math.sin(t * 9 + l.phase) * 8 + Math.sin(t * 3.3 + l.phase) * 5
      : Math.sin(t * 4 + l.phase) * 7;
    var fy = CY - 30;
    game.draw.circle(l.x + wob, fy, 22, C.flame, 0.8);
    game.draw.circle(l.x + wob * 0.6, fy - 6, 12, C.flameCore, 0.9);
  }

  function resolvePick(idx) {
    if (finished || ready > 0 || done || !revealed) return;
    var l = lanterns[idx];
    var success = l.real;
    hitStop = success ? 0.12 : 0.35;
    if (success) {
      correct++;
      game.feedback.good(l.x, CY, { text: 'REAL', color: C.good });
      game.fx.burst(l.x, CY, { color: C.gold, count: 14, speed: 320 });
      game.audio.play('se_good', 0.4);
      if (correct === Math.ceil(ROUNDS / 2)) { game.fx.popup(correct + ' / ' + ROUNDS, W / 2, H * 0.16, { color: C.gold, size: 38 }); game.audio.play('se_milestone', 0.4); }
      if (correct >= ROUNDS) { ok = true; finished = true; finish(); } else newRound();
    } else {
      game.feedback.bad(l.x, CY, { text: 'FAKE' });
      shake = 0.3;
      game.audio.play('se_bad', 0.4);
      ok = false; finished = true; finish();
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) {
      if (ready > 0 || finished || !revealed) return;
      game.audio.play('se_tap', 0.05);
      var best = -1, bestD = 1e9;
      for (var i = 0; i < lanterns.length; i++) {
        var d = Math.abs(lanterns[i].x - x) + Math.abs(CY - y);
        if (d < bestD) { bestD = d; best = i; }
      }
      if (bestD < 170) resolvePick(best);
    }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function stepPlay(dt) {
    if (!revealed) {
      revealT -= dt;
      if (revealT <= 0) { revealed = true; game.audio.play('se_coin', 0.2); }
    }
  }

  var demo = { t: 0, gx: SLOT_X[0], gy: H * 0.86, press: false, realIdx: 0, lanterns: null, picked: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.4;
    if (cyc < dt || demo.t <= dt) {
      demo.realIdx = Math.floor(game.random(0, 3));
      demo.lanterns = [];
      for (var i = 0; i < 3; i++) demo.lanterns.push({ x: SLOT_X[i], real: i === demo.realIdx, phase: game.random(0, 6.28) });
      demo.picked = false; demo.press = false;
    }
    var lit = cyc > 0.3;
    if (cyc > 1.5 && cyc < 1.9 && !demo.picked) {
      demo.gx = SLOT_X[demo.realIdx]; demo.gy = CY; demo.press = true; demo.picked = true;
      game.feedback.good(SLOT_X[demo.realIdx], CY, { text: 'REAL', color: C.good });
      game.audio.play('se_good', 0.25);
    }
    if (cyc > 2.1) demo.press = false;
    lanterns = demo.lanterns || lanterns;
    realIdx = demo.realIdx;
    revealed = lit;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      bg();
      stepDemo(dt);
      if (lanterns) for (var i = 0; i < lanterns.length; i++) drawFlame(lanterns[i], demo.t, revealed);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 44, C.white);
      txt('BEST ' + (game.best > 0 ? game.best + ' / ' + ROUNDS : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.92, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.92, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      if (lanterns) for (var j = 0; j < lanterns.length; j++) drawFlame(lanterns[j], game.time.elapsed, true);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      txt(correct + ' / ' + ROUNDS, W / 2, H * 0.13, 32, C.gold);
      if (!ok && correct === ROUNDS - 1) txt('あと1個!', W / 2, H * 0.18, 26, C.white);
      if (ok && (game.best === 0 || correct > game.best)) txt('NEW RECORD', W / 2, H * 0.18, 26, C.gold);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.92, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        var stats = { correct: correct, total: ROUNDS };
        if (ok) game.end.success(correct, stats);
        else game.end.failure(stats);
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      stepPlay(dt);
    }
    if (shake > 0) shake -= dt;

    bg();
    if (!finished && lanterns) for (var k = 0; k < lanterns.length; k++) drawFlame(lanterns[k], game.time.elapsed, revealed);
    txt(correct + ' / ' + ROUNDS, W / 2, H * 0.06, 32, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * (correct / ROUNDS), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.72, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['E4', 0.3], ['G4', 0.3], ['B4', 0.3], ['E5', 0.5]], { tempo: 118, wave: 'triangle', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
