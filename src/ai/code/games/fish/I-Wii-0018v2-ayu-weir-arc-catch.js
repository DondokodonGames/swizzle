// I-Wii-0018v2-ayu-weir-arc-catch.js
// 簗の受けざる — 渓流から弧を描いて跳ねる鮎の軌道を読み、竹の簗に落ちてくる地点へ一度だけ受けざるを差し出す
// 操作: 簗の上(または上空)の落ちてきそうな位置をタップすると、漁師がその真下の簗へ受けざるを差し出す。差し出したざるは鮎が1匹落ちるまで動かせない。弧の早いうちに読んで差すほど高得点。川の岩に当たって跳ね返る鮎は、跳ねたあとの弧まで読む
// 終わり: 18秒のうちに鮎を7匹受ければCLEAR。3匹取り逃がす(簗の隙間へ落とす)か時間切れでGAME OVER
// @mechanic: trajectory
// @theme: mountain_stream_ayu_weir
// 世界観: 山の渓流に組んだ竹の簗場で、鮎漁師が流れから弧を描いて跳ね上がる鮎の落ちる先を読み、長柄の受けざるを先に差し出して受け止める
// 残るもの: 正誤(CLEAR/GAME OVER) + 受けた匹数・PERFECT数(ざるの真ん中)・早読みボーナス・スコア
// スタイル: 8bit HOME

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 8bit HOME: 3〜4色+黒、8x8の粗いドット、タイル反復の背景、輪郭線なし
  var STYLE = { bg: ['#5ca8ff', '#2038ec'], main: ['#b8a038', '#f8f8f8', '#38b048'], accent: ['#f8d830', '#000000'] };
  var C = {
    sky: STYLE.bg[0], river: STYLE.bg[1], bamboo: STYLE.main[0], bambooDk: '#6a5a10', white: STYLE.main[1], green: STYLE.main[2],
    yellow: STYLE.accent[0], black: STYLE.accent[1], rock: '#787878', red: '#e04030', silver: '#c8c8c8',
  };

  var GAME_TITLE = 'AYU WEIR';
  var TIME_LIMIT = 18;
  var NEEDED = 7;
  var MAX_MISS = 3;
  var GRAV = 2400;
  var WATER_Y = H * 0.5, ROCK_Y = H * 0.49, LAND_Y = H * 0.64;
  var ROCKS = [330, 750];
  var ZW = 84;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var mode = S.ATTRACT;

  var fishes, spawnT, spawnN, zaru, caught, misses, perfects, earlySum, score, finalScore, combo;
  var timeLeft, readyT, stopT, stopFish, fin, cleared, postT, joyT, sadT, warnT, endWhy;

  // 鮎(上り/下り)と漁師(鉢巻・手ぬぐい)
  var AYU_UP = ['......ss', '....sssy', '..ssssk.', '.sswss..', 'ssss....', 'ss......'];
  var AYU_DN = ['ss......', 'ssss....', '.sswss..', '..ssssk.', '....sssy', '......ss'];
  var AYU_PAL = { s: '#c8c8c8', w: '#f8f8f8', y: '#f8d830', k: '#000000' };
  var MAN_A = ['..rrrrrr..', '.rrrrrrrr.', '..ssssss..', '..sksks...', '..ssssss..', '.gggggggg.', 'gggwwggggg', 'g.gggggg.g', '..bbbbbb..', '..bb..bb..', '.bbb..bbb.'];
  var MAN_B = ['..rrrrrr..', '.rrrrrrrr.', '..ssssss..', '..sksks...', '..ssssss..', '.gggggggg.', 'gggwwggggs', 'g.gggggg..', '..bbbbbb..', '..bb..bb..', '.bbb..bbb.'];
  var MAN_JOY = ['..rrrrrr..', '.rrrrrrrr.', '..ssssss..', '..s.ss.s..', '..sskkss..', 's.gggggg.s', 'gggwwggggg', '..gggggg..', '..bbbbbb..', '..bb..bb..', '.bbb..bbb.'];
  var MAN_SAD = ['..........', '..rrrrrr..', '.rrrrrrrr.', '..ssssss..', '..sksks...', '..skkkks..', '.gggggggg.', 'gggwwggggg', '..bbbbbb..', '..bb..bb..', '.bbb..bbb.'];
  var MAN_PAL = { r: '#f8f8f8', s: '#f8b878', k: '#000000', g: '#38b048', w: '#f8f8f8', b: '#2038ec' };
  var ZARU = ['b.b.b.b.b.b', '.bbbbbbbbb.', '..bbbbbbb..'];

  function out(str, x, y, sz, color) {
    game.draw.text(str, x + 4, y + 4, { size: sz, color: C.black, bold: true });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true });
  }

  // 弧の計画: 普通の鮎は簗の目標点へ。跳ね返る鮎は岩の上で一度跳ねてから簗へ
  function planFish(k) {
    var bounce = k >= 3 && (k % 3 === 0 || k >= 7);
    var speed = Math.max(0.78, 1 - k * 0.03);
    var fromLeft = k % 2 === 0;
    var x0 = fromLeft ? game.random(120, 300) : game.random(780, 960), y0 = WATER_Y;
    var f = { x0: x0, y0: y0, t: -0.55, bounce: bounce, done: false, sx: x0, sy: y0, vx: 0, vy: 0, T1: 0, vy2: 0, rx: 0, landT: 0, landX: 0, x: x0, y: y0 };
    if (!bounce) {
      var xl = fromLeft ? game.random(Math.max(x0 + 200, 260), 900) : game.random(180, Math.min(x0 - 200, 820));
      var T = game.random(1.25, 1.55) * speed;
      f.vx = (xl - x0) / T;
      f.vy = (LAND_Y - y0 - 0.5 * GRAV * T * T) / T;
      f.landT = T; f.landX = xl;
    } else {
      for (var tries = 0; tries < 12; tries++) {
        var rx = fromLeft ? ROCKS[0] : ROCKS[1];
        if (Math.abs(rx - x0) < 120) rx = fromLeft ? ROCKS[1] : ROCKS[0];
        var T1 = game.random(0.75, 0.95) * speed;
        var vx = (rx - x0) / T1, vy = (ROCK_Y - y0 - 0.5 * GRAV * T1 * T1) / T1;
        var vhit = vy + GRAV * T1, vy2 = -0.62 * vhit;
        var dy = LAND_Y - ROCK_Y, disc = vy2 * vy2 + 2 * GRAV * dy;
        var t2 = (-vy2 + Math.sqrt(disc)) / GRAV;
        var xl2 = rx + vx * t2;
        f.vx = vx; f.vy = vy; f.T1 = T1; f.vy2 = vy2; f.rx = rx; f.landT = T1 + t2; f.landX = xl2;
        if (xl2 > 150 && xl2 < 930) break;
      }
      f.landX = Math.max(150, Math.min(930, f.landX));
    }
    return f;
  }

  function fishPos(f, t) {
    if (t <= 0) return { x: f.x0, y: f.y0, vy: 0 };
    if (!f.bounce || t < f.T1) return { x: f.x0 + f.vx * t, y: f.y0 + f.vy * t + 0.5 * GRAV * t * t, vy: f.vy + GRAV * t };
    var u = t - f.T1;
    return { x: f.rx + f.vx * u, y: ROCK_Y + f.vy2 * u + 0.5 * GRAV * u * u, vy: f.vy2 + GRAV * u };
  }

  function initGame() {
    fishes = []; spawnT = 0.3; spawnN = 0; caught = 0; misses = 0; perfects = 0; earlySum = 0; score = 0; finalScore = 0; combo = 0;
    zaru = { x: W / 2, ext: 0, on: false, at: 0, tapT: 0, back: 0 };
    timeLeft = TIME_LIMIT; readyT = 0.8; stopT = 0; stopFish = null; fin = false; cleared = false; postT = 0;
    joyT = 0; sadT = 0; warnT = 0; endWhy = '';
  }

  // 受けざるを差し出す(本番もデモも同じ処理)
  function present(x) {
    if (zaru.on || zaru.back > 0 || stopT > 0) {
      game.audio.tone('C3', 0.05, { wave: 'square', volume: 0.05 });
      game.fx.burst(zaru.x, LAND_Y, { color: C.bamboo, count: 3, speed: 120 });
      return;
    }
    zaru.x = Math.max(110, Math.min(W - 110, x)); zaru.on = true; zaru.ext = 0;
    // どの鮎に対して早く読めたか(空中の鮎の残り時間の割合)
    var best = 0;
    for (var i = 0; i < fishes.length; i++) {
      var f = fishes[i];
      if (f.done || f.t <= 0) continue;
      var rem = (f.landT - f.t) / f.landT;
      if (rem > best) best = rem;
    }
    zaru.early = best;
    game.audio.tone('G4', 0.06, { wave: 'square', volume: 0.07, slide: 120 });
    game.audio.play('se_tap', 0.2);
  }

  function land(f) {
    f.done = true;
    var ok = zaru.on && zaru.ext >= 1 && Math.abs(f.landX - zaru.x) <= ZW;
    if (ok) {
      caught++; combo++;
      var perfect = Math.abs(f.landX - zaru.x) <= 28;
      if (perfect) perfects++;
      var bonus = Math.round(Math.max(0, zaru.early) * 150);
      earlySum += zaru.early;
      var pts = 100 + bonus + (perfect ? 50 : 0) + combo * 10;
      score += pts; joyT = 0.6;
      game.feedback.good(zaru.x, LAND_Y - 120, { text: perfect ? 'PERFECT' : 'GOOD', color: perfect ? C.yellow : C.white, size: 60 });
      game.fx.popup('+' + pts, zaru.x, LAND_Y - 200, { color: C.yellow, size: 42 });
      if (caught === 4 && mode === S.PLAYING) {
        game.audio.play('se_milestone', 0.5);
        game.fx.popup('NICE', W / 2, H * 0.24, { color: C.yellow, size: 90 });
      }
      zaru.on = false; zaru.back = 0.25; f.inZaru = 0.5;
      if (mode === S.PLAYING && caught >= NEEDED) { stopT = 0.4; stopFish = null; game.audio.play('se_powerup', 0.4); }
    } else {
      // 取り逃がし: 止めて鮎を白く大きく
      combo = 0; stopT = 0.45; stopFish = f;
      game.fx.flash(C.white, 0.15);
      game.audio.tone('C3', 0.3, { wave: 'square', volume: 0.1, slide: -80 });
      if (zaru.on) { zaru.on = false; zaru.back = 0.25; }
    }
  }

  function resolveStop() {
    if (!stopFish) { ending(true); return; }
    misses++; sadT = 0.8;
    game.feedback.bad(stopFish.landX, LAND_Y - 120, { text: 'MISS', color: C.red, size: 60 });
    stopFish.gone = true; stopFish = null;
    if (mode === S.PLAYING && misses >= MAX_MISS) { endWhy = 'miss'; ending(false); }
  }

  function stepWeir(dt, spawning) {
    if (joyT > 0) joyT -= dt;
    if (sadT > 0) sadT -= dt;
    if (stopT > 0) { stopT -= dt; if (stopT <= 0) resolveStop(); return; }
    if (zaru.on && zaru.ext < 1) zaru.ext = Math.min(1, zaru.ext + dt / 0.18);
    if (zaru.back > 0) zaru.back -= dt;
    if (spawning) {
      spawnT -= dt;
      var flying = 0;
      for (var q = 0; q < fishes.length; q++) if (!fishes[q].done) flying++;
      if (spawnT <= 0 && flying < (spawnN >= 5 ? 2 : 1)) {
        fishes.push(planFish(spawnN++));
        spawnT = spawnN >= 5 ? 0.75 : 0.5;
      }
    }
    for (var i = fishes.length - 1; i >= 0; i--) {
      var f = fishes[i];
      if (f.inZaru > 0) { f.inZaru -= dt; if (f.inZaru <= 0) fishes.splice(i, 1); continue; }
      if (f.done) { if (f.gone) fishes.splice(i, 1); continue; }
      var before = f.t;
      f.t += dt;
      if (before <= 0 && f.t > 0) game.audio.tone('E5', 0.05, { wave: 'square', volume: 0.06, slide: 300 });
      if (f.bounce && before < f.T1 && f.t >= f.T1) { game.audio.tone('A4', 0.04, { wave: 'square', volume: 0.07 }); game.fx.burst(f.rx, ROCK_Y, { color: C.white, count: 6, speed: 200 }); }
      var p = fishPos(f, Math.min(f.t, f.landT));
      f.x = p.x; f.y = p.y; f.vyNow = p.vy;
      if (f.t >= f.landT) { f.x = f.landX; f.y = LAND_Y; land(f); if (stopT > 0) return; }
    }
  }

  function ending(win) {
    if (fin) return;
    fin = true; cleared = win; postT = 1.4;
    finalScore = win ? score + Math.round(timeLeft * 50) + (MAX_MISS - misses) * 120 : 0;
    game.audio.stopBgm();
    game.audio.play(win ? 'se_success' : 'se_failure', 0.55);
    if (win) {
      for (var i = 0; i < 5; i++) game.fx.burst(160 + i * 190, H * 0.4 + (i % 2) * 120, { color: i % 2 ? C.yellow : C.white, count: 18, speed: 480 });
      game.fx.flash(C.white, 0.2);
    } else sadT = 3;
  }

  // ---- 入力 ----
  game.onTap(function(x, y) {
    if (mode === S.ATTRACT) { game.audio.play('se_coin'); mode = S.PLAYING; initGame(); return; }
    if (mode === S.RESULT) { game.audio.play('se_tap'); mode = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (fin || readyT > 0 || stopT > 0) { game.audio.play('se_tap', 0.06); return; }
    if (y < 230) { game.audio.tone('E4', 0.04, { wave: 'square', volume: 0.04 }); return; }
    present(x);
  });

  // ---- 描画 ----
  function drawStream(t) {
    game.draw.gradient(0, H, [[0, STYLE.bg[0]], [0.42, STYLE.bg[0]], [0.43, STYLE.bg[1]], [1, '#101870']]);
    // 遠い峰と雲(粗いドットの段々)
    for (var pk = 0; pk < 3; pk++) {
      var px0 = pk * 400 - 40;
      for (var st = 0; st < 6; st++) game.draw.rect(px0 + 200 - (st + 1) * 34, H * 0.16 + st * 40, (st + 1) * 68, 40, '#3870c8');
      game.draw.rect(px0 + 200 - 34, H * 0.16, 68, 24, C.white);
    }
    for (var cl = 0; cl < 4; cl++) {
      var cx = ((t * 24 + cl * 300) % (W + 320)) - 160, cy = 270 + (cl % 2) * 70;
      game.draw.rect(cx, cy, 160, 32, C.white);
      game.draw.rect(cx + 32, cy - 32, 96, 32, C.white);
    }
    // 山と森のタイル
    for (var m = 0; m < 9; m++) {
      var mx = m * 128;
      for (var r = 0; r < 4; r++) game.draw.rect(mx + 64 - (r + 1) * 16, H * 0.3 + r * 32, (r + 1) * 32, 32, C.green);
    }
    for (var tr = 0; tr < 17; tr++) game.draw.rect(tr * 64, H * 0.42 - 32, 48, 32, '#207028');
    // 流れのタイル(左→右へ流れる)
    var off = (t * 120) % 64;
    for (var y = H * 0.43; y < LAND_Y - 20; y += 32) for (var x = -64; x < W; x += 64) {
      if (((Math.floor((y - H * 0.43) / 32)) % 2) === 0) game.draw.rect(x + off, y + 10, 24, 8, C.sky);
    }
    // 岩
    for (var k = 0; k < ROCKS.length; k++) {
      game.draw.rect(ROCKS[k] - 56, ROCK_Y, 112, 40, C.rock);
      game.draw.rect(ROCKS[k] - 40, ROCK_Y - 16, 80, 16, C.rock);
      game.draw.rect(ROCKS[k] - 24, ROCK_Y - 16, 24, 8, C.white);
    }
    // 簗(竹の簀、タイル)
    game.draw.rect(0, LAND_Y, W, H * 0.12, C.bambooDk);
    for (var b = 0; b < W; b += 32) game.draw.rect(b, LAND_Y, 24, H * 0.12, C.bamboo);
    for (var s = 0; s < 3; s++) game.draw.rect(0, LAND_Y + 40 + s * 70, W, 8, C.bambooDk);
    // 下流の水と川原
    game.draw.rect(0, LAND_Y + H * 0.12, W, H * 0.04, C.river);
    game.draw.rect(0, H * 0.8, W, H * 0.2, '#a0a0a0');
    for (var p = 0; p < 34; p++) game.draw.rect((p * 157) % W, H * 0.82 + (p * 61) % 300, 32, 16, C.rock);
  }

  function drawFish(f, t) {
    if (f.t <= 0) {
      // 跳ねる前の予告: 水面の波紋と黒い影
      var u = 1 + f.t / 0.55;
      game.draw.rect(f.x0 - 40 - u * 30, WATER_Y + 4, 80 + u * 60, 8, C.white, 0.8);
      if (Math.floor(t * 10) % 2 === 0) game.draw.rect(f.x0 - 24, WATER_Y + 18, 48, 12, C.black);
      return;
    }
    if (f.inZaru > 0) return;
    var big = stopFish === f ? 1.4 : 1;
    var pal = stopFish === f && Math.floor(t * 16) % 2 === 0 ? { s: '#ffffff', w: '#ffffff', y: '#ffffff', k: '#ffffff' } : AYU_PAL;
    var spr = (f.vyNow || 0) < 0 ? AYU_UP : AYU_DN;
    game.draw.sprite(spr, pal, f.x, f.y, 12 * big, { anchor: 'center', flipX: f.vx < 0 });
  }

  function drawMan(t) {
    var x = W / 2, y = H * 0.86;
    var thr = zaru.on;
    var fr = sadT > 0 || (fin && !cleared) ? MAN_SAD : joyT > 0 || (fin && cleared) ? MAN_JOY : thr ? MAN_B : (Math.floor(t * 2) % 2 ? MAN_A : MAN_B);
    // 長柄: 漁師の手から差し出したざるへ
    if (zaru.on || zaru.back > 0) {
      var e = zaru.on ? zaru.ext : Math.max(0, zaru.back / 0.25);
      var zx = x + (zaru.x - x) * e, zy = y - 60 + (LAND_Y + 30 - (y - 60)) * e;
      game.draw.line(x + 40, y - 40, zx, zy, C.bambooDk, 16);
      game.draw.sprite(ZARU, { b: C.yellow }, zx, zy, 16, { anchor: 'center' });
      for (var i = 0; i < fishes.length; i++) if (fishes[i].inZaru > 0) game.draw.sprite(AYU_DN, AYU_PAL, zx, zy - 20, 9, { anchor: 'center' });
    }
    game.draw.sprite(fr, MAN_PAL, x, y + Math.sin(t * 2) * 4, 16, { anchor: 'center' });
  }

  function drawHud(t) {
    var low = timeLeft < 4 && Math.floor(t * 6) % 2 === 0;
    game.draw.rect(0, 0, W, 230, C.black);
    game.draw.rect(64, 36, (W - 128) * Math.max(0, timeLeft / TIME_LIMIT), 24, low ? C.red : C.white);
    out(caught + ' / ' + NEEDED, W / 2, 140, 66, C.white);
    for (var m = 0; m < MAX_MISS; m++) game.draw.sprite(AYU_DN, m < misses ? { s: '#e04030', w: '#e04030', y: '#e04030', k: '#000000' } : AYU_PAL, 90 + m * 80, 140, 6, { anchor: 'center' });
    out('' + score, W - 150, 140, 44, C.yellow);
  }

  function drawScene(t) {
    drawStream(t);
    for (var i = 0; i < fishes.length; i++) drawFish(fishes[i], t);
    drawMan(t);
  }

  // ---- ATTRACT: 本物の present()/land() で実演。1匹目は弧の頂点で落下点に差してPERFECT、2匹目は今いる真下に差してMISS、3匹目は岩で跳ねた先を読んで受ける ----
  var demo = { t: 0, x: W / 2, y: H * 0.7, press: false, n: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 7.5;
    if (cyc < dt || demo.t <= dt) {
      initGame(); readyT = 0; demo.n = 0; demo.did = -1;
      fishes.push(planFish(0));
      spawnN = 1;
    }
    if (demo.n >= 1 && demo.n < 3 && fishes.length === 0 && stopT <= 0) {
      fishes.push(demo.n === 2 ? planFish(3) : planFish(1));
      spawnN = 99;
    }
    stepWeir(dt, false);
    demo.press = false;
    var tx = W / 2, ty = H * 0.72;
    var f = null;
    for (var i = 0; i < fishes.length; i++) if (!fishes[i].done && fishes[i].t > 0) { f = fishes[i]; break; }
    if (f && demo.did !== demo.n) {
      var aim = demo.n === 1 ? f.x : f.landX;
      tx = aim; ty = LAND_Y + 20;
      var when = demo.n === 1 ? 0.45 : (f.bounce ? f.T1 + 0.08 : f.landT * 0.48);
      if (f.t >= when && Math.abs(demo.x - tx) < 80) { demo.press = true; present(aim); demo.did = demo.n; }
    }
    for (var k = 0; k < fishes.length; k++) if (fishes[k].done && demo.did === demo.n && !fishes[k].counted) { fishes[k].counted = true; demo.n++; }
    if (zaru.on) demo.press = true;
    demo.x += (tx - demo.x) * Math.min(1, dt * 10);
    demo.y += (ty - demo.y) * Math.min(1, dt * 10);
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;

    if (mode === S.ATTRACT) {
      stepDemo(dt);
      drawScene(t);
      game.draw.hand(demo.x, demo.y, { press: demo.press, scale: 13 });
      out(GAME_TITLE, W / 2, H * 0.06 + Math.sin(t * 2) * 5, 100, C.yellow);
      out('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.105, 38, C.white);
      if (Math.floor(t * 1.8) % 2 === 0) out('► 100円 投入 ◄', W / 2, H * 0.97, 46, C.yellow);
      else out('TAP TO START', W / 2, H * 0.97, 40, C.white);
      return;
    }

    if (mode === S.RESULT) {
      drawScene(t);
      game.draw.rect(90, H * 0.3, W - 180, 520, C.black, 0.9);
      game.draw.rect(90, H * 0.3, W - 180, 12, cleared ? C.yellow : C.red);
      out(cleared ? 'CLEAR' : (endWhy === 'time' ? 'TIME UP' : 'GAME OVER'), W / 2, H * 0.35, 100, cleared ? C.yellow : C.red);
      out('SCORE ' + finalScore, W / 2, H * 0.41, 60, C.white);
      out(caught + ' / ' + NEEDED + '   PERFECT ' + perfects, W / 2, H * 0.46, 44, C.white);
      if (cleared && finalScore > game.best) out('NEW RECORD', W / 2, H * 0.51, 56, C.yellow);
      else out('BEST ' + Math.max(game.best, finalScore), W / 2, H * 0.51, 42, C.yellow);
      if (!cleared) out('あと' + (NEEDED - caught) + '匹!', W / 2, H * 0.27, 64, C.red);
      if (Math.floor(t * 2) % 2 === 0) out('TAP TO CONTINUE', W / 2, H * 0.97, 40, C.white);
      return;
    }

    // ---- PLAYING ----
    if (fin) {
      postT -= dt;
      if (postT <= 0) {
        mode = S.RESULT;
        var stats = { caught: caught, perfects: perfects, misses: misses, earlyRead: caught > 0 ? Math.round(earlySum / caught * 100) : 0 };
        if (cleared) game.end.success(finalScore, stats);
        else game.end.failure(stats);
      }
    } else if (readyT > 0) {
      readyT -= dt;
      if (readyT <= 0) game.audio.play('se_tap', 0.4);
    } else {
      if (stopT <= 0) timeLeft -= dt;
      stepWeir(dt, true);
      if (!fin && timeLeft < 4) {
        warnT -= dt;
        if (warnT <= 0) { warnT = 0.5; game.audio.tone(timeLeft < 2 ? 'A5' : 'E5', 0.05, { wave: 'square', volume: 0.06 }); }
      }
      if (!fin && stopT <= 0 && timeLeft <= 0) {
        timeLeft = 0; endWhy = 'time';
        game.fx.flash(C.white, 0.15);
        game.feedback.bad(W / 2, H * 0.3, { text: 'TIME UP', color: C.red, size: 72 });
        ending(false);
      }
    }

    drawScene(t);
    drawHud(t);
    if (readyT > 0) out(readyT > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 120, C.yellow);
  });

  game.onStart(function() {
    game.audio.melody([
      ['G5', 0.5], ['E5', 0.5], ['D5', 0.5], ['E5', 0.5], ['G5', 1], ['A5', 1],
      ['G5', 0.5], ['E5', 0.5], ['D5', 0.5], ['C5', 0.5], ['D5', 2],
      ['E5', 0.5], ['G5', 0.5], ['A5', 0.5], ['C6', 0.5], ['A5', 1], ['G5', 1],
      ['E5', 0.5], ['D5', 0.5], ['C5', 1], ['C5', 2],
    ], { tempo: 140, wave: 'square', volume: 0.055, loop: true, bass: [['C3', 1], ['G2', 1], ['C3', 1], ['G2', 1], ['A2', 1], ['E2', 1], ['G2', 1], ['D2', 1]] });
    mode = S.ATTRACT;
    initGame();
  });
})(game);
