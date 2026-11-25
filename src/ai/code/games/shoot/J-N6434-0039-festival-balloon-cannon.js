// J-N6434-0039-festival-balloon-cannon.js
// 大風船山車のしぼまし係 — 紙吹雪砲を引いて放ち、ふわふわ動く大風船の開いた空気弁だけを狙い撃つ
// 操作: 砲台から指を後ろへ引っ張って離すと、引いた向きの反対へ引いた強さで紙吹雪玉が飛ぶ。光って開いた弁に当てる(社内メモ。画面には出さない)
// 終わり: 開いた弁に5回当てて大風船をしぼませれば成功。時間切れで失敗
// @mechanic: slingshot
// @theme: festival_balloon_deflate
// 世界観: 収穫祭の最後に、片付け係の見習いが紙吹雪砲を引き絞り、空を漂う巨大な張りぼて風船の光る空気弁を撃ち抜いて、夜までにしぼませて降ろす
// 残るもの: 正誤(CLEAR/GAME OVER) + 命中数・発射数・命中率
// スタイル: 90s BIG SPRITE

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s BIG SPRITE: 巨大キャラ、床影、間合いで見せる多色
  var STYLE = { bg: ['#ff9a5a', '#ffcf7a', '#6ac0ff'], main: ['#e84a8a', '#ffd93d', '#3a2a5a'], accent: ['#5affc8', '#ff3a3a'] };
  var C = { dusk1: STYLE.bg[2], dusk2: STYLE.bg[1], dusk3: STYLE.bg[0], pink: STYLE.main[0], yellow: STYLE.main[1], ink: STYLE.main[2], mint: STYLE.accent[0], red: STYLE.accent[1], white: '#ffffff', stall: '#c0502a', ground: '#7a4a3a' };

  var GAME_TITLE = 'BALLOON BUSTER';
  var TIME_LIMIT = 17;
  var NEEDED = 5;
  var GRAV = 900, POWER = 7.4, MAXPULL = 260, MINPULL = 40, HOLD_MAX = 3.0;
  var CANX = W / 2, CANY = H * 0.8;
  var BODY_R = 210;
  var SOCKETS = [-2.4, -1.57, -0.74, 0.3, 2.85];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var FACE = ['..######..', '.#......#.', '#..#..#..#', '#..#..#..#', '#........#', '#.#....#.#', '#..####..#', '.#......#.', '..######..'];
  var FACE_PUFF = ['..######..', '.#......#.', '#..#..#..#', '#........#', '#oo....oo#', '#oo.##.oo#', '#...##...#', '.#......#.', '..######..'];
  var KID = ['.##.', '#oo#', '####', '#..#'];
  var CANNON = ['..####..', '.######.', '########', '##.##.##', '.#....#.'];
  var BALL = ['.##.', '####', '####', '.##.'];

  var bx, by, bvx, valves, shots, hits, fired, timeLeft, ready, hitStop, finished, ok, done, endWait;
  var pulling, pullX, pullY, pressX, pressY, pullT, reload, gust, gustWarn, gustT, gustDir, shrink, confetti, halfShown;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 4, y + 4, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function initGame() {
    bx = W / 2; by = H * 0.3; bvx = 120;
    valves = [];
    for (var i = 0; i < SOCKETS.length; i++) valves.push({ a: SOCKETS[i], open: i % 2 === 0, t: game.random(0.4, 1.6), flash: 0 });
    shots = []; hits = 0; fired = 0;
    timeLeft = TIME_LIMIT; ready = 0.8; hitStop = 0; finished = false; ok = false; done = false; endWait = 0;
    pulling = false; pullX = CANX; pullY = CANY; pressX = CANX; pressY = CANY; pullT = 0; reload = 0;
    gust = 0; gustWarn = 0; gustT = game.random(3, 4.2); gustDir = 1; shrink = 0; confetti = []; halfShown = false;
  }

  function valvePos(v) {
    var r = BODY_R * (1 - shrink * 0.08);
    return { x: bx + Math.cos(v.a) * r, y: by + Math.sin(v.a) * r * 0.9 };
  }

  function pullVec() {
    var dx = pressX - pullX, dy = pressY - pullY;
    var len = Math.hypot(dx, dy);
    if (len > MAXPULL) { dx = dx / len * MAXPULL; dy = dy / len * MAXPULL; len = MAXPULL; }
    return { x: dx, y: dy, len: len };
  }

  function startPull(x, y) {
    if (reload > 0 || finished) return false;
    pulling = true; pullX = x; pullY = y; pressX = x; pressY = y; pullT = 0;
    return true;
  }

  function release() {
    if (!pulling) return 0;
    pulling = false;
    var pv = pullVec();
    if (pv.len < MINPULL) return -1;
    shots.push({ x: CANX, y: CANY - 40, vx: pv.x * POWER, vy: pv.y * POWER, t: 0 });
    fired++; reload = 0.45;
    if (state === S.PLAYING) game.audio.play('se_jump', 0.4);
    return 1;
  }

  function simulate(dt) {
    if (reload > 0) reload -= dt;
    // 大風船: 左右に漂い、だんだん速く
    var sp = 120 + hits * 35;
    bvx = (bvx >= 0 ? 1 : -1) * sp;
    bx += bvx * dt;
    if (bx < 280) { bx = 280; bvx = sp; }
    if (bx > W - 280) { bx = W - 280; bvx = -sp; }
    by = H * 0.3 + Math.sin(game.time.elapsed * 1.3) * 40;
    // 弁の開閉(開いている弁だけが狙う物)
    for (var i = 0; i < valves.length; i++) {
      var v = valves[i];
      if (v.flash > 0) v.flash -= dt;
      v.t -= dt;
      if (v.t <= 0) { v.open = !v.open; v.t = v.open ? game.random(1.4, 2.0) : game.random(0.7, 1.2); }
    }
    // 突風: ほおを膨らませて0.6秒予告→横風で玉が流れる
    gustT -= dt;
    if (gustT <= 0.6 && gustWarn <= 0 && gust <= 0 && gustT > 0) {
      gustWarn = gustT + 0.05; gustDir = game.random(0, 1) < 0.5 ? -1 : 1;
      if (state === S.PLAYING) game.audio.tone('C4', 0.15, { wave: 'sawtooth', volume: 0.04, slide: 200 });
    }
    if (gustWarn > 0) gustWarn -= dt;
    if (gustT <= 0) { gust = 1.1; gustT = game.random(3.2, 4.4); gustWarn = 0; }
    if (gust > 0) gust -= dt;
    if (pulling) {
      pullT += dt;
      if (pullT >= HOLD_MAX) {
        // 引きっぱなし: 砲が湿気て不発
        pulling = false; reload = 0.5;
        game.feedback.bad(CANX, CANY - 80, { text: 'MISS', shake: 6 });
      }
    }
    for (var c = confetti.length - 1; c >= 0; c--) {
      var cf = confetti[c];
      cf.x += cf.vx * dt; cf.y += cf.vy * dt; cf.vy += 300 * dt; cf.t -= dt;
      if (cf.t <= 0) confetti.splice(c, 1);
    }
    for (var s = shots.length - 1; s >= 0; s--) {
      var sh = shots[s];
      sh.t += dt;
      sh.vy += GRAV * dt;
      if (gust > 0) sh.vx += gustDir * 700 * dt;
      sh.x += sh.vx * dt; sh.y += sh.vy * dt;
      var hitDone = false;
      for (var k = 0; k < valves.length; k++) {
        var vp = valvePos(valves[k]);
        if (valves[k].open && Math.hypot(sh.x - vp.x, sh.y - vp.y) < 62) {
          valves[k].open = false; valves[k].t = 1.2; valves[k].flash = 0.5;
          hits++; shrink = hits / NEEDED;
          game.feedback.good(vp.x, vp.y - 30, { text: 'GOOD', color: C.mint, size: 56, volume: 0.3 });
          game.audio.play('se_break', 0.3);
          for (var q = 0; q < 14; q++) confetti.push({ x: vp.x, y: vp.y, vx: game.random(-300, 300), vy: game.random(-400, 0), t: 1.0, c: q % 3 });
          if (!halfShown && hits >= 3 && state === S.PLAYING) {
            halfShown = true;
            game.fx.popup(hits + ' / ' + NEEDED, W / 2, H * 0.12, { color: C.yellow, size: 60 });
            game.audio.play('se_milestone', 0.4);
          }
          if (hits >= NEEDED && state === S.PLAYING) { finished = true; ok = true; hitStop = 0.5; }
          hitDone = true; break;
        }
      }
      if (!hitDone && Math.hypot(sh.x - bx, (sh.y - by) / 0.9) < BODY_R * (1 - shrink * 0.08) - 10) {
        game.feedback.bad(sh.x, sh.y, { text: 'MISS', shake: 4, volume: 0.2 });
        hitDone = true;
      }
      if (hitDone || sh.y > H || sh.x < -100 || sh.x > W + 100 || sh.t > 3) shots.splice(s, 1);
    }
  }

  // ── 描画 ───────────────────────────────────────────────
  function drawSky() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, C.dusk1], [0.45, C.dusk2], [0.72, C.dusk3], [1, C.ground]]);
    game.draw.rect(0, 0, W, H, C.white, 0.03 + 0.03 * Math.sin(t * 1.4));
    // 提灯の列
    for (var i = 0; i < 9; i++) {
      var lx = 60 + i * 120, ly = H * 0.62 + Math.sin(i * 1.3) * 20;
      game.draw.line(lx, ly - 30, lx + 120, H * 0.62 + Math.sin((i + 1) * 1.3) * 20 - 30, C.ink, 3);
      game.draw.circle(lx, ly, 20, i % 2 ? C.red : C.yellow, 0.8 + 0.2 * Math.sin(t * 4 + i));
    }
    // 屋台(他の係はシルエットで)
    for (var s = 0; s < 4; s++) {
      var sx = s * 290 - 20;
      game.draw.rect(sx, H * 0.66, 240, 110, C.stall, 0.9);
      game.draw.rect(sx, H * 0.66, 240, 24, C.pink);
      game.draw.sprite(KID, { '#': C.ink, 'o': C.ink }, sx + 120, H * 0.7 + Math.sin(t * 3 + s) * 5, 10, { anchor: 'center', alpha: 0.7 });
    }
    game.draw.rect(0, H * 0.72, W, H * 0.28, C.ground);
  }

  function drawBalloon() {
    var t = game.time.elapsed;
    var sc = 1 - shrink * 0.08;
    // 床影(高さを示す)
    game.draw.circle(bx, H * 0.7, 140 * sc, C.ink, 0.25);
    game.draw.line(bx, by + BODY_R * sc, bx, H * 0.7, C.ink, 4);
    game.draw.circle(bx, by, BODY_R * sc + 12, C.ink);
    game.draw.circle(bx, by, BODY_R * sc, C.pink);
    game.draw.circle(bx - 60, by - 70, 60 * sc, C.white, 0.35);
    var puff = gustWarn > 0 || gust > 0;
    game.draw.sprite(puff ? FACE_PUFF : FACE, { '#': C.ink, 'o': C.red }, bx, by + Math.sin(t * 3) * 6, 18 * sc, { anchor: 'center' });
    if (gustWarn > 0 && Math.floor(t * 12) % 2 === 0) {
      game.draw.circle(bx + gustDir * (BODY_R + 40), by + 40, 26, C.red, 0.8);
    }
    if (gust > 0) {
      for (var w = 0; w < 8; w++) {
        var wy = H * 0.35 + w * 110;
        var wx = ((t * 900 * gustDir + w * 170) % W + W) % W;
        game.draw.line(wx, wy, wx + gustDir * 120, wy, C.white, 5);
      }
    }
    for (var i = 0; i < valves.length; i++) {
      var v = valves[i], p = valvePos(v);
      if (v.open) {
        var pulse = 0.5 + 0.5 * Math.sin(t * 12 + i);
        game.draw.circle(p.x, p.y, 58 + pulse * 8, C.white, 0.35);
        game.draw.circle(p.x, p.y, 44, C.mint);
        game.draw.circle(p.x, p.y, 20, C.white);
      } else {
        game.draw.circle(p.x, p.y, 34, C.ink);
        game.draw.circle(p.x, p.y, 24, '#6a4a7a');
      }
      if (v.flash > 0) game.draw.circle(p.x, p.y, 90, C.white, v.flash);
    }
    if (finished && hitStop > 0) game.draw.circle(bx, by, BODY_R + 40, C.white, hitStop * 0.5);
    for (var c = 0; c < confetti.length; c++) {
      var cf = confetti[c];
      game.draw.rect(cf.x, cf.y, 14, 8, cf.c === 0 ? C.yellow : (cf.c === 1 ? C.mint : C.white), Math.min(1, cf.t * 2));
    }
  }

  function drawCannon() {
    var t = game.time.elapsed;
    // 親指ゾーン: 砲台と引き絞り
    game.draw.circle(CANX, CANY + 70, 120, C.ink, 0.3);
    if (pulling) {
      var pv = pullVec();
      var hx = CANX - pv.x, hy = CANY - pv.y;
      game.draw.line(CANX - 70, CANY - 30, hx, hy, C.yellow, 8);
      game.draw.line(CANX + 70, CANY - 30, hx, hy, C.yellow, 8);
      game.draw.sprite(BALL, { '#': C.mint }, hx, hy, 12, { anchor: 'center' });
      // 軌道予告線(出だしのみ)
      var vx = pv.x * POWER, vy = pv.y * POWER, x = CANX, y = CANY - 40;
      for (var k = 1; k <= 12; k++) {
        var tt = k * 0.045;
        game.draw.circle(x + vx * tt, y + vy * tt + GRAV * tt * tt / 2, 8, C.white, 0.9 - k * 0.06);
      }
      var ring = Math.max(0, 1 - pullT / HOLD_MAX);
      game.draw.rect(CANX - 120, CANY + 150, 240 * ring, 12, ring < 0.3 ? C.red : C.yellow);
    }
    var ready2 = reload <= 0;
    game.draw.sprite(CANNON, { '#': ready2 ? C.yellow : '#b09050' }, CANX, CANY + Math.sin(t * 4) * 3, 22, { anchor: 'center' });
    if (ready2 && !pulling) game.draw.circle(CANX, CANY - 70, 30 + Math.sin(t * 8) * 6, C.white, 0.3);
    for (var s = 0; s < shots.length; s++) game.draw.sprite(BALL, { '#': C.mint }, shots[s].x, shots[s].y, 11, { anchor: 'center' });
  }

  function drawHud() {
    txt(hits + ' / ' + NEEDED, W / 2, 72, 60, C.white);
    var bw = W - 160;
    var low = timeLeft < 4 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(80, 126, bw, 20, C.ink, 0.6);
    game.draw.rect(80, 126, bw * Math.max(0, timeLeft / TIME_LIMIT), 20, low ? C.red : C.yellow);
    for (var i = 0; i < NEEDED; i++) game.draw.circle(110 + i * 60, 196, 20, i < hits ? C.mint : C.ink, i < hits ? 1 : 0.5);
    if (fired > 0) txt(Math.round(hits / fired * 100) + '%', W - 90, 196, 40, C.white, 'right');
  }

  function drawScene() { drawSky(); drawBalloon(); drawCannon(); }

  // ── ATTRACT ゴースト実演(実ロジック: 開いた弁へ引いて放つ×2 → 3発目は胴体に当ててMISS) ──
  function aimFor(tx, ty) {
    var best = null, bd = 1e9;
    for (var a = -2.8; a <= -0.35; a += 0.04) {
      var len = 230;
      var vx = Math.cos(a) * len * POWER, vy = Math.sin(a) * len * POWER;
      var x = CANX, y = CANY - 40;
      for (var k = 0; k < 120; k++) {
        vy += GRAV / 60; x += vx / 60; y += vy / 60;
        var d = Math.hypot(x - tx, y - ty);
        if (d < bd) { bd = d; best = a; }
        if (y > CANY) break;
      }
    }
    return { x: CANX - Math.cos(best) * 230, y: CANY - Math.sin(best) * 230 };
  }
  var demo = { t: 0, gx: CANX, gy: CANY, press: false, n: 0, stage: 0, st: 0, px: CANX, py: CANY };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 6.0;
    if (cyc < dt || demo.t <= dt) { initGame(); ready = 0; demo.n = 0; demo.stage = 0; demo.st = 0.4; gustT = 99; }
    simulate(dt);
    demo.st -= dt;
    if (demo.stage === 0 && demo.st <= 0 && reload <= 0 && shots.length === 0) {
      var target = null;
      for (var i = 0; i < valves.length; i++) if (valves[i].open && valves[i].t > 1.0) { target = valvePos(valves[i]); break; }
      if (demo.n === 2) target = { x: bx, y: by + 60 };
      if (target) {
        var lead = bvx * 0.55;
        var aim = aimFor(target.x + lead, target.y);
        demo.px = aim.x; demo.py = aim.y;
        startPull(CANX, CANY);
        demo.stage = 1; demo.st = 0.5;
      }
    } else if (demo.stage === 1) {
      var k = 1 - Math.max(0, demo.st) / 0.5;
      pullX = CANX + (demo.px - CANX) * k; pullY = CANY + (demo.py - CANY) * k;
      if (demo.st <= 0) { release(); demo.n++; demo.stage = 0; demo.st = 0.5; }
    }
    demo.press = demo.stage === 1;
    demo.gx = demo.stage === 1 ? pullX : CANX; demo.gy = demo.stage === 1 ? pullY : CANY + 60;
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) {
      game.audio.play('se_coin', 0.4);
      state = S.PLAYING; initGame();
      return;
    }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (ready > 0 || finished) game.audio.play('se_tap', 0.1);
  });
  game.onPress(function(x, y) {
    if (state !== S.PLAYING || ready > 0 || finished) return;
    if (startPull(x, y)) game.audio.play('se_tap', 0.15);
    else game.fx.burst(CANX, CANY - 60, { color: C.yellow, count: 4, speed: 120 });
  });
  game.onMove(function(x, y) {
    if (state !== S.PLAYING || !pulling) return;
    pullX = x; pullY = y;
    if (Math.random() < 0.05) game.audio.tone('E4', 0.02, { wave: 'triangle', volume: 0.03 });
  });
  game.onRelease(function(x, y) {
    if (state !== S.PLAYING || ready > 0 || finished) return;
    if (pulling) { pullX = x; pullY = y; }
    var r = release();
    if (r < 0) game.audio.play('se_tap', 0.1);
  });

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (bx === undefined) initGame();
      stepDemo(dt);
      drawScene();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 14 });
      txt(GAME_TITLE, W / 2, H * 0.06, 70, C.yellow);
      txt('HI-SCORE ' + (game.best || 0), W / 2, H * 0.105, 36, C.white);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.965, 44, C.yellow);
      else txt('INSERT COIN', W / 2, H * 0.965, 40, C.white);
      return;
    }
    if (state === S.RESULT) { drawScene(); drawResult(); return; }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        drawScene(); drawResult();
        var acc = fired > 0 ? Math.round(hits / fired * 100) : 0;
        var score = hits * 150 + acc * 3 + (ok ? Math.ceil(timeLeft) * 20 : 0);
        var st = { hits: hits, fired: fired, accuracyPct: acc };
        if (ok) game.end.success(score, st); else game.end.failure(st);
        return;
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
      if (hitStop <= 0) {
        done = true; endWait = 1.2;
        game.audio.stopBgm();
        game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
        if (ok) game.fx.burst(bx, by, { color: C.yellow, count: 50, speed: 700 });
      }
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap', 0.3);
    } else if (!finished) {
      timeLeft -= dt;
      simulate(dt);
      if (timeLeft <= 0 && !finished) {
        timeLeft = 0; finished = true; ok = false; hitStop = 0.5; pulling = false;
        game.feedback.bad(bx, by, { text: 'TIME UP' });
      }
    }

    drawScene();
    drawHud();
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 100, C.yellow);
    if (done) txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.52, 90, ok ? C.mint : C.red);
  });

  function drawResult() {
    game.draw.rect(0, 0, W, H, C.ink, 0.5);
    var acc = fired > 0 ? Math.round(hits / fired * 100) : 0;
    txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.25, 100, ok ? C.mint : C.red);
    txt(hits + ' / ' + NEEDED, W / 2, H * 0.34, 72, C.white);
    txt(acc + '%', W / 2, H * 0.4, 50, C.yellow);
    var score = hits * 150 + acc * 3 + (ok ? Math.ceil(timeLeft) * 20 : 0);
    if (ok && score > (game.best || 0)) txt('NEW RECORD', W / 2, H * 0.46, 56, C.yellow);
    else txt('BEST ' + (game.best || 0), W / 2, H * 0.46, 42, C.white);
    if (!ok && NEEDED - hits > 0) txt('あと' + (NEEDED - hits) + '発!', W / 2, H * 0.52, 56, C.red);
    if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.95, 42, C.white);
  }

  game.onStart(function() {
    game.audio.melody([['C5', 0.5], ['D5', 0.5], ['E5', 0.5], ['G5', 0.5], ['E5', 0.5], ['D5', 0.5], ['C5', 1], ['A4', 0.5], ['C5', 0.5], ['D5', 1]], { tempo: 144, wave: 'square', volume: 0.04, loop: true, bass: [['C3', 2], ['A2', 2], ['F2', 2], ['G2', 2]] });
    state = S.ATTRACT;
    initGame();
    demo.t = 0;
  });
})(game);
