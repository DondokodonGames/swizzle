// J-N644-0022-rope-wheel-skip-drill.js
// ロープホイールスキップドリル — 振り子状に揺れる縄が足元の当たり窓に入った瞬間だけ跳ぶ
// 操作: 左右に振れる縄の振り子が中央の当たり窓に重なった瞬間にタップして跳ぶ
// 終わり: 規定回数(8回)跳び越え続ければ成功。窓を外す/間に合わなければ縄に引っかかり失敗
// @mechanic: timing_window
// @theme: courtyard_rope_wheel_skip
// 世界観: 中庭で自主練に励む見習いの跳び手が、振り子状に揺れる縄が足元の窓に重なる一瞬だけを狙って跳び続け、縄に引っかからず回数を重ねる
// 残るもの: 正誤(CLEAR/GAME OVER) + 跳び越えた回数
// スタイル: SKEUOMORPH

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // SKEUOMORPH: 木目・革・金属など質感を色の濃淡ストリップで表現、太めの立体的縁取り
  var C = {
    bg: '#c8a878', bg2: '#a07850', floor: '#8a6038', floorDark: '#5a3a20',
    rope: '#7a4020', ropeDark: '#4a2410', window: '#e8d0a0', windowGlow: '#fff4d0',
    good: '#3aa050', bad: '#c03020', gold: '#e0a020', white: '#fff8ec', ink: '#2a1608',
  };

  var GAME_TITLE = 'ROPE SKIP';
  var NEEDED = 8;
  var CX = W * 0.5, GROUND_Y = H * 0.62;
  var SWING_RANGE = W * 0.34;
  var WIN_START = 130, WIN_MIN = 62, WIN_STEP = 8;
  var PERIOD_START = 1.6, PERIOD_MIN = 0.95, PERIOD_STEP = 0.08;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var JUMPER_IDLE = ['.##.', '####', '.##.', '#..#'];
  var JUMPER_HOP = ['.#..', '.##.', '####', '.##.'];

  function bg() {
    var e = game.time.elapsed;
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    game.draw.rect(0, 0, W, H, '#ffffff', 0.02 + 0.02 * Math.sin(e * 1.3));
    game.draw.rect(0, GROUND_Y + 40, W, H - GROUND_Y - 40, C.floor);
    for (var i = 0; i < 8; i++) game.draw.rect(0, GROUND_Y + 40 + i * 26, W, 4, C.floorDark, 0.3);
  }

  var jumps, jumpT, period, winW, resolved, finished, done, endWait, hitStop, shake, ready, halfShown, hopFlash;

  function newBout() {
    jumpT = 0;
    period = Math.max(PERIOD_MIN, PERIOD_START - jumps * PERIOD_STEP);
    winW = Math.max(WIN_MIN, WIN_START - jumps * WIN_STEP);
    resolved = false;
  }

  function initGame() {
    jumps = 0; finished = false; done = false; endWait = 0; hitStop = 0; shake = 0; ready = 0.8; halfShown = false; hopFlash = 0;
    newBout();
  }

  function ropeX(t) { return CX + Math.sin((t / period) * Math.PI * 2) * SWING_RANGE; }

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function resolveHop() {
    if (resolved || finished || ready > 0) return;
    resolved = true;
    var rx = ropeX(jumpT);
    var diff = Math.abs(rx - CX);
    var correct = diff <= winW / 2;
    hitStop = correct ? 0.08 : 0.3;
    if (correct) {
      jumps++;
      hopFlash = 0.14;
      game.feedback.good(CX, GROUND_Y - 120, { text: diff < winW * 0.2 ? 'PERFECT' : 'GOOD', color: C.good });
      game.fx.burst(CX, GROUND_Y - 60, { color: C.gold, count: 14, speed: 320 });
      game.audio.play('se_jump', 0.4);
      if (!halfShown && jumps >= Math.ceil(NEEDED / 2)) {
        halfShown = true;
        game.fx.popup('HALFWAY!', CX, GROUND_Y - 300, { color: C.gold, size: 38 });
        game.audio.play('se_milestone', 0.35);
      }
      if (jumps >= NEEDED) { ok = true; finished = true; finish(); return; }
      newBout();
    } else {
      game.feedback.bad(CX, GROUND_Y - 60, { text: 'MISS' });
      shake = 0.3;
      game.audio.play('se_bad', 0.4);
      ok = false; finished = true; finish();
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) { game.audio.play('se_tap', 0.06); resolveHop(); }
  });

  function drawRopeAndWindow() {
    var lit = Math.abs(ropeX(jumpT) - CX) <= winW / 2;
    game.draw.circle(CX, GROUND_Y, winW / 2 + 14, C.windowGlow, lit ? 0.4 : 0.18);
    game.draw.circle(CX, GROUND_Y, winW / 2, C.window, 0.7);
    var rx = ropeX(jumpT);
    game.draw.line(CX - SWING_RANGE - 60, GROUND_Y + 40, rx, GROUND_Y, C.ropeDark, 10);
    game.draw.line(rx, GROUND_Y, CX + SWING_RANGE + 60, GROUND_Y + 40, C.ropeDark, 10);
    game.draw.circle(rx, GROUND_Y, 18, C.rope);
    game.draw.circle(CX - SWING_RANGE - 60, GROUND_Y + 40, 20, C.ropeDark);
    game.draw.circle(CX + SWING_RANGE + 60, GROUND_Y + 40, 20, C.ropeDark);
  }

  var demo = { t: 0, gx: CX, gy: GROUND_Y - 200, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.4;
    if (cyc < dt || demo.t <= dt) { jumps = 0; newBout(); halfShown = false; }
    jumpT += dt;
    var rx = ropeX(jumpT);
    if (Math.abs(rx - CX) <= winW / 2 && !resolved) {
      demo.press = true;
      resolveHop();
    } else {
      demo.press = false;
    }
    if (jumpT >= period) jumpT -= period;
  }

  game.onUpdate(function(dt) {
    if (hopFlash > 0) hopFlash -= dt;
    if (state === S.ATTRACT) {
      if (jumps === undefined) initGame();
      bg();
      stepDemo(dt);
      drawRopeAndWindow();
      var bob = hopFlash > 0 ? -30 : Math.sin(game.time.elapsed * 2) * 4;
      game.draw.sprite(hopFlash > 0 ? JUMPER_HOP : JUMPER_IDLE, { '#': C.ink }, CX, GROUND_Y - 100 + bob, 18, { anchor: 'center' });
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 40, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 38, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 26, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawRopeAndWindow();
      game.draw.sprite(JUMPER_IDLE, { '#': ok ? C.good : C.bad }, CX, GROUND_Y - 100, 18, { anchor: 'center' });
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 46, ok ? C.good : C.bad);
      txt(jumps + ' / ' + NEEDED, W / 2, H * 0.13, 28, C.gold);
      if (!ok) txt('あと' + (NEEDED - jumps) + '回!', W / 2, H * 0.18, 24, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(jumps, { jumps: jumps, needed: NEEDED });
        else game.end.failure({ jumps: jumps, needed: NEEDED });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      jumpT += dt;
      if (jumpT >= period && !resolved) resolveHop();
      if (jumpT >= period) jumpT -= period;
    }
    if (shake > 0) shake -= dt;

    bg();
    if (!finished) drawRopeAndWindow();
    var bob2 = hopFlash > 0 ? -30 : Math.sin(game.time.elapsed * 2) * 4;
    game.draw.sprite(hopFlash > 0 ? JUMPER_HOP : JUMPER_IDLE, { '#': C.ink }, CX, GROUND_Y - 100 + bob2, 18, { anchor: 'center' });

    txt(jumps + ' / ' + NEEDED, W / 2, H * 0.06, 30, C.ink);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, GROUND_Y - 280, 54, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['E4', 0.15], ['G4', 0.15], ['B4', 0.15], ['E5', 0.3]], { tempo: 168, wave: 'triangle', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
