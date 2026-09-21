// K-GBA-0021-archer-draw-flow.js
// 流鏑の弓引き — 音の高まりに合わせて弓を押し続けて溜め、緑の間合いで指を離して射る
// 操作: 弓を長押しして溜め、メーターが緑の間合いに入ったところで指を離す(早すぎ/溜めすぎは失敗)
// 終わり: 規定回数(4回)全て緑の間合いで離せれば成功。早離し/溜めすぎ(弦切れ)で失敗
// @mechanic: hold_charge
// @theme: archery_range_flow
// 世界観: 弓の稽古場。高まっていく音色に合わせて弓を引き絞り、音がちょうど満ちた一瞬で矢を放つ射手
// 残るもの: 正誤(CLEAR/GAME OVER) + 的に当てた回数
// スタイル: TOON SHADE

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // TOON SHADE: 太い輪郭を先に描き、内側は明暗2色だけで塗る
  var C = {
    sky1: '#bfe3ff', sky2: '#8fc4e8', ground: '#7abf6a', groundDark: '#5a9a4a',
    outline: '#1a2a1a', bow: '#7a4a28', string: '#f0ead0',
    meterBg: '#2a2a2a', meterGood: '#3ecf5a', meterWarn: '#ff4d4d', meterFill: '#ffd23d',
    good: '#3ecf5a', bad: '#ff4d4d', gold: '#ffd23d', white: '#ffffff', ink: '#12180f',
  };

  var GAME_TITLE = 'DRAW FLOW';
  var TOTAL = 4;
  var CX = W * 0.5, ARCHER_Y = H * 0.5;
  var CHARGE_MAX = 2.0;
  var BAND_LO = 0.55, BAND_HI = 0.78;
  var WARN_AT = 0.88;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var ARCHER_IDLE = ['..##..', '.####.', '..##..', '.####.', '#.##.#'];
  var ARCHER_DRAW = ['..##..', '.####.', '..##..', '####..', '#.##.#'];

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function bg() {
    game.draw.gradient(0, H, [[0, C.sky1], [0.65, C.sky2], [1, C.ground]]);
    game.draw.rect(0, H * 0.72, W, H * 0.28, C.ground);
    game.draw.rect(0, H * 0.72, W, 8, C.groundDark);
  }

  var passed, round, meter, holding, tonePhase, released, resolveKind;
  var done, endWait, finished;
  var ready, hitStop, shake, flashState;

  function newRound() { meter = 0; holding = false; tonePhase = -1; released = false; resolveKind = ''; }

  function initGame() {
    passed = 0; round = 0;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; flashState = 0;
    newRound();
  }

  function beginHold() {
    if (state !== S.PLAYING || finished || done || ready > 0 || hitStop > 0 || holding) return;
    holding = true;
    game.audio.play('se_tap', 0.1);
  }

  function endHold() {
    if (state !== S.PLAYING || finished || done || ready > 0 || hitStop > 0 || !holding) return;
    holding = false;
    var frac = meter / CHARGE_MAX;
    if (frac >= BAND_LO && frac <= BAND_HI) {
      passed++; hitStop = 0.1; flashState = 1; resolveKind = 'good';
      game.feedback.good(CX, ARCHER_Y, { text: 'HIT', color: C.good });
      game.fx.burst(CX, ARCHER_Y - 60, { color: C.gold, count: 18, speed: 320 });
      game.audio.play('se_good', 0.4);
      if (passed === Math.ceil(TOTAL / 2)) game.fx.popup(passed + ' / ' + TOTAL, CX, ARCHER_Y - 220, { color: C.gold, size: 40 });
      if (passed >= TOTAL) { ok = true; finished = true; finish(); return; }
      round++; newRound();
    } else {
      resolveKind = frac < BAND_LO ? 'early' : 'late';
      flashState = -1; hitStop = 0.35;
      game.feedback.bad(CX, ARCHER_Y, { text: frac < BAND_LO ? '早い!' : '溜めすぎ!' });
      shake = 0.3;
      game.audio.play('se_bad', 0.4);
      ok = false; finished = true; finish();
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    game.audio.play('se_tap', 0.03);
  });
  game.onPress(function(x, y) { if (state === S.PLAYING) game.audio.play('se_tap', 0.05); beginHold(); });
  game.onRelease(function(x, y) { if (state === S.PLAYING) game.audio.play('se_tap', 0.05); endHold(); });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  var NOTES = ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5', 'D5', 'E5'];
  function stepGame(dt) {
    if (finished) return;
    if (holding) {
      meter += dt;
      var frac = Math.min(1, meter / CHARGE_MAX);
      var step = Math.floor(frac * NOTES.length);
      if (step !== tonePhase && step < NOTES.length) {
        tonePhase = step;
        game.audio.tone(NOTES[step], 0.12, { wave: 'triangle', volume: 0.08 + frac * 0.05 });
      }
      if (frac >= BAND_LO && tonePhase < NOTES.length && frac < BAND_LO + 0.03) game.audio.play('se_milestone', 0.2);
      if (meter >= CHARGE_MAX) {
        holding = false;
        resolveKind = 'snap';
        flashState = -1; hitStop = 0.4;
        game.feedback.bad(CX, ARCHER_Y, { text: '弦切れ!' });
        shake = 0.35;
        game.audio.play('se_break', 0.4);
        ok = false; finished = true; finish();
      }
    }
  }

  function drawScene() {
    var frac = Math.min(1, meter / CHARGE_MAX);
    var spr = holding ? ARCHER_DRAW : ARCHER_IDLE;
    game.draw.sprite(spr, { '#': C.outline }, CX, ARCHER_Y, 30, { anchor: 'center' });
    var pull = frac * 70;
    game.draw.line(CX + 60, ARCHER_Y - 60, CX + 60 - pull, ARCHER_Y, C.string, 4);
    game.draw.line(CX + 60, ARCHER_Y + 60, CX + 60 - pull, ARCHER_Y, C.string, 4);
    game.draw.line(CX + 55, ARCHER_Y - 70, CX + 55, ARCHER_Y + 70, C.bow, 12);
    if (flashState !== 0) game.draw.circle(CX, ARCHER_Y, 160, flashState > 0 ? C.good : C.bad, 0.2);

    var barX = W * 0.5 - 260, barW = 520, barY = H * 0.62, barH = 40;
    game.draw.rect(barX, barY, barW, barH, C.meterBg);
    game.draw.rect(barX + barW * BAND_LO, barY, barW * (BAND_HI - BAND_LO), barH, C.meterGood, 0.5);
    game.draw.rect(barX + barW * WARN_AT, barY, barW * (1 - WARN_AT), barH, C.meterWarn, 0.4);
    game.draw.rect(barX, barY, barW * frac, barH, holding && frac >= WARN_AT ? C.meterWarn : C.meterFill);
  }

  var demo = { t: 0, gx: CX, gy: H * 0.86, press: false, dHoldT: 0, dPhase: 'idle' };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 2.4;
    if (cyc < dt || demo.t <= dt) { demo.dHoldT = 0; demo.dPhase = 'idle'; meter = 0; holding = false; flashState = 0; }
    if (demo.dPhase === 'idle') {
      demo.gx = CX; demo.gy = H * 0.86; demo.press = false;
      if (cyc > 0.2) { demo.dPhase = 'hold'; holding = true; demo.gx = CX; demo.gy = ARCHER_Y; demo.press = true; }
    } else if (demo.dPhase === 'hold') {
      meter += dt;
      var frac = Math.min(1, meter / CHARGE_MAX);
      if (frac >= (BAND_LO + BAND_HI) / 2) {
        demo.dPhase = 'release'; holding = false; demo.press = false; flashState = 1;
      }
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (meter === undefined) initGame();
      bg();
      stepDemo(dt);
      drawScene();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.1, 42, C.outline);
      txt('BEST ' + (game.best > 0 ? game.best + '/' + TOTAL : '-'), W / 2, H * 0.14, 24, C.outline);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.92, 40, C.outline);
      } else {
        txt('INSERT COIN', W / 2, H * 0.92, 28, C.outline);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawScene();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.1, 48, ok ? C.good : C.bad);
      txt(passed + ' / ' + TOTAL, W / 2, H * 0.16, 32, C.outline);
      if (!ok) txt('あと' + (TOTAL - passed) + '回!', W / 2, H * 0.21, 26, C.outline);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.92, 26, C.outline);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(passed, { passed: passed, total: TOTAL });
        else game.end.failure({ passed: passed, total: TOTAL });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else {
      stepGame(dt);
    }
    if (shake > 0) shake -= dt;
    if (flashState !== 0) flashState *= 0.9;

    bg();
    drawScene();

    txt(passed + ' / ' + TOTAL, W / 2, H * 0.06, 32, C.outline);
    game.draw.rect(60, 150, W - 120, 14, C.ink, 0.4);
    game.draw.rect(60, 150, (W - 120) * (passed / TOTAL), 14, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.32, 58, C.outline);
  });

  game.onStart(function() {
    game.audio.bgm('bgm_cute', 0.05);
    state = S.ATTRACT;
    initGame();
  });
})(game);
