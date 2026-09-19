// GH-PS-0032-boulder-dash-dodge.js
// キャニオンダッシュ — 3本の坑道レーンを走り、転がってくる岩をスワイプで避け続ける
// 操作: 左右にスワイプしてレーンを切り替える。岩が来る前に土煙の予告が出るレーンを避ける
// 終わり: 規定個数の岩を避ければ成功。1回でも直撃すれば失敗
// @mechanic: dodge
// @theme: mine_canyon_run
// 世界観: 採掘用トロッコの3本レーン。奥から岩が転がってくる。土煙の予告のあと岩が来るので、来る直前にレーンを移る。避け続けるとまれに幸運な追い風(フィーバー)が来る
// 残るもの: 正誤(CLEAR/GAME OVER) + 避けた個数
// スタイル: 8bit PC MONITOR

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // 8bit PC MONITOR: 高解像度・低色数。8色ベタ、細い線、テキスト枠のUI
  var C = {
    bg1: '#2a2418', bg2: '#141008', wall: '#4a3c24', wallLine: '#6a5838',
    lane: '#302818', laneLine: '#5a4a2c', rock: '#8a7458', rockDark: '#5a4a34',
    runner: '#3ad4ff', good: '#5aff8a', bad: '#ff4a4a', gold: '#ffd400', white: '#f0ecd8', ink: '#100c06',
  };

  var GAME_TITLE = 'CANYON DASH';
  var NEEDED = 12;
  var LANE_X = [W * 0.22, W * 0.5, W * 0.78];
  var RUNNER_Y = H * 0.80;
  var WARN_Y = H * 0.16, START_Y = H * 0.20;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var lane, dodged, spawnT, spawnInterval, speed, boulders, fever, feverT;
  var done, endWait, finished, runFrame;
  var ready, hitStop, shake;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function canyonBg() {
    game.draw.gradient(0, H, [[0, C.bg1], [1, C.bg2]]);
    game.draw.rect(LANE_X[0] - 110, 0, LANE_X[2] - LANE_X[0] + 220, H, C.lane);
    for (var l = 0; l < 3; l++) {
      game.draw.rect(LANE_X[l] - 100, 0, 6, H, C.laneLine);
      game.draw.rect(LANE_X[l] + 94, 0, 6, H, C.laneLine);
    }
    game.draw.rect(0, 0, LANE_X[0] - 110, H, C.wall);
    game.draw.rect(LANE_X[2] + 110, 0, W - (LANE_X[2] + 110), H, C.wall);
  }

  var RUNNER_A = ['..#..', '.###.', '..#..', '.#.#.'];
  var RUNNER_B = ['..#..', '.###.', '..#..', '#...#'];
  var ROCK_SPRITE = ['.###.', '#####', '.###.'];

  function drawRunner() {
    var frame = runFrame % 2 === 0 ? RUNNER_A : RUNNER_B;
    game.draw.circle(LANE_X[lane], RUNNER_Y + 46, 40, '#00000040');
    game.draw.sprite(frame, { '#': fever > 0 ? C.gold : C.runner }, LANE_X[lane], RUNNER_Y, 15, { anchor: 'center' });
  }

  function drawBoulders() {
    for (var i = 0; i < boulders.length; i++) {
      var b = boulders[i];
      var x = LANE_X[b.lane];
      if (!b.spawned) {
        var blink = Math.floor(game.time.elapsed * 12) % 2 === 0;
        if (blink) {
          game.draw.rect(x - 70, WARN_Y - 14, 140, 26, C.bad, 0.55);
          game.draw.circle(x, WARN_Y, 10, C.bad, 0.8);
        }
      } else {
        game.draw.circle(x, b.y + 30, 46, '#00000035');
        game.draw.circle(x, b.y, 66, C.rockDark);
        game.draw.sprite(ROCK_SPRITE, { '#': C.rock }, x, b.y, 14, { anchor: 'center' });
      }
    }
  }

  function newBoulder() {
    var usedLanes = {};
    for (var i = 0; i < boulders.length; i++) if (!boulders[i].done) usedLanes[boulders[i].lane] = true;
    var candidates = [0, 1, 2].filter(function(l) { return !usedLanes[l]; });
    if (candidates.length === 0) return;
    var l = candidates[Math.floor(Math.random() * candidates.length)];
    boulders.push({ lane: l, y: START_Y, spawned: false, warnT: 0.6, done: false });
  }

  function initGame() {
    lane = 1; dodged = 0; boulders = []; spawnT = 0.9; spawnInterval = 1.35; speed = 620;
    fever = 0; feverT = 0; runFrame = 0;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function changeLane(dir) {
    if (done || ready > 0 || hitStop > 0 || finished) return;
    var nl = Math.max(0, Math.min(2, lane + dir));
    if (nl === lane) { game.audio.play('se_tap', 0.06); return; }
    lane = nl;
    game.audio.play('se_tap', 0.15);
    game.fx.burst(LANE_X[lane], RUNNER_Y + 40, { color: C.rock, count: 6, speed: 160 });
  }

  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; demo.press = false; return; }
  });
  game.onSwipe(function(dir) {
    if (state !== S.PLAYING) return;
    game.audio.play('se_tap', 0.03);
    if (dir === 'left') changeLane(-1);
    else if (dir === 'right') changeLane(1);
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    if (ok) game.audio.play('se_success', 0.5); else game.audio.play('se_failure', 0.5);
    endWait = 1.4;
  }

  function hitRunner() {
    finished = true; ok = false; hitStop = 0.4;
    game.feedback.bad(LANE_X[lane], RUNNER_Y, { text: 'MISS' });
    shake = 0.35;
    game.fx.burst(LANE_X[lane], RUNNER_Y, { color: C.bad, count: 22, speed: 420 });
    game.audio.play('se_failure', 0.4);
    finish();
  }

  function stepRun(dt) {
    runFrame = Math.floor(game.time.elapsed * 8) % 2 ? 1 : 0;
    spawnT -= dt;
    if (spawnT <= 0) { newBoulder(); spawnT = Math.max(0.55, spawnInterval - dodged * 0.03); }
    for (var i = boulders.length - 1; i >= 0; i--) {
      var b = boulders[i];
      if (b.done) { boulders.splice(i, 1); continue; }
      if (!b.spawned) {
        b.warnT -= dt;
        if (b.warnT <= 0) { b.spawned = true; game.audio.tone(160, 0.12, { wave: 'square', volume: 0.15 }); }
        continue;
      }
      b.y += speed * (fever > 0 ? 0.82 : 1) * dt;
      if (b.y > RUNNER_Y - 24 && b.y < RUNNER_Y + 24 && b.lane === lane) {
        hitRunner();
        return;
      }
      if (b.y > RUNNER_Y + 60) {
        b.done = true; dodged++;
        speed = Math.min(1000, speed + 10);
        game.audio.play('se_good', 0.15);
        if (dodged % 4 === 0) {
          fever = 2.0; feverT = 2.0;
          game.fx.popup('FEVER', W / 2, H * 0.18, { color: C.gold, size: 44 });
          game.audio.play('se_powerup', 0.4);
        } else if (dodged % 2 === 0) {
          game.fx.popup(dodged + ' / ' + NEEDED, W / 2, H * 0.18, { color: C.gold, size: 36 });
          game.audio.play('se_milestone', 0.3);
        }
        if (dodged >= NEEDED) {
          ok = true; finished = true;
          game.feedback.good(LANE_X[lane], RUNNER_Y, { text: null, color: C.good });
          game.fx.burst(LANE_X[lane], RUNNER_Y, { color: C.gold, count: 22, speed: 400 });
          finish();
          return;
        }
      }
    }
    if (fever > 0) { fever -= dt; if (fever < 0) fever = 0; }
  }

  var demo = { t: 0, gx: LANE_X[1], gy: RUNNER_Y, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    if (lane === undefined) initGame();
    if (!finished) {
      stepRun(dt);
      var threat = null;
      for (var i = 0; i < boulders.length; i++) {
        var b = boulders[i];
        if (b.spawned && b.lane === lane && b.y < RUNNER_Y) { threat = b; break; }
      }
      if (threat) {
        var safe = [0, 1, 2].filter(function(l) { return !boulders.some(function(bb) { return bb.spawned && bb.lane === l && bb.y < RUNNER_Y + 200; }); });
        if (safe.length) { changeLane(safe[0] - lane > 0 ? 1 : -1); demo.press = true; }
      } else demo.press = false;
    } else { initGame(); }
    demo.gx = LANE_X[lane]; demo.gy = RUNNER_Y;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      canyonBg();
      stepDemo(dt);
      drawBoulders();
      drawRunner();
      game.draw.hand(demo.gx + Math.sin(game.time.elapsed * 2.3) * 12, demo.gy - 80 + Math.cos(game.time.elapsed * 1.7) * 12, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.06, 42, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.105, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.95, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.95, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      canyonBg();
      drawBoulders();
      drawRunner();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.06, 48, ok ? C.good : C.bad);
      txt(dodged + ' / ' + NEEDED, W / 2, H * 0.11, 30, C.gold);
      if (!ok && dodged >= NEEDED - 2) txt('あと' + (NEEDED - dodged) + '!', W / 2, H * 0.155, 26, C.bad);
      if (dodged > game.best && Math.floor(game.time.elapsed * 3) % 2 === 0) txt('NEW RECORD', W / 2, H * 0.20, 30, C.gold);
      else if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.95, 26, C.white);
      return;
    }

    // ── PLAYING ──
    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        var stats = { dodged: dodged };
        if (ok) game.end.success(dodged, stats); else game.end.failure(stats);
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      stepRun(dt);
    }
    if (shake > 0) shake -= dt;

    canyonBg();
    if (fever > 0) game.draw.rect(0, 0, W, H, C.gold, 0.05);
    drawBoulders();
    drawRunner();

    txt(dodged + ' / ' + NEEDED, W / 2, H * 0.055, 32, C.white);
    game.draw.rect(60, 76, W - 120, 14, C.ink, 0.5);
    game.draw.rect(60, 76, (W - 120) * Math.min(1, dodged / NEEDED), 14, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.42, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody(
      [['D4', 0.14], ['F4', 0.14], ['A4', 0.14], ['D5', 0.14], ['A4', 0.14], ['F4', 0.14]],
      { tempo: 132, wave: 'square', volume: 0.06, loop: true }
    );
    state = S.ATTRACT;
    initGame();
  });
})(game);
