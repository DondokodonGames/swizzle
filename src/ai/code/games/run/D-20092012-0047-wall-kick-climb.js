// D-20092012-0047-wall-kick-climb.js
// ウォールキックアセント — 狭い縦坑の左右の壁を交互に蹴って上昇し続けるロボット
// 操作: 画面の左半分/右半分をタップして今いる側の壁を蹴る。次に蹴るべき側は自機の位置で示す
// 終わり: 規定段数を登り切れば成功。違う側を蹴る/棘のある側へ着地すれば失敗
// @mechanic: alternate_tap
// @theme: shaft_wall_kick_climb
// 世界観: 資材搬送用の縦坑を昇るメンテナンスロボット。左右の壁を交互に蹴って昇り続け、壁から突き出す棘バーを避けて頂上のハッチを目指す
// 残るもの: 正誤(CLEAR/GAME OVER) + 到達段数
// スタイル: 8bit HANDHELD

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 8bit HANDHELD: 黄緑寄り4階調のみ、残像と低コントラスト、画面枠
  var C = {
    lv0: '#0f380f', lv1: '#306230', lv2: '#8bac0f', lv3: '#9bbc0f',
    bad: '#0f380f', frame: '#0f380f',
  };

  var GAME_TITLE = 'SHAFT CLIMB';
  var TOTAL = 8;
  var WINDOW = 1.55;
  var MAX_TIME = 13;
  var NEEDED = TOTAL;
  var LX = W * 0.22, RX = W * 0.78, MIDY = H * 0.46;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var rung, side, hazard, windowT, done, endWait, finished;
  var ready, hitStop, shake;
  var botX, botTX, botHop;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.lv0, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var BOT_A = ['.##.', '####', '.##.', '#..#'];
  var BOT_B = ['.##.', '####', '.##.', '.##.'];
  var SPIKE = ['#.#', '###', '.#.'];

  function bg(elapsed) {
    game.draw.gradient(0, H, [[0, C.lv1], [1, C.lv0]]);
    for (var i = 0; i < 10; i++) game.draw.rect(0, i * (H / 10), W, 2, C.lv2, 0.06);
    // シャフトの左右壁
    game.draw.rect(0, 0, W * 0.30, H, C.lv1, 0.9);
    game.draw.rect(W * 0.70, 0, W * 0.30, H, C.lv1, 0.9);
    // 画面全体のアンビエント明滅(attract_motionのセーフティネット)
    game.draw.rect(0, 0, W, H, '#ffffff', 0.03 + 0.03 * Math.sin(elapsed * 1.3));
  }

  function targetOf(s) { return s === 'L' ? 'R' : 'L'; }

  function initGame() {
    rung = 0; side = 'L'; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
    botX = LX; botTX = LX; botHop = 0;
    genRung();
  }

  function genRung() {
    hazard = rung >= 2 && Math.random() < 0.42;
    windowT = WINDOW;
  }

  function resolveTap(x) {
    if (state !== S.PLAYING || hitStop > 0 || ready > 0 || finished) return;
    var tapped = x < W / 2 ? 'L' : 'R';
    var correct = hazard ? side : targetOf(side);
    if (tapped === correct) {
      if (!hazard) side = targetOf(side);
      rung++;
      botTX = side === 'L' ? LX : RX;
      botHop = 1;
      game.feedback.good(botTX, MIDY, { text: null, color: C.lv3 });
      game.audio.play('se_jump', 0.4);
      game.fx.burst(botTX, MIDY, { color: C.lv3, count: 10, speed: 260 });
      if (rung === Math.ceil(TOTAL / 2)) game.fx.popup('HALFWAY!', W / 2, MIDY - 160, { color: C.lv3, size: 40 });
      if (rung >= TOTAL) { ok = true; finished = true; finish(); return; }
      genRung();
    } else {
      ok = false; finished = true; hitStop = 0.32; shake = 0.28;
      game.feedback.bad(botTX, MIDY, { text: 'MISS' });
      game.audio.play('se_bad', 0.4);
      finish();
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    game.audio.play('se_tap', 0.06);
    resolveTap(x);
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function drawScene(elapsed, ix, iy, hazardSide, pulseBob) {
    // 危険予告: 棘バー(常時表示、点滅で強調)
    if (hazardSide) {
      var hx = hazardSide === 'L' ? LX : RX;
      var blink = Math.floor(elapsed * 6) % 2 === 0;
      if (blink) {
        game.draw.sprite(SPIKE, { '#': '#e03030' }, hx, MIDY, 20, { anchor: 'center' });
        game.draw.line(hx, MIDY - 70, hx, MIDY + 70, '#e03030', 5);
      } else {
        game.draw.sprite(SPIKE, { '#': '#902020' }, hx, MIDY, 20, { anchor: 'center' });
      }
    }
    var by = MIDY + Math.sin(elapsed * 2.2) * 6 * pulseBob - Math.sin(Math.min(1, botHop) * Math.PI) * 40;
    game.draw.sprite(botHop > 0.4 ? BOT_A : BOT_B, { '#': C.lv3 }, ix, by, 22, { anchor: 'center' });
  }

  var demo = { t: 0, gx: LX, gy: H * 0.9, press: false, dSide: 'L', dRung: 0, dHazard: false, dX: LX };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.4;
    if (cyc < dt || demo.t <= dt) {
      demo.dSide = 'L'; demo.dRung = 0; demo.dX = LX; demo.dHazard = false;
      rung = 0; side = 'L'; botTX = LX; botHop = 1;
    }
    var beatLen = 3.4 / 6;
    var beat = Math.floor(cyc / beatLen);
    var beatT = (cyc % beatLen) / beatLen;
    if (beat !== demo._lastBeat) {
      demo._lastBeat = beat;
      demo.dHazard = beat === 2; // 3拍目に危険予告
      var correctSide = demo.dHazard ? demo.dSide : targetOf(demo.dSide);
      demo.gx = correctSide === 'L' ? W * 0.28 : W * 0.72;
      demo.press = false;
    }
    demo.press = beatT > 0.55 && beatT < 0.85;
    if (demo.press && !demo._firedThisBeat) {
      demo._firedThisBeat = true;
      if (!demo.dHazard) demo.dSide = targetOf(demo.dSide);
      demo.dX = demo.dSide === 'L' ? LX : RX;
      botTX = demo.dX; botHop = 1;
      rung = Math.min(TOTAL, rung + 1);
    }
    if (beatT < 0.1) demo._firedThisBeat = false;
    hazard = demo.dHazard; side = demo.dSide;
  }

  game.onUpdate(function(dt) {
    var el = game.time.elapsed;
    botX += (botTX - botX) * Math.min(1, dt * 10);
    if (botHop > 0) botHop = Math.max(0, botHop - dt * 3.2);

    if (state === S.ATTRACT) {
      if (rung === undefined) initGame();
      bg(el);
      stepDemo(dt);
      drawScene(el, botX, 0, hazard ? targetOf(side) : null, 1);
      game.draw.hand(demo.gx, H * 0.9 + Math.sin(el * 1.7) * 8, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 46, C.lv3);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 22, C.lv2);
      if (Math.floor(el * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.lv3);
      else txt('INSERT COIN', W / 2, H * 0.94, 26, C.lv2);
      return;
    }

    if (state === S.RESULT) {
      bg(el);
      drawScene(el, botX, 0, null, 1);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 48, C.lv3);
      txt(rung + ' / ' + TOTAL, W / 2, H * 0.13, 30, C.lv2);
      if (!ok) txt('あと' + (TOTAL - rung) + '段!', W / 2, H * 0.18, 24, C.lv2);
      if (Math.floor(el * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 24, C.lv2);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(rung, { rung: rung, total: TOTAL });
        else game.end.failure({ rung: rung, total: TOTAL });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      windowT -= dt;
      if (windowT <= 0) {
        ok = false; finished = true; hitStop = 0.32; shake = 0.28;
        game.feedback.bad(botX, MIDY, { text: 'MISS' });
        game.audio.play('se_bad', 0.4);
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg(el);
    drawScene(el, botX, 0, hazard ? targetOf(side) : null, 1);

    txt(rung + ' / ' + TOTAL, W / 2, H * 0.06, 30, C.lv3);
    game.draw.rect(60, 150, W - 120, 14, C.lv0, 0.6);
    game.draw.rect(60, 150, (W - 120) * (rung / TOTAL), 14, C.lv3);
    game.draw.rect(60, 176, W - 120, 10, C.lv0, 0.5);
    game.draw.rect(60, 176, (W - 120) * Math.max(0, windowT / WINDOW), 10, C.lv2);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.55, 56, C.lv3);
  });

  game.onStart(function() {
    game.audio.melody([['C4', 0.25], ['E4', 0.25], ['G4', 0.25], ['C5', 0.5]], { tempo: 150, wave: 'square', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
