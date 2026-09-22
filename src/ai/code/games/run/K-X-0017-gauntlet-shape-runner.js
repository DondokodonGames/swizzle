// K-X-0017-gauntlet-shape-runner.js
// 決め振り回廊 — あらかじめ決まった振り付けの障害物回廊を、形に合わせて跳ぶ・くぐる・かわす
// 操作: 迫る障害物の形を見て、低い塊は上へ、頭上の梁は下へ、左右の壁はその場から離れる方向へスワイプする
// 終わり: 決められた9個の障害物すべてを正しい動作でこなせば成功。1回でも動作を外せば失敗
// @mechanic: camera_run
// @theme: fixed_choreography_gauntlet
// 世界観: 工房地下に組まれた一本道の試練回廊。あらかじめ決められた9つの障害物の並びを、駆け抜ける配達係が形どおりの動きでこなしていく
// 残るもの: 正誤(CLEAR/GAME OVER) + こなせた個数
// スタイル: 90s 16bit

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s 16bit: 中彩度4色+金属グレー
  var C = {
    bg: '#20283a', bg2: '#121824', lane: '#2c3650', laneEdge: '#465070',
    ob: '#e0a83a', obDark: '#8a6018', runner: '#5ad1ff', runnerDark: '#1c7aa0',
    good: '#63ffa8', bad: '#ff5c5c', gold: '#ffd85c', white: '#f2f7ff', ink: '#050810',
  };

  var GAME_TITLE = 'GAUNTLET RUN';
  var DX = W * 0.5, RY = H * 0.70;
  var TOP_Y = H * 0.22;
  var FALL_T = 1.3;
  var WIN = 0.36;
  var TYPES = ['up', 'down', 'left', 'right', 'up', 'left', 'down', 'right', 'up'];
  var GAPS = [1.9, 1.8, 1.7, 1.6, 1.5, 1.4, 1.3, 1.2];
  var TOTAL = TYPES.length;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var RUNNER_A = ['..#..', '.###.', '#####', '.#.#.'];
  var RUNNER_JUMP = ['..#..', '.###.', '.###.', '#...#'];
  var RUNNER_DUCK = ['.....', '#####', '#####', '.....'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    game.draw.rect(DX - 220, TOP_Y - 40, 440, RY - TOP_Y + 140, C.lane, 0.5);
    game.draw.line(DX - 220, TOP_Y - 40, DX - 220, RY + 100, C.laneEdge, 6);
    game.draw.line(DX + 220, TOP_Y - 40, DX + 220, RY + 100, C.laneEdge, 6);
    for (var i = 0; i < 8; i++) game.draw.line(DX - 220, TOP_Y + i * 70, DX + 220, TOP_Y + i * 70, '#ffffff05', 2);
  }

  function buildSchedule() {
    var q = [];
    var t = 0;
    for (var i = 0; i < TOTAL; i++) {
      q.push({ type: TYPES[i], spawnAt: t, resolved: false, r: 0 });
      t += GAPS[i] || 1.2;
    }
    return q;
  }

  var events, evIdx, curEvent, cleared, done, endWait, finished, ready, hitStop, shake, nextMilestone, dodgeX;

  var readyStartT = 0;
  function initGame() {
    events = buildSchedule(); evIdx = 0; curEvent = null; cleared = 0;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; readyStartT = 0; nextMilestone = 4; dodgeX = 0;
  }

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function resolveOK(type) {
    cleared++;
    hitStop = 0.06;
    game.feedback.good(DX, RY, { text: 'CLEAR', color: C.good });
    game.audio.play(type === 'up' ? 'se_jump' : 'se_good', 0.35);
    if (type === 'up') dodgeX = 0;
    if (type === 'left') dodgeX = -70;
    if (type === 'right') dodgeX = 70;
    if (cleared >= nextMilestone && nextMilestone < TOTAL) {
      game.fx.popup(cleared + ' / ' + TOTAL, DX, RY - 260, { color: C.gold, size: 34 });
      game.audio.play('se_milestone', 0.35);
      nextMilestone += 4;
    }
    if (cleared >= TOTAL) { ok = true; finished = true; finish(); }
  }

  function resolveFail() {
    hitStop = 0.32; shake = 0.28;
    game.feedback.bad(DX, RY, { text: 'HIT' });
    game.audio.play('se_bad', 0.4);
    ok = false; finished = true; finish();
  }

  function onSwipeInput(dir) {
    if (state !== S.PLAYING || ready > 0 || done || finished || !curEvent || curEvent.resolved) return;
    curEvent.resolved = true;
    if (dir === curEvent.type) resolveOK(curEvent.type);
    else resolveFail();
  }
  game.onSwipe(function(dir) { onSwipeInput(dir); });

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });

  function stepEvents(dt) {
    if (!curEvent && evIdx < events.length && (game.time.elapsed - readyStartT) >= events[evIdx].spawnAt) {
      curEvent = events[evIdx]; curEvent.r = 0; curEvent.resolved = false;
      evIdx++;
    }
    if (curEvent && !curEvent.resolved) {
      curEvent.r += dt / FALL_T;
      if (curEvent.r >= 1) { curEvent.resolved = true; resolveFail(); }
    }
    if (curEvent && curEvent.resolved && curEvent.r >= 1) curEvent = null;
    if (dodgeX !== 0) { dodgeX *= 0.86; if (Math.abs(dodgeX) < 1) dodgeX = 0; }
  }

  function obstacleY(r) { return TOP_Y + (RY - TOP_Y) * r; }

  function drawObstacle(ev) {
    var y = obstacleY(ev.r);
    var soon = ev.r > 0.55 && ev.r < 1;
    var blink = soon && Math.floor(game.time.elapsed * 10) % 2 === 0;
    var col = blink ? C.bad : C.ob;
    if (ev.type === 'up') {
      game.draw.rect(DX - 110, y, 220, 60, C.obDark);
      game.draw.rect(DX - 110, y - 10, 220, 16, col);
    } else if (ev.type === 'down') {
      game.draw.rect(DX - 200, y - 90, 400, 40, C.obDark);
      game.draw.rect(DX - 200, y - 54, 400, 12, col);
    } else if (ev.type === 'left') {
      game.draw.rect(DX - 20, y - 90, 130, 160, C.obDark);
      game.draw.rect(DX + 90, y - 90, 20, 160, col);
    } else if (ev.type === 'right') {
      game.draw.rect(DX - 110, y - 90, 130, 160, C.obDark);
      game.draw.rect(DX - 110, y - 90, 20, 160, col);
    }
  }

  function drawRunner() {
    var frame = RUNNER_A;
    if (curEvent && curEvent.resolved && curEvent.r < 1) {
      if (curEvent.type === 'up') frame = RUNNER_JUMP;
      else if (curEvent.type === 'down') frame = RUNNER_DUCK;
    }
    var x = DX + dodgeX;
    game.draw.circle(x, RY + 50, 60, '#00000020');
    game.draw.sprite(frame, { '#': (finished && !ok) ? C.bad : C.runner }, x, RY, 22, { anchor: 'center' });
  }

  var demo = { t: 0, gx: DX, gy: RY, press: false, swipeDir: '' };
  var demoTypes = ['up', 'left', 'down', 'right'];
  var demoIdx = 0, demoEv = null, demoElapsed = 0;
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 5.6;
    if (cyc < dt || demo.t <= dt) { demoIdx = 0; demoElapsed = 0; demoEv = null; dodgeX = 0; }
    demoElapsed += dt;
    if (!demoEv && demoIdx < demoTypes.length && demoElapsed >= demoIdx * 1.3 + 0.2) {
      demoEv = { type: demoTypes[demoIdx], r: 0, resolved: false }; curEvent = demoEv; demoIdx++;
    }
    demo.press = false;
    if (demoEv && !demoEv.resolved) {
      demoEv.r += dt / FALL_T;
      if (demoEv.r > 0.55) {
        demoEv.resolved = true;
        demo.press = true;
        resolveOK(demoEv.type);
        curEvent = null; demoEv = null;
      }
    }
    demo.gx = DX; demo.gy = RY;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (events === undefined) initGame();
      bg();
      stepDemo(dt);
      if (curEvent) drawObstacle(curEvent);
      drawRunner();
      game.draw.hand(demo.gx, demo.gy + 180, { press: demo.press, scale: 22 });
      txt(GAME_TITLE, W / 2, H * 0.08, 42, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.94, 38, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.94, 26, C.white);
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawRunner();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 48, ok ? C.good : C.bad);
      txt(cleared + ' / ' + TOTAL, W / 2, H * 0.13, 30, C.gold);
      if (!ok) txt('あと' + (TOTAL - cleared) + '個!', W / 2, H * 0.17, 24, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 24, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(cleared, { cleared: cleared, total: TOTAL });
        else game.end.failure({ cleared: cleared, total: TOTAL });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) { readyStartT = game.time.elapsed; game.audio.play('se_tap'); }
    } else if (!finished) {
      stepEvents(dt);
    }
    if (shake > 0) shake -= dt;

    bg();
    if (curEvent && !finished) drawObstacle(curEvent);
    drawRunner();

    txt(cleared + ' / ' + TOTAL, W / 2, H * 0.06, 30, C.white);
    var barW = W - 120;
    game.draw.rect(60, 150, barW, 14, C.ink, 0.5);
    game.draw.rect(60, 150, barW * (cleared / TOTAL), 14, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['D3', 0.25], ['F3', 0.25], ['A3', 0.25], ['D4', 0.4]], { tempo: 150, wave: 'square', volume: 0.06, loop: true, bass: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
