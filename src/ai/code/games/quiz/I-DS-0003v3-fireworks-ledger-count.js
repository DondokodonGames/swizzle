// I-DS-0003v3-fireworks-ledger-count.js
// 花火の記録帳 — 夜空でぱっと開いては消える花火の数を数え、帳面に筆を押し当てて開いた数ぶん「正」の線を引いて記す
// 操作: 花火が上がる間は見て数えるだけ(同時に2発開く・開かずに消える玉もある)。打ち止めになったら画面を押し続けると線が1本ずつ増え、離した本数が答え
// 終わり: 3つの演目(玉が増え・同時開花と不発が混ざる)を全部正しく記せばCLEAR。1回でも本数違い/書きそびれ/15秒切れでGAME OVER
// @mechanic: counting
// @theme: fireworks_record_hut_tally
// 世界観: 川辺の花火大会の記録小屋で、鉢巻の記録係が夜空にぱっと開いた花火の数を見届け(開かずに消えた玉は数えない)、演目ごとに帳面へ「正」の字で書き留める
// 残るもの: 正誤(CLEAR/GAME OVER) + 正しく記した演目の数・スコア
// スタイル: 80s NEON

(function (game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 80s NEON: 濃紺〜黒グラデ + シアン/マゼンタ/イエロー/白。薄い同色を外周に重ねた疑似グロー
  var STYLE = { bg: ['#05041a', '#120a38'], main: ['#00f0ff', '#ff2bd6', '#ffe81f'], accent: ['#ff8a1f', '#ffffff'] };
  var CYAN = STYLE.main[0], MAG = STYLE.main[1], YEL = STYLE.main[2], ORA = STYLE.accent[0], WHITE = STYLE.accent[1];
  var NAVY = STYLE.bg[0], PURP = STYLE.bg[1];
  var NEONS = [CYAN, MAG, YEL, ORA];

  var TITLE = 'HANABI TALLY';
  var TIME_LIMIT = 15;
  var PROGRAMS = 3;
  var TICK = 0.22;
  var RISE = 0.36;
  var BLOOM = 0.62;
  var ANSWER_MAX = 3.0;
  var LAUNCH_Y = H * 0.62;
  var LEDGER = { x: W * 0.36, y: H * 0.765, w: W * 0.58, h: H * 0.165 };

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var KEEPER = [
    ['..hhhhhh..', '.bbbbbbbb.', '.hffffffh.', '.fekffekf.', '.ffffffff.', '..ffmmff..', '..cccccc..', '.cccccccc.', 'ccccccccff', 'cccccccc.f', '.cc..cc...', '.kk..kk...'],
    ['..hhhhhh..', '.bbbbbbbb.', '.hffffffh.', '.fekffekf.', '.ffffffff.', '..ffmmff..', '..cccccc..', '.cccccccc.', 'cccccccc..', 'ccccccccff', '.cc..cc..f', '.kk..kk...'],
    ['f.hhhhhh.f', 'fbbbbbbbbf', '.hffffffh.', '.fekffekf.', '.ffmmmmff.', '..ffffff..', '..cccccc..', '.cccccccc.', 'cccccccccc', 'cccccccccc', '.cc..cc...', 'kk....kk..'],
    ['..........', '..hhhhhh..', '.bbbbbbbb.', '.hffffffh.', '.fkkffkkf.', '..ffmmff..', '..cccccc..', '.cccccccc.', 'ffcccccc..', 'cccccccc..', '.cc..cc...', '.kk..kk...'],
  ];
  var TOWN = ['....k.......k...', '...kkk..k..kkk..', '..kkkkkkkk.kkkk.', 'kkkkkkkkkkkkkkkk'];
  var BRUSH = ['.w', '.w', '.w', 'kk', 'kk'];

  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(game.random(0, i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }

  function neon(s, x, y, sz, col) {
    game.draw.text(s, x, y + 3, { size: sz, color: col === WHITE ? MAG : NAVY, bold: true, align: 'center' });
    game.draw.text(s, x, y, { size: sz, color: col, bold: true, align: 'center' });
  }

  // ── 演目の生成(プレイ・デモ共通)。1回の打ち上げ = 1発 / 同時2発 / 不発 ──
  function makeShow(r, fixed) {
    var blooms = fixed ? fixed.blooms : [3, 5, 6][r] + Math.floor(game.random(0, 2 + (r === 2 ? 1 : 0)));
    var doubles = fixed ? fixed.doubles : [0, 1, 2][r];
    var duds = fixed ? fixed.duds : [1, 1, 2][r];
    var span = fixed ? fixed.span : [1.2, 1.6, 1.9][r];
    var launches = [];
    for (var d = 0; d < doubles; d++) launches.push(2);
    for (var s = 0; s < blooms - doubles * 2; s++) launches.push(1);
    for (var z = 0; z < duds; z++) launches.push(0);
    if (!fixed) shuffle(launches);
    var ev = [], end = 0;
    for (var i = 0; i < launches.length; i++) {
      var at = (i / launches.length) * span + (fixed ? 0 : game.random(-0.04, 0.04));
      at = Math.max(0, at);
      var n = launches[i];
      var cx = game.random(250, W - 250), cy = game.random(H * 0.19, H * 0.40);
      if (n === 2) {
        var gap = game.random(230, 320);
        ev.push({ at: at, id: i, x: cx - gap / 2, y: cy, col: NEONS[i % 4], size: game.random(0.8, 1), dud: false });
        ev.push({ at: at, id: i, x: cx + gap / 2, y: cy + game.random(-60, 60), col: NEONS[(i + 2) % 4], size: game.random(0.8, 1), dud: false });
      } else {
        ev.push({ at: at, id: i, x: cx, y: cy, col: NEONS[i % 4], size: game.random(0.85, 1.15), dud: n === 0 });
      }
      end = Math.max(end, at + RISE + BLOOM);
    }
    return { ev: ev, count: blooms, end: end + 0.15 };
  }

  function drawShow(sh, t) {
    if (!sh) return;
    for (var i = 0; i < sh.ev.length; i++) {
      var e = sh.ev[i], k = t - e.at;
      if (k < 0) continue;
      if (k < RISE) {
        var hy = LAUNCH_Y + (e.y - LAUNCH_Y) * (k / RISE);
        game.draw.line(e.x, hy + 90, e.x, hy, e.col, 4);
        game.draw.circle(e.x, hy, 14, e.col, 0.3);
        game.draw.circle(e.x, hy, 6, WHITE);
        continue;
      }
      var b = k - RISE;
      if (b > BLOOM) continue;
      if (e.dud) {
        // 不発: 小さな煙だけで消える
        var pk = b / BLOOM;
        game.draw.circle(e.x, e.y, 16 + pk * 26, '#6a6688', 0.5 * (1 - pk));
        game.draw.circle(e.x + 14, e.y - 10, 10 + pk * 18, '#6a6688', 0.4 * (1 - pk));
        continue;
      }
      var grow = Math.min(1, b / 0.24);
      var rad = 170 * e.size * (1 - Math.pow(1 - grow, 2));
      var alpha = 1 - Math.max(0, (b - 0.22) / (BLOOM - 0.22));
      if (b < 0.08) game.draw.circle(e.x, e.y, 70, WHITE, 0.6);
      for (var p = 0; p < 16; p++) {
        var ang = (p / 16) * Math.PI * 2;
        var px = e.x + Math.cos(ang) * rad, py = e.y + Math.sin(ang) * rad + b * b * 120;
        game.draw.circle(px, py, 22, e.col, 0.22 * alpha);
        game.draw.circle(px, py, 9, p % 2 ? e.col : WHITE, alpha);
        game.draw.circle(e.x + Math.cos(ang) * rad * 0.55, e.y + Math.sin(ang) * rad * 0.55, 6, e.col, alpha * 0.8);
      }
      game.draw.circle(e.x, e.y, rad * 0.9, e.col, 0.08 * alpha);
    }
  }

  // 打ち上げ笛と開花の音(同時2発はドンが1つ)
  function soundShow(sh, t0, t1, vol) {
    var seen = {};
    for (var i = 0; i < sh.ev.length; i++) {
      var e = sh.ev[i];
      if (seen[e.id]) continue;
      if (e.at >= t0 && e.at < t1) { seen[e.id] = true; game.audio.tone(330, 0.3, { wave: 'triangle', volume: 0.05 * vol, slide: 500 }); }
      var bt = e.at + RISE;
      if (bt >= t0 && bt < t1) { seen[e.id] = true; if (e.dud) game.audio.tone(200, 0.06, { wave: 'square', volume: 0.04 * vol }); else game.audio.play('se_break', 0.7 * vol); }
    }
  }

  // ── 背景・帳面・記録係 ──
  function drawNight() {
    var tt = game.time.elapsed;
    game.draw.gradient(0, H, [[0, NAVY], [0.5, PURP], [0.66, '#2a0c4a'], [1, NAVY]]);
    for (var s = 0; s < 26; s++) game.draw.rect((s * 157) % W, 30 + (s * 83) % 700, 5, 5, WHITE, 0.2 + 0.25 * Math.abs(Math.sin(tt + s)));
    // 対岸の町並みと川面
    game.draw.sprite(TOWN, { k: '#1a0838' }, 0, H * 0.585, 34, {});
    game.draw.sprite(TOWN, { k: '#1a0838' }, 540, H * 0.59, 34, { flipX: true });
    game.draw.rect(0, H * 0.645, W, H * 0.06, '#0a1240');
    for (var w = 0; w < 7; w++) game.draw.rect(((w * 170 + tt * 40) % (W + 200)) - 100, H * 0.66 + (w % 3) * 22, 90, 4, CYAN, 0.35);
    // 記録小屋の窓枠(ネオン管)
    game.draw.rect(0, H * 0.705, W, H * 0.295, '#0c0626');
    game.draw.rect(0, H * 0.705, W, 8, MAG);
    game.draw.rect(0, H * 0.705 - 6, W, 20, MAG, 0.2);
  }

  function drawStroke(x0, y0, sz, idx, col) {
    var s = sz;
    var L = [
      [0, 0, s, 0], [s / 2, 0, s / 2, s], [s / 2, s / 2, s * 0.88, s / 2], [s * 0.16, s / 2, s * 0.16, s], [0, s, s, s],
    ][idx];
    game.draw.line(x0 + L[0], y0 + L[1], x0 + L[2], y0 + L[3], col, 16);
    game.draw.line(x0 + L[0], y0 + L[1], x0 + L[2], y0 + L[3], WHITE, 6);
  }

  function drawLedger(n, active, flashK) {
    var L = LEDGER;
    var glow = active ? 0.35 + 0.25 * Math.sin(game.time.elapsed * 8) : 0;
    game.draw.rect(L.x - 12, L.y - 12, L.w + 24, L.h + 24, CYAN, 0.15 + glow);
    game.draw.rect(L.x, L.y, L.w, L.h, '#1c1048');
    for (var r = 0; r < 4; r++) game.draw.rect(L.x + 20, L.y + 40 + r * 64, L.w - 40, 3, PURP);
    var sz = 96, per = 5;
    for (var i = 0; i < n; i++) {
      var g = Math.floor(i / per), st = i % per;
      var gx = L.x + 40 + (g % 4) * (sz + 40), gy = L.y + 50 + Math.floor(g / 4) * (sz + 30);
      drawStroke(gx, gy, sz, st, flashK ? WHITE : YEL);
    }
    if (flashK) game.draw.rect(L.x - 20 * flashK, L.y - 20 * flashK, L.w + 40 * flashK, L.h + 40 * flashK, WHITE, 0.4 * (1 - flashK) + 0.15);
  }

  function drawKeeper(pose, writing) {
    var fr = pose === 'cheer' ? 2 : pose === 'sad' ? 3 : writing ? Math.floor(game.time.elapsed * 10) % 2 : 0;
    var bob = Math.sin(game.time.elapsed * 3) * 5 - (pose === 'cheer' ? Math.abs(Math.sin(game.time.elapsed * 9)) * 30 : 0);
    game.draw.sprite(KEEPER[fr], { h: '#2a1a4a', b: MAG, f: '#ffd9b8', e: NAVY, k: NAVY, m: MAG, c: CYAN }, W * 0.17, H * 0.84 + bob, 17, { anchor: 'center' });
    game.draw.sprite(BRUSH, { w: WHITE, k: ORA }, W * 0.30, H * 0.80 + (writing ? Math.sin(game.time.elapsed * 30) * 8 : 0), 12, { anchor: 'center' });
  }

  function drawReveal(sh, k, wrong) {
    var n = Math.min(sh.count, Math.floor(k / 0.09));
    var cols = Math.min(sh.count, 8);
    for (var i = 0; i < sh.count; i++) {
      var x = W / 2 + ((i % cols) - (cols - 1) / 2) * 112, y = H * 0.30 + Math.floor(i / cols) * 110;
      var c = NEONS[i % 4], on = i < n;
      game.draw.circle(x, y, 44, c, on ? 0.25 : 0.06);
      game.draw.circle(x, y, 22, on ? c : PURP);
      game.draw.circle(x, y, 8, on ? WHITE : PURP);
    }
    neon(String(n), W / 2, H * 0.47, 120, wrong ? MAG : YEL);
  }

  // ── 状態 ──
  var prog, show, showT, phase, phaseT, tally, holding, tickT, score, correctN, timeLeft;
  var ready, halt, over, won, endT, prevBest, lastDiff, sparkT, pose;

  function initGame() {
    prog = 0; score = 0; correctN = 0; timeLeft = TIME_LIMIT; ready = 0.8;
    halt = null; over = false; won = false; endT = 0; lastDiff = 0; sparkT = 0; pose = 'idle';
    prevBest = game.best || 0;
    beginProgram();
  }

  function beginProgram() {
    show = makeShow(prog); showT = 0; phase = 'watch'; phaseT = 0; tally = 0; holding = false; tickT = 0;
  }

  function judge() {
    holding = false;
    lastDiff = show.count - tally;
    phase = 'reveal'; phaseT = 0;
    if (lastDiff === 0) {
      correctN++;
      score += 150 + Math.round(timeLeft * 12) + prog * 50;
      game.feedback.good(LEDGER.x + LEDGER.w / 2, LEDGER.y - 30, { text: tally >= 7 ? 'PERFECT' : 'GOOD', color: YEL, count: 18 });
      if (correctN === 2) { game.fx.popup(correctN + ' / ' + PROGRAMS, W / 2, H * 0.13, { color: CYAN, size: 62 }); game.audio.play('se_milestone', 0.45); }
    } else {
      halt = { t: 0.45, max: 0.45 };
    }
  }

  function finish(ok) {
    if (over) return;
    over = true; won = ok; endT = 1.8; pose = ok ? 'cheer' : 'sad';
    if (ok) score += Math.round(timeLeft * 25);
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.55);
  }

  function canWrite() { return state === S.PLAYING && !over && !halt && ready <= 0 && phase === 'answer'; }

  game.onTap(function (x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.5); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.2); state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (!canWrite()) game.fx.burst(x, y, { color: CYAN, count: 3, speed: 60 });
  });

  game.onPress(function (x, y) {
    if (!canWrite() || holding) {
      if (state === S.PLAYING) game.audio.play('se_tap', 0.05);
      return;
    }
    holding = true; tally = 1; tickT = TICK;
    game.audio.tone(392, 0.06, { wave: 'square', volume: 0.08 });
    game.fx.burst(LEDGER.x + 90, LEDGER.y + 90, { color: YEL, count: 6, speed: 140 });
  });

  game.onRelease(function (x, y) {
    if (holding && canWrite()) {
      game.audio.play('se_tap', 0.2);
      judge();
    } else if (holding) {
      holding = false;
      game.audio.play('se_tap', 0.05);
    }
  });

  // ── ATTRACT: 1発・同時2発・不発 → 帳面を3本ぶん押して離す ──
  var DEMO_CYCLE = 4.2;
  var demo = { t: 0, show: null, tally: 0, gx: W / 2, gy: H * 0.5, press: false, judged: false, prev: 0, seen: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % DEMO_CYCLE;
    if (cyc < dt || demo.t <= dt || !demo.show) {
      demo.show = makeShow(0, { blooms: 3, doubles: 1, duds: 1, span: 1.1 });
      demo.tally = 0; demo.judged = false; demo.prev = 0; demo.seen = 0;
    }
    soundShow(demo.show, demo.prev, cyc, 0.5);
    demo.prev = cyc;
    var tx = W / 2, ty = H * 0.34;
    demo.press = false;
    var end = demo.show.end;
    if (cyc < end) {
      var seen = 0;
      for (var i = 0; i < demo.show.ev.length; i++) {
        var e = demo.show.ev[i];
        if (!e.dud && cyc > e.at + RISE) seen++;
        if (cyc > e.at && cyc < e.at + RISE + BLOOM) { tx = e.x; ty = e.y + 140; }
      }
      demo.seen = seen;
    } else {
      var k = cyc - end;
      tx = LEDGER.x + LEDGER.w * 0.5; ty = LEDGER.y + LEDGER.h * 0.5;
      if (k > 0.3 && k < 0.3 + TICK * 2.6) {
        demo.press = true;
        var n = 1 + Math.floor((k - 0.3) / TICK);
        if (n > demo.tally) { demo.tally = n; game.audio.tone(392 + n * 40, 0.06, { wave: 'square', volume: 0.05 }); }
      }
      if (k > 0.3 + TICK * 2.6 + 0.15 && !demo.judged) {
        demo.judged = true;
        game.feedback.good(LEDGER.x + LEDGER.w / 2, LEDGER.y - 30, { text: 'GOOD', color: YEL, count: 10, volume: 0.3 });
      }
    }
    demo.gx += (tx - demo.gx) * Math.min(1, dt * 8);
    demo.gy += (ty - demo.gy) * Math.min(1, dt * 8);
    return cyc;
  }

  function drawHud() {
    for (var i = 0; i < PROGRAMS; i++) {
      var done = i < correctN;
      game.draw.circle(80 + i * 100, 80, 36, done ? YEL : PURP, done ? 0.3 : 1);
      game.draw.circle(80 + i * 100, 80, 20, done ? YEL : i === prog ? CYAN : '#2a2060');
    }
    neon(correctN + ' / ' + PROGRAMS, W * 0.55, 82, 46, WHITE);
    neon(String(score), W * 0.86, 82, 44, YEL);
    var fr = Math.max(0, timeLeft / TIME_LIMIT);
    game.draw.rect(40, 168, W - 80, 22, '#1c1048');
    game.draw.rect(44, 172, (W - 88) * fr, 14, timeLeft < 4 && Math.floor(game.time.elapsed * 6) % 2 === 0 ? MAG : CYAN);
  }

  function drawResult() {
    game.draw.rect(80, H * 0.25, W - 160, H * 0.32, NAVY, 0.85);
    game.draw.rect(80, H * 0.25, W - 160, 8, won ? YEL : MAG);
    neon(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.30, 104, won ? YEL : MAG);
    neon(correctN + ' / ' + PROGRAMS, W / 2, H * 0.37, 60, WHITE);
    neon('SCORE ' + score, W / 2, H * 0.43, 50, CYAN);
    if (won && score > prevBest) neon('NEW RECORD', W / 2, H * 0.49, 54, YEL);
    else neon('BEST ' + Math.max(prevBest, game.best || 0), W / 2, H * 0.49, 42, CYAN);
    if (!won && lastDiff > 0) neon('あと' + lastDiff + '発!', W / 2, H * 0.54, 48, YEL);
  }

  game.onUpdate(function (dt) {
    if (state === S.ATTRACT) {
      var cyc = stepDemo(dt);
      drawNight();
      drawShow(demo.show, cyc);
      var inAns = cyc >= demo.show.end;
      drawLedger(demo.tally, inAns, 0);
      drawKeeper(demo.judged ? 'cheer' : 'idle', demo.press);
      if (!inAns) neon(String(demo.seen), W * 0.84, H * 0.60, 90, YEL);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 16 });
      neon(TITLE, W / 2, H * 0.065, 88, MAG);
      neon('HI-SCORE ' + (game.best || 0), W / 2, H * 0.12, 38, CYAN);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) neon('► 100円 投入 ◄', W / 2, H * 0.965, 44, YEL);
      else neon('INSERT COIN', W / 2, H * 0.965, 40, CYAN);
      return;
    }

    if (state === S.PLAYING) {
      if (over) {
        endT -= dt;
        if (won) {
          sparkT -= dt;
          if (sparkT <= 0) { sparkT = 0.2; game.fx.burst(game.random(150, W - 150), game.random(H * 0.16, H * 0.42), { color: NEONS[Math.floor(game.random(0, 4))], count: 20, speed: 380, gravity: 200 }); game.audio.play('se_break', 0.3); }
        }
        if (endT <= 0) state = S.RESULT;
      } else if (halt) {
        halt.t -= dt;
        if (halt.t <= 0) {
          halt = null;
          game.feedback.bad(LEDGER.x + LEDGER.w / 2, LEDGER.y - 30, { text: 'MISS' });
          game.fx.popup(lastDiff > 0 ? 'あと' + lastDiff + '発' : '+' + (-lastDiff), W / 2, H * 0.56, { color: MAG, size: 64 });
        }
      } else if (ready > 0) {
        ready -= dt;
        if (ready <= 0) game.audio.play('se_jump', 0.3);
      } else {
        if (phase === 'watch' || phase === 'answer') timeLeft -= dt;
        if (phase === 'watch') {
          var prev = showT;
          showT += dt;
          soundShow(show, prev, showT, 1);
          if (showT >= show.end) { phase = 'answer'; phaseT = 0; game.audio.tone(660, 0.1, { wave: 'square', volume: 0.07 }); }
        } else if (phase === 'answer') {
          phaseT += dt;
          if (holding) {
            tickT -= dt;
            if (tickT <= 0) {
              tickT += TICK;
              tally = Math.min(20, tally + 1);
              game.audio.tone(392 + tally * 40, 0.06, { wave: 'square', volume: 0.08 });
            }
          } else if (phaseT >= ANSWER_MAX) {
            judge();
          }
        } else if (phase === 'reveal') {
          phaseT += dt;
          if (phaseT > 0.6 + show.count * 0.09) {
            if (lastDiff !== 0) finish(false);
            else if (prog + 1 >= PROGRAMS) finish(true);
            else { prog++; beginProgram(); }
          }
        }
        if (timeLeft <= 0 && !over) {
          timeLeft = 0;
          game.feedback.bad(W / 2, H * 0.40, { text: 'TIME UP' });
          finish(false);
        }
      }
    }

    drawNight();
    if (phase === 'watch' && ready <= 0) drawShow(show, showT);
    if (phase === 'reveal' && !halt) drawReveal(show, phaseT, lastDiff !== 0);
    drawLedger(tally, phase === 'answer' && !over, halt ? 1 - halt.t / halt.max : 0);
    drawKeeper(pose, holding);
    if (phase === 'answer' && !over) {
      var wk = holding ? 1 : Math.max(0, 1 - phaseT / ANSWER_MAX);
      game.draw.rect(LEDGER.x, LEDGER.y + LEDGER.h + 20, LEDGER.w * wk, 12, wk < 0.35 && Math.floor(game.time.elapsed * 8) % 2 === 0 ? MAG : CYAN);
      neon(String(tally), W * 0.84, H * 0.60, 96, YEL);
    }
    drawHud();
    if (ready > 0) neon(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.36, 120, YEL);
    if (over || state === S.RESULT) drawResult();

    if (state === S.RESULT) {
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) neon('TAP TO CONTINUE', W / 2, H * 0.965, 40, WHITE);
      var stats = { programs: correctN, total: PROGRAMS };
      if (won) game.end.success(score, stats);
      else game.end.failure(stats);
    }
  });

  game.onStart(function () {
    game.audio.melody([
      ['C5', 0.5], ['D5', 0.5], ['E5', 0.5], ['G5', 0.5], ['A5', 1], ['G5', 1],
      ['E5', 0.5], ['G5', 0.5], ['A5', 0.5], ['C6', 0.5], ['A5', 1], ['G5', 1],
      ['E5', 0.5], ['D5', 0.5], ['C5', 0.5], ['D5', 0.5], ['E5', 1], ['G5', 1],
      ['A5', 0.5], ['G5', 0.5], ['E5', 0.5], ['D5', 0.5], ['C5', 2],
    ], {
      tempo: 124, wave: 'square', volume: 0.045, loop: true,
      bass: [['C3', 1], ['G2', 1], ['C3', 1], ['G2', 1], ['A2', 1], ['E2', 1], ['A2', 1], ['E2', 1],
        ['F2', 1], ['C3', 1], ['F2', 1], ['C3', 1], ['G2', 1], ['D3', 1], ['C3', 2]],
    });
    state = S.ATTRACT;
    initGame();
  });
})(game);
