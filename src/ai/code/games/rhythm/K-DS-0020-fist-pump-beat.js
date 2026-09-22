// K-DS-0020-fist-pump-beat.js
// フィストパンプビート — 縮む輪が的の輪と重なった瞬間に拳を突き上げる
// 操作: 外側から縮んでくるリングが中央の的リングに重なった瞬間にタップ(拳を突き上げる)
// 終わり: 規定回数(6回)を全て成功させれば成功。1回でも外せば失敗
// @mechanic: rhythm
// @theme: fist_pump_beat_dance
// 世界観: 屋上ステージに立つ、独自デザインのポップダンサー。流れる曲のビートに合わせ拳を突き上げ続ける一発芸
// 残るもの: 正誤(CLEAR/GAME OVER) + 決めたビート数
// スタイル: 2000s ARCADE POP

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2000s ARCADE POP: 彩度の高いポップカラー、丸い縁取り、賑やかな配色
  var C = {
    bg: '#2a0b4e', bg2: '#5a1a8e', floor: '#ff5fa2', floorDark: '#c2137a',
    ring: '#ffd400', ringDim: '#7a5a00', target: '#00e0ff', targetGlow: '#0a4a52',
    good: '#39ff8a', bad: '#ff3355', gold: '#ffe600', white: '#ffffff', ink: '#12002a',
  };

  var GAME_TITLE = 'FIST PUMP';
  var TOTAL = 6;
  var CX = W * 0.5, CY = H * 0.46;
  var TARGET_R = 130, TOL = 30;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var hits, beat, beatT, beatDur, done, endWait, finished;
  var ready, hitStop, shake, combo, pumpFlash;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var DANCER_DOWN = ['.##.', '####', '.##.', '.##.', '#.##'];
  var DANCER_UP =   ['.#..', '.##.', '####', '.##.', '#.##'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    for (var i = 0; i < 6; i++) {
      var x = (i / 6) * W + (Math.sin(game.time.elapsed * 0.6 + i) * 20);
      game.draw.circle(x, H * 0.2, 40, C.floor, 0.06);
    }
    game.draw.rect(0, H * 0.82, W, H * 0.18, C.floorDark, 0.6);
  }

  function drawDancer(pumped) {
    game.draw.sprite(pumped ? DANCER_UP : DANCER_DOWN, { '#': C.gold }, CX, CY, 30, { anchor: 'center' });
  }

  function newBeatDur() {
    var n = Math.min(beat, TOTAL - 1);
    return Math.max(0.95, 1.55 - n * 0.09);
  }

  function initGame() {
    hits = 0; beat = 0; beatT = 0; beatDur = 1.55;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; combo = 0; pumpFlash = 0;
  }

  function resolveBeat(x, y) {
    if (finished || ready > 0 || done) return;
    var approachR = Math.max(0, R_START() - (beatT / beatDur) * (R_START() - TARGET_R));
    var diff = Math.abs(approachR - TARGET_R);
    game.audio.play('se_tap', 0.05);
    if (diff <= TOL) {
      hits++; combo++; pumpFlash = 0.15; hitStop = 0.08;
      game.feedback.good(CX, CY - 220, { text: combo >= 3 ? 'PERFECT' : 'GOOD', color: C.good });
      game.fx.burst(CX, CY, { color: C.gold, count: 14, speed: 300 });
      game.audio.play('se_good', 0.35);
      if (hits === Math.ceil(TOTAL / 2)) game.fx.popup('HALFWAY!', CX, CY - 260, { color: C.gold, size: 40 });
      nextBeat(true);
    } else {
      combo = 0; hitStop = 0.3;
      game.feedback.bad(CX, CY - 220, { text: 'MISS' });
      shake = 0.28;
      game.audio.play('se_bad', 0.4);
      ok = false; finished = true; finish();
    }
  }

  function R_START() { return 300; }

  function nextBeat(success) {
    if (!success) return;
    if (hits >= TOTAL) { ok = true; finished = true; finish(); return; }
    beat++;
    beatT = 0;
    beatDur = newBeatDur();
  }

  function autoMiss() {
    if (finished || ready > 0 || done) return;
    combo = 0; hitStop = 0.3;
    game.feedback.bad(CX, CY - 220, { text: 'MISS' });
    shake = 0.28;
    game.audio.play('se_bad', 0.4);
    ok = false; finished = true; finish();
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) resolveBeat(x, y);
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function drawApproach(r, tel) {
    if (tel) {
      var blink = Math.floor(game.time.elapsed * 10) % 2 === 0;
      if (blink && Math.abs(r - TARGET_R) < TOL * 2.2) game.draw.circle(CX, CY, TARGET_R + 6, C.target, 0.3);
    }
    game.draw.circle(CX, CY, TARGET_R, C.targetGlow);
    game.draw.circle(CX, CY, TARGET_R - 8, C.target, 0.25);
    game.draw.circle(CX, CY, r, C.ring, 0.9);
  }

  var demo = { t: 0, gx: CX, gy: H * 0.86, press: false, b: 0, bt: 0, bd: 1.4 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.4;
    if (cyc < dt || demo.t <= dt) { demo.b = 0; demo.bt = 0; demo.bd = 1.4; }
    demo.bt += dt;
    if (demo.bt >= demo.bd * 0.94 && demo.press === false) {
      demo.press = true;
      pumpFlash = 0.15;
      game.feedback.good(CX, CY - 220, { text: 'GOOD', color: C.good });
      game.audio.play('se_good', 0.2);
    }
    if (demo.bt >= demo.bd) {
      demo.bt = 0; demo.b++; demo.press = false;
      if (demo.b >= 3) demo.b = 0;
    }
    var r = Math.max(0, R_START() - (demo.bt / demo.bd) * (R_START() - TARGET_R));
    return r;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      bg();
      var r = stepDemo(dt);
      drawApproach(r, true);
      drawDancer(pumpFlash > 0);
      if (pumpFlash > 0) pumpFlash -= dt;
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 20 });
      txt(GAME_TITLE, W / 2, H * 0.08, 46, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawApproach(TARGET_R, false);
      drawDancer(false);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      txt(hits + ' / ' + TOTAL, W / 2, H * 0.13, 32, C.gold);
      if (!ok) txt('あと' + (TOTAL - hits) + 'ビート!', W / 2, H * 0.18, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(hits, { hits: hits, total: TOTAL });
        else game.end.failure({ hits: hits, total: TOTAL });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      beatT += dt;
      if (beatT >= beatDur) autoMiss();
    }
    if (shake > 0) shake -= dt;
    if (pumpFlash > 0) pumpFlash -= dt;

    bg();
    var rr = Math.max(0, R_START() - (beatT / beatDur) * (R_START() - TARGET_R));
    if (!finished) drawApproach(rr, true);
    else drawApproach(TARGET_R, false);
    drawDancer(pumpFlash > 0);

    txt(hits + ' / ' + TOTAL, W / 2, H * 0.06, 32, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * (hits / TOTAL), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.7, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['C4', 0.5], ['G4', 0.5], ['A4', 0.5], ['E4', 1]], { tempo: 140, wave: 'square', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
