// D-20222026-0024-dustpath-marksman-relay.js
// ダストパス・マークスマンリレー — 砂漠遺跡を渡り歩く斥候コンビが、遠方に現れる敵だけを狙い撃つ
// 操作: 遺跡の各所に一瞬現れる敵の光る予兆をタップして狙い撃つ。無害な遺物には触れない
// 終わり: 制限時間内に規定数の敵を正しく撃破すれば成功。無害な遺物を撃つ/時間切れで失敗
// @mechanic: aim_shoot
// @theme: dustpath_marksman_relay
// 世界観: 砂漠遺跡を渡り歩く斥候コンビが、狙撃手と偵察を切り替えながら遠方に現れる敵だけを見極めて撃ち抜く
// 残るもの: 正誤(CLEAR/GAME OVER) + 撃破した数
// スタイル: MODE7 PSEUDO

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // MODE7 PSEUDO: 疑似遠近の横帯グラデ地平線、砂漠色の段階的な奥行き
  var STYLE = {
    bg: ['#f0c674', '#c98a4b'],
    main: ['#c0392b', '#f0e6d2'],
    accent: ['#3a2410', '#ffffff'],
  };
  var C = {
    bg1: STYLE.bg[0], bg2: STYLE.bg[1],
    ink: STYLE.accent[0], white: STYLE.accent[1],
    good: '#3fd67e', bad: '#e0554a', gold: '#ffde59',
  };
  var ENEMY_COL = STYLE.main[0];
  var DECOY_COL = '#8fa6c9';

  var GAME_TITLE = 'MARKSMAN RELAY';
  var TIME_LIMIT = 16;
  var TARGET_N = 6;
  var TELEGRAPH = 0.55;
  var ACTIVE_WINDOW = 1.2;
  var SPAWN_GAP = 1.6;

  var FIELD_Y0 = H * 0.22, FIELD_Y1 = H * 0.62;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: '#00000088', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var ENEMY_FRAME = ['#...#', '.#.#.', '..#..', '.#.#.', '#...#'];
  var DECOY_FRAME = ['..#..', '.###.', '#####', '.###.', '..#..'];
  var SCOUT_FRAMES = [
    ['.##.', '####', '.##.', '#.#.'],
    ['.##.', '####', '.##.', '.#.#'],
  ];

  var target, killed, misses, spawnClock;
  var done, endWait, finished, ready, hitStop, shake, timeLeft, halfCalled;

  function spawnTarget() {
    var isDecoy = Math.random() < 0.3;
    target = {
      x: W * (0.2 + Math.random() * 0.6),
      y: FIELD_Y0 + Math.random() * (FIELD_Y1 - FIELD_Y0),
      decoy: isDecoy,
      telegraphT: TELEGRAPH,
      activeT: 0,
      resolved: false,
    };
  }

  function initGame() {
    target = null; killed = 0; misses = 0; spawnClock = 0.6;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; timeLeft = TIME_LIMIT; halfCalled = false;
  }

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg1], [1, C.bg2]]);
    for (var i = 0; i < 5; i++) {
      var y = FIELD_Y1 + i * 20;
      game.draw.rect(0, y, W, 8, '#00000010');
    }
    var bob = Math.sin(game.time.elapsed * 2) * 5;
    game.draw.sprite(SCOUT_FRAMES[Math.floor(game.time.elapsed * 3) % 2], { '#': C.ink }, W * 0.12, H * 0.86 + bob, 12, { anchor: 'center' });
    game.draw.sprite(SCOUT_FRAMES[Math.floor(game.time.elapsed * 3 + 1) % 2], { '#': C.ink }, W * 0.88, H * 0.86 + bob, 12, { anchor: 'center' });
  }

  function drawTarget() {
    if (!target || target.resolved) return;
    if (target.telegraphT > 0) {
      var glow = 0.3 + 0.3 * Math.sin(game.time.elapsed * 12);
      game.draw.circle(target.x, target.y, 60, C.white, glow);
    } else {
      var col = target.decoy ? DECOY_COL : ENEMY_COL;
      var frame = target.decoy ? DECOY_FRAME : ENEMY_FRAME;
      game.draw.circle(target.x, target.y, 70, '#00000022');
      game.draw.sprite(frame, { '#': col }, target.x, target.y, 20, { anchor: 'center' });
    }
  }

  function resolveMiss() {
    target.resolved = true;
    target = null;
    spawnClock = SPAWN_GAP;
  }

  function tryShoot(x, y) {
    if (!target || target.resolved || target.telegraphT > 0) {
      game.feedback.bad(x, y, { text: 'MISS' });
      game.audio.play('se_bad', 0.25);
      return;
    }
    var d = Math.hypot(target.x - x, target.y - y);
    if (d > 90) {
      game.feedback.bad(x, y, { text: 'MISS' });
      game.audio.play('se_bad', 0.25);
      return;
    }
    target.resolved = true;
    if (!target.decoy) {
      killed++;
      game.feedback.good(target.x, target.y, { text: 'GOOD', color: C.good });
      game.fx.burst(target.x, target.y, { color: C.gold, count: 14, speed: 300 });
      game.audio.play('se_break', 0.35);
      if (!halfCalled && killed >= Math.ceil(TARGET_N / 2)) {
        halfCalled = true;
        game.fx.popup('NICE', W * 0.5, FIELD_Y0, { color: C.gold, size: 32 });
        game.audio.play('se_milestone', 0.3);
      }
      target = null;
      spawnClock = SPAWN_GAP;
      if (killed >= TARGET_N) {
        finished = true; ok = true; hitStop = 0.3;
        game.fx.burst(W / 2, FIELD_Y0 + 100, { color: C.gold, count: 24, speed: 420 });
        game.audio.play('se_success', 0.5);
        finish();
      }
    } else {
      misses++;
      timeLeft = Math.max(0.5, timeLeft - 1.5);
      game.feedback.bad(target.x, target.y, { text: 'MISS' });
      game.audio.play('se_bad', 0.35);
      target = null;
      spawnClock = SPAWN_GAP;
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING && ready <= 0 && !finished) tryShoot(x, y);
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  var demo = { t: 0, gx: 0, gy: 0, press: false };
  function resetDemo() { initGame(); }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 6.4;
    if (cyc < dt || demo.t <= dt) resetDemo();
    updateTarget(dt, true);
  }

  function updateTarget(dt, isDemo) {
    if (target && !target.resolved) {
      if (target.telegraphT > 0) {
        target.telegraphT -= dt;
      } else {
        target.activeT += dt;
        if (isDemo && target.activeT > 0.4 && !target.decoy) {
          demo.gx = target.x; demo.gy = target.y; demo.press = true;
          tryShoot(target.x, target.y);
        } else if (isDemo && target.activeT > 0.4 && target.decoy) {
          demo.press = false;
          if (target.activeT > ACTIVE_WINDOW) resolveMiss();
        } else if (!isDemo && target.activeT > ACTIVE_WINDOW) {
          resolveMiss();
        }
      }
    } else if (!target) {
      spawnClock -= dt;
      if (spawnClock <= 0) spawnTarget();
    }
    if (isDemo && (!target || target.resolved)) demo.press = false;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (killed === undefined) initGame();
      bg();
      stepDemo(dt);
      drawTarget();
      game.draw.hand(demo.gx || W * 0.5, demo.gy || H * 0.4, { press: demo.press, scale: 14 });
      txt(GAME_TITLE, W / 2, H * 0.09, 34, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.13, 20, C.white);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.white);
      else txt('INSERT COIN', W / 2, H * 0.94, 28, C.ink);
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawTarget();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.09, 46, ok ? C.good : C.bad);
      txt(killed + ' / ' + TARGET_N, W / 2, H * 0.13, 28, C.white);
      if (!ok) txt('あと' + (TARGET_N - killed) + '体!', W / 2, H * 0.18, 24, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(killed, { killed: killed, misses: misses });
        else game.end.failure({ killed: killed, misses: misses });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      timeLeft -= dt;
      updateTarget(dt, false);
      if (timeLeft <= 0) {
        timeLeft = 0; finished = true; ok = false; hitStop = 0.35; shake = 0.2;
        game.feedback.bad(W * 0.5, FIELD_Y0, { text: 'TIME UP' });
        game.audio.play('se_bad', 0.4);
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawTarget();

    txt(killed + ' / ' + TARGET_N, W / 2, H * 0.07, 28, C.ink);
    var tbW = W - 120;
    var lowTime = timeLeft < 3 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(60, 200, tbW, 14, '#00000033');
    game.draw.rect(60, 200, tbW * Math.max(0, timeLeft / TIME_LIMIT), 14, lowTime ? C.bad : C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.42, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['A3', 0.2], ['C4', 0.2], ['E4', 0.2], ['A4', 0.4]], { tempo: 132, wave: 'triangle', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
