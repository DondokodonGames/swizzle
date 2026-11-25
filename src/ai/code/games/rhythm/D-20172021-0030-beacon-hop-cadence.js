// D-20172021-0030-beacon-hop-cadence.js
// ビーコンホップ・ケイデンス — 4つの屋上ビーコンが拍ごとに1つだけ光る。光った瞬間にそのビーコンをタップして飛び移る
// 操作: 拍に合わせて点灯するビーコンを見極め、消える前にそのビーコンをタップする
// 終わり: 規定回数(8回)正しいビーコンをタップし続ければ成功。誤タップか無反応が1回でもあれば失敗
// @mechanic: timing_window
// @theme: night_delivery_beacon_hop
// 世界観: 夜間配送ドローンが、屋上に並ぶ4つのビーコンの中から拍ごとに光る1つだけを見極め、消える前にタップして飛び移りながら荷物を届け先まで運ぶ
// 残るもの: 正誤(CLEAR/GAME OVER) + 飛び移った拍数
// スタイル: 80s NEON

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 80s NEON: 濃紺の夜空に発光ライン、強いマゼンタ/シアンのアクセント
  var C = {
    bg: '#0a0620', bg2: '#160c30', roof: '#1c1440', roofEdge: '#3a2a70',
    beaconOff: '#241a4a', beaconOn: '#ff2ad1', beaconWarn: '#ffe14d',
    drone: '#2adfff', droneDark: '#0d8aa0',
    good: '#39ff9e', bad: '#ff3355', gold: '#ffe14d', white: '#eaf6ff', ink: '#05030f',
  };

  var GAME_TITLE = 'BEACON HOP';
  var TOTAL = 8;
  var BEAT = 1.3;
  var OPEN_START = 0.32;
  var OPEN_END = 0.78;
  var N = 4;
  var BEACON_X = [W * 0.22, W * 0.42, W * 0.62, W * 0.82];
  var BEACON_Y = H * 0.6;
  var DRONE_HOME_Y = H * 0.82;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var passed, done, endWait, finished;
  var ready, hitStop, shake;
  var active, beatT, resolved, droneX, droneY, dronePos;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var DRONE_SPRITE = ['.#.', '###', '.#.'];

  function bg() {
    var pulse = 0.03 + 0.03 * Math.sin(game.time.elapsed * 1.3);
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    game.draw.rect(0, 0, W, H, '#ff2ad1', pulse * 0.5);
    for (var i = 0; i < 5; i++) {
      var yy = H * 0.14 + i * H * 0.1;
      game.draw.line(0, yy, W, yy, '#2adfff', 3, 0.06 + 0.03 * Math.sin(game.time.elapsed * 1.5 + i));
    }
    game.draw.rect(W * 0.08, H * 0.68, W * 0.84, H * 0.14, C.roof, 0.9);
    game.draw.rect(W * 0.08, H * 0.68, W * 0.84, 8, C.roofEdge);
  }

  function pickActive(exclude) {
    var n;
    do { n = Math.floor(game.random(0, N)); } while (n === exclude);
    return n;
  }

  function initGame() {
    passed = 0; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
    active = 0; beatT = 0; resolved = true;
    dronePos = 0; droneX = BEACON_X[0]; droneY = DRONE_HOME_Y;
  }

  function beaconState(p) {
    if (p < OPEN_START) return 'idle';
    if (p < OPEN_END) return 'open';
    return 'late';
  }

  function drawBeacons(p) {
    var st = beaconState(p);
    for (var l = 0; l < N; l++) {
      var isActive = l === active;
      var glow = C.beaconOff;
      var alpha = 0.35;
      if (isActive) {
        if (st === 'idle') { glow = C.beaconWarn; alpha = 0.5; }
        else if (st === 'open') { glow = C.beaconOn; alpha = 0.55 + 0.35 * Math.sin(game.time.elapsed * 10); }
        else { glow = C.bad; alpha = 0.5; }
      }
      game.draw.circle(BEACON_X[l], BEACON_Y, 40, glow, alpha);
      game.draw.circle(BEACON_X[l], BEACON_Y, 40, C.white, isActive ? 0.25 : 0.08);
    }
  }

  function drawDrone() {
    var bob = Math.sin(game.time.elapsed * 6) * 5;
    game.draw.circle(droneX, droneY + bob, 26, C.droneDark, 0.5);
    game.draw.sprite(DRONE_SPRITE, { '#': C.drone }, droneX, droneY + bob - 6, 14, { anchor: 'center' });
    game.draw.circle(droneX - 6, droneY + bob - 14, 5, C.white, 0.6);
  }

  function beaconAt(x, y) {
    for (var l = 0; l < N; l++) {
      if (game.hit.circle(x, y, 1, BEACON_X[l], BEACON_Y, 46)) return l;
    }
    return -1;
  }

  function resolveTap(l) {
    if (resolved || ready > 0 || done || finished) return;
    var p = beatT / BEAT;
    var st = beaconState(p);
    if (l === active && st === 'open') {
      resolved = true;
      passed++;
      hitStop = 0.06;
      dronePos = active;
      game.feedback.good(BEACON_X[active], BEACON_Y, { text: 'NICE', color: C.good });
      game.audio.play('se_good', 0.3);
      if (passed === 4) game.fx.popup('あと' + (TOTAL - passed) + '!', W * 0.5, H * 0.3, { color: C.gold, size: 36 });
      if (passed >= TOTAL) { ok = true; finished = true; finish(); return; }
      active = pickActive(dronePos); beatT = 0;
    } else {
      resolved = true;
      ok = false; finished = true;
      hitStop = 0.35; shake = 0.3;
      game.feedback.bad(l >= 0 ? BEACON_X[l] : W * 0.5, BEACON_Y, { text: 'MISS' });
      game.audio.play('se_bad', 0.4);
      finish();
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) {
      var l = beaconAt(x, y);
      if (l >= 0) resolveTap(l);
      else game.audio.play('se_tap', 0.04);
    }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  var demo = { t: 0, gx: BEACON_X[0], gy: BEACON_Y, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % BEAT;
    if (cyc < dt || demo.t <= dt) { active = pickActive(dronePos); }
    beatT = cyc;
    var p = cyc / BEAT;
    demo.gx += (BEACON_X[active] - demo.gx) * Math.min(1, dt * 5);
    demo.gy += (BEACON_Y - demo.gy) * Math.min(1, dt * 5);
    if (p > OPEN_START + 0.1 && p < OPEN_END - 0.06 && resolved !== false) {
      resolved = false;
      demo.press = true;
      dronePos = active;
      droneX += (BEACON_X[dronePos] - droneX) * 0.6;
      game.feedback.good(BEACON_X[active], BEACON_Y, { text: 'NICE', color: C.good });
      game.audio.play('se_good', 0.2);
    }
    if (p >= 0.9) { resolved = true; demo.press = false; }
    droneX += (BEACON_X[dronePos] - droneX) * Math.min(1, dt * 6);
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (active === undefined) initGame();
      bg();
      stepDemo(dt);
      drawBeacons(beatT / BEAT);
      drawDrone();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 40, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.94, 38, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.94, 28, C.white);
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawBeacons(0);
      drawDrone();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 48, ok ? C.good : C.bad);
      txt(passed + ' / ' + TOTAL, W / 2, H * 0.13, 32, C.gold);
      if (!ok) txt('あと' + (TOTAL - passed) + '拍!', W / 2, H * 0.18, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(passed, { beats: passed, total: TOTAL });
        else game.end.failure({ beats: passed, total: TOTAL });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) { game.audio.play('se_tap'); beatT = 0; resolved = false; }
    } else if (!finished) {
      beatT += dt;
      if (beatT >= BEAT && !resolved) {
        resolved = true;
        ok = false; finished = true;
        hitStop = 0.35; shake = 0.3;
        game.feedback.bad(BEACON_X[active], BEACON_Y, { text: 'MISS' });
        game.audio.play('se_bad', 0.4);
        finish();
      }
    }
    if (shake > 0) shake -= dt;
    droneX += (BEACON_X[dronePos] - droneX) * Math.min(1, dt * 8);

    bg();
    drawBeacons(ready > 0 ? -1 : beatT / BEAT);
    drawDrone();

    txt(passed + ' / ' + TOTAL, W / 2, H * 0.06, 32, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * (passed / TOTAL), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['C4', 0.2], ['E4', 0.2], ['G4', 0.2], ['C5', 0.4]], { tempo: 150, wave: 'square', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
