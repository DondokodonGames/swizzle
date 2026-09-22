// K-DS-0036-forge-hammer-swing.js
// フォージハンマー — 熱した鉄を、振り上げた大槌のタイミングを合わせて打つ
// 操作: 画面を押し続けて大槌を振り上げ、狙いの力加減のところで指を離して振り下ろす
// 終わり: 規定回数(5回)を狙い通りに打てれば成功。力加減を外せば失敗
// @mechanic: hold_charge
// @theme: forge_hammer_strike
// 世界観: 鍛冶場の職人が、真っ赤に熱した鉄を大槌で打つ。振り上げる強さが狙いの帯にぴったり合った時だけ良い一打になる
// 残るもの: 正誤(CLEAR/GAME OVER) + 決めた回数
// スタイル: SKEUOMORPH

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // SKEUOMORPH: 木目・金属の質感を面の塗り分けとハイライト線で表現
  var C = {
    bg: '#2a1c14', bg2: '#1a1008', anvilDark: '#3a3a3e', anvilLite: '#6a6a70',
    wood: '#5a3a24', woodLite: '#7a5636', ember: '#ff6a2a', emberHot: '#ffd23a',
    zone: '#ffb020', zoneGlow: '#3a2408', good: '#4dff8a', bad: '#ff4d5e',
    gold: '#ffd400', white: '#f4ece0', ink: '#0e0806',
  };

  var GAME_TITLE = 'FORGE HAMMER';
  var TOTAL = 5;
  var CX = W * 0.5;
  var GAUGE_X0 = W * 0.22, GAUGE_X1 = W * 0.78, GAUGE_Y = H * 0.60;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var struck, done, endWait, finished;
  var ready, hitStop, shake;
  var round, holding, charge, zoneLo, zoneHi, raiseTime, resolved, sparkT;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var SMITH_UP = ['..#..', '.###.', '#####', '..#..', '.#.#.'];
  var SMITH_DOWN = ['..#..', '.###.', '..#..', '#####', '.#.#.'];

  function newZone(r) {
    var width = Math.max(0.13, 0.26 - r * 0.025);
    var center = 0.55 + Math.random() * 0.3;
    return { lo: Math.max(0.35, center - width / 2), hi: Math.min(0.98, center + width / 2) };
  }

  function forgeBg() {
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    for (var i = 0; i < 4; i++) game.draw.rect(80 + i * 300, H * 0.1, 40, H * 0.7, '#00000022');
    game.draw.rect(CX - 190, H * 0.78, 380, 60, C.anvilDark);
    game.draw.rect(CX - 150, H * 0.72, 300, 40, C.anvilLite);
    game.draw.circle(CX, H * 0.70, 34, sparkT > 0 ? C.emberHot : C.ember, 0.9);
  }

  function initGame() {
    struck = 0; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
    round = 0; holding = false; charge = 0; resolved = false; sparkT = 0;
    raiseTime = 1.0;
    var z = newZone(round); zoneLo = z.lo; zoneHi = z.hi;
  }

  function evalRelease() {
    if (resolved || ready > 0 || done || finished) return;
    resolved = true;
    holding = false;
    var good = charge >= zoneLo && charge <= zoneHi;
    hitStop = good ? 0.12 : 0.32;
    sparkT = 0.25;
    if (good) {
      struck++;
      game.feedback.good(CX, H * 0.70, { text: 'HIT', color: C.good });
      game.fx.burst(CX, H * 0.70, { color: C.emberHot, count: 16, speed: 360 });
      game.audio.play('se_break', 0.4);
      if (struck === Math.ceil(TOTAL / 2)) game.fx.popup('HALFWAY!', CX, H * 0.44, { color: C.gold, size: 40 });
    } else {
      game.feedback.bad(CX, H * 0.70, { text: charge > zoneHi ? 'MISS' : 'MISS' });
      shake = 0.28;
      game.audio.play('se_bad', 0.4);
    }
    if (!good) { ok = false; finished = true; finish(); return; }
    if (struck >= TOTAL) { ok = true; finished = true; finish(); return; }
    round++;
    raiseTime = Math.max(0.6, 1.0 - round * 0.06);
    var z = newZone(round); zoneLo = z.lo; zoneHi = z.hi;
    charge = 0;
  }

  game.onPress(function(x, y) {
    if (state === S.PLAYING && ready <= 0 && hitStop <= 0 && !finished && !done) {
      holding = true; resolved = false;
      game.audio.play('se_tap', 0.15);
    }
  });
  game.onRelease(function(x, y) {
    if (state === S.PLAYING) evalRelease();
  });

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function drawGauge(c, lo, hi, over) {
    game.draw.rect(GAUGE_X0, GAUGE_Y, GAUGE_X1 - GAUGE_X0, 26, C.anvilDark);
    game.draw.rect(GAUGE_X0 + (GAUGE_X1 - GAUGE_X0) * lo, GAUGE_Y, (GAUGE_X1 - GAUGE_X0) * (hi - lo), 26, C.zone, 0.85);
    var mx = GAUGE_X0 + (GAUGE_X1 - GAUGE_X0) * Math.min(1, c);
    game.draw.rect(mx - 6, GAUGE_Y - 10, 12, 46, over ? C.bad : C.white);
  }

  function drawSmith(raised) {
    game.draw.sprite(raised ? SMITH_UP : SMITH_DOWN, { '#': C.woodLite }, CX - 200, H * 0.62, 30, { anchor: 'center' });
    var hy = raised ? H * 0.40 : H * 0.66;
    game.draw.line(CX - 150, H * 0.60, CX - 60, hy, C.wood, 14);
    game.draw.rect(CX - 100, hy - 16, 80, 32, C.anvilDark);
  }

  var demo = { t: 0, gx: CX, gy: H * 0.86, press: false, c: 0, holding: false, lo: 0.55, hi: 0.72, phase: 'wait', phaseT: 0.5 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.4;
    if (cyc < dt || demo.t <= dt) { demo.phase = 'wait'; demo.phaseT = 0.4; demo.c = 0; demo.holding = false; sparkT = 0; }
    demo.phaseT -= dt;
    if (demo.phase === 'wait' && demo.phaseT <= 0) {
      demo.holding = true; demo.press = true; demo.phase = 'raise';
      demo.target = (demo.lo + demo.hi) / 2;
    } else if (demo.phase === 'raise') {
      demo.c = Math.min(1, demo.c + dt / raiseTime);
      demo.gy = H * 0.86 - demo.c * 260;
      if (demo.c >= demo.target) { demo.phase = 'strike'; demo.press = false; demo.holding = false; sparkT = 0.25; }
    } else if (demo.phase === 'strike') {
      demo.gy += (H * 0.86 - demo.gy) * Math.min(1, dt * 8);
    }
    charge = demo.c; holding = demo.holding; zoneLo = demo.lo; zoneHi = demo.hi;
    if (sparkT > 0) sparkT -= dt;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (charge === undefined) initGame();
      forgeBg();
      stepDemo(dt);
      drawSmith(demo.c > 0.3);
      drawGauge(charge, zoneLo, zoneHi, false);
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
      forgeBg();
      drawSmith(false);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      txt(struck + ' / ' + TOTAL, W / 2, H * 0.13, 32, C.gold);
      if (!ok) txt('あと' + (TOTAL - struck) + '回!', W / 2, H * 0.18, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(struck, { struck: struck, total: TOTAL });
        else game.end.failure({ struck: struck, total: TOTAL });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished && holding) {
      charge += dt / raiseTime;
      if (charge >= 1.15) { evalRelease(); }
    }
    if (sparkT > 0) sparkT -= dt;
    if (shake > 0) shake -= dt;

    forgeBg();
    drawSmith(holding && charge > 0.3);
    if (!finished) drawGauge(charge, zoneLo, zoneHi, charge > 1);

    txt(struck + ' / ' + TOTAL, W / 2, H * 0.06, 32, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.anvilDark);
    game.draw.rect(60, 150, (W - 120) * (struck / TOTAL), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.30, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['C3', 0.25], ['C3', 0.25], ['G3', 0.5], ['E3', 0.5]], { tempo: 100, wave: 'square', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
