// GH-DS-0022-net-catch.js
// ネットキャッチ — 木を揺らして落ちてきた虫を、飛び去る前に網で捕まえる
// 操作: まず木をタップして揺らす。虫が落ちて止まった瞬間、もう一度タップして網で捕まえる
// 終わり: 3本の木。捕まえた数が残る
// @mechanic: timing_one_shot
// @theme: backyard_trees
// 世界観: 裏庭の木が3本並ぶ。揺らすと虫が落ちてくる。着地して一瞬止まった隙だけ網で捕まえられる。逃すと飛んでいく
// 残るもの: 捕まえた数(SCORE) + 木の本数
// スタイル: 8bit HOME

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // 8bit HOME: 3〜4色 + 黒。8x8ドット、タイル反復背景
  var C = {
    sky: '#7ec8e3', grass: '#4a9a3a', grass2: '#3a7a2c', trunk: '#8a5a3a', leaf: '#2a7a3a', leaf2: '#3a9a4a',
    bug: '#c8a020', net: '#e8d8a0', good: '#4dff8a', bad: '#ff4d5e', gold: '#ffd400', white: '#ffffff', ink: '#0a0a0a',
  };

  var GAME_TITLE = 'NET CATCH';
  var TREES = 3;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var finalScore = 0, caught = 0;

  var treeIdx, phase, phaseT, bugY, done, endWait, resolved;
  var ready, hitStop, shake;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 4, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var TX = W / 2, TY = H * 0.56;
  var BUG_SPRITE = ['.#.', '###', '.#.'];
  var NET_SPRITE = ['###', '#.#', '###'];

  function yardBg() {
    game.draw.gradient(0, H * 0.5, [[0, C.sky], [1, '#bfe6ec']]);
    game.draw.rect(0, H * 0.5, W, H * 0.5, C.grass);
    for (var gx = 0; gx < W; gx += 60) for (var gy = H * 0.5; gy < H; gy += 60) {
      var chk = (Math.floor(gx / 60) + Math.floor(gy / 60)) % 2 === 0;
      game.draw.rect(gx, gy, 60, 60, chk ? C.grass2 : C.grass, 0.4);
    }
  }

  function drawTree(shakeAmt) {
    var sway = Math.sin(game.time.elapsed * (shakeAmt > 0 ? 30 : 1)) * shakeAmt * 14;
    game.draw.rect(TX - 24, TY, 48, H * 0.20, C.trunk);
    game.draw.circle(TX + sway, TY - 110, 150, C.leaf);
    game.draw.circle(TX + sway - 90, TY - 60, 90, C.leaf2, 0.8);
    game.draw.circle(TX + sway + 90, TY - 60, 90, C.leaf2, 0.8);
  }

  function newTree() {
    phase = 'idle'; phaseT = 0; bugY = TY - 110;
  }

  function initGame() {
    treeIdx = 0; caught = 0; done = false; endWait = 0; resolved = false;
    ready = 0.8; hitStop = 0; shake = 0;
    newTree();
  }

  function tapNow() {
    if (done || ready > 0 || hitStop > 0) return;
    hitStop = 0.06;
    if (phase === 'idle') {
      phase = 'shake'; phaseT = 0.5;
      game.audio.play('se_tap', 0.2);
      return;
    }
    if (phase === 'catch') {
      caught++;
      resolved = true;
      game.feedback.good(TX, bugY, { text: 'GET!', color: C.good });
      game.fx.burst(TX, bugY, { color: C.gold, count: 14, speed: 340 });
      game.audio.play('se_success', 0.4);
      phase = 'done'; phaseT = 0.5;
    } else if (phase === 'fall') {
      resolved = true;
      game.feedback.bad(TX, bugY, { text: 'TOO EARLY' });
      shake = 0.1;
      game.audio.play('se_bad', 0.3);
      phase = 'done'; phaseT = 0.5;
    }
  }

  function nextTree() {
    treeIdx++;
    if (treeIdx >= TREES) finish();
    else { newTree(); resolved = false; game.fx.popup(treeIdx + ' / ' + TREES, W / 2, H * 0.20, { color: C.gold, size: 46 }); }
  }

  function finish() {
    if (done) return;
    done = true;
    finalScore = caught * 100;
    game.audio.stopBgm();
    game.audio.play(caught > 0 ? 'se_success' : 'se_failure');
    endWait = 1.4;
  }

  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); return; }
    tapNow();
  });

  // ── ATTRACT ゴースト実演: 木を揺らし、着地の瞬間だけタップ ──
  var demo = { t: 0, gx: TX, gy: TY + 40, press: false, phase: 'idle', phaseT: 0.6, bugY: TY - 110 };
  function stepDemo(dt) {
    demo.t += dt;
    demo.phaseT -= dt;
    if (demo.phase === 'idle' && demo.phaseT <= 0) { demo.phase = 'shake'; demo.phaseT = 0.5; demo.press = true; }
    else if (demo.phase === 'shake') {
      demo.bugY = TY - 110 + (1 - demo.phaseT / 0.5) * (TY + 50 - (TY - 110));
      if (demo.phaseT <= 0) { demo.phase = 'catch'; demo.phaseT = 0.32; demo.press = false; }
    } else if (demo.phase === 'catch') {
      if (demo.phaseT < 0.16) { demo.press = true; if (demo.phaseT > 0.13) { game.feedback.good(TX, demo.bugY, { text: 'GET!', color: C.good }); game.fx.burst(TX, demo.bugY, { color: C.gold, count: 10, speed: 300 }); } }
      if (demo.phaseT <= 0) { demo.phase = 'idle'; demo.phaseT = 1.0; demo.press = false; demo.bugY = TY - 110; }
    }
    shake = 0;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (treeIdx === undefined) initGame();
      yardBg();
      stepDemo(dt);
      drawTree(demo.phase === 'shake' ? 1 : 0);
      if (demo.phase !== 'idle') { game.draw.sprite(BUG_SPRITE, { '#': C.bug }, TX, demo.bugY, 8, { anchor: 'center' }); }
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 16 });
      txt(GAME_TITLE, W / 2, H * 0.10, 60, C.white);
      txt('BEST ' + game.best, W / 2, H * 0.15, 30, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 48, C.gold);
        txt('TAP TO START', W / 2, H * 0.95, 38, C.white);
      } else {
        txt('INSERT COIN', W / 2, H * 0.95, 32, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      yardBg();
      drawTree(0);
      txt(caught >= 2 ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.10, 58, caught >= 2 ? C.white : C.bad);
      txt('CAUGHT ' + caught + ' / ' + TREES, W / 2, H * 0.62, 46, C.gold);
      txt('SCORE ' + finalScore, W / 2, H * 0.68, 40, C.white);
      var best = Math.max(game.best, finalScore);
      txt('BEST ' + best, W / 2, H * 0.74, 34, C.gold);
      if (finalScore > game.best && game.best > 0 && Math.floor(game.time.elapsed * 3) % 2 === 0) txt('NEW RECORD', W / 2, H * 0.80, 38, C.gold);
      else if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.90, 36, C.white);
      return;
    }

    // ── PLAYING ──
    if (done) {
      endWait -= dt;
      if (endWait <= 0) { state = S.RESULT; game.end.record(finalScore, { label: caught + '/' + TREES }); }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else {
      phaseT -= dt;
      if (phase === 'shake') {
        bugY = TY - 110 + Math.min(1, (0.5 - phaseT) / 0.5) * (TY + 60 - (TY - 110));
        if (phaseT <= 0) { phase = 'fall'; phaseT = 0.22; }
      } else if (phase === 'fall' && phaseT <= 0) { phase = 'catch'; phaseT = 0.30; }
      else if (phase === 'catch' && phaseT <= 0) {
        if (!resolved) { game.feedback.bad(TX, bugY, { text: 'MISS' }); shake = 0.1; game.audio.play('se_bad', 0.3); }
        phase = 'done'; phaseT = 0.5;
      } else if (phase === 'done' && phaseT <= 0) { nextTree(); }
    }
    if (shake > 0) shake -= dt;

    yardBg();
    drawTree(phase === 'shake' ? 1 : 0);
    if (phase === 'shake' || phase === 'fall' || phase === 'catch') game.draw.sprite(BUG_SPRITE, { '#': C.bug }, TX, bugY, 10, { anchor: 'center' });
    if (phase === 'catch') game.draw.sprite(NET_SPRITE, { '#': C.net }, TX + 70, bugY, 10, { anchor: 'center' });

    game.draw.rect(60, 40, W - 120, 24, C.ink);
    game.draw.rect(60, 40, (W - 120) * (treeIdx / TREES), 24, C.gold);
    txt(treeIdx + ' / ' + TREES, W / 2, 106, 44, C.white);

    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.30, 72, C.gold);
  });

  game.onStart(function() {
    game.audio.bgm('bgm_cute', 0.10);
    state = S.ATTRACT;
    initGame();
  });
})(game);
