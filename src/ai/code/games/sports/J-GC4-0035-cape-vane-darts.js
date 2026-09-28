// J-GC4-0035-cape-vane-darts.js
// 岬の風見ダーツ — 羽根矢を上へ弾き、潮風に揺れる的板へ5本で規定点を刺す
// 操作: 下の羽根矢をつまんで上へ素早く弾く。弾く向きで左右、弾く速さで上下の着弾点が決まる。吹き流しの向きへ風で流される
// 終わり: 5本の合計が規定点以上でCLEAR。規定点未満/時間切れでGAME OVER
// @mechanic: flick_launch
// @theme: cape_wind_vane_darts
// 世界観: 岬の風見小屋に弟子入りした風読み見習いが、吹き流しで潮風を読みながら羽根矢を弾き、揺れる的板に5本で親方の合格点を刺す
// 残るもの: 正誤(CLEAR/GAME OVER) + 5本の合計点・中心命中数
// スタイル: SKEUOMORPH

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // SKEUOMORPH: 木目の壁、フェルトの的、真鍮の縁、光沢の半透明ハイライト
  var STYLE = { bg: ['#5a3a22', '#7a5233', '#3e2616'], main: ['#2f5d3a', '#e9dcc0', '#b8883a'], accent: ['#d9412b', '#ffe07a'] };
  var C = {
    wood1: '#6b4529', wood2: '#80573a', wood3: '#4c3019', felt: '#2f5d3a', feltDark: '#234a2d',
    cream: '#efe3c6', brass: '#c9973e', brassLite: '#f3d27d', red: '#d9412b', gold: '#ffe07a',
    ink: '#2a1a0e', white: '#fffaf0', good: '#8fe38a', bad: '#ff5a4a', sky: '#9fd0e6'
  };

  var GAME_TITLE = 'CAPE VANE DARTS';
  var TIME_LIMIT = 18;
  var DARTS = 5;
  var NEEDED = 110;            // 合格点
  var BOARD_Y = H * 0.34;
  var BOARD_R = 200;
  var RINGS = [[26, 50], [74, 30], [136, 20], [200, 10]];
  var DART_HOME_X = W / 2, DART_HOME_Y = H * 0.83;
  var FLICK_MIN = 1400;        // これ未満の上向き速度は弾けていない
  var IDEAL_SPEED = 4200;      // この速さで中心の高さ

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var phase, ready, timeLeft, score, left, bulls, hits, stuck, dart, wind, windNext, boardX, swayT,
    swayAmp, grab, samples, armed, hitStop, outro, ok, highlight, milestoneShown, lastPts;

  // ── sprites ───────────────────────────────────────────────────────
  var DART = [
    '..r..',
    '.rwr.',
    '.rwr.',
    '..b..',
    '..b..',
    '..b..',
    '..b..',
    '..s..',
    '..s..'
  ];
  var DART_PAL = { r: C.red, w: C.white, b: C.brass, s: '#d8d8d8' };
  var DART_SMALL = ['.r.', 'rwr', '.b.', '.b.', '.s.'];
  var PENNANT = [
    ['p....', 'ppp..', 'ppppp', 'ppp..', 'p....'],
    ['p....', 'pp...', 'pppp.', 'ppppp', 'pp...'],
    ['pp...', 'pppp.', 'ppppp', 'pp...', 'p....']
  ];
  var APPRENTICE = [
    ['..hhh..', '.hhhhh.', '..fff..', '..fef..', '.ccccc.', 'cc.c.cc', '..ccc..', '..l.l..'],
    ['..hhh..', '.hhhhh.', '..fff..', '..fef..', '.ccccc.', '.cc.cc.', '..ccc..', '.l...l.']
  ];
  var APP_PAL = { h: '#2b5f8a', f: '#f1c9a0', e: C.ink, c: '#c8663a', l: C.ink };
  var CLOUD = ['..ww..', '.wwww.', 'wwwwww'];

  function txt(s, x, y, sz, col, align) {
    game.draw.text(s, x + 2, y + 3, { size: sz, color: '#1a0f06', bold: true, align: align || 'center' });
    game.draw.text(s, x, y, { size: sz, color: col, bold: true, align: align || 'center' });
  }

  function initGame() {
    phase = 'ready'; ready = 0.8; timeLeft = TIME_LIMIT; score = 0; left = DARTS; bulls = 0; hits = 0;
    stuck = []; dart = { x: DART_HOME_X, y: DART_HOME_Y, fly: false }; wind = 0; windNext = game.random(-1, 1);
    boardX = W / 2; swayT = 0; swayAmp = 60; grab = false; samples = []; armed = false;
    hitStop = 0; outro = 0; ok = false; highlight = null; milestoneShown = false; lastPts = 0;
  }

  // 着弾点の計算(実プレイとデモで共用)
  function launch(vx, vy) {
    var speed = Math.sqrt(vx * vx + vy * vy);
    var rise = DART_HOME_Y - BOARD_Y;
    var ax = dart.x + (vx / Math.max(1, -vy)) * rise;
    var ay = BOARD_Y + Math.max(-420, Math.min(420, (IDEAL_SPEED - speed) * 0.09));
    ax += wind * 150;
    dart.fly = true; dart.t = 0; dart.sx = dart.x; dart.sy = dart.y; dart.tx = ax; dart.ty = ay;
    game.audio.play('se_jump', 0.5);
  }

  function ringScore(dx, dy) {
    var d = Math.sqrt(dx * dx + dy * dy);
    for (var i = 0; i < RINGS.length; i++) if (d <= RINGS[i][0]) return RINGS[i][1];
    return 0;
  }

  function landDart(isDemo) {
    dart.fly = false;
    var relX = dart.tx - boardX, relY = dart.ty - BOARD_Y;
    var pts = ringScore(relX, relY);
    var mult = (left === 1 && !isDemo) ? 2 : 1;
    lastPts = pts * mult;
    if (pts > 0) {
      stuck.push({ rx: relX, ry: relY });
      if (!isDemo) {
        score += lastPts; hits++;
        if (pts === 50) bulls++;
        highlight = { x: dart.tx, y: dart.ty, t: 0.35 };
        hitStop = 0.3;
        game.feedback.good(dart.tx, dart.ty - 40, { text: pts === 50 ? 'PERFECT' : (pts >= 30 ? 'GOOD' : String(lastPts)), color: pts === 50 ? C.gold : C.good, count: pts === 50 ? 22 : 10 });
        if (mult === 2) game.fx.popup('x2', dart.tx + 90, dart.ty - 90, { color: C.gold, size: 64 });
        if (!milestoneShown && score >= NEEDED / 2) {
          milestoneShown = true;
          game.audio.play('se_milestone', 0.5);
          game.fx.popup('NICE', W / 2, H * 0.14, { color: C.gold, size: 60 });
        }
      } else {
        game.fx.burst(dart.tx, dart.ty, { color: C.gold, count: 8, speed: 260 });
      }
    } else {
      if (!isDemo) {
        game.feedback.bad(dart.tx, dart.ty, { text: 'MISS' });
        hitStop = 0.3;
      }
    }
    if (isDemo) return;
    left--;
    dart.x = DART_HOME_X; dart.y = DART_HOME_Y;
    wind = windNext; windNext = game.random(-1.2, 1.2);
    swayAmp += 28;
    if (left <= 0) finish(score >= NEEDED);
  }

  function finish(win) {
    if (phase === 'stop' || phase === 'outro') return;
    ok = win; phase = 'stop'; hitStop = 0.5;
    game.audio.stopBgm();
    if (win) {
      highlight = { x: boardX, y: BOARD_Y, t: 0.5, big: true };
      game.fx.flash(C.gold, 0.25);
      game.audio.play('se_success', 0.6);
    } else {
      highlight = { x: boardX, y: BOARD_Y, t: 0.5, big: true, bad: true };
      game.feedback.bad(boardX, BOARD_Y, { text: timeLeft <= 0 ? 'TIME UP' : 'MISS' });
      game.audio.play('se_failure', 0.6);
    }
  }

  // ── input ─────────────────────────────────────────────────────────
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.6); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });

  game.onPress(function(x, y) {
    if (state !== S.PLAYING || phase !== 'aim' || dart.fly) return;
    if (y > H * 0.6) {
      grab = true; armed = false;
      samples = [{ x: x, y: y, t: game.time.elapsed }];
      dart.x = Math.max(160, Math.min(W - 160, x)); dart.y = Math.max(H * 0.72, y);
      game.audio.play('se_tap', 0.4);
    } else {
      game.audio.tone('D3', 0.06, { wave: 'triangle', volume: 0.08 });
      game.fx.burst(x, y, { color: C.cream, count: 4, speed: 120 });
    }
  });

  game.onMove(function(x, y) {
    if (!grab || state !== S.PLAYING) return;
    samples.push({ x: x, y: y, t: game.time.elapsed });
    if (samples.length > 12) samples.shift();
    dart.x = Math.max(160, Math.min(W - 160, x)); dart.y = Math.max(H * 0.62, Math.min(H * 0.9, y));
    var v = flickVelocity();
    if (!armed && v && -v.vy > FLICK_MIN) { armed = true; game.audio.tone('A5', 0.05, { wave: 'sine', volume: 0.08, slide: 1400 }); }
  });

  game.onRelease(function(x, y) {
    if (!grab || state !== S.PLAYING) return;
    grab = false;
    samples.push({ x: x, y: y, t: game.time.elapsed });
    var v = flickVelocity();
    if (v && -v.vy > FLICK_MIN && phase === 'aim') {
      launch(v.vx, v.vy);
    } else {
      // 弾けていない: 矢が手元でぐらついて戻る
      game.audio.tone('C3', 0.1, { wave: 'square', volume: 0.07 });
      game.fx.popup('...', dart.x, dart.y - 90, { color: C.cream, size: 40 });
      dart.x = DART_HOME_X; dart.y = DART_HOME_Y; dart.wob = 0.4;
    }
  });

  function flickVelocity() {
    if (samples.length < 2) return null;
    var last = samples[samples.length - 1], first = samples[0];
    for (var i = samples.length - 1; i >= 0; i--) {
      first = samples[i];
      if (last.t - samples[i].t > 0.12) break;
    }
    var dt = Math.max(0.016, last.t - first.t);
    return { vx: (last.x - first.x) / dt, vy: (last.y - first.y) / dt };
  }

  // ── demo (実ロジックで1本ずつ投げて見せる) ─────────────────────────
  var demo = { t: 0, gx: DART_HOME_X, gy: DART_HOME_Y, press: false, n: 0, thrown: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 2.4;
    if (cyc < dt || demo.t <= dt) {
      demo.n++; demo.thrown = false; dart.fly = false;
      dart.x = DART_HOME_X; dart.y = DART_HOME_Y;
      if (stuck.length > 3) stuck = [];
      wind = (demo.n % 2) ? 0.35 : -0.5;
    }
    if (cyc < 0.5) {
      demo.gx = DART_HOME_X; demo.gy = DART_HOME_Y + 20; demo.press = cyc > 0.2;
    } else if (cyc < 0.75) {
      var k = (cyc - 0.5) / 0.25;
      demo.press = true; demo.gx = DART_HOME_X - 40 * wind * k; demo.gy = DART_HOME_Y + 20 - 260 * k;
      dart.x = demo.gx; dart.y = demo.gy - 20;
    } else {
      demo.press = false;
      if (!demo.thrown) {
        demo.thrown = true;
        // 奇数周: 風を読んで逆へ弾き中心へ / 偶数周: 弱く弾いて外周に落ちる
        var good = demo.n % 2 === 1;
        var sp = good ? IDEAL_SPEED : IDEAL_SPEED - 1500;
        var aimOff = (boardX - dart.x) - wind * 150 + (good ? 0 : 60);
        var rise = DART_HOME_Y - BOARD_Y;
        launch(aimOff / rise * sp, -sp);
      }
    }
  }

  // ── drawing ───────────────────────────────────────────────────────
  function drawBackdrop() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, C.sky], [0.16, '#cbe6ef'], [0.17, C.wood2], [1, C.wood3]]);
    // 窓の外の雲(ゆっくり流れる)
    game.draw.sprite(CLOUD, { w: '#ffffff' }, ((t * 30) % (W + 200)) - 100, H * 0.05, 14, { alpha: 0.8 });
    game.draw.sprite(CLOUD, { w: '#ffffff' }, ((t * 18 + 500) % (W + 200)) - 100, H * 0.1, 10, { alpha: 0.7 });
    // 木目の板壁(横ストリップ)
    for (var y = H * 0.17; y < H; y += 64) {
      game.draw.rect(0, y, W, 3, C.wood3, 0.6);
      game.draw.rect(0, y + 20, W, 2, C.wood1, 0.35);
    }
    for (var gx = 70; gx < W; gx += 250) game.draw.rect(gx, H * 0.17, 3, H, C.wood3, 0.25);
    // 環境光の呼吸
    game.draw.rect(0, 0, W, H, '#fff2cc', 0.03 + 0.03 * Math.sin(t * 1.4));
    // 床の棚(親指ゾーン)
    game.draw.gradient(H * 0.76, H, [[0, '#8a5f3c'], [1, '#3a2312']]);
    game.draw.rect(0, H * 0.76, W, 8, C.brassLite, 0.5);
  }

  function drawBoard() {
    var t = game.time.elapsed;
    // 吊り金具
    game.draw.line(boardX, H * 0.17, boardX, BOARD_Y - BOARD_R - 10, C.brass, 6);
    game.draw.circle(boardX + 8, BOARD_Y + 10, BOARD_R + 26, '#1a0f06', 0.35);
    game.draw.circle(boardX, BOARD_Y, BOARD_R + 22, C.brass);
    game.draw.circle(boardX, BOARD_Y, BOARD_R + 12, C.brassLite, 0.6);
    var cols = [C.felt, C.cream, C.feltDark, C.red];
    for (var i = RINGS.length - 1; i >= 0; i--) {
      game.draw.circle(boardX, BOARD_Y, RINGS[i][0], cols[i]);
    }
    game.draw.circle(boardX, BOARD_Y, RINGS[0][0], left === 1 && state === S.PLAYING && Math.floor(t * 6) % 2 ? C.gold : C.red);
    // 光沢
    game.draw.circle(boardX - 70, BOARD_Y - 80, 60, '#ffffff', 0.12);
    for (var s = 0; s < stuck.length; s++) {
      game.draw.sprite(DART_SMALL, DART_PAL, boardX + stuck[s].rx, BOARD_Y + stuck[s].ry, 7, { anchor: 'center' });
    }
  }

  function drawPennant() {
    var t = game.time.elapsed;
    var fr = PENNANT[Math.floor(t * 8) % 3];
    var px = W * 0.86, py = H * 0.2;
    game.draw.line(px, py - 20, px, py + 170, C.brass, 6);
    var flip = wind < 0;
    var scale = 10 + Math.abs(wind) * 6;
    game.draw.sprite(fr, { p: C.red }, flip ? px - scale * 5 : px, py, scale, { flipX: flip });
    // 次の風の予告(小さな吹き流し)
    game.draw.sprite(PENNANT[0], { p: C.cream }, flip ? px - 60 : px + 10, py + 110, 5, { flipX: windNext < 0, alpha: 0.6 });
  }

  function drawDart() {
    if (dart.fly) {
      var k = Math.min(1, dart.t / 0.34);
      var x = dart.sx + (dart.tx - dart.sx) * k;
      var y = dart.sy + (dart.ty - dart.sy) * k - Math.sin(k * Math.PI) * 60;
      game.draw.circle(x, y + 40 + 60 * (1 - k), 18 * (1 - k * 0.6), '#000000', 0.2);
      game.draw.sprite(DART, DART_PAL, x, y, 16 - 9 * k, { anchor: 'center' });
    } else if (state !== S.RESULT && phase !== 'outro') {
      var wob = dart.wob > 0 ? Math.sin(game.time.elapsed * 40) * 12 * dart.wob : 0;
      var bob = Math.sin(game.time.elapsed * 3) * 6;
      if (grab) game.draw.circle(dart.x, dart.y, 90, C.gold, armed ? 0.35 : 0.15);
      game.draw.sprite(DART, DART_PAL, dart.x + wob, dart.y + bob, 16, { anchor: 'center' });
    }
  }

  function drawApprentice() {
    var t = game.time.elapsed;
    var fr = APPRENTICE[Math.floor(t * 2.5) % 2];
    game.draw.sprite(fr, APP_PAL, W * 0.12, H * 0.8 + Math.sin(t * 2.2) * 8, 16, {});
  }

  function drawHud() {
    txt('SCORE', 60, 70, 30, C.cream, 'left');
    txt(String(score), 60, 130, 60, C.gold, 'left');
    txt(score + ' / ' + NEEDED, W / 2, 110, 40, C.white);
    for (var i = 0; i < DARTS; i++) {
      game.draw.sprite(DART_SMALL, DART_PAL, W - 90 - i * 50, 90, 8, { anchor: 'center', alpha: i < left ? 1 : 0.2 });
    }
    var frac = Math.max(0, timeLeft / TIME_LIMIT);
    game.draw.rect(60, 180, W - 120, 18, '#2a1a0e', 0.7);
    game.draw.rect(60, 180, (W - 120) * frac, 18, timeLeft < 4 && Math.floor(game.time.elapsed * 6) % 2 ? C.bad : C.brassLite);
  }

  function drawHighlight(dt) {
    if (!highlight) return;
    highlight.t -= dt;
    var a = Math.max(0, highlight.t / 0.5);
    game.draw.circle(highlight.x, highlight.y, (highlight.big ? BOARD_R + 40 : 60) * (1.4 - a * 0.4), highlight.bad ? C.bad : '#ffffff', a * 0.5);
    if (highlight.t <= 0) highlight = null;
  }

  // ── main loop ─────────────────────────────────────────────────────
  game.onUpdate(function(dt) {
    var t = game.time.elapsed;
    if (dart.wob > 0) dart.wob -= dt;

    if (state === S.ATTRACT) {
      if (phase === undefined) initGame();
      swayT += dt;
      boardX = W / 2 + Math.sin(swayT * 1.2) * 70;
      stepDemo(dt);
      if (dart.fly) { dart.t += dt; if (dart.t >= 0.34) landDart(true); }
      drawBackdrop(); drawPennant(); drawBoard(); drawApprentice(); drawDart();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 14 });
      txt(GAME_TITLE, W / 2, H * 0.1 + Math.sin(t * 2) * 6, 64, C.gold);
      txt('HI-SCORE ' + game.best, W / 2, H * 0.6, 36, C.cream);
      if (Math.floor(t * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.93, 44, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.93, 36, C.cream);
      return;
    }

    if (state === S.RESULT) {
      drawBackdrop(); drawBoard(); drawApprentice();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.62, 90, ok ? C.gold : C.bad);
      if (Math.floor(t * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.93, 40, C.cream);
      return;
    }

    // PLAYING
    if (phase === 'ready') {
      ready -= dt;
      if (ready <= 0) { phase = 'aim'; game.audio.play('se_tap', 0.5); }
    } else if (phase === 'aim') {
      if (hitStop > 0) hitStop -= dt;
      else {
        timeLeft -= dt;
        swayT += dt;
        boardX = W / 2 + Math.sin(swayT * (1.1 + (DARTS - left) * 0.18)) * swayAmp;
        if (dart.fly) { dart.t += dt; if (dart.t >= 0.34) landDart(false); }
        if (timeLeft <= 0 && phase === 'aim') { timeLeft = 0; finish(false); }
      }
    } else if (phase === 'stop') {
      hitStop -= dt;
      if (hitStop <= 0) { phase = 'outro'; outro = 1.5; }
    } else if (phase === 'outro') {
      outro -= dt;
      if (outro <= 0) {
        state = S.RESULT;
        var stats = { score: score, bulls: bulls, hits: hits };
        if (ok) game.end.success(score, stats);
        else game.end.failure(stats);
        return;
      }
    }

    drawBackdrop(); drawPennant(); drawBoard(); drawApprentice(); drawDart(); drawHighlight(dt);
    drawHud();
    if (phase === 'ready') txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.62, 90, C.gold);
    if (phase === 'outro') {
      game.draw.rect(0, H * 0.55, W, H * 0.2, '#1a0f06', 0.6);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.6, 96, ok ? C.gold : C.bad);
      txt('SCORE ' + score, W / 2, H * 0.67, 44, C.cream);
      if (ok && score > game.best) txt('NEW RECORD', W / 2, H * 0.72, 40, C.gold);
      else if (!ok && NEEDED - score > 0) txt('あと' + (NEEDED - score) + '点!', W / 2, H * 0.72, 40, C.cream);
      else txt('BEST ' + game.best, W / 2, H * 0.72, 36, C.cream);
    }
  });

  game.onStart(function() {
    game.audio.melody([
      ['E4', 0.5], ['G4', 0.5], ['A4', 1], ['G4', 0.5], ['E4', 0.5], ['D4', 1],
      ['E4', 0.5], ['A4', 0.5], ['B4', 0.5], ['A4', 0.5], ['G4', 1.5], ['R', 0.5]
    ], { tempo: 116, wave: 'triangle', volume: 0.06, loop: true, bass: [['A2', 2], ['E2', 2], ['A2', 2], ['E2', 2]] });
    state = S.ATTRACT;
    initGame();
  });
})(game);
