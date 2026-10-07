// I-GBA-0027v2-paddy-tadpole-chase.js
// たんぼのオタマ追い — 水田を逃げ回るオタマジャクシを、網を次々打ち込んで追い詰めてすくう
// 操作: 水面をタップするとそこへ小網が落ちる。近くに落ちると逃げて疲れ、真上に落ちればすくえる
// 終わり: 20秒以内に5匹すくえば成功。時間切れで失敗
// @mechanic: chase
// @theme: rice_paddy_tadpole_chase
// 世界観: 田植え前の水田で、生き物観察の子どもが小さな網を次々打ち込み、すばしこいオタマジャクシを畦の角へ追い込んで一匹ずつすくう
// 残るもの: 正誤(CLEAR/GAME OVER) + すくった匹数と打った網の数
// スタイル: 90s 16bit

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s 16bit: 高彩度・多色、2〜3層の背景で奥行き
  var STYLE = { bg: ['#5ec8f2', '#7a5a34', '#3f8fb0'], main: ['#2b2b3a', '#6a4a8c', '#f2d25e'], accent: ['#ff5e7a', '#6bff8e'] };
  var P = {
    sky: STYLE.bg[0], mud: STYLE.bg[1], water: STYLE.bg[2], waterHi: '#9fe3ff',
    tad: STYLE.main[0], tadBelly: STYLE.main[1], gold: STYLE.main[2],
    red: STYLE.accent[0], green: STYLE.accent[1], ridge: '#5b8f3a', ridgeDark: '#3e6a2a', ink: '#141420', white: '#ffffff',
  };

  var GAME_TITLE = 'PADDY CHASE';
  var TIME_LIMIT = 20;
  var NEEDED = 5;
  var FIELD = { x0: 70, y0: Math.round(H * 0.17), x1: W - 70, y1: Math.round(H * 0.7) };
  var CATCH_R = 92;
  var SCARE_R = 320;
  var NET_DROP = 0.12;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var mode = S.ATTRACT;
  var success = false;

  var tad, nets, rings, caught, casts, remain, intro, pauseT, finished, leaveT, lastRing, fever;

  function print(str, x, y, sz, color) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: P.ink, bold: true, align: 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: 'center' });
  }

  var TAD_A = ['...kkk....', '..kkkkk...', 'kkkbbkkkk.', '..kkkkk.kk', '...kkk....'];
  var TAD_B = ['...kkk....', '..kkkkk.kk', 'kkkbbkkkk.', '..kkkkk...', '...kkk....'];
  var TAD_LEG = ['...kkk....', '..kkkkk.kk', 'kkkbbkkkk.', '..kkkkk...', '..k.k.....'];
  var KID_A = [
    '...yyyy...',
    '..yyyyyy..',
    '...ssss...',
    '...s.ss...',
    '..rrrrrr..',
    '.rrrrrrrs.',
    '..rrrrrr..',
    '..bb..bb..',
    '..bb..bb..',
    '.gg....gg.',
  ];
  var KID_B = [
    '...yyyy...',
    '..yyyyyy..',
    '...ssss...',
    '...ss.s...',
    '..rrrrrr..',
    's.rrrrrrr.',
    '..rrrrrr..',
    '..bb..bb..',
    '.bb....bb.',
    'gg......gg',
  ];
  var KID_PAL = { y: '#ffd84a', s: '#ffc896', r: '#ff5e7a', b: '#3a5ad8', g: '#2b2b3a' };
  var FROG = ['.g..g.', 'gggggg', 'gwggwg', 'gggggg', 'g.gg.g'];

  function newTad() {
    var legged = caught === 2 || caught === 4;
    tad = {
      x: game.random(FIELD.x0 + 200, FIELD.x1 - 200), y: game.random(FIELD.y0 + 220, FIELD.y1 - 220),
      vx: 0, vy: 0, head: game.random(0, 6.28), stamina: 3, dart: 0, legged: legged, flash: 0,
    };
  }

  function initGame() {
    nets = []; rings = []; caught = 0; casts = 0; remain = TIME_LIMIT; intro = 0.8;
    pauseT = 0; finished = false; leaveT = 0; lastRing = null; fever = 0; success = false;
    newTad();
  }

  function cruise() { return 150 + caught * 38 + (tad.legged ? 60 : 0); }

  // 逃げる本体の動き(本番もデモも同じ)
  function moveTad(dt) {
    var t = game.time.elapsed;
    if (tad.dart > 0) {
      tad.dart -= dt;
      tad.vx *= Math.pow(0.18, dt); tad.vy *= Math.pow(0.18, dt);
    } else {
      tad.head += Math.sin(t * 1.7 + tad.x * 0.01) * 2.4 * dt;
      var sp = cruise() * (0.5 + 0.5 * tad.stamina / 3);
      tad.vx += (Math.cos(tad.head) * sp - tad.vx) * 3 * dt;
      tad.vy += (Math.sin(tad.head) * sp - tad.vy) * 3 * dt;
    }
    tad.x += tad.vx * dt; tad.y += tad.vy * dt;
    if (tad.x < FIELD.x0 + 50) { tad.x = FIELD.x0 + 50; tad.vx = Math.abs(tad.vx) * 0.4; tad.head = 0; }
    if (tad.x > FIELD.x1 - 50) { tad.x = FIELD.x1 - 50; tad.vx = -Math.abs(tad.vx) * 0.4; tad.head = 3.14; }
    if (tad.y < FIELD.y0 + 50) { tad.y = FIELD.y0 + 50; tad.vy = Math.abs(tad.vy) * 0.4; tad.head = 1.57; }
    if (tad.y > FIELD.y1 - 50) { tad.y = FIELD.y1 - 50; tad.vy = -Math.abs(tad.vy) * 0.4; tad.head = -1.57; }
    if (tad.flash > 0) tad.flash -= dt;
  }

  function castNet(x, y) {
    x = Math.max(FIELD.x0, Math.min(FIELD.x1, x));
    y = Math.max(FIELD.y0, Math.min(FIELD.y1, y));
    nets.push({ x: x, y: y, t: NET_DROP });
    game.audio.play('se_jump', 0.2);
  }

  // 網の着水判定。戻り値: 'catch' | 'scare' | 'far'
  function landNet(n) {
    var d = Math.hypot(tad.x - n.x, tad.y - n.y);
    var res;
    if (d < CATCH_R) res = 'catch';
    else if (d < SCARE_R) {
      res = 'scare';
      var ax = (tad.x - n.x) / d, ay = (tad.y - n.y) / d;
      var power = 380 + 520 * (tad.stamina / 3) + caught * 40;
      tad.vx = ax * power; tad.vy = ay * power; tad.dart = 0.45; tad.head = Math.atan2(ay, ax);
      tad.stamina = Math.max(0, tad.stamina - 1);
      tad.flash = 0.2;
    } else res = 'far';
    rings.push({ x: n.x, y: n.y, t: 0, col: res === 'catch' ? P.green : (res === 'scare' ? P.gold : P.red) });
    lastRing = d;
    return res;
  }

  function stepNets(dt, onLand) {
    for (var i = nets.length - 1; i >= 0; i--) {
      nets[i].t -= dt;
      if (nets[i].t <= 0) { var n = nets[i]; nets.splice(i, 1); onLand(n, landNet(n)); }
    }
    for (var r = rings.length - 1; r >= 0; r--) { rings[r].t += dt; if (rings[r].t > 0.7) rings.splice(r, 1); }
  }

  function playLand(n, res) {
    if (finished) return;
    if (res === 'catch') {
      caught++;
      var pts = tad.legged ? 'PERFECT' : 'GOOD';
      game.feedback.good(n.x, n.y, { text: pts, color: P.green });
      game.audio.play('se_coin', 0.35);
      if (caught === 3) {
        game.fx.popup('NICE', W / 2, H * 0.3, { color: P.gold, size: 64 });
        game.audio.play('se_milestone', 0.45);
      }
      if (caught >= NEEDED) {
        success = true; finished = true; pauseT = 0.4; leaveT = 1.4;
        game.fx.burst(n.x, n.y, { color: P.gold, count: 28, speed: 460 });
        game.audio.stopBgm();
        game.audio.play('se_success', 0.5);
        return;
      }
      newTad();
    } else if (res === 'scare') {
      game.audio.tone('E5', 0.08, { wave: 'square', volume: 0.08, slide: 300 });
      game.fx.burst(tad.x, tad.y, { color: P.waterHi, count: 6, speed: 200 });
    } else {
      game.feedback.bad(n.x, n.y, { text: 'MISS', color: P.red, size: 36, count: 4 });
    }
  }

  game.onTap(function(x, y) {
    if (mode === S.ATTRACT) { game.audio.play('se_coin'); mode = S.PLAYING; initGame(); return; }
    if (mode === S.RESULT) { mode = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (finished) return;
    if (intro > 0) { game.audio.play('se_tap', 0.1); return; }
    game.audio.play('se_tap', 0.15);
    casts++;
    castNet(x, y);
  });

  // ---- 描画 ----
  function paddy() {
    var t = game.time.elapsed;
    game.draw.gradient(0, FIELD.y0, [[0, '#3aa0e0'], [1, P.sky]]);
    for (var m = 0; m < 5; m++) {
      var mx = ((m * 300 - t * 12) % (W + 300)) - 150;
      game.draw.circle(mx + 150, FIELD.y0 + 30, 160, '#4f9a5a');
    }
    game.draw.rect(0, FIELD.y0 - 40, W, 50, P.ridge);
    game.draw.gradient(FIELD.y0, FIELD.y1, [[0, P.water], [0.6, '#5aa5b8'], [1, P.mud]]);
    for (var c = 0; c < 4; c++) {
      var cx = ((c * 330 + t * 25) % (W + 400)) - 200;
      game.draw.rect(cx, FIELD.y0 + 120 + c * 190, 260, 22, P.waterHi, 0.35);
      game.draw.rect(cx + 40, FIELD.y0 + 142 + c * 190, 180, 12, P.waterHi, 0.25);
    }
    for (var k = 0; k < 8; k++) game.draw.circle(130 + k * 120, FIELD.y1 - 40 - (k % 3) * 30, 18, '#6a4a2a', 0.5);
    game.draw.rect(0, FIELD.y0, FIELD.x0, FIELD.y1 - FIELD.y0, P.ridge);
    game.draw.rect(FIELD.x1, FIELD.y0, W - FIELD.x1, FIELD.y1 - FIELD.y0, P.ridge);
    game.draw.rect(FIELD.x0 - 10, FIELD.y0, 10, FIELD.y1 - FIELD.y0, P.ridgeDark);
    game.draw.rect(FIELD.x1, FIELD.y0, 10, FIELD.y1 - FIELD.y0, P.ridgeDark);
    game.draw.gradient(FIELD.y1, H, [[0, P.ridge], [0.3, '#7ab04a'], [1, '#4a7a30']]);
    game.draw.sprite(FROG, { g: '#3ec24a', w: '#ffffff' }, W - 150, FIELD.y1 + 60 + Math.abs(Math.sin(t * 2)) * -20, 10, { anchor: 'center' });
  }

  function drawTad() {
    var t = game.time.elapsed;
    var fr = tad.legged ? TAD_LEG : (Math.floor(t * (tad.dart > 0 ? 18 : 8)) % 2 === 0 ? TAD_A : TAD_B);
    var col = tad.flash > 0 ? P.white : P.tad;
    game.draw.circle(tad.x + 8, tad.y + 16, 34, '#1a3a4a', 0.3);
    game.draw.sprite(fr, { k: col, b: P.tadBelly }, tad.x, tad.y, tad.legged ? 16 : 13, { anchor: 'center', flipX: tad.vx > 0 });
    if (tad.dart > 0) game.draw.circle(tad.x - tad.vx * 0.05, tad.y - tad.vy * 0.05, 16, P.waterHi, 0.5);
    for (var s = 0; s < tad.stamina; s++) game.draw.circle(tad.x - 20 + s * 20, tad.y - 50, 6, P.gold, 0.8);
  }

  function drawNets() {
    for (var i = 0; i < nets.length; i++) {
      var n = nets[i], k = n.t / NET_DROP;
      game.draw.circle(n.x, n.y, 70, '#0a2a3a', 0.25 * (1 - k));
      game.draw.circle(n.x, n.y - k * 120, 70 + k * 30, P.white, 0.35);
      game.draw.line(n.x, n.y - k * 120, n.x + 90, n.y - k * 120 + 200, '#c08a3a', 8);
    }
    for (var r = 0; r < rings.length; r++) {
      var g = rings[r];
      game.draw.circle(g.x, g.y, 40 + g.t * 220, g.col, Math.max(0, 0.45 - g.t * 0.6));
    }
  }

  function drawKid(active) {
    var fr = (active || Math.floor(game.time.elapsed * 3) % 2 === 0) ? KID_B : KID_A;
    game.draw.sprite(fr, KID_PAL, W * 0.22, H * 0.85 + Math.sin(game.time.elapsed * 4) * 5, 16, { anchor: 'center' });
    game.draw.circle(W * 0.5, H * 0.86, 70, '#e8f4ff', 0.9);
    game.draw.circle(W * 0.5, H * 0.86, 56, P.water, 0.7);
    for (var i = 0; i < NEEDED; i++) {
      var hx = W * 0.62 + i * 70;
      game.draw.sprite(TAD_A, { k: i < caught ? P.tad : '#6a8a6a', b: i < caught ? P.tadBelly : '#6a8a6a' }, hx, H * 0.86, 5, { anchor: 'center' });
    }
  }

  function drawHud() {
    print(caught + ' / ' + NEEDED, W / 2, 70, 46, P.white);
    game.draw.rect(80, 140, W - 160, 22, P.ink, 0.5);
    var low = remain < 5 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(84, 144, (W - 168) * Math.max(0, remain / TIME_LIMIT), 14, low ? P.red : P.gold);
    if (lastRing !== null) {
      var near = Math.max(0, 1 - lastRing / (SCARE_R * 1.6));
      game.draw.rect(W / 2 - 150, 186, 300, 16, P.ink, 0.5);
      game.draw.rect(W / 2 - 150, 186, 300 * near, 16, near > 0.7 ? P.green : (near > 0.35 ? P.gold : P.red));
    }
  }

  // ---- ATTRACT: 本物の着水判定で「外す→追い込む→すくう」を実演 ----
  var demo = { t: 0, gx: W / 2, gy: H * 0.5, press: false, step: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.6;
    if (cyc < dt || demo.t <= dt) {
      initGame(); intro = 0; demo.step = 0;
      tad.x = W * 0.5; tad.y = H * 0.42; tad.stamina = 3;
    }
    moveTad(dt);
    var plan = [0.6, 1.3, 2.05];
    var offs = [210, 150, 0];
    demo.gx = tad.x + (demo.step < 3 ? offs[demo.step] : 0);
    demo.gy = tad.y + 30;
    demo.press = false;
    if (demo.step < 3 && cyc >= plan[demo.step]) {
      var lead = 0.12;
      castNet(tad.x + tad.vx * lead + offs[demo.step], tad.y + tad.vy * lead);
      demo.step++; demo.press = true;
    }
    stepNets(dt, function(n, res) {
      if (res === 'catch') {
        game.fx.burst(n.x, n.y, { color: P.green, count: 14, speed: 300 });
        game.audio.play('se_coin', 0.2);
        tad.x = W * 0.3; tad.y = H * 0.3; tad.stamina = 3; tad.vx = 0; tad.vy = 0;
      } else {
        game.audio.tone('E5', 0.06, { wave: 'square', volume: 0.04, slide: 300 });
      }
    });
  }

  game.onUpdate(function(dt) {
    if (mode === S.ATTRACT) {
      stepDemo(dt);
      paddy();
      drawNets();
      drawTad();
      drawKid(demo.press);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 14 });
      print(GAME_TITLE, W / 2, 80, 70, P.gold);
      print('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, 160, 34, P.white);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) print('► 100円 投入 ◄', W / 2, H * 0.95, 44, P.gold);
      else print('INSERT COIN', W / 2, H * 0.95, 34, P.white);
      return;
    }

    if (mode === S.RESULT) {
      paddy();
      drawTad();
      drawKid(false);
      var sc = caught * 100 + (success ? Math.round(remain * 20) : 0);
      print(success ? 'CLEAR' : 'TIME UP', W / 2, 110, 84, success ? P.green : P.red);
      print('SCORE ' + sc, W / 2, 210, 44, P.white);
      print(caught + ' / ' + casts, W / 2, 275, 36, P.gold);
      if (success && sc >= game.best) print('NEW RECORD', W / 2, 345, 44, P.gold);
      else print('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, 345, 32, P.white);
      if (!success) print('あと' + (NEEDED - caught) + '匹!', W / 2, 420, 46, P.gold);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) print('TAP TO CONTINUE', W / 2, H * 0.95, 34, P.white);
      return;
    }

    if (finished) {
      if (pauseT > 0) pauseT -= dt;
      else {
        leaveT -= dt;
        if (leaveT <= 0) {
          mode = S.RESULT;
          var score = caught * 100 + (success ? Math.round(remain * 20) : 0);
          if (success) game.end.success(score, { caught: caught, casts: casts });
          else game.end.failure({ caught: caught, casts: casts });
        }
      }
    } else if (intro > 0) {
      intro -= dt;
      if (intro <= 0) game.audio.play('se_tap', 0.3);
    } else {
      remain -= dt;
      moveTad(dt);
      stepNets(dt, playLand);
      if (!finished && remain <= 0) {
        remain = 0; finished = true; success = false; pauseT = 0.5; leaveT = 1.3;
        tad.flash = 0.5;
        game.feedback.bad(tad.x, tad.y, { text: 'TIME UP', color: P.red });
        game.audio.stopBgm();
        game.audio.play('se_failure', 0.5);
      }
    }

    paddy();
    drawNets();
    drawTad();
    if (finished && pauseT > 0) game.draw.circle(tad.x, tad.y, 90 + (0.5 - pauseT) * 60, P.white, 0.45);
    drawKid(nets.length > 0);
    drawHud();
    if (intro > 0) print(intro > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.42, 90, P.gold);
  });

  game.onStart(function() {
    game.audio.melody([
      ['C5', 0.5], ['E5', 0.5], ['G5', 0.5], ['E5', 0.5], ['F5', 0.5], ['D5', 0.5], ['B4', 1],
      ['C5', 0.5], ['G4', 0.5], ['A4', 0.5], ['B4', 0.5], ['C5', 1], [null, 1],
    ], { tempo: 168, wave: 'square', volume: 0.04, loop: true, bass: [['C3', 2], ['G2', 2], ['F2', 2], ['G2', 2]] });
    mode = S.ATTRACT;
    initGame();
  });
})(game);
