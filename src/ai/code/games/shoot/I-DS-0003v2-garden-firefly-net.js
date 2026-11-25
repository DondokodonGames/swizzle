// I-DS-0003v2-garden-firefly-net.js
// 植物園の蛍あみ — 夜の水辺でパッと灯った蛍に、消える前に網をかぶせる。赤い毒蛾には網を向けない
// 操作: 蛍がうっすら瞬いた所を見張り、明るく灯った瞬間にその場所をタップして網をかぶせる。近くで2匹灯れば1振りで2匹とれる。飛んでいる赤い蛾ごと網をかぶせると失敗
// 終わり: 16秒以内に蛍を10匹とればCLEAR。空振り・蛾を網に入れるのが3回、または時間切れでGAME OVER
// @mechanic: aim_shoot
// @theme: botanical_garden_firefly_net
// 世界観: 夏の夜の植物園の夜間観察会で、虫かごを提げた少年が水辺の小径に立ち、草むらのどこかで光った瞬間の蛍に虫取り網をかぶせて10匹集める(観察のあと放す)
// 残るもの: 正誤(CLEAR/GAME OVER) + とった蛍の数・最大同時どり・スコア
// スタイル: NEO-RETRO

(function (game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // NEO-RETRO: 限定6色。大きいドット、差し色は蛍の黄緑1色だけ
  var STYLE = { bg: ['#0c1024', '#1b2442'], main: ['#2c4a3c', '#5f8a62', '#ece4cc'], accent: ['#d6ff3c', '#ff5468'] };
  var NIGHT = STYLE.bg[0], DUSK = STYLE.bg[1], LEAF = STYLE.main[0], REED = STYLE.main[1], PALE = STYLE.main[2], GLOW = STYLE.accent[0], RED = STYLE.accent[1];

  var TITLE = 'HOTARU NET';
  var TIME_LIMIT = 16;
  var NEEDED = 10;
  var STRIKES = 3;
  var NET_R = 105;
  var PRE = 0.55;
  var FIELD_Y0 = H * 0.18, FIELD_Y1 = H * 0.66;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var BUG = [['.kk.', 'kwwk', '.kk.', '.gg.'], ['k..k', '.kk.', '.kk.', '.gg.']];
  var MOTH = [
    ['r....r', 'rr..rr', 'rrkkrr', 'rrkkrr', '.r..r.'],
    ['......', 'r....r', 'rrkkrr', 'rrkkrr', 'r.kk.r'],
  ];
  var BOY = [
    ['..hhhhh...', '.hhhhhhh..', '.hfffffh..', '.fefffef..', '.fffmfff..', '..fffff...', '.ssssss...', 'sssssssf..', 'f.ssss.ff.', '..pppp....', '..p..p....', '.kk..kk...'],
    ['..hhhhh...', '.hhhhhhh..', '.hfffffh..', '.fefffef..', '.fffmfff..', '..fffff.ff', '.ssssssff.', 'ssssssss..', 'f.ssss....', '..pppp....', '..p..p....', '.kk..kk...'],
    ['f.hhhhh.f.', 'fhhhhhhhf.', '.hfffffh..', '.fefffef..', '.ffmmmff..', '..fffff...', '.ssssss...', '.ssssss...', '..ssss....', '..pppp....', '.p....p...', 'kk....kk..'],
    ['..........', '..hhhhh...', '.hhhhhhh..', '.hfffffh..', '.fkfffkf..', '.fffmfff..', '..fffff...', '.ssssss...', 'f.ssss.f..', '..pppp....', '..p..p....', '.kk..kk...'],
  ];
  var REEDS = [['.g.', '.g.', 'gg.', '.gg', '.g.', '.g.'], ['..g', '.g.', 'gg.', '.gg', '.g.', '.g.']];
  var JAR = ['.kkkk.', 'k....k', 'k....k', 'k....k', 'k....k', '.kkkk.'];

  function label(s, x, y, sz, col) {
    game.draw.text(s, x + 5, y + 5, { size: sz, color: NIGHT, bold: true, align: 'center' });
    game.draw.text(s, x, y, { size: sz, color: col, bold: true, align: 'center' });
  }

  // ── 蛍1匹(=1回の瞬き)。プレイ・デモ共通 ──
  function makeFly(x, y, glowDur, gold) {
    return { x: x, y: y, vx: game.random(-40, 40), vy: game.random(-30, 20), t: 0, glowDur: glowDur, gold: !!gold, dead: false, caught: false };
  }
  function flyPhase(f) {
    if (f.t < PRE) return 'pre';
    if (f.t < PRE + f.glowDur) return 'glow';
    return 'out';
  }
  function catchable(f) {
    if (f.dead || f.caught) return false;
    var ph = flyPhase(f);
    return ph === 'glow' || (ph === 'pre' && f.t > PRE - 0.15);
  }
  function stepFlies(list, dt) {
    for (var i = 0; i < list.length; i++) {
      var f = list[i];
      if (f.dead) continue;
      f.t += dt;
      f.x += f.vx * dt; f.y += f.vy * dt;
      if (f.t > PRE + f.glowDur + 0.25) f.dead = true;
    }
  }

  // 網の当たり判定: 蛾が網に入っていれば蛾が優先
  function netHits(x, y, list, mo) {
    var res = { moth: false, flies: [] };
    if (mo && mo.live && mo.warn <= 0 && game.hit.circle(x, y, NET_R, mo.x, mo.y, 46)) res.moth = true;
    for (var i = 0; i < list.length; i++) if (catchable(list[i]) && game.hit.circle(x, y, NET_R, list[i].x, list[i].y, 18)) res.flies.push(list[i]);
    return res;
  }

  // ── 描画 ──
  function drawGarden() {
    var tt = game.time.elapsed;
    game.draw.gradient(0, H, [[0, NIGHT], [0.45, DUSK], [0.75, '#16203a'], [1, NIGHT]]);
    for (var s = 0; s < 22; s++) game.draw.rect((s * 211) % W, 40 + (s * 97) % 300, 8, 8, PALE, 0.25 + 0.2 * Math.sin(tt * 2 + s));
    // 遠景の木立(大きい丸)
    for (var i = 0; i < 7; i++) game.draw.circle(i * 180 - 20, H * 0.24, 150 + (i % 3) * 30, LEAF, 0.55);
    game.draw.rect(0, H * 0.24, W, H * 0.30, LEAF, 0.35);
    // 池
    game.draw.rect(0, H * 0.58, W, H * 0.12, '#101a34');
    for (var w = 0; w < 6; w++) game.draw.rect(60 + w * 170 + Math.sin(tt + w) * 20, H * 0.61 + (w % 3) * 40, 110, 6, DUSK, 0.8);
    game.draw.circle(W * 0.22, H * 0.65, 44, REED, 0.6);
    game.draw.circle(W * 0.70, H * 0.62, 36, REED, 0.6);
    // 小径と草
    game.draw.rect(0, H * 0.70, W, H * 0.30, '#121a30');
    for (var p = 0; p < 5; p++) game.draw.rect(140 + p * 190, H * 0.80 + (p % 2) * 30, 140, 40, '#2a3456');
    for (var g = 0; g < 12; g++) {
      var gx = (g * 97) % W, gy = H * 0.74 + ((g * 53) % 5) * 52;
      game.draw.rect(gx, gy, 12, 34, LEAF); game.draw.rect(gx + 16, gy + 8, 12, 26, REED, 0.7); game.draw.rect(gx - 16, gy + 12, 12, 22, LEAF);
    }
    for (var r = 0; r < 9; r++) {
      var fr = Math.floor(tt * 1.5 + r) % 2;
      game.draw.sprite(REEDS[fr], { g: REED }, 40 + r * 125, H * 0.575, 16, { anchor: 'center' });
    }
  }

  function drawFly(f) {
    if (f.dead || f.caught) return;
    var ph = flyPhase(f);
    var col = f.gold ? PALE : GLOW;
    if (ph === 'pre') {
      var flick = 0.18 + 0.22 * Math.abs(Math.sin(f.t * 22));
      game.draw.circle(f.x, f.y, 26, col, flick * 0.6);
      game.draw.sprite(BUG[0], { k: LEAF, w: REED, g: col }, f.x, f.y, 7, { anchor: 'center', alpha: 0.6 });
    } else if (ph === 'glow') {
      var k = (f.t - PRE) / f.glowDur;
      var big = f.gold ? 1.5 : 1;
      game.draw.circle(f.x, f.y, (70 - k * 20) * big, col, 0.16);
      game.draw.circle(f.x, f.y, (40 - k * 10) * big, col, 0.38);
      game.draw.circle(f.x, f.y, 18 * big, col, 0.95);
      game.draw.sprite(BUG[Math.floor(f.t * 12) % 2], { k: NIGHT, w: PALE, g: col }, f.x, f.y - 6, 8, { anchor: 'center' });
      // 残り時間リング(縮む)
      game.draw.circle(f.x, f.y + 58, 10 * (1 - k) + 2, PALE, 0.8);
      game.draw.circle(f.x, f.y, 2, PALE);
      game.draw.circle(f.x, H * 0.66 + (H * 0.66 - f.y) * 0.08, 10, col, 0.25);
    } else {
      game.draw.circle(f.x, f.y, 10, col, Math.max(0, 0.3 - (f.t - PRE - f.glowDur)));
    }
  }

  function drawMoth(mo, flashK) {
    if (!mo || !mo.live) return;
    if (mo.warn > 0) {
      // 予告: 出てくる端に赤い点滅マーカー
      if (Math.floor(mo.warn * 10) % 2 === 0) {
        game.draw.circle(mo.dir > 0 ? 40 : W - 40, mo.baseY, 34, RED, 0.8);
        game.draw.rect(mo.dir > 0 ? 34 : W - 46, mo.baseY - 24, 12, 30, PALE);
        game.draw.rect(mo.dir > 0 ? 34 : W - 46, mo.baseY + 14, 12, 10, PALE);
      }
      return;
    }
    var sc = 13 * (1 + (flashK || 0) * 0.6);
    game.draw.sprite(MOTH[Math.floor(game.time.elapsed * 10) % 2], { r: flashK ? '#ffffff' : RED, k: NIGHT }, mo.x, mo.y, sc, { anchor: 'center', flipX: mo.dir < 0 });
  }

  function drawNet(n, boyX) {
    if (!n) return;
    var a = Math.min(1, n.t / 0.25);
    game.draw.line(boyX + 70, H * 0.86, n.x, n.y + NET_R * 0.6, REED, 10);
    game.draw.circle(n.x, n.y, NET_R, PALE, 0.18 * a);
    for (var i = 0; i < 18; i++) {
      var ang = (i / 18) * Math.PI * 2;
      game.draw.rect(n.x + Math.cos(ang) * NET_R - 5, n.y + Math.sin(ang) * NET_R - 5, 10, 10, n.bad ? RED : PALE, a);
    }
  }

  function drawBoy(pose, x) {
    var fr = pose === 'swing' ? 1 : pose === 'cheer' ? 2 : pose === 'sad' ? 3 : 0;
    var bob = Math.sin(game.time.elapsed * 3) * 6 - (pose === 'cheer' ? Math.abs(Math.sin(game.time.elapsed * 9)) * 30 : 0);
    game.draw.sprite(BOY[fr], { h: NIGHT, f: PALE, e: NIGHT, m: RED, s: REED, p: LEAF, k: NIGHT }, x, H * 0.86 + bob, 16, { anchor: 'center' });
  }

  function drawJar(n) {
    game.draw.sprite(JAR, { k: PALE }, W * 0.82, H * 0.86, 24, { anchor: 'center' });
    for (var i = 0; i < n; i++) {
      var tw = 0.5 + 0.5 * Math.sin(game.time.elapsed * 5 + i * 1.7);
      game.draw.circle(W * 0.82 - 40 + (i % 4) * 27, H * 0.86 + 40 - Math.floor(i / 4) * 30, 9, GLOW, 0.4 + tw * 0.6);
    }
  }

  // ── 状態 ──
  var flies, moth, net, caughtN, strikes, score, combo, bestPair, timeLeft, slotT, mothT, ready, halt, over, won, endT, prevBest, milestoneDone, boyPose, poseT, sparkT;

  function initGame() {
    flies = []; moth = null; net = null; caughtN = 0; strikes = 0; score = 0; combo = 0; bestPair = 1;
    timeLeft = TIME_LIMIT; slotT = [0.2, 1.4, 2.6]; mothT = 4.0;
    ready = 0.8; halt = null; over = false; won = false; endT = 0; milestoneDone = false; boyPose = 'idle'; poseT = 0; sparkT = 0;
    prevBest = game.best || 0;
  }

  function progressK() { return caughtN / NEEDED; }

  function spawnFly() {
    var k = progressK();
    var glow = 0.95 - k * 0.4;
    var x = game.random(140, W - 140), y = game.random(FIELD_Y0 + 40, FIELD_Y1 - 60);
    var gold = game.random(0, 1) < 0.12;
    flies.push(makeFly(x, y, glow, gold));
    // 後半は近くにもう1匹(1振りで2匹のチャンス)
    if (k > 0.35 && game.random(0, 1) < 0.35) flies.push(makeFly(x + game.random(-90, 90), y + game.random(-70, 70), glow, false));
  }

  function spawnMoth() {
    var dir = game.random(0, 1) < 0.5 ? 1 : -1;
    moth = { live: true, warn: 0.65, dir: dir, x: dir > 0 ? -60 : W + 60, baseY: game.random(FIELD_Y0 + 80, FIELD_Y1 - 80), y: 0, t: 0, speed: 260 + progressK() * 120 };
    moth.y = moth.baseY;
    game.audio.tone(220, 0.12, { wave: 'sawtooth', volume: 0.06, slide: -60 });
  }

  function stepMoth(mo, dt) {
    if (!mo || !mo.live) return;
    if (mo.warn > 0) { mo.warn -= dt; return; }
    mo.t += dt;
    mo.x += mo.dir * mo.speed * dt;
    mo.y = mo.baseY + Math.sin(mo.t * 5) * 50;
    if (mo.x < -90 || mo.x > W + 90) mo.live = false;
  }

  function strike(x, y, what) {
    strikes++;
    combo = 0;
    boyPose = 'sad'; poseT = 0.5;
    if (strikes >= STRIKES) {
      halt = { t: 0.5, max: 0.5, x: x, y: y, what: what };
    } else {
      game.feedback.bad(x, y, { text: 'MISS' });
    }
  }

  function finish(ok) {
    if (over) return;
    over = true; won = ok; endT = 1.7;
    if (ok) score += Math.round(timeLeft * 25) + (STRIKES - strikes) * 60;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.55);
    boyPose = ok ? 'cheer' : 'sad';
  }

  game.onTap(function (x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.5); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.2); state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (over || halt || ready > 0) { game.audio.play('se_tap', 0.05); return; }
    var hit = netHits(x, y, flies, moth);
    net = { x: x, y: y, t: 0, bad: false };
    boyPose = 'swing'; poseT = 0.25;
    game.audio.play('se_jump', 0.2);
    if (hit.moth) {
      net.bad = true;
      strike(moth.x, moth.y, 'moth');
      return;
    }
    if (hit.flies.length === 0) {
      net.bad = true;
      strike(x, y, 'empty');
      return;
    }
    var gain = 0;
    for (var i = 0; i < hit.flies.length; i++) {
      var f = hit.flies[i];
      f.caught = true;
      gain += f.gold ? 2 : 1;
    }
    caughtN = Math.min(NEEDED, caughtN + hit.flies.length);
    combo++;
    bestPair = Math.max(bestPair, hit.flies.length);
    score += gain * 100 * (hit.flies.length > 1 ? 2 : 1) + combo * 10;
    var perfect = hit.flies[0] && flyPhase(hit.flies[0]) === 'glow' && hit.flies[0].t - PRE < hit.flies[0].glowDur * 0.4;
    game.feedback.good(x, y - 30, { text: hit.flies.length > 1 ? 'NICE x' + hit.flies.length : perfect ? 'PERFECT' : 'GOOD', color: GLOW, count: 12 + hit.flies.length * 6 });
    game.audio.play('se_coin', 0.25);
    if (caughtN >= 5 && !milestoneDone) {
      milestoneDone = true;
      game.fx.popup(caughtN + ' / ' + NEEDED, W / 2, H * 0.14, { color: GLOW, size: 64 });
      game.audio.play('se_milestone', 0.4);
    }
    if (caughtN >= NEEDED) finish(true);
  });

  // ── ATTRACT: 灯った蛍を2匹すくい、3匹目は飛んできた蛾ごとかぶせて失敗 ──
  var DEMO_CYCLE = 4.8;
  var demo = { t: 0, flies: [], moth: null, net: null, gx: W / 2, gy: H * 0.8, press: false, step: 0, flash: 0 };
  var DEMO_SCRIPT = [
    { at: 0.1, x: W * 0.30, y: H * 0.34, tap: 0.95 },
    { at: 1.25, x: W * 0.68, y: H * 0.50, tap: 2.1 },
    { at: 2.55, x: W * 0.46, y: H * 0.42, tap: 3.35 },
  ];
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % DEMO_CYCLE;
    if (cyc < dt || demo.t <= dt) { demo.flies = []; demo.moth = null; demo.net = null; demo.step = 0; demo.flash = 0; }
    for (var i = 0; i < DEMO_SCRIPT.length; i++) {
      var sc = DEMO_SCRIPT[i];
      if (cyc >= sc.at && demo.flies.length === i) { var f = makeFly(sc.x, sc.y, 0.9, false); f.vx = 0; f.vy = 0; demo.flies.push(f); }
    }
    if (cyc >= 1.9 && !demo.moth) {
      demo.moth = { live: true, warn: 0.6, dir: 1, x: -60, baseY: H * 0.42, y: H * 0.42, t: 0, speed: 650 };
    }
    stepFlies(demo.flies, dt);
    stepMoth(demo.moth, dt);
    if (demo.net) demo.net.t += dt;
    var tgt = DEMO_SCRIPT[Math.min(demo.step, DEMO_SCRIPT.length - 1)];
    var tx = tgt.x, ty = tgt.y;
    demo.press = false;
    if (demo.step < DEMO_SCRIPT.length && cyc >= tgt.tap) {
      var hit = netHits(tgt.x, tgt.y, demo.flies, demo.moth);
      demo.net = { x: tgt.x, y: tgt.y, t: 0, bad: hit.moth };
      if (hit.moth) { demo.flash = 0.45; game.feedback.bad(demo.moth.x, demo.moth.y, { text: 'MISS', volume: 0.3 }); }
      else if (hit.flies.length) { hit.flies[0].caught = true; game.feedback.good(tgt.x, tgt.y - 30, { text: 'GOOD', color: GLOW, count: 10, volume: 0.3 }); }
      demo.step++;
    }
    if (demo.step > 0 && cyc - DEMO_SCRIPT[demo.step - 1].tap < 0.2) demo.press = true;
    if (demo.flash > 0) demo.flash -= dt;
    if (demo.step >= DEMO_SCRIPT.length) { tx = W * 0.5; ty = H * 0.62; }
    demo.gx += (tx - demo.gx) * Math.min(1, dt * 7);
    demo.gy += (ty - demo.gy) * Math.min(1, dt * 7);
    return cyc;
  }

  function drawHud() {
    for (var i = 0; i < NEEDED; i++) {
      var x = 70 + i * 66;
      game.draw.circle(x, 70, 22, i < caughtN ? GLOW : DUSK, i < caughtN ? 1 : 0.9);
      if (i < caughtN) game.draw.circle(x, 70, 32, GLOW, 0.2);
    }
    for (var s = 0; s < STRIKES; s++) game.draw.circle(W - 70 - s * 60, 70, 20, s < strikes ? RED : PALE, s < strikes ? 1 : 0.35);
    label(caughtN + ' / ' + NEEDED, W * 0.40, 140, 44, PALE);
    label(String(score), W * 0.80, 140, 44, GLOW);
    var fr = Math.max(0, timeLeft / TIME_LIMIT);
    game.draw.rect(40, 186, W - 80, 22, NIGHT);
    game.draw.rect(44, 190, (W - 88) * fr, 14, timeLeft < 4 && Math.floor(game.time.elapsed * 6) % 2 === 0 ? RED : GLOW);
  }

  function drawResult() {
    game.draw.rect(80, H * 0.28, W - 160, H * 0.30, NIGHT, 0.85);
    label(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.33, 104, won ? GLOW : RED);
    label(caughtN + ' / ' + NEEDED, W / 2, H * 0.40, 60, PALE);
    label('SCORE ' + score, W / 2, H * 0.46, 50, PALE);
    if (won && score > prevBest) label('NEW RECORD', W / 2, H * 0.52, 54, GLOW);
    else label('BEST ' + Math.max(prevBest, game.best || 0), W / 2, H * 0.52, 42, REED);
    if (!won && caughtN < NEEDED) label('あと' + (NEEDED - caughtN) + '匹!', W / 2, H * 0.565, 46, GLOW);
  }

  game.onUpdate(function (dt) {
    if (state === S.ATTRACT) {
      var cyc = stepDemo(dt);
      drawGarden();
      for (var i = 0; i < demo.flies.length; i++) drawFly(demo.flies[i]);
      drawMoth(demo.moth, demo.flash > 0 ? 1 : 0);
      drawNet(demo.net && demo.net.t < 0.5 ? demo.net : null, W * 0.22);
      drawBoy(demo.net && demo.net.t < 0.3 ? 'swing' : 'idle', W * 0.22);
      drawJar(Math.min(2, demo.step));
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 16 });
      label(TITLE, W / 2, H * 0.07, 92, GLOW);
      label('HI-SCORE ' + (game.best || 0), W / 2, H * 0.125, 38, PALE);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) label('► 100円 投入 ◄', W / 2, H * 0.965, 44, GLOW);
      else label('TAP TO START', W / 2, H * 0.965, 40, PALE);
      return cyc;
    }

    if (state === S.PLAYING) {
      if (net) { net.t += dt; if (net.t > 0.45) net = null; }
      if (poseT > 0) { poseT -= dt; if (poseT <= 0 && !over) boyPose = 'idle'; }
      if (over) {
        endT -= dt;
        stepFlies(flies, dt);
        if (won) {
          sparkT -= dt;
          if (sparkT <= 0) { sparkT = 0.18; game.fx.burst(game.random(100, W - 100), game.random(FIELD_Y0, FIELD_Y1), { color: game.random(0, 1) < 0.6 ? GLOW : PALE, count: 12, speed: 260, gravity: -80 }); }
        }
        if (endT <= 0) state = S.RESULT;
      } else if (halt) {
        halt.t -= dt;
        if (halt.t <= 0) {
          game.feedback.bad(halt.x, halt.y, { text: 'MISS' });
          halt = null;
          finish(false);
        }
      } else if (ready > 0) {
        ready -= dt;
        if (ready <= 0) game.audio.play('se_tap', 0.3);
      } else {
        timeLeft -= dt;
        stepFlies(flies, dt);
        stepMoth(moth, dt);
        flies = flies.filter(function (f) { return !f.dead && !f.caught; });
        var lanes = 1 + Math.floor(progressK() * 2.4);
        for (var s = 0; s < lanes; s++) {
          slotT[s] -= dt;
          if (slotT[s] <= 0) { spawnFly(); slotT[s] = game.random(0.9, 1.4) - progressK() * 0.3; }
        }
        if (caughtN >= 3) {
          mothT -= dt;
          if (mothT <= 0 && (!moth || !moth.live)) { spawnMoth(); mothT = game.random(2.6, 3.4); }
        }
        if (timeLeft <= 0 && !over) {
          timeLeft = 0;
          game.feedback.bad(W / 2, H * 0.42, { text: 'TIME UP' });
          finish(false);
        }
      }
    }

    drawGarden();
    for (var j = 0; j < flies.length; j++) drawFly(flies[j]);
    var hk = halt ? 1 - halt.t / halt.max : 0;
    drawMoth(moth, halt && halt.what === 'moth' ? hk : 0);
    if (halt && halt.what === 'empty') {
      game.draw.circle(halt.x, halt.y, NET_R * (1 + hk * 0.4), '#ffffff', 0.5 * (1 - hk) + 0.2);
    }
    drawNet(net, W * 0.22);
    drawBoy(boyPose, W * 0.22);
    drawJar(caughtN);
    drawHud();
    if (ready > 0) label(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.42, 120, GLOW);
    if (over || state === S.RESULT) drawResult();

    if (state === S.RESULT) {
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) label('TAP TO CONTINUE', W / 2, H * 0.965, 40, PALE);
      var stats = { caught: caughtN, strikes: strikes, bestPair: bestPair };
      if (won) game.end.success(score, stats);
      else game.end.failure(stats);
    }
  });

  game.onStart(function () {
    game.audio.melody([
      ['E5', 1], ['G5', 0.5], ['A5', 0.5], ['G5', 1], ['E5', 1],
      ['D5', 1], ['E5', 0.5], ['G5', 0.5], ['E5', 2],
      ['C5', 1], ['D5', 0.5], ['E5', 0.5], ['G5', 1], ['A5', 1],
      ['G5', 1], ['E5', 0.5], ['D5', 0.5], ['C5', 2],
    ], {
      tempo: 96, wave: 'triangle', volume: 0.05, loop: true,
      bass: [['A2', 2], ['E3', 2], ['G2', 2], ['C3', 2], ['F2', 2], ['C3', 2], ['G2', 2], ['A2', 2]],
    });
    state = S.ATTRACT;
    initGame();
  });
})(game);
