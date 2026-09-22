// K-X-0012-octant-step-arena.js
// コンパス床アリーナ — 中心から放射状に伸びる合図を見切り、8方向パネルを踏み分ける
// 操作: 中心から外側へ伸びてくる光が本物なら、届いた瞬間その方向のパネルをタップ。偽の光には触れない
// 終わり: 9回の合図のうちミスが2回以内なら成功。3回外せば失敗
// @mechanic: timing_window
// @theme: compass_floor_dance_arena
// 世界観: 円形のコンパス床を持つダンスアリーナの選抜審査。中心から8方向へ放たれる合図の本物だけを見切り、正しいパネルを踏む
// 残るもの: 正誤(CLEAR/GAME OVER) + 見切れた回数
// スタイル: 90s BIG SPRITE

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s BIG SPRITE: 大きめの単純化キャラ、太い輪郭、影は単色ベタ
  var C = {
    bg: '#1c1030', bg2: '#100820', floor: '#2a1848', floorEdge: '#4a2a78',
    real: '#3dd6ff', fake: '#5a4a6a', dancer: '#ffd23f',
    good: '#3dffa0', bad: '#ff3d6a', gold: '#ffd400', white: '#f4eaff', ink: '#0a0614',
  };

  var GAME_TITLE = 'OCTANT ARENA';
  var CX = W * 0.5, CY = H * 0.46;
  var R_START = 50, R_HIT = 330;
  var N_DIR = 8;
  var FALL_T = 1.05;
  var WIN_R = 55;
  var TOTAL = 9;
  var MISS_LIMIT = 2;

  function angleOf(i) { return (-90 + i * 45) * Math.PI / 180; }
  function padPos(i) { var a = angleOf(i); return { x: CX + R_HIT * Math.cos(a), y: CY + R_HIT * Math.sin(a) }; }

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var DANCER = ['.##.', '####', '.##.', '#..#'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    game.draw.circle(CX, CY, R_HIT + 60, C.floorEdge, 0.25);
    game.draw.circle(CX, CY, R_HIT, C.floor, 0.5);
    for (var i = 0; i < N_DIR; i++) {
      var p = padPos(i);
      game.draw.line(CX, CY, p.x, p.y, C.floorEdge, 2);
    }
  }

  function drawPads(litIdx, ringOk) {
    for (var i = 0; i < N_DIR; i++) {
      var p = padPos(i);
      var isLit = i === litIdx;
      game.draw.circle(p.x, p.y, isLit ? 46 : 34, isLit ? (ringOk ? C.real : C.bad) : '#ffffff20');
    }
  }

  var events, evIdx, resolvedN, misses, curEvent, done, endWait, finished, ready, hitStop, shake, nextMilestone;

  function buildEvents() {
    var arr = [];
    var gap = 0.95;
    for (var i = 0; i < TOTAL; i++) {
      var isFake = (i === 2 || i === 5 || i === 7);
      arr.push({ lane: Math.floor(game.random(0, N_DIR)), fake: isFake, spawnAt: (i === 0 ? 0 : arr[i - 1].spawnAt + gap) });
      gap = Math.max(0.6, gap - 0.04);
    }
    return arr;
  }

  var readyStartT = 0;
  function initGame() {
    events = buildEvents(); evIdx = 0; resolvedN = 0; misses = 0; curEvent = null;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; readyStartT = 0; nextMilestone = 4;
  }

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function checkEnd() {
    if (finished) return;
    if (misses >= MISS_LIMIT) { ok = false; finished = true; finish(); return; }
    if (resolvedN >= TOTAL) { ok = true; finished = true; finish(); return; }
  }

  function onGood(lane, isReal) {
    resolvedN++;
    hitStop = 0.05;
    game.feedback.good(padPos(lane).x, padPos(lane).y, { text: isReal ? 'HIT' : 'READ', color: C.good });
    game.audio.play('se_good', 0.3);
    if (resolvedN >= nextMilestone && nextMilestone < TOTAL) {
      game.fx.popup(resolvedN + ' / ' + TOTAL, CX, CY - R_HIT - 60, { color: C.gold, size: 32 });
      game.audio.play('se_milestone', 0.35);
      nextMilestone += 4;
    }
    checkEnd();
  }

  function onBad(lane) {
    resolvedN++; misses++;
    hitStop = 0.24; shake = 0.22;
    game.feedback.bad(padPos(lane).x, padPos(lane).y, { text: 'MISS' });
    game.audio.play('se_bad', 0.35);
    checkEnd();
  }

  function tryPad(x, y) {
    if (ready > 0 || done || finished || !curEvent || curEvent.resolved) return;
    var best = -1, bestD = 1e9;
    for (var i = 0; i < N_DIR; i++) {
      var p = padPos(i);
      var d = Math.hypot(x - p.x, y - p.y);
      if (d < bestD) { bestD = d; best = i; }
    }
    if (bestD > 110) return;
    curEvent.resolved = true;
    if (curEvent.fake) {
      onBad(best);
    } else if (best === curEvent.lane && Math.abs(curEvent.r - R_HIT) <= WIN_R) {
      onGood(best, true);
    } else {
      onBad(best);
    }
  }

  game.onPress(function(x, y) { if (state === S.PLAYING) tryPad(x, y); });
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });

  function stepEvents(dt) {
    if (!curEvent && evIdx < events.length && game.time.elapsed - readyStartT >= events[evIdx].spawnAt) {
      curEvent = events[evIdx]; curEvent.r = R_START; curEvent.resolved = false;
      evIdx++;
    }
    if (curEvent && !curEvent.resolved) {
      curEvent.r += ((R_HIT - R_START) / FALL_T) * dt;
      if (curEvent.r - R_HIT > WIN_R + 15) {
        curEvent.resolved = true;
        if (curEvent.fake) onGood(curEvent.lane, false);
        else onBad(curEvent.lane);
      }
    }
    if (curEvent && curEvent.resolved && curEvent.r - R_HIT > WIN_R + 15) curEvent = null;
    else if (curEvent && curEvent.resolved) {
      curEvent.r += ((R_HIT - R_START) / FALL_T) * dt * 2;
      if (curEvent.r > R_HIT + 200) curEvent = null;
    }
  }

  function drawEvent() {
    if (!curEvent) return;
    var a = angleOf(curEvent.lane);
    var x = CX + curEvent.r * Math.cos(a), y = CY + curEvent.r * Math.sin(a);
    game.draw.circle(x, y, 26, curEvent.fake ? C.fake : C.real);
    game.draw.circle(x, y, 12, C.white, 0.7);
  }

  var demo = { t: 0, gx: CX, gy: CY + R_HIT, press: false };
  var demoEvents = [
    { lane: 0, fake: false, spawnAt: 0.2 }, { lane: 3, fake: true, spawnAt: 1.2 }, { lane: 5, fake: false, spawnAt: 2.1 },
  ];
  var demoIdx = 0, demoElapsed = 0, demoCur = null;
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.4;
    if (cyc < dt || demo.t <= dt) { demoIdx = 0; demoElapsed = 0; demoCur = null; }
    demoElapsed += dt;
    if (!demoCur && demoIdx < demoEvents.length && demoElapsed >= demoEvents[demoIdx].spawnAt) {
      demoCur = demoEvents[demoIdx]; demoCur.r = R_START; demoCur.resolved = false;
      curEvent = demoCur;
      demoIdx++;
    }
    demo.press = false;
    if (demoCur && !demoCur.resolved) {
      demoCur.r += ((R_HIT - R_START) / FALL_T) * dt;
      var p = padPos(demoCur.lane);
      if (!demoCur.fake && Math.abs(demoCur.r - R_HIT) < 40) {
        demo.gx = p.x; demo.gy = p.y; demo.press = true;
        demoCur.resolved = true;
        game.feedback.good(p.x, p.y, { text: 'HIT', color: C.good });
        game.audio.play('se_good', 0.18);
      } else if (demoCur.fake && demoCur.r > R_HIT - 20) {
        demoCur.resolved = true;
      } else if (demoCur.r - R_HIT > WIN_R + 15) {
        demoCur.resolved = true;
      }
      if (demoCur.resolved) { curEvent = null; demoCur = null; }
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      bg();
      stepDemo(dt);
      drawPads(curEvent ? curEvent.lane : -1, curEvent ? !curEvent.fake : true);
      drawEvent();
      game.draw.sprite(DANCER, { '#': C.dancer }, CX, CY, 20, { anchor: 'center' });
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 22 });
      txt(GAME_TITLE, W / 2, H * 0.08, 40, C.white);
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
      drawPads(-1, true);
      game.draw.sprite(DANCER, { '#': C.dancer }, CX, CY, 20, { anchor: 'center' });
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 44, ok ? C.good : C.bad);
      txt((resolvedN - misses) + ' / ' + TOTAL, W / 2, H * 0.13, 28, C.gold);
      if (!ok) txt('あと' + (MISS_LIMIT - misses) + '回!', W / 2, H * 0.17, 24, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 24, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        var hitN = resolvedN - misses;
        if (ok) game.end.success(hitN, { hits: hitN, total: TOTAL, misses: misses });
        else game.end.failure({ hits: hitN, total: TOTAL, misses: misses });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) { readyStartT = game.time.elapsed; game.audio.play('se_tap'); }
    } else if (!finished) {
      stepEvents(dt);
    }
    if (shake > 0) shake -= dt;

    bg();
    drawPads(curEvent ? curEvent.lane : -1, curEvent ? !curEvent.fake : true);
    if (!finished) drawEvent();
    game.draw.sprite(DANCER, { '#': (finished && !ok) ? C.bad : C.dancer }, CX, CY, 20, { anchor: 'center' });

    txt((resolvedN - misses) + ' / ' + TOTAL, W / 2, H * 0.06, 30, C.white);
    for (var m = 0; m < MISS_LIMIT; m++) game.draw.circle(W - 50 - m * 32, 190, 9, m < misses ? C.bad : '#ffffff30');
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.86, 54, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['E4', 0.2], ['B4', 0.2], ['G4', 0.2], ['D5', 0.35]], { tempo: 148, wave: 'sawtooth', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
