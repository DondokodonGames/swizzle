// K-DS-0007-chorus-relay-hold.js
// コーラスリレー — 前の歌い終わりに続けて、自分の番の歌声をちょうどの長さだけ伸ばして届ける
// 操作: 前の人の歌い終わりに続けて指を押さえ続け、示された長さぴったりで指を離す
// 終わり: 規定回数(6回)長さを合わせて歌えば成功。2回外せば失敗
// @mechanic: hold_duration
// @theme: chorus_circle_relay
// 世界観: 輪になって一節ずつ歌をつなぐ合唱の輪。自分の番が来たら、示された長さぴったりに声を伸ばして次へつなぐ
// 残るもの: 正誤(CLEAR/GAME OVER) + 長さを合わせられた回数
// スタイル: 2000s HANDHELD PASTEL

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2000s HANDHELD PASTEL: 淡いパステル、丸っこいUI
  var C = {
    bg: '#fdeef7', bg2: '#f6dcf0', singer: '#c9a8e0', singerLit: '#ff9ecb',
    bar: '#ffffff', barFill: '#ff9ecb', bracket: '#8a6bd6',
    good: '#4ecb8f', bad: '#ff6b7a', gold: '#ffb347', white: '#ffffff', ink: '#4a3a55',
  };

  var GAME_TITLE = 'CHORUS RELAY';
  var TOTAL = 6;
  var MISS_LIMIT = 2;
  var TOL = 0.16;
  var N_SLOTS = 6;
  var CX = W * 0.5, CY = H * 0.4, R = W * 0.3;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var SINGER = ['.##.', '####', '.##.', '.##.'];
  var BAR_X = W * 0.18, BAR_W = W * 0.64, BAR_Y = H * 0.66, BAR_H = 46;

  function posAt(i) {
    var a = (i / N_SLOTS) * Math.PI * 2;
    return { x: CX + R * Math.sin(a), y: CY - R * Math.cos(a) * 0.6 };
  }

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    for (var i = 0; i < N_SLOTS; i++) {
      var p = posAt(i);
      game.draw.circle(p.x, p.y, 58, i === round % N_SLOTS ? C.singerLit : C.singer, i === round % N_SLOTS ? 0.9 : 0.4);
      game.draw.sprite(SINGER, { '#': C.white }, p.x, p.y, 15, { anchor: 'center' });
    }
  }

  var round, misses, holding, holdStart, holdDur, targetDur, resolved, done, endWait, finished, readyIn, hitStop, shake, flashOk, flashT;

  function newTarget() { return 0.6 + Math.random() * 0.7; }

  function initGame() {
    round = 0; misses = 0; holding = false; holdStart = 0; holdDur = 0;
    targetDur = newTarget(); resolved = false;
    done = false; endWait = 0; finished = false;
    readyIn = 0.8; hitStop = 0; shake = 0; flashOk = true; flashT = 0;
  }

  function beginHold() {
    if (readyIn > 0 || done || finished || hitStop > 0 || holding) return;
    holding = true; holdStart = game.time.elapsed; holdDur = 0;
  }

  function endHold() {
    if (!holding) return;
    holding = false;
    var d = game.time.elapsed - holdStart;
    resolve(d);
  }

  function resolve(d) {
    if (resolved || finished) return;
    resolved = true;
    var diff = Math.abs(d - targetDur);
    if (diff <= TOL) {
      round++;
      hitStop = 0.1; flashOk = true; flashT = 0.16;
      game.feedback.good(CX, CY, { text: 'NICE' });
      game.audio.play('se_good', 0.3);
      if (round === Math.floor(TOTAL / 2)) { game.fx.popup(round + ' / ' + TOTAL, CX, CY - 240, { color: C.gold, size: 36 }); game.audio.play('se_milestone', 0.3); }
      if (round >= TOTAL) { ok = true; finished = true; finish(); return; }
      targetDur = newTarget(); resolved = false;
    } else {
      misses++;
      hitStop = 0.3; shake = 0.2; flashOk = false; flashT = 0.22;
      game.feedback.bad(CX, CY, { text: d < targetDur ? 'SHORT' : 'LONG' });
      game.audio.play('se_bad', 0.3);
      if (misses >= MISS_LIMIT) { ok = false; finished = true; finish(); return; }
      targetDur = newTarget(); resolved = false;
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function(x, y) { if (state === S.PLAYING) { game.audio.play('se_tap', 0.15); beginHold(); } });
  game.onRelease(function(x, y) { if (state === S.PLAYING) { game.audio.play('se_tap', 0.05); endHold(); } });

  function finish() {
    if (done) return;
    done = true;
    holding = false;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.2;
  }

  function stepRound(dt) {
    if (holding) {
      holdDur = game.time.elapsed - holdStart;
      if (holdDur > targetDur + TOL + 0.25) {
        holding = false;
        resolve(holdDur);
      }
    }
  }

  var demo = { t: 0, gx: CX, gy: H * 0.86, press: false, holding: false, holdStart: 0, target: 0.9 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 2.6;
    if (cyc < dt || demo.t <= dt) { demo.holding = false; demo.target = 0.9; }
    if (!demo.holding && cyc > 0.3 && cyc < 0.35) { demo.holding = true; demo.holdStart = cyc; }
    if (demo.holding) {
      holdDur = cyc - demo.holdStart;
      if (holdDur >= demo.target) { demo.holding = false; game.feedback.good(CX, CY, { text: 'NICE' }); game.audio.play('se_good', 0.15); }
    }
    demo.press = demo.holding;
    targetDur = demo.target;
  }

  function drawBar() {
    game.draw.rect(BAR_X, BAR_Y, BAR_W, BAR_H, C.bar);
    var fillW = Math.min(BAR_W, (holdDur / (targetDur + TOL + 0.3)) * BAR_W);
    if (holding || (state === S.ATTRACT)) game.draw.rect(BAR_X, BAR_Y, fillW, BAR_H, C.barFill);
    var loX = BAR_X + ((targetDur - TOL) / (targetDur + TOL + 0.3)) * BAR_W;
    var hiX = BAR_X + ((targetDur + TOL) / (targetDur + TOL + 0.3)) * BAR_W;
    game.draw.line(loX, BAR_Y - 10, loX, BAR_Y + BAR_H + 10, C.bracket, 5);
    game.draw.line(hiX, BAR_Y - 10, hiX, BAR_Y + BAR_H + 10, C.bracket, 5);
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      bg();
      stepDemo(dt);
      drawBar();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 16 });
      txt(GAME_TITLE, W / 2, H * 0.08, 42, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 24, C.ink);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.92, 40, C.bracket);
      } else {
        txt('INSERT COIN', W / 2, H * 0.92, 28, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawBar();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 48, ok ? C.good : C.bad);
      txt(round + ' / ' + TOTAL, W / 2, H * 0.13, 32, C.ink);
      if (!ok && TOTAL - round <= 2) txt('あと' + (TOTAL - round) + '回!', W / 2, H * 0.18, 26, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.92, 26, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(round, { round: round, total: TOTAL, misses: misses });
        else game.end.failure({ round: round, total: TOTAL, misses: misses });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (readyIn > 0) {
      readyIn -= dt;
      if (readyIn <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      stepRound(dt);
    }
    if (flashT > 0) flashT -= dt;
    if (shake > 0) shake -= dt;

    bg();
    drawBar();
    if (flashT > 0) game.draw.rect(BAR_X, BAR_Y, BAR_W, BAR_H, flashOk ? C.good : C.bad, 0.4);

    txt(round + ' / ' + TOTAL, W / 2, H * 0.06, 32, C.ink);
    for (var m = 0; m < MISS_LIMIT; m++) {
      game.draw.circle(W - 60 - m * 34, 190, 10, m < misses ? C.bad : '#00000020');
    }
    if (readyIn > 0) txt(readyIn > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.55, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['F4', 0.4], ['A4', 0.4], ['C5', 0.6]], { tempo: 90, wave: 'sine', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
