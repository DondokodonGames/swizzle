// I-3DS-0002v2-lagoon-canoe-stroke.js
// 入り江のカヌー — 左右交互の漕ぎで進み、同じ側を続けて漕いで舳先を振り、蓮・葦・流木をよけて対岸の桟橋へ
// 操作: 画面左半分=左舷で漕ぐ(舳先が右へ振れる)、右半分=右舷で漕ぐ(左へ振れる)。反対側の櫂が光ったら漕ぐと最も伸びる。早すぎる漕ぎは空回り。同じ側を続けて漕ぐと曲がる
// 終わり: 15秒以内に90m先の桟橋に着けばCLEAR。届かなければ進んだ距離が記録として残る(GAME OVER)
// @mechanic: alternate_tap
// @theme: island_lagoon_canoe
// 世界観: 南の島の湖で、カヌー漕ぎの少女が左右交互にパドルを入れて進み、漕ぐ側で舳先を振って蓮の葉と葦の茂みと流木をかわし、対岸の桟橋を目指す
// 残るもの: 正誤(CLEAR/GAME OVER) + 進んだ距離(m)・残り時間・きれいに漕げた回数
// スタイル: 90s 16bit

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s 16bit: 空グラデ+遠景+近景の多層、暗色輪郭+ハイライト
  var STYLE = { bg: ['#1f8fb8', '#38c0c8', '#f0d890'], main: ['#e8743a', '#3aa858', '#7a4a2a'], accent: ['#ffe040', '#ff4a6a'] };
  var C = {
    deep: STYLE.bg[0], shallow: STYLE.bg[1], sand: STYLE.bg[2], canoe: STYLE.main[0], leaf: STYLE.main[1], wood: STYLE.main[2],
    glow: STYLE.accent[0], hot: STYLE.accent[1], ink: '#1a2030', white: '#ffffff', reed: '#7aa83a', lotus: '#f4a0c0',
  };

  var GAME_TITLE = 'LAGOON CANOE';
  var TIME_LIMIT = 15;
  var GOAL_M = 90;
  var PXM = 40;
  var CANOE_Y = Math.round(H * 0.66);
  var READY_GAP = 0.25, SPLASH_GAP = 0.15;

  // コース(固定配置: 運ではなく操船で抜ける)
  var OBST = [
    { m: 14, x: 430, type: 'lotus', r: 75 }, { m: 25, x: 690, type: 'lotus', r: 75 },
    { m: 38, x: 360, type: 'reed', w: 210 }, { m: 47, x: 730, type: 'reed', w: 210 }, { m: 56, x: 380, type: 'reed', w: 210 },
    { m: 70, x: 360, type: 'log', w: 260 }, { m: 81, x: 740, type: 'log', w: 260 },
  ];
  var GUSTS = [{ m: 67, dir: -1 }, { m: 78, dir: 1 }];
  var BUOYS = [30, 60];

  function bankL(m) { if (m < 28) return 110; if (m < 33) return 110 + (m - 28) * 26; if (m < 60) return 240; if (m < 64) return 240 - (m - 60) * 20; return 160; }
  function bankR(m) { if (m < 28) return 970; if (m < 33) return 970 - (m - 28) * 26; if (m < 60) return 840; if (m < 64) return 840 + (m - 60) * 20; return 920; }

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var dist, v, x, ang, clock, lastSide, sinceStroke, streak, bestStreak, clean, bumps, readyT, over, won, stopT, outroT, focus;
  var gusts, gustPush, buoyHit, stroke, splashes, milestoneShown, cheer;

  function initGame() {
    dist = 0; v = 0; x = W / 2; ang = 0; clock = TIME_LIMIT; lastSide = null; sinceStroke = 9; streak = 0; bestStreak = 0; clean = 0; bumps = 0;
    readyT = 0.8; over = false; won = false; stopT = 0; outroT = 0; focus = null;
    gusts = []; for (var i = 0; i < GUSTS.length; i++) gusts.push({ m: GUSTS[i].m, dir: GUSTS[i].dir, t: -1 });
    gustPush = 0; buoyHit = [false, false]; stroke = { L: 0, R: 0 }; splashes = []; milestoneShown = false; cheer = 0;
  }

  function sy(m) { return CANOE_Y - (m - dist) * PXM; }

  // ---- 漕ぎ(本番もデモも同じ) ----
  function paddle(side, demo) {
    var gap = sinceStroke;
    var alt = lastSide !== null && lastSide !== side;
    var power, q;
    if (gap < SPLASH_GAP) { power = 0.1; q = 'splash'; }
    else if (gap < READY_GAP) { power = 0.3; q = 'early'; }
    else { power = alt ? 1 : 0.75; q = alt ? 'good' : 'turn'; }
    if (q === 'good') { streak++; clean++; if (streak > bestStreak) bestStreak = streak; } else if (q === 'splash' || q === 'early') streak = 0;
    var mult = 1 + Math.min(streak, 6) * 0.05;
    v += power * 2.3 * mult;
    ang += (side === 'L' ? 1 : -1) * (q === 'splash' ? 0.06 : 0.25);
    ang = Math.max(-0.6, Math.min(0.6, ang));
    lastSide = side; sinceStroke = 0;
    stroke[side] = 0.25;
    var bx = x + (side === 'L' ? -70 : 70), by = CANOE_Y + 30;
    splashes.push({ x: bx, y: by, t: 0.5, big: q === 'good' });
    if (q === 'splash') {
      game.audio.tone(140, 0.06, { wave: 'square', volume: 0.07 });
      game.fx.burst(bx, by, { color: '#9ad8f0', count: 4, speed: 90 });
    } else {
      game.audio.tone(q === 'good' ? 330 + Math.min(streak, 8) * 40 : 260, 0.07, { wave: 'triangle', volume: 0.1, slide: 120 });
      game.fx.burst(bx, by, { color: C.white, count: q === 'good' ? 8 : 5, speed: 160 });
    }
    if (!demo && streak === 8 && !milestoneShown) {
      milestoneShown = true;
      game.fx.popup('x8 COMBO', W / 2, H * 0.42, { color: C.glow, size: 64 });
      game.audio.play('se_milestone', 0.45);
    }
  }

  function hullPoints() {
    var pts = [];
    for (var k = -3; k <= 3; k += 3) pts.push({ x: x + Math.sin(ang) * k * 30, y: CANOE_Y - Math.cos(ang) * k * 30 });
    return pts;
  }

  function bump(o, px, py, demo) {
    v = 0; ang *= -0.4; bumps++; streak = 0;
    for (var g = 0; g < gusts.length; g++) if (gusts[g].t >= 0) gusts[g].t = 1.6;
    focus = { x: px, y: py, o: o };
    stopT = 0.35;
    cheer = -1;
    game.feedback.bad(px, py, { text: 'MISS', shake: demo ? 6 : 12 });
    game.audio.play('se_break', 0.35);
  }

  // 戻り値: なし。衝突時は stopT が立つ
  function stepBoat(dt, demo) {
    sinceStroke += dt;
    v *= Math.exp(-0.95 * dt);
    ang *= Math.exp(-2.5 * dt);
    dist += v * dt;
    x += Math.sin(ang) * (v + 2) * PXM * 2.2 * dt + gustPush * dt;
    // 突風(0.6秒前に水面の筋で予告)
    gustPush = 0;
    for (var g = 0; g < gusts.length; g++) {
      var gu = gusts[g];
      if (gu.t < 0 && dist >= gu.m - 7) { gu.t = 0; game.audio.tone(900, 0.5, { wave: 'sine', volume: 0.04, slide: -600 }); }
      if (gu.t >= 0 && gu.t < 1.6) { gu.t += dt; if (gu.t > 0.6) gustPush = gu.dir * 190; }
    }
    // 岸
    var pts = hullPoints();
    for (var i = 0; i < pts.length; i++) {
      var pm = dist + (CANOE_Y - pts[i].y) / PXM;
      if (pts[i].x < bankL(pm) + 30) { x += 40; bump(null, pts[i].x, pts[i].y, demo); return; }
      if (pts[i].x > bankR(pm) - 30) { x -= 40; bump(null, pts[i].x, pts[i].y, demo); return; }
    }
    // 障害物
    for (var j = 0; j < OBST.length; j++) {
      var o = OBST[j];
      var oy = sy(o.m);
      if (oy < CANOE_Y - 200 || oy > CANOE_Y + 200) continue;
      for (var p = 0; p < pts.length; p++) {
        var hit = o.type === 'lotus' ? game.hit.circle(pts[p].x, pts[p].y, 30, o.x, oy, o.r) : game.hit.rect(pts[p].x - 30, pts[p].y - 30, 60, 60, o.x - o.w / 2, oy - (o.type === 'log' ? 28 : 45), o.w, o.type === 'log' ? 56 : 90);
        if (hit) {
          // 跳ね返り: 障害物の手前まで押し戻し、横へも少しずらす
          dist = Math.max(0, o.m - ((o.type === 'lotus' ? o.r : 45) + 130) / PXM);
          x += x < o.x ? -40 : 40;
          bump(o, o.x, oy, demo);
          return;
        }
      }
    }
  }

  function checkBuoys(demo) {
    for (var b = 0; b < BUOYS.length; b++) {
      if (!buoyHit[b] && dist >= BUOYS[b]) {
        buoyHit[b] = true;
        if (!demo) {
          game.feedback.good(W / 2, CANOE_Y - 200, { text: BUOYS[b] + 'm', color: C.glow, size: 60 });
          game.audio.play('se_milestone', 0.35);
        }
      }
    }
  }

  function finish(ok) {
    over = true; won = ok; outroT = 1.5;
    game.audio.stopBgm();
    if (ok) {
      cheer = 2;
      game.audio.play('se_success', 0.55);
      game.fx.burst(x, CANOE_Y, { color: C.glow, count: 30, speed: 460 });
      game.fx.burst(W / 2, sy(GOAL_M), { color: C.lotus, count: 24, speed: 380 });
      game.fx.flash(C.white, 0.2);
    } else {
      cheer = -1;
      game.audio.play('se_failure', 0.5);
    }
  }

  function finalScore() { return Math.round(Math.min(dist, GOAL_M) * 10) + (won ? Math.round(clock * 50) : 0); }

  // ---- 入力 ----
  game.onPress(function(x0, y0, id) {
    if (state !== S.PLAYING || over || readyT > 0 || stopT > 0) return;
    if (y0 < 230) { game.audio.tone(200, 0.03, { wave: 'triangle', volume: 0.03 }); return; }
    paddle(x0 < W / 2 ? 'L' : 'R', false);
  });

  game.onTap(function(x0, y0) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { game.audio.play('se_tap'); state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });

  // ---- 描画 ----
  function label(str, lx, ly, sz, col) {
    game.draw.text(str, lx + 4, ly + 4, { size: sz, color: C.ink, bold: true, align: 'center' });
    game.draw.text(str, lx, ly, { size: sz, color: col, bold: true, align: 'center' });
  }

  var PALM = ['...gg.gg...', '..gggggggg.', '.gg..b..gg.', 'g....b....g', '.....b.....', '.....b.....', '....bbb....'];
  var GIRL_A = ['..hhhh..', '.hhhhhh.', 'hhffffhh', '.fefef..', '.ffmff..', '..rrrr..', '.rrrrrr.', '.r.rr.r.'];
  var GIRL_B = ['..hhhh..', '.hhhhhh.', 'hhffffhh', '.fefef..', '.ffoff..', '..rrrr..', '.rrrrrr.', 'r..rr..r'];
  var FROG = ['.e..e.', 'gggggg', 'gwggwg', '.gggg.'];

  function drawWater() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, C.deep], [0.6, C.shallow], [1, '#5ad0d0']]);
    // 波の筋(進んだ分だけ流れる)
    for (var i = 0; i < 26; i++) {
      var wy = ((i * 97 + dist * PXM) % (H + 80)) - 40;
      var wx = (i * 211 + Math.sin(t + i) * 30) % W;
      game.draw.rect(wx, wy, 80, 6, C.white, 0.22);
    }
    // 岸(帯ごとに砂浜とジャングル)
    for (var yy = 0; yy < H; yy += 40) {
      var m = dist + (CANOE_Y - yy) / PXM;
      var l = bankL(m), r = bankR(m);
      game.draw.rect(0, yy, l, 40, C.sand);
      game.draw.rect(0, yy, l - 40, 40, '#3a8a48');
      game.draw.rect(r, yy, W - r, 40, C.sand);
      game.draw.rect(r + 40, yy, W - r - 40, 40, '#3a8a48');
      game.draw.rect(l - 6, yy, 6, 40, '#c8b070');
      game.draw.rect(r, yy, 6, 40, '#c8b070');
    }
    // 岸のヤシ(遠景の目印)
    for (var p = 0; p < 30; p++) {
      var pm = p * 6 + 3;
      var py = sy(pm);
      if (py < -100 || py > H + 100) continue;
      var left = p % 2 === 0;
      game.draw.sprite(PALM, { g: '#2a7a3a', b: '#7a5a3a' }, left ? bankL(pm) - 90 : bankR(pm) + 90, py, 14, { anchor: 'center', flipX: !left });
    }
  }

  function drawCourse() {
    var t = game.time.elapsed;
    for (var i = 0; i < OBST.length; i++) {
      var o = OBST[i];
      var oy = sy(o.m);
      if (oy < -120 || oy > H + 120) continue;
      var hl = focus && focus.o === o && stopT > 0;
      if (o.type === 'lotus') {
        game.draw.circle(o.x + 6, oy + 8, o.r, C.ink, 0.25);
        game.draw.circle(o.x, oy, o.r * (hl ? 1.2 : 1), hl ? C.white : C.leaf);
        game.draw.circle(o.x - 20, oy - 20, o.r * 0.5, '#5ac878');
        game.draw.circle(o.x + 18, oy - 8, 22, C.lotus);
        game.draw.sprite(FROG, { e: C.ink, g: '#6ad048', w: C.white }, o.x - 30, oy + 20 + Math.sin(t * 4 + i) * 3, 9, { anchor: 'center' });
      } else if (o.type === 'reed') {
        game.draw.rect(o.x - o.w / 2, oy - 45, o.w, 90, hl ? C.white : '#4a7a2a', 0.85);
        for (var k = 0; k < o.w; k += 26) {
          var sw = Math.sin(t * 3 + k * 0.1) * 8;
          game.draw.line(o.x - o.w / 2 + k + 10, oy + 40, o.x - o.w / 2 + k + 10 + sw, oy - 70, C.reed, 7);
          game.draw.rect(o.x - o.w / 2 + k + 6 + sw, oy - 80, 9, 22, C.wood);
        }
      } else {
        game.draw.rect(o.x - o.w / 2 - 4, oy - 32, o.w + 8, 64, C.ink);
        game.draw.rect(o.x - o.w / 2, oy - 28, o.w, 56, hl ? C.white : C.wood);
        game.draw.rect(o.x - o.w / 2, oy - 28, o.w, 12, '#a87a4a');
        game.draw.circle(o.x + o.w / 2, oy, 28, '#c89a6a');
        game.draw.circle(o.x + o.w / 2, oy, 14, C.wood);
      }
    }
    // ブイ(区間の目印)と桟橋
    for (var b = 0; b < BUOYS.length; b++) {
      var by = sy(BUOYS[b]);
      if (by < -80 || by > H + 80) continue;
      for (var s = 0; s < 2; s++) {
        var bx = s === 0 ? bankL(BUOYS[b]) + 40 : bankR(BUOYS[b]) - 40;
        game.draw.circle(bx, by, 26, buoyHit[b] ? C.glow : C.hot);
        game.draw.rect(bx - 26, by - 6, 52, 12, C.white);
      }
    }
    var gy = sy(GOAL_M);
    if (gy > -200 && gy < H + 50) {
      game.draw.rect(300, gy - 160, 480, 120, C.ink);
      game.draw.rect(306, gy - 154, 468, 108, '#c8925a');
      for (var pl = 0; pl < 8; pl++) game.draw.rect(312 + pl * 58, gy - 154, 6, 108, C.wood);
      for (var post = 0; post < 4; post++) game.draw.rect(320 + post * 140, gy - 40, 18, 40, C.wood);
      var flagW = Math.sin(t * 6) * 8;
      game.draw.line(540, gy - 154, 540, gy - 280, C.white, 6);
      game.draw.rect(540, gy - 280, 90 + flagW, 54, C.hot);
    }
    // 突風の予告: 水面を走る白い筋
    for (var g = 0; g < gusts.length; g++) {
      var gu = gusts[g];
      if (gu.t >= 0 && gu.t < 1.6) {
        for (var ln = 0; ln < 7; ln++) {
          var lx = ((gu.t * 900 * gu.dir + ln * 160) % W + W) % W;
          var ly = CANOE_Y - 420 + ln * 110;
          game.draw.line(lx, ly, lx - gu.dir * 140, ly, C.white, gu.t < 0.6 ? 4 : 8);
        }
        if (gu.t < 0.6 && Math.floor(t * 10) % 2 === 0) game.draw.circle(gu.dir > 0 ? 80 : W - 80, CANOE_Y - 260, 34, C.hot);
      }
    }
  }

  function drawCanoe() {
    var t = game.time.elapsed;
    // 船体: 舳先の向きに沿って円を並べる(回転は自前計算)
    for (var k = -5; k <= 5; k++) {
      var r = 34 - Math.abs(k) * 4.5;
      var hx = x + Math.sin(ang) * k * 20, hy = CANOE_Y - Math.cos(ang) * k * 20;
      game.draw.circle(hx + 6, hy + 8, r + 4, C.ink, 0.25);
      game.draw.circle(hx, hy, r + 5, '#8a3a1a');
    }
    for (var k2 = -5; k2 <= 5; k2++) {
      var r2 = 30 - Math.abs(k2) * 4.5;
      game.draw.circle(x + Math.sin(ang) * k2 * 20, CANOE_Y - Math.cos(ang) * k2 * 20, Math.max(4, r2), C.canoe);
    }
    // 引き波
    if (v > 1) for (var w = 1; w < 4; w++) game.draw.circle(x - Math.sin(ang) * (110 + w * 40), CANOE_Y + Math.cos(ang) * (110 + w * 40), 10 + w * 6, C.white, 0.25 / w);
    // パドル: 漕いだ側は前から後ろへ掻く。次に漕ぐ側の水かきが光る(漕ぎどき)
    var sides = ['L', 'R'];
    for (var i = 0; i < 2; i++) {
      var sd = sides[i], dir = sd === 'L' ? -1 : 1;
      var pull = stroke[sd] > 0 ? 1 - stroke[sd] / 0.25 : 0;
      var bx = x + dir * 90, by = CANOE_Y - 70 + pull * 150;
      game.draw.line(x + dir * 20, CANOE_Y - 10, bx, by, '#d8b080', 8);
      var ready = lastSide !== sd && sinceStroke >= READY_GAP && stroke[sd] <= 0;
      if (ready) game.draw.circle(bx, by, 34 + Math.sin(t * 16) * 4, C.glow, 0.6);
      game.draw.circle(bx, by, 20, ready ? C.white : '#c89a6a');
    }
    var happy = cheer > 0 || streak >= 3;
    var fr = Math.floor(t * 4) % 2 === 0 ? GIRL_A : GIRL_B;
    var hop = cheer > 0 ? Math.abs(Math.sin(t * 10)) * 16 : 0;
    game.draw.sprite(fr, { h: '#f4e0a0', f: '#c88a5a', e: C.ink, m: cheer < 0 ? '#5a2a2a' : C.hot, o: C.hot, r: happy ? '#ff7aa0' : '#e85a7a' }, x, CANOE_Y - 6 - hop, 11, { anchor: 'center' });
    if (focus && stopT > 0 && !focus.o) game.draw.circle(focus.x, focus.y, 70, C.white, 0.6);
  }

  function drawSplashes(dt) {
    for (var i = splashes.length - 1; i >= 0; i--) {
      var s = splashes[i];
      s.t -= dt; s.y += v * PXM * dt;
      if (s.t <= 0) { splashes.splice(i, 1); continue; }
      var k = 1 - s.t / 0.5;
      game.draw.circle(s.x, s.y, 20 + k * (s.big ? 60 : 36), C.white, 0.4 * (1 - k));
    }
  }

  function drawPads() {
    var sides = ['L', 'R'];
    for (var i = 0; i < 2; i++) {
      var sd = sides[i];
      var px = i === 0 ? W * 0.25 : W * 0.75, py = H * 0.875;
      var ready = lastSide !== sd && sinceStroke >= READY_GAP;
      var fill = lastSide === sd ? 0 : Math.min(1, sinceStroke / READY_GAP);
      game.draw.circle(px, py + 10, 130, C.ink, 0.35);
      game.draw.circle(px, py, 130, stroke[sd] > 0 ? C.glow : '#1e6a8a');
      game.draw.circle(px, py, 130 * fill, ready ? '#ffe98a' : '#4aa0c0', 0.8);
      game.draw.line(px + (i === 0 ? 40 : -40), py - 80, px - (i === 0 ? 40 : -40), py + 80, C.wood, 14);
      game.draw.circle(px - (i === 0 ? 40 : -40), py + 80, 30, '#c89a6a');
    }
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 230, C.ink, 0.55);
    label(Math.floor(Math.min(dist, GOAL_M)) + 'm', 200, 100, 64, C.white);
    label('SCORE ' + finalScore(), 200, 175, 34, C.glow);
    // 進捗: カヌーが桟橋へ近づくゲージ
    var prog = Math.min(1, dist / GOAL_M);
    game.draw.rect(420, 70, 560, 22, '#2a4a6a');
    game.draw.rect(420, 70, 560 * prog, 22, C.shallow);
    game.draw.circle(420 + 560 * prog, 81, 20, C.canoe);
    game.draw.rect(970, 50, 16, 60, C.hot);
    label(Math.floor(Math.min(dist, GOAL_M)) + ' / ' + GOAL_M, 700, 150, 32, C.white);
    // 残り時間: 縮むバー
    var tk = Math.max(0, clock / TIME_LIMIT);
    game.draw.rect(420, 180, 560 * tk, 18, clock < 4 && Math.floor(game.time.elapsed * 6) % 2 ? C.hot : C.glow);
    if (streak >= 2) label('x' + streak, 960, 150, 36, C.glow);
  }

  function drawScene(dt) {
    drawWater();
    drawCourse();
    drawSplashes(dt);
    drawCanoe();
    drawPads();
  }

  // ---- ATTRACT: 本物の操船AI(交互漕ぎ+同じ側で回避)。最後は葦にぶつかって見せる ----
  var demo = { t: 0, next: 0, lp: 0, rp: 0 };
  function demoTarget(careless) {
    for (var i = 0; i < OBST.length; i++) {
      var o = OBST[i];
      if (o.m > dist - 3.5 && o.m < dist + 14) {
        if (careless) return o.x;
        var half = o.type === 'lotus' ? o.r : o.w / 2;
        var gl = o.x - half - 80, gr = o.x + half + 80;
        var okL = gl - bankL(o.m) > 60, okR = bankR(o.m) - gr > 60;
        if (okL && okR) return Math.abs(gl - x) < Math.abs(gr - x) ? gl : gr;
        return okL ? gl : gr;
      }
    }
    return (bankL(dist + 6) + bankR(dist + 6)) / 2;
  }
  // 予告の出た突風で流される見込み(px)
  function gustAhead() {
    var push = 0;
    for (var g = 0; g < gusts.length; g++) {
      var gu = gusts[g];
      if (gu.t >= 0 && gu.t < 1.6) push += gu.dir * 190 * Math.min(0.7, 1.6 - Math.max(gu.t, 0.6));
    }
    return push;
  }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 8.5;
    if (cyc < dt || demo.t <= dt) { initGame(); readyT = 0; demo.next = 0.3; }
    if (stopT > 0) { stopT -= dt; if (stopT <= 0) focus = null; }
    else {
      demo.next -= dt;
      if (demo.next <= 0) {
        demo.next = 0.3;
        var careless = cyc > 5.0;
        // 今の舳先の向きのまま流れ着く位置を読み、狙いとのずれで漕ぐ側を決める
        var pred = x + Math.sin(ang) * (v + 2) * PXM * 2.2 / 2.5 + gustAhead();
        var err = demoTarget(careless) - pred;
        var side = err > 35 ? 'L' : (err < -35 ? 'R' : (lastSide === 'L' ? 'R' : 'L'));
        if (side === 'L') demo.lp = 0.15; else demo.rp = 0.15;
        paddle(side, true);
      }
      stepBoat(dt, true);
    }
    demo.lp -= dt; demo.rp -= dt;
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;
    if (stroke.L > 0) stroke.L -= dt;
    if (stroke.R > 0) stroke.R -= dt;
    if (cheer > 0) cheer -= dt * 0.4; else if (cheer < 0) cheer = Math.min(0, cheer + dt * 0.8);

    if (state === S.ATTRACT) {
      stepDemo(dt);
      drawScene(dt);
      game.draw.hand(W * 0.25, H * 0.875 - (demo.lp > 0 ? 0 : 60), { press: demo.lp > 0, scale: 14 });
      game.draw.hand(W * 0.75, H * 0.875 - (demo.rp > 0 ? 0 : 60), { press: demo.rp > 0, scale: 14 });
      game.draw.rect(0, 0, W, 230, C.ink, 0.55);
      label(GAME_TITLE, W / 2, 100, 84 + Math.sin(t * 3) * 3, C.glow);
      label('HI-SCORE ' + (game.best > 0 ? game.best : 0), W / 2, 185, 36, C.white);
      if (Math.floor(t * 2) % 2 === 0) label('► 100円 投入 ◄', W / 2, H * 0.78, 50, C.hot);
      else label('TAP TO START', W / 2, H * 0.78, 44, C.white);
      return;
    }

    if (state === S.RESULT) {
      drawScene(dt);
      game.draw.rect(0, H * 0.3, W, H * 0.26, C.ink, 0.65);
      label(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.37, 96, won ? C.glow : C.hot);
      label(Math.floor(Math.min(dist, GOAL_M)) + 'm', W / 2, H * 0.43, 64, C.white);
      label('SCORE ' + finalScore(), W / 2, H * 0.48, 44, C.white);
      if (finalScore() > game.best && finalScore() > 0) label('NEW RECORD', W / 2, H * 0.53, 48, C.glow);
      else label('BEST ' + Math.max(game.best, finalScore()), W / 2, H * 0.53, 36, C.white);
      if (!won) label('あと' + Math.max(1, Math.ceil(GOAL_M - dist)) + 'm!', W / 2, H * 0.32, 48, C.glow);
      if (Math.floor(t * 2) % 2 === 0) label('TAP TO CONTINUE', W / 2, H * 0.6, 36, C.white);
      return;
    }

    // ---- PLAYING ----
    if (over) {
      outroT -= dt;
      dist += v * dt * 0.5; v *= Math.exp(-2 * dt);
      if (outroT <= 0) {
        state = S.RESULT;
        var stats = { meters: Math.floor(Math.min(dist, GOAL_M)), clean: clean, bumps: bumps, bestStreak: bestStreak };
        if (won) game.end.success(finalScore(), stats);
        else game.end.record(finalScore(), stats);
      }
    } else if (readyT > 0) {
      readyT -= dt;
      if (readyT <= 0) game.audio.play('se_tap', 0.4);
    } else if (stopT > 0) {
      stopT -= dt;
      clock -= dt;
      if (stopT <= 0) focus = null;
    } else {
      clock -= dt;
      stepBoat(dt, false);
      checkBuoys(false);
      if (dist >= GOAL_M) { dist = GOAL_M; finish(true); }
      else if (clock <= 0) { clock = 0; focus = { x: x, y: CANOE_Y, o: null }; finish(false); }
    }

    drawScene(dt);
    drawHud();
    if (readyT > 0) label(readyT > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.45, 100, C.glow);
    if (over && !won) label('TIME UP', W / 2, H * 0.45, 90, C.hot);
  });

  game.onStart(function() {
    game.audio.melody([
      ['G4', 0.5], ['B4', 0.5], ['D5', 0.5], ['B4', 0.5], ['E5', 1], ['D5', 1],
      ['C5', 0.5], ['A4', 0.5], ['B4', 0.5], ['G4', 0.5], ['A4', 2],
    ], { tempo: 132, wave: 'triangle', volume: 0.05, loop: true, bass: [['G2', 1], ['D3', 1], ['C3', 1], ['D3', 1]] });
    state = S.ATTRACT;
    initGame();
  });
})(game);
