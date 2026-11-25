// J-N644-0002-breath-pearl-dive.js
// ブレスパールダイブ — 息が続く限り潜って真珠を集め、限界が来る前に自分の意思で浮上する
// 操作: 押し続けると潜って真珠を集める(酸素が減っていく)。規定数を集めたら指を離して浮上する
// 終わり: 離した時点で規定数以上の真珠を集めていれば成功。酸素切れまで潜り続けると失敗
// @mechanic: hold_charge
// @theme: freedive_pearl_breath
// 世界観: 素潜り漁師が、限られた酸素だけを頼りに海底の真珠を集められるだけ集め、限界の直前で自ら判断して浮上する
// 残るもの: 正誤(CLEAR/GAME OVER) + 集めた真珠数
// スタイル: 90s HANDHELD COLOR

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s HANDHELD COLOR: 低彩度・少色、小画面前提の太い形
  var C = {
    bg: '#3a6ea5', bg2: '#1f4068', surface: '#7ec8e3',
    diver: '#f4d58d', diverDark: '#c99b3f', pearl: '#fef6e4', pearlShade: '#e8c766',
    good: '#8fd694', bad: '#e06c6c', gold: '#fef6e4', ink: '#0d1b2a', white: '#ffffff',
  };

  var GAME_TITLE = 'PEARL BREATH';
  var MAX_BREATH = 9.0;
  var TIME_LIMIT = MAX_BREATH;
  var PEARL_INTERVAL = 0.85;
  var NEEDED = 6;
  var DANGER_LEAD = 0.8;
  var CX = W * 0.5, SURF_Y = H * 0.30, DEEP_Y = H * 0.82;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var DIVER_SPRITE = ['.##.', '####', '.##.', '##.#'];
  var PEARL_SPRITE = ['.#.', '###', '.#.'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.surface], [0.18, C.bg], [1, C.bg2]]);
    for (var i = 0; i < 4; i++) {
      var by = (game.time.elapsed * 40 + i * 260) % (H + 200) - 100;
      game.draw.circle(W * (0.2 + 0.2 * i), by, 10, C.surface, 0.3);
    }
  }

  var pearls, charging, chargeT, danger, done, endWait, finished, ready, hitStop, shake, halfCalled, popT;

  function initGame() {
    pearls = 0; charging = false; chargeT = 0; danger = false;
    done = false; endWait = 0; finished = false; halfCalled = false;
    ready = 0.8; hitStop = 0; shake = 0; popT = 0;
  }

  function diverY() { return SURF_Y + Math.min(1, chargeT / MAX_BREATH) * (DEEP_Y - SURF_Y); }

  function startDive() {
    if (done || ready > 0 || hitStop > 0 || finished) return;
    charging = true;
    game.audio.play('se_tap', 0.12);
  }

  function surfaceUp() {
    if (!charging || finished) return;
    charging = false;
    var y = diverY();
    if (pearls >= NEEDED) {
      ok = true; finished = true; hitStop = 0.2;
      game.feedback.good(CX, y, { text: 'CLEAR', color: C.good });
      game.fx.burst(CX, y, { color: C.gold, count: 22, speed: 380 });
      game.audio.play('se_success', 0.5);
    } else {
      ok = false; finished = true; hitStop = 0.25; shake = 0.2;
      game.feedback.bad(CX, y, { text: 'MISS' });
      game.audio.play('se_failure', 0.4);
    }
    finish();
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function(x, y) {
    if (state === S.PLAYING) { game.audio.play('se_tap', 0.1); startDive(); }
  });
  game.onRelease(function(x, y) {
    if (state === S.PLAYING) { game.audio.play('se_tap', 0.05); surfaceUp(); }
  });

  function stepPlay(dt) {
    if (!charging) return;
    var before = Math.floor(chargeT / PEARL_INTERVAL);
    chargeT += dt;
    var after = Math.floor(chargeT / PEARL_INTERVAL);
    if (after > before) {
      pearls++;
      popT = 0.2;
      var y = diverY();
      game.feedback.good(CX, y, { text: '+1', color: C.pearl });
      game.fx.burst(CX, y, { color: C.pearl, count: 10, speed: 260 });
      game.audio.play('se_coin', 0.35);
      if (pearls === Math.ceil(NEEDED / 2) && !halfCalled) {
        halfCalled = true;
        game.fx.popup('NICE', CX, y - 120, { color: C.gold, size: 32 });
        game.audio.play('se_milestone', 0.35);
      }
    }
    danger = chargeT >= MAX_BREATH - DANGER_LEAD;
    if (chargeT >= MAX_BREATH) {
      charging = false; ok = false; finished = true; hitStop = 0.3; shake = 0.3;
      game.feedback.bad(CX, diverY(), { text: 'MISS' });
      game.audio.play('se_bad', 0.45);
      finish();
    }
  }

  function drawScene() {
    var y = diverY();
    var wobble = Math.sin(game.time.elapsed * 4) * 6;
    game.draw.sprite(DIVER_SPRITE, { '#': danger ? C.bad : C.diver }, CX + wobble, y, 26, { anchor: 'center' });
    if (charging || popT > 0) {
      var s = 1 + (popT > 0 ? popT * 2 : 0);
      game.draw.sprite(PEARL_SPRITE, { '#': C.pearlShade }, CX + 70, y - 20, 14 * (popT > 0 ? s : 1), { anchor: 'center' });
    }
  }

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  var demo = { t: 0, gx: CX, gy: SURF_Y, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.6;
    if (cyc < dt || demo.t <= dt) { pearls = 0; charging = false; chargeT = 0; danger = false; }
    if (cyc < 0.3) { charging = false; demo.press = false; }
    else if (cyc < 2.4) {
      charging = true; demo.press = true;
      var before = Math.floor(chargeT / PEARL_INTERVAL);
      chargeT = cyc - 0.3;
      var after = Math.floor(chargeT / PEARL_INTERVAL);
      if (after > before && after <= NEEDED) {
        pearls = after;
        game.feedback.good(CX, diverY(), { text: '+1', color: C.pearl });
        game.audio.play('se_good', 0.2);
      }
      danger = chargeT >= MAX_BREATH - DANGER_LEAD;
    } else if (cyc < 2.6) {
      charging = false; demo.press = false;
      if (!done) {
        game.feedback.good(CX, diverY(), { text: 'CLEAR', color: C.good });
        game.audio.play('se_good', 0.25);
      }
    } else { charging = false; }
    demo.gx = CX; demo.gy = diverY();
  }

  game.onUpdate(function(dt) {
    if (popT > 0) popT -= dt;

    if (state === S.ATTRACT) {
      if (pearls === undefined) initGame();
      bg();
      stepDemo(dt);
      drawScene();
      game.draw.hand(demo.gx + 90, demo.gy + 60, { press: demo.press, scale: 14 });
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
      drawScene();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.09, 46, ok ? C.good : C.bad);
      txt(pearls + ' / ' + NEEDED, W / 2, H * 0.14, 28, C.gold);
      if (!ok) txt('あと' + Math.max(1, NEEDED - pearls) + '個!', W / 2, H * 0.18, 22, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 24, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(pearls, { pearls: pearls, needed: NEEDED });
        else game.end.failure({ pearls: pearls, needed: NEEDED });
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
    drawScene();

    txt(pearls + ' / ' + NEEDED, W / 2, H * 0.06, 30, C.white);
    var bw = W - 120;
    var pct = Math.min(1, chargeT / MAX_BREATH);
    game.draw.rect(60, 150, bw, 16, C.ink, 0.35);
    game.draw.rect(60, 150, bw * (1 - pct), 16, danger ? C.bad : C.surface);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 54, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['A3', 0.4], ['C4', 0.4], ['E4', 0.4], ['A4', 0.8]], { tempo: 100, wave: 'sine', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
