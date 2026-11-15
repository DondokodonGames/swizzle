// I-Switch-0001v3-snowtown-roof-eave-leap.js
// 軒先ぎりぎり屋根跳び — 雪下ろしの若者が町家の屋根を駆け、軒先の縁ぎりぎりで踏み切るほど高得点で隣の屋根へ跳び移り、通りの先の湯屋の屋根まで走り切る
// 操作: 走りは自動。タップで跳ぶ(屋根に乗っている時だけ。跳ぶ高さと距離は毎回同じ)。踏み切った足と軒先の縁との距離が近いほど高得点(PERFECT/GOOD/NICE)。早く跳びすぎると届かずに落ちる。軒先の外に白くせり出した雪庇(つらら付き)は屋根ではなく、乗ると崩れて落ちる。落ちると手袋を1つ失い、次の屋根の上から走り直す
// 終わり: 12軒目の湯屋の屋根に着けばCLEAR(跳び方の点+残り手袋の加点)。3回落ちる/20秒で着けなければGAME OVER
// @mechanic: near_miss
// @theme: snowtown_roof_eave_leap
// 世界観: 雪国の町の夜、雪下ろしを頼まれた若者がスコップを担いで町家の屋根から屋根へ、軒先ぎりぎりで踏み切って跳び移りながら、通りの先に湯気を上げる湯屋の屋根まで駆けていく
// 残るもの: 正誤(CLEAR/GAME OVER) + スコア・PERFECT数・最大連続・落ちた回数
// スタイル: 90s PRE-RENDER

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s PRE-RENDER: 暗め・金属質。横帯のシェーディングで擬似奥行き、粒状ノイズを1枚重ねる
  var STYLE = { bg: ['#10162a', '#1e2740', '#324060'], main: ['#8a96b4', '#58647e', '#dce2f0'], accent: ['#ffb24e', '#ff5a6a'] };
  var C = {
    night: STYLE.bg[0], night2: STYLE.bg[1], haze: STYLE.bg[2], tin: STYLE.main[0], tin2: STYLE.main[1], snow: STYLE.main[2],
    lamp: STYLE.accent[0], bad: STYLE.accent[1], ink: '#070a14', cornice: '#b8d8f4', ice: '#9ccaf0', wood: '#3a2a22', ok: '#6ae08a', gold: '#ffd060',
  };

  var GAME_TITLE = 'EAVE LEAP';
  var TIME_LIMIT = 20;
  var ROOFS = 12;
  var LIVES = 3;
  var GRAV = 3200, JUMP_V = 1250;
  var RUN_X = 300, RUN_HALF = 22;
  var BASE_Y = Math.round(H * 0.66);

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var roofs, goalX, wx, h, vy, air, falling, fallFrom, speed, playT, readyT, stopT, flashT, invT, crumble;
  var lives, score, streak, maxStreak, perfects, falls, over, won, outroT, lastWord, milestone, roofIdx, prevBest;

  function buildCourse(demo) {
    var r = [], x = -400, top = 0, g;
    for (var i = 0; i < ROOFS; i++) {
      var len = i === 0 ? 1500 : (i === ROOFS - 1 ? 1600 : (demo ? 620 : game.random(520, 760) - i * 10));
      var cw = 0;
      if (i >= 3 && i < ROOFS - 1 && (demo ? i % 3 === 0 : game.random(0, 1) < 0.45)) cw = demo ? 70 : game.random(50, 90);
      r.push({ i: i, x0: x, x1: x + len, top: top, cw: cw, broken: false });
      g = i < 3 ? 160 + i * 25 : (demo ? 250 : game.random(210, 250) + Math.min(90, i * 9));
      x = x + len + g;
      top = Math.max(-120, Math.min(120, top + (demo ? [0, -40, 0, 40, -60][i % 5] : game.random(-70, 50))));
    }
    goalX = r[ROOFS - 1].x0 + 900;
    return r;
  }

  function roofAt(x) {
    for (var i = 0; i < roofs.length; i++) if (x >= roofs[i].x0 && x <= roofs[i].x1) return roofs[i];
    return null;
  }
  function corniceAt(x) {
    for (var i = 0; i < roofs.length; i++) if (roofs[i].cw > 0 && !roofs[i].broken && x > roofs[i].x1 && x <= roofs[i].x1 + roofs[i].cw) return roofs[i];
    return null;
  }

  function initGame(demo) {
    roofs = buildCourse(demo);
    wx = 0; h = 0; vy = 0; air = false; falling = false; fallFrom = 0; speed = 500; playT = 0; readyT = demo ? 0 : 0.8;
    stopT = 0; flashT = 0; invT = 0; crumble = null; roofIdx = 0;
    lives = LIVES; score = 0; streak = 0; maxStreak = 0; perfects = 0; falls = 0; over = false; won = false; outroT = 0; lastWord = '';
    milestone = false; prevBest = game.best;
  }

  // ---- ジャンプ(軒先との距離で得点。本番もデモも同じ) ----
  function jump(demo) {
    if (air || stopT > 0 || falling) return false;
    var r = roofAt(wx);
    air = true; vy = JUMP_V;
    game.audio.play('se_jump', 0.4);
    if (r) {
      var D = r.x1 - wx;
      var tier = D <= 28 ? 3 : (D <= 80 ? 2 : (D <= 150 ? 1 : 0));
      if (tier > 0) {
        var word = tier === 3 ? 'PERFECT' : (tier === 2 ? 'GOOD' : 'NICE');
        if (tier >= 2) streak++; else streak = 0;
        maxStreak = Math.max(maxStreak, streak);
        var pts = Math.round((tier === 3 ? 200 : (tier === 2 ? 100 : 40)) * (1 + Math.min(4, streak) * 0.25));
        if (tier === 3) perfects++;
        if (!demo) score += pts;
        lastWord = word;
        game.feedback.good(RUN_X + 40, BASE_Y - h - 200, { text: word, color: tier === 3 ? C.gold : C.snow, size: 44 + tier * 8, sound: tier === 3 ? 'se_coin' : 'se_good', volume: 0.3, count: 6 + tier * 4 });
        game.fx.popup('+' + pts, RUN_X + 60, BASE_Y - h - 290, { color: C.lamp, size: 50 });
        if (streak >= 2) game.audio.tone(540 + streak * 60, 0.06, { wave: 'square', volume: 0.04 });
      } else {
        if (streak > 1) game.audio.tone(300, 0.08, { wave: 'triangle', volume: 0.05, slide: -120 });
        streak = 0; lastWord = '';
      }
    }
    return true;
  }

  function startFall(reason) {
    falling = true; air = true; vy = Math.min(vy, -150); fallFrom = h; streak = 0;
    game.audio.tone(220, 0.12, { wave: 'sawtooth', volume: 0.06, slide: -160 });
    if (reason === 'cornice') game.fx.burst(RUN_X, BASE_Y - h + 10, { color: C.cornice, count: 16, speed: 260 });
  }

  function landFall(demo) {
    // 落ち切った: hit-stop → 手袋を失う → 次の屋根の上から
    stopT = 0.45; flashT = 0.45; falls++;
    game.feedback.bad(RUN_X, BASE_Y - fallFrom - 80, { text: 'MISS', shake: demo ? 6 : 14 });
    game.audio.play('se_break', 0.45);
    if (!demo) {
      lives--;
      if (lives <= 0) { finish(false); return; }
    }
    var next = null;
    for (var i = 0; i < roofs.length; i++) if (roofs[i].x1 > wx + 40) { next = roofs[i]; break; }
    if (!next) next = roofs[roofs.length - 1];
    wx = Math.max(next.x0 + 60, Math.min(wx, next.x1 - 200)); h = next.top; vy = 0; air = false; falling = false; invT = 1.0;
  }

  function stepRunner(dt, demo) {
    playT += dt;
    speed = 500 + Math.min(1, playT / TIME_LIMIT) * 110;
    if (invT > 0) invT -= dt;
    if (crumble && (crumble.t -= dt) <= 0) crumble = null;
    wx += speed * dt;
    var r = roofAt(wx);
    if (air) {
      h += vy * dt; vy -= GRAV * dt;
      if (falling) {
        if (h < fallFrom - 300) landFall(demo);
        return;
      }
      if (r && vy <= 0 && h <= r.top && h > r.top - 40) { air = false; h = r.top; vy = 0; game.audio.tone(180, 0.04, { wave: 'triangle', volume: 0.05 }); }
      else if (r && h < r.top - 40) { startFall('wall'); }
      else if (!r && h < -260) { startFall('gap'); }
    } else {
      if (r) { h = r.top; if (r.i > roofIdx) { roofIdx = r.i; if (!demo && !milestone && roofIdx >= ROOFS / 2) { milestone = true; game.audio.play('se_milestone', 0.45); game.fx.popup(roofIdx + ' / ' + ROOFS, W / 2, H * 0.3, { color: C.gold, size: 84 }); } } }
      else {
        var c = corniceAt(wx);
        if (c) {
          if (!crumble || crumble.r !== c) { crumble = { r: c, t: 0.14 }; game.audio.tone(900, 0.06, { wave: 'square', volume: 0.05, slide: -300 }); }
          if (crumble.t <= 0.02) { c.broken = true; startFall('cornice'); }
        } else startFall('gap');
      }
    }
  }

  function finish(ok) {
    over = true; won = ok; outroT = 1.5;
    game.audio.stopBgm();
    if (ok) {
      score += lives * 150;
      game.audio.play('se_success', 0.55);
      for (var i = 0; i < 5; i++) game.fx.burst(game.random(200, 880), game.random(300, 900), { color: i % 2 ? C.lamp : C.snow, count: 22, speed: 440 });
      game.fx.flash(C.snow, 0.25);
    } else game.audio.play('se_failure', 0.5);
  }

  // ---- 入力 ----
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(false); return; }
    if (state === S.RESULT) { game.audio.play('se_tap'); state = S.ATTRACT; initGame(true); demo.t = 0; return; }
    if (over || readyT > 0 || stopT > 0) { game.audio.tone(200, 0.03, { wave: 'square', volume: 0.03 }); return; }
    if (!jump(false)) { game.audio.play('se_tap', 0.06); game.fx.burst(RUN_X, BASE_Y - h - 30, { color: C.snow, count: 3, speed: 90 }); }
  });

  // ---- 描画 ----
  function label(str, x, y, sz, col) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: C.ink, bold: true, align: 'center' });
    game.draw.text(str, x, y, { size: sz, color: col, bold: true, align: 'center' });
  }
  function sx(x) { return RUN_X + (x - wx); }

  // 雪下ろしの若者(綿入れ・手袋・スコップ): 走り2コマ/跳び/落ち
  var YOUTH = [
    ['....kkk....', '...kffk....', '...kfek....', '....kk.....', '..srrrr....', '.s.rrrr.gg.', 's..rrrr.g..', '...bbbb....', '...b..b....', '..b....b...', '.b......b..', 'w........w.'],
    ['....kkk....', '...kffk....', '...kfek....', '....kk.....', '..srrrr....', '.s.rrrr.gg.', 's..rrrr.g..', '...bbbb....', '...b..b....', '...b..b....', '...b..b....', '..ww..ww...'],
    ['....kkk..s.', '...kffk.s..', '...kfek.s..', '....kk.s...', '...rrrrs...', '..grrrr....', '..g.rrr....', '...bbbb....', '..b....b...', '.b......b..', 'w........w.', '...........'],
    ['...........', '.s.........', '..s.kkk....', '...skffk...', '....kfek...', '.....kk.gg.', '...rrrrrg..', '..rrrrr....', '...bbbbb...', '..b.....b..', '.w.......w.', '...........'],
  ];
  var YPAL = { k: '#243052', f: '#f2c8a0', e: '#2a1a10', r: '#7a3a3a', b: '#3a3a5a', g: '#ffb24e', s: '#8a96b4', w: '#ffb24e' };

  function drawBackdrop() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, C.night], [0.45, C.night2], [1, C.haze]]);
    // 月と雪
    game.draw.circle(820, 300, 70, '#e8ecf4', 0.9);
    game.draw.circle(850, 285, 56, C.night2, 0.9);
    for (var i = 0; i < 40; i++) {
      var fx = (i * 173 + t * (30 + (i % 5) * 12)) % (W + 40) - 20, fy = (i * 311 + t * (70 + (i % 3) * 25)) % H;
      game.draw.circle(fx, fy, 3 + (i % 3), C.snow, 0.5);
    }
    // 遠景の町並み(1枚絵のように低速で流れる)
    var off = (wx * 0.15) % 400;
    for (var b = -1; b < 4; b++) {
      var bx = b * 400 - off, bh = 260 + ((b + 7) % 3) * 70, top = BASE_Y - 200 - bh;
      game.draw.rect(bx, top, 300, bh + 200, '#1a2238');
      game.draw.rect(bx - 20, top, 340, 40, '#2a3450');
      for (var wy = top + 90; wy < BASE_Y - 60; wy += 80) for (var wxx = 40; wxx < 280; wxx += 90) {
        var lit = ((b * 7 + wy + wxx) % 5) !== 0;
        game.draw.rect(bx + wxx, wy, 36, 44, lit ? C.lamp : '#101828', lit ? 0.75 : 1);
      }
    }
  }

  function drawRoof(r) {
    var x0 = sx(r.x0), x1 = sx(r.x1);
    if (x1 < -200 || x0 > W + 200) return;
    var top = BASE_Y - r.top;
    // 雪の層(明)→ トタン屋根(横帯で奥行き)→ 壁
    game.draw.rect(x0 - 10, top - 26, x1 - x0 + 10, 30, C.snow);
    game.draw.rect(x0 - 10, top - 26, x1 - x0 + 10, 8, '#ffffff', 0.7);
    for (var s = 0; s < 6; s++) game.draw.rect(x0, top + 4 + s * 14, x1 - x0, 14, s % 2 ? C.tin2 : C.tin, 1 - s * 0.08);
    game.draw.rect(x0, top + 88, x1 - x0, H, C.wood);
    for (var l = x0 + 40; l < x1 - 20; l += 160) game.draw.rect(l, top + 150, 60, 80, C.lamp, 0.55);
    // 軒先の縁(本当の端)
    game.draw.rect(x1 - 6, top - 30, 8, 40, C.ink);
    for (var k = 0; k < 3; k++) game.draw.rect(x1 - 4 - k * 28, top + 4, 6, 18 + (k % 2) * 10, C.ice);
    // 雪庇: 軒先の外へせり出した薄い雪(乗れない)
    if (r.cw > 0 && !r.broken) {
      var shake = (crumble && crumble.r === r) ? Math.sin(game.time.elapsed * 60) * 4 : 0;
      game.draw.rect(x1, top - 24 + shake, r.cw, 20, C.cornice, 0.9);
      game.draw.rect(x1, top - 24 + shake, r.cw, 5, '#ffffff', 0.6);
      for (var c = 0; c < 3; c++) game.draw.rect(x1 + 8 + c * (r.cw / 3), top - 4 + shake, 5, 22 + c * 8, C.ice);
    }
    if (r.i === ROOFS - 1) drawBathhouse(r);
  }

  function drawBathhouse(r) {
    var gx = sx(goalX), top = BASE_Y - r.top;
    game.draw.rect(gx - 50, top - 320, 100, 300, C.tin2);
    game.draw.rect(gx - 60, top - 330, 120, 20, C.ink);
    for (var p = 0; p < 4; p++) {
      var py = top - 360 - ((game.time.elapsed * 90 + p * 70) % 280);
      game.draw.circle(gx + Math.sin(game.time.elapsed * 2 + p) * 20, py, 26 + p * 8, C.snow, 0.35);
    }
    game.draw.rect(gx - 240, top - 150, 150, 120, C.lamp, 0.8);
    game.draw.rect(gx - 230, top - 140, 130, 100, C.ink, 0.5);
  }

  function drawRunner() {
    var t = game.time.elapsed;
    var y = BASE_Y - h - 66;
    if (invT > 0 && stopT <= 0 && Math.floor(t * 14) % 2 === 0) return;
    var fr = air ? (falling ? YOUTH[3] : YOUTH[2]) : YOUTH[Math.floor(t * 9) % 2];
    var big = stopT > 0;
    if (big) game.draw.circle(RUN_X, y, 100, '#ffffff', 0.45);
    game.draw.sprite(fr, YPAL, RUN_X, y, big ? 13 : 11, { anchor: 'center' });
    if (!air) game.draw.rect(RUN_X - 28, BASE_Y - h - 8, 56, 8, C.ink, 0.35);
  }

  function drawGrain() {
    for (var i = 0; i < 90; i++) game.draw.rect((i * 97) % W, (i * 211 + 37) % H, 3, 3, i % 2 ? '#ffffff' : '#000000', 0.08);
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 230, C.ink, 0.82);
    label('SCORE ' + score, 270, 90, 56, C.snow);
    if (streak >= 2) label('COMBO x' + streak, 270, 170, 40, C.gold);
    for (var i = 0; i < LIVES; i++) {
      var mx = 660 + i * 100;
      game.draw.circle(mx, 70, 36, i < lives ? C.lamp : '#3a3a4a');
      game.draw.rect(mx - 14, 70, 28, 34, i < lives ? C.lamp : '#3a3a4a');
      game.draw.rect(mx - 18, 98, 36, 12, C.snow);
    }
    // 湯屋までの道のり(屋根の数)と残り時間
    var p = Math.min(1, Math.max(0, wx / goalX));
    game.draw.rect(560, 136, 460, 24, '#222a3c');
    game.draw.rect(560, 136, 460 * p, 24, C.snow);
    game.draw.rect(1016, 124, 10, 48, C.lamp);
    label(Math.min(ROOFS, roofIdx + 1) + ' / ' + ROOFS, 790, 190, 30, C.snow);
    var tl = Math.max(0, 1 - playT / TIME_LIMIT);
    game.draw.rect(560, 206, 460, 12, '#222a3c');
    game.draw.rect(560, 206, 460 * tl, 12, tl < 0.25 ? C.bad : C.tin);
  }

  function drawScene() {
    drawBackdrop();
    for (var i = 0; i < roofs.length; i++) drawRoof(roofs[i]);
    drawRunner();
    drawGrain();
  }

  // ---- ATTRACT: 実ロジックでぎりぎり踏み切りを見せ、4軒目だけ早跳びして落ちる ----
  var demo = { t: 0, press: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    if (demo.t <= dt) initGame(true);
    if (demo.press > 0) demo.press -= dt;
    if (stopT > 0) { stopT -= dt; if (stopT <= 0) flashT = 0; return; }
    var r = roofAt(wx);
    if (r && !air) {
      var D = r.x1 - wx;
      var want = r.i === 3 ? 300 : 22;
      if (D <= want && D > 0) { jump(true); demo.press = 0.2; }
    }
    stepRunner(dt, true);
    if (wx >= goalX || roofIdx >= 7) { demo.t = 0; }
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;

    if (state === S.ATTRACT) {
      if (!roofs) initGame(true);
      stepDemo(dt);
      drawScene();
      game.draw.hand(W * 0.7, H * 0.84, { press: demo.press > 0, scale: 15 });
      game.draw.rect(0, 0, W, 230, C.ink, 0.82);
      label(GAME_TITLE, W / 2, 105, 86 + Math.sin(t * 3) * 3, C.lamp);
      label('HI-SCORE ' + (game.best > 0 ? game.best : 0), W / 2, 190, 36, C.snow);
      if (Math.floor(t * 2) % 2 === 0) label('► 100円 投入 ◄', W / 2, H * 0.4, 52, C.lamp);
      else label('TAP TO START', W / 2, H * 0.4, 46, C.snow);
      return;
    }

    if (state === S.RESULT) {
      drawScene();
      game.draw.rect(0, H * 0.27, W, H * 0.27, C.ink, 0.85);
      label(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.33, 100, won ? C.ok : C.bad);
      label('SCORE ' + score, W / 2, H * 0.39, 54, C.snow);
      label('PERFECT ' + perfects + '  COMBO ' + maxStreak, W / 2, H * 0.435, 38, C.gold);
      if (won && score > prevBest) label('NEW RECORD', W / 2, H * 0.485, 48, C.gold);
      else label('BEST ' + Math.max(prevBest, won ? score : 0), W / 2, H * 0.485, 36, C.snow);
      if (!won) label('あと' + Math.max(1, ROOFS - roofIdx - 1) + '軒!', W / 2, H * 0.25, 56, C.lamp);
      if (Math.floor(t * 2) % 2 === 0) label('TAP TO CONTINUE', W / 2, H * 0.565, 36, C.snow);
      return;
    }

    // ---- PLAYING ----
    if (over) {
      outroT -= dt;
      if (stopT > 0) stopT -= dt;
      if (outroT <= 0) {
        state = S.RESULT;
        var stats = { score: score, perfects: perfects, maxCombo: maxStreak, falls: falls };
        if (won) game.end.success(score, stats);
        else game.end.failure(stats);
      }
    } else if (readyT > 0) {
      readyT -= dt;
      if (readyT <= 0) game.audio.play('se_tap', 0.35);
    } else if (stopT > 0) {
      stopT -= dt;
      if (stopT <= 0) flashT = 0;
    } else {
      stepRunner(dt, false);
      if (!over && wx >= goalX) finish(true);
      else if (!over && playT >= TIME_LIMIT) finish(false);
      else if (!over && TIME_LIMIT - playT < 3 && Math.floor(playT * 4) !== Math.floor((playT - dt) * 4)) game.audio.tone(660, 0.05, { wave: 'square', volume: 0.04 });
    }

    drawScene();
    drawHud();
    if (readyT > 0) label(readyT > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.42, 110, C.lamp);
    if (over && !won && lives > 0) label('TIME UP', W / 2, H * 0.42, 96, C.bad);
    if (over && won) label('FINISH', W / 2, H * 0.42, 100, C.gold);
  });

  game.onStart(function() {
    // 雪の夜の駆け足(オリジナル): 短い跳ねる音形
    game.audio.melody([
      ['E4', 0.5], ['G4', 0.5], ['B4', 0.5], ['E5', 0.5], ['D5', 0.75], ['B4', 0.25], ['A4', 1],
      ['G4', 0.5], ['A4', 0.5], ['B4', 0.5], ['D5', 0.5], ['E5', 1.5], ['R', 0.5],
    ], { tempo: 160, wave: 'triangle', volume: 0.05, loop: true, bass: [['E3', 1], ['B2', 1], ['C3', 1], ['D3', 1]] });
    state = S.ATTRACT;
    initGame(true);
  });
})(game);
