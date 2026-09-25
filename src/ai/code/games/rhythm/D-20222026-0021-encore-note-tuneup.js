// D-20222026-0021-encore-note-tuneup.js
// アンコール・ノートチューンアップ — 一つの練習メニューを選んで本番に臨み、流れるノーツに合わせて演じきる
// 操作: 最初に3つの練習アイコンから1つをタップして選び、続いて3レーンを流れるノーツをタイミングよくタップする
// 終わり: 規定数以上ノーツを正しく叩ければ成功。届かなければ/時間切れで失敗
// @mechanic: rhythm
// @theme: encore_note_tuneup
// 世界観: 舞台裏の新人パフォーマーが、一つの練習メニューを選んで本番に臨み、流れるノーツに合わせて演じきる
// 残るもの: 正誤(CLEAR/GAME OVER) + ヒットしたノーツ数
// スタイル: 2000s HANDHELD PASTEL

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2000s HANDHELD PASTEL: 淡いパステル3色+白フチ、丸みのあるUI
  var STYLE = {
    bg: ['#ffe0ef', '#ffd0e6'],
    main: ['#ff8fc0', '#7fd8ff', '#ffe08a'],
    accent: ['#4a2d40', '#ffffff'],
  };
  var C = {
    bg1: STYLE.bg[0], bg2: STYLE.bg[1],
    ink: STYLE.accent[0], white: STYLE.accent[1],
    good: '#5fd97f', bad: '#ff5d7a', gold: '#ffb84d',
    lane: '#ffffffaa',
  };
  var PRACTICE_COL = STYLE.main;
  var LANE_X = [W * 0.28, W * 0.5, W * 0.72];
  var HIT_Y = H * 0.72;
  var NOTE_SPEED = 620;
  var SPAWN_Y = H * 0.2;
  var TRAVEL = (HIT_Y - SPAWN_Y) / NOTE_SPEED;
  var SPAWN_INTERVAL = 1.05;
  var WINDOW_HIT = 90;

  var NOTE_N = 8;
  var TARGET = 6;

  var GAME_TITLE = 'ENCORE TUNEUP';
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: '#00000055', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var STAR_SHAPE = ['..#..', '.###.', '#####', '.#.#.', '#...#'];
  var PERFORMER_FRAMES = [
    ['.##.', '####', '.##.', '#.#.'],
    ['.##.', '####', '.##.', '.#.#'],
  ];

  var PHASE = { SELECT: 0, READY: 1, PERFORM: 2 };
  var phase, selectT, readyT, chosenBonus, notes, hitCount, missCount, noteIdx, spawnClock, lastLane, performT;
  var done, endWait, finished, hitStop, shake, halfCalled;

  function initGame() {
    phase = PHASE.SELECT; selectT = 1.6; readyT = 0.8; chosenBonus = -1;
    notes = []; hitCount = 0; missCount = 0; noteIdx = 0; spawnClock = 0; lastLane = -1; performT = 0;
    done = false; endWait = 0; finished = false;
    hitStop = 0; shake = 0; halfCalled = false;
  }

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg1], [1, C.bg2]]);
    var pulse = 0.04 + 0.04 * Math.sin(game.time.elapsed * 1.6);
    game.draw.rect(0, 0, W, H, '#ffffff', pulse * 0.3);
    var bob = Math.sin(game.time.elapsed * 2.4) * 6;
    game.draw.sprite(PERFORMER_FRAMES[Math.floor(game.time.elapsed * 4) % 2], { '#': C.ink }, W * 0.86, H * 0.14 + bob, 12, { anchor: 'center' });
  }

  function drawSelect() {
    var y = H * 0.44;
    for (var i = 0; i < PRACTICE_COL.length; i++) {
      var x = W * (0.25 + 0.25 * i);
      var sel = i === chosenBonus;
      game.draw.circle(x, y, 110, sel ? C.white : '#ffffff88');
      game.draw.sprite(STAR_SHAPE, { '#': PRACTICE_COL[i] }, x, y, 20, { anchor: 'center' });
      if (sel) game.draw.circle(x, y, 122, PRACTICE_COL[i], 0.5);
    }
  }

  function laneAt(x) {
    var best = -1, bd = 1e9;
    for (var i = 0; i < LANE_X.length; i++) { var d = Math.abs(LANE_X[i] - x); if (d < bd) { bd = d; best = i; } }
    return best;
  }

  function drawLanes() {
    for (var i = 0; i < LANE_X.length; i++) {
      game.draw.rect(LANE_X[i] - 90, SPAWN_Y - 20, 180, HIT_Y - SPAWN_Y + 120, C.lane, 0.3);
    }
    game.draw.rect(0, HIT_Y - 8, W, 16, C.white, 0.7);
    for (var n = 0; n < notes.length; n++) {
      var nt = notes[n];
      if (nt.done) continue;
      var col = chosenBonus >= 0 ? PRACTICE_COL[chosenBonus] : PRACTICE_COL[nt.lane];
      game.draw.circle(LANE_X[nt.lane], nt.y, 44, col);
    }
  }

  function selectPractice(x, y) {
    var idx = -1, bd = 1e9;
    for (var i = 0; i < PRACTICE_COL.length; i++) {
      var lx = W * (0.25 + 0.25 * i);
      var d = Math.hypot(lx - x, H * 0.44 - y);
      if (d < bd) { bd = d; idx = i; }
    }
    chosenBonus = idx;
    game.feedback.good(x, y, { text: 'GOOD', color: C.good });
    game.audio.play('se_powerup', 0.4);
    phase = PHASE.READY;
  }

  function tryHit(x, y) {
    var lane = laneAt(x);
    var best = -1, bd = WINDOW_HIT;
    for (var n = 0; n < notes.length; n++) {
      var nt = notes[n];
      if (nt.done || nt.lane !== lane) continue;
      var d = Math.abs(nt.y - HIT_Y);
      if (d < bd) { bd = d; best = n; }
    }
    if (best >= 0) {
      notes[best].done = true;
      hitCount++;
      game.feedback.good(LANE_X[lane], HIT_Y, { text: 'GOOD', color: C.good });
      game.audio.play('se_good', 0.3);
      if (!halfCalled && hitCount >= Math.ceil(TARGET / 2)) {
        halfCalled = true;
        game.fx.popup('NICE', W * 0.5, H * 0.3, { color: C.gold, size: 32 });
        game.audio.play('se_milestone', 0.3);
      }
    } else {
      game.feedback.bad(LANE_X[lane], HIT_Y, { text: 'MISS' });
      game.audio.play('se_bad', 0.25);
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state !== S.PLAYING || finished) return;
    if (phase === PHASE.SELECT) selectPractice(x, y);
    else if (phase === PHASE.PERFORM) tryHit(x, y);
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  function endPerformIfDue() {
    if (noteIdx >= NOTE_N && notes.every(function(n) { return n.done || n.y > HIT_Y + 140; })) {
      finished = true; hitStop = 0.3;
      ok = hitCount >= TARGET;
      if (ok) {
        game.fx.burst(W / 2, HIT_Y, { color: C.gold, count: 24, speed: 420 });
        game.audio.play('se_success', 0.5);
      } else {
        game.audio.play('se_failure', 0.4);
      }
      finish();
    }
  }

  var demo = { t: 0, gx: 0, gy: 0, press: false };
  function resetDemo() { initGame(); phase = PHASE.SELECT; }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 8.5;
    if (cyc < dt || demo.t <= dt) resetDemo();
    if (phase === PHASE.SELECT) {
      demo.gx = W * 0.5; demo.gy = H * 0.44; demo.press = cyc > 0.6;
      if (cyc > 0.7 && chosenBonus < 0) { chosenBonus = 1; phase = PHASE.READY; readyT = 0.8; }
      return;
    }
    if (phase === PHASE.READY) {
      readyT -= dt; demo.press = false;
      if (readyT <= 0) { phase = PHASE.PERFORM; performT = 0; spawnClock = 0; }
      return;
    }
    stepPerform(dt, true);
  }

  function spawnNote() {
    var lane;
    do { lane = Math.floor(Math.random() * LANE_X.length); } while (lane === lastLane && Math.random() < 0.6);
    lastLane = lane;
    notes.push({ lane: lane, y: SPAWN_Y, done: false });
    noteIdx++;
  }

  function stepPerform(dt, isDemo) {
    performT += dt;
    if (noteIdx < NOTE_N) {
      spawnClock -= dt;
      if (spawnClock <= 0) { spawnNote(); spawnClock = SPAWN_INTERVAL; }
    }
    for (var n = 0; n < notes.length; n++) {
      var nt = notes[n];
      if (nt.done) continue;
      nt.y += NOTE_SPEED * dt;
      if (isDemo) {
        if (Math.abs(nt.y - HIT_Y) < 20) {
          nt.done = true; hitCount++;
          demo.gx = LANE_X[nt.lane]; demo.gy = HIT_Y; demo.press = true;
          game.feedback.good(LANE_X[nt.lane], HIT_Y, { text: 'GOOD', color: C.good });
          game.audio.play('se_good', 0.15);
        }
      } else if (nt.y > HIT_Y + WINDOW_HIT) {
        nt.done = true; missCount++;
      }
    }
    if (!isDemo) endPerformIfDue();
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!notes) initGame();
      bg();
      stepDemo(dt);
      if (phase === PHASE.SELECT) drawSelect(); else drawLanes();
      game.draw.hand(demo.gx || W * 0.5, demo.gy || H * 0.5, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.06, 34, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.045, 18, C.ink);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.94, 28, C.ink);
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawLanes();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.06, 44, ok ? C.good : C.bad);
      txt(hitCount + ' / ' + TARGET, W / 2, H * 0.045, 24, C.gold);
      if (!ok) txt('あと' + Math.max(0, TARGET - hitCount) + '個!', W / 2, H * 0.85, 24, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(hitCount, { hit: hitCount, miss: missCount });
        else game.end.failure({ hit: hitCount, miss: missCount });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (phase === PHASE.SELECT) {
      selectT -= dt;
      if (selectT <= 0 && chosenBonus < 0) selectPractice(W * 0.5, H * 0.44);
    } else if (phase === PHASE.READY) {
      readyT -= dt;
      if (readyT <= 0) { phase = PHASE.PERFORM; game.audio.play('se_tap'); }
    } else if (phase === PHASE.PERFORM && !finished) {
      stepPerform(dt, false);
    }
    if (shake > 0) shake -= dt;

    bg();
    if (phase === PHASE.SELECT) drawSelect(); else drawLanes();

    if (phase === PHASE.PERFORM) txt(hitCount + ' / ' + TARGET, W / 2, H * 0.06, 26, C.ink);
    if (phase === PHASE.READY) txt(readyT > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.55, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['E4', 0.2], ['G4', 0.2], ['B4', 0.2], ['E5', 0.2], ['G5', 0.4]], { tempo: 160, wave: 'square', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
