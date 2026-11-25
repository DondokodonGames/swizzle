// J-N644-0003-fuse-relay-nerve.js
// フューズリレーナーブ — 焼けた火だねが冷めるまで我慢し、安全になった瞬間だけタップして送り出す
// 操作: 中央の火だねが赤(熱い)の間は触らない。緑(安全)に変わった瞬間にタップして送り出す
// 終わり: 規定回数(4回)を安全なタイミングで送り出せば成功。熱い間に触れる/冷める前に導火線が尽きれば失敗
// @mechanic: cooldown_tap
// @theme: relay_fuse_nerve
// 世界観: 灯り職人見習いが、渡された火だねを素手で持ち続けられない熱さの間はじっと我慢し、冷めた一瞬だけ次の器へ送り出す
// 残るもの: 正誤(CLEAR/GAME OVER) + 送り出せた回数
// スタイル: 80s NEON

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 80s NEON: 濃紺グラデ + 疑似グロー、点滅が命
  var C = {
    bg: '#120a28', bg2: '#1d0f3d', hot: '#ff3d6e', warm: '#ff9f3d', safe: '#3dffb0',
    ring: '#5a3dff', glow: '#ffffff', gold: '#ffe94d', ink: '#0a0416', white: '#f2f0ff',
  };

  var GAME_TITLE = 'FUSE RELAY';
  var TIME_LIMIT = 13;
  var NEEDED = 4;
  var CX = W * 0.5, CY = H * 0.44;
  var FUSE_START = 1.8, FUSE_STEP = 0.15, FUSE_MIN = 0.9;
  var DANGER_LEAD = 0.6;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var HAND_SPRITE = ['.##.', '####', '.##.'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    var pulse = 0.06 + 0.06 * Math.sin(game.time.elapsed * 1.4);
    game.draw.rect(0, 0, W, H, C.ring, pulse * 0.3);
    var sweepY = (game.time.elapsed * 260) % (H + 200) - 100;
    game.draw.rect(0, sweepY, W, 80, C.glow, 0.14);
  }

  var passes, fuseMax, fuseT, coolEnd, done, endWait, finished, ready, hitStop, shake, halfCalled;

  function newPass() {
    fuseMax = Math.max(FUSE_MIN, FUSE_START - passes * FUSE_STEP);
    coolEnd = fuseMax * 0.5;
    fuseT = 0;
  }

  function initGame() {
    passes = 0; newPass();
    done = false; endWait = 0; finished = false; halfCalled = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function isSafe() { return fuseT >= coolEnd; }

  function attemptTap(x, y) {
    if (finished) return;
    if (isSafe()) {
      passes++;
      game.feedback.good(x, y, { text: 'GOOD', color: C.safe });
      game.fx.burst(x, y, { color: C.safe, count: 16, speed: 320 });
      game.audio.play('se_good', 0.4);
      if (passes === Math.ceil(NEEDED / 2) && !halfCalled) {
        halfCalled = true;
        game.fx.popup('NICE', x, y - 130, { color: C.gold, size: 32 });
        game.audio.play('se_milestone', 0.3);
      }
      if (passes >= NEEDED) {
        ok = true; finished = true; hitStop = 0.2;
        game.audio.play('se_success', 0.5);
        finish();
      } else {
        newPass();
      }
    } else {
      ok = false; finished = true; hitStop = 0.3; shake = 0.3;
      game.feedback.bad(x, y, { text: 'MISS' });
      game.audio.play('se_bad', 0.45);
      finish();
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING && ready <= 0) attemptTap(x, y);
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  function stepPlay(dt) {
    fuseT += dt;
    if (fuseT >= fuseMax) {
      ok = false; finished = true; hitStop = 0.3; shake = 0.3;
      game.feedback.bad(CX, CY, { text: 'MISS' });
      game.audio.play('se_bad', 0.45);
      finish();
    }
  }

  function drawOrb() {
    var danger = !isSafe() && (coolEnd - fuseT) < DANGER_LEAD;
    var flashBoost = danger && Math.floor(game.time.elapsed * 10) % 2 === 0 ? 1.15 : 1;
    var col = isSafe() ? C.safe : (danger ? C.hot : C.warm);
    var overheat = !isSafe() && (fuseMax - fuseT) < DANGER_LEAD && Math.floor(game.time.elapsed * 12) % 2 === 0;
    if (overheat) col = C.hot;
    game.draw.circle(CX, CY, 150 * flashBoost, col, 0.25);
    game.draw.circle(CX, CY, 110, col);
    game.draw.circle(CX, CY, 60, C.glow, 0.3);
    game.draw.sprite(HAND_SPRITE, { '#': C.white }, CX, CY + 220, 18, { anchor: 'center' });
    var pct = Math.min(1, fuseT / fuseMax);
    game.draw.rect(CX - 140, CY + 150, 280, 14, C.ink, 0.4);
    game.draw.rect(CX - 140, CY + 150, 280 * (1 - pct), 14, isSafe() ? C.safe : C.warm);
  }

  var demo = { t: 0, gx: CX, gy: CY, press: false };
  function resetDemo() { initGame(); }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.2;
    if (cyc < dt || demo.t <= dt) resetDemo();
    if (cyc < 1.0) { fuseT = cyc; demo.gx = CX; demo.gy = CY + 220; demo.press = false; }
    else if (cyc < 1.9) { fuseT = coolEnd + (cyc - 1.0); demo.gx = CX; demo.gy = CY; demo.press = cyc > 1.8; }
    else if (cyc < 2.05) {
      demo.press = true;
      if (fuseT < fuseMax) {
        passes++;
        game.feedback.good(CX, CY, { text: 'GOOD', color: C.safe });
        game.audio.play('se_good', 0.2);
        newPass();
      }
    } else { fuseT = 0; demo.press = false; }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (passes === undefined) initGame();
      bg();
      stepDemo(dt);
      drawOrb();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.09, 40, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.13, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 38, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 26, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawOrb();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.09, 46, ok ? C.safe : C.hot);
      txt(passes + ' / ' + NEEDED, W / 2, H * 0.14, 28, C.gold);
      if (!ok) txt('あと' + Math.max(1, NEEDED - passes) + '回!', W / 2, H * 0.18, 22, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 24, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(passes, { passes: passes, needed: NEEDED });
        else game.end.failure({ passes: passes, needed: NEEDED });
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

    bg();
    drawOrb();

    txt(passes + ' / ' + NEEDED, W / 2, H * 0.06, 30, C.white);
    var tbW = W - 120;
    game.draw.rect(60, 150, tbW, 16, C.ink, 0.4);
    game.draw.rect(60, 150, tbW * Math.max(0, passes / NEEDED), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.66, 54, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['D4', 0.2], ['D4', 0.2], ['F4', 0.2], ['A4', 0.4]], { tempo: 160, wave: 'square', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
