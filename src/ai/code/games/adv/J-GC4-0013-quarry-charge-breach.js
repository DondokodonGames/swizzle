// J-GC4-0013-quarry-charge-breach.js
// 採石場ブレイク — 岩壁の固さを読んで発破の火薬をちょうどよく詰め、5枚の壁を崩して谷の出口へ抜ける
// 操作: 押している間だけ火薬が詰まり、離すと導火線に点火。ゲージの緑帯で離せば岩壁が崩れる(帯の中央は金)
// 終わり: 制限時間内に5枚崩せばCLEAR。時間切れでGAME OVER(足りない/詰めすぎは崩れず時間を失う)
// @mechanic: hold_charge
// @theme: quarry_wall_breach
// 世界観: 山あいの採石場で働く見習い発破師が、トロッコ道をふさぐ5枚の岩壁を火薬の加減だけで順に崩し、日が沈む前に谷の出口まで道を通す
// 残るもの: 正誤(CLEAR/GAME OVER) + 崩した壁の枚数・金帯PERFECT数のスコア
// スタイル: 90s 16bit

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s 16bit: 高彩度・多層背景・表情のあるスプライト
  var STYLE = { bg: ['#2a1f4f', '#c9643a', '#f4b06a'], main: ['#7a5a3c', '#a67c52'], accent: ['#4fe08a', '#ffd23f'] };
  var C = {
    sky0: '#2a1f4f', sky1: '#c9643a', sky2: '#f4b06a',
    cliffFar: '#6b3f5e', cliffMid: '#8a5140', ground: '#5a3d2a', rail: '#2d2118',
    rock0: '#7a5a3c', rock1: '#a67c52', rock2: '#c99a68', rockDark: '#4a3322',
    good: '#4fe08a', gold: '#ffd23f', bad: '#ff4f5e', ink: '#fff3d6', dark: '#1a1026', dust: '#e8cfa6'
  };

  var GAME_TITLE = 'QUARRY BREAK';
  var TIME_LIMIT = 14;
  var NEEDED = 5;
  var GROUND_Y = Math.round(H * 0.62);
  var WORKER_X = 250;
  var WALL_X = 640;
  var WALL_W = 150;
  var GAUGE_X = 120, GAUGE_Y = Math.round(H * 0.81), GAUGE_W = 840, GAUGE_H = 76;
  var KEG_Y = Math.round(H * 0.915);
  var HUD_Y = Math.round(H * 0.057);

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  // 見習い発破師(ヘルメット+つるはし)2フレーム
  var WORKER = [
    ['..yyyy..', '.yyyyyy.', '..ffff..', '..fkfk..', '.bbbbbb.', 'bbbbbbbb', '.bbbbbb.', '..pp.pp.', '..pp.pp.', '.kk...kk'],
    ['..yyyy..', '.yyyyyy.', '..ffff..', '..fkfk..', '.bbbbbb.', 'bbbbbbbb', '.bbbbbb.', '..pp.pp.', '.pp...pp', 'kk.....kk']
  ];
  var WORKER_PAL = { y: '#ffd23f', f: '#f1c095', k: '#1a1026', b: '#3a7bd5', p: '#2d3a5c' };
  // 発破筒(赤い紙筒+導火線)
  var STICK = ['...s', '..s.', 'rrr.', 'rwr.', 'rrr.', 'rrr.'];
  var STICK_PAL = { s: '#ffd23f', r: '#d63c3c', w: '#fff3d6' };
  // 谷の出口の旗
  var FLAG = ['gggg.', 'ggggg', 'gggg.', 'p....', 'p....', 'p....'];
  var FLAG_PAL = { g: '#4fe08a', p: '#fff3d6' };
  // 鉱石(金帯ボーナス)
  var GEM = ['.g.', 'ggg', '.g.'];
  var GEM_PAL = { g: '#ffd23f' };

  var walls, broken, perfects, timeLeft, score;
  var phase, charge, chargeSpeed, fuseT, scrollT, pendingResult;
  var ready, hitStop, finished, done, endWait, ok, shakeT, flashWall;
  var chunks, dusts, rubble, lastMilestone, gemT;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: C.dark, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function makeWall(i) {
    var mid = 0.38 + ((i * 37) % 5) * 0.1 + game.random(-0.04, 0.04);
    var half = Math.max(0.055, 0.085 - i * 0.006);
    return { lo: mid - half, hi: mid + half, mid: mid, layers: 2 + (i % 3), crack: 0 };
  }

  function initGame() {
    walls = [];
    for (var i = 0; i < NEEDED; i++) walls.push(makeWall(i));
    broken = 0; perfects = 0; timeLeft = TIME_LIMIT; score = 0;
    phase = 'aim'; charge = 0; chargeSpeed = 0.55; fuseT = 0; scrollT = 0; pendingResult = null;
    ready = 0.8; hitStop = 0; finished = false; done = false; endWait = 0; ok = false;
    shakeT = 0; flashWall = 0; chunks = []; dusts = []; rubble = 0; lastMilestone = 0; gemT = 0;
  }

  function curWall() { return walls[Math.min(broken, walls.length - 1)]; }

  // ---- 実ロジック(プレイ/デモ共通) ----
  function beginCharge() {
    if (phase !== 'aim' || rubble > 0) return false;
    phase = 'charge'; charge = 0;
    game.audio.play('se_tap', 0.4);
    game.fx.burst(WORKER_X + 60, GROUND_Y - 80, { color: C.gold, count: 4, speed: 120 });
    return true;
  }

  function releaseCharge() {
    if (phase !== 'charge') return;
    phase = 'fuse'; fuseT = 0.36;
    var w = curWall();
    if (charge >= w.lo && charge <= w.hi) {
      pendingResult = Math.abs(charge - w.mid) < (w.hi - w.lo) * 0.18 ? 'perfect' : 'good';
    } else pendingResult = charge < w.lo ? 'weak' : 'over';
    game.audio.play('se_jump', 0.45);
    game.fx.burst(WORKER_X + 70, GROUND_Y - 40, { color: C.gold, count: 6, speed: 180 });
  }

  function spawnChunks(n, big) {
    for (var i = 0; i < n; i++) {
      chunks.push({
        x: WALL_X + game.random(0, WALL_W), y: GROUND_Y - game.random(40, 620),
        vx: game.random(60, 420) * (big ? 1.2 : 0.6), vy: game.random(-620, -120),
        s: game.random(18, 44), c: [C.rock0, C.rock1, C.rock2][i % 3], life: 1.6
      });
    }
    for (var d = 0; d < 7; d++) {
      dusts.push({ x: WALL_X + game.random(-20, WALL_W + 20), y: GROUND_Y - game.random(30, 520), r: game.random(40, 90), life: 1.1 });
    }
  }

  function resolveBlast(isDemo) {
    var w = curWall();
    var fx = WALL_X + WALL_W / 2, fy = GROUND_Y - 320;
    if (pendingResult === 'perfect' || pendingResult === 'good') {
      spawnChunks(18, true);
      shakeT = 0.25;
      broken++;
      var pts = pendingResult === 'perfect' ? 150 : 100;
      if (pendingResult === 'perfect') perfects++;
      score += pts;
      game.audio.play('se_break', 0.5);
      game.feedback.good(fx, fy, { text: pendingResult === 'perfect' ? 'PERFECT' : 'GOOD', color: pendingResult === 'perfect' ? C.gold : C.good, count: 16 });
      if (pendingResult === 'perfect') gemT = 0.8;
      if (!isDemo && broken === 3 && lastMilestone < 3) {
        lastMilestone = 3;
        game.audio.play('se_milestone', 0.45);
        game.fx.popup('NICE 3 / ' + NEEDED, W / 2, 640, { color: C.gold, size: 58 });
      }
      if (broken >= NEEDED) { phase = 'exit'; scrollT = 0.7; }
      else { phase = 'scroll'; scrollT = 0.6; }
    } else if (pendingResult === 'weak') {
      w.crack = Math.min(3, w.crack + 1);
      spawnChunks(3, false);
      game.feedback.bad(fx, fy, { text: 'MISS', color: C.bad, shake: 6 });
      phase = 'aim';
    } else {
      // 詰めすぎ: 壁は残り、崩れた岩屑が道に降り積もる(片付けに時間がかかる)
      spawnChunks(8, false);
      rubble = 0.9;
      w.crack = Math.min(3, w.crack + 1);
      game.feedback.bad(fx, fy, { text: 'MISS', color: C.bad, shake: 10 });
      phase = 'aim';
    }
    pendingResult = null;
  }

  function stepWorld(dt, isDemo) {
    if (phase === 'charge') {
      charge += chargeSpeed * (1 + charge * 0.6) * dt;
      if (charge >= 1) { charge = 1; releaseCharge(); }
    } else if (phase === 'fuse') {
      fuseT -= dt;
      if (fuseT <= 0) resolveBlast(isDemo);
    } else if (phase === 'scroll' || phase === 'exit') {
      scrollT -= dt;
      if (scrollT <= 0) {
        if (phase === 'scroll') { phase = 'aim'; charge = 0; chargeSpeed = 0.55 + broken * 0.05; }
        else if (!isDemo && !finished) winGame();
      }
    }
    if (rubble > 0) rubble = Math.max(0, rubble - dt);
    for (var i = chunks.length - 1; i >= 0; i--) {
      var c = chunks[i];
      c.vy += 1500 * dt; c.x += c.vx * dt; c.y += c.vy * dt; c.life -= dt;
      if (c.y > GROUND_Y - c.s / 2) { c.y = GROUND_Y - c.s / 2; c.vy *= -0.3; c.vx *= 0.6; }
      if (c.life <= 0) chunks.splice(i, 1);
    }
    for (var k = dusts.length - 1; k >= 0; k--) {
      dusts[k].life -= dt; dusts[k].r += 60 * dt; dusts[k].y -= 30 * dt;
      if (dusts[k].life <= 0) dusts.splice(k, 1);
    }
    if (shakeT > 0) shakeT -= dt;
    if (flashWall > 0) flashWall -= dt;
    if (gemT > 0) gemT -= dt;
  }

  function winGame() {
    finished = true; ok = true; hitStop = 0.4;
    score += Math.round(timeLeft * 20);
    game.feedback.good(W * 0.82, GROUND_Y - 300, { text: 'CLEAR', color: C.good, count: 30, flashColor: '#fff3d6' });
    game.fx.burst(W * 0.82, GROUND_Y - 300, { color: C.gold, count: 26, speed: 460 });
    game.audio.play('se_success', 0.55);
    finish();
  }

  function loseGame() {
    finished = true; ok = false; hitStop = 0.5; flashWall = 0.5;
    game.feedback.bad(WALL_X + WALL_W / 2, GROUND_Y - 320, { text: 'TIME UP', color: C.bad, shake: 12 });
    game.audio.play('se_failure', 0.5);
    finish();
  }

  function finish() {
    if (done) return;
    done = true; endWait = 1.3;
    game.audio.stopBgm();
  }

  // ---- 描画 ----
  function drawBackground() {
    var t = game.time.elapsed;
    game.draw.gradient(0, GROUND_Y, [[0, C.sky0], [0.6, C.sky1], [1, C.sky2]]);
    game.draw.rect(0, 0, W, H, '#ffd23f', 0.03 + 0.03 * Math.sin(t * 1.6));
    var off = (broken * 180 + (phase === 'scroll' ? (0.6 - scrollT) * 300 : 0)) % 360;
    // 遠い崖(ストリップ)
    for (var i = -1; i < 5; i++) {
      var bx = i * 360 - off * 0.3;
      for (var s = 0; s < 8; s++) game.draw.rect(bx + s * 12, 520 - s * 34, 360 - s * 24, 36, C.cliffFar);
    }
    for (var j = -1; j < 6; j++) {
      var mx = j * 260 - off * 0.6;
      for (var q = 0; q < 6; q++) game.draw.rect(mx + q * 14, 820 - q * 40, 240 - q * 28, 42, C.cliffMid);
    }
    game.draw.rect(0, GROUND_Y, W, H - GROUND_Y, C.ground);
    for (var r = 0; r < 12; r++) game.draw.rect(((r * 120 - off) % 1440 + 1440) % 1440 - 180, GROUND_Y + 30, 60, 14, C.rail);
    game.draw.rect(0, GROUND_Y + 16, W, 8, C.rail);
    // 遠くで作業する別の班のクレーン(演出のみ)
    var cx = 880 + Math.sin(t * 0.7) * 30;
    game.draw.line(cx, 300, cx, 700, '#3b2640', 10);
    game.draw.line(cx - 120, 310 + Math.sin(t) * 6, cx + 60, 300, '#3b2640', 8);
  }

  function drawWall(x, w, alpha) {
    var hgt = 640;
    var wob = phase === 'charge' ? Math.sin(game.time.elapsed * 40) * charge * 4 : 0;
    for (var row = 0; row < 16; row++) {
      var y = GROUND_Y - hgt + row * 40;
      var col = row % w.layers === 0 ? C.rock2 : (row % 2 ? C.rock1 : C.rock0);
      game.draw.rect(x + wob + (row % 2) * 10, y, WALL_W - (row % 2) * 10, 38, col, alpha);
      game.draw.rect(x + wob + 30 + (row * 23) % 70, y + 10, 26, 10, C.rockDark, alpha * 0.6);
    }
    for (var c = 0; c < w.crack; c++) {
      var cy = GROUND_Y - 520 + c * 150;
      game.draw.line(x + 30, cy, x + 90, cy + 60, C.dark, 6);
      game.draw.line(x + 90, cy + 60, x + 60, cy + 120, C.dark, 6);
    }
    if (flashWall > 0) game.draw.rect(x - 10, GROUND_Y - hgt - 10, WALL_W + 20, hgt + 10, '#ffffff', 0.6);
  }

  function drawScene() {
    var sx = shakeT > 0 ? game.random(-8, 8) : 0;
    drawBackground();
    var walkF = Math.floor(game.time.elapsed * 6) % 2;
    var bob = Math.sin(game.time.elapsed * 3) * 6;
    // 出口の旗(残り枚数が少ないほど近づく)
    var flagX = W - 120 + (NEEDED - broken) * 120;
    if (flagX < W + 40) game.draw.sprite(FLAG, FLAG_PAL, flagX, GROUND_Y - 110, 14, { anchor: 'center' });
    // 岩壁
    if (broken < NEEDED) {
      var wx = WALL_X + sx;
      if (phase === 'scroll') wx = WALL_X + scrollT / 0.6 * 520;
      drawWall(wx, curWall(), 1);
      if (broken + 1 < NEEDED) drawWall(wx + 360, walls[broken + 1], 0.55);
    }
    // 導火線
    if (phase === 'charge' || phase === 'fuse') {
      game.draw.sprite(STICK, STICK_PAL, WALL_X - 20, GROUND_Y - 60, 12, { anchor: 'center' });
      game.draw.line(WORKER_X + 60, GROUND_Y - 8, WALL_X - 20, GROUND_Y - 8, C.dark, 5);
      if (phase === 'fuse') {
        var p = 1 - fuseT / 0.36;
        var spx = WORKER_X + 60 + (WALL_X - 20 - WORKER_X - 60) * p;
        game.draw.circle(spx, GROUND_Y - 10, 16 + Math.random() * 6, C.gold);
      }
    }
    // 岩屑の山(詰めすぎ)
    if (rubble > 0) {
      for (var r = 0; r < 6; r++) game.draw.rect(WALL_X - 200 + r * 34, GROUND_Y - 30 - (r % 3) * 18, 40, 30 + (r % 3) * 18, C.rock1);
    }
    for (var i = 0; i < chunks.length; i++) {
      var c = chunks[i];
      game.draw.rect(c.x - c.s / 2, c.y - c.s / 2, c.s, c.s, c.c, Math.min(1, c.life));
    }
    if (gemT > 0) game.draw.sprite(GEM, GEM_PAL, WALL_X + WALL_W / 2, GROUND_Y - 420 - (0.8 - gemT) * 200, 14, { anchor: 'center', alpha: Math.min(1, gemT * 2) });
    for (var d = 0; d < dusts.length; d++) game.draw.circle(dusts[d].x, dusts[d].y, dusts[d].r, C.dust, dusts[d].life * 0.45);
    var wkX = WORKER_X + sx + (phase === 'exit' ? (0.7 - scrollT) * 900 : 0);
    game.draw.sprite(WORKER[phase === 'scroll' || phase === 'exit' ? walkF : 0], WORKER_PAL, wkX, GROUND_Y - 80 + bob * 0.5, 16, { anchor: 'center' });
  }

  function drawGauge() {
    var w = curWall();
    game.draw.rect(GAUGE_X - 8, GAUGE_Y - 8, GAUGE_W + 16, GAUGE_H + 16, C.dark);
    game.draw.gradient(GAUGE_Y, GAUGE_Y + GAUGE_H, [[0, '#4a3322'], [1, '#2d2118']]);
    game.draw.rect(0, GAUGE_Y, GAUGE_X, GAUGE_H, C.ground);
    game.draw.rect(GAUGE_X + GAUGE_W, GAUGE_Y, W - GAUGE_X - GAUGE_W, GAUGE_H, C.ground);
    game.draw.rect(GAUGE_X + GAUGE_W * w.lo, GAUGE_Y, GAUGE_W * (w.hi - w.lo), GAUGE_H, C.good, 0.8);
    var gw = (w.hi - w.lo) * 0.36;
    game.draw.rect(GAUGE_X + GAUGE_W * (w.mid - gw / 2), GAUGE_Y, GAUGE_W * gw, GAUGE_H, C.gold, 0.9);
    var fill = GAUGE_W * charge;
    var hot = charge > w.hi;
    game.draw.rect(GAUGE_X, GAUGE_Y + 20, fill, GAUGE_H - 40, hot ? C.bad : '#ff9a3c');
    // 詰めすぎ予告: 帯を越えたら赤く点滅
    if (hot && Math.floor(game.time.elapsed * 12) % 2 === 0) game.draw.rect(GAUGE_X, GAUGE_Y, GAUGE_W, GAUGE_H, C.bad, 0.25);
    game.draw.sprite(STICK, STICK_PAL, GAUGE_X + fill, GAUGE_Y + GAUGE_H / 2, 10, { anchor: 'center' });
    // 押す場所(親指ゾーン)の火薬樽
    var pr = phase === 'charge' ? 1.08 : 1 + Math.sin(game.time.elapsed * 4) * 0.03;
    game.draw.circle(W / 2, KEG_Y, 90 * pr, '#8a3c2a');
    game.draw.circle(W / 2, KEG_Y, 70 * pr, phase === 'charge' ? C.gold : '#d63c3c');
    game.draw.sprite(STICK, STICK_PAL, W / 2, KEG_Y, 12, { anchor: 'center' });
  }

  function drawHud() {
    txt(broken + ' / ' + NEEDED, 60, HUD_Y, 56, C.ink, 'left');
    txt('SCORE ' + score, W - 60, HUD_Y, 40, C.gold, 'right');
    var lowTime = timeLeft < 3 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(60, 160, W - 120, 22, C.dark);
    game.draw.rect(60, 160, (W - 120) * Math.max(0, timeLeft / TIME_LIMIT), 22, lowTime ? C.bad : C.good);
  }

  // ---- ATTRACT デモ(実ロジックを AI が操作) ----
  var demo = { t: 0, gx: W / 2, gy: KEG_Y, press: false, target: 0.5, cycle: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.0;
    if (cyc < dt || demo.t <= dt) {
      if (demo.t <= dt || broken >= NEEDED - 1 || phase === 'exit') initGame();
      demo.cycle++;
      var w = curWall();
      // 3回に1回は詰めすぎの失敗例を見せる
      demo.target = demo.cycle % 3 === 0 ? 0.99 : w.mid;
      rubble = 0;
    }
    if (phase === 'aim' && cyc > 0.25 && cyc < 1.6) beginCharge();
    if (phase === 'charge' && charge >= demo.target) releaseCharge();
    demo.press = phase === 'charge';
    demo.gx = W / 2; demo.gy = KEG_Y;
    stepWorld(dt, true);
  }

  // ---- 入力 ----
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.5); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function(x, y) {
    if (state !== S.PLAYING || finished) return;
    if (ready > 0) { game.audio.play('se_tap', 0.15); return; }
    if (!beginCharge()) {
      game.audio.play('se_tap', 0.15);
      game.fx.burst(x, y, { color: C.dust, count: 4, speed: 100 });
    }
  });
  game.onRelease(function(x, y) {
    if (state !== S.PLAYING || finished) return;
    if (phase !== 'charge') return;
    releaseCharge();
    game.fx.burst(x, y, { color: C.gold, count: 5, speed: 160 });
  });

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (walls === undefined) initGame();
      stepDemo(dt);
      drawScene();
      drawGauge();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 14 });
      txt(GAME_TITLE, W / 2, 330, 84, C.gold);
      txt('BEST ' + (game.best || 0), W / 2, 420, 40, C.ink);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, 1890, 44, C.gold);
      else txt('INSERT COIN', W / 2, 1890, 34, C.ink);
      return;
    }

    if (state === S.RESULT) {
      stepWorld(dt, true);
      drawScene();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, 420, 96, ok ? C.good : C.bad);
      txt('SCORE ' + score, W / 2, 540, 52, C.gold);
      txt(broken + ' / ' + NEEDED + '   PERFECT ' + perfects, W / 2, 620, 40, C.ink);
      if (!ok && broken < NEEDED) txt('あと' + (NEEDED - broken) + '枚!', W / 2, 700, 46, C.bad);
      if (score > (game.best || 0)) txt('NEW RECORD', W / 2, 790, 50, C.gold);
      else txt('BEST ' + (game.best || 0), W / 2, 790, 40, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, 1880, 40, C.ink);
      return;
    }

    // PLAYING
    if (done) {
      endWait -= dt;
      if (hitStop > 0) hitStop -= dt;
      else stepWorld(dt, true);
      if (endWait <= 0) {
        state = S.RESULT;
        var stats = { walls: broken, perfects: perfects };
        if (ok) game.end.success(score, stats);
        else game.end.failure(stats);
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap', 0.3);
    } else if (!finished) {
      timeLeft -= dt;
      stepWorld(dt, false);
      if (timeLeft <= 0 && !finished) { timeLeft = 0; loseGame(); }
    }

    drawScene();
    drawGauge();
    drawHud();
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, 760, 110, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([
      ['A3', 0.5], ['C4', 0.5], ['E4', 0.5], ['D4', 0.5], ['C4', 0.5], ['E4', 0.5], ['G4', 1],
      ['F4', 0.5], ['E4', 0.5], ['D4', 0.5], ['B3', 0.5], ['C4', 1], ['A3', 1]
    ], { tempo: 132, wave: 'square', volume: 0.05, loop: true, bass: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
