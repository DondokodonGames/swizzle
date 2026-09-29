// J-Switch-0044-pass-owl-stamp.js
// 雲の関所スタンプ — 峠を飛び過ぎる渡り鳥の首の旅券に、まん中を狙って判を押す
// 操作: 飛んでいく鳥がぶら下げた旅券をタップすると判が押される。まん中ほど高得点、空を叩くとインクがにじんでミス(社内メモ。画面には出さない)
// 終わり: 判の点数が15に届けばCLEAR。空押し4回/時間切れでGAME OVER
// @mechanic: aim_shoot
// @theme: sky_pass_migrant_stamp
// 世界観: 雲の上の峠に置かれた渡り鳥の関所で、見習いのフクロウの関所番が、群れで飛び過ぎていく鳥たちの首に下がった小さな旅券へ、止まってくれない相手の動きを読んで一羽ずつ判を押していく
// 残るもの: 正誤(CLEAR/GAME OVER) + 判の点数・PERFECT数・空押し数
// スタイル: 2000s HANDHELD PASTEL

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2000s HANDHELD PASTEL: パステル、白縁の丸い形、上下で情報を分ける
  var STYLE = { bg: ['#bfe3f5', '#f6d9e8', '#fff6e6'], main: ['#ffffff', '#8fb8de', '#f5a3b8'], accent: ['#ff7a8a', '#ffc94d'] };
  var P = {
    sky: '#bfe3f5', sky2: '#f6d9e8', cloud: '#ffffff', ink: '#5a4a6e', pink: '#f5a3b8', rose: '#ff7a8a',
    blue: '#8fb8de', sun: '#ffc94d', mint: '#a8e0c8', cream: '#fff6e6', gray: '#c9c3d6', stampRed: '#e0506a'
  };

  var GAME_TITLE = 'CLOUD PASS';
  var TIME_LIMIT = 16;
  var GOAL = 15;
  var MAX_BLOT = 4;
  var LANES = [470, 700, 930, 1160];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var mode, countIn, clock, pts, blots, perfects, flock, nextBird, marks, freeze, endT, won, lastHit, pulse, spawned, milestone;

  var BIRD = [
    ['..bbb.....', '.bbbbb....', 'bbewbbbbo.', '.bbbbbbb..', '..bbbbb...', '...w.w....'],
    ['bb.bb.....', '.bbbbb....', 'bbewbbbbo.', '.bbbbbbb..', '..bbb.....', '...w.w....']
  ];
  var BOOK = ['pppppp', 'pwwwwp', 'pwwwwp', 'pwwwwp', 'pppppp'];
  var OWL = [
    ['.b....b.', '.bbbbbb.', 'bwwbbwwb', 'bwkbbkwb', 'bbbyybbb', '.bbbbbb.', '.bcccb..', '..y..y..'],
    ['.b....b.', '.bbbbbb.', 'bwwbbwwb', 'bwwbbwwb', 'bbbyybbb', '.bbbbbb.', '.bcccb..', '..y..y..']
  ];
  var STAMP = ['.hhh.', '.hhh.', '..h..', 'sssss', 'sssss'];
  var CLOUD = ['..www...', '.wwwwww.', 'wwwwwwww', '.wwwwww.'];

  function label(s, x, y, size, col, al) {
    game.draw.text(s, x, y + 4, { size: size, color: '#ffffff', bold: true, align: al || 'center' });
    game.draw.text(s, x, y, { size: size, color: col, bold: true, align: al || 'center' });
  }

  function makeBird() {
    var lane = LANES[Math.floor(game.random(0, LANES.length - 0.001))];
    var dir = game.random(0, 1) < 0.5 ? 1 : -1;
    var speed = 250 + Math.min(260, spawned * 16) + game.random(-30, 30);
    var r = game.random(0, 1);
    return {
      x: dir > 0 ? -120 : W + 120, baseY: lane, y: lane, dir: dir, v: speed,
      wave: r < 0.3 ? game.random(60, 110) : 0, ph: game.random(0, 6), gold: r > 0.86,
      done: false, glow: 0, flap: game.random(0, 1)
    };
  }

  function resetRound() {
    mode = 'count'; countIn = 0.8; clock = TIME_LIMIT; pts = 0; blots = 0; perfects = 0;
    flock = []; nextBird = 0.2; marks = []; freeze = 0; endT = 0; won = false; lastHit = null; pulse = 0; spawned = 0; milestone = false;
  }

  function bookPos(b) { return { x: b.x + b.dir * 10, y: b.y + 95 }; }

  // 鳥の群れを進める(実プレイ・デモ共用)
  function flyFlock(dt) {
    nextBird -= dt;
    if (nextBird <= 0) { flock.push(makeBird()); spawned++; nextBird = Math.max(0.5, 1.1 - spawned * 0.04); }
    for (var i = flock.length - 1; i >= 0; i--) {
      var b = flock[i];
      b.x += b.dir * b.v * dt;
      b.ph += dt * 3.2;
      b.y = b.baseY + (b.wave ? Math.sin(b.ph) * b.wave : Math.sin(b.ph) * 10);
      b.flap += dt * 6;
      if (b.glow > 0) b.glow -= dt;
      if (b.x < -200 || b.x > W + 200) flock.splice(i, 1);
    }
    for (var m = marks.length - 1; m >= 0; m--) { marks[m].t -= dt; if (marks[m].t <= 0) marks.splice(m, 1); }
  }

  // 判を押す(実プレイ・デモ共用)
  function press(x, y, ghost) {
    marks.push({ x: x, y: y, t: 0.35 });
    var best = null, bd = 1e9;
    for (var i = 0; i < flock.length; i++) {
      if (flock[i].done) continue;
      var bp = bookPos(flock[i]);
      var d = Math.hypot(x - bp.x, y - bp.y);
      if (d < bd) { bd = d; best = flock[i]; }
    }
    if (best && bd < 80) {
      best.done = true; best.glow = 0.5;
      var perfect = bd < 30;
      var gain = (perfect ? 2 : 1) * (best.gold ? 2 : 1);
      var bp2 = bookPos(best);
      if (ghost) { game.fx.burst(bp2.x, bp2.y, { color: P.rose, count: 8, speed: 200 }); return true; }
      pts += gain; if (perfect) perfects++;
      lastHit = { x: bp2.x, y: bp2.y };
      game.feedback.good(bp2.x, bp2.y - 90, { text: perfect ? 'PERFECT' : 'GOOD', color: perfect ? P.sun : P.rose, count: perfect ? 16 : 9 });
      if (best.gold) game.audio.play('se_coin', 0.4);
      if (!milestone && pts >= GOAL / 2) {
        milestone = true;
        game.audio.play('se_milestone', 0.5);
        game.fx.popup(pts + ' / ' + GOAL, W / 2, 360, { color: P.ink, size: 70 });
      }
      if (pts >= GOAL) endRound(true);
      return true;
    }
    if (ghost) { game.fx.burst(x, y, { color: P.gray, count: 5, speed: 120 }); return false; }
    blots++;
    lastHit = { x: x, y: y };
    game.feedback.bad(x, y - 80, { text: 'MISS', color: P.stampRed });
    if (blots >= MAX_BLOT) endRound(false); else freeze = 0.3;
    return false;
  }

  function endRound(win) {
    if (mode === 'freeze' || mode === 'end') return;
    won = win; mode = 'freeze'; freeze = 0.55;
    game.audio.stopBgm();
    if (win) { game.fx.flash(P.cream, 0.25); game.audio.play('se_success', 0.6); }
    else {
      if (clock <= 0) game.feedback.bad(W / 2, H * 0.42, { text: 'TIME UP', color: P.stampRed });
      game.audio.play('se_failure', 0.6);
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.6); state = S.PLAYING; resetRound(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; resetRound(); demo.t = 0; return; }
    if (mode !== 'run' || freeze > 0) return;
    game.audio.play('se_tap', 0.3);
    if (y < 260 || y > 1420) { game.fx.burst(x, y, { color: P.gray, count: 3, speed: 80 }); return; }
    press(x, y, false);
  });

  // ── demo: 旅券の少し先を狙って押す。4回に1回は遅れて空を叩く ──
  var demo = { t: 0, gx: W / 2, gy: 1300, press: 0, n: 0, wait: 0.6 };
  function stepDemo(dt) {
    demo.t += dt;
    if (demo.t <= dt) { flock = []; marks = []; spawned = 0; nextBird = 0.1; demo.n = 0; demo.wait = 0.6; }
    if (spawned > 12) spawned = 4;
    flyFlock(dt);
    demo.press -= dt;
    var tgt = null;
    for (var i = 0; i < flock.length; i++) if (!flock[i].done && flock[i].x > 120 && flock[i].x < W - 120) { tgt = flock[i]; break; }
    if (tgt) {
      var bp = bookPos(tgt);
      var late = demo.n % 4 === 3;
      var ax = bp.x - (late ? tgt.dir * 150 : 0), ay = bp.y;
      demo.gx += (ax - demo.gx) * Math.min(1, dt * 10);
      demo.gy += (ay - demo.gy) * Math.min(1, dt * 10);
      demo.wait -= dt;
      if (demo.wait <= 0 && Math.hypot(ax - demo.gx, ay - demo.gy) < 30) {
        demo.press = 0.18; demo.n++; demo.wait = 0.9;
        press(demo.gx, demo.gy, true);
      }
    } else {
      demo.gx += (W / 2 - demo.gx) * Math.min(1, dt * 3);
      demo.gy += (1300 - demo.gy) * Math.min(1, dt * 3);
    }
  }

  // ── drawing ──
  function drawSky() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, P.sky], [0.55, P.sky2], [1, P.cream]]);
    game.draw.circle(W * 0.8, 380, 90 + Math.sin(t) * 4, P.sun, 0.5);
    for (var i = 0; i < 6; i++) {
      var cx = ((i * 260 + t * (20 + i * 6)) % (W + 400)) - 200;
      game.draw.sprite(CLOUD, { w: P.cloud }, cx, 320 + i * 170, 26, { anchor: 'center', alpha: 0.75 });
    }
    // 峠の関所の屋根(遠景)
    game.draw.rect(0, 1330, W, 110, P.blue, 0.5);
    for (var p = 0; p < 5; p++) game.draw.rect(90 + p * 220, 1300 + Math.sin(t * 1.2 + p) * 3, 30, 140, P.ink, 0.35);
    game.draw.rect(0, 0, W, H, P.pink, 0.04 + 0.03 * Math.sin(t * 1.6));
  }

  function drawFlock() {
    for (var i = 0; i < flock.length; i++) {
      var b = flock[i];
      var bp = bookPos(b);
      var col = b.gold ? P.sun : [P.blue, P.pink, P.mint][i % 3];
      game.draw.line(b.x, b.y + 30, bp.x, bp.y - 30, P.ink, 3);
      game.draw.sprite(BIRD[Math.floor(b.flap) % 2], { b: col, e: P.ink, w: '#ffffff', o: P.sun }, b.x, b.y, 11, { anchor: 'center', flipX: b.dir < 0 });
      game.draw.circle(bp.x, bp.y, 46, '#ffffff');
      game.draw.sprite(BOOK, { p: b.gold ? P.sun : P.ink, w: P.cream }, bp.x, bp.y, 12, { anchor: 'center' });
      if (!b.done) game.draw.circle(bp.x, bp.y, 10, P.rose, 0.6);
      else game.draw.circle(bp.x, bp.y, 22, P.stampRed, 0.9);
      if (b.glow > 0) game.draw.circle(bp.x, bp.y, 70 * (1.5 - b.glow), '#ffffff', b.glow);
    }
    for (var m = 0; m < marks.length; m++) {
      var k = marks[m].t / 0.35;
      game.draw.sprite(STAMP, { h: P.ink, s: P.stampRed }, marks[m].x, marks[m].y - 40 - k * 40, 14, { anchor: 'center', alpha: k });
    }
  }

  function drawDesk() {
    var t = game.time.elapsed;
    game.draw.rect(0, 1440, W, H - 1440, P.cream);
    game.draw.rect(0, 1440, W, 16, P.pink);
    game.draw.sprite(OWL[Math.floor(t * 1.5) % 4 === 0 ? 1 : 0], { b: P.blue, w: '#ffffff', k: P.ink, y: P.sun, c: P.rose }, W * 0.2, 1640 + Math.sin(t * 2) * 6, 20, { anchor: 'center' });
    game.draw.sprite(STAMP, { h: P.ink, s: P.stampRed }, W * 0.42, 1650 + Math.sin(t * 3) * 4, 16, { anchor: 'center' });
    for (var i = 0; i < MAX_BLOT; i++) game.draw.circle(W * 0.6 + i * 90, 1650, 28, i < blots ? P.stampRed : P.gray);
  }

  function drawTop() {
    game.draw.rect(0, 0, W, 228, '#ffffff', 0.85);
    game.draw.rect(0, 224, W, 6, P.pink);
    label(pts + ' / ' + GOAL, W / 2, 95, 70, P.ink);
    label(String(Math.ceil(clock)), 60, 95, 52, P.rose, 'left');
    game.draw.rect(60, 165, W - 120, 20, P.gray);
    game.draw.rect(60, 165, (W - 120) * Math.min(1, pts / GOAL), 20, P.rose);
    game.draw.rect(60, 195, (W - 120) * Math.max(0, clock / TIME_LIMIT), 10, clock < 4 ? P.stampRed : P.blue);
  }

  function finalScore() { return pts * 50 + perfects * 30 + (MAX_BLOT - blots) * 40 + Math.ceil(clock) * 10; }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;
    if (state === S.ATTRACT) {
      if (mode === undefined) resetRound();
      stepDemo(dt);
      drawSky(); drawFlock(); drawDesk();
      game.draw.hand(demo.gx, demo.gy + 40, { press: demo.press > 0, scale: 13 });
      game.draw.rect(0, 0, W, 228, '#ffffff', 0.85);
      label(GAME_TITLE, W / 2, 95 + Math.sin(t * 2) * 6, 80, P.ink);
      label('HI-SCORE ' + game.best, W / 2, 180, 36, P.rose);
      if (Math.floor(t * 1.8) % 2 === 0) label('► 100円 投入 ◄', W / 2, H * 0.97, 40, P.rose);
      else label('INSERT COIN', W / 2, H * 0.97, 34, P.ink);
      return;
    }
    if (state === S.RESULT) {
      drawSky(); drawDesk();
      label(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.42, 92, won ? P.rose : P.ink);
      label('SCORE ' + (won ? finalScore() : 0), W / 2, H * 0.48, 44, P.ink);
      if (Math.floor(t * 2) % 2 === 0) label('TAP TO CONTINUE', W / 2, H * 0.97, 38, P.ink);
      return;
    }

    if (mode === 'count') {
      countIn -= dt;
      if (countIn <= 0) { mode = 'run'; game.audio.play('se_tap', 0.5); }
    } else if (mode === 'run') {
      if (freeze > 0) freeze -= dt;
      else {
        clock -= dt;
        flyFlock(dt);
        if (clock <= 0) { clock = 0; endRound(false); }
      }
    } else if (mode === 'freeze') {
      freeze -= dt;
      if (freeze <= 0) { mode = 'end'; endT = 1.4; }
    } else if (mode === 'end') {
      endT -= dt;
      if (endT <= 0) {
        state = S.RESULT;
        var stats = { points: pts, perfects: perfects, blots: blots };
        if (won) game.end.success(finalScore(), stats); else game.end.failure(stats);
        return;
      }
    }

    drawSky(); drawFlock(); drawDesk(); drawTop();
    if ((mode === 'freeze' || freeze > 0) && lastHit && Math.floor(t * 16) % 2 === 0) {
      game.draw.circle(lastHit.x, lastHit.y, 110, '#ffffff', 0.45);
    }
    if (mode === 'count') label(countIn > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.42, 100, P.rose);
    if (mode === 'end') {
      game.draw.rect(0, H * 0.35, W, H * 0.17, '#ffffff', 0.9);
      label(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.4, 92, won ? P.rose : P.ink);
      if (won && finalScore() > game.best) label('NEW RECORD', W / 2, H * 0.46, 46, P.sun);
      else if (won) label('BEST ' + game.best, W / 2, H * 0.46, 40, P.ink);
      else label('あと' + Math.max(1, GOAL - pts) + '点!', W / 2, H * 0.46, 48, P.ink);
    }
  });

  game.onStart(function() {
    game.audio.melody([
      ['G5', 0.5], ['E5', 0.5], ['C5', 0.5], ['E5', 0.25], ['G5', 0.25],
      ['A5', 0.5], ['G5', 0.5], ['E5', 1],
      ['F5', 0.5], ['D5', 0.5], ['B4', 0.5], ['D5', 0.5], ['C5', 1.5]
    ], { tempo: 120, wave: 'sine', volume: 0.05, loop: true, bass: [['C3', 2], ['F3', 2], ['G3', 2], ['C3', 2]] });
    state = S.ATTRACT;
    resetRound();
  });
})(game);
