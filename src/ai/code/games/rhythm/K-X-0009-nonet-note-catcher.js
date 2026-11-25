// K-X-0009-nonet-note-catcher.js
// ナインパイプ・オルガン — 9本のパイプを落ちてくる音符に合わせて押し分ける精密演奏
// 操作: 9本のパイプのうち、光る音符が判定ラインに来た瞬間、そのパイプの位置をタップする
// 終わり: 8音符のうちミスが2回以内で弾ききれば成功。3回外せば失敗
// @mechanic: timing_window
// @theme: underground_pipe_organ
// 世界観: 地底の巨大歯車パイプオルガンを操る整備演奏士。9本のパイプが同時に音符を落とし、判定窓の中で正しいパイプを押さえて鳴らす
// 残るもの: 正誤(CLEAR/GAME OVER) + 弾けた音符数とコンボ最大値
// スタイル: PIXEL HD

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // PIXEL HD: 高解像度ドット。深い彩度+くっきりハイライト、金属質のパイプ
  var C = {
    bg: '#101826', bg2: '#0a0e16', pipe: '#26364a', pipeEdge: '#3e5570', pipeGlow: '#7fd6ff',
    note: '#ffd23f', noteGold: '#ffb000', hitline: '#4a6a8a',
    good: '#4dffa0', bad: '#ff4d6a', gold: '#ffd400', white: '#eef4ff', ink: '#060a12',
  };

  var GAME_TITLE = 'NONET ORGAN';
  var LANES = 9;
  var HIT_Y = H * 0.78;
  var TOP_Y = H * 0.24;
  var FALL_T = 1.15;
  var WIN = 95;
  var TOTAL = 8;
  var MISS_LIMIT = 3;
  var laneW = (W - 120) / LANES;

  function laneX(i) { return 60 + laneW * (i + 0.5); }

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var PIPE_CAP = ['.###.', '#####'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    for (var i = 0; i < LANES; i++) {
      var x = laneX(i);
      game.draw.rect(x - laneW * 0.36, TOP_Y - 40, laneW * 0.72, HIT_Y - TOP_Y + 120, C.pipe, 0.5);
      game.draw.line(x - laneW * 0.36, TOP_Y - 40, x - laneW * 0.36, HIT_Y + 80, C.pipeEdge, 3);
      game.draw.line(x + laneW * 0.36, TOP_Y - 40, x + laneW * 0.36, HIT_Y + 80, C.pipeEdge, 3);
      game.draw.sprite(PIPE_CAP, { '#': C.pipeEdge }, x, TOP_Y - 55, 8, { anchor: 'center' });
    }
    game.draw.line(60, HIT_Y, W - 60, HIT_Y, C.hitline, 6);
  }

  var notes, resolvedCount, misses, combo, comboMax, spawnQueue, spawnedN, done, endWait, finished, ready, hitStop, shake, nextMilestone;

  function scheduleNotes() {
    var q = [];
    var t = 0;
    var gap = 0.95;
    for (var i = 0; i < TOTAL; i++) {
      q.push({ lane: Math.floor(game.random(0, LANES)), spawnAt: t });
      gap = Math.max(0.5, gap - 0.05);
      t += gap;
    }
    return q;
  }

  function initGame() {
    notes = []; resolvedCount = 0; misses = 0; combo = 0; comboMax = 0;
    spawnQueue = scheduleNotes(); spawnedN = 0;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; nextMilestone = 4;
  }

  function laneAt(x) {
    var idx = Math.floor((x - 60) / laneW);
    return Math.max(0, Math.min(LANES - 1, idx));
  }

  function tryHit(x, y) {
    if (ready > 0 || done || finished) return;
    var lane = laneAt(x);
    var best = null, bestDist = 1e9;
    for (var i = 0; i < notes.length; i++) {
      var n = notes[i];
      if (n.resolved || n.lane !== lane) continue;
      var d = Math.abs(n.y - HIT_Y);
      if (d < bestDist) { bestDist = d; best = n; }
    }
    if (best && bestDist <= WIN) {
      best.resolved = true;
      resolvedCount++; combo++; comboMax = Math.max(comboMax, combo);
      var mult = combo >= 5 ? 2 : (combo >= 3 ? 1.5 : 1);
      hitStop = 0.05;
      game.feedback.good(laneX(lane), HIT_Y, { text: combo >= 5 ? 'PERFECT' : 'GOOD', color: best.golden ? C.gold : C.good });
      game.audio.play(best.golden ? 'se_powerup' : 'se_good', 0.35);
      if (resolvedCount >= nextMilestone && nextMilestone < TOTAL) {
        game.fx.popup(resolvedCount + ' / ' + TOTAL, laneX(lane), HIT_Y - 220, { color: C.gold, size: 34 });
        game.audio.play('se_milestone', 0.35);
        nextMilestone += 4;
      }
      checkEnd();
    } else {
      hitStop = 0.03;
      game.audio.play('se_tap', 0.12);
      game.fx.flash('#ffffff', 0.05);
    }
  }

  function missNote(n) {
    n.resolved = true; resolvedCount++; misses++; combo = 0;
    hitStop = 0.14; shake = 0.16;
    game.feedback.bad(laneX(n.lane), HIT_Y, { text: 'MISS' });
    game.audio.play('se_bad', 0.35);
    checkEnd();
  }

  function checkEnd() {
    if (finished) return;
    if (misses >= MISS_LIMIT) { ok = false; finished = true; finish(); return; }
    if (resolvedCount >= TOTAL) { ok = true; finished = true; finish(); return; }
  }

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  game.onPress(function(x, y) { if (state === S.PLAYING) tryHit(x, y); });
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });

  function stepNotes(dt) {
    if (spawnedN < spawnQueue.length && game.time.elapsed - readyStartT >= spawnQueue[spawnedN].spawnAt) {
      var q = spawnQueue[spawnedN];
      notes.push({ lane: q.lane, y: TOP_Y, resolved: false, golden: combo >= 4 && spawnedN === spawnQueue.length - 1 });
      spawnedN++;
    }
    for (var i = notes.length - 1; i >= 0; i--) {
      var n = notes[i];
      if (n.resolved) { if (n.y > H + 100) notes.splice(i, 1); continue; }
      n.y += ((HIT_Y - TOP_Y) / FALL_T) * dt;
      if (n.y - HIT_Y > WIN + 20) missNote(n);
    }
  }

  function drawNotes() {
    for (var i = 0; i < notes.length; i++) {
      var n = notes[i];
      if (n.resolved) continue;
      var near = Math.abs(n.y - HIT_Y) < WIN;
      game.draw.circle(laneX(n.lane), n.y, near ? 30 : 24, n.golden ? C.noteGold : C.note);
      game.draw.circle(laneX(n.lane), n.y, near ? 14 : 10, C.white, 0.6);
    }
  }

  var readyStartT = 0;
  var demo = { t: 0, gx: laneX(4), gy: H * 0.9, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 6.4;
    if (cyc < dt || demo.t <= dt) {
      notes = []; resolvedCount = 0; misses = 0; combo = 0; comboMax = 0;
      spawnQueue = [
        { lane: 1, spawnAt: 0.2 }, { lane: 4, spawnAt: 0.9 }, { lane: 7, spawnAt: 1.6 },
        { lane: 2, spawnAt: 2.3 }, { lane: 6, spawnAt: 3.0 },
      ];
      spawnedN = 0; readyStartT = 0;
      demoElapsed = 0;
    }
    demoElapsed += dt;
    while (spawnedN < spawnQueue.length && demoElapsed >= spawnQueue[spawnedN].spawnAt) {
      var q = spawnQueue[spawnedN];
      notes.push({ lane: q.lane, y: TOP_Y, resolved: false, golden: false });
      spawnedN++;
    }
    demo.press = false;
    for (var i = 0; i < notes.length; i++) {
      var n = notes[i];
      if (n.resolved) continue;
      n.y += ((HIT_Y - TOP_Y) / FALL_T) * dt;
      if (Math.abs(n.y - HIT_Y) < 40) {
        demo.gx = laneX(n.lane); demo.press = true;
        n.resolved = true; combo++;
        game.feedback.good(laneX(n.lane), HIT_Y, { text: 'GOOD', color: C.good });
        game.audio.play('se_good', 0.15);
      } else if (n.y - HIT_Y > WIN + 20) {
        n.resolved = true;
      }
    }
  }
  var demoElapsed = 0;

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (notes === undefined) initGame();
      bg();
      stepDemo(dt);
      drawNotes();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 20 });
      txt(GAME_TITLE, W / 2, H * 0.08, 42, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 38, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 26, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawNotes();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 46, ok ? C.good : C.bad);
      txt(resolvedCount - misses + ' / ' + TOTAL, W / 2, H * 0.13, 28, C.gold);
      if (!ok) txt('あと' + (MISS_LIMIT - misses) + '回!', W / 2, H * 0.17, 24, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 24, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(resolvedCount - misses, { hits: resolvedCount - misses, total: TOTAL, comboMax: comboMax });
        else game.end.failure({ hits: resolvedCount - misses, total: TOTAL, misses: misses });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) { readyStartT = game.time.elapsed; game.audio.play('se_tap'); }
    } else if (!finished) {
      stepNotes(dt);
    }
    if (shake > 0) shake -= dt;

    bg();
    if (!finished) drawNotes();

    txt((resolvedCount - misses) + ' / ' + TOTAL, W / 2, H * 0.06, 30, C.white);
    for (var m = 0; m < MISS_LIMIT; m++) game.draw.circle(W - 50 - m * 32, 190, 9, m < misses ? C.bad : '#ffffff30');
    var barW = W - 120;
    game.draw.rect(60, 150, barW, 12, C.ink, 0.5);
    game.draw.rect(60, 150, barW * Math.min(1, combo / 5), 12, combo >= 5 ? C.gold : C.pipeGlow);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['C3', 0.3], ['E3', 0.3], ['G3', 0.3], ['C4', 0.5], ['B3', 0.3], ['G3', 0.5]], { tempo: 150, wave: 'square', volume: 0.06, loop: true, bass: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
