// D-20172021-0027-prism-vial-transfer.js
// プリズムバイアル・トランスファー — 色玉が2個ずつ入った管どうしを指でつないで移し替え、同じ色だけの管にまとめる
// 操作: 移したい管から指を離さず、移し先の管まで線を引くようにドラッグしてつなぐ。2セット続けて揃える
// 終わり: 2セットとも同色だけにまとめれば成功。満杯の管や違う色の管につなぐと即座に失敗
// @mechanic: connect
// @theme: prism_vial_transfer
// 世界観: 硝子細工職人が、色玉の詰まった管どうしを指でつなぎ、上澄みの玉だけを移し替えて同じ色だけの管に仕上げる
// 残るもの: 正誤(CLEAR/GAME OVER) + 揃えたセット数
// スタイル: VOXEL BLOCK

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // VOXEL BLOCK: 立方体を上面/左面/右面の3明度で。等角に積む
  var C = {
    bg: '#20263a', bg2: '#12151f', tube: '#3a4260', tubeLite: '#4c5678', tubeEdge: '#181c2a',
    good: '#4ad18f', bad: '#ff5d5d', gold: '#ffcf4a', ink: '#eef2ff',
  };
  var PALETTE = ['#e0483c', '#3f8de0', '#3fae4a', '#d99a1e'];

  var GAME_TITLE = 'VIAL TRANSFER';
  var TIME_LIMIT = 16;
  var STAGES = 2;
  var CAP = 2;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 1, y + 2, { size: sz, color: '#0a0c14', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var CRAFTER_SPRITE = ['.##.', '####', '.##.', '.##.'];

  var TUBE_X = [W * 0.24, W * 0.5, W * 0.76];
  var TUBE_Y = H * 0.5, TUBE_W = 170, SLOT_H = 150;

  var tubes, stage, dragSrc, dragX, dragY, failTube;
  var done, endWait, finished, ready, hitStop, shake, timeLeft, halfCalled;

  function bg() {
    var pulse = 0.03 + 0.03 * Math.sin(game.time.elapsed * 1.3);
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    game.draw.rect(0, 0, W, H, '#ffffff', pulse);
    var bob = Math.sin(game.time.elapsed * 2.2) * 6;
    game.draw.sprite(CRAFTER_SPRITE, { '#': C.gold }, W * 0.88, H * 0.86 + bob, 11, { anchor: 'center' });
  }

  function ballColor(v) { return PALETTE[v]; }

  function drawTube(i, hi) {
    var x = TUBE_X[i];
    var top = TUBE_Y - SLOT_H * CAP / 2 - 20;
    var h = SLOT_H * CAP + 40;
    game.draw.rect(x - TUBE_W / 2, top, TUBE_W, h, C.tubeEdge);
    game.draw.rect(x - TUBE_W / 2 + 8, top + 8, TUBE_W - 16, h - 16, C.tube);
    if (hi) game.draw.rect(x - TUBE_W / 2 - 6, top - 6, TUBE_W + 12, h + 12, '#ffffff', 0.18);
    var t = tubes[i];
    for (var s = 0; s < t.length; s++) {
      var by = top + h - 30 - s * SLOT_H - SLOT_H / 2 + 20;
      game.draw.circle(x, by, 62, ballColor(t[s]));
      game.draw.circle(x - 18, by - 18, 20, '#ffffff', 0.25);
    }
  }

  function shuffle2(a, b) { return Math.random() < 0.5 ? [a, b] : [b, a]; }

  function newStage() {
    var c1 = Math.floor(Math.random() * PALETTE.length);
    var c2;
    do { c2 = Math.floor(Math.random() * PALETTE.length); } while (c2 === c1);
    var pairA = shuffle2(c1, c2);
    var pairB = shuffle2(c1, c2);
    var slots = shuffle2(0, 1);
    var order = [slots[0], slots[1], -1];
    // randomize which of the 3 tubes is empty
    var perm = [0, 1, 2];
    for (var i = perm.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = perm[i]; perm[i] = perm[j]; perm[j] = tmp;
    }
    tubes = [[], [], []];
    tubes[perm[0]] = pairA.slice();
    tubes[perm[1]] = pairB.slice();
    tubes[perm[2]] = [];
    dragSrc = -1; failTube = -1;
  }

  function isSolved() {
    for (var i = 0; i < tubes.length; i++) {
      var t = tubes[i];
      if (t.length === 0) continue;
      for (var k = 1; k < t.length; k++) if (t[k] !== t[0]) return false;
    }
    return true;
  }

  function initGame() {
    stage = 0; halfCalled = false;
    newStage();
    done = false; endWait = 0; finished = false; ready = 0.8; hitStop = 0; shake = 0;
    timeLeft = TIME_LIMIT;
  }

  function tubeAt(x, y) {
    for (var i = 0; i < 3; i++) {
      if (Math.abs(x - TUBE_X[i]) < TUBE_W * 0.7 && Math.abs(y - TUBE_Y) < SLOT_H * CAP * 0.7) return i;
    }
    return -1;
  }

  function attemptMove(src, dst) {
    if (src < 0 || dst < 0 || src === dst) return;
    var s = tubes[src], d = tubes[dst];
    if (s.length === 0) return; // nothing to move, silent cancel
    var v = s[s.length - 1];
    if (d.length >= CAP || (d.length > 0 && d[d.length - 1] !== v)) {
      failTube = dst;
      finished = true; ok = false; hitStop = 0.3; shake = 0.3;
      game.feedback.bad(TUBE_X[dst], TUBE_Y, { text: 'MISS' });
      game.audio.play('se_bad', 0.4);
      finish();
      return;
    }
    s.pop(); d.push(v);
    game.feedback.good(TUBE_X[dst], TUBE_Y, { text: 'GOOD', color: C.good });
    game.audio.play('se_tap', 0.2);
    if (isSolved()) {
      stage++;
      if (stage === Math.ceil(STAGES / 2) && !halfCalled) {
        halfCalled = true;
        game.fx.popup('NICE', W / 2, H * 0.2, { color: C.gold, size: 34 });
        game.audio.play('se_milestone', 0.3);
      }
      if (stage >= STAGES) {
        finished = true; ok = true; hitStop = 0.3;
        game.feedback.good(W / 2, TUBE_Y, { text: 'CLEAR', color: C.good });
        game.fx.burst(W / 2, TUBE_Y, { color: C.gold, count: 22, speed: 400 });
        game.audio.play('se_success', 0.5);
        finish();
      } else {
        newStage();
      }
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function(x, y) {
    if (state !== S.PLAYING || finished || ready > 0) return;
    var t = tubeAt(x, y);
    if (t >= 0) { dragSrc = t; dragX = x; dragY = y; game.audio.play('se_tap', 0.08); }
  });
  game.onMove(function(x, y) {
    if (state !== S.PLAYING || dragSrc < 0) return;
    dragX = x; dragY = y;
  });
  game.onRelease(function(x, y) {
    if (state !== S.PLAYING || dragSrc < 0) return;
    var dst = tubeAt(x, y);
    attemptMove(dragSrc, dst);
    dragSrc = -1;
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  var demo = { t: 0, gx: TUBE_X[0], gy: TUBE_Y, press: false };
  var demoStep;
  function resetDemo() { initGame(); demoStep = 0; }
  function demoMoves() {
    // find a valid src/dst move using the generic rule (mirrors attemptMove's success branch)
    for (var src = 0; src < 3; src++) {
      if (tubes[src].length === 0) continue;
      var v = tubes[src][tubes[src].length - 1];
      for (var dst = 0; dst < 3; dst++) {
        if (dst === src) continue;
        var d = tubes[dst];
        if (d.length < CAP && (d.length === 0 || d[d.length - 1] === v)) return { src: src, dst: dst };
      }
    }
    return null;
  }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 5.4;
    if (cyc < dt || demo.t <= dt) resetDemo();
    var seg = 5.4 / 3;
    var localCyc = cyc % seg;
    var mv = demoMoves();
    if (!mv) { demo.press = false; return; }
    var sx = TUBE_X[mv.src], dx = TUBE_X[mv.dst];
    if (localCyc < seg * 0.45) {
      var t2 = localCyc / (seg * 0.45);
      demo.gx = sx + (dx - sx) * t2 * 0.3;
      demo.gy = TUBE_Y;
      demo.press = t2 > 0.2;
    } else if (localCyc < seg * 0.85) {
      var t3 = (localCyc - seg * 0.45) / (seg * 0.4);
      demo.gx = sx + (dx - sx) * t3;
      demo.gy = TUBE_Y;
      demo.press = true;
    } else {
      demo.gx = dx; demo.gy = TUBE_Y; demo.press = false;
      if (localCyc - dt < seg * 0.85) {
        var s = tubes[mv.src], d = tubes[mv.dst];
        var v = s.pop(); d.push(v);
        game.feedback.good(dx, TUBE_Y, { text: 'GOOD', color: C.good });
        game.audio.play('se_good', 0.18);
        if (isSolved()) { stage++; if (stage < STAGES) newStage(); else stage = 0; }
      }
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (tubes === undefined) { initGame(); demoStep = 0; }
      stepDemo(dt);
      bg();
      for (var i = 0; i < 3; i++) drawTube(i, -1);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 14 });
      txt(GAME_TITLE, W / 2, H * 0.10, 38, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.14, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 36, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 24, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      for (var i2 = 0; i2 < 3; i2++) drawTube(i2, i2 === failTube);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.10, 42, ok ? C.good : C.bad);
      txt(stage + ' / ' + STAGES, W / 2, H * 0.15, 26, C.gold);
      if (!ok) txt('あと' + (STAGES - stage) + 'セット!', W / 2, H * 0.19, 22, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 24, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(stage, { sets: stage, total: STAGES });
        else game.end.failure({ sets: stage, total: STAGES });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      timeLeft -= dt;
      if (timeLeft <= 0) {
        timeLeft = 0; finished = true; ok = false; hitStop = 0.3; shake = 0.2;
        game.feedback.bad(W / 2, TUBE_Y, { text: 'MISS' });
        game.audio.play('se_bad', 0.4);
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    for (var i3 = 0; i3 < 3; i3++) drawTube(i3, i3 === dragSrc);
    if (dragSrc >= 0) game.draw.line(TUBE_X[dragSrc], TUBE_Y, dragX, dragY, C.gold, 8);

    txt(stage + ' / ' + STAGES, W / 2, H * 0.08, 28, C.ink);
    var tbW = W - 120;
    var lowTime = timeLeft < 4 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(60, 160, tbW, 16, C.tubeEdge, 1);
    game.draw.rect(60, 160, tbW * Math.max(0, timeLeft / TIME_LIMIT), 16, lowTime ? C.bad : C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 52, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['A3', 0.25], ['C4', 0.25], ['E4', 0.25], ['A4', 0.5]], { tempo: 116, wave: 'sine', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
