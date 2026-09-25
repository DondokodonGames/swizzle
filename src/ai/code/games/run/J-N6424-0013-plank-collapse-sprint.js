// J-N6424-0013-plank-collapse-sprint.js
// プランク・コラプス・スプリント — 崩れ落ちる吊り橋の上を左右交互のステップボタンで駆け抜け、崩落波に飲まれる前に対岸へ渡り切る
// 操作: 画面下の左右ステップボタンを交互にタップして前進する。同じ側を連続で押しても進まない
// 終わり: 崩落波に追いつかれる前・弱った板が抜ける前に対岸まで渡り切れば成功。追いつかれる/踏み抜くと失格
// @mechanic: alternate_tap
// @theme: collapsing_bridge_sprint
// 世界観: 峡谷にかかる古い吊り橋の配達人が、背後から迫る崩落波と足元で突然抜ける弱った板を交わしながら左右交互のステップで対岸まで駆け抜ける
// 残るもの: 正誤(CLEAR/GAME OVER) + 到達距離
// スタイル: VOXEL BLOCK

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // VOXEL BLOCK: 立方体を上面/左面/右面の3明度で。等角に積む
  var C = {
    sky: '#8fb8d8', sky2: '#4a6a8a', plankTop: '#c99a5a', plankL: '#a47838', plankR: '#8a622a',
    void1: '#1a2436', void2: '#0c111c', runner: '#e05a3a', runnerDark: '#8a2f1a',
    weak: '#ff5a4a', wave: '#2a3a50', good: '#4fd08a', bad: '#ff4d5e', gold: '#ffd24a',
    ink: '#0e1826', white: '#ffffff', btn: '#c99a5a', btnDark: '#7a5a2a',
  };

  var GAME_TITLE = 'PLANK SPRINT';
  var MAX_TIME = 14;
  var TOTAL_DIST = 720;
  var STEP_DIST = 42;
  var BTN_L = { x: W * 0.27, y: H * 0.85, w: 300, h: 190 };
  var BTN_R = { x: W * 0.73, y: H * 0.85, w: 300, h: 190 };

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 1, y + 2, { size: sz, color: '#000814', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var RUNNER = ['.##.', '####', '.##.', '#.#.'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.sky], [1, C.sky2]]);
    var pulse = 0.03 + 0.02 * Math.sin(game.time.elapsed * 1.4);
    game.draw.rect(0, 0, W, H, '#ffffff', pulse * 0.25);
    game.draw.rect(0, H * 0.6, W, H * 0.15, C.void1, 1);
    game.draw.rect(0, H * 0.6, W, H * 0.15, C.void2, 0.4);
  }

  var progress, wave, lastSide, weakPlank, weakGap, done, endWait, finished, ready, hitStop, shake, milestoneAt;

  function initGame() {
    progress = 0; wave = -160; lastSide = null; weakGap = 1.6; weakPlank = null;
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

  function step(side, x, y) {
    if (side === lastSide) {
      game.feedback.bad(x, y, { text: 'MISS' });
      game.audio.play('se_tap', 0.15);
      return;
    }
    lastSide = side;
    progress = Math.min(TOTAL_DIST, progress + STEP_DIST);
    game.feedback.good(x, y, { color: C.good, size: 18 });
    game.audio.play('se_jump', 0.2);
    var m = Math.floor(progress / (TOTAL_DIST / 3));
    if (m > milestoneAt && m < 3) {
      milestoneAt = m;
      game.fx.popup('NICE', W * 0.5, H * 0.4, { color: C.gold, size: 32 });
      game.audio.play('se_milestone', 0.3);
    }
    if (progress >= TOTAL_DIST) {
      ok = true; finished = true; hitStop = 0.2;
      game.feedback.good(x, y, { text: 'CLEAR', color: C.good });
      game.fx.burst(x, y, { color: C.gold, count: 22, speed: 400 });
      game.audio.play('se_success', 0.5);
      finish();
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state !== S.PLAYING || ready > 0 || finished) return;
    if (game.hit.rect(x, y, 4, 4, BTN_L.x - BTN_L.w / 2, BTN_L.y - BTN_L.h / 2, BTN_L.w, BTN_L.h)) step('L', x, y);
    else if (game.hit.rect(x, y, 4, 4, BTN_R.x - BTN_R.w / 2, BTN_R.y - BTN_R.h / 2, BTN_R.w, BTN_R.h)) step('R', x, y);
    else { game.feedback.bad(x, y, { text: 'MISS' }); game.audio.play('se_tap', 0.1); }
  });

  function fail(x, y) {
    ok = false; finished = true; hitStop = 0.35; shake = 0.3;
    game.feedback.bad(x, y, { text: 'MISS' });
    game.fx.flash(C.bad, 0.2);
    game.audio.play('se_bad', 0.45);
    finish();
  }

  function stepField(dt) {
    var waveSpeed = 34 + Math.min(30, game.time.elapsed * 2.4);
    wave += waveSpeed * dt;
    if (!finished && wave >= progress - 20) { fail(W * 0.5, H * 0.5); return; }

    weakGap -= dt;
    if (!weakPlank && weakGap <= 0) {
      weakPlank = { at: progress + 130, t: 0.65 };
      weakGap = 2.1;
    }
    if (weakPlank) {
      weakPlank.t -= dt;
      if (weakPlank.t <= 0) {
        if (progress < weakPlank.at) { fail(W * 0.5, H * 0.5); return; }
        weakPlank = null;
      }
    }
    if (!finished && game.time.elapsed >= MAX_TIME && progress < TOTAL_DIST) {
      fail(W * 0.5, H * 0.5);
    }
  }

  function drawField() {
    var camOffset = Math.max(0, progress - W * 0.3);
    for (var i = 0; i < 14; i++) {
      var px = 40 + i * 60 - (camOffset % 60);
      var isWeak = weakPlank && Math.abs((i * 60 + Math.floor(camOffset / 60) * 60) - weakPlank.at) < 30;
      var col = isWeak ? C.weak : C.plankTop;
      game.draw.rect(px, H * 0.56, 44, 18, col, 1);
      game.draw.rect(px, H * 0.56 + 18, 44, 10, C.plankL, 0.9);
    }
    var wx = 40 + (wave - camOffset) + W * 0.02;
    game.draw.rect(0, H * 0.5, Math.max(0, wx), H * 0.14, C.wave, 0.85);
    var rx = 40 + (progress - camOffset);
    var bob = Math.sin(game.time.elapsed * 10) * 5;
    game.draw.sprite(RUNNER, { '#': C.runner }, rx, H * 0.5 + bob, 15, { anchor: 'center' });
    game.draw.rect(BTN_L.x - BTN_L.w / 2, BTN_L.y - BTN_L.h / 2, BTN_L.w, BTN_L.h, lastSide === 'L' ? C.btnDark : C.btn, 0.9);
    game.draw.rect(BTN_R.x - BTN_R.w / 2, BTN_R.y - BTN_R.h / 2, BTN_R.w, BTN_R.h, lastSide === 'R' ? C.btnDark : C.btn, 0.9);
  }

  var demo = { t: 0, gx: BTN_L.x, gy: BTN_L.y, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 5.4;
    if (cyc < dt || demo.t <= dt) initGame();
    var wantSide = lastSide === 'L' ? 'R' : 'L';
    var btn = wantSide === 'L' ? BTN_L : BTN_R;
    if (Math.floor(cyc * 3.2) % 2 === 0) {
      step(wantSide, btn.x, btn.y);
    }
    stepField(dt);
    demo.gx = btn.x; demo.gy = btn.y; demo.press = Math.floor(cyc * 3.2) % 2 === 0;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (progress === undefined) initGame();
      bg();
      stepDemo(dt);
      drawField();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.09, 38, C.ink);
      txt('BEST ' + (game.best > 0 ? 'CLEAR' : '-'), W / 2, H * 0.13, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.96, 36, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.96, 24, C.ink);
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawField();
      var pct = Math.round((progress / TOTAL_DIST) * 100);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.09, 44, ok ? C.good : C.bad);
      txt(pct + '%', W / 2, H * 0.14, 26, C.gold);
      if (!ok) txt('あと' + Math.max(1, 100 - pct) + '%!', W / 2, H * 0.18, 22, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.96, 22, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        var pctF = Math.round((progress / TOTAL_DIST) * 100);
        if (ok) game.end.success(pctF, { progressPct: pctF });
        else game.end.failure({ progressPct: pctF });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      stepField(dt);
    }
    if (shake > 0) shake -= dt;

    bg();
    drawField();
    txt(Math.round((progress / TOTAL_DIST) * 100) + ' / ' + 100, W / 2, H * 0.06, 26, C.ink);
    var barW = W - 120;
    game.draw.rect(60, 150, barW, 16, C.void1, 1);
    game.draw.rect(60, 150, barW * Math.min(1, progress / TOTAL_DIST), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.42, 54, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['G3', 0.15], ['B3', 0.15], ['D4', 0.15], ['G4', 0.25]], { tempo: 172, wave: 'square', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
