// 410-voltage-surge.js
// 電圧サージ — 注ぐ数がお題ちょうどになった瞬間に止める。入れ過ぎ厳禁の自制
// 操作: お題の数ぴったりで鍋への投入を止める(タップ)
// 成功: 制限時間内に 4 皿ぴったり仕上げる  失敗: 時間切れ
// @mechanic: count_exact
// @theme: kitchen
// 世界観: キッチンの見習いが、レシピ通りちょうどの数だけ具を鍋に入れて止める
// variation: 物量型(進むほどお題の数が増え投入も速くなる)
// spice: フィーバータイム(2皿仕上げると数秒だけ得点2倍)
// スタイル: 2000s ARCADE POP

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2000s ARCADE POP(キッチン)
  var C = {
    plum: '#3a1145', tomato: '#ff5b4d', lemon: '#ffd23f', mint: '#54e6b0',
    cream: '#fff4e6', steel: '#8fa3b8', red: '#ff3b5c', orange: '#ff8a3d', pink: '#ff6fb5',
  };

  var GAME_TITLE = 'VOLTAGE COOK';
  var MAX_TIME = 18;
  var NEEDED = 4;
  var POT_X = W / 2, POT_Y = H * 0.5;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  var target, count, addTimer, addRate, phase;
  var score, served, timeLeft, done, ready, fever, hitStop, feedback, feedbackOk, drops;

  // 鍋(顔つき)
  var POT = [
    'H......H',
    'HKKKKKKH',
    'PSSSSSSP',
    'PSEWWESP',
    'PSSSSSSP',
    'PSSMMSSP',
    'PSSSSSSP',
    '.PPPPPP.',
  ];
  var POT_COL = { P: C.steel, S: '#2a3644', E: C.cream, M: C.tomato, K: C.orange, H: '#5a6b7a' };

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 4, { size: sz, color: '#1a0620', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }
  function scanlines() { for (var sy = 0; sy < H; sy += 8) game.draw.rect(0, sy, W, 2, '#000000', 0.10); }

  function kitchenBg() {
    game.draw.gradient(0, H, [[0, '#57204f'], [0.5, '#3a1145'], [1, '#1f0a26']]);
    // タイル壁
    for (var y = 120; y < H * 0.62; y += 90) for (var x = 0; x < W; x += 90) game.draw.rect(x + 4, y + 4, 82, 82, C.plum, 0.4);
    // 調理台
    game.draw.rect(0, H * 0.62, W, H * 0.38, '#2a1630');
    game.draw.rect(0, H * 0.62, W, 12, C.steel, 0.6);
  }

  function drawDrops(n) {
    // 投入済みの具を鍋の上に積む
    for (var i = 0; i < n; i++) {
      var col = i % 3, row = Math.floor(i / 3);
      game.draw.circle(POT_X - 40 + col * 40, POT_Y - 30 - row * 34, 16, i % 2 ? C.mint : C.lemon, 1);
    }
  }

  function newOrder() {
    target = 3 + Math.min(6, served); // 物量型: 数が増える
    count = 0; addTimer = 0; addRate = Math.max(0.22, 0.5 - served * 0.05); phase = 'adding';
  }
  function initGame() {
    score = 0; served = 0; timeLeft = MAX_TIME; done = false;
    ready = 0.8; fever = 0; hitStop = 0; feedback = 0; feedbackOk = false; drops = 0;
    newOrder();
  }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success; finalScore = score;
    game.audio.stopBgm();
    if (success) game.audio.play('se_success');
    else { game.audio.play('se_failure'); hitStop = 0.4; game.fx.flash(C.red, 0.25); }
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1600);
  }

  function stopAdding() {
    if (phase !== 'adding') return;
    if (count === target) {
      served++;
      var gain = fever > 0 ? 200 : 100; score += gain;
      feedback = 0.4; feedbackOk = true;
      game.feedback.good(POT_X, POT_Y - 60, { text: '+' + gain, color: C.mint });
      if (served === 2) { fever = 3.5; game.audio.play('se_milestone'); }
      if (served >= NEEDED) { finish(true); return; }
      phase = 'serve'; addTimer = 0.4;
    } else {
      feedback = 0.4; feedbackOk = false; hitStop = 0.35;
      game.feedback.bad(POT_X, POT_Y - 60, { text: count > target ? 'OVER' : 'UNDER' });
      phase = 'serve'; addTimer = 0.5;
    }
  }

  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || ready > 0 || hitStop > 0) return;
    stopAdding();
  });

  // ATTRACT ゴースト実演: お題ちょうどで手が止める
  var d = { target: 5, count: 0, t: 0, timer: 0, gx: POT_X, gy: POT_Y + 220, press: false, phase: 'adding' };
  function stepDemo(dt) {
    d.t += dt; d.timer += dt;
    d.gy += (POT_Y + 120 - d.gy) * Math.min(1, dt * 3);
    if (d.phase === 'adding') {
      if (d.timer > 0.3) { d.timer = 0; d.count++; }
      d.press = d.count >= d.target - 1;
      if (d.count >= d.target) {
        game.feedback.good(POT_X, POT_Y - 60, { text: '+100', color: C.mint });
        d.phase = 'wait'; d.timer = 0; d.press = true;
      }
    } else if (d.timer > 0.7) { d.count = 0; d.target = 4 + Math.floor(d.t) % 4; d.phase = 'adding'; d.timer = 0; }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      kitchenBg(); stepDemo(dt);
      game.draw.sprite(POT, POT_COL, POT_X, POT_Y, 16, { anchor: 'center' });
      drawDrops(d.count);
      txt(d.count + ' / ' + d.target, POT_X, POT_Y - 200, 72, C.lemon);
      game.draw.hand(d.gx, d.gy, { press: d.press, scale: 16 });
      txt(GAME_TITLE, W / 2, H * 0.1, 78, C.lemon);
      txt('BEST ' + String(game.best).padStart(6, '0'), W / 2, H * 0.16, 40, C.mint);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.84, 62, C.pink);
        txt('TAP TO START', W / 2, H * 0.9, 48, C.cream);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      kitchenBg();
      if (hitStop > 0) hitStop -= dt;
      game.draw.sprite(POT, POT_COL, W / 2, H * 0.34, 20, { anchor: 'center' });
      txt(resultSuccess ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.54, 90, resultSuccess ? C.mint : C.red);
      txt('SCORE ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.63, 56, C.cream);
      var best = Math.max(game.best, finalScore);
      txt('BEST ' + String(best).padStart(6, '0'), W / 2, H * 0.69, 42, C.lemon);
      if (finalScore > game.best && game.best > 0 && resultSuccess && Math.floor(game.time.elapsed * 3) % 2 === 0) {
        txt('NEW RECORD', W / 2, H * 0.76, 54, C.pink);
      } else if (Math.floor(game.time.elapsed * 2) % 2 === 0) {
        txt('TAP TO CONTINUE', W / 2, H * 0.8, 46, C.mint);
      }
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      if (hitStop > 0) { hitStop -= dt; }
      else if (ready > 0) { ready -= dt; if (ready <= 0) game.audio.play('se_tap'); }
      else {
        timeLeft -= dt;
        if (fever > 0) fever -= dt;
        if (timeLeft <= 0) { finish(false); return; }
        if (phase === 'adding') {
          addTimer += dt;
          if (addTimer >= addRate) {
            addTimer = 0; count++;
            game.audio.play('se_tap', 0.4);
            if (count > target + 2) stopAdding(); // 溢れたら強制判定
          }
        } else if (phase === 'serve') {
          addTimer -= dt; if (addTimer <= 0) newOrder();
        }
      }
      if (feedback > 0) feedback -= dt;
    }

    // draw
    kitchenBg();
    game.draw.sprite(POT, POT_COL, POT_X, POT_Y, 16, { anchor: 'center' });
    drawDrops(Math.min(count, 9));
    // お題カウンタ(telegraph: target 近くで色が変わる)
    var near = count >= target - 1 && count <= target;
    txt(count + ' / ' + target, POT_X, POT_Y - 220, 84, count === target ? C.mint : (count > target ? C.red : C.lemon));
    if (near && phase === 'adding') game.draw.circle(POT_X, POT_Y - 200, 90, C.mint, 0.14);

    var frac = Math.max(0, timeLeft / MAX_TIME);
    game.draw.rect(60, 40, (W - 120) * frac, 26, fever > 0 ? C.pink : C.tomato);
    game.draw.rect(60, 40, W - 120, 26, C.plum, 0.6);
    txt('SCORE ' + String(score).padStart(6, '0'), W / 2, 108, 44, C.cream);
    txt(served + ' / ' + NEEDED, W / 2, 168, 44, C.mint);
    if (fever > 0 && Math.floor(game.time.elapsed * 6) % 2 === 0) txt('FEVER', W / 2, H * 0.7, 52, C.pink);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.72, 92, C.lemon);
    scanlines();
  });

  game.onStart(function() {
    game.audio.melody(
      [['C5', 0.5], ['D5', 0.5], ['E5', 0.5], ['G5', 0.5], ['E5', 0.5], ['C5', 0.5], ['D5', 1],
       ['F5', 0.5], ['E5', 0.5], ['D5', 0.5], ['C5', 0.5], ['G4', 1], ['C5', 1]],
      { tempo: 140, wave: 'square', volume: 0.08, loop: true,
        bass: [['C3', 1], ['A2', 1], ['F2', 1], ['G2', 1], ['C3', 1], ['C3', 1]], bassWave: 'triangle', bassVolume: 0.08 }
    );
    state = S.ATTRACT;
    initGame();
  });
})(game);
