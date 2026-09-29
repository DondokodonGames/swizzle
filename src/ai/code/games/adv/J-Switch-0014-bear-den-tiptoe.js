// J-Switch-0014-bear-den-tiptoe.js
// 大熊の枕元しのび足 — 眠る大熊の枕元まで、苔の小道だけを指でなぞって野ネズミを忍ばせる。枯れ葉を踏む・急ぐ・大熊が寝返りを打つ間に動くと目を覚ます
// 操作: 指を置いたまま動かすと野ネズミが指の少し上をついてくる。苔の帯からはみ出さず、ゆっくり進む。いびきが止まったら指を止める(社内メモ。画面には出さない)
// 終わり: ボタン・襟巻き・麦わら帽子の3つを取り戻せばCLEAR。物音のゲージが満ちて大熊が起きる/時間切れでGAME OVER
// @mechanic: guide_path
// @theme: sleeping_bear_tiptoe
// 世界観: 冬ごもり前の森の番小屋、昼寝する大熊の枕元へ風で飛ばされた自分の麦わら帽子を取り戻しに、野ネズミの子が床に敷かれた苔の小道だけを選んでそっと進み、途中で落とした襟巻きとボタンも拾って帰る
// 残るもの: 正誤(CLEAR/GAME OVER) + 取り戻した品の数・最後に残った静けさ(%)・寝返りをやり過ごした回数
// スタイル: 1BIT INK

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 1BIT INK: 紙と墨の2値。階調はディザ、強弱は線の太さで語る
  var STYLE = { bg: ['#f2efe4', '#e2ddcf', '#cfc9b8'], main: ['#141210', '#141210', '#f2efe4'], accent: ['#141210', '#f2efe4'] };
  var INK = STYLE.main[0], PAPER = STYLE.bg[0], PAPER2 = STYLE.bg[1];

  var GAME_TITLE = 'BEAR TIPTOE';
  var TIME_LIMIT = 18;
  var NEEDED = 3;
  var HALF = 72, QUIET = 260, MAX_SPD = 420, OFFSET = 120;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var PATH = [
    { x: W * 0.5, y: H * 0.8 }, { x: W * 0.29, y: H * 0.69 }, { x: W * 0.67, y: H * 0.58 },
    { x: W * 0.35, y: H * 0.47 }, { x: W * 0.57, y: H * 0.37 }
  ];
  var ITEMS_AT = [1, 3, 4];

  var BEAR_SLEEP = ['...bb........bb...', '..bbbb......bbbb..', '..bbbbbbbbbbbbbb..', '.bbbbbbbbbbbbbbbb.', '.bbb.--.bb.--.bbb.', '.bbbbbbbbbbbbbbbb.', '.bbbbbb.nn.bbbbbb.', '..bbbbb....bbbbb..', '...bbbbbbbbbbbb...', '.bbbbbbbbbbbbbbbb.', 'bbbbbbbbbbbbbbbbbb', 'bbbbbbbbbbbbbbbbbb'];
  var BEAR_STIR = ['...bb........bb...', '..b..b......bbbb..', '..bbbbbbbbbbbbbb..', '.bbbbbbbbbbbbbbbb.', '.bbb.--.bb.o..bbb.', '.bbbbbbbbbbb..bbb.', '.bbbbbb.nn.bbbbbb.', '..bbbbb....bbbbb..', '...bbbbbbbbbbbb...', '.bbbbbbbbbbbbbbbb.', 'bbbbbbbbbbbbbbbbbb', 'bbbbbbbbbbbbbbbbbb'];
  var BEAR_WAKE = ['..b..b......b..b..', '..bbbb......bbbb..', '..bbbbbbbbbbbbbb..', '.bbbbbbbbbbbbbbbb.', '.bb.oo.bbbb.oo.bb.', '.bb.oo.bbbb.oo.bb.', '.bbbbbb.nn.bbbbbb.', '..bbb........bbb..', '...bbb.mmmm.bbb...', '.bbbbbbbbbbbbbbbb.', 'bbbbbbbbbbbbbbbbbb', 'bbbbbbbbbbbbbbbbbb'];
  var MOUSE = [['..k...k...', '.kkk.kkk..', '.kkkkkkk..', 'kk.kk.kkk.', 'kkkkkkkkkk', '.kkkkkkk.k', '..k...k..k'], ['..k...k...', '.kkk.kkk..', '.kkkkkkk..', 'kk.kk.kkk.', 'kkkkkkkkkk', '.kkkkkkk.k', '...k.k...k']];
  var HAT = ['...kkkk...', '..kpppk...', '.kkkkkkkk.', 'kpppppppk.', '.kkkkkkk..'];
  var SCARF = ['kkkkkkk', 'kpkpkpk', 'kkkkkkk', '....kpk', '....kkk'];
  var BUTTON = ['.kkkk.', 'kpppk.', 'kpkpkk', 'kpppk.', '.kkkk.'];
  var ZZZ = ['kkkk', '..k.', '.k..', 'kkkk'];
  var LEAF = ['..k..', '.kkk.', 'kkkkk', 'k.k.k', '..k..'];

  var phase, readyT, timeLeft, mouse, target, pressing, noise, got, stirCd, warnT, stirT, stirsSurvived, stopT, outroT, win, leaves, walkT, halfShown, wasStir;

  function initGame() {
    phase = 'ready'; readyT = 0.8; timeLeft = TIME_LIMIT; pressing = false; noise = 0; got = 0;
    mouse = { x: PATH[0].x, y: PATH[0].y, spd: 0, face: 1 }; target = { x: mouse.x, y: mouse.y };
    stirCd = 2.6; warnT = 0; stirT = 0; stirsSurvived = 0; stopT = 0; outroT = 0; win = false; walkT = 0; halfShown = false; wasStir = false;
    if (!leaves) {
      leaves = [];
      for (var i = 0; i < 90; i++) {
        var lx = 70 + ((i * 397) % (W - 140)), ly = H * 0.33 + ((i * 263) % (H * 0.52));
        if (pathDist(lx, ly) > HALF + 26) leaves.push({ x: lx, y: ly, s: 5 + (i % 3) });
      }
    }
  }

  function pathDist(px, py) {
    var best = 1e9;
    for (var i = 1; i < PATH.length; i++) {
      var ax = PATH[i - 1].x, ay = PATH[i - 1].y, vx = PATH[i].x - ax, vy = PATH[i].y - ay;
      var l2 = vx * vx + vy * vy;
      var t = Math.max(0, Math.min(1, ((px - ax) * vx + (py - ay) * vy) / l2));
      var d = Math.hypot(px - ax - vx * t, py - ay - vy * t);
      if (d < best) best = d;
    }
    return best;
  }

  function bearState() { return stirT > 0 ? 'stir' : (warnT > 0 ? 'warn' : 'sleep'); }

  function creep(dt, isDemo) {
    // 寝返り: 0.7秒の予告(いびきが止まる・片目)→1.2秒の寝返り
    if (warnT > 0) { warnT -= dt; if (warnT <= 0) stirT = 1.2; }
    else if (stirT > 0) { stirT -= dt; if (stirT <= 0) { stirCd = game.random(2.2, 3.4); if (wasStir) stirsSurvived++; wasStir = false; } }
    else { stirCd -= dt; if (stirCd <= 0) { warnT = 0.7; wasStir = true; if (!isDemo) game.audio.tone('F3', 0.25, { wave: 'triangle', volume: 0.06, slide: 30 }); } }

    var px = mouse.x, py = mouse.y;
    if (pressing) {
      var dx = target.x - mouse.x, dy = target.y - mouse.y, d = Math.hypot(dx, dy);
      var step = Math.min(d, MAX_SPD * dt);
      if (d > 0.5) { mouse.x += dx / d * step; mouse.y += dy / d * step; if (Math.abs(dx) > 2) mouse.face = dx > 0 ? 1 : -1; }
    }
    mouse.x = Math.max(60, Math.min(W - 60, mouse.x));
    mouse.y = Math.max(H * 0.33, Math.min(H * 0.86, mouse.y));
    mouse.spd = Math.hypot(mouse.x - px, mouse.y - py) / Math.max(dt, 0.001);
    if (mouse.spd > 10) walkT += dt;

    var off = pathDist(mouse.x, mouse.y) > HALF;
    var add = 0;
    if (off && mouse.spd > 15) add += 0.85;
    if (mouse.spd > QUIET) add += (mouse.spd - QUIET) / 120;
    if (stirT > 0 && mouse.spd > 20) add += 1.9;
    if (add > 0) {
      noise += add * dt;
      if (!isDemo && Math.floor(walkT * 8) !== Math.floor((walkT - dt) * 8)) game.audio.tone(off ? 180 : 420, 0.03, { wave: off ? 'sawtooth' : 'triangle', volume: off ? 0.05 : 0.02 });
    } else noise = Math.max(0, noise - 0.1 * dt);

    if (noise >= 1) { noise = 1; wake(isDemo); return; }

    var it = PATH[ITEMS_AT[got]];
    if (it && Math.hypot(mouse.x - it.x, mouse.y - it.y) < 62) pick(it, isDemo);
  }

  function pick(it, isDemo) {
    got++;
    if (isDemo) { game.fx.burst(it.x, it.y, { color: INK, count: 8, speed: 140 }); return; }
    game.audio.play('se_coin', 0.45);
    var calm = noise < 0.25;
    game.feedback.good(it.x, it.y - 80, { text: calm ? 'PERFECT' : 'GOOD', color: INK, count: calm ? 14 : 8 });
    if (!halfShown && got === 2) {
      halfShown = true; game.audio.play('se_milestone', 0.5);
      game.fx.popup(got + ' / ' + NEEDED, W / 2, H * 0.5, { color: INK, size: 72 });
    }
    if (got >= NEEDED) finish(true, false);
  }

  function wake(isDemo) {
    if (isDemo) { wakeFlash = 0.8; return; }
    game.feedback.bad(W / 2, H * 0.3, { text: 'MISS', color: INK });
    finish(false, false);
  }
  var wakeFlash = 0;

  function finish(ok, isDemo) {
    if (isDemo) return;
    win = ok; phase = 'stop'; stopT = 0.55; pressing = false;
    game.audio.stopBgm();
    if (ok) { game.fx.flash(PAPER, 0.25); game.audio.play('se_success', 0.6); }
    else { game.audio.play('se_break', 0.4); game.audio.play('se_failure', 0.6); }
  }

  // ── 入力 ─────────────────────────────────────────────────────────
  function aim(x, y) { target.x = x; target.y = y - OFFSET; }
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.6); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function(x, y) {
    if (state !== S.PLAYING || phase !== 'play') return;
    pressing = true; aim(x, y);
    game.audio.play('se_tap', 0.15);
    game.fx.burst(x, y - OFFSET, { color: INK, count: 3, speed: 50 });
  });
  game.onMove(function(x, y) {
    if (state !== S.PLAYING || phase !== 'play') return;
    if (!pressing) { pressing = true; game.audio.play('se_tap', 0.1); }
    aim(x, y);
  });
  game.onRelease(function(x, y) {
    if (state !== S.PLAYING) return;
    pressing = false;
    if (phase === 'play') game.audio.tone(stirT > 0 ? 'G4' : 'C4', 0.04, { wave: 'triangle', volume: 0.02 });
  });

  // ── ATTRACT デモ(苔の上をゆっくり進み寝返りで止まる。2つ拾ったあと近道して起こす) ──
  var demo = { t: 0, gx: W / 2, gy: H * 0.9, s: 0, rush: false };
  var SEG = [], TOTAL = 0;
  for (var sg = 1; sg < PATH.length; sg++) { var ln = Math.hypot(PATH[sg].x - PATH[sg - 1].x, PATH[sg].y - PATH[sg - 1].y); SEG.push(ln); TOTAL += ln; }
  function along(s) {
    var acc = 0;
    for (var i = 0; i < SEG.length; i++) {
      if (s <= acc + SEG[i]) { var k = (s - acc) / SEG[i]; return { x: PATH[i].x + (PATH[i + 1].x - PATH[i].x) * k, y: PATH[i].y + (PATH[i + 1].y - PATH[i].y) * k }; }
      acc += SEG[i];
    }
    return { x: PATH[PATH.length - 1].x, y: PATH[PATH.length - 1].y };
  }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 9;
    if (cyc < dt || demo.t <= dt) { initGame(); phase = 'play'; demo.s = 0; demo.rush = false; wakeFlash = 0; }
    if (wakeFlash > 0) { wakeFlash -= dt; pressing = false; if (wakeFlash <= 0) { initGame(); phase = 'play'; demo.s = 0; demo.rush = false; } return; }
    pressing = true;
    if (got >= 2) demo.rush = true;
    if (demo.rush) {
      var hat = PATH[ITEMS_AT[2]];
      target.x = hat.x; target.y = hat.y + 160;
    } else if (bearState() === 'sleep') {
      demo.s = Math.min(TOTAL, demo.s + 240 * dt);
      var p = along(demo.s); target.x = p.x; target.y = p.y;
    } else { target.x = mouse.x; target.y = mouse.y; }
    creep(dt, true);
    if (got >= NEEDED) { initGame(); phase = 'play'; demo.s = 0; }
    demo.gx = target.x; demo.gy = target.y + OFFSET;
  }

  // ── 描画 ─────────────────────────────────────────────────────────
  function dither(x, y, w, h, step) {
    for (var yy = y; yy < y + h; yy += step) for (var xx = x + ((yy / step) % 2) * (step / 2); xx < x + w; xx += step) game.draw.rect(xx, yy, 3, 3, INK);
  }

  function drawWorld() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, PAPER], [1, PAPER2]]);
    // 板の床(線の太さで奥行き)
    for (var b = 0; b < 12; b++) { var by = H * 0.3 + b * b * 9; game.draw.line(0, by, W, by, INK, 1 + b * 0.3); }
    // 小屋の壁(ディザ)
    dither(0, 230, W, H * 0.07, 16);
    game.draw.line(0, 230 + H * 0.07, W, 230 + H * 0.07, INK, 6);
    // 苔の小道(輪郭の二重線と中の点々)
    for (var i = 1; i < PATH.length; i++) {
      var a = PATH[i - 1], c = PATH[i];
      game.draw.line(a.x, a.y, c.x, c.y, INK, HALF * 2 + 8);
      game.draw.line(a.x, a.y, c.x, c.y, PAPER, HALF * 2 - 4);
      game.draw.circle(a.x, a.y, HALF + 4, INK); game.draw.circle(a.x, a.y, HALF - 2, PAPER);
      var n = Math.floor(Math.hypot(c.x - a.x, c.y - a.y) / 34);
      for (var k = 0; k < n; k++) {
        var mx = a.x + (c.x - a.x) * k / n, my = a.y + (c.y - a.y) * k / n;
        game.draw.circle(mx + ((k * 37) % 40 - 20), my + ((k * 53) % 30 - 15), 4, INK);
      }
    }
    game.draw.circle(PATH[PATH.length - 1].x, PATH[PATH.length - 1].y, HALF - 2, PAPER);
    // 枯れ葉(トゲの形=踏むと鳴る)
    for (var l = 0; l < leaves.length; l++) {
      var lf = leaves[l];
      game.draw.sprite(LEAF, { k: INK }, lf.x + Math.sin(t * 1.5 + l) * 2, lf.y, lf.s, { anchor: 'center' });
    }
    game.draw.rect(0, 0, W, H, INK, 0.015 + 0.015 * Math.sin(t * 1.4));
  }

  function drawBear() {
    var t = game.time.elapsed;
    var bs = bearState();
    var awake = (phase === 'stop' || phase === 'outro' || state === S.RESULT) && !win || wakeFlash > 0;
    var art = awake ? BEAR_WAKE : (bs === 'sleep' ? BEAR_SLEEP : BEAR_STIR);
    var breathe = bs === 'sleep' ? Math.sin(t * 2.2) * 8 : 0;
    var roll = bs === 'stir' ? Math.sin(t * 7) * 18 : 0;
    game.draw.rect(W * 0.14, H * 0.3, W * 0.72, 30, INK);
    if (awake && Math.floor(t * 12) % 2 === 0) game.draw.circle(W / 2, H * 0.24, 250, INK, 0.15);
    game.draw.sprite(art, { b: INK, '-': PAPER, o: PAPER, n: PAPER, m: PAPER }, W / 2 + roll, H * 0.24 - breathe * 0.5, 30, { anchor: 'center' });
    if (bs === 'sleep' && !awake) {
      for (var z = 0; z < 3; z++) {
        var ph = (t * 0.6 + z / 3) % 1;
        game.draw.sprite(ZZZ, { k: INK }, W * 0.78 + ph * 60, H * 0.2 - ph * 160, 6 + ph * 6, { anchor: 'center', alpha: 1 - ph });
      }
    }
    if (bs === 'warn' && Math.floor(t * 14) % 2 === 0) {
      game.draw.rect(W * 0.64, H * 0.12, 20, 60, INK); game.draw.rect(W * 0.64, H * 0.12 + 76, 20, 20, INK);
    }
  }

  function drawActors() {
    var t = game.time.elapsed;
    for (var i = got; i < ITEMS_AT.length; i++) {
      var p = PATH[ITEMS_AT[i]];
      var art = i === 0 ? BUTTON : (i === 1 ? SCARF : HAT);
      if (i === got) game.draw.circle(p.x, p.y, 46 + Math.sin(t * 6) * 6, INK, 0.12);
      game.draw.sprite(art, { k: INK, p: PAPER }, p.x, p.y + Math.sin(t * 3 + i) * 4, i === 2 ? 10 : 9, { anchor: 'center' });
    }
    var fr = mouse.spd > 10 ? Math.floor(t * 10) % 2 : 0;
    game.draw.circle(mouse.x, mouse.y + 30, 40, INK, 0.12);
    if (!win && (phase === 'stop' || phase === 'outro') && Math.floor(t * 14) % 2 === 0) game.draw.circle(mouse.x, mouse.y, 80, INK, 0.2);
    game.draw.sprite(MOUSE[fr], { k: INK }, mouse.x, mouse.y + Math.sin(t * 4) * 3, 9, { anchor: 'center', flipX: mouse.face < 0 });
    if (pressing && phase === 'play') game.draw.line(mouse.x, mouse.y + 40, target.x, target.y + OFFSET - 30, INK, 2);
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 225, INK);
    txt(got + ' / ' + NEEDED, W / 2, 88, 66, PAPER);
    txt(String(Math.ceil(timeLeft)), 64, 88, 50, PAPER, 'left');
    game.draw.rect(60, 172, W - 120, 20, PAPER);
    game.draw.rect(64, 176, (W - 128) * Math.max(0, timeLeft / TIME_LIMIT), 12, INK);
    // 物音ゲージ(親指ゾーン)
    var cells = 10, cw = (W - 200) / cells;
    for (var c = 0; c < cells; c++) {
      var on = noise * cells > c;
      game.draw.rect(100 + c * cw, H * 0.905, cw - 10, 56, INK);
      if (!on) game.draw.rect(104 + c * cw, H * 0.905 + 4, cw - 18, 48, PAPER);
      else if (c >= 7 && Math.floor(game.time.elapsed * 10) % 2 === 0) game.draw.rect(112 + c * cw, H * 0.905 + 12, cw - 34, 32, PAPER);
    }
  }

  function txt(s, x, y, sz, col, align) {
    game.draw.text(s, x, y, { size: sz, color: col, bold: true, align: align || 'center', font: 'serif' });
  }

  function scoreNow() { return got * 200 + Math.round((1 - noise) * 300) + stirsSurvived * 50 + Math.round(timeLeft * 10); }

  // ── ループ ───────────────────────────────────────────────────────
  game.onUpdate(function(dt) {
    var t = game.time.elapsed;

    if (state === S.ATTRACT) {
      if (phase === undefined) initGame();
      stepDemo(dt);
      drawWorld(); drawBear(); drawActors();
      game.draw.hand(demo.gx, demo.gy, { press: pressing, scale: 14 });
      game.draw.rect(0, 0, W, 225, INK);
      txt(GAME_TITLE, W / 2, 86 + Math.sin(t * 2) * 6, 76, PAPER);
      txt('HI-SCORE ' + game.best, W / 2, 176, 36, PAPER);
      game.draw.rect(0, H * 0.93, W, 110, PAPER, 0.9);
      if (Math.floor(t * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.965, 40, INK);
      else txt('INSERT COIN', W / 2, H * 0.965, 34, INK);
      return;
    }

    if (state === S.RESULT) {
      drawWorld(); drawBear(); drawActors();
      if (win) for (var f = 0; f < 10; f++) game.draw.sprite(ZZZ, { k: INK }, (f * 173 + t * 120) % W, (f * 229 + t * 90) % (H * 0.6) + 240, 6);
      game.draw.rect(0, H * 0.4, W, H * 0.2, INK);
      txt(win ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.45, 96, PAPER);
      txt('SCORE ' + (win ? scoreNow() : 0), W / 2, H * 0.51, 46, PAPER);
      if (win && scoreNow() >= game.best) txt('NEW RECORD', W / 2, H * 0.56, 42, PAPER);
      else if (!win) txt('あと' + Math.max(1, NEEDED - got) + '個!', W / 2, H * 0.56, 44, PAPER);
      else txt('BEST ' + game.best, W / 2, H * 0.56, 38, PAPER);
      game.draw.rect(0, H * 0.93, W, 110, PAPER, 0.9);
      if (Math.floor(t * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.965, 38, INK);
      return;
    }

    if (phase === 'ready') {
      readyT -= dt;
      if (readyT <= 0) { phase = 'play'; game.audio.play('se_tap', 0.4); }
    } else if (phase === 'play') {
      timeLeft -= dt;
      creep(dt, false);
      if (phase === 'play' && timeLeft <= 0) {
        timeLeft = 0;
        game.feedback.bad(mouse.x, mouse.y - 80, { text: 'TIME UP', color: INK });
        finish(false, false);
      }
    } else if (phase === 'stop') {
      stopT -= dt;
      if (stopT <= 0) { phase = 'outro'; outroT = 1.3; }
    } else if (phase === 'outro') {
      outroT -= dt;
      if (win) { mouse.y += 400 * dt; mouse.face = 1; }
      if (outroT <= 0) {
        state = S.RESULT;
        var stats = { items: got, calm: Math.round((1 - noise) * 100), stirs: stirsSurvived };
        if (win) game.end.success(scoreNow(), stats);
        else game.end.failure(stats);
        return;
      }
    }

    drawWorld(); drawBear(); drawActors(); drawHud();
    if (phase === 'ready') txt(readyT > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.55, 100, INK);
    if (phase === 'outro') {
      game.draw.rect(0, H * 0.5, W, 150, INK);
      txt(win ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.54, 92, PAPER);
    }
  });

  game.onStart(function() {
    game.audio.melody([
      ['E4', 1], ['R', 0.5], ['G4', 0.5], ['F#4', 1], ['R', 1],
      ['D4', 1], ['R', 0.5], ['E4', 0.5], ['B3', 1.5], ['R', 0.5]
    ], { tempo: 84, wave: 'triangle', volume: 0.045, loop: true, bass: [['E2', 2], ['D2', 2], ['C2', 2], ['B1', 2]] });
    state = S.ATTRACT;
    initGame();
  });
})(game);
