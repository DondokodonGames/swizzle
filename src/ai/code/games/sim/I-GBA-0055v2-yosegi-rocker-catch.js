// I-GBA-0055v2-yosegi-rocker-catch.js
// 寄木ゆらり起こし — 横倒しで揺れ続ける木彫り人形が一番高く起き上がった瞬間に、1回だけタップして指で支えて立たせる
// 操作: 人形1体につきタップは1回だけ。揺れは毎回高さが違い、大きな揺れの頂点でタップすれば立つ。低い揺れでタップすると支えきれずに倒れる
// 終わり: 5体のうち3体以上を立たせればCLEAR。立った数が足りない/15秒が尽きればGAME OVER(揺れが収まるまで見送った人形も倒れたまま)
// @mechanic: timing_one_shot
// @theme: marquetry_workshop_rocking_doll
// 世界観: 寄木細工の工房で、職人が作業台に寝かせた木彫りの人形のゆらゆら揺れを見極め、一番起き上がった瞬間に指で支えて棚に立たせていく
// 残るもの: 正誤(CLEAR/GAME OVER) + 立たせた数・PERFECT数・スコア
// スタイル: NEO-RETRO

(function (game) {
  var W = game.canvas.width, H = game.canvas.height;
  // NEO-RETRO: 先に決めた限定6色だけで描く。大きいドット(14px)、差し色は朱の1色だけ
  var STYLE = { bg: ['#2a1e2e', '#4a3448'], main: ['#e8c890', '#a8683a', '#f8ecd0'], accent: ['#ff3a5a', '#3a8a8a'] };
  var INK = STYLE.bg[0], PLUM = STYLE.bg[1], LIGHT = STYLE.main[0], DARK = STYLE.main[1], CREAM = STYLE.main[2];
  var RED = STYLE.accent[0], TEAL = STYLE.accent[1];

  var TITLE = 'YOSEGI ROCKER';
  var TIME_LIMIT = 15;
  var NEED = 3;
  var PERFECT_TILT = 12, GOOD_TILT = 24;
  // 各人形の揺れ(起き上がり角度の並び)。後の人形ほど速く、頂点手前の「惜しい揺れ」が高くなる
  var DOLLS = [
    { per: 0.75, rises: [30, 55, 84, 40] },
    { per: 0.7, rises: [35, 84, 50, 25] },
    { per: 0.65, rises: [40, 60, 84, 35] },
    { per: 0.6, rises: [45, 62, 30, 84, 40] },
    { per: 0.55, rises: [50, 64, 84, 30], gold: true },
  ];
  var DEMO_DOLLS = [{ per: 0.75, rises: [30, 84, 40] }, { per: 0.75, rises: [58, 30, 20] }];
  var PX = 18;
  var PIV = { x: W * 0.5, y: H * 0.6 };

  var MODE = 'ATTRACT';
  var w = null;

  var DOLL = [
    '..hhhh..', '.hhhhhh.', 'hhffffhh', 'hfeffefh', 'hfcffcfh', '.ffmmff.', '..bbbb..',
    '.yyzzyy.', 'yzzyyzzy', 'yyzzyyzz', 'zzyyzzyy', 'zyyzzyyz', '.yyzzyy.', '..rrrr..',
  ];
  var PAL = { h: INK, f: CREAM, e: INK, c: RED, m: RED, b: DARK, y: LIGHT, z: TEAL, r: DARK };
  var PAL_GOLD = { h: INK, f: CREAM, e: INK, c: RED, m: RED, b: DARK, y: '#ffd870', z: RED, r: DARK };
  var PAL_WHITE = { h: '#ffffff', f: '#ffffff', e: '#ffffff', c: '#ffffff', m: '#ffffff', b: '#ffffff', y: '#ffffff', z: '#ffffff', r: '#ffffff' };
  var SMITH_A = ['..rrrrrr..', '.rrrrrrrr.', '..ffffff..', '..fefeff..', '..ffffff..', '...fmmf...', '.dddddddd.', 'fdddddddd.', 'f.dddddd..', '..dddddd..', '..dd..dd..'];
  var SMITH_B = ['..rrrrrr..', '.rrrrrrrr.', '..ffffff..', '..ffffff..', '..ffffff..', '...fmmf...', '.dddddddd.', 'fdddddddd.', 'f.dddddd..', '..dddddd..', '..dd..dd..'];
  var SMITH_JOY = ['f.rrrrrr.f', 'frrrrrrrrf', 'd.ffffff.d', 'd.fefeff.d', 'dfffffffdd', '...fmmf...', '..dddddd..', '..dddddd..', '..dddddd..', '..dddddd..', '.dd....dd.'];
  var SMITH_SAD = ['..........', '..rrrrrr..', '.rrrrrrrr.', '..ffffff..', '..f-ff-f..', '..ffffff..', '...fmmf...', 'fdddddddd.', 'f.dddddd..', '..dddddd..', '..dd..dd..'];
  var PAL_SMITH = { r: RED, f: CREAM, e: INK, '-': INK, m: DARK, d: TEAL };
  var FINGER = ['.ff.', 'ffff', 'ffff', 'ffff', 'ffff', 'dddd', 'dddd'];

  // ── 回転ドット描画(大きいドットを1つずつ回す) ─────
  function drawRot(art, pal, px, ox, oy, ang) {
    var rows = art.length, cols = art[0].length;
    var c = Math.cos(ang), s = Math.sin(ang);
    for (var r = 0; r < rows; r++) {
      for (var k = 0; k < cols; k++) {
        var ch = art[r][k];
        if (ch === '.' || !pal[ch]) continue;
        var lx = (k - cols / 2 + 0.5) * px, ly = (r - rows + 0.5) * px;
        var x = ox + lx * c - ly * s, y = oy + lx * s + ly * c;
        game.draw.rect(x - px * 0.6, y - px * 0.6, px * 1.2, px * 1.2, pal[ch]);
      }
    }
  }

  // ── 世界 ───────────────────────────────────────────
  function freshWorld(demo) {
    return {
      demo: !!demo, list: demo ? DEMO_DOLLS : DOLLS, k: 0, t: 0, doll: 'enter', enterT: 0.35, endT: 0,
      lastPeak: -1, standAng: 0, clock: TIME_LIMIT, phase: 'ready', readyT: 0.8, stopT: 0, won: false,
      score: 0, stood: 0, perfects: 0, results: [], finger: 0, smithPose: 0, why: '',
    };
  }
  function initGame() { w = freshWorld(false); }

  function cur() { return w.list[w.k]; }
  function riseAt(d, t) {
    var i = Math.floor(t / d.per);
    if (i >= d.rises.length || t < 0) return { r: 0, i: i, ph: 0 };
    var ph = (t - i * d.per) / d.per;
    return { r: d.rises[i] * Math.sin(Math.PI * ph), i: i, ph: ph };
  }
  function tilt() { return w.doll === 'stand' ? w.standAng : 90 - riseAt(cur(), w.t).r; }

  // ── 1回だけのタップ(本番とデモで共通) ───────────────
  function catchDoll() {
    if (w.phase !== 'run' || w.doll !== 'rock') return false;
    var tl = 90 - riseAt(cur(), w.t).r;
    var hx = PIV.x + Math.sin(tl * Math.PI / 180) * 250, hy = PIV.y - Math.cos(tl * Math.PI / 180) * 250;
    w.finger = 0.5;
    if (tl <= GOOD_TILT) {
      var perfect = tl <= PERFECT_TILT;
      var pts = (perfect ? 300 : 150) * (cur().gold ? 2 : 1);
      w.score += pts; w.stood++;
      if (perfect) w.perfects++;
      w.doll = 'stand'; w.endT = 0.55; w.standAng = tl; w.smithPose = 0.5;
      w.results.push(perfect ? 2 : 1);
      game.feedback.good(hx, hy - 40, { text: perfect ? 'PERFECT' : 'GOOD', color: perfect ? RED : CREAM, size: 50 });
      if (w.stood === NEED && !w.demo) { game.fx.popup(NEED + ' / ' + NEED, W / 2, H * 0.27, { color: '#ffd870', size: 60 }); game.audio.play('se_milestone', 0.45); }
    } else {
      w.doll = 'fall'; w.endT = 0.6; w.standAng = tl; w.results.push(0);
      game.fx.flash('#ffffff', 0.1);
      game.audio.play('se_break', 0.35);
      game.fx.popup('あと' + Math.round(tl - GOOD_TILT) + '°', hx, hy - 120, { color: '#ffd870', size: 40 });
    }
    return true;
  }

  function nextDoll() {
    if (w.k >= w.list.length - 1) {
      if (w.demo) { w.doll = 'idle'; return; }
      w.phase = 'stop'; w.stopT = 0.5; w.won = w.stood >= NEED; w.why = w.won ? '' : 'short';
      if (w.won) game.fx.burst(W / 2, H * 0.4, { color: '#ffd870', count: 30, speed: 520 });
      else game.fx.flash('#ffffff', 0.1);
      return;
    }
    w.k++; w.t = 0; w.doll = 'enter'; w.enterT = 0.35; w.lastPeak = -1;
  }

  function advance(dt) {
    if (!w.demo) w.clock -= dt;
    if (w.finger > 0) w.finger -= dt;
    if (w.smithPose > 0) w.smithPose -= dt;
    if (w.doll === 'enter') {
      w.enterT -= dt;
      if (w.enterT <= 0) { w.doll = 'rock'; w.t = 0; }
    } else if (w.doll === 'rock') {
      var before = riseAt(cur(), w.t);
      w.t += dt;
      var now = riseAt(cur(), w.t);
      // 揺れが台に当たるコトン音(大きい揺れほど高い音)
      if (now.i !== before.i && before.i < cur().rises.length) game.audio.tone(180 + cur().rises[before.i] * 4, 0.05, { wave: 'triangle', volume: 0.12 });
      if (before.ph < 0.5 && now.ph >= 0.5 && now.i === before.i) w.lastPeak = cur().rises[now.i];
      if (now.i >= cur().rises.length) {
        // 揺れが収まるまで見送った
        w.doll = 'fall'; w.endT = 0.6; w.standAng = 90; w.results.push(0);
        game.audio.play('se_break', 0.3);
      }
    } else if (w.doll === 'stand' || w.doll === 'fall') {
      var was = w.endT;
      w.endT -= dt;
      if (w.doll === 'fall' && was > 0.2 && w.endT <= 0.2) game.feedback.bad(PIV.x + 140, PIV.y - 160, { text: 'MISS', size: 46, shake: 6 });
      if (w.endT <= 0) nextDoll();
    }
    if (w.clock <= 0 && w.phase === 'run') { w.clock = 0; w.phase = 'stop'; w.stopT = 0.5; w.won = false; w.why = 'time'; game.fx.flash('#ffffff', 0.12); }
  }

  function settle() {
    var stats = { stood: w.stood, total: DOLLS.length, perfect: w.perfects };
    if (w.won) {
      w.score += Math.round(w.clock * 30);
      game.feedback.good(W / 2, H * 0.4, { text: 'CLEAR', color: '#ffd870', size: 70 });
      game.audio.play('se_success', 0.6);
      game.end.success(w.score, stats);
    } else {
      game.feedback.bad(PIV.x, PIV.y - 200, { text: w.why === 'time' ? 'TIME UP' : 'GAME OVER', size: 56 });
      game.audio.play('se_failure', 0.6);
      game.end.failure(stats);
    }
    MODE = 'RESULT';
  }

  // ── 描画 ───────────────────────────────────────────
  function drawRoom() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, INK], [0.55, PLUM], [1, INK]]);
    // 寄木模様の壁(大きいドットの菱形タイル)
    for (var y = 260; y < H * 0.62; y += 112) {
      for (var x = ((y / 112) % 2) * 56 - 56; x < W; x += 112) {
        game.draw.rect(x + 42, y, 28, 28, DARK, 0.35);
        game.draw.rect(x + 28, y + 28, 56, 28, TEAL, 0.18);
        game.draw.rect(x + 42, y + 56, 28, 28, LIGHT, 0.12);
      }
    }
    // 立たせた人形を並べる棚
    game.draw.rect(60, H * 0.2, W - 120, 20, DARK);
    for (var i = 0; i < w.list.length; i++) {
      var sx = W / 2 - (w.list.length - 1) * 90 + i * 180;
      var res = w.results[i];
      if (res > 0) drawRot(DOLL, w.list[i].gold ? PAL_GOLD : PAL, 7, sx, H * 0.2, 0);
      else if (res === 0) drawRot(DOLL, PAL, 7, sx, H * 0.2, Math.PI / 2 * 0.98);
      else game.draw.rect(sx - 20, H * 0.2 - 12, 40, 12, PLUM);
      if (res === 2) game.draw.rect(sx - 10, H * 0.2 - 130, 20, 20, RED, 0.5 + 0.5 * Math.sin(t * 6 + i));
    }
  }

  function drawBench() {
    game.draw.rect(0, PIV.y, W, 44, LIGHT);
    for (var x = 0; x < W; x += 84) { game.draw.rect(x, PIV.y + 8, 42, 14, DARK, 0.6); game.draw.rect(x + 42, PIV.y + 22, 42, 14, TEAL, 0.5); }
    game.draw.rect(0, PIV.y + 44, W, H * 0.4 - 44, DARK);
    game.draw.rect(0, PIV.y + 44, W, 14, INK, 0.4);
  }

  function drawGauge() {
    // 起き上がりの目盛り(扇形の刻み)。頂点の窓は白く明滅
    var t = game.time.elapsed;
    var R0 = 330, R1 = 374;
    for (var a = 0; a <= 90; a += 6) {
      var rr = a * Math.PI / 180;
      var good = a <= GOOD_TILT;
      var col = good ? (a <= PERFECT_TILT ? RED : CREAM) : LIGHT;
      var al = good ? 0.55 + 0.35 * Math.sin(t * 8) : 0.3;
      var x0 = PIV.x + Math.sin(rr) * R0, y0 = PIV.y - Math.cos(rr) * R0;
      game.draw.rect(x0 - 10, y0 - 10, 20, 20, col, al);
      if (a % 30 === 0) game.draw.rect(PIV.x + Math.sin(rr) * R1 - 6, PIV.y - Math.cos(rr) * R1 - 6, 12, 12, CREAM, 0.6);
    }
    if (w.lastPeak > 0 && w.doll === 'rock') {
      var pr = (90 - w.lastPeak) * Math.PI / 180;
      game.draw.rect(PIV.x + Math.sin(pr) * (R0 + 20) - 12, PIV.y - Math.cos(pr) * (R0 + 20) - 12, 24, 24, '#ffd870', 0.8);
    }
  }

  function drawDoll() {
    if (w.doll === 'idle') return;
    var d = cur();
    var tl = tilt();
    var slide = w.doll === 'enter' ? w.enterT / 0.35 * 600 : 0;
    var fallOut = w.doll === 'fall' && w.endT < 0.2 ? (0.2 - w.endT) * 1200 : 0;
    var standOut = w.doll === 'stand' ? Math.max(0, 0.3 - w.endT) * 1400 : 0;
    var ang = tl * Math.PI / 180;
    if (w.doll === 'stand') ang = (w.standAng * Math.max(0, w.endT - 0.35) / 0.2) * Math.PI / 180;
    var ox = PIV.x + slide + fallOut + ang * 40, oy = PIV.y - standOut;
    var hl = w.doll === 'fall' && w.endT > 0.2;
    game.draw.rect(ox - 90, PIV.y - 6, 180, 12, INK, 0.3);
    drawRot(DOLL, hl ? PAL_WHITE : d.gold ? PAL_GOLD : PAL, hl ? PX * 1.2 : PX, ox, oy, ang);
    if (w.doll === 'stand' && w.endT > 0.3) {
      game.draw.circle(ox, oy - 100, 150, '#ffd870', 0.15);
    }
    if (w.finger > 0) {
      var tr = tl * Math.PI / 180;
      var fx = PIV.x + Math.sin(tr) * 235 + 70, fy = PIV.y - Math.cos(tr) * 235;
      game.draw.sprite(FINGER, { f: CREAM, d: TEAL }, fx, fy + 40, 12, { anchor: 'center' });
    }
  }

  function drawSmith() {
    var t = game.time.elapsed;
    var art = Math.floor(t * 2) % 3 === 2 ? SMITH_B : SMITH_A;
    if (MODE === 'RESULT' && !w.won) art = SMITH_SAD;
    else if (w.smithPose > 0 || (w.phase === 'stop' && w.won)) art = SMITH_JOY;
    var hop = w.smithPose > 0 ? Math.abs(Math.sin(t * 12)) * 20 : 0;
    game.draw.sprite(art, PAL_SMITH, W * 0.8, H * 0.84 - hop, 16, { anchor: 'center' });
    // 順番待ちの人形(手元の箱)
    game.draw.rect(W * 0.08, H * 0.8, W * 0.42, H * 0.1, PLUM);
    game.draw.rect(W * 0.08, H * 0.8, W * 0.42, 14, LIGHT);
    for (var i = w.k + 1; i < w.list.length; i++) drawRot(DOLL, w.list[i].gold ? PAL_GOLD : PAL, 6, W * 0.13 + (i - w.k - 1) * 100 + 40, H * 0.86, Math.PI / 2);
  }

  function label(s, x, y, size, color) {
    game.draw.text(s, x + 4, y + 4, { size: size, color: INK, bold: true, align: 'center' });
    game.draw.text(s, x, y, { size: size, color: color, bold: true, align: 'center' });
  }

  function drawStage() {
    drawRoom();
    drawBench();
    drawGauge();
    drawDoll();
    drawSmith();
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 220, INK, 0.7);
    label('SCORE ' + w.score, W * 0.3, 72, 40, CREAM);
    label(w.stood + ' / ' + NEED, W * 0.78, 72, 46, RED);
    var frac = Math.max(0, w.clock / TIME_LIMIT);
    game.draw.rect(80, 130, W - 160, 20, PLUM);
    game.draw.rect(80, 130, (W - 160) * frac, 20, frac < 0.2 ? RED : TEAL);
    var progress = (w.k + (w.doll === 'stand' || w.doll === 'fall' ? 1 : 0)) / w.list.length;
    game.draw.rect(80, 172, (W - 160) * progress, 12, LIGHT);
  }

  // ── ATTRACT(実ロジック + ゴーストの1タップ) ─────────
  // 1体目: 大きな揺れの頂点でタップ(成功例) / 2体目: 惜しい揺れでタップして倒れる(失敗例)
  var demo = { t: 0, gx: W * 0.7, gy: H * 0.78, press: 0 };
  var DEMO_CYCLE = 5.4;
  function runDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % DEMO_CYCLE;
    if (cyc < dt || demo.t <= dt) { w = freshWorld(true); w.phase = 'run'; }
    if (demo.press > 0) demo.press -= dt;
    if (w.doll === 'rock') {
      var rs = riseAt(cur(), w.t);
      var want = w.k === 0 ? 1 : 0;
      if (rs.i === want && rs.ph >= 0.5) { catchDoll(); demo.press = 0.25; }
    }
    advance(dt);
    var tl = w.doll === 'idle' ? 60 : tilt();
    var tr = tl * Math.PI / 180;
    var tx = PIV.x + Math.sin(tr) * 235 + 70, ty = PIV.y - Math.cos(tr) * 235 + 40;
    demo.gx += (tx - demo.gx) * Math.min(1, dt * 6);
    demo.gy += (ty - demo.gy) * Math.min(1, dt * 6);
  }

  function begin() {
    initGame();
    MODE = 'PLAYING';
    game.audio.play('se_coin', 0.5);
  }

  game.onTap(function (x, y) {
    if (MODE === 'ATTRACT') { begin(); return; }
    if (MODE === 'RESULT') { MODE = 'ATTRACT'; initGame(); demo.t = 0; game.audio.play('se_tap', 0.3); return; }
    if (catchDoll()) game.audio.play('se_tap', 0.25);
    else game.audio.play('se_tap', 0.08);
  });

  game.onUpdate(function (dt) {
    if (!w) initGame();
    if (MODE === 'ATTRACT') {
      runDemo(dt);
      drawStage();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press > 0, scale: 14 });
      game.draw.rect(0, 0, W, 220, INK, 0.7);
      label(TITLE, W / 2, 92, 72, RED);
      label('HI-SCORE ' + game.best, W / 2, 172, 34, CREAM);
      if (Math.floor(game.time.elapsed * 1.6) % 2 === 0) label('► 100円 投入 ◄', W / 2, H * 0.965, 40, RED);
      else label('INSERT COIN', W / 2, H * 0.965, 34, CREAM);
      return;
    }
    if (MODE === 'RESULT') {
      drawStage();
      game.draw.rect(0, H * 0.26, W, H * 0.22, INK, 0.8);
      label(w.won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.31, 86, w.won ? '#ffd870' : RED);
      label('SCORE ' + w.score, W / 2, H * 0.37, 50, CREAM);
      label(w.stood + ' / ' + DOLLS.length + '   PERFECT ' + w.perfects, W / 2, H * 0.415, 36, TEAL);
      if (!w.won) label('あと' + Math.max(1, NEED - w.stood) + '体!', W / 2, H * 0.455, 44, '#ffd870');
      else if (w.score > game.best) label('NEW RECORD', W / 2, H * 0.455, 46, '#ffd870');
      else label('BEST ' + game.best, W / 2, H * 0.455, 40, CREAM);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) label('TAP TO CONTINUE', W / 2, H * 0.965, 34, CREAM);
      return;
    }
    if (w.phase === 'ready') {
      w.readyT -= dt;
      if (w.readyT <= 0) { w.phase = 'run'; game.audio.play('se_tap', 0.3); }
    } else if (w.phase === 'run') {
      advance(dt);
    } else if (w.phase === 'stop') {
      w.stopT -= dt;
      if (w.stopT <= 0) settle();
    }
    drawStage();
    drawHud();
    if (w.phase === 'ready') {
      label(w.readyT > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.36, 96, RED);
      game.draw.hand(PIV.x + 60, PIV.y - 140, { press: false, scale: 12, alpha: 0.7 });
    }
  });

  game.onStart(function () {
    // 工房の木琴のような、揺れに合わせた3拍子の旋律
    game.audio.melody([
      ['G4', 1], ['B4', 0.5], ['D5', 0.5], ['C5', 1], ['A4', 1], ['B4', 0.5], ['G4', 0.5], ['A4', 1],
      ['E4', 1], ['G4', 0.5], ['B4', 0.5], ['A4', 1], ['F#4', 1], ['G4', 2],
    ], { tempo: 132, wave: 'triangle', volume: 0.06, loop: true, bass: [['G2', 3], ['D2', 3], ['E2', 3], ['D2', 3]], bassVolume: 0.05 });
    MODE = 'ATTRACT';
    initGame();
    demo.t = 0;
  });
})(game);
