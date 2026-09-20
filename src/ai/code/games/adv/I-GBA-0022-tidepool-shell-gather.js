// I-GBA-0022-tidepool-shell-gather.js
// タイドプールシェルギャザー — 波打ち際に散らばる貝殻を、時間内にできるだけ多く連続タップで拾い集める
// 操作: 散らばった貝殻を見つけ次第タップして拾う。逃げないので拾える限り連続で叩く
// 終わり: 制限時間終了で成功。個数がノルマに届けば大成功演出
// @mechanic: chase
// @theme: tidepool_shell_collector
// 世界観: 引き潮の浜辺で、次の満ち潮が来る前に貝殻拾いの子供が散らばった貝を一つでも多く連続で拾い集める
// 残るもの: 正誤(CLEAR/GAME OVER) + 拾った貝殻の数
// スタイル: 2010s FLAT MOBILE

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2010s FLAT MOBILE: フラットな明色、影なし、大きく単純な図形
  var C = {
    bg: '#ffe9a8', bg2: '#ffd166', sand: '#f4c869', sandDark: '#e0af4a',
    sea: '#4fc3e0', seaDark: '#2b93b5', shell: '#ff8fa3', shellDark: '#e35c78',
    good: '#3ecf6a', bad: '#ff5a5a', gold: '#ffb703', white: '#ffffff', ink: '#3a2410',
  };

  var GAME_TITLE = 'SHELL GATHER';
  var DUR = 16;
  var GOAL = 8;
  var FIELD_Y0 = H * 0.20, FIELD_Y1 = H * 0.62;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var shells, gathered, timeLeft, done, endWait, finished, childX, childY;
  var ready, hitStop, shake, milestoneShown, tideWarn;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var CHILD = ['.##.', '####', '.##.', '#..#'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    game.draw.rect(0, 0, W, H * 0.16, C.sea);
    game.draw.rect(0, H * 0.14, W, 14, C.seaDark);
    game.draw.rect(0, H * 0.64, W, H * 0.36, C.sand);
  }

  function spawnShells(n) {
    var arr = [];
    for (var i = 0; i < n; i++) {
      arr.push({ x: game.random(W * 0.12, W * 0.88), y: game.random(FIELD_Y0, FIELD_Y1), got: false });
    }
    return arr;
  }

  function initGame() {
    shells = spawnShells(6); gathered = 0; timeLeft = DUR;
    done = false; endWait = 0; finished = false;
    childX = W * 0.5; childY = FIELD_Y1 + 60;
    ready = 0.8; hitStop = 0; shake = 0; milestoneShown = false; tideWarn = 0;
  }

  function tryGather(x, y) {
    if (ready > 0 || finished) return;
    var best = -1, bestD = 1e9;
    for (var i = 0; i < shells.length; i++) {
      if (shells[i].got) continue;
      var d = Math.hypot(shells[i].x - x, shells[i].y - y);
      if (d < 90 && d < bestD) { bestD = d; best = i; }
    }
    if (best >= 0) {
      shells[best].got = true;
      gathered++;
      childX = shells[best].x; childY = shells[best].y;
      hitStop = 0.06;
      game.feedback.good(shells[best].x, shells[best].y, { text: 'NICE', color: C.good, size: 26 });
      game.audio.play('se_coin', 0.4);
      if (!milestoneShown && gathered === GOAL) {
        milestoneShown = true;
        game.fx.popup('GOAL!', W / 2, H * 0.3, { color: C.gold, size: 40 });
        game.audio.play('se_milestone', 0.4);
      }
      if (shells.every(function(s) { return s.got; })) shells = shells.concat(spawnShells(4));
    } else {
      game.feedback.bad(x, y, {});
      game.audio.play('se_tap', 0.15);
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) tryGather(x, y);
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function drawShells() {
    for (var i = 0; i < shells.length; i++) {
      if (shells[i].got) continue;
      game.draw.circle(shells[i].x, shells[i].y, 26, C.shellDark);
      game.draw.circle(shells[i].x, shells[i].y, 18, C.shell);
    }
  }

  function drawChild() {
    game.draw.sprite(CHILD, { '#': C.gold }, childX, childY, 22, { anchor: 'center' });
  }

  var demo = { t: 0, gx: W * 0.5, gy: FIELD_Y1 + 60, press: false, shells: [] };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.2;
    if (cyc < dt || demo.t <= dt) {
      demo.shells = [
        { x: W * 0.32, y: H * 0.28, tap: 0.5 },
        { x: W * 0.68, y: H * 0.36, tap: 1.6 },
        { x: W * 0.45, y: H * 0.5, tap: 2.7 },
      ];
    }
    shells = [];
    for (var i = 0; i < demo.shells.length; i++) {
      var d = demo.shells[i];
      if (cyc < d.tap - 0.4) shells.push({ x: d.x, y: d.y, got: false });
      if (cyc > d.tap - 0.15 && cyc < d.tap + 0.05) {
        demo.gx = d.x; demo.gy = d.y; demo.press = true;
        if (!d._fired) { d._fired = true; game.feedback.good(d.x, d.y, { text: 'NICE', color: C.good, size: 26 }); game.audio.play('se_coin', 0.25); childX = d.x; childY = d.y; }
      }
      if (cyc >= d.tap + 0.05) { demo.press = false; d._fired = d._fired; }
      else if (cyc < d.tap - 0.15) d._fired = false;
      if (cyc < d.tap - 0.4) {} // still shown above
      if (cyc > d.tap + 0.05) {} // gathered, not re-added
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      bg();
      stepDemo(dt);
      drawShells();
      drawChild();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 42, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 24, C.seaDark);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 28, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawChild();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      txt(gathered + ' / ' + GOAL, W / 2, H * 0.13, 32, C.gold);
      if (!ok) txt('あと' + Math.max(1, GOAL - gathered) + '個!', W / 2, H * 0.18, 26, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(gathered, { gathered: gathered, goal: GOAL });
        else game.end.failure({ gathered: gathered, goal: GOAL });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      timeLeft -= dt;
      if (timeLeft <= 3 && tideWarn <= 0) tideWarn = 3;
      if (tideWarn > 0) tideWarn -= dt;
      if (timeLeft <= 0) {
        ok = gathered >= Math.ceil(GOAL * 0.6);
        finished = true; finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    if (tideWarn > 0) {
      var blink = Math.floor(game.time.elapsed * 10) % 2 === 0;
      if (blink) game.draw.rect(0, H * 0.14, W, 20, C.bad, 0.5);
    }
    drawShells();
    drawChild();

    txt(gathered + ' / ' + GOAL, W / 2, H * 0.06, 32, C.ink);
    game.draw.rect(60, 150, W - 120, 16, C.sandDark, 0.6);
    game.draw.rect(60, 150, (W - 120) * Math.max(0, timeLeft / DUR), 16, C.seaDark);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['E4', 0.3], ['G4', 0.3], ['B4', 0.3], ['E5', 0.6]], { tempo: 128, wave: 'triangle', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
