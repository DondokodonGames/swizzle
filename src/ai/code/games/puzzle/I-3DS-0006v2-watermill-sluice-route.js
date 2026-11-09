// I-3DS-0006v2-watermill-sluice-route.js
// 水車小屋の水門さばき — 札に並んだ矢印の順に水門の取っ手を払い、水を田・茶畑・畑・洗い場へ切り替えて送る
// 操作: 札の大きな矢印と同じ向き(上下左右)へ画面を払うと、水門がその向きの水路へ切り替わり水が流れる。後半は矢印が2つ・3つ並ぶので左から順に素早く払う。輪が縮み切る前に払い終える
// 終わり: 3つの組(1本×3 → 2本×3 → 3本×2)の切り替えを終えればCLEAR。逆の水路へ流す/輪が縮み切るを3回でGAME OVER
// @mechanic: swipe_direction
// @theme: watermill_sluice_route
// 世界観: 山里の水車小屋の水路の分かれ目で、水車番が村から届く順番札の矢印どおりに水門の取っ手を払い、田・茶畑・野菜畑・洗い場へ水を次々切り替えて回す
// 残るもの: 正誤(CLEAR/GAME OVER) + 切り替えた本数・最速の払い・得点
// スタイル: 90s LOW POLY

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s LOW POLY: 面ベタ塗り(横1pxストリップ)、輪郭は line、頂点ジッター、遠景はフォグ色
  var STYLE = { bg: ['#8ab0c8', '#c8d8c0', '#5a7a4a'], main: ['#3a8ad8', '#c89a5a', '#7ab84a'], accent: ['#f8e070', '#e85a4a'] };
  var C = {
    fog: STYLE.bg[0], haze: STYLE.bg[1], grass: STYLE.bg[2], water: STYLE.main[0], wood: STYLE.main[1], leaf: STYLE.main[2],
    gold: STYLE.accent[0], bad: STYLE.accent[1], ink: '#1a2228', dirt: '#8a6a4a', white: '#f4f4ec', ok: '#8af0a0',
  };

  var GAME_TITLE = 'SLUICE ROUTE';
  var LIVES = 3;
  var TIME_LIMIT = 15;
  var HUB = { x: 540, y: Math.round(H * 0.52) };
  var DIRS = ['up', 'down', 'left', 'right'];
  var DV = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
  var DEST = { up: { x: 540, y: 380 }, down: { x: 540, y: Math.round(H * 0.8) }, left: { x: 120, y: Math.round(H * 0.52) }, right: { x: 960, y: Math.round(H * 0.52) } };

  // 組ごとの札(矢印の数)と輪の長さ
  var SETS = [
    { len: 1, count: 3, win: 1.3 }, { len: 2, count: 3, win: 1.7 }, { len: 3, count: 2, win: 2.0 },
  ];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var si, ri, plan, pi, winT, winMax, lives, score, switched, fastest, readyT, over, won, outroT, stopT, focus, playT, gateDir, flows, mood, gapT, milestone;

  function initGame() {
    si = 0; ri = 0; lives = LIVES; score = 0; switched = 0; fastest = 9; readyT = 0.8; over = false; won = false; outroT = 0; stopT = 0; focus = null; playT = 0;
    gateDir = 'down'; flows = []; mood = 0; gapT = 0; milestone = false;
    newPlan();
  }

  function newPlan() {
    var st = SETS[si];
    plan = [];
    var last = gateDir;
    for (var i = 0; i < st.len; i++) {
      var d;
      do { d = DIRS[Math.floor(game.random(0, 4)) % 4]; } while (d === last);
      plan.push(d); last = d;
    }
    pi = 0; winT = st.win; winMax = st.win;
    game.audio.tone('A5', 0.06, { wave: 'triangle', volume: 0.07 });
  }

  // 払い(本番もデモも同じ)。戻り値: 'ok' / 'bad' / null
  function swipe(dir, demo) {
    if (pi >= plan.length) return null;
    gateDir = dir;
    flows.push({ dir: dir, t: 0, bad: dir !== plan[pi] });
    game.audio.tone(dir === 'up' ? 660 : dir === 'down' ? 440 : dir === 'left' ? 520 : 590, 0.06, { wave: 'square', volume: 0.07, slide: 120 });
    if (dir === plan[pi]) {
      pi++; switched++;
      mood = 0.6;
      var took = winMax - winT;
      if (pi >= plan.length) {
        var pts = 100 * plan.length + Math.round(winT * 60);
        score += pts;
        if (took < fastest) fastest = took;
        mood = 1;
        game.feedback.good(DEST[dir].x, DEST[dir].y - 40, { text: winT > winMax * 0.5 ? 'PERFECT' : 'GOOD', color: C.ok, size: 56 });
        if (!demo && switched >= 9 && !milestone) {
          milestone = true;
          game.fx.popup('NICE', W / 2, H * 0.3, { color: C.gold, size: 64 });
          game.audio.play('se_milestone', 0.45);
        }
        return 'ok';
      }
      game.fx.burst(DEST[dir].x, DEST[dir].y, { color: C.water, count: 8, speed: 200 });
      return null;
    }
    fail(DEST[dir], demo);
    return 'bad';
  }

  function fail(at, demo) {
    focus = { x: at.x, y: at.y };
    stopT = 0.45;
    mood = -1;
    game.feedback.bad(at.x, at.y - 40, { text: 'MISS', shake: demo ? 6 : 12 });
    game.audio.play('se_break', 0.3);
    pi = plan.length;
    if (!demo) {
      lives--;
      if (lives <= 0) { over = true; won = false; outroT = 1.4; game.audio.stopBgm(); game.audio.play('se_failure', 0.5); }
    }
  }

  // 札の進行。戻り値: 組が全部終わったか
  function stepPlan(dt, demo) {
    for (var f = flows.length - 1; f >= 0; f--) { flows[f].t += dt; if (flows[f].t > 1.2) flows.splice(f, 1); }
    if (gapT > 0) {
      gapT -= dt;
      if (gapT <= 0) newPlan();
      return false;
    }
    if (pi >= plan.length) {
      ri++;
      if (ri >= SETS[si].count) { ri = 0; si++; if (si >= SETS.length) return true; }
      gapT = 0.35;
      return false;
    }
    winT -= dt;
    if (winT <= 0) { winT = 0; fail({ x: HUB.x, y: HUB.y }, demo); }
    return false;
  }

  function finish(ok) {
    over = true; won = ok; outroT = 1.5;
    game.audio.stopBgm();
    if (ok) {
      score += lives * 150;
      mood = 2;
      game.audio.play('se_success', 0.55);
      for (var i = 0; i < DIRS.length; i++) game.fx.burst(DEST[DIRS[i]].x, DEST[DIRS[i]].y, { color: C.water, count: 16, speed: 360 });
      game.fx.burst(HUB.x, HUB.y, { color: C.gold, count: 30, speed: 460 });
      game.fx.flash(C.white, 0.2);
    } else {
      game.audio.play('se_failure', 0.5);
    }
  }

  // ---- 入力 ----
  game.onSwipe(function(dir) {
    if (state !== S.PLAYING || over || readyT > 0 || stopT > 0 || gapT > 0) { game.audio.tone(180, 0.03, { wave: 'triangle', volume: 0.03 }); return; }
    swipe(dir, false);
  });
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { game.audio.play('se_tap'); state = S.ATTRACT; initGame(); demo.t = 0; return; }
    game.audio.tone(240, 0.04, { wave: 'triangle', volume: 0.04 });
    game.fx.burst(x, y, { color: C.white, count: 3, speed: 80 });
  });

  // ---- 描画 ----
  function label(str, x, y, sz, col) {
    game.draw.text(str, x + 4, y + 4, { size: sz, color: C.ink, bold: true, align: 'center' });
    game.draw.text(str, x, y, { size: sz, color: col, bold: true, align: 'center' });
  }

  // 多角形の面塗り(横ストリップ)
  function poly(pts, col, alpha) {
    var minY = 1e9, maxY = -1e9, i;
    for (i = 0; i < pts.length; i++) { minY = Math.min(minY, pts[i][1]); maxY = Math.max(maxY, pts[i][1]); }
    for (var y = Math.floor(minY); y < maxY; y += 3) {
      var xs = [];
      for (i = 0; i < pts.length; i++) {
        var a = pts[i], b = pts[(i + 1) % pts.length];
        if ((a[1] <= y && b[1] > y) || (b[1] <= y && a[1] > y)) xs.push(a[0] + (y - a[1]) * (b[0] - a[0]) / (b[1] - a[1]));
      }
      xs.sort(function(p, q) { return p - q; });
      for (var k = 0; k + 1 < xs.length; k += 2) game.draw.rect(xs[k], y, xs[k + 1] - xs[k], 3, col, alpha);
    }
  }

  function jit(v) { return v + Math.sin(game.time.elapsed * 20 + v) * 1.5; }

  var KEEPER_A = ['..hhhh..', '.hhhhhh.', 'hhhhhhhh', '.ssssss.', '.sesses.', '.ssmmss.', 'jjjjjjjj', 'jjjjjjjj', '.jjjjjj.', '.pp..pp.'];
  var KEEPER_B = ['..hhhh..', '.hhhhhh.', 'hhhhhhhh', '.ssssss.', '.sesses.', '.ssooss.', 'jjjjjjjj', 'sjjjjjjs', '.jjjjjj.', '.pp..pp.'];
  var ARROW = ['...##...', '..####..', '.######.', '########', '...##...', '...##...', '...##...', '...##...'];

  function drawLand() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, C.haze], [0.3, '#9ab88a'], [1, C.grass]]);
    // 遠景の山(フォグ色の面)
    poly([[0, 300], [180, 240], [360, 290], [560, 230], [760, 280], [1080, 240], [1080, 330], [0, 330]], C.fog, 0.6);
    // 水路(十字)
    var w = 90;
    game.draw.rect(HUB.x - w / 2, 330, w, DEST.down.y - 330, C.dirt);
    game.draw.rect(60, HUB.y - w / 2, W - 120, w, C.dirt);
    game.draw.rect(HUB.x - w / 2 + 10, 330, w - 20, DEST.down.y - 330, '#4a3a2a');
    game.draw.rect(60, HUB.y - w / 2 + 10, W - 120, w - 20, '#4a3a2a');
    // 水車と樋(右上から分かれ目へ)
    var wx = 870, wy = 560;
    poly([[jit(760), jit(640)], [jit(800), jit(600)], [jit(HUB.x + 40), jit(HUB.y - 30)], [jit(HUB.x), jit(HUB.y - 50)]], C.wood);
    poly([[wx - 120, wy - 150], [wx + 120, wy - 150], [wx + 140, wy - 60], [wx - 140, wy - 60]], '#7a5a3a');
    poly([[wx - 150, wy - 60], [wx + 150, wy - 60], [wx + 150, wy + 60], [wx - 150, wy + 60]], '#a88a5a');
    var rot = t * 1.6;
    for (var k = 0; k < 8; k++) {
      var a = rot + k * Math.PI / 4;
      var x1 = wx - 160 + Math.cos(a) * 20, y1 = wy + 20 + Math.sin(a) * 20;
      var x2 = wx - 160 + Math.cos(a) * 110, y2 = wy + 20 + Math.sin(a) * 110;
      game.draw.line(x1, y1, x2, y2, '#5a3a20', 10);
      poly([[x2 - 14, y2 - 14], [x2 + 14, y2 - 14], [x2 + 14, y2 + 14], [x2 - 14, y2 + 14]], C.wood);
    }
    game.draw.circle(wx - 160, wy + 20, 26, '#5a3a20');
  }

  function drawDests() {
    var t = game.time.elapsed;
    var want = pi < plan.length && gapT <= 0 ? plan[pi] : null;
    for (var i = 0; i < DIRS.length; i++) {
      var d = DIRS[i], p = DEST[d];
      var hl = want === d && Math.floor(t * 8) % 2 === 0;
      var col = d === 'up' ? '#5a9a4a' : d === 'left' ? '#9ac85a' : d === 'right' ? '#c8a85a' : '#8aa8c8';
      poly([[p.x - 110, p.y - 70], [p.x + 110, p.y - 80], [p.x + 120, p.y + 70], [p.x - 120, p.y + 80]], C.ink);
      poly([[p.x - 100, p.y - 60], [p.x + 100, p.y - 70], [p.x + 110, p.y + 60], [p.x - 110, p.y + 70]], col);
      if (hl) game.draw.rect(p.x - 110, p.y - 70, 220, 140, C.gold, 0.35);
      // 作物の列
      for (var r = 0; r < 4; r++) game.draw.rect(p.x - 80 + r * 46, p.y - 40, 14, 80, d === 'down' ? C.white : '#3a7a2a', 0.8);
    }
  }

  function drawFlows() {
    for (var i = 0; i < flows.length; i++) {
      var f = flows[i];
      var k = Math.min(1, f.t / 0.3);
      var v = DV[f.dir], p = DEST[f.dir];
      var len = Math.abs(v[0]) ? Math.abs(p.x - HUB.x) : Math.abs(p.y - HUB.y);
      var col = f.bad ? C.bad : C.water;
      var a = Math.max(0, 1 - Math.max(0, f.t - 0.6) / 0.6);
      if (v[0]) game.draw.rect(v[0] > 0 ? HUB.x : HUB.x - len * k, HUB.y - 26, len * k, 52, col, 0.85 * a);
      else game.draw.rect(HUB.x - 26, v[1] > 0 ? HUB.y : HUB.y - len * k, 52, len * k, col, 0.85 * a);
      if (k >= 1 && f.bad) game.draw.circle(p.x, p.y, 60 + f.t * 40, C.bad, 0.3 * a);
    }
  }

  function drawHub() {
    var t = game.time.elapsed;
    // 分かれ目の水門と取っ手(最後に払った向きを指す)
    poly([[HUB.x - 80, HUB.y - 80], [HUB.x + 80, HUB.y - 80], [HUB.x + 80, HUB.y + 80], [HUB.x - 80, HUB.y + 80]], '#6a5a4a');
    game.draw.circle(HUB.x, HUB.y, 56, C.water);
    var v = DV[gateDir];
    game.draw.line(HUB.x, HUB.y, HUB.x + v[0] * 110, HUB.y + v[1] * 110, '#3a2a1a', 22);
    game.draw.line(HUB.x, HUB.y, HUB.x + v[0] * 110, HUB.y + v[1] * 110, C.wood, 12);
    game.draw.circle(HUB.x + v[0] * 110, HUB.y + v[1] * 110, 22, C.bad);
    // 残り時間の輪(縮む)
    if (pi < plan.length && gapT <= 0) {
      var k = winT / winMax;
      var r = 90 + 80 * k;
      var segs = 32;
      for (var i = 0; i < segs; i++) {
        if (i / segs > k) break;
        var a1 = -Math.PI / 2 + (i / segs) * Math.PI * 2, a2 = -Math.PI / 2 + ((i + 1) / segs) * Math.PI * 2;
        game.draw.line(HUB.x + Math.cos(a1) * r, HUB.y + Math.sin(a1) * r, HUB.x + Math.cos(a2) * r, HUB.y + Math.sin(a2) * r, k < 0.3 ? C.bad : C.gold, 10);
      }
    }
    var fr = Math.floor(t * 3) % 2 === 0 ? KEEPER_A : KEEPER_B;
    game.draw.sprite(fr, { h: '#c8a860', s: '#e8c098', e: C.ink, m: mood < 0 ? '#6a3a3a' : '#c05050', o: '#c05050', j: '#3a5a8a', p: '#2a2a3a' }, HUB.x + 200, HUB.y + 190 - (mood > 0.5 ? Math.abs(Math.sin(t * 10)) * 18 : 0), 15, { anchor: 'center' });
  }

  // 順番札: 左から順に払う。済んだ矢印は緑、今の矢印は大きく明滅
  function arrowSprite(dir, x, y, px, col) {
    var rows = ARROW;
    if (dir === 'up') game.draw.sprite(rows, { '#': col }, x, y, px, { anchor: 'center' });
    else if (dir === 'down') game.draw.sprite(rows, { '#': col }, x, y, px, { anchor: 'center', flipY: true });
    else {
      // 横向き: 行列を転置して描く
      var side = [];
      for (var c = 0; c < 8; c++) { var line = ''; for (var r = 0; r < 8; r++) line += rows[r][c]; side.push(line); }
      game.draw.sprite(side, { '#': col }, x, y, px, { anchor: 'center', flipX: dir === 'right' });
    }
  }

  function drawPlan() {
    var t = game.time.elapsed;
    var bx = 250, by = 560;
    var n = plan.length;
    var bw = 120 + n * 120;
    poly([[bx - bw / 2, by - 90], [bx + bw / 2, by - 95], [bx + bw / 2 + 6, by + 85], [bx - bw / 2 - 4, by + 90]], '#5a3a20');
    poly([[bx - bw / 2 + 12, by - 78], [bx + bw / 2 - 12, by - 82], [bx + bw / 2 - 8, by + 74], [bx - bw / 2 + 10, by + 78]], '#e8d8b0');
    game.draw.line(bx, by + 90, bx, by + 220, '#5a3a20', 14);
    for (var i = 0; i < n; i++) {
      var ax = bx - (n - 1) * 60 + i * 120;
      var cur = i === pi && gapT <= 0;
      var col = i < pi ? C.ok : (cur ? (Math.floor(t * 8) % 2 ? C.bad : '#c83a2a') : '#7a6a5a');
      arrowSprite(plan[i], ax, by, cur ? 13 : 10, col);
    }
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 230, C.ink, 0.8);
    label('SCORE ' + score, 260, 80, 46, C.white);
    var total = 0, idx = 0;
    for (var s = 0; s < SETS.length; s++) total += SETS[s].count;
    for (var s2 = 0; s2 < si; s2++) idx += SETS[s2].count;
    idx += ri;
    for (var i = 0; i < total; i++) {
      var col = i < idx ? C.water : (i === idx ? C.gold : '#4a5a5a');
      game.draw.rect(90 + i * 62, 150, 44, 44, col);
    }
    label(Math.min(idx, total) + ' / ' + total, 720, 190, 36, C.white);
    for (var l = 0; l < LIVES; l++) {
      var on = l < lives;
      poly([[830 + l * 80, 40], [860 + l * 80, 100], [800 + l * 80, 100]], on ? C.water : '#4a5a5a');
    }
  }

  function drawScene() {
    drawLand();
    drawDests();
    drawFlows();
    drawHub();
    drawPlan();
    if (focus && stopT > 0) {
      game.draw.circle(focus.x, focus.y, 130, C.white, 0.35);
      game.draw.circle(focus.x, focus.y, 80, C.white, 0.35);
    }
  }

  // ---- ATTRACT: ゴーストの手が札どおりに払う(3枚目はわざと逆へ払って水があふれる) ----
  var demo = { t: 0, k: 0, x: HUB.x, y: HUB.y, sx: 0, sy: 0, press: false, dir: null, cnt: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    if (demo.t <= dt || readyT > 0 || si > 0) { initGame(); readyT = 0; demo.cnt = 0; demo.dir = null; }
    if (stopT > 0) { stopT -= dt; if (stopT <= 0) focus = null; }
    else stepPlan(dt, true);
    if (demo.dir) {
      demo.k += dt / 0.22;
      var v = DV[demo.dir];
      demo.x = HUB.x + v[0] * 260 * Math.min(1, demo.k);
      demo.y = HUB.y + 120 + v[1] * 260 * Math.min(1, demo.k);
      demo.press = demo.k < 1;
      if (demo.k >= 1) {
        demo.cnt++;
        var r = swipe(demo.dir, true);
        if (r === 'bad' || demo.cnt > 3) { lives = LIVES; }
        demo.dir = null;
      }
    } else if (pi < plan.length && gapT <= 0 && stopT <= 0 && winT < winMax - 0.3) {
      var want = plan[pi];
      // 3回目は逆向きへ払う(失敗例)
      if (demo.cnt % 3 === 2) want = want === 'up' ? 'down' : want === 'down' ? 'up' : want === 'left' ? 'right' : 'left';
      demo.dir = want; demo.k = 0;
    } else { demo.x = HUB.x; demo.y = HUB.y + 120; demo.press = false; }
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;
    mood += (0 - mood) * Math.min(1, dt * 1.5);

    if (state === S.ATTRACT) {
      stepDemo(dt);
      drawScene();
      game.draw.hand(demo.x, demo.y, { press: demo.press, scale: 15 });
      game.draw.rect(0, 0, W, 230, C.ink, 0.8);
      label(GAME_TITLE, W / 2, 105, 84 + Math.sin(t * 3) * 3, C.gold);
      label('HI-SCORE ' + (game.best > 0 ? game.best : 0), W / 2, 190, 36, C.white);
      if (Math.floor(t * 2) % 2 === 0) label('► 100円 投入 ◄', W / 2, H * 0.9, 52, C.gold);
      else label('TAP TO START', W / 2, H * 0.9, 46, C.white);
      return;
    }

    if (state === S.RESULT) {
      drawScene();
      game.draw.rect(0, H * 0.3, W, H * 0.22, C.ink, 0.8);
      label(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.36, 96, won ? C.ok : C.bad);
      label('SCORE ' + score, W / 2, H * 0.42, 52, C.white);
      label(switched + ' / 15', W / 2, H * 0.465, 40, C.water);
      if (score > game.best && score > 0) label('NEW RECORD', W / 2, H * 0.505, 46, C.gold);
      else label('BEST ' + Math.max(game.best, score), W / 2, H * 0.505, 36, C.white);
      if (!won) label('あと' + Math.max(1, 15 - switched) + '本!', W / 2, H * 0.28, 50, C.gold);
      if (Math.floor(t * 2) % 2 === 0) label('TAP TO CONTINUE', W / 2, H * 0.6, 36, C.white);
      return;
    }

    // ---- PLAYING ----
    if (over) {
      outroT -= dt;
      if (stopT > 0) stopT -= dt;
      if (outroT <= 0) {
        state = S.RESULT;
        var stats = { switched: switched, fastest: fastest < 9 ? Math.round(fastest * 1000) : 0, lives: lives };
        if (won) game.end.success(score, stats);
        else game.end.failure(stats);
      }
    } else if (readyT > 0) {
      readyT -= dt;
      if (readyT <= 0) { game.audio.play('se_tap', 0.4); newPlan(); }
    } else if (stopT > 0) {
      stopT -= dt;
      if (stopT <= 0) focus = null;
    } else {
      playT += dt;
      if (stepPlan(dt, false)) finish(true);
      else if (!over && playT >= TIME_LIMIT + 3) finish(lives > 0);
    }

    drawScene();
    drawHud();
    if (readyT > 0) label(readyT > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.42, 100, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([
      ['D5', 0.5], ['F5', 0.5], ['G5', 0.5], ['A5', 0.5], ['G5', 1], ['D5', 1],
      ['C5', 0.5], ['D5', 0.5], ['F5', 0.5], ['D5', 0.5], ['A4', 2],
    ], { tempo: 126, wave: 'triangle', volume: 0.05, loop: true, bass: [['D3', 2], ['A2', 2], ['C3', 2], ['D3', 2]] });
    state = S.ATTRACT;
    initGame();
  });
})(game);
