// D-20132016-0069-comet-league-atbat.js
// コメットリーグ・アットバット — コースを狙って投げ込み、間髪入れずに打席で振り抜く一打席
// 操作: 投球は動く球が光る枠に重なった瞬間にタップ。打撃はスイングメーターが的の帯に来た瞬間にタップ
// 終わり: 投球・打撃の両方を決めれば成功。どちらか外せば失敗
// @mechanic: aim_shoot
// @theme: comet_league_atbat
// 世界観: 辺境の惑星で開かれる草野球大会。一人二役で投げて打つ選手が、双子の月の下で一打席の攻防を演じる
// 残るもの: 正誤(CLEAR/GAME OVER) + 投球/打撃の決着数
// スタイル: 2000s ARCADE POP

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2000s ARCADE POP: 原色+白縁、明るい背景、祝祭的な演出
  var C = {
    bg: '#1a3a6a', bg2: '#3a6acc', dirt: '#d89a5a', grass: '#3ac26a',
    ball: '#ffffff', ballEdge: '#ff3355', glow: '#ffe600', bat: '#8a5a2a',
    good: '#39ff6a', bad: '#ff3355', gold: '#ffe600', white: '#ffffff', ink: '#0a1428',
  };

  var GAME_TITLE = 'COMET AT-BAT';
  var CX = W * 0.5;
  var PITCH_WIN = 2.6, BAT_WIN = 2.6;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var PLAYER_FRAMES = [
    ['..##..', '.####.', '#.##.#', '.####.', '.#..#.'],
    ['..##..', '.####.', '#.##.#', '.####.', '..##..'],
  ];

  var phase, lane, lanes, ballX, ballDir, pitchOk, batNeedle, batDir, batOk, phaseT;
  var finished, done, endWait, hitStop, shake, ready;

  function initGame() {
    phase = 'pitch'; phaseT = 0;
    lanes = [W * 0.35, W * 0.5, W * 0.65];
    lane = lanes[Math.floor(game.random(0, 3))];
    ballX = W * 0.1; ballDir = 1; pitchOk = null;
    batNeedle = 0; batDir = 1; batOk = null;
    finished = false; done = false; endWait = 0; hitStop = 0; shake = 0; ready = 0.8;
  }

  function bg() {
    var elapsed = game.time.elapsed;
    game.draw.gradient(0, H, [[0, C.bg2], [0.55, C.bg], [1, '#0a1a3a']]);
    game.draw.circle(W * 0.2, H * 0.12, 34, '#fff2c0', 0.8);
    game.draw.circle(W * 0.8, H * 0.14, 22, '#cfe0ff', 0.7);
    game.draw.rect(0, H * 0.62, W, H * 0.38, C.grass);
    game.draw.rect(0, H * 0.7, W, H * 0.3, C.dirt, 0.5);
    game.draw.rect(0, 0, W, H, '#ffffff', 0.03 + 0.03 * Math.sin(elapsed * 1.3));
  }

  function drawPlayer(x, y, pose) {
    var bobY = Math.sin(game.time.elapsed * 2.4) * 5;
    var swayX = Math.cos(game.time.elapsed * 1.5) * 3;
    game.draw.sprite(PLAYER_FRAMES[pose % 2], { '#': C.bat }, x + swayX, y + bobY, 15, { anchor: 'center' });
  }

  function drawPitchZone() {
    var zy = H * 0.42;
    for (var i = 0; i < lanes.length; i++) {
      var glow = lanes[i] === lane;
      game.draw.rect(lanes[i] - 46, zy - 60, 92, 120, glow ? C.glow : C.ink, glow ? 0.35 : 0.4);
      if (glow) game.draw.rect(lanes[i] - 46, zy - 60, 92, 120, C.glow, 0.15 + 0.1 * Math.sin(game.time.elapsed * 8));
    }
    game.draw.circle(ballX, zy, 16, C.ball);
    game.draw.circle(ballX, zy, 16, C.ballEdge, 0.4);
  }

  function drawBatMeter() {
    var gx = W * 0.15, gy = H * 0.8, gw = W * 0.7, gh = 44;
    game.draw.rect(gx, gy, gw, gh, C.ink, 0.5);
    game.draw.rect(gx + gw * 0.42, gy, gw * 0.16, gh, C.gold, 0.45);
    var nx = gx + gw * batNeedle;
    game.draw.rect(nx - 5, gy - 8, 10, gh + 16, C.white);
  }

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function resolvePitch(hit) {
    if (pitchOk !== null || finished) return;
    pitchOk = hit;
    hitStop = hit ? 0.12 : 0.3;
    if (hit) {
      game.feedback.good(lane, H * 0.42, { text: 'GOOD', color: C.good });
      game.audio.play('se_good', 0.4);
      game.fx.popup('STRIKE', CX, H * 0.3, { color: C.gold, size: 34 });
      game.audio.play('se_milestone', 0.25);
    } else {
      game.feedback.bad(ballX, H * 0.42, { text: 'BALL' });
      shake = 0.15;
      game.audio.play('se_bad', 0.3);
    }
  }

  function resolveBat(hit) {
    if (batOk !== null || finished) return;
    batOk = hit;
    finished = true;
    ok = !!(pitchOk && hit);
    hitStop = hit ? 0.15 : 0.4;
    if (hit) {
      game.feedback.good(CX, H * 0.68, { text: 'NICE', color: C.good });
      game.fx.burst(CX, H * 0.68, { color: C.gold, count: 20, speed: 400 });
      game.audio.play('se_break', 0.5);
    } else {
      game.feedback.bad(CX, H * 0.68, { text: 'MISS' });
      shake = 0.3;
      game.audio.play('se_bad', 0.4);
    }
    finish();
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state !== S.PLAYING || ready > 0 || finished) return;
    game.audio.play('se_tap', 0.15);
    if (phase === 'pitch' && pitchOk === null) {
      resolvePitch(Math.abs(ballX - lane) < 60);
    } else if (phase === 'bat' && batOk === null) {
      resolveBat(batNeedle > 0.4 && batNeedle < 0.58);
    }
  });

  var demo = { t: 0, gx: CX, gy: H * 0.42, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.4;
    if (cyc < dt || demo.t <= dt) { phase = 'pitch'; pitchOk = null; batOk = null; ballX = W * 0.1; ballDir = 1; batNeedle = 0; batDir = 1; lane = lanes[1]; }
    if (cyc < 1.8) {
      phase = 'pitch';
      ballX += ballDir * dt * 420;
      if (ballX > W * 0.9 || ballX < W * 0.1) ballDir *= -1;
      demo.gx = lane; demo.gy = H * 0.42; demo.press = false;
      if (cyc > 1.5 && pitchOk === null) { demo.press = true; resolvePitch(true); }
    } else if (cyc < 2.2) {
      phase = 'pitch';
    } else if (cyc < 4.0) {
      phase = 'bat';
      batNeedle += batDir * dt * 0.7;
      if (batNeedle > 1) { batNeedle = 1; batDir = -1; }
      if (batNeedle < 0) { batNeedle = 0; batDir = 1; }
      demo.gx = W * 0.15 + W * 0.7 * 0.5; demo.gy = H * 0.8; demo.press = false;
      if (cyc > 3.6 && batOk === null) { demo.press = true; batOk = true; ok = true; game.feedback.good(CX, H * 0.68, { text: 'NICE', color: C.good }); game.audio.play('se_break', 0.2); }
    } else {
      phase = 'done';
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (phase === undefined) initGame();
      bg();
      stepDemo(dt);
      drawPlayer(CX, H * 0.55, 0);
      if (phase === 'pitch') drawPitchZone(); else if (phase === 'bat') drawBatMeter();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 42, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.92, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.92, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawPlayer(CX, H * 0.55, 0);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      txt((pitchOk ? 1 : 0) + (batOk ? 1 : 0) + ' / ' + 2, W / 2, H * 0.13, 32, C.gold);
      if (!ok && (pitchOk || batOk)) txt('あと1つ!', W / 2, H * 0.18, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.92, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        var stats = { pitch: !!pitchOk, bat: !!batOk };
        if (ok) game.end.success(2, stats); else game.end.failure(stats);
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      phaseT += dt;
      if (phase === 'pitch') {
        ballX += ballDir * dt * (420 + phaseT * 30);
        if (ballX > W * 0.92 || ballX < W * 0.08) ballDir *= -1;
        if (phaseT >= PITCH_WIN && pitchOk === null) { resolvePitch(false); }
        if (pitchOk !== null && hitStop <= 0) { phase = 'bat'; phaseT = 0; }
      } else if (phase === 'bat') {
        batNeedle += batDir * dt * 0.8;
        if (batNeedle > 1) { batNeedle = 1; batDir = -1; }
        if (batNeedle < 0) { batNeedle = 0; batDir = 1; }
        if (phaseT >= BAT_WIN && batOk === null) { resolveBat(false); }
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawPlayer(CX, H * 0.55, phase === 'bat' ? 1 : 0);
    if (!finished) {
      if (phase === 'pitch') drawPitchZone(); else if (phase === 'bat') drawBatMeter();
    }
    txt((pitchOk ? 1 : 0) + (batOk ? 1 : 0) + ' / ' + 2, W / 2, H * 0.06, 32, C.white);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.28, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['C4', 0.3], ['E4', 0.3], ['G4', 0.3], ['C5', 0.6]], { tempo: 140, wave: 'triangle', volume: 0.07, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
