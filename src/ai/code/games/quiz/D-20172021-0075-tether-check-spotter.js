// D-20172021-0075-tether-check-spotter.js
// テザーチェック・スポッター — 同じ形に見える気球の群れから、係留ひもが無い一つだけを見つけてタップする
// 操作: 6つの気球のうち、地面へのひもが付いていない1つを見つけてタップする(色や大きさは全部同じ)
// 終わり: 規定回数(4回)連続でひも無しの気球を見つければ成功。誤タップか時間切れが1回でもあれば失敗
// @mechanic: spot
// @theme: tether_check_spotter
// 世界観: 気球係留検査員が、離陸前の一斉点検で、見た目が同じ気球の群れの中からひもの外れた1つだけを瞬時に見つけ出す
// 残るもの: 正誤(CLEAR/GAME OVER) + 見つけた回数
// スタイル: SKEUOMORPH

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // SKEUOMORPH: 質感テクスチャ、木目/布地風の下地、光沢のあるボタン
  var C = {
    bg: '#7a9dbf', bg2: '#5a7d9f', ground: '#8a6d4a', groundDark: '#6a4f32',
    balloon: '#e8503a', balloonDark: '#b53a26', balloonHi: '#ffb199',
    rope: '#5a4530', clip: '#3a3020',
    good: '#39c96a', bad: '#ff4d5e', gold: '#ffcf4a', white: '#fff6ea', ink: '#241a10',
  };

  var GAME_TITLE = 'TETHER CHECK';
  var TOTAL = 4;
  var POS = [
    { x: W * 0.28, y: H * 0.34 },
    { x: W * 0.5, y: H * 0.30 },
    { x: W * 0.72, y: H * 0.34 },
    { x: W * 0.28, y: H * 0.52 },
    { x: W * 0.5, y: H * 0.56 },
    { x: W * 0.72, y: H * 0.52 },
  ];
  var BR = 64;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var INSPECTOR = ['.##.', '####', '.##.', '.##.'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    game.draw.rect(0, H * 0.78, W, H * 0.22, C.ground);
    game.draw.rect(0, H * 0.78, W, 10, C.groundDark);
    for (var i = 0; i < 10; i++) {
      game.draw.rect((i * 111) % W, H * 0.8 + (i * 37) % (H * 0.15), 40, 6, C.groundDark, 0.3);
    }
    game.draw.sprite(INSPECTOR, { '#': C.gold }, W * 0.5, H * 0.10, 16, { anchor: 'center' });
  }

  var round, target, halfShown, bob;
  var roundT, roundDur, done, endWait, finished, ready, hitStop, shake;

  function newRound(idx) {
    return { target: Math.floor(game.random(0, POS.length)), dur: Math.max(1.9, 3.4 - idx * 0.35) };
  }

  function drawBalloon(i, alpha) {
    var p = POS[i];
    var by = p.y + Math.sin(game.time.elapsed * 1.6 + i * 1.3) * 6;
    if (i !== target) {
      var gy = H * 0.78;
      game.draw.line(p.x, by + BR * 0.7, p.x - 4, gy, C.rope, 4);
      game.draw.circle(p.x - 4, gy, 8, C.clip, alpha);
    }
    game.draw.circle(p.x, by, BR, C.balloonDark, alpha);
    game.draw.circle(p.x, by, BR * 0.86, C.balloon, alpha);
    game.draw.circle(p.x - BR * 0.28, by - BR * 0.28, BR * 0.26, C.balloonHi, alpha * 0.85);
  }

  function initGame() {
    round = 0; halfShown = false;
    var r = newRound(0); target = r.target; roundDur = r.dur; roundT = 0;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function ballAt(x, y) {
    for (var i = 0; i < POS.length; i++) {
      var p = POS[i];
      var by = p.y + Math.sin(game.time.elapsed * 1.6 + i * 1.3) * 6;
      if (game.hit.circle(x, y, 1, p.x, by, BR + 20)) return i;
    }
    return -1;
  }

  function pick(i) {
    if (done || ready > 0 || finished) return;
    var p = POS[i];
    if (i === target) {
      round++;
      hitStop = 0.1;
      game.feedback.good(p.x, p.y, { text: 'GOOD', color: C.good });
      game.audio.play('se_good', 0.35);
      if (!halfShown && round >= Math.ceil(TOTAL / 2)) {
        halfShown = true;
        game.fx.popup('HALFWAY!', W / 2, H * 0.22, { color: C.gold, size: 36 });
        game.audio.play('se_milestone', 0.4);
      }
      if (round >= TOTAL) { ok = true; finished = true; hitStop = 0.18; finish(); return; }
      var r = newRound(round); target = r.target; roundDur = r.dur; roundT = 0;
    } else {
      hitStop = 0.35; shake = 0.3;
      game.feedback.bad(p.x, p.y, { text: 'MISS' });
      game.audio.play('se_bad', 0.4);
      ok = false; finished = true; finish();
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) {
      var i = ballAt(x, y);
      if (i < 0) { game.audio.play('se_tap', 0.05); return; }
      pick(i);
    }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  var demo = { t: 0, gx: POS[0].x, gy: POS[0].y, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 2.6;
    if (cyc < dt || demo.t <= dt) {
      var r = newRound(0); target = r.target; roundDur = 1.9; roundT = 0;
      demo.fired = false;
    }
    roundT += dt;
    if (roundT > roundDur * 0.55 && !demo.fired) {
      demo.fired = true;
      demo.gx = POS[target].x; demo.gy = POS[target].y; demo.press = true;
      game.feedback.good(POS[target].x, POS[target].y, { text: 'GOOD', color: C.good });
      game.audio.play('se_good', 0.22);
    }
    if (roundT > roundDur * 0.55 + 0.25) demo.press = false;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (target === undefined) initGame();
      bg();
      stepDemo(dt);
      for (var i0 = 0; i0 < POS.length; i0++) drawBalloon(i0, 1);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.06, 40, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.095, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.95, 38, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.95, 26, C.white);
      return;
    }

    if (state === S.RESULT) {
      bg();
      for (var i1 = 0; i1 < POS.length; i1++) drawBalloon(i1, 1);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.06, 44, ok ? C.good : C.bad);
      txt(round + ' / ' + TOTAL, W / 2, H * 0.10, 28, C.gold);
      if (!ok) txt('あと' + (TOTAL - round) + '回!', W / 2, H * 0.14, 24, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.95, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        var stats = { found: round, total: TOTAL };
        if (ok) game.end.success(round, stats); else game.end.failure(stats);
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      roundT += dt;
      if (roundT >= roundDur) {
        hitStop = 0.3; shake = 0.3;
        game.feedback.bad(POS[target].x, POS[target].y, { text: 'MISS' });
        game.audio.play('se_bad', 0.4);
        ok = false; finished = true; finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    for (var i2 = 0; i2 < POS.length; i2++) drawBalloon(i2, 1);

    if (!finished) {
      var p = 1 - roundT / roundDur;
      var warn = p < 0.3;
      var blink = warn && Math.floor(game.time.elapsed * 12) % 2 === 0;
      game.draw.rect(W / 2 - 140, H * 0.68, 280, 16, C.ink, 0.4);
      game.draw.rect(W / 2 - 140, H * 0.68, 280 * Math.max(0, p), 16, blink ? C.bad : C.gold);
    }

    txt(round + ' / ' + TOTAL, W / 2, H * 0.06, 28, C.white);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.44, 54, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['A4', 0.2], ['C5', 0.2], ['E5', 0.2], ['A5', 0.4]], { tempo: 150, wave: 'triangle', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
