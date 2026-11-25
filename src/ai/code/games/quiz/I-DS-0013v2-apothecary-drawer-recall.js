// I-DS-0013v2-apothecary-drawer-recall.js
// 百味箪笥の覚え引き — 番頭の提灯が照らした引き出しの順番を覚え、同じ順に引き出しを開けていく
// 操作: 提灯が引き出しを順に照らす間は見るだけ。照らし終わったら同じ順に引き出しをタップして開ける(社内メモ)
// 終わり: 3件の注文(3→4→5か所)を開け切れば成功。開け違いは薬匙を1本失い同じ順をもう一度見る。3本失うか時間切れで失敗
// @mechanic: memory_sequence
// @theme: apothecary_hundred_drawers
// 世界観: 生薬問屋の古い蔵の百味箪笥の前で、丁稚が番頭の提灯に照らされた引き出しの順を覚え、注文書どおりの順に開けていく
// 残るもの: 正誤(CLEAR/GAME OVER) + 開けた引き出しの数・開け違い数
// スタイル: NEO-RETRO

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // NEO-RETRO: 限定5色 + 差し色1色(提灯の朱)。大きいドット
  var STYLE = { bg: ['#1d1a2f', '#3b2f4a', '#120f1e'], main: ['#7a4a3a', '#b0744e', '#f2dfb4'], accent: ['#ff5a36', '#f2dfb4'] };
  var D = {
    night: STYLE.bg[0], plum: STYLE.bg[1], deep: STYLE.bg[2],
    wood: STYLE.main[0], woodLit: STYLE.main[1], paper: STYLE.main[2],
    lamp: STYLE.accent[0], cream: STYLE.accent[1], dark: '#0a0812',
  };
  var HERBS = ['#8fbf6a', '#d8a040', '#b05a8a', '#c86a3a', '#6aa0c0'];
  var NOTES = ['C4', 'D4', 'E4', 'G4', 'A4', 'C5', 'D5', 'E5', 'G5', 'A5', 'C6'];

  var GAME_TITLE = 'HERB DRAWERS';
  var TIME_LIMIT = 20;
  var LENGTHS = [3, 4, 5];
  var LIT = [0.5, 0.42, 0.36];
  var SPOONS = 3;
  var COLS = 5, ROWS = 6;
  var DW = 182, DH = 118, GAPX = 10, GAPY = 12;
  var GRID_X = (W - (COLS * DW + (COLS - 1) * GAPX)) / 2;
  var GRID_Y = H * 0.2;
  var WAIT_LIMIT = 3;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var seq, phase, showIx, showT, inputIx, roundIx, opened, slips, spoons, timeLeft, score, waitT;
  var drawers, begin, finished, cleared, stopT, resultT, reported, lampAt, mood, halfway, miss, roundSlip;

  var MASTER_A = ['..wwww..', '.wwwwww.', '.ssssss.', '.sesess.', '.wwwwww.', '..wwww..', '.gggggg.', 'gggggggl', '.gg..ggl', '.dd..dd.'];
  var MASTER_B = ['..wwww..', '.wwwwww.', '.ssssss.', '.ssssss.', '.wwwwww.', '..wwww..', '.gggggg.', 'ggggggg.', '.gg..ggl', '.dd..ddl'];
  var MASTER_PAL = { w: '#f2dfb4', s: '#c8875a', e: '#0a0812', g: '#3b2f4a', l: '#ff5a36', d: '#7a4a3a' };
  var APP_A = ['..hhhh..', '.hhhhhh.', '.ffffff.', '.fefeff.', '..ffff..', '.aaaaaa.', 'aaaaaaaa', 'a.aaaa.a', '..a..a..', '.dd..dd.'];
  var APP_B = ['..hhhh..', '.hhhhhh.', '.ffffff.', '.ffffff.', '..ffff..', '.aaaaaa.', 'aaaaaaaa', 'a.aaaa.a', '..a..a..', '.dd..dd.'];
  var APP_YAY = ['a.hhhh.a', 'ahhhhhha', 'affffffa', '.fefeff.', '..fmmf..', '..aaaa..', '.aaaaaa.', '..aaaa..', '..a..a..', '.dd..dd.'];
  var APP_OOPS = ['........', '..hhhh..', '.hhhhhh.', '.ffffff.', '.feffef.', '..fmmf..', 'aaaaaaaa', '.aaaaaa.', '..a..a..', '.dd..dd.'];
  var APP_PAL = { h: '#1d1a2f', f: '#e8c49a', e: '#0a0812', m: '#ff5a36', a: '#b0744e', d: '#3b2f4a' };
  var SPOON = ['.ss.', 'ssss', '.ss.', '.s..', '.s..', '.s..'];
  var LANTERN = ['.cc.', 'llll', 'llll', 'llll', '.cc.'];

  function sign(str, x, y, sz, col) {
    game.draw.text(str, x + 4, y + 4, { size: sz, color: D.dark, bold: true, align: 'center' });
    game.draw.text(str, x, y, { size: sz, color: col, bold: true, align: 'center' });
  }

  function cell(k) {
    var c = k % COLS, r = Math.floor(k / COLS);
    return { x: GRID_X + c * (DW + GAPX), y: GRID_Y + r * (DH + GAPY), c: c, r: r };
  }
  function centerOf(k) { var p = cell(k); return { x: p.x + DW / 2, y: p.y + DH / 2 }; }
  function noteOf(k) { var p = cell(k); return NOTES[(p.c + (ROWS - 1 - p.r)) % NOTES.length]; }

  function drawerAt(x, y) {
    for (var k = 0; k < COLS * ROWS; k++) {
      var p = cell(k);
      if (x >= p.x && x <= p.x + DW && y >= p.y && y <= p.y + DH) return k;
    }
    return -1;
  }

  function makeSeq(n) {
    var s = [], prev = -1;
    for (var i = 0; i < n; i++) {
      var k;
      do { k = Math.floor(game.random(0, COLS * ROWS)) % (COLS * ROWS); } while (k === prev || (s.indexOf(k) >= 0 && !(n >= 5 && i === n - 1)));
      s.push(k); prev = k;
    }
    if (n >= 5) s[n - 1] = s[1] === s[n - 2] ? s[0] : s[1]; // 最終調合は一度開けた引き出しへ戻る
    return s;
  }

  function startShow() {
    phase = 'show'; showIx = -1; showT = 0.45; inputIx = 0; waitT = WAIT_LIMIT;
    for (var k = 0; k < drawers.length; k++) { drawers[k].open = 0; drawers[k].bad = 0; }
  }

  function newRound(ix) {
    roundIx = ix; seq = makeSeq(LENGTHS[ix]); roundSlip = 0;
    startShow();
  }

  function initGame() {
    drawers = [];
    for (var k = 0; k < COLS * ROWS; k++) drawers.push({ open: 0, lit: 0, bad: 0, hint: 0 });
    opened = 0; slips = 0; spoons = SPOONS; timeLeft = TIME_LIMIT; score = 0;
    begin = 0.8; finished = false; cleared = false; stopT = 0; resultT = 0; reported = false;
    lampAt = { x: W * 0.8, y: H * 0.68 }; mood = null; halfway = false; miss = null;
    newRound(0);
  }

  // ---- 提灯の再生(見るだけの時間) ----
  function stepShow(dt) {
    var lit = LIT[Math.min(roundIx, LIT.length - 1)];
    showT -= dt;
    if (showT > 0) return;
    if (showIx >= 0) drawers[seq[showIx]].lit = 0;
    showIx++;
    if (showIx >= seq.length) {
      phase = 'input'; waitT = WAIT_LIMIT;
      game.audio.play('se_tap', 0.4);
      return;
    }
    var k = seq[showIx];
    drawers[k].lit = lit;
    showT = lit + 0.12;
    game.audio.tone(noteOf(k), lit * 0.8, { wave: 'square', volume: 0.1 });
  }

  // ---- 開ける(本番もデモもここを通る) ----
  function pull(k, live) {
    if (phase !== 'input') return 'locked';
    var want = seq[inputIx];
    var c = centerOf(k);
    if (k === want) {
      drawers[k].open = 0.45; drawers[k].bad = 0;
      inputIx++;
      waitT = WAIT_LIMIT;
      game.audio.tone(noteOf(k), 0.14, { wave: 'square', volume: 0.12 });
      game.fx.burst(c.x, c.y, { color: HERBS[k % HERBS.length], count: 8, speed: 200 });
      if (live) { opened++; score += 100 + Math.round(waitT * 10); }
      if (inputIx >= seq.length) {
        var perfect = roundSlip === 0;
        game.feedback.good(c.x, c.y - 60, { text: perfect ? 'PERFECT' : 'CLEAR', color: D.lamp, size: 64 });
        game.audio.play('se_powerup', 0.45);
        mood = { k: 'yay', t: 0.9 };
        phase = 'between'; showT = 0.8;
        if (live) {
          if (perfect) score += 300;
          if (!halfway) {
            halfway = true;
            game.fx.popup('NICE', W / 2, H * 0.14, { color: D.cream, size: 80 });
            game.audio.play('se_milestone', 0.5);
          }
          if (roundIx >= LENGTHS.length - 1) { phase = 'done'; wrapUp(true); }
        }
      } else {
        game.feedback.good(c.x, c.y - 40, { text: null, color: HERBS[k % HERBS.length], count: 6 });
      }
      return 'ok';
    }
    drawers[k].bad = 0.5;
    drawers[want].hint = 0.9;
    miss = { k: k, t: 0.5 };
    game.feedback.bad(c.x, c.y - 40, { text: 'MISS' });
    game.audio.play('se_break', 0.35);
    mood = { k: 'oops', t: 0.9 };
    roundSlip++;
    phase = 'replay'; showT = 0.95;
    if (live) {
      slips++; spoons--;
      stopT = 0.45;
      if (spoons <= 0) { phase = 'done'; wrapUp(false); }
    }
    return 'miss';
  }

  function stepCabinet(dt, live) {
    for (var k = 0; k < drawers.length; k++) {
      var d = drawers[k];
      if (d.open > 0 && phase === 'input') d.open = Math.max(0.12, d.open - dt * 0.2);
      if (d.bad > 0) d.bad -= dt;
      if (d.hint > 0) d.hint -= dt;
    }
    if (miss) { miss.t -= dt; if (miss.t <= 0) miss = null; }
    if (mood) { mood.t -= dt; if (mood.t <= 0) mood = null; }
    var tgt = { x: W * 0.8, y: H * 0.68 };
    if (phase === 'show' && showIx >= 0 && showIx < seq.length) tgt = centerOf(seq[showIx]);
    lampAt.x += (tgt.x - lampAt.x) * Math.min(1, dt * 14);
    lampAt.y += (tgt.y - lampAt.y) * Math.min(1, dt * 14);
    if (phase === 'show') stepShow(dt);
    else if (phase === 'between') {
      showT -= dt;
      if (showT <= 0) {
        if (live) newRound(roundIx + 1);
        else { roundIx = 0; seq = makeSeq(3); startShow(); }
      }
    } else if (phase === 'replay') {
      showT -= dt;
      if (showT <= 0) startShow();
    } else if (phase === 'input' && live) {
      waitT -= dt;
      if (waitT <= 0) {
        var want = seq[inputIx];
        var c = centerOf(want);
        drawers[want].hint = 0.9;
        miss = { k: want, t: 0.5 };
        game.feedback.bad(c.x, c.y - 40, { text: 'TIME UP', size: 50 });
        mood = { k: 'oops', t: 0.9 };
        roundSlip++; slips++; spoons--;
        stopT = 0.45;
        phase = 'replay'; showT = 0.95;
        if (spoons <= 0) { phase = 'done'; wrapUp(false); }
      }
    }
  }

  function wrapUp(ok) {
    if (finished) return;
    finished = true; cleared = ok;
    if (!stopT) stopT = 0.45;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.55);
    if (ok) score += spoons * 200 + Math.round(timeLeft * 30);
  }

  // ---- 入力 ----
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) {
      if (!reported) return;
      state = S.ATTRACT; initGame(); demo.t = 0; return;
    }
    if (finished || stopT > 0) return;
    var k = drawerAt(x, y);
    if (begin > 0 || phase !== 'input') {
      game.audio.tone('C3', 0.03, { wave: 'square', volume: 0.05 });
      if (k >= 0) drawers[k].bad = Math.max(drawers[k].bad, 0.08);
      return;
    }
    if (k < 0) { game.audio.play('se_tap', 0.08); game.fx.burst(x, y, { color: D.plum, count: 3, speed: 70 }); return; }
    pull(k, true);
  });

  // ---- 描画 ----
  function shop() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, D.plum], [0.5, D.night], [1, D.deep]]);
    // 天井の梁と吊り下げた薬草
    game.draw.rect(0, H * 0.12, W, 24, D.wood);
    for (var i = 0; i < 6; i++) {
      var hx = 90 + i * 180, sw = Math.sin(t * 1.3 + i) * 6;
      game.draw.line(hx, H * 0.12 + 24, hx + sw, H * 0.16, D.wood, 4);
      game.draw.rect(hx + sw - 18, H * 0.16, 36, 22, HERBS[i % HERBS.length], 0.8);
    }
    // 箪笥の枠
    var fw = COLS * DW + (COLS - 1) * GAPX + 40, fh = ROWS * DH + (ROWS - 1) * GAPY + 40;
    game.draw.rect(GRID_X - 20, GRID_Y - 20, fw, fh, D.dark);
    game.draw.rect(GRID_X - 12, GRID_Y - 12, fw - 16, fh - 16, D.wood);
    // 床と調剤台
    game.draw.rect(0, H * 0.74, W, H * 0.26, D.deep);
    game.draw.rect(0, H * 0.74, W, 12, D.wood);
    game.draw.rect(W * 0.32, H * 0.8, W * 0.62, 40, D.wood);
  }

  function drawDrawers() {
    var inputOn = phase === 'input' && begin <= 0 && !finished;
    for (var k = 0; k < drawers.length; k++) {
      var p = cell(k), d = drawers[k];
      var pullOut = d.open > 0 ? 26 : 0;
      var face = d.lit > 0 ? D.lamp : D.woodLit;
      game.draw.rect(p.x, p.y, DW, DH, D.dark);
      if (pullOut) {
        game.draw.rect(p.x + 6, p.y + DH - 8, DW - 12, pullOut + 8, D.wood);
        game.draw.rect(p.x + 20, p.y + DH - 4, DW - 40, pullOut - 6, HERBS[k % HERBS.length]);
      }
      game.draw.rect(p.x + 4, p.y + 4 + pullOut * 0.3, DW - 8, DH - 8, face);
      game.draw.rect(p.x + 4, p.y + DH - 14 + pullOut * 0.3, DW - 8, 10, D.wood);
      game.draw.rect(p.x + DW / 2 - 36, p.y + 18 + pullOut * 0.3, 72, 30, D.paper);
      game.draw.rect(p.x + DW / 2 - 24, p.y + 28 + pullOut * 0.3, 48, 10, HERBS[(k * 7) % HERBS.length], 0.6);
      game.draw.circle(p.x + DW / 2, p.y + 78 + pullOut * 0.3, 12, D.dark);
      game.draw.circle(p.x + DW / 2, p.y + 78 + pullOut * 0.3, 7, D.cream);
      if (inputOn) game.draw.rect(p.x + 4, p.y + 4, DW - 8, 4, D.cream, 0.25 + 0.2 * Math.sin(game.time.elapsed * 5 + k));
      if (d.hint > 0 && Math.floor(d.hint * 10) % 2 === 0) game.draw.rect(p.x - 6, p.y - 6, DW + 12, DH + 12, D.cream, 0.5);
      if (d.bad > 0) {
        var g = 1 + (0.5 - Math.min(0.5, d.bad)) * 0.3;
        game.draw.rect(p.x + DW / 2 - DW * g / 2, p.y + DH / 2 - DH * g / 2, DW * g, DH * g, D.cream, Math.min(0.75, d.bad * 1.6));
        game.draw.line(p.x + 30, p.y + 20, p.x + DW - 30, p.y + DH - 20, D.lamp, 10);
        game.draw.line(p.x + DW - 30, p.y + 20, p.x + 30, p.y + DH - 20, D.lamp, 10);
      }
    }
    if (phase !== 'input' || state === S.ATTRACT) {
      if (phase === 'show' || phase === 'replay') game.draw.rect(GRID_X - 12, GRID_Y - 12, COLS * DW + (COLS - 1) * GAPX + 24, ROWS * DH + (ROWS - 1) * GAPY + 24, D.dark, 0.22);
    }
    // 提灯の光
    game.draw.circle(lampAt.x, lampAt.y, 120, D.lamp, 0.12);
    game.draw.circle(lampAt.x, lampAt.y, 70, D.lamp, 0.18);
    game.draw.sprite(LANTERN, { c: D.dark, l: D.lamp }, lampAt.x, lampAt.y - 90, 12, { anchor: 'center' });
  }

  function drawPeople() {
    var t = game.time.elapsed;
    var mf = phase === 'show' && Math.floor(t * 6) % 2 === 0 ? MASTER_B : MASTER_A;
    game.draw.sprite(mf, MASTER_PAL, W * 0.9, H * 0.69 + Math.sin(t * 1.8) * 3, 11, { anchor: 'center', flipX: true });
    var af = Math.floor(t * 2.5) % 2 === 0 ? APP_A : APP_B;
    var dy = 0;
    if (mood && mood.k === 'yay') { af = APP_YAY; dy = -Math.abs(Math.sin(t * 12)) * 22; }
    if (mood && mood.k === 'oops') af = APP_OOPS;
    if (finished && state !== S.ATTRACT) af = cleared ? APP_YAY : APP_OOPS;
    game.draw.sprite(af, APP_PAL, W * 0.16, H * 0.82 + dy, 14, { anchor: 'center' });
    // 調合の手順(進み具合のアイコン列)
    var n = seq.length;
    for (var i = 0; i < n; i++) {
      var x = W * 0.63 + (i - (n - 1) / 2) * 92, y = H * 0.79;
      var done = phase === 'input' ? i < inputIx : (phase === 'between' || (finished && cleared));
      game.draw.rect(x - 34, y - 34, 68, 68, D.dark);
      game.draw.rect(x - 28, y - 28, 56, 56, done ? HERBS[seq[i] % HERBS.length] : D.plum);
      if (phase === 'input' && i === inputIx) game.draw.rect(x - 34, y + 38, 68 * (waitT / WAIT_LIMIT), 8, D.lamp);
    }
    for (var s = 0; s < SPOONS; s++) {
      game.draw.sprite(SPOON, { s: s < spoons ? D.cream : D.plum }, W * 0.45 + s * 80, H * 0.9, 12, { anchor: 'center' });
    }
  }

  function drawHud() {
    sign(opened + ' / 12', W / 2, 60, 56, D.cream);
    game.draw.text('SCORE ' + score, W - 40, 44, { size: 30, color: D.cream, bold: true, align: 'right' });
    for (var r = 0; r < LENGTHS.length; r++) {
      var on = r < roundIx || (r === roundIx && (phase === 'between' || (finished && cleared)));
      game.draw.rect(56 + r * 50, 28, 38, 38, on ? D.lamp : D.plum);
    }
    game.draw.rect(60, 122, W - 120, 20, D.dark);
    game.draw.rect(63, 125, (W - 126) * Math.max(0, timeLeft / TIME_LIMIT), 14, timeLeft < 4 && Math.floor(game.time.elapsed * 8) % 2 ? D.lamp : D.cream);
  }

  function drawResult() {
    game.draw.rect(0, H * 0.2, W, H * 0.42, D.dark, 0.78);
    sign(cleared ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.27, 108, cleared ? D.lamp : D.cream);
    sign('SCORE ' + score, W / 2, H * 0.36, 60, D.cream);
    sign(opened + ' / 12   MISS ' + slips, W / 2, H * 0.42, 44, D.cream);
    if (cleared && score > game.best) {
      if (Math.floor(resultT * 4) % 2 === 0) sign('NEW RECORD', W / 2, H * 0.49, 64, D.lamp);
    } else {
      sign('BEST ' + Math.max(game.best, cleared ? score : 0), W / 2, H * 0.49, 42, D.lamp);
    }
    if (!cleared) sign('あと' + Math.max(1, 12 - opened) + '個!', W / 2, H * 0.56, 64, D.lamp);
    if (reported && Math.floor(game.time.elapsed * 2) % 2 === 0) sign('TAP TO CONTINUE', W / 2, H * 0.965, 36, D.cream);
  }

  // ---- ATTRACT: 提灯の再生 → 手が同じ順に開ける(成功) → 次の再生 → 1つ目は正解、2つ目で開け違い ----
  var demo = { t: 0, gx: W / 2, gy: H * 0.7, press: 0, plan: 0, act: 0, cool: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 9.6;
    if (cyc < dt || demo.t <= dt) {
      initGame(); begin = 0;
      seq = [7, 13, 21]; startShow();
      demo.plan = 0; demo.act = 0; demo.cool = 0.35;
    }
    stepCabinet(dt, false);
    if (demo.press > 0) demo.press -= dt;
    if (phase !== 'input') {
      if (phase === 'between') demo.plan = 1;
      demo.gx += (W * 0.5 - demo.gx) * Math.min(1, dt * 2);
      demo.gy += (H * 0.68 - demo.gy) * Math.min(1, dt * 2);
      demo.cool = 0.35;
      return;
    }
    var goal = seq[inputIx];
    if (demo.plan === 1 && inputIx === 1) goal = (seq[1] + 2) % (COLS * ROWS);
    var c = centerOf(goal);
    demo.gx += (c.x - demo.gx) * Math.min(1, dt * 7);
    demo.gy += (c.y - demo.gy) * Math.min(1, dt * 7);
    demo.cool -= dt;
    if (demo.cool <= 0 && Math.abs(demo.gx - c.x) < 10 && Math.abs(demo.gy - c.y) < 10) {
      if (pull(goal, false) === 'miss') demo.plan = 2;
      demo.press = 0.2; demo.cool = 0.3;
    }
  }

  // ---- メインループ ----
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      stepDemo(dt);
      shop();
      drawDrawers();
      drawPeople();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press > 0, scale: 14 });
      sign(GAME_TITLE, W / 2, H * 0.055 + Math.sin(game.time.elapsed * 2) * 4, 86, D.lamp);
      sign('HI-SCORE ' + game.best, W / 2, H * 0.1, 38, D.cream);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) sign('► 100円 投入 ◄', W / 2, H * 0.965, 46, D.lamp);
      else sign('TAP TO START', W / 2, H * 0.965, 40, D.cream);
      return;
    }

    if (state === S.RESULT) {
      resultT += dt;
      shop(); drawDrawers(); drawPeople(); drawHud();
      if (cleared && Math.floor(resultT * 6) !== Math.floor((resultT - dt) * 6)) {
        game.fx.burst(game.random(140, W - 140), game.random(H * 0.25, H * 0.6), { color: HERBS[Math.floor(game.random(0, 5)) % 5], count: 16, speed: 420 });
      }
      drawResult();
      if (!reported && resultT >= 1.3) {
        reported = true;
        var st = { opened: opened, misses: slips, spoons: spoons, rounds: cleared ? LENGTHS.length : roundIx };
        if (cleared) game.end.success(score, st); else game.end.failure(st);
      }
      return;
    }

    if (stopT > 0) {
      stopT -= dt;
      for (var k = 0; k < drawers.length; k++) if (drawers[k].bad > 0) drawers[k].bad = Math.max(0.3, drawers[k].bad);
      if (stopT <= 0 && finished) { state = S.RESULT; resultT = 0; }
    } else if (finished) {
      state = S.RESULT; resultT = 0;
    } else if (begin > 0) {
      begin -= dt;
      if (begin <= 0) game.audio.play('se_tap', 0.3);
    } else {
      timeLeft -= dt;
      stepCabinet(dt, true);
      if (timeLeft <= 0 && !finished) {
        timeLeft = 0;
        var want = phase === 'input' ? seq[inputIx] : seq[0];
        drawers[want].hint = 0.9;
        var c = centerOf(want);
        game.feedback.bad(c.x, c.y - 40, { text: 'TIME UP', size: 60 });
        stopT = 0.45;
        wrapUp(false);
      }
    }

    shop();
    drawDrawers();
    drawPeople();
    drawHud();
    if (begin > 0) sign(begin > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.45, 110, D.lamp);
  });

  game.onStart(function() {
    game.audio.melody([
      ['D4', 1], ['F4', 0.5], ['G4', 0.5], ['A4', 1], ['C5', 1],
      ['A4', 0.5], ['G4', 0.5], ['F4', 1], ['D4', 2],
    ], { tempo: 84, wave: 'triangle', volume: 0.045, loop: true, bass: [['D2', 4], ['A1', 4]] });
    state = S.ATTRACT;
    initGame();
  });
})(game);
