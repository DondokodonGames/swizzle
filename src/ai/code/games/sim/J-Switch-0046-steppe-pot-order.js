// J-Switch-0046-steppe-pot-order.js
// 草原の大鍋 — 長老の絵札に描かれた順に、敷物の上の具材を大鍋へドラッグで入れる
// 操作: 具材を指でつまんで大鍋まで運んで離す。絵札の次の具材なら鍋に入り、違う具材ならはね返されてミス(社内メモ。画面には出さない)
// 終わり: 3つの鍋料理を仕上げればCLEAR。入れ違い3回/時間切れでGAME OVER
// @mechanic: drag_sort
// @theme: steppe_yurt_pot_order
// 世界観: 冬至の祭りを迎えた草原の天幕村で、料理番の見習いが、長老が掲げる絵札の順番どおりに具材を大鍋へ入れ、客が待つ三つの鍋料理を日暮れまでに順に仕上げる
// 残るもの: 正誤(CLEAR/GAME OVER) + 仕上げた鍋の数・入れた具材の数・入れ違いの数
// スタイル: 90s 16bit

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s 16bit: 多色・高彩度、2〜3層の背景で奥行き、表情のあるスプライト
  var STYLE = { bg: ['#3a2a6a', '#e87a3a', '#f4c060'], main: ['#c83a3a', '#f0e0c0', '#6a4a2a'], accent: ['#40c0a0', '#ffe060'] };
  var K = {
    dusk1: '#3a2a6a', dusk2: '#c8507a', dusk3: '#f4a050', hill: '#4a6a3a', hill2: '#6a8a40', felt: '#c83a3a', felt2: '#8a2030',
    tent: '#f0e0c0', tentLine: '#6a4a2a', pot: '#383040', potHi: '#686078', soup: '#e0a040', fire: '#ffb030', teal: '#40c0a0',
    gold: '#ffe060', white: '#ffffff', ink: '#201830', bad: '#ff4060', card: '#f8ecd0'
  };

  var GAME_TITLE = 'STEPPE POT';
  var TIME_LIMIT = 22;
  var DISHES = 3;
  var MAX_WRONG = 3;
  var POT_X = W / 2, POT_Y = 930, POT_R = 190;
  var SLOTS = [
    { x: 170, y: 1300 }, { x: 400, y: 1250 }, { x: 680, y: 1250 }, { x: 910, y: 1300 },
    { x: 290, y: 1530 }, { x: 790, y: 1530 }
  ];

  // 具材(色の違う6種)
  var FOODS = [
    { key: 'carrot', px: ['...gg.', '..oog.', '.ooo..', 'ooo...', 'oo....', 'o.....'], pal: { g: '#40a040', o: '#ff8020' } },
    { key: 'onion', px: ['..g...', '.www..', 'wwwww.', 'wwwww.', '.www..', '..w...'], pal: { g: '#40a040', w: '#f0e8ff' } },
    { key: 'meat', px: ['.rrrr.', 'rrrrrr', 'rrwwrr', 'rrrrrr', '.rrrr.', '..ww..'], pal: { r: '#c02040', w: '#ffffff' } },
    { key: 'potato', px: ['.bbbb.', 'bbkbbb', 'bbbbbb', 'bbbbkb', '.bbbb.', '......'], pal: { b: '#c09050', k: '#6a4a2a' } },
    { key: 'mush', px: ['.pppp.', 'pwpppp', 'pppwpp', '..ss..', '..ss..', '.ssss.'], pal: { p: '#a050c0', w: '#ffffff', s: '#f0e0c0' } },
    { key: 'pepper', px: ['..g...', '.yyy..', 'yyyyy.', 'yyyyy.', '.yyy..', '..y...'], pal: { g: '#40a040', y: '#ffe030' } }
  ];
  var ELDER = [
    ['..hhhh..', '.hhhhhh.', '.hffffh.', '.fkffkf.', '.ffwwff.', '..wwww..', '.cccccc.', 'cccccccc'],
    ['..hhhh..', '.hhhhhh.', '.hffffh.', '.fkffkf.', '.ffffff.', '..wwww..', '.cccccc.', 'cccccccc']
  ];
  var STEAM = ['.w.', 'w.w', '.w.'];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var dragTick = 0;
  var step, cue, left, dish, recipe, cursor, items, held, wrong, placed, stall, closeT, success, mark, fastDish, dishClock, midShown;

  function say(s, x, y, sz, col, al) {
    game.draw.text(s, x + 3, y + 4, { size: sz, color: K.ink, bold: true, align: al || 'center' });
    game.draw.text(s, x, y, { size: sz, color: col, bold: true, align: al || 'center' });
  }

  // 絵札(レシピ)と敷物の上の具材を並べ直す
  function newDish() {
    var len = 3 + Math.min(2, dish);
    var pool = [0, 1, 2, 3, 4, 5];
    for (var i = pool.length - 1; i > 0; i--) { var j = Math.floor(game.random(0, i + 0.999)); var tmp = pool[i]; pool[i] = pool[j]; pool[j] = tmp; }
    recipe = pool.slice(0, len);
    cursor = 0;
    var extra = pool.slice(len);
    var onMat = recipe.concat(extra).slice(0, SLOTS.length);
    for (var k = onMat.length - 1; k > 0; k--) { var m = Math.floor(game.random(0, k + 0.999)); var t2 = onMat[k]; onMat[k] = onMat[m]; onMat[m] = t2; }
    items = [];
    for (var s = 0; s < onMat.length; s++) items.push({ food: onMat[s], hx: SLOTS[s].x, hy: SLOTS[s].y, x: SLOTS[s].x, y: SLOTS[s].y, gone: false, back: 0 });
    dishClock = 0;
  }

  function setup() {
    step = 'ready'; cue = 0.8; left = TIME_LIMIT; dish = 0; wrong = 0; placed = 0; held = null;
    stall = 0; closeT = 0; success = false; mark = null; fastDish = 99; midShown = false;
    newDish();
  }

  function itemAt(x, y) {
    for (var i = items.length - 1; i >= 0; i--) if (!items[i].gone && Math.hypot(x - items[i].x, y - items[i].y) < 110) return items[i];
    return null;
  }

  // 鍋に落とす(実プレイ・デモ共用)
  function drop(it, ghost) {
    if (Math.hypot(it.x - POT_X, it.y - POT_Y) > POT_R + 40) {
      it.back = 0.25;
      game.audio.tone('C4', 0.05, { wave: 'triangle', volume: 0.04 });
      return 'none';
    }
    if (it.food === recipe[cursor]) {
      it.gone = true; cursor++;
      game.fx.burst(POT_X, POT_Y - 60, { color: K.soup, count: ghost ? 8 : 14, speed: 260 });
      game.audio.tone(['C5', 'E5', 'G5', 'A5', 'C6'][Math.min(4, cursor - 1)], 0.08, { wave: 'square', volume: 0.05 });
      if (!ghost) {
        placed++;
        game.feedback.good(POT_X, POT_Y - 220, { text: 'GOOD', color: K.gold, count: 10 });
      }
      if (cursor >= recipe.length) {
        if (ghost) { dish++; newDish(); return 'dish'; }
        dish++;
        if (dishClock < fastDish) fastDish = dishClock;
        mark = { x: POT_X, y: POT_Y, t: 0.3 };
        game.audio.play('se_milestone', 0.5);
        game.fx.popup(dish + ' / ' + DISHES, W / 2, 380, { color: K.gold, size: 72 });
        if (dishClock < 4.5) game.fx.popup('PERFECT', POT_X, POT_Y - 300, { color: K.teal, size: 50 });
        if (!midShown && dish >= 2) { midShown = true; game.audio.play('se_powerup', 0.35); }
        if (dish >= DISHES) { finish(true); return 'dish'; }
        stall = 0.35;
        newDish();
        return 'dish';
      }
      return 'ok';
    }
    it.back = 0.3;
    if (ghost) { game.fx.burst(POT_X, POT_Y - 40, { color: K.bad, count: 6, speed: 160 }); return 'bad'; }
    wrong++;
    mark = { x: it.x, y: it.y, t: 0.45 };
    game.feedback.bad(POT_X, POT_Y - 220, { text: 'MISS', color: K.bad });
    if (wrong >= MAX_WRONG) finish(false); else stall = 0.3;
    return 'bad';
  }

  function finish(win) {
    if (step === 'stop' || step === 'outro') return;
    success = win; step = 'stop'; closeT = 0.55; held = null;
    game.audio.stopBgm();
    if (win) { game.fx.flash(K.gold, 0.25); game.audio.play('se_success', 0.6); }
    else {
      if (left <= 0) game.feedback.bad(W / 2, H * 0.42, { text: 'TIME UP', color: K.bad });
      game.audio.play('se_failure', 0.6);
    }
  }

  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.6); state = S.PLAYING; setup(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; setup(); demo.t = 0; return; }
    game.audio.tone('E4', 0.03, { wave: 'triangle', volume: 0.02 });
  });
  game.onPress(function(x, y) {
    if (state !== S.PLAYING || step !== 'play' || stall > 0) return;
    var it = itemAt(x, y);
    game.audio.play('se_tap', it ? 0.3 : 0.1);
    if (it) { held = it; it.back = 0; game.fx.burst(it.x, it.y, { color: K.white, count: 4, speed: 90 }); }
  });
  game.onMove(function(x, y) {
    if (held && state === S.PLAYING) {
      held.x = x; held.y = y - 40;
      dragTick++;
      if (dragTick % 8 === 0) game.fx.burst(x, y, { color: K.card, count: 1, speed: 60 });
    }
  });
  game.onRelease(function() {
    if (!held || state !== S.PLAYING) { held = null; game.audio.tone('D4', 0.03, { wave: 'triangle', volume: 0.02 }); return; }
    var it = held; held = null;
    if (step === 'play') drop(it, false);
  });

  // ── demo: 絵札の順に運ぶ。1皿目の2つ目で一度だけ違う具材を運んではね返される ──
  var demo = { t: 0, gx: W / 2, gy: 1400, press: false, seg: 0, it: null, sx: 0, sy: 0, slip: false };
  function stepDemo(dt) {
    demo.t += dt;
    if (demo.t <= dt || dish >= DISHES) { dish = 0; newDish(); demo.seg = 0; demo.it = null; demo.slip = false; }
    for (var i = 0; i < items.length; i++) settle(items[i], dt);
    demo.seg += dt;
    if (!demo.it) {
      var want = recipe[cursor];
      if (cursor === 1 && !demo.slip) { for (var a = 0; a < items.length; a++) if (!items[a].gone && recipe.indexOf(items[a].food) < 0) { want = items[a].food; break; } }
      for (var b = 0; b < items.length; b++) if (!items[b].gone && items[b].food === want) demo.it = items[b];
      if (!demo.it) return;
      demo.sx = demo.gx; demo.sy = demo.gy; demo.seg = 0;
    }
    var it = demo.it;
    if (demo.seg < 0.35) {
      var k = demo.seg / 0.35;
      demo.gx = demo.sx + (it.hx - demo.sx) * k; demo.gy = demo.sy + (it.hy - demo.sy) * k; demo.press = false;
    } else if (demo.seg < 1.0) {
      var k2 = (demo.seg - 0.35) / 0.65;
      demo.press = true;
      demo.gx = it.hx + (POT_X - it.hx) * k2; demo.gy = it.hy + (POT_Y - it.hy) * k2;
      it.x = demo.gx; it.y = demo.gy - 40;
    } else {
      demo.press = false;
      var r = drop(it, true);
      if (r === 'bad') demo.slip = true;
      demo.it = null;
    }
  }

  function settle(it, dt) {
    if (it.gone || it === held) return;
    if (it.back > 0) it.back -= dt;
    it.x += (it.hx - it.x) * Math.min(1, dt * 10);
    it.y += (it.hy - it.y) * Math.min(1, dt * 10);
  }

  // ── drawing ──
  function drawSteppe() {
    var t = game.time.elapsed;
    game.draw.gradient(0, 1100, [[0, K.dusk1], [0.5, K.dusk2], [1, K.dusk3]]);
    game.draw.circle(W * 0.15, 520, 70, K.gold, 0.8);
    for (var h = 0; h < 4; h++) game.draw.rect(h * 300 - 40, 640 - (h % 2) * 40, 360, 500, K.hill, 0.9);
    // 天幕の並び(中景)
    for (var y = 0; y < 3; y++) {
      var tx = 160 + y * 380, ty = 690 + Math.sin(t * 0.8 + y) * 3;
      for (var r = 0; r < 60; r += 2) game.draw.rect(tx - r * 1.6, ty + r, r * 3.2, 2, K.tent);
      game.draw.rect(tx - 96, ty + 60, 192, 70, K.tent);
      game.draw.line(tx - 96, ty + 90, tx + 96, ty + 90, K.tentLine, 3);
    }
    game.draw.rect(0, 1100, W, H - 1100, K.hill2);
    // 敷物
    game.draw.rect(60, 1160, W - 120, 520, K.felt);
    for (var p = 0; p < 6; p++) game.draw.rect(60, 1180 + p * 86, W - 120, 8, K.felt2);
    game.draw.rect(0, 0, W, H, K.gold, 0.03 + 0.03 * Math.sin(t * 1.3));
  }

  function drawPot() {
    var t = game.time.elapsed;
    for (var f = 0; f < 5; f++) game.draw.circle(POT_X - 120 + f * 60, POT_Y + 190 + Math.sin(t * 10 + f) * 8, 30, K.fire, 0.8);
    game.draw.circle(POT_X, POT_Y, POT_R, K.pot);
    game.draw.circle(POT_X - 50, POT_Y - 50, POT_R * 0.5, K.potHi, 0.35);
    game.draw.rect(POT_X - POT_R - 10, POT_Y - 90, POT_R * 2 + 20, 30, K.potHi);
    var fill = recipe ? cursor / recipe.length : 0;
    game.draw.rect(POT_X - POT_R + 20, POT_Y - 62, (POT_R - 20) * 2, 24, fill > 0 ? K.soup : K.ink, 0.5 + fill * 0.5);
    for (var s = 0; s < 3; s++) {
      var sy = POT_Y - 140 - ((t * 60 + s * 50) % 150);
      game.draw.sprite(STEAM, { w: K.white }, POT_X - 60 + s * 60, sy, 12, { anchor: 'center', alpha: 0.5 });
    }
    if (held && Math.hypot(held.x - POT_X, held.y - POT_Y) < POT_R + 40) game.draw.circle(POT_X, POT_Y, POT_R + 30, K.gold, 0.25);
  }

  function drawCard() {
    var t = game.time.elapsed;
    game.draw.sprite(ELDER[Math.floor(t * 2) % 2], { h: '#8a6a4a', f: '#f0c090', k: K.ink, w: K.white, c: K.teal }, 120, 400 + Math.sin(t * 2) * 5, 16, { anchor: 'center' });
    var n = recipe.length, cw = 150, x0 = W / 2 + 60 - (n * cw) / 2;
    game.draw.rect(x0 - 20, 280, n * cw + 40, 210, K.card);
    game.draw.rect(x0 - 20, 280, n * cw + 40, 10, K.tentLine);
    for (var i = 0; i < n; i++) {
      var F = FOODS[recipe[i]];
      var cx = x0 + i * cw + cw / 2;
      var done = i < cursor;
      var next = i === cursor;
      if (next) game.draw.rect(cx - 64, 300, 128, 170, K.gold, 0.35 + 0.2 * Math.sin(t * 8));
      game.draw.sprite(F.px, F.pal, cx, 385 + (next ? Math.sin(t * 6) * 5 : 0), 16, { anchor: 'center', alpha: done ? 0.3 : 1 });
      game.draw.text(String(i + 1), cx, 470, { size: 30, color: K.tentLine, bold: true, align: 'center' });
      if (done) game.draw.circle(cx, 385, 20, K.teal);
    }
  }

  function drawFoods() {
    var t = game.time.elapsed;
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      if (it.gone) continue;
      var shake = it.back > 0 ? Math.sin(t * 60) * 12 : 0;
      game.draw.circle(it.hx, it.hy + 60, 60, K.felt2, 0.6);
      var F = FOODS[it.food];
      game.draw.sprite(F.px, F.pal, it.x + shake, it.y + Math.sin(t * 3 + i) * 4, it === held ? 22 : 18, { anchor: 'center' });
    }
  }

  function drawTop() {
    game.draw.rect(0, 0, W, 228, K.ink, 0.85);
    say(dish + ' / ' + DISHES, W / 2, 95, 70, K.gold);
    say(String(Math.ceil(left)), 60, 95, 52, K.white, 'left');
    for (var m = 0; m < MAX_WRONG; m++) game.draw.circle(W - 200 + m * 60, 80, 20, m < wrong ? K.bad : K.potHi);
    game.draw.rect(60, 170, W - 120, 18, K.potHi);
    game.draw.rect(60, 170, (W - 120) * Math.max(0, left / TIME_LIMIT), 18, left < 5 ? K.bad : K.teal);
  }

  function points() { return dish * 300 + placed * 40 + (MAX_WRONG - wrong) * 60 + Math.ceil(left) * 10; }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;
    if (state === S.ATTRACT) {
      if (step === undefined) setup();
      stepDemo(dt);
      drawSteppe(); drawPot(); drawCard(); drawFoods();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 13 });
      game.draw.rect(0, 0, W, 228, K.ink, 0.85);
      say(GAME_TITLE, W / 2, 95 + Math.sin(t * 2) * 6, 80, K.gold);
      say('HI-SCORE ' + game.best, W / 2, 180, 36, K.white);
      if (Math.floor(t * 1.8) % 2 === 0) say('► 100円 投入 ◄', W / 2, H * 0.97, 40, K.gold);
      else say('INSERT COIN', W / 2, H * 0.97, 34, K.white);
      return;
    }
    if (state === S.RESULT) {
      drawSteppe(); drawPot();
      say(success ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.42, 92, success ? K.gold : K.bad);
      say('SCORE ' + (success ? points() : 0), W / 2, H * 0.48, 44, K.white);
      if (Math.floor(t * 2) % 2 === 0) say('TAP TO CONTINUE', W / 2, H * 0.97, 38, K.white);
      return;
    }

    if (step === 'ready') {
      cue -= dt;
      if (cue <= 0) { step = 'play'; game.audio.play('se_tap', 0.5); }
    } else if (step === 'play') {
      if (stall > 0) stall -= dt;
      else {
        left -= dt; dishClock += dt;
        if (left <= 0) { left = 0; finish(false); }
      }
    } else if (step === 'stop') {
      closeT -= dt;
      if (closeT <= 0) { step = 'outro'; closeT = 1.4; }
    } else if (step === 'outro') {
      closeT -= dt;
      if (closeT <= 0) {
        state = S.RESULT;
        var stats = { dishes: dish, placed: placed, wrong: wrong, fastestDish: fastDish < 99 ? Math.round(fastDish * 10) / 10 : 0 };
        if (success) game.end.success(points(), stats); else game.end.failure(stats);
        return;
      }
    }
    for (var i = 0; i < items.length; i++) settle(items[i], dt);

    drawSteppe(); drawPot(); drawCard(); drawFoods(); drawTop();
    if (mark) {
      mark.t -= dt;
      if (Math.floor(t * 16) % 2 === 0) game.draw.circle(mark.x, mark.y, 150, K.white, 0.4);
      if (mark.t <= 0 && step !== 'stop') mark = null;
    }
    if (step === 'ready') say(cue > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 100, K.gold);
    if (step === 'outro') {
      game.draw.rect(0, H * 0.35, W, H * 0.17, K.ink, 0.88);
      say(success ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.4, 92, success ? K.gold : K.bad);
      if (success && points() > game.best) say('NEW RECORD', W / 2, H * 0.46, 46, K.gold);
      else if (success) say('BEST ' + game.best, W / 2, H * 0.46, 40, K.white);
      else say('あと' + Math.max(1, DISHES - dish) + '皿!', W / 2, H * 0.46, 48, K.white);
    }
  });

  game.onStart(function() {
    game.audio.melody([
      ['A4', 0.5], ['C5', 0.5], ['D5', 0.75], ['E5', 0.25], ['D5', 0.5], ['C5', 0.5], ['A4', 1],
      ['G4', 0.5], ['A4', 0.5], ['C5', 0.75], ['D5', 0.25], ['C5', 0.5], ['A4', 0.5], ['G4', 1]
    ], { tempo: 116, wave: 'sawtooth', volume: 0.035, loop: true, bass: [['A2', 2], ['G2', 2]] });
    state = S.ATTRACT;
    setup();
  });
})(game);
