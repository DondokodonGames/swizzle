// GH-PS-0091-spin-plate.js
// スピンプレート — 回転する床の上で、傾きに逆らって指で支え続ける。落ちたら終わり
// 操作: 指で押さえて左右にドラッグし、傾いた方向と逆に重心を戻し続ける
// 終わり: もった秒数が残る
// @mechanic: balance
// @theme: spin_deck
// 世界観: 回る円盤の上。円盤の傾き(スポークの回転)が周期的に変わり、傾いた側へ重心が流される。指を離すと支えられない
// 残るもの: もった秒数(SCORE) + BEST
// スタイル: MODE7 PSEUDO

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // MODE7 PSEUDO: 少色 + 地平グラデ。横1pxストリップを奥ほど圧縮、地平線へ収束
  var C = {
    sky1: '#1a0f2e', sky2: '#3a1f5a', horizon: '#6a3f9a',
    disc1: '#2a1848', disc2: '#3a2460', spokeA: '#8a5fc8', spokeB: '#4a2870',
    edge: '#ff4d6a', gold: '#ffd400', good: '#4dff9a', bad: '#ff4d5e', white: '#ffffff', ink: '#0a0614',
  };

  var GAME_TITLE = 'SPIN PLATE';
  var DCX = W / 2, DCY = H * 0.48, DRX = W * 0.40, DRY = H * 0.20;
  var PULL_BASE = 0.55, CONTROL_RATE = 5.0;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var finalScore = 0;

  var offsetX, theta, rotSpeed, survived, done, endWait, fell;
  var ready, hitStop, shake, wobbleSnd;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 4, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var PLAYER = ['.##.', '####', '.##.', '####', '#.##'];
  var PLAYER_PAL = { '#': C.white };

  function skyBg() {
    // 全高を必ず塗る(円盤の下は奈落。透明のまま残さない)
    game.draw.gradient(0, H, [[0, C.sky1], [0.42, C.sky2], [0.50, C.horizon], [0.62, '#150a24'], [1, '#05030a']]);
    for (var i = 0; i < 14; i++) {
      var sx = (i * 91 + 17) % W, sy = (i * 53 + 9) % (DCY * 0.8);
      game.draw.circle(sx, sy, 2, '#ffffff', 0.4 + 0.3 * Math.sin(game.time.elapsed * 2 + i));
    }
    // 奈落(円盤の下)にも漂う残骸と光る粒子。空きを埋める
    for (var j = 0; j < 10; j++) {
      var jx = (j * 137 + 43) % W, jy = DCY + (j * 191 + 60) % (H - DCY);
      game.draw.circle(jx, jy, 4 + (j % 3) * 3, C.spokeA, 0.15 + 0.1 * Math.sin(game.time.elapsed * 1.3 + j));
    }
    game.draw.circle(DCX, DCY, DRX * 1.15, C.sky2, 0.10);
  }

  function discFloor() {
    // 円盤(横1pxストリップ圧縮の簡易表現): 同心楕円 + 回転するスポーク
    for (var r = 5; r >= 1; r--) {
      var t = r / 5;
      game.draw.circle(DCX, DCY, DRX * t, C.disc1, 0.9);
      game.draw.circle(DCX, DCY, DRX * t, C.disc2, 0.15);
    }
    var SPOKES = 10;
    for (var i2 = 0; i2 < SPOKES; i2++) {
      var a = theta + (i2 / SPOKES) * Math.PI * 2;
      var ex = DCX + Math.cos(a) * DRX, ey = DCY + Math.sin(a) * DRY;
      game.draw.line(DCX, DCY, ex, ey, i2 % 2 === 0 ? C.spokeA : C.spokeB, 10);
    }
    game.draw.circle(DCX, DCY, DRX, 'transparent');
    // 縁(危険ゾーン、傾きが強い側が赤く)
    var danger = Math.abs(Math.sin(theta)) ;
    game.draw.circle(DCX - DRX * 0.97, DCY, 14, C.edge, 0.3 + 0.3 * danger * (Math.sin(theta) < 0 ? 1 : 0.2));
    game.draw.circle(DCX + DRX * 0.97, DCY, 14, C.edge, 0.3 + 0.3 * danger * (Math.sin(theta) > 0 ? 1 : 0.2));
  }

  function playerShadow(ox) {
    var px = DCX + ox * DRX;
    var py = DCY - 6;
    game.draw.circle(px, py + 30, 34, '#000000', 0.35);
    game.draw.sprite(PLAYER, PLAYER_PAL, px, py, 16, { anchor: 'center' });
  }

  function initGame() {
    offsetX = 0; theta = 0; rotSpeed = 0.9; survived = 0; done = false; endWait = 0; fell = false;
    ready = 0.8; hitStop = 0; shake = 0; wobbleSnd = 0;
  }

  function fallOff() {
    if (fell) return;
    fell = true;
    finalScore = Math.round(survived * 10) / 10;
    game.feedback.bad(DCX + offsetX * DRX, DCY, { text: 'FALL' });
    game.fx.burst(DCX + offsetX * DRX, DCY, { color: C.bad, count: 16, speed: 380 });
    shake = 0.3;
    game.audio.play('se_failure', 0.5);
    finish();
  }

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.4;
  }

  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
  });
  game.onPress(function() {
    if (state === S.PLAYING && !done) game.audio.play('se_tap', 0.15);
  });
  game.onRelease(function() {
    if (state === S.PLAYING && !done) game.audio.play('se_tap', 0.08);
  });

  // ── ATTRACT ゴースト実演: 傾きと逆に指を保つと保つ、離すと落ちる ──
  var demo = { t: 0, gx: DCX, gy: DCY, press: true };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 5.0;
    if (cyc < dt) { offsetX = 0; theta = 0; }
    var releasePhase = cyc > 3.6;
    theta += (0.9 + cyc * 0.15) * dt;
    var pull = Math.sin(theta) * PULL_BASE;
    offsetX += pull * dt;
    if (!releasePhase) {
      var target = -Math.sin(theta) * 0.5;
      offsetX += (target - offsetX) * CONTROL_RATE * dt;
      demo.press = true;
    } else {
      demo.press = false;
    }
    offsetX = Math.max(-1.15, Math.min(1.15, offsetX));
    demo.gx = DCX + offsetX * DRX; demo.gy = DCY - 60;
    discFloor();
    playerShadow(offsetX);
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (offsetX === undefined) initGame();
      skyBg();
      stepDemo(dt);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 16 });
      txt(GAME_TITLE, W / 2, H * 0.09, 62, C.white);
      var bestNow = game.best;
      txt('BEST ' + bestNow.toFixed(1) + 's', W / 2, H * 0.14, 34, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 50, C.gold);
        txt('TAP TO START', W / 2, H * 0.95, 40, C.white);
      } else {
        txt('INSERT COIN', W / 2, H * 0.95, 34, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      skyBg();
      discFloor();
      playerShadow(offsetX);
      txt('GAME OVER', W / 2, H * 0.10, 56, C.bad);
      txt(finalScore.toFixed(1) + 's', W / 2, H * 0.18, 70, C.white);
      var best = Math.max(game.best, finalScore);
      txt('BEST ' + best.toFixed(1) + 's', W / 2, H * 0.26, 38, C.gold);
      if (finalScore > game.best && game.best > 0 && Math.floor(game.time.elapsed * 3) % 2 === 0) txt('NEW RECORD', W / 2, H * 0.32, 40, C.gold);
      else if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.90, 38, C.white);
      return;
    }

    // ── PLAYING ──
    if (done) {
      endWait -= dt;
      if (endWait <= 0) { state = S.RESULT; game.end.record(finalScore, { label: finalScore.toFixed(1) + 's' }); }
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!fell) {
      survived += dt;
      rotSpeed = 0.9 + survived * 0.05;
      theta += rotSpeed * dt;
      var pull2 = Math.sin(theta) * (PULL_BASE + survived * 0.02);
      offsetX += pull2 * dt;
      if (game.input.pressing) {
        var target2 = (game.input.x - DCX) / DRX;
        target2 = Math.max(-1, Math.min(1, target2));
        offsetX += (target2 - offsetX) * CONTROL_RATE * dt;
      }
      if (Math.abs(offsetX) > 1.05) fallOff();
      wobbleSnd -= dt;
      if (wobbleSnd <= 0 && Math.abs(offsetX) > 0.7) { wobbleSnd = 0.4; game.audio.tone(300, 0.08, { wave: 'triangle', volume: 0.1 }); }
      if (Math.floor(survived) > Math.floor(survived - dt) && Math.floor(survived) > 0 && Math.floor(survived) % 5 === 0) {
        game.fx.popup(Math.floor(survived) + 's', W / 2, H * 0.20, { color: C.gold, size: 50 });
        game.feedback.good(DCX + offsetX * DRX, DCY, { text: null, color: C.good });
      }
    }
    if (shake > 0) shake -= dt;

    skyBg();
    discFloor();
    if (!fell) playerShadow(offsetX);

    txt(survived.toFixed(1) + ' / ' + '∞' + 's', W / 2, 90, 40, C.white);
    game.draw.rect(60, 40, W - 120, 20, C.ink, 0.6);
    var bal = (offsetX + 1.15) / 2.3;
    game.draw.rect(60, 40, (W - 120) * Math.max(0, Math.min(1, bal)), 20, Math.abs(offsetX) > 0.7 ? C.bad : C.good);

    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.66, 84, C.gold);
  });

  game.onStart(function() {
    game.audio.bgm('bgm_tense', 0.10);
    state = S.ATTRACT;
    initGame();
  });
})(game);
