// I-Wii-0025-twin-bell-strike.js
// ツインベルストライク — 山あいの鐘楼で左右の鐘を合図と同時に両手で打ち鳴らす
// 操作: 光る左右のパッドを、合図と同時に2本指でほぼ同時にタップする
// 終わり: 5回中4回以上成功でCLEAR。3回以下の成功でGAME OVER
// @mechanic: pinch_zone
// @theme: twin_bell_tower
// 世界観: 山あいの鐘楼で、鐘打ち役が両手のばちで左右の鐘を同時に打つ。合図とずれると音が乱れ失格になる
// 残るもの: 正誤(CLEAR/GAME OVER) + 成功打数
// スタイル: 1BIT INK

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 1BIT INK: 紙とインクの2色主体、朱の落款だけ差し色
  var C = {
    bg: '#e8e3d4', bg2: '#d8d2bd', ink: '#181510', rope: '#6a5e46',
    accent: '#bf3327', good: '#2f6b4a', bad: '#bf3327', gold: '#c99a2e', paper: '#f3efe0',
  };

  var GAME_TITLE = 'BELL STRIKE';
  var ROUNDS = 5;
  var WIN_HITS = 4;
  var SIMUL_TOL = 0.26;
  var PAD_R = 150;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var leftPad = { x: W * 0.27, y: H * 0.80 };
  var rightPad = { x: W * 0.73, y: H * 0.80 };
  var leftBell = { x: W * 0.27, y: H * 0.32 };
  var rightBell = { x: W * 0.73, y: H * 0.32 };

  var phase, phaseT, telegraphDur, activeDur, roundIdx, hits, misses, roundResolved;
  var leftDown, rightDown, leftDownT, rightDownT, flashL, flashR, flashGood;
  var done, endWait, finished, ready, hitStop, shake;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var BELL_A = ['..###..', '.#####.', '#######', '###o###'];
  var BELL_B = ['.###...', '.#####.', '#######', '.##o###'];

  function scene() {
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    for (var i = 0; i < 5; i++) {
      var my = H * (0.52 + i * 0.03);
      game.draw.rect(0, my, W, 4, C.ink, 0.06);
    }
    game.draw.rect(0, H * 0.86, W, H * 0.14, C.ink, 0.08);
  }

  function bell(b, swing, glow, flash) {
    game.draw.line(b.x, H * 0.10, b.x, b.y - 60, C.rope, 6);
    var frame = swing ? BELL_B : BELL_A;
    if (flash > 0) {
      game.draw.circle(b.x, b.y, 96 + flash * 30, C.gold, 0.35 * flash);
    }
    if (glow > 0) game.draw.circle(b.x, b.y, 90, C.accent, 0.18 * glow);
    game.draw.sprite(frame, { '#': C.ink, 'o': C.gold }, b.x, b.y, 14, { anchor: 'center' });
  }

  function pad(p, pulse, down, flashColor) {
    game.draw.circle(p.x, p.y, PAD_R + 14, C.ink, 0.08);
    game.draw.circle(p.x, p.y, PAD_R, down ? C.gold : C.paper, down ? 0.9 : 0.7);
    if (pulse > 0) game.draw.circle(p.x, p.y, PAD_R * (0.7 + pulse * 0.5), C.accent, 0.30 * pulse);
    if (flashColor) game.draw.circle(p.x, p.y, PAD_R + 20, flashColor, 0.4);
    game.draw.circle(p.x, p.y, PAD_R, 'transparent', 0);
    game.draw.line(p.x - PAD_R * 0.5, p.y, p.x + PAD_R * 0.5, p.y, C.ink, 4);
    game.draw.line(p.x, p.y - PAD_R * 0.5, p.x, p.y + PAD_R * 0.5, C.ink, 4);
  }

  function newRound() {
    phase = 'telegraph';
    telegraphDur = 0.45 + game.random(0, 0.3);
    activeDur = 0.40 + game.random(0, 0.15);
    phaseT = telegraphDur;
    roundResolved = false;
    leftDown = false; rightDown = false; leftDownT = 0; rightDownT = 0;
    flashL = 0; flashR = 0; flashGood = 0;
  }

  function initGame() {
    roundIdx = 0; hits = 0; misses = 0;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
    newRound();
  }

  function resolveRound(success) {
    roundResolved = true;
    hitStop = 0.12;
    if (success) {
      hits++;
      flashGood = 1;
      game.feedback.good((leftPad.x + rightPad.x) / 2, leftPad.y, { text: 'GOOD', color: C.good });
      game.fx.burst(leftBell.x, leftBell.y, { color: C.gold, count: 10, speed: 260 });
      game.fx.burst(rightBell.x, rightBell.y, { color: C.gold, count: 10, speed: 260 });
      game.audio.play('se_good', 0.35);
      if (hits === 3) game.fx.popup('NICE', W / 2, H * 0.20, { color: C.gold, size: 40 }), game.audio.play('se_milestone', 0.4);
    } else {
      misses++;
      flashL = 1; flashR = 1;
      game.feedback.bad((leftPad.x + rightPad.x) / 2, leftPad.y, { text: 'MISS' });
      shake = 0.16;
      game.audio.play('se_bad', 0.35);
    }
  }

  function tryResolve() {
    if (roundResolved || phase !== 'active') return;
    if (leftDown && rightDown) {
      var gap = Math.abs(leftDownT - rightDownT);
      resolveRound(gap <= SIMUL_TOL);
    }
  }

  function press(x, y) {
    if (state !== S.PLAYING || done || ready > 0 || finished || phase !== 'active' || roundResolved) return;
    game.audio.play('se_tap', 0.12);
    var dl = Math.hypot(x - leftPad.x, y - leftPad.y);
    var dr = Math.hypot(x - rightPad.x, y - rightPad.y);
    if (dl <= PAD_R && !leftDown) { leftDown = true; leftDownT = game.time.elapsed; tryResolve(); }
    else if (dr <= PAD_R && !rightDown) { rightDown = true; rightDownT = game.time.elapsed; tryResolve(); }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function(x, y, id) { press(x, y); });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    ok = hits >= WIN_HITS;
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function stepRound(dt) {
    if (hitStop > 0) { hitStop -= dt; return; }
    phaseT -= dt;
    if (flashL > 0) flashL -= dt * 3;
    if (flashR > 0) flashR -= dt * 3;
    if (flashGood > 0) flashGood -= dt * 3;
    if (phase === 'telegraph') {
      if (phaseT <= 0.15 && phaseT + dt > 0.15) game.audio.tone('A5', 0.09, { wave: 'sine', volume: 0.22 });
      if (phaseT <= 0) { phase = 'active'; phaseT = activeDur; game.audio.tone('E6', 0.06, { wave: 'square', volume: 0.2 }); }
    } else if (phase === 'active') {
      if (!roundResolved && phaseT <= 0) { resolveRound(false); }
      if (roundResolved && phaseT <= -0.25) {
        roundIdx++;
        if (roundIdx >= ROUNDS) { finished = true; finish(); }
        else newRound();
      }
    }
  }

  var demo = { t: 0, gx: leftPad.x, gy: leftPad.y, hx: rightPad.x, hy: rightPad.y, press: false, fail: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.4;
    if (cyc < dt || demo.t <= dt) {
      newRound();
      demo.fail = false;
    }
    if (cyc >= 2.2 && cyc - dt < 2.2) { newRound(); demo.fail = true; }
    stepRoundDemo(dt, demo.fail);
    var atLeft = phase === 'active' && phaseT < activeDur - 0.05;
    if (demo.fail) {
      demo.gx = atLeft ? leftPad.x : (leftPad.x + (leftPad.x - leftPad.x));
      demo.press = atLeft;
      demo.hx = rightPad.x; demo.hy = rightPad.y;
      demo.gy = leftPad.y;
    } else {
      demo.gx = leftPad.x; demo.gy = leftPad.y; demo.hx = rightPad.x; demo.hy = rightPad.y;
      demo.press = phase === 'active' && phaseT < activeDur - 0.05;
    }
  }
  function stepRoundDemo(dt, fail) {
    if (hitStop > 0) { hitStop -= dt; return; }
    phaseT -= dt;
    if (flashL > 0) flashL -= dt * 3;
    if (flashR > 0) flashR -= dt * 3;
    if (flashGood > 0) flashGood -= dt * 3;
    if (phase === 'telegraph' && phaseT <= 0) { phase = 'active'; phaseT = activeDur; }
    else if (phase === 'active' && !roundResolved) {
      var trigger = fail ? phaseT < activeDur - 0.30 : phaseT < activeDur - 0.18;
      if (trigger) {
        if (fail) { leftDown = true; leftDownT = game.time.elapsed; rightDown = false; if (phaseT <= 0) resolveRound(false); }
        else { leftDown = true; rightDown = true; leftDownT = game.time.elapsed; rightDownT = game.time.elapsed; resolveRound(true); }
      }
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (roundIdx === undefined) initGame();
      scene();
      stepDemo(dt);
      var sw = Math.floor(game.time.elapsed * 3) % 2 === 0;
      bell(leftBell, sw, phase === 'telegraph' ? (1 - phaseT / telegraphDur) : 0, flashL || flashGood);
      bell(rightBell, !sw, phase === 'telegraph' ? (1 - phaseT / telegraphDur) : 0, flashR || flashGood);
      pad(leftPad, phase === 'telegraph' ? (1 - phaseT / telegraphDur) : 0, demo.press, flashL > 0 ? C.bad : (flashGood > 0 ? C.gold : null));
      pad(rightPad, phase === 'telegraph' ? (1 - phaseT / telegraphDur) : 0, demo.press && !demo.fail, flashR > 0 ? C.bad : (flashGood > 0 ? C.gold : null));
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 14 });
      game.draw.hand(demo.hx, demo.hy, { press: demo.press && !demo.fail, scale: 14 });
      txt(GAME_TITLE, W / 2, H * 0.08, 46, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 24, C.accent);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.accent);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 28, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      scene();
      bell(leftBell, false, 0, 0); bell(rightBell, true, 0, 0);
      pad(leftPad, 0, false, null); pad(rightPad, 0, false, null);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      txt(hits + ' / ' + ROUNDS, W / 2, H * 0.13, 34, C.gold);
      if (!ok && hits === WIN_HITS - 1) txt('あと1回!', W / 2, H * 0.18, 28, C.accent);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(hits, { hits: hits, misses: misses });
        else game.end.failure({ hits: hits, misses: misses });
      }
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      stepRound(dt);
    }
    if (shake > 0) shake -= dt;

    scene();
    var sw2 = Math.floor(game.time.elapsed * 3) % 2 === 0;
    bell(leftBell, sw2, phase === 'telegraph' ? (1 - phaseT / telegraphDur) : 0, flashL || flashGood);
    bell(rightBell, !sw2, phase === 'telegraph' ? (1 - phaseT / telegraphDur) : 0, flashR || flashGood);
    pad(leftPad, phase === 'telegraph' ? (1 - phaseT / telegraphDur) : 0, leftDown, flashL > 0 ? C.bad : (flashGood > 0 ? C.gold : null));
    pad(rightPad, phase === 'telegraph' ? (1 - phaseT / telegraphDur) : 0, rightDown, flashR > 0 ? C.bad : (flashGood > 0 ? C.gold : null));

    game.draw.rect(60, 40, W - 120, 18, C.ink, 0.15);
    game.draw.rect(60, 40, (W - 120) * (roundIdx / ROUNDS), 18, C.gold);
    txt(hits + ' / ' + ROUNDS, W / 2, 104, 30, C.ink);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.50, 58, C.accent);
  });

  game.onStart(function() {
    game.audio.melody([['C4', 0.5], ['G4', 0.5], ['C5', 1]], { tempo: 90, wave: 'sine', volume: 0.05, loop: true, bass: false });
    state = S.ATTRACT;
    initGame();
  });
})(game);
