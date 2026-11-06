// I-GBA-0038v2-teahouse-asagao-hush.js
// 朝顔すぼめ — 見張りの蜂がこちらを向いている間はぴたりと止まり、背を向けた隙にだけ開いた朝顔をつまんで閉じていく
// 操作: 蜂が背中を向けている間に、開いた朝顔をタップしてすぼめる。蜂が振り向く合図(ビビッと羽音+頭上の印)が出たら指を止め、正面を向いている間は画面に触れない
// 終わり: 3棚(朝顔3→4→5輪)を15秒以内にすぼめ切ればCLEAR。見られている間に触れて3回見つかる/時間切れでGAME OVER
// @mechanic: freeze
// @theme: mountain_pass_teahouse_morning_glory
// 世界観: 峠の茶屋の朝顔棚で、看板娘が花を狙う見張り蜂に気づかれないよう止まっては動き、開いた朝顔をそっとすぼめて蜜を隠していく
// 残るもの: 正誤(CLEAR/GAME OVER) + すぼめた花の数・ぎりぎり成功数・残り秒のスコア
// スタイル: 90s HANDHELD COLOR

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s HANDHELD COLOR: 低彩度・少色。日焼けした液晶の色味、太く単純な形で密度を抑える
  var STYLE = { bg: ['#c4cc9c', '#a2aa82'], main: ['#62729a', '#5a7a4a', '#e8e0c4'], accent: ['#c4604e', '#e2c254'] };
  var Q = {
    sky: STYLE.bg[0], sky2: STYLE.bg[1], petal: STYLE.main[0], petalHi: '#8a98b8', leaf: STYLE.main[1], leafDk: '#3e5a34',
    paper: STYLE.main[2], alert: STYLE.accent[0], bee: STYLE.accent[1], ink: '#2a2a26', bamboo: '#a49a62', bambooDk: '#7a7044', wood: '#7a5a3a',
  };

  var GAME_TITLE = 'ASAGAO HUSH';
  var TIME_LIMIT = 15;
  var SHELVES = [
    { n: 3, away: [1.6, 2.0], turn: 0.7, watch: 1.0, feint: 0 },
    { n: 4, away: [1.1, 1.5], turn: 0.6, watch: 1.1, feint: 0 },
    { n: 5, away: [0.9, 1.4], turn: 0.6, watch: 1.2, feint: 0.45 },
  ];
  var NEEDED = 12;
  var MISS_MAX = 3;
  var SPOTS = [];
  for (var sr = 0; sr < 3; sr++) for (var sc = 0; sc < 4; sc++) SPOTS.push({ x: 180 + sc * 240 + (sr % 2) * 40, y: Math.round(H * 0.37) + sr * 186 });
  var BEE_Y = Math.round(H * 0.27);

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var mode = S.ATTRACT;

  var shelf, cfg, flowers, bee, hushed, close, misses, combo, maxCombo, lastClose, score;
  var timeLeft, readyT, shelfT, stopT, stopObj, fin, cleared, postT, warnT, reachT, caughtT, cheerT, playT, finalScore;

  var BEE_BACK = ['..ww......ww..', '.wwww....wwww.', '.wwwww..wwwww.', '..wwwyyyywww..', '....ykkkky....', '...yyyyyyyy...', '...kkkkkkkk...', '...yyyyyyyy...', '....kkkkkk....', '......kk......'];
  var BEE_BACK2 = ['..............', '..............', '.ww........ww.', 'wwwwwyyyywwwww', '.wwwykkkkywww.', '...yyyyyyyy...', '...kkkkkkkk...', '...yyyyyyyy...', '....kkkkkk....', '......kk......'];
  var BEE_FRONT = ['..ww......ww..', '.wwww.aa.wwww.', '.wwwwa..awwww.', '..wyyyyyyyyw..', '..yEEyyyyEEy..', '..yEeyyyyeEy..', '..yyyyyyyyyy..', '...yykkkkyy...', '....yyyyyy....', '.....kkkk.....'];
  var BEE_SIDE = ['.....ww.......', '....wwww......', '....wwwwa.....', '...yyyyyya....', '..kyykyyEy....', '..kyykyyyy....', '..kyykyyy.....', '...yyyyy......', '..............', '..............'];
  var BEE_PAL = { w: '#eef0e0', y: '#e2c254', k: '#2a2a26', a: '#2a2a26', E: '#2a2a26', e: '#eef0e0' };
  var BANG = ['.rr.', '.rr.', '.rr.', '.rr.', '....', '.rr.'];
  var GIRL_A = ['...kkkk...', '..kkkkkk..', '..kffffk..', '..fkffkf..', '..ffrrff..', '...ffff...', '..aaaaaa..', '.aaaaaaaa.', '.faaaaaaf.', '..aaaaaa..', '..f....f..'];
  var GIRL_B = ['...kkkk...', '..kkkkkk..', '..kffffk..', '..fkffkf..', '..ffrrff..', '...ffff...', '..aaaaaa..', '.aaaaaaaa.', 'f.aaaaaa.f', '..aaaaaa..', '..f....f..'];
  var GIRL_STILL = ['...kkkk.d.', '..kkkkkkd.', '..kffffk..', '..fkkfkkf.', '..ffffff..', '...ffff...', '..aaaaaa..', '.aaaaaaaa.', '.aaaaaaaa.', '..aaaaaa..', '..f....f..'];
  var GIRL_REACH = ['...kkkk..f', '..kkkkkk.f', '..kffffkf.', '..fkffkf..', '..ffrrff..', '...ffff...', '..aaaaaa..', '.aaaaaaa..', '.faaaaaa..', '..aaaaaa..', '..f....f..'];
  var GIRL_SHOCK = ['.k.kkkk.k.', '..kkkkkk..', '..kffffk..', '..fkffkf..', '..ffkkff..', '...ffff...', 'f.aaaaaa.f', '.aaaaaaaa.', '.aaaaaaaa.', '..aaaaaa..', '..f....f..'];
  var GIRL_JOY = ['f..kkkk..f', 'f.kkkkkk.f', '.fkffffkf.', '..fkffkf..', '..ffrrff..', '...ffff...', '..aaaaaa..', '.aaaaaaaa.', '.aaaaaaaa.', '..aaaaaa..', '..f....f..'];
  var GIRL_PAL = { k: '#2a2a26', f: '#e6c89e', r: '#c4604e', a: '#62729a', d: '#8ab4e0' };

  function out(str, x, y, sz, color) {
    game.draw.text(str, x + 3, y + 4, { size: sz, color: Q.ink, bold: true, align: 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: 'center' });
  }

  function setupShelf(i) {
    cfg = SHELVES[i];
    var idx = [];
    for (var k = 0; k < SPOTS.length; k++) idx.push(k);
    for (var a = idx.length - 1; a > 0; a--) { var b = Math.min(a, Math.floor(game.random(0, a + 1))); var tmp = idx[a]; idx[a] = idx[b]; idx[b] = tmp; }
    flowers = [];
    for (var m = 0; m < SPOTS.length; m++) {
      var sp = SPOTS[idx[m]];
      flowers.push({ x: sp.x + game.random(-20, 20), y: sp.y + game.random(-14, 14), open: m < cfg.n, bloom: 0, shut: 0, ph: game.random(0, 6), flash: 0 });
    }
    bee = { st: 'away', t: game.random(cfg.away[0], cfg.away[1]), feint: false, x: W / 2, look: 0 };
  }

  function initGame() {
    shelf = 0; hushed = 0; close = 0; misses = 0; combo = 0; maxCombo = 0; lastClose = -9; score = 0;
    timeLeft = TIME_LIMIT; readyT = 0.8; shelfT = 0; stopT = 0; stopObj = null; fin = false; cleared = false;
    postT = 0; warnT = 0; reachT = 0; caughtT = 0; cheerT = 0; playT = 0; finalScore = 0;
    setupShelf(0);
  }

  function openLeft() { var n = 0; for (var i = 0; i < flowers.length; i++) if (flowers[i].open) n++; return n; }
  function firstOpen() { for (var i = 0; i < flowers.length; i++) if (flowers[i].open) return flowers[i]; return null; }

  // 蜂の首振り: away(背中)→turn(予告)→watch(正面=触れたら見つかる)→back→away。turn の途中で戻るのがフェイント
  function stepBee(dt) {
    bee.t -= dt;
    bee.x = W / 2 + Math.sin(game.time.elapsed * 0.9) * 150;
    if (bee.st === 'away' && bee.t <= 0) {
      bee.st = 'turn'; bee.t = cfg.turn; bee.feint = game.random(0, 1) < cfg.feint;
      game.audio.tone('A5', 0.06, { wave: 'square', volume: 0.07 });
    } else if (bee.st === 'turn') {
      if (Math.floor(bee.t / 0.15) !== Math.floor((bee.t + dt) / 0.15)) game.audio.tone(700 + (cfg.turn - bee.t) * 900, 0.05, { wave: 'sawtooth', volume: 0.05 });
      if (bee.feint && bee.t < cfg.turn * 0.4) { bee.st = 'back'; bee.t = 0.25; }
      else if (bee.t <= 0) { bee.st = 'watch'; bee.t = cfg.watch; game.audio.tone('E6', 0.12, { wave: 'square', volume: 0.08 }); }
    } else if (bee.st === 'watch' && bee.t <= 0) {
      bee.st = 'back'; bee.t = 0.3;
    } else if (bee.st === 'back' && bee.t <= 0) {
      bee.st = 'away'; bee.t = game.random(cfg.away[0], cfg.away[1]);
      game.audio.tone('C5', 0.05, { wave: 'triangle', volume: 0.05 });
    }
  }

  function pickFlower(x, y) {
    var best = null, bd = 115;
    for (var i = 0; i < flowers.length; i++) {
      var f = flowers[i];
      if (!f.open) continue;
      var d = Math.hypot(f.x - x, f.y - y);
      if (d < bd) { bd = d; best = f; }
    }
    return best;
  }

  // 触れた瞬間の判定(本番・デモ共通)
  function touch(x, y) {
    if (bee.st === 'watch') { caught(x, y); return; }
    var f = pickFlower(x, y);
    reachT = 0.25;
    if (!f) { game.audio.play('se_tap', 0.08); return; }
    f.open = false; f.shut = 0.3; f.flash = 0.3;
    hushed++;
    var now = game.time.elapsed;
    combo = now - lastClose < 0.8 ? combo + 1 : 1;
    lastClose = now;
    if (combo > maxCombo) maxCombo = combo;
    var risky = bee.st === 'turn';
    if (risky) close++;
    var pts = (risky ? 150 : 100) * Math.min(4, combo);
    score += pts;
    game.feedback.good(f.x, f.y, { text: risky ? 'NICE' : (combo >= 2 ? 'x' + combo : 'GOOD'), color: Q.paper, size: 52 });
    game.fx.popup('+' + pts, f.x, f.y - 110, { color: Q.bee, size: 38 });
    if (openLeft() === 0) {
      shelfT = 0.85; cheerT = 0.85;
      game.audio.play('se_milestone', 0.45);
      game.fx.popup('NICE', W / 2, H * 0.5, { color: Q.bee, size: 92 });
    }
  }

  function caught(x, y) {
    misses++; combo = 0; caughtT = 0.8;
    game.audio.tone('B6', 0.1, { wave: 'square', volume: 0.1 });
    game.fx.flash('#ffffff', 0.1);
    if (mode !== S.PLAYING) { game.feedback.bad(bee.x, BEE_Y, { text: 'MISS', color: Q.alert, size: 56 }); bee.st = 'back'; bee.t = 0.3; return; }
    stopT = misses >= MISS_MAX ? 0.5 : 0.35;
    stopObj = { kind: misses >= MISS_MAX ? 'fatal' : 'caught', x: bee.x, y: BEE_Y };
  }

  function stepFlowers(dt) {
    for (var i = 0; i < flowers.length; i++) {
      var f = flowers[i];
      if (f.open && f.bloom < 1) f.bloom = Math.min(1, f.bloom + dt * 4);
      if (f.shut > 0) f.shut -= dt;
      if (f.flash > 0) f.flash -= dt;
    }
    if (reachT > 0) reachT -= dt;
    if (caughtT > 0) caughtT -= dt;
    if (cheerT > 0) cheerT -= dt;
  }

  function ending(win) {
    if (fin) return;
    fin = true; cleared = win; postT = 1.4;
    finalScore = score + (win ? Math.ceil(timeLeft) * 30 : 0);
    game.audio.stopBgm();
    game.audio.play(win ? 'se_success' : 'se_failure', 0.55);
    if (win) {
      for (var i = 0; i < 6; i++) game.fx.burst(160 + i * 150, H * 0.4 + (i % 2) * 200, { color: i % 2 ? Q.petalHi : Q.paper, count: 18, speed: 500 });
      game.fx.flash(Q.paper, 0.2);
    }
  }

  function resolveStop() {
    if (!stopObj) return;
    var k = stopObj.kind;
    stopObj = null;
    if (k === 'win') { ending(true); return; }
    if (k === 'time') { game.feedback.bad(W / 2, H * 0.5, { text: 'TIME UP', color: Q.alert, size: 64 }); ending(false); return; }
    game.feedback.bad(bee.x, BEE_Y + 40, { text: 'MISS', color: Q.alert, size: 60 });
    if (k === 'fatal') { ending(false); return; }
    bee.st = 'back'; bee.t = 0.3;
  }

  // ---- 入力 ----
  function canPlay() { return mode === S.PLAYING && !fin && stopT <= 0 && readyT <= 0 && shelfT <= 0; }

  game.onPress(function(x, y) {
    if (!canPlay()) return;
    touch(x, y);
    if (bee.st !== 'watch') game.audio.tone('G5', 0.03, { wave: 'triangle', volume: 0.04 });
  });
  game.onTap(function(x, y) {
    if (mode === S.ATTRACT) { game.audio.play('se_coin'); mode = S.PLAYING; initGame(); return; }
    if (mode === S.RESULT) { mode = S.ATTRACT; initGame(); demo.t = 0; return; }
  });

  // ---- 描画 ----
  function teahouse(t) {
    game.draw.gradient(0, H, [[0, Q.sky], [0.62, Q.sky2], [0.7, '#8a8a62'], [1, '#6a6a4a']]);
    // 遠い峠の稜線
    for (var m = 0; m < 6; m++) game.draw.circle(m * 220 + 40, Math.round(H * 0.2) + (m % 2) * 30, 200, '#9aa488', 0.6);
    // 茶屋の軒
    game.draw.rect(0, 230, W, 70, Q.wood);
    game.draw.rect(0, 300, W, 14, Q.ink, 0.5);
    for (var r = 0; r < 12; r++) game.draw.rect(r * 92 + 10, 236, 70, 12, '#8e6c48');
    // 朝顔棚(竹の格子)
    var top = Math.round(H * 0.31), bot = Math.round(H * 0.68);
    for (var v = 0; v < 6; v++) { var vx = 60 + v * 192; game.draw.rect(vx, top, 16, bot - top, Q.bambooDk); game.draw.rect(vx + 2, top, 8, bot - top, Q.bamboo); }
    for (var hz = 0; hz < 4; hz++) { var hy = top + 20 + hz * 186; game.draw.rect(40, hy, W - 80, 14, Q.bambooDk); game.draw.rect(40, hy + 2, W - 80, 6, Q.bamboo); }
    // つる
    for (var c = 0; c < 5; c++) for (var s = 0; s < 14; s++) {
      var y0 = top + s * 50, x0 = 150 + c * 200 + Math.sin(s * 0.9 + c) * 40;
      game.draw.line(x0, y0, 150 + c * 200 + Math.sin((s + 1) * 0.9 + c) * 40, y0 + 50, Q.leafDk, 6);
      if (s % 3 === c % 3) { game.draw.circle(x0 + 18, y0 + 20, 22, Q.leaf); game.draw.circle(x0 + 30, y0 + 10, 14, Q.leaf); }
    }
    // 縁台と団子
    game.draw.rect(0, Math.round(H * 0.72), W, 30, Q.wood);
    game.draw.rect(0, Math.round(H * 0.72) + 30, W, H, '#5a5a3e');
    game.draw.rect(560, Math.round(H * 0.76), 420, 40, Q.wood);
    game.draw.rect(580, Math.round(H * 0.76) + 40, 20, 80, Q.wood);
    game.draw.rect(940, Math.round(H * 0.76) + 40, 20, 80, Q.wood);
    for (var d = 0; d < 3; d++) game.draw.circle(700 + d * 40, Math.round(H * 0.75), 20, d === 0 ? '#d49a9a' : (d === 1 ? Q.paper : '#9ab47a'));
    game.draw.rect(860, Math.round(H * 0.74) - 10, 50, 46, '#8a9a7a');
  }

  function drawFlower(f, t) {
    var big = stopObj && stopObj.kind === 'time' && stopObj.f === f;
    if (f.open) {
      var b = f.bloom * (big ? 1.35 : 1);
      var sway = Math.sin(t * 2 + f.ph) * 4;
      var wf = big && Math.floor(t * 16) % 2 === 0;
      game.draw.circle(f.x + sway, f.y, (74 + Math.sin(t * 6 + f.ph) * 4) * b, Q.paper, 0.55);
      game.draw.circle(f.x + sway, f.y, 64 * b, wf ? Q.paper : Q.petal);
      game.draw.circle(f.x + sway, f.y, 44 * b, Q.petalHi);
      for (var k = 0; k < 5; k++) {
        var a = k / 5 * Math.PI * 2 - Math.PI / 2;
        game.draw.line(f.x + sway, f.y, f.x + sway + Math.cos(a) * 42 * b, f.y + Math.sin(a) * 42 * b, Q.paper, 5);
      }
      game.draw.circle(f.x + sway, f.y, 16 * b, Q.paper);
    } else {
      var p = f.shut > 0 ? f.shut / 0.3 : 0;
      var w = 16 + p * 40;
      var col = f.flash > 0 && Math.floor(f.flash * 20) % 2 === 0 ? Q.paper : Q.petal;
      game.draw.rect(f.x - w / 2, f.y - 40, w, 70, col);
      game.draw.rect(f.x - w / 4, f.y - 60, w / 2, 24, col);
      game.draw.line(f.x - w / 2, f.y - 30, f.x + w / 2, f.y - 10, Q.petalHi, 4);
      game.draw.line(f.x - w / 2, f.y, f.x + w / 2, f.y + 20, Q.petalHi, 4);
      game.draw.rect(f.x - 12, f.y + 28, 24, 16, Q.leaf);
    }
  }

  function drawBee(t) {
    var fr;
    if (bee.st === 'watch') fr = BEE_FRONT;
    else if (bee.st === 'turn' || bee.st === 'back') fr = Math.floor(t * 14) % 2 ? BEE_SIDE : BEE_FRONT;
    else fr = Math.floor(t * 16) % 2 ? BEE_BACK : BEE_BACK2;
    var bob = Math.sin(t * 5) * 10;
    var zoom = stopObj && (stopObj.kind === 'caught' || stopObj.kind === 'fatal') ? 1.5 : 1;
    if (bee.st === 'watch') {
      var a = 0.25 + Math.sin(t * 10) * 0.12;
      game.draw.circle(bee.x, BEE_Y + bob, 140 * zoom, Q.alert, a);
      game.draw.rect(0, 0, W, 26, Q.alert, 0.5);
      game.draw.rect(0, H - 26, W, 26, Q.alert, 0.5);
      game.draw.rect(0, 0, 22, H, Q.alert, 0.5);
      game.draw.rect(W - 22, 0, 22, H, Q.alert, 0.5);
    }
    if (zoom > 1 && Math.floor(t * 16) % 2 === 0) game.draw.circle(bee.x, BEE_Y, 150, Q.paper, 0.6);
    game.draw.circle(bee.x, BEE_Y + 120, 60, Q.ink, 0.15);
    game.draw.sprite(fr, BEE_PAL, bee.x, BEE_Y + bob, 12 * zoom, { anchor: 'center', flipX: bee.st === 'back' });
    if (bee.st === 'turn' && Math.floor(t * 12) % 2 === 0) game.draw.sprite(BANG, { r: Q.alert }, bee.x + 110, BEE_Y - 70, 12, { anchor: 'center' });
  }

  function drawGirl(t) {
    var fr;
    if (caughtT > 0) fr = GIRL_SHOCK;
    else if (cheerT > 0 || (fin && cleared)) fr = GIRL_JOY;
    else if (reachT > 0) fr = GIRL_REACH;
    else if (bee.st === 'watch' || bee.st === 'turn') fr = GIRL_STILL;
    else fr = Math.floor(t * 3) % 2 ? GIRL_A : GIRL_B;
    var hop = cheerT > 0 ? -Math.abs(Math.sin(t * 14)) * 24 : (bee.st === 'watch' ? 0 : Math.sin(t * 3) * 4);
    game.draw.circle(230, H * 0.905, 90, Q.ink, 0.2);
    game.draw.sprite(fr, GIRL_PAL, 230, H * 0.84 + hop, 18, { anchor: 'center' });
  }

  function drawHud(t) {
    var lowT = timeLeft < 4 && Math.floor(t * 6) % 2 === 0;
    game.draw.rect(70, 34, W - 140, 30, Q.ink);
    game.draw.rect(76, 40, (W - 152) * Math.max(0, timeLeft / TIME_LIMIT), 18, lowT ? Q.alert : Q.bee);
    out(hushed + ' / ' + NEEDED, W / 2, 116, 50, Q.paper);
    for (var s = 0; s < SHELVES.length; s++) {
      var done = s < shelf || (s === shelf && shelfT > 0) || (fin && cleared);
      game.draw.circle(110 + s * 70, 176, 24, Q.ink);
      game.draw.circle(110 + s * 70, 176, 18, done ? Q.paper : (s === shelf ? Q.petal : Q.sky2));
    }
    for (var m = 0; m < MISS_MAX; m++) game.draw.sprite(BEE_FRONT, m < misses ? BEE_PAL : { w: '#8a8a76', y: '#8a8a76', k: '#5a5a50', a: '#5a5a50', E: '#5a5a50', e: '#8a8a76' }, W - 110 - m * 74, 176, 4, { anchor: 'center' });
    out('' + score, W - 240, 116, 34, Q.bee);
    var left = openLeft();
    for (var i = 0; i < cfg.n; i++) game.draw.circle(W / 2 + 80 + i * 70, H * 0.86, 24, i < cfg.n - left ? Q.paper : Q.petal);
  }

  function drawScene(t) {
    teahouse(t);
    for (var i = 0; i < flowers.length; i++) drawFlower(flowers[i], t);
    drawBee(t);
    drawGirl(t);
  }

  function scan() { for (var y = 0; y < H; y += 8) game.draw.rect(0, y, W, 2, Q.ink, 0.06); }

  // ---- ATTRACT: 本物の touch()/stepBee() で 背中の間に2輪すぼめる → 振り向きで止まる → 1輪 → 正面で触れて見つかる ----
  var demo = { t: 0, gx: W / 2, gy: H * 0.8, press: false, k: 0, list: [] };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 6.4;
    if (cyc < dt || demo.t <= dt) {
      initGame(); readyT = 0; setupShelf(1);
      cfg = { n: 4, away: [1.4, 1.4], turn: 0.6, watch: 1.0, feint: 0 };
      bee.t = 1.4;
      demo.k = 0; demo.list = [];
      for (var i = 0; i < flowers.length; i++) if (flowers[i].open) demo.list.push(flowers[i]);
    }
    stepBee(dt);
    stepFlowers(dt);
    var plan = [0.35, 0.85, 3.7, 5.5];
    var tgt = demo.list[Math.min(demo.k, 3)];
    demo.press = false;
    if (demo.k < plan.length) {
      demo.gx += (tgt.x - demo.gx) * Math.min(1, dt * 7);
      demo.gy += (tgt.y + 10 - demo.gy) * Math.min(1, dt * 7);
      if (Math.abs(cyc - plan[demo.k]) < 0.12) demo.press = true;
      if (cyc > plan[demo.k]) { touch(tgt.x, tgt.y); demo.k++; }
    } else {
      demo.gy += (H * 0.6 - demo.gy) * Math.min(1, dt * 2);
    }
    if (bee.st === 'watch' && demo.k < 3) demo.gy += Math.sin(game.time.elapsed * 3) * 0.3;
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;

    if (mode === S.ATTRACT) {
      stepDemo(dt);
      drawScene(t);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 14 });
      out(GAME_TITLE, W / 2, H * 0.055 + Math.sin(t * 2) * 5, 86, Q.paper);
      out('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.098, 38, Q.ink);
      if (Math.floor(t * 1.8) % 2 === 0) out('► 100円 投入 ◄', W / 2, H * 0.955, 48, Q.bee);
      else out('TAP TO START', W / 2, H * 0.955, 40, Q.paper);
      scan();
      return;
    }

    if (mode === S.RESULT) {
      stepFlowers(dt);
      drawScene(t);
      game.draw.rect(90, H * 0.30, W - 180, 500, Q.ink, 0.82);
      out(cleared ? 'CLEAR' : (timeLeft <= 0 ? 'TIME UP' : 'GAME OVER'), W / 2, H * 0.34, 96, cleared ? Q.paper : Q.alert);
      out('SCORE ' + finalScore, W / 2, H * 0.40, 60, Q.paper);
      out(hushed + ' / ' + NEEDED + '   x' + maxCombo, W / 2, H * 0.45, 44, Q.bee);
      if (cleared && finalScore > game.best) out('NEW RECORD', W / 2, H * 0.50, 56, Q.bee);
      else out('BEST ' + Math.max(game.best, finalScore), W / 2, H * 0.50, 42, Q.paper);
      if (!cleared) out('あと' + (NEEDED - hushed) + '輪!', W / 2, H * 0.27, 60, Q.bee);
      if (Math.floor(t * 2) % 2 === 0) out('TAP TO CONTINUE', W / 2, H * 0.955, 40, Q.paper);
      scan();
      return;
    }

    // ---- PLAYING ----
    if (fin) {
      postT -= dt;
      stepFlowers(dt);
      if (postT <= 0) {
        mode = S.RESULT;
        var stats = { hushed: hushed, close: close, caught: misses, maxCombo: maxCombo, shelves: shelf + (cleared ? 1 : 0) };
        if (cleared) game.end.success(finalScore, stats);
        else game.end.failure(stats);
      }
    } else if (stopT > 0) {
      stopT -= dt;
      if (stopT <= 0) resolveStop();
    } else if (readyT > 0) {
      readyT -= dt;
      stepFlowers(dt);
      if (readyT <= 0) game.audio.play('se_tap', 0.4);
    } else if (shelfT > 0) {
      shelfT -= dt;
      stepFlowers(dt);
      bee.x = W / 2 + Math.sin(t * 0.9) * 150;
      if (shelfT <= 0) {
        if (shelf >= SHELVES.length - 1) {
          stopT = 0.4; stopObj = { kind: 'win' };
          game.audio.play('se_powerup', 0.4);
        } else {
          shelf++;
          setupShelf(shelf);
          game.audio.play('se_jump', 0.3);
        }
      }
    } else {
      timeLeft -= dt; playT += dt;
      stepBee(dt);
      stepFlowers(dt);
      if (timeLeft < 4) {
        warnT -= dt;
        if (warnT <= 0) { warnT = 0.5; game.audio.tone(timeLeft < 2 ? 'A5' : 'E5', 0.06, { wave: 'square', volume: 0.07 }); }
      }
      if (timeLeft <= 0 && stopT <= 0) {
        timeLeft = 0;
        stopT = 0.45; stopObj = { kind: 'time', f: firstOpen() };
        game.audio.tone('C4', 0.3, { wave: 'square', volume: 0.1, slide: -120 });
      }
    }

    drawScene(t);
    if (stopObj && stopObj.kind === 'win' && stopT > 0) game.draw.circle(W / 2, H * 0.5, 200 + (0.4 - stopT) * 900, Q.paper, 0.3);
    if (!fin && readyT <= 0 && shelf === 0 && hushed === 0 && playT < 1.3 && bee.st === 'away') {
      var f0 = firstOpen();
      if (f0) game.draw.hand(f0.x, f0.y + 10, { press: Math.floor(t * 3) % 2 === 0, scale: 12, alpha: 0.5 });
    }
    drawHud(t);
    if (readyT > 0) out(readyT > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 120, Q.paper);
    scan();
  });

  game.onStart(function() {
    game.audio.melody([
      ['G4', 0.5], ['A4', 0.5], ['C5', 1], ['D5', 0.5], ['C5', 0.5], ['A4', 1],
      ['G4', 0.5], ['E4', 0.5], ['G4', 1], ['A4', 0.5], ['G4', 0.5], ['E4', 0.5], ['D4', 0.5],
      ['E4', 0.5], ['G4', 0.5], ['A4', 1], ['C5', 0.5], ['A4', 0.5], ['G4', 2],
    ], { tempo: 108, wave: 'triangle', volume: 0.06, loop: true, bass: [['C3', 2], ['A2', 2], ['G2', 2], ['C3', 2], ['A2', 2], ['G2', 2]] });
    mode = S.ATTRACT;
    initGame();
  });
})(game);
