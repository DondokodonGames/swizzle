// D-20172021-0082-gearshaft-gap-drop.js
// ギアシャフト・ギャップドロップ — 昇降シャフトを落下する保守ロボットが、回転する歯車ハッチの隙間をタップで抜ける
// 操作: 迫る歯車ハッチのマーカー位置に隙間が来ている瞬間だけタップして落下を続ける
// 終わり: 規定回数(5基)のハッチを抜ければ成功。歯にふさがれた瞬間にタップするか時間切れで失敗
// @mechanic: gap_fit
// @theme: gearshaft_gap_drop
// 世界観: 地下プラントの昇降シャフトを落下する保守ロボットが、次々現れる回転式歯車ハッチの隙間にタイミングを合わせてタップで抜け、底の端末を目指す
// 残るもの: 正誤(CLEAR/GAME OVER) + 抜けたハッチ数
// スタイル: HD POST 3D

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // HD POST 3D: 低彩度・褐色寄り、ブルーム(半透明円の重ね)とビネット
  var C = {
    bg: '#241c18', bg2: '#100c0a', shaft: '#3a2e26', shaftEdge: '#5a4636',
    tooth: '#a68a5c', toothWarn: '#e0b04a', gap: '#0c0a08',
    bot: '#e0c68a', botDark: '#a68a5c',
    good: '#7ce07a', bad: '#ff5a4a', gold: '#e0b04a', white: '#f2e6d0', ink: '#0c0806',
  };

  var GAME_TITLE = 'GEAR DROP';
  var TOTAL = 5;
  var N_BLADES = 4;
  var PERIOD = 360 / N_BLADES;
  var BLADE_DEG = 58;
  var MARKER_ANGLE = 270;
  var CX = W * 0.5, CY = H * 0.42, RING_R = 150;
  var BOT_Y = H * 0.66;
  var TIME_LIMIT = 20;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var BOTSPR = ['.###.', '#####', '.#.#.'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    game.draw.rect(0, 0, W * 0.10, H, C.shaftEdge, 0.5);
    game.draw.rect(W * 0.90, 0, W * 0.10, H, C.shaftEdge, 0.5);
    var bloom = 0.05 + 0.04 * Math.sin(game.time.elapsed * 1.5);
    game.draw.circle(CX, CY, RING_R + 60, C.gold, bloom);
  }

  function rotationDeg() { return (spin * speed) % 360; }

  function isOpen(absAngle) {
    var rel = ((absAngle - rotationDeg()) % PERIOD + PERIOD) % PERIOD;
    return rel >= BLADE_DEG;
  }

  function drawRing(passHighlight) {
    var steps = 40;
    for (var i = 0; i < steps; i++) {
      var a = (i / steps) * 360;
      if (isOpen(a)) continue;
      var rad = a * Math.PI / 180;
      var px = CX + Math.cos(rad) * RING_R, py = CY + Math.sin(rad) * RING_R;
      game.draw.circle(px, py, 12, C.tooth);
    }
    var mrad = MARKER_ANGLE * Math.PI / 180;
    var mx = CX + Math.cos(mrad) * RING_R, my = CY + Math.sin(mrad) * RING_R;
    var open = isOpen(MARKER_ANGLE);
    var col = open ? C.good : (passHighlight ? C.bad : C.toothWarn);
    var pulse = 0.5 + 0.5 * Math.sin(game.time.elapsed * (open ? 10 : 6));
    game.draw.circle(mx, my, 20, col, 0.5 + 0.4 * pulse);
    game.draw.circle(CX, CY, RING_R, C.shaft, 0.06);
  }

  function drawBot() {
    var bob = Math.sin(game.time.elapsed * 6) * 4;
    game.draw.circle(CX, BOT_Y + bob, 34, C.botDark, 0.5);
    game.draw.sprite(BOTSPR, { '#': C.bot }, CX, BOT_Y + bob - 4, 14, { anchor: 'center' });
  }

  var passed, spin, speed, halfShown, failFlash;
  var timeLeft, done, endWait, finished, ready, hitStop, shake;

  function initGame() {
    passed = 0; halfShown = false; failFlash = 0;
    spin = 0; speed = 74;
    timeLeft = TIME_LIMIT;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function attempt() {
    if (done || ready > 0 || finished) return;
    var mrad = MARKER_ANGLE * Math.PI / 180;
    var mx = CX + Math.cos(mrad) * RING_R, my = CY + Math.sin(mrad) * RING_R;
    if (isOpen(MARKER_ANGLE)) {
      passed++;
      hitStop = 0.1;
      game.feedback.good(mx, my, { text: 'GOOD', color: C.good });
      game.fx.burst(mx, my, { color: C.gold, count: 16, speed: 300 });
      game.audio.play('se_good', 0.35);
      if (!halfShown && passed >= Math.ceil(TOTAL / 2)) { halfShown = true; game.fx.popup('HALFWAY!', CX, H * 0.20, { color: C.gold, size: 34 }); game.audio.play('se_milestone', 0.4); }
      if (passed >= TOTAL) { ok = true; finished = true; hitStop = 0.2; finish(); return; }
      spin = 0; speed += 10;
      timeLeft = Math.min(TIME_LIMIT, timeLeft + 3);
    } else {
      failFlash = 0.4; hitStop = 0.35; shake = 0.3;
      game.feedback.bad(mx, my, { text: 'MISS' });
      game.audio.play('se_bad', 0.4);
      ok = false; finished = true; finish();
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) attempt();
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  var demo = { t: 0, gx: CX, gy: BOT_Y, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 2.4;
    if (cyc < dt || demo.t <= dt) { spin = 0; speed = 74; demo.fired = false; }
    spin += dt;
    demo.gx = CX; demo.gy = BOT_Y;
    if (isOpen(MARKER_ANGLE) && !demo.fired) {
      demo.fired = true; demo.press = true;
      var mrad = MARKER_ANGLE * Math.PI / 180;
      var mx = CX + Math.cos(mrad) * RING_R, my = CY + Math.sin(mrad) * RING_R;
      game.feedback.good(mx, my, { text: 'GOOD', color: C.good });
      game.audio.play('se_good', 0.2);
    } else if (cyc > 0.3) { demo.press = false; demo.fired = cyc < 0.6 ? demo.fired : false; }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (spin === undefined) initGame();
      bg();
      stepDemo(dt);
      drawRing(false);
      drawBot();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.06, 36, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.095, 20, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.94, 34, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.94, 24, C.white);
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawRing(false);
      drawBot();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.06, 40, ok ? C.good : C.bad);
      txt(passed + ' / ' + TOTAL, W / 2, H * 0.10, 26, C.gold);
      if (!ok) txt('あと' + (TOTAL - passed) + '基!', W / 2, H * 0.14, 22, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 24, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(passed, { gates: passed, total: TOTAL });
        else game.end.failure({ gates: passed, total: TOTAL });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) { game.audio.play('se_tap'); spin = 0; }
    } else if (!finished) {
      spin += dt;
      timeLeft -= dt;
      if (timeLeft <= 0) {
        timeLeft = 0; failFlash = 0.4; hitStop = 0.3; shake = 0.25;
        game.feedback.bad(CX, CY, { text: 'TIME UP' });
        game.audio.play('se_bad', 0.4);
        ok = false; finished = true; finish();
      }
    }
    if (shake > 0) shake -= dt;
    if (failFlash > 0) failFlash -= dt;

    bg();
    drawRing(failFlash > 0);
    drawBot();

    txt(passed + ' / ' + TOTAL, W / 2, H * 0.06, 26, C.white);
    var lowTime = timeLeft < 4 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(60, H * 0.90, W - 120, 16, C.shaft, 1);
    game.draw.rect(60, H * 0.90, (W - 120) * Math.max(0, timeLeft / TIME_LIMIT), 16, lowTime ? C.bad : C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.78, 48, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['A3', 0.3], ['C4', 0.3], ['E4', 0.3], ['A4', 0.6]], { tempo: 100, wave: 'sawtooth', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
