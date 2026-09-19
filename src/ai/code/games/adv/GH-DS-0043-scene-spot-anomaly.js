// GH-DS-0043-scene-spot-anomaly.js
// シーンスポット・アノマリー — 現像された現場写真がフラッシュして浮かぶ。不自然な1点だけタップする
// 操作: フラッシュのたびに新しい写真が浮かぶ。4つの品のうち1つだけ様子が違う。それを見つけてタップ。外すと持ち時間が減る
// 終わり: 3枚とも正しく指摘できればCLEAR。持ち時間切れでGAME OVER
// @mechanic: spot
// @theme: detective_lightbox
// 世界観: 暗室のライトボックスに現場写真が次々と浮かぶ。持ち物4点のうち1点だけ矛盾がある。フラッシュが焚かれるたびに写真は変わる
// 残るもの: 正誤(CLEAR/GAME OVER) + 見抜いた枚数
// スタイル: NEO-RETRO

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // NEO-RETRO: 限定4〜6色、大きいドット、1色だけ強い差し色
  var C = {
    bg: '#0e1420', bg2: '#161c2c', frame: '#2a3348', frameEdge: '#3d4a68',
    item: '#7d90b8', itemOdd: '#ff3d6a', good: '#4dff9a', bad: '#ff4d5e',
    gold: '#ffd400', white: '#eef2fb', ink: '#080a10',
  };

  var GAME_TITLE = 'SCENE SPOT';
  var ROUNDS = 3, MAX_TIME = 12;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var found, timeLeft, oddIdx, slots, flashT, revealed, done, endWait, finished;
  var ready, hitStop, shake;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var SLOT_X = [W * 0.22, W * 0.42, W * 0.62, W * 0.82];
  var SLOT_Y = H * 0.44;

  var ITEM_NORMAL = ['.##.', '####', '.##.'];
  var ITEM_ODD_A = ['##..', '####', '.##.'];   // 傾いた品
  var ITEM_ODD_B = ['.##.', '####', '..##'];   // 影が逆
  var ODD_FRAMES = [ITEM_ODD_A, ITEM_ODD_B];

  function labBg() {
    game.draw.gradient(0, H, [[0, C.bg], [0.5, C.bg2], [1, C.bg]]);
    for (var i = 0; i < 20; i++) { var gx = (i * 191 + 37) % W, gy = (i * 331 + 71) % H; game.draw.rect(gx, gy, 2, 2, '#ffffff', 0.04); }
  }

  function newRound() {
    oddIdx = Math.floor(Math.random() * 4);
    slots = [0, 1, 2, 3];
    flashT = 0.35; revealed = false;
  }

  function initGame() {
    found = 0; timeLeft = MAX_TIME; finished = false; done = false; endWait = 0;
    ready = 0.8; hitStop = 0; shake = 0;
    newRound();
  }

  function drawFrame(x, isOdd, lit) {
    game.draw.rect(x - 90, SLOT_Y - 110, 180, 220, C.frameEdge);
    game.draw.rect(x - 82, SLOT_Y - 102, 164, 204, C.frame);
    if (lit) {
      var frame = isOdd ? ODD_FRAMES[oddIdx % 2] : ITEM_NORMAL;
      game.draw.sprite(frame, { '#': isOdd ? C.itemOdd : C.item }, x, SLOT_Y, 22, { anchor: 'center' });
    }
  }

  function pickSlot(px, py) {
    var best = -1, bd = 999;
    for (var i = 0; i < 4; i++) { var d = Math.hypot(px - SLOT_X[i], py - SLOT_Y); if (d < bd) { bd = d; best = i; } }
    return bd < 130 ? best : -1;
  }

  function resolveTap(x, y) {
    if (done || ready > 0 || hitStop > 0 || finished || !revealed) return;
    var idx = pickSlot(x, y);
    if (idx < 0) return;
    game.audio.play('se_tap', 0.05);
    hitStop = 0.18;
    if (idx === oddIdx) {
      found++;
      game.feedback.good(SLOT_X[idx], SLOT_Y, { text: 'HIT', color: C.good });
      game.fx.burst(SLOT_X[idx], SLOT_Y, { color: C.gold, count: 16, speed: 360 });
      game.audio.play('se_success', 0.35);
      if (found === Math.ceil(ROUNDS / 2)) { game.fx.popup(found + ' / ' + ROUNDS, W / 2, H * 0.12, { color: C.gold, size: 40 }); game.audio.play('se_milestone', 0.4); }
      if (found >= ROUNDS) { ok = true; finished = true; finish(); } else newRound();
    } else {
      timeLeft = Math.max(0, timeLeft - 2.5);
      shake = 0.18;
      game.feedback.bad(SLOT_X[idx], SLOT_Y, { text: 'MISS' });
      game.audio.play('se_bad', 0.3);
    }
  }

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; demo.press = false; return; }
    resolveTap(x, y);
  });

  function stepPlay(dt) {
    if (!revealed) {
      flashT -= dt;
      if (flashT <= 0) { revealed = true; game.audio.play('se_coin', 0.2); }
      return;
    }
    timeLeft -= dt;
    if (timeLeft <= 0) { ok = false; finished = true; finish(); }
  }

  // ── ATTRACT ゴースト実演: フラッシュ後に矛盾のある1点を正しく指す成功例1回、隣の正常品を押す誤タップ例1回 ──
  var demo = { t: 0, gx: SLOT_X[1], gy: H * 0.86, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.2;
    if (cyc < dt) { oddIdx = 2; }
    revealed = cyc > 0.35;
    flashT = Math.max(0, 0.35 - cyc);

    if (cyc > 0.55 && cyc < 1.5) {
      var tx = SLOT_X[2];
      demo.gx += (tx - demo.gx) * Math.min(1, dt * 5);
      demo.gy += (SLOT_Y - demo.gy) * Math.min(1, dt * 5);
      demo.press = cyc > 1.30 && cyc < 1.42;
      if (cyc - dt <= 1.30) { game.feedback.good(SLOT_X[2], SLOT_Y, { text: 'HIT', color: C.good }); game.fx.burst(SLOT_X[2], SLOT_Y, { color: C.gold, count: 10, speed: 300 }); }
    } else if (cyc < 0.55) {
      demo.gx += (SLOT_X[1] - demo.gx) * Math.min(1, dt * 4);
      demo.gy += ((H * 0.86) - demo.gy) * Math.min(1, dt * 4);
      demo.press = false;
    } else if (cyc < 2.9) {
      demo.gx += ((SLOT_X[1] + 60) - demo.gx) * Math.min(1, dt * 4);
      demo.gy += ((H * 0.86) - demo.gy) * Math.min(1, dt * 4);
      demo.press = false;
    } else if (cyc < 3.8) {
      oddIdx = 0;
      var tx2 = SLOT_X[1];
      demo.gx += (tx2 - demo.gx) * Math.min(1, dt * 5);
      demo.gy += (SLOT_Y - demo.gy) * Math.min(1, dt * 5);
      demo.press = cyc > 3.55 && cyc < 3.67;
      if (cyc - dt <= 3.55) { game.feedback.bad(SLOT_X[1], SLOT_Y, { text: 'MISS' }); }
    } else {
      demo.press = false;
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (found === undefined) initGame();
      labBg();
      stepDemo(dt);
      for (var i = 0; i < 4; i++) drawFrame(SLOT_X[i], i === oddIdx, revealed);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.06, 42, C.white);
      txt('BEST ' + (game.best > 0 ? game.best + ' / ' + ROUNDS : '-'), W / 2, H * 0.68, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 38, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.90, 26, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      labBg();
      for (var j = 0; j < 4; j++) drawFrame(SLOT_X[j], j === oddIdx, true);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.06, 48, ok ? C.good : C.bad);
      txt(found + ' / ' + ROUNDS, W / 2, H * 0.68, 30, C.white);
      if (!ok && found === ROUNDS - 1) txt('あと1枚!', W / 2, H * 0.73, 26, C.gold);
      if (ok && (game.best === 0 || found > game.best)) txt('NEW RECORD', W / 2, H * 0.73, 26, C.gold);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.90, 26, C.white);
      return;
    }

    // ── PLAYING ──
    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success({ found: found }); else game.end.failure({ found: found });
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

    labBg();
    for (var k = 0; k < 4; k++) drawFrame(SLOT_X[k], k === oddIdx, revealed);

    txt(found + ' / ' + ROUNDS, W / 2, H * 0.06, 32, C.white);
    game.draw.rect(60, H * 0.72, W - 120, 16, C.white, 0.2);
    game.draw.rect(60, H * 0.72, (W - 120) * Math.max(0, timeLeft / MAX_TIME), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.20, 54, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['A4', 0.2], ['C5', 0.2], ['E5', 0.4]], { tempo: 140, wave: 'triangle', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
