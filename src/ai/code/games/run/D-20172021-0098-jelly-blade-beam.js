// D-20172021-0098-jelly-blade-beam.js
// ジェリー・ブレードビーム — 揺れる細道を進むゼリー生物が、左右から振られる刃を見て逆側へ体重を寄せてかわす
// 操作: 刃が来る側の警告を見て、反対側の画面をタップして重心を寄せ振り下ろしをかわす
// 終わり: 体積(残量)を1以上保ったままビームを渡り切れば成功。体積が尽きれば失敗
// @mechanic: balance
// @theme: jelly_blade_beam_crossing
// 世界観: 研究施設の細道を渡るゼリー状の生体標本が、左右から交互に振り下ろされる刃を体重移動でかわしながら体積を保って対岸を目指す
// 残るもの: 正誤(CLEAR/GAME OVER) + 保った体積
// スタイル: 80s NEON

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 80s NEON: 黒背景に蛍光3色、太いグロー輪郭
  var C = {
    bg: '#0a0018', bg2: '#1a0030', beam: '#2a1a40', beamEdge: '#00fff0',
    jelly: '#ff2df0', jellyDark: '#a012a0', blade: '#e8e8ff', bladeWarn: '#ff2050',
    good: '#00ffab', bad: '#ff2050', gold: '#ffe14d', white: '#ffffff', ink: '#100018',
  };

  var GAME_TITLE = 'BLADE BEAM';
  var BLOB_Y = H * 0.6;
  var MAX_VOL = 3;
  var WAVES = 6;
  var WAVE_TRAVEL = 1.55;
  var TELE_LEAD = 0.6;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var JELLY_F = [
    ['.####.', '######', '######', '.####.'],
    ['..##..', '.####.', '.####.', '..##..'],
  ];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    var pulse = 0.05 + 0.05 * Math.sin(game.time.elapsed * 1.2);
    game.draw.rect(0, 0, W, H, C.beamEdge, pulse * 0.25);
    game.draw.rect(W * 0.15, BLOB_Y - 20, W * 0.7, 40, C.beam);
    game.draw.rect(W * 0.15, BLOB_Y - 20, W * 0.7, 4, C.beamEdge, 0.6);
    game.draw.rect(W * 0.15, BLOB_Y + 16, W * 0.7, 4, C.beamEdge, 0.6);
  }

  var vol, leanDir, waveIdx, waveT, bladeSide, chosenDir, resolved, telegraphOn;
  var done, endWait, finished, ready, hitStop, shake, milestoneShown;

  function newWave() {
    bladeSide = Math.random() < 0.5 ? -1 : 1;
    waveT = 0; resolved = false; telegraphOn = false; chosenDir = 0;
  }

  function initGame() {
    vol = MAX_VOL; leanDir = 0; waveIdx = 0; milestoneShown = false;
    newWave();
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function resolveWave() {
    if (resolved) return;
    resolved = true;
    var avoided = chosenDir === -bladeSide;
    if (avoided) {
      game.feedback.good(W / 2 + bladeSide * 220, BLOB_Y, { text: 'GOOD', color: C.good });
      game.audio.play('se_good', 0.4);
      if (waveIdx === Math.floor(WAVES / 2) && !milestoneShown) {
        milestoneShown = true;
        game.fx.popup('NICE', W / 2, BLOB_Y - 220, { color: C.gold, size: 36 });
        game.audio.play('se_milestone', 0.35);
      }
    } else {
      vol--;
      hitStop = 0.32; shake = 0.28;
      game.feedback.bad(W / 2 + bladeSide * 220, BLOB_Y, { text: 'MISS' });
      game.audio.play('se_bad', 0.4);
    }
  }

  function advance(dt) {
    waveT += dt;
    if (!telegraphOn && waveT >= WAVE_TRAVEL - TELE_LEAD) telegraphOn = true;
    if (waveT >= WAVE_TRAVEL) {
      if (!resolved) resolveWave();
      waveIdx++;
      if (vol <= 0) {
        ok = false; finished = true; hitStop = 0.3;
        game.audio.play('se_failure', 0.4);
        finish();
        return;
      }
      if (waveIdx >= WAVES) {
        ok = vol >= 1; finished = true; hitStop = 0.25;
        if (ok) { game.fx.burst(W / 2, BLOB_Y, { color: C.gold, count: 22, speed: 400 }); game.audio.play('se_success', 0.5); }
        else game.audio.play('se_failure', 0.4);
        finish();
        return;
      }
      newWave();
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING && ready <= 0 && !finished) {
      chosenDir = x < W / 2 ? -1 : 1;
      leanDir = chosenDir;
      game.audio.play('se_tap', 0.15);
      if (telegraphOn) resolveWave();
    }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  function drawScene(v, lean, wT, bSide, showTel) {
    var prog = wT / WAVE_TRAVEL;
    var bladeY = BLOB_Y - 460 + prog * 460;
    var bx = W / 2 + bSide * 220;
    var flash = Math.floor(game.time.elapsed * 9) % 2 === 0;
    if (showTel) {
      game.draw.circle(bx, BLOB_Y - 40, 36, flash ? C.bladeWarn : C.blade, 0.9);
    }
    game.draw.line(bx, bladeY, bx, bladeY + 90, C.blade, 14);
    game.draw.circle(bx, bladeY, 10, C.bladeWarn);
    var jx = W / 2 + lean * 90;
    var f = Math.floor(game.time.elapsed * 6) % 2;
    game.draw.sprite(JELLY_F[f], { '#': C.jelly }, jx, BLOB_Y - 30 + Math.sin(game.time.elapsed * 5) * 4, 16, { anchor: 'center' });
    for (var i = 0; i < MAX_VOL; i++) {
      game.draw.circle(W / 2 - (MAX_VOL - 1) * 26 + i * 52, H * 0.86, 18, i < v ? C.jelly : '#332244');
    }
  }

  var demo = { t: 0, gx: W * 0.3, gy: H * 0.9, press: false };
  function resetDemo() { initGame(); }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 8.5;
    if (cyc < dt || demo.t <= dt) resetDemo();
    if (ready > 0) { ready -= dt; if (ready < 0) ready = 0; }
    else if (!finished) advance(dt);
    var wantDir = -bladeSide;
    var tx = wantDir < 0 ? W * 0.28 : W * 0.72;
    demo.gx += (tx - demo.gx) * Math.min(1, dt * 6);
    demo.gy = H * 0.9;
    demo.press = telegraphOn && !resolved;
    if (telegraphOn && !resolved && Math.abs(demo.gx - tx) < 20) {
      chosenDir = wantDir; leanDir = wantDir; resolveWave();
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (vol === undefined) initGame();
      stepDemo(dt);
      bg();
      drawScene(vol, leanDir, waveT, bladeSide, telegraphOn);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.09, 44, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.13, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.96, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.96, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawScene(vol, leanDir, waveT, bladeSide, false);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.09, 48, ok ? C.good : C.bad);
      txt(vol + ' / ' + MAX_VOL, W / 2, H * 0.14, 28, C.gold);
      if (!ok) txt('あと1個!', W / 2, H * 0.18, 24, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.96, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(vol, { volume: vol, waves: waveIdx });
        else game.end.failure({ volume: vol, waves: waveIdx });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      advance(dt);
    }
    if (shake > 0) shake -= dt;

    bg();
    drawScene(vol, leanDir, waveT, bladeSide, telegraphOn);

    txt(waveIdx + ' / ' + WAVES, W / 2, H * 0.06, 30, C.white);
    var pct = waveIdx / WAVES;
    game.draw.rect(60, 150, W - 120, 16, '#00000055', 1);
    game.draw.rect(60, 150, (W - 120) * pct, 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['D4', 0.3], ['F4', 0.3], ['A4', 0.3], ['D5', 0.6]], { tempo: 130, wave: 'sawtooth', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
