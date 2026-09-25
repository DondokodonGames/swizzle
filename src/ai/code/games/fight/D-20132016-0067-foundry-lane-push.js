// D-20132016-0067-foundry-lane-push.js
// フォウンドリー・レーン・プッシュ — 蒸気機甲兵団を一気に押し出し、敵の炉門を破る一撃
// 操作: 画面を長押しして機甲兵団の推進力を充填し、最良の力が乗った瞬間に指を離す
// 終わり: 推進力が適正帯で解放できれば炉門を破壊して成功。弱すぎ/溜めすぎは失敗
// @mechanic: hold_charge
// @theme: foundry_lane_push
// 世界観: 蒸気仕掛けの鋳造戦線。技師である主役は自陣の機甲兵団に号令をかけ、限界まで力を溜めてから一気に敵の炉門へ突進させる
// 残るもの: 正誤(CLEAR/GAME OVER) + 解放した推進力(%)
// スタイル: 90s BIG SPRITE

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s BIG SPRITE: 高彩度多色、巨大キャラ、床影で間合いを見せる
  var C = {
    bg: '#1a0e08', bg2: '#3a1c0e', floor: '#241206', rail: '#5a2c12',
    plate: '#c47a3a', plateDark: '#7a4420', glow: '#ff8a2e', ember: '#ffd24a',
    good: '#4dff8a', bad: '#ff4d5e', gold: '#ffd400', white: '#fff2e0', ink: '#0a0402',
  };

  var GAME_TITLE = 'LANE PUSH';
  var CX = W * 0.5, LANE_Y = H * 0.5;
  var RAMP = 2.0;          // 充填にかかる秒数(フル)
  var LO = 0.55, HI = 0.78; // 適正解放帯(fraction of RAMP)
  var PERFECT_LO = 0.63, PERFECT_HI = 0.72;
  var OVERLOAD_T = 0.92;    // このfractionから過負荷の予告点滅

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var UNIT_FRAMES = [
    ['..##..', '.####.', '##..##', '.####.', '.#..#.', '##..##'],
    ['..##..', '.####.', '##..##', '.####.', '..##..', '#.##.#'],
  ];

  var charge, holding, holdStart, released, finished, done, endWait, hitStop, shake, ready;
  var enteredSweet, resultFrac, grade;

  function initGame() {
    charge = 0; holding = false; holdStart = 0; released = false; finished = false;
    done = false; endWait = 0; hitStop = 0; shake = 0; ready = 0.8;
    enteredSweet = false; resultFrac = 0; grade = '';
  }

  function bg() {
    var elapsed = game.time.elapsed;
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    game.draw.rect(0, H * 0.62, W, H * 0.38, C.floor);
    for (var i = 0; i < 6; i++) {
      game.draw.line(0, H * 0.62 + i * 26, W, H * 0.62 + i * 26, C.rail, 2);
    }
    // 遠景の炉の灯り
    game.draw.circle(W * 0.85, H * 0.22, 60, C.glow, 0.15);
    game.draw.circle(W * 0.15, H * 0.2, 40, C.glow, 0.1);
    // アンビエント輝度パルス(センターX無動判定対策)
    game.draw.rect(0, 0, W, H, '#ffffff', 0.03 + 0.03 * Math.sin(elapsed * 1.3));
  }

  function drawGate(shakeMag) {
    var gx = W * 0.85 + (shakeMag ? Math.sin(game.time.elapsed * 40) * shakeMag * 12 : 0);
    game.draw.rect(gx - 26, LANE_Y - 150, 52, 300, C.plateDark);
    game.draw.rect(gx - 26, LANE_Y - 150, 52, 300, C.ink, 0.25);
    game.draw.line(gx - 26, LANE_Y - 150, gx + 26, LANE_Y + 150, C.ember, 3);
  }

  function drawUnit(x, y, sway, frame) {
    var bobY = Math.sin(game.time.elapsed * 2.3) * 5;
    var swayX = Math.cos(game.time.elapsed * 1.6) * 4;
    game.draw.sprite(UNIT_FRAMES[frame % 2], { '#': C.plate }, x + swayX, y + bobY + sway, 16, { anchor: 'center' });
  }

  function drawGauge(c) {
    var gx = W * 0.15, gy = H * 0.82, gw = W * 0.7, gh = 46;
    game.draw.rect(gx, gy, gw, gh, C.ink, 0.55);
    game.draw.rect(gx + gw * LO, gy, gw * (HI - LO), gh, C.gold, 0.35);
    game.draw.rect(gx + gw * PERFECT_LO, gy, gw * (PERFECT_HI - PERFECT_LO), gh, C.good, 0.45);
    game.draw.rect(gx + gw * OVERLOAD_T, gy, gw * (1 - OVERLOAD_T), gh, C.bad, 0.4);
    var fillW = Math.min(1, c) * gw;
    game.draw.rect(gx, gy, fillW, gh, C.glow, 0.9);
    if (c >= OVERLOAD_T && Math.floor(game.time.elapsed * 10) % 2 === 0) {
      game.draw.rect(gx, gy, gw, gh, C.bad, 0.3);
    }
  }

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function resolveRelease(forceOverload) {
    if (finished || done) return;
    finished = true;
    holding = false;
    resultFrac = Math.min(1.15, charge);
    var success = !forceOverload && charge >= LO && charge <= HI;
    ok = success;
    if (success) {
      grade = (charge >= PERFECT_LO && charge <= PERFECT_HI) ? 'PERFECT' : 'GOOD';
      hitStop = 0.14;
      game.feedback.good(CX, LANE_Y, { text: grade, color: C.good });
      game.fx.burst(CX, LANE_Y, { color: C.ember, count: 22, speed: 420 });
      game.audio.play('se_break', 0.5);
    } else {
      grade = forceOverload ? 'MISS' : 'MISS';
      hitStop = 0.4;
      game.feedback.bad(CX, LANE_Y, { text: 'MISS' });
      shake = 0.35;
      game.audio.play('se_bad', 0.4);
    }
    finish();
  }

  game.onPress(function(x, y) {
    if (state !== S.PLAYING || ready > 0 || finished) { game.audio.play('se_tap', 0.05); return; }
    holding = true; holdStart = game.time.elapsed;
    game.audio.play('se_tap', 0.2);
  });

  game.onRelease(function(x, y) {
    if (state !== S.PLAYING || !holding || ready > 0 || finished) return;
    holding = false;
    game.audio.play('se_tap', 0.1);
    resolveRelease(false);
  });

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });

  var demo = { t: 0, gx: CX, gy: H * 0.82, press: false, phase: 'idle' };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.6;
    if (cyc < dt || demo.t <= dt) { charge = 0; enteredSweet = false; }
    if (cyc < 1.9) {
      charge = cyc / RAMP;
      demo.press = true;
      demo.gy = H * 0.82 - Math.min(30, cyc * 20);
      if (charge >= LO && !enteredSweet) { enteredSweet = true; game.fx.popup('NICE', CX, LANE_Y - 160, { color: C.gold, size: 34 }); }
    } else if (cyc < 2.05) {
      demo.press = false;
      if (!demo.resolved) {
        demo.resolved = true;
        game.feedback.good(CX, LANE_Y, { text: 'GOOD', color: C.good });
        game.fx.burst(CX, LANE_Y, { color: C.ember, count: 18, speed: 360 });
        game.audio.play('se_break', 0.3);
      }
    } else {
      demo.resolved = false;
      charge = 0;
      demo.gy = H * 0.82;
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (charge === undefined) initGame();
      bg();
      stepDemo(dt);
      drawGate(0);
      drawUnit(W * 0.3, LANE_Y, 0, Math.floor(game.time.elapsed * 3));
      drawGauge(charge);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 46, C.white);
      txt('BEST ' + (game.best > 0 ? game.best + '%' : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.92, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.92, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawGate(ok ? 0 : 0.4);
      drawUnit(W * 0.3, LANE_Y, 0, 0);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      txt(Math.round(Math.min(1, resultFrac) * 100) + ' / ' + 100, W / 2, H * 0.13, 32, C.gold);
      if (!ok && resultFrac < LO) txt('あと少し!', W / 2, H * 0.18, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.92, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        var pct = Math.round(Math.min(1, resultFrac) * 100);
        if (ok) game.end.success(pct, { pct: pct, grade: grade }); else game.end.failure({ pct: pct });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      if (holding) {
        var frac = (game.time.elapsed - holdStart) / RAMP;
        charge = frac;
        if (frac >= LO && !enteredSweet) {
          enteredSweet = true;
          game.fx.popup('NICE', CX, LANE_Y - 160, { color: C.gold, size: 34 });
          game.audio.play('se_milestone', 0.3);
        }
        if (frac >= 1.0) {
          resolveRelease(true);
        }
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawGate(shake);
    drawUnit(W * 0.3, LANE_Y, holding ? Math.sin(game.time.elapsed * 18) * 3 : 0, Math.floor(game.time.elapsed * (holding ? 8 : 3)));
    if (!finished) drawGauge(charge);
    txt(Math.round(Math.min(1, charge) * 100) + ' / ' + 100, W / 2, H * 0.06, 32, C.white);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.42, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['C3', 0.4], ['C3', 0.4], ['G3', 0.4], ['C4', 0.8]], { tempo: 108, wave: 'square', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
