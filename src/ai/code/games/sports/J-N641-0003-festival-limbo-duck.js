// J-N641-0003-festival-limbo-duck.js
// 祭り度胸試しの限界くぐり — 徐々に下がってくる横木に触れないよう指でかがませ耐えた時間を競う
// 操作: 画面をホールドすると踊り子がかがむ。横木が低い間はホールドし続け、上がったら離す
// 終わり: 目標時間ぴったり耐えれば成功。横木に触れる/離すタイミングを外すと失敗
// @mechanic: dodge
// @theme: festival_limbo_duck
// 世界観: 夏祭りの度胸試しに挑む踊り子が、じわじわ下がってくる横木にかがんでくぐり抜け、耐え抜いた時間を競う
// 残るもの: 正誤(CLEAR/GAME OVER) + 耐えた秒数
// スタイル: 2000s ARCADE POP

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2000s ARCADE POP: 原色+白縁、光の柱、祝祭演出
  var C = {
    bg: '#ff6a3a', bg2: '#ff2f6e', pole: '#ffffff', poleD: '#ffd400',
    bar: '#3ac0ff', barD: '#1a80c0', dancer: '#ffd400', dancerD: '#d89a00',
    good: '#39e07a', badc: '#ff2f4e', gold: '#ffffff', ink: '#2a0a1a',
  };

  var GAME_TITLE = 'LIMBO DUCK';
  var GOAL_TIME = 17;
  var BAR_X = W * 0.5;
  var BAR_HIGH_Y = H * 0.40;
  var BAR_LOW_Y = H * 0.72;
  var CYCLE = 2.3;
  var LOW_ZONE = 0.62; // fraction of cycle where bar is near low (must duck)

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 1, y + 2, { size: sz, color: '#1a0006', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var DANCER_SPR_STAND = ['.##.', '####', '.##.', '.#.#'];
  var DANCER_SPR_DUCK = ['####', '.##.'];

  function bg(t) {
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    for (var i = 0; i < 5; i++) {
      var x = W * (0.1 + i * 0.2);
      game.draw.rect(x - 6, 0, 12, H, '#ffffff', 0.06 + 0.04 * Math.sin(t * 1.6 + i));
    }
    var pulse = 0.05 + 0.05 * Math.sin(t * 2);
    game.draw.rect(0, 0, W, H, '#ffffff', pulse * 0.15);
  }

  function barYAt(elapsed) {
    var ph = (elapsed % CYCLE) / CYCLE;
    // ease down then hold then up
    var y;
    if (ph < LOW_ZONE) {
      var t = ph / LOW_ZONE;
      y = BAR_HIGH_Y + (BAR_LOW_Y - BAR_HIGH_Y) * Math.min(1, t * 1.6);
    } else {
      var t2 = (ph - LOW_ZONE) / (1 - LOW_ZONE);
      y = BAR_LOW_Y - (BAR_LOW_Y - BAR_HIGH_Y) * t2;
    }
    return y;
  }
  function dangerAt(elapsed) {
    var ph = (elapsed % CYCLE) / CYCLE;
    return ph < LOW_ZONE * 0.92;
  }
  function warnAt(elapsed) {
    var ph = (elapsed % CYCLE) / CYCLE;
    return ph > LOW_ZONE * 0.92 - 0.10 && ph < LOW_ZONE * 0.92;
  }

  function drawScene(barY, ducking, warn) {
    game.draw.rect(W * 0.16, H * 0.3, 14, H * 0.55, C.pole);
    game.draw.rect(W * 0.84 - 14, H * 0.3, 14, H * 0.55, C.pole);
    game.draw.rect(W * 0.16, barY - 10, W * 0.68, 20, warn ? C.badc : C.bar);
    game.draw.circle(W * 0.16, barY, 16, C.poleD);
    game.draw.circle(W * 0.84, barY, 16, C.poleD);
    var spr = ducking ? DANCER_SPR_DUCK : DANCER_SPR_STAND;
    var dy = ducking ? H * 0.76 : H * 0.70;
    game.draw.sprite(spr, { '#': C.dancer }, W * 0.5, dy, 30, { anchor: 'center' });
  }

  var elapsed, ducking, survived, failed, best, milestoneCalled;
  var done, endWait, finished, ready, hitStop, shake;

  function initGame() {
    elapsed = 0; ducking = false; survived = 0; failed = false; milestoneCalled = false;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function setDuck(v, x, y) {
    if (finished || ready > 0) return;
    if (v === ducking) return;
    ducking = v;
    var py = y || H * 0.7;
    if (v) game.feedback.good(W * 0.5, py, { text: '', color: C.dancer, count: 5, sound: 'se_tap' });
    else game.feedback.good(W * 0.5, py, { text: '', color: '#ffffff', count: 5, sound: 'se_tap' });
  }

  function checkContact() {
    var barY = barYAt(elapsed);
    var danger = dangerAt(elapsed);
    if (danger && !ducking) {
      shake = 0.25; hitStop = 0.3; failed = true; finished = true; ok = false;
      game.feedback.bad(W * 0.5, barY, { text: 'MISS' });
      game.audio.play('se_failure', 0.5);
      finish();
    }
  }

  function winRun() {
    if (finished) return;
    finished = true; ok = true; hitStop = 0.15;
    game.fx.burst(W * 0.5, H * 0.7, { color: C.gold, count: 24, speed: 400 });
    game.audio.play('se_success', 0.5);
    finish();
  }

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function(x, y) { if (state === S.PLAYING) setDuck(true, x, y); });
  game.onRelease(function(x, y) { if (state === S.PLAYING) setDuck(false, x, y); });

  var demo = { t: 0, gx: W * 0.5, gy: H * 0.86, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 6.4;
    if (cyc < dt || demo.t <= dt) initGame();
    elapsed += dt;
    var danger = dangerAt(elapsed);
    var wantDuck = danger;
    if (wantDuck !== ducking) setDuck(wantDuck, demo.gx, demo.gy);
    demo.press = ducking;
    if (!finished) {
      checkContact();
      survived += dt;
      if (survived >= GOAL_TIME) winRun();
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (elapsed === undefined) initGame();
      stepDemo(dt);
      bg(game.time.elapsed);
      drawScene(barYAt(elapsed), ducking, warnAt(elapsed));
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.09, 38, C.ink);
      var bestTenths = game.best;
      txt('BEST ' + (bestTenths > 0 ? (bestTenths / 10).toFixed(1) + 's' : '-'), W / 2, H * 0.13, 22, '#ffffff');
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, '#ffffff');
      else txt('TAP TO START', W / 2, H * 0.94, 28, C.ink);
      return;
    }

    if (state === S.RESULT) {
      bg(game.time.elapsed);
      drawScene(barYAt(elapsed), ducking, false);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.09, 44, ok ? C.good : C.badc);
      txt(survived.toFixed(1) + 's', W / 2, H * 0.14, 30, '#ffffff');
      if (!ok) txt('あと' + Math.max(0, (GOAL_TIME - survived)).toFixed(1) + '秒!', W / 2, H * 0.18, 24, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(Math.round(survived * 10), { survived: survived.toFixed(1) });
        else game.end.failure({ survived: survived.toFixed(1) });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      elapsed += dt;
      checkContact();
      if (!finished) {
        survived += dt;
        if (!milestoneCalled && survived >= GOAL_TIME * 0.5) {
          milestoneCalled = true;
          game.fx.popup('NICE', W * 0.5, H * 0.3, { color: '#ffffff', size: 32 });
          game.audio.play('se_milestone', 0.3);
        }
        if (survived >= GOAL_TIME) winRun();
      }
    }
    if (shake > 0) shake -= dt;

    bg(game.time.elapsed);
    drawScene(barYAt(elapsed), ducking, warnAt(elapsed));

    txt(survived.toFixed(1) + ' / ' + GOAL_TIME.toFixed(1) + 's', W / 2, H * 0.06, 30, '#ffffff');
    var tbW = W - 120;
    game.draw.rect(60, 150, tbW, 16, '#ffffff', 0.3);
    game.draw.rect(60, 150, tbW * Math.min(1, survived / GOAL_TIME), 16, C.good);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 56, '#ffffff');
  });

  game.onStart(function() {
    game.audio.melody([['A4', 0.2], ['C5', 0.2], ['E5', 0.2], ['A5', 0.4]], { tempo: 150, wave: 'square', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
