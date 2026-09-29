// J-Switch-0040-canal-balloon-pinch.js
// 用水路の水風船すくい — 流れてくる水風船を2本の指で両側から挟んでつかみ取り、堰に吸い込まれて割れる前にたらいへ集める
// 操作: 水風船の左右に指を1本ずつ置いて挟むとつかめる(1本指で触ると風船はつるりと逃げる)。トゲのある赤い菱の実を挟むと手を刺されてMISS。金の水風船は2個ぶん(社内メモ。画面には出さない)
// 終わり: 8個ぶん集めればCLEAR。菱の実を3回つかむ/15秒でTIME UPならGAME OVER
// @mechanic: pinch_zone
// @theme: canal_water_balloon_pinch
// 世界観: 夏祭りの翌朝、上流の屋台からこぼれた水風船が田んぼの用水路をぷかぷか流れてくる。川辺に住むアライグマの子が両手で左右から挟んで拾い上げ、下流の堰に吸い込まれて割れる前に岸のたらいへ集めていく
// 残るもの: 正誤(CLEAR/GAME OVER) + 集めた数・金の水風船・菱の実に刺された回数のスコア
// スタイル: HYPERCASUAL 3D

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // HYPERCASUAL 3D: 白っぽい背景+単色、柔らかい影の丸い塊。当たり判定は見た目どおり
  var STYLE = { bg: ['#f4f8ff', '#dcecff'], main: ['#6ad8e8', '#ff7aa8', '#ffd84a'], accent: ['#e8403a', '#ffffff'] };
  var C = {
    bg1: '#f6faff', bg2: '#dcecff', bank: '#bfe8a8', bankD: '#8ccc78', water: '#8fe4f0', waterD: '#5ac8dc', foam: '#ffffff',
    shadow: '#3a5a7a', gold: '#ffd84a', bad: '#e8403a', badD: '#8a1a1a', good: '#3ad08a', ink: '#24324a', white: '#ffffff', grate: '#6a7a8a'
  };
  var BALLOON_COLS = ['#ff7aa8', '#7ab4ff', '#ffa84a', '#a88aff', '#5ad89a'];

  var GAME_TITLE = 'BALLOON PINCH';
  var TIME_LIMIT = 15;
  var NEEDED = 8;
  var MAX_MISS = 3;
  var CH_L = 170, CH_R = 910;
  var TOP_Y = Math.round(H * 0.12);
  var WEIR_Y = Math.round(H * 0.73);
  var TUB_Y = Math.round(H * 0.85);
  var MID_Y = Math.round(H * 0.42);

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var items, flying, caught, golds, lost, misses, spawnT, warnList, timeLeft, ready, hitStop, hitItem, finished, ok, endWait, score, pinchArmed, halfShown, bestAtStart, flow, pawFlash;

  var RACCOON = [
    ['.g......g.', 'ggg....ggg', '.gggggggg.', 'gkkwggwkkg', 'gkewggweg.', '.gggnngg..', '..gwwwwg..', '.pgggggp..', '..gggggg..', '..g....g..'],
    ['pg......gp', 'ggg....ggg', '.gggggggg.', 'gkkwggwkkg', 'gkewggweg.', '.gggnngg..', '..gwwwwg..', '..gggggg..', '..gggggg..', '..g....g..']
  ];
  var RAC_PAL = { g: '#9aa0aa', k: '#3a3a44', w: '#f4f4f4', e: '#10131a', n: '#24242a', p: '#c8ccd4' };
  var TAIL = ['.gkgkgk', 'gkgkgkg'];
  var PAW = ['.p.p.', 'p.p.p', '.ppp.', 'ppppp', '.ppp.'];
  var CALTROP = ['k...k', '.kkk.', 'krrrk', '.rrr.', 'k...k'];
  var FROG = [['.gg.gg.', 'gwggwgg', 'ggggggg', '.ggggg.'], ['.gg.gg.', 'gwggwgg', 'gg...gg', '.ggggg.']];

  function txt(s, x, y, sz, col, align) {
    game.draw.text(s, x + 3, y + 4, { size: sz, color: '#ffffff', bold: true, align: align || 'center' });
    game.draw.text(s, x, y, { size: sz, color: col, bold: true, align: align || 'center' });
  }

  function initGame() {
    items = []; flying = []; warnList = [];
    caught = 0; golds = 0; lost = 0; misses = 0; score = 0;
    spawnT = 0.3; timeLeft = TIME_LIMIT; ready = 0.8; hitStop = 0; hitItem = null;
    finished = false; ok = false; endWait = 0; pinchArmed = false; halfShown = false; flow = 170; pawFlash = 0;
    bestAtStart = game.best || 0;
  }

  function addItem(kind, x, y, gold) {
    items.push({
      kind: kind, x: x, y: y, r: kind === 'caltrop' ? 50 : game.random(58, 70), gold: !!gold,
      col: BALLOON_COLS[Math.floor(game.random(0, BALLOON_COLS.length - 0.01))], ph: game.random(0, 6), vx: 0, squish: 0
    });
  }

  // ── 共通ロジック ────────────────────────────────────────
  function spawnStep(dt) {
    // 予告してから菱の実を流す
    for (var i = warnList.length - 1; i >= 0; i--) {
      warnList[i].t -= dt;
      if (warnList[i].t <= 0) { addItem('caltrop', warnList[i].x, TOP_Y + 40); warnList.splice(i, 1); }
    }
    spawnT -= dt;
    if (spawnT > 0) return;
    // 物量型: 時間とともに間隔が詰まる
    var k = 1 - timeLeft / TIME_LIMIT;
    spawnT = 0.7 - 0.28 * k;
    var x = game.random(CH_L + 90, CH_R - 90);
    if (Math.random() < 0.24) {
      warnList.push({ x: x, t: 0.65 });
      game.audio.tone(760, 0.08, { wave: 'square', volume: 0.05 });
    } else {
      addItem('balloon', x, TOP_Y + 40, Math.random() < 0.14);
    }
  }

  function tryPinch(ax, ay, bx, by) {
    if (finished || hitStop > 0 || ready > 0) return null;
    var mx = (ax + bx) / 2, my = (ay + by) / 2;
    var spread = Math.hypot(ax - bx, ay - by);
    var best = null, bestD = 1e9;
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      var d = Math.hypot(mx - it.x, my - it.y);
      if (d < it.r * 0.95 && spread > it.r * 0.9 && spread < it.r * 3.6 && d < bestD) { best = it; bestD = d; }
    }
    if (!best) return null;
    items.splice(items.indexOf(best), 1);
    if (best.kind === 'caltrop') {
      misses++;
      hitStop = 0.5; hitItem = best;
      game.feedback.bad(best.x, best.y - 60, { text: 'MISS', shake: 12 });
      return best;
    }
    var pts = best.gold ? 2 : 1;
    caught += pts; if (best.gold) golds++;
    score += best.gold ? 400 : 150;
    flying.push({ x: best.x, y: best.y, sx: best.x, sy: best.y, t: 0, col: best.gold ? C.gold : best.col, r: best.r });
    game.audio.play('se_coin', 0.45);
    game.feedback.good(best.x, best.y - 70, { text: best.gold ? 'NICE' : 'GOOD', color: best.gold ? C.gold : C.good });
    if (!halfShown && caught >= NEEDED / 2) {
      halfShown = true;
      game.audio.play('se_milestone', 0.4);
      game.fx.popup(caught + ' / ' + NEEDED, W / 2, MID_Y, { color: C.gold, size: 60 });
    }
    if (caught >= NEEDED) { hitItem = null; finish(true); }
    return best;
  }

  function poke(x, y) {
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      if (Math.hypot(x - it.x, y - it.y) < it.r) {
        it.vx += (x < it.x ? 1 : -1) * 520;
        it.squish = 0.3;
        return it;
      }
    }
    return null;
  }

  function stepWorld(dt, countTime) {
    pawFlash = Math.max(0, pawFlash - dt);
    for (var f = flying.length - 1; f >= 0; f--) {
      var fl = flying[f];
      fl.t += dt / 0.45;
      var k = Math.min(1, fl.t);
      fl.x = fl.sx + (150 - fl.sx) * k;
      fl.y = fl.sy + (TUB_Y - 30 - fl.sy) * k - Math.sin(k * Math.PI) * 260;
      if (fl.t >= 1) flying.splice(f, 1);
    }
    if (finished) return;
    if (hitStop > 0) {
      hitStop -= dt;
      if (hitStop <= 0) { hitItem = null; if (misses >= MAX_MISS) finish(false); }
      return;
    }
    if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_jump', 0.3);
      return;
    }
    if (countTime) {
      timeLeft -= dt;
      if (timeLeft <= 0) {
        timeLeft = 0;
        game.feedback.bad(W / 2, MID_Y, { text: 'TIME UP' });
        finish(false);
        return;
      }
    }
    flow = 170 + 90 * (1 - timeLeft / TIME_LIMIT);
    spawnStep(dt);
    for (var i = items.length - 1; i >= 0; i--) {
      var it = items[i];
      it.ph += dt * 2;
      it.squish = Math.max(0, it.squish - dt);
      it.vx *= Math.pow(0.5, dt);
      it.x += (it.vx + Math.sin(it.ph) * 40) * dt;
      it.x = Math.max(CH_L + it.r, Math.min(CH_R - it.r, it.x));
      it.y += flow * (it.gold ? 1.3 : 1) * dt;
      if (it.y > WEIR_Y) {
        items.splice(i, 1);
        if (it.kind === 'balloon') {
          lost++;
          game.audio.play('se_break', 0.2);
          game.fx.burst(it.x, WEIR_Y, { color: C.water, count: 10, speed: 260 });
        }
      }
    }
  }

  function finish(win) {
    if (finished) return;
    finished = true; ok = win; endWait = 1.3;
    if (win) score += Math.round(timeLeft * 80) + (MAX_MISS - misses) * 100;
    if (state !== S.PLAYING) return;
    game.audio.stopBgm();
    if (win) {
      game.audio.play('se_success', 0.6);
      game.fx.flash(C.gold, 0.25);
      game.fx.burst(150, TUB_Y - 60, { color: C.gold, count: 34, speed: 560 });
    } else game.audio.play('se_failure', 0.6);
  }

  // ── 描画 ──────────────────────────────────────────────
  function drawScene() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [C.bg1, C.bg2]);
    // 土手
    game.draw.rect(0, TOP_Y - 20, CH_L, WEIR_Y + 60 - TOP_Y, C.bank, 1);
    game.draw.rect(CH_R, TOP_Y - 20, W - CH_R, WEIR_Y + 60 - TOP_Y, C.bank, 1);
    game.draw.rect(CH_L - 14, TOP_Y - 20, 14, WEIR_Y + 60 - TOP_Y, C.bankD, 1);
    game.draw.rect(CH_R, TOP_Y - 20, 14, WEIR_Y + 60 - TOP_Y, C.bankD, 1);
    // 稲の穂(ゆれる)
    for (var r = 0; r < 8; r++) {
      var yy = TOP_Y + 60 + r * 150;
      var sw = Math.sin(t * 1.5 + r) * 8;
      game.draw.line(60, yy + 60, 60 + sw, yy, C.bankD, 5);
      game.draw.line(W - 60, yy + 60, W - 60 + sw, yy, C.bankD, 5);
    }
    // 水路(流れの筋)
    game.draw.rect(CH_L, TOP_Y - 20, CH_R - CH_L, WEIR_Y + 40 - TOP_Y, C.water, 1);
    for (var s = 0; s < 14; s++) {
      var sy = TOP_Y + ((s * 97 + t * flow) % (WEIR_Y - TOP_Y));
      var sx = CH_L + 40 + (s * 131) % (CH_R - CH_L - 120);
      game.draw.rect(sx, sy, 70, 6, C.foam, 0.5);
    }
    // 堰(吸い込み口)
    game.draw.rect(CH_L, WEIR_Y, CH_R - CH_L, 40, C.waterD, 1);
    for (var g = CH_L + 20; g < CH_R; g += 50) game.draw.rect(g, WEIR_Y, 14, 60, C.grate, 1);
    game.draw.rect(CH_L - 20, WEIR_Y + 50, CH_R - CH_L + 40, 20, C.grate, 1);
    // カエル(演出、常時bob)
    game.draw.sprite(FROG[Math.floor(t * 2) % 2], { g: '#5ac878', w: '#ffffff' }, W - 90, TOP_Y + 200 + Math.sin(t * 3) * 6, 9, { anchor: 'center' });
  }

  function drawBalloon(it, hl) {
    var t = game.time.elapsed;
    var bob = Math.sin(it.ph * 1.3) * 6;
    var sq = it.squish > 0 ? 1 + it.squish : 1;
    game.draw.circle(it.x + 14, it.y + 22, it.r * 0.95, C.shadow, 0.18);
    if (it.kind === 'caltrop') {
      game.draw.sprite(CALTROP, { k: C.badD, r: C.bad }, it.x, it.y + bob, 20, { anchor: 'center' });
      if (hl) game.draw.sprite(CALTROP, { k: C.white, r: C.white }, it.x, it.y, 26, { anchor: 'center', alpha: 0.8 });
      return;
    }
    var col = it.gold ? C.gold : it.col;
    game.draw.circle(it.x, it.y + bob, it.r * sq, col, 1);
    game.draw.circle(it.x - it.r * 0.1, it.y + bob + it.r * 0.1, it.r * 0.8, '#ffffff', 0.12);
    game.draw.circle(it.x - it.r * 0.35, it.y + bob - it.r * 0.35, it.r * 0.24, '#ffffff', 0.85);
    game.draw.rect(it.x - 8, it.y + bob + it.r - 6, 16, 14, col, 1);
    if (it.gold) {
      game.draw.circle(it.x, it.y + bob, it.r + 10, C.white, 0.3 + 0.2 * Math.sin(t * 10));
    }
    // 押せる物: 白縁の明滅
    game.draw.circle(it.x, it.y + bob, it.r + 4, C.white, 0.12 + 0.1 * Math.sin(t * 6 + it.ph));
  }

  function drawItems() {
    var t = game.time.elapsed;
    for (var w = 0; w < warnList.length; w++) {
      var bl = Math.floor(t * 12) % 2 === 0;
      game.draw.circle(warnList[w].x, TOP_Y + 20, 44, bl ? C.bad : C.white, 0.8);
      game.draw.rect(warnList[w].x - 6, TOP_Y - 6, 12, 32, bl ? C.white : C.bad, 1);
      game.draw.rect(warnList[w].x - 6, TOP_Y + 32, 12, 10, bl ? C.white : C.bad, 1);
    }
    for (var i = 0; i < items.length; i++) drawBalloon(items[i], false);
    if (hitItem) drawBalloon(hitItem, true);
    for (var f = 0; f < flying.length; f++) {
      var fl = flying[f];
      game.draw.circle(fl.x, fl.y, fl.r * (1 - fl.t * 0.5), fl.col, 1);
      game.draw.circle(fl.x - 12, fl.y - 12, 10, C.white, 0.8);
    }
  }

  function drawBank() {
    var t = game.time.elapsed;
    game.draw.rect(0, WEIR_Y + 70, W, H - WEIR_Y - 70, C.bank, 1);
    game.draw.rect(0, WEIR_Y + 70, W, 10, C.bankD, 1);
    // たらい(集めた水風船が積もる)
    game.draw.circle(150 + 10, TUB_Y + 30, 130, C.shadow, 0.15);
    game.draw.rect(40, TUB_Y - 40, 230, 110, '#c8d4e0', 1);
    game.draw.rect(30, TUB_Y - 50, 250, 20, '#e8f0f8', 1);
    for (var c = 0; c < Math.min(caught, 10); c++) {
      game.draw.circle(80 + (c % 5) * 38, TUB_Y - 50 - Math.floor(c / 5) * 34, 22, BALLOON_COLS[c % BALLOON_COLS.length], 1);
    }
    // アライグマの子(常時bob+sway)
    var bob = Math.sin(t * 3) * 6;
    var sway = Math.sin(t * 1.1) * 8;
    game.draw.sprite(TAIL, { g: '#9aa0aa', k: '#3a3a44' }, W - 330 + sway, TUB_Y + 60 + bob, 12, { anchor: 'center' });
    game.draw.sprite(RACCOON[pawFlash > 0 || Math.floor(t * 1.5) % 2 ? 1 : 0], RAC_PAL, W - 220 + sway, TUB_Y + bob, 16, { anchor: 'center' });
    // 挟む指の目印(押している指ごとに肉球)
    var ts = game.touches;
    if (state === S.PLAYING) {
      for (var i = 0; i < ts.length && i < 2; i++) game.draw.sprite(PAW, { p: '#5a5a66' }, ts[i].x, ts[i].y - 70, 10, { anchor: 'center', alpha: 0.8 });
      if (ts.length >= 2) game.draw.line(ts[0].x, ts[0].y - 70, ts[1].x, ts[1].y - 70, '#5a5a66', 4);
    }
    game.draw.rect(0, 0, W, H, '#ffffff', 0.03 + 0.03 * Math.sin(t * 1.7));
  }

  function drawHud() {
    for (var i = 0; i < NEEDED; i++) {
      var got = i < caught;
      game.draw.circle(90 + i * 70, 110, 26, got ? BALLOON_COLS[i % BALLOON_COLS.length] : '#c8d4e0', 1);
      game.draw.circle(80 + i * 70, 100, 7, C.white, got ? 0.9 : 0.4);
    }
    for (var m = 0; m < MAX_MISS; m++) game.draw.sprite(CALTROP, m < misses ? { k: C.badD, r: C.bad } : { k: '#c8d4e0', r: '#dde6ee' }, W - 70 - m * 70, 110, 8, { anchor: 'center' });
    var lowTime = timeLeft < 4 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(60, 170, W - 120, 18, '#c8d4e0', 1);
    game.draw.rect(60, 170, (W - 120) * Math.max(0, timeLeft / TIME_LIMIT), 18, lowTime ? C.bad : C.waterD, 1);
  }

  // ── ATTRACTデモ(両手で挟む実演。3回目は菱の実を挟んで失敗) ──
  var DEMO_CYC = 4.2;
  var demo = { t: 0, ax: 300, ay: 900, bx: 780, by: 900, press: false, target: null, n: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % DEMO_CYC;
    if (cyc < dt || demo.t <= dt) {
      initGame(); ready = 0; spawnT = 99;
      addItem('balloon', 400, TOP_Y + 260);
      addItem('balloon', 700, TOP_Y + 120, true);
      addItem('caltrop', 520, TOP_Y - 20);
      demo.n = 0; demo.target = null;
    }
    if (!demo.target || items.indexOf(demo.target) < 0) {
      demo.target = null;
      var want = demo.n < 2 ? 'balloon' : 'caltrop';
      for (var i = 0; i < items.length; i++) if (items[i].kind === want && items[i].y > TOP_Y + 150) { demo.target = items[i]; break; }
      demo.phase = 0;
    }
    demo.press = false;
    if (demo.target && hitStop <= 0) {
      demo.phase += dt / 0.9;
      var tg = demo.target;
      var open = Math.max(0, 1 - demo.phase) * 200 + tg.r * 1.05;
      demo.ax = tg.x - open; demo.ay = tg.y + 30;
      demo.bx = tg.x + open; demo.by = tg.y + 30;
      if (demo.phase >= 1) {
        demo.press = true;
        if (tryPinch(demo.ax, tg.y, demo.bx, tg.y)) { demo.n++; pawFlash = 0.3; }
        demo.target = null;
      }
    }
    stepWorld(dt, false);
  }

  // ── 入力 ─────────────────────────────────────────────
  function pinchFromTouches() {
    var ts = game.touches;
    if (ts.length < 2 || !pinchArmed) return null;
    var got = tryPinch(ts[0].x, ts[0].y, ts[1].x, ts[1].y);
    if (got) { pinchArmed = false; pawFlash = 0.3; }
    return got;
  }
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) {
      game.audio.play('se_coin', 0.5);
      state = S.PLAYING;
      initGame();
      return;
    }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING && game.touches.length === 0 && !finished && hitStop <= 0) {
      // 1本指で触ると風船はつるりと逃げる
      if (poke(x, y)) {
        game.audio.tone(300, 0.08, { wave: 'triangle', volume: 0.07, slide: 520 });
        game.fx.burst(x, y, { color: C.foam, count: 6, speed: 180 });
      }
    }
  });
  game.onPress(function(x, y, id) {
    if (state !== S.PLAYING) return;
    if (game.touches.length >= 2) pinchArmed = true;
    game.audio.play('se_tap', 0.12);
    game.fx.burst(x, y, { color: C.foam, count: 4, speed: 120 });
    pinchFromTouches();
  });
  game.onMove(function(x, y, id) {
    if (state !== S.PLAYING) return;
    if (pinchFromTouches()) game.fx.burst(x, y, { color: C.gold, count: 6, speed: 160 });
  });
  game.onRelease(function(x, y, id) {
    if (state !== S.PLAYING) return;
    if (game.touches.length < 2) pinchArmed = false;
    game.audio.tone(520, 0.03, { wave: 'triangle', volume: 0.03 });
  });

  // ── メインループ(1本だけ) ─────────────────────────────
  game.onUpdate(function(dt) {
    if (items === undefined) initGame();

    if (state === S.ATTRACT) {
      stepDemo(dt);
      drawScene(); drawItems(); drawBank();
      game.draw.hand(demo.ax, demo.ay, { press: demo.press, scale: 13 });
      game.draw.hand(demo.bx, demo.by, { press: demo.press, scale: 13 });
      var lb = Math.sin(game.time.elapsed * 2) * 6;
      txt(GAME_TITLE, W / 2, H * 0.05 + lb, 74, C.ink);
      txt('HI-SCORE ' + (game.best || 0), W / 2, H * 0.09, 34, C.waterD);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H - 40, 44, C.bad);
      else txt('TAP TO START', W / 2, H - 40, 38, C.ink);
      return;
    }

    if (state === S.RESULT) {
      drawScene(); drawBank();
      var t = game.time.elapsed;
      if (ok) {
        for (var s = 0; s < 6; s++) game.draw.circle(W / 2 + Math.cos(t * 2 + s) * 300, MID_Y + Math.sin(t * 2 + s) * 160, 40, BALLOON_COLS[s % 5], 0.8);
        txt('CLEAR', W / 2, MID_Y + Math.sin(t * 5) * 8, 120, C.good);
      } else {
        txt('GAME OVER', W / 2, MID_Y, 100, C.bad);
        txt('あと' + Math.max(1, NEEDED - caught) + '個!', W / 2, MID_Y + 100, 56, C.ink);
      }
      txt('SCORE ' + score, W / 2, MID_Y + 200, 56, C.ink);
      if (ok && score > bestAtStart) txt('NEW RECORD', W / 2, MID_Y + 290, 52, C.gold);
      else txt('BEST ' + bestAtStart, W / 2, MID_Y + 290, 42, C.ink);
      if (Math.floor(t * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H - 40, 38, C.ink);
      return;
    }

    // PLAYING
    if (finished) {
      endWait -= dt;
      stepWorld(dt, false);
      if (endWait <= 0) {
        state = S.RESULT;
        var stats = { caught: caught, gold: golds, stung: misses, lost: lost };
        if (ok) game.end.success(score, stats);
        else game.end.failure(stats);
      }
    } else {
      stepWorld(dt, true);
    }
    drawScene(); drawItems(); drawBank(); drawHud();
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, MID_Y, 100, C.ink);
    if (finished) txt(ok ? 'FINISH' : (timeLeft <= 0 ? 'TIME UP' : 'GAME OVER'), W / 2, MID_Y, 92, ok ? C.good : C.bad);
  });

  game.onStart(function() {
    game.audio.melody([
      ['C5', 0.5], ['E5', 0.5], ['G5', 0.5], ['E5', 0.5], ['F5', 0.5], ['A5', 0.5], ['G5', 1],
      ['E5', 0.5], ['C5', 0.5], ['D5', 0.5], ['E5', 0.5], ['C5', 1.5], ['R', 0.5]
    ], { tempo: 150, wave: 'triangle', volume: 0.05, loop: true, bass: [['C3', 2], ['F3', 2], ['G3', 2], ['C3', 2]] });
    state = S.ATTRACT;
    initGame();
  });
})(game);
