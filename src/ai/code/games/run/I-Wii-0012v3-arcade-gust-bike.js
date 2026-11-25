// I-Wii-0012v3-arcade-gust-bike.js
// 突風よけ配達 — 台風一過の商店街を自転車で進み、横の路地から吹き出す突風の塊を、のれんの揺れで届く幅を読んでよける
// 操作: 画面の左半分を押し続けると左へ、右半分を押し続けると右へ寄る(離すと惰性で止まる)。路地口ののれんが揺れ出したら、揺れの強さ(1〜3本が暴れる)で突風が道のどこまで届くかを読み、届かない所まで寄る。弱い風は道の真ん中まで届かない
// 終わり: 20秒こぎ切って荷物が1つでも残っていればCLEAR。突風に3回当たって荷物を全部落とすとGAME OVER
// @mechanic: dodge
// @theme: post_typhoon_arcade_bike_delivery
// 世界観: 台風一過の商店街のアーケードで、パン屋の娘が配達自転車をこぎ、店と店の間の路地から左右に吹き出す突風の塊をよけて届け先まで進む
// 残るもの: 正誤(CLEAR/GAME OVER) + 進んだ距離(m)・すれすれでかわした回数・残った荷物・スコア
// スタイル: TOON SHADE

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // TOON SHADE: 黒い輪郭を一回り大きく先に描き、内側は明・暗の2色だけ
  var STYLE = { bg: ['#7f8fa6', '#5d6b80'], main: ['#ff8a3d', '#ffe08a', '#4fc3c9'], accent: ['#ff4f6d', '#ffffff'] };
  var C = {
    orange: STYLE.main[0], orangeDk: '#c9611f', cream: STYLE.main[1], creamDk: '#d9b45c', teal: STYLE.main[2], tealDk: '#2f8d93',
    pink: STYLE.accent[0], white: STYLE.accent[1], black: '#151515', road: '#6d7584', roadDk: '#596170', shop: '#e9d4b0', shopDk: '#bfa47c', alley: '#2b2f3a',
  };

  var GAME_TITLE = 'GUST RIDE';
  var TIME_LIMIT = 20;
  var LIVES = 3;
  var RX0 = 150, RX1 = 930, RW = RX1 - RX0;
  var GY = H * 0.66;
  var HALF = 40;
  var REACH = [0, 0.32, 0.48, 0.66];
  var TELE = 0.85;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var mode = S.ATTRACT;

  var girl, alleys, spawnT, spawnN, scrollY, speed, elapsedPlay, parcels, nices, hits, score, finalScore, metres, mileNext;
  var timeLeft, readyT, stopT, stopGust, fin, cleared, postT, invT, warnT, leaves;

  // 配達の娘(後ろ姿・ポニーテール)と自転車。こぐ3フレーム
  var RIDER_A = ['....kkkk....', '...kkkkkk...', '...kkkkkk...', '....kkkk....', '.....kk.....', '..ooooooo...', '.oOOOOOOOo..', '.oOOOOOOOo..', 's.oOOOOOo.s.', 's..bbbbb..s.', '...bb.bb....', '...bb..b....', '....xxxx....', '....xwwx....', '....xwwx....', '....xxxx....'];
  var RIDER_B = ['....kkkk....', '...kkkkkk...', '...kkkkkk...', '....kkkk....', '....kk......', '..ooooooo...', '.oOOOOOOOo..', '.oOOOOOOOo..', 's.oOOOOOo.s.', 's..bbbbb..s.', '....bbbb....', '....bb.bb...', '....xxxx....', '....xwwx....', '....xwwx....', '....xxxx....'];
  var RIDER_C = ['....kkkk....', '...kkkkkk...', '...kkkkkk...', '....kkkk....', '......kk....', '..ooooooo...', '.oOOOOOOOo..', '.oOOOOOOOo..', 's.oOOOOOo.s.', 's..bbbbb..s.', '...bb.bb....', '...b..bb....', '....xxxx....', '....xwwx....', '....xwwx....', '....xxxx....'];
  var RIDER_PAL = { k: '#3a2418', o: '#c9611f', O: '#ff8a3d', s: '#f2c39b', b: '#2f8d93', x: '#151515', w: '#9aa3b2' };
  var BOX = ['kkkkkk', 'kccCck', 'kccCck', 'kkkkkk'];
  var BOX_PAL = { k: '#151515', c: '#ffe08a', C: '#d9b45c' };
  var LEAF = ['.g.', 'ggg', '.G.'];
  var LEAF_PAL = { g: '#ff8a3d', G: '#c9611f' };

  function out(str, x, y, sz, color) {
    game.draw.text(str, x + 4, y + 4, { size: sz, color: C.black, bold: true });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true });
  }
  function toonRect(x, y, w, h, lit, dk) {
    game.draw.rect(x - 5, y - 5, w + 10, h + 10, C.black);
    game.draw.rect(x, y, w, h, lit);
    game.draw.rect(x, y + h * 0.62, w, h * 0.38, dk);
  }

  function initGame() {
    girl = { x: W / 2, vx: 0, wob: 0 };
    alleys = []; spawnT = 0.6; spawnN = 0; scrollY = 0; speed = 520; elapsedPlay = 0;
    parcels = LIVES; nices = 0; hits = 0; score = 0; finalScore = 0; metres = 0; mileNext = 100;
    timeLeft = TIME_LIMIT; readyT = 0.8; stopT = 0; stopGust = null; fin = false; cleared = false; postT = 0; invT = 0; warnT = 0;
    leaves = [];
    for (var i = 0; i < 10; i++) leaves.push({ x: RX0 + Math.random() * RW, y: Math.random() * H, r: Math.random() * 6 });
  }

  // 路地の並び: 強さ1〜3。後半は左右同時(届く幅の合計が道幅の8割以下=必ず隙間がある)
  function nextPattern(n) {
    var r = Math.random();
    if (n >= 6 && r < 0.35) {
      var weakSide = Math.random() < 0.5 ? 0 : 1, lv = [1, 1];
      if (Math.random() < 0.6) lv[1 - weakSide] = 2;
      return { lv: lv };
    }
    var side = Math.random() < 0.5 ? 0 : 1, l = [0, 0];
    l[side] = n === 0 ? 3 : n === 1 ? 1 : (r < 0.25 ? 1 : r < 0.6 ? 2 : 3);
    return { lv: l };
  }
  function spawnAlley(pat, y0) {
    alleys.push({ lv: pat.lv, y: y0, fired: false, t: 0, teleSnd: false, hitDone: false, nice: false });
    spawnN++;
  }
  function stepSpawn(dt) {
    spawnT -= dt;
    if (spawnT <= 0) {
      spawnAlley(nextPattern(spawnN), -140);
      spawnT = Math.max(0.85, 1.45 - elapsedPlay * 0.035);
    }
  }

  function reachPx(a, side, front) {
    return REACH[a.lv[side]] * RW * front;
  }
  function gustFront(a) {
    return Math.min(1, a.t / 0.28);
  }

  function stepGirl(dt, dir) {
    var ACC = 4200, VMAX = 950, FRIC = 2600;
    if (dir !== 0) girl.vx += dir * ACC * dt;
    else if (girl.vx > 0) girl.vx = Math.max(0, girl.vx - FRIC * dt);
    else girl.vx = Math.min(0, girl.vx + FRIC * dt);
    girl.vx = Math.max(-VMAX, Math.min(VMAX, girl.vx));
    girl.x += girl.vx * dt;
    if (girl.x < RX0 + HALF + 6) { girl.x = RX0 + HALF + 6; girl.vx = 0; }
    if (girl.x > RX1 - HALF - 6) { girl.x = RX1 - HALF - 6; girl.vx = 0; }
    if (girl.wob > 0) girl.wob -= dt;
  }

  // 路地・突風の進行(本番もデモも同じ)。当たりは stopT による hit-stop を起動
  function stepWorld(dt, live) {
    scrollY += speed * dt;
    for (var l = 0; l < leaves.length; l++) {
      var lf = leaves[l]; lf.y += speed * dt * 0.9;
      if (lf.y > H + 20) { lf.y = -20; lf.x = RX0 + Math.random() * RW; }
    }
    if (invT > 0) invT -= dt;
    for (var i = alleys.length - 1; i >= 0; i--) {
      var a = alleys[i];
      a.y += speed * dt;
      var lead = (GY - a.y) / speed;
      if (!a.fired && lead < TELE && !a.teleSnd) {
        a.teleSnd = true;
        var mx = Math.max(a.lv[0], a.lv[1]);
        game.audio.tone(mx === 3 ? 150 : mx === 2 ? 220 : 320, 0.3 + mx * 0.1, { wave: 'sawtooth', volume: 0.05 + mx * 0.015, slide: 120 });
      }
      if (!a.fired && a.y >= GY) { a.fired = true; a.t = 0; game.audio.play('se_jump', 0.25); }
      if (a.fired) {
        a.t += dt;
        var f = gustFront(a);
        if (a.t < 0.6 && !a.hitDone) {
          var hit = false;
          if (a.lv[0] && girl.x - HALF < RX0 + reachPx(a, 0, f)) hit = true;
          if (a.lv[1] && girl.x + HALF > RX1 - reachPx(a, 1, f)) hit = true;
          if (hit && invT <= 0) {
            a.hitDone = true;
            stopT = 0.42; stopGust = a;
            game.fx.flash('#ffffff', 0.15);
            game.audio.tone('C3', 0.3, { wave: 'square', volume: 0.1, slide: -90 });
            return;
          }
        }
        if (a.t >= 0.6 && !a.hitDone && !a.nice) {
          a.nice = true;
          var gap = 9999;
          if (a.lv[0]) gap = Math.min(gap, girl.x - HALF - (RX0 + reachPx(a, 0, 1)));
          if (a.lv[1]) gap = Math.min(gap, RX1 - reachPx(a, 1, 1) - (girl.x + HALF));
          if (gap < 70) {
            nices++;
            if (live) score += 50;
            game.feedback.good(girl.x, GY - 120, { text: 'NICE', color: C.cream, size: 56 });
          } else game.audio.tone('E5', 0.05, { wave: 'triangle', volume: 0.05 });
        }
      }
      if (a.y > H + 200 && a.t > 1) alleys.splice(i, 1);
    }
  }

  function resolveHit() {
    var a = stopGust;
    hits++; parcels--; girl.wob = 0.6; invT = 1.0;
    game.feedback.bad(girl.x, GY - 120, { text: 'MISS', color: C.pink, size: 64 });
    game.fx.burst(girl.x, GY - 60, { color: C.cream, count: 14, speed: 420 });
    if (a) a.hitDone = true;
    stopGust = null;
    if (mode === S.PLAYING && parcels <= 0) ending(false);
  }

  function ending(win) {
    if (fin) return;
    fin = true; cleared = win; postT = 1.4;
    finalScore = win ? score + Math.round(metres) * 5 + parcels * 300 : 0;
    game.audio.stopBgm();
    game.audio.play(win ? 'se_success' : 'se_failure', 0.55);
    if (win) {
      for (var i = 0; i < 5; i++) game.fx.burst(160 + i * 190, H * 0.4 + (i % 2) * 140, { color: i % 2 ? C.orange : C.teal, count: 18, speed: 500 });
      game.fx.flash(C.white, 0.2);
    }
  }

  // ---- 入力 ----
  var held = { on: false, x: W / 2 };
  game.onMove(function(x, y) {
    if (!held.on) return;
    // 指が中央線をまたいだら向きが切り替わった合図
    if ((held.x < W / 2) !== (x < W / 2) && mode === S.PLAYING) game.audio.tone(x < W / 2 ? 'C5' : 'D5', 0.03, { wave: 'square', volume: 0.04 });
    held.x = x;
  });
  game.onRelease(function(x, y) {
    if (held.on && mode === S.PLAYING && !fin) game.audio.tone('A4', 0.03, { wave: 'triangle', volume: 0.04 });
    held.on = false;
  });
  game.onPress(function(x, y) {
    held.on = true; held.x = x;
    if (mode !== S.PLAYING || fin || readyT > 0) return;
    if (stopT > 0) { game.audio.play('se_tap', 0.05); return; }
    game.audio.tone(x < W / 2 ? 'C5' : 'D5', 0.04, { wave: 'square', volume: 0.05 });
    game.fx.burst(girl.x + (x < W / 2 ? 40 : -40), GY + 70, { color: C.white, count: 4, speed: 160 });
  });
  game.onTap(function(x, y) {
    if (mode === S.ATTRACT) { game.audio.play('se_coin'); mode = S.PLAYING; initGame(); return; }
    if (mode === S.RESULT) { game.audio.play('se_tap'); mode = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (fin) game.audio.play('se_tap', 0.05);
  });

  // ---- 描画 ----
  function drawStreet(t) {
    game.draw.gradient(0, H, [[0, STYLE.bg[0]], [0.5, C.road], [1, STYLE.bg[1]]]);
    game.draw.rect(RX0, 0, RW, H, C.road);
    // 2トーンの路面帯+中央線(スクロール)
    for (var b = -1; b < 12; b++) {
      var by = ((scrollY * 0.999) % 200) + b * 200 - 200;
      game.draw.rect(RX0, by, RW, 100, C.roadDk);
      game.draw.rect(W / 2 - 8, by + 20, 16, 70, C.cream, 0.7);
    }
    // 水たまり
    for (var p = 0; p < 3; p++) {
      var py = ((scrollY * 1 + p * 640) % 1920) - 100;
      game.draw.circle(RX0 + 160 + p * 240, py, 60, '#8fa0b8', 0.6);
    }
    // 店並み(左右)
    for (var s = -1; s < 8; s++) {
      var sy = ((scrollY) % 300) + s * 300 - 300;
      toonRect(0, sy + 10, RX0 - 10, 270, C.shop, C.shopDk);
      toonRect(RX1 + 10, sy + 10, W - RX1 - 10, 270, C.shop, C.shopDk);
      game.draw.rect(RX0 - 34, sy + 30, 24, 230, s % 2 ? C.teal : C.orange);
      game.draw.rect(RX1 + 10, sy + 30, 24, 230, s % 2 ? C.orange : C.teal);
    }
    // アーケードの梁
    for (var k = -1; k < 6; k++) {
      var ky = ((scrollY * 1.15) % 420) + k * 420 - 420;
      game.draw.rect(0, ky, W, 14, C.black, 0.35);
    }
    for (var l = 0; l < leaves.length; l++) game.draw.sprite(LEAF, LEAF_PAL, leaves[l].x, leaves[l].y, 7, { anchor: 'center' });
  }

  function drawAlley(a, t) {
    var lead = (GY - a.y) / speed;
    var shaking = !a.fired && lead < TELE;
    for (var side = 0; side < 2; side++) {
      if (!a.lv[side]) continue;
      var lv = a.lv[side], x0 = side === 0 ? 0 : RX1, w = side === 0 ? RX0 : W - RX1;
      game.draw.rect(x0, a.y - 90, w, 180, C.black);
      game.draw.rect(x0 + 6, a.y - 84, w - 12, 168, C.alley);
      // のれん3本: 強さの本数だけ暴れる(静かなうちは垂れている)
      var mouth = side === 0 ? RX0 - 6 : RX1 + 6, dir = side === 0 ? 1 : -1;
      for (var n = 0; n < 3; n++) {
        var ny = a.y - 66 + n * 50, wild = shaking && n < lv;
        var sw = wild ? (0.4 + lv * 0.25) * (0.6 + 0.4 * Math.sin(t * (18 + lv * 6) + n * 2)) : 0.08;
        var ex = mouth + dir * (20 + sw * 110), ey = ny + 40 - sw * 30;
        game.draw.line(mouth, ny, ex, ey, C.black, 26);
        game.draw.line(mouth, ny, ex, ey, wild ? C.pink : C.cream, 16);
      }
      if (shaking) {
        // 渦(強さで大きさ)
        var rr = 20 + lv * 18 + Math.sin(t * 20) * 6;
        game.draw.circle(mouth + dir * 40, a.y, rr, C.white, 0.25 + lv * 0.08);
        if (lead < 0.35) {
          // 地面の影: 届く幅の予告
          var reach = REACH[lv] * RW;
          var zx = side === 0 ? RX0 : RX1 - reach;
          if (Math.floor(t * 14) % 2 === 0) game.draw.rect(zx, GY - 12, reach, 24, C.pink, 0.45);
        }
      }
      if (a.fired && a.t < 0.9) {
        var f = gustFront(a), fade = a.t < 0.6 ? 1 : Math.max(0, 1 - (a.t - 0.6) / 0.3);
        var len = reachPx(a, side, f), big = stopGust === a && Math.floor(t * 16) % 2 === 0;
        var gx = side === 0 ? RX0 : RX1 - len;
        var hgt = big ? 200 : 150;
        game.draw.rect(gx, GY - hgt / 2 - 6, len, hgt + 12, C.black, 0.25 * fade);
        game.draw.rect(gx, GY - hgt / 2, len, hgt, big ? '#ffffff' : C.white, (big ? 0.9 : 0.55) * fade);
        for (var c = 0; c < 5; c++) {
          var cx = side === 0 ? RX0 + len * (c + 1) / 5 : RX1 - len * (c + 1) / 5;
          game.draw.circle(cx, GY + Math.sin(t * 12 + c) * 30, big ? 46 : 30, '#ffffff', 0.6 * fade);
        }
      }
    }
  }

  function drawGirl(t) {
    var fr = [RIDER_A, RIDER_B, RIDER_C, RIDER_B][Math.floor(t * 9) % 4];
    var wob = girl.wob > 0 ? Math.sin(t * 40) * 18 : 0;
    var lean = girl.vx / 950 * 10;
    if (invT > 0 && Math.floor(t * 14) % 2 === 0 && !fin) return;
    game.draw.circle(girl.x, GY + 76, 52, C.black, 0.3);
    game.draw.sprite(fr, RIDER_PAL, girl.x + wob + lean, GY, 10, { anchor: 'center' });
    // 前かごの荷物
    for (var i = 0; i < parcels; i++) game.draw.sprite(BOX, BOX_PAL, girl.x + wob + lean - 36 + i * 36, GY - 108 - (i % 2) * 6, 6, { anchor: 'center' });
  }

  function drawHud(t) {
    game.draw.rect(0, 0, W, 230, C.black, 0.35);
    var pr = 1 - Math.max(0, timeLeft / TIME_LIMIT);
    game.draw.rect(70, 40, W - 140, 22, C.black);
    game.draw.rect(74, 44, (W - 148) * pr, 14, C.cream);
    game.draw.circle(74 + (W - 148) * pr, 51, 18, C.orange);
    out(Math.floor(metres) + 'm', W / 2, 140, 72, C.white);
    for (var i = 0; i < LIVES; i++) game.draw.sprite(BOX, i < parcels ? BOX_PAL : { k: '#151515', c: '#555555', C: '#444444' }, 90 + i * 70, 140, 9, { anchor: 'center' });
    out('' + score, W - 150, 140, 44, C.cream);
  }

  // 親指ゾーン: 左右の押し場所
  function drawThumb(t) {
    var dir = 0;
    if (mode === S.ATTRACT) dir = demo.dir;
    else if (held.on) dir = held.x < W / 2 ? -1 : 1;
    for (var s = 0; s < 2; s++) {
      var on = (s === 0 && dir < 0) || (s === 1 && dir > 0);
      var cx = s === 0 ? W * 0.25 : W * 0.75, cy = H * 0.87;
      game.draw.circle(cx, cy, 104, C.black, 0.8);
      game.draw.circle(cx, cy, 92, on ? C.orange : C.teal, on ? 1 : 0.55 + Math.sin(t * 4 + s) * 0.15);
      var d = s === 0 ? -1 : 1;
      game.draw.line(cx - d * 30, cy - 40, cx + d * 30, cy, C.white, 16);
      game.draw.line(cx - d * 30, cy + 40, cx + d * 30, cy, C.white, 16);
    }
  }

  function drawScene(t) {
    drawStreet(t);
    for (var i = 0; i < alleys.length; i++) drawAlley(alleys[i], t);
    drawGirl(t);
    drawThumb(t);
  }

  // ---- ATTRACT: 本物の stepWorld()/stepGirl() で走る。のれんの揺れを読んで寄せ、4本目の強い突風だけ読み違えて当たる ----
  var demo = { t: 0, x: W * 0.75, y: H * 0.87, dir: 0 };
  var DEMO_PATS = [{ lv: [3, 0] }, { lv: [0, 1] }, { lv: [1, 2] }, { lv: [0, 3] }];
  function demoTarget() {
    for (var i = 0; i < alleys.length; i++) {
      var a = alleys[i];
      if (a.fired || (GY - a.y) / speed > TELE) continue;
      var lo = RX0 + HALF + 20, hi = RX1 - HALF - 20;
      if (a.lv[0]) lo = RX0 + REACH[a.lv[0]] * RW + HALF + 30;
      if (a.lv[1]) hi = RX1 - REACH[a.lv[1]] * RW - HALF - 30;
      if (a.lv[1] === 3 && a.lv[0] === 0) return girl.x;
      if (girl.x >= lo && girl.x <= hi) return girl.x;
      return girl.x < lo ? lo : hi;
    }
    return girl.x;
  }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 7.2;
    if (cyc < dt || demo.t <= dt) { initGame(); readyT = 0; demo.n = 0; spawnT = 0.2; }
    if (stopT > 0) { stopT -= dt; if (stopT <= 0) resolveHit(); return; }
    // デモは決まった4本を流す
    spawnT -= dt;
    if (spawnT <= 0 && demo.n < DEMO_PATS.length) { spawnAlley(DEMO_PATS[demo.n], 200); demo.n++; spawnT = 1.2; }
    stepWorld(dt, false);
    var tx = demoTarget();
    demo.dir = Math.abs(tx - girl.x) > 24 ? (tx > girl.x ? 1 : -1) : 0;
    stepGirl(dt, demo.dir);
    var hx = demo.dir < 0 ? W * 0.25 : demo.dir > 0 ? W * 0.75 : demo.x;
    demo.x += (hx - demo.x) * Math.min(1, dt * 8);
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;

    if (mode === S.ATTRACT) {
      stepDemo(dt);
      drawScene(t);
      game.draw.hand(demo.x, demo.y, { press: demo.dir !== 0, scale: 13 });
      out(GAME_TITLE, W / 2, H * 0.06 + Math.sin(t * 2) * 5, 100, C.orange);
      out('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.11, 38, C.white);
      if (Math.floor(t * 1.8) % 2 === 0) out('► 100円 投入 ◄', W / 2, H * 0.97, 46, C.cream);
      else out('TAP TO START', W / 2, H * 0.97, 40, C.white);
      return;
    }

    if (mode === S.RESULT) {
      drawScene(t);
      game.draw.rect(90, H * 0.3, W - 180, 520, C.black, 0.88);
      game.draw.rect(90, H * 0.3, W - 180, 12, cleared ? C.orange : C.pink);
      out(cleared ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.35, 100, cleared ? C.cream : C.pink);
      out('SCORE ' + finalScore, W / 2, H * 0.41, 60, C.white);
      out(Math.floor(metres) + 'm   NICE ' + nices + '   ' + parcels + ' / ' + LIVES, W / 2, H * 0.46, 42, C.white);
      if (cleared && finalScore > game.best) out('NEW RECORD', W / 2, H * 0.51, 56, C.cream);
      else out('BEST ' + Math.max(game.best, finalScore), W / 2, H * 0.51, 42, C.cream);
      if (!cleared) out('あと' + Math.max(1, Math.ceil(TIME_LIMIT * 12 - metres)) + 'm!', W / 2, H * 0.27, 64, C.pink);
      if (Math.floor(t * 2) % 2 === 0) out('TAP TO CONTINUE', W / 2, H * 0.97, 40, C.white);
      return;
    }

    // ---- PLAYING ----
    if (fin) {
      postT -= dt;
      if (postT <= 0) {
        mode = S.RESULT;
        var stats = { metres: Math.floor(metres), nices: nices, hits: hits, parcels: parcels };
        if (cleared) game.end.success(finalScore, stats);
        else game.end.failure(stats);
      }
    } else if (readyT > 0) {
      readyT -= dt;
      if (readyT <= 0) game.audio.play('se_tap', 0.4);
    } else if (stopT > 0) {
      stopT -= dt;
      if (stopT <= 0) resolveHit();
    } else {
      timeLeft -= dt; elapsedPlay += dt;
      speed = 520 + elapsedPlay * 9;
      metres += dt * 12;
      if (metres >= mileNext) {
        game.audio.play('se_milestone', 0.5);
        game.fx.popup(mileNext + 'm', W / 2, H * 0.3, { color: C.cream, size: 84 });
        mileNext += 100;
      }
      var dir = held.on ? (held.x < W / 2 ? -1 : 1) : 0;
      stepGirl(dt, dir);
      stepSpawn(dt);
      stepWorld(dt, true);
      if (timeLeft < 4) {
        warnT -= dt;
        if (warnT <= 0) { warnT = 0.5; game.audio.tone('G5', 0.05, { wave: 'square', volume: 0.05 }); }
      }
      if (!fin && stopT <= 0 && timeLeft <= 0) { timeLeft = 0; ending(true); }
    }

    drawScene(t);
    drawHud(t);
    if (readyT > 0) out(readyT > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.45, 120, C.cream);
  });

  game.onStart(function() {
    game.audio.melody([
      ['G4', 0.5], ['B4', 0.5], ['D5', 0.5], ['B4', 0.5], ['C5', 1], ['A4', 1],
      ['F4', 0.5], ['A4', 0.5], ['C5', 0.5], ['A4', 0.5], ['B4', 1], ['G4', 1],
      ['E4', 0.5], ['G4', 0.5], ['B4', 0.5], ['D5', 0.5], ['C5', 0.5], ['B4', 0.5], ['A4', 1],
    ], { tempo: 150, wave: 'square', volume: 0.06, loop: true, bass: [['G2', 1], ['D3', 1], ['F2', 1], ['C3', 1], ['E2', 1], ['B2', 1], ['A2', 1], ['D3', 1]] });
    mode = S.ATTRACT;
    initGame();
  });
})(game);
