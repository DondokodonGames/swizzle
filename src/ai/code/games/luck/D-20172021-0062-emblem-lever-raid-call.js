// D-20172021-0062-emblem-lever-raid-call.js
// エンブレム・レバーレイドコール — からくりレバーで3つの紋章を止め、そろった数だけ演出上の拠点へ一度きりの急襲をかける
// 操作: 回転する紋章の列を、狙った紋章が中央の枠に来た瞬間にタップして止める。3列とも順番に止める
// 終わり: そろった紋章が2つ以上あれば急襲成功。3つとも別々なら失敗
// @mechanic: timing_one_shot
// @theme: emblem_lever_raid_call
// 世界観: 気ままな野伏せりの占い師が、からくり仕掛けの紋章レバーを狙いすまして止め、そろった紋章の力を借りて演出上のAI拠点へ一度きりの急襲を仕掛ける
// 残るもの: 正誤(CLEAR/GAME OVER) + そろった紋章数
// スタイル: 2000s ARCADE POP

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2000s ARCADE POP: 原色に近い高彩度、太い白フチ、派手なポップアップ演出
  var C = {
    bg: '#2a1030', bg2: '#4a1848', reel: '#1a0a20', reelEdge: '#ff3a8a',
    good: '#4dff9e', bad: '#ff3355', gold: '#ffd94d', white: '#ffffff', ink: '#150818',
    fort: '#5a4a3a', fortDark: '#3a2c20', flag: '#ff3a8a',
  };
  var SYMS = [
    { col: '#ff8a4a', frames: ['.#.', '###', '.#.'] },
    { col: '#5ad4ff', frames: ['###', '.#.', '###'] },
    { col: '#ffe14d', frames: ['#.#', '###', '#.#'] },
    { col: '#8aff6a', frames: ['.#.', '#.#', '.#.'] },
  ];

  var GAME_TITLE = 'EMBLEM RAID';
  var REEL_X = [W * 0.24, W * 0.5, W * 0.76];
  var REEL_Y = H * 0.42;
  var SLOT_H = 150;
  var SPEED0 = 3.3;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var FORT_SPR = ['#.#.#', '#####', '#...#', '#####'];

  function bg() {
    var pulse = 0.04 + 0.04 * Math.sin(game.time.elapsed * 1.3);
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    game.draw.rect(0, 0, W, H, '#ff3a8a', pulse * 0.3);
  }

  var reels, activeIdx, resultDone, matchCount, attackT, attackPhase, damageShown;
  var done, endWait, finished, ready, hitStop, shake;

  function initGame() {
    reels = [
      { phase: game.random(0, 4), speed: SPEED0, spinning: true, sym: -1 },
      { phase: game.random(0, 4), speed: SPEED0 + 0.4, spinning: false, sym: -1 },
      { phase: game.random(0, 4), speed: SPEED0 + 0.8, spinning: false, sym: -1 },
    ];
    activeIdx = 0; resultDone = false; matchCount = 0; attackT = 0; attackPhase = 'idle'; damageShown = false;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function symAtPhase(phase) { var n = SYMS.length; return ((Math.floor(phase) % n) + n) % n; }

  function stopReel(i) {
    if (i !== activeIdx || finished || done) return;
    reels[i].spinning = false;
    reels[i].sym = symAtPhase(reels[i].phase);
    hitStop = 0.06;
    var matchesFirst = i > 0 && reels[i].sym === reels[0].sym;
    if (i === 0 || matchesFirst) {
      game.feedback.good(REEL_X[i], REEL_Y, { text: 'STOP', color: SYMS[reels[i].sym].col });
    } else {
      game.feedback.bad(REEL_X[i], REEL_Y, { text: 'STOP' });
    }
    game.audio.play('se_tap', 0.3);
    game.fx.burst(REEL_X[i], REEL_Y, { color: SYMS[reels[i].sym].col, count: 14, speed: 300 });
    if (i < 2) { activeIdx = i + 1; reels[activeIdx].spinning = true; }
    else evaluateAndAttack();
  }

  function evaluateAndAttack() {
    var counts = [0, 0, 0, 0];
    for (var i = 0; i < 3; i++) counts[reels[i].sym]++;
    matchCount = Math.max(counts[0], counts[1], counts[2], counts[3]);
    ok = matchCount >= 2;
    attackPhase = 'charge'; attackT = 0;
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING && ready <= 0 && !finished) stopReel(activeIdx);
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function drawReels() {
    for (var i = 0; i < 3; i++) {
      game.draw.rect(REEL_X[i] - 90, REEL_Y - SLOT_H / 2, 180, SLOT_H, C.reel, 0.95);
      game.draw.rect(REEL_X[i] - 90, REEL_Y - SLOT_H / 2, 180, 6, i === activeIdx && !finished ? C.gold : C.reelEdge);
      game.draw.rect(REEL_X[i] - 90, REEL_Y + SLOT_H / 2 - 6, 180, 6, i === activeIdx && !finished ? C.gold : C.reelEdge);
      if (reels[i].sym >= 0) {
        var s2 = SYMS[reels[i].sym];
        game.draw.sprite(s2.frames, { '#': s2.col }, REEL_X[i], REEL_Y, 20, { anchor: 'center' });
      } else if (reels[i].spinning) {
        for (var k = -1; k <= 1; k++) {
          var ph = reels[i].phase + k * 0.5;
          var s = SYMS[symAtPhase(ph)];
          var yy = REEL_Y + k * SLOT_H * 0.5;
          game.draw.sprite(s.frames, { '#': s.col }, REEL_X[i], yy, 16, { anchor: 'center', alpha: k === 0 ? 1 : 0.4 });
        }
      } else {
        game.draw.circle(REEL_X[i], REEL_Y, 14, C.reelEdge, 0.5);
      }
    }
  }

  function drawFort() {
    var fx = W * 0.5, fy = H * 0.78;
    var shakeF = attackPhase === 'impact' ? Math.sin(game.time.elapsed * 40) * 10 : 0;
    game.draw.rect(fx - 160, fy - 60, 320, 110, C.fortDark, 0.9);
    game.draw.sprite(FORT_SPR, { '#': attackPhase === 'impact' && !ok ? '#ffffff' : C.fort }, fx + shakeF, fy - 10, 24, { anchor: 'center' });
    game.draw.rect(fx - 6, fy - 130, 12, 60, C.fort);
    game.draw.rect(fx - 6, fy - 130, 44, 28, C.flag);
    if (attackPhase === 'charge' || attackPhase === 'fly') {
      var t = Math.min(1, attackT / 0.6);
      var px = REEL_X[1] + (fx - REEL_X[1]) * t;
      var py = REEL_Y + (fy - 40 - REEL_Y) * t;
      game.draw.circle(px, py, 20 + t * 10, C.gold, 0.8);
    }
    if (attackPhase === 'impact' && !damageShown) {
      damageShown = true;
      shake = ok ? 0.3 : 0.15;
      game.fx.burst(fx, fy - 30, { color: ok ? C.good : C.bad, count: 24, speed: 400 });
      game.fx.popup(matchCount + ' MATCH', fx, fy - 160, { color: ok ? C.good : C.bad, size: 34 });
      game.audio.play(ok ? 'se_break' : 'se_bad', 0.4);
      hitStop = 0.3;
    }
  }

  function stepAttack(dt) {
    if (attackPhase === 'idle') return;
    attackT += dt;
    if (attackPhase === 'charge' && attackT > 0.15) attackPhase = 'fly';
    if (attackPhase === 'fly' && attackT > 0.6) { attackPhase = 'impact'; attackT = 0; }
    if (attackPhase === 'impact' && attackT > 0.5 && !finished) {
      finished = true; finish();
    }
  }

  var demo = { t: 0, gx: REEL_X[0], gy: REEL_Y, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 5.2;
    if (cyc < dt || demo.t <= dt) initGame();
    for (var i = 0; i < 3; i++) if (reels[i].spinning) reels[i].phase += reels[i].speed * dt;
    var target = REEL_X[activeIdx];
    demo.gx += (target - demo.gx) * Math.min(1, dt * 5);
    demo.gy = REEL_Y;
    if (!finished && attackPhase === 'idle' && cyc > 0.6 + activeIdx * 1.1 && cyc < 0.6 + activeIdx * 1.1 + 0.05) { stopReel(activeIdx); demo.press = true; }
    else demo.press = false;
    stepAttack(dt);
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (reels === undefined) initGame();
      bg();
      stepDemo(dt);
      drawFort();
      drawReels();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 38, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 20, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.95, 40, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.95, 26, C.white);
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawFort(); drawReels();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 44, ok ? C.good : C.bad);
      txt(matchCount + ' / 3', W / 2, H * 0.13, 26, C.gold);
      if (!ok) txt('あと1つ!', W / 2, H * 0.17, 22, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.95, 24, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(matchCount * 30, { match: matchCount });
        else game.end.failure({ match: matchCount });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      for (var i = 0; i < 3; i++) if (reels[i].spinning) reels[i].phase += reels[i].speed * dt;
      stepAttack(dt);
    }
    if (shake > 0) shake -= dt;

    bg();
    drawFort();
    drawReels();

    var stoppedN = 0;
    for (var si = 0; si < 3; si++) if (!reels[si].spinning) stoppedN++;
    txt(stoppedN + ' / 3', W / 2, H * 0.06, 30, C.white);
    var barW = W - 120;
    game.draw.rect(60, 150, barW, 16, C.ink, 0.5);
    game.draw.rect(60, 150, barW * (stoppedN / 3), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.62, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['C4', 0.15], ['E4', 0.15], ['G4', 0.15], ['C5', 0.15], ['G4', 0.25]], { tempo: 168, wave: 'square', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
