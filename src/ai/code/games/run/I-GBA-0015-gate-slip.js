// I-GBA-0015-gate-slip.js
// ゲートスリップ — 閉まりかけの改札ゲートが完全に閉じる前に、指で連れたキャラを隙間へ滑り込ませる
// 操作: 指を離した位置にキャラがついてくる。閉じていくゲートの隙間へ、完全に閉まる前にドラッグして通す
// 終わり: 規定回数(3回)連続でゲートを抜ければ成功。挟まれれば(閉まりきる前に通れなければ)失敗
// @mechanic: drag_follow
// @theme: transit_gate_rush
// 世界観: 地下の乗換通路。閉まりかけの自動ゲートへ、駆け込み客の分身キャラを指で誘導して滑り込ませ続ける
// 残るもの: 正誤(CLEAR/GAME OVER) + 通り抜けた回数
// スタイル: 2010s FLAT MOBILE

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2010s FLAT MOBILE: 影・グラデを使わない。丸角、大きい余白、アイコン的な形
  var C = {
    bg: '#eef1f6', floor: '#dfe4ec', gate: '#5b6b8c', gateWarn: '#ff5c5c',
    runner: '#2f6fed', runnerDark: '#1e4bb0',
    good: '#2bb673', bad: '#e5484d', gold: '#f5a623', white: '#ffffff', ink: '#1c2433',
  };

  var GAME_TITLE = 'GATE SLIP';
  var TOTAL = 3;
  var GATE_Y = H * 0.42;
  var START_X = W * 0.5, GAP_Y = GATE_Y;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var passed, done, endWait, finished, ready, hitStop, shake;
  var round, gapW, closeT, closeDur, runnerX, runnerY, dragging, resolved;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 2, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var RUNNER = ['.##.', '####', '.##.', '#..#'];

  function bg() {
    game.draw.gradient(0, H, [[0, '#f4f6fa'], [1, C.bg]]);
    game.draw.rect(0, H * 0.55, W, H * 0.4, C.floor);
    for (var i = 0; i < 6; i++) game.draw.rect(i * W / 6, H * 0.55, 4, H * 0.4, '#ffffff90');
  }

  function newRound() {
    gapW = Math.max(160, 420 - round * 60);
    closeDur = Math.max(1.1, 1.9 - round * 0.15);
    closeT = 0;
  }

  function initGame() {
    passed = 0; done = false; endWait = 0; finished = false; ready = 0.8; hitStop = 0; shake = 0;
    round = 0; runnerX = START_X; runnerY = H * 0.78; dragging = false; resolved = false;
    newRound();
  }

  function drawGate(closing) {
    var w = W * 0.9;
    var open = gapW * Math.max(0, 1 - closeT / closeDur);
    var leftW = (w - open) / 2, rightW = (w - open) / 2;
    var warn = open < gapW * 0.35;
    var col = warn ? C.gateWarn : C.gate;
    if (warn) {
      var blink = Math.floor(game.time.elapsed * 12) % 2 === 0;
      col = blink ? C.gateWarn : C.gate;
    }
    game.draw.rect(CX0() - w / 2, GATE_Y - 220, leftW, 440, col);
    game.draw.rect(CX0() + w / 2 - rightW, GATE_Y - 220, rightW, 440, col);
  }
  function CX0() { return W * 0.5; }

  function drawRunner() {
    game.draw.sprite(RUNNER, { '#': C.runner }, runnerX, runnerY, 22, { anchor: 'center' });
  }

  game.onPress(function(x, y) {
    if (state !== S.PLAYING || finished || ready > 0 || done) return;
    dragging = true;
    game.audio.play('se_tap', 0.05);
  });
  game.onMove(function(x, y) {
    if (state !== S.PLAYING || !dragging || finished || ready > 0 || done) return;
    runnerX = Math.max(60, Math.min(W - 60, x));
    runnerY = Math.max(H * 0.3, Math.min(H * 0.9, y));
    if (Math.random() < 0.08) game.audio.play('se_tap', 0.02);
    checkPass();
  });
  game.onRelease(function() {
    if (state === S.PLAYING) { dragging = false; if (!finished) game.audio.play('se_tap', 0.02); }
  });

  function checkPass() {
    if (resolved || finished) return;
    var w = W * 0.9;
    var open = gapW * Math.max(0, 1 - closeT / closeDur);
    if (Math.abs(runnerY - GATE_Y) < 20 && Math.abs(runnerX - CX0()) < open / 2) {
      resolved = true;
      passed++;
      hitStop = 0.1;
      game.feedback.good(runnerX, runnerY, { text: 'SLIP', color: C.good });
      game.fx.burst(runnerX, runnerY, { color: C.gold, count: 16, speed: 340 });
      game.audio.play('se_good', 0.4);
      if (passed === Math.ceil(TOTAL / 2)) { game.fx.popup(passed + ' / ' + TOTAL, W / 2, H * 0.16, { color: C.gold, size: 36 }); game.audio.play('se_milestone', 0.3); }
      if (passed >= TOTAL) { ok = true; finished = true; finish(); return; }
      round++; runnerX = START_X; runnerY = H * 0.78; newRound(); resolved = false;
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  var demo = { t: 0, gx: START_X, gy: H * 0.78, press: false, closeT: 0, closeDur: 1.5, gapW: 380, rx: START_X, ry: H * 0.78 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.2;
    if (cyc < dt || demo.t <= dt) { demo.closeT = 0; demo.rx = START_X; demo.ry = H * 0.78; demo.press = false; demo.done = false; }
    demo.closeT += dt;
    var p = Math.min(1, cyc / 2.0);
    demo.rx = START_X;
    demo.ry = H * 0.78 - p * (H * 0.78 - GATE_Y);
    demo.press = p < 0.95;
    demo.gx = demo.rx; demo.gy = demo.ry;
    closeT = demo.closeT; closeDur = demo.closeDur; gapW = demo.gapW;
    runnerX = demo.rx; runnerY = demo.ry;
    if (p >= 0.95 && !demo.done) {
      demo.done = true;
      game.feedback.good(demo.rx, GATE_Y, { text: 'SLIP', color: C.good });
      game.audio.play('se_good', 0.25);
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      bg();
      stepDemo(dt);
      drawGate(true);
      drawRunner();
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
      drawGate(true);
      drawRunner();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 48, ok ? C.good : C.bad);
      txt(passed + ' / ' + TOTAL, W / 2, H * 0.13, 30, C.gold);
      if (!ok) txt('あと' + (TOTAL - passed) + '回!', W / 2, H * 0.18, 24, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.92, 24, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(passed, { passed: passed, total: TOTAL });
        else game.end.failure({ passed: passed, total: TOTAL });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      closeT += dt;
      if (closeT >= closeDur && !resolved) {
        resolved = true; hitStop = 0.3;
        game.feedback.bad(runnerX, GATE_Y, { text: 'MISS' });
        shake = 0.3;
        game.audio.play('se_bad', 0.4);
        ok = false; finished = true; finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    if (!finished) drawGate(true);
    drawRunner();

    txt(passed + ' / ' + TOTAL, W / 2, H * 0.06, 30, C.ink);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.12);
    game.draw.rect(60, 150, (W - 120) * (passed / TOTAL), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.28, 54, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['A4', 0.15], ['C5', 0.15], ['E5', 0.15], ['A5', 0.3]], { tempo: 150, wave: 'square', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
