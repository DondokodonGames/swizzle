// J-GC4-0022-counting-house-belt.js
// 帳場ベルトの両替 — 流れてくる1・5・10の硬貨をタップで拾い、注文札の額にぴったり揃える。超えたら升がこぼれる
// 操作: ベルト上の硬貨をタップで拾う(升の合計に加算)。合計が札の数字と一致したら納品、超えるとやり直し
// 終わり: 制限時間内に3枚の注文札をぴったり納めればCLEAR。時間切れでGAME OVER
// @mechanic: count_exact
// @theme: counting_house_coin_belt
// 世界観: 古い両替商の帳場で、見習い番頭が木のベルトに流れてくる銅貨・銀貨・金貨を、先輩たちの手に取られる前に拾い、注文札どおりぴったりの額を升に揃えて納める
// 残るもの: 正誤(CLEAR/GAME OVER) + 納めた注文数・一発ぴったり数のスコア
// スタイル: SKEUOMORPH

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // SKEUOMORPH: 木目・フェルト・光沢。gradientで厚み
  var STYLE = { bg: ['#3a2416', '#5a3a22', '#7a5230'], main: ['#2f5a3a', '#c89a5a'], accent: ['#f0c850', '#d8604a'] };
  var C = {
    wall0: '#3a2416', wall1: '#5a3a22', wood: '#8a5a30', woodHi: '#b07a44', woodDark: '#5a3a1e', felt: '#2f5a3a', feltHi: '#3f7a4c',
    belt: '#4a3a2e', beltLine: '#6a5444', copper: '#c87a3a', silver: '#d8dce0', gold: '#f0c850', ink: '#fff4dc',
    good: '#7ad87a', bad: '#e8604a', paper: '#f4e8c8', paperInk: '#3a2416'
  };

  var GAME_TITLE = 'COIN COUNTER';
  var TIME_LIMIT = 20;
  var NEEDED = 3;
  var BELT_Y = Math.round(H * 0.42);
  var TRAY_Y = Math.round(H * 0.68);
  var CARD_Y = Math.round(H * 0.2);
  var HUD_Y = Math.round(H * 0.055);
  var VALUES = [1, 5, 10];
  var RADIUS = { 1: 46, 5: 56, 10: 66 };

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var CLERK = [
    ['..kkkk..', '.kkkkkk.', '..ffff..', '..fkfk..', '..ffff..', '.bbbbbb.', 'bbbwwbbb', 'bbbwwbbb'],
    ['..kkkk..', '.kkkkkk.', '..ffff..', '..fkfk..', '..fmmf..', '.bbbbbb.', 'bbbwwbbb', 'bbbwwbbb']
  ];
  var CLERK_PAL = { k: '#2a1a10', f: '#f0c8a0', b: '#3a4a7a', w: '#fff4dc', m: '#a04030' };
  var SNATCH = ['..hh..', '.hhhh.', 'hhhhhh', 'hhhhhh', '.hhhh.'];

  var coins, flying, target, sum, orders, cleanOrders, busted, timeLeft, spawnT, beltSpeed, beltOff, snatchT;
  var ready, hitStop, finished, done, endWait, ok, milestone, flashT, coinId;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 4, { size: sz, color: '#1a0e06', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function newOrder() {
    target = 11 + Math.floor(Math.random() * 16) + orders * 4;
    sum = 0; busted = 0;
  }

  function initGame() {
    coins = []; flying = []; orders = 0; cleanOrders = 0; timeLeft = TIME_LIMIT; spawnT = 0; beltSpeed = 240; beltOff = 0; snatchT = 0;
    ready = 0.8; hitStop = 0; finished = false; done = false; endWait = 0; ok = false; milestone = false; flashT = 0; coinId = 0;
    newOrder();
    for (var i = 0; i < 4; i++) spawnCoin(120 + i * 230);
  }

  function spawnCoin(x) {
    var r = Math.random();
    var v = r < 0.5 ? 1 : (r < 0.8 ? 5 : 10);
    coins.push({ id: coinId++, x: x, y: BELT_Y + game.random(-20, 20), v: v, spin: Math.random() * 6 });
  }

  // 実ロジック: 硬貨を拾う
  function pick(x, y, isDemo) {
    var hit = -1, bd = 1e9;
    for (var i = 0; i < coins.length; i++) {
      var d = Math.hypot(coins[i].x - x, coins[i].y - y);
      if (d < RADIUS[coins[i].v] + 30 && d < bd) { bd = d; hit = i; }
    }
    if (hit < 0) {
      game.audio.play('se_tap', 0.12);
      game.fx.burst(x, y, { color: C.woodHi, count: 3, speed: 80 });
      return false;
    }
    var c = coins.splice(hit, 1)[0];
    flying.push({ x: c.x, y: c.y, v: c.v, t: 0.3 });
    sum += c.v;
    game.audio.play('se_coin', 0.35);
    if (sum === target) {
      orders++;
      var clean = busted === 0;
      if (clean) cleanOrders++;
      flashT = 0.3;
      game.feedback.good(W / 2, TRAY_Y - 120, { text: clean ? 'PERFECT' : 'GOOD', color: C.gold, count: 18 });
      if (!isDemo && orders === 2 && !milestone) {
        milestone = true;
        game.audio.play('se_milestone', 0.45);
        game.fx.popup(orders + ' / ' + NEEDED, W / 2, CARD_Y + 180, { color: C.gold, size: 64 });
      }
      if (!isDemo && orders >= NEEDED) { winGame(); return true; }
      beltSpeed = 240 + orders * 50;
      newOrder();
    } else if (sum > target) {
      busted++;
      game.feedback.bad(W / 2, TRAY_Y - 120, { text: 'MISS', color: C.bad, shake: 8 });
      game.audio.play('se_break', 0.35);
      sum = 0;
    } else {
      game.fx.popup('+' + c.v, c.x, c.y - 80, { color: C.ink, size: 44 });
    }
    return true;
  }

  function stepWorld(dt) {
    beltOff = (beltOff + beltSpeed * dt) % 80;
    spawnT -= dt;
    if (spawnT <= 0) { spawnCoin(-70); spawnT = 170 / beltSpeed + game.random(0, 0.25); }
    for (var i = coins.length - 1; i >= 0; i--) {
      var c = coins[i];
      c.x += beltSpeed * dt; c.spin += dt * 5;
      if (c.x > W - 90) { coins.splice(i, 1); snatchT = 0.35; }
    }
    for (var f = flying.length - 1; f >= 0; f--) {
      flying[f].t -= dt;
      if (flying[f].t <= 0) flying.splice(f, 1);
    }
    if (snatchT > 0) snatchT -= dt;
    if (flashT > 0) flashT -= dt;
  }

  function winGame() {
    finished = true; ok = true; hitStop = 0.4;
    game.feedback.good(W / 2, TRAY_Y - 160, { text: 'CLEAR', color: C.gold, count: 30, flashColor: '#fff4dc' });
    game.audio.play('se_success', 0.55);
    finish();
  }

  function loseGame() {
    if (finished) return;
    finished = true; ok = false; hitStop = 0.5; flashT = 0.4;
    game.feedback.bad(W / 2, CARD_Y + 40, { text: 'TIME UP', color: C.bad, shake: 10 });
    game.audio.play('se_failure', 0.5);
    finish();
  }

  function finish() {
    if (done) return;
    done = true; endWait = 1.2;
    game.audio.stopBgm();
  }

  function scoreNow() { return orders * 300 + cleanOrders * 150 + (ok ? Math.round(timeLeft * 20) : 0); }

  function drawCoin(x, y, v, spin, scale) {
    var r = RADIUS[v] * (scale || 1);
    var squash = 0.75 + 0.25 * Math.abs(Math.cos(spin));
    var col = v === 1 ? C.copper : (v === 5 ? C.silver : C.gold);
    game.draw.circle(x + 4, y + 8, r, '#1a0e06', 0.4);
    game.draw.circle(x, y, r, '#5a3a1e');
    game.draw.circle(x, y, r - 6, col);
    game.draw.circle(x - r * 0.25, y - r * 0.3, r * 0.35 * squash, '#ffffff', 0.45);
    game.draw.text(String(v), x, y + 4, { size: Math.round(r * 0.9), color: '#3a2416', bold: true, align: 'center' });
  }

  function drawScene() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, C.wall0], [0.5, C.wall1], [1, C.wall0]]);
    game.draw.rect(0, 0, W, H, C.gold, 0.02 + 0.02 * Math.sin(t * 1.3));
    // 木の格子窓
    for (var i = 0; i < 4; i++) {
      game.draw.rect(60 + i * 250, H * 0.29, 200, 90, '#2a1a0e');
      game.draw.rect(70 + i * 250, H * 0.295, 180, 70, '#c89a5a', 0.25 + 0.05 * Math.sin(t + i));
    }
    // 注文札
    var cw = 360, ch = 150;
    game.draw.gradient(CARD_Y - ch / 2, CARD_Y + ch / 2, [[0, '#fbf2dc'], [1, '#e0d0a8']]);
    game.draw.rect(0, CARD_Y - ch / 2, W / 2 - cw / 2, ch, C.wall1);
    game.draw.rect(W / 2 + cw / 2, CARD_Y - ch / 2, W / 2 - cw / 2, ch, C.wall1);
    game.draw.rect(W / 2 - cw / 2, CARD_Y - ch / 2, cw, 10, C.bad);
    game.draw.text(String(target), W / 2, CARD_Y + 10, { size: 110, color: C.paperInk, bold: true, align: 'center' });
    // ベルト(木の台+革ベルト)
    game.draw.gradient(BELT_Y - 110, BELT_Y + 130, [[0, C.woodHi], [0.15, C.wood], [0.85, C.belt], [1, C.woodDark]]);
    for (var b = -1; b < 15; b++) game.draw.rect(b * 80 + beltOff, BELT_Y - 90, 6, 180, C.beltLine);
    game.draw.rect(0, BELT_Y + 100, W, 30, C.woodDark);
    // ベルト終端で拾っていく先輩の手(演出のみ)
    game.draw.sprite(SNATCH, { h: '#c89a70' }, W - 70, BELT_Y - (snatchT > 0 ? 40 : 130) + Math.sin(t * 2) * 10, 16, { anchor: 'center', alpha: 0.8 });
    for (var c = 0; c < coins.length; c++) drawCoin(coins[c].x, coins[c].y, coins[c].v, coins[c].spin);
    // 升(フェルト台)
    game.draw.gradient(TRAY_Y - 120, TRAY_Y + 140, [[0, C.feltHi], [1, C.felt]]);
    game.draw.rect(W / 2 - 240, TRAY_Y - 60, 480, 180, C.woodDark);
    game.draw.rect(W / 2 - 220, TRAY_Y - 40, 440, 140, C.wood);
    var fill = Math.min(1, sum / target);
    game.draw.rect(W / 2 - 220, TRAY_Y + 100 - 140 * fill, 440, 140 * fill, sum === target ? C.gold : C.copper, 0.6);
    game.draw.text(sum + ' / ' + target, W / 2, TRAY_Y + 34, { size: 70, color: C.ink, bold: true, align: 'center' });
    for (var f = 0; f < flying.length; f++) {
      var fl = flying[f], p = 1 - fl.t / 0.3;
      drawCoin(fl.x + (W / 2 - fl.x) * p, fl.y + (TRAY_Y - fl.y) * p - Math.sin(Math.PI * p) * 120, fl.v, 0, 1 - p * 0.4);
    }
    if (flashT > 0) game.draw.rect(W / 2 - 240, TRAY_Y - 60, 480, 180, '#ffffff', flashT * 2);
    // 番頭(手前)
    game.draw.sprite(CLERK[Math.floor(t * 3) % 2], CLERK_PAL, W * 0.16, TRAY_Y + 40 + Math.sin(t * 2.2) * 5, 16, { anchor: 'center' });
    // そろばん(親指ゾーンの飾り、合計に合わせて珠が寄る)
    var aby = Math.round(H * 0.86);
    game.draw.rect(80, aby - 70, W - 160, 150, C.woodDark);
    game.draw.rect(96, aby - 54, W - 192, 118, '#2a1a0e');
    for (var r = 0; r < 3; r++) {
      game.draw.line(110, aby - 30 + r * 40, W - 110, aby - 30 + r * 40, C.woodHi, 4);
      var beads = r === 0 ? Math.floor(sum / 10) : (r === 1 ? Math.floor((sum % 10) / 5) : sum % 5);
      for (var k = 0; k < 6; k++) {
        var moved = k < beads;
        game.draw.circle(moved ? 160 + k * 60 : W - 460 + k * 60, aby - 30 + r * 40, 17, moved ? C.gold : C.woodHi);
      }
    }
  }

  function drawHud() {
    txt(orders + ' / ' + NEEDED, 60, HUD_Y + 20, 56, C.ink, 'left');
    txt('SCORE ' + scoreNow(), W - 60, HUD_Y + 20, 40, C.gold, 'right');
    var low = timeLeft < 4 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(60, 150, W - 120, 20, '#1a0e06');
    game.draw.rect(60, 150, (W - 120) * Math.max(0, timeLeft / TIME_LIMIT), 20, low ? C.bad : C.good);
  }

  // ---- ATTRACT デモ: 残り額に収まる硬貨を拾う(時々欲張って超える) ----
  var demo = { t: 0, gx: W / 2, gy: BELT_Y, press: 0, cool: 0, n: 0, aim: -1 };
  function stepDemo(dt) {
    demo.t += dt;
    if (demo.t <= dt || orders >= 2) initGame();
    stepWorld(dt);
    demo.cool -= dt;
    var need = target - sum;
    var best = null;
    for (var i = 0; i < coins.length; i++) {
      var c = coins[i];
      if (c.x < 200 || c.x > W - 260) continue;
      var greedy = demo.n % 5 === 4;
      if ((greedy ? c.v > need : c.v <= need) && (!best || c.v > best.v)) best = c;
    }
    if (best) {
      demo.gx += (best.x + 40 - demo.gx) * Math.min(1, dt * 12);
      demo.gy += (best.y - demo.gy) * Math.min(1, dt * 12);
      if (demo.cool <= 0 && Math.hypot(best.x - demo.gx, best.y - demo.gy) < 60) {
        pick(best.x, best.y, true); demo.n++;
        demo.press = 0.18; demo.cool = 0.35;
      }
    }
    if (demo.press > 0) demo.press -= dt;
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.5); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (finished || ready > 0) { game.audio.play('se_tap', 0.15); return; }
    pick(x, y, false);
  });

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (coins === undefined) initGame();
      stepDemo(dt);
      drawScene();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press > 0, scale: 13 });
      game.draw.rect(0, H * 0.04, W, H * 0.085, '#1a0e06', 0.6);
      txt(GAME_TITLE, W / 2, H * 0.07, 80, C.gold);
      txt('BEST ' + (game.best || 0), W / 2, H * 0.105, 36, C.ink);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.97, 44, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.97, 34, C.ink);
      return;
    }

    if (state === S.RESULT) {
      drawScene();
      game.draw.rect(0, H * 0.12, W, H * 0.2, '#1a0e06', 0.75);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.17, 100, ok ? C.gold : C.bad);
      txt('SCORE ' + scoreNow() + '   PERFECT ' + cleanOrders, W / 2, H * 0.225, 44, C.ink);
      if (!ok && orders < NEEDED) txt('あと' + (NEEDED - orders) + '枚!', W / 2, H * 0.275, 46, C.bad);
      else if (scoreNow() > (game.best || 0)) txt('NEW RECORD', W / 2, H * 0.275, 50, C.gold);
      else txt('BEST ' + (game.best || 0), W / 2, H * 0.275, 40, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.97, 40, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (hitStop > 0) hitStop -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        var stats = { orders: orders, perfectOrders: cleanOrders };
        if (ok) game.end.success(scoreNow(), stats);
        else game.end.failure(stats);
      }
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap', 0.3);
    } else if (!finished) {
      timeLeft -= dt;
      stepWorld(dt);
      if (timeLeft <= 0 && !finished) { timeLeft = 0; loseGame(); }
    }

    drawScene();
    drawHud();
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.55, 110, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([
      ['G4', 0.5], ['A4', 0.5], ['C5', 0.5], ['D5', 0.5], ['E5', 1], ['D5', 0.5], ['C5', 0.5],
      ['A4', 0.5], ['C5', 0.5], ['D5', 1], ['G4', 1], ['C5', 2]
    ], { tempo: 132, wave: 'triangle', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
