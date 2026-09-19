// GH-PS-0098-tightrope-balance-act.js
// タイトロープアクト — 突風に煽られる綱の上で、重心を左右タップで保ちながら対岸まで渡る
// 操作: 傾いた側と逆(重心を戻したい側)を画面左右でタップして重心を戻す
// 終わり: 対岸(進行度100%)に着けば成功。傾きが限界を超えて落ちれば失敗
// @mechanic: balance
// @theme: canyon_tightrope
// 世界観: 渓谷にかけた一本の綱。旗のはためきが強まると突風が来る合図。軽業師は綱の上で重心を保ちながら対岸を目指す
// 残るもの: 正誤(CLEAR/GAME OVER) + 到達した進行度%
// スタイル: 90s 16bit

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // 90s 16bit: 多色・高彩度。2〜3層の背景で奥行き、表情のあるスプライト
  var C = {
    sky1: '#7fd0e8', sky2: '#bdeeff', cliffFar: '#5a8a6a', cliffNear: '#3a6248',
    rope: '#c8975a', ropeDark: '#8a5f2e', flag1: '#ff5a4a', flag2: '#ffd23d',
    performer: '#ffdca0', performerSuit: '#3d6fe0', bar: '#5a3a1e',
    good: '#5dffb0', bad: '#ff4d5e', gold: '#ffd400', white: '#ffffff', ink: '#1a1208',
  };

  var GAME_TITLE = 'TIGHTROPE ACT';
  var TIME_LIMIT = 18;
  var ROPE_Y = H * 0.50;
  var FALL_LIMIT = 1.0;
  var NUDGE = 0.16;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var finalScore = 0;

  var progress, tilt, gustT, gustDir, gustActive, gustWarnT, fell, totalTime, done, endWait, finished, ok, hoopHit;
  var ready, hitStop, shake;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 4, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var PERF_A = ['.##.', '####', '.##.', '#..#'];
  var PERF_LEAN = ['.##.', '####', '##..', '#...'];
  var PERF_FALL = ['#..#', '.##.', '####', '.##.'];

  var HOOPS = [0.30, 0.55, 0.80];

  function canyonBg() {
    game.draw.gradient(0, ROPE_Y, [[0, C.sky1], [1, C.sky2]]);
    game.draw.rect(0, ROPE_Y, W * 0.16, H - ROPE_Y, C.cliffFar);
    game.draw.rect(W * 0.84, ROPE_Y, W * 0.16, H - ROPE_Y, C.cliffFar);
    game.draw.rect(0, ROPE_Y, W * 0.10, H - ROPE_Y, C.cliffNear);
    game.draw.rect(W * 0.90, ROPE_Y, W * 0.10, H - ROPE_Y, C.cliffNear);
    game.draw.gradient(ROPE_Y, H, [[0, '#3a2a1a'], [1, '#1a120a']]);
    // 旗(突風のtelegraph)
    var flutter = gustWarnT > 0 ? 14 : 4;
    for (var i = 0; i < 2; i++) {
      var fx = i === 0 ? W * 0.10 : W * 0.90;
      game.draw.line(fx, ROPE_Y - 90, fx, ROPE_Y - 20, C.bar, 6);
      game.draw.rect(fx + (i === 0 ? 4 : -34) + Math.sin(game.time.elapsed * 6) * flutter * 0.1, ROPE_Y - 88, 30, 20, gustWarnT > 0 ? C.flag1 : C.flag2);
    }
  }

  function drawRope() {
    game.draw.line(W * 0.08, ROPE_Y, W * 0.92, ROPE_Y, C.ropeDark, 16);
    game.draw.line(W * 0.08, ROPE_Y, W * 0.92, ROPE_Y, C.rope, 10);
    for (var i = 0; i < HOOPS.length; i++) {
      var hx = W * 0.08 + HOOPS[i] * (W * 0.84);
      var got = progress / 100 > HOOPS[i] + 0.03;
      game.draw.circle(hx, ROPE_Y - 60, 22, got ? C.gold : '#fffbe0', got ? 1 : 0.5);
      game.draw.circle(hx, ROPE_Y - 60, 12, C.sky2, got ? 0 : 0.6);
    }
  }

  function drawPerformer(t, isFalling) {
    var x = W * 0.08 + (progress / 100) * (W * 0.84);
    var frame = isFalling ? PERF_FALL : (Math.abs(t) > 0.25 ? PERF_LEAN : PERF_A);
    var lean = t * 40;
    game.draw.circle(x, ROPE_Y - 6, 20, '#000000', 0.25);
    game.draw.sprite(frame, { '#': isFalling ? C.bad : C.performerSuit, '.': null }, x + lean, ROPE_Y - 66 + (isFalling ? 60 : 0), 16, { anchor: 'center', flipX: t > 0 });
  }

  function initGame() {
    progress = 0; tilt = 0; gustT = 1.6; gustDir = 0; gustActive = false; gustWarnT = 0;
    fell = false; totalTime = 0; done = false; endWait = 0; finished = false; ok = false; hoopHit = 0;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function nudge(left) {
    if (done || ready > 0 || fell || finished) return;
    var wantLeft = tilt > 0.03;
    var wantRight = tilt < -0.03;
    if ((left && wantLeft) || (!left && wantRight)) {
      tilt -= (left ? 1 : -1) * NUDGE;
      var x = W * 0.08 + (progress / 100) * (W * 0.84);
      game.feedback.good(x, ROPE_Y - 80, { text: null, sound: 'se_tap' });
    } else {
      tilt += (left ? -1 : 1) * 0.05;
      var x2 = W * 0.08 + (progress / 100) * (W * 0.84);
      game.feedback.bad(x2, ROPE_Y - 80, { text: null, sound: 'se_bad' });
    }
    if (Math.abs(tilt) >= FALL_LIMIT) doFall();
  }

  function doFall() {
    if (fell) return;
    fell = true; ok = false; finished = true;
    hitStop = 0.4; shake = 0.35;
    game.fx.flash(C.bad, 0.25);
    game.feedback.bad(W * 0.08 + (progress / 100) * (W * 0.84), ROPE_Y, { text: 'FALL' });
    game.audio.play('se_failure', 0.5);
    finish();
  }

  function finish() {
    if (done) return;
    done = true;
    finalScore = Math.round(progress);
    game.audio.stopBgm();
    if (ok) game.audio.play('se_success', 0.5);
    endWait = 1.3;
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; demo.press = false; return; }
    nudge(x < W / 2);
  });

  // ── ATTRACT ゴースト実演: 実際の nudge()/gust を流用し、正しい側を叩く成功例+逆側を叩く失敗例 ──
  var demo = { t: 0, gx: W * 0.25, gy: H * 0.82, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.6;
    if (cyc < dt) { progress = 30; tilt = 0.5; }
    if (cyc < 2.0) {
      demo.gx += ((tilt > 0 ? W * 0.25 : W * 0.75) - demo.gx) * Math.min(1, dt * 6);
      demo.press = (cyc % 0.5) < 0.2;
      if (Math.abs((cyc % 0.5) - 0.02) < dt) nudge(tilt > 0);
    } else if (cyc < 2.6) {
      demo.press = false;
      if (Math.abs(cyc - 2.1) < dt) tilt = -0.55;
    } else if (cyc < 4.0) {
      // 失敗例: あえて逆側を叩いて悪化させる
      demo.gx += (W * 0.75 - demo.gx) * Math.min(1, dt * 6);
      demo.press = (cyc % 0.4) < 0.18;
      if (Math.abs((cyc % 0.4) - 0.02) < dt) nudge(false);
    } else {
      demo.press = false;
      if (fell) { fell = false; finished = false; ok = false; }
    }
    progress = Math.min(96, progress + 3 * dt);
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (progress === undefined) initGame();
      canyonBg();
      stepDemo(dt);
      drawRope();
      drawPerformer(tilt, fell);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.09, 50, C.ink);
      txt('BEST ' + (game.best > 0 ? Math.round(game.best) + '%' : '-'), W / 2, H * 0.135, 24, C.ink);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.92, 42, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.96, 28, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      canyonBg();
      drawRope();
      drawPerformer(tilt, fell);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.09, 50, ok ? C.good : C.bad);
      txt(Math.round(progress) + ' / ' + 100, W / 2, H * 0.15, 32, C.ink);
      if (!ok && progress >= 80) txt('あと少し!', W / 2, H * 0.20, 28, C.gold);
      var best = Math.max(game.best, finalScore);
      if (finalScore >= game.best && game.best > 0 && Math.floor(game.time.elapsed * 3) % 2 === 0) txt('NEW RECORD', W / 2, H * 0.25, 28, C.gold);
      else if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.95, 24, C.ink);
      return;
    }

    // ── PLAYING ──
    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(finalScore, { hoops: hoopHit }); else game.end.failure({ progress: finalScore });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      totalTime += dt;
      if (totalTime >= TIME_LIMIT) { ok = false; finished = true; finish(); }
      gustT -= dt;
      if (gustT <= -0.7 && gustActive) { gustActive = false; }
      if (gustT <= 0 && !gustActive && gustWarnT <= 0) { gustWarnT = 0.65; gustDir = Math.random() < 0.5 ? 1 : -1; }
      if (gustWarnT > 0) { gustWarnT -= dt; if (gustWarnT <= 0) { gustActive = true; gustT = 0.8; game.audio.play('se_tap', 0.1); } }
      if (gustActive) tilt += gustDir * (0.35 + totalTime * 0.01) * dt;
      tilt = Math.max(-1.3, Math.min(1.3, tilt));
      if (Math.abs(tilt) >= FALL_LIMIT) doFall();
      if (!fell) progress = Math.min(100, progress + 5.6 * dt);
      for (var hi = 0; hi < HOOPS.length; hi++) {
        var hp = HOOPS[hi] * 100;
        if (progress >= hp && progress - 5.6 * dt < hp) { hoopHit++; game.fx.popup('+HOOP', W / 2, H * 0.22, { color: C.gold, size: 40 }); game.audio.play('se_milestone', 0.4); }
      }
      if (progress >= 100) { ok = true; finished = true; finish(); }
    }
    if (shake > 0) shake -= dt;

    canyonBg();
    drawRope();
    drawPerformer(tilt, fell);

    game.draw.rect(60, 50, W - 120, 22, C.ink, 0.4);
    game.draw.rect(60, 50, (W - 120) * (progress / 100), 22, C.good);
    txt(Math.round(progress) + ' / ' + 100, W / 2, 116, 32, C.ink);

    // 重心メーター
    var mcx = W / 2;
    game.draw.rect(mcx - 100, H * 0.86, 200, 16, C.ink, 0.3);
    game.draw.circle(mcx + tilt * 90, H * 0.86 + 8, 12, Math.abs(tilt) > 0.7 ? C.bad : C.good);

    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.30, 70, C.gold);
    if (gustWarnT > 0 && Math.floor(game.time.elapsed * 10) % 2 === 0) {
      game.draw.rect(gustDir > 0 ? W * 0.06 : W * 0.80, H * 0.42, W * 0.14, 30, C.bad, 0.4);
    }
  });

  game.onStart(function() {
    game.audio.melody(
      [['C4', 0.2], ['E4', 0.2], ['G4', 0.2], ['E4', 0.2], ['F4', 0.2], ['A4', 0.2]],
      { tempo: 120, wave: 'triangle', volume: 0.06, loop: true, bass: [['C3', 0.4], ['G2', 0.4]], bassWave: 'sine', bassVolume: 0.06 }
    );
    state = S.ATTRACT;
    initGame();
  });
})(game);
