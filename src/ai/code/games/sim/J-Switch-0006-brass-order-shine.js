// J-Switch-0006-brass-order-shine.js
// 注文札どおりの金物みがき — 作業台に並んだくすんだ金物のうち、注文札に描かれた品だけを布で素早くこすってピカピカに仕上げる
// 操作: 注文札と同じ形の品の上で指を往復させてこする。違う品をこすると傷が付く。客の待ち時間が尽きる前に仕上げる(社内メモ。画面には出さない)
// 終わり: 5件の注文を仕上げればCLEAR。ミス3回(違う品に傷・待たせすぎ)/時間切れでGAME OVER
// @mechanic: rub
// @theme: tinsmith_order_polish
// 世界観: 港町の金物屋の店先、見習い職人が次々に差し出される注文札を見て、鈴・やかん・優勝杯・手提げ灯の中から頼まれた品だけを布でこすり上げ、待たせずに客へ手渡していく
// 残るもの: 正誤(CLEAR/GAME OVER) + 仕上げた件数・最大コンボ・傷を付けた数
// スタイル: MODERN AD-GAME

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // MODERN AD-GAME: 高彩度・高コントラスト、太い縁取り、飛ぶ数字、3秒で伝わる画面
  var STYLE = { bg: ['#2a7bff', '#5ab0ff', '#1a4acc'], main: ['#ffc83a', '#ff8a3a', '#e8eef8'], accent: ['#ff3a6a', '#3aff9a'] };
  var C = {
    bg1: '#1a4acc', bg2: '#5ab0ff', bench: '#b0642a', benchD: '#7a3e14', benchL: '#d88a4a', ink: '#12122a', white: '#ffffff',
    brass: '#ffc83a', brassD: '#c08a1a', copper: '#ff8a3a', copperD: '#b04e14', silver: '#e8eef8', silverD: '#8a98b0',
    grime: '#4a3a2a', good: '#3aff9a', bad: '#ff3a6a', gold: '#ffe84a', paper: '#fff6dc'
  };

  var GAME_TITLE = 'SHINE ORDER';
  var TIME_LIMIT = 14;
  var NEEDED = 5;
  var MAX_MISS = 3;
  var RUB_LEN = 900;
  var SLOT_X = [W * 0.2, W * 0.5, W * 0.8], SLOT_Y = H * 0.52, ITEM_R = 150;

  var KINDS = ['bell', 'kettle', 'cup', 'lamp'];
  var ART = {
    bell: { a: ['...kk...', '..kbbk..', '.kbbbbk.', '.kbBbbk.', 'kbbBbbbk', 'kbbbbbbk', 'kkkkkkkk', '...kk...'], m: 'brass' },
    kettle: { a: ['..kkkk...', '.k....k..', 'kkbbbbkk.', 'kbBbbbbkk', 'kbBbbbbk.k', 'kbbbbbbkk', '.kbbbbk..', '..kkkk...'], m: 'copper' },
    cup: { a: ['kkkkkkkk', 'kbBbbbbk', 'kbBbbbbk', '.kbbbbk.', '..kbbk..', '...kk...', '..kbbk..', '.kkkkkk.'], m: 'silver' },
    lamp: { a: ['...kk...', '..k..k..', '.kkkkkk.', '.kbyybk.', '.kbyybk.', '.kbBbbk.', '.kkkkkk.', '..k..k..'], m: 'brass' }
  };

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var phase, ready, timeLeft, items, target, done, misses, combo, maxCombo, scratches, patience, patienceMax, hitStop, outro, ok, halfShown, lastX, lastY, squeak, focus, score, orderT;

  var KID = [
    ['..hhhh..', '.hhhhhh.', '..ffff..', '..fkfk..', '..ffff..', '.aaaaaa.', 'af.aa.af', '..aaaa..'],
    ['..hhhh..', '.hhhhhh.', '..ffff..', '..fkfk..', '..fwwf..', '.aaaaaa.', '.faaaaf.', '..aaaa..']
  ];
  var CLOTH = ['cccccc', 'cCcCcC', 'cccccc', 'CcCcCc'];

  function txt(s, x, y, sz, col, align) {
    game.draw.text(s, x + 4, y + 4, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(s, x, y, { size: sz, color: col, bold: true, align: align || 'center' });
  }

  function metalPal(m, shine) {
    if (m === 'copper') return { k: C.ink, b: shine ? C.copper : C.copperD, B: shine ? C.white : C.copper, y: C.gold };
    if (m === 'silver') return { k: C.ink, b: shine ? C.silver : C.silverD, B: shine ? C.white : C.silver, y: C.gold };
    return { k: C.ink, b: shine ? C.brass : C.brassD, B: shine ? C.white : C.brass, y: C.gold };
  }

  function newOrder() {
    var pool = KINDS.slice();
    for (var i = pool.length - 1; i > 0; i--) { var j = Math.floor(game.random(0, i + 1)) % (i + 1); var tmp = pool[i]; pool[i] = pool[j]; pool[j] = tmp; }
    items = [];
    for (var s = 0; s < 3; s++) {
      var spots = [];
      for (var g = 0; g < 7; g++) spots.push([game.random(-0.8, 0.8), game.random(-0.8, 0.8), game.random(0.5, 1)]);
      items.push({ kind: pool[s], x: SLOT_X[s], y: SLOT_Y, prog: 0, wrong: 0, scratch: 0, spots: spots, done: false, pop: 0.3 });
    }
    target = pool[Math.floor(game.random(0, 3)) % 3];
    patienceMax = Math.max(2.8, 4.2 - done * 0.25); patience = patienceMax; orderT = 0;
  }

  function initGame() {
    phase = 'ready'; ready = 0.8; timeLeft = TIME_LIMIT; done = 0; misses = 0; combo = 0; maxCombo = 0; scratches = 0;
    hitStop = 0; outro = 0; ok = false; halfShown = false; lastX = null; lastY = null; squeak = 0; focus = null; score = 0;
    newOrder();
  }

  function itemAt(x, y) {
    for (var i = 0; i < items.length; i++) if (Math.hypot(x - items[i].x, y - items[i].y) < ITEM_R) return items[i];
    return null;
  }

  // こする(実プレイ・デモ共用)。d は指の移動量
  function rub(it, d, isDemo) {
    if (!it || it.done) return;
    if (it.kind === target) {
      var before = it.prog;
      it.prog = Math.min(1, it.prog + d / RUB_LEN);
      squeak += d;
      if (squeak > 70) {
        squeak = 0;
        if (!isDemo) game.audio.tone(it.prog > 0.5 ? 'E6' : 'B5', 0.03, { wave: 'triangle', volume: 0.03 });
        game.fx.burst(it.x + game.random(-80, 80), it.y + game.random(-80, 80), { color: C.white, count: 2, speed: 90 });
      }
      if (Math.floor(before * 4) < Math.floor(it.prog * 4) && it.prog < 1 && !isDemo) game.fx.popup(Math.floor(it.prog * 100) + '%', it.x, it.y - 200, { color: C.white, size: 44 });
      if (it.prog >= 1) polished(it, isDemo);
    } else {
      it.wrong += d;
      if (it.wrong > 160) { it.wrong = 0; it.scratch = 1; scratchIt(it, isDemo); }
    }
  }

  function polished(it, isDemo) {
    it.done = true;
    if (isDemo) { game.fx.burst(it.x, it.y, { color: C.gold, count: 14, speed: 300 }); orderT = -0.5; return; }
    done++;
    var fast = orderT < 2;
    combo = fast ? combo + 1 : 1;
    if (combo > maxCombo) maxCombo = combo;
    var gain = 100 * Math.min(4, combo);
    score += gain;
    game.feedback.good(it.x, it.y - 200, { text: combo >= 3 ? 'PERFECT' : 'GOOD', color: C.gold, count: 18, size: 64 });
    game.fx.popup('+' + gain, it.x, it.y - 120, { color: C.white, size: 56 });
    game.audio.play('se_coin', 0.35);
    if (!halfShown && done >= Math.ceil(NEEDED / 2)) {
      halfShown = true;
      game.audio.play('se_milestone', 0.5);
      game.fx.popup(done + ' / ' + NEEDED, W / 2, H * 0.3, { color: C.gold, size: 72 });
    }
    focus = it;
    if (done >= NEEDED) { finish(true); return; }
    orderT = -0.5;
  }

  function scratchIt(it, isDemo) {
    if (isDemo) { game.fx.burst(it.x, it.y, { color: C.bad, count: 8, speed: 200 }); return; }
    scratches++;
    miss(it);
  }

  function miss(it) {
    misses++; combo = 0;
    focus = it;
    if (misses >= MAX_MISS) { finish(false); return; }
    hitStop = 0.35;
    game.feedback.bad(it ? it.x : W / 2, (it ? it.y : SLOT_Y) - 200, { text: 'MISS', color: C.bad });
  }

  // 注文の進行(実プレイ・デモ共用)
  function stepOrder(dt, isDemo) {
    orderT += dt;
    for (var i = 0; i < items.length; i++) {
      if (items[i].pop > 0) items[i].pop -= dt;
      if (items[i].scratch > 0) items[i].scratch -= dt;
    }
    if (orderT < 0) { if (orderT + dt >= 0) newOrder(); return; }
    patience -= dt;
    if (patience <= 0) {
      if (isDemo) { newOrder(); return; }
      patience = 0;
      miss(null);
      if (phase === 'play') newOrder();
    }
  }

  function finish(win) {
    if (phase === 'stop' || phase === 'outro') return;
    ok = win; phase = 'stop'; hitStop = 0.55;
    game.audio.stopBgm();
    if (win) { game.fx.flash(C.gold, 0.25); game.audio.play('se_success', 0.6); }
    else {
      game.feedback.bad(W / 2, SLOT_Y - 220, { text: timeLeft <= 0 ? 'TIME UP' : 'MISS', color: C.bad });
      game.audio.play('se_failure', 0.6);
    }
  }

  // ── input ─────────────────────────────────────────────────────────
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.6); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (phase === 'play' && itemAt(x, y)) game.audio.play('se_tap', 0.2);
  });
  game.onPress(function(x, y) {
    if (state !== S.PLAYING || phase !== 'play') return;
    lastX = x; lastY = y;
    if (itemAt(x, y)) game.fx.burst(x, y, { color: C.white, count: 3, speed: 80 });
  });
  game.onMove(function(x, y) {
    if (state !== S.PLAYING || phase !== 'play' || hitStop > 0) return;
    if (lastX !== null && orderT >= 0) {
      var d = Math.min(120, Math.hypot(x - lastX, y - lastY));
      var it = itemAt(x, y);
      if (it) rub(it, d, false);
      else if (d > 40) game.audio.tone('C4', 0.02, { wave: 'triangle', volume: 0.015 });
    }
    lastX = x; lastY = y;
  });
  game.onRelease(function(x, y) {
    if (state !== S.PLAYING) return;
    lastX = null;
    if (phase === 'play' && itemAt(x, y)) game.audio.tone('G4', 0.03, { wave: 'triangle', volume: 0.02 });
  });

  // ── demo(札と同じ品をこする。3件目は先に別の品をこすって傷を付ける)──
  var demo = { t: 0, gx: W / 2, gy: SLOT_Y, n: 0, px: 0, py: 0, wrongFirst: false, seenOrder: null };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 10;
    if (cyc < dt || demo.t <= dt) { done = 0; demo.n = 0; newOrder(); }
    stepOrder(dt, true);
    if (orderT < 0) return;
    if (demo.seenOrder !== items) { demo.seenOrder = items; demo.wrongFirst = demo.n % 3 === 2; demo.n++; }
    var tgt = null, other = null;
    for (var i = 0; i < items.length; i++) { if (items[i].kind === target) tgt = items[i]; else if (!other) other = items[i]; }
    if (!tgt) return;
    var aim = (demo.wrongFirst && orderT < 0.7) ? other : tgt;
    var nx = aim.x + Math.sin(demo.t * 16) * 100, ny = aim.y + Math.cos(demo.t * 9) * 30;
    var d = Math.hypot(nx - demo.gx, ny - demo.gy);
    demo.gx = nx; demo.gy = ny;
    if (orderT > 0.15) rub(aim, Math.min(120, d) * 0.9, true);
    if (aim !== tgt && aim.scratch > 0) demo.wrongFirst = false;
  }

  // ── drawing ───────────────────────────────────────────────────────
  function drawShop() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, C.bg1], [0.35, C.bg2], [0.38, C.benchL], [0.7, C.bench], [1, C.benchD]]);
    // 棚の品(遠景)と光の筋
    for (var i = 0; i < 8; i++) game.draw.rect(i * 140 + 20, H * 0.33 - 60 + Math.sin(t * 2 + i) * 3, 90, 60, [C.brass, C.copper, C.silver][i % 3], 0.35);
    for (var r = 0; r < 4; r++) game.draw.rect(r * 300 + ((t * 40) % 300) - 100, 230, 40, H * 0.14, C.white, 0.08);
    // 作業台の縁取り
    game.draw.rect(0, H * 0.38, W, 14, C.ink);
    game.draw.rect(0, H * 0.7, W, 14, C.ink);
    game.draw.rect(0, 0, W, H, C.white, 0.015 + 0.015 * Math.sin(t * 1.6));
  }

  function drawTicket() {
    var t = game.time.elapsed;
    if (!items) return;
    var tx = W / 2, ty = H * 0.215;
    var wob = Math.sin(t * 3) * 4;
    game.draw.rect(tx - 130 + 8, ty - 70 + 8, 260, 150, C.ink);
    game.draw.rect(tx - 130, ty - 70 + wob, 260, 150, C.paper);
    game.draw.sprite(ART[target].a, metalPal(ART[target].m, true), tx, ty + 5 + wob, 13, { anchor: 'center' });
    // 客の待ち時間(札の下の帯)
    var p = Math.max(0, patience / patienceMax);
    game.draw.rect(tx - 130, ty + 90, 260, 18, C.ink);
    game.draw.rect(tx - 130, ty + 90, 260 * p, 18, p < 0.3 && Math.floor(t * 10) % 2 ? C.bad : C.good);
  }

  function drawItems() {
    var t = game.time.elapsed;
    if (!items) return;
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      var isT = it.kind === target;
      var bob = Math.sin(t * 2.5 + i) * 5;
      var sc = it.pop > 0 ? 1 - it.pop : 1;
      var hl = focus === it && (phase === 'stop' || hitStop > 0) && Math.floor(t * 14) % 2 === 0;
      game.draw.rect(it.x - 120, it.y + 130, 240, 22, C.ink, 0.3);
      if (hl) game.draw.circle(it.x, it.y, ITEM_R + 20, it.done ? C.gold : C.bad, 0.4);
      var shine = it.prog >= 1 || it.done;
      game.draw.sprite(ART[it.kind].a, metalPal(ART[it.kind].m, shine), it.x, it.y + bob, 30 * sc, { anchor: 'center' });
      // くすみ(こするほど薄れる)
      if (!it.done) {
        for (var s = 0; s < it.spots.length; s++) {
          var sp = it.spots[s];
          game.draw.circle(it.x + sp[0] * 90 * sc, it.y + bob + sp[1] * 90 * sc, 34 * sp[2] * sc, C.grime, (1 - it.prog) * 0.75);
        }
      } else {
        for (var g = 0; g < 4; g++) {
          var a = t * 3 + g * Math.PI / 2;
          game.draw.rect(it.x + Math.cos(a) * 140 - 6, it.y + Math.sin(a) * 140 - 6, 12, 12, C.white);
        }
      }
      if (it.scratch > 0) {
        game.draw.line(it.x - 70, it.y - 50, it.x + 60, it.y + 40, C.bad, 8);
        game.draw.line(it.x - 40, it.y + 50, it.x + 70, it.y - 30, C.bad, 8);
      }
      // こすった量(対象の品の下)
      if (isT && !it.done && it.prog > 0) {
        game.draw.rect(it.x - 100, it.y + 170, 200, 16, C.ink);
        game.draw.rect(it.x - 100, it.y + 170, 200 * it.prog, 16, C.gold);
      }
    }
  }

  function drawBottom() {
    var t = game.time.elapsed;
    game.draw.rect(0, H * 0.78, W, H * 0.22, C.benchD);
    game.draw.rect(0, H * 0.78, W, 12, C.ink);
    for (var i = 0; i < NEEDED; i++) {
      var k = KINDS[i % 4];
      game.draw.sprite(ART[k].a, metalPal(ART[k].m, i < done), W * 0.36 + i * 120, H * 0.84 + Math.sin(t * 3 + i) * (i < done ? 4 : 0), 8, { anchor: 'center', alpha: i < done ? 1 : 0.3 });
    }
    for (var m = 0; m < MAX_MISS; m++) game.draw.rect(W * 0.42 + m * 80, H * 0.92, 56, 22, m < misses ? C.bad : C.ink);
    game.draw.sprite(KID[Math.floor(t * 2) % 2], { h: C.ink, f: '#ffd0a0', k: C.ink, w: C.white, a: '#3a7aff' }, W * 0.14, H * 0.87 + Math.sin(t * 2.4) * 5, 16, { anchor: 'center' });
    game.draw.sprite(CLOTH, { c: C.white, C: C.silverD }, W * 0.88, H * 0.86 + Math.sin(t * 5) * 6, 16, { anchor: 'center' });
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 225, C.ink, 0.75);
    txt(done + ' / ' + NEEDED, W / 2 - 200, 80, 60, C.gold);
    txt(String(Math.ceil(timeLeft)), 70, 80, 52, C.white, 'left');
    txt(String(score), W - 70, 80, 48, C.white, 'right');
    if (combo >= 2) txt('x' + Math.min(4, combo), W - 70, 140, 40, C.good, 'right');
    game.draw.rect(60, 180, W - 120, 20, C.bg1);
    game.draw.rect(60, 180, (W - 120) * Math.max(0, timeLeft / TIME_LIMIT), 20, timeLeft < 4 ? C.bad : C.gold);
  }

  // ── main loop ─────────────────────────────────────────────────────
  game.onUpdate(function(dt) {
    var t = game.time.elapsed;

    if (state === S.ATTRACT) {
      if (phase === undefined) initGame();
      stepDemo(dt);
      drawShop(); drawItems(); drawTicket(); drawBottom();
      game.draw.hand(demo.gx, demo.gy + 20, { press: orderT > 0.15, scale: 14 });
      game.draw.rect(0, 0, W, 230, C.ink, 0.75);
      txt(GAME_TITLE, W / 2, 90 + Math.sin(t * 2) * 6, 80, C.gold);
      txt('HI-SCORE ' + game.best, W / 2, 180, 36, C.white);
      if (Math.floor(t * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.975, 42, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.975, 36, C.white);
      return;
    }

    if (state === S.RESULT) {
      drawShop(); drawBottom();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.3, 96, ok ? C.gold : C.bad);
      txt('SCORE ' + score, W / 2, H * 0.37, 52, C.white);
      if (Math.floor(t * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.975, 40, C.white);
      return;
    }

    if (phase === 'ready') {
      ready -= dt;
      if (ready <= 0) { phase = 'play'; game.audio.play('se_tap', 0.5); }
    } else if (phase === 'play') {
      if (hitStop > 0) hitStop -= dt;
      else {
        timeLeft -= dt;
        stepOrder(dt, false);
        if (phase === 'play' && timeLeft <= 0) { timeLeft = 0; finish(false); }
      }
    } else if (phase === 'stop') {
      hitStop -= dt;
      if (hitStop <= 0) { phase = 'outro'; outro = 1.4; }
    } else if (phase === 'outro') {
      outro -= dt;
      if (outro <= 0) {
        state = S.RESULT;
        var total = score + Math.round(timeLeft * 20);
        var stats = { orders: done, maxCombo: maxCombo, scratches: scratches, misses: misses };
        if (ok) game.end.success(total, stats);
        else game.end.failure(stats);
        return;
      }
    }

    drawShop(); drawItems(); drawTicket(); drawBottom(); drawHud();
    if (phase === 'ready') txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.36, 100, C.gold);
    if (phase === 'outro') {
      var sc = score + Math.round(timeLeft * 20);
      game.draw.rect(0, H * 0.25, W, H * 0.16, C.ink, 0.85);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.29, 100, ok ? C.gold : C.bad);
      txt('SCORE ' + sc, W / 2, H * 0.34, 48, C.white);
      if (ok && sc > game.best) txt('NEW RECORD', W / 2, H * 0.38, 44, C.gold);
      else if (!ok) txt('あと' + Math.max(1, NEEDED - done) + '件!', W / 2, H * 0.38, 46, C.white);
      else txt('BEST ' + game.best, W / 2, H * 0.38, 38, C.white);
    }
  });

  game.onStart(function() {
    game.audio.melody([
      ['C5', 0.5], ['C5', 0.25], ['D5', 0.25], ['E5', 0.5], ['G5', 0.5], ['A5', 0.5], ['G5', 0.5], ['E5', 1],
      ['F5', 0.5], ['E5', 0.5], ['D5', 0.5], ['B4', 0.5], ['C5', 2]
    ], { tempo: 150, wave: 'square', volume: 0.045, loop: true, bass: [['C3', 1], ['G3', 1], ['A2', 1], ['E3', 1], ['F2', 1], ['G2', 1], ['C3', 2]] });
    state = S.ATTRACT;
    initGame();
  });
})(game);
