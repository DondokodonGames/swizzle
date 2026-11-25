// I-Wii-0007v2-dojo-grain-chop.js
// 木目割り演武 — 先輩が掲げる板の木目の向き(横・縦・斜め2方向)を見て、その筋に沿って指を払い、手刀で板を割る
// 操作: 板の木目の筋と同じ向きに画面を素早く払う(向きは筋に沿っていればどちら向きでもよい)。筋を横切る向きに払うと板は割れず手がしびれる(失敗1)。板は下の帯が縮み切ると下ろされる(失敗1)。後半は2人の先輩が左右に1枚ずつ掲げるので、割る板の上を払う
// 終わり: 15秒以内に10枚割ればCLEAR。失敗3つ/時間切れでGAME OVER
// @mechanic: swipe_direction
// @theme: karate_dojo_board_break
// 世界観: 空手道場の演武会で、少年部の門下生が先輩の掲げる板の木目の向きを一瞬で見て、筋に沿って手刀を払い次々と板を割っていく
// 残るもの: 正誤(CLEAR/GAME OVER) + スコア(割った枚数・PERFECT数・失敗数)
// スタイル: 2010s FLAT MOBILE

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2010s FLAT MOBILE: 影なしのベタ塗り、丸い角、大きい余白、判定はUIの色変化で示す
  var STYLE = { bg: ['#f3ead8', '#e6d6b8', '#cdb48a'], main: ['#d9a35a', '#2f3a4a', '#ffffff'], accent: ['#e8483a', '#2fb58a'] };
  var C = {
    wall: STYLE.bg[0], wall2: STYLE.bg[1], mat: STYLE.bg[2], wood: STYLE.main[0], navy: STYLE.main[1], white: STYLE.main[2],
    red: STYLE.accent[0], green: STYLE.accent[1], grain: '#a8723a', woodHi: '#ecc283', skin: '#f2c9a0', ink: '#22262e', gold: '#f2b632',
  };

  var GAME_TITLE = 'GRAIN CHOP';
  var TIME_LIMIT = 15;
  var NEEDED = 10;
  var MAX_MISS = 3;
  var BOARD_Y = Math.round(H * 0.42);
  var KID_Y = Math.round(H * 0.8);
  var ANGLES = [0, 45, 90, 135];       // 画面座標の木目の向き(度)。45=右下がり, 135=右上がり

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var seq, seqIdx, boards, gapT, broken, misses, perfects, chopT, stingT, stopT, stopBoard, trail, stroke;
  var score, countIn, over, won, endT, prevBest, playT, timeUp;

  function label(str, x, y, sz, color) {
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: 'center' });
  }

  // 門下生(白い道着・黄帯): 構え/手刀/しびれ/喜び
  var KID = [
    ['...kkkk...', '..kkkkkk..', '..ksssk...', '..sesse...', '...sms....', '.wwwwwwww.', 'sww.ww.wws', '..wwwwww..', '..yyyyyy..', '..ww..ww..', '..ww..ww..', '.ss....ss.'],
    ['...kkkk..s', '..kkkkkkss', '..ksssk.w.', '..sesse.w.', '...sms.w..', '.wwwwwww..', 'sww.ww....', '..wwwwww..', '..yyyyyy..', '..ww..ww..', '..ww..ww..', '.ss....ss.'],
    ['...kkkk...', '..kkkkkk..', '..ksssk...', '..sxssx...', '...sos....', '.wwwwwwww.', 'sww.ww.ww.', '..wwwwww.s', '..yyyyyy.s', '..ww..ww..', '..ww..ww..', '.ss....ss.'],
    ['s..kkkk..s', 'w.kkkkkk.w', 'w.ksssk..w', '.wsesse.w.', '..wsmsw...', '..wwwwww..', '..wwwwww..', '..wwwwww..', '..yyyyyy..', '..ww..ww..', '.ww....ww.', 'ss......ss'],
  ];
  var KID_PAL = { k: '#22262e', s: '#f2c9a0', e: '#22262e', x: '#22262e', m: '#c0504a', o: '#c0504a', w: '#ffffff', y: '#f2b632' };
  // 板を掲げる先輩(板の上に頭、下に脚)
  var SENIOR_HEAD = ['..kkkk..', '.kkkkkk.', '.ksssks.', '.sesses.', '..smms..'];
  var SENIOR_LEGS = ['.wwwwww.', '.bbbbbb.', '.ww..ww.', '.ww..ww.', 'ss....ss'];
  var SENIOR_PAL = { k: '#22262e', s: '#e8bc90', e: '#22262e', m: '#a04040', w: '#ffffff', b: '#22262e' };

  // ── 幾何(板の木目・割れ) ──
  function rad(a) { return a * Math.PI / 180; }
  function clipSeg(cx, cy, dx, dy, x0, y0, x1, y1) {
    // Liang–Barsky: 無限直線 c + t d を矩形でクリップ
    var t0 = -1e9, t1 = 1e9;
    var p = [-dx, dx, -dy, dy], q = [cx - x0, x1 - cx, cy - y0, y1 - cy];
    for (var i = 0; i < 4; i++) {
      if (Math.abs(p[i]) < 1e-9) { if (q[i] < 0) return null; continue; }
      var r = q[i] / p[i];
      if (p[i] < 0) t0 = Math.max(t0, r); else t1 = Math.min(t1, r);
    }
    if (t0 > t1) return null;
    return [cx + dx * t0, cy + dy * t0, cx + dx * t1, cy + dy * t1];
  }
  function fillPoly(pts, col, alpha) {
    var minY = 1e9, maxY = -1e9, i;
    for (i = 0; i < pts.length; i++) { minY = Math.min(minY, pts[i][1]); maxY = Math.max(maxY, pts[i][1]); }
    for (var y = minY; y < maxY; y += 4) {
      var yy = y + 2, xa = 1e9, xb = -1e9;
      for (i = 0; i < pts.length; i++) {
        var a = pts[i], b = pts[(i + 1) % pts.length];
        if ((a[1] <= yy && b[1] > yy) || (b[1] <= yy && a[1] > yy)) {
          var x = a[0] + (b[0] - a[0]) * (yy - a[1]) / (b[1] - a[1]);
          xa = Math.min(xa, x); xb = Math.max(xb, x);
        }
      }
      if (xb > xa) game.draw.rect(xa, y, xb - xa, 4, col, alpha);
    }
  }
  function halfOf(bd, side) {
    // 板の矩形を木目の線で2分した片側の多角形
    var x0 = bd.x - bd.w / 2, y0 = bd.y - bd.h / 2, x1 = bd.x + bd.w / 2, y1 = bd.y + bd.h / 2;
    var poly = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
    var nx = -Math.sin(rad(bd.ang)), ny = Math.cos(rad(bd.ang));
    var out = [];
    for (var i = 0; i < 4; i++) {
      var a = poly[i], b = poly[(i + 1) % 4];
      var da = ((a[0] - bd.x) * nx + (a[1] - bd.y) * ny) * side, db = ((b[0] - bd.x) * nx + (b[1] - bd.y) * ny) * side;
      if (da >= 0) out.push(a);
      if ((da >= 0) !== (db >= 0)) { var t = da / (da - db); out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]); }
    }
    return out;
  }

  function buildSeq() {
    var s = [], prev = -1;
    for (var i = 0; i < 8; i++) {
      var a;
      do { a = ANGLES[Math.floor(Math.random() * 4)]; } while (a === prev);
      prev = a;
      s.push([{ x: W / 2, ang: a, hold: 1.6 - 0.07 * i }]);
    }
    for (var j = 0; j < 2; j++) {
      var a1 = ANGLES[Math.floor(Math.random() * 4)], a2;
      do { a2 = ANGLES[Math.floor(Math.random() * 4)]; } while (a2 === a1);
      s.push([{ x: W * 0.27, ang: a1, hold: 2.2 }, { x: W * 0.73, ang: a2, hold: 2.2 }]);
    }
    return s;
  }

  function spawnGroup() {
    if (seqIdx >= seq.length) { boards = []; return; }
    var g = seq[seqIdx++];
    boards = [];
    for (var i = 0; i < g.length; i++) {
      var dbl = g.length > 1;
      boards.push({ x: g[i].x, y: BOARD_Y, w: dbl ? 340 : 440, h: dbl ? 260 : 320, ang: g[i].ang, hold: g[i].hold, t: 0, enter: 0.2, st: 'up', fly: 0, flash: 0 });
    }
    game.audio.tone(392, 0.05, { wave: 'triangle', volume: 0.08 });
  }

  function resetRun(demoSeq) {
    seq = demoSeq || buildSeq(); seqIdx = 0; gapT = 0; broken = 0; misses = 0; perfects = 0;
    chopT = 0; stingT = 0; stopT = 0; stopBoard = null; trail = []; stroke = null;
    spawnGroup();
  }

  function initGame() {
    resetRun(null);
    score = 0; countIn = 0.8; over = false; won = false; endT = 0; prevBest = game.best; playT = 0; timeUp = false;
  }

  // ── 判定(本番・デモ共通) ──
  function judgeStroke(x0, y0, x1, y1) {
    var dx = x1 - x0, dy = y1 - y0, dist = Math.hypot(dx, dy);
    if (dist < 110) return 'tap';
    var mx = (x0 + x1) / 2, target = null, bd = 1e9;
    for (var i = 0; i < boards.length; i++) {
      var b = boards[i];
      if (b.st !== 'up' || b.enter > 0) continue;
      var d = Math.abs(b.x - mx);
      if (d < bd) { bd = d; target = b; }
    }
    if (!target) return 'none';
    var a = Math.atan2(dy, dx) * 180 / Math.PI;
    a = ((a % 180) + 180) % 180;
    var diff = Math.abs(a - target.ang);
    diff = Math.min(diff, 180 - diff);
    if (diff <= 22.5) { breakBoard(target); return 'ok'; }
    wrongStroke(target);
    return 'wrong';
  }

  function breakBoard(b) {
    b.st = 'broken'; b.fly = 0;
    broken++; chopT = 0.3;
    var quick = b.t < b.hold * 0.45;
    var pts = 100 + Math.round(Math.max(0, 1 - b.t / b.hold) * 100);
    if (state === S.PLAYING) { score += pts; if (quick) perfects++; }
    game.audio.play('se_break', 0.5);
    game.feedback.good(b.x, b.y - b.h / 2 - 40, { text: (quick ? 'PERFECT +' : 'GOOD +') + pts, color: quick ? C.gold : C.green, size: 52, count: 14 });
    if (state === S.PLAYING && (broken === 5 || broken === NEEDED - 1)) {
      game.audio.play('se_milestone', 0.45);
      game.fx.popup(broken + '/' + NEEDED, W / 2, Math.round(H * 0.2), { color: C.red, size: 84 });
    }
  }

  function wrongStroke(b) {
    stingT = 0.5;
    b.flash = 0.25;
    game.audio.tone(140, 0.12, { wave: 'square', volume: 0.12, slide: 60 });
    addMiss(b, 'MISS');
  }

  function addMiss(b, word) {
    misses++;
    if (state === S.PLAYING && misses >= MAX_MISS) {
      // hit-stop: 失敗の板を白く光らせて拡大してから結果へ
      stopT = 0.45; stopBoard = b; b.flash = 1;
      return;
    }
    game.feedback.bad(b.x, b.y - b.h / 2 - 30, { text: word });
  }

  function stepBoards(dt) {
    if (chopT > 0) chopT -= dt;
    if (stingT > 0) stingT -= dt;
    var alive = 0;
    for (var i = 0; i < boards.length; i++) {
      var b = boards[i];
      if (b.flash > 0 && b !== stopBoard) b.flash -= dt;
      if (b.st === 'up') {
        alive++;
        if (b.enter > 0) { b.enter -= dt; continue; }
        var before = b.hold - b.t;
        b.t += dt;
        var left = b.hold - b.t;
        if (before > 0.6 && left <= 0.6) game.audio.tone(988, 0.05, { wave: 'square', volume: 0.07 });
        if (left <= 0) { b.st = 'down'; b.fly = 0; addMiss(b, 'MISS'); }
      } else {
        b.fly += dt;
        if (b.fly < 0.45) alive++;
      }
    }
    if (alive === 0) {
      gapT += dt;
      if (gapT >= 0.1) { gapT = 0; spawnGroup(); }
    }
  }

  // ── 描画 ──
  function drawDojo() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, C.wall], [0.62, C.wall2], [0.63, C.mat], [1, '#b89a6e']]);
    // 掛け軸の円と窓(遠景)
    game.draw.rect(90, 250, 900, 18, C.navy);
    for (var i = 0; i < 5; i++) game.draw.rect(140 + i * 180, 300, 120, 160, '#ffffff', 0.55);
    // 畳の目
    for (var y = Math.round(H * 0.63); y < H; y += 120) game.draw.rect(0, y, W, 6, '#a88a5e');
    for (var x = 0; x < W; x += 270) game.draw.rect(x + ((Math.floor(t) % 2) ? 0 : 0), Math.round(H * 0.63), 6, H, '#a88a5e', 0.6);
  }

  function drawBoard(b) {
    var t = game.time.elapsed;
    var rise = b.enter > 0 ? b.enter * 400 : 0;
    var shake = b.st === 'up' && b.hold - b.t < 0.6 ? Math.sin(t * 50) * 6 : 0;
    var by = b.y + rise;
    // 先輩: 頭は板の上、脚は板の下
    var down = b.st === 'down' ? Math.min(1, b.fly * 3) * 160 : 0;
    game.draw.sprite(SENIOR_HEAD, SENIOR_PAL, b.x, by - b.h / 2 - 50, 13, { anchor: 'center' });
    game.draw.sprite(SENIOR_LEGS, SENIOR_PAL, b.x, by + b.h / 2 + 60, 13, { anchor: 'center' });
    if (b.st === 'broken') {
      // 木目に沿って2つに割れて飛ぶ
      var nx = -Math.sin(rad(b.ang)), ny = Math.cos(rad(b.ang));
      var off = b.fly * 600;
      for (var s = -1; s <= 1; s += 2) {
        var hp = halfOf(b, s).map(function(p) { return [p[0] + nx * off * s, p[1] + ny * off * s + b.fly * b.fly * 900]; });
        if (hp.length >= 3) fillPoly(hp, C.wood, Math.max(0, 1 - b.fly * 2));
      }
      return;
    }
    var sc = b === stopBoard ? 1.15 : 1;
    var bw = b.w * sc, bh = b.h * sc;
    var x0 = b.x - bw / 2 + shake, y0 = by - bh / 2 + down;
    var flash = b.flash > 0;
    // 板(丸角)+手
    game.draw.rect(x0 + 16, y0, bw - 32, bh, flash ? C.white : C.wood);
    game.draw.rect(x0, y0 + 16, bw, bh - 32, flash ? C.white : C.wood);
    game.draw.circle(x0 + 16, y0 + 16, 16, flash ? C.white : C.wood);
    game.draw.circle(x0 + bw - 16, y0 + 16, 16, flash ? C.white : C.wood);
    game.draw.circle(x0 + 16, y0 + bh - 16, 16, flash ? C.white : C.wood);
    game.draw.circle(x0 + bw - 16, y0 + bh - 16, 16, flash ? C.white : C.wood);
    if (!flash) {
      var dx = Math.cos(rad(b.ang)), dy = Math.sin(rad(b.ang));
      var cx = b.x + shake, cy = by + down;
      for (var k = -8; k <= 8; k++) {
        var ox = -dy * k * 34, oy = dx * k * 34;
        var seg = clipSeg(cx + ox, cy + oy, dx, dy, x0 + 14, y0 + 14, x0 + bw - 14, y0 + bh - 14);
        if (seg) game.draw.line(seg[0], seg[1], seg[2], seg[3], k % 3 === 0 ? C.grain : '#be8a4c', k % 3 === 0 ? 8 : 5);
      }
    }
    game.draw.circle(x0 - 6, by + down, 26, C.skin);
    game.draw.circle(x0 + bw + 6, by + down, 26, C.skin);
    // 掲げていられる残り(縮む帯)
    if (b.st === 'up' && b.enter <= 0) {
      var left = Math.max(0, 1 - b.t / b.hold);
      game.draw.rect(b.x - bw / 2, by + bh / 2 + 18, bw, 16, '#00000018');
      game.draw.rect(b.x - bw / 2, by + bh / 2 + 18, bw * left, 16, left < 0.35 ? C.red : C.green);
    }
  }

  function drawKid() {
    var t = game.time.elapsed;
    var fr = KID[0];
    if (stingT > 0 || (over && !won)) fr = KID[2];
    else if (won && over) fr = KID[3];
    else if (chopT > 0) fr = KID[1];
    var bob = Math.sin(t * 4) * 4;
    var jx = stingT > 0 ? Math.sin(t * 60) * 6 : 0;
    game.draw.sprite(fr, KID_PAL, W / 2 + jx, KID_Y + bob, 18, { anchor: 'center' });
  }

  function drawTrail() {
    var now = game.time.elapsed;
    for (var i = 1; i < trail.length; i++) {
      var a = 1 - (now - trail[i].t) / 0.25;
      if (a > 0) game.draw.line(trail[i - 1].x, trail[i - 1].y, trail[i].x, trail[i].y, C.white, 24 * a + 4);
    }
    trail = trail.filter(function(p) { return now - p.t < 0.25; });
  }

  function drawWorld() {
    drawDojo();
    for (var i = 0; i < boards.length; i++) drawBoard(boards[i]);
    drawKid();
    drawTrail();
  }

  function hud() {
    label(String(score), 190, 110, 64, C.navy);
    label(broken + ' / ' + NEEDED, W / 2, 110, 54, C.red);
    for (var i = 0; i < MAX_MISS; i++) {
      game.draw.circle(W - 230 + i * 70, 96, 26, i < MAX_MISS - misses ? C.green : '#d8ccb8');
    }
    var timeBar = Math.max(0, 1 - playT / TIME_LIMIT);
    game.draw.rect(60, 168, W - 120, 16, '#00000018');
    game.draw.rect(60, 168, (W - 120) * timeBar, 16, timeBar < 0.25 ? C.red : C.navy);
  }

  // ── 入力: 押した点から離した点までの払い ──
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function(x, y) {
    if (state !== S.PLAYING || over || countIn > 0) return;
    stroke = { x: x, y: y };
    trail.push({ x: x, y: y, t: game.time.elapsed });
    game.audio.tone(660, 0.03, { wave: 'triangle', volume: 0.05 });
  });
  game.onMove(function(x, y) {
    if (!stroke || state !== S.PLAYING) return;
    trail.push({ x: x, y: y, t: game.time.elapsed });
    // 払いの長さに達したら風切り音(払いとして受け付けた合図)
    if (!stroke.whoosh && Math.hypot(x - stroke.x, y - stroke.y) > 110) { stroke.whoosh = true; game.audio.tone(900, 0.08, { wave: 'triangle', volume: 0.06, slide: -500 }); }
  });
  game.onRelease(function(x, y) {
    if (!stroke || state !== S.PLAYING || over) { stroke = null; return; }
    var r = judgeStroke(stroke.x, stroke.y, x, y);
    stroke = null;
    if (r === 'tap') { game.audio.play('se_tap', 0.08); game.fx.burst(x, y, { color: C.navy, count: 4, speed: 120 }); }
    else if (r === 'none') game.audio.tone(330, 0.05, { wave: 'triangle', volume: 0.06 });
  });

  // ── ATTRACT: 実判定で横木目を横に払って割る → 右上がりの木目を横切って払いしびれる → 筋に沿って払い直して割る ──
  var DEMO_SEQ = [[{ x: W / 2, ang: 0, hold: 9 }], [{ x: W / 2, ang: 135, hold: 9 }], [{ x: W * 0.27, ang: 90, hold: 9 }, { x: W * 0.73, ang: 45, hold: 9 }]];
  var DEMO_STROKES = [[0, 0], [1, 45], [1, 135], [2, 90], [2, 45]];   // [板の組, 払う角度]
  var demo = { t: 0, gx: W / 2, gy: H * 0.8, press: false, k: 0, sT: 0, wait: 0 };
  function demoStep(dt) {
    demo.t += dt;
    if (demo.t <= dt) { resetRun(DEMO_SEQ); demo.k = 0; demo.sT = -1; demo.wait = 0.5; }
    stepBoards(dt);
    if (demo.wait > 0) { demo.wait -= dt; demo.press = false; return; }
    if (demo.k >= DEMO_STROKES.length) { if (boards.length === 0) demo.t = 0; return; }
    var st = DEMO_STROKES[demo.k];
    if (seqIdx - 1 !== st[0]) return;
    var tgt = null;
    for (var i = 0; i < boards.length; i++) if (boards[i].st === 'up' && boards[i].enter <= 0 && (!tgt || (st[1] === 45 ? boards[i].x > tgt.x : boards[i].x < tgt.x))) tgt = boards[i];
    if (!tgt) return;
    var dx = Math.cos(rad(st[1])) * 170, dy = Math.sin(rad(st[1])) * 170;
    if (demo.sT < 0) {
      // 払い始めの位置まで手を運ぶ
      demo.press = false;
      demo.gx += (tgt.x - dx - demo.gx) * Math.min(1, dt * 9); demo.gy += (tgt.y - dy - demo.gy) * Math.min(1, dt * 9);
      if (Math.hypot(tgt.x - dx - demo.gx, tgt.y - dy - demo.gy) < 10) demo.sT = 0;
      return;
    }
    demo.sT += dt;
    demo.press = true;
    var u = Math.min(1, demo.sT / 0.2);
    demo.gx = tgt.x - dx + dx * 2 * u; demo.gy = tgt.y - dy + dy * 2 * u;
    trail.push({ x: demo.gx, y: demo.gy, t: game.time.elapsed });
    if (u >= 1) { judgeStroke(tgt.x - dx, tgt.y - dy, tgt.x + dx, tgt.y + dy); demo.k++; demo.sT = -1; demo.wait = 0.45; }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!seq) initGame();
      demoStep(dt);
      drawWorld();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 14 });
      label(GAME_TITLE, W / 2, 110, 92, C.red);
      label('HI-SCORE ' + game.best, W / 2, 180, 38, C.navy);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) label('► 100円 投入 ◄', W / 2, 1880, 44, C.red);
      else label('TAP TO START', W / 2, 1880, 42, C.navy);
      return;
    }

    if (state === S.RESULT) {
      drawWorld();
      game.draw.rect(60, 250, W - 120, 340, C.white, 0.92);
      label(won ? 'CLEAR' : (timeUp ? 'TIME UP' : 'GAME OVER'), W / 2, 350, 100, won ? C.green : C.red);
      label('SCORE ' + score, W / 2, 430, 58, C.navy);
      label(broken + ' / ' + NEEDED + '  PERFECT ' + perfects, W / 2, 490, 40, C.navy);
      if (score > prevBest && prevBest > 0) label('NEW RECORD', W / 2, 560, 52, C.red);
      else label('BEST ' + Math.max(prevBest, score), W / 2, 560, 42, C.navy);
      if (!won) label('あと' + Math.max(1, NEEDED - broken) + '枚!', W / 2, 1180, 64, C.red);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) label('TAP TO CONTINUE', W / 2, 1880, 40, C.navy);
      return;
    }

    // ── PLAYING ──
    if (endT > 0) {
      endT -= dt;
      if (endT <= 0) {
        state = S.RESULT;
        var stats = { broken: broken, perfect: perfects, misses: misses };
        if (won) game.end.success(score, stats);
        else game.end.failure(stats);
      }
    } else if (stopT > 0) {
      stopT -= dt;
      if (stopT <= 0) {
        game.feedback.bad(stopBoard.x, stopBoard.y - stopBoard.h / 2 - 30, { text: 'MISS' });
        over = true; won = false; finish();
      }
    } else if (countIn > 0) {
      countIn -= dt;
      if (countIn <= 0) game.audio.play('se_tap', 0.3);
    } else if (!over) {
      playT += dt;
      stepBoards(dt);
      if (stopT <= 0 && broken >= NEEDED) {
        over = true; won = true;
        score += Math.round(Math.max(0, TIME_LIMIT - playT) * 30);
        finish();
      } else if (stopT <= 0 && (playT >= TIME_LIMIT || (seqIdx >= seq.length && boards.length === 0))) {
        over = true; won = false; timeUp = playT >= TIME_LIMIT;
        game.feedback.bad(W / 2, 175, { text: timeUp ? 'TIME UP' : 'MISS' });
        finish();
      }
    }

    drawWorld();
    hud();
    if (countIn > 0) label(countIn > 0.35 ? 'READY?' : 'GO!', W / 2, Math.round(H * 0.62), 120, C.red);
  });

  function finish() {
    if (endT > 0) return;
    endT = 1.4;
    game.audio.stopBgm();
    game.audio.play(won ? 'se_success' : 'se_failure', 0.55);
    if (won) for (var i = 0; i < 7; i++) game.fx.burst(game.random(140, 940), game.random(350, 1200), { color: i % 2 ? C.gold : C.red, count: 22, speed: 460 });
  }

  // 演武会の太鼓と笛(オリジナル)
  var TUNE = [
    ['E4', 0.5], ['E4', 0.5], ['A4', 1], ['B4', 0.5], ['C5', 0.5], ['B4', 1],
    ['A4', 0.5], ['G4', 0.5], ['E4', 1], ['D4', 0.5], ['E4', 1.5],
  ];
  var TUNE_OPTS = { tempo: 128, wave: 'square', volume: 0.05, loop: true, bass: [['A2', 1], ['A2', 0.5], ['E2', 0.5], ['A2', 1], ['E2', 1]] };

  game.onStart(function() {
    game.audio.melody(TUNE, TUNE_OPTS);
    state = S.ATTRACT;
    initGame();
  });
})(game);
