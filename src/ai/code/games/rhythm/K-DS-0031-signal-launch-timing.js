// K-DS-0031-signal-launch-timing.js
// シグナル打ち上げ — 指で押さえて灯籠をチャージし、合図灯が光った瞬間に離して打ち上げる
// 操作: 画面を押し続けてチャージ。合図灯(上の丸)が光ったら指を離して打ち上げる
// 終わり: 規定回数(5回)を正しいタイミングで打ち上げれば成功。1回でも早すぎ/遅すぎれば失敗
// @mechanic: hold_charge
// @theme: night_signal_launch
// 世界観: 夜の川辺の合図係。灯籠を手元で押さえてチャージし、対岸の合図灯が光った瞬間だけ離して打ち上げる役目
// 残るもの: 正誤(CLEAR/GAME OVER) + 正しく打ち上げた回数
// スタイル: 80s ISO

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 80s ISO: 6〜8色、菱形グリッド、影で高さを示す
  var C = {
    bg: '#0a1030', bg2: '#050818', river: '#122058', riverLine: '#1e3070',
    lantern: '#ff8a3d', lanternDark: '#a5501a', signalOff: '#3a3a52', signalOn: '#ffe066',
    good: '#5dffa0', bad: '#ff4d5e', gold: '#ffe066', white: '#f4f2ff', ink: '#06081a',
  };

  var GAME_TITLE = 'SIGNAL LAUNCH';
  var TOTAL = 5;
  var CX = W * 0.5, LY = H * 0.62, SIGY = H * 0.24;
  var WIN = 0.34; // 合図点灯からの許容窓(秒)

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var done, endWait, finished, ready, hitStop, shake;
  var hits, round, holding, chargeT, cueAt, cueLit, roundResolved, burstT;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var LANTERN_SPRITE = ['.##.', '####', '####', '.##.'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    game.draw.rect(0, H * 0.72, W, H * 0.3, C.river, 0.5);
    for (var i = 0; i < 6; i++) game.draw.line(0, H * 0.72 + i * 30, W, H * 0.72 + i * 30, C.riverLine, 2);
  }

  function newRound(delayMul) {
    holding = false; chargeT = 0; cueAt = 0.6 + game.random(0, 0.7) * delayMul; cueLit = false; roundResolved = false;
  }

  function initGame() {
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
    hits = 0; round = 0; burstT = 0;
    newRound(1);
  }

  function resolveRelease() {
    if (roundResolved || ready > 0 || done || finished) return;
    roundResolved = true;
    var d = chargeT - cueAt;
    var good = cueLit && Math.abs(d) <= WIN;
    hitStop = good ? 0.1 : 0.3;
    if (good) {
      hits++;
      burstT = 0.3;
      game.feedback.good(CX, LY, { text: 'GOOD', color: C.gold });
      game.fx.burst(CX, LY - 60, { color: C.signalOn, count: 18, speed: 340 });
      game.audio.play('se_good', 0.4);
      if (hits === Math.ceil(TOTAL / 2)) game.fx.popup('HALFWAY!', CX, LY - 260, { color: C.gold, size: 38 });
      round++;
      if (hits >= TOTAL) { ok = true; finished = true; finish(); return; }
      newRound(1 + round * 0.1);
    } else {
      game.feedback.bad(CX, LY, { text: 'MISS' });
      shake = 0.28;
      game.audio.play('se_bad', 0.4);
      ok = false; finished = true; finish();
    }
  }

  game.onPress(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING && !holding && !roundResolved && ready <= 0 && !done && !finished) {
      holding = true; chargeT = 0;
      game.audio.play('se_tap', 0.05);
    }
  });
  game.onRelease(function() {
    if (state === S.PLAYING && holding) { holding = false; resolveRelease(); }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function stepRound(dt) {
    if (roundResolved) return;
    if (holding) chargeT += dt;
    if (!cueLit && chargeT >= cueAt) cueLit = true;
    if (holding && chargeT - cueAt > WIN + 0.35) {
      // 離さずタイミングを逃した
      roundResolved = true;
      hitStop = 0.3;
      game.feedback.bad(CX, LY, { text: 'MISS' });
      shake = 0.28;
      game.audio.play('se_bad', 0.4);
      ok = false; finished = true; finish();
    }
  }

  function drawScene() {
    // 合図灯: 点灯前は予告(telegraph)として微かに明滅
    var pre = !cueLit && cueAt - chargeT < 0.6 && holding;
    var glow = cueLit ? C.signalOn : (pre ? C.signalOn : C.signalOff);
    var a = cueLit ? 0.9 : (pre ? 0.3 + 0.3 * Math.sin(game.time.elapsed * 14) : 0.5);
    game.draw.circle(CX, SIGY, 46, glow, a);
    game.draw.circle(CX, SIGY, 20, cueLit ? C.white : C.signalOff, 0.9);
    // 灯籠(チャージ量で発光が強まる)
    var chargeP = Math.min(1, chargeT / Math.max(0.2, cueAt));
    game.draw.circle(CX, LY, 70 + chargeP * 20, C.lanternDark, 0.35 + chargeP * 0.3);
    game.draw.sprite(LANTERN_SPRITE, { '#': holding ? C.lantern : C.lanternDark }, CX, LY, 22, { anchor: 'center' });
    if (burstT > 0) {
      game.draw.line(CX, LY, CX, LY - 300 * (1 - burstT / 0.3), C.gold, 6);
    }
  }

  var demo = { t: 0, gx: CX, gy: LY, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 2.6;
    if (cyc < dt || demo.t <= dt) { hits = 0; round = 0; newRound(1); demo.press = false; }
    if (!roundResolved) {
      if (!holding && cyc > 0.15) { holding = true; chargeT = 0; demo.press = true; demo.gx = CX; demo.gy = LY; }
      if (holding) chargeT += dt;
      if (!cueLit && chargeT >= cueAt) cueLit = true;
      if (cueLit && holding && chargeT - cueAt > 0.06) {
        holding = false; roundResolved = true; demo.press = false;
        game.feedback.good(CX, LY, { text: 'GOOD', color: C.gold });
        game.audio.play('se_good', 0.22);
      }
    }
  }

  game.onUpdate(function(dt) {
    if (burstT > 0) burstT -= dt;

    if (state === S.ATTRACT) {
      bg();
      stepDemo(dt);
      drawScene();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 20 });
      txt(GAME_TITLE, W / 2, H * 0.10, 44, C.white);
      txt('BEST ' + (game.best > 0 ? game.best + '/' + TOTAL : '-'), W / 2, H * 0.14, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.92, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.92, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawScene();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.10, 50, ok ? C.good : C.bad);
      txt(hits + ' / ' + TOTAL, W / 2, H * 0.15, 32, C.gold);
      if (!ok) txt('あと' + (TOTAL - hits) + '回!', W / 2, H * 0.19, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.92, 26, C.white);
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
      stepRound(dt);
    }
    if (shake > 0) shake -= dt;

    bg();
    drawScene();

    txt(hits + ' / ' + TOTAL, W / 2, H * 0.06, 32, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * (hits / TOTAL), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.82, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.bgm('bgm_dark', 0.06);
    state = S.ATTRACT;
    initGame();
  });
})(game);
