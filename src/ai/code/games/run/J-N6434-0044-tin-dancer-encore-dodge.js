// J-N6434-0044-tin-dancer-encore-dodge.js
// ブリキの踊り子アンコール — 桟敷から投げ込まれる花束・帽子・クッションの落下点を床の影で読み、舞台を左右に滑って避け続ける
// 操作: 画面を押したまま左右に動かすと、踊り子が指の真上へ滑っていく。離すとその場で踊り続ける
// 終わり: 18秒間ひとつも当たらずに踊り切ればCLEAR。1つでも当たるとGAME OVER
// @mechanic: dodge
// @theme: tin_dancer_encore
// 世界観: 港町の芝居小屋で大トリを務めるぜんまい仕掛けのブリキの踊り子が、熱狂した桟敷席から雨のように降る贈り物をすり抜けて、壊れずに幕が下りるまで踊り切る
// 残るもの: 正誤(CLEAR/GAME OVER) + 踊り切った秒数とかすめた回数のスコア
// スタイル: 2000s ARCADE POP
var STYLE = { bg: ['#ffe45c', '#ff7eb6'], main: ['#e8203a', '#2a7fff', '#ffffff'], accent: ['#18d67c', '#ffb000'] };

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    sky1: '#ffe45c', sky2: '#ff7eb6', curtain: '#e8203a', curtainD: '#a8102a', floor: '#ffb000', floorD: '#c47a00',
    blue: '#2a7fff', white: '#ffffff', ink: '#2b1238', green: '#18d67c', red: '#ff2a4a', pink: '#ff7eb6', gold: '#ffe45c',
  };

  var GAME_TITLE = 'ENCORE DODGE';
  var TIME_LIMIT = 18;
  var STAGE_Y = H * 0.7;
  var BALC_Y = H * 0.2;
  var DANCER_R = 58;
  var MIN_X = W * 0.19, MAX_X = W * 0.81;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var DANCER = [
    [
      '....yy....',
      '...pppp...',
      '...pkkp...',
      '....pp....',
      '..wwwwww..',
      'w.wwwwww.w',
      '.wwwwwwww.',
      'pppppppppp',
      '....ww....',
      '....ww....',
      '...wwww...',
    ],
    [
      '....yy....',
      '...pppp...',
      '...pkkp...',
      '....pp....',
      'w.wwwwww.w',
      '.wwwwwwww.',
      '..wwwwww..',
      'pppppppppp',
      '....ww....',
      '...w..w...',
      '..ww..ww..',
    ],
  ];
  var DANCER_PAL = { y: '#ffe45c', p: '#ff7eb6', k: '#2b1238', w: '#ffffff' };
  var KEY = ['gg.gg', 'ggggg', '..g..', '..g..'];
  var BOUQUET = ['.r.r.', 'rrrrr', '.rgr.', '..g..', '..g..'];
  var HAT = ['..bbb..', '..bbb..', '..wbw..', 'bbbbbbb'];
  var CUSHION = ['.oooooo.', 'oooooooo', 'oowoowoo', 'oooooooo', '.oooooo.'];
  var FAN = ['.hh.', 'hhhh', 'hkkh', 'hhhh'];
  var ITEM_ART = { bouquet: BOUQUET, hat: HAT, cushion: CUSHION };
  var ITEM_PAL = { r: '#ff2a4a', g: '#18d67c', b: '#2a7fff', w: '#ffffff', o: '#ffb000' };

  var dancerX, targetX, items, timeLeft, ready, hitStop, focus, pendingEnd, finished, ok, endWait;
  var spawnT, grazes, survived, nextMs, score, spin, fanPops;
  var forceAim = false;

  function initGame() {
    dancerX = W / 2; targetX = W / 2; items = [];
    timeLeft = TIME_LIMIT; ready = 0.8; hitStop = 0; focus = null; pendingEnd = null;
    finished = false; ok = false; endWait = 0; spawnT = 0.4; grazes = 0; survived = 0; nextMs = 6; score = 0; spin = 0;
    fanPops = [0, 0, 0, 0, 0, 0];
  }

  function txt(str, x, y, sz, color) {
    game.draw.text(str, x, y + 5, { size: sz, color: C.ink, bold: true, align: 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: 'center' });
  }

  function spawnItem(prog) {
    var kinds = ['bouquet', 'hat', 'cushion'];
    var kind = kinds[Math.floor(game.random(0, 2.99))];
    // 踊り子の近くを狙う投げ込みを多めに(物量で押す)
    var aim = forceAim ? dancerX : (game.random(0, 1) < 0.55 ? dancerX + game.random(-160, 160) : game.random(MIN_X, MAX_X));
    if (forceAim) kind = 'bouquet';
    var landX = Math.max(MIN_X, Math.min(MAX_X, aim));
    var fallT = 0.95 - 0.3 * prog;
    var vx = kind === 'hat' ? game.random(-220, 220) : 0;
    var startX = landX - vx * fallT;
    var fan = Math.max(0, Math.min(5, Math.floor(startX / (W / 6))));
    fanPops[fan] = 0.7;
    items.push({
      kind: kind, x: startX, y: BALC_Y, vx: vx, fallT: fallT, t: 0, landX: landX,
      tele: 0.65, r: kind === 'cushion' ? 62 : 46, landed: 0, grazed: false,
    });
    game.audio.tone(kind === 'cushion' ? 'D4' : 'A5', 0.06, { wave: 'square', volume: 0.05, slide: 200 });
  }

  function stepWorld(dt, prog, demoMode) {
    spin += dt * 10;
    dancerX += (targetX - dancerX) * Math.min(1, dt * 12);
    spawnT -= dt;
    if (spawnT <= 0) {
      spawnItem(prog);
      if (prog > 0.45 && game.random(0, 1) < 0.5) spawnItem(prog);
      spawnT = 0.85 - 0.4 * prog;
    }
    for (var f = 0; f < fanPops.length; f++) fanPops[f] = Math.max(0, fanPops[f] - dt);
    var dy = STAGE_Y - 70;
    for (var i = items.length - 1; i >= 0; i--) {
      var it = items[i];
      if (it.tele > 0) { it.tele -= dt; continue; }
      if (it.landed > 0) { it.landed -= dt; if (it.landed <= 0) items.splice(i, 1); continue; }
      it.t += dt;
      var k = Math.min(1, it.t / it.fallT);
      it.x += it.vx * dt;
      it.y = BALC_Y + (STAGE_Y - BALC_Y) * k * k;
      var dist = Math.hypot(it.x - dancerX, it.y - dy);
      if (dist < it.r + DANCER_R) {
        if (demoMode) { game.feedback.bad(dancerX, dy, { text: 'MISS', shake: 4 }); items.splice(i, 1); continue; }
        focus = it; hitStop = 0.5; pendingEnd = 'fail'; finished = true;
        game.audio.play('se_break', 0.5);
        return;
      }
      if (!it.grazed && it.y > dy - 40 && dist < it.r + DANCER_R + 70) {
        it.grazed = true; grazes++; score += 50;
        game.feedback.good(it.x, it.y - 40, { text: 'NICE', color: C.green, count: 6, sound: 'se_coin', volume: 0.25 });
      }
      if (k >= 1) { it.landed = 0.35; game.audio.play('se_tap', 0.08); }
    }
  }

  function drawBg(pulse) {
    game.draw.gradient(0, H, [[0, C.sky1], [0.5, C.sky2], [1, C.ink]]);
    game.draw.rect(0, 0, W, H, C.white, pulse);
    // 光の柱
    for (var p = 0; p < 3; p++) {
      var lx = W * (0.2 + p * 0.3) + Math.sin(game.time.elapsed * 0.8 + p * 2) * 90;
      game.draw.rect(lx - 70, H * 0.12, 140, STAGE_Y - H * 0.12, C.white, 0.14 + 0.06 * Math.sin(game.time.elapsed * 3 + p));
    }
    // 幕
    for (var c = 0; c < 6; c++) {
      var sway = Math.sin(game.time.elapsed * 1.3 + c) * 6;
      game.draw.rect(c * 30 + sway, 0, 26, STAGE_Y, c % 2 ? C.curtain : C.curtainD);
      game.draw.rect(W - (c + 1) * 30 - sway, 0, 26, STAGE_Y, c % 2 ? C.curtain : C.curtainD);
    }
    // 桟敷席
    game.draw.rect(0, BALC_Y - 60, W, 90, C.curtainD);
    game.draw.rect(0, BALC_Y + 20, W, 14, C.gold);
    for (var s = 0; s < 6; s++) {
      var fx = W / 12 + s * W / 6;
      var up = fanPops[s] > 0 ? -30 : 0;
      var bob = Math.sin(game.time.elapsed * 4 + s * 1.7) * 6;
      game.draw.sprite(FAN, { h: s % 2 ? C.blue : C.green, k: C.ink }, fx, BALC_Y - 60 + bob + up, 14, { anchor: 'center' });
      if (fanPops[s] > 0 && Math.floor(game.time.elapsed * 14) % 2 === 0) game.draw.circle(fx, BALC_Y - 140, 18, C.red);
    }
    // 舞台
    game.draw.rect(0, STAGE_Y, W, 50, C.floor);
    game.draw.rect(0, STAGE_Y + 50, W, 30, C.floorD);
    for (var b = 0; b < W; b += 90) game.draw.rect(b, STAGE_Y, 4, 50, C.floorD);
    // 客席(親指ゾーン): 動かせるレール
    game.draw.rect(0, STAGE_Y + 80, W, H - STAGE_Y - 80, C.ink);
    for (var a = 0; a < 9; a++) {
      var ax = 60 + a * 120, ab = Math.sin(game.time.elapsed * 3 + a) * 5;
      game.draw.circle(ax, H * 0.93 + ab, 40, '#4a2a5c');
    }
  }

  function drawRail(active) {
    var y = H * 0.83;
    game.draw.rect(MIN_X - 30, y - 16, MAX_X - MIN_X + 60, 32, active ? C.white : '#6a4a7c', active ? 0.9 : 0.6);
    game.draw.rect(MIN_X - 20, y - 8, MAX_X - MIN_X + 40, 16, C.pink);
    game.draw.circle(dancerX, y, 44, C.gold);
    game.draw.circle(dancerX, y, 30, C.white);
  }

  function drawItems() {
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      // 落下点の影 (予告)
      var blink = Math.floor(game.time.elapsed * 12) % 2 === 0;
      var shadowA = it.tele > 0 ? (blink ? 0.7 : 0.35) : 0.45;
      game.draw.circle(it.landX, STAGE_Y + 16, it.r + 10, C.red, shadowA * 0.6);
      game.draw.circle(it.landX, STAGE_Y + 16, it.r - 10, C.ink, shadowA * 0.5);
      if (it.tele > 0) continue;
      var hl = focus === it;
      var art = ITEM_ART[it.kind];
      var wob = it.kind === 'hat' ? Math.sin(game.time.elapsed * 12) * 8 : 0;
      if (hl) game.draw.circle(it.x, it.y, 120, C.white, 0.7);
      game.draw.sprite(art, ITEM_PAL, it.x + wob, it.y, hl ? 26 : 16, { anchor: 'center' });
    }
  }

  function drawDancer(pose) {
    var fr = DANCER[Math.floor(spin) % 2];
    var bob = Math.sin(game.time.elapsed * 6) * 6;
    var sway = Math.cos(game.time.elapsed * 2.2) * 4;
    var flip = Math.floor(spin / 2) % 2 === 1;
    if (pose === 'down') {
      game.draw.sprite(DANCER[0], DANCER_PAL, dancerX, STAGE_Y - 20, 12, { anchor: 'center', flipY: true });
      return;
    }
    var jump = pose === 'cheer' ? -Math.abs(Math.sin(game.time.elapsed * 6)) * 80 : 0;
    if (hitStop > 0 && focus) game.draw.circle(dancerX, STAGE_Y - 70, 100, C.white, 0.6);
    game.draw.sprite(fr, DANCER_PAL, dancerX + sway, STAGE_Y - 72 + bob + jump, 13, { anchor: 'center', flipX: flip });
    game.draw.sprite(KEY, { g: C.gold }, dancerX + sway + (flip ? -70 : 70), STAGE_Y - 80 + bob + jump + Math.sin(spin) * 6, 8, { anchor: 'center' });
  }

  function drawHud() {
    game.draw.rect(0, 0, W, H * 0.1, C.ink, 0.7);
    txt('SCORE ' + score, W * 0.28, H * 0.04, 46, C.white);
    txt(Math.ceil(timeLeft) + '', W * 0.8, H * 0.04, 60, timeLeft < 4 ? C.red : C.gold);
    var frac = Math.max(0, timeLeft / TIME_LIMIT);
    game.draw.rect(50, H * 0.08, W - 100, 18, '#4a2a5c');
    game.draw.rect(50, H * 0.08, (W - 100) * (1 - frac), 18, C.green);
    game.draw.circle(W - 50, H * 0.089, 22, C.gold);
  }

  // ── ATTRACTデモ: 影から一番遠い場所へ滑る。1回だけわざと留まって当たって見せる ──
  var demo = { t: 0, gx: W / 2, gy: H * 0.83, press: true, stay: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 6;
    if (cyc < dt || demo.t <= dt) { initGame(); ready = 0; }
    demo.stay = cyc > 4.0 && cyc < 5.2;
    if (!demo.stay) demo.aimed = false;
    forceAim = demo.stay;
    if (!demo.stay) {
      var bestX = dancerX, bestD = -1;
      for (var cx = MIN_X; cx <= MAX_X; cx += 40) {
        var dmin = 1e9;
        for (var i = 0; i < items.length; i++) {
          var itm = items[i];
          if (itm.landed > 0) continue;
          var tLand = itm.tele + (itm.fallT - itm.t);
          dmin = Math.min(dmin, Math.abs(itm.landX - cx));
          // 落ちる直前の列を横切る移動は避ける
          var lo = Math.min(cx, dancerX) - itm.r, hi = Math.max(cx, dancerX) + itm.r;
          if (tLand < 0.45 && itm.landX > lo && itm.landX < hi) dmin -= 600;
        }
        dmin -= Math.abs(cx - dancerX) * 0.25;
        if (dmin > bestD) { bestD = dmin; bestX = cx; }
      }
      if (items.length) targetX = bestX;
      demo.press = true;
    } else {
      // 留まって、踊り子の真上に投げ込ませる(失敗例)
      if (!demo.aimed) { spawnT = 0; demo.aimed = true; }
      demo.press = false;
    }
    stepWorld(dt, 0.3, true);
    forceAim = false;
    demo.gx = targetX;
    demo.gy = H * 0.83;
  }

  game.onPress(function(x, y) {
    if (state !== S.PLAYING || finished) return;
    if (ready > 0.3) return;
    targetX = Math.max(MIN_X, Math.min(MAX_X, x));
    game.audio.play('se_tap', 0.12);
  });
  game.onMove(function(x, y) {
    if (state !== S.PLAYING || finished) return;
    targetX = Math.max(MIN_X, Math.min(MAX_X, x));
    if (game.random(0, 1) < 0.04) game.fx.burst(dancerX, STAGE_Y, { color: C.white, count: 2, speed: 120 });
  });
  game.onRelease(function(x, y) {
    if (state !== S.PLAYING || finished) return;
    game.audio.tone('E5', 0.05, { wave: 'triangle', volume: 0.06 });
  });

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.4); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING && !finished) game.fx.burst(x, y, { color: C.pink, count: 3, speed: 150 });
  });

  function finishNow() {
    if (pendingEnd === 'clear') {
      ok = true;
      game.feedback.good(dancerX, STAGE_Y - 120, { text: 'CLEAR', color: C.gold, count: 30 });
      game.audio.play('se_success', 0.6);
    } else {
      ok = false;
      game.feedback.bad(dancerX, STAGE_Y - 120, { text: 'MISS' });
      game.audio.play('se_failure', 0.6);
    }
    endWait = 1.2; pendingEnd = null;
  }

  game.onUpdate(function(dt) {
    var pulse = 0.04 + 0.04 * Math.sin(game.time.elapsed * 2);

    if (state === S.ATTRACT) {
      if (items === undefined) initGame();
      stepDemo(dt);
      drawBg(pulse);
      drawItems();
      drawDancer('');
      drawRail(true);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 14 });
      game.draw.rect(0, 0, W, H * 0.12, C.ink, 0.6);
      txt(GAME_TITLE, W / 2, H * 0.045, 80, C.gold);
      txt('BEST ' + (game.best || 0), W / 2, H * 0.095, 38, C.white);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.965, 44, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.965, 40, C.white);
      return;
    }

    if (state === S.RESULT) {
      drawBg(pulse);
      drawDancer(ok ? 'cheer' : 'down');
      if (ok && Math.floor(game.time.elapsed * 5) % 2 === 0) game.fx.burst(game.random(W * 0.15, W * 0.85), H * 0.3, { color: C.pink, count: 4 });
      game.draw.rect(0, H * 0.3, W, H * 0.26, C.ink, 0.7);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.35, 100, ok ? C.gold : C.red);
      txt('SCORE ' + score, W / 2, H * 0.42, 60, C.white);
      if (ok && score > (game.best || 0)) txt('NEW RECORD', W / 2, H * 0.49, 50, C.gold);
      else txt('BEST ' + (game.best || 0), W / 2, H * 0.49, 44, C.white);
      if (!ok) txt('あと' + Math.ceil(TIME_LIMIT - survived) + '秒!', W / 2, H * 0.535, 44, C.gold);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.965, 40, C.white);
      return;
    }

    if (endWait > 0) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(score, { seconds: Math.floor(survived), grazes: grazes });
        else game.end.failure({ seconds: Math.floor(survived), grazes: grazes });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
      if (hitStop <= 0) finishNow();
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_jump', 0.3);
    } else if (!finished) {
      timeLeft -= dt; survived += dt;
      score = Math.floor(survived * 10) + grazes * 50;
      if (survived >= nextMs) {
        nextMs += 6;
        game.audio.play('se_milestone', 0.4);
        game.fx.popup(Math.floor(survived) + '秒', W / 2, H * 0.4, { color: C.gold, size: 70 });
      }
      stepWorld(dt, Math.min(1, survived / TIME_LIMIT), false);
      if (!finished && timeLeft <= 0) {
        timeLeft = 0; finished = true; pendingEnd = 'clear'; hitStop = 0.4; focus = { dancer: true }; items = [];
        score += 500;
        game.fx.popup('FINISH', W / 2, H * 0.4, { color: C.gold, size: 90 });
      }
    }

    drawBg(pulse);
    drawItems();
    drawDancer('');
    drawRail(game.input.pressing);
    drawHud();
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.45, 110, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([
      ['A4', 0.5], ['C5', 0.5], ['E5', 0.5], ['A5', 0.5], ['G5', 0.5], ['E5', 0.5], ['F5', 1],
      ['D5', 0.5], ['F5', 0.5], ['A5', 0.5], ['G5', 0.5], ['E5', 1.5], [0, 0.5],
    ], { tempo: 168, wave: 'square', volume: 0.05, loop: true, bass: [['A2', 2], ['F2', 2], ['D3', 2], ['E3', 2]] });
    state = S.ATTRACT;
    initGame();
  });
})(game);
