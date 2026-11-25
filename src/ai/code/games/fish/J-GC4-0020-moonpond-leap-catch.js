// J-GC4-0020-moonpond-leap-catch.js
// 月池はねつかみ — 水面から銀の魚が跳ねた瞬間にタップして素手でつかむ。向こう岸のサギより先に
// 操作: 魚が水面から跳び出したらすぐタップ。波紋や落ち葉のしぶきはおとりで、先走ると魚が逃げる
// 終わり: 6匹つかめばCLEAR。3回取り逃す(先走り・サギに先を越される)か時間切れでGAME OVER
// @mechanic: reaction_duel
// @theme: moon_pond_fish_grab
// 世界観: 満月の夜の養魚池で、灯籠番の子が向こう岸のサギと早さを競い、跳ねた銀鱗の稚魚を素手で受け止めて生け簀へ移していく
// 残るもの: 正誤(CLEAR/GAME OVER) + つかんだ数・最速反応(秒)のスコア
// スタイル: 90s HANDHELD COLOR

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s HANDHELD COLOR: 低彩度・少色、太い形、密度を抑える
  var STYLE = { bg: ['#1e2a44', '#3a4a6a', '#5a6a88'], main: ['#6a9a8a', '#c8d0b8'], accent: ['#e8d070', '#d86a5a'] };
  var C = {
    sky0: '#1e2a44', sky1: '#3a4a6a', moon: '#e8e0b0', water: '#2e4a5a', waterHi: '#6a9a8a', reed: '#3a5a4a',
    fish: '#c8d0b8', ink: '#e8e0c8', good: '#8ad08a', bad: '#d86a5a', gold: '#e8d070', lantern: '#e8b060'
  };

  var GAME_TITLE = 'MOON POND';
  var TIME_LIMIT = 15;
  var NEEDED = 6;
  var LIVES = 3;
  var WATER_Y = Math.round(H * 0.56);
  var HAND_Y = Math.round(H * 0.84);
  var HUD_Y = Math.round(H * 0.06);

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var FISH = [
    ['....ff..', '..ffffff', 'fffkffff', '.fffffff', '..ffffff', '....ff..'],
    ['...ff...', '..ffffff', 'fffkffff', 'ffffffff', '..ffffff', '...ff...']
  ];
  var FISH_PAL = { f: '#c8d0b8', k: '#1e2a44' };
  var HERON = ['..hh....', '.hkh....', '...h....', '...hh...', '..hhhh..', '..hhhhh.', '...h.h..', '...h.h..'];
  var HANDS = [
    ['ss....ss', 'ss....ss', 'sss..sss', 'ssssssss', '.ssssss.', '..ssss..'],
    ['..ssss..', '.ssssss.', 'ssssssss', 'ssssssss', '.ssssss.', '..ssss..']
  ];
  var HANDS_PAL = { s: '#d8b090' };
  var LEAF = ['.gg', 'ggg', 'gg.'];

  var round, caught, misses, best, timeLeft, ev, feints, grabT, grabHit, sparkle;
  var ready, hitStop, finished, done, endWait, ok, milestone, heronT;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#101828', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function heronSpeed() { return Math.max(0.36, 0.62 - caught * 0.045); }

  function newRound() {
    ev = { phase: 'wait', t: game.random(0.6, 1.5), x: game.random(W * 0.25, W * 0.75), jumpT: 0 };
    feints = [];
    var nf = Math.random() < 0.7 ? 1 + Math.floor(Math.random() * 2) : 0;
    for (var i = 0; i < nf; i++) feints.push({ at: game.random(0.2, ev.t - 0.15), x: game.random(W * 0.2, W * 0.8), kind: Math.random() < 0.5 ? 'ripple' : 'leaf', t: -1 });
  }

  function initGame() {
    round = 0; caught = 0; misses = 0; best = 0; timeLeft = TIME_LIMIT;
    grabT = 0; grabHit = false; sparkle = []; heronT = 0;
    ready = 0.8; hitStop = 0; finished = false; done = false; endWait = 0; ok = false; milestone = false;
    newRound();
  }

  function fishPos() {
    var p = Math.min(1, ev.jumpT / 0.9);
    return { x: ev.x + (p - 0.5) * 120, y: WATER_Y - Math.sin(Math.PI * p) * 300 };
  }

  function missOne(x, y, isDemo) {
    misses++;
    game.feedback.bad(x, y, { text: 'MISS', color: C.bad, shake: 6 });
    if (!isDemo && misses >= LIVES) { loseGame(); return; }
    ev = { phase: 'pause', t: 0.55, x: ev.x, jumpT: 0 };
  }

  // 実ロジック: つかむ
  function grab(isDemo) {
    grabT = 0.22;
    game.audio.play('se_tap', 0.35);
    if (ev.phase === 'jump') {
      var rt = ev.jumpT;
      var fp = fishPos();
      grabHit = true;
      caught++;
      var ms = Math.round(rt * 1000);
      if (best === 0 || ms < best) best = ms;
      var perfect = rt < 0.25;
      game.feedback.good(fp.x, fp.y - 80, { text: perfect ? 'PERFECT' : 'GOOD', color: perfect ? C.gold : C.good, count: 14 });
      game.fx.popup((ms / 1000).toFixed(2) + '秒', fp.x, fp.y - 150, { color: C.ink, size: 40 });
      game.audio.play('se_coin', 0.35);
      if (!isDemo && caught === 3 && !milestone) {
        milestone = true;
        game.audio.play('se_milestone', 0.45);
        game.fx.popup(caught + ' / ' + NEEDED, W / 2, H * 0.3, { color: C.gold, size: 64 });
      }
      if (!isDemo && caught >= NEEDED) { winGame(); return; }
      ev = { phase: 'pause', t: 0.45, x: ev.x, jumpT: 0 };
    } else if (ev.phase === 'wait') {
      // 先走り: 魚がおびえて潜り直す
      grabHit = false;
      missOne(W / 2, WATER_Y - 60, isDemo);
    } else {
      grabHit = false;
    }
  }

  function stepWorld(dt, isDemo) {
    if (grabT > 0) grabT -= dt;
    if (heronT > 0) heronT -= dt;
    for (var s = sparkle.length - 1; s >= 0; s--) { sparkle[s].t -= dt; if (sparkle[s].t <= 0) sparkle.splice(s, 1); }
    ev.t -= dt;
    if (ev.phase === 'wait') {
      for (var k = 0; k < feints.length; k++) {
        var fk = feints[k];
        fk.at -= dt;
        if (fk.at <= 0 && fk.t < 0) { fk.t = 0.6; game.audio.tone('A3', 0.05, { wave: 'sine', volume: 0.05 }); }
        if (fk.t > 0) fk.t -= dt;
      }
      if (ev.t <= 0) {
        ev.phase = 'jump'; ev.jumpT = 0;
        game.audio.play('se_jump', 0.4);
        sparkle.push({ x: ev.x, y: WATER_Y, t: 0.5 });
      }
    } else if (ev.phase === 'jump') {
      ev.jumpT += dt;
      // 向こう岸のサギが先に取る
      if (ev.jumpT >= heronSpeed()) {
        heronT = 0.5;
        var fp = fishPos();
        missOne(fp.x, fp.y, isDemo);
      }
    } else if (ev.phase === 'pause') {
      if (ev.t <= 0) { round++; newRound(); }
    }
  }

  function winGame() {
    finished = true; ok = true; hitStop = 0.4;
    game.feedback.good(W / 2, WATER_Y - 200, { text: 'CLEAR', color: C.gold, count: 30, flashColor: '#e8e0c8' });
    game.audio.play('se_success', 0.55);
    finish();
  }

  function loseGame() {
    if (finished) return;
    finished = true; ok = false; hitStop = 0.5;
    game.audio.play('se_failure', 0.5);
    finish();
  }

  function finish() {
    if (done) return;
    done = true; endWait = 1.2;
    game.audio.stopBgm();
  }

  function scoreNow() { return caught * 150 + (best > 0 ? Math.max(0, 500 - best) : 0) + (ok ? Math.round(timeLeft * 20) : 0); }

  function drawScene() {
    var t = game.time.elapsed;
    game.draw.gradient(0, WATER_Y, [[0, C.sky0], [1, C.sky1]]);
    game.draw.rect(0, 0, W, H, C.moon, 0.02 + 0.02 * Math.sin(t * 1.2));
    game.draw.circle(W * 0.78, H * 0.22, 110, C.moon);
    game.draw.circle(W * 0.78, H * 0.22, 170, C.moon, 0.1);
    // 向こう岸とサギ
    game.draw.rect(0, WATER_Y - 90, W, 90, C.reed);
    for (var r = 0; r < 14; r++) game.draw.rect(r * 80 + 10, WATER_Y - 150 - (r % 3) * 30 + Math.sin(t * 1.5 + r) * 6, 12, 120, C.reed);
    var hx = W * 0.15 + (heronT > 0 ? (0.5 - heronT) * 600 : 0);
    game.draw.sprite(HERON, { h: '#8a98b0', k: C.gold }, hx, WATER_Y - 160 + Math.sin(t * 2) * 4, 16, { anchor: 'center' });
    // 水面
    game.draw.gradient(WATER_Y, HAND_Y - 120, [[0, C.water], [1, '#1a2a38']]);
    for (var w = 0; w < 8; w++) game.draw.rect(((w * 170 + t * 30) % 1300) - 110, WATER_Y + 30 + w * 50, 100, 6, C.waterHi, 0.35);
    game.draw.rect(W * 0.78 - 60, WATER_Y + 40, 120, 8, C.moon, 0.5 + 0.2 * Math.sin(t * 3));
    // おとり(波紋・落ち葉)
    for (var i = 0; i < feints.length; i++) {
      var f = feints[i];
      if (f.t <= 0) continue;
      var pr = 1 - f.t / 0.6;
      if (f.kind === 'ripple') {
        game.draw.circle(f.x, WATER_Y + 20, 30 + pr * 90, C.waterHi, 0.5 * (1 - pr));
      } else {
        game.draw.sprite(LEAF, { g: '#a0a060' }, f.x, WATER_Y - 200 + pr * 200, 14, { anchor: 'center' });
        if (pr > 0.8) game.draw.circle(f.x, WATER_Y, 50, C.waterHi, 0.5);
      }
    }
    // 本物の魚
    if (ev.phase === 'jump') {
      var fp = fishPos();
      game.draw.circle(ev.x, WATER_Y + 10, 70, C.waterHi, 0.4);
      game.draw.sprite(FISH[Math.floor(t * 12) % 2], FISH_PAL, fp.x, fp.y, 16, { anchor: 'center', flipY: ev.jumpT > 0.45 });
      game.draw.circle(fp.x, fp.y, 90, C.moon, 0.12);
    }
    for (var s = 0; s < sparkle.length; s++) game.draw.circle(sparkle[s].x, sparkle[s].y, 110 * (1 - sparkle[s].t), C.ink, sparkle[s].t);
    // 手前の岸と手(親指ゾーン)
    game.draw.rect(0, HAND_Y - 120, W, H - HAND_Y + 120, '#2a2a30');
    game.draw.rect(0, HAND_Y - 120, W, 16, '#4a4a50');
    game.draw.circle(W * 0.12, HAND_Y - 40, 36, C.lantern, 0.6 + 0.2 * Math.sin(t * 5));
    var reach = grabT > 0 ? (0.22 - grabT) / 0.22 : 0;
    var handY = HAND_Y - Math.sin(Math.PI * reach) * 260;
    game.draw.sprite(HANDS[grabT > 0 ? 1 : 0], HANDS_PAL, W / 2, handY + Math.sin(t * 2) * 4, 22, { anchor: 'center' });
    if (grabT > 0 && grabHit) game.draw.sprite(FISH[0], FISH_PAL, W / 2, handY - 60, 12, { anchor: 'center' });
    // 生け簀
    for (var c = 0; c < NEEDED; c++) game.draw.circle(W * 0.72 + (c % 3) * 70, HAND_Y + 110 + Math.floor(c / 3) * 60, 22, c < caught ? C.fish : '#4a4a50');
  }

  function drawHud() {
    txt(caught + ' / ' + NEEDED, 60, HUD_Y + 20, 60, C.ink, 'left');
    txt('SCORE ' + scoreNow(), W - 60, HUD_Y + 20, 38, C.gold, 'right');
    for (var l = 0; l < LIVES; l++) game.draw.circle(W - 90 - l * 60, HUD_Y + 90, 20, l < LIVES - misses ? C.good : '#4a4a50');
    var low = timeLeft < 3 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(60, 180, W - 120, 20, '#101828');
    game.draw.rect(60, 180, (W - 120) * Math.max(0, timeLeft / TIME_LIMIT), 20, low ? C.bad : C.waterHi);
  }

  // ---- ATTRACT デモ: 跳ねを見てつかむ(3回に1回はおとりで先走る) ----
  var demo = { t: 0, gx: W / 2, gy: HAND_Y, press: 0, n: 0, lastRound: -1, wait: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    if (demo.t <= dt || caught >= NEEDED - 1 || misses >= LIVES) initGame();
    stepWorld(dt, true);
    if (round !== demo.lastRound) { demo.lastRound = round; demo.n++; demo.wait = 0; }
    if (ev.phase === 'jump') {
      demo.wait += dt;
      if (demo.wait > 0.18) { grab(true); demo.press = 0.2; }
    } else if (ev.phase === 'wait' && demo.n % 3 === 0) {
      for (var i = 0; i < feints.length; i++) if (feints[i].t > 0 && feints[i].t < 0.4) { grab(true); demo.press = 0.2; break; }
    }
    if (demo.press > 0) demo.press -= dt;
    demo.gx = W / 2; demo.gy = HAND_Y + 60;
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.5); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (finished || ready > 0) { game.audio.play('se_tap', 0.15); return; }
    if (ev.phase === 'pause') { game.fx.burst(x, y, { color: C.waterHi, count: 3, speed: 80 }); return; }
    grab(false);
  });

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (ev === undefined) initGame();
      stepDemo(dt);
      drawScene();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press > 0, scale: 13 });
      txt(GAME_TITLE, W / 2, H * 0.1, 96, C.gold);
      txt('BEST ' + (game.best || 0), W / 2, H * 0.145, 40, C.ink);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.97, 44, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.97, 34, C.ink);
      return;
    }

    if (state === S.RESULT) {
      drawScene();
      game.draw.rect(0, H * 0.12, W, H * 0.2, '#101828', 0.7);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.17, 100, ok ? C.gold : C.bad);
      txt('SCORE ' + scoreNow(), W / 2, H * 0.225, 48, C.ink);
      if (best > 0) txt((best / 1000).toFixed(2) + '秒', W / 2, H * 0.265, 38, C.good);
      if (!ok && caught < NEEDED) txt('あと' + (NEEDED - caught) + '匹!', W / 2, H * 0.305, 46, C.bad);
      else if (scoreNow() > (game.best || 0)) txt('NEW RECORD', W / 2, H * 0.305, 50, C.gold);
      else txt('BEST ' + (game.best || 0), W / 2, H * 0.305, 40, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.97, 40, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (hitStop > 0) hitStop -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        var stats = { caught: caught, misses: misses, fastestMs: best };
        if (ok) game.end.success(scoreNow(), stats);
        else game.end.failure(stats);
      }
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap', 0.3);
    } else if (!finished) {
      timeLeft -= dt;
      stepWorld(dt, false);
      if (timeLeft <= 0 && !finished) {
        timeLeft = 0;
        game.feedback.bad(W / 2, WATER_Y - 100, { text: 'TIME UP', color: C.bad, shake: 8 });
        loseGame();
      }
    }

    drawScene();
    drawHud();
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.36, 110, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([
      ['A4', 1], ['C5', 0.5], ['D5', 0.5], ['E5', 1], ['G5', 1],
      ['E5', 0.5], ['D5', 0.5], ['C5', 1], ['A4', 2]
    ], { tempo: 96, wave: 'triangle', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
