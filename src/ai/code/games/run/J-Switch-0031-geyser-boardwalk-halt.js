// J-Switch-0031-geyser-boardwalk-halt.js
// 間欠泉の木道わたり — 押している間だけ木道を右へ歩き、噴き上がる前にぶくぶく鳴る間欠泉の手前でぴたりと止まって、観測小屋まで最速で渡りきる
// 操作: 画面を押している間は歩き、離すと止まる。間欠泉がぶくぶく揺れて「!」が出たら手前で指を離して待つ。噴出中の真横にいると吹き戻される(社内メモ。画面には出さない)
// 終わり: 観測小屋に着けばCLEAR(残り時間と温泉たまごでスコア)。3回吹き戻される/15秒でTIME UPならGAME OVER
// @mechanic: freeze
// @theme: geyser_valley_boardwalk
// 世界観: 湯けむりの立つ間欠泉の谷で、新米の観測助手が、谷の奥の観測小屋へ朝いちばんの温度計を届けるため、不規則に噴き上がる間欠泉が並ぶ木道を、噴く前ぶれを見て立ち止まりながら渡りきる
// 残るもの: 正誤(CLEAR/GAME OVER) + 到着タイム・拾った温泉たまご・吹き戻し回数のスコア
// スタイル: PIXEL HD

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // PIXEL HD: 多色+光。パララックス3層、湯気のライティング、細かい歩きアニメ
  var STYLE = { bg: ['#f6b98a', '#6a86b8'], main: ['#6a4a34', '#3e6a58', '#d8e8f0'], accent: ['#ffcf4a', '#e8503a'] };
  var C = {
    sky1: '#f9c89a', sky2: '#9ab4d8', sky3: '#5a70a0', far: '#6a7fa8', farHi: '#8ea0c4', mid: '#4a6a5a', midHi: '#6a8e70',
    ground: '#8a6a4a', groundD: '#5a4230', plank: '#b88a58', plankD: '#7a5634', post: '#5a3c24',
    pool: '#7fd8d0', poolD: '#3aa0a8', steam: '#f4faff', water: '#bff0ff', gold: '#ffcf4a', bad: '#e8503a',
    white: '#ffffff', ink: '#1c1a2a', good: '#8ae07a'
  };

  var GAME_TITLE = 'GEYSER WALK';
  var TIME_LIMIT = 15;
  var NEEDED = 6;
  var MAX_MISS = 3;
  var WALK = 430;
  var GOAL_X = 3500;
  var DANGER = 88;
  var RUMBLE = 0.72;
  var BW_Y = Math.round(H * 0.62);
  var PAD_Y = Math.round(H * 0.86);
  var HUD_Y = Math.round(H * 0.05);
  var MID_Y = Math.round(H * 0.4);

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var px, holding, geysers, eggs, passed, misses, eggCount, timeLeft, ready, hitStop, hitG, finished, ok, endWait, score, soakT, halfShown, bestAtStart, walkAnim, drops;

  var HELPER = [
    ['...hhhh...', '..hhhhhh..', '.hhhhhhhh.', '...ffff...', '...fefe...', '...ffff...', '..cccccbb.', '.fcccccbb.', '..cccccbb.', '...pp.pp..', '...pp..pp.', '..kk....kk'],
    ['...hhhh...', '..hhhhhh..', '.hhhhhhhh.', '...ffff...', '...fefe...', '...ffff...', '..cccccbb.', '..ccccfbb.', '..cccccbb.', '...pp.pp..', '...pppp...', '...kk.kk..'],
    ['...hhhh...', '..hhhhhh..', '.hhhhhhhh.', '...ffff...', '...fefe...', '...ffff...', '..cccccbb.', '.fcccccbb.', '..cccccbb.', '...pp.pp..', '...pp.pp..', '...kk.kk..']
  ];
  var HELPER_PAL = { h: '#e8e0c8', f: '#f2c8a0', e: '#1c1a2a', c: '#e87a3a', b: '#8a5a3a', p: '#3a4a6a', k: '#2a2a2a' };
  var EGG = ['.ww.', 'wwww', 'wyyw', '.ww.'];
  var EGG_PAL = { w: '#fff4d8', y: '#ffcf4a' };
  var CROW = [['k...k', '.kkk.', '..k..'], ['.....', 'kkkkk', '..k..']];
  var HUT = ['.....rr.....', '....rrrr....', '...rrrrrr...', '..rrrrrrrr..', '.wwwwwwwwww.', '.wbbwwwwbbw.', '.wbbwddwbbw.', '.wwwwddwwww.', '.wwwwddwwww.'];
  var HUT_PAL = { r: '#b84a3a', w: '#e8d8b8', b: '#6ab0e0', d: '#6a4a34' };

  function txt(s, x, y, sz, col, align) {
    game.draw.text(s, x + 3, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(s, x, y, { size: sz, color: col, bold: true, align: align || 'center' });
  }

  function makeGeysers() {
    var list = [];
    var x = 720;
    for (var i = 0; i < NEEDED; i++) {
      // 変拍子: 各間欠泉が不規則な休み時間の列を持つ
      var rest = [game.random(0.7, 1.3), game.random(1.4, 2.2), game.random(0.5, 0.9)];
      list.push({ x: x, st: 'idle', t: game.random(0.2, 1.6), rest: rest, ri: 0, erupt: game.random(1.0, 1.4), done: false, warned: false });
      x += game.random(430, 520);
    }
    return list;
  }

  function initGame() {
    px = 120; holding = false;
    geysers = makeGeysers();
    eggs = [];
    for (var i = 1; i < geysers.length; i += 2) eggs.push({ x: geysers[i].x + 34, got: false });
    passed = 0; misses = 0; eggCount = 0; score = 0;
    timeLeft = TIME_LIMIT; ready = 0.8; hitStop = 0; hitG = null;
    finished = false; ok = false; endWait = 0; soakT = 0; halfShown = false; walkAnim = 0; drops = [];
    bestAtStart = game.best || 0;
  }

  function camX() { return Math.max(0, Math.min(GOAL_X + 300 - W, px - W * 0.3)); }

  function onScreen(x) { var sx = x - camX(); return sx > -100 && sx < W + 100; }

  // ── 共通ロジック(本番とデモで共用) ─────────────────────
  function stepGeysers(dt) {
    for (var i = 0; i < geysers.length; i++) {
      var g = geysers[i];
      g.t -= dt;
      if (g.st === 'idle' && g.t <= 0) {
        g.st = 'rumble'; g.t = RUMBLE;
        if (onScreen(g.x)) game.audio.tone(180, 0.35, { wave: 'square', volume: 0.04, slide: 360 });
      } else if (g.st === 'rumble' && g.t <= 0) {
        g.st = 'erupt'; g.t = g.erupt;
        if (onScreen(g.x)) game.audio.tone(90, 0.4, { wave: 'sawtooth', volume: 0.05 });
      } else if (g.st === 'erupt' && g.t <= 0) {
        g.st = 'idle'; g.t = g.rest[g.ri % g.rest.length]; g.ri++;
      }
    }
  }

  function stepWalker(dt) {
    if (soakT > 0) soakT -= dt;
    if (holding) {
      px += WALK * dt;
      walkAnim += dt;
    }
    // 噴出中の真横にいたら吹き戻し
    for (var i = 0; i < geysers.length; i++) {
      var g = geysers[i];
      if (g.st === 'erupt' && Math.abs(px - g.x) < DANGER) { blowBack(g); return; }
    }
    for (var e = 0; e < eggs.length; e++) {
      var eg = eggs[e];
      if (!eg.got && Math.abs(px - eg.x) < 30) {
        eg.got = true; eggCount++; score += 300;
        game.audio.play('se_coin', 0.5);
        game.fx.popup('+300', eg.x - camX(), BW_Y - 150, { color: C.gold, size: 40 });
      }
    }
    for (var j = 0; j < geysers.length; j++) {
      var gg = geysers[j];
      if (!gg.done && px > gg.x + DANGER) {
        gg.done = true; passed++;
        var close = gg.st === 'rumble' || (gg.st === 'idle' && gg.t < 0.4);
        score += close ? 200 : 100;
        game.feedback.good(gg.x - camX(), BW_Y - 200, { text: close ? 'NICE' : 'GOOD', color: close ? C.gold : C.good });
        if (!halfShown && passed === NEEDED / 2) {
          halfShown = true;
          game.audio.play('se_milestone', 0.4);
          game.fx.popup('50%', W / 2, MID_Y, { color: C.gold, size: 64 });
        }
      }
    }
    if (px >= GOAL_X) {
      px = GOAL_X;
      finish(true);
    }
  }

  function blowBack(g) {
    misses++;
    hitStop = 0.5; hitG = g;
    soakT = 1.4;
    holding = false;
    for (var d = 0; d < 14; d++) drops.push({ x: px, y: BW_Y - 90, vx: game.random(-260, 120), vy: game.random(-520, -180), t: 0.8 });
    game.feedback.bad(px - camX(), BW_Y - 160, { text: 'MISS', shake: 12 });
  }

  function afterHit() {
    var g = hitG;
    hitG = null;
    px = Math.max(60, g.x - DANGER - 90);
    if (misses >= MAX_MISS) finish(false);
  }

  function finish(win) {
    if (finished) return;
    finished = true; ok = win; endWait = 1.3;
    if (win) score += Math.round(timeLeft * 100) + (MAX_MISS - misses) * 150;
    if (state !== S.PLAYING) return;
    game.audio.stopBgm();
    if (win) {
      game.audio.play('se_success', 0.6);
      game.fx.flash(C.gold, 0.25);
      game.fx.burst(GOAL_X - camX(), BW_Y - 180, { color: C.gold, count: 30, speed: 520 });
    } else {
      game.audio.play('se_failure', 0.6);
    }
  }

  function stepAll(dt, countTime) {
    for (var i = drops.length - 1; i >= 0; i--) {
      var d = drops[i];
      d.t -= dt; d.x += d.vx * dt; d.y += d.vy * dt; d.vy += 1100 * dt;
      if (d.t <= 0) drops.splice(i, 1);
    }
    if (finished) { stepGeysers(dt); return; }
    if (hitStop > 0) {
      hitStop -= dt;
      if (hitStop <= 0) afterHit();
      return;
    }
    if (ready > 0) {
      ready -= dt;
      stepGeysers(dt);
      if (ready <= 0) game.audio.play('se_jump', 0.3);
      return;
    }
    stepGeysers(dt);
    stepWalker(dt);
    if (countTime && !finished) {
      timeLeft -= dt;
      if (timeLeft <= 0) {
        timeLeft = 0;
        game.feedback.bad(px - camX(), BW_Y - 160, { text: 'TIME UP' });
        finish(false);
      }
    }
  }

  // ── 描画 ──────────────────────────────────────────────
  function ridge(baseY, amp, period, off, col, hiCol) {
    // 横1pxストリップ代わりに縦の細帯で稜線を描く(多角形塗りなし)
    for (var x = 0; x < W; x += 12) {
      var wx = x + off;
      var h = amp * (0.55 + 0.45 * Math.sin(wx / period) * Math.sin(wx / (period * 0.37) + 1.3));
      game.draw.rect(x, baseY - h, 12, h + 8, col, 1);
      game.draw.rect(x, baseY - h, 12, 5, hiCol, 1);
    }
  }

  function drawWorld(highlightG) {
    var t = game.time.elapsed;
    var cx = camX();
    game.draw.gradient(0, BW_Y + 40, [[0, C.sky3], [0.55, C.sky2], [1, C.sky1]]);
    game.draw.circle(W * 0.78 - cx * 0.02, H * 0.2, 90, '#fff2c8', 0.8);
    game.draw.circle(W * 0.78 - cx * 0.02, H * 0.2, 140, '#fff2c8', 0.2);
    ridge(BW_Y - 260, 260, 180, cx * 0.15, C.far, C.farHi);
    ridge(BW_Y - 90, 150, 110, cx * 0.4 + 400, C.mid, C.midHi);
    // 遠くのカラス(常時ゆらぐ)
    game.draw.sprite(CROW[Math.floor(t * 4) % 2], { k: '#2a2a3a' }, (W * 0.2 + t * 40) % (W + 100), H * 0.16 + Math.sin(t * 2) * 12, 6, { anchor: 'center' });
    // 地面と湯だまり
    game.draw.gradient(BW_Y + 40, H, [C.ground, C.groundD]);
    for (var p = 0; p < 6; p++) {
      var pxw = ((p * 620 + 200) - cx * 0.9) % 1400;
      if (pxw < -300) pxw += 1400;
      game.draw.rect(pxw, BW_Y + 150 + (p % 3) * 60, 240, 30, C.poolD, 1);
      game.draw.rect(pxw + 10, BW_Y + 150 + (p % 3) * 60, 220, 16, C.pool, 0.9);
      game.draw.circle(pxw + 120, BW_Y + 120 + (p % 3) * 60 - ((t * 60 + p * 40) % 90), 22, C.steam, 0.25);
    }
    // 間欠泉の噴き口(木道の奥)
    for (var i = 0; i < geysers.length; i++) {
      var g = geysers[i];
      var sx = g.x - cx;
      if (sx < -200 || sx > W + 200) continue;
      var shakeX = g.st === 'rumble' ? Math.sin(t * 60) * 5 : 0;
      game.draw.rect(sx - 70 + shakeX, BW_Y - 10, 140, 26, '#c8b89a', 1);
      game.draw.rect(sx - 50 + shakeX, BW_Y - 18, 100, 14, g.st === 'idle' ? C.poolD : C.pool, 1);
      if (g.st === 'rumble') {
        for (var b = 0; b < 5; b++) {
          var bt = (t * 3 + b * 0.2) % 1;
          game.draw.circle(sx - 40 + b * 20 + shakeX, BW_Y - 20 - bt * 60, 8 + bt * 6, C.water, 1 - bt);
        }
        // 予告: 赤いトゲの「!」札
        var blink = Math.floor(t * 12) % 2 === 0;
        game.draw.rect(sx - 8, BW_Y - 330, 16, 60, blink ? C.bad : C.white, 1);
        game.draw.rect(sx - 8, BW_Y - 258, 16, 16, blink ? C.bad : C.white, 1);
        game.draw.rect(sx - DANGER, BW_Y - 6, DANGER * 2, 8, C.bad, blink ? 0.9 : 0.4);
      } else if (g.st === 'idle') {
        game.draw.circle(sx, BW_Y - 40 - ((t * 40 + i * 30) % 60), 16, C.steam, 0.3);
      }
    }
    // 温泉たまご
    for (var e = 0; e < eggs.length; e++) {
      if (eggs[e].got) continue;
      var ex = eggs[e].x - cx;
      if (ex < -60 || ex > W + 60) continue;
      game.draw.circle(ex, BW_Y - 18, 30, C.gold, 0.25 + 0.15 * Math.sin(t * 6));
      game.draw.sprite(EGG, EGG_PAL, ex, BW_Y - 20 + Math.sin(t * 4 + e) * 4, 9, { anchor: 'center' });
    }
    // 木道
    var off = -((cx) % 60);
    game.draw.rect(0, BW_Y, W, 34, C.plank, 1);
    for (var k = off; k < W; k += 60) {
      game.draw.rect(k, BW_Y, 4, 34, C.plankD, 1);
      game.draw.rect(k + 20, BW_Y + 34, 12, 90, C.post, 1);
    }
    game.draw.rect(0, BW_Y, W, 5, '#e0b884', 1);
    // 観測小屋(ゴール)
    var hx = GOAL_X + 110 - cx;
    if (hx < W + 200) {
      game.draw.sprite(HUT, HUT_PAL, hx, BW_Y - 110, 22, { anchor: 'center' });
      game.draw.line(hx + 110, BW_Y - 220, hx + 110, BW_Y - 420, '#5a3c24', 6);
      var fl = Math.sin(t * 5) * 8;
      game.draw.rect(hx + 113, BW_Y - 420, 70, 40 + fl * 0.3, C.gold, 1);
      game.draw.circle(hx, BW_Y - 200, 160, '#fff2c8', 0.12 + 0.06 * Math.sin(t * 3));
    }
    // 主役
    var hs = hitStop > 0;
    var frame = holding ? (Math.floor(walkAnim * 8) % 2) : 2;
    var bob = holding ? Math.abs(Math.sin(walkAnim * 16)) * -8 : Math.sin(t * 2.5) * 3;
    var mx = px - cx;
    game.draw.sprite(HELPER[frame], HELPER_PAL, mx + Math.sin(t * 1.3) * (holding ? 0 : 3), BW_Y - 64 + bob, 11, { anchor: 'center', alpha: soakT > 0 && Math.floor(t * 12) % 2 === 0 ? 0.5 : 1 });
    if (soakT > 0) {
      for (var dd = 0; dd < 3; dd++) game.draw.circle(mx - 30 + dd * 30, BW_Y - 150 + ((t * 200 + dd * 40) % 120), 6, C.water, 0.8);
    }
    // 噴出(手前に描く)
    for (var j = 0; j < geysers.length; j++) {
      var gg = geysers[j];
      if (gg.st !== 'erupt') continue;
      var gx = gg.x - cx;
      if (gx < -200 || gx > W + 200) continue;
      var k2 = Math.min(1, (gg.erupt - gg.t) / 0.25);
      var top = BW_Y - 20 - 820 * k2;
      var hl = hs && highlightG === gg;
      for (var y = BW_Y - 20; y > top; y -= 16) {
        var wob = Math.sin(y * 0.05 + t * 20) * 14;
        game.draw.rect(gx - 46 + wob, y - 16, 92, 18, hl ? C.white : C.water, hl ? 1 : 0.85);
        game.draw.rect(gx - 20 + wob, y - 16, 40, 18, C.white, 0.9);
      }
      game.draw.circle(gx, top, 70, C.steam, 0.8);
      game.draw.circle(gx - 50, top + 40, 50, C.steam, 0.6);
      game.draw.circle(gx + 50, top + 30, 50, C.steam, 0.6);
    }
    for (var q = 0; q < drops.length; q++) game.draw.circle(drops[q].x - cx, drops[q].y, 7, C.water, Math.min(1, drops[q].t * 2));
    // 親指ゾーン: 押す板(押している間は明るい)
    var lit = holding ? 0.55 : 0.2 + 0.1 * Math.sin(t * 3);
    game.draw.rect(120, PAD_Y - 110, W - 240, 220, C.plankD, 1);
    game.draw.rect(130, PAD_Y - 100, W - 260, 200, C.plank, 1);
    game.draw.rect(130, PAD_Y - 100, W - 260, 200, C.white, lit * 0.4);
    for (var f = 0; f < 3; f++) {
      var fx = W / 2 - 160 + f * 160;
      var st = holding ? Math.floor(t * 8 + f) % 3 === 0 : false;
      game.draw.circle(fx, PAD_Y + (f % 2 ? 20 : -20), st ? 30 : 24, C.plankD, 1);
      game.draw.circle(fx - 22, PAD_Y + (f % 2 ? -12 : -52), 9, C.plankD, 1);
      game.draw.circle(fx + 22, PAD_Y + (f % 2 ? -12 : -52), 9, C.plankD, 1);
    }
    // ambient pulse
    game.draw.rect(0, 0, W, H, '#fff0d0', 0.03 + 0.03 * Math.sin(t * 1.5));
  }

  function drawHud() {
    var bx = 80, bw = W - 160, by = 150;
    game.draw.rect(bx, by, bw, 14, '#000000', 0.35);
    for (var i = 0; i < geysers.length; i++) {
      var gxp = bx + bw * (geysers[i].x / GOAL_X);
      game.draw.rect(gxp - 4, by - 6, 8, 26, geysers[i].done ? C.good : C.water, 1);
    }
    game.draw.rect(bx, by, bw * Math.min(1, px / GOAL_X), 14, C.gold, 1);
    game.draw.circle(bx + bw * Math.min(1, px / GOAL_X), by + 7, 16, C.white);
    game.draw.rect(bx + bw - 10, by - 30, 20, 30, HUT_PAL.r, 1);
    txt(passed + ' / ' + NEEDED, 80, HUD_Y + 20, 40, C.white, 'left');
    txt(timeLeft.toFixed(1), W / 2, HUD_Y + 20, 44, timeLeft < 4 && Math.floor(game.time.elapsed * 6) % 2 === 0 ? C.bad : C.white);
    for (var m = 0; m < MAX_MISS; m++) {
      game.draw.circle(W - 90 - m * 56, HUD_Y + 6, 20, m < misses ? C.bad : C.water);
      game.draw.circle(W - 90 - m * 56, HUD_Y - 14, 8, m < misses ? C.bad : C.water);
    }
    game.draw.rect(80, 190, (W - 160) * Math.max(0, timeLeft / TIME_LIMIT), 8, timeLeft < 4 ? C.bad : C.good, 1);
  }

  // ── ATTRACTデモ(実ロジックをAIが操作) ───────────────────
  var DEMO_CYC = 7.5;
  var demo = { t: 0, gx: W / 2, gy: PAD_Y, press: false, sloppy: 0 };
  function demoWants() {
    // 1本目の間欠泉では予告を無視して突っ込む(失敗例)、それ以外は手前で待つ
    for (var i = 0; i < geysers.length; i++) {
      var g = geysers[i];
      if (g.done) continue;
      var d = g.x - px;
      if (d < -DANGER) continue;
      if (i === 0 && demo.sloppy === 0) return true;
      if (d > DANGER + 30 && d < DANGER + 150) {
        if (g.st === 'rumble' || g.st === 'erupt' || (g.st === 'idle' && g.t < 0.35)) return false;
      }
      return true;
    }
    return true;
  }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % DEMO_CYC;
    if (cyc < dt || demo.t <= dt) {
      initGame();
      ready = 0;
      geysers[0].st = 'idle'; geysers[0].t = 0.28;
      geysers[0].x = 560;
      demo.sloppy = 0;
    }
    if (misses > 0) demo.sloppy = 1;
    var want = !finished && hitStop <= 0 && demoWants();
    holding = want;
    demo.press = want;
    demo.gx = W / 2 + Math.sin(demo.t * 0.8) * 40; demo.gy = PAD_Y;
    stepAll(dt, false);
  }

  // ── 入力 ─────────────────────────────────────────────
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) {
      game.audio.play('se_coin', 0.5);
      state = S.PLAYING;
      initGame();
      return;
    }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function(x, y, id) {
    if (state !== S.PLAYING) return;
    if (finished || hitStop > 0) { game.audio.play('se_tap', 0.1); return; }
    holding = true;
    game.audio.play('se_tap', 0.18);
    game.fx.burst(px - camX(), BW_Y - 4, { color: C.plank, count: 5, speed: 120 });
  });
  game.onRelease(function(x, y, id) {
    if (state !== S.PLAYING) return;
    holding = game.touches.length > 0 && hitStop <= 0;
    if (!holding && !finished) {
      game.audio.tone(330, 0.06, { wave: 'triangle', volume: 0.06 });
      game.fx.burst(px - camX() + 20, BW_Y - 4, { color: C.plankD, count: 4, speed: 90 });
    }
  });

  // ── メインループ(1本だけ) ─────────────────────────────
  game.onUpdate(function(dt) {
    if (geysers === undefined) initGame();

    if (state === S.ATTRACT) {
      stepDemo(dt);
      drawWorld(hitG);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      var lb = Math.sin(game.time.elapsed * 2) * 6;
      txt(GAME_TITLE, W / 2, HUD_Y + 60 + lb, 76, C.gold);
      txt('HI-SCORE ' + (game.best || 0), W / 2, HUD_Y + 130, 32, C.white);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H - 50, 44, C.gold);
      else txt('INSERT COIN', W / 2, H - 50, 38, C.white);
      return;
    }

    if (state === S.RESULT) {
      stepGeysers(dt);
      drawWorld(null);
      var t = game.time.elapsed;
      if (ok) {
        for (var s = 0; s < 7; s++) game.draw.rect(60 + s * 150, 0, 36, BW_Y, C.gold, 0.08 + 0.06 * Math.sin(t * 4 + s));
        txt('CLEAR', W / 2, MID_Y + Math.sin(t * 5) * 8, 110, C.gold);
        txt((TIME_LIMIT - timeLeft).toFixed(1) + '秒', W / 2, MID_Y + 110, 54, C.white);
      } else {
        txt('GAME OVER', W / 2, MID_Y, 96, C.bad);
        var leftM = Math.max(0, Math.ceil((GOAL_X - px) / 10));
        txt('あと' + leftM + 'm!', W / 2, MID_Y + 110, 54, C.white);
      }
      txt('SCORE ' + score, W / 2, MID_Y + 200, 56, C.white);
      if (ok && score > bestAtStart) txt('NEW RECORD', W / 2, MID_Y + 290, 52, C.gold);
      else txt('BEST ' + bestAtStart, W / 2, MID_Y + 290, 40, C.white);
      if (Math.floor(t * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H - 50, 38, C.white);
      return;
    }

    // PLAYING
    if (finished) {
      endWait -= dt;
      stepAll(dt, false);
      if (endWait <= 0) {
        state = S.RESULT;
        var stats = { passed: passed, eggs: eggCount, misses: misses, time: Math.round((TIME_LIMIT - timeLeft) * 10) / 10 };
        if (ok) game.end.success(score, stats);
        else game.end.failure(stats);
      }
    } else {
      stepAll(dt, true);
    }

    drawWorld(hitG);
    drawHud();
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, MID_Y, 100, C.gold);
    if (finished) txt(ok ? 'FINISH' : (timeLeft <= 0 ? 'TIME UP' : 'GAME OVER'), W / 2, MID_Y, 92, ok ? C.gold : C.bad);
  });

  game.onStart(function() {
    game.audio.melody([
      ['G4', 0.5], ['B4', 0.5], ['D5', 0.5], ['B4', 0.5], ['C5', 1], ['A4', 1],
      ['G4', 0.5], ['E4', 0.5], ['G4', 0.5], ['A4', 0.5], ['B4', 1.5], ['R', 0.5]
    ], { tempo: 132, wave: 'square', volume: 0.045, loop: true, bass: [['G2', 2], ['C3', 2], ['E2', 2], ['D3', 2]] });
    state = S.ATTRACT;
    initGame();
  });
})(game);
