// J-3DSDSDSTOP10-0027-blowhole-cove-swim.js
// 潮吹き入り江 — 水底を黒い影が滑って来たマスから潮柱が噴き上がる。スワイプで隣のマスへ泳いで逃げ、8回の潮吹きをかわしきる
// 操作: 上下左右にスワイプすると、その向きの隣のマスへ1つ泳ぐ。影が集まったマスから離れる
// 終わり: 8回の潮吹きを一度も浴びずにしのげば成功。潮柱に当たったら失敗
// @mechanic: swipe_direction
// @theme: blowhole_cove_swim
// 世界観: 岩鯨の群れが眠る深い入り江で、真珠採りの見習いが水底の影を読み、噴き上がる潮柱の間を泳ぎ抜けて夜明けまで潜り続ける
// 残るもの: 正誤(CLEAR/GAME OVER) + かわした潮吹きの数と拾った真珠
// スタイル: 90s PRE-RENDER

(function (game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s PRE-RENDER: 暗め・金属質、粒状ノイズ、1枚絵の擬似奥行き
  var STYLE = { bg: ['#06222b', '#0b3a44', '#021015'], main: ['#7fd6d0', '#c9e8e6'], accent: ['#f2d27a', '#ff5a4e'] };
  var COL = {
    deep: STYLE.bg[2], mid: STYLE.bg[0], shallow: STYLE.bg[1], aqua: STYLE.main[0], foam: STYLE.main[1],
    pearl: STYLE.accent[0], bad: STYLE.accent[1], steel: '#5d7f86', shadow: '#01080b', white: '#ffffff'
  };

  var GAME_TITLE = 'BLOWHOLE COVE';
  var TIME_LIMIT = 14;
  var NEEDED = 8;
  var CELL = 280, GX = W / 2, GY = H * 0.5;
  var PATTERN = [0, 1, 2, 0, 3, 1, 4, 5];
  var WARN_T = [0.85, 0.8, 0.75, 0.65, 0.8, 0.6, 0.75, 0.75];
  var BLOW = 0.35;

  var DIVER_A = ['..hh..', '.hffh.', '..bb..', 'abbbba', '..bb..', '.l..l.', 'l....l'];
  var DIVER_B = ['..hh..', '.hffh.', '..bb..', '.abba.', 'a.bb.a', '..ll..', '.l..l.'];
  var PAL_DIVER = { h: '#2b2b2b', f: '#e8c09a', b: '#c94a3a', a: '#e8c09a', l: '#2b2b2b' };
  var WHALE = ['...kkkkk...', '.kkkkkkkkk.', 'kkkkkwkkkkk', 'kkkkkkkkkkk', '.kkkkkkkkk.', '..k.....k..'];
  var PAL_WHALE = { k: '#1a3a40', w: '#9fd0cc' };
  var PEARL = ['.pp.', 'pwpp', 'pppp', '.pp.'];
  var PAL_PEARL = { p: STYLE.accent[0], w: '#ffffff' };

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var cr, cc, fromR, fromC, tween, wave, waveI, gap, dodged, pearls, pearl, timeLeft, ready, finished, ok, hitStop, endWait, hl, lastMove, bump, lastOut;
  var silent = false;

  function cap(str, x, y, sz, color) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: '#000000', bold: true, align: 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: 'center' });
  }

  function cellX(c) { return GX + (c - 1) * CELL; }
  function cellY(r) { return GY + (r - 1) * CELL; }
  function inSet(set, r, c) { for (var i = 0; i < set.length; i++) if (set[i][0] === r && set[i][1] === c) return true; return false; }

  function makeTargets(kind) {
    var t = [], r, c;
    if (kind === 0) t.push([cr, cc]);
    else if (kind === 1) for (c = 0; c < 3; c++) t.push([cr, c]);
    else if (kind === 2) for (r = 0; r < 3; r++) t.push([r, cc]);
    else if (kind === 3) {
      t.push([cr, cc]);
      if (cr > 0) t.push([cr - 1, cc]); if (cr < 2) t.push([cr + 1, cc]);
      if (cc > 0) t.push([cr, cc - 1]); if (cc < 2) t.push([cr, cc + 1]);
    } else if (kind === 4) {
      // 1マスだけ残して全部(安全マスは1〜2手先)
      var sr = cr === 1 ? (game.random(0, 1) < 0.5 ? 0 : 2) : 1;
      var sc = cc === 1 ? (game.random(0, 1) < 0.5 ? 0 : 2) : 1;
      if (game.random(0, 1) < 0.5) sr = cr;
      for (r = 0; r < 3; r++) for (c = 0; c < 3; c++) if (!(r === sr && c === sc)) t.push([r, c]);
    } else {
      for (c = 0; c < 3; c++) t.push([cr, c]);
      for (r = 0; r < 3; r++) if (r !== cr) t.push([r, cc]);
    }
    return t;
  }

  function startWave() {
    var k = PATTERN[waveI];
    wave = { phase: 'warn', t: 0, targets: makeTargets(k), warn: WARN_T[waveI] };
    if (!silent) game.audio.tone('C3', wave.warn, { wave: 'sine', volume: 0.1, slide: 180 });
  }

  function placePearl() {
    var r = Math.floor(game.random(0, 3)), c = Math.floor(game.random(0, 3));
    if (r === cr && c === cc) c = (c + 1) % 3;
    pearl = { r: r, c: c };
  }

  function initGame() {
    cr = 1; cc = 1; fromR = 1; fromC = 1; tween = 0; wave = null; waveI = 0; gap = 0.6; dodged = 0; pearls = 0;
    timeLeft = TIME_LIMIT; ready = 0.8; finished = false; ok = false; hitStop = 0; endWait = 0; hl = null; lastMove = 9; bump = 0; lastOut = null;
    placePearl();
  }

  function finishRound(success, x, y) {
    if (finished) return;
    finished = true; ok = success; hitStop = 0.45; hl = { x: x, y: y, t: 0 };
    if (!silent) game.audio.stopBgm();
  }

  // 戻り値: 'move' | 'wall' | 'busy'
  function swim(dir) {
    if (finished) return 'busy';
    var nr = cr, nc = cc;
    if (dir === 'up') nr--; else if (dir === 'down') nr++; else if (dir === 'left') nc--; else if (dir === 'right') nc++;
    if (nr < 0 || nr > 2 || nc < 0 || nc > 2) { bump = 0.2; return 'wall'; }
    lastOut = { r: cr, c: cc, t: 0 };
    fromR = cr; fromC = cc; cr = nr; cc = nc; tween = 0.1; lastMove = 0;
    if (pearl && pearl.r === cr && pearl.c === cc) {
      pearls++;
      game.fx.popup('+' + pearls, cellX(cc), cellY(cr) - 90, { color: COL.pearl, size: 48 });
      if (!silent) game.audio.play('se_coin', 0.4);
      placePearl();
    }
    return 'move';
  }

  function stepWorld(dt) {
    if (finished) return;
    if (tween > 0) tween -= dt;
    if (bump > 0) bump -= dt;
    lastMove += dt;
    if (lastOut) lastOut.t += dt;
    if (!wave) {
      gap -= dt;
      if (gap <= 0) startWave();
      return;
    }
    wave.t += dt;
    if (wave.phase === 'warn' && wave.t >= wave.warn) {
      wave.phase = 'blow'; wave.t = 0;
      if (!silent) game.audio.play('se_break', 0.35);
      if (inSet(wave.targets, cr, cc)) { finishRound(false, cellX(cc), cellY(cr)); return; }
    } else if (wave.phase === 'blow') {
      if (inSet(wave.targets, cr, cc)) { finishRound(false, cellX(cc), cellY(cr)); return; }
      if (wave.t >= BLOW) {
        dodged++; waveI++;
        var close = lastOut && lastOut.t < 0.9 && inSet(wave.targets, lastOut.r, lastOut.c);
        game.feedback.good(cellX(cc), cellY(cr) - 60, { text: close ? 'NICE' : 'GOOD', color: close ? COL.pearl : COL.aqua, sound: silent ? 'se_tap' : 'se_good', volume: silent ? 0 : 0.35 });
        if (dodged === NEEDED / 2) { game.fx.popup(dodged + ' / ' + NEEDED, W / 2, H * 0.24, { color: COL.pearl, size: 56 }); if (!silent) game.audio.play('se_milestone', 0.45); }
        wave = null; gap = Math.max(0.25, 0.4 - waveI * 0.03);
        if (dodged >= NEEDED) finishRound(true, cellX(cc), cellY(cr));
      }
    }
  }

  // ── 描画 ─────────────────────────────────────────────
  function drawBack() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, COL.shallow], [0.45, COL.mid], [1, COL.deep]]);
    game.draw.rect(0, 0, W, H, COL.aqua, 0.03 + 0.03 * Math.sin(t * 1.2));
    // 光の筋(プリレンダ風の水中光)
    for (var i = 0; i < 6; i++) {
      var x = W * (i / 6) + Math.sin(t * 0.4 + i) * 60;
      game.draw.rect(x, 0, 36, H * 0.8, COL.foam, 0.05);
    }
    // 眠る岩鯨(遠景)
    game.draw.sprite(WHALE, PAL_WHALE, W * 0.2 + Math.sin(t * 0.3) * 40, H * 0.2 + Math.sin(t * 0.7) * 8, 16, { anchor: 'center', alpha: 0.8 });
    game.draw.sprite(WHALE, PAL_WHALE, W * 0.8 + Math.cos(t * 0.25) * 40, H * 0.82 + Math.sin(t * 0.6) * 8, 18, { anchor: 'center', flipX: true, alpha: 0.8 });
  }

  function drawGrain() {
    for (var i = 0; i < 70; i++) game.draw.rect(game.random(0, W), game.random(0, H), 4, 4, i % 2 ? '#ffffff' : '#000000', 0.06);
    // ビネット
    game.draw.rect(0, 0, 60, H, COL.shadow, 0.35);
    game.draw.rect(W - 60, 0, 60, H, COL.shadow, 0.35);
  }

  function drawGrid() {
    var t = game.time.elapsed;
    for (var r = 0; r < 3; r++) for (var c = 0; c < 3; c++) {
      var x = cellX(c), y = cellY(r);
      game.draw.rect(x - CELL / 2 + 8, y - CELL / 2 + 8, CELL - 16, CELL - 16, COL.steel, 0.25);
      game.draw.rect(x - CELL / 2 + 16, y - CELL / 2 + 16, CELL - 32, CELL - 32, COL.shallow, 0.55);
      game.draw.rect(x - CELL / 2 + 16, y - CELL / 2 + 16, CELL - 32, 6, COL.foam, 0.2);
    }
    if (pearl) game.draw.sprite(PEARL, PAL_PEARL, cellX(pearl.c), cellY(pearl.r) + Math.sin(t * 3) * 6, 12, { anchor: 'center' });
    if (!wave) return;
    for (var i = 0; i < wave.targets.length; i++) {
      var tx = cellX(wave.targets[i][1]), ty = cellY(wave.targets[i][0]);
      if (wave.phase === 'warn') {
        // telegraph: 水底を影が滑り込み、泡が立つ
        var k = Math.min(1, wave.t / wave.warn);
        game.draw.circle(tx, ty, 40 + 70 * k, COL.shadow, 0.35 + 0.35 * k);
        if (Math.floor(t * 12) % 2 === 0) game.draw.rect(tx - CELL / 2 + 16, ty - CELL / 2 + 16, CELL - 32, CELL - 32, COL.bad, 0.18);
        for (var b = 0; b < 4; b++) game.draw.circle(tx + Math.sin(t * 7 + b * 2) * 60, ty + 60 - ((t * 200 + b * 40) % 120), 8, COL.foam, 0.6);
      } else {
        var hgt = Math.sin(Math.min(1, wave.t / BLOW) * Math.PI);
        game.draw.circle(tx, ty, 110, COL.foam, 0.5 * hgt + 0.2);
        game.draw.rect(tx - 60, ty - 330 * hgt, 120, 330 * hgt, COL.foam, 0.85);
        game.draw.circle(tx, ty - 330 * hgt, 80, COL.white, 0.8);
      }
    }
  }

  function drawDiver() {
    var t = game.time.elapsed;
    var k = tween > 0 ? 1 - tween / 0.1 : 1;
    var x = cellX(fromC) + (cellX(cc) - cellX(fromC)) * k + (bump > 0 ? Math.sin(t * 60) * 10 : 0);
    var y = cellY(fromR) + (cellY(cr) - cellY(fromR)) * k;
    game.draw.circle(x + 12, y + 16, 50, COL.shadow, 0.4);
    game.draw.sprite(Math.floor(t * 5) % 2 ? DIVER_A : DIVER_B, PAL_DIVER, x + Math.sin(t * 2) * 5, y + Math.cos(t * 2.4) * 5, 14, { anchor: 'center' });
  }

  function drawThumb() {
    var t = game.time.elapsed;
    game.draw.rect(0, H * 0.86, W, H * 0.14, COL.shadow, 0.5);
    // 4方向の矢羽根(スワイプ面)
    var cx = W / 2, cy = H * 0.925, a = 70 + Math.sin(t * 3) * 6;
    game.draw.line(cx, cy - a, cx - 22, cy - a + 26, COL.aqua, 8); game.draw.line(cx, cy - a, cx + 22, cy - a + 26, COL.aqua, 8);
    game.draw.line(cx, cy + a, cx - 22, cy + a - 26, COL.aqua, 8); game.draw.line(cx, cy + a, cx + 22, cy + a - 26, COL.aqua, 8);
    game.draw.line(cx - a, cy, cx - a + 26, cy - 22, COL.aqua, 8); game.draw.line(cx - a, cy, cx - a + 26, cy + 22, COL.aqua, 8);
    game.draw.line(cx + a, cy, cx + a - 26, cy - 22, COL.aqua, 8); game.draw.line(cx + a, cy, cx + a - 26, cy + 22, COL.aqua, 8);
    game.draw.circle(cx, cy, 22, COL.foam, 0.6);
  }

  function drawHud() {
    cap(dodged + ' / ' + NEEDED, W / 2, H * 0.05, 56, COL.foam);
    var low = timeLeft < 3 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(80, 160, W - 160, 18, COL.shadow);
    game.draw.rect(80, 160, (W - 160) * Math.max(0, timeLeft / TIME_LIMIT), 18, low ? COL.bad : COL.aqua);
    game.draw.sprite(PEARL, PAL_PEARL, W * 0.84, H * 0.05, 10, { anchor: 'center' });
    cap('x' + pearls, W * 0.92, H * 0.05, 40, COL.pearl);
  }

  function drawHighlight(dt) {
    if (!hl) return;
    hl.t += dt;
    game.draw.circle(hl.x, hl.y, 60 + hl.t * 300, COL.white, Math.max(0, 0.7 - hl.t));
    game.draw.sprite(DIVER_A, ok ? PAL_DIVER : { h: '#ffffff', f: '#ffffff', b: COL.bad, a: '#ffffff', l: '#ffffff' }, hl.x, hl.y - (ok ? 0 : hl.t * 200), 18 + hl.t * 10, { anchor: 'center' });
  }

  // ── ATTRACT ゴースト実演(実ロジック) ─────────────────
  var demo = { t: 0, gx: W / 2, gy: H * 0.925, press: false, n: 0, fail: false, sw: null };
  function safeDir() {
    var dirs = ['up', 'down', 'left', 'right'], d = [[-1, 0], [1, 0], [0, -1], [0, 1]], best = null;
    for (var i = 0; i < 4; i++) {
      var nr = cr + d[i][0], nc = cc + d[i][1];
      if (nr < 0 || nr > 2 || nc < 0 || nc > 2) continue;
      if (!inSet(wave.targets, nr, nc)) return dirs[i];
      if (!best) best = dirs[i];
    }
    return best;
  }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.4;
    if (cyc < dt || demo.t <= dt) { initGame(); ready = 0; gap = 0.3; demo.n++; demo.fail = demo.n % 3 === 0; waveI = demo.n % 3 === 1 ? 1 : 0; }
    silent = true;
    if (wave && wave.phase === 'warn' && wave.t > 0.3 && inSet(wave.targets, cr, cc) && !demo.fail && tween <= 0) {
      var d = safeDir();
      if (d) { swim(d); demo.sw = { d: d, t: 0.25 }; }
    }
    if (demo.sw) {
      demo.sw.t -= dt;
      var k = 1 - Math.max(0, demo.sw.t) / 0.25, dx = 0, dy = 0;
      if (demo.sw.d === 'up') dy = -1; else if (demo.sw.d === 'down') dy = 1; else if (demo.sw.d === 'left') dx = -1; else dx = 1;
      demo.gx = W / 2 + dx * 120 * k; demo.gy = H * 0.925 + dy * 60 * k; demo.press = true;
      if (demo.sw.t <= 0) demo.sw = null;
    } else { demo.gx = W / 2; demo.gy = H * 0.925; demo.press = false; }
    stepWorld(dt);
    if (finished && hitStop > 0) hitStop -= dt;
    silent = false;
  }

  // ── 入力 ─────────────────────────────────────────────
  game.onTap(function (x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.5); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (ready > 0 || finished) return;
    // タップは泳がない: 水面に小さな波紋だけ
    game.audio.tone('E5', 0.04, { wave: 'sine', volume: 0.05 });
    game.fx.burst(x, y, { color: COL.foam, count: 4, speed: 90 });
  });
  game.onSwipe(function (dir) {
    if (state !== S.PLAYING || ready > 0 || finished) return;
    var r = swim(dir);
    if (r === 'move') { game.audio.play('se_tap', 0.4); game.fx.burst(cellX(fromC), cellY(fromR), { color: COL.foam, count: 8, speed: 200 }); }
    else if (r === 'wall') { game.audio.tone('A2', 0.08, { wave: 'square', volume: 0.12 }); game.fx.shake(6, 0.12); }
  });

  // ── ループ(唯一の onUpdate) ───────────────────────────
  game.onUpdate(function (dt) {
    if (state === S.ATTRACT) {
      if (cr === undefined) initGame();
      stepDemo(dt);
      drawBack(); drawGrid(); drawDiver(); drawThumb();
      if (finished) drawHighlight(dt);
      drawGrain();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 14 });
      cap(GAME_TITLE, W / 2, H * 0.07, 76, COL.foam);
      cap('HI-SCORE ' + (game.best || 0), W / 2, H * 0.12, 34, COL.pearl);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) cap('► 100円 投入 ◄', W / 2, H * 0.975, 42, COL.pearl);
      else cap('INSERT COIN', W / 2, H * 0.975, 36, COL.foam);
      return;
    }

    if (state === S.RESULT) {
      drawBack(); drawGrid(); drawThumb(); drawGrain();
      var sc = dodged * 100 + pearls * 50;
      cap(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.09, 100, ok ? COL.aqua : COL.bad);
      cap(dodged + ' / ' + NEEDED, W / 2, H * 0.15, 52, COL.foam);
      cap('SCORE ' + sc, W / 2, H * 0.2, 44, COL.foam);
      if (ok && sc > (game.best || 0)) cap('NEW RECORD', W / 2, H * 0.245, 46, COL.pearl);
      else cap('BEST ' + (game.best || 0), W / 2, H * 0.245, 36, COL.foam);
      if (!ok) cap('あと' + (NEEDED - dodged) + '回!', W / 2, H * 0.76, 64, COL.pearl);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) cap('TAP TO CONTINUE', W / 2, H * 0.975, 38, COL.foam);
      return;
    }

    if (finished) {
      if (hitStop > 0) {
        hitStop -= dt;
        if (hitStop <= 0) {
          if (ok) { game.feedback.good(hl.x, hl.y, { text: 'CLEAR', color: COL.pearl, count: 26 }); game.audio.play('se_success', 0.6); }
          else { game.feedback.bad(hl.x, hl.y, { text: 'MISS' }); game.audio.play('se_failure', 0.5); }
          endWait = 1.1;
        }
      } else {
        endWait -= dt;
        if (endWait <= 0) {
          state = S.RESULT;
          var stats = { dodged: dodged, needed: NEEDED, pearls: pearls };
          if (ok) game.end.success(dodged * 100 + pearls * 50, stats);
          else game.end.failure(stats);
        }
      }
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap', 0.5);
    } else {
      timeLeft -= dt;
      if (timeLeft <= 0) { timeLeft = 0; finishRound(true, cellX(cc), cellY(cr)); }
      else stepWorld(dt);
    }

    drawBack(); drawGrid(); drawDiver(); drawThumb(); drawHud();
    if (finished) drawHighlight(dt);
    drawGrain();
    if (ready > 0) cap(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.24, 110, COL.pearl);
  });

  game.onStart(function () {
    game.audio.melody([['A3', 1], ['C4', 0.5], ['E4', 0.5], ['D4', 1], ['C4', 0.5], ['B3', 0.5], ['A3', 2]],
      { tempo: 96, wave: 'sine', volume: 0.06, loop: true, bass: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
