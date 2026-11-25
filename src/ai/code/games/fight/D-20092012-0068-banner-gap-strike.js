// D-20092012-0068-banner-gap-strike.js
// バナーギャップ・ストライク — 敵武将の構えが崩れる一瞬の隙だけタップして矢を放つ合戦
// 操作: 敵武将の旗が高く上がり隙の輪が光った一瞬だけタップして矢を放つ。旗が半端な高さで止まるフェイントでは押さない
// 終わり: 5本命中させれば成功。3回外す(輪を逃す/フェイントに釣られる)と失敗
// @mechanic: timing_window
// @theme: warlord_field_duel
// 世界観: 両軍がにらみ合う合戦場。敵武将は旗を上げて号令を出す一瞬だけ構えが崩れる。射手はその隙の輪が光った刹那だけ矢を放つ
// 残るもの: 正誤(CLEAR/GAME OVER) + 命中本数
// スタイル: PIXEL HD

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // PIXEL HD: 多色+光、パララックス3層、光源1つで陰影統一
  var C = {
    sky1: '#2a3a1a', sky2: '#141c0c', ridge: '#1c2812', field: '#3a4c22',
    enemy: '#8a3a2a', enemyDark: '#5a2418', ally: '#2a5a8a', allyDark: '#183a5c',
    flag: '#c94a2a', ringOpen: '#ffe23d', ringClosed: '#ffffff', ringFeint: '#ff8a5a',
    good: '#5dff8a', bad: '#ff4d5e', gold: '#ffe23d', white: '#f5f8ea', ink: '#0a1006',
  };

  var GAME_TITLE = 'BANNER GAP';
  var WIN = 5, LOSE = 3;
  var TELE_DUR = 0.5, FEINT_DUR = 0.32, RECOVER_DUR = 0.3;
  var WIN_BASE = 0.40, WIN_MIN = 0.20;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var hits, misses, phase, phaseT, feint, flagH, ringLit, curWin;
  var done, endWait, finished, ready, hitStop, shake;

  var CX = W / 2, ENEMY_Y = H * 0.32, ALLY_Y = H * 0.60, RING_Y = H * 0.44;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var GEN_SPR = ['.###.', '#####', '#o.o#', '#####', '.#.#.'];

  function fieldBg() {
    game.draw.gradient(0, H, [[0, C.sky1], [0.42, C.field], [1, C.ridge]]);
    game.draw.rect(0, 0, W, H, '#ffffff', 0.03 + 0.03 * Math.sin(game.time.elapsed * 1.3));
    for (var i = 0; i < 7; i++) game.draw.rect(0, H * 0.5 + i * 40, W, 3, C.ridge, 0.3);
  }

  function drawEnemy(fh, lit, isFeint) {
    var bob = Math.sin(game.time.elapsed * 2.5) * 8;
    game.draw.sprite(GEN_SPR, { '#': C.enemyDark, 'o': C.bad }, CX, ENEMY_Y + bob, 22, { anchor: 'center' });
    var poleY = ENEMY_Y + bob - 60;
    var flagLift = 40 + fh * 220;
    game.draw.line(CX - 30, poleY, CX - 30, poleY - flagLift, C.enemyDark, 8);
    game.draw.rect(CX - 30, poleY - flagLift, 70, 40, isFeint ? C.ringFeint : C.flag, 0.95);
    var ringCol = lit ? C.ringOpen : (fh > 0 ? C.ringFeint : C.ringClosed);
    game.draw.circle(CX, RING_Y, 64, ringCol, lit ? 0.9 : 0.5);
    game.draw.line(CX - 64, RING_Y, CX + 64, RING_Y, C.white, lit ? 8 : 4);
  }

  function drawAlly(braced) {
    var bob = Math.sin(game.time.elapsed * 2.5 + Math.PI) * 8;
    game.draw.circle(CX, ALLY_Y + bob, 90, C.ally, 0.95);
    game.draw.circle(CX, ALLY_Y + bob, 90, C.allyDark, 0.0);
    game.draw.sprite(['.#.', '###', '.#.'], { '#': C.white }, CX, ALLY_Y + bob - 10, 14, { anchor: 'center' });
    if (braced) game.draw.line(CX - 90, ALLY_Y + bob - 120, CX + 20, ALLY_Y + bob - 220, C.allyDark, 12);
  }

  function drawPips() {
    for (var i = 0; i < WIN; i++) {
      var x = CX - (WIN - 1) * 26 + i * 52;
      game.draw.circle(x, H * 0.09, 16, i < hits ? C.gold : '#ffffff40', 1);
    }
    for (var j = 0; j < LOSE; j++) {
      var mx = CX - (LOSE - 1) * 30 + j * 60;
      game.draw.circle(mx, H * 0.90, 15, j < misses ? C.bad : '#ffffff30', 1);
    }
  }

  function startRep() {
    var idx = hits + misses;
    feint = idx >= 2 && Math.random() < Math.min(0.5, 0.12 + 0.09 * idx);
    curWin = Math.max(WIN_MIN, WIN_BASE - 0.03 * hits);
    phase = 'telegraph'; phaseT = TELE_DUR; flagH = 0; ringLit = false;
  }

  function initGame() {
    hits = 0; misses = 0; finished = false; done = false; endWait = 0;
    ready = 0.8; hitStop = 0; shake = 0;
    startRep();
  }

  function registerMiss() {
    misses++;
    hitStop = 0.3; shake = 0.22;
    game.feedback.bad(CX, RING_Y, { text: 'MISS' });
    game.audio.play('se_bad', 0.35);
    if (misses >= LOSE) { ok = false; finished = true; finish(); }
    else { phase = 'recover'; phaseT = RECOVER_DUR; }
  }
  function registerHit() {
    hits++;
    hitStop = 0.2; ringLit = true;
    game.feedback.good(CX, RING_Y, { text: hits >= WIN ? 'PERFECT' : 'HIT', color: C.good });
    game.fx.burst(CX, RING_Y, { color: C.gold, count: 16, speed: 360 });
    game.audio.play('se_break', 0.3);
    if (hits === Math.ceil(WIN / 2)) { game.fx.popup(hits + ' / ' + WIN, CX, H * 0.18, { color: C.gold, size: 42 }); game.audio.play('se_milestone', 0.4); }
    if (hits >= WIN) { ok = true; finished = true; finish(); }
    else { phase = 'recover'; phaseT = RECOVER_DUR; }
  }
  function resolveTap() {
    if (done || ready > 0 || hitStop > 0 || finished) return;
    game.audio.play('se_tap', 0.06);
    if (phase === 'window') registerHit();
    else if (phase === 'feintHold') registerMiss();
    else registerMiss();
  }

  function stepRound(dt) {
    phaseT -= dt;
    if (phase === 'telegraph') {
      flagH = Math.min(1, 1 - phaseT / TELE_DUR);
      ringLit = false;
      if (phaseT <= 0) {
        if (feint) { phase = 'feintHold'; phaseT = FEINT_DUR; }
        else { phase = 'window'; phaseT = curWin; ringLit = true; game.audio.tone(760, 0.08, { wave: 'square', volume: 0.12 }); }
      }
    } else if (phase === 'feintHold') {
      flagH = 1;
      if (phaseT <= 0) { phase = 'recover'; phaseT = RECOVER_DUR; }
    } else if (phase === 'window') {
      flagH = 1;
      if (phaseT <= 0) { ringLit = false; registerMiss(); }
    } else if (phase === 'recover') {
      flagH = Math.max(0, phaseT / RECOVER_DUR);
      ringLit = false;
      if (phaseT <= 0 && !finished) startRep();
    }
  }

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; demo.press = false; return; }
    resolveTap();
  });

  var demo = { t: 0, gx: CX, gy: H * 0.92, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.2;
    if (cyc < dt || demo.t <= dt) { hits = 0; misses = 0; }
    if (cyc < 0.5) { phase = 'telegraph'; flagH = cyc / 0.5; ringLit = false; }
    else if (cyc < 0.78) { phase = 'window'; flagH = 1; ringLit = true; }
    else if (cyc < 1.08) { phase = 'recover'; flagH = Math.max(0, 1 - (cyc - 0.78) / 0.30); ringLit = false; }
    else if (cyc < 1.58) { phase = 'telegraph'; flagH = (cyc - 1.08) / 0.5; ringLit = false; }
    else if (cyc < 1.90) { phase = 'feintHold'; flagH = 1; ringLit = false; }
    else if (cyc < 2.20) { phase = 'recover'; flagH = Math.max(0, 1 - (cyc - 1.90) / 0.30); ringLit = false; }
    else { phase = 'recover'; flagH = 0; ringLit = false; }

    if (cyc > 0.55 && cyc < 0.66) {
      demo.press = true;
      if (cyc - dt <= 0.55) { game.feedback.good(CX, RING_Y, { text: 'HIT', color: C.good }); game.fx.burst(CX, RING_Y, { color: C.gold, count: 12, speed: 320 }); }
    } else if (cyc > 1.68 && cyc < 1.80) {
      demo.press = true;
      if (cyc - dt <= 1.68) { game.feedback.bad(CX, RING_Y, { text: 'MISS' }); }
    } else demo.press = false;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (hits === undefined) initGame();
      fieldBg();
      stepDemo(dt);
      drawEnemy(flagH, ringLit, phase === 'feintHold');
      drawAlly(flagH > 0.3);
      drawPips();
      game.draw.hand(demo.gx + Math.cos(game.time.elapsed * 2.5) * 34, demo.gy + Math.sin(game.time.elapsed * 2.5) * 34, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.06, 44, C.white);
      txt('BEST ' + (game.best > 0 ? game.best + ' HITS' : '-'), W / 2, H * 0.135, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.96, 40, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.96, 28, C.white);
      return;
    }

    if (state === S.RESULT) {
      fieldBg();
      drawEnemy(0, false, false);
      drawAlly(false);
      drawPips();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.06, 50, ok ? C.good : C.bad);
      txt(hits + ' / ' + WIN, W / 2, H * 0.135, 30, C.white);
      if (!ok && hits === WIN - 1) txt('あと1本!', W / 2, H * 0.19, 28, C.gold);
      if (ok && (game.best === 0 || hits > game.best)) txt('NEW RECORD', W / 2, H * 0.19, 28, C.gold);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.96, 24, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success({ hits: hits, misses: misses });
        else game.end.failure({ hits: hits, misses: misses });
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

    fieldBg();
    drawEnemy(flagH || 0, ringLit, phase === 'feintHold');
    drawAlly((flagH || 0) > 0.3);
    drawPips();

    txt(hits + ' / ' + WIN, W / 2, H * 0.06, 34, C.white);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.50, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['D4', 0.4], ['F4', 0.4], ['A4', 0.4], ['D5', 0.6]], { tempo: 118, wave: 'triangle', volume: 0.06, loop: true, bass: [['D3', 0.6]], bassWave: 'sine', bassVolume: 0.05 });
    state = S.ATTRACT;
    initGame();
  });
})(game);
