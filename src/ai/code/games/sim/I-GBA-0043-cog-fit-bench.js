// I-GBA-0043-cog-fit-bench.js
// コグフィットベンチ — 大きさも向きもバラバラな歯車から、台座の凹みにぴったり合う一つを選ぶ
// 操作: 下に並ぶ歯車候補から、上の凹みと同じ大きさ・向きのものをタップして差し込む
// 終わり: 規定数(5個)を正しく選び切れば成功。1回でも間違えるか時間切れで失敗
// @mechanic: gap_fit
// @theme: workshop_cog_bench
// 世界観: 古びた時計工房の作業台。修理待ちの歯車が山積みで、台座の凹みに合う一枚だけを選び出して嵌め込む
// 残るもの: 正誤(CLEAR/GAME OVER) + 嵌め込んだ個数
// スタイル: SKEUOMORPH

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // SKEUOMORPH: 木目・革の質感、gradientで厚み、白ハイライトのボタン感
  var C = {
    bg: '#4a3423', bg2: '#2e2116', wood: '#5c4530', woodLight: '#7a5d3f',
    metal: '#9a9088', metalDark: '#5c564f', accent: '#d9a441',
    good: '#5fdc7c', bad: '#ff5a4d', gold: '#ffd85a', white: '#f5ecdd', ink: '#1c140c',
  };

  var GAME_TITLE = 'COG FIT';
  var TOTAL = 5;
  var MAX_TIME = 20; // gap_fit = E族 15-25s
  var NEEDED = TOTAL;
  var SIZES = [16, 22, 28];
  // 0=上,1=右,2=下,3=左
  function gearFrame(dir) {
    var f = ['.....', '.###.', '#####', '#####', '#####', '.###.', '.....'];
    var rows = f.slice();
    if (dir === 0) rows[0] = '..*..';
    if (dir === 2) rows[6] = '..*..';
    if (dir === 3) { rows[2] = '*####'; rows[3] = '*####'; rows[4] = '*####'; }
    if (dir === 1) { rows[2] = '####*'; rows[3] = '####*'; rows[4] = '####*'; }
    return rows;
  }
  var GEAR_PAL = { '#': C.metal, '*': C.accent };
  var GEAR_PAL_DIM = { '#': C.woodLight, '*': C.metalDark };

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var LOCK_X = W * 0.5, LOCK_Y = H * 0.42;
  var CAND_Y = H * 0.82;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var BENCH_BOT = ['.#.#.', '#####', '.###.', '.#.#.'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    for (var i = 0; i < 10; i++) game.draw.rect(0, i * (H / 10), W, 3, '#00000012');
    game.draw.rect(0, H * 0.70, W, H * 0.30, C.woodLight, 0.15);
    game.draw.sprite(BENCH_BOT, { '#': C.accent }, W * 0.5, H * 0.12, 9, { anchor: 'center' });
  }

  function candX(i, n) {
    var slots = [W * 0.25, W * 0.5, W * 0.75];
    return slots[i];
  }

  var round, target, cands, chosen, wrongIdx, placed, timeLeft, milestoneShown;
  var done, endWait, finished;
  var ready, hitStop, shake, celebrate;

  function pick(arr) { return arr[Math.floor(game.random(0, arr.length))]; }

  function makeRound(demoMode, forceCorrectIdx) {
    var sizeI = Math.floor(demoMode ? 1 : game.random(0, 3));
    var dir = Math.floor(demoMode ? 2 : game.random(0, 4));
    var t = { sizeI: sizeI, dir: dir };
    var correctIdx = forceCorrectIdx !== undefined ? forceCorrectIdx : Math.floor(demoMode ? 1 : game.random(0, 3));
    var arr = [];
    for (var i = 0; i < 3; i++) {
      if (i === correctIdx) { arr.push({ sizeI: sizeI, dir: dir, x: candX(i), y: CAND_Y, taken: false }); continue; }
      var dSize = sizeI, dDir = dir;
      // 誤りは向きかサイズのどちらかを必ずズラす
      if (Math.random() < 0.5 || demoMode) dDir = (dir + 1 + Math.floor(game.random(0, 3))) % 4;
      else dSize = (sizeI + 1 + Math.floor(game.random(0, 2))) % 3;
      if (dDir === dir && dSize === sizeI) dDir = (dir + 1) % 4;
      arr.push({ sizeI: dSize, dir: dDir, x: candX(i), y: CAND_Y, taken: false });
    }
    return { target: t, cands: arr, correctIdx: correctIdx };
  }

  function initGame() {
    round = 0; placed = 0; timeLeft = MAX_TIME; milestoneShown = false;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; celebrate = false;
    var r = makeRound(false);
    target = r.target; cands = r.cands; chosen = -1; wrongIdx = -1;
  }

  function nextRound() {
    round++;
    if (round >= TOTAL) { ok = true; finished = true; hitStop = 0.25; celebrate = true; finish(); return; }
    var r = makeRound(false);
    target = r.target; cands = r.cands; chosen = -1; wrongIdx = -1;
  }

  function tryPick(x, y) {
    if (state !== S.PLAYING || ready > 0 || hitStop > 0 || finished) return;
    var best = -1, bestD = 1e9;
    for (var i = 0; i < cands.length; i++) {
      var d = Math.hypot(cands[i].x - x, cands[i].y - y);
      if (d < 100 && d < bestD) { bestD = d; best = i; }
    }
    if (best < 0) return;
    game.audio.play('se_tap', 0.2);
    var c = cands[best];
    if (c.sizeI === target.sizeI && c.dir === target.dir) {
      chosen = best;
      placed++;
      game.feedback.good(c.x, c.y, { text: placed >= TOTAL ? 'CLEAR' : 'GOOD', color: C.good });
      game.fx.burst(LOCK_X, LOCK_Y, { color: C.gold, count: 16, speed: 320 });
      if (!milestoneShown && placed >= Math.ceil(TOTAL / 2)) {
        milestoneShown = true;
        game.fx.popup('HALFWAY!', W / 2, H * 0.30, { color: C.gold, size: 38 });
        game.audio.play('se_milestone', 0.4);
      }
      if (placed >= TOTAL) { ok = true; finished = true; hitStop = 0.25; celebrate = true; finish(); }
      else { hitStop = 0.15; }
    } else {
      wrongIdx = best;
      game.feedback.bad(c.x, c.y, { text: 'MISS' });
      shake = 0.3;
      ok = false; finished = true; hitStop = 0.35;
      finish();
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) tryPick(x, y);
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function drawLock() {
    var sz = SIZES[target.sizeI];
    game.draw.circle(LOCK_X, LOCK_Y, sz + 20, C.ink, 0.3);
    game.draw.sprite(gearFrame(target.dir), GEAR_PAL_DIM, LOCK_X, LOCK_Y, sz / 5, { anchor: 'center' });
    if (chosen >= 0 && !finished) {
      game.draw.sprite(gearFrame(target.dir), GEAR_PAL, LOCK_X, LOCK_Y, sz / 5, { anchor: 'center' });
    }
    if (celebrate) game.draw.sprite(gearFrame(target.dir), GEAR_PAL, LOCK_X, LOCK_Y, (sz + 4) / 5, { anchor: 'center' });
  }

  function drawCands() {
    for (var i = 0; i < cands.length; i++) {
      var c = cands[i];
      var sz = SIZES[c.sizeI];
      var flashWrong = wrongIdx === i && hitStop > 0;
      var pal = flashWrong ? { '#': C.bad, '*': C.white } : GEAR_PAL;
      var scale = flashWrong ? (sz + 6) / 5 : sz / 5;
      if (chosen === i) continue;
      game.draw.circle(c.x, c.y, sz + 14, C.metalDark, 0.4);
      game.draw.sprite(gearFrame(c.dir), pal, c.x, c.y, scale, { anchor: 'center' });
    }
  }

  var demo = { t: 0, gx: candX(1), gy: CAND_Y, press: false, phase: 0, ci: 1 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.4;
    if (cyc < dt || demo.t <= dt) {
      var r = makeRound(true, 1);
      target = r.target; cands = r.cands; chosen = -1; wrongIdx = -1;
      demo.gx = W * 0.5; demo.gy = H * 0.94; demo.press = false;
    }
    if (cyc > 1.6 && cyc < 2.9 && chosen < 0) {
      var t = Math.min(1, (cyc - 1.6) / 0.5);
      demo.gx = W * 0.5 + (candX(1) - W * 0.5) * t;
      demo.gy = H * 0.94 + (CAND_Y - H * 0.94) * t;
      demo.press = t >= 1;
      if (t >= 1 && chosen < 0) {
        chosen = 1;
        game.feedback.good(candX(1), CAND_Y, { text: 'GOOD', color: C.good });
        game.audio.play('se_tap', 0.15);
      }
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!target) initGame();
      bg();
      stepDemo(dt);
      drawLock();
      drawCands();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.06, 44, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.095, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.96, 38, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.96, 26, C.white);
      return;
    }

    if (state === S.RESULT) {
      bg(); drawLock(); drawCands();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.06, 48, ok ? C.good : C.bad);
      txt(placed + ' / ' + TOTAL, W / 2, H * 0.11, 30, C.gold);
      if (!ok) txt('あと' + (TOTAL - placed) + '個!', W / 2, H * 0.155, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.96, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(placed, { placed: placed, total: TOTAL });
        else game.end.failure({ placed: placed, total: TOTAL });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
      if (hitStop <= 0 && chosen >= 0 && !finished) nextRound();
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      timeLeft -= dt;
      if (timeLeft <= 0) { timeLeft = 0; ok = false; finished = true; hitStop = 0.3; game.feedback.bad(LOCK_X, LOCK_Y, { text: 'MISS' }); finish(); }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawLock();
    drawCands();

    txt(placed + ' / ' + TOTAL, W / 2, H * 0.06, 30, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * Math.max(0, timeLeft / MAX_TIME), 16, C.accent);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.60, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['D3', 0.4], ['F3', 0.4], ['A3', 0.4], ['D4', 0.6]], { tempo: 100, wave: 'triangle', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
