// D-20132016-0025-relay-route-call.js
// リレールートコール — 示された方角どおりの出口を選び続け、締切までに一周を終える
// 操作: 一瞬光る矢印の向きを覚え、消えたら同じ向きのゲートを親指ゾーンでタップする
// 終わり: 4区間すべて選び終えた時点で残り時間が0より多ければ成功。0になれば失敗
// @mechanic: judge
// @theme: world_relay_route_call
// 世界観: 締切のある世界一周の配達人。中継地ごとに一瞬だけ示される方角を頼りに、正しい出口ゲートへ飛び込み続ける
// 残るもの: 正誤(CLEAR/GAME OVER) + 正しく選べた区間数
// スタイル: 2000s HANDHELD PASTEL

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // 2000s HANDHELD PASTEL: パステル基調、白縁の丸い形
  var C = {
    bg: '#fdeee0', bg2: '#ffe3ec', panel: '#ffffff', panelEdge: '#ffc2d6',
    courier: '#ff9ec4', bag: '#ffd166', gateOff: '#e8d8e0', gateOn: '#8ecdf5',
    good: '#3ecf8e', bad: '#ff6b7a', gold: '#ffb703', white: '#3a2e33', ink: '#ffffff',
  };

  var GAME_TITLE = 'RELAY CALL';
  var ROUNDS = 4, MAX_TIME = 9.6;
  var PREVIEW_T = 0.42, WINDOW_T = 1.5;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var DIRS = ['up', 'left', 'right', 'down'];
  var ARROWS = {
    up: ['..#..', '.###.', '#####', '..#..', '..#..'],
    down: ['..#..', '..#..', '#####', '.###.', '..#..'],
    left: ['...#.', '..##.', '.###.', '..##.', '...#.'],
    right: ['.#...', '.##..', '.###.', '.##..', '.#...'],
  };
  var GATE_XY = [{ x: W * 0.5, y: H * 0.80 }, { x: W * 0.24, y: H * 0.86 }, { x: W * 0.76, y: H * 0.86 }];

  var round, target, zones, phase, phaseT, cleared, done, endWait, finished;
  var ready, hitStop, shake;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.panelEdge, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var COURIER = ['.##.', '####', '.oo.', '####', '.##.'];

  function worldBg() {
    game.draw.gradient(0, H, [[0, C.bg2], [0.6, C.bg], [1, C.bg2]]);
    for (var i = 0; i < 5; i++) game.draw.circle(W * (0.15 + i * 0.2), H * 0.16, 28, C.panelEdge, 0.35);
  }

  // ラウンドごとに3方角をランダムに選び、正解方向を決める
  function newRound() {
    var pool = DIRS.slice();
    for (var i = pool.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = pool[i]; pool[i] = pool[j]; pool[j] = t; }
    zones = [pool[0], pool[1], pool[2]];
    target = zones[Math.floor(Math.random() * 3)];
    phase = 'preview'; phaseT = PREVIEW_T;
  }

  function initGame() {
    round = 0; cleared = 0; finished = false; done = false; endWait = 0;
    ready = 0.8; hitStop = 0; shake = 0; timeLeft = MAX_TIME;
    newRound();
  }
  var timeLeft;

  function drawGate(i, active) {
    var g = GATE_XY[i];
    var s = 1 + (active ? 0.08 * Math.sin(game.time.elapsed * 6) : 0);
    game.draw.circle(g.x, g.y, 96 * s, active ? C.gateOn : C.gateOff, active ? 1 : 0.7);
    game.draw.circle(g.x, g.y, 96 * s, C.panelEdge, 0.5);
    game.draw.sprite(ARROWS[zones[i]], { '#': active ? '#ffffff' : '#b9a8b2' }, g.x, g.y, 12, { anchor: 'center' });
  }

  function pickGate(px, py) {
    for (var i = 0; i < 3; i++) {
      if (Math.hypot(px - GATE_XY[i].x, py - GATE_XY[i].y) < 100) return i;
    }
    return -1;
  }

  function resolveRound(correct, gx, gy) {
    round++;
    hitStop = correct ? 0.1 : 0.28;
    if (correct) {
      cleared++;
      timeLeft = Math.min(MAX_TIME, timeLeft + 0.4);
      game.feedback.good(gx, gy, { text: 'GOOD', color: C.good });
      game.fx.burst(gx, gy, { color: C.gold, count: 14, speed: 320 });
      game.audio.play('se_good', 0.4);
      if (cleared === Math.ceil(ROUNDS / 2)) { game.fx.popup('HALFWAY!', W / 2, H * 0.18, { color: C.gold, size: 38 }); game.audio.play('se_milestone', 0.4); }
    } else {
      timeLeft = Math.max(0, timeLeft - 1.2);
      shake = 0.2;
      game.feedback.bad(gx, gy, { text: 'MISS' });
      game.audio.play('se_bad', 0.4);
    }
    if (timeLeft <= 0) { ok = false; finished = true; finish(); return; }
    if (round >= ROUNDS) { ok = true; finished = true; finish(); return; }
    newRound();
  }

  function tapPlay(x, y) {
    if (done || ready > 0 || hitStop > 0 || finished || phase !== 'active') return;
    var idx = pickGate(x, y);
    if (idx < 0) return;
    game.audio.play('se_tap', 0.05);
    resolveRound(zones[idx] === target, GATE_XY[idx].x, GATE_XY[idx].y);
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    tapPlay(x, y);
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function stepPlay(dt) {
    timeLeft -= dt;
    if (timeLeft <= 0) { ok = false; finished = true; finish(); return; }
    phaseT -= dt;
    if (phase === 'preview' && phaseT <= 0) { phase = 'active'; phaseT = WINDOW_T; }
    else if (phase === 'active' && phaseT <= 0) { resolveRound(false, GATE_XY[0].x, GATE_XY[0].y); }
  }

  // ── ATTRACT ゴースト実演: 実ロジックで方角を覚え→正解ゲートへ→次周で誤タップ例 ──
  var demo = { t: 0, gx: W * 0.5, gy: H * 0.60, press: false, once: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.4;
    if (cyc < dt || demo.t <= dt) { newRound(); demo.once = false; }
    phaseT -= dt;
    if (phase === 'preview' && phaseT <= 0) { phase = 'active'; phaseT = WINDOW_T; }
    if (phase === 'active' && !demo.once) {
      var wantWrong = Math.floor(demo.t / 4.4) % 3 === 2;
      var idx = 0;
      for (var i = 0; i < 3; i++) if (zones[i] === target) idx = i;
      if (wantWrong) idx = (idx + 1) % 3;
      var g = GATE_XY[idx];
      demo.gx += (g.x - demo.gx) * Math.min(1, dt * 5);
      demo.gy += (g.y - demo.gy) * Math.min(1, dt * 5);
      if (Math.hypot(demo.gx - g.x, demo.gy - g.y) < 8) {
        demo.press = true; demo.once = true;
        var correct = zones[idx] === target;
        if (correct) { game.feedback.good(g.x, g.y, { text: 'GOOD', color: C.good }); game.fx.burst(g.x, g.y, { color: C.gold, count: 10, speed: 300 }); }
        else { game.feedback.bad(g.x, g.y, { text: 'MISS' }); }
      }
    } else if (phase === 'preview') {
      demo.gx += ((W * 0.5) - demo.gx) * Math.min(1, dt * 4);
      demo.gy += ((H * 0.60) - demo.gy) * Math.min(1, dt * 4);
      demo.press = false;
    }
  }

  game.onUpdate(function(dt) {
    var elapsed = game.time.elapsed;
    var bob = Math.sin(elapsed * 2.1) * 6;

    if (state === S.ATTRACT) {
      if (round === undefined) initGame();
      worldBg();
      game.draw.rect(0, 0, W, H, '#ffffff', 0.03 + 0.03 * Math.sin(elapsed * 1.3));
      stepDemo(dt);
      game.draw.sprite(COURIER, { '#': C.courier, o: C.bag }, W * 0.5, H * 0.42 + bob, 20, { anchor: 'center' });
      if (phase === 'preview') game.draw.sprite(ARROWS[target], { '#': C.gold }, W * 0.5, H * 0.60, 26, { anchor: 'center' });
      for (var i = 0; i < 3; i++) drawGate(i, phase === 'active');
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 44, C.white);
      txt('BEST ' + (game.best > 0 ? game.best + ' / ' + ROUNDS : '-'), W / 2, H * 0.13, 24, C.gold);
      if (Math.floor(elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 36, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 26, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      worldBg();
      game.draw.sprite(COURIER, { '#': C.courier, o: C.bag }, W * 0.5, H * 0.42, 20, { anchor: 'center' });
      for (var j = 0; j < 3; j++) drawGate(j, false);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 48, ok ? C.good : C.bad);
      txt(cleared + ' / ' + ROUNDS, W / 2, H * 0.13, 30, C.white);
      if (!ok) txt('あと' + (ROUNDS - cleared) + '区間!', W / 2, H * 0.18, 24, C.gold);
      if (ok && (game.best === 0 || cleared >= game.best)) txt('NEW RECORD', W / 2, H * 0.18, 24, C.gold);
      if (Math.floor(elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.white);
      return;
    }

    // ── PLAYING ──
    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(cleared, { cleared: cleared, total: ROUNDS }); else game.end.failure({ cleared: cleared, total: ROUNDS });
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

    worldBg();
    game.draw.sprite(COURIER, { '#': C.courier, o: C.bag }, W * 0.5, H * 0.42 + bob, 20, { anchor: 'center' });
    if (phase === 'preview' && !finished) game.draw.sprite(ARROWS[target], { '#': C.gold }, W * 0.5, H * 0.60, 26, { anchor: 'center' });
    for (var k = 0; k < 3; k++) drawGate(k, phase === 'active' && !finished);

    txt(cleared + ' / ' + ROUNDS, W / 2, H * 0.06, 32, C.white);
    game.draw.rect(60, H * 0.20, W - 120, 16, C.panelEdge, 0.5);
    game.draw.rect(60, H * 0.20, (W - 120) * Math.max(0, timeLeft / MAX_TIME), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.30, 54, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['E4', 0.2], ['G4', 0.2], ['B4', 0.2], ['E5', 0.4]], { tempo: 150, wave: 'square', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
