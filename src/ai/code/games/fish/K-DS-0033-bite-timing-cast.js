// K-DS-0033-bite-timing-cast.js
// バイトタイミングキャスト — 浮きが沈んだ瞬間だけ竿を上げる。早合わせも遅れも禁物
// 操作: 静かに浮かぶ浮きが不意に沈んだ瞬間にタップして竿を上げる。沈む前のタップは早合わせで失敗
// 終わり: 規定尾数(5尾)を全て釣り上げれば成功。1回でも外せば失敗
// @mechanic: reaction_duel
// @theme: bite_timing_cast
// 世界観: 独自デザインの釣り人が静かな池に糸を垂らす。浮きが沈む一瞬の合図だけを頼りに竿を上げる真剣勝負
// 残るもの: 正誤(CLEAR/GAME OVER) + 釣り上げた尾数
// スタイル: 90s PRE-RENDER

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s PRE-RENDER: 光沢のあるグラデーション、くっきりしたハイライトで質感を出す
  var C = {
    sky: '#a8d8e8', sky2: '#6ab0c8', water: '#2a6a8a', waterDeep: '#123a52',
    float: '#ff4a4a', floatDim: '#7a1a1a', good: '#3adf8a', bad: '#ff3a4a',
    gold: '#ffd23a', white: '#ffffff', ink: '#0a1822',
  };

  var GAME_TITLE = 'BITE TIMING';
  var TOTAL = 5;
  var FX = W * 0.5, FY = H * 0.42;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var caught, done, endWait, finished;
  var ready, hitStop, shake, round, phase, phaseT, waitDur, biteDur, bob;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var ANGLER = ['.##.', '####', '.##.', '#.##'];

  function bg() {
    game.draw.gradient(0, H * 0.5, [[0, C.sky], [1, C.sky2]]);
    game.draw.gradient(H * 0.5, H, [[0, C.water], [1, C.waterDeep]]);
    for (var i = 0; i < 6; i++) game.draw.rect(0, H * 0.5 + i * 60, W, 3, C.waterDeep, 0.3);
  }

  function newWaitDur() {
    return 0.8 + Math.random() * 1.0;
  }
  function newBiteDur() {
    var n = Math.min(round, TOTAL - 1);
    return Math.max(0.42, 0.72 - n * 0.06);
  }

  function initGame() {
    caught = 0; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; round = 0; bob = 0;
    phase = 'wait'; phaseT = 0; waitDur = newWaitDur(); biteDur = newBiteDur();
  }

  function resolveReel() {
    if (finished || ready > 0 || done) return;
    game.audio.play('se_tap', 0.05);
    if (phase === 'bite') {
      caught++; hitStop = 0.08;
      game.feedback.good(FX, FY, { text: 'CATCH!', color: C.good });
      game.fx.burst(FX, FY, { color: C.gold, count: 16, speed: 320 });
      game.audio.play('se_good', 0.4);
      if (caught === Math.ceil(TOTAL / 2)) game.fx.popup('BIG HAUL!', FX, FY - 220, { color: C.gold, size: 36 });
      if (caught >= TOTAL) { ok = true; finished = true; finish(); return; }
      round++;
      phase = 'wait'; phaseT = 0; waitDur = newWaitDur(); biteDur = newBiteDur();
    } else {
      failReel('TOO SOON');
    }
  }

  function failReel(label) {
    hitStop = 0.3;
    game.feedback.bad(FX, FY, { text: label });
    shake = 0.28;
    game.audio.play('se_bad', 0.4);
    ok = false; finished = true; finish();
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) resolveReel();
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function drawScene(ph) {
    game.draw.sprite(ANGLER, { '#': C.ink }, W * 0.28, H * 0.78, 28, { anchor: 'center' });
    game.draw.line(W * 0.32, H * 0.7, FX, FY, C.ink, 3);
    var biting = ph === 'bite';
    var floatY = FY + (biting ? 30 : Math.sin(game.time.elapsed * 3) * 6);
    if (biting) {
      var blink = Math.floor(game.time.elapsed * 14) % 2 === 0;
      if (blink) game.draw.circle(FX, floatY, 50, C.bad, 0.3);
    }
    game.draw.circle(FX, floatY, 18, biting ? C.bad : C.float);
    game.draw.circle(FX, floatY - 8, 8, C.white, 0.6);
  }

  var demo = { t: 0, gx: FX, gy: H * 0.9, press: false, ph: 'wait', pt: 0, wd: 1.0, bd: 0.6 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 2.6;
    if (cyc < dt || demo.t <= dt) { round = 0; demo.ph = 'wait'; demo.pt = 0; demo.wd = 1.0; demo.bd = 0.6; demo.hit = false; }
    demo.pt += dt;
    phase = demo.ph; phaseT = demo.pt; waitDur = demo.wd; biteDur = demo.bd;
    if (demo.ph === 'wait' && demo.pt >= demo.wd) { demo.ph = 'bite'; demo.pt = 0; demo.hit = false; }
    if (demo.ph === 'bite' && !demo.hit) {
      demo.hit = true; demo.press = true;
      game.feedback.good(FX, FY, { text: 'CATCH!', color: C.good });
      game.audio.play('se_good', 0.2);
    }
    if (demo.ph === 'bite' && demo.pt >= demo.bd) { demo.ph = 'wait'; demo.pt = 0; demo.press = false; }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      bg();
      stepDemo(dt);
      drawScene(phase);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 20 });
      txt(GAME_TITLE, W / 2, H * 0.08, 40, C.white);
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
      drawScene('wait');
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      txt(caught + ' / ' + TOTAL, W / 2, H * 0.13, 32, C.gold);
      if (!ok) txt('あと' + (TOTAL - caught) + '尾!', W / 2, H * 0.18, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(caught, { caught: caught, total: TOTAL });
        else game.end.failure({ caught: caught, total: TOTAL });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      phaseT += dt;
      if (phase === 'wait' && phaseT >= waitDur) { phase = 'bite'; phaseT = 0; game.audio.play('se_milestone', 0.3); }
      else if (phase === 'bite' && phaseT >= biteDur) failReel('MISS');
    }
    if (shake > 0) shake -= dt;

    bg();
    drawScene(phase);

    txt(caught + ' / ' + TOTAL, W / 2, H * 0.06, 32, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * (caught / TOTAL), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.7, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.bgm('bgm_tense', 0.05);
    state = S.ATTRACT;
    initGame();
  });
})(game);
