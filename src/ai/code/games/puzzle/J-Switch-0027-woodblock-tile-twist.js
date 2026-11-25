// J-Switch-0027-woodblock-tile-twist.js
// 版木タイルまわし — 風で向きがばらばらになった9枚の版木を、指で円を描いて1枚ずつ回し、元の一枚の版画にそろえる
// 操作: 向きの違う版木の上で指をぐるりと回す。4分の1周ごとに版木が90度回る(逆回しも可)(社内メモ。画面には出さない)
// 終わり: 全ての版木が正しい向きになればCLEAR。時間切れでGAME OVER
// @mechanic: rotate_gesture
// @theme: woodblock_print_tile_twist
// 世界観: 川沿いの版画工房で、見習いの摺師が、突風で床に散らばり向きの狂った9枚の版木を、親方が戻る前に指先でくるりと回して元の山と太陽の一枚絵に組み直し、摺りの刻限に間に合わせる
// 残るもの: 正誤(CLEAR/GAME OVER) + そろえた版木の数・回した回数・ずらし直し回数
// スタイル: 1BIT INK

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 1BIT INK: 白黒2値。階調はディザ(市松)で作り、線の太さで語る
  var STYLE = { bg: ['#f2efe6', '#e4e0d4'], main: ['#111111', '#ffffff'], accent: ['#111111', '#f2efe6'] };
  var C = { paper: '#f2efe6', paper2: '#dcd8cc', ink: '#111111', white: '#ffffff', mid: '#8a8a8a' };

  var GAME_TITLE = 'BLOCK TWIST';
  var TIME_LIMIT = 15;
  var N = 3, CELL = 8, PX = 26;
  var TS = CELL * PX, GAP = 12;
  var OX = (W - (N * TS + (N - 1) * GAP)) / 2, OY = H * 0.3;
  var QUARTER = Math.PI / 2;

  // 24x24 の版画(山・太陽・鳥・波)を組み立て、8x8 の版木9枚に切る
  function buildPicture() {
    var rows = [];
    for (var y = 0; y < 24; y++) {
      var s = '';
      for (var x = 0; x < 24; x++) {
        var v = false;
        if (x === 0 || y === 0 || x === 23 || y === 23) v = true;
        var d = Math.hypot(x - 17.5, y - 5.5);
        if (d < 3.7 && d > 2.3) v = true;
        if (d < 1.2) v = true;
        if (y >= 8 && y <= 19) {
          var hw = (y - 8) * 0.8;
          if (Math.abs(x - 8) <= hw) {
            if (y <= 11) v = Math.abs(x - 8) > hw - 1.1;
            else v = (x + y) % 2 === 0 || Math.abs(x - 8) > hw - 1.1;
          }
        }
        if (y >= 14 && y <= 19 && Math.abs(x - 18.5) <= (y - 14) * 1.1) v = true;
        if (y === 19) v = true;
        if (y >= 20 && y <= 22 && y === 21 + Math.round(Math.sin(x * 0.9))) v = true;
        if ((x === 3 && y === 4) || (x === 4 && y === 5) || (x === 5 && y === 4) || (x === 9 && y === 3) || (x === 10 && y === 4) || (x === 11 && y === 3) || (x === 6 && y === 2)) v = true;
        s += v ? 'k' : '.';
      }
      rows.push(s);
    }
    var tiles = [];
    for (var ty = 0; ty < N; ty++) for (var tx = 0; tx < N; tx++) {
      var t = [];
      for (var r = 0; r < CELL; r++) t.push(rows[ty * CELL + r].substr(tx * CELL, CELL));
      tiles.push(t);
    }
    return tiles;
  }
  function rotCW(a) {
    var n = a.length, out = [];
    for (var r = 0; r < n; r++) { var s = ''; for (var c = 0; c < n; c++) s += a[n - 1 - c].charAt(r); out.push(s); }
    return out;
  }
  function rotN(a, k) { k = ((k % 4) + 4) % 4; var o = a; for (var i = 0; i < k; i++) o = rotCW(o); return o; }
  function same(a, b) { for (var i = 0; i < a.length; i++) if (a[i] !== b[i]) return false; return true; }

  var BASE = buildPicture();
  var CACHE = [];
  for (var bi = 0; bi < BASE.length; bi++) CACHE.push([BASE[bi], rotN(BASE[bi], 1), rotN(BASE[bi], 2), rotN(BASE[bi], 3)]);

  var APPRENTICE = [
    ['..kkk..', '.kkkkk.', '..k.k..', '..kkk..', '.kkkkk.', 'k.kkk.k', '..k.k..', '.k...k.'],
    ['..kkk..', '.kkkkk.', '..k.k..', '..kkk..', 'kkkkkkk', '..kkk..', '..k.k..', '..k.k..']
  ];
  var BRUSH = ['..k.', '..k.', '..k.', '.kkk', 'kkkk', 'kkkk'];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var phase, ready, timeLeft, rot, fixedN, scrambled, grab, turns, slips, hitStop, outro, ok, halfShown, snapFx, NEEDED;

  function txt(s, x, y, sz, col, align) {
    game.draw.text(s, x + 3, y + 3, { size: sz, color: col === C.ink ? C.white : C.ink, bold: true, align: align || 'center' });
    game.draw.text(s, x, y, { size: sz, color: col, bold: true, align: align || 'center' });
  }

  function isRight(i) { return same(CACHE[i][rot[i]], BASE[i]); }
  function countFixed() { var n = 0; for (var i = 0; i < 9; i++) if (scrambled[i] && isRight(i)) n++; return n; }
  function tileCenter(i) { return { x: OX + (i % N) * (TS + GAP) + TS / 2, y: OY + Math.floor(i / N) * (TS + GAP) + TS / 2 }; }

  function initGame() {
    phase = 'ready'; ready = 0.8; timeLeft = TIME_LIMIT; turns = 0; slips = 0;
    hitStop = 0; outro = 0; ok = false; halfShown = false; grab = null; snapFx = [];
    rot = []; scrambled = [];
    // 回転で見分けのつく版木だけを6枚狂わせる
    var order = [0, 1, 2, 3, 4, 5, 6, 7, 8];
    for (var i = 8; i > 0; i--) { var j = Math.floor(game.random(0, i + 1)) % (i + 1); var t = order[i]; order[i] = order[j]; order[j] = t; }
    for (var k = 0; k < 9; k++) { rot.push(0); scrambled.push(false); }
    var n = 0;
    for (var q = 0; q < 9 && n < 6; q++) {
      var id = order[q];
      if (same(CACHE[id][1], BASE[id])) continue;
      rot[id] = 1 + (Math.floor(game.random(0, 3)) % 3);
      if (same(CACHE[id][rot[id]], BASE[id])) { rot[id] = 1; }
      scrambled[id] = true; n++;
    }
    NEEDED = n; fixedN = 0;
  }

  // 版木を1/4回す(実プレイ・デモ共用)。dir=+1 時計回り / -1 反時計回り
  function turnTile(i, dir, isDemo) {
    var wasRight = isRight(i);
    rot[i] = (rot[i] + dir + 4) % 4;
    var c = tileCenter(i);
    snapFx.push({ x: c.x, y: c.y, t: 0.25 });
    if (!isDemo) { turns++; game.audio.tone(dir > 0 ? 'G4' : 'E4', 0.05, { wave: 'square', volume: 0.05 }); }
    var nowRight = isRight(i);
    if (!scrambled[i] && !nowRight) scrambled[i] = true;
    if (isDemo) fixedN = countFixed();
    if (nowRight && !wasRight) {
      if (isDemo) { game.fx.burst(c.x, c.y, { color: C.ink, count: 10, speed: 220 }); return; }
      fixedN = countFixed();
      game.feedback.good(c.x, c.y - 140, { text: 'GOOD', color: C.ink, count: 12 });
      game.audio.play('se_coin', 0.35);
      if (!halfShown && fixedN >= Math.ceil(NEEDED / 2) && fixedN < NEEDED) {
        halfShown = true;
        game.audio.play('se_milestone', 0.5);
        game.fx.popup(fixedN + ' / ' + NEEDED, W / 2, OY - 60, { color: C.ink, size: 64 });
      }
      if (allRight()) finish(true);
    } else if (wasRight && !nowRight) {
      if (isDemo) { game.fx.burst(c.x, c.y, { color: C.mid, count: 6, speed: 160 }); return; }
      slips++; fixedN = countFixed();
      hitStop = 0.3;
      game.feedback.bad(c.x, c.y - 140, { text: 'MISS', color: C.ink, flashColor: '#444444', shake: 6 });
    }
  }
  function allRight() { for (var i = 0; i < 9; i++) if (!isRight(i)) return false; return true; }

  // 指の回転量を積み上げ、90度ごとに1回す
  function feedAngle(ang, isDemo) {
    if (!grab) return;
    var d = ang - grab.last;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    grab.last = ang; grab.acc += d;
    while (grab.acc >= QUARTER * 0.9) { grab.acc -= QUARTER; turnTile(grab.i, 1, isDemo); if (phase !== 'play' && !isDemo) return; }
    while (grab.acc <= -QUARTER * 0.9) { grab.acc += QUARTER; turnTile(grab.i, -1, isDemo); if (phase !== 'play' && !isDemo) return; }
  }

  function tileAt(x, y) {
    var best = -1, bd = TS * 0.75;
    for (var i = 0; i < 9; i++) { var c = tileCenter(i); var d = Math.hypot(x - c.x, y - c.y); if (d < bd) { bd = d; best = i; } }
    return best;
  }

  function finish(win) {
    if (phase === 'stop' || phase === 'outro') return;
    ok = win; phase = 'stop'; hitStop = 0.6; grab = null;
    game.audio.stopBgm();
    if (win) { game.fx.flash(C.white, 0.3); game.audio.play('se_success', 0.6); }
    else {
      game.feedback.bad(W / 2, H * 0.45, { text: 'TIME UP', color: C.ink, flashColor: '#444444' });
      game.audio.play('se_failure', 0.6);
    }
  }

  // ── input ─────────────────────────────────────────────────────────
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.6); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function(x, y) {
    if (state !== S.PLAYING || phase !== 'play' || hitStop > 0) return;
    var i = tileAt(x, y);
    if (i < 0) { game.audio.tone('C3', 0.05, { wave: 'square', volume: 0.03 }); game.fx.burst(x, y, { color: C.mid, count: 3, speed: 80 }); return; }
    var c = tileCenter(i);
    grab = { i: i, last: Math.atan2(y - c.y, x - c.x), acc: 0, x: x, y: y };
    game.audio.play('se_tap', 0.25);
    game.fx.burst(x, y, { color: C.ink, count: 4, speed: 90 });
  });
  game.onMove(function(x, y) {
    if (state !== S.PLAYING || phase !== 'play' || !grab || hitStop > 0) return;
    var c = tileCenter(grab.i);
    // 指の軌跡に墨の飛沫を残す
    if (Math.hypot(x - grab.x, y - grab.y) > 40) game.fx.burst(x, y, { color: C.ink, count: 1, speed: 30 });
    grab.x = x; grab.y = y;
    if (Math.hypot(x - c.x, y - c.y) < 24) return;
    feedAngle(Math.atan2(y - c.y, x - c.x), false);
  });
  game.onRelease(function(x, y) {
    if (!grab) return;
    if (state === S.PLAYING && phase === 'play') { game.audio.tone('D4', 0.03, { wave: 'triangle', volume: 0.03 }); game.fx.burst(x, y, { color: C.mid, count: 2, speed: 60 }); }
    grab = null;
  });

  // ── demo(狂った版木の上で指を回して2枚そろえ、3枚目は回しすぎて戻す)──────
  var demo = { t: 0, gx: W / 2, gy: H * 0.8, press: false, n: 0, target: -1, ang: 0, mode: 'fix' };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 10;
    if (cyc < dt || demo.t <= dt) { initGame(); demo.n = 0; demo.target = -1; grab = null; }
    for (var f = snapFx.length - 1; f >= 0; f--) { snapFx[f].t -= dt; if (snapFx[f].t <= 0) snapFx.splice(f, 1); }
    demo.press = false;
    if (cyc < 0.8) return;
    if (demo.target < 0) {
      for (var i = 0; i < 9; i++) if (!isRight(i)) { demo.target = i; break; }
      if (demo.target < 0) return;
      demo.ang = -Math.PI / 2; demo.mode = 'fix';
      grab = { i: demo.target, last: demo.ang, acc: 0 };
    }
    var c = tileCenter(demo.target);
    var right = isRight(demo.target);
    // 3枚目だけ、そろった後に1回回しすぎてから逆回しで戻す
    if (demo.mode === 'fix' && right) demo.mode = demo.n % 3 === 2 ? 'over' : 'done';
    else if (demo.mode === 'over' && !right) demo.mode = 'back';
    else if (demo.mode === 'back' && right) demo.mode = 'done';
    if (demo.mode === 'done') { demo.n++; demo.target = -1; grab = null; return; }
    demo.ang += (demo.mode === 'back' ? -1 : 1) * dt * 5.2;
    demo.gx = c.x + Math.cos(demo.ang) * 150; demo.gy = c.y + Math.sin(demo.ang) * 150;
    demo.press = true;
    feedAngle(demo.ang, true);
  }

  // ── drawing ───────────────────────────────────────────────────────
  function drawWorkshop() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, C.paper], [1, C.paper2]]);
    // ディザの床と棚(市松で灰)
    for (var y = Math.floor(H * 0.7); y < H * 0.83; y += 12) for (var x = (y / 12) % 2 ? 0 : 12; x < W; x += 24) game.draw.rect(x, y, 12, 12, C.ink, 0.5);
    game.draw.rect(0, H * 0.7, W, 6, C.ink);
    // 吊るした摺り上がりの紙(風で揺れる)
    for (var p = 0; p < 4; p++) {
      var px = 110 + p * 290, sw = Math.sin(t * 1.6 + p) * 10;
      game.draw.line(px - 80, 250, px + 80, 250, C.ink, 3);
      game.draw.rect(px - 60 + sw, 256, 120, 90, C.white);
      game.draw.rect(px - 60 + sw, 256, 120, 4, C.ink);
      game.draw.rect(px - 60 + sw, 342, 120, 4, C.ink);
      game.draw.line(px - 40 + sw, 320, px + sw, 280, C.ink, 4);
      game.draw.line(px + sw, 280, px + 40 + sw, 320, C.ink, 4);
    }
    game.draw.rect(0, 0, W, H, C.ink, 0.012 + 0.012 * Math.sin(t * 1.3));
  }

  function drawTiles() {
    var t = game.time.elapsed;
    // 版台
    game.draw.rect(OX - 24, OY - 24, N * TS + (N - 1) * GAP + 48, N * TS + (N - 1) * GAP + 48, C.ink);
    game.draw.rect(OX - 16, OY - 16, N * TS + (N - 1) * GAP + 32, N * TS + (N - 1) * GAP + 32, C.paper2);
    for (var i = 0; i < 9; i++) {
      var c = tileCenter(i);
      var x0 = c.x - TS / 2, y0 = c.y - TS / 2;
      var right = isRight(i);
      game.draw.rect(x0, y0, TS, TS, C.white);
      game.draw.sprite(CACHE[i][rot[i]], { k: C.ink }, x0, y0, PX);
      if (!right) {
        // 狂った版木: 角の点線(ディザ)で示す
        for (var k = 0; k < TS; k += 16) {
          game.draw.rect(x0 + k, y0 - 8, 8, 4, C.ink); game.draw.rect(x0 + k, y0 + TS + 4, 8, 4, C.ink);
        }
      }
      if (grab && grab.i === i) {
        var p = Math.max(0, Math.min(1, Math.abs(grab.acc) / QUARTER));
        for (var d = 0; d < 12; d++) {
          var a = -Math.PI / 2 + (grab.acc >= 0 ? 1 : -1) * d / 12 * QUARTER;
          game.draw.circle(c.x + Math.cos(a) * (TS * 0.62), c.y + Math.sin(a) * (TS * 0.62), d / 12 <= p ? 9 : 4, C.ink);
        }
      }
    }
    for (var f = 0; f < snapFx.length; f++) {
      var s = snapFx[f];
      game.draw.rect(s.x - TS / 2 - 6, s.y - TS / 2 - 6, TS + 12, 6, C.ink, s.t * 4);
      game.draw.rect(s.x - TS / 2 - 6, s.y + TS / 2, TS + 12, 6, C.ink, s.t * 4);
    }
    if (phase === 'stop' && ok && Math.floor(t * 10) % 2 === 0) game.draw.rect(OX - 24, OY - 24, N * TS + (N - 1) * GAP + 48, 10, C.ink);
  }

  function drawBottom() {
    var t = game.time.elapsed;
    game.draw.sprite(APPRENTICE[Math.floor(t * 2) % 2], { k: C.ink }, W * 0.15, H * 0.88 + Math.sin(t * 2.4) * 5, 16, { anchor: 'center' });
    game.draw.sprite(BRUSH, { k: C.ink }, W * 0.86, H * 0.88 + Math.sin(t * 3) * 6, 14, { anchor: 'center' });
    for (var i = 0; i < NEEDED; i++) {
      var on = i < fixedN;
      game.draw.rect(W * 0.3 + i * 76, H * 0.87, 52, 52, C.ink);
      game.draw.rect(W * 0.3 + i * 76 + 6, H * 0.87 + 6, 40, 40, on ? C.ink : C.white);
    }
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 225, C.ink);
    game.draw.text(fixedN + ' / ' + NEEDED, W / 2, 90, { size: 66, color: C.white, bold: true, align: 'center' });
    game.draw.text(String(Math.ceil(timeLeft)), 70, 90, { size: 52, color: C.white, bold: true, align: 'left' });
    game.draw.rect(60, 170, W - 120, 20, C.white);
    game.draw.rect(64, 174, (W - 128) * Math.max(0, timeLeft / TIME_LIMIT), 12, timeLeft < 4 && Math.floor(game.time.elapsed * 8) % 2 ? C.white : C.ink);
  }

  function score() { return fixedN * 250 + Math.round(timeLeft * 30) - slips * 50 + Math.max(0, 40 - turns) * 5; }

  // ── main loop ─────────────────────────────────────────────────────
  game.onUpdate(function(dt) {
    var t = game.time.elapsed;

    if (state === S.ATTRACT) {
      if (phase === undefined) initGame();
      stepDemo(dt);
      drawWorkshop(); drawTiles(); drawBottom();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 14 });
      game.draw.rect(0, 0, W, 230, C.ink);
      game.draw.text(GAME_TITLE, W / 2, 90 + Math.sin(t * 2) * 6, { size: 80, color: C.white, bold: true, align: 'center' });
      game.draw.text('HI-SCORE ' + game.best, W / 2, 180, { size: 36, color: C.white, bold: true, align: 'center' });
      if (Math.floor(t * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.77, 42, C.ink);
      else txt('INSERT COIN', W / 2, H * 0.77, 36, C.ink);
      return;
    }

    if (state === S.RESULT) {
      drawWorkshop(); drawTiles(); drawBottom();
      game.draw.rect(0, H * 0.36, W, H * 0.12, ok ? C.white : C.ink, 0.92);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.4, 90, ok ? C.ink : C.white);
      txt('BEST ' + game.best, W / 2, H * 0.45, 40, ok ? C.ink : C.white);
      if (Math.floor(t * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.77, 38, C.ink);
      return;
    }

    for (var f = snapFx.length - 1; f >= 0; f--) { snapFx[f].t -= dt; if (snapFx[f].t <= 0) snapFx.splice(f, 1); }
    if (phase === 'ready') {
      ready -= dt;
      if (ready <= 0) { phase = 'play'; game.audio.play('se_tap', 0.5); }
    } else if (phase === 'play') {
      if (hitStop > 0) hitStop -= dt;
      else {
        timeLeft -= dt;
        if (timeLeft <= 0) { timeLeft = 0; finish(false); }
      }
    } else if (phase === 'stop') {
      hitStop -= dt;
      if (hitStop <= 0) { phase = 'outro'; outro = 1.4; }
    } else if (phase === 'outro') {
      outro -= dt;
      if (outro <= 0) {
        state = S.RESULT;
        var stats = { fixed: fixedN, total: NEEDED, turns: turns, slips: slips };
        if (ok) game.end.success(score(), stats);
        else game.end.failure(stats);
        return;
      }
    }

    drawWorkshop(); drawTiles(); drawBottom(); drawHud();
    if (phase === 'ready') txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.47, 96, C.ink);
    if (phase === 'outro') {
      var sc = score();
      game.draw.rect(0, H * 0.36, W, H * 0.16, C.ink, 0.92);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.4, 96, C.white);
      txt('SCORE ' + sc, W / 2, H * 0.45, 44, C.white);
      if (ok && sc > game.best) txt('NEW RECORD', W / 2, H * 0.49, 40, C.white);
      else if (!ok) txt('あと' + Math.max(1, NEEDED - fixedN) + '枚!', W / 2, H * 0.49, 44, C.white);
      else txt('BEST ' + game.best, W / 2, H * 0.49, 36, C.white);
    }
  });

  game.onStart(function() {
    game.audio.melody([
      ['A4', 1], ['C5', 0.5], ['D5', 0.5], ['E5', 1], ['D5', 0.5], ['C5', 0.5],
      ['A4', 1], ['G4', 0.5], ['A4', 0.5], ['E4', 2]
    ], { tempo: 112, wave: 'triangle', volume: 0.05, loop: true, bass: [['A2', 2], ['E2', 2], ['A2', 2], ['E2', 2]] });
    state = S.ATTRACT;
    initGame();
  });
})(game);
