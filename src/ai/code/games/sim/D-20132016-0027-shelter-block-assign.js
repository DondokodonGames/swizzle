// D-20132016-0027-shelter-block-assign.js
// シェルターブロック・アサイン — 空いた部屋ブロックに合う住人を選んで割り当てる
// 操作: 上に示された部屋の役割アイコンと同じ役割の住人を、下の3人から選んでタップ
// 終わり: 規定人数(5人)を正しく割り当てれば成功。1回でも間違えるか時間切れで失敗
// @mechanic: gap_fit
// @theme: underground_shelter_room_assign
// 世界観: 地下シェルターの管理ブロック。空いた部屋ブロックが役割を示し、待機列の住人から合う一人だけを選んで割り当てる管理官
// 残るもの: 正誤(CLEAR/GAME OVER) + 割り当てた人数
// スタイル: VOXEL BLOCK

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // VOXEL BLOCK: 立方体を上面/左面/正面の3明度で。等角に積む
  var C = {
    bg: '#1a1f2c', bg2: '#0f131c', blockTop: '#4a5a78', blockSide: '#2e3a52', blockFront: '#3a4868',
    med: '#ff6b7a', farm: '#5fd67a', eng: '#ffc94d',
    good: '#4dffb0', bad: '#ff4d5e', gold: '#ffd400', white: '#e8edf5', ink: '#04060a',
  };

  var GAME_TITLE = 'SHELTER ASSIGN';
  var TOTAL = 5, MAX_TIME = 19; // gap_fit = E族 15-25s

  var TYPES = ['med', 'farm', 'eng'];
  var ICON = {
    med: ['..#..', '#####', '..#..'],
    farm: ['..#..', '.###.', '#####'],
    eng: ['.#.#.', '#####', '.#.#.'],
  };
  var COL = { med: C.med, farm: C.farm, eng: C.eng };

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var ROOM_X = W * 0.5, ROOM_Y = H * 0.36;
  var CAND_Y = H * 0.80;
  function candX(i) { return [W * 0.24, W * 0.5, W * 0.76][i]; }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    for (var i = 0; i < 6; i++) game.draw.rect(0, H * 0.14 + i * (H * 0.10), W, 1, '#ffffff06');
  }

  // 簡略化した立方体アイコン: 正面(明)+上面(やや明)+右面(暗)の3枚で立体感を作る
  function drawVoxel(cx, cy, size, type, dim) {
    var top = dim ? C.blockSide : C.blockTop;
    var front = dim ? '#20283a' : C.blockFront;
    var side = dim ? '#161c28' : C.blockSide;
    game.draw.rect(cx - size * 0.5, cy - size * 0.22, size, size * 0.62, front);
    game.draw.rect(cx - size * 0.5, cy - size * 0.42, size, size * 0.22, top);
    game.draw.rect(cx + size * 0.28, cy - size * 0.22, size * 0.22, size * 0.62, side);
    if (type) game.draw.sprite(ICON[type], { '#': dim ? '#556' : COL[type] }, cx, cy + size * 0.08, size / 34, { anchor: 'center' });
  }

  var round, target, cands, chosen, wrongIdx, placed, timeLeft, milestoneShown;
  var done, endWait, finished;
  var ready, hitStop, shake, celebrate;

  function makeRound(demoMode, forceCorrectIdx) {
    var t = demoMode ? 'eng' : TYPES[Math.floor(game.random(0, 3))];
    var correctIdx = forceCorrectIdx !== undefined ? forceCorrectIdx : Math.floor(demoMode ? 1 : game.random(0, 3));
    var arr = [];
    for (var i = 0; i < 3; i++) {
      if (i === correctIdx) { arr.push({ type: t, x: candX(i), y: CAND_Y }); continue; }
      var others = TYPES.filter(function(tt) { return tt !== t; });
      arr.push({ type: others[Math.floor(Math.random() * others.length)], x: candX(i), y: CAND_Y });
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
      if (d < 110 && d < bestD) { bestD = d; best = i; }
    }
    if (best < 0) return;
    game.audio.play('se_tap', 0.2);
    var c = cands[best];
    if (c.type === target) {
      chosen = best;
      placed++;
      game.feedback.good(c.x, c.y, { text: placed >= TOTAL ? 'CLEAR' : 'GOOD', color: C.good });
      game.fx.burst(ROOM_X, ROOM_Y, { color: C.gold, count: 16, speed: 320 });
      if (!milestoneShown && placed >= Math.ceil(TOTAL / 2)) {
        milestoneShown = true;
        game.fx.popup('HALFWAY!', W / 2, H * 0.15, { color: C.gold, size: 38 });
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

  function drawRoom(bobY) {
    drawVoxel(ROOM_X, ROOM_Y + bobY, 220, chosen >= 0 && !finished ? target : null, chosen < 0);
    if (chosen < 0) game.draw.sprite(ICON[target], { '#': COL[target] }, ROOM_X, ROOM_Y - 160, 16, { anchor: 'center' });
  }

  function drawCands(bobY) {
    for (var i = 0; i < cands.length; i++) {
      var c = cands[i];
      if (chosen === i) continue;
      var flashWrong = wrongIdx === i && hitStop > 0;
      drawVoxel(c.x, c.y + bobY, flashWrong ? 150 : 140, c.type, false);
      if (flashWrong) game.draw.circle(c.x, c.y + bobY, 100, C.bad, 0.3);
    }
  }

  var demo = { t: 0, gx: candX(1), gy: H * 0.94, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.6;
    if (cyc < dt || demo.t <= dt) {
      var r = makeRound(true, 1);
      target = r.target; cands = r.cands; chosen = -1; wrongIdx = -1;
      demo.gx = W * 0.5; demo.gy = H * 0.94; demo.press = false;
    }
    if (cyc > 1.6 && cyc < 3.0 && chosen < 0) {
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
    var elapsed = game.time.elapsed;
    var bob = Math.sin(elapsed * 1.8) * 5;

    if (state === S.ATTRACT) {
      if (!target) initGame();
      bg();
      game.draw.rect(0, 0, W, H, '#ffffff', 0.03 + 0.03 * Math.sin(elapsed * 1.3));
      stepDemo(dt);
      drawRoom(bob);
      drawCands(bob);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.06, 40, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.63, 22, C.gold);
      if (Math.floor(elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.96, 36, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.96, 26, C.white);
      return;
    }

    if (state === S.RESULT) {
      bg(); drawRoom(0); drawCands(0);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.06, 46, ok ? C.good : C.bad);
      txt(placed + ' / ' + TOTAL, W / 2, H * 0.63, 30, C.gold);
      if (!ok) txt('あと' + (TOTAL - placed) + '人!', W / 2, H * 0.67, 24, C.white);
      if (ok && (game.best === 0 || placed >= game.best)) txt('NEW RECORD', W / 2, H * 0.67, 24, C.gold);
      if (Math.floor(elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.96, 26, C.white);
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
      if (timeLeft <= 0) { timeLeft = 0; ok = false; finished = true; hitStop = 0.3; game.feedback.bad(ROOM_X, ROOM_Y, { text: 'MISS' }); finish(); }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawRoom(bob);
    drawCands(bob);

    txt(placed + ' / ' + TOTAL, W / 2, H * 0.06, 30, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * Math.max(0, timeLeft / MAX_TIME), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.56, 54, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['G3', 0.3], ['A3', 0.3], ['C4', 0.3], ['D4', 0.5]], { tempo: 104, wave: 'square', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
