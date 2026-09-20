// I-Switch-0013-rescue-dispatch-call.js
// レスキュー・ディスパッチ・コール — 出動要請のアイコンを見て、山・海・空のどの救助隊員を送るべきか瞬時に選んでタップする
// 操作: 上に出る要請アイコン(山/波/雲)を見て、対応する隊員が立つ左/中/右のゾーンをタップする
// 終わり: 規定回数(5回)正しく出動させれば成功。誤った隊員を送る、または時間切れになれば失敗
// @mechanic: judge
// @theme: rescue_dispatch_center
// 世界観: 山・海・空をまとめて担当する救助指令所。届いた要請アイコンを見て、登山隊・潜水隊・飛行隊のうち正しい1隊をその場で選んで出動させる
// 残るもの: 正誤(CLEAR/GAME OVER) + 正しく出動させた回数
// スタイル: 1BIT INK
(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 1BIT INK: 白黒2値に近い墨絵調、アクセントは1色のみ
  var C = {
    bg: '#eef0ea', bg2: '#e0e2da', panel: '#1c1c1c', panelLight: '#2c2c2c',
    accent: '#c93a3a', good: '#2a7a4a', bad: '#c93a3a', gold: '#c9a23a',
    white: '#f6f6f2', ink: '#1c1c1c',
  };

  var GAME_TITLE = 'DISPATCH CALL';
  var TOTAL = 5;
  var ZONES = [W * 0.22, W * 0.5, W * 0.78];
  var ZY = H * 0.6;
  var ICON_Y = H * 0.22;

  var TYPES = ['mountain', 'wave', 'cloud'];
  var RESPONDER = {
    mountain: ['.##.', '####', '#..#'],
    wave: ['....', '####', '.##.'],
    cloud: ['.##.', '####', '....'],
  };

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: '#00000030', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    for (var i = 0; i < 8; i++) game.draw.rect(0, i * (H / 8), W, 2, '#00000006');
  }

  function drawIcon(type, x, y, s) {
    if (type === 'mountain') {
      game.draw.line(x - s, y + s * 0.6, x, y - s, C.ink, 8);
      game.draw.line(x, y - s, x + s, y + s * 0.6, C.ink, 8);
    } else if (type === 'wave') {
      game.draw.line(x - s, y, x - s * 0.3, y - s * 0.5, C.accent, 8);
      game.draw.line(x - s * 0.3, y - s * 0.5, x + s * 0.3, y + s * 0.3, C.accent, 8);
      game.draw.line(x + s * 0.3, y + s * 0.3, x + s, y - s * 0.3, C.accent, 8);
    } else {
      game.draw.circle(x - s * 0.3, y, s * 0.5, C.panelLight);
      game.draw.circle(x + s * 0.3, y, s * 0.6, C.panelLight);
      game.draw.circle(x, y - s * 0.3, s * 0.5, C.panelLight);
    }
  }

  var order, roundType, layout, roundT, roundDur, telegraphed, round, correct;
  var done, endWait, finished, hitStop, shake, ready;

  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }

  function newRound(rnd) {
    layout = shuffle(TYPES);
    roundType = TYPES[Math.floor(Math.random() * TYPES.length)];
    roundDur = Math.max(1.15, 1.9 - rnd * 0.12);
    return { t: 0 };
  }

  function initGame() {
    correct = 0; round = 0; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; telegraphed = false;
    roundT = 0;
    newRound(0);
  }

  function resolveZone(idx) {
    if (ready > 0 || done || finished) return;
    var picked = layout[idx];
    game.audio.play('se_tap', 0.1);
    if (picked === roundType) {
      correct++;
      game.feedback.good(ZONES[idx], ZY, { text: 'GO!', color: C.good });
      game.fx.burst(ZONES[idx], ZY, { color: C.gold, count: 14, speed: 300 });
      game.audio.play('se_good', 0.4);
      if (correct === Math.ceil(TOTAL / 2)) { game.fx.popup('HALFWAY!', W / 2, ZY - 200, { color: C.gold, size: 38 }); game.audio.play('se_milestone', 0.5); }
      if (correct >= TOTAL) { ok = true; finished = true; finish(); return; }
      round++;
      newRound(round);
      roundT = 0; telegraphed = false;
    } else {
      hitStop = 0.35;
      game.feedback.bad(ZONES[idx], ZY, { text: 'MISS' });
      shake = 0.3;
      game.audio.play('se_bad', 0.4);
      ok = false; finished = true; finish();
    }
  }

  game.onPress(function(x, y) {
    if (state !== S.PLAYING) return;
    var idx = x < W * 0.36 ? 0 : (x > W * 0.64 ? 2 : 1);
    resolveZone(idx);
  });

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

  function drawScene() {
    bg();
    game.draw.rect(0, ICON_Y - 90, W, 180, C.panel, 0.06);
    drawIcon(roundType, W * 0.5, ICON_Y, 60);
    for (var i = 0; i < 3; i++) {
      game.draw.rect(ZONES[i] - 110, ZY - 100, 220, 200, C.panelLight, 0.08);
      game.draw.sprite(RESPONDER[layout[i]], { '#': C.panel }, ZONES[i], ZY, 24, { anchor: 'center' });
      drawIcon(layout[i], ZONES[i], ZY + 130, 26);
    }
  }

  var demo = { t: 0, gx: ZONES[1], gy: H * 0.86, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 5.0;
    if (cyc < dt || demo.t <= dt) { initGame(); }
    roundT += dt;
    if (roundT > roundDur * 0.55 && !telegraphed) telegraphed = true;
    if (roundT > roundDur * 0.65 && demo.press === false) {
      var idx = layout.indexOf(roundType);
      demo.gx = ZONES[idx]; demo.press = true;
      correct = Math.min(TOTAL, correct + 1);
      game.feedback.good(ZONES[idx], ZY, { text: 'GO!', color: C.good });
      game.audio.play('se_good', 0.2);
      round++;
      newRound(round % 4);
      roundT = 0; telegraphed = false;
    } else if (roundT <= roundDur * 0.65) {
      demo.press = false;
    }
    demo.gy = ZY + 170;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (round === undefined) initGame();
      stepDemo(dt);
      drawScene();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 40, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 24, C.accent);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.94, 38, C.accent);
      else txt('INSERT COIN', W / 2, H * 0.94, 26, C.ink);
      return;
    }

    if (state === S.RESULT) {
      drawScene();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 48, ok ? C.good : C.bad);
      txt(correct + ' / ' + TOTAL, W / 2, H * 0.13, 30, C.accent);
      if (!ok) txt('あと' + (TOTAL - correct) + '回!', W / 2, H * 0.18, 26, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(correct, { correct: correct, total: TOTAL }); else game.end.failure({ correct: correct, total: TOTAL });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      roundT += dt;
      if (roundT > roundDur * 0.6 && !telegraphed) { telegraphed = true; game.audio.play('se_tap', 0.15); }
      if (roundT >= roundDur) {
        hitStop = 0.35;
        game.feedback.bad(W / 2, ZY, { text: 'TIME UP' });
        shake = 0.3;
        game.audio.play('se_bad', 0.4);
        ok = false; finished = true; finish();
      }
    }
    if (shake > 0) shake -= dt;

    drawScene();
    if (telegraphed && !finished) {
      var blink = Math.floor(game.time.elapsed * 10) % 2 === 0;
      if (blink) game.draw.rect(0, ICON_Y - 90, W, 180, C.bad, 0.15);
    }

    txt(correct + ' / ' + TOTAL, W / 2, H * 0.06, 30, C.ink);
    game.draw.rect(60, 150, W - 120, 16, '#00000020');
    game.draw.rect(60, 150, (W - 120) * (correct / TOTAL), 16, C.accent);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.46, 56, C.accent);
  });

  game.onStart(function() {
    game.audio.bgm('bgm_tense', 0.05);
    state = S.ATTRACT;
    initGame();
  });
})(game);
