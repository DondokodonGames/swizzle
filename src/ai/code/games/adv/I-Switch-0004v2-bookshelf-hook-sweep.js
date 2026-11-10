// I-Switch-0004v2-bookshelf-hook-sweep.js
// 本棚の鉤のぼり — 頭上で振り子のように振れ続ける鉤竿が上の段の真鍮の輪を向いた瞬間に放ち、引っ掛けて体を引き寄せ、一段ずつ巨大な本棚を登る
// 操作: 画面のどこかをタップすると、その瞬間に鉤竿が向いている方向へ鉤が飛ぶ。上の段の輪に掛かれば体が引き寄せられて一段登る。外れると鉤が戻るまで待ちになりMISS。赤く震える抜けかけの本の輪に掛けると本ごと抜けてMISS
// 終わり: 10段上のランプの読書台まで22秒以内に登ればCLEAR。MISSが3回/時間切れでGAME OVER
// @mechanic: camera_climb
// @theme: giant_bookshelf_hook
// 世界観: 夜の巨大な本棚の迷宮で、小人の図書係が鉤竿を上の段の真鍮の輪へ引っ掛けては体を引き寄せ、抜けかけの本を避けながら最上段のランプの灯る読書台まで登っていく
// 残るもの: 正誤(CLEAR/GAME OVER) + 登った段数・PERFECT数・残り時間のスコア
// スタイル: 90s PRE-RENDER

(function (game) {
  var W = game.canvas.width, H = game.canvas.height;
  // 90s PRE-RENDER: 暗め・金属質のハイライト・粒状ノイズ。背景は描き込みの一枚絵、キャラだけドットで動く
  var STYLE = { bg: ['#120d0a', '#2a1c14', '#3d2a1c'], main: ['#6b4a30', '#c9a24a', '#e8dcc4'], accent: ['#7fd08a', '#e0483c'] };
  var NOIR = '#0a0705';

  var LEVELS = 10, MISS_MAX = 3, TIME_LIMIT = 22;
  var GAP = 380, REACH = 560, SWEEP = 1.12, PIV = 100;

  var ST = 'ATTRACT';
  var c = null;
  var grain = [];
  for (var gi = 0; gi < 70; gi++) grain.push({ x: (gi * 157) % W, y: (gi * 389) % 1600, a: 0.04 + (gi % 5) * 0.012 });

  var ELF_STAND = [
    '...gggg...',
    '..gggggg..',
    '...ffff...',
    '..oeffeo..',
    '...ffff...',
    '..aaaaaa..',
    '.faaaaaaf.',
    '..aaaaaa..',
    '...b..b...',
    '..kk..kk..',
  ];
  var ELF_REACH = [
    '.f.gggg...',
    '.fgggggg..',
    '.a.ffff...',
    '.aoeffeo..',
    '.a.ffff...',
    '..aaaaaa..',
    '..aaaaaaf.',
    '..aaaaaa..',
    '...b..b...',
    '..kk..kk..',
  ];
  var ELF_HANG = [
    '..f....f..',
    '..a.gg.a..',
    '..agggga..',
    '...ffff...',
    '..oeffeo..',
    '...ffff...',
    '..aaaaaa..',
    '..aaaaaa..',
    '..b....b..',
    '.kk....kk.',
  ];
  var ELF_SLUMP = [
    '..........',
    '..........',
    '...gggg...',
    '..gggggg..',
    '..offffo..',
    '...eeee...',
    '.aaaaaaaa.',
    'faaaaaaaaf',
    '.bb....bb.',
    'kk......kk',
  ];
  var ELF_PAL = { g: '#3a5a40', f: '#e6c09a', o: STYLE.main[1], e: NOIR, a: STYLE.accent[0], b: '#3a2a20', k: '#1a120c' };
  var LAMP = ['..llll..', '.llllll.', 'llllllll', '...ss...', '...ss...', '..ssss..'];

  function freshClimb() {
    return {
      phase: 'ready', readyT: 0.8, clock: TIME_LIMIT, sw: 0,
      level: 0, x: W * 0.5, shelves: [], hook: null, pullT: 0, from: null, to: null,
      misses: 0, perfects: 0, score: 0, chain: 0,
      cam: -H * 0.7, falling: [], flashT: 0, stopT: 0, won: false, culprit: null, prevBest: 0, partyT: 0,
    };
  }

  function shelfY(i) { return -i * GAP; }

  function buildShelves(cl) {
    cl.shelves = [];
    var px = W * 0.5;
    for (var i = 0; i <= LEVELS; i++) {
      var books = [], bx = 70, nb = 0;
      while (bx < W - 70) {
        var bw = 28 + ((nb * 7 + i * 3) % 6) * 10;
        books.push({ x: bx, w: bw, h: 140 + ((nb * 5 + i * 11) % 8) * 16, col: ['#5a2a24', '#2a3a5a', '#3a4a2a', '#5a4a24', '#4a2a4a', '#2a4a4a'][(nb * 4 + i) % 6] });
        bx += bw + 3; nb++;
      }
      var rings = [];
      if (i >= 1) {
        if (i === LEVELS) {
          rings.push({ x: clampX(px + (i % 2 ? 220 : -220)), r: 34, loose: false, gold: true });
        } else {
          var sideA = Math.random() < 0.5 ? -1 : 1;
          var offA = sideA * game.random(120, 300);
          var r = i >= 7 ? 26 : 34;
          rings.push({ x: clampX(px + offA), r: r, loose: false, gold: false });
          if (i <= 8) {
            var offB = -sideA * game.random(130, 300);
            rings.push({ x: clampX(px + offB), r: r, loose: i >= 4 && i % 2 === 0, gold: false });
          }
          if (i >= 4 && i % 2 === 0 && rings.length > 1) {
            // 抜けかけ側と本物を入れ替えて、左右どちらが危ないかを毎回読ませる
            if (Math.random() < 0.5) { var tmp = rings[0].x; rings[0].x = rings[1].x; rings[1].x = tmp; }
          }
        }
      }
      cl.shelves.push({ books: books, rings: rings });
      var safe = null;
      for (var k = 0; k < rings.length; k++) if (!rings[k].loose) { safe = rings[k]; break; }
      if (safe) px = safe.x;
    }
  }

  function clampX(x) { return Math.max(150, Math.min(W - 150, x)); }

  function sweepSpeed() { return 2.0 + c.level * 0.16; }
  function angleNow() { return SWEEP * Math.sin(c.sw); }
  function pivot() { return { x: c.x, y: shelfY(c.level) - PIV }; }
  function ringPos(i, rg) { return { x: rg.x, y: shelfY(i) + 62 }; }

  function fire() {
    if (c.phase !== 'run' || c.hook) { game.audio.play('se_tap', 0.12); return; }
    var th = angleNow();
    var dx = Math.sin(th), dy = -Math.cos(th);
    var pv = pivot();
    var shelf = c.shelves[c.level + 1];
    var best = null;
    if (shelf) {
      for (var i = 0; i < shelf.rings.length; i++) {
        var rg = shelf.rings[i];
        var rp = ringPos(c.level + 1, rg);
        var along = (rp.x - pv.x) * dx + (rp.y - pv.y) * dy;
        var perp = Math.abs((rp.x - pv.x) * dy - (rp.y - pv.y) * dx);
        if (along > 0 && along <= REACH && perp <= rg.r + 18) {
          if (!best || along < best.along) best = { ring: rg, along: along, perp: perp };
        }
      }
    }
    c.hook = { th: th, len: 0, phase: 'out', hit: best, nearPerp: 9999 };
    if (!best && shelf) {
      for (var j = 0; j < shelf.rings.length; j++) {
        var rq = ringPos(c.level + 1, shelf.rings[j]);
        var pp = Math.abs((rq.x - pv.x) * dy - (rq.y - pv.y) * dx) - shelf.rings[j].r;
        if (!shelf.rings[j].loose) c.hook.nearPerp = Math.min(c.hook.nearPerp, pp);
      }
    }
    game.audio.play('se_jump', 0.3);
  }

  function hookTip(h) {
    var pv = pivot();
    return { x: pv.x + Math.sin(h.th) * h.len, y: pv.y - Math.cos(h.th) * h.len };
  }

  function registerMiss(x, y, culprit) {
    c.misses++; c.chain = 0;
    if (c.misses >= MISS_MAX) { c.phase = 'stop'; c.stopT = 0.5; c.won = false; c.culprit = culprit; game.fx.flash('#ffffff', 0.12); return true; }
    game.feedback.bad(x, y - c.cam, { text: 'MISS', size: 44 });
    return false;
  }

  function stepHook(dt) {
    var h = c.hook;
    if (h.phase === 'out') {
      h.len += 2600 * dt;
      if (h.hit && h.len >= h.hit.along) {
        h.len = h.hit.along;
        var rp = ringPos(c.level + 1, h.hit.ring);
        if (h.hit.ring.loose) {
          h.hit.ring.gone = true;
          c.falling.push({ x: rp.x, y: rp.y - 60, vy: -200, rot: 0 });
          game.audio.play('se_break', 0.35);
          h.phase = 'back';
          registerMiss(rp.x, rp.y, { x: rp.x, y: rp.y, kind: 'book' });
          return;
        }
        var perfect = h.hit.perp <= 12;
        if (perfect) { c.perfects++; c.chain++; } else c.chain = 0;
        var pts = (perfect ? 200 : 100) * (h.hit.ring.gold ? 2 : 1) * (c.chain >= 3 ? 2 : 1);
        c.score += pts;
        game.feedback.good(rp.x, rp.y - c.cam, { text: perfect ? 'PERFECT' : 'GOOD', color: perfect ? STYLE.main[1] : STYLE.main[2], size: 48 });
        if (c.chain >= 3) game.fx.popup('x2', rp.x, rp.y - c.cam - 90, { color: STYLE.main[1], size: 42 });
        h.phase = 'pull';
        c.pullT = 0;
        c.from = { x: c.x, y: shelfY(c.level) };
        c.to = { x: rp.x, y: shelfY(c.level + 1) };
        game.audio.tone(392, 0.12, { wave: 'square', volume: 0.05, slide: 260 });
      } else if (!h.hit && h.len >= REACH) {
        h.phase = 'back';
        var tip = hookTip(h);
        game.audio.tone(140, 0.08, { wave: 'square', volume: 0.06 });
        if (registerMiss(tip.x, tip.y, { x: tip.x, y: tip.y, kind: 'air' })) return;
        if (h.nearPerp < 300) game.fx.popup('あと' + Math.max(1, Math.round(h.nearPerp / 3)) + 'mm', tip.x, tip.y - c.cam - 70, { color: STYLE.main[2], size: 32 });
      }
    } else if (h.phase === 'back') {
      h.len -= 2200 * dt;
      if (h.len <= 0) c.hook = null;
    } else if (h.phase === 'pull') {
      c.pullT += dt / 0.36;
      var u = Math.min(1, c.pullT);
      var e = u * u * (3 - 2 * u);
      c.x = c.from.x + (c.to.x - c.from.x) * e;
      h.len = Math.max(0, h.hit.along * (1 - e));
      if (u >= 1) {
        c.level++;
        c.x = c.to.x;
        c.hook = null;
        c.sw = c.x < W / 2 ? Math.PI / 2 : -Math.PI / 2;
        if (c.level === 5) { game.fx.popup('5 / ' + LEVELS, W / 2, H * 0.2, { color: STYLE.main[1], size: 60 }); game.audio.play('se_milestone', 0.45); }
        if (c.level >= LEVELS) { c.phase = 'stop'; c.stopT = 0.55; c.won = true; c.score += Math.round(c.clock) * 20; }
      }
    }
  }

  function advance(dt) {
    c.clock -= dt;
    if (!c.hook) c.sw += sweepSpeed() * dt;
    if (c.flashT > 0) c.flashT -= dt;
    for (var i = c.falling.length - 1; i >= 0; i--) {
      var f = c.falling[i];
      f.vy += 1600 * dt; f.y += f.vy * dt; f.rot += dt * 8;
      if (f.y - c.cam > H + 200) c.falling.splice(i, 1);
    }
    if (c.hook) stepHook(dt);
    var target = shelfY(c.level) - H * 0.66;
    if (c.phase === 'run' && c.hook && c.hook.phase === 'pull') target = shelfY(c.level + 1) - H * 0.66;
    c.cam += (target - c.cam) * Math.min(1, dt * 5);
    if (c.phase !== 'run') return;
    if (c.clock <= 0) {
      c.clock = 0; c.phase = 'stop'; c.stopT = 0.5; c.won = false;
      var nx = c.shelves[c.level + 1];
      var rg = nx && nx.rings[0];
      c.culprit = rg ? { x: rg.x, y: shelfY(c.level + 1) + 62, kind: 'ring' } : null;
      game.fx.flash('#ffffff', 0.12);
    }
  }

  function settle() {
    c.prevBest = game.best;
    var stats = { level: c.level, levels: LEVELS, perfect: c.perfects, misses: c.misses };
    c.score += c.level * 50;
    if (c.won) {
      game.feedback.good(c.x, shelfY(c.level) - 160 - c.cam, { text: 'CLEAR', color: STYLE.main[1], size: 72 });
      game.audio.play('se_success', 0.6);
      game.end.success(c.score, stats);
    } else {
      var k = c.culprit || { x: c.x, y: shelfY(c.level) - 200 };
      game.feedback.bad(k.x, k.y - c.cam, { text: 'MISS', size: 60 });
      game.audio.play('se_failure', 0.6);
      game.end.failure(stats);
    }
    ST = 'RESULT';
  }

  // ── 描画 ───────────────────────────────────────────
  function drawShelfWorld() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, STYLE.bg[0]], [0.5, STYLE.bg[1]], [1, STYLE.bg[2]]]);
    // 柱(金属の縁取り)
    game.draw.rect(0, 0, 64, H, '#2e1f15');
    game.draw.rect(W - 64, 0, 64, H, '#2e1f15');
    game.draw.rect(58, 0, 6, H, '#8a6a3a', 0.6);
    game.draw.rect(W - 64, 0, 6, H, '#8a6a3a', 0.6);
    for (var i = 0; i < c.shelves.length; i++) {
      var y = shelfY(i) - c.cam;
      if (y < -360 || y > H + 80) continue;
      var sh = c.shelves[i];
      for (var b = 0; b < sh.books.length; b++) {
        var bk = sh.books[b];
        game.draw.rect(bk.x, y - bk.h, bk.w, bk.h, bk.col);
        game.draw.rect(bk.x + 4, y - bk.h + 20, bk.w - 8, 6, STYLE.main[1], 0.5);
        game.draw.rect(bk.x, y - bk.h, 3, bk.h, '#ffffff', 0.08);
      }
      game.draw.rect(40, y, W - 80, 30, STYLE.main[0]);
      game.draw.rect(40, y, W - 80, 6, '#a07850');
      game.draw.rect(40, y + 30, W - 80, 10, NOIR, 0.5);
      if (i === LEVELS) {
        var lx = W * 0.5;
        game.draw.circle(lx, y - 250, 180 + Math.sin(t * 2) * 8, '#ffe8a0', 0.08);
        game.draw.circle(lx, y - 250, 90, '#ffe8a0', 0.14);
        game.draw.sprite(LAMP, { l: STYLE.accent[0], s: STYLE.main[1] }, lx, y - 220, 16, { anchor: 'center' });
      }
    }
    for (var g2 = 0; g2 < grain.length; g2++) {
      var gr = grain[g2];
      var gy = ((gr.y - c.cam * 0.5) % H + H) % H;
      game.draw.rect(gr.x, gy, 3, 3, '#ffffff', gr.a);
    }
  }

  function drawRings(hl) {
    var t = game.time.elapsed;
    var next = c.level + 1;
    for (var i = 1; i < c.shelves.length; i++) {
      var sh = c.shelves[i];
      for (var k = 0; k < sh.rings.length; k++) {
        var rg = sh.rings[k];
        if (rg.gone) continue;
        var p = ringPos(i, rg);
        var sx = p.x, sy = p.y - c.cam;
        if (sy < -80 || sy > H + 80) continue;
        var jit = rg.loose ? Math.sin(t * 40 + k) * 4 : 0;
        if (rg.loose) {
          game.draw.rect(sx - 24 + jit, sy - 230, 48, 196, '#7a2a24');
          for (var d = 0; d < 3; d++) game.draw.circle(sx + jit + Math.sin(t * 9 + d * 2) * 30, sy - 240 - ((t * 60 + d * 30) % 60), 6, '#c8b8a0', 0.4);
          if (Math.floor(t * 6) % 2 === 0) game.draw.rect(sx - 30 + jit, sy - 236, 60, 208, STYLE.accent[1], 0.25);
        }
        game.draw.line(sx + jit, sy - 32, sx + jit, sy - rg.r + 4, '#8a6a3a', 6);
        var isTarget = i === next && !rg.loose;
        var white = hl && c.culprit && Math.abs(c.culprit.x - rg.x) < 2 && i === next;
        var col = rg.gold ? '#ffd860' : (rg.loose ? '#c86040' : STYLE.main[1]);
        var rr = white ? rg.r * 1.5 : rg.r;
        if (isTarget) game.draw.circle(sx, sy, rr + 16 + Math.sin(t * 8) * 6, '#ffffff', 0.18);
        game.draw.circle(sx + jit, sy, rr, white ? '#ffffff' : col);
        game.draw.circle(sx + jit, sy, rr * 0.55, STYLE.bg[1]);
        game.draw.circle(sx + jit - rr * 0.4, sy - rr * 0.4, rr * 0.22, '#fff6d0', 0.7);
      }
    }
    for (var f = 0; f < c.falling.length; f++) {
      var fb = c.falling[f];
      var w2 = Math.abs(Math.cos(fb.rot)) * 40 + 12;
      game.draw.rect(fb.x - w2 / 2, fb.y - c.cam - 90, w2, 180, '#7a2a24');
    }
  }

  function drawElf(hl) {
    var t = game.time.elapsed;
    var y = shelfY(c.level) - c.cam;
    var x = c.x;
    var art = ELF_STAND;
    if (ST === 'RESULT' && !c.won) art = ELF_SLUMP;
    else if (c.hook && c.hook.phase === 'pull') {
      art = ELF_HANG;
      var e = Math.min(1, c.pullT);
      y = shelfY(c.level) - c.cam + (shelfY(c.level + 1) - shelfY(c.level)) * e * e;
    } else if (c.hook || (ST === 'RESULT' && c.won && Math.floor(t * 4) % 2 === 0)) art = ELF_REACH;
    var bob = art === ELF_STAND ? Math.sin(t * 4) * 3 : 0;
    // 鉤竿と振れ幅
    var pv = { x: x, y: y - PIV };
    if (c.phase === 'run' || ST === 'ATTRACT') {
      if (!c.hook) {
        var th = angleNow();
        game.draw.line(pv.x - Math.sin(SWEEP) * 150, pv.y - Math.cos(SWEEP) * 150, pv.x, pv.y, '#ffffff', 1);
        game.draw.line(pv.x + Math.sin(SWEEP) * 150, pv.y - Math.cos(SWEEP) * 150, pv.x, pv.y, '#ffffff', 1);
        game.draw.line(pv.x, pv.y, pv.x + Math.sin(th) * 170, pv.y - Math.cos(th) * 170, '#8a6a3a', 9);
        game.draw.circle(pv.x + Math.sin(th) * 170, pv.y - Math.cos(th) * 170, 13, STYLE.main[1]);
        for (var d = 1; d <= 5; d++) game.draw.circle(pv.x + Math.sin(th) * (170 + d * 60), pv.y - Math.cos(th) * (170 + d * 60), 4, '#ffffff', 0.35 - d * 0.05);
      }
    }
    if (c.hook) {
      var tip = { x: pv.x + Math.sin(c.hook.th) * c.hook.len, y: pv.y - Math.cos(c.hook.th) * c.hook.len };
      if (c.hook.phase === 'pull') { var rp = ringPos(c.level + 1, c.hook.hit.ring); tip = { x: rp.x, y: rp.y - c.cam }; }
      game.draw.line(x, y - PIV, tip.x, tip.y, '#d8c8a0', 4);
      game.draw.circle(tip.x, tip.y, 12, STYLE.main[1]);
    }
    game.draw.circle(x, y - 6, 40, NOIR, 0.4);
    var pal = hl ? { g: '#ffffff', f: '#ffffff', o: '#ffffff', e: '#ffffff', a: '#ffffff', b: '#ffffff', k: '#ffffff' } : ELF_PAL;
    game.draw.sprite(art, pal, x, y - 72 + bob, hl ? 18 : 14, { anchor: 'center' });
  }

  function drawFrame(hl) {
    drawShelfWorld();
    drawRings(hl);
    drawElf(hl && c.won);
    // 親指ゾーン: 鉤の発射盤
    var t = game.time.elapsed;
    game.draw.rect(0, H * 0.86, W, H * 0.14, NOIR, 0.55);
    game.draw.circle(W / 2, H * 0.92, 92, STYLE.main[1], c.hook ? 0.2 : 0.45 + 0.15 * Math.sin(t * 6));
    game.draw.circle(W / 2, H * 0.92, 60, STYLE.bg[1]);
    game.draw.circle(W / 2, H * 0.92, 30, c.hook ? '#5a4a3a' : STYLE.main[1]);
  }

  function lab(s, x, y, size, color) {
    game.draw.text(s, x + 3, y + 4, { size: size, color: NOIR, bold: true, align: 'center' });
    game.draw.text(s, x, y, { size: size, color: color, bold: true, align: 'center' });
  }

  function drawHud() {
    lab(c.level + ' / ' + LEVELS, 150, 80, 50, STYLE.main[2]);
    lab('SCORE ' + c.score, W - 250, 80, 36, STYLE.main[1]);
    game.draw.rect(80, 140, W - 160, 14, NOIR, 0.7);
    var f = Math.max(0, c.clock / TIME_LIMIT);
    game.draw.rect(80, 140, (W - 160) * f, 14, f < 0.25 ? STYLE.accent[1] : STYLE.accent[0]);
    for (var m = 0; m < MISS_MAX; m++) {
      game.draw.circle(W / 2 - 60 + m * 60, 196, 18, m < c.misses ? STYLE.accent[1] : '#3a2a20');
    }
    // 高度メーター
    game.draw.rect(W - 40, H * 0.25, 14, H * 0.5, NOIR, 0.7);
    var prog = c.level / LEVELS;
    game.draw.rect(W - 40, H * 0.75 - H * 0.5 * prog, 14, H * 0.5 * prog, STYLE.accent[0]);
  }

  // ── ATTRACT ボット ─────────────────────────────────
  var demo = { t: 0, n: 0, press: 0, hx: W / 2, hy: H * 0.92 };
  function botWant() {
    var shelf = c.shelves[c.level + 1];
    if (!shelf) return null;
    for (var i = 0; i < shelf.rings.length; i++) {
      if (shelf.rings[i].loose) continue;
      var rp = ringPos(c.level + 1, shelf.rings[i]);
      var pv = pivot();
      return Math.atan2(rp.x - pv.x, -(rp.y - pv.y));
    }
    return null;
  }
  function runDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 5.4;
    if (cyc < dt || demo.t <= dt) { c = freshClimb(); buildShelves(c); c.phase = 'run'; c.cam = shelfY(0) - H * 0.66; demo.n = 0; }
    if (demo.press > 0) demo.press -= dt;
    if (c.phase === 'run') {
      var want = botWant();
      var th = angleNow();
      var sloppy = demo.n === 2;
      if (want !== null && !c.hook && cyc > 0.4) {
        var off = sloppy ? (want > 0 ? -0.42 : 0.42) : 0;
        if (Math.abs(th - (want + off)) < 0.06) { demo.press = 0.2; fire(); demo.n++; }
      }
      advance(dt);
    } else if (c.phase === 'stop') { c.stopT -= dt; }
  }

  function begin() {
    c = freshClimb();
    buildShelves(c);
    c.cam = shelfY(0) - H * 0.66;
    ST = 'PLAYING';
    game.audio.play('se_coin', 0.5);
  }

  game.onTap(function () {
    if (ST === 'ATTRACT') { begin(); return; }
    if (ST === 'RESULT') { game.audio.play('se_tap', 0.3); ST = 'ATTRACT'; c = freshClimb(); buildShelves(c); demo.t = 0; return; }
    fire();
  });

  game.onUpdate(function (dt) {
    if (!c) { c = freshClimb(); buildShelves(c); }
    if (ST === 'ATTRACT') {
      runDemo(dt);
      drawFrame(false);
      game.draw.hand(demo.hx, demo.hy + 20, { press: demo.press > 0, scale: 14 });
      lab('SHELF HOOK', W / 2, H * 0.05 + 20, 82, STYLE.main[1]);
      lab('HI-SCORE ' + (game.best > 0 ? game.best : 0), W / 2, H * 0.1 + 26, 34, STYLE.main[2]);
      if (Math.floor(game.time.elapsed * 1.6) % 2 === 0) lab('► 100円 投入 ◄', W / 2, H * 0.83, 42, STYLE.main[1]);
      else lab('INSERT COIN', W / 2, H * 0.83, 36, STYLE.main[2]);
      return;
    }
    if (ST === 'RESULT') {
      drawFrame(false);
      if (c.won) {
        c.partyT -= dt;
        if (c.partyT <= 0) { c.partyT = 0.4; game.fx.burst(game.random(160, W - 160), game.random(H * 0.2, H * 0.5), { color: Math.random() < 0.5 ? STYLE.main[1] : '#ffe8a0', count: 18, speed: 420 }); }
      }
      game.draw.rect(0, H * 0.3, W, H * 0.3, NOIR, 0.78);
      lab(c.won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.355, 86, c.won ? STYLE.main[1] : STYLE.accent[1]);
      lab('SCORE ' + c.score, W / 2, H * 0.425, 52, STYLE.main[2]);
      lab('PERFECT ' + c.perfects + '    ' + c.level + ' / ' + LEVELS, W / 2, H * 0.475, 38, STYLE.accent[0]);
      if (!c.won) lab('あと' + (LEVELS - c.level) + '段!', W / 2, H * 0.53, 46, STYLE.main[1]);
      else if (c.score > c.prevBest) lab('NEW RECORD', W / 2, H * 0.53, 48, STYLE.main[1]);
      else lab('BEST ' + c.prevBest, W / 2, H * 0.53, 40, STYLE.main[2]);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) lab('TAP TO CONTINUE', W / 2, H * 0.83, 36, STYLE.main[2]);
      return;
    }
    if (c.phase === 'ready') {
      c.readyT -= dt;
      c.sw += sweepSpeed() * dt;
      if (c.readyT <= 0) { c.phase = 'run'; game.audio.play('se_tap', 0.3); }
    } else if (c.phase === 'run') {
      advance(dt);
    } else if (c.phase === 'stop') {
      c.stopT -= dt;
      if (c.stopT <= 0) settle();
    }
    drawFrame(c.phase === 'stop');
    if (c.phase === 'stop' && !c.won && c.culprit && c.culprit.kind !== 'ring') {
      game.draw.circle(c.culprit.x, c.culprit.y - c.cam, 70, '#ffffff', 0.45);
    }
    drawHud();
    if (c.phase === 'ready') lab(c.readyT > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.45, 96, STYLE.main[1]);
    if (c.phase === 'run' && c.level === 0 && !c.hook && c.clock > TIME_LIMIT - 2.5) {
      var want = botWant();
      if (want !== null && Math.abs(angleNow() - want) < 0.25) game.draw.hand(W / 2, H * 0.92 + 20, { press: true, scale: 12, alpha: 0.7 });
    }
  });

  game.onStart(function () {
    game.audio.melody([
      ['A3', 0.75], ['C4', 0.25], ['E4', 0.5], ['D4', 0.5], ['C4', 1], ['B3', 0.5], ['G3', 0.5],
      ['A3', 0.75], ['E4', 0.25], ['F4', 0.5], ['E4', 0.5], ['D4', 1], ['R', 1],
    ], {
      tempo: 108, wave: 'triangle', volume: 0.07, loop: true,
      bass: [['A2', 2], ['F2', 2], ['G2', 2], ['E2', 2]],
    });
    ST = 'ATTRACT';
    c = freshClimb();
    buildShelves(c);
    demo.t = 0;
  });
})(game);
