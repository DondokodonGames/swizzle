// D-20172021-0008-skyframe-footwork-climb.js
// スカイフレーム・フットワーク・クライム — 足跡を交互に踏んで組み上げ足場の塔を駆け上がる
// 操作: 塔の左右どちらの足場が光っているか見極め、光った側の親指ボタンをタップして踏み出す
// 終わり: 全ステップを塔の頂上まで踏破すれば成功。反対側を踏む/踏み外せば転落して失敗
// @mechanic: camera_climb
// @theme: scaffold_tower_footwork
// 世界観: 建設中の高層足場を巡回する点検作業員が、左右の踏板を交互に踏みながらカメラごと塔の頂上まで駆け上がる
// 残るもの: 正誤(CLEAR/GAME OVER) + 踏破したステップ数
// スタイル: 90s 16bit

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s 16bit: 多色・高彩度、2〜3層の背景で奥行き
  var C = {
    sky1: '#2a6fb0', sky2: '#8fd0e8', far: '#3d5a78', mid: '#4a7a8a',
    beam: '#c8a468', beamDark: '#8a6a3c', plank: '#e8d8a8', plankLit: '#ffe27a',
    worker: '#e8703a', workerDark: '#a84a20', helmet: '#ffd400',
    good: '#39d67a', bad: '#ff4d5e', gold: '#ffd400', ink: '#12202c', white: '#ffffff',
  };

  var GAME_TITLE = 'SKY FOOTWORK';
  var STEP_COUNT = 9;
  var WINDOW_DUR = 1.7;
  var LX = W * 0.28, RX = W * 0.72;
  var BTN_Y = H * 0.86, BTN_W = 300, BTN_H = 170;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 1, y + 2, { size: sz, color: '#0a1420', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var WORKER_L = ['.##.', '####', '.##.', '#.#.'];
  var WORKER_R = ['.##.', '####', '.##.', '.#.#'];

  function bg(climbT) {
    var pulse = 0.03 + 0.03 * Math.sin(game.time.elapsed * 1.3);
    game.draw.gradient(0, H, [[0, C.sky1], [1, C.sky2]]);
    game.draw.rect(0, 0, W, H, '#ffffff', pulse);
    // far skyline strips
    for (var i = 0; i < 6; i++) {
      var fx = ((i * 190 - (climbT * 40)) % (W + 200)) - 100;
      game.draw.rect(fx, H * 0.30 + (i % 3) * 40, 70, H, C.far, 0.5);
    }
    for (var j = 0; j < 5; j++) {
      var mx = ((j * 260 - (climbT * 90)) % (W + 260)) - 130;
      game.draw.rect(mx, H * 0.42 + (j % 2) * 60, 100, H, C.mid, 0.6);
    }
  }

  var seq, idx, stepTimer, side, charX, charY, targetY, climbT;
  var done, endWait, finished, ready, hitStop, shake, milestoneCalled;

  function buildSeq() {
    var arr = [];
    var last = -1, streak = 0;
    for (var i = 0; i < STEP_COUNT; i++) {
      var s = Math.random() < 0.5 ? 0 : 1;
      if (s === last) { streak++; if (streak >= 2) { s = 1 - s; streak = 0; } } else streak = 0;
      last = s;
      arr.push(s);
    }
    return arr;
  }

  function initGame() {
    seq = buildSeq();
    idx = 0; stepTimer = WINDOW_DUR; side = seq[0];
    charX = side === 0 ? LX : RX; charY = H * 0.62; targetY = charY; climbT = 0;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; milestoneCalled = false;
  }

  function drawScene() {
    // ladder beams
    game.draw.line(LX, H * 0.15, LX, H * 0.9, C.beam, 26);
    game.draw.line(RX, H * 0.15, RX, H * 0.9, C.beam, 26);
    for (var i = 0; i <= STEP_COUNT; i++) {
      var py = H * 0.86 - i * 62;
      var lit = i === idx;
      var thisSide = i < seq.length ? seq[i] : 0;
      var px = thisSide === 0 ? LX : RX;
      game.draw.rect(px - 70, py - 10, 140, 20, lit ? C.plankLit : C.plank);
      game.draw.rect(px - 70, py + 10, 140, 6, C.beamDark, 0.6);
    }
    // worker
    var bob = Math.sin(game.time.elapsed * 6) * (finished ? 0 : 4);
    game.draw.sprite(side === 0 ? WORKER_L : WORKER_R, { '#': C.worker }, charX, charY + bob, 30, { anchor: 'center' });
    game.draw.circle(charX, charY - 46, 16, C.helmet);
  }

  function stumble(x, y) {
    ok = false; finished = true; hitStop = 0.35; shake = 0.3;
    game.feedback.bad(x, y, { text: 'MISS' });
    game.audio.play('se_bad', 0.4);
    finish();
  }

  function tryStep(pickSide, x, y) {
    if (finished || ready > 0 || hitStop > 0) return;
    if (pickSide === seq[idx]) {
      idx++;
      charX = idx < seq.length ? (seq[idx] === 0 ? LX : RX) : charX;
      charY -= 62; targetY = charY; climbT += 1;
      stepTimer = WINDOW_DUR;
      game.feedback.good(x, y, { text: 'GOOD', color: C.good });
      game.audio.play('se_jump', 0.4);
      if (!milestoneCalled && idx === Math.ceil(STEP_COUNT / 2)) {
        milestoneCalled = true;
        game.fx.popup('HALFWAY!', charX, charY - 90, { color: C.gold, size: 34 });
        game.audio.play('se_milestone', 0.35);
      }
      if (idx >= STEP_COUNT) {
        ok = true; finished = true; hitStop = 0.3;
        game.feedback.good(x, y, { text: 'CLEAR', color: C.good });
        game.fx.burst(charX, charY, { color: C.gold, count: 22, speed: 400 });
        game.audio.play('se_success', 0.5);
        finish();
      }
    } else {
      stumble(x, y);
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) {
      game.audio.play('se_tap', 0.08);
      tryStep(x < W / 2 ? 0 : 1, x, y);
    }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  var demo = { t: 0 };
  function resetDemo() { initGame(); }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.6;
    if (cyc < dt || demo.t <= dt) resetDemo();
    ready = 0;
    var stepDur = 3.6 / (STEP_COUNT + 1);
    var want = Math.min(STEP_COUNT, Math.floor(cyc / stepDur));
    while (idx < want && idx < STEP_COUNT) {
      var s = seq[idx];
      idx++;
      charX = idx < seq.length ? (seq[idx] === 0 ? LX : RX) : charX;
      charY -= 62;
    }
    var withinStep = cyc - idx * stepDur;
    demo.press = withinStep < stepDur * 0.35;
    var handX = idx < seq.length ? (seq[idx] === 0 ? LX : RX) : charX;
    var handY = BTN_Y;
    demo.gx = handX; demo.gy = handY;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (seq === undefined) initGame();
      stepDemo(dt);
      bg(climbT);
      drawScene();
      game.draw.rect(LX - BTN_W / 2, BTN_Y - BTN_H / 2, BTN_W, BTN_H, C.beamDark, 0.35);
      game.draw.rect(RX - BTN_W / 2, BTN_Y - BTN_H / 2, BTN_W, BTN_H, C.beamDark, 0.35);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 42, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.95, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.95, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg(climbT);
      drawScene();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 46, ok ? C.good : C.bad);
      txt(idx + ' / ' + STEP_COUNT, W / 2, H * 0.13, 28, C.gold);
      if (!ok) txt('あと' + (STEP_COUNT - idx) + '段!', W / 2, H * 0.18, 24, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.95, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(idx, { steps: idx, total: STEP_COUNT });
        else game.end.failure({ steps: idx, total: STEP_COUNT });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      stepTimer -= dt;
      if (stepTimer <= 0) stumble(charX, charY);
    }
    if (shake > 0) shake -= dt;

    bg(climbT);
    drawScene();
    game.draw.rect(LX - BTN_W / 2, BTN_Y - BTN_H / 2, BTN_W, BTN_H, side === 0 ? C.plankLit : C.beamDark, side === 0 ? 0.6 : 0.35);
    game.draw.rect(RX - BTN_W / 2, BTN_Y - BTN_H / 2, BTN_W, BTN_H, side === 1 ? C.plankLit : C.beamDark, side === 1 ? 0.6 : 0.35);

    txt(idx + ' / ' + STEP_COUNT, W / 2, H * 0.06, 30, C.ink);
    var tbW = W - 120;
    var pct = Math.max(0, stepTimer / WINDOW_DUR);
    var lowTime = pct < 0.3 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(60, 150, tbW, 16, '#ffffff', 0.3);
    game.draw.rect(60, 150, tbW * pct, 16, lowTime ? C.bad : C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.46, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['C4', 0.2], ['E4', 0.2], ['G4', 0.2], ['C5', 0.4]], { tempo: 150, wave: 'square', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
