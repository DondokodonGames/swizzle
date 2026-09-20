// I-GBA-0014-pendulum-tick.js
// ペンデュラムティック — 時計工房で一定のリズムで振れ続ける大振り子を、狙った真下のタイミングで止める
// 操作: 一定のリズムで左右に振れる振り子が、中央(真下)を通過する瞬間に合わせてタップする
// 終わり: 規定回数(4回)続けて中央で止められれば成功。ずれたタイミングで止めれば失敗
// @mechanic: rhythm
// @theme: clocksmith_pendulum
// 世界観: 時計工房の作業台。時計職人が調律のため、一定のリズムで振れる大振り子を狙った拍で止め続ける
// 残るもの: 正誤(CLEAR/GAME OVER) + 止められた回数
// スタイル: HYPERCASUAL 3D

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // HYPERCASUAL 3D: 白〜淡色背景 + 単色の丸い塊。真下に柔らかい影。当たり判定が見た目どおり
  var C = {
    bg: '#f4f6fb', bg2: '#e6ecfa', bob: '#ff6b5c', rod: '#8a94ab', pivot: '#3a4258',
    shadow: '#00000022', good: '#2fbf6b', bad: '#e0452e', gold: '#ffb020', white: '#1c2333', ink: '#1c2333',
  };

  var GAME_TITLE = 'PENDULUM TICK';
  var TOTAL = 4;
  var PIVOT_X = W * 0.5, PIVOT_Y = H * 0.3, ROD_LEN = 520;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var stopped, done, endWait, finished, ready, hitStop, shake;
  var theta, omega, round, tempo;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var SMITH = ['.##.', '####', '.##.', '#..#'];
  function bg() {
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    game.draw.sprite(SMITH, { '#': C.pivot }, W * 0.16, H * 0.82, 20, { anchor: 'center' });
  }

  function newRound() {
    tempo = 1.4 + round * 0.12; // 半周期(秒)
    omega = Math.PI / tempo;
  }

  function initGame() {
    stopped = 0; done = false; endWait = 0; finished = false; ready = 0.8; hitStop = 0; shake = 0;
    round = 0; theta = Math.PI / 3.2;
    newRound();
  }

  function bobPos(t) {
    var swing = Math.sin(t) * (Math.PI / 3.2);
    var x = PIVOT_X + Math.sin(swing) * ROD_LEN;
    var y = PIVOT_Y + Math.cos(swing) * ROD_LEN;
    return { x: x, y: y, swing: swing };
  }

  var phaseT;
  function drawScene(p) {
    game.draw.circle(p.x, PIVOT_Y + ROD_LEN + 60, 46, C.shadow);
    game.draw.line(PIVOT_X, PIVOT_Y, p.x, p.y, C.rod, 8);
    game.draw.circle(PIVOT_X, PIVOT_Y, 16, C.pivot);
    // 中央(真下)マーカー: 常時見える的
    game.draw.line(PIVOT_X, PIVOT_Y + ROD_LEN - 50, PIVOT_X, PIVOT_Y + ROD_LEN + 50, C.gold, 4);
    game.draw.circle(p.x, p.y, 42, C.bob);
    game.draw.circle(p.x - 12, p.y - 12, 14, '#ffffff', 0.5);
  }

  function attemptStop() {
    if (finished || ready > 0 || done) return;
    game.audio.play('se_tap', 0.06);
    var p = bobPos(phaseT);
    var dist = Math.abs(p.x - PIVOT_X);
    var success = dist < 60;
    hitStop = success ? 0.12 : 0.3;
    if (success) {
      stopped++;
      game.feedback.good(p.x, p.y, { text: 'TICK', color: C.good });
      game.fx.burst(p.x, p.y, { color: C.gold, count: 16, speed: 340 });
      game.audio.play('se_good', 0.4);
      if (stopped === Math.ceil(TOTAL / 2)) { game.fx.popup(stopped + ' / ' + TOTAL, PIVOT_X, H * 0.14, { color: C.gold, size: 36 }); game.audio.play('se_milestone', 0.3); }
      if (stopped >= TOTAL) { ok = true; finished = true; finish(); return; }
      round++; newRound(); phaseT = -Math.PI / 2;
    } else {
      game.feedback.bad(p.x, p.y, { text: 'MISS' });
      shake = 0.25;
      game.audio.play('se_bad', 0.4);
      ok = false; finished = true; finish();
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); phaseT = -Math.PI / 2; return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) attemptStop();
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  var demo = { t: 0, gx: PIVOT_X, gy: H * 0.86, press: false, phaseT: -Math.PI / 2, picked: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.0;
    if (cyc < dt || demo.t <= dt) { demo.phaseT = -Math.PI / 2; demo.picked = false; }
    demo.phaseT += (Math.PI / 1.4) * dt;
    var p = bobPos(demo.phaseT);
    demo.gx = p.x; demo.gy = p.y;
    if (Math.abs(p.x - PIVOT_X) < 40 && !demo.picked && cyc > 0.3) {
      demo.picked = true; demo.press = true;
      game.feedback.good(p.x, p.y, { text: 'TICK', color: C.good });
      game.audio.play('se_good', 0.25);
    }
    if (demo.picked && cyc > 2.7) demo.press = false;
    phaseT = demo.phaseT;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      bg();
      stepDemo(dt);
      drawScene(bobPos(phaseT));
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 42, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.92, 38, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.92, 26, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawScene(bobPos(phaseT || 0));
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 48, ok ? C.good : C.bad);
      txt(stopped + ' / ' + TOTAL, W / 2, H * 0.13, 30, C.gold);
      if (!ok) txt('あと' + (TOTAL - stopped) + '回!', W / 2, H * 0.18, 24, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.92, 24, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(stopped, { stopped: stopped, total: TOTAL });
        else game.end.failure({ stopped: stopped, total: TOTAL });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      phaseT += omega * dt;
    }
    if (shake > 0) shake -= dt;

    bg();
    if (!finished) drawScene(bobPos(phaseT));

    txt(stopped + ' / ' + TOTAL, W / 2, H * 0.06, 30, C.ink);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.12);
    game.draw.rect(60, 150, (W - 120) * (stopped / TOTAL), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.65, 54, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['C5', 0.15], ['C5', 0.15], ['C5', 0.15], ['G5', 0.3]], { tempo: 100, wave: 'triangle', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
