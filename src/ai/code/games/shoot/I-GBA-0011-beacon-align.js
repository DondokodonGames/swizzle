// I-GBA-0011-beacon-align.js
// ビーコンアライン — 灯台の主レンズと副レンズ、別々に回る2条の光が重なった瞬間にタップして点火する
// 操作: 主レンズの光と、逆回転する副レンズの光が完全に重なった瞬間にタップする
// 終わり: 規定回数(3回)続けて正しく重ねられれば成功。ずれたタイミングで押せば失敗
// @mechanic: trajectory
// @theme: lighthouse_twin_beam
// 世界観: 岬の灯台。主レンズと副レンズが別々の速さで回り続ける中、番人が2条の光が重なる刹那を狙って点火する
// 残るもの: 正誤(CLEAR/GAME OVER) + 点火に成功した回数
// スタイル: MODE7 PSEUDO

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // MODE7 PSEUDO: 横1pxストリップを奥ほど圧縮。地平線から上は空グラデ
  var C = {
    sky1: '#0a1428', sky2: '#1c3a5e', horizon: '#2c5a8a', sea: '#0e2038',
    beamA: '#ffd400', beamB: '#4dc8ff', tower: '#e8e0d0', towerDark: '#a89c88',
    good: '#4dff8a', bad: '#ff4d5e', gold: '#ffd400', white: '#ffffff', ink: '#040a14',
  };

  var GAME_TITLE = 'BEACON ALIGN';
  var TOTAL = 3;
  var CX = W * 0.5, CY = H * 0.42, HORIZON = H * 0.5;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var lit, done, endWait, finished, ready, hitStop, shake;
  var angA, angB, spdA, spdB, round;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var TOWER = ['..##..', '.####.', '.####.', '######', '######'];

  function bg() {
    game.draw.gradient(0, HORIZON, [[0, C.sky1], [1, C.sky2]]);
    game.draw.rect(0, HORIZON, W, H - HORIZON, C.sea);
    var strips = 16;
    for (var i = 0; i < strips; i++) {
      var y = HORIZON + i * (H - HORIZON) / strips;
      var comp = i / strips;
      var w = W * (0.3 + comp * 0.9);
      game.draw.rect(CX - w / 2, y, w, (H - HORIZON) / strips + 1, i % 2 === 0 ? '#ffffff08' : '#00000010');
    }
  }

  function drawTower() {
    game.draw.sprite(TOWER, { '#': C.tower }, CX, HORIZON - 60, 26, { anchor: 'center' });
  }

  function angDiff(a, b) {
    var d = Math.abs(((a - b) % (2 * Math.PI) + 3 * Math.PI) % (2 * Math.PI) - Math.PI);
    return Math.PI - d;
  }

  function drawBeams() {
    var lenA = 420, lenB = 340;
    game.draw.line(CX, CY, CX + Math.cos(angA) * lenA, CY + Math.sin(angA) * lenA * 0.35, C.beamA, 10);
    game.draw.line(CX, CY, CX - Math.cos(angA) * lenA, CY - Math.sin(angA) * lenA * 0.35, C.beamA, 10);
    game.draw.line(CX, CY, CX + Math.cos(angB) * lenB, CY + Math.sin(angB) * lenB * 0.35, C.beamB, 6);
    game.draw.line(CX, CY, CX - Math.cos(angB) * lenB, CY - Math.sin(angB) * lenB * 0.35, C.beamB, 6);
    var diff = angDiff(angA, angB);
    if (diff < 0.5) {
      var blink = Math.floor(game.time.elapsed * 14) % 2 === 0;
      if (blink) game.draw.circle(CX, CY, 60, C.gold, 0.4);
    }
    game.draw.circle(CX, CY, 22, C.white);
  }

  function newRound() {
    spdA = 1.3 + round * 0.15; spdB = -1.9 - round * 0.15;
  }

  function initGame() {
    lit = 0; done = false; endWait = 0; finished = false; ready = 0.8; hitStop = 0; shake = 0;
    round = 0; angA = 0; angB = Math.PI * 0.6;
    newRound();
  }

  function attemptFire() {
    if (finished || ready > 0 || done) return;
    game.audio.play('se_tap', 0.06);
    var diff = angDiff(angA, angB);
    var success = diff < 0.28;
    hitStop = success ? 0.12 : 0.3;
    if (success) {
      lit++;
      game.feedback.good(CX, CY, { text: 'LIGHT', color: C.good });
      game.fx.burst(CX, CY, { color: C.gold, count: 20, speed: 400 });
      game.audio.play('se_success', 0.4);
      if (lit === Math.ceil(TOTAL / 2)) { game.fx.popup(lit + ' / ' + TOTAL, CX, H * 0.2, { color: C.gold, size: 36 }); game.audio.play('se_milestone', 0.3); }
      if (lit >= TOTAL) { ok = true; finished = true; finish(); return; }
      round++; newRound(); angA = 0; angB = Math.PI * (0.5 + round * 0.2);
    } else {
      game.feedback.bad(CX, CY, { text: 'MISS' });
      shake = 0.25;
      game.audio.play('se_bad', 0.4);
      ok = false; finished = true; finish();
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) attemptFire();
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  var demo = { t: 0, gx: CX, gy: H * 0.86, press: false, angA: 0, angB: Math.PI * 0.6, picked: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.2;
    if (cyc < dt || demo.t <= dt) { demo.angA = 0; demo.angB = Math.PI * 0.65; demo.picked = false; }
    demo.angA += 1.3 * dt; demo.angB += -1.9 * dt;
    var diff = angDiff(demo.angA, demo.angB);
    if (diff < 0.2 && !demo.picked) {
      demo.picked = true; demo.press = true;
      game.feedback.good(CX, CY, { text: 'LIGHT', color: C.good });
      game.audio.play('se_good', 0.25);
    }
    if (demo.picked && cyc > 2.9) demo.press = false;
    angA = demo.angA; angB = demo.angB;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      bg();
      stepDemo(dt);
      drawTower();
      drawBeams();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 42, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.92, 38, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.92, 26, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawTower();
      drawBeams();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 48, ok ? C.good : C.bad);
      txt(lit + ' / ' + TOTAL, W / 2, H * 0.13, 30, C.gold);
      if (!ok) txt('あと' + (TOTAL - lit) + '回!', W / 2, H * 0.18, 24, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.92, 24, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(lit, { lit: lit, total: TOTAL });
        else game.end.failure({ lit: lit, total: TOTAL });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      angA += spdA * dt; angB += spdB * dt;
    }
    if (shake > 0) shake -= dt;

    bg();
    drawTower();
    if (!finished) drawBeams();

    txt(lit + ' / ' + TOTAL, W / 2, H * 0.06, 30, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.3);
    game.draw.rect(60, 150, (W - 120) * (lit / TOTAL), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.68, 54, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['E3', 0.5], ['B3', 0.5], ['E4', 0.8]], { tempo: 90, wave: 'sine', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
