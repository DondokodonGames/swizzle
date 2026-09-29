// J-3DSDSDSTOP10-0022-ridge-post-sled.js
// 尾根便そり — 杖で雪を突く上フリックの速さで加速し、赤旗の急カーブ前は下フリックで減速して峠の小屋へ滑り込む
// 操作: 上へ素早くはじくと杖で突いて加速(速いほど強い)。下へはじくと杖を立てて減速。赤旗のカーブに速すぎる速度で入るとスピン
// 終わり: 制限時間内に峠の小屋(520m)へ着けば成功。時間切れ、またはスピン3回で失敗
// @mechanic: flick_launch
// @theme: ridge_post_sled
// 世界観: 雪の尾根を越える郵便そりの配達人が、杖の一突きの強さを加減しながら急カーブを曲がり切り、日暮れ前に峠の山小屋へ手紙を届ける
// 残るもの: 正誤(CLEAR/GAME OVER) + 到着タイムとカーブのPERFECT数
// スタイル: 90s LOW POLY

(function (game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s LOW POLY: 面ベタ塗り(横ストリップ)、輪郭は line、奥にフォグ
  var STYLE = { bg: ['#9fb8d9', '#dfe8f3', '#c8d4e6'], main: ['#3a5a8c', '#e04a3a'], accent: ['#ffd24a', '#35c07d'] };
  var COL = {
    sky1: '#6f8fc4', sky2: STYLE.bg[0], fog: STYLE.bg[1], snowA: '#e9eff8', snowB: '#d7e0ee',
    trackA: '#bccbe2', trackB: '#aabbd6', edge: '#7d8fb0', mount: '#8196bd', mount2: '#a9b9d6',
    ink: '#1f2d4a', flag: STYLE.main[1], gold: STYLE.accent[0], good: STYLE.accent[1], bad: '#ff3b4f', white: '#ffffff'
  };

  var GAME_TITLE = 'RIDGE POST SLED';
  var TIME_LIMIT = 18;
  var COURSE = 520;
  var NEEDED = 3;          // 曲がり切るべきカーブ数
  var MAX_SPINS = 3;
  var HOR = H * 0.3;
  var ZK = 9000;
  var CURVES = [
    { at: 140, len: 38, safe: 31, dir: 1 },
    { at: 290, len: 40, safe: 28, dir: -1 },
    { at: 430, len: 42, safe: 26, dir: 1 }
  ];
  var DOWNHILL = [[40, 120], [200, 270], [350, 410], [480, 520]];

  var COURIER_A = ['...hh...', '..hhhh..', '..ffff..', '.cccccc.', 'pcccccc.', 'p.cccc..', 'ssssssss', '.s....s.'];
  var COURIER_B = ['...hh...', '..hhhh..', '..ffff..', '.cccccc.', '.ccccccp', '..cccc.p', 'ssssssss', '.s....s.'];
  var COURIER_PUSH = ['...hh...', '..hhhh..', '..ffff..', 'pcccccc.', 'p.cccc.p', 'p.cccc.p', 'ssssssss', '.s....s.'];
  var COURIER_SPIN = ['.ssssss.', 's.cccc.s', '..cccc..', '.cccccc.', '..ffff..', '..hhhh..', '...hh...', '........'];
  var PAL_COURIER = { h: '#3a5a8c', f: '#f3cfa8', c: '#e04a3a', p: '#6b4b2a', s: '#8a5a2b' };
  var PINE = ['...g...', '..ggg..', '.ggggg.', '..ggg..', '.ggggg.', 'ggggggg', '...t...'];
  var PAL_PINE = { g: '#2f6b5a', t: '#5a3d2a' };
  var FLAG_A = ['rrr.', 'rrrr', 'rr..', 'p...', 'p...', 'p...'];
  var FLAG_B = ['.rrr', 'rrrr', '..rr', 'p...', 'p...', 'p...'];
  var PAL_FLAG = { r: COL.flag, p: '#ffffff' };
  var HUT = ['...rr...', '..rrrr..', '.rrrrrr.', 'rrrrrrrr', '.wwyyww.', '.wwyyww.', '.wwwwww.'];
  var PAL_HUT = { r: '#a33a2a', w: '#c9a57a', y: COL.gold };

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var pos, v, timeLeft, ready, finished, ok, hitStop, endWait, hl, spins, perfects, curveState, spinT, pushT, warned, press, runT;
  var silent = false;

  function label(str, x, y, sz, color) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#1b2640', bold: true, align: 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: 'center' });
  }

  function initGame() {
    pos = 0; v = 8; timeLeft = TIME_LIMIT; ready = 0.8; finished = false; ok = false;
    hitStop = 0; endWait = 0; hl = null; spins = 0; perfects = 0; spinT = 0; pushT = 0; press = null; runT = 0;
    curveState = [0, 0, 0]; warned = [false, false, false];
  }

  function downhill(p) {
    for (var i = 0; i < DOWNHILL.length; i++) if (p >= DOWNHILL[i][0] && p < DOWNHILL[i][1]) return true;
    return false;
  }

  function curveIndexAt(p) {
    for (var i = 0; i < CURVES.length; i++) if (p >= CURVES[i].at && p < CURVES[i].at + CURVES[i].len) return i;
    return -1;
  }

  function finishRound(success) {
    if (finished) return;
    finished = true; ok = success; hitStop = 0.45;
    hl = { x: W / 2, y: H * 0.7, t: 0 };
    if (!silent) game.audio.stopBgm();
  }

  // フリック1回を速度に変える(上=加速/下=減速)。戻り値: 'push' | 'brake' | 'weak'
  function applyFlick(dy, dur) {
    if (finished || spinT > 0) return 'weak';
    var speed = Math.abs(dy) / Math.max(0.04, dur);
    if (Math.abs(dy) < 60 || dur > 0.45) return 'weak';
    var power = Math.max(0.15, Math.min(1, (speed - 300) / 2400));
    if (dy > 0) {
      v = Math.min(62, v + 4 + 14 * power);
      pushT = 0.25;
      return power > 0.7 ? 'strong' : 'push';
    }
    v = Math.max(4, v - (8 + 10 * power));
    return 'brake';
  }

  function stepWorld(dt) {
    if (finished) return;
    runT += dt;
    if (spinT > 0) spinT -= dt;
    if (pushT > 0) pushT -= dt;
    v *= Math.pow(0.58, dt);                  // 雪の抵抗(retain 0.58/s)
    if (downhill(pos)) v += 11 * dt;          // 下り坂
    v = Math.max(0, Math.min(62, v));
    pos += v * dt;
    for (var i = 0; i < CURVES.length; i++) {
      var c = CURVES[i];
      var dz = c.at - pos;
      // telegraph: カーブ到達0.7秒前に警告音
      if (!warned[i] && dz > 0 && dz / Math.max(1, v) < 0.75) {
        warned[i] = true;
        if (!silent) game.audio.tone('A5', 0.12, { wave: 'square', volume: 0.12 });
      }
      if (curveState[i] === 0 && pos >= c.at) {
        if (v > c.safe) {
          curveState[i] = 2; spins++; spinT = 0.7; v = 6;
          game.feedback.bad(W / 2, H * 0.7, { text: 'MISS', sound: silent ? 'se_tap' : 'se_bad', volume: silent ? 0 : 0.5 });
          if (spins >= MAX_SPINS) { finishRound(false); return; }
        } else {
          curveState[i] = 1;
          var perfect = v >= c.safe * 0.72;
          if (perfect) perfects++;
          game.feedback.good(W / 2, H * 0.62, { text: perfect ? 'PERFECT' : 'GOOD', color: perfect ? COL.gold : COL.good, sound: silent ? 'se_tap' : 'se_good', volume: silent ? 0 : 0.5 });
        }
        if (i === 1) {
          game.fx.popup(Math.round(pos) + 'm', W / 2, H * 0.52, { color: COL.white, size: 48 });
          if (!silent) game.audio.play('se_milestone', 0.4);
        }
      }
    }
    if (pos >= COURSE) { pos = COURSE; finishRound(true); }
  }

  function bendAt(zAhead) {
    // 前方 zAhead m 先の道の曲がり具合(-1..1)
    var p = pos + zAhead, b = 0;
    for (var i = 0; i < CURVES.length; i++) {
      var c = CURVES[i];
      if (p >= c.at - 20 && p < c.at + c.len) b = c.dir;
    }
    return b;
  }

  // ── 描画 ─────────────────────────────────────────────
  function drawSky() {
    var t = game.time.elapsed;
    game.draw.gradient(0, HOR, [[0, COL.sky1], [1, COL.sky2]]);
    // 低ポリの山(横ストリップで三角を塗る)
    var peaks = [[0.15, 190, COL.mount], [0.5, 260, COL.mount2], [0.82, 210, COL.mount]];
    for (var k = 0; k < peaks.length; k++) {
      var px = W * peaks[k][0] + Math.sin(t * 0.2 + k) * 6, ph = peaks[k][1];
      for (var yy = 0; yy < ph; yy += 6) {
        var half = (yy / ph) * ph * 1.3;
        game.draw.rect(px - half, HOR - ph + yy, half * 2, 6, peaks[k][2]);
        if (yy < ph * 0.25) game.draw.rect(px - half, HOR - ph + yy, half * 2, 6, '#f4f7fb', 0.9);
      }
    }
    game.draw.rect(0, HOR - 40, W, 40, COL.fog, 0.55 + 0.1 * Math.sin(t * 1.1));
  }

  function roadCenter(y) {
    var zz = ZK / Math.max(1, y - HOR);
    var depthFrac = 1 - (y - HOR) / (H - HOR);
    return W / 2 + bendAt(Math.min(140, zz)) * 380 * depthFrac * depthFrac;
  }

  function drawSlope() {
    for (var y = HOR; y < H; y += 6) {
      var dy = y - HOR + 3;
      var z = ZK / dy;
      var band = Math.floor((z + pos) / 7) % 2;
      game.draw.rect(0, y, W, 6, band ? COL.snowA : COL.snowB);
      var hw = dy * 0.5 + 16, cx = roadCenter(y);
      game.draw.rect(cx - hw, y, hw * 2, 6, band ? COL.trackA : COL.trackB);
      game.draw.rect(cx - hw - 4, y, 4, 6, COL.edge);
      game.draw.rect(cx + hw, y, 4, 6, COL.edge);
      if (downhill(pos + z) && band) game.draw.rect(cx - 6, y, 12, 6, '#8fb0e0', 0.6);
    }
    // 奥のフォグ
    game.draw.gradient(HOR, HOR + 140, [[0, 'rgba(223,232,243,0.9)'], [1, 'rgba(223,232,243,0)']]);
  }

  function project(z) {
    var y = HOR + ZK / z;
    return { y: y, hw: (y - HOR) * 0.5 + 16, cx: roadCenter(y), s: Math.max(1, Math.min(14, 240 / z)) };
  }

  function drawProps() {
    var list = [];
    for (var m = Math.floor(pos / 22) * 22; m < pos + 150; m += 22) {
      var z = m - pos;
      if (z > 6) list.push({ z: z, kind: 'pine', side: (m / 22) % 2 ? 1 : -1 });
    }
    for (var i = 0; i < CURVES.length; i++) {
      var cz = CURVES[i].at - pos;
      if (cz > 6 && cz < 150) { list.push({ z: cz, kind: 'flag', side: -1 }); list.push({ z: cz, kind: 'flag', side: 1 }); }
    }
    var hz = COURSE - pos;
    if (hz > 6 && hz < 170) list.push({ z: hz, kind: 'hut', side: 0 });
    list.sort(function (a, b) { return b.z - a.z; });
    var blink = Math.floor(game.time.elapsed * 8) % 2 === 0;
    for (var k = 0; k < list.length; k++) {
      var o = list[k], p = project(o.z);
      if (o.kind === 'pine') {
        game.draw.sprite(PINE, PAL_PINE, p.cx + o.side * (p.hw + 30 * p.s), p.y - 3 * p.s, p.s, { anchor: 'center' });
      } else if (o.kind === 'flag') {
        var near = o.z / Math.max(1, v) < 0.9;
        game.draw.sprite(blink && near ? FLAG_B : FLAG_A, PAL_FLAG, p.cx + o.side * (p.hw + 6 * p.s), p.y - 3 * p.s, p.s, { anchor: 'center' });
        if (near && blink) game.draw.rect(p.cx - p.hw, p.y - 2, p.hw * 2, 5, COL.flag, 0.8);
      } else {
        game.draw.sprite(HUT, PAL_HUT, p.cx, p.y - 3.5 * p.s, p.s * 1.4, { anchor: 'center' });
      }
    }
  }

  function drawSled() {
    var t = game.time.elapsed;
    var fr = spinT > 0 ? (Math.floor(t * 12) % 2 ? COURIER_SPIN : COURIER_A) : pushT > 0 ? COURIER_PUSH : (Math.floor(t * 4) % 2 ? COURIER_A : COURIER_B);
    var sway = Math.sin(t * 2.2) * 10 + (spinT > 0 ? Math.sin(t * 30) * 30 : 0);
    game.draw.rect(W / 2 - 90 + sway, H * 0.78 + 50, 180, 14, '#8b98b2', 0.5);
    game.draw.sprite(fr, PAL_COURIER, W / 2 + sway, H * 0.75 + Math.sin(t * 5) * 4, 20, { anchor: 'center' });
    // 速度線
    var n = Math.floor(v / 8);
    for (var i = 0; i < n; i++) {
      var lx = (i * 211 + t * 900) % W;
      game.draw.line(lx, H * 0.9, lx, H * 0.9 + 30 + v, COL.white, 3);
    }
  }

  function drawThumb() {
    game.draw.rect(0, H * 0.86, W, H * 0.14, '#c3cfe3', 0.55);
    // 上下フリックの溝(矢羽根の記号)
    var t = game.time.elapsed;
    var ay = H * 0.92 + Math.sin(t * 3) * 8;
    game.draw.line(W * 0.12, ay + 20, W * 0.12, ay - 40, COL.good, 10);
    game.draw.line(W * 0.12, ay - 40, W * 0.12 - 22, ay - 16, COL.good, 10);
    game.draw.line(W * 0.12, ay - 40, W * 0.12 + 22, ay - 16, COL.good, 10);
    game.draw.line(W * 0.88, ay - 40, W * 0.88, ay + 20, COL.flag, 10);
    game.draw.line(W * 0.88, ay + 20, W * 0.88 - 22, ay - 4, COL.flag, 10);
    game.draw.line(W * 0.88, ay + 20, W * 0.88 + 22, ay - 4, COL.flag, 10);
  }

  function drawHud() {
    label(Math.round(pos) + ' / ' + COURSE, W / 2, H * 0.04, 48, COL.white);
    game.draw.rect(80, 118, W - 160, 16, '#2a3a5c', 0.6);
    game.draw.rect(80, 118, (W - 160) * (pos / COURSE), 16, COL.good);
    for (var i = 0; i < CURVES.length; i++) {
      var cx = 80 + (W - 160) * (CURVES[i].at / COURSE);
      game.draw.rect(cx - 4, 110, 8, 32, curveState[i] === 1 ? COL.gold : curveState[i] === 2 ? COL.bad : COL.flag);
    }
    var low = timeLeft < 4 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(80, 160, W - 160, 22, '#2a3a5c', 0.6);
    game.draw.rect(80, 160, (W - 160) * Math.max(0, timeLeft / TIME_LIMIT), 22, low ? COL.bad : COL.gold);
    label(Math.round(v * 3.6) + '', W * 0.86, H * 0.12, 44, v > 30 ? COL.flag : COL.white);
    for (var s = 0; s < MAX_SPINS; s++) game.draw.circle(W * 0.1 + s * 44, H * 0.12, 14, s < spins ? COL.bad : '#ffffff', 0.9);
  }

  function drawHighlight(dt) {
    if (!hl) return;
    hl.t += dt;
    game.draw.circle(hl.x, hl.y, 60 + hl.t * 260, COL.white, Math.max(0, 0.6 - hl.t));
    game.draw.sprite(ok ? COURIER_PUSH : COURIER_SPIN, PAL_COURIER, hl.x, hl.y, 26, { anchor: 'center' });
  }

  // ── ATTRACT ゴースト実演(実ロジック) ─────────────────
  var demo = { t: 0, gx: W * 0.5, gy: H * 0.9, press: false, next: 0.3, fail: false, n: 0, fy0: 0, fy1: 0, ft: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.0;
    if (cyc < dt || demo.t <= dt) {
      initGame(); ready = 0; pos = 88; v = 26;
      demo.n++; demo.fail = demo.n % 3 === 0; demo.next = 0.3; demo.ft = 0;
    }
    silent = true;
    if (cyc >= demo.next && !finished) {
      var c = CURVES[0];
      var dz = c.at - pos;
      var brake = !demo.fail && dz > 0 && dz < 45 && v > c.safe * 0.95;
      demo.fy0 = brake ? H * 0.72 : H * 0.92; demo.fy1 = brake ? H * 0.9 : H * 0.72; demo.ft = 0.18;
      applyFlick(brake ? -200 : 220, 0.12);
      demo.next = cyc + 0.55;
    }
    if (demo.ft > 0) {
      demo.ft -= dt;
      var k = 1 - Math.max(0, demo.ft) / 0.18;
      demo.gy = demo.fy0 + (demo.fy1 - demo.fy0) * k; demo.press = true;
    } else { demo.press = false; demo.gy = H * 0.9; }
    demo.gx = W * 0.5;
    stepWorld(dt);
    if (spins > 0 && demo.fail && !finished) spins = 0;
    silent = false;
  }

  // ── 入力 ─────────────────────────────────────────────
  game.onTap(function () {
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.5); state = S.PLAYING; initGame(); demo.t = 0; return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function (x, y, id) {
    if (state !== S.PLAYING || ready > 0 || finished) return;
    press = { x: x, y: y, t: game.time.elapsed, id: id };
    game.audio.tone('E4', 0.03, { wave: 'triangle', volume: 0.06 });
  });
  game.onRelease(function (x, y, id) {
    if (state !== S.PLAYING || !press) return;
    var r = applyFlick(press.y - y, game.time.elapsed - press.t);
    press = null;
    if (r === 'strong') { game.audio.play('se_jump', 0.45); game.fx.burst(W / 2, H * 0.82, { color: COL.white, count: 14, speed: 380 }); game.fx.popup('NICE', W / 2, H * 0.66, { color: COL.good, size: 44 }); }
    else if (r === 'push') { game.audio.play('se_jump', 0.25); game.fx.burst(W / 2, H * 0.82, { color: COL.white, count: 6, speed: 220 }); }
    else if (r === 'brake') { game.audio.play('se_tap', 0.4); game.fx.burst(W / 2, H * 0.8, { color: '#b6c6e4', count: 10, speed: 260 }); }
    else { game.audio.play('se_tap', 0.15); game.fx.burst(x, y, { color: COL.white, count: 3, speed: 90 }); }
  });

  // ── ループ(唯一の onUpdate) ───────────────────────────
  game.onUpdate(function (dt) {
    if (state === S.ATTRACT) {
      if (pos === undefined) initGame();
      stepDemo(dt);
      if (finished && hitStop > 0) hitStop -= dt;
      drawSky(); drawSlope(); drawProps(); drawSled(); drawThumb();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 14 });
      label(GAME_TITLE, W / 2, H * 0.07, 72, COL.gold);
      label('HI-SCORE ' + (game.best || 0), W / 2, H * 0.12, 34, COL.white);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) label('► 100円 投入 ◄', W / 2, H * 0.965, 44, COL.gold);
      else label('INSERT COIN', W / 2, H * 0.965, 36, COL.white);
      return;
    }

    if (state === S.RESULT) {
      drawSky(); drawSlope(); drawProps(); drawThumb();
      var sc = ok ? Math.round(timeLeft * 100) + perfects * 150 : 0;
      label(ok ? 'CLEAR' : (timeLeft <= 0 ? 'TIME UP' : 'GAME OVER'), W / 2, H * 0.1, 96, ok ? COL.good : COL.bad);
      label(Math.round(pos) + ' / ' + COURSE, W / 2, H * 0.16, 52, COL.white);
      label('PERFECT ' + perfects, W / 2, H * 0.205, 40, COL.gold);
      if (ok) label('SCORE ' + sc, W / 2, H * 0.25, 44, COL.white);
      if (ok && sc > (game.best || 0)) label('NEW RECORD', W / 2, H * 0.29, 44, COL.gold);
      else label('BEST ' + (game.best || 0), W / 2, H * 0.29, 36, COL.white);
      if (!ok) label('あと' + Math.max(1, Math.round(COURSE - pos)) + 'm!', W / 2, H * 0.6, 64, COL.gold);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) label('TAP TO CONTINUE', W / 2, H * 0.965, 38, COL.white);
      return;
    }

    if (finished) {
      if (hitStop > 0) {
        hitStop -= dt;
        if (hitStop <= 0) {
          if (ok) { game.feedback.good(W / 2, H * 0.6, { text: 'FINISH', color: COL.gold, count: 26 }); game.audio.play('se_success', 0.6); }
          else { game.feedback.bad(W / 2, H * 0.6, { text: 'MISS' }); game.audio.play('se_failure', 0.5); }
          endWait = 1.1;
        }
      } else {
        endWait -= dt;
        if (endWait <= 0) {
          state = S.RESULT;
          var stats = { meters: Math.round(pos), perfects: perfects, spins: spins, curves: NEEDED };
          if (ok) game.end.success(Math.round(timeLeft * 100) + perfects * 150, stats);
          else game.end.failure(stats);
        }
      }
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap', 0.5);
    } else {
      timeLeft -= dt;
      if (timeLeft <= 0) { timeLeft = 0; finishRound(false); }
      else stepWorld(dt);
    }

    drawSky(); drawSlope(); drawProps(); drawSled(); drawThumb(); drawHud();
    if (finished) drawHighlight(dt);
    if (ready > 0) label(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.45, 110, COL.gold);
  });

  game.onStart(function () {
    game.audio.melody([['D5', 0.5], ['F#5', 0.5], ['A5', 0.5], ['F#5', 0.5], ['E5', 0.5], ['G5', 0.5], ['B5', 0.5], ['A5', 0.5]],
      { tempo: 150, wave: 'square', volume: 0.045, loop: true, bass: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
