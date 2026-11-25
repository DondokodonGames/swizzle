// J-Switch-0047-platform-snow-cut.js
// 始発前のホーム雪切り — ホームに積もった雪の段を、素早い横一文字で切り出して線路脇へ放る
// 操作: 雪の段を左端から右端まで一気に横切るように素早くなぞると切り出せる。ゆっくりなぞると雪が崩れるだけでミス。固い氷まじりの段は2回(社内メモ。画面には出さない)
// 終わり: 列車の到着前にすべての段を切り出せばCLEAR。時間切れ(列車到着)でGAME OVER
// @mechanic: slice
// @theme: north_station_snow_slice
// 世界観: 北国の小さな無人駅に配属されたばかりの見習い駅員が、夜のうちにホームへ降り積もった雪を、始発列車の汽笛が近づく前にブロック状に切り出して線路脇へ放り、乗客の通り道を作る
// 残るもの: 正誤(CLEAR/GAME OVER) + 切り出した段の数・一振りで2段切った数・ゆっくりなぞった数
// スタイル: 8bit HOME

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 8bit HOME: 3〜4色+黒、8x8ドット、タイル反復背景
  var STYLE = { bg: ['#000000', '#1c3c8c', '#5c94fc'], main: ['#fcfcfc', '#a4e4fc', '#7c7c7c'], accent: ['#f83800', '#fcb800'] };
  var N = { black: '#000000', navy: '#1c3c8c', blue: '#5c94fc', white: '#fcfcfc', ice: '#a4e4fc', gray: '#7c7c7c', red: '#f83800', amber: '#fcb800' };

  var GAME_TITLE = 'SNOW PLATFORM';
  var TIME_LIMIT = 14;
  var ROWS = 8;
  var LX = 170, RX = 870, TOP = 400, ROW_H = 120;
  var FAST = 1500;       // これより速い一振りだけが切れる(px/秒)

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var gate, count, clock, slabs, cut, doubles, slow, trail, stroke, flying, frozen, finT, pass, glow, halfDone;

  var CLERK = [
    ['..rrrr..', '.rrrrrr.', '..ffff..', '..fkfk..', '.nnnnnn.', 'nnnnnnnn', '.nn..nn.', '.kk..kk.'],
    ['..rrrr..', '.rrrrrr.', '..ffff..', '..fkfk..', '.nnnnnn.', 'nnnnnnnn', 'nn....nn', 'kk....kk']
  ];
  var FLAKE = ['.w.', 'www', '.w.'];
  var LAMP = ['aaa', 'aaa', '.g.', '.g.', '.g.', '.g.'];

  function print(s, x, y, sz, col, al) {
    game.draw.text(s, x + 4, y + 4, { size: sz, color: N.black, bold: true, align: al || 'center', font: 'monospace' });
    game.draw.text(s, x, y, { size: sz, color: col, bold: true, align: al || 'center', font: 'monospace' });
  }

  function buildSlabs() {
    slabs = [];
    for (var r = 0; r < ROWS; r++) slabs.push({ y: TOP + r * ROW_H, hp: (r === 2 || r === 5) ? 2 : 1, wob: 0 });
  }

  function newRound() {
    gate = 'ready'; count = 0.8; clock = TIME_LIMIT; cut = 0; doubles = 0; slow = 0;
    trail = []; stroke = null; flying = []; frozen = 0; finT = 0; pass = false; glow = null; halfDone = false;
    buildSlabs();
  }

  // 一振りを判定(実プレイ・デモ共用)。pts=[{x,y,t}]
  function judgeStroke(pts, ghost) {
    if (pts.length < 2) return;
    var a = pts[0], b = pts[pts.length - 1];
    var len = 0;
    for (var i = 1; i < pts.length; i++) len += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
    var dur = Math.max(0.016, b.t - a.t);
    var speed = len / dur;
    // 段ごとに、その高さの帯の中で横に何割なぞったか
    var hitRows = [];
    for (var r = 0; r < slabs.length; r++) {
      var sl = slabs[r];
      if (sl.hp <= 0) continue;
      var minX = 1e9, maxX = -1e9;
      for (var k = 0; k < pts.length; k++) {
        if (pts[k].y >= sl.y - 10 && pts[k].y <= sl.y + ROW_H + 10) { minX = Math.min(minX, pts[k].x); maxX = Math.max(maxX, pts[k].x); }
      }
      if (maxX - minX >= (RX - LX) * 0.62) hitRows.push(sl);
    }
    if (!hitRows.length) { game.audio.tone('G3', 0.05, { wave: 'square', volume: 0.03 }); game.fx.burst(b.x, b.y, { color: N.white, count: 3, speed: 90 }); return; }
    if (speed < FAST) {
      for (var q = 0; q < hitRows.length; q++) hitRows[q].wob = 0.3;
      if (ghost) { game.fx.burst(b.x, b.y, { color: N.gray, count: 6, speed: 120 }); return; }
      slow++;
      clock = Math.max(0, clock - 0.8);
      glow = { y: hitRows[0].y, t: 0.35 };
      game.feedback.bad(W / 2, hitRows[0].y - 30, { text: 'MISS', color: N.red });
      frozen = 0.3;
      return;
    }
    var chopped = 0;
    for (var h = 0; h < hitRows.length; h++) {
      var s2 = hitRows[h];
      s2.hp--; s2.wob = 0.2;
      if (s2.hp <= 0) {
        chopped++;
        flying.push({ x: (LX + RX) / 2, y: s2.y + ROW_H / 2, vx: 900 + game.random(0, 300), vy: -700, spin: 0 });
      } else {
        game.fx.burst((LX + RX) / 2, s2.y + ROW_H / 2, { color: N.ice, count: 10, speed: 240 });
        game.audio.play('se_break', 0.3);
      }
    }
    if (ghost) { if (chopped) game.audio.play('se_jump', 0.2); return; }
    if (chopped) {
      cut += chopped;
      if (chopped >= 2) doubles++;
      game.feedback.good(W / 2, hitRows[0].y - 30, { text: chopped >= 2 ? 'PERFECT' : 'GOOD', color: chopped >= 2 ? N.amber : N.white, count: 12 });
      game.audio.play('se_jump', 0.35);
      if (!halfDone && cut >= ROWS / 2) {
        halfDone = true;
        game.audio.play('se_milestone', 0.5);
        game.fx.popup(cut + ' / ' + ROWS, W / 2, 320, { color: N.amber, size: 70 });
      }
      if (cut >= ROWS) closeOut(true);
    } else {
      game.feedback.good(W / 2, hitRows[0].y - 30, { text: 'NICE', color: N.ice, count: 6 });
    }
  }

  function closeOut(win) {
    if (gate === 'stop' || gate === 'outro') return;
    pass = win; gate = 'stop'; frozen = 0.55; stroke = null;
    game.audio.stopBgm();
    if (win) { game.fx.flash(N.white, 0.25); game.audio.play('se_success', 0.6); }
    else {
      glow = { y: TOP, t: 0.6 };
      game.feedback.bad(W / 2, H * 0.42, { text: 'TIME UP', color: N.red });
      game.audio.play('se_failure', 0.6);
    }
  }

  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.6); state = S.PLAYING; newRound(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; newRound(); demo.t = 0; return; }
    game.fx.burst(W / 2, H * 0.9, { color: N.white, count: 2, speed: 60 });
  });
  game.onPress(function(x, y) {
    if (state !== S.PLAYING || gate !== 'play' || frozen > 0) return;
    stroke = [{ x: x, y: y, t: game.time.elapsed }];
    game.audio.play('se_tap', 0.2);
  });
  game.onMove(function(x, y) {
    if (!stroke || state !== S.PLAYING) return;
    stroke.push({ x: x, y: y, t: game.time.elapsed });
    trail.push({ x: x, y: y, life: 0.2 });
    if (stroke.length % 6 === 0) game.fx.burst(x, y, { color: N.white, count: 1, speed: 70 });
  });
  game.onRelease(function(x, y) {
    if (!stroke || state !== S.PLAYING) { stroke = null; game.audio.tone('C4', 0.03, { wave: 'square', volume: 0.02 }); return; }
    stroke.push({ x: x, y: y, t: game.time.elapsed });
    var s = stroke; stroke = null;
    if (gate === 'play') judgeStroke(s, false);
  });

  // ── demo: 上の段から一文字切り。4振りに1回はゆっくりで崩れるだけ ──
  var demo = { t: 0, gx: LX, gy: TOP, press: false, n: 0, seg: 0, pts: [] };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 7;
    if (cyc < dt || demo.t <= dt) { buildSlabs(); demo.n = 0; demo.seg = 0; }
    var row = null;
    for (var r = 0; r < slabs.length; r++) if (slabs[r].hp > 0) { row = slabs[r]; break; }
    if (!row) { demo.press = false; return; }
    var slowOne = demo.n % 4 === 1;
    var dur = slowOne ? 0.9 : 0.28;
    demo.seg += dt;
    var yy = row.y + ROW_H / 2;
    if (demo.seg < 0.35) { demo.press = false; demo.gx += (LX - 30 - demo.gx) * Math.min(1, dt * 12); demo.gy += (yy - demo.gy) * Math.min(1, dt * 12); demo.pts = []; return; }
    var k = Math.min(1, (demo.seg - 0.35) / dur);
    demo.press = true;
    demo.gx = LX - 30 + (RX - LX + 60) * k; demo.gy = yy + k * 20;
    demo.pts.push({ x: demo.gx, y: demo.gy, t: demo.t });
    trail.push({ x: demo.gx, y: demo.gy, life: 0.2 });
    if (k >= 1) { judgeStroke(demo.pts, true); demo.n++; demo.seg = 0; demo.pts = []; }
  }

  function moveBits(dt) {
    for (var i = trail.length - 1; i >= 0; i--) { trail[i].life -= dt; if (trail[i].life <= 0) trail.splice(i, 1); }
    for (var f = flying.length - 1; f >= 0; f--) {
      var o = flying[f];
      o.vy += 2000 * dt; o.x += o.vx * dt; o.y += o.vy * dt; o.spin += dt;
      if (o.y > H + 100 || o.x > W + 200) flying.splice(f, 1);
    }
    for (var s = 0; s < slabs.length; s++) if (slabs[s].wob > 0) slabs[s].wob -= dt;
  }

  // ── drawing ──
  function drawStation() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, N.navy], [0.45, N.blue], [1, N.navy]]);
    // 8x8のタイル反復(遠くの山並み)
    for (var tx = 0; tx < W; tx += 64) {
      var hh = 80 + ((tx / 64) % 3) * 40;
      game.draw.rect(tx, 380 - hh, 64, hh, N.black, 0.35);
      game.draw.rect(tx + 16, 380 - hh, 32, 16, N.white, 0.5);
    }
    // 線路(右端)と近づく列車の前照灯
    game.draw.rect(RX + 40, 240, 140, 1200, N.black, 0.6);
    for (var sl = 0; sl < 20; sl++) game.draw.rect(RX + 40, 250 + sl * 62, 140, 10, N.gray);
    var near = 1 - clock / TIME_LIMIT;
    var lampR = 14 + near * 60;
    game.draw.circle(RX + 110, 280, lampR, N.amber, 0.4 + near * 0.5);
    if (clock < 4 && Math.floor(t * 8) % 2 === 0) game.draw.circle(RX + 110, 280, lampR * 1.6, N.amber, 0.25);
    // ホームの縁
    game.draw.rect(LX - 30, TOP - 30, RX - LX + 60, ROWS * ROW_H + 60, N.gray);
    game.draw.rect(RX + 20, TOP - 30, 12, ROWS * ROW_H + 60, N.amber);
    game.draw.sprite(LAMP, { a: N.amber, g: N.black }, 90, 700 + Math.sin(t * 2) * 3, 16, { anchor: 'center' });
    // 降る雪
    for (var i = 0; i < 16; i++) {
      var fy = ((t * 110 + i * 131) % 1500) + 240;
      game.draw.sprite(FLAKE, { w: N.white }, (i * 71 + Math.sin(t + i) * 40) % W, fy, 5, { anchor: 'center', alpha: 0.7 });
    }
    game.draw.rect(0, 0, W, H, N.white, 0.02 + 0.03 * Math.sin(t * 1.5));
  }

  function drawSlabs() {
    var t = game.time.elapsed;
    for (var r = 0; r < slabs.length; r++) {
      var s = slabs[r];
      var y = s.y + 6;
      if (s.hp <= 0) {
        game.draw.rect(LX, y, RX - LX, ROW_H - 12, N.gray, 0.6);
        for (var bx = LX; bx < RX; bx += 64) game.draw.rect(bx, y + 40, 32, 8, N.black, 0.3);
        continue;
      }
      var sh = s.wob > 0 ? Math.sin(t * 60) * 8 : 0;
      var col = s.hp >= 2 ? N.ice : N.white;
      game.draw.rect(LX + sh, y, RX - LX, ROW_H - 12, col);
      for (var tx = LX; tx < RX; tx += 32) game.draw.rect(tx + sh + ((r % 2) ? 16 : 0), y + 8, 8, 8, N.blue, 0.35);
      game.draw.rect(LX + sh, y + ROW_H - 24, RX - LX, 12, N.blue, 0.5);
      if (s.hp >= 2) { game.draw.line(LX + 200 + sh, y + 20, LX + 260 + sh, y + 80, N.navy, 4); game.draw.line(LX + 480 + sh, y + 16, LX + 430 + sh, y + 90, N.navy, 4); }
      if (s.hp === 1 && r === 2 || s.hp === 1 && r === 5) game.draw.line(LX + 100, y + 50, RX - 100, y + 50, N.navy, 3);
    }
    for (var f = 0; f < flying.length; f++) game.draw.rect(flying[f].x - 90, flying[f].y - 40, 180, 80, N.white, 0.9);
    for (var i = 1; i < trail.length; i++) game.draw.line(trail[i - 1].x, trail[i - 1].y, trail[i].x, trail[i].y, N.amber, 10 * trail[i].life / 0.2 + 2);
  }

  function drawFoot() {
    var t = game.time.elapsed;
    game.draw.rect(0, 1440, W, H - 1440, N.black);
    for (var x = 0; x < W; x += 64) game.draw.rect(x, 1440, 32, 12, N.gray);
    game.draw.sprite(CLERK[Math.floor(t * 4) % 2], { r: N.red, f: '#fcd8a8', k: N.black, n: N.navy }, 150, 1640 + Math.sin(t * 3) * 5, 16, { anchor: 'center' });
    game.draw.line(210, 1620, 300, 1560 + Math.sin(t * 6) * 20, N.gray, 10);
    for (var i = 0; i < ROWS; i++) game.draw.rect(360 + i * 80, 1620, 60, 40, i < cut ? N.white : N.navy);
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 228, N.black);
    print(cut + ' / ' + ROWS, W / 2, 95, 70, N.white);
    print(String(Math.ceil(clock)), 60, 95, 52, N.amber, 'left');
    game.draw.rect(60, 170, W - 120, 18, N.navy);
    game.draw.rect(60, 170, (W - 120) * Math.max(0, clock / TIME_LIMIT), 18, clock < 4 ? N.red : N.amber);
  }

  function tally() { return cut * 120 + doubles * 100 + Math.ceil(clock) * 20 - slow * 30; }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;
    if (state === S.ATTRACT) {
      if (gate === undefined) newRound();
      stepDemo(dt);
      moveBits(dt);
      drawStation(); drawSlabs(); drawFoot();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 13 });
      game.draw.rect(0, 0, W, 228, N.black);
      print(GAME_TITLE, W / 2, 95 + Math.sin(t * 2) * 6, 72, N.white);
      print('HI-SCORE ' + game.best, W / 2, 180, 36, N.amber);
      if (Math.floor(t * 1.8) % 2 === 0) print('► 100円 投入 ◄', W / 2, H * 0.97, 40, N.amber);
      else print('INSERT COIN', W / 2, H * 0.97, 34, N.white);
      return;
    }
    if (state === S.RESULT) {
      drawStation(); drawSlabs(); drawFoot();
      print(pass ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.42, 92, pass ? N.amber : N.red);
      print('SCORE ' + (pass ? tally() : 0), W / 2, H * 0.48, 44, N.white);
      if (Math.floor(t * 2) % 2 === 0) print('TAP TO CONTINUE', W / 2, H * 0.97, 38, N.white);
      return;
    }

    if (gate === 'ready') {
      count -= dt;
      if (count <= 0) { gate = 'play'; game.audio.play('se_tap', 0.5); }
    } else if (gate === 'play') {
      if (frozen > 0) frozen -= dt;
      else {
        var before = clock;
        clock -= dt;
        if (before > 4 && clock <= 4) game.audio.tone('F4', 0.5, { wave: 'square', volume: 0.06 });
        if (clock <= 0) { clock = 0; closeOut(false); }
      }
    } else if (gate === 'stop') {
      frozen -= dt;
      if (frozen <= 0) { gate = 'outro'; finT = 1.4; }
    } else if (gate === 'outro') {
      finT -= dt;
      if (finT <= 0) {
        state = S.RESULT;
        var stats = { cut: cut, doubles: doubles, slow: slow };
        if (pass) game.end.success(Math.max(1, tally()), stats); else game.end.failure(stats);
        return;
      }
    }
    moveBits(dt);

    drawStation(); drawSlabs(); drawFoot(); drawHud();
    if (glow) {
      glow.t -= dt;
      if (Math.floor(t * 16) % 2 === 0) game.draw.rect(LX - 20, glow.y - 10, RX - LX + 40, ROW_H + 20, N.white, 0.45);
      if (glow.t <= 0 && gate !== 'stop') glow = null;
    }
    if (gate === 'ready') print(count > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.42, 100, N.amber);
    if (gate === 'outro') {
      game.draw.rect(0, H * 0.35, W, H * 0.17, N.black, 0.88);
      print(pass ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.4, 92, pass ? N.amber : N.red);
      if (pass && tally() > game.best) print('NEW RECORD', W / 2, H * 0.46, 46, N.amber);
      else if (pass) print('BEST ' + game.best, W / 2, H * 0.46, 40, N.white);
      else print('あと' + Math.max(1, ROWS - cut) + '段!', W / 2, H * 0.46, 48, N.white);
    }
  });

  game.onStart(function() {
    game.audio.melody([
      ['E5', 0.25], ['E5', 0.25], ['B4', 0.5], ['E5', 0.25], ['F#5', 0.25], ['G5', 0.5],
      ['F#5', 0.25], ['E5', 0.25], ['D5', 0.5], ['B4', 1],
      ['C5', 0.25], ['D5', 0.25], ['E5', 0.5], ['D5', 0.25], ['C5', 0.25], ['B4', 1.5]
    ], { tempo: 150, wave: 'square', volume: 0.045, loop: true, bass: [['E2', 1], ['B2', 1], ['C3', 1], ['B2', 1]] });
    state = S.ATTRACT;
    newRound();
  });
})(game);
