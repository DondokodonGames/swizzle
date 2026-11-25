// I-GBA-0027v3-hatchery-fry-sort.js
// 養魚場の稚魚より分け — 水路を流れてくる稚魚をつまみ上げ、大きさの合う桶へドラッグで振り分ける
// 操作: 流れてくる稚魚を指で押さえてつまみ、小・中・大の絵が描かれた桶の上で離す。落ち葉は流しておく
// 終わり: 12匹を正しい桶へ入れれば成功。桶違い・排水口へ流す・落ち葉を桶に入れるが3回で失敗、時間切れも失敗
// @mechanic: drag_sort
// @theme: hatchery_fry_sorting
// 世界観: 山あいの養魚場の選別台で、作業員が水路を流れてくる稚魚を一匹ずつすくい上げ、放流前に大きさ別の桶へ手早く振り分ける
// 残るもの: 正誤(CLEAR/GAME OVER) + 正しく振り分けた匹数と最大コンボ
// スタイル: 2010s FLAT MOBILE

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2010s FLAT MOBILE: 影なし・丸角・余白、ベタ塗り数色
  var STYLE = { bg: ['#e9f4f1', '#cfe8e2', '#8fc9d9'], main: ['#ff8a5c', '#4a6fa5', '#ffd166'], accent: ['#06d6a0', '#ef476f'] };
  var F = {
    paper: STYLE.bg[0], mint: STYLE.bg[1], water: STYLE.bg[2], waterDeep: '#6bb2c6',
    fry: STYLE.main[0], navy: STYLE.main[1], sun: STYLE.main[2], ok: STYLE.accent[0], ng: STYLE.accent[1],
    wood: '#c99a6b', woodDark: '#a8794f', leaf: '#8db255', white: '#ffffff',
  };

  var GAME_TITLE = 'FRY SORTER';
  var TIME_LIMIT = 24;
  var NEEDED = 12;
  var MISS_MAX = 3;
  var CH = { x: W / 2, w: 300, top: Math.round(H * 0.14), bottom: Math.round(H * 0.68) };
  var TUBS = [
    { x: W * 0.18, y: H * 0.8, size: 0, col: '#9bd5f5' },
    { x: W * 0.5, y: H * 0.8, size: 1, col: '#ffd166' },
    { x: W * 0.82, y: H * 0.8, size: 2, col: '#ff8a5c' },
  ];
  var SCALE = [7, 11, 15];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var st = S.ATTRACT;
  var victory = false;

  var fish, held, sorted, misses, combo, bestCombo, left, cue, spawnIn, stall, closing, closeT, spot, halfDone, elapsedRun;

  function write(str, x, y, sz, color) {
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: 'center' });
  }

  var FRY_A = ['..ooo...', '.oooooo.', 'oeooooo.', '.oooooo.', '..ooo...'];
  var FRY_B = ['..ooo...', '.oooooo.', 'oeoooooo', '.oooooo.', '..ooo...'];
  var LEAF = ['...ll', '..lll', '.lll.', 'lll..', 'l....'];
  var WORKER = ['..hhhh..', '.hhhhhh.', '..ffff..', '..f..f..', '..ffff..', '.aaaaaa.', 'fa.aa.af', '..aaaa..', '..n..n..', '.nn..nn.'];

  function initGame() {
    fish = []; held = null; sorted = 0; misses = 0; combo = 0; bestCombo = 0;
    left = TIME_LIMIT; cue = 0.8; spawnIn = 0.2; stall = 0; closing = false; closeT = 0; spot = null;
    halfDone = false; elapsedRun = 0; victory = false;
  }

  function flowSpeed() { return 90 + elapsedRun * 3.2; }

  function spawnFish(kind) {
    var k = kind;
    if (k === undefined) k = (elapsedRun > 6 && game.random(0, 1) < 0.14) ? 3 : Math.floor(game.random(0, 3));
    fish.push({ x: CH.x + game.random(-80, 80), y: CH.top - 30, kind: k, ph: game.random(0, 6), warn: false });
  }

  function tubAt(x, y) {
    for (var i = 0; i < TUBS.length; i++) {
      if (Math.abs(x - TUBS[i].x) < 150 && Math.abs(y - TUBS[i].y) < 140) return i;
    }
    return -1;
  }

  function grab(x, y) {
    var best = -1, bd = 110;
    for (var i = 0; i < fish.length; i++) {
      var d = Math.hypot(fish[i].x - x, fish[i].y - y);
      if (d < bd) { bd = d; best = i; }
    }
    if (best < 0) return false;
    held = fish[best];
    fish.splice(best, 1);
    held.x = x; held.y = y;
    return true;
  }

  // 離した結果: 'right' | 'wrong' | 'leaf' | 'back'
  function letGo(x, y) {
    var h = held; held = null;
    var ti = tubAt(x, y);
    if (ti < 0) {
      h.x = Math.max(CH.x - CH.w / 2 + 30, Math.min(CH.x + CH.w / 2 - 30, x));
      h.y = Math.max(CH.top, Math.min(CH.bottom - 200, y));
      fish.push(h);
      return { r: 'back', f: h };
    }
    h.x = TUBS[ti].x; h.y = TUBS[ti].y;
    if (h.kind === 3) return { r: 'leaf', f: h, tub: ti };
    return { r: h.kind === TUBS[ti].size ? 'right' : 'wrong', f: h, tub: ti };
  }

  // 流れと排水口。戻り値: 流れ落ちた魚の配列
  function flow(dt) {
    var lost = [];
    for (var i = fish.length - 1; i >= 0; i--) {
      var f = fish[i];
      f.ph += dt * 6;
      f.y += flowSpeed() * dt;
      f.x += Math.sin(f.ph * 0.5) * 30 * dt;
      f.warn = f.y > CH.bottom - 190;
      if (f.y > CH.bottom) { lost.push(f); fish.splice(i, 1); }
    }
    return lost;
  }

  function addMiss(x, y) {
    misses++; combo = 0;
    game.feedback.bad(x, y, { text: 'MISS', color: F.ng, size: 44 });
    if (misses >= MISS_MAX) {
      closing = true; victory = false; stall = 0.5; closeT = 1.3;
      spot = { x: x, y: y, t: 0 };
      game.audio.stopBgm();
      game.audio.play('se_failure', 0.5);
    }
  }

  game.onPress(function(x, y) {
    if (st !== S.PLAYING || closing || cue > 0) return;
    if (grab(x, y)) {
      game.audio.play('se_tap', 0.25);
      game.fx.burst(x, y, { color: F.water, count: 5, speed: 160 });
    } else {
      game.audio.play('se_tap', 0.08);
      game.fx.popup('…', x, y - 40, { color: F.navy, size: 30 });
    }
  });

  var dripAt = 0;
  game.onMove(function(x, y) {
    if (!held) return;
    held.x = x; held.y = y;
    if (game.time.elapsed - dripAt > 0.14) {
      dripAt = game.time.elapsed;
      game.fx.burst(x, y + 30, { color: F.water, count: 2, speed: 90 });
      if (tubAt(x, y) >= 0) game.audio.tone('G5', 0.03, { wave: 'triangle', volume: 0.03 });
    }
  });

  game.onRelease(function(x, y) {
    if (!held || st !== S.PLAYING) { held = null; return; }
    var res = letGo(x, y);
    if (res.r === 'back') { game.audio.play('se_jump', 0.15); return; }
    if (res.r === 'right') {
      sorted++; combo++; if (combo > bestCombo) bestCombo = combo;
      game.feedback.good(res.f.x, res.f.y - 60, { text: combo >= 3 ? 'COMBO ' + combo : 'GOOD', color: F.ok, size: 44 });
      if (!halfDone && sorted === NEEDED / 2) {
        halfDone = true;
        game.fx.popup('NICE', W / 2, H * 0.4, { color: F.sun, size: 70 });
        game.audio.play('se_milestone', 0.45);
      }
      if (sorted >= NEEDED) {
        closing = true; victory = true; stall = 0.35; closeT = 1.3;
        spot = { x: res.f.x, y: res.f.y, t: 0 };
        game.fx.burst(res.f.x, res.f.y, { color: F.sun, count: 28, speed: 440 });
        game.audio.stopBgm();
        game.audio.play('se_success', 0.5);
      }
    } else {
      addMiss(res.f.x, res.f.y - 60);
    }
  });

  game.onTap(function(x, y) {
    if (st === S.ATTRACT) { game.audio.play('se_coin'); st = S.PLAYING; initGame(); return; }
    if (st === S.RESULT) { st = S.ATTRACT; initGame(); demo.t = 0; return; }
  });

  // ---- 描画 ----
  function roundBox(x, y, w, h, r, col) {
    game.draw.rect(x + r, y, w - 2 * r, h, col);
    game.draw.rect(x, y + r, w, h - 2 * r, col);
    game.draw.circle(x + r, y + r, r, col); game.draw.circle(x + w - r, y + r, r, col);
    game.draw.circle(x + r, y + h - r, r, col); game.draw.circle(x + w - r, y + h - r, r, col);
  }

  function room() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, F.paper], [0.7, F.mint], [1, '#b9ddd4']]);
    for (var m = 0; m < 4; m++) {
      var mx = m * 300 + 60;
      game.draw.circle(mx, 330, 190, '#d6ece6');
    }
    for (var s = 0; s < 6; s++) {
      var bx = (s * 190 + t * 20) % (W + 100) - 50;
      game.draw.circle(bx, 600 + Math.sin(t + s) * 20, 10, F.white, 0.6);
    }
    // 水路
    roundBox(CH.x - CH.w / 2 - 20, CH.top - 40, CH.w + 40, CH.bottom - CH.top + 80, 30, F.wood);
    game.draw.rect(CH.x - CH.w / 2, CH.top - 20, CH.w, CH.bottom - CH.top + 40, F.water);
    for (var r = 0; r < 7; r++) {
      var ry = CH.top + ((r * 150 + t * flowSpeed()) % (CH.bottom - CH.top));
      game.draw.rect(CH.x - CH.w / 2 + 30 + (r % 2) * 90, ry, 110, 8, F.white, 0.5);
    }
    // 排水口(近づくと赤く点滅)
    var alarm = false;
    for (var i = 0; i < fish.length; i++) if (fish[i].warn && fish[i].kind !== 3) alarm = true;
    var drainCol = alarm && Math.floor(t * 10) % 2 === 0 ? F.ng : F.navy;
    game.draw.rect(CH.x - CH.w / 2, CH.bottom - 10, CH.w, 34, drainCol);
    for (var g = 0; g < 6; g++) game.draw.rect(CH.x - CH.w / 2 + 20 + g * 48, CH.bottom - 6, 20, 26, F.paper, 0.6);
  }

  function drawTubs(pulseIdx) {
    for (var i = 0; i < TUBS.length; i++) {
      var tb = TUBS[i];
      var lift = pulseIdx === i ? -10 : 0;
      roundBox(tb.x - 140, tb.y - 110 + lift, 280, 220, 36, F.woodDark);
      roundBox(tb.x - 124, tb.y - 96 + lift, 248, 150, 28, F.waterDeep);
      game.draw.rect(tb.x - 140, tb.y + 60 + lift, 280, 26, tb.col);
      game.draw.sprite(FRY_A, { o: F.white, e: F.navy }, tb.x, tb.y - 22 + lift, SCALE[tb.size], { anchor: 'center', alpha: 0.9 });
    }
  }

  function drawFry(f, big) {
    var fr = Math.floor(f.ph) % 2 === 0 ? FRY_A : FRY_B;
    if (f.kind === 3) {
      game.draw.sprite(LEAF, { l: F.leaf }, f.x, f.y, 16, { anchor: 'center' });
      return;
    }
    var col = f.warn && Math.floor(game.time.elapsed * 10) % 2 === 0 ? F.ng : F.fry;
    game.draw.sprite(fr, { o: col, e: F.navy }, f.x, f.y, SCALE[f.kind] + (big ? 2 : 0), { anchor: 'center', flipY: false });
  }

  function drawAll(pulseIdx) {
    room();
    drawTubs(pulseIdx);
    for (var i = 0; i < fish.length; i++) drawFry(fish[i], false);
    if (held) {
      game.draw.circle(held.x, held.y, 70, F.white, 0.5);
      drawFry(held, true);
    }
    var bob = Math.sin(game.time.elapsed * 3) * 6;
    game.draw.sprite(WORKER, { h: F.navy, f: '#ffd9b3', a: F.ok, n: F.navy }, 110, 560 + bob, 14, { anchor: 'center' });
  }

  function drawHud() {
    write(sorted + ' / ' + NEEDED, W / 2, 60, 46, F.navy);
    roundBox(80, 110, W - 160, 26, 13, '#c2ddd6');
    var lowT = left < 5 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    if (left > 0) roundBox(80, 110, Math.max(26, (W - 160) * (left / TIME_LIMIT)), 26, 13, lowT ? F.ng : F.ok);
    for (var i = 0; i < MISS_MAX; i++) game.draw.circle(W - 120 + i * 40 - 40, 190, 13, i < misses ? F.ng : '#c2ddd6');
    if (combo >= 2) write('COMBO ' + combo, 190, 190, 32, F.fry);
  }

  // ---- ATTRACT: 本物のつまむ/離す判定で 正2回→桶違い1回 ----
  var demo = { t: 0, gx: W / 2, gy: H * 0.4, press: false, stage: 0, from: null, to: null, k: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 6;
    if (cyc < dt || demo.t <= dt) {
      initGame(); cue = 0; demo.stage = 0; demo.k = 0;
      spawnFish(1); fish[0].y = CH.top + 280;
      spawnFish(2); fish[1].y = CH.top + 150;
      spawnFish(0); fish[2].y = CH.top + 40;
    }
    elapsedRun = 0;
    flow(dt);
    if (fish.length < 2) { spawnFish(Math.floor(game.random(0, 3))); }
    demo.press = !!held;
    if (!held) {
      var target = null;
      for (var i = 0; i < fish.length; i++) if (fish[i].y > CH.top + 260) { target = fish[i]; break; }
      if (target) {
        demo.gx += (target.x - demo.gx) * Math.min(1, dt * 12);
        demo.gy += (target.y - demo.gy) * Math.min(1, dt * 12);
        if (Math.hypot(demo.gx - target.x, demo.gy - target.y) < 20 && grab(target.x, target.y)) {
          game.audio.play('se_tap', 0.15);
          var want = held.kind;
          if (demo.k === 2) want = (held.kind + 1) % 3;
          demo.to = TUBS[want];
        }
      }
    } else {
      demo.gx += (demo.to.x - demo.gx) * Math.min(1, dt * 5);
      demo.gy += (demo.to.y - demo.gy) * Math.min(1, dt * 5);
      held.x = demo.gx; held.y = demo.gy;
      if (Math.hypot(demo.gx - demo.to.x, demo.gy - demo.to.y) < 18) {
        var res = letGo(demo.gx, demo.gy);
        demo.k++;
        if (res.r === 'right') {
          game.fx.burst(res.f.x, res.f.y, { color: F.ok, count: 12, speed: 280 });
          game.audio.play('se_good', 0.2);
        } else {
          game.fx.burst(res.f.x, res.f.y, { color: F.ng, count: 12, speed: 280 });
          game.audio.play('se_bad', 0.2);
          game.fx.shake(6, 0.2);
        }
      }
    }
  }

  game.onUpdate(function(dt) {
    if (st === S.ATTRACT) {
      stepDemo(dt);
      drawAll(-1);
      game.draw.hand(demo.gx, demo.gy + 20, { press: demo.press, scale: 13 });
      write(GAME_TITLE, W / 2, 80, 72, F.navy);
      write('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, 150, 34, F.fry);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) write('► 100円 投入 ◄', W / 2, H * 0.955, 44, F.fry);
      else write('INSERT COIN', W / 2, H * 0.955, 34, F.navy);
      return;
    }

    if (st === S.RESULT) {
      drawAll(-1);
      game.draw.rect(0, 0, W, H, F.paper, 0.55);
      var score = sorted * 10 + bestCombo * 5;
      write(victory ? 'CLEAR' : (left <= 0 ? 'TIME UP' : 'GAME OVER'), W / 2, 420, 96, victory ? F.ok : F.ng);
      write('SCORE ' + score, W / 2, 540, 50, F.navy);
      write(sorted + ' / ' + NEEDED, W / 2, 620, 40, F.navy);
      write('COMBO ' + bestCombo, W / 2, 690, 36, F.fry);
      if (victory && score >= game.best) write('NEW RECORD', W / 2, 780, 50, F.fry);
      else write('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, 780, 36, F.navy);
      if (!victory) write('あと' + (NEEDED - sorted) + '匹!', W / 2, 870, 50, F.fry);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) write('TAP TO CONTINUE', W / 2, H * 0.955, 34, F.navy);
      return;
    }

    if (closing) {
      if (stall > 0) { stall -= dt; if (spot) spot.t += dt; }
      else {
        closeT -= dt;
        if (closeT <= 0) {
          st = S.RESULT;
          var sc = sorted * 10 + bestCombo * 5;
          if (victory) game.end.success(sc, { sorted: sorted, combo: bestCombo, miss: misses });
          else game.end.failure({ sorted: sorted, combo: bestCombo, miss: misses });
        }
      }
    } else if (cue > 0) {
      cue -= dt;
      if (cue <= 0) game.audio.play('se_tap', 0.3);
    } else {
      left -= dt; elapsedRun += dt;
      spawnIn -= dt;
      if (spawnIn <= 0) { spawnFish(); spawnIn = Math.max(0.6, 1.35 - elapsedRun * 0.035); }
      var lost = flow(dt);
      for (var i = 0; i < lost.length && !closing; i++) {
        if (lost[i].kind === 3) { game.audio.play('se_tap', 0.1); continue; }
        game.audio.play('se_break', 0.3);
        addMiss(lost[i].x, CH.bottom - 40);
      }
      if (!closing && left <= 0) {
        left = 0; closing = true; victory = false; stall = 0.45; closeT = 1.3;
        spot = { x: W / 2, y: CH.bottom, t: 0 };
        game.feedback.bad(W / 2, H * 0.45, { text: 'TIME UP', color: F.ng });
        game.audio.stopBgm();
        game.audio.play('se_failure', 0.5);
      }
    }

    var over = held ? tubAt(held.x, held.y) : -1;
    drawAll(over);
    if (closing && stall > 0 && spot) game.draw.circle(spot.x, spot.y, 80 + spot.t * 160, F.white, 0.55);
    drawHud();
    if (cue > 0) write(cue > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.4, 96, F.fry);
  });

  game.onStart(function() {
    game.audio.melody([
      ['E5', 0.5], ['C5', 0.5], ['D5', 0.5], ['G4', 0.5], ['A4', 0.5], ['C5', 0.5], ['D5', 1],
      ['E5', 0.5], ['G5', 0.5], ['E5', 0.5], ['D5', 0.5], ['C5', 1], [null, 1],
    ], { tempo: 132, wave: 'triangle', volume: 0.05, loop: true, bass: [['C3', 2], ['A2', 2], ['F2', 2], ['G2', 2]] });
    st = S.ATTRACT;
    initGame();
  });
})(game);
