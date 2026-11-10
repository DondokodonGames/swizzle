// I-3DS-0008v2-yacht-hull-slime-chase.js
// ぬめりおいかけ — 陸に上げたヨットの船底を這い回るぬめりの塊を追いかけ、叩くたびにこそげ落として塗装の絵柄を見せていく
// 操作: 船底を這うぬめりの塊をタップすると、柄の長いへらで一かきこそげ、塊は小さくなって叩いた所から逃げる。塊がふくらんで震えたら急に走る合図。塊のいない船底を叩くと塗装に傷がつく。2匹目からは船台の受け木の陰に隠れ、泡の出た側から出てくる。3匹目は半分削ると2つに分かれる
// 終わり: 3匹の塊をすべてこそげ落とせばCLEAR(見えた塗装%と手数が得点)。塗装の傷3本/21秒の時間切れでGAME OVER
// @mechanic: chase
// @theme: yacht_hull_slime_chase
// 世界観: 海辺のヨットハーバーの陸置き場で、船底掃除の作業員が船台に上げたヨットの船底を這い回るぬめりの塊を柄の長いへらで追いかけ、こそげ落として下の塗装の絵柄を見えるようにしていく
// 残るもの: 正誤(CLEAR/GAME OVER) + 見えた塗装%・こそげた回数・傷の数
// スタイル: TOON SHADE

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // TOON SHADE: 一回り大きい黒で輪郭→内側を明暗2色だけで塗る。中間調を作らない
  var STYLE = { bg: ['#7cc8f0', '#f4f4ec', '#b8c0c4'], main: ['#d8483a', '#9a2c26', '#fafaf4'], accent: ['#2a6ad8', '#ffd23a'] };
  var C = {
    sky: STYLE.bg[0], white: STYLE.bg[1], yard: STYLE.bg[2], paint: STYLE.main[0], paintD: STYLE.main[1], hullW: STYLE.main[2],
    blue: STYLE.accent[0], gold: STYLE.accent[1], ink: '#141418', slime: '#b4ec3c', slimeD: '#58a020', grime: '#7a6a3a', grimeD: '#54482a', ok: '#5ad06a', bad: '#ff4a4a',
  };

  var GAME_TITLE = 'HULL SLIME';
  var TIME_LIMIT = 21;
  var MAX_SCRATCH = 3;
  var HULL_TOP = 520, BOOT_Y = 650;
  // 塊ごと: 体力・這う速さ・隠れるか・分かれるか
  var STAGES = [
    { hp: 3, v: 150, hide: false, split: false },
    { hp: 4, v: 190, hide: true, split: false },
    { hp: 4, v: 225, hide: true, split: true },
  ];
  var PADS = [{ x: 330, w: 70, top: 860 }, { x: 760, w: 70, top: 860 }];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var stage, blobs, spots, scratches, hits, score, readyT, over, won, outroT, stopT, playT, focus, timeUp, pole, mood, offCount, clearT;

  function bottomY(x) {
    var u = Math.max(0, Math.min(1, (x - 60) / 980));
    return 560 + 560 * Math.pow(Math.sin(Math.PI * u), 0.6);
  }

  function makeSpots() {
    spots = [];
    for (var gy = BOOT_Y + 40; gy < 1100; gy += 66) {
      for (var gx = 110; gx < 990; gx += 66) {
        var ox = (Math.floor(gy / 66) % 2) * 33;
        if (gy < bottomY(gx + ox) - 30) spots.push({ x: gx + ox, y: gy, d: 1 });
      }
    }
  }

  function initGame() {
    scratches = []; hits = 0; score = 0; readyT = 0.8; over = false; won = false; outroT = 0; stopT = 0; playT = 0;
    focus = null; timeUp = false; pole = null; mood = 0; offCount = 0; clearT = -1;
    makeSpots();
    startStage(0);
  }

  function newBlob(x, y, hp, maxHp) {
    return { x: x, y: y, hp: hp, max: maxHp, vx: 0, vy: 0, mode: 'crawl', t: 0, tx: x, ty: y, dashT: 0, puffT: 2.0, hideT: 0, hidPad: -1, flash: 0, hidden: false, splitDone: false, emerge: 0, hideCool: 0.8, side: 1 };
  }

  function startStage(i) {
    stage = i;
    var b = newBlob(i === 1 ? 760 : 300 + i * 120, 860, STAGES[i].hp, STAGES[i].hp);
    pickTarget(b);
    blobs = [b];
    clearT = -1;
  }

  function clampHull(b) {
    b.x = Math.max(140, Math.min(960, b.x));
    var lo = BOOT_Y + 40, hi = bottomY(b.x) - 55;
    b.y = Math.max(lo, Math.min(hi, b.y));
  }

  // 次の這い先は「今いる所から遠い側」(決め打ちの巡回)
  var WAY = [[200, 760], [520, 980], [880, 760], [700, 1000], [320, 960], [560, 740]];
  function pickTarget(b) {
    var best = 0, bd = -1;
    for (var i = 0; i < WAY.length; i++) {
      var d = Math.hypot(WAY[i][0] - b.x, WAY[i][1] - b.y);
      if (d > bd && d < 700) { bd = d; best = i; }
    }
    b.tx = WAY[best][0]; b.ty = WAY[best][1];
  }

  function radius(b) { return 42 + 30 * (b.hp / b.max); }

  function smear(b, dt) {
    var r = radius(b) + 10;
    for (var i = 0; i < spots.length; i++) {
      var s = spots[i];
      if (Math.abs(s.x - b.x) < r && Math.abs(s.y - b.y) < r) s.d = Math.min(1, s.d + dt * 0.9);
    }
  }
  function clean(x, y, r) {
    for (var i = 0; i < spots.length; i++) {
      var s = spots[i];
      if (Math.hypot(s.x - x, s.y - y) < r) s.d = 0;
    }
  }
  function visiblePct() {
    var c = 0;
    for (var i = 0; i < spots.length; i++) if (spots[i].d < 0.35) c++;
    return Math.round(c / spots.length * 100);
  }

  // 塊1匹の動き(本番もデモも同じ)
  function stepBlob(b, dt) {
    var st = STAGES[stage];
    if (b.flash > 0) b.flash -= dt;
    if (b.mode === 'hide') {
      b.hideT -= dt;
      if (b.hideT < 0.6 && b.emerge === 0) { b.emerge = 1; game.audio.tone(520, 0.08, { wave: 'triangle', volume: 0.05, slide: 200 }); }
      if (b.hideT <= 0) {
        var p = PADS[b.hidPad];
        b.hidden = false; b.mode = 'dash'; b.dashT = 0.3; b.emerge = 0;
        b.x = p.x + b.side * (p.w + 40); b.vx = b.side * 520; b.vy = -120;
      }
      return;
    }
    if (b.mode === 'dash') {
      b.dashT -= dt;
      b.x += b.vx * dt; b.y += b.vy * dt;
      clampHull(b);
      if (b.dashT <= 0) { b.mode = 'crawl'; pickTarget(b); }
    } else if (b.mode === 'puff') {
      b.t += dt;
      if (b.t >= 0.55) {
        b.mode = 'dash'; b.dashT = 0.4;
        pickTarget(b);
        var dx = b.tx - b.x, dy = b.ty - b.y, dl = Math.max(1, Math.hypot(dx, dy));
        b.vx = dx / dl * 760; b.vy = dy / dl * 760;
        game.audio.tone(300, 0.12, { wave: 'sawtooth', volume: 0.05, slide: 300 });
      }
    } else {
      var ddx = b.tx - b.x, ddy = b.ty - b.y, dd = Math.hypot(ddx, ddy);
      if (dd < 20) pickTarget(b);
      else { b.x += ddx / dd * st.v * dt; b.y += ddy / dd * st.v * dt; }
      b.puffT -= dt;
      if (b.puffT <= 0) { b.mode = 'puff'; b.t = 0; b.puffT = 2.2; game.audio.tone(200, 0.3, { wave: 'triangle', volume: 0.04, slide: 120 }); }
      clampHull(b);
    }
    smear(b, dt);
    // 受け木の陰に入ったら隠れる(2匹目以降)
    if (st.hide && !b.hidden && b.mode !== 'puff') {
      for (var k = 0; k < PADS.length; k++) {
        if (Math.abs(b.x - PADS[k].x) < PADS[k].w * 0.5 && b.y > PADS[k].top && b.hideCool <= 0) {
          b.hidden = true; b.mode = 'hide'; b.hideT = 1.3; b.hidPad = k; b.emerge = 0;
          b.side = b.x < PADS[k].x ? 1 : -1;
          b.hideCool = 3;
          game.audio.tone(240, 0.1, { wave: 'triangle', volume: 0.05, slide: -120 });
        }
      }
    }
    if (b.hideCool > 0) b.hideCool -= dt;
  }

  function scrape(x, y, demo) {
    // へらの一かき(見た目)
    pole = { x: x, y: y, t: 0.16 };
    for (var i = 0; i < blobs.length; i++) {
      var b = blobs[i];
      if (b.hidden) continue;
      if (Math.hypot(x - b.x, y - b.y) <= radius(b) + 34) {
        hitBlob(b, x, y, demo);
        return;
      }
    }
    for (var k = 0; k < PADS.length; k++) {
      if (Math.abs(x - PADS[k].x) < PADS[k].w * 0.6 && y > PADS[k].top && y < 1400) {
        game.audio.tone(160, 0.08, { wave: 'square', volume: 0.06 });
        game.fx.burst(x, y, { color: '#8a6a40', count: 5, speed: 140 });
        return;
      }
    }
    if (x > 90 && x < 1000 && y > HULL_TOP && y < bottomY(x)) {
      scratches.push({ x: x, y: y, t: game.time.elapsed });
      mood = -1;
      if (!demo) {
        if (scratches.length >= MAX_SCRATCH) { focus = { x: x, y: y }; stopT = 0.5; finish(false); }
      }
      game.feedback.bad(x, y, { text: 'MISS', shake: demo ? 5 : 10 });
    } else {
      game.audio.play('se_tap', 0.3);
      game.fx.burst(x, y, { color: '#ffffff', count: 3, speed: 100 });
    }
  }

  function hitBlob(b, x, y, demo) {
    b.hp--; b.flash = 0.15;
    clean(b.x, b.y, 120);
    var dx = b.x - x, dy = b.y - y, dl = Math.max(1, Math.hypot(dx, dy));
    if (dl < 8) { dx = b.x < 540 ? 1 : -1; dy = 0; dl = 1; }
    b.mode = 'dash'; b.dashT = 0.35; b.vx = dx / dl * 900; b.vy = dy / dl * 900;
    game.fx.burst(b.x, b.y, { color: C.slime, count: 10, speed: 320 });
    if (!demo) { hits++; score += 100; }
    if (b.hp <= 0) {
      clean(b.x, b.y, 220);
      blobs.splice(blobs.indexOf(b), 1);
      mood = 1;
      game.feedback.good(b.x, b.y, { text: 'NICE', color: C.ok, size: 64 });
      game.audio.play('se_milestone', 0.45);
      if (blobs.length === 0) {
        if (!demo) { offCount++; game.fx.popup(offCount + ' / ' + STAGES.length, 540, 400, { color: C.gold, size: 64 }); }
        clearT = 0;
      }
      return;
    }
    game.feedback.good(b.x, b.y - 30, { text: '+100', color: C.gold, size: 48 });
    // 3匹目は半分で2つに分かれる
    if (STAGES[stage].split && !b.splitDone && b.hp <= 2) {
      b.splitDone = true;
      var nb = newBlob(b.x, b.y, 2, b.max);
      nb.splitDone = true; nb.mode = 'dash'; nb.dashT = 0.35; nb.vx = -b.vx; nb.vy = -b.vy * 0.5;
      blobs.push(nb);
      game.audio.play('se_break', 0.3);
    }
  }

  function finish(ok) {
    over = true; won = ok; outroT = 1.6;
    game.audio.stopBgm();
    if (ok) {
      score += visiblePct() * 10 + Math.max(0, Math.round((TIME_LIMIT - playT) * 20)) - scratches.length * 50;
      score = Math.max(0, score);
      mood = 2;
      game.audio.play('se_success', 0.55);
      game.fx.burst(540, 850, { color: C.gold, count: 30, speed: 460 });
      game.fx.burst(540, 850, { color: C.blue, count: 20, speed: 360 });
      game.fx.flash('#ffffff', 0.2);
    } else {
      game.audio.play('se_failure', 0.5);
    }
  }

  // ---- 入力 ----
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { game.audio.play('se_tap'); state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function(x, y) {
    if (state !== S.PLAYING) return;
    if (over || readyT > 0 || stopT > 0 || clearT >= 0 || y < 230) {
      game.audio.tone(220, 0.03, { wave: 'triangle', volume: 0.03 });
      return;
    }
    scrape(x, y, false);
  });

  // ---- 描画 ----
  function label(str, x, y, sz, col) {
    game.draw.text(str, x + 4, y + 4, { size: sz, color: C.ink, bold: true, align: 'center' });
    game.draw.text(str, x, y, { size: sz, color: col, bold: true, align: 'center' });
  }
  function toon(x, y, r, lightC, darkC) {
    game.draw.circle(x, y, r + 6, C.ink);
    game.draw.circle(x, y, r, darkC);
    game.draw.circle(x - r * 0.18, y - r * 0.2, r * 0.74, lightC);
  }

  var FACE_A = ['.ww..ww.', '.wk..wk.', '........', '..kkkk..'];
  var FACE_B = ['........', '.kk..kk.', '........', '..kkkk..'];
  var FACE_HIT = ['.k....k.', '..k..k..', '.k....k.', '..kkkk..'];
  var FISH = ['....bb....', '..bbbbb..b', '.bwbbbbbbb', 'bbbbbbbbb.', '.bbbbbb..b', '...bb.....'];
  var STAR = ['...y...', '..yyy..', 'yyyyyyy', '.yyyyy.', '.yy.yy.', 'y.....y'];
  var WAVE = ['..www...', '.w...w..', 'w.....w.', '......ww'];
  var WORKER_A = ['..cccc..', '.cccccc.', '..ssss..', '..s..s..', '.oooooo.', 'oooooooo', '.oo..oo.', '.bb..bb.'];
  var WORKER_B = ['..cccc..', '.cccccc.', '..ssss..', '..s..s..', '.oooooo.', 'oooooooo', '.oo..oo.', 'bb....bb'];

  function drawYard() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, '#4aa8e0'], [0.25, C.sky], [0.42, '#c8ecf8'], [0.43, C.yard], [1, '#8a9498']]);
    // 港の海とマスト
    game.draw.rect(0, 760, W, 70, '#3a90c8');
    for (var m = 0; m < 6; m++) {
      var mx = 60 + m * 190, sway = Math.sin(t * 1.2 + m) * 6;
      game.draw.line(mx, 790, mx + sway, 420, C.ink, 5);
      game.draw.rect(mx - 50, 780, 100, 22, C.white);
    }
    // 地面
    game.draw.rect(0, 1380, W, H - 1380, '#9aa2a6');
    game.draw.rect(0, 1380, W, 10, C.ink);
    for (var g = 0; g < 9; g++) game.draw.rect(g * 130, 1400, 4, 120, '#7a8286');
  }

  function drawHull() {
    // 輪郭(黒)→ 上部の白 → 喫水線の青 → 船底塗装(明暗2色)
    for (var x = 52; x < 1048; x += 8) {
      var by = bottomY(x + 4);
      game.draw.rect(x - 2, HULL_TOP - 8, 12, by - HULL_TOP + 16, C.ink);
    }
    for (var x2 = 60; x2 < 1040; x2 += 8) {
      var by2 = bottomY(x2 + 4);
      game.draw.rect(x2, HULL_TOP, 8, BOOT_Y - HULL_TOP, C.hullW);
      game.draw.rect(x2, BOOT_Y - 22, 8, 22, C.blue);
      game.draw.rect(x2, BOOT_Y, 8, by2 - BOOT_Y, C.paint);
      game.draw.rect(x2, by2 - 46, 8, 46, C.paintD);
    }
    game.draw.rect(60, HULL_TOP + 20, 980, 14, '#d8d8cc');
    // 竜骨と舵
    var kb = bottomY(545);
    game.draw.rect(494, kb - 30, 102, 270, C.ink);
    game.draw.rect(500, kb - 24, 90, 258, C.paintD);
    game.draw.rect(500, kb - 24, 40, 258, C.paint);
    var rb = bottomY(230);
    game.draw.rect(204, rb - 20, 62, 190, C.ink);
    game.draw.rect(210, rb - 14, 50, 178, C.paintD);
    // 下に隠れた絵柄(こそげると見える)
    game.draw.sprite(FISH, { b: C.blue, w: C.white }, 290, 860, 16, { anchor: 'center' });
    game.draw.sprite(STAR, { y: C.gold }, 545, 900, 18, { anchor: 'center' });
    game.draw.sprite(WAVE, { w: C.white }, 800, 850, 20, { anchor: 'center' });
  }

  function drawGrime() {
    for (var i = 0; i < spots.length; i++) {
      var s = spots[i];
      if (s.d <= 0.02) continue;
      game.draw.circle(s.x, s.y, 44, C.grimeD, s.d * 0.9);
      game.draw.circle(s.x - 8, s.y - 8, 26, C.grime, s.d * 0.85);
    }
    var t = game.time.elapsed;
    for (var k = 0; k < scratches.length; k++) {
      var sc = scratches[k];
      var hl = focus && stopT > 0 && sc.x === focus.x && sc.y === focus.y;
      var col = hl ? '#ffffff' : C.white;
      var sz = hl ? 1.6 : 1;
      game.draw.line(sc.x - 40 * sz, sc.y - 10 * sz, sc.x - 10 * sz, sc.y + 10 * sz, col, 6);
      game.draw.line(sc.x - 10 * sz, sc.y + 10 * sz, sc.x + 15 * sz, sc.y - 12 * sz, col, 6);
      game.draw.line(sc.x + 15 * sz, sc.y - 12 * sz, sc.x + 42 * sz, sc.y + 8 * sz, col, 6);
      if (hl && Math.floor(t * 14) % 2 === 0) game.draw.circle(sc.x, sc.y, 70, '#ffffff', 0.4);
    }
  }

  function drawPads() {
    var t = game.time.elapsed;
    for (var k = 0; k < PADS.length; k++) {
      var p = PADS[k];
      game.draw.rect(p.x - p.w / 2 - 6, p.top - 6, p.w + 12, 1386 - p.top, C.ink);
      game.draw.rect(p.x - p.w / 2, p.top, p.w, 1380 - p.top, '#a07a48');
      game.draw.rect(p.x - p.w / 2, p.top, p.w * 0.4, 1380 - p.top, '#c89a5e');
      game.draw.rect(p.x - p.w, p.top - 20, p.w * 2, 30, C.ink);
      game.draw.rect(p.x - p.w + 6, p.top - 14, p.w * 2 - 12, 18, '#2a2a30');
    }
    // 隠れている塊: 出てくる側に泡(予告)
    for (var i = 0; i < blobs.length; i++) {
      var b = blobs[i];
      if (!b.hidden || b.emerge === 0) continue;
      var pp = PADS[b.hidPad];
      for (var q = 0; q < 4; q++) {
        var bx = pp.x + b.side * (pp.w * 0.5 + 24 + q * 14);
        var bub = (t * 3 + q * 0.3) % 1;
        game.draw.circle(bx, b.y - bub * 90, 8 + q * 2, '#ffffff', 0.8 * (1 - bub));
      }
    }
  }

  function drawBlobs() {
    var t = game.time.elapsed;
    for (var i = 0; i < blobs.length; i++) {
      var b = blobs[i];
      if (b.hidden) continue;
      var r = radius(b);
      var hl = (focus && stopT > 0 && focus.blob === b) || b.flash > 0;
      if (b.mode === 'puff') r *= 1 + Math.sin(b.t * 40) * 0.08 + b.t * 0.3;
      var sq = b.mode === 'dash' ? 0.82 : 1 + Math.sin(t * 6 + i) * 0.05;
      // 狙う物: 白縁の明滅
      game.draw.circle(b.x, b.y, r * sq + 14, '#ffffff', 0.35 + 0.3 * Math.sin(t * 8));
      toon(b.x, b.y, r * sq, hl ? '#ffffff' : C.slime, hl ? '#e0ffe0' : C.slimeD);
      game.draw.circle(b.x - r * 0.6, b.y + r * 0.6, r * 0.32, C.slimeD);
      game.draw.circle(b.x + r * 0.7, b.y + r * 0.5, r * 0.26, C.slimeD);
      var face = b.flash > 0 || b.mode === 'dash' ? FACE_HIT : (Math.floor(t * 2.5 + i) % 6 === 0 ? FACE_B : FACE_A);
      game.draw.sprite(face, { w: '#ffffff', k: C.ink }, b.x, b.y - r * 0.1, Math.max(5, r / 7), { anchor: 'center' });
      if (b.mode === 'puff') game.draw.circle(b.x, b.y, r + 20, C.bad, 0.25 + 0.2 * Math.sin(t * 30));
    }
  }

  function drawWorker() {
    var t = game.time.elapsed;
    var wx = 140, wy = 1560;
    var fr = pole ? WORKER_B : (Math.floor(t * 2) % 2 === 0 ? WORKER_A : WORKER_B);
    game.draw.circle(wx, wy + 80, 70, '#000000', 0.2);
    game.draw.sprite(fr, { c: C.gold, s: '#f0c090', o: C.blue, b: C.ink }, wx, wy, 18, { anchor: 'center' });
    // 柄の長いへら(叩いた所まで伸びる)
    var hx = wx + 60, hy = wy - 20;
    var px = hx + 120, py = hy - 240 + Math.sin(t * 2) * 10;
    if (pole) { px = pole.x; py = pole.y; }
    game.draw.line(hx, hy, px, py, C.ink, 14);
    game.draw.line(hx, hy, px, py, '#d0a060', 8);
    game.draw.rect(px - 30, py - 8, 60, 16, C.ink);
    game.draw.rect(px - 26, py - 5, 52, 10, '#e0e4e8');
    // バケツと3匹ぶんの印
    for (var k = 0; k < STAGES.length; k++) {
      var done = k < offCount;
      toon(560 + k * 150, 1640, 46, done ? C.ok : '#c8ccd0', done ? '#3a8a46' : '#8a9094');
      if (!done && k === stage && state === S.PLAYING) game.draw.circle(560 + k * 150, 1640, 58, C.gold, 0.3 + 0.2 * Math.sin(t * 6));
    }
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 230, C.ink, 0.85);
    label('SCORE ' + score, 250, 70, 44, '#ffffff');
    label(visiblePct() + '%', 250, 160, 52, C.gold);
    for (var k = 0; k < MAX_SCRATCH; k++) {
      var used = k < scratches.length;
      game.draw.rect(640 + k * 120, 46, 90, 48, used ? C.bad : '#3a3a44');
      game.draw.line(650 + k * 120, 84, 720 + k * 120, 56, used ? '#ffffff' : '#5a5a64', 6);
    }
    var tk = Math.max(0, 1 - playT / TIME_LIMIT);
    game.draw.rect(640, 150, 360 * tk, 26, tk < 0.25 ? C.bad : C.gold);
  }

  function drawScene() {
    drawYard();
    drawHull();
    drawGrime();
    drawBlobs();
    drawPads();
    drawWorker();
    if (pole) { pole.t -= game.time.delta; if (pole.t <= 0) pole = null; }
  }

  // ---- ATTRACT: 1匹目を本物の動きで追いかけ、こそげて見せる。途中で一度ずれて傷をつける ----
  var demo = { t: 0, hx: 540, hy: 1100, cool: 0, press: 0, missed: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 8;
    if (cyc < dt || demo.t <= dt) { initGame(); readyT = 0; demo.missed = false; }
    if (clearT >= 0) { clearT += dt; if (clearT > 0.8) { makeSpots(); scratches = []; startStage(0); } return; }
    for (var i = 0; i < blobs.length; i++) stepBlob(blobs[i], dt);
    var b = blobs[0];
    demo.cool -= dt; demo.press -= dt;
    if (b && !b.hidden) {
      var lead = b.mode === 'dash' ? 0 : 0.15;
      var gx = b.x + (b.tx - b.x) * lead, gy = b.y + (b.ty - b.y) * lead;
      demo.hx += (gx - demo.hx) * Math.min(1, dt * 7);
      demo.hy += (gy - demo.hy) * Math.min(1, dt * 7);
      if (!demo.missed && cyc > 3.6 && b.mode === 'dash' && demo.cool <= 0) {
        demo.missed = true; demo.press = 0.18; demo.cool = 0.6;
        scrape(demo.hx, demo.hy, true);
      } else if (demo.cool <= 0 && b.mode !== 'dash' && Math.hypot(demo.hx - b.x, demo.hy - b.y) < 30) {
        demo.press = 0.18; demo.cool = 0.75;
        scrape(demo.hx, demo.hy, true);
      }
    }
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;
    mood += (0 - mood) * Math.min(1, dt * 1.5);

    if (state === S.ATTRACT) {
      stepDemo(dt);
      drawScene();
      game.draw.hand(demo.hx, demo.hy, { press: demo.press > 0, scale: 14 });
      game.draw.rect(0, 0, W, 230, C.ink, 0.85);
      label(GAME_TITLE, W / 2, 100, 92 + Math.sin(t * 3) * 3, C.gold);
      label('HI-SCORE ' + (game.best > 0 ? game.best : 0), W / 2, 188, 36, '#ffffff');
      if (Math.floor(t * 2) % 2 === 0) label('► 100円 投入 ◄', W / 2, 1780, 48, C.gold);
      else label('TAP TO START', W / 2, 1780, 44, '#ffffff');
      return;
    }

    if (state === S.RESULT) {
      drawScene();
      game.draw.rect(0, H * 0.3, W, H * 0.26, C.ink, 0.85);
      label(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.355, 96, won ? C.ok : C.bad);
      label('SCORE ' + score, W / 2, H * 0.41, 54, '#ffffff');
      label(visiblePct() + '%', W / 2, H * 0.455, 46, C.gold);
      if (score > game.best && score > 0) label('NEW RECORD', W / 2, H * 0.5, 46, C.gold);
      else label('BEST ' + Math.max(game.best, score), W / 2, H * 0.5, 38, '#ffffff');
      if (!won) {
        var left = 0;
        for (var i = 0; i < blobs.length; i++) left += Math.max(0, blobs[i].hp);
        for (var s = stage + 1; s < STAGES.length; s++) left += STAGES[s].hp;
        label('あと' + Math.max(1, left) + '回', W / 2, H * 0.54, 46, C.gold);
      }
      if (Math.floor(t * 2) % 2 === 0) label('TAP TO CONTINUE', W / 2, H * 0.6, 38, '#ffffff');
      return;
    }

    // ---- PLAYING ----
    if (over) {
      outroT -= dt;
      if (stopT > 0) stopT -= dt;
      if (outroT <= 0) {
        state = S.RESULT;
        var stats = { blobs: offCount, visible: visiblePct(), scrapes: hits, scratches: scratches.length };
        if (won) game.end.success(score, stats);
        else game.end.failure(stats);
      }
    } else if (readyT > 0) {
      readyT -= dt;
      if (readyT <= 0) game.audio.play('se_tap', 0.5);
    } else {
      playT += dt;
      if (clearT >= 0) {
        clearT += dt;
        if (clearT > 0.6) {
          if (stage + 1 >= STAGES.length) finish(true);
          else startStage(stage + 1);
        }
      } else {
        for (var j = 0; j < blobs.length; j++) stepBlob(blobs[j], dt);
      }
      if (!over && playT >= TIME_LIMIT) {
        timeUp = true;
        var vb = null;
        for (var q = 0; q < blobs.length; q++) if (!blobs[q].hidden) vb = blobs[q];
        if (vb) focus = { blob: vb };
        stopT = 0.5;
        finish(false);
      }
    }

    drawScene();
    drawHud();
    // 開始直後のお手本: 最初の塊に手を一度だけ重ねる
    if (!over && readyT <= 0 && playT < 1.0 && blobs[0]) {
      game.draw.hand(blobs[0].x, blobs[0].y, { press: Math.floor(t * 4) % 2 === 0, scale: 12, alpha: 0.6 });
    }
    if (readyT > 0) label(readyT > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.24 + 120, 100, C.gold);
    if (over && timeUp) label('TIME UP', W / 2, H * 0.24 + 120, 90, C.bad);
  });

  game.onStart(function() {
    game.audio.melody([
      ['G4', 0.5], ['B4', 0.5], ['D5', 0.5], ['B4', 0.5], ['C5', 1], ['A4', 1],
      ['F#4', 0.5], ['A4', 0.5], ['C5', 0.5], ['A4', 0.5], ['G4', 1], ['R', 1],
    ], { tempo: 132, wave: 'triangle', volume: 0.05, loop: true, bass: [['G2', 1], ['D3', 1], ['C3', 1], ['D3', 1]] });
    state = S.ATTRACT;
    initGame();
  });
})(game);
