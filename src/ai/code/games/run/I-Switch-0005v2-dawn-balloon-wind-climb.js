// I-Switch-0005v2-dawn-balloon-wind-climb.js
// 朝焼けの風の層のぼり — 押している間だけバーナーが燃えて気球が昇る。高さごとに向きの違う風の層を選んで横へ流され、張り出す枝の空いている側へ回り込んでから昇り抜ける
// 操作: 押している間はバーナーが燃えて熱がたまり昇る(熱は遅れてたまり、離すとゆっくり冷めて沈む)。左右の操作はなく、いる高さの風の層(綿毛の流れる向き)に流される。枝の真下の層で熱を加減して浮かび、空いている側まで流されてから昇る
// 終わり: 7本の枝を越えて朝日の雲の上に25秒以内に出ればCLEAR。枝に3回引っ掛かる/時間切れでGAME OVER
// @mechanic: camera_climb
// @theme: dawn_balloon_wind_layers
// 世界観: 朝焼けの熱気球大会で、見習いの気球乗りがバーナーの火力を加減して高さごとに向きの違う風の層を乗り継ぎ、谷の大杉から張り出す枝の空いた側へ回り込みながら朝日の雲の上まで昇っていく
// 残るもの: 正誤(CLEAR/GAME OVER) + 越えた枝の数・引っ掛からずに越えた数・残り時間のスコア
// スタイル: PIXEL HD

(function (game) {
  var W = game.canvas.width, H = game.canvas.height;
  // PIXEL HD: パララックス3層以上、光源は右下の朝日1つ、細かいアニメ
  var STYLE = { bg: ['#2b1d4a', '#8a3f6a', '#ff9a5a', '#ffd59a'], main: ['#e84a4a', '#f4e4c8', '#2f5a3a'], accent: ['#ffd23a', '#5ad0ff'] };
  var SHADE = '#1a1030';

  var BRANCHES = 7, SECTION = 540, LAYER = 300, SNAGS = 3, TIME_LIMIT = 25;
  var REACH_FRAC = 0.58, DRIFT = 420;
  var TOP_Y = -(BRANCHES * SECTION + 360);

  var mode = 'ATTRACT';
  var b = null;

  var ENV_A = [
    '....rrrr....',
    '..rrwwrrrr..',
    '.rrrwwrrrrr.',
    'rrrrwwrrrrhr',
    'rrrrwwrrrrhr',
    'rrrrwwrrrrrr',
    '.rrrwwrrrrr.',
    '.rrrwwrrrrr.',
    '..rrwwrrrr..',
    '...rrrrrr...',
    '....l..l....',
    '....l..l....',
  ];
  var ENV_HL = { r: '#ffffff', w: '#ffffff', h: '#ffffff', l: '#ffffff' };
  var ENV_PAL = { r: STYLE.main[0], w: STYLE.main[1], h: '#ffb0a0', l: '#5a3a2a' };
  var BASKET_A = ['.ffff.', '.fefe.', 'bbbbbb', 'bkbkbk', 'bbbbbb'];
  var BASKET_B = ['.ffff.', 'afefea', 'bbbbbb', 'bkbkbk', 'bbbbbb'];
  var BASKET_PAL = { f: '#f0c8a0', e: SHADE, a: '#f0c8a0', b: '#a0703a', k: '#6a4420' };
  var FLAME = [['.y.', 'yoy', '.o.'], ['y.y', '.o.', 'yoy'], ['.o.', 'yyy', '.y.']];

  function freshFlight() {
    var br = [];
    for (var k = 0; k < BRANCHES; k++) {
      var left = k % 2 === 0;
      if (k === 4) left = !left;
      if (k === 5) left = !left;
      br.push({ y: -(k + 1) * SECTION, left: left, passed: false, snagged: false, hitT: 0 });
    }
    return {
      phase: 'ready', readyT: 0.8, clock: TIME_LIMIT,
      x: W * 0.5, y: 0, vx: 0, vy: 0, heat: 0, burning: false,
      branches: br, cam: -H * 0.62, snags: 0, clean: 0, passed: 0, score: 0,
      stopT: 0, pauseT: 0, won: false, culprit: null, prevBest: 0, partyT: 0, fluffT: 0,
    };
  }

  // 高さ → 風向き(-1 左 / +1 右)。各枝の真下の層は空いている側へ吹き、その下の層は逆へ吹く
  function windAt(y) {
    for (var k = 0; k < b.branches.length; k++) {
      var br = b.branches[k];
      var openDir = br.left ? 1 : -1;
      if (y <= br.y + LAYER && y > br.y - 40) return openDir;
      if (y <= br.y + SECTION && y > br.y + LAYER) return -openDir;
    }
    return y < TOP_Y + 200 ? 0 : 1;
  }

  function branchSpan(br) {
    var len = W * REACH_FRAC;
    return br.left ? { x0: 0, x1: len } : { x0: W - len, x1: W };
  }

  function envCenter() { return { x: b.x, y: b.y - 150 }; }

  function collide(br) {
    var sp = branchSpan(br);
    var ec = envCenter();
    var cx = Math.max(sp.x0, Math.min(sp.x1, ec.x)), cy = Math.max(br.y - 20, Math.min(br.y + 20, ec.y));
    if (Math.hypot(ec.x - cx, ec.y - cy) < 88) return true;
    // かご
    return b.x + 36 > sp.x0 && b.x - 36 < sp.x1 && b.y > br.y - 20 && b.y - 50 < br.y + 20;
  }

  function snag(br) {
    b.snags++;
    br.snagged = true; br.hitT = 0.5;
    b.vy = 260; b.heat = 0.15; b.y += 110;
    game.audio.play('se_break', 0.35);
    if (b.snags >= SNAGS) { b.phase = 'stop'; b.stopT = 0.5; b.won = false; b.culprit = br; game.fx.flash('#ffffff', 0.12); return; }
    b.pauseT = 0.32; b.culprit = br;
    game.fx.flash('#ffffff', 0.1);
  }

  function advance(dt) {
    b.clock -= dt;
    if (b.burning) b.heat = Math.min(1, b.heat + 2.2 * dt); else b.heat = Math.max(0, b.heat - 1.6 * dt);
    var vt = -(b.heat - 0.4) * 720;
    b.vy += (vt - b.vy) * Math.min(1, dt * 4);
    b.y += b.vy * dt;
    if (b.y > 0) { b.y = 0; if (b.vy > 0) b.vy = 0; }
    var wv = windAt(b.y - 150) * DRIFT;
    b.vx += (wv - b.vx) * Math.min(1, dt * 2.6);
    b.x += b.vx * dt;
    b.x = Math.max(120, Math.min(W - 120, b.x));
    for (var k = 0; k < b.branches.length; k++) {
      var br = b.branches[k];
      if (br.hitT > 0) br.hitT -= dt;
      if (!br.passed && b.y < br.y - 40) {
        br.passed = true; b.passed++;
        if (!br.snagged) { b.clean++; b.score += 200; game.feedback.good(b.x, br.y - b.cam - 60, { text: 'NICE', color: STYLE.accent[0], size: 46 }); }
        else { b.score += 60; game.audio.play('se_good', 0.3); }
        if (b.passed === 4) { game.fx.popup('4 / ' + BRANCHES, W / 2, H * 0.2, { color: '#ffffff', size: 60 }); game.audio.play('se_milestone', 0.45); }
      }
      if (!br.passed && br.hitT <= 0 && Math.abs(b.y - br.y) < 260 && collide(br)) { snag(br); if (b.phase !== 'run') return; break; }
    }
    if (b.y < TOP_Y) { b.phase = 'stop'; b.stopT = 0.55; b.won = true; b.score += Math.round(b.clock) * 25; return; }
    var target = b.y - H * 0.6;
    b.cam += (target - b.cam) * Math.min(1, dt * 4);
    if (b.clock <= 0) {
      b.clock = 0; b.phase = 'stop'; b.stopT = 0.5; b.won = false;
      for (var j = 0; j < b.branches.length; j++) if (!b.branches[j].passed) { b.culprit = b.branches[j]; break; }
      game.fx.flash('#ffffff', 0.12);
    }
  }

  function settle() {
    b.prevBest = game.best;
    var stats = { passed: b.passed, branches: BRANCHES, clean: b.clean, snags: b.snags };
    if (b.won) {
      game.feedback.good(b.x, b.y - 160 - b.cam, { text: 'CLEAR', color: STYLE.accent[0], size: 72 });
      game.audio.play('se_success', 0.6);
      game.end.success(b.score, stats);
    } else {
      var cy = b.culprit ? b.culprit.y - b.cam : H * 0.5;
      var sp = b.culprit ? branchSpan(b.culprit) : { x0: W * 0.3, x1: W * 0.7 };
      game.feedback.bad((sp.x0 + sp.x1) / 2, cy, { text: 'MISS', size: 60 });
      game.audio.play('se_failure', 0.6);
      game.end.failure(stats);
    }
    mode = 'RESULT';
  }

  // ── 描画 ───────────────────────────────────────────
  function drawSky() {
    var t = game.time.elapsed;
    var alt = Math.min(1, -b.y / -TOP_Y);
    game.draw.gradient(0, H, [[0, STYLE.bg[0]], [0.35 - alt * 0.2, STYLE.bg[1]], [0.75 - alt * 0.25, STYLE.bg[2]], [1, STYLE.bg[3]]]);
    // 朝日(光源)
    game.draw.circle(W * 0.82, H * 0.9 - alt * 500, 220, '#ffe0a0', 0.12);
    game.draw.circle(W * 0.82, H * 0.9 - alt * 500, 120, '#fff0c8', 0.35);
    // 遠景の山並み(パララックス 0.15)
    var my = H * 0.78 - b.cam * 0.15 - H * 0.1;
    for (var i = 0; i < 7; i++) game.draw.circle(i * 180 + 40, my + (i % 2) * 40, 220, '#4a2e5a', 0.85);
    // 中景: 他の参加気球(パララックス 0.4)
    for (var k = 0; k < 5; k++) {
      var bx = ((k * 260 + t * (12 + k * 4)) % (W + 200)) - 100;
      var by = ((k * 700 - b.cam * 0.4) % 1800 + 1800) % 1800 - 100;
      game.draw.circle(bx, by, 34, ['#5ad0ff', '#ffd23a', '#9a6aff', '#5aff9a', '#ff7ab0'][k], 0.35);
      game.draw.rect(bx - 8, by + 38, 16, 12, '#3a2a3a', 0.35);
    }
  }

  function drawWind() {
    var t = game.time.elapsed;
    for (var sy = -40; sy < H + 40; sy += 52) {
      var wy = sy + b.cam;
      var d = windAt(wy);
      if (d === 0) continue;
      var off = ((t * DRIFT * d * 0.9) % 180 + 180) % 180;
      for (var x = -180 + off; x < W + 180; x += 180) {
        var xx = x + ((Math.floor(wy / 52) * 67) % 180);
        game.draw.line(xx, sy, xx + 46 * d, sy, '#ffffff', 3);
        game.draw.circle(xx + 54 * d, sy, 5, '#ffffff', 0.5);
      }
    }
  }

  function drawTrees(hl) {
    var t = game.time.elapsed;
    // 谷の両側の大杉(近景)
    game.draw.rect(0, 0, 70, H, '#2a2a1a');
    game.draw.rect(W - 70, 0, 70, H, '#2a2a1a');
    game.draw.rect(60, 0, 8, H, '#ffb070', 0.25);
    for (var k = 0; k < b.branches.length; k++) {
      var br = b.branches[k];
      var sy = br.y - b.cam;
      if (sy < -120 || sy > H + 120) continue;
      var sp = branchSpan(br);
      var flash = (br.hitT > 0 || (hl && b.culprit === br));
      var col = flash ? '#ffffff' : '#4a3020';
      var th = flash && hl ? 30 : 22;
      game.draw.rect(sp.x0, sy - th, sp.x1 - sp.x0, th * 2, col);
      game.draw.rect(sp.x0, sy - th, sp.x1 - sp.x0, 6, flash ? '#ffffff' : '#7a5030');
      var tip = br.left ? sp.x1 : sp.x0;
      for (var n = 0; n < 6; n++) {
        var lx = br.left ? sp.x1 - n * 95 : sp.x0 + n * 95;
        var sway = Math.sin(t * 2 + n + k) * 5;
        game.draw.circle(lx, sy - 34 + sway, 52 - n * 3, flash ? '#ffffff' : STYLE.main[2]);
        game.draw.circle(lx + 14, sy - 46 + sway, 22, '#ffffff', flash ? 0.6 : 0.1);
      }
      // 枝先のトゲ(危険の記号)
      var dir = br.left ? 1 : -1;
      for (var s2 = -1; s2 <= 1; s2++) game.draw.line(tip, sy + s2 * 14, tip + dir * 34, sy + s2 * 22, flash ? '#ffffff' : '#c83a2a', 6);
      // 空いている側の矢印旗(風の層を読む手がかり)
      var fx = br.left ? W - 70 : 70;
      game.draw.rect(fx - 4, sy + 60, 8, 90, '#2a2a1a');
      game.draw.rect(br.left ? fx - 70 : fx + 4, sy + 64 + Math.sin(t * 7) * 4, 66, 30, STYLE.accent[0]);
    }
    // 雲の上(ゴール)
    var gy = TOP_Y - b.cam;
    if (gy > -200 && gy < H + 200) {
      for (var c = 0; c < 8; c++) game.draw.circle(c * 150 + 20, gy + 40 + Math.sin(t + c) * 8, 110, '#fff4e0', 0.9);
      game.draw.rect(0, gy - 400, W, 420, '#fff4e0', 0.25);
    }
  }

  function drawBalloon(hl) {
    var t = game.time.elapsed;
    var sx = b.x, sy = b.y - b.cam;
    if (b.burning && mode !== 'RESULT') {
      game.draw.circle(sx, sy - 70, 60, '#ffb040', 0.18);
      game.draw.sprite(FLAME[Math.floor(t * 14) % 3], { y: STYLE.accent[0], o: '#ff6a2a' }, sx, sy - 64, 14, { anchor: 'center' });
    }
    var tilt = Math.round(b.vx / 120);
    game.draw.sprite(ENV_A, hl ? ENV_HL : ENV_PAL, sx + tilt * 3, sy - 150, hl ? 19 : 16, { anchor: 'center' });
    game.draw.circle(sx + 42, sy - 190, 26, '#ffffff', 0.18);
    var cheer = mode === 'RESULT' && b.won && Math.floor(t * 4) % 2 === 0;
    game.draw.sprite(cheer ? BASKET_B : BASKET_A, BASKET_PAL, sx, sy - 22, 12, { anchor: 'center' });
    if (mode === 'RESULT' && !b.won) game.draw.circle(sx, sy - 150, 110, SHADE, 0.35);
  }

  function drawPanel() {
    // 親指ゾーン: バーナーのつまみと熱ゲージ
    var t = game.time.elapsed;
    game.draw.rect(0, H * 0.85, W, H * 0.15, SHADE, 0.6);
    game.draw.circle(W / 2, H * 0.925, 96, b.burning ? '#ff8a3a' : '#5a3a5a', b.burning ? 0.9 : 0.55 + 0.15 * Math.sin(t * 5));
    game.draw.sprite(FLAME[Math.floor(t * 10) % 3], { y: STYLE.accent[0], o: '#ff6a2a' }, W / 2, H * 0.925, b.burning ? 22 : 14, { anchor: 'center', alpha: b.burning ? 1 : 0.5 });
    game.draw.rect(W * 0.12, H * 0.9, 150, 26, '#000000', 0.5);
    game.draw.rect(W * 0.12, H * 0.9, 150 * b.heat, 26, b.heat > 0.4 ? '#ff7a3a' : STYLE.accent[1]);
    game.draw.rect(W * 0.12 + 150 * 0.4 - 2, H * 0.9 - 6, 4, 38, '#ffffff');
  }

  function say(s, x, y, size, color) {
    game.draw.text(s, x + 3, y + 4, { size: size, color: SHADE, bold: true, align: 'center' });
    game.draw.text(s, x, y, { size: size, color: color, bold: true, align: 'center' });
  }

  function drawHud() {
    say(b.passed + ' / ' + BRANCHES, 150, 80, 50, '#ffffff');
    say('SCORE ' + b.score, W - 250, 80, 36, STYLE.accent[0]);
    game.draw.rect(80, 140, W - 160, 14, SHADE, 0.6);
    var f = Math.max(0, b.clock / TIME_LIMIT);
    game.draw.rect(80, 140, (W - 160) * f, 14, f < 0.25 ? '#ff5a4a' : '#ffffff');
    for (var s = 0; s < SNAGS; s++) {
      var sx = W / 2 - 60 + s * 60;
      game.draw.rect(sx - 16, 184, 32, 28, s < SNAGS - b.snags ? '#c8a070' : '#3a2a3a');
    }
    game.draw.rect(W - 34, H * 0.25, 12, H * 0.5, SHADE, 0.6);
    var p = Math.min(1, b.y / TOP_Y);
    game.draw.rect(W - 34, H * 0.75 - H * 0.5 * p, 12, H * 0.5 * p, STYLE.accent[0]);
  }

  function drawScene(hl) {
    drawSky();
    drawWind();
    drawTrees(hl);
    drawBalloon(hl && b.won);
    drawPanel();
  }

  // ── ATTRACT(実ロジック+ボット) ───────────────────────
  var demo = { t: 0, hold: false };
  function botDecide(rush) {
    var nx = null;
    for (var k = 0; k < b.branches.length; k++) if (!b.branches[k].passed) { nx = b.branches[k]; break; }
    if (!nx) return true;
    var sp = branchSpan(nx);
    var safe = nx.left ? b.x - 100 > sp.x1 : b.x + 100 < sp.x0;
    if (safe || rush) return true;
    var ec = b.y - 150 - nx.y;
    if (ec > LAYER) return true;
    return ec + b.vy * 0.45 > 200;
  }
  function runDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 6.2;
    if (cyc < dt || demo.t <= dt) { b = freshFlight(); b.phase = 'run'; b.cam = -H * 0.6; }
    if (b.phase === 'run') {
      if (b.pauseT > 0) {
        b.pauseT -= dt;
        if (b.pauseT <= 0) game.feedback.bad(b.x, b.y - 150 - b.cam, { text: 'MISS', size: 48 });
        return;
      }
      demo.hold = botDecide(b.passed >= 1);
      b.burning = demo.hold;
      advance(dt);
    } else if (b.phase === 'stop') b.stopT -= dt;
  }

  function begin() {
    b = freshFlight();
    mode = 'PLAYING';
    game.audio.play('se_coin', 0.5);
  }

  game.onTap(function () {
    if (mode === 'ATTRACT') { begin(); return; }
    if (mode === 'RESULT') { game.audio.play('se_tap', 0.3); mode = 'ATTRACT'; b = freshFlight(); demo.t = 0; return; }
  });
  game.onPress(function () {
    if (mode !== 'PLAYING' || !b || b.phase !== 'run') return;
    game.audio.tone(180, 0.12, { wave: 'sawtooth', volume: 0.05, slide: 120 });
  });
  game.onRelease(function () {
    if (mode !== 'PLAYING' || !b || b.phase !== 'run') return;
    game.audio.tone(240, 0.05, { wave: 'triangle', volume: 0.03 });
  });

  game.onUpdate(function (dt) {
    if (!b) b = freshFlight();
    if (mode === 'ATTRACT') {
      runDemo(dt);
      drawScene(false);
      game.draw.hand(W / 2, H * 0.925, { press: demo.hold, scale: 14 });
      say('DAWN DRIFT', W / 2, H * 0.05 + 30, 84, '#ffffff');
      say('HI-SCORE ' + (game.best > 0 ? game.best : 0), W / 2, H * 0.1 + 34, 34, STYLE.accent[0]);
      if (Math.floor(game.time.elapsed * 1.6) % 2 === 0) say('► 100円 投入 ◄', W / 2, H * 0.82, 42, STYLE.accent[0]);
      else say('TAP TO START', W / 2, H * 0.82, 38, '#ffffff');
      return;
    }
    if (mode === 'RESULT') {
      b.burning = false;
      drawScene(false);
      if (b.won) {
        b.partyT -= dt;
        if (b.partyT <= 0) { b.partyT = 0.4; game.fx.burst(game.random(160, W - 160), game.random(H * 0.2, H * 0.55), { color: Math.random() < 0.5 ? STYLE.accent[0] : '#ff9ad0', count: 18, speed: 420 }); }
      }
      game.draw.rect(0, H * 0.3, W, H * 0.3, SHADE, 0.75);
      say(b.won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.355, 86, b.won ? STYLE.accent[0] : '#ff6a5a');
      say('SCORE ' + b.score, W / 2, H * 0.425, 52, '#ffffff');
      say('NICE ' + b.clean + '    ' + b.passed + ' / ' + BRANCHES, W / 2, H * 0.475, 38, STYLE.accent[1]);
      if (!b.won) say('あと' + (BRANCHES - b.passed) + '本!', W / 2, H * 0.53, 46, STYLE.accent[0]);
      else if (b.score > b.prevBest) say('NEW RECORD', W / 2, H * 0.53, 48, STYLE.accent[0]);
      else say('BEST ' + b.prevBest, W / 2, H * 0.53, 40, '#ffffff');
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) say('TAP TO CONTINUE', W / 2, H * 0.82, 36, '#ffffff');
      return;
    }
    b.burning = game.input.pressing && b.phase === 'run';
    if (b.phase === 'ready') {
      b.readyT -= dt;
      if (b.readyT <= 0) { b.phase = 'run'; game.audio.play('se_tap', 0.3); }
    } else if (b.phase === 'run') {
      if (b.pauseT > 0) {
        b.pauseT -= dt;
        if (b.pauseT <= 0) game.feedback.bad(b.x, b.y - 150 - b.cam, { text: 'MISS', size: 48 });
      } else advance(dt);
    } else if (b.phase === 'stop') {
      b.stopT -= dt;
      if (b.stopT <= 0) settle();
    }
    drawScene(b.phase === 'stop' || b.pauseT > 0);
    drawHud();
    if (b.phase === 'ready') say(b.readyT > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.4, 96, '#ffffff');
    if (b.phase === 'run' && b.clock > TIME_LIMIT - 1.6 && !game.input.pressing) {
      game.draw.hand(W / 2, H * 0.925, { press: Math.floor(game.time.elapsed * 3) % 2 === 0, scale: 12, alpha: 0.7 });
    }
  });

  game.onStart(function () {
    game.audio.melody([
      ['C5', 1], ['E5', 0.5], ['G5', 0.5], ['A5', 1], ['G5', 1],
      ['F5', 0.5], ['E5', 0.5], ['D5', 1], ['E5', 0.5], ['C5', 0.5], ['D5', 2],
    ], {
      tempo: 112, wave: 'triangle', volume: 0.06, loop: true,
      bass: [['C3', 2], ['F2', 2], ['G2', 2], ['C3', 2]],
    });
    mode = 'ATTRACT';
    b = freshFlight();
    demo.t = 0;
  });
})(game);
