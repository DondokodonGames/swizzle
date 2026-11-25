// I-GBA-0019-forge-ember-tap.js
// フォージエンバータップ — 炉の通気口から不意に弾け出る火の粉を、開いた瞬間だけ叩いて消す
// 操作: 通気口が光って開いた瞬間(短い判定窓)にその穴をタップする
// 終わり: 規定回数(6回)叩ければ成功。判定窓を逃す/外れた穴を叩けば失敗
// @mechanic: timing_window
// @theme: blacksmith_forge_vent_tending
// 世界観: 鍛冶場の見習いが、炉の通気口からランダムに弾け出す火の粉を、開いている一瞬だけ叩いて火事を防ぐ
// 残るもの: 正誤(CLEAR/GAME OVER) + 消せた火の粉の数
// スタイル: 8bit PC MONITOR

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 8bit PC MONITOR: くすんだ琥珀モノクロ風+アンバー1色発光
  var C = {
    bg: '#1a1208', bg2: '#0e0a04', wall: '#2a1e10', wallLine: '#40301a',
    ember: '#ff8a1e', emberGlow: '#7a3a06', vent: '#3a2a16', ventOpen: '#ffcf6a',
    good: '#8aff5a', bad: '#ff4d3a', gold: '#ffd24d', white: '#f4e8cf', ink: '#0a0602',
  };

  var GAME_TITLE = 'FORGE EMBER';
  var TOTAL = 6;
  var VENTS = [
    { x: W * 0.26, y: H * 0.36 }, { x: W * 0.5, y: H * 0.30 }, { x: W * 0.74, y: H * 0.36 },
    { x: W * 0.30, y: H * 0.52 }, { x: W * 0.70, y: H * 0.52 },
  ];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var tapped, done, endWait, finished, active, cycleT, missedWindow;
  var ready, hitStop, shake, milestoneShown;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var SMITH = ['.##.', '####', '.##.', '#..#'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    for (var i = 0; i < 6; i++) game.draw.rect(0, H * 0.2 + i * 34, W, 2, C.wallLine, 0.4);
    game.draw.rect(0, H * 0.68, W, 30, C.wall);
  }

  function newActive() {
    var idx = Math.floor(game.random(0, VENTS.length));
    var telegraph = 0.6;
    var open = 0.42;
    return { idx: idx, t: 0, telegraph: telegraph, open: open, resolved: false };
  }

  function initGame() {
    tapped = 0; done = false; endWait = 0; finished = false; missedWindow = 0;
    ready = 0.8; hitStop = 0; shake = 0; milestoneShown = false;
    active = newActive(); cycleT = 0;
  }

  function tryTap(x, y) {
    if (!active || ready > 0 || finished || active.resolved) return;
    var p = active.t - active.telegraph;
    var v = VENTS[active.idx];
    var hitVent = Math.hypot(x - v.x, y - v.y) < 80;
    if (p >= 0 && p <= active.open && hitVent) {
      active.resolved = true;
      tapped++;
      hitStop = 0.1;
      game.feedback.good(v.x, v.y, { text: 'GOOD', color: C.good });
      game.fx.burst(v.x, v.y, { color: C.gold, count: 14, speed: 300 });
      game.audio.play('se_good', 0.35);
      if (!milestoneShown && tapped === Math.ceil(TOTAL / 2)) {
        milestoneShown = true;
        game.fx.popup('HALFWAY!', W / 2, H * 0.2, { color: C.gold, size: 38 });
        game.audio.play('se_milestone', 0.4);
      }
      if (tapped >= TOTAL) { ok = true; finished = true; finish(); return; }
      active = newActive();
    } else {
      game.audio.play('se_tap', 0.15);
      active.resolved = true;
      hitStop = 0.3;
      game.feedback.bad(x, y, { text: 'MISS' });
      shake = 0.25;
      game.audio.play('se_bad', 0.4);
      ok = false; finished = true; finish();
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) tryTap(x, y);
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function drawVents(activeOne) {
    for (var i = 0; i < VENTS.length; i++) {
      var v = VENTS[i];
      var isOpen = activeOne && activeOne.idx === i && activeOne.t >= activeOne.telegraph && activeOne.t <= activeOne.telegraph + activeOne.open && !activeOne.resolved;
      var isTele = activeOne && activeOne.idx === i && activeOne.t < activeOne.telegraph && !activeOne.resolved;
      game.draw.circle(v.x, v.y, 60, C.vent);
      if (isTele) {
        var blink = Math.floor(game.time.elapsed * 10) % 2 === 0;
        if (blink) game.draw.circle(v.x, v.y, 66, C.bad, 0.35);
      }
      if (isOpen) {
        game.draw.circle(v.x, v.y, 60, C.emberGlow, 0.7);
        game.draw.circle(v.x, v.y, 34, C.ember);
        game.draw.circle(v.x, v.y, 18, C.ventOpen);
      }
    }
  }

  var demo = { t: 0, gx: VENTS[0].x, gy: VENTS[0].y, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 2.4;
    if (cyc < dt || demo.t <= dt) { active = newActive(); active.idx = 1; active.telegraph = 0.5; active.open = 0.45; }
    active.t = cyc;
    var v = VENTS[active.idx];
    if (cyc > active.telegraph && cyc < active.telegraph + active.open && !active.resolved) {
      active.resolved = true;
      demo.gx = v.x; demo.gy = v.y; demo.press = true;
      game.feedback.good(v.x, v.y, { text: 'GOOD', color: C.good });
      game.audio.play('se_good', 0.2);
    }
    if (cyc < 0.2) { demo.press = false; }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      bg();
      stepDemo(dt);
      drawVents(active);
      game.draw.sprite(SMITH, { '#': C.gold }, W * 0.5, H * 0.82, 24, { anchor: 'center' });
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 44, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      game.draw.sprite(SMITH, { '#': ok ? C.gold : C.bad }, W * 0.5, H * 0.82, 24, { anchor: 'center' });
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      txt(tapped + ' / ' + TOTAL, W / 2, H * 0.13, 32, C.gold);
      if (!ok) txt('あと' + (TOTAL - tapped) + '個!', W / 2, H * 0.18, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(tapped, { tapped: tapped, total: TOTAL });
        else game.end.failure({ tapped: tapped, total: TOTAL });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      active.t += dt;
      if (active.t > active.telegraph + active.open && !active.resolved) {
        active.resolved = true;
        hitStop = 0.3;
        var v = VENTS[active.idx];
        game.feedback.bad(v.x, v.y, { text: 'MISS' });
        shake = 0.25;
        game.audio.play('se_bad', 0.4);
        ok = false; finished = true; finish();
      } else if (active.resolved && active.t > active.telegraph + active.open + 0.15) {
        active = newActive();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawVents(active);
    game.draw.sprite(SMITH, { '#': C.gold }, W * 0.5, H * 0.82, 24, { anchor: 'center' });

    txt(tapped + ' / ' + TOTAL, W / 2, H * 0.06, 32, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.4);
    game.draw.rect(60, 150, (W - 120) * (tapped / TOTAL), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['E3', 0.3], ['G3', 0.3], ['A3', 0.3], ['E3', 0.6]], { tempo: 150, wave: 'sawtooth', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
