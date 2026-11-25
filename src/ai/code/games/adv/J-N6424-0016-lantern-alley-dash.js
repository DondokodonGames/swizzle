// J-N6424-0016-lantern-alley-dash.js
// ランタン・アレイ・ダッシュ — 見回り灯りが背を向けた合図の間だけタップしてダッシュし、路地の先の出口まで進む
// 操作: 見回り灯りが緑に開いた合図の時だけタップしてダッシュする。赤や黄色の間に押すと発覚
// 終わり: 発覚せず規定歩数ダッシュして出口に到達すれば成功。合図が開く前にタップすると即失格
// @mechanic: cooldown_tap
// @theme: watch_lamp_alley
// 世界観: 夜の裏路地を行く配達人が、見回り番の掲げるランタンが背を向ける合図の一瞬だけを狙ってダッシュを刻み、路地の先の出口まで駆け抜ける
// 残るもの: 正誤(CLEAR/GAME OVER) + 到達歩数
// スタイル: 80s ISO

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 80s ISO: 菱形グリッド、6〜8色、影で高さを示す
  var C = {
    bg: '#26203a', bg2: '#14101f', tileA: '#3a3258', tileB: '#2c2646',
    watchman: '#c99a6a', lampWatch: '#ff4a4a', lampWarn: '#ffcf3f', lampOpen: '#4dff9e',
    hero: '#4fc9ff', heroDark: '#1d6f96', gold: '#ffd24a', good: '#4dff9e', bad: '#ff4a4a',
    ink: '#efeaff', white: '#ffffff',
  };

  var GAME_TITLE = 'ALLEY DASH';
  var MAX_TIME = 12;
  var NEEDED = 6;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 1, y + 2, { size: sz, color: '#0a0714', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var WATCHMAN = ['.##.', '####', '.##.', '#..#'];
  var HERO = ['.##.', '####', '.##.', '#.#.'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    var pulse = 0.03 + 0.02 * Math.sin(game.time.elapsed * 1.3);
    game.draw.rect(0, 0, W, H, '#ffffff', pulse * 0.2);
    for (var i = 0; i < 8; i++) {
      game.draw.rect(60 + i * 130, H * 0.62, 60, 30, i % 2 === 0 ? C.tileA : C.tileB, 0.7);
    }
  }

  var progress, cycle, phase, phaseT, done, endWait, finished, ready, hitStop, shake, milestoneAt;

  function cycleLens() {
    var cyc = Math.max(1.05, cycle);
    return { watch: cyc * 0.55, warn: cyc * 0.25, open: cyc * 0.2 };
  }

  function initGame() {
    progress = 0; cycle = 1.65; phase = 'watch'; phaseT = cycleLens().watch;
    milestoneAt = 0;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  function caught(x, y) {
    ok = false; finished = true; hitStop = 0.35; shake = 0.3;
    game.feedback.bad(x, y, { text: 'MISS' });
    game.fx.flash(C.bad, 0.2);
    game.audio.play('se_bad', 0.45);
    finish();
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state !== S.PLAYING || ready > 0 || finished) return;
    if (phase === 'open') {
      progress++;
      game.audio.play('se_jump', 0.25);
      game.feedback.good(x, y, { color: C.good, size: 18 });
      var m = Math.floor(progress / (NEEDED / 3));
      if (m > milestoneAt && m < 3) {
        milestoneAt = m;
        game.fx.popup('NICE', W * 0.5, H * 0.4, { color: C.gold, size: 30 });
        game.audio.play('se_milestone', 0.28);
      }
      if (progress >= NEEDED) {
        ok = true; finished = true; hitStop = 0.2;
        game.feedback.good(x, y, { text: 'CLEAR', color: C.good });
        game.fx.burst(x, y, { color: C.gold, count: 22, speed: 400 });
        game.audio.play('se_success', 0.5);
        finish();
      } else {
        cycle = Math.max(1.05, cycle - 0.06);
        phase = 'watch'; phaseT = cycleLens().watch;
      }
    } else {
      caught(x, y);
    }
  });

  function stepCycle(dt) {
    phaseT -= dt;
    if (phaseT <= 0) {
      var lens = cycleLens();
      if (phase === 'watch') { phase = 'warn'; phaseT = lens.warn; game.audio.play('se_tap', 0.1); }
      else if (phase === 'warn') { phase = 'open'; phaseT = lens.open; }
      else if (phase === 'open') { phase = 'watch'; phaseT = lens.watch; }
    }
    if (!finished && game.time.elapsed >= MAX_TIME) {
      ok = false; finished = true; hitStop = 0.2; shake = 0.15;
      game.feedback.bad(W * 0.5, H * 0.6, { text: 'MISS' });
      game.audio.play('se_bad', 0.3);
      finish();
    }
  }

  function drawScene() {
    var lampCol = phase === 'open' ? C.lampOpen : phase === 'warn' ? C.lampWarn : C.lampWatch;
    game.draw.sprite(WATCHMAN, { '#': C.watchman }, W * 0.5, H * 0.26, 20, { anchor: 'center' });
    game.draw.circle(W * 0.5, H * 0.2, 30, lampCol, 0.95);
    var a = 0.3 + 0.3 * Math.sin(game.time.elapsed * 14);
    game.draw.circle(W * 0.5, H * 0.2, 60, lampCol, a * 0.4);
    if (phase !== 'open') {
      game.draw.line(W * 0.5, H * 0.2, W * 0.5, H * 0.72, lampCol, 6);
    }
    var hx = W * 0.16 + Math.min(1, progress / NEEDED) * (W * 0.68);
    var bob = Math.sin(game.time.elapsed * 8) * 4;
    game.draw.circle(hx, H * 0.72 + 30, 22, C.heroDark, 0.3);
    game.draw.sprite(HERO, { '#': C.hero }, hx, H * 0.62 + bob, 14, { anchor: 'center' });
    game.draw.rect(W * 0.82, H * 0.56, 34, 60, C.gold, 0.85);
  }

  var demo = { t: 0, gx: W * 0.5, gy: H * 0.9, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 6.0;
    if (cyc < dt || demo.t <= dt) initGame();
    stepCycle(dt);
    if (phase === 'open' && !demo.press) {
      demo.press = true;
      progress++;
      var m2 = Math.floor(progress / (NEEDED / 3));
      if (m2 > milestoneAt && m2 < 3) { milestoneAt = m2; game.fx.popup('NICE', W * 0.5, H * 0.4, { color: C.gold, size: 30 }); game.audio.play('se_milestone', 0.2); }
      game.feedback.good(W * 0.5, H * 0.9, { color: C.good, size: 14 });
      if (progress >= NEEDED) { progress = 0; }
      else { cycle = Math.max(1.05, cycle - 0.06); phase = 'watch'; phaseT = cycleLens().watch; }
    } else if (phase !== 'open') {
      demo.press = false;
    }
    demo.gx = W * 0.5; demo.gy = H * 0.9;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (progress === undefined) initGame();
      bg();
      stepDemo(dt);
      drawScene();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.09, 38, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.13, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.94, 38, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.94, 26, C.ink);
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawScene();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.09, 44, ok ? C.good : C.bad);
      txt(progress + ' / ' + NEEDED, W / 2, H * 0.14, 28, C.gold);
      if (!ok) txt('あと' + Math.max(1, NEEDED - progress) + '歩!', W / 2, H * 0.18, 24, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 24, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(progress, { steps: progress, needed: NEEDED });
        else game.end.failure({ steps: progress, needed: NEEDED });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      stepCycle(dt);
    }
    if (shake > 0) shake -= dt;

    bg();
    drawScene();
    txt(progress + ' / ' + NEEDED, W / 2, H * 0.06, 28, C.ink);
    var barW = W - 120;
    game.draw.rect(60, 150, barW, 16, C.tileB, 1);
    game.draw.rect(60, 150, barW * Math.max(0, 1 - game.time.elapsed / MAX_TIME), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.48, 54, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['E3', 0.3], ['G3', 0.3], ['B3', 0.3], ['E4', 0.5]], { tempo: 108, wave: 'sawtooth', volume: 0.045, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
