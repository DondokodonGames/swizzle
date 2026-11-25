// D-20222026-0034-pin-gate-rescue.js
// ピンゲートレスキュー — 落ちてくる捕らわれ人の姿形に合う関を見極め、ピンを抜いて安全に通す
// 操作: 落ちてくる捕らわれ人と同じ形の関をタップしてピンを抜き、通り道を開ける
// 終わり: 規定回数、正しい形の関を開ければ成功。誤った関を開く/時間切れは失敗
// @mechanic: gap_fit
// @theme: pin_gate_rescue
// 世界観: 檻から落ちる捕らわれ人を助ける機関番が、姿形に合う関だけを選んでピンを抜き、安全な広間へ通す
// 残るもの: 正誤(CLEAR/GAME OVER) + 通した数
// スタイル: 2010s FLAT MOBILE

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg: '#eef3fb', bg2: '#dbe6fb', gate: '#c7d3ea', gateOpen: '#3d7dff',
    captive: '#ff9f1c', spike: '#ff4d5e', good: '#2bd67b', bad: '#ff4d5e',
    gold: '#ff9f1c', ink: '#152238',
  };

  var GAME_TITLE = 'PIN RESCUE';
  var MAX_TIME = 20;
  var NEEDED = 6;
  var SHAPES = ['circle', 'square', 'triangle'];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 1, y + 2, { size: sz, color: '#ffffff', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var CAPTIVE_S = ['.##.', '####', '.##.', '#..#'];

  function drawShapeIcon(shape, x, y, r, color, alpha) {
    if (shape === 'circle') game.draw.circle(x, y, r, color, alpha);
    else if (shape === 'square') game.draw.rect(x - r, y - r, r * 2, r * 2, color, alpha);
    else {
      game.draw.rect(x - r, y - r * 0.3, r * 2, r * 0.6, color, alpha);
      game.draw.rect(x - r * 0.5, y - r, r, r * 0.6, color, alpha);
    }
  }

  function bg() {
    var pulse = 0.03 + 0.03 * Math.sin(game.time.elapsed * 1.3);
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    game.draw.rect(0, 0, W, H, '#3d7dff', pulse * 0.4);
  }

  var passed, roundClock, halfCalled, drop, gates, opened, chuteY;
  var done, endWait, finished, ready, hitStop, shake;

  function newDrop() {
    var shape = SHAPES[Math.floor(Math.random() * SHAPES.length)];
    var order = SHAPES.slice().sort(function() { return Math.random() - 0.5; });
    drop = { shape: shape, y: H * 0.18, speed: 440, x: W * 0.5, alive: true };
    gates = order;
    opened = -1;
  }

  function initGame() {
    passed = 0; roundClock = 0; halfCalled = false;
    newDrop();
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  var GATE_Y = H * 0.72, GATE_R = 100;
  function gateX(i) { return W * (0.22 + i * 0.28); }

  function drawScene() {
    bg();
    if (drop && drop.alive) {
      game.draw.sprite(CAPTIVE_S, { '#': C.captive }, drop.x, drop.y, 18, { anchor: 'center' });
      drawShapeIcon(drop.shape, drop.x, drop.y - 90, 20, C.captive, 0.5);
    }
    for (var i = 0; i < 3; i++) {
      var gx = gateX(i);
      var isOpen = opened === i;
      game.draw.rect(gx - GATE_R, GATE_Y - 30, GATE_R * 2, 60, isOpen ? C.gateOpen : C.gate);
      drawShapeIcon(gates[i], gx, GATE_Y, 28, isOpen ? '#ffffff' : C.ink, 0.9);
    }
  }

  function pickGate(i, x, y) {
    opened = i;
    if (gates[i] === drop.shape) {
      passed += 1;
      drop.alive = false;
      game.feedback.good(x, y, { text: 'GOOD', color: C.good });
      game.fx.burst(gateX(i), GATE_Y, { color: C.gateOpen, count: 18, speed: 340 });
      game.audio.play('se_good', 0.4);
      if (passed === Math.ceil(NEEDED * 0.5)) {
        game.fx.popup('NICE', W * 0.5, H * 0.4, { color: C.gold, size: 30 });
        game.audio.play('se_milestone', 0.3);
      }
      if (passed >= NEEDED) {
        finished = true; ok = true; hitStop = 0.3;
        game.audio.play('se_success', 0.5);
        finish();
      } else {
        newDrop();
      }
    } else {
      drop.alive = false;
      finished = true; ok = false; hitStop = 0.35; shake = 0.3;
      game.feedback.bad(gateX(i), GATE_Y, { text: 'MISS' });
      game.audio.play('se_bad', 0.4);
      finish();
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING && ready <= 0 && !finished && drop && drop.alive) {
      for (var i = 0; i < 3; i++) {
        if (Math.abs(x - gateX(i)) < GATE_R && Math.abs(y - GATE_Y) < 60) { game.audio.play('se_tap', 0.2); pickGate(i, x, y); return; }
      }
      game.audio.play('se_tap', 0.08);
    }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  var demo = { t: 0, gx: gateX(0), gy: GATE_Y, press: false };
  function resetDemo() { initGame(); }
  function correctGateIdx() { for (var i = 0; i < 3; i++) if (gates[i] === drop.shape) return i; return 0; }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.4;
    if (cyc < dt || demo.t <= dt) resetDemo();
    if (drop && drop.alive) {
      drop.y += drop.speed * dt;
      var ci = correctGateIdx();
      if (drop.y > GATE_Y - 260) {
        demo.gx = gateX(ci); demo.gy = GATE_Y;
        demo.press = drop.y > GATE_Y - 130;
        if (demo.press && opened !== ci) pickGate(ci, gateX(ci), GATE_Y);
      } else {
        demo.gx = W * 0.5; demo.gy = H * 0.5; demo.press = false;
      }
      if (drop.y > GATE_Y + 100) drop.alive = false;
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (roundClock === undefined) initGame();
      bg();
      stepDemo(dt);
      drawScene();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.09, 40, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.13, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 28, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      drawScene();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.09, 46, ok ? C.good : C.bad);
      txt(passed + ' / ' + NEEDED, W / 2, H * 0.14, 28, C.gold);
      if (!ok) txt('あと' + Math.max(1, NEEDED - passed) + '人!', W / 2, H * 0.18, 22, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(passed, { passed: passed, needed: NEEDED });
        else game.end.failure({ passed: passed, needed: NEEDED });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      roundClock += dt;
      if (drop && drop.alive) {
        drop.y += drop.speed * dt;
        if (drop.y > GATE_Y + 30) {
          finished = true; ok = false; hitStop = 0.3; shake = 0.25;
          game.feedback.bad(drop.x, drop.y, { text: 'MISS' });
          game.audio.play('se_bad', 0.4);
          finish();
        }
      }
      if (!halfCalled && roundClock >= MAX_TIME * 0.5) {
        halfCalled = true;
        game.fx.popup('NICE', W * 0.5, H * 0.4, { color: C.gold, size: 28 });
        game.audio.play('se_milestone', 0.25);
      }
      if (roundClock >= MAX_TIME) {
        finished = true; ok = false; hitStop = 0.3; shake = 0.2;
        game.feedback.bad(W * 0.5, H * 0.4, { text: 'MISS' });
        game.audio.play('se_bad', 0.4);
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    drawScene();
    txt(passed + ' / ' + NEEDED, W / 2, H * 0.06, 30, C.ink);
    var barPct = Math.max(0, 1 - roundClock / MAX_TIME);
    game.draw.rect(60, 150, W - 120, 16, '#c7d3ea', 1);
    game.draw.rect(60, 150, (W - 120) * barPct, 16, barPct < 0.25 ? C.bad : C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['E4', 0.25], ['G4', 0.25], ['B4', 0.25], ['E5', 0.5]], { tempo: 130, wave: 'square', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
