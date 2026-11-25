// J-N6434-0042-windmill-egg-chute.js
// 風車小屋のたまごシュート — 3本のわらシュートのどこに卵が転がるかを巣箱の揺れで見て、かごを左・中・右へ払って受ける
// 操作: 左スワイプ=左のシュート、下(または上)スワイプ=中央、右スワイプ=右のシュートへかごを払う。赤いイガ玉は受けない
// 終わり: 制限時間内に卵10個を受ければCLEAR。卵を3個割る(イガ玉を受けても1回)/時間切れでGAME OVER
// @mechanic: swipe_direction
// @theme: windmill_egg_chute
// 世界観: 丘の上の風車小屋で籠番をするブリキのロボットが、屋根裏の巣箱から3本のわらシュートを転がり落ちる産みたて卵を籠を払って受け、朝市の荷車に積む10個をそろえる
// 残るもの: 正誤(CLEAR/GAME OVER) + 受けた卵の数(金の卵は2個分)
// スタイル: 8bit HOME
var STYLE = { bg: ['#6cb4ee', '#fcd8a8'], main: ['#f8f8f8', '#a45c1c', '#000000'], accent: ['#f8b800', '#d82800'] };

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    sky1: '#6cb4ee', sky2: '#fcd8a8', wall: '#a45c1c', wallD: '#6c3000', straw: '#f8b800', strawD: '#c47c0c',
    white: '#f8f8f8', ink: '#000000', red: '#d82800', gold: '#f8b800', green: '#00a800', tin: '#bcbcbc', tinD: '#7c7c7c',
  };

  var GAME_TITLE = 'EGG CHUTE';
  var TIME_LIMIT = 14;
  var NEEDED = 10;
  var LIVES = 3;
  var LANE_X = [W * 0.22, W * 0.5, W * 0.78];
  var NEST_Y = H * 0.19;
  var CATCH_Y = H * 0.73;
  var PAD_Y = H * 0.9;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  // ── sprites (8bit HOME: 8x8グリッド、3〜4色+黒) ──
  var HEN_A = [
    '...rr.....',
    '..wwww....',
    '.wwkwwy...',
    '.wwwwwyy..',
    'wwwwwww...',
    'wwwwwwwww.',
    '.wwwwwwww.',
    'ssssssssss',
  ];
  var HEN_B = [
    '...rr.....',
    '..wwww....',
    '.wwkwwy...',
    'wwwwwwyy..',
    'wwwwwwwww.',
    '.wwwwwwwww',
    '.wwwwwwww.',
    'ssssssssss',
  ];
  var HEN_PAL = { r: C.red, w: C.white, k: C.ink, y: C.straw, s: C.strawD };
  var EGG = [
    '..ww..',
    '.wwww.',
    'wwwwww',
    'wwwwww',
    'wwwwww',
    '.wwww.',
  ];
  var CRACK = [
    'w.ww.w',
    '.w..w.',
    'yyyyyy',
    'wyyyyw',
  ];
  var BURR = [
    'r..r..r.',
    '.rrrrrr.',
    'rrkrrkrr',
    '.rrrrrr.',
    'rrrrrrrr',
    '.rrkkrr.',
    'r.rrrr.r',
    '...r....',
  ];
  var BASKET = [
    's............s',
    'ssssssssssssss',
    'sSsSsSsSsSsSsS',
    '.SsSsSsSsSsSs.',
    '..ssssssssss..',
  ];
  var BOT_A = [
    't........t',
    't..tttt..t',
    'tttkttkttt',
    '...tttt...',
    '...tyyt...',
    '..tttttt..',
    '..tttttt..',
    '..tt..tt..',
    '.ddd..ddd.',
  ];
  var BOT_B = [
    't........t',
    't..tttt..t',
    'tttkttkttt',
    '...tttt...',
    '...tyyt...',
    '..tttttt..',
    '..tttttt..',
    '...tttt...',
    '..dd..dd..',
  ];
  var BOT_PAL = { t: C.tin, k: C.ink, y: C.gold, d: C.tinD };
  var ARROW_L = ['...w....', '..ww....', '.wwwwwww', 'wwwwwwww', '.wwwwwww', '..ww....', '...w....'];
  var ARROW_D = ['..www..', '..www..', '..www..', 'wwwwwww', '.wwwww.', '..www..', '...w...'];
  var MILL = ['....ww....', '.w..ww..w.', '..w.ww.w..', '...wwww...', 'wwwwbbwwww', '...wwww...', '..w.ww.w..', '.w..ww..w.', '....ww....'];

  // ── state ──
  var items, basketLane, basketX, caught, broken, lives, timeLeft, ready, clock;
  var spawnT, spawnN, lastArrival, hitStop, focus, pendingEnd, finished, ok, endWait, bounce, nests, nextMilestone;

  function initGame() {
    items = [];
    basketLane = 1; basketX = LANE_X[1];
    caught = 0; broken = 0; lives = LIVES;
    timeLeft = TIME_LIMIT; ready = 0.8; clock = 0;
    spawnT = 0.2; spawnN = 0; lastArrival = 0;
    hitStop = 0; focus = null; pendingEnd = null; finished = false; ok = false; endWait = 0; bounce = 0;
    nests = [{ tele: 0, kind: '' }, { tele: 0, kind: '' }, { tele: 0, kind: '' }];
    nextMilestone = 5;
  }

  function txt(str, x, y, sz, color) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: C.ink, bold: true, align: 'center', font: 'monospace' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: 'center', font: 'monospace' });
  }

  function progressRatio() { return Math.min(1, clock / TIME_LIMIT); }

  function spawnItem(demoMode) {
    spawnN++;
    var lane = Math.floor(game.random(0, 3));
    if (lane > 2) lane = 2;
    var kind = 'egg';
    if (spawnN % 5 === 0) kind = 'gold';
    else if (spawnN > 2 && game.random(0, 1) < 0.22) kind = 'burr';
    var p = demoMode ? 0.3 : progressRatio();
    var v = H * (0.42 + 0.2 * p);
    var tele = 0.6;
    var arrive = clock + tele + (CATCH_Y - NEST_Y) / v;
    if (arrive < lastArrival + 0.45) { tele += lastArrival + 0.45 - arrive; arrive = lastArrival + 0.45; }
    lastArrival = arrive;
    items.push({ lane: lane, kind: kind, y: NEST_Y, v: v, tele: tele, done: false, splat: 0, flash: 0 });
    nests[lane].tele = tele; nests[lane].kind = kind;
    game.audio.tone(kind === 'burr' ? 'C3' : kind === 'gold' ? 'E6' : 'A5', 0.08, { wave: 'square', volume: 0.05 });
  }

  function swipeTo(dir) {
    var lane = dir === 'left' ? 0 : dir === 'right' ? 2 : 1;
    if (lane !== basketLane) {
      basketLane = lane;
      game.audio.play('se_jump', 0.25);
    } else {
      game.audio.play('se_tap', 0.2);
    }
    bounce = 0.18;
  }

  function badEvent(it, demoMode) {
    it.flash = 0.5;
    if (demoMode) { game.feedback.bad(LANE_X[it.lane], CATCH_Y, { text: 'MISS', shake: 4 }); return; }
    lives--;
    if (lives <= 0) {
      hitStop = 0.5; focus = it; pendingEnd = 'fail'; finished = true;
      game.audio.play('se_break', 0.5);
    } else {
      game.feedback.bad(LANE_X[it.lane], CATCH_Y, { text: 'MISS' });
    }
  }

  function resolve(it, demoMode) {
    it.done = true;
    var inBasket = it.lane === basketLane;
    if (it.kind === 'burr') {
      if (inBasket) { broken++; badEvent(it, demoMode); }
      else { game.audio.play('se_tap', 0.15); it.splat = 0.6; }
      return;
    }
    if (inBasket) {
      var gain = it.kind === 'gold' ? 2 : 1;
      caught += gain;
      game.audio.play('se_coin', 0.35);
      game.feedback.good(basketX, CATCH_Y - 40, { text: gain === 2 ? 'x2' : 'GOOD', color: it.kind === 'gold' ? C.gold : C.green, count: 10 });
      it.y = H * 2;
      if (!demoMode && caught >= nextMilestone && caught < NEEDED) {
        nextMilestone += 5;
        game.audio.play('se_milestone', 0.4);
        game.fx.popup('NICE', W / 2, H * 0.45, { color: C.gold, size: 64 });
      }
      if (!demoMode && caught >= NEEDED) {
        hitStop = 0.4; focus = { basket: true }; pendingEnd = 'clear'; finished = true;
      }
    } else {
      broken++;
      it.splat = 0.8;
      badEvent(it, demoMode);
    }
  }

  function stepWorld(dt, demoMode) {
    clock += dt;
    bounce = Math.max(0, bounce - dt);
    basketX += (LANE_X[basketLane] - basketX) * Math.min(1, dt * 22);
    for (var n = 0; n < 3; n++) if (nests[n].tele > 0) nests[n].tele -= dt;
    spawnT -= dt;
    if (spawnT <= 0) {
      spawnItem(demoMode);
      var p = demoMode ? 0.3 : progressRatio();
      spawnT = 1.05 - 0.45 * p;
    }
    for (var i = items.length - 1; i >= 0; i--) {
      var it = items[i];
      if (it.flash > 0) it.flash -= dt;
      if (it.tele > 0) { it.tele -= dt; continue; }
      if (!it.done) {
        it.y += it.v * dt;
        if (it.y >= CATCH_Y) { it.y = CATCH_Y; resolve(it, demoMode); }
      } else if (it.splat > 0) {
        it.splat -= dt;
        if (it.splat <= 0) it.y = H * 2;
      }
      if (it.y > H * 1.5) items.splice(i, 1);
    }
  }

  // ── drawing ──
  function drawBg(pulse) {
    game.draw.gradient(0, H, [[0, C.sky1], [0.6, C.sky2], [1, C.sky2]]);
    game.draw.rect(0, 0, W, H, C.white, pulse);
    // 風車(遠景): 羽根がゆっくり揺れる
    var sw = Math.sin(game.time.elapsed * 0.9) * 10;
    game.draw.sprite(MILL, { w: C.white, b: C.wallD }, W * 0.5 + sw, H * 0.07, 14, { anchor: 'center', alpha: 0.35 });
    // 小屋の壁(タイル反復)
    for (var ty = H * 0.14; ty < CATCH_Y + 40; ty += 64) {
      for (var tx = 0; tx < W; tx += 128) {
        var off = (Math.floor(ty / 64) % 2) * 64;
        game.draw.rect(tx + off, ty, 120, 56, C.wall, 0.35);
      }
    }
    // シュート(わら)
    for (var l = 0; l < 3; l++) {
      var x = LANE_X[l];
      game.draw.rect(x - 70, NEST_Y + 40, 140, CATCH_Y - NEST_Y - 20, C.strawD, 0.9);
      game.draw.rect(x - 58, NEST_Y + 40, 116, CATCH_Y - NEST_Y - 20, C.straw, 0.9);
      for (var sy = NEST_Y + 60; sy < CATCH_Y; sy += 48) game.draw.rect(x - 58, sy, 116, 8, C.strawD, 0.6);
    }
    // 床
    game.draw.rect(0, CATCH_Y + 60, W, H - CATCH_Y - 60, C.wallD);
    for (var fx = 0; fx < W; fx += 64) game.draw.rect(fx, CATCH_Y + 60, 56, 8, C.wall);
  }

  function drawNests() {
    for (var l = 0; l < 3; l++) {
      var nt = nests[l];
      var tele = nt.tele > 0;
      var wob = tele ? Math.sin(game.time.elapsed * 40) * 10 : Math.sin(game.time.elapsed * 2 + l) * 4;
      var bob = Math.cos(game.time.elapsed * 2.4 + l * 1.3) * 5;
      var frame = (tele || Math.floor(game.time.elapsed * 2 + l) % 2 === 0) ? HEN_B : HEN_A;
      if (tele) {
        var col = nt.kind === 'burr' ? C.red : nt.kind === 'gold' ? C.gold : C.white;
        var blink = Math.floor(game.time.elapsed * 14) % 2 === 0 ? 0.8 : 0.3;
        game.draw.circle(LANE_X[l], NEST_Y, 110, col, blink * 0.5);
        game.draw.rect(LANE_X[l] - 8, NEST_Y - 170, 16, 50, col, blink);
        game.draw.rect(LANE_X[l] - 8, NEST_Y - 108, 16, 16, col, blink);
      }
      game.draw.sprite(frame, HEN_PAL, LANE_X[l] + wob, NEST_Y + bob, 14, { anchor: 'center' });
    }
  }

  function drawItems() {
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      if (it.tele > 0 || it.y > H * 1.2) continue;
      var x = LANE_X[it.lane];
      var hl = focus === it;
      var sc = hl ? 20 : 12;
      if (it.done && it.splat > 0 && it.kind !== 'burr') {
        game.draw.sprite(CRACK, { w: C.white, y: C.gold }, x, CATCH_Y + 50, hl ? 22 : 14, { anchor: 'center' });
      } else if (it.kind === 'burr') {
        game.draw.sprite(BURR, { r: C.red, k: C.ink }, x, it.y, sc, { anchor: 'center' });
      } else {
        var roll = Math.sin(it.y * 0.05) * 6;
        game.draw.sprite(EGG, { w: it.kind === 'gold' ? C.gold : C.white }, x + roll, it.y, sc, { anchor: 'center' });
      }
      if (hl || it.flash > 0) game.draw.circle(x, it.done ? CATCH_Y + 30 : it.y, 90, C.white, 0.45 + 0.3 * Math.sin(game.time.elapsed * 30));
    }
  }

  function drawBasket(pose) {
    var hop = bounce > 0 ? -Math.sin(bounce / 0.18 * Math.PI) * 30 : 0;
    var idle = Math.sin(game.time.elapsed * 3) * 4;
    var bx = basketX + Math.cos(game.time.elapsed * 1.7) * 3;
    var frame = Math.floor(game.time.elapsed * 5) % 2 === 0 ? BOT_A : BOT_B;
    var botY = CATCH_Y + 170 + idle;
    if (pose === 'down') {
      game.draw.sprite(BOT_A, BOT_PAL, bx, botY + 40, 14, { anchor: 'center', flipY: true });
    } else {
      game.draw.sprite(frame, BOT_PAL, bx, botY + (pose === 'cheer' ? -Math.abs(Math.sin(game.time.elapsed * 8)) * 60 : 0), 14, { anchor: 'center' });
    }
    var hl = focus && focus.basket;
    if (hl) game.draw.circle(bx, CATCH_Y + 40, 150, C.white, 0.5);
    game.draw.sprite(BASKET, { s: C.strawD, S: C.straw }, bx, CATCH_Y + 50 + hop, hl ? 18 : 14, { anchor: 'center' });
  }

  function drawPads() {
    for (var l = 0; l < 3; l++) {
      var on = basketLane === l;
      game.draw.rect(LANE_X[l] - 110, PAD_Y - 80, 220, 160, on ? C.gold : C.wall, on ? 0.95 : 0.6);
      game.draw.rect(LANE_X[l] - 100, PAD_Y - 70, 200, 140, on ? C.straw : C.wallD, 0.9);
      var art = l === 1 ? ARROW_D : ARROW_L;
      game.draw.sprite(art, { w: on ? C.ink : C.white }, LANE_X[l], PAD_Y, 12, { anchor: 'center', flipX: l === 2 });
    }
  }

  function drawHud() {
    game.draw.rect(0, 0, W, H * 0.11, C.ink, 0.55);
    game.draw.sprite(EGG, { w: C.white }, W * 0.1, H * 0.05, 9, { anchor: 'center' });
    txt(caught + '/' + NEEDED, W * 0.28, H * 0.05, 56, C.white);
    for (var i = 0; i < LIVES; i++) {
      var alive = i < lives;
      game.draw.sprite(alive ? EGG : CRACK, { w: alive ? C.gold : C.tinD, y: C.red }, W * 0.68 + i * 90, H * 0.05, 9, { anchor: 'center' });
    }
    var frac = Math.max(0, timeLeft / TIME_LIMIT);
    var low = timeLeft < 4 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(60, H * 0.095, W - 120, 20, C.wallD);
    game.draw.rect(60, H * 0.095, (W - 120) * frac, 20, low ? C.red : C.green);
  }

  // ── demo (ATTRACTゴースト: 実ロジックでAIが払う) ──
  var demo = { t: 0, gx: LANE_X[1], gy: PAD_Y, press: false, anim: 0, dir: '', cool: 0, decisions: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 6;
    if (cyc < dt || demo.t <= dt) { initGame(); ready = 0; demo.decisions = 0; demo.cool = 0; }
    stepWorld(dt, true);
    demo.cool -= dt;
    // 一番早く届く卵を探す(イガ玉は避ける)
    var best = null, bestT = 1e9, burrLane = -1;
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      if (it.done) continue;
      var tArr = it.tele + (CATCH_Y - it.y) / it.v;
      if (it.kind === 'burr') { if (tArr < 0.6) burrLane = it.lane; continue; }
      if (tArr < bestT) { bestT = tArr; best = it; }
    }
    var want = basketLane;
    if (best && bestT < 0.75) want = best.lane;
    else if (burrLane === basketLane) want = (basketLane + 1) % 3;
    // 3回目の判断だけわざと外して失敗例を見せる
    if (demo.cool <= 0 && want !== basketLane) {
      demo.decisions++;
      var slip = demo.decisions === 3;
      if (slip) want = (want + 1) % 3;
      var dir = want === 0 ? 'left' : want === 2 ? 'right' : 'down';
      if (want !== basketLane) {
        demo.dir = dir; demo.anim = 0.3; demo.cool = slip ? 1.1 : 0.4;
        swipeTo(dir);
      }
    }
    if (demo.anim > 0) demo.anim -= dt;
    var k = demo.anim > 0 ? 1 - demo.anim / 0.3 : 0;
    var dx = demo.dir === 'left' ? -1 : demo.dir === 'right' ? 1 : 0;
    var dy = demo.dir === 'down' ? 1 : 0;
    demo.gx = basketX + dx * (k * 200 - 100) * (demo.anim > 0 ? 1 : 0);
    demo.gy = PAD_Y - 40 + dy * (k * 160 - 60) * (demo.anim > 0 ? 1 : 0);
    demo.press = demo.anim > 0;
  }

  // ── input ──
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.4); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING && !finished) {
      // タップは払いではない: かごが小さく跳ねるだけ(入力は受け取った合図)
      bounce = 0.18;
      game.audio.play('se_tap', 0.15);
    }
  });

  game.onSwipe(function(dir) {
    if (state !== S.PLAYING || finished) return;
    if (ready > 0.3) { game.audio.play('se_tap', 0.1); return; }
    swipeTo(dir);
    game.fx.burst(LANE_X[basketLane], CATCH_Y + 60, { color: C.straw, count: 5, speed: 220 });
  });

  function finishNow() {
    if (pendingEnd === 'clear') {
      ok = true;
      game.feedback.good(basketX, CATCH_Y, { text: 'CLEAR', color: C.gold, count: 30 });
      game.audio.play('se_success', 0.6);
    } else {
      ok = false;
      game.feedback.bad(focus && focus.lane !== undefined ? LANE_X[focus.lane] : W / 2, CATCH_Y, { text: pendingEnd === 'time' ? 'TIME UP' : 'MISS' });
      game.audio.play('se_failure', 0.6);
    }
    endWait = 1.2;
    pendingEnd = null;
  }

  game.onUpdate(function(dt) {
    var pulse = 0.04 + 0.04 * Math.sin(game.time.elapsed * 1.6);

    if (state === S.ATTRACT) {
      if (items === undefined) initGame();
      stepDemo(dt);
      drawBg(pulse);
      drawNests();
      drawItems();
      drawBasket('');
      drawPads();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 14 });
      game.draw.rect(0, 0, W, H * 0.13, C.ink, 0.5);
      txt(GAME_TITLE, W / 2, H * 0.045, 80, C.gold);
      txt('BEST ' + (game.best || 0), W / 2, H * 0.1, 38, C.white);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.965, 44, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.965, 40, C.white);
      return;
    }

    if (state === S.RESULT) {
      drawBg(pulse);
      drawNests();
      drawBasket(ok ? 'cheer' : 'down');
      if (ok && Math.floor(game.time.elapsed * 4) % 2 === 0) game.fx.burst(game.random(W * 0.2, W * 0.8), H * 0.4, { color: C.gold, count: 3 });
      game.draw.rect(0, H * 0.28, W, H * 0.3, C.ink, 0.6);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.33, 100, ok ? C.gold : C.red);
      txt(caught + '/' + NEEDED, W / 2, H * 0.42, 70, C.white);
      if (ok && caught > (game.best || 0)) txt('NEW RECORD', W / 2, H * 0.5, 50, C.gold);
      else txt('BEST ' + (game.best || 0), W / 2, H * 0.5, 44, C.white);
      if (!ok && caught < NEEDED) txt('あと' + (NEEDED - caught) + '個!', W / 2, H * 0.55, 46, C.straw);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.965, 40, C.white);
      return;
    }

    // PLAYING
    if (endWait > 0) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(caught, { caught: caught, broken: broken });
        else game.end.failure({ caught: caught, broken: broken });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
      if (hitStop <= 0) finishNow();
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap', 0.3);
    } else if (!finished) {
      timeLeft -= dt;
      stepWorld(dt, false);
      if (!finished && timeLeft <= 0) {
        timeLeft = 0; finished = true; pendingEnd = 'time'; hitStop = 0.45; focus = null;
        game.fx.popup('TIME UP', W / 2, H * 0.45, { color: C.red, size: 80 });
      }
    }

    drawBg(pulse);
    drawNests();
    drawItems();
    drawBasket('');
    drawPads();
    drawHud();
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.45, 110, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([
      ['C5', 0.5], ['E5', 0.5], ['G5', 0.5], ['E5', 0.5], ['F5', 0.5], ['A5', 0.5], ['G5', 1],
      ['E5', 0.5], ['C5', 0.5], ['D5', 0.5], ['G4', 0.5], ['C5', 1.5], [0, 0.5],
    ], {
      tempo: 150, wave: 'square', volume: 0.05, loop: true,
      bass: [['C3', 2], ['F3', 2], ['G3', 2], ['C3', 2]], bassVolume: 0.06,
    });
    state = S.ATTRACT;
    initGame();
  });
})(game);
