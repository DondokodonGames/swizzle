// D-20132016-0077-clocktower-chime-call.js
// クロックタワーチャイムコール — 一本の鐘綱を落ちてくる鐘に合わせてタップして鳴らす
// 操作: 中央の当たりラインに鐘が重なった瞬間にタップする(単一レーン)
// 終わり: 規定数の鐘のうち一定数以上を良判定で鳴らせば成功。失敗が続くと途中で終わる
// @mechanic: rhythm
// @theme: clocktower_chime
// 世界観: 塔の鐘つき見習いが、落ちてくる鐘のタイミングに合わせて綱を引き、正しい拍で鳴らし続ける
// 残るもの: 正誤(CLEAR/GAME OVER) + 良判定で鳴らした鐘の数
// スタイル: 90s 16bit

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s 16bit: 多色・高彩度、2〜3層の背景で奥行き
  var C = {
    sky1: '#2a2050', sky2: '#4a3a80', tower: '#5a4a70', towerDark: '#382c50',
    lane: '#241c40', laneEdge: '#6a5a90', bell: '#ffd76a', bellDark: '#c99a30',
    good: '#4dffa0', bad: '#ff4d6a', gold: '#ffe600', white: '#f4f0ff', ink: '#100a20',
  };

  var GAME_TITLE = 'CHIME CALL';
  var LANE_X = W * 0.5;
  var HIT_Y = H * 0.66;
  var SPAWN_Y = H * 0.20;
  var TOTAL = 8;
  var NEED_HIT = 6;
  var MAX_TIME = 12;
  var TRAVEL = 1.05;
  var HIT_WINDOW = 0.16;
  var MISS_LIMIT = 3;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var BELL_SPRITE = ['.###.', '#####', '#####', '#####', '..#..'];
  var RINGER_SPRITE = ['..##..', '.####.', '..##..', '.####.', '#.##.#'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.sky1], [0.6, C.sky2], [1, C.tower]]);
    for (var i = 0; i < 5; i++) {
      game.draw.rect(W * 0.1 + i * W * 0.2, H * 0.1, 10, H * 0.55, C.towerDark, 0.4);
    }
    var pulse = 0.03 + 0.03 * Math.sin(game.time.elapsed * 1.3);
    game.draw.rect(0, 0, W, H, '#ffffff', pulse);
    game.draw.rect(LANE_X - 90, SPAWN_Y - 40, 180, HIT_Y - SPAWN_Y + 160, C.lane, 0.55);
    game.draw.rect(LANE_X - 90, HIT_Y - 6, 180, 12, C.laneEdge);
    game.draw.circle(LANE_X, HIT_Y, 100, C.gold, 0.12);
  }

  function newNote(idx) {
    return { t: 0, dur: Math.max(0.62, TRAVEL - idx * 0.02), resolved: false, judged: '' };
  }

  var notes, spawnIdx, spawnTimer, hits, misses, comboJudged;
  var done, endWait, finished, ready, hitStop, shake;

  function initGame() {
    notes = []; spawnIdx = 0; spawnTimer = 0.5;
    hits = 0; misses = 0; comboJudged = 0;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function noteY(n) { return SPAWN_Y + (HIT_Y - SPAWN_Y) * Math.min(1, n.t / n.dur); }

  function resolveNearest() {
    var best = -1, bestD = 1e9;
    for (var i = 0; i < notes.length; i++) {
      if (notes[i].resolved) continue;
      var d = Math.abs(noteY(notes[i]) - HIT_Y);
      if (d < bestD) { bestD = d; best = i; }
    }
    if (best < 0) { game.feedback.bad(LANE_X, HIT_Y, { text: 'MISS' }); game.audio.play('se_bad', 0.2); return; }
    var n = notes[best];
    var pxDist = bestD;
    if (pxDist < 60) {
      n.resolved = true; n.judged = 'good'; hits++; comboJudged++;
      game.feedback.good(LANE_X, HIT_Y, { text: comboJudged >= 3 ? 'PERFECT' : 'GOOD', color: C.good });
      game.audio.play('se_good', 0.4);
      hitStop = 0.05;
      if (hits === Math.ceil(TOTAL / 2)) { game.fx.popup('COMBO', LANE_X, HIT_Y - 200, { color: C.gold, size: 40 }); game.audio.play('se_milestone', 0.35); }
    } else if (pxDist < 130) {
      n.resolved = true; n.judged = 'bad'; misses++; comboJudged = 0;
      game.feedback.bad(LANE_X, HIT_Y, { text: 'MISS' });
      game.audio.play('se_bad', 0.35);
      shake = 0.12; hitStop = 0.08;
    } else {
      game.feedback.bad(LANE_X, HIT_Y, { text: 'MISS' });
      game.audio.play('se_tap', 0.2);
    }
    if (misses >= MISS_LIMIT) { ok = false; finished = true; finish(); }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING && ready <= 0 && !finished) resolveNearest();
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.2;
  }

  function drawScene(list, ringerLean) {
    bg();
    game.draw.sprite(RINGER_SPRITE, { '#': C.bell }, W * 0.5, H * 0.82 + Math.sin(game.time.elapsed * 1.4) * 6, 24, { anchor: 'center', flipX: ringerLean < 0 });
    for (var i = 0; i < list.length; i++) {
      var n = list[i];
      if (n.resolved && n.judged !== '') continue;
      var y = noteY(n);
      var col = n.judged === 'good' ? C.good : n.judged === 'bad' ? C.bad : C.bell;
      game.draw.sprite(BELL_SPRITE, { '#': col }, LANE_X, y, 22, { anchor: 'center' });
    }
  }

  var demo = { t: 0, gx: LANE_X, gy: H * 0.86, press: false, n: null };
  function resetDemo() { demo.n = newNote(0); demo.n.dur = 0.9; }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 1.5;
    if (cyc < dt || demo.t <= dt) resetDemo();
    demo.n.t += dt;
    var y = noteY(demo.n);
    if (!demo.n.resolved && Math.abs(y - HIT_Y) < 8) {
      demo.n.resolved = true; demo.n.judged = 'good';
      demo.press = true;
      game.feedback.good(LANE_X, HIT_Y, { text: 'GOOD', color: C.good });
      game.audio.play('se_good', 0.2);
    } else {
      demo.press = false;
    }
    demo.gx = LANE_X; demo.gy = HIT_Y + 130;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      stepDemo(dt);
      drawScene([demo.n], 0);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 44, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      game.draw.sprite(RINGER_SPRITE, { '#': C.bell }, W * 0.5, H * 0.82, 24, { anchor: 'center' });
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 48, ok ? C.good : C.bad);
      txt(hits + ' / ' + TOTAL, W / 2, H * 0.13, 30, C.gold);
      if (!ok) txt('あと' + Math.max(0, NEED_HIT - hits) + '回!', W / 2, H * 0.18, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(hits, { hits: hits, total: TOTAL });
        else game.end.failure({ hits: hits, total: TOTAL });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      spawnTimer -= dt;
      if (spawnTimer <= 0 && spawnIdx < TOTAL) {
        notes.push(newNote(spawnIdx));
        spawnIdx++;
        spawnTimer = 0.95;
      }
      for (var i = 0; i < notes.length; i++) {
        var n = notes[i];
        if (n.resolved) continue;
        n.t += dt;
        if (n.t / n.dur >= 1.35) {
          n.resolved = true; n.judged = 'bad'; misses++; comboJudged = 0;
          shake = 0.12; hitStop = 0.08;
          game.feedback.bad(LANE_X, HIT_Y, { text: 'MISS' });
          game.audio.play('se_bad', 0.3);
          if (misses >= MISS_LIMIT) { ok = false; finished = true; finish(); }
        }
      }
      if (!finished && spawnIdx >= TOTAL && notes.every(function(n) { return n.resolved; })) {
        ok = hits >= NEED_HIT; finished = true; finish();
      }
    }
    if (shake > 0) shake -= dt;

    drawScene(notes, 0);

    txt(hits + ' / ' + TOTAL, W / 2, H * 0.06, 32, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.4);
    game.draw.rect(60, 150, (W - 120) * (spawnIdx / TOTAL), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['C4', 0.5], ['E4', 0.5], ['G4', 0.5], ['C5', 0.5]], { tempo: 110, wave: 'square', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
