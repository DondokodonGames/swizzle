// J-Switch-0052-ant-nest-forage.js
// アリの巣道あつめ — 曲がりくねった巣穴の通路からはみ出さずにアリを導き、脇穴の宝も拾って女王の部屋へ
// 操作: アリに指を置いてそのまま通路に沿って動かす。壁の外へ指が出るとぶつかってミス。しずくが光った縦筋は落ちる前に通り抜ける(社内メモ。画面には出さない)
// 終わり: 宝を6つ集めて開いた女王の部屋に入ればCLEAR。壁やしずくに3回当たる/時間切れでGAME OVER
// @mechanic: guide_path
// @theme: ant_nest_tunnel_forage
// 世界観: 夏の庭の土の下に広がるアリの巣で、初めて外回りを任された見習いの働きアリが、入口から女王の部屋までの曲がりくねった通路と脇穴に散らばった砂糖粒や種を拾い集め、雨水がしみ出す前に部屋へ運び込む
// 残るもの: 正誤(CLEAR/GAME OVER) + 集めた宝の数・当たった数・到着秒
// スタイル: 8bit HANDHELD

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 8bit HANDHELD: 4階調の黄緑寄りモノクロ、低コントラスト、画面枠
  var STYLE = { bg: ['#0f380f', '#306230', '#8bac0f'], main: ['#9bbc0f', '#8bac0f', '#306230'], accent: ['#0f380f', '#9bbc0f'] };
  var D = { d0: '#0f380f', d1: '#306230', d2: '#8bac0f', d3: '#9bbc0f', frame: '#2a2a2a' };

  var GAME_TITLE = 'ANT NEST';
  var TIME_LIMIT = 20;
  var NEED = 6;
  var MAX_BUMP = 3;
  var HALF = 72;
  var MAIN = [{ x: 540, y: 300 }, { x: 240, y: 480 }, { x: 830, y: 700 }, { x: 290, y: 920 }, { x: 790, y: 1140 }, { x: 540, y: 1330 }];
  var POCKETS = [[{ x: 830, y: 700 }, { x: 950, y: 590 }], [{ x: 290, y: 920 }, { x: 140, y: 1010 }], [{ x: 790, y: 1140 }, { x: 950, y: 1240 }]];
  var DRIPS = [420, 680];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var part, pre, time, ant, grabbing, loot, got, bumps, drips, safeT, holdT, closeT, done, blink, midDone;

  var ANT = [
    ['k.....k', '.k...k.', '..kkk..', '.kkkkk.', 'k.kkk.k', '..kkk..', '.k.k.k.'],
    ['.k...k.', 'k.....k', '..kkk..', '.kkkkk.', '.kkkkk.', 'k.kkk.k', 'k..k..k']
  ];
  var GRAIN = ['.l.', 'lll', '.l.'];
  var SEED = ['.ll.', 'llll', '.ll.'];
  var QUEEN = ['..k..k..', '...kk...', '.kkkkkk.', 'kkllllkk', '.kkkkkk.', 'k.k..k.k'];
  var DROP = ['.l.', 'lll', 'lll', '.l.'];

  function lcd(s, x, y, sz, col, al) {
    game.draw.text(s, x + 3, y + 3, { size: sz, color: D.d0, bold: true, align: al || 'center', font: 'monospace' });
    game.draw.text(s, x, y, { size: sz, color: col, bold: true, align: al || 'center', font: 'monospace' });
  }

  function segDist(px, py, a, b) {
    var vx = b.x - a.x, vy = b.y - a.y, L2 = vx * vx + vy * vy;
    var k = L2 > 0 ? Math.max(0, Math.min(1, ((px - a.x) * vx + (py - a.y) * vy) / L2)) : 0;
    return Math.hypot(px - (a.x + vx * k), py - (a.y + vy * k));
  }

  function inside(px, py) {
    for (var i = 1; i < MAIN.length; i++) if (segDist(px, py, MAIN[i - 1], MAIN[i]) < HALF) return true;
    for (var p = 0; p < POCKETS.length; p++) if (segDist(px, py, POCKETS[p][0], POCKETS[p][1]) < HALF - 10) return true;
    return false;
  }

  function spreadLoot() {
    loot = [];
    var along = [[0, 1, 0.6], [1, 2, 0.35], [2, 3, 0.6], [3, 4, 0.45], [4, 5, 0.5]];
    for (var i = 0; i < along.length; i++) {
      var a = MAIN[along[i][0]], b = MAIN[along[i][1]], k = along[i][2];
      loot.push({ x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, kind: 'grain', got: false });
    }
    for (var p = 0; p < POCKETS.length; p++) loot.push({ x: POCKETS[p][1].x, y: POCKETS[p][1].y, kind: 'seed', got: false });
  }

  function init() {
    part = 'ready'; pre = 0.8; time = TIME_LIMIT; ant = { x: MAIN[0].x, y: MAIN[0].y, face: 0 };
    grabbing = false; got = 0; bumps = 0; safeT = 0; holdT = 0; closeT = 0; done = false; blink = null; midDone = false;
    drips = [{ x: DRIPS[0], st: 'idle', t: 1.6 }, { x: DRIPS[1], st: 'idle', t: 3.0 }];
    spreadLoot();
  }

  // しずく(実プレイ・デモ共用): 0.7秒光ってから落ちる
  function dripTick(dt) {
    for (var i = 0; i < drips.length; i++) {
      var d = drips[i];
      d.t -= dt;
      if (d.st === 'idle' && d.t <= 0) { d.st = 'warn'; d.t = 0.7; game.audio.tone('A5', 0.05, { wave: 'square', volume: 0.03 }); }
      else if (d.st === 'warn' && d.t <= 0) { d.st = 'fall'; d.t = 0.45; }
      else if (d.st === 'fall' && d.t <= 0) { d.st = 'idle'; d.t = game.random(1.6, 2.6); }
    }
  }

  function dripHit() {
    for (var i = 0; i < drips.length; i++) if (drips[i].st === 'fall' && Math.abs(ant.x - drips[i].x) < 55) return drips[i];
    return null;
  }

  // アリを動かす(実プレイ・デモ共用)。戻り値 false = 壁にぶつかった
  function crawl(tx, ty, ghost) {
    var steps = Math.max(1, Math.ceil(Math.hypot(tx - ant.x, ty - ant.y) / 20));
    var sx = ant.x, sy = ant.y;
    for (var s = 1; s <= steps; s++) {
      var nx = sx + (tx - sx) * s / steps, ny = sy + (ty - sy) * s / steps;
      if (!inside(nx, ny)) { bump(nx, ny, ghost); return false; }
      if (Math.abs(nx - ant.x) + Math.abs(ny - ant.y) > 1) ant.face = Math.atan2(ny - ant.y, nx - ant.x);
      ant.x = nx; ant.y = ny;
    }
    for (var i = 0; i < loot.length; i++) {
      var L = loot[i];
      if (!L.got && Math.hypot(L.x - ant.x, L.y - ant.y) < 60) {
        L.got = true;
        game.fx.burst(L.x, L.y, { color: D.d3, count: 8, speed: 180 });
        game.audio.play('se_coin', 0.3);
        if (!ghost) {
          got++;
          game.feedback.good(L.x, L.y - 90, { text: L.kind === 'seed' ? 'NICE' : 'GOOD', color: D.d3, count: 6, sound: false });
          if (!midDone && got >= NEED / 2) { midDone = true; game.audio.play('se_milestone', 0.5); game.fx.popup(got + ' / ' + NEED, W / 2, 330, { color: D.d3, size: 70 }); }
          if (got === NEED) { game.audio.play('se_powerup', 0.4); game.fx.popup('GO!', MAIN[5].x, MAIN[5].y - 120, { color: D.d3, size: 56 }); }
        } else got++;
      }
    }
    if (got >= NEED && Math.hypot(ant.x - MAIN[5].x, ant.y - MAIN[5].y) < 70 && !ghost) wrap(true);
    return true;
  }

  function bump(x, y, ghost) {
    grabbing = false;
    if (ghost) { game.fx.burst(x, y, { color: D.d0, count: 8, speed: 160 }); return; }
    if (safeT > 0) return;
    bumps++; safeT = 0.9;
    blink = { x: ant.x, y: ant.y, t: 0.4 };
    game.feedback.bad(ant.x, ant.y - 100, { text: 'MISS', color: D.d0 });
    if (bumps >= MAX_BUMP) wrap(false); else holdT = 0.3;
  }

  function wrap(win) {
    if (part === 'stop' || part === 'end') return;
    done = win; part = 'stop'; holdT = 0.55; grabbing = false;
    game.audio.stopBgm();
    if (win) { game.fx.flash(D.d3, 0.25); game.audio.play('se_success', 0.6); }
    else {
      if (time <= 0) game.feedback.bad(W / 2, H * 0.42, { text: 'TIME UP', color: D.d0 });
      game.audio.play('se_failure', 0.6);
    }
  }

  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.6); state = S.PLAYING; init(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; init(); demo.t = 0; return; }
    game.audio.tone('E5', 0.03, { wave: 'square', volume: 0.02 });
  });
  game.onPress(function(x, y) {
    if (state !== S.PLAYING || part !== 'go' || holdT > 0) return;
    grabbing = Math.hypot(x - ant.x, y - ant.y) < 150;
    game.audio.play('se_tap', grabbing ? 0.3 : 0.1);
    if (!grabbing) game.fx.burst(x, y, { color: D.d1, count: 3, speed: 80 });
  });
  game.onMove(function(x, y) {
    if (state !== S.PLAYING || !grabbing || part !== 'go' || holdT > 0) return;
    if (crawl(x, y, false) && Math.floor(game.time.elapsed * 10) % 3 === 0) game.fx.burst(ant.x, ant.y, { color: D.d1, count: 1, speed: 40 });
  });
  game.onRelease(function() {
    if (grabbing) game.audio.tone('C5', 0.03, { wave: 'square', volume: 0.02 });
    grabbing = false;
  });

  // ── demo: 通路と脇穴をたどる。2周に1回、角を急いで壁にぶつかる ──
  var ROUTE = [MAIN[0], MAIN[1], MAIN[2], POCKETS[0][1], MAIN[2], MAIN[3], POCKETS[1][1], MAIN[3], MAIN[4], POCKETS[2][1], MAIN[4], MAIN[5]];
  var demo = { t: 0, gx: MAIN[0].x, gy: MAIN[0].y, leg: 0, k: 0, laps: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    if (demo.t <= dt || demo.leg >= ROUTE.length - 1) {
      if (demo.leg >= ROUTE.length - 1) demo.laps++;
      demo.leg = 0; demo.k = 0; ant.x = MAIN[0].x; ant.y = MAIN[0].y; got = 0; spreadLoot();
    }
    dripTick(dt);
    var a = ROUTE[demo.leg], b = ROUTE[demo.leg + 1];
    var len = Math.max(1, Math.hypot(b.x - a.x, b.y - a.y));
    demo.k += dt * 900 / len;
    var k = Math.min(1, demo.k);
    var tx = a.x + (b.x - a.x) * k, ty = a.y + (b.y - a.y) * k;
    if (demo.laps % 2 === 1 && demo.leg === 1 && k > 0.5 && k < 0.55) { tx += 160; }
    if (!crawl(tx, ty, true)) { ant.x = a.x + (b.x - a.x) * k; ant.y = a.y + (b.y - a.y) * k; }
    demo.gx = ant.x; demo.gy = ant.y;
    if (demo.k >= 1) { demo.leg++; demo.k = 0; }
  }

  // ── drawing ──
  function drawSoil() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, D.d2], [0.14, D.d1], [1, D.d0]]);
    // 地表の草(遠景)
    for (var g = 0; g < 18; g++) game.draw.rect(g * 62, 240 + Math.sin(t * 2 + g) * 4, 12, 40, D.d3, 0.8);
    // 土の粒
    for (var s = 0; s < 40; s++) game.draw.rect((s * 173) % W, 320 + (s * 97) % 1100, 10, 10, D.d1, 0.7);
    // 通路(掘られた部分を明るく)
    for (var i = 1; i < MAIN.length; i++) game.draw.line(MAIN[i - 1].x, MAIN[i - 1].y, MAIN[i].x, MAIN[i].y, D.d2, HALF * 2);
    for (var p = 0; p < POCKETS.length; p++) game.draw.line(POCKETS[p][0].x, POCKETS[p][0].y, POCKETS[p][1].x, POCKETS[p][1].y, D.d2, HALF * 2 - 20);
    for (var j = 0; j < MAIN.length; j++) game.draw.circle(MAIN[j].x, MAIN[j].y, HALF, D.d2);
    for (var q = 0; q < POCKETS.length; q++) game.draw.circle(POCKETS[q][1].x, POCKETS[q][1].y, HALF - 10, D.d2);
    // 女王の部屋(6つ集めると入口が開く)
    game.draw.circle(MAIN[5].x, MAIN[5].y + 20, 110, D.d3);
    game.draw.sprite(QUEEN, { k: D.d0, l: D.d1 }, MAIN[5].x, MAIN[5].y + 30 + Math.sin(t * 2) * 4, 14, { anchor: 'center' });
    if (got < NEED) for (var b = 0; b < 4; b++) game.draw.rect(MAIN[5].x - 120 + b * 70, MAIN[5].y - 90, 30, 60, D.d0);
    game.draw.rect(0, 0, W, H, D.d3, 0.03 + 0.03 * Math.sin(t * 1.3));
  }

  function drawStuff() {
    var t = game.time.elapsed;
    for (var i = 0; i < loot.length; i++) {
      if (loot[i].got) continue;
      game.draw.sprite(loot[i].kind === 'seed' ? SEED : GRAIN, { l: D.d0 }, loot[i].x, loot[i].y + Math.sin(t * 4 + i) * 5, 12, { anchor: 'center' });
    }
    for (var d = 0; d < drips.length; d++) {
      var dr = drips[d];
      if (dr.st === 'warn') {
        game.draw.sprite(DROP, { l: D.d3 }, dr.x, 300, 12, { anchor: 'center' });
        if (Math.floor(t * 12) % 2 === 0) game.draw.rect(dr.x - 55, 300, 110, 1100, D.d3, 0.18);
      } else if (dr.st === 'fall') {
        var fy = 300 + (1 - dr.t / 0.45) * 1100;
        game.draw.rect(dr.x - 55, 300, 110, 1100, D.d3, 0.35);
        game.draw.sprite(DROP, { l: D.d3 }, dr.x, fy, 16, { anchor: 'center' });
      }
    }
    var fr = ANT[Math.floor(t * 10) % 2];
    var vis = safeT > 0 ? Math.floor(t * 20) % 2 === 0 : true;
    if (vis) game.draw.sprite(fr, { k: D.d0 }, ant.x, ant.y, 12, { anchor: 'center', flipY: Math.sin(ant.face) < -0.3 });
    if (grabbing) game.draw.circle(ant.x, ant.y, 70, D.d3, 0.25);
  }

  function drawTray() {
    var t = game.time.elapsed;
    game.draw.rect(0, 1440, W, H - 1440, D.frame);
    game.draw.rect(40, 1470, W - 80, 330, D.d1);
    for (var i = 0; i < NEED; i++) game.draw.sprite(GRAIN, { l: i < got ? D.d3 : D.d0 }, 190 + i * 140, 1580 + (i < got ? Math.sin(t * 3 + i) * 4 : 0), 16, { anchor: 'center' });
    for (var b = 0; b < MAX_BUMP; b++) game.draw.sprite(ANT[0], { k: b < bumps ? D.d0 : D.d2 }, W / 2 - 110 + b * 110, 1720, 9, { anchor: 'center' });
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 228, D.frame);
    game.draw.rect(20, 20, W - 40, 190, D.d2);
    lcd(got + ' / ' + NEED, W / 2, 105, 68, D.d0);
    lcd(String(Math.ceil(time)), 60, 105, 52, D.d0, 'left');
    game.draw.rect(60, 165, W - 120, 22, D.d1);
    game.draw.rect(60, 165, (W - 120) * Math.max(0, time / TIME_LIMIT), 22, D.d0);
  }

  function score() { return got * 120 + (MAX_BUMP - bumps) * 80 + Math.ceil(time) * 20; }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;
    if (state === S.ATTRACT) {
      if (part === undefined) init();
      stepDemo(dt);
      drawSoil(); drawStuff(); drawTray();
      game.draw.hand(demo.gx, demo.gy + 30, { press: true, scale: 13 });
      game.draw.rect(0, 0, W, 228, D.frame);
      lcd(GAME_TITLE, W / 2, 105 + Math.sin(t * 2) * 6, 80, D.d3);
      lcd('HI-SCORE ' + game.best, W / 2, 190, 34, D.d2);
      if (Math.floor(t * 1.8) % 2 === 0) lcd('► 100円 投入 ◄', W / 2, H * 0.97, 40, D.d3);
      else lcd('INSERT COIN', W / 2, H * 0.97, 34, D.d2);
      return;
    }
    if (state === S.RESULT) {
      drawSoil(); drawTray();
      lcd(done ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.42, 92, D.d3);
      lcd('SCORE ' + (done ? score() : 0), W / 2, H * 0.48, 44, D.d3);
      if (Math.floor(t * 2) % 2 === 0) lcd('TAP TO CONTINUE', W / 2, H * 0.97, 38, D.d3);
      return;
    }

    if (part === 'ready') {
      pre -= dt;
      if (pre <= 0) { part = 'go'; game.audio.play('se_tap', 0.5); }
    } else if (part === 'go') {
      if (holdT > 0) holdT -= dt;
      else {
        time -= dt;
        if (safeT > 0) safeT -= dt;
        dripTick(dt);
        var hit = dripHit();
        if (hit && safeT <= 0) bump(ant.x, ant.y, false);
        if (time <= 0 && part === 'go') { time = 0; wrap(false); }
      }
    } else if (part === 'stop') {
      holdT -= dt;
      if (holdT <= 0) { part = 'end'; closeT = 1.4; }
    } else if (part === 'end') {
      closeT -= dt;
      if (closeT <= 0) {
        state = S.RESULT;
        var stats = { loot: got, bumps: bumps, seconds: Math.round((TIME_LIMIT - time) * 10) / 10 };
        if (done) game.end.success(score(), stats); else game.end.failure(stats);
        return;
      }
    }

    drawSoil(); drawStuff(); drawTray(); drawHud();
    if (blink) {
      blink.t -= dt;
      if (Math.floor(t * 16) % 2 === 0) game.draw.circle(blink.x, blink.y, 110, D.d3, 0.55);
      if (blink.t <= 0 && part !== 'stop') blink = null;
    }
    if (part === 'ready') lcd(pre > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.45, 100, D.d3);
    if (part === 'end') {
      game.draw.rect(0, H * 0.35, W, H * 0.17, D.frame, 0.92);
      lcd(done ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.4, 92, D.d3);
      if (done && score() > game.best) lcd('NEW RECORD', W / 2, H * 0.46, 46, D.d3);
      else if (done) lcd('BEST ' + game.best, W / 2, H * 0.46, 40, D.d2);
      else lcd('あと' + Math.max(1, NEED - got) + '個!', W / 2, H * 0.46, 48, D.d2);
    }
  });

  game.onStart(function() {
    game.audio.melody([
      ['C5', 0.25], ['E5', 0.25], ['G5', 0.25], ['E5', 0.25], ['D5', 0.25], ['F5', 0.25], ['A5', 0.5],
      ['G5', 0.25], ['E5', 0.25], ['C5', 0.25], ['E5', 0.25], ['D5', 0.5], ['G4', 0.5]
    ], { tempo: 150, wave: 'square', volume: 0.04, loop: true, bass: [['C3', 1], ['F2', 1], ['G2', 1], ['C3', 1]] });
    state = S.ATTRACT;
    init();
  });
})(game);
