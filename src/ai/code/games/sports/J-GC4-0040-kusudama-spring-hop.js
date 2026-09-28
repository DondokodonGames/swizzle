// J-GC4-0040-kusudama-spring-hop.js
// くす玉広場のばね跳び — 光る輪の真上でくす玉が割れる前に、ばね靴を引いて放ち、輪の外へぴたりと跳ぶ
// 操作: 子狐の近くを押さえて跳びたい方向と反対へ引き、離すと引いた長さに応じて跳ぶ。点線が着地点の目安
// 終わり: 規定回数の紙吹雪をかぶらずにやり過ごせばCLEAR。3回かぶる/時間切れでGAME OVER
// @mechanic: slingshot
// @theme: festival_kusudama_plaza
// 世界観: 夏祭りの芝広場、頭上のくす玉が次々と割れて紙吹雪を降らせる。ばね靴の子狐は、地面に光る予告の輪を読み、靴を引き絞って輪の外へ跳び、晴れ着を紙吹雪まみれにせず踊りの舞台まで逃げ切る
// 残るもの: 正誤(CLEAR/GAME OVER) + やり過ごした回数・きわどく避けた回数
// スタイル: 2000s ARCADE POP

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2000s ARCADE POP: 原色+白縁、明るい背景、光の柱と祝祭演出
  var STYLE = { bg: ['#ffe9f6', '#fff7c2', '#c9f7ff'], main: ['#ff3d7f', '#2fb4ff', '#34d17a'], accent: ['#ffd400', '#ffffff'] };
  var C = {
    sky1: '#fff3a8', sky2: '#ffd6ec', lawn1: '#7fe08a', lawn2: '#62cf73', rim: '#ffffff', pink: '#ff3d7f', blue: '#2fb4ff',
    green: '#34d17a', yellow: '#ffd400', orange: '#ff8a1f', ink: '#3a1a4a', white: '#ffffff', bad: '#ff2d55', good: '#1fcf6a', fur: '#ff9a3c'
  };

  var GAME_TITLE = 'SPRING HOP';
  var TIME_LIMIT = 18;
  var NEEDED = 6;
  var HEARTS = 3;
  var FX0 = 110, FX1 = W - 110, FY0 = H * 0.26, FY1 = H * 0.72;
  var MAX_PULL = 280, HOP_K = 2.5;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var phase, ready, timeLeft, fox, rings, ringT, survived, closeCalls, hearts, pull, hitStop, outro, ok, covered, halfShown, burstN;

  // ── sprites ───────────────────────────────────────────────────────
  var KIT = [
    ['o.....o.', 'oo...oo.', 'ooooooo.', 'owoooow.', 'oookooo.', '.ooooo..', '.b...b..', 'bb...bb.'],
    ['o.....o.', 'oo...oo.', 'ooooooo.', 'owoooow.', 'oookooo.', '.ooooo.t', '..b.b..t', '.bb.bb..']
  ];
  var KIT_PAL = { o: C.fur, w: C.white, k: C.ink, b: C.blue, t: C.white };
  var KUSU = [
    '...ss...',
    '..pppp..',
    '.pppppp.',
    'pppyyppp',
    'pppyyppp',
    '.pppppp.',
    '..pppp..',
    '...rr...',
    '...rr...'
  ];
  var LANTERN = ['.rr.', 'rrrr', 'ryyr', 'rrrr', '.rr.'];
  var HEART = ['.r.r.', 'rrrrr', 'rrrrr', '.rrr.', '..r..'];

  function txt(s, x, y, sz, col, align) {
    game.draw.text(s, x + 3, y + 3, { size: sz, color: C.white, bold: true, align: align || 'center' });
    game.draw.text(s, x, y, { size: sz, color: col, bold: true, align: align || 'center' });
  }

  function clampField(p) {
    p.x = Math.max(FX0, Math.min(FX1, p.x));
    p.y = Math.max(FY0, Math.min(FY1, p.y));
    return p;
  }

  function initGame() {
    phase = 'ready'; ready = 0.8; timeLeft = TIME_LIMIT;
    fox = { x: W / 2, y: H * 0.52, hop: null };
    rings = []; ringT = 0.3; survived = 0; closeCalls = 0; hearts = HEARTS; pull = null;
    hitStop = 0; outro = 0; ok = false; covered = 0; halfShown = false; burstN = 0;
  }

  function foxGround() { return fox.hop ? fox.hop.to : { x: fox.x, y: fox.y }; }

  function spawnRings() {
    burstN++;
    var warn = Math.max(1.25, 1.9 - burstN * 0.08);
    var g = foxGround();
    var r1 = { x: g.x + game.random(-70, 70), y: g.y + game.random(-60, 60), r: game.random(220, 270), t: warn, max: warn, popped: 0 };
    clampField(r1);
    rings.push(r1);
    if (burstN >= 3) {
      // 2個目の輪: 逃げ道を狭める(重ならない側へ)
      var ang = game.random(0, Math.PI * 2);
      var r2 = { x: r1.x + Math.cos(ang) * 470, y: r1.y + Math.sin(ang) * 420, r: game.random(190, 230), t: warn, max: warn, popped: 0 };
      clampField(r2);
      rings.push(r2);
    }
    game.audio.tone('A5', 0.08, { wave: 'square', volume: 0.06 });
  }

  // 引いて放す(実プレイ・デモ共用)
  function launchFrom(dx, dy) {
    var len = Math.sqrt(dx * dx + dy * dy);
    if (len > MAX_PULL) { dx *= MAX_PULL / len; dy *= MAX_PULL / len; len = MAX_PULL; }
    var to = clampField({ x: fox.x - dx * HOP_K, y: fox.y - dy * HOP_K });
    fox.hop = { from: { x: fox.x, y: fox.y }, to: to, t: 0, dur: 0.3 + len / MAX_PULL * 0.15 };
    game.audio.play('se_jump', 0.5);
  }

  function landingPreview(dx, dy) {
    var len = Math.sqrt(dx * dx + dy * dy);
    if (len > MAX_PULL) { dx *= MAX_PULL / len; dy *= MAX_PULL / len; }
    return clampField({ x: fox.x - dx * HOP_K, y: fox.y - dy * HOP_K });
  }

  function stepFox(dt) {
    if (!fox.hop) return;
    fox.hop.t += dt;
    if (fox.hop.t >= fox.hop.dur) { fox.x = fox.hop.to.x; fox.y = fox.hop.to.y; fox.hop = null; }
  }

  function stepRings(dt, isDemo) {
    for (var i = rings.length - 1; i >= 0; i--) {
      var rg = rings[i];
      if (rg.popped > 0) { rg.popped -= dt; if (rg.popped <= 0) rings.splice(i, 1); continue; }
      rg.t -= dt;
      if (rg.t <= 0) {
        rg.popped = 0.45;
        game.audio.play('se_break', isDemo ? 0.15 : 0.4);
        var cols = [C.pink, C.yellow, C.blue, C.green];
        for (var c = 0; c < 4; c++) game.fx.burst(rg.x + game.random(-80, 80), rg.y - 60 + game.random(-60, 60), { color: cols[c], count: 10, speed: 300 });
        var g = foxGround();
        var d = Math.hypot(g.x - rg.x, g.y - rg.y);
        rg.hitFox = d < rg.r;
        rg.close = !rg.hitFox && d < rg.r + 70;
      }
    }
    // 同時に割れた輪をまとめて判定
    var anyPop = false, anyHit = false, anyClose = false, hitRing = null;
    for (var j = 0; j < rings.length; j++) {
      var q = rings[j];
      if (q.popped > 0 && !q.judged) {
        q.judged = true; anyPop = true;
        if (q.hitFox) { anyHit = true; hitRing = q; }
        if (q.close) anyClose = true;
      }
    }
    if (!anyPop) return;
    if (isDemo) { if (anyHit) covered = 0.8; return; }
    var g2 = foxGround();
    if (anyHit) {
      hearts--; covered = 0.8;
      if (hearts <= 0) finish(false, hitRing);
      else game.feedback.bad(g2.x, g2.y - 160, { text: 'MISS' });
    } else {
      survived++;
      if (anyClose) closeCalls++;
      game.feedback.good(g2.x, g2.y - 170, { text: anyClose ? 'PERFECT' : 'NICE', color: anyClose ? C.pink : C.good, count: anyClose ? 20 : 10 });
      if (!halfShown && survived >= NEEDED / 2) {
        halfShown = true;
        game.audio.play('se_milestone', 0.5);
        game.fx.popup(survived + ' / ' + NEEDED, W / 2, H * 0.2, { color: C.pink, size: 64 });
      }
      if (survived >= NEEDED) finish(true, null);
    }
    ringT = 0.45;
  }

  function finish(win, rg) {
    if (phase === 'stop' || phase === 'outro') return;
    ok = win; phase = 'stop'; hitStop = 0.55; pull = null;
    game.audio.stopBgm();
    if (win) { game.fx.flash(C.yellow, 0.3); game.audio.play('se_success', 0.6); }
    else {
      var g = foxGround();
      game.feedback.bad(g.x, g.y - 160, { text: timeLeft <= 0 ? 'TIME UP' : 'MISS' });
      game.audio.play('se_failure', 0.6);
    }
  }

  // ── input ─────────────────────────────────────────────────────────
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.6); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });

  game.onPress(function(x, y) {
    if (state !== S.PLAYING || phase !== 'play' || fox.hop) return;
    if (Math.hypot(x - fox.x, y - (fox.y - 60)) < 220) {
      pull = { x: x, y: y, sx: x, sy: y, lvl: 0 };
      game.audio.play('se_tap', 0.35);
    } else {
      game.audio.tone('E3', 0.05, { wave: 'triangle', volume: 0.06 });
      game.fx.burst(x, y, { color: C.white, count: 4, speed: 100 });
    }
  });

  game.onMove(function(x, y) {
    if (!pull || state !== S.PLAYING) return;
    pull.x = x; pull.y = y;
    var len = Math.min(MAX_PULL, Math.hypot(x - pull.sx, y - pull.sy));
    var lvl = Math.floor(len / (MAX_PULL / 4));
    if (lvl !== pull.lvl) {
      pull.lvl = lvl;
      game.audio.tone(300 + lvl * 120, 0.05, { wave: 'square', volume: 0.05 });
      if (lvl === 4) game.audio.play('se_powerup', 0.25);
    }
  });

  game.onRelease(function(x, y) {
    if (!pull || state !== S.PLAYING) return;
    var dx = x - pull.sx, dy = y - pull.sy;
    pull = null;
    if (phase !== 'play') return;
    if (Math.hypot(dx, dy) < 36) {
      // 引きが足りない: その場で足踏み
      game.audio.tone('C3', 0.08, { wave: 'square', volume: 0.07 });
      game.fx.popup('...', fox.x, fox.y - 180, { color: C.ink, size: 40 });
      return;
    }
    launchFrom(dx, dy);
  });

  // ── demo(輪の中心と逆へ引いて外へ跳ぶ。偶数周は引きが弱くて紙吹雪をかぶる)──
  var demo = { t: 0, gx: W / 2, gy: H * 0.6, press: false, n: 0, done: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3;
    if (cyc < dt || demo.t <= dt) {
      demo.n++; demo.done = false; rings = []; covered = 0;
      fox.hop = null; fox.x = W / 2 + (demo.n % 2 ? -120 : 120); fox.y = H * 0.5;
      burstN = 0; spawnRings();
      rings[0].t = rings[0].max = 1.9;
    }
    var rg = rings[0];
    if (!rg) { demo.press = false; return; }
    var ax = fox.x - rg.x, ay = fox.y - rg.y;
    var ad = Math.sqrt(ax * ax + ay * ay) || 1;
    if (ad < 5) { ax = 1; ay = 0; ad = 1; }
    var strong = demo.n % 2 === 1;
    var want = strong ? 170 : 55;
    if (cyc > 0.35 && cyc < 1.05 && !demo.done) {
      var k = Math.min(1, (cyc - 0.35) / 0.5);
      demo.press = true;
      demo.gx = fox.x - (ax / ad) * want * k; demo.gy = fox.y - 60 - (ay / ad) * want * k;
      pull = { sx: fox.x, sy: fox.y - 60, x: demo.gx, y: demo.gy, lvl: 0 };
    } else if (cyc >= 1.05 && !demo.done) {
      demo.done = true; demo.press = false; pull = null;
      launchFrom(-(ax / ad) * want, -(ay / ad) * want);
    } else {
      demo.press = false;
      demo.gx = fox.x + 60; demo.gy = fox.y + 40;
    }
  }

  // ── drawing ───────────────────────────────────────────────────────
  function drawPlaza() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, C.sky1], [0.2, C.sky2], [0.24, C.lawn1], [1, C.lawn2]]);
    // 光の柱
    for (var i = 0; i < 5; i++) {
      var px = 100 + i * 220 + Math.sin(t * 0.8 + i) * 30;
      game.draw.rect(px, 0, 70, H * 0.8, C.white, 0.08 + 0.05 * Math.sin(t * 2 + i));
    }
    // 芝の市松
    for (var gy = FY0 - 30; gy < H; gy += 90) {
      for (var gx = ((gy / 90) % 2) * 90; gx < W; gx += 180) game.draw.rect(gx, gy, 90, 90, C.white, 0.06);
    }
    // 提灯の綱(上端)
    for (var l = 0; l < 7; l++) {
      var lx = 70 + l * 160;
      game.draw.sprite(LANTERN, { r: l % 2 ? C.pink : C.orange, y: C.yellow }, lx, H * 0.19 + Math.sin(t * 2 + l) * 8, 12, { anchor: 'center' });
    }
    game.draw.line(0, H * 0.175, W, H * 0.175, C.ink, 4);
    // 広場の白枠
    game.draw.rect(FX0 - 60, FY0 - 40, 8, FY1 - FY0 + 120, C.rim);
    game.draw.rect(FX1 + 52, FY0 - 40, 8, FY1 - FY0 + 120, C.rim);
    game.draw.rect(FX0 - 60, FY1 + 80, FX1 - FX0 + 120, 8, C.rim);
    game.draw.rect(0, 0, W, H, C.white, 0.03 + 0.03 * Math.sin(t * 1.5));
  }

  function drawRings() {
    var t = game.time.elapsed;
    for (var i = 0; i < rings.length; i++) {
      var rg = rings[i];
      if (rg.popped > 0) {
        game.draw.circle(rg.x, rg.y, rg.r, C.yellow, rg.popped);
        continue;
      }
      var k = 1 - rg.t / rg.max;
      var blink = rg.t < 0.6 && Math.floor(t * 14) % 2 === 0;
      game.draw.circle(rg.x, rg.y, rg.r + 10, blink ? C.bad : C.pink, 0.55);
      game.draw.circle(rg.x, rg.y, rg.r, '#ffe3f0', 0.55);
      game.draw.circle(rg.x, rg.y, rg.r * (1 - k), C.pink, 0.22);
      // 真上のくす玉(割れるほど揺れる)
      var sh = Math.sin(t * (10 + k * 30)) * k * 16;
      game.draw.line(rg.x, H * 0.175, rg.x + sh, rg.y - 330, C.ink, 3);
      game.draw.sprite(KUSU, { s: C.ink, p: C.pink, y: C.yellow, r: C.bad }, rg.x + sh, rg.y - 260, 16 + k * 5, { anchor: 'center' });
    }
  }

  function drawFox() {
    var t = game.time.elapsed;
    var x = fox.x, y = fox.y, lift = 0;
    if (fox.hop) {
      var k = Math.min(1, fox.hop.t / fox.hop.dur);
      x = fox.hop.from.x + (fox.hop.to.x - fox.hop.from.x) * k;
      y = fox.hop.from.y + (fox.hop.to.y - fox.hop.from.y) * k;
      lift = Math.sin(k * Math.PI) * 160;
    }
    game.draw.circle(x, y + 10, 50 - lift * 0.15, C.ink, 0.2);
    var fr = KIT[fox.hop ? 1 : Math.floor(t * 3) % 2];
    var squash = pull ? Math.min(1, Math.hypot(pull.x - pull.sx, pull.y - pull.sy) / MAX_PULL) : 0;
    game.draw.sprite(fr, KIT_PAL, x, y - 60 - lift + squash * 20 + Math.sin(t * 4) * 4, 15, { anchor: 'center' });
    if (covered > 0) {
      var cols = [C.pink, C.yellow, C.blue, C.green];
      for (var c = 0; c < 10; c++) game.draw.rect(x - 60 + ((c * 37) % 120), y - 130 + ((c * 53) % 110), 14, 10, cols[c % 4]);
      if (phase === 'stop' && Math.floor(t * 14) % 2 === 0) game.draw.circle(x, y - 60, 110, C.white, 0.5);
    }
  }

  function drawPull() {
    if (!pull) return;
    var dx = pull.x - pull.sx, dy = pull.y - pull.sy;
    game.draw.line(fox.x, fox.y - 60, fox.x + dx * 0.6, fox.y - 60 + dy * 0.6, C.ink, 8);
    var p = landingPreview(dx, dy);
    for (var i = 1; i <= 8; i++) {
      var k = i / 8;
      var x = fox.x + (p.x - fox.x) * k, y = fox.y + (p.y - fox.y) * k - Math.sin(k * Math.PI) * 120;
      game.draw.circle(x, y, 9, C.white, 0.9);
    }
    game.draw.circle(p.x, p.y, 30, C.white, 0.6);
    game.draw.circle(p.x, p.y, 16, C.pink, 0.8);
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 225, C.white, 0.7);
    txt(survived + ' / ' + NEEDED, W / 2, 90, 66, C.ink);
    for (var i = 0; i < HEARTS; i++) game.draw.sprite(HEART, { r: i < hearts ? C.bad : '#e9d6e0' }, 70 + i * 70, 90, 10, { anchor: 'center' });
    game.draw.rect(60, 170, W - 120, 20, '#f1d7ea');
    game.draw.rect(60, 170, (W - 120) * Math.max(0, timeLeft / TIME_LIMIT), 20, timeLeft < 4 ? C.bad : C.blue);
    // 親指ゾーン: 踊りの舞台(ゴールの予感)
    var t = game.time.elapsed;
    game.draw.rect(0, H * 0.84, W, H * 0.16, C.pink, 0.9);
    for (var s = 0; s < 12; s++) game.draw.rect(s * 95 + ((t * 40) % 95), H * 0.84, 40, 16, C.yellow);
  }

  // ── main loop ─────────────────────────────────────────────────────
  game.onUpdate(function(dt) {
    var t = game.time.elapsed;
    if (covered > 0 && phase !== 'stop') covered -= dt;

    if (state === S.ATTRACT) {
      if (phase === undefined) initGame();
      stepDemo(dt);
      stepFox(dt);
      stepRings(dt, true);
      drawPlaza(); drawRings(); drawPull(); drawFox();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 14 });
      game.draw.rect(0, H * 0.84, W, H * 0.16, C.pink, 0.9);
      txt(GAME_TITLE, W / 2, 90 + Math.sin(t * 2) * 6, 80, C.pink);
      txt('HI-SCORE ' + game.best, W / 2, 175, 36, C.ink);
      if (Math.floor(t * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.92, 44, C.yellow);
      else txt('INSERT COIN', W / 2, H * 0.92, 36, C.white);
      return;
    }

    if (state === S.RESULT) {
      drawPlaza(); drawFox();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.4, 90, ok ? C.good : C.bad);
      if (Math.floor(t * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.92, 40, C.white);
      return;
    }

    if (phase === 'ready') {
      ready -= dt;
      if (ready <= 0) { phase = 'play'; game.audio.play('se_tap', 0.5); }
    } else if (phase === 'play') {
      timeLeft -= dt;
      stepFox(dt);
      if (rings.length === 0) { ringT -= dt; if (ringT <= 0) spawnRings(); }
      stepRings(dt, false);
      if (phase === 'play' && timeLeft <= 0) { timeLeft = 0; finish(false, null); }
    } else if (phase === 'stop') {
      hitStop -= dt;
      if (hitStop <= 0) { phase = 'outro'; outro = 1.4; }
    } else if (phase === 'outro') {
      outro -= dt;
      stepFox(dt);
      if (outro <= 0) {
        state = S.RESULT;
        var score = survived * 100 + closeCalls * 50 + hearts * 30;
        var stats = { survived: survived, closeCalls: closeCalls, hearts: hearts };
        if (ok) game.end.success(score, stats);
        else game.end.failure(stats);
        return;
      }
    }

    drawPlaza(); drawRings(); drawPull(); drawFox(); drawHud();
    if (phase === 'ready') txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.4, 96, C.pink);
    if (phase === 'outro') {
      game.draw.rect(0, H * 0.33, W, H * 0.17, C.white, 0.85);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.37, 96, ok ? C.good : C.bad);
      var sc = survived * 100 + closeCalls * 50 + hearts * 30;
      txt('SCORE ' + sc, W / 2, H * 0.43, 44, C.ink);
      if (ok && sc > game.best) txt('NEW RECORD', W / 2, H * 0.47, 40, C.pink);
      else if (!ok) txt('あと' + Math.max(1, NEEDED - survived) + '回!', W / 2, H * 0.47, 44, C.bad);
      else txt('BEST ' + game.best, W / 2, H * 0.47, 36, C.ink);
    }
  });

  game.onStart(function() {
    game.audio.melody([
      ['C5', 0.5], ['C5', 0.5], ['G5', 0.5], ['E5', 0.5], ['F5', 0.5], ['A5', 0.5], ['G5', 1],
      ['E5', 0.5], ['D5', 0.5], ['C5', 0.5], ['D5', 0.5], ['E5', 0.5], ['G5', 0.5], ['C6', 1]
    ], { tempo: 160, wave: 'square', volume: 0.05, loop: true, bass: [['C3', 1], ['G3', 1], ['F3', 1], ['G3', 1], ['C3', 1], ['G3', 1], ['F3', 1], ['C3', 1]] });
    state = S.ATTRACT;
    initGame();
  });
})(game);
