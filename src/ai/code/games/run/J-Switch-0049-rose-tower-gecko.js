// J-Switch-0049-rose-tower-gecko.js
// 野バラの見張り塔 — とげのつるが伸びてくる石積みの塔を、左・中・右の足がかりを選んで跳び移りながら頂上へ
// 操作: 画面の左・中・右の列をタップすると、ヤモリがその列の一段上の足がかりへ跳ぶ。つぼみが光った列にはとげのつるが伸びるので避ける(社内メモ。画面には出さない)
// 終わり: 頂上の一輪にたどり着けばCLEAR。とげに3回刺さる/時間切れでGAME OVER
// @mechanic: camera_climb
// @theme: castle_rose_tower_gecko
// 世界観: 百年前に打ち捨てられた古城の見張り塔を野バラのつるがすっかり覆い、庭師に弟子入りした見習いのヤモリが、師匠の薬に使う頂上の一輪を摘むため、伸び縮みするとげのつるの隙を縫って石積みをよじ登る
// 残るもの: 正誤(CLEAR/GAME OVER) + 登った段数・刺さった数・到着秒
// スタイル: 90s BIG SPRITE

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s BIG SPRITE: 多色、巨大キャラ、床影、間合いで見せる
  var STYLE = { bg: ['#1a2848', '#4a5a88', '#8a9ac8'], main: ['#8a8078', '#b8aca0', '#5a524a'], accent: ['#e83a5a', '#60d060'] };
  var G = {
    night: '#1a2848', mid: '#4a5a88', pale: '#8a9ac8', stone: '#8a8078', stoneHi: '#b8aca0', stoneLo: '#5a524a',
    vine: '#2a7a3a', leaf: '#60d060', rose: '#e83a5a', thorn: '#f0f0d0', gold: '#ffd040', ink: '#10141e', white: '#ffffff', bad: '#ff3040'
  };

  var GAME_TITLE = 'THORN TOWER';
  var TIME_LIMIT = 20;
  var TOP_ROW = 14;
  var MAX_PRICK = 3;
  var COLS = [W * 0.2, W * 0.5, W * 0.8];
  var ROW_GAP = 250, BASE_Y = 1250;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var mode, cnt, secs, rows, me, cam, pricks, thorns, thornIn, lock, hold, outT, reached, zap, midPop;

  var GECKO = [
    ['g..........g', '.g........g.', '..gggggggg..', '..gyggggyg..', '...gggggg...', '....gkkg....', '...gggggg...', '..gggggggg..', '.g..gggg..g.', 'g....gg....g', '.....gg.....', '......g.....'],
    ['.g........g.', 'g..........g', '..gggggggg..', '..gyggggyg..', '...gggggg...', '....gkkg....', '...gggggg...', '..gggggggg..', 'g...gggg...g', '.g...gg...g.', '.....gg.....', '.....g......']
  ];
  var ROSE = ['.r.r.', 'rrrrr', 'rrwrr', '.rrr.', '..g..', '.gg..'];
  var BUD = ['.r.', 'rrr', '.g.'];

  function tx(s, x, y, sz, col, al) {
    game.draw.text(s, x + 4, y + 4, { size: sz, color: G.ink, bold: true, align: al || 'center' });
    game.draw.text(s, x, y, { size: sz, color: col, bold: true, align: al || 'center' });
  }

  // 足がかりの列(各段に1〜2個。必ず隣り合う段へ届く)
  function buildRows() {
    rows = [{ holds: [1] }];
    for (var r = 1; r <= TOP_ROW; r++) {
      if (r === TOP_ROW) { rows.push({ holds: [1] }); continue; }
      var a = Math.floor(game.random(0, 2.999));
      var h = [a];
      if (game.random(0, 1) < 0.55) { var b = (a + 1 + Math.floor(game.random(0, 1.999))) % 3; h.push(b); }
      rows.push({ holds: h });
    }
  }

  function start() {
    mode = 'ready'; cnt = 0.8; secs = TIME_LIMIT; me = { row: 0, col: 1, jump: 0, fromCol: 1 }; cam = 0;
    pricks = 0; thorns = []; thornIn = 1.0; lock = 0; hold = 0; outT = 0; reached = false; zap = null; midPop = false;
    buildRows();
  }

  function rowY(r) { return BASE_Y - r * ROW_GAP + cam; }

  function thornOn(row, col) {
    for (var i = 0; i < thorns.length; i++) if (thorns[i].row === row && thorns[i].col === col && thorns[i].st === 'out') return thorns[i];
    return null;
  }

  // とげのつる(実プレイ・デモ共用)
  function growThorns(dt) {
    thornIn -= dt;
    if (thornIn <= 0) {
      var off = Math.floor(game.random(0, 2.999));
      var row = Math.min(TOP_ROW - 1, me.row + off);
      var list = rows[row].holds;
      var col = off === 0 ? me.col : list[Math.floor(game.random(0, list.length - 0.001))];
      thorns.push({ row: row, col: col, st: 'warn', t: 0.7 });
      game.audio.tone('B5', 0.06, { wave: 'triangle', volume: 0.04 });
      thornIn = Math.max(0.7, 1.4 - me.row * 0.05);
    }
    for (var i = thorns.length - 1; i >= 0; i--) {
      var th = thorns[i];
      th.t -= dt;
      if (th.st === 'warn' && th.t <= 0) { th.st = 'out'; th.t = 1.0; game.audio.tone('E3', 0.1, { wave: 'sawtooth', volume: 0.04 }); }
      else if (th.st !== 'warn' && th.t <= 0) thorns.splice(i, 1);
    }
  }

  function leap(col, ghost) {
    if (me.jump > 0) return 'busy';
    var next = me.row + 1;
    if (next > TOP_ROW) return 'busy';
    if (rows[next].holds.indexOf(col) < 0) {
      game.audio.tone('C4', 0.06, { wave: 'square', volume: 0.04 });
      game.fx.burst(COLS[col], rowY(next), { color: G.stoneHi, count: 5, speed: 140 });
      if (!ghost) lock = 0.25;
      return 'none';
    }
    me.fromCol = me.col; me.col = col; me.row = next; me.jump = 0.2;
    game.audio.play('se_jump', 0.3);
    if (ghost) return 'ok';
    if (!midPop && me.row >= TOP_ROW / 2) {
      midPop = true;
      game.audio.play('se_milestone', 0.5);
      game.fx.popup(me.row + ' / ' + TOP_ROW, W / 2, 330, { color: G.gold, size: 70 });
    } else game.feedback.good(COLS[col], rowY(next) - 180, { text: 'GOOD', color: G.leaf, count: 6, sound: false });
    if (me.row >= TOP_ROW) finish(true);
    return 'ok';
  }

  function prick(th, ghost) {
    th.st = 'spent'; th.t = 0.3;
    var y = rowY(me.row);
    if (me.row > 0) { me.row--; me.col = rows[me.row].holds[0]; }
    me.safe = 0.9;
    if (ghost) { game.fx.burst(COLS[th.col], y, { color: G.bad, count: 10, speed: 220 }); return; }
    pricks++;
    zap = { x: COLS[th.col], y: y, t: 0.45 };
    game.feedback.bad(COLS[th.col], y - 200, { text: 'MISS', color: G.bad });
    if (pricks >= MAX_PRICK) finish(false); else hold = 0.35;
  }

  function finish(win) {
    if (mode === 'stop' || mode === 'out') return;
    reached = win; mode = 'stop'; hold = 0.55;
    game.audio.stopBgm();
    if (win) { game.fx.flash(G.white, 0.25); game.audio.play('se_success', 0.6); game.fx.burst(COLS[1], rowY(TOP_ROW) - 80, { color: G.rose, count: 24, speed: 360 }); }
    else {
      if (secs <= 0) game.feedback.bad(W / 2, H * 0.42, { text: 'TIME UP', color: G.bad });
      game.audio.play('se_failure', 0.6);
    }
  }

  function tickClimb(dt, ghost) {
    growThorns(dt);
    if (me.jump > 0) me.jump -= dt;
    if (me.safe > 0) me.safe -= dt;
    var want = me.row * ROW_GAP;
    cam += (want - cam) * Math.min(1, dt * 6);
    if (me.jump <= 0 && !(me.safe > 0)) {
      var th = thornOn(me.row, me.col);
      if (th) prick(th, ghost);
    }
  }

  game.onTap(function(x) {
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.6); state = S.PLAYING; start(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; start(); demo.t = 0; return; }
    if (mode !== 'climb' || hold > 0 || lock > 0) { game.audio.tone('D4', 0.03, { wave: 'square', volume: 0.02 }); return; }
    game.audio.play('se_tap', 0.15);
    leap(x < W / 3 ? 0 : x < W * 2 / 3 ? 1 : 2, false);
  });

  // ── demo: 光ったつぼみの無い足がかりを選んで跳ぶ。6回に1回は光った列へ跳んで刺さる ──
  var demo = { t: 0, gx: W / 2, gy: 1650, press: 0, wait: 0.5, n: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    if (demo.t <= dt || me.row >= TOP_ROW - 1) { me = { row: 0, col: 1, jump: 0, fromCol: 1 }; cam = 0; thorns = []; buildRows(); }
    tickClimb(dt, true);
    demo.press -= dt;
    demo.wait -= dt;
    if (demo.wait > 0 || me.jump > 0) return;
    var next = rows[me.row + 1];
    var pick = next.holds[0], risky = false;
    for (var i = 0; i < next.holds.length; i++) {
      var c = next.holds[i], bad = false;
      for (var j = 0; j < thorns.length; j++) if (thorns[j].row === me.row + 1 && thorns[j].col === c) bad = true;
      if (!bad) { pick = c; risky = false; break; }
      risky = true;
    }
    demo.n++;
    if (risky && demo.n % 6 !== 0) { demo.wait = 0.3; return; }
    demo.gx = COLS[pick]; demo.gy = 1650; demo.press = 0.18; demo.wait = 0.55;
    leap(pick, true);
  }

  // ── drawing ──
  function drawTower() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, G.night], [0.6, G.mid], [1, G.pale]]);
    for (var s = 0; s < 12; s++) game.draw.circle((s * 97) % W, 260 + (s * 53) % 300, 3 + (s % 2) * 2, G.white, 0.4 + 0.3 * Math.sin(t * 2 + s));
    // 石積み(カメラと一緒に流れる)
    var off = cam % 120;
    for (var y = -120; y < 1440; y += 120) {
      var yy = y + off;
      var shift = Math.floor((y - cam) / 120) % 2 ? 90 : 0;
      for (var x = -180; x < W; x += 180) {
        game.draw.rect(x + shift + 6, yy + 6, 168, 108, G.stone, 0.55);
        game.draw.rect(x + shift + 6, yy + 6, 168, 14, G.stoneHi, 0.4);
      }
    }
    // 塔を這う太いつる(遠景)
    for (var v = 0; v < 3; v++) {
      var vx = COLS[v] + (v - 1) * 150;
      for (var k = 0; k < 16; k++) game.draw.circle(vx + Math.sin(k * 0.9 + v + cam * 0.004) * 60, 250 + k * 80, 14, G.vine, 0.6);
    }
    game.draw.rect(0, 0, W, H, G.pale, 0.03 + 0.03 * Math.sin(t * 1.3));
  }

  function drawHolds() {
    var t = game.time.elapsed;
    for (var r = 0; r < rows.length; r++) {
      var y = rowY(r);
      if (y < 200 || y > 1480) continue;
      for (var i = 0; i < rows[r].holds.length; i++) {
        var c = rows[r].holds[i];
        game.draw.rect(COLS[c] - 90, y + 50, 180, 36, G.stoneLo);
        game.draw.rect(COLS[c] - 90, y + 50, 180, 10, G.stoneHi);
      }
      if (r === TOP_ROW) game.draw.sprite(ROSE, { r: G.rose, w: G.white, g: G.leaf }, COLS[1], y - 40 + Math.sin(t * 3) * 6, 22, { anchor: 'center' });
    }
    for (var j = 0; j < thorns.length; j++) {
      var th = thorns[j];
      var ty = rowY(th.row);
      if (ty < 200 || ty > 1480) continue;
      var fromLeft = th.col === 0 || (th.col === 1 && th.row % 2 === 0);
      var edge = fromLeft ? 0 : W;
      if (th.st === 'warn') {
        game.draw.sprite(BUD, { r: G.rose, g: G.leaf }, fromLeft ? 40 : W - 40, ty, 16, { anchor: 'center' });
        if (Math.floor(t * 12) % 2 === 0) game.draw.circle(COLS[th.col], ty, 110, G.bad, 0.3);
      } else if (th.st === 'out') {
        var tip = COLS[th.col] + (fromLeft ? 110 : -110);
        game.draw.line(edge, ty, tip, ty, G.vine, 26);
        for (var p = 0; p < 7; p++) {
          var px = edge + (tip - edge) * (p + 0.5) / 7;
          game.draw.line(px, ty - 12, px + (fromLeft ? 16 : -16), ty - 42, G.thorn, 6);
          game.draw.line(px, ty + 12, px + (fromLeft ? 16 : -16), ty + 42, G.thorn, 6);
        }
      }
    }
  }

  function drawGecko() {
    var t = game.time.elapsed;
    var y = rowY(me.row), x = COLS[me.col];
    if (me.jump > 0) {
      var k = 1 - me.jump / 0.2;
      x = COLS[me.fromCol] + (COLS[me.col] - COLS[me.fromCol]) * k;
      y = rowY(me.row) + ROW_GAP * (1 - k) - Math.sin(k * Math.PI) * 80;
    }
    game.draw.rect(x - 80, y + 70, 160, 14, G.ink, 0.35);
    game.draw.sprite(GECKO[Math.floor(t * 4) % 2], { g: G.leaf, y: G.gold, k: G.ink }, x + Math.sin(t * 2.5) * 4, y - 20, 16, { anchor: 'center' });
  }

  function drawPads() {
    var t = game.time.elapsed;
    game.draw.rect(0, 1440, W, H - 1440, G.ink);
    for (var c = 0; c < 3; c++) {
      var next = rows[Math.min(TOP_ROW, me.row + 1)];
      var has = next.holds.indexOf(c) >= 0;
      game.draw.rect(c * W / 3 + 20, 1500, W / 3 - 40, 240, has ? G.stoneLo : G.night, 0.8 + 0.1 * Math.sin(t * 3 + c));
      if (has) game.draw.rect(c * W / 3 + 80, 1600, W / 3 - 160, 30, G.stoneHi);
    }
    for (var m = 0; m < MAX_PRICK; m++) game.draw.sprite(BUD, { r: m < pricks ? G.bad : G.stoneLo, g: G.leaf }, W / 2 - 90 + m * 90, 1810, 12, { anchor: 'center' });
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 228, G.ink, 0.85);
    tx(me.row + ' / ' + TOP_ROW, W / 2, 95, 70, G.white);
    tx(String(Math.ceil(secs)), 60, 95, 52, G.gold, 'left');
    game.draw.rect(60, 160, W - 120, 22, G.stoneLo);
    game.draw.rect(60, 160, (W - 120) * me.row / TOP_ROW, 22, G.leaf);
    game.draw.rect(60, 192, (W - 120) * Math.max(0, secs / TIME_LIMIT), 10, secs < 5 ? G.bad : G.gold);
  }

  function points() { return me.row * 80 + (MAX_PRICK - pricks) * 100 + Math.ceil(secs) * 20; }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;
    if (state === S.ATTRACT) {
      if (mode === undefined) start();
      stepDemo(dt);
      drawTower(); drawHolds(); drawGecko(); drawPads();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press > 0, scale: 13 });
      game.draw.rect(0, 0, W, 228, G.ink, 0.85);
      tx(GAME_TITLE, W / 2, 95 + Math.sin(t * 2) * 6, 80, G.rose);
      tx('HI-SCORE ' + game.best, W / 2, 180, 36, G.gold);
      if (Math.floor(t * 1.8) % 2 === 0) tx('► 100円 投入 ◄', W / 2, H * 0.97, 40, G.gold);
      else tx('INSERT COIN', W / 2, H * 0.97, 34, G.white);
      return;
    }
    if (state === S.RESULT) {
      drawTower(); drawHolds(); drawPads();
      tx(reached ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.42, 92, reached ? G.gold : G.bad);
      tx('SCORE ' + (reached ? points() : 0), W / 2, H * 0.48, 44, G.white);
      if (Math.floor(t * 2) % 2 === 0) tx('TAP TO CONTINUE', W / 2, H * 0.97, 38, G.white);
      return;
    }

    if (mode === 'ready') {
      cnt -= dt;
      if (cnt <= 0) { mode = 'climb'; game.audio.play('se_tap', 0.5); }
    } else if (mode === 'climb') {
      if (hold > 0) hold -= dt;
      else {
        if (lock > 0) lock -= dt;
        secs -= dt;
        tickClimb(dt, false);
        if (secs <= 0 && mode === 'climb') { secs = 0; finish(false); }
      }
    } else if (mode === 'stop') {
      hold -= dt;
      if (hold <= 0) { mode = 'out'; outT = 1.4; }
    } else if (mode === 'out') {
      outT -= dt;
      if (outT <= 0) {
        state = S.RESULT;
        var stats = { rows: me.row, pricks: pricks, seconds: Math.round((TIME_LIMIT - secs) * 10) / 10 };
        if (reached) game.end.success(points(), stats); else game.end.failure(stats);
        return;
      }
    }

    drawTower(); drawHolds(); drawGecko(); drawPads(); drawHud();
    if (zap) {
      zap.t -= dt;
      if (Math.floor(t * 16) % 2 === 0) game.draw.circle(zap.x, zap.y, 150, G.white, 0.45);
      if (zap.t <= 0 && mode !== 'stop') zap = null;
    }
    if (mode === 'ready') tx(cnt > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.42, 100, G.gold);
    if (mode === 'out') {
      game.draw.rect(0, H * 0.35, W, H * 0.17, G.ink, 0.88);
      tx(reached ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.4, 92, reached ? G.gold : G.bad);
      if (reached && points() > game.best) tx('NEW RECORD', W / 2, H * 0.46, 46, G.gold);
      else if (reached) tx('BEST ' + game.best, W / 2, H * 0.46, 40, G.white);
      else tx('あと' + Math.max(1, TOP_ROW - me.row) + '段!', W / 2, H * 0.46, 48, G.white);
    }
  });

  game.onStart(function() {
    game.audio.melody([
      ['G4', 0.5], ['B4', 0.5], ['D5', 0.5], ['G5', 0.5], ['F#5', 0.75], ['E5', 0.25], ['D5', 1],
      ['C5', 0.5], ['E5', 0.5], ['D5', 0.5], ['B4', 0.5], ['A4', 1.5], ['R', 0.5]
    ], { tempo: 138, wave: 'square', volume: 0.04, loop: true, bass: [['G2', 2], ['C3', 2], ['D3', 2], ['G2', 2]] });
    state = S.ATTRACT;
    start();
  });
})(game);
