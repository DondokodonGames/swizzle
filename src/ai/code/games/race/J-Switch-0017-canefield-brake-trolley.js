// J-Switch-0017-canefield-brake-trolley.js
// キビ畑の下り軌道 — 坂で勝手に加速する運搬トロッコを、ブレーキを押している長さだけで減速させ、カーブの手前でちょうど制限の速さに落として抜け、最後は製糖小屋の荷受け台にぴたりと止める
// 操作: どこでも押している間ブレーキ。離すと坂で加速する。メーターの緑の帯に針が入ったところで離してカーブへ入る。速すぎると脱線、遅すぎるとMISS(タイムが減るだけ)。踏切を横切る水牛は押して待ってやり過ごす。最後は荷受け台(黄色い枠)の中で止まる(社内メモ。画面には出さない)
// 終わり: 脱線・衝突せず荷受け台に止まればCLEAR。脱線/水牛に衝突/車止めに激突/時間切れでGAME OVER
// @mechanic: hold_duration
// @theme: canefield_trolley_brake
// 世界観: 南の島の刈り入れの夕方、サトウキビ畑の丘を縫う下りの運搬軌道で、刈り入れ当番の少年が刈りたてのキビを山積みにしたトロッコのブレーキを握り、急カーブと水牛の渡る踏切をさばいて、日暮れの搾り釜に間に合うよう麓の製糖小屋の荷受け台へ一番に滑り込む
// 残るもの: 正誤(CLEAR/GAME OVER) + 到着タイム・PERFECT数・停止位置のずれ
// スタイル: SKEUOMORPH

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // SKEUOMORPH: 木目・布・光沢ボタン。gradient で厚みを出す
  var STYLE = { bg: ['#5f8f3a', '#3f6a26'], main: ['#8a5a2b', '#c9a06a', '#f3e6c8'], accent: ['#e8392e', '#ffd23f'] };
  var C = { wood: '#8a5a2b', woodL: '#c9a06a', paper: '#f3e6c8', red: '#e8392e', gold: '#ffd23f', green: '#58c24a', ink: '#2a1a0c', rail: '#9aa0a8' };

  var TITLE = 'CANE RAIL';
  var TIME_LIMIT = 15;
  var BRAKE = 520, SLOPE = 270, VMAX = 950;
  var PERFECT_W = 45, GOOD_W = 150;
  var TROLLEY_Y = H * 0.36;
  var STEP = 8;

  var SEGS = [
    { type: 'straight', len: 900 },
    { type: 'curve', len: 420, turn: 1.1, limit: 520 },
    { type: 'straight', len: 700, crossing: 480 },
    { type: 'curve', len: 520, turn: -2.2, limit: 380 },
    { type: 'straight', len: 650 },
    { type: 'curve', len: 380, turn: 1.1, limit: 560 },
    { type: 'flat', len: 900 }
  ];
  var PTS = [], TOTAL = 0, CROSS_S = 0, BAY0 = 0, BAY1 = 0;
  (function buildTrack() {
    var x = 0, y = 0, th = Math.PI / 2, s = 0;
    for (var i = 0; i < SEGS.length; i++) {
      var sg = SEGS[i];
      sg.s0 = s;
      if (sg.crossing) CROSS_S = s + sg.crossing;
      var n = Math.round(sg.len / STEP);
      for (var k = 0; k < n; k++) {
        if (sg.type === 'curve') th += sg.turn / n;
        PTS.push({ x: x, y: y, th: th });
        x += Math.cos(th) * STEP; y += Math.sin(th) * STEP; s += STEP;
      }
    }
    PTS.push({ x: x, y: y, th: th });
    TOTAL = s;
    BAY0 = TOTAL - 300; BAY1 = TOTAL - 90;
  })();

  function ptAt(s) {
    var i = Math.max(0, Math.min(PTS.length - 1, Math.floor(s / STEP)));
    return PTS[i];
  }
  function segAt(s) {
    for (var i = SEGS.length - 1; i >= 0; i--) if (s >= SEGS[i].s0) return SEGS[i];
    return SEGS[0];
  }
  function nextCurve(s) {
    for (var i = 0; i < SEGS.length; i++) if (SEGS[i].type === 'curve' && SEGS[i].s0 > s) return SEGS[i];
    return null;
  }

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var CART = ['.gggggg.', 'gGgGgGgg', 'gggggggg', 'bbbbbbbb', 'bwwbbwwb', 'bbbbbbbb', 'k.kbbk.k', '..hhh...', '..hfh...'];
  var CART_PAL = { g: '#7cc14a', G: '#b6e36e', b: '#8a5a2b', w: '#c9a06a', k: '#2a1a0c', h: '#2a1a0c', f: '#e8b98a' };
  var BUFF = [
    ['h........hh', 'hkkkkkkkkkh', '.kkkkkkkkkk', '.kkkkkkkkk.', '.k.k...k.k.', '.k..k..k..k'],
    ['h........hh', 'hkkkkkkkkkh', '.kkkkkkkkkk', '.kkkkkkkkk.', '.k.k...k.k.', 'k..k....kk.']
  ];
  var BUFF_PAL = { k: '#4a4f58', h: '#e6dcc4' };
  var CANE = [['.g.', 'gg.', '.gg', '.g.', 'gg.', '.g.'], ['.g.', '.gg', 'gg.', '.g.', '.gg', '.g.']];
  var CANE_PAL = { g: '#9fdc5a' };
  var MILL = ['..rrrrrr..', '.rrrrrrrr.', 'rrrrrrrrrr', 'wwwwwwwwww', 'wddwwwwddw', 'wddwwwwddw', 'wwwwddwwww', 'wwwwddwwww'];
  var MILL_PAL = { r: '#b8432c', w: '#f3e6c8', d: '#6b4423' };

  var DECOR = [];
  (function buildDecor() {
    for (var i = 0; i < 140; i++) {
      var p = PTS[Math.floor(Math.random() * PTS.length)];
      var side = Math.random() < 0.5 ? -1 : 1;
      var off = 120 + Math.random() * 480;
      DECOR.push({ x: p.x + Math.cos(p.th + Math.PI / 2) * off * side, y: p.y + Math.sin(p.th + Math.PI / 2) * off * side, ph: Math.random() * 6 });
    }
  })();

  var s, v, braking, runT, timeLeft, ready, hitStop, crash, finished, done, endWait, ok, timeUp, perfects, misses, judged, camX, camY, crossOff, stopErr, halfShown, squeal, flashT;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 4, { size: sz, color: 'rgba(0,0,0,0.45)', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function initGame() {
    s = 0; v = 320; braking = false; runT = 0; timeLeft = TIME_LIMIT; ready = 0.8;
    hitStop = 0; crash = null; finished = false; done = false; endWait = 0; ok = false; timeUp = false;
    perfects = 0; misses = 0; judged = {}; crossOff = 0.3 + Math.random() * 2.2; stopErr = 0; halfShown = false; squeal = 0; flashT = 0;
    var p = ptAt(0); camX = p.x - W / 2; camY = p.y - TROLLEY_Y;
  }

  // 水牛: 周期3秒、1.12〜1.88秒の間は線路の上(線路と直角に横切る)
  function buffPhase() { return (runT + crossOff) % 3.0; }
  function buffOnTrack() { var ph = buffPhase(); return ph > 1.12 && ph < 1.88; }
  function buffWarn() { var ph = buffPhase(); return ph > 0.4 && ph <= 1.12; }

  function doCrash(kind) {
    if (finished) return;
    crash = kind; finished = true; ok = false; hitStop = 0.55; flashT = 0.55;
    game.audio.tone('C2', 0.2, { wave: 'sawtooth', volume: 0.14 });
  }

  function judgeCurve(sg) {
    var p = ptAt(s);
    var sx = p.x - camX, sy = p.y - camY;
    if (v > sg.limit) { doCrash('derail'); return; }
    if (v < sg.limit - GOOD_W) {
      misses++;
      game.feedback.bad(sx, sy - 120, { text: 'MISS', shake: 4, volume: 0.5 });
      return;
    }
    var perfect = v >= sg.limit - PERFECT_W;
    if (perfect) perfects++;
    game.feedback.good(sx, sy - 120, { text: perfect ? 'PERFECT' : 'GOOD', color: perfect ? C.gold : C.green, size: perfect ? 62 : 52 });
    if (state === S.PLAYING && !halfShown && sg === SEGS[3]) {
      halfShown = true;
      game.fx.popup(Math.round(s / TOTAL * 100) + '%', W / 2, H * 0.2, { color: C.gold, size: 56 });
      game.audio.play('se_milestone', 0.4);
    }
  }

  function stepCart(dt) {
    if (hitStop > 0) {
      hitStop -= dt;
      if (hitStop <= 0 && crash) {
        var p0 = ptAt(s);
        game.feedback.bad(p0.x - camX, p0.y - camY - 100, { text: 'MISS', shake: 16 });
        if (state === S.PLAYING) { game.audio.stopBgm(); game.audio.play('se_failure', 0.5); }
        done = true; endWait = 1.3;
      }
      return;
    }
    if (finished) return;
    runT += dt;
    var sg = segAt(s);
    var pressing = braking;
    if (pressing) {
      v -= BRAKE * dt;
      if (v < 0) v = 0;
      squeal += dt;
      if (squeal > 0.12) { squeal = 0; var pp = ptAt(s); game.fx.burst(pp.x - camX, pp.y - camY + 30, { color: '#ffe9a0', count: 2, speed: 120 }); }
    } else {
      if (sg.type === 'straight') v += SLOPE * dt;
      if (v < 60) v = Math.min(60, v + 120 * dt);
    }
    if (v > VMAX) v = VMAX;
    var prev = s;
    s += v * dt;
    // カーブ入口の判定
    for (var i = 0; i < SEGS.length; i++) {
      var c = SEGS[i];
      if (c.type === 'curve' && !judged[i] && prev < c.s0 && s >= c.s0) { judged[i] = true; judgeCurve(c); if (finished) return; }
    }
    // 踏切
    if (Math.abs(s - CROSS_S) < 44 && buffOnTrack()) { doCrash('buffalo'); return; }
    // 荷受け台
    if (s >= TOTAL) { s = TOTAL; doCrash('buffer'); return; }
    if (segAt(s).type === 'flat' && v <= 0.001 && s >= BAY0 && s <= BAY1) {
      finished = true; ok = true; done = true; endWait = 1.6;
      var mid = (BAY0 + BAY1) / 2;
      stopErr = Math.round(Math.abs(s - mid) / 10);
      var p2 = ptAt(s);
      flashT = 0.35;
      game.feedback.good(p2.x - camX, p2.y - camY - 120, { text: stopErr <= 3 ? 'PERFECT' : 'CLEAR', color: C.gold, size: 70, count: 24 });
      if (stopErr <= 3) perfects++;
      if (state === S.PLAYING) { game.audio.stopBgm(); game.audio.play('se_success', 0.5); }
    }
  }

  function followCam(dt) {
    var p = ptAt(s);
    var tx = p.x - W / 2, ty = p.y - TROLLEY_Y;
    var k = Math.min(1, dt * 6);
    camX += (tx - camX) * k; camY += (ty - camY) * k;
  }

  // ---------- 描画 ----------
  function drawField() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, '#7aa84a'], [0.5, STYLE.bg[0]], [1, STYLE.bg[1]]]);
    var off = ((camY % 70) + 70) % 70;
    for (var r = 0; r < 26; r++) game.draw.rect(0, r * 70 - off, W, 30, '#6f9d40', 0.5);
    for (var i = 0; i < DECOR.length; i++) {
      var d = DECOR[i];
      var dx = d.x - camX, dy = d.y - camY;
      if (dx < -60 || dx > W + 60 || dy < 150 || dy > H * 0.74) continue;
      game.draw.sprite(CANE[Math.floor(t * 2 + d.ph) % 2], CANE_PAL, dx + Math.sin(t * 1.5 + d.ph) * 5, dy, 9, { anchor: 'center' });
    }
  }

  function drawTrack() {
    var from = Math.max(0, Math.floor((s - 900) / STEP));
    var to = Math.min(PTS.length - 1, Math.floor((s + 1700) / STEP));
    for (var i = from; i < to; i += 5) {
      var p = PTS[i];
      var nx = Math.cos(p.th + Math.PI / 2), ny = Math.sin(p.th + Math.PI / 2);
      var x = p.x - camX, y = p.y - camY;
      game.draw.line(x - nx * 46, y - ny * 46, x + nx * 46, y + ny * 46, C.wood, 14);
    }
    for (var j = from; j < to; j += 2) {
      var a = PTS[j], b = PTS[Math.min(PTS.length - 1, j + 2)];
      var nx2 = Math.cos(a.th + Math.PI / 2) * 26, ny2 = Math.sin(a.th + Math.PI / 2) * 26;
      var sg = segAt(j * STEP);
      var col = sg.type === 'curve' ? '#c8ccd2' : C.rail;
      game.draw.line(a.x - camX - nx2, a.y - camY - ny2, b.x - camX - nx2, b.y - camY - ny2, col, 7);
      game.draw.line(a.x - camX + nx2, a.y - camY + ny2, b.x - camX + nx2, b.y - camY + ny2, col, 7);
    }
    // カーブの標識(矢羽の数 = きつさ)
    var t = game.time.elapsed;
    for (var k = 0; k < SEGS.length; k++) {
      var c = SEGS[k];
      if (c.type !== 'curve' || judged[k]) continue;
      var sp = ptAt(c.s0 - 40);
      var sx = sp.x - camX + Math.cos(sp.th + Math.PI / 2) * 110, sy = sp.y - camY + Math.sin(sp.th + Math.PI / 2) * 110;
      var near = c.s0 - s < 700 && c.s0 > s;
      game.draw.rect(sx - 8, sy, 16, 70, C.wood);
      game.draw.circle(sx, sy, 48, near && Math.floor(t * 8) % 2 === 0 ? C.gold : C.paper);
      var chev = c.limit < 420 ? 3 : (c.limit < 540 ? 2 : 1);
      for (var q = 0; q < chev; q++) game.draw.rect(sx - 30 + q * 22, sy - 18, 14, 36, C.red);
    }
    // 踏切と水牛
    var cp = ptAt(CROSS_S);
    var cx = cp.x - camX, cy = cp.y - camY;
    if (cy > 100 && cy < H * 0.8) {
      var warn = buffWarn() || buffOnTrack();
      var cnx = Math.cos(cp.th + Math.PI / 2), cny = Math.sin(cp.th + Math.PI / 2);
      game.draw.line(cx - cnx * 170, cy - cny * 170, cx + cnx * 170, cy + cny * 170, '#f3e6c8', 40);
      var lx = cx + Math.cos(cp.th) * 90 + cnx * 110, ly = cy + Math.sin(cp.th) * 90 + cny * 110;
      game.draw.rect(lx - 5, ly, 10, 60, '#3a2512');
      game.draw.circle(lx, ly, 24, warn && Math.floor(t * 10) % 2 === 0 ? C.red : '#5a2a22');
      game.draw.circle(lx - 6, ly - 6, 8, '#ffffff', 0.45);
      var ph = buffPhase();
      var along = (ph / 3.0) * 760 - 380;
      var bx = cx + cnx * along, by = cy + cny * along;
      game.draw.sprite(BUFF[Math.floor(t * 5) % 2], BUFF_PAL, bx, by + Math.sin(t * 5) * 3, 10, { anchor: 'center', flipX: cnx < 0 });
      if (crash === 'buffalo' && hitStop > 0) game.draw.circle(bx, by, 90 + (0.55 - hitStop) * 120, '#ffffff', hitStop);
    }
    // 製糖小屋と荷受け台
    var b0 = ptAt(BAY0), b1 = ptAt(BAY1), e = ptAt(TOTAL);
    game.draw.rect(b0.x - camX - 80, b0.y - camY, 160, b1.y - b0.y, C.gold, 0.35 + 0.15 * Math.sin(t * 5));
    game.draw.rect(e.x - camX - 70, e.y - camY - 6, 140, 24, C.red);
    game.draw.sprite(MILL, MILL_PAL, e.x - camX, e.y - camY + 150, 22, { anchor: 'center' });
    game.draw.circle(e.x - camX + 150, e.y - camY + 20 + Math.sin(t * 2) * 8, 40, '#ffffff', 0.35);
  }

  function drawCart() {
    var p = ptAt(s);
    var x = p.x - camX, y = p.y - camY;
    var t = game.time.elapsed;
    var shake = braking && v > 0 ? Math.sin(t * 60) * 3 : 0;
    var sc = 1;
    if (crash && crash !== 'buffalo' && hitStop > 0) {
      sc = 1.25;
      game.draw.circle(x, y, 110 + (0.55 - hitStop) * 140, '#ffffff', hitStop);
    }
    game.draw.circle(x + 6, y + 10, 62, '#000000', 0.25);
    game.draw.sprite(CART, crash && hitStop > 0 && Math.floor(t * 20) % 2 === 0 ? { g: '#fff', G: '#fff', b: '#fff', w: '#fff', k: '#fff', h: '#fff', f: '#fff' } : CART_PAL, x + shake, y, 13 * sc, { anchor: 'center' });
    if (braking && v > 0) {
      game.draw.circle(x - 40, y + 50, 10 + Math.random() * 6, '#ffe9a0', 0.9);
      game.draw.circle(x + 40, y + 50, 10 + Math.random() * 6, '#ffe9a0', 0.9);
    }
  }

  function speedAngle(sp) { return Math.PI + Math.PI * Math.min(1, sp / VMAX); }

  function drawPanel() {
    var t = game.time.elapsed;
    var top = H * 0.74;
    game.draw.gradient(top, H, [[0, '#a8743f'], [0.08, C.wood], [1, '#5a3a1a']]);
    for (var i = 0; i < 9; i++) game.draw.rect(0, top + 30 + i * 52, W, 3, '#6d4521', 0.5);
    game.draw.rect(0, top, W, 10, '#d9a86a');
    // 速度計
    var gx = W * 0.3, gy = H * 0.9, R = 200;
    game.draw.circle(gx, gy, R + 24, '#3a2512');
    game.draw.circle(gx, gy, R + 12, '#d8d2c2');
    game.draw.circle(gx, gy, R, C.paper);
    var nc = nextCurve(s);
    var target = null;
    if (segAt(s).type === 'flat' || !nc) target = null;
    else if (nc.s0 - s < 900) target = nc;
    if (target) {
      for (var a = target.limit - GOOD_W; a <= target.limit; a += 6) {
        var ang = speedAngle(a);
        var inP = a >= target.limit - PERFECT_W;
        game.draw.line(gx + Math.cos(ang) * (R - 44), gy + Math.sin(ang) * (R - 44), gx + Math.cos(ang) * (R - 8), gy + Math.sin(ang) * (R - 8), inP ? '#2fae3a' : '#9be08f', 10);
      }
      var la = speedAngle(target.limit);
      game.draw.line(gx + Math.cos(la) * (R - 60), gy + Math.sin(la) * (R - 60), gx + Math.cos(la) * R, gy + Math.sin(la) * R, C.red, 8);
    }
    for (var k = 0; k <= 10; k++) {
      var ta = speedAngle(k * VMAX / 10);
      game.draw.line(gx + Math.cos(ta) * (R - 22), gy + Math.sin(ta) * (R - 22), gx + Math.cos(ta) * (R - 4), gy + Math.sin(ta) * (R - 4), C.ink, 5);
    }
    var na = speedAngle(v);
    game.draw.line(gx, gy, gx + Math.cos(na) * (R - 30), gy + Math.sin(na) * (R - 30), C.red, 9);
    game.draw.circle(gx, gy, 22, '#3a2512');
    game.draw.circle(gx - 6, gy - 6, 8, '#ffffff', 0.5);
    game.draw.rect(gx - R - 24, gy, 2 * R + 48, H - gy, '#5a3a1a');
    txt(String(Math.round(v / 10)), gx, gy + 60, 54, C.paper);
    // ブレーキの光沢ボタン
    var bx = W * 0.76, by = H * 0.87;
    var press = braking;
    var pulse = 1 + (press ? 0 : 0.04 * Math.sin(t * 4));
    game.draw.circle(bx, by + 18, 140, '#3a2512');
    game.draw.circle(bx, by + (press ? 14 : 0), 128 * pulse, press ? '#a61f18' : C.red);
    game.draw.circle(bx - 30, by - 40 + (press ? 14 : 0), 48, '#ffffff', press ? 0.15 : 0.35);
    game.draw.rect(bx - 60, by - 14 + (press ? 14 : 0), 120, 28, '#ffffff', 0.85);
  }

  function drawHud() {
    game.draw.gradient(0, 230, [[0, '#f7ecd2'], [1, '#e3d1a8']]);
    game.draw.rect(0, 222, W, 8, '#8a5a2b');
    var frac = Math.max(0, timeLeft / TIME_LIMIT);
    var low = timeLeft < 3 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(60, 150, W - 120, 26, '#c9b58c');
    game.draw.rect(60, 150, (W - 120) * frac, 26, low ? C.red : C.green);
    var progress = Math.min(1, s / TOTAL);
    game.draw.rect(60, 196, W - 120, 10, '#c9b58c');
    game.draw.rect(60, 196, (W - 120) * progress, 10, C.wood);
    txt(timeLeft.toFixed(1), 70, 80, 60, C.ink, 'left');
    txt('PERFECT ' + perfects, W - 70, 80, 44, '#b8860b', 'right');
  }

  function drawAll() {
    drawField();
    drawTrack();
    drawCart();
    drawPanel();
    game.draw.rect(0, 0, W, H, '#fff4d0', 0.03 + 0.03 * Math.sin(game.time.elapsed * 1.5));
    if (flashT > 0) game.draw.rect(0, 0, W, H, '#ffffff', flashT * 0.4);
  }

  // ---------- 入力 ----------
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.5); state = S.PLAYING; initGame(); demo.t = 0; return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.3); state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function(x, y) {
    if (state !== S.PLAYING) return;
    braking = true;
    game.audio.tone('E6', 0.08, { wave: 'sawtooth', volume: 0.05, slide: -600 });
    game.fx.burst(W * 0.76, H * 0.87, { color: '#ffffff', count: 4, speed: 140 });
  });
  game.onRelease(function(x, y) {
    if (state !== S.PLAYING) return;
    braking = false;
    game.audio.play('se_tap', 0.15);
    game.fx.burst(W * 0.76, H * 0.87, { color: C.gold, count: 3, speed: 90 });
  });

  // ---------- ATTRACT 実演(本番の stepCart を AI のブレーキ操作で動かす) ----------
  var demo = { t: 0, fail: false };
  function stepDemo(dt) {
    demo.t += dt;
    var P = 3.8;
    var cyc = demo.t % P;
    if (cyc < dt || demo.t <= dt) {
      demo.fail = Math.floor(demo.t / P) % 2 === 1;
      initGame();
      ready = 0; crossOff = 0.5;
      s = SEGS[1].s0 - 700; v = 760;
      var p = ptAt(s); camX = p.x - W / 2; camY = p.y - TROLLEY_Y;
    }
    var nc = nextCurve(s);
    braking = false;
    if (!demo.fail && nc && !finished) {
      var goal = nc.limit - 22;
      var need = (v * v - goal * goal) / (2 * BRAKE);
      if (v > goal && nc.s0 - s <= need + 30) braking = true;
    }
    stepCart(dt);
    followCam(dt);
  }

  game.onUpdate(function(dt) {
    if (s === undefined) initGame();
    if (flashT > 0) flashT -= dt;

    if (state === S.ATTRACT) {
      stepDemo(dt);
      drawAll();
      game.draw.hand(W * 0.76, H * 0.87, { press: braking, scale: 14 });
      game.draw.gradient(0, 230, [[0, '#f7ecd2'], [1, '#e3d1a8']]);
      txt(TITLE, W / 2, 86, 80, C.red);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, 174, 36, C.ink);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.975, 42, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.975, 34, C.paper);
      return;
    }

    if (state === S.RESULT) {
      drawAll();
      game.draw.rect(0, H * 0.28, W, H * 0.34, '#2a1a0c', 0.82);
      txt(ok ? 'CLEAR' : (timeUp ? 'TIME UP' : 'GAME OVER'), W / 2, H * 0.34, 96, ok ? C.gold : C.red);
      if (ok) txt((TIME_LIMIT - timeLeft).toFixed(2), W / 2, H * 0.42, 80, C.paper);
      else txt(Math.floor(Math.min(1, s / TOTAL) * 100) + '%', W / 2, H * 0.42, 80, C.paper);
      txt('PERFECT ' + perfects + '   MISS ' + misses, W / 2, H * 0.49, 40, C.paper);
      if (ok && resultScore() >= game.best) txt('NEW RECORD', W / 2, H * 0.545, 50, C.gold);
      else txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.545, 40, C.paper);
      if (!ok) txt('あと' + Math.max(1, Math.ceil((TOTAL - s) / 100)) + 'm!', W / 2, H * 0.595, 46, C.gold);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.975, 40, C.paper);
      return;
    }

    // PLAYING
    braking = braking && game.input.pressing !== false;
    if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_jump', 0.3);
    } else if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        var stats = { time: +(TIME_LIMIT - timeLeft).toFixed(2), perfect: perfects, miss: misses, stop_gap: stopErr };
        if (ok) game.end.success(resultScore(), stats);
        else game.end.failure(stats);
      }
    } else {
      stepCart(dt);
      if (!finished) {
        timeLeft -= dt;
        if (timeLeft <= 0) {
          timeLeft = 0; timeUp = true; finished = true; done = true; endWait = 1.3;
          var p = ptAt(s);
          game.feedback.bad(p.x - camX, p.y - camY - 100, { text: 'TIME UP' });
          game.audio.stopBgm(); game.audio.play('se_failure', 0.5);
        }
      }
    }
    followCam(dt);
    drawAll();
    drawHud();
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.55, 100, C.gold);
  });

  function resultScore() { return Math.round(timeLeft * 100) + perfects * 80; }

  game.onStart(function() {
    game.audio.melody([['G4', 0.5], ['B4', 0.5], ['D5', 1], ['B4', 0.5], ['C5', 0.5], ['A4', 1], ['G4', 0.5], ['E4', 0.5], ['F#4', 0.5], ['A4', 0.5], ['G4', 2]], { tempo: 150, wave: 'triangle', volume: 0.05, loop: true, bass: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
