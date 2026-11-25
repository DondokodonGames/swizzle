// I-Switch-0008v3-snowmelt-raft-shave.js
// 雪解け急流すりぬけ — 左右の漕ぎだけで動くゴムボートを、奥から迫る岩の脇ぎりぎりに通すほど客が沸いて得点が跳ねる
// 操作: 親指ゾーンの左パッドをタップすると船頭が左側を漕いでボートが左へ寄り、右パッドで右へ寄る(1回で一漕ぎ分。勢いは水に吸われて止まる)。前後には動けない。川面の白い筋の傾きは横流れの向き。岩がボートの横を抜けた瞬間、岩との隙間が狭いほど高得点(PERFECT/GOOD/NICE)、離れすぎると連続が切れる。ぶつかると船体の空気室が1つ減る
// 終わり: 18秒下り切った時点で歓声メーター(1600点)が満タンならCLEAR。空気室3つを全部つぶす/メーター未達でゴールでGAME OVER
// @mechanic: near_miss
// @theme: snowmelt_raft_shave
// 世界観: 雪解けの急流で、客を乗せたゴムボートの船頭が、奥から迫る岩の脇をわざとぎりぎりにすり抜けて客を沸かせながら下流の淵まで下る
// 残るもの: 正誤(CLEAR/GAME OVER) + 歓声スコア・PERFECT数・最大連続・残った空気室
// スタイル: MODE7 PSEUDO

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // MODE7 PSEUDO: 少色 + 地平グラデ。床(川面)を横ストリップで奥ほど圧縮して流す
  var STYLE = { bg: ['#8fd0ff', '#d8f0ff', '#f4fbff'], main: ['#2a7fc0', '#1c5a8e', '#e85a2a'], accent: ['#ffffff', '#ffe04a'] };
  var C = {
    sky: STYLE.bg[0], sky2: STYLE.bg[1], snow: STYLE.bg[2], water: STYLE.main[0], water2: STYLE.main[1], raft: STYLE.main[2],
    white: STYLE.accent[0], gold: STYLE.accent[1], ink: '#0e2234', rock: '#6a6470', rock2: '#4a4450', bank: '#c8d4dc', bank2: '#9aa8b4',
    pine: '#2e5a46', bad: '#ff4a5a', ok: '#5ae08a',
  };

  var GAME_TITLE = 'SNOWMELT SHAVE';
  var TIME_LIMIT = 18;
  var QUOTA = 1600;
  var HULL = 3;
  var HZ = 560, RAFT_Y = 1300, K = 5, HALFW = 400, CX = W / 2;
  var RAFT_HALF = 0.17;
  var SPAWN_Z = 1.5;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var rx, rv, rocks, warns, spawnT, travel, playT, hull, score, streak, maxStreak, perfects, readyT, stopT, focus, invT,
    over, won, outroT, cool, strokeT, strokeDir, cheerT, milestone, curve, lastTier;

  function initGame() {
    rx = 0; rv = 0; rocks = []; warns = []; spawnT = 0.6; travel = 0; playT = 0; hull = HULL; score = 0; streak = 0; maxStreak = 0; perfects = 0;
    readyT = 0.8; stopT = 0; focus = null; invT = 0; over = false; won = false; outroT = 0; cool = 0; strokeT = 0; strokeDir = 1;
    cheerT = 0; milestone = false; curve = 0; lastTier = '';
  }

  // ---- 射影(奥行き z → 画面) ----
  function scl(z) { return 1 / (1 + K * Math.max(-0.15, z)); }
  function yOf(z) { return HZ + (RAFT_Y - HZ) * scl(z); }
  function cxOf(z) { var q = Math.min(z, SPAWN_Z + 0.3); return CX + curve * q * q * 140; }
  function xOf(u, z) { return cxOf(z) + u * HALFW * scl(z); }
  function drift() { return 0.2 * Math.sin(playT * 0.85 + 0.6); }
  function speed() { return 0.44 + 0.02 * playT; }

  // ---- 岩の出し方: 序盤は1個、中盤は門(2個の間を抜く)、終盤は千鳥 ----
  function queue(u, r, delay) { warns.push({ u: u, r: r, t: delay }); }
  function spawnPattern() {
    if (playT < 5) {
      queue(game.random(-0.6, 0.6), game.random(0.15, 0.2), 0.6);
      return 1.0;
    }
    if (playT < 11) {
      if (game.random(0, 1) < 0.55) {
        var u0 = game.random(-0.35, 0.35);
        queue(u0 - 0.4, 0.15, 0.6); queue(u0 + 0.4, 0.15, 0.6);
      } else queue(game.random(-0.65, 0.65), game.random(0.17, 0.24), 0.6);
      return 0.9;
    }
    var side = game.random(0, 1) < 0.5 ? -1 : 1;
    queue(side * game.random(0.2, 0.55), game.random(0.15, 0.22), 0.6);
    if (game.random(0, 1) < 0.5) queue(-side * game.random(0.45, 0.7), 0.16, 0.95);
    return 0.82;
  }

  function paddle(dir) {
    rv = Math.max(-1.6, Math.min(1.6, rv + dir * 1.1));
    strokeT = 0.28; strokeDir = dir;
  }

  // ---- 進行(本番もデモも同じ)。戻り値: ぶつかった岩 or null ----
  function stepWorld(dt, demo) {
    playT += dt;
    var sp = speed();
    travel += sp * dt;
    curve = Math.sin(playT * 0.4) * 0.9;
    rv *= Math.max(0, 1 - 3.2 * dt);
    rx += (rv + drift()) * dt;
    var lim = 1 - RAFT_HALF;
    if (rx < -lim) { rx = -lim; rv = Math.abs(rv) * 0.3; game.audio.tone(140, 0.05, { wave: 'triangle', volume: 0.05 }); }
    if (rx > lim) { rx = lim; rv = -Math.abs(rv) * 0.3; game.audio.tone(140, 0.05, { wave: 'triangle', volume: 0.05 }); }
    if (strokeT > 0) strokeT -= dt;
    if (invT > 0) invT -= dt;
    if (cheerT > 0) cheerT -= dt;

    spawnT -= dt;
    if (spawnT <= 0) spawnT = spawnPattern();
    for (var w = warns.length - 1; w >= 0; w--) {
      warns[w].t -= dt;
      if (warns[w].t <= 0) {
        rocks.push({ u: warns[w].u, z: SPAWN_Z, r: warns[w].r, passed: false, flash: 0, gap: -1 });
        warns.splice(w, 1);
      }
    }
    var hit = null;
    for (var i = rocks.length - 1; i >= 0; i--) {
      var k = rocks[i];
      var before = k.z;
      k.z -= sp * dt;
      if (k.flash > 0) k.flash -= dt;
      if (!k.passed && before > 0 && k.z <= 0) {
        k.passed = true;
        var gapPx = (Math.abs(k.u - rx) - k.r - RAFT_HALF) * HALFW;
        k.gap = gapPx;
        if (gapPx < 0 && invT <= 0) hit = k;
        else if (gapPx >= 0) grazeScore(k, gapPx, demo);
      }
      if (k.z < -0.14) rocks.splice(i, 1);
    }
    return hit;
  }

  function grazeScore(k, gapPx, demo) {
    var x = xOf(k.u, 0), y = RAFT_Y - 40;
    var tier = gapPx < 28 ? 3 : (gapPx < 70 ? 2 : (gapPx < 130 ? 1 : 0));
    if (tier === 0) {
      if (streak > 1) game.audio.tone(330, 0.08, { wave: 'triangle', volume: 0.05, slide: -120 });
      streak = 0; lastTier = '';
      return;
    }
    if (tier >= 2) streak++;
    maxStreak = Math.max(maxStreak, streak);
    var mult = 1 + Math.min(4, streak) * 0.25;
    var pts = Math.round((tier === 3 ? 200 : (tier === 2 ? 100 : 40)) * mult);
    var word = tier === 3 ? 'PERFECT' : (tier === 2 ? 'GOOD' : 'NICE');
    if (tier === 3) perfects++;
    lastTier = word;
    k.flash = 0.35;
    cheerT = 0.6 + tier * 0.15;
    if (!demo) score += pts;
    game.feedback.good(x, y, { text: word, color: tier === 3 ? C.gold : C.white, size: 44 + tier * 8, sound: tier === 3 ? 'se_coin' : 'se_good', volume: 0.3, count: 6 + tier * 4 });
    game.fx.popup('+' + pts, CX, RAFT_Y - 230, { color: C.gold, size: 54 });
    if (streak >= 2) game.audio.tone(520 + streak * 70, 0.06, { wave: 'square', volume: 0.04 });
    if (!demo && !milestone && score >= QUOTA) {
      milestone = true;
      game.fx.popup('CLEAR ' + QUOTA, CX, H * 0.36, { color: C.gold, size: 70 });
      game.audio.play('se_milestone', 0.5);
    }
  }

  function onHit(k, demo) {
    k.flash = 0.6; focus = k; stopT = 0.45; invT = 1.1; streak = 0; rv = -Math.sign(k.u - rx || 1) * 1.2;
    game.feedback.bad(xOf(rx, 0), RAFT_Y - 40, { text: 'MISS', shake: demo ? 6 : 14 });
    game.audio.play('se_break', 0.4);
    if (!demo) {
      hull--;
      if (hull <= 0) finish(false);
    }
  }

  function finish(ok) {
    over = true; won = ok; outroT = 1.5;
    game.audio.stopBgm();
    if (ok) {
      score += hull * 150;
      game.audio.play('se_success', 0.55);
      game.fx.burst(CX, RAFT_Y - 60, { color: C.gold, count: 30, speed: 460 });
      game.fx.burst(CX, RAFT_Y - 60, { color: C.raft, count: 20, speed: 360 });
      game.fx.flash(C.white, 0.25);
    } else {
      game.audio.play('se_failure', 0.5);
    }
  }

  // ---- 入力 ----
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { game.audio.play('se_tap'); state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function(x, y) {
    if (state !== S.PLAYING) return;
    if (over || readyT > 0 || stopT > 0) { game.audio.tone(200, 0.03, { wave: 'square', volume: 0.03 }); return; }
    var dir = x < W / 2 ? -1 : 1;
    paddle(dir);
    game.audio.play('se_tap', 0.25);
    game.fx.burst(dir < 0 ? W * 0.22 : W * 0.78, H * 0.86, { color: C.white, count: 5, speed: 160 });
  });

  // ---- 描画 ----
  function label(str, x, y, sz, col) {
    game.draw.text(str, x + 4, y + 4, { size: sz, color: C.ink, bold: true, align: 'center' });
    game.draw.text(str, x, y, { size: sz, color: col, bold: true, align: 'center' });
  }

  // 後ろから見たゴムボート: 船頭(後ろ)+客2人。櫂を入れる側で3コマ
  var RAFT_A = ['....hh....', '...hffh...', '.cc.bb.dd.', 'cffcbbdffd', 'oooooooooo', 'orrrrrrrro', 'orrrrrrrro', 'oooooooooo'];
  var RAFT_L = ['....hh....', 'p..hffh...', 'pcc.bb.dd.', 'pffcbbdffd', 'oooooooooo', 'orrrrrrrro', 'orrrrrrrro', 'oooooooooo'];
  var RAFT_W = ['.f.....f..', '..hh..hh..', '.cc.bb.dd.', 'cffcbbdffd', 'oooooooooo', 'orrrrrrrro', 'orrrrrrrro', 'oooooooooo'];
  var RAFT_PAL = { h: '#f2c8a0', f: '#f2c8a0', c: '#ffe04a', b: '#e85a2a', d: '#5ac8ff', o: C.ink, r: C.raft, p: '#8a5a2a' };
  var PINE = ['..g..', '.ggg.', 'ggggg', '.ggg.', 'ggggg', '..t..'];

  function drawBackdrop() {
    var t = game.time.elapsed;
    game.draw.gradient(0, HZ, [[0, C.sky], [1, C.sky2]]);
    // 遠景: 雪山(段々の三角)
    for (var m = 0; m < 3; m++) {
      var mx = 180 + m * 360 + Math.sin(t * 0.1 + m) * 6, top = HZ - 260 + m * 30;
      for (var s = 0; s < 10; s++) {
        var wdt = 40 + s * 46, yy = top + s * 26;
        game.draw.rect(mx - wdt / 2, yy, wdt, 27, s < 3 ? C.snow : '#8aa4bc');
      }
    }
    for (var p = 0; p < 7; p++) game.draw.sprite(PINE, { g: C.pine, t: '#5a3a2a' }, 60 + p * 160, HZ - 40, 10, { anchor: 'center' });
  }

  function drawRiver() {
    var drf = drift();
    for (var y = HZ; y < H; y += 8) {
      var s = Math.max(0.0001, (y + 4 - HZ) / (RAFT_Y - HZ));
      var z = (1 / s - 1) / K;
      var band = Math.floor((z + travel) * 5);
      var hw = HALFW * s * 1.0, cx = cxOf(z);
      var even = ((band % 2) + 2) % 2 === 0;
      game.draw.rect(0, y, cx - hw, 8, even ? C.bank : C.bank2);
      game.draw.rect(cx + hw, y, W - cx - hw, 8, even ? C.bank : C.bank2);
      game.draw.rect(cx - hw, y, hw * 2, 8, even ? C.water : C.water2);
      if (band % 3 === 0) game.draw.rect(cx - hw, y, 6 + 10 * s, 8, C.white, 0.7);
      if (band % 3 === 0) game.draw.rect(cx + hw - 6 - 10 * s, y, 6 + 10 * s, 8, C.white, 0.7);
    }
    // 横流れの白い筋(傾き=流れの向き)
    for (var i = 0; i < 6; i++) {
      var zz = ((i * 0.27 - travel * 0.5) % 1.5 + 1.5) % 1.5;
      var uu = -0.7 + (i % 3) * 0.7;
      var x1 = xOf(uu, zz), y1 = yOf(zz), ln = 70 * scl(zz);
      game.draw.line(x1 - ln, y1 - drf * ln * 1.6, x1 + ln, y1 + drf * ln * 1.6, C.white, Math.max(2, 6 * scl(zz)));
    }
  }

  function drawWarns() {
    var t = game.time.elapsed;
    for (var i = 0; i < warns.length; i++) {
      var a = warns[i];
      var x = xOf(a.u, SPAWN_Z), y = yOf(SPAWN_Z);
      if (Math.floor(t * 12) % 2 === 0) {
        game.draw.circle(x, y, 26, C.bad, 0.8);
        game.draw.rect(x - 4, y - 18, 8, 22, C.white);
        game.draw.rect(x - 4, y + 8, 8, 8, C.white);
      }
    }
  }

  function drawRock(k) {
    var s = scl(k.z), x = xOf(k.u, k.z), y = yOf(k.z);
    var hl = focus === k && stopT > 0;
    var r = k.r * HALFW * s * (hl ? 1.3 : 1);
    var foam = 1 + Math.sin(game.time.elapsed * 10 + k.u * 9) * 0.06;
    game.draw.circle(x, y + r * 0.25, r * 1.25 * foam, C.white, 0.75);
    game.draw.circle(x, y, r + 4, C.ink);
    game.draw.circle(x, y, r, hl ? C.white : C.rock);
    if (!hl) {
      game.draw.circle(x + r * 0.2, y + r * 0.2, r * 0.7, C.rock2);
      game.draw.circle(x - r * 0.35, y - r * 0.35, r * 0.25, '#9a94a0');
    }
    if (k.flash > 0 && !hl) game.draw.circle(x, y, r * 1.5, C.gold, Math.min(0.5, k.flash));
  }

  function drawRaft() {
    var t = game.time.elapsed;
    var blink = invT > 0 && stopT <= 0 && Math.floor(t * 14) % 2 === 0;
    var x = xOf(rx, 0), y = RAFT_Y + Math.sin(t * 6) * 6;
    game.draw.circle(x, y + 50, 110, C.water2, 0.6);
    if (blink) return;
    var fr = cheerT > 0 ? RAFT_W : (strokeT > 0 ? RAFT_L : RAFT_A);
    game.draw.sprite(fr, RAFT_PAL, x, y, 17, { anchor: 'center', flipX: strokeT > 0 && strokeDir > 0 });
    if (strokeT > 0) {
      var px = x + strokeDir * 100;
      game.draw.circle(px, y + 40, 30 * (strokeT / 0.28) + 10, C.white, 0.7);
    }
    // 船体の左右の幅(隙間を測る基準)
    game.draw.rect(x - RAFT_HALF * HALFW, y + 70, 6, 20, C.gold);
    game.draw.rect(x + RAFT_HALF * HALFW - 6, y + 70, 6, 20, C.gold);
  }

  function drawPads(dirOn) {
    for (var i = 0; i < 2; i++) {
      var dir = i === 0 ? -1 : 1;
      var px = i === 0 ? W * 0.22 : W * 0.78, py = H * 0.86;
      var on = dirOn === dir && strokeT > 0.12;
      game.draw.circle(px, py + 10, 118, C.ink);
      game.draw.circle(px, py, 118, on ? C.gold : C.white);
      // 櫂の絵 + 寄る向きの山形
      game.draw.line(px - dir * 50, py - 60, px + dir * 20, py + 50, '#8a5a2a', 16);
      game.draw.circle(px + dir * 26, py + 60, 26, '#8a5a2a');
      for (var a = 0; a < 2; a++) {
        game.draw.line(px + dir * (30 + a * 30), py - 40, px + dir * (60 + a * 30), py - 10, C.raft, 12);
        game.draw.line(px + dir * (60 + a * 30), py - 10, px + dir * (30 + a * 30), py + 20, C.raft, 12);
      }
    }
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 230, C.ink, 0.85);
    label('SCORE ' + score, 280, 90, 56, C.white);
    if (streak >= 2) label('COMBO x' + streak, 280, 170, 40, C.gold);
    // 空気室(ライフ)
    for (var i = 0; i < HULL; i++) {
      game.draw.circle(680 + i * 100, 66, 38, C.white);
      game.draw.circle(680 + i * 100, 66, 30, i < hull ? C.raft : '#444');
    }
    // 歓声メーター(QUOTAで満タン)
    var p = Math.min(1, score / QUOTA);
    game.draw.rect(560, 128, 460, 30, '#223');
    game.draw.rect(560, 128, 460 * p, 30, p >= 1 ? C.ok : C.gold);
    game.draw.rect(560 + 460 - 6, 120, 6, 46, C.white);
    game.draw.text(Math.min(score, QUOTA) + ' / ' + QUOTA, 790, 153, { size: 26, color: C.white, bold: true, align: 'center' });
    // 残り距離(下流の淵までのバー)
    var progress = Math.min(1, playT / TIME_LIMIT);
    game.draw.rect(560, 182, 460, 16, '#334');
    game.draw.rect(560, 182, 460 * progress, 16, progress > 0.8 ? C.bad : C.water);
  }

  function drawScene(dirOn) {
    drawBackdrop();
    drawRiver();
    drawWarns();
    var order = rocks.slice().sort(function(a, b) { return b.z - a.z; });
    for (var i = 0; i < order.length; i++) if (order[i].z > 0) drawRock(order[i]);
    drawRaft();
    for (var j = 0; j < order.length; j++) if (order[j].z <= 0) drawRock(order[j]);
    drawPads(dirOn);
  }

  // ---- ATTRACT: 実ロジックでボートを漕ぎ、岩の脇をかすめる。最後に1回だけ岩に当てて見せる ----
  var demo = { t: 0, cool: 0, hand: 0, handDir: 1 };
  function nextRock() {
    var best = null;
    for (var i = 0; i < rocks.length; i++) {
      var k = rocks[i];
      if (k.passed || k.z > 0.95) continue;
      if (!best || k.z < best.z) best = k;
    }
    return best;
  }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 9;
    if (demo.t <= dt || cyc < dt) { initGame(); readyT = 0; }
    if (stopT > 0) { stopT -= dt; if (stopT <= 0) focus = null; return; }
    demo.cool -= dt; demo.hand -= dt;
    var k = nextRock();
    if (k && demo.cool <= 0) {
      var want;
      if (cyc > 6.8) want = k.u;
      else {
        var side = rx < k.u ? -1 : 1;
        want = k.u + side * (k.r + RAFT_HALF + 0.05);
        if (Math.abs(want) > 1 - RAFT_HALF) want = k.u - side * (k.r + RAFT_HALF + 0.05);
      }
      var rest = rx + rv / 3.2;
      if (Math.abs(want - rest) > 0.14) {
        var d = want > rest ? 1 : -1;
        paddle(d); demo.cool = 0.26; demo.hand = 0.2; demo.handDir = d;
        game.audio.play('se_tap', 0.08);
      }
    }
    var hit = stepWorld(dt, true);
    if (hit) onHit(hit, true);
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;

    if (state === S.ATTRACT) {
      stepDemo(dt);
      drawScene(demo.hand > 0 ? demo.handDir : 0);
      game.draw.hand(demo.handDir < 0 ? W * 0.22 : W * 0.78, H * 0.86 + 20, { press: demo.hand > 0, scale: 15 });
      game.draw.rect(0, 0, W, 230, C.ink, 0.85);
      label(GAME_TITLE, W / 2, 105, 84 + Math.sin(t * 3) * 3, C.gold);
      label('HI-SCORE ' + (game.best > 0 ? game.best : 0), W / 2, 190, 36, C.white);
      if (Math.floor(t * 2) % 2 === 0) label('► 100円 投入 ◄', W / 2, H * 0.4, 52, C.raft);
      else label('TAP TO START', W / 2, H * 0.4, 46, C.white);
      return;
    }

    if (state === S.RESULT) {
      drawScene(0);
      game.draw.rect(0, H * 0.27, W, H * 0.26, C.ink, 0.85);
      label(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.33, 100, won ? C.ok : C.bad);
      label('SCORE ' + score, W / 2, H * 0.39, 54, C.white);
      label('PERFECT ' + perfects + '  COMBO ' + maxStreak, W / 2, H * 0.435, 38, C.gold);
      if (won && score > game.best) label('NEW RECORD', W / 2, H * 0.48, 48, C.gold);
      else label('BEST ' + Math.max(game.best, won ? score : 0), W / 2, H * 0.48, 36, C.white);
      if (!won && score < QUOTA) label('あと' + (QUOTA - score) + '点!', W / 2, H * 0.25, 56, C.gold);
      if (Math.floor(t * 2) % 2 === 0) label('TAP TO CONTINUE', W / 2, H * 0.56, 36, C.white);
      return;
    }

    // ---- PLAYING ----
    if (over) {
      outroT -= dt;
      if (stopT > 0) stopT -= dt;
      if (outroT <= 0) {
        state = S.RESULT;
        var stats = { score: score, perfects: perfects, maxCombo: maxStreak, hull: hull };
        if (won) game.end.success(score, stats);
        else game.end.failure(stats);
      }
    } else if (readyT > 0) {
      readyT -= dt;
      if (readyT <= 0) game.audio.play('se_jump', 0.35);
    } else if (stopT > 0) {
      stopT -= dt;
      if (stopT <= 0) focus = null;
    } else {
      var hit = stepWorld(dt, false);
      if (hit) onHit(hit, false);
      if (!over && playT >= TIME_LIMIT) { focus = null; finish(score >= QUOTA); }
      else if (!over && TIME_LIMIT - playT < 3 && Math.floor(playT * 4) !== Math.floor((playT - dt) * 4)) {
        game.audio.tone(score >= QUOTA ? 880 : 660, 0.05, { wave: 'square', volume: 0.04 });
      }
    }

    drawScene(strokeT > 0 ? strokeDir : 0);
    drawHud();
    if (readyT > 0) label(readyT > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.42, 110, C.gold);
    if (over && !won && hull > 0) label('TIME UP', W / 2, H * 0.42, 96, C.bad);
    if (over && won) label('FINISH', W / 2, H * 0.42, 100, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([
      ['D5', 0.5], ['F#5', 0.5], ['A5', 0.5], ['F#5', 0.25], ['E5', 0.25], ['D5', 0.5], ['B4', 0.5], ['A4', 1],
      ['B4', 0.5], ['D5', 0.5], ['E5', 0.5], ['F#5', 0.5], ['E5', 1.5], ['R', 0.5],
    ], { tempo: 168, wave: 'triangle', volume: 0.05, loop: true, bass: [['D3', 1], ['A2', 1], ['B2', 1], ['G2', 1]] });
    state = S.ATTRACT;
    initGame();
  });
})(game);
