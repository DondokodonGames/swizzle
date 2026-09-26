// J-N6434-0021-leaning-belfry-climb.js
// 傾いた鐘楼のぼり — 左右どちらの手がかりへ登るかをタップで選び、落ちてくる瓦の列を避けて頂上の鐘へ
// 操作: 画面の左半分をタップで左の手がかりへ、右半分で右の手がかりへ一段登る。上端で揺れて光った列には瓦が落ちてくるので反対側へ
// 終わり: 頂上の鐘まで登ればCLEAR。瓦に3回当たるかTIME UPでGAME OVER
// @mechanic: camera_climb
// @theme: leaning_belfry_squirrel_repair
// 世界観: 古い港町の傾いた鐘楼で、修理屋見習いのリスが崩れかけた屋根から落ちてくる瓦を左右に避けながら壁を駆け上がり、夕刻の鐘に間に合うよう頂上の鐘を打ち直す
// 残るもの: 正誤(CLEAR/GAME OVER) + 登った段数と拾ったどんぐりの数
// スタイル: PIXEL HD

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // PIXEL HD: 多色 + 光、パララックス、細かいアニメ
  var STYLE = { bg: ['#2a2350', '#6a4a8a', '#f09a6a'], main: ['#c8a078', '#8a6a4a'], accent: ['#ffd86a', '#ff5a5a'] };
  var C = {
    sky1: '#2a2350', sky2: '#6a4a8a', sky3: '#f09a6a', sun: '#ffd86a', far: '#4a3a6a', mid: '#5a4a7a',
    stone1: '#c8a078', stone2: '#a8805a', stone3: '#8a6a4a', mortar: '#6a4a3a', hold: '#ffe8b0',
    tile: '#d8603a', tileDark: '#8a3a2a', red: '#ff5a5a', white: '#ffffff', ink: '#1a1428', gold: '#ffd86a', leaf: '#6ac86a'
  };

  var TITLE = 'BELFRY CLIMB';
  var TIME_LIMIT = 16;
  var NEEDED = 20;
  var LIVES = 3;
  var STEP = 118;
  var SLANT = 16;
  var LANE_OFF = 150;
  var PY = H * 0.64;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var SQ = [
    [
      '.....tt.',
      '....tttt',
      '.ee.ttt.',
      'eeee.t..',
      'ekwe....',
      'eeee....',
      '.eoe....',
      'e..e....'
    ],
    [
      '......t.',
      '.ee..ttt',
      'eeee.tt.',
      'ekwe.t..',
      'eeee....',
      'oeeo....',
      '.ee.....',
      '..e.e...'
    ],
    [
      '.ee.....',
      'eeee..tt',
      'ekwe.ttt',
      'eeee.tt.',
      '.eoe.t..',
      'e..e....',
      '........',
      '........'
    ]
  ];
  var SQ_PAL = { e: '#c8783a', t: '#e8a060', k: '#1a1428', w: '#ffffff', o: '#ffe8b0' };
  var TILE = ['.rrrr.', 'rrrrrr', 'rddddr', '.rrrr.'];
  var TILE_PAL = { r: '#d8603a', d: '#8a3a2a' };
  var ACORN = ['.bb.', 'bbbb', 'yyyy', 'yyyy', '.yy.'];
  var ACORN_PAL = { b: '#8a5a2a', y: '#ffd86a' };
  var BELL = ['...gg...', '..gggg..', '.gggggg.', '.gggggg.', 'gggggggg', '...rr...'];
  var BIRD = ['k.k', '.k.'];

  var lvl, lane, camY, timeLeft, lives, tiles, spawnT, acorns, gotAcorns, phase, phaseT, endOk, stun, climbT, focusX, focusY, midShown;
  var demo = { t: 0, gx: W / 2, gy: H * 0.85, press: 0, hitShown: false, cd: 0 };

  function txt(s, x, y, size, color) {
    game.draw.text(s, x + 4, y + 4, { size: size, color: C.ink, bold: true, align: 'center' });
    game.draw.text(s, x, y, { size: size, color: color, bold: true, align: 'center' });
  }

  function towerX(level) { return W / 2 + level * SLANT - 90; }
  function laneX(level, ln) { return towerX(level) + (ln < 0 ? -LANE_OFF : LANE_OFF); }
  function wy(level) { return -level * STEP; }
  function sy(worldY) { return PY + (worldY - camY); }

  function initGame() {
    lvl = 0; lane = -1; camY = 0; timeLeft = TIME_LIMIT; lives = LIVES; tiles = []; spawnT = 0.8;
    acorns = [];
    for (var i = 3; i < NEEDED; i += 4) acorns.push({ level: i, lane: (i % 8 === 3) ? 1 : -1, got: false });
    gotAcorns = 0; phase = 'ready'; phaseT = 0.8; endOk = false; stun = 0; climbT = 0; focusX = W / 2; focusY = PY; midShown = false;
  }

  function spawnTile() {
    var ln = Math.random() < 0.5 ? -1 : 1;
    // 登る方向の先にある列を狙いやすくする
    if (Math.random() < 0.55) ln = lane;
    tiles.push({ lane: ln, y: camY - PY - 60, st: 'warn', t: 0.65, vy: 0, level: lvl + 6 });
  }

  // 一段登る(実プレイ・デモ共通)
  function climb(ln, live) {
    if (stun > 0 || lvl >= NEEDED) return 'stuck';
    lane = ln; lvl++; climbT = 0.18;
    for (var i = 0; i < acorns.length; i++) {
      var a = acorns[i];
      if (!a.got && a.level === lvl && a.lane === ln) {
        a.got = true; gotAcorns++;
        if (live) game.feedback.good(laneX(lvl, ln), sy(wy(lvl)) - 80, { text: 'NICE', color: C.gold, sound: 'se_coin' });
      }
    }
    if (live) {
      game.audio.play('se_jump', 0.25);
      if (!midShown && lvl >= NEEDED / 2) {
        midShown = true;
        game.fx.popup('あと' + (NEEDED - lvl) + '段!', W / 2, H * 0.30, { color: C.gold, size: 56 });
        game.audio.play('se_milestone', 0.5);
      }
    }
    return 'up';
  }

  function stepWorld(dt, live) {
    var hit = null;
    if (stun > 0) stun -= dt;
    if (climbT > 0) climbT -= dt;
    spawnT -= dt;
    if (spawnT <= 0) {
      spawnTile();
      spawnT = Math.max(0.45, 1.05 - lvl * 0.035);
      if (live) game.audio.tone('F5', 0.08, { wave: 'square', volume: 0.05 });
    }
    var myY = wy(lvl);
    for (var i = tiles.length - 1; i >= 0; i--) {
      var t = tiles[i];
      if (t.st === 'warn') {
        t.t -= dt; t.y = camY - PY - 60;
        if (t.t <= 0) { t.st = 'fall'; t.vy = 900; }
        continue;
      }
      t.vy += 1400 * dt; t.y += t.vy * dt;
      if (t.lane === lane && stun <= 0 && lvl < NEEDED && Math.abs(t.y - (myY - 40)) < 60) {
        hit = t; tiles.splice(i, 1); continue;
      }
      if (t.y > camY + H) tiles.splice(i, 1);
    }
    camY += (myY - camY) * Math.min(1, dt * 6);
    return hit;
  }

  function knock(t, live) {
    lives--; stun = 0.6;
    lvl = Math.max(0, lvl - 2);
    focusX = laneX(lvl, lane); focusY = sy(wy(lvl));
    if (live) game.feedback.bad(focusX, focusY - 60, { text: 'MISS', shake: 10 });
  }

  function drawBg() {
    var el = game.time.elapsed;
    game.draw.gradient(0, H, [[0, C.sky1], [0.45, C.sky2], [0.85, C.sky3], [1, C.sun]]);
    game.draw.rect(0, 0, W, H, C.sun, 0.03 + 0.03 * Math.sin(el * 1.3));
    game.draw.circle(W * 0.82, H * 0.80, 140, C.sun, 0.35);
    game.draw.circle(W * 0.82, H * 0.80, 90, C.sun, 0.7);
    // 星
    for (var s = 0; s < 18; s++) {
      var tw = 0.4 + 0.4 * Math.sin(el * 3 + s);
      game.draw.rect((s * 197) % W, (s * 113) % (H * 0.4), 5, 5, C.white, tw);
    }
    // 遠景の町並み(パララックス)
    for (var b = 0; b < 10; b++) {
      var bx = b * 120 - ((camY * -0.05) % 120);
      var bh = 200 + (b * 71) % 180;
      game.draw.rect(bx, H * 0.88 - bh + (-camY * 0.1), 100, bh + 400, C.far);
      game.draw.rect(bx + 30, H * 0.88 - bh + 60 + (-camY * 0.1), 20, 26, C.sun, 0.5);
    }
    // 雲
    for (var c = 0; c < 4; c++) {
      var cx = ((el * 30 + c * 330) % (W + 400)) - 200;
      var cy = ((c * 420 - camY * 0.3) % (H + 200) + H + 200) % (H + 200) - 100;
      game.draw.circle(cx, cy, 90, C.mid, 0.6);
      game.draw.circle(cx + 80, cy + 10, 70, C.mid, 0.6);
    }
    // 鳥
    for (var k = 0; k < 3; k++) {
      var kx = ((el * 80 + k * 400) % (W + 100)) - 50;
      game.draw.sprite(BIRD, { k: C.ink }, kx, H * 0.25 + k * 60 + Math.sin(el * 5 + k) * 10, 8, { anchor: 'center' });
    }
  }

  function drawTower() {
    var el = game.time.elapsed;
    var first = Math.floor(-(camY - PY + H) / STEP) - 1, last = Math.ceil(-(camY - PY) / STEP) + 1;
    for (var L = Math.max(-3, first); L <= Math.min(NEEDED + 1, last); L++) {
      var y = sy(wy(L)), tx = towerX(L);
      var shade = L % 2 ? C.stone1 : C.stone2;
      game.draw.rect(tx - 250, y - STEP / 2, 500, STEP, shade);
      game.draw.rect(tx - 250, y - STEP / 2, 500, 6, C.mortar);
      game.draw.rect(tx + (L % 2 ? -60 : 40), y - STEP / 2, 6, STEP, C.mortar);
      game.draw.rect(tx + 190, y - STEP / 2, 60, STEP, C.stone3, 0.8);
      game.draw.rect(tx - 250, y - STEP / 2, 30, STEP, C.sun, 0.12);
      if (L >= 0 && L <= NEEDED) {
        game.draw.rect(laneX(L, -1) - 40, y - 8, 80, 18, C.hold);
        game.draw.rect(laneX(L, 1) - 40, y - 8, 80, 18, C.hold);
      }
      if (L % 5 === 2) game.draw.circle(tx + (L % 2 ? 120 : -130), y + 20, 26, C.leaf, 0.7);
    }
    // 頂上の鐘
    var ty = sy(wy(NEEDED + 1));
    if (ty > -200) {
      var btx = towerX(NEEDED + 1);
      game.draw.rect(btx - 260, ty - 40, 520, 40, C.tileDark);
      game.draw.sprite(BELL, { g: C.gold, r: C.red }, btx, ty - 130 + Math.sin(el * 3) * 6, 18, { anchor: 'center' });
    }
    for (var a = 0; a < acorns.length; a++) {
      var ac = acorns[a];
      if (ac.got) continue;
      game.draw.sprite(ACORN, ACORN_PAL, laneX(ac.level, ac.lane), sy(wy(ac.level)) - 50 + Math.sin(el * 4 + a) * 5, 9, { anchor: 'center' });
    }
  }

  function drawTiles() {
    var el = game.time.elapsed;
    for (var i = 0; i < tiles.length; i++) {
      var t = tiles[i];
      var lvlAt = -(t.y) / STEP;
      var x = laneX(lvlAt, t.lane);
      if (t.st === 'warn') {
        var on = Math.floor(el * 12) % 2 === 0;
        // 列全体の警告線と上端の揺れる瓦
        for (var d = 0; d < 8; d++) game.draw.rect(laneX(lvl + 6 - d, t.lane) - 6, H * 0.12 + d * 150, 12, 70, C.red, on ? 0.7 : 0.25);
        game.draw.sprite(TILE, TILE_PAL, laneX(lvl + 6, t.lane) + Math.sin(el * 40) * 8, H * 0.13, 14, { anchor: 'center' });
        game.draw.text('!', laneX(lvl + 6, t.lane), H * 0.19, { size: 70, color: on ? C.red : C.white, bold: true, align: 'center' });
      } else {
        game.draw.circle(laneX(lvl, t.lane), sy(wy(lvl)) + 30, 40, '#000000', 0.25);
        game.draw.sprite(TILE, TILE_PAL, x, sy(t.y), 14, { anchor: 'center' });
      }
    }
  }

  function drawClimber() {
    var el = game.time.elapsed;
    var fr = climbT > 0 ? 1 + (Math.floor(el * 20) % 2) : 0;
    var x = laneX(lvl, lane), y = sy(wy(lvl)) - 50 + (climbT > 0 ? climbT * 120 : Math.sin(el * 4) * 4);
    var blink = stun > 0 && Math.floor(el * 20) % 2 === 0;
    if (!blink) game.draw.sprite(SQ[fr], SQ_PAL, x, y, 13, { anchor: 'center', flipX: lane > 0 });
  }

  function drawHud() {
    game.draw.rect(0, 0, W, H * 0.09, C.ink, 0.55);
    txt(Math.min(lvl, NEEDED) + ' / ' + NEEDED, W * 0.5, H * 0.045, 58, C.white);
    for (var i = 0; i < LIVES; i++) game.draw.sprite(SQ[0], i < lives ? SQ_PAL : { e: '#4a4058', t: '#4a4058', k: '#2a2238', w: '#4a4058', o: '#4a4058' }, 70 + i * 80, H * 0.045, 6, { anchor: 'center' });
    txt(gotAcorns + '', W * 0.9, H * 0.045, 44, C.gold);
    game.draw.sprite(ACORN, ACORN_PAL, W * 0.83, H * 0.045, 6, { anchor: 'center' });
    var frac = Math.max(0, timeLeft / TIME_LIMIT);
    game.draw.rect(60, H * 0.075, W - 120, 14, '#2a2238');
    game.draw.rect(60, H * 0.075, (W - 120) * frac, 14, frac < 0.25 ? C.red : C.gold);
    // 左右の手がかりボタン(親指ゾーン)
    game.draw.rect(40, H * 0.86, W / 2 - 60, 180, C.ink, 0.45);
    game.draw.rect(W / 2 + 20, H * 0.86, W / 2 - 60, 180, C.ink, 0.45);
    game.draw.rect(W * 0.25 - 60, H * 0.86 + 80, 120, 22, lane < 0 ? C.gold : C.hold);
    game.draw.rect(W * 0.75 - 60, H * 0.86 + 80, 120, 22, lane > 0 ? C.gold : C.hold);
  }

  function scoreOf() { return lvl * 60 + gotAcorns * 100 + lives * 80 + Math.round(timeLeft * 30); }

  function drawResult() {
    game.draw.rect(0, H * 0.28, W, H * 0.24, C.ink, 0.8);
    txt(endOk ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.33, 100, endOk ? C.gold : C.red);
    txt(Math.min(lvl, NEEDED) + ' / ' + NEEDED + '   ' + gotAcorns + '個', W / 2, H * 0.40, 46, C.white);
    if (endOk && scoreOf() > game.best) txt('NEW RECORD', W / 2, H * 0.47, 54, C.gold);
    else if (!endOk) txt('あと' + (NEEDED - lvl) + '段!', W / 2, H * 0.47, 54, C.gold);
    else txt('BEST ' + game.best, W / 2, H * 0.47, 42, C.white);
  }

  // 列の危険度: 近い瓦ほど大きい(警告中の瓦も含む)
  function laneDanger(ln) {
    var d = 0, myY = wy(lvl);
    for (var i = 0; i < tiles.length; i++) {
      var t = tiles[i];
      if (t.lane !== ln) continue;
      if (t.st === 'warn') { d = Math.max(d, 0.5); continue; }
      var gapY = myY - t.y;
      if (gapY > -40 && gapY < 1100) d = Math.max(d, 1 + (1100 - gapY) / 1100);
    }
    return d;
  }

  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 8;
    if (cyc < dt || demo.t <= dt) { initGame(); phase = 'play'; demo.hitShown = false; demo.cd = 0.3; }
    var h = stepWorld(dt, false);
    if (h) { knock(h, false); lives = LIVES; }
    if (demo.press > 0) demo.press -= dt;
    demo.cd -= dt;
    if (demo.cd > 0 || lvl >= NEEDED) return;
    var dl = laneDanger(-1), dr = laneDanger(1);
    var want = dl < dr ? -1 : dr < dl ? 1 : lane;
    // 1周に1度、わざと瓦の列に残って当たる例を見せる
    if (!demo.hitShown && lvl >= 6 && Math.max(dl, dr) >= 1.3) { want = dl > dr ? -1 : 1; demo.hitShown = true; demo.cd = 0.9; }
    climb(want, false);
    demo.gx = want < 0 ? W * 0.25 : W * 0.75; demo.gy = H * 0.9;
    demo.press = 0.12; demo.cd = Math.max(demo.cd, 0.28);
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.5); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (phase !== 'play') { game.audio.play('se_tap', 0.1); return; }
    var r = climb(x < W / 2 ? -1 : 1, true);
    if (r === 'stuck') game.audio.tone('B2', 0.06, { wave: 'square', volume: 0.05 });
    else game.fx.burst(x, y, { color: C.hold, count: 4, speed: 140 });
  });

  game.onUpdate(function(dt) {
    var el = game.time.elapsed;
    if (state === S.ATTRACT) {
      if (!tiles) initGame();
      stepDemo(dt);
      drawBg(); drawTower(); drawTiles(); drawClimber();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press > 0, scale: 14 });
      txt(TITLE, W / 2, H * 0.06, 90, C.gold);
      txt('HI-SCORE ' + game.best, W / 2, H * 0.105, 40, C.white);
      if (Math.floor(el * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.80, 52, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.80, 46, C.white);
      return;
    }
    if (state === S.RESULT) {
      drawBg(); drawTower(); drawTiles(); drawClimber(); drawHud(); drawResult();
      if (Math.floor(el * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.80, 44, C.white);
      return;
    }

    if (phase === 'ready') {
      phaseT -= dt;
      if (phaseT <= 0) { phase = 'play'; game.audio.play('se_tap', 0.4); }
    } else if (phase === 'play') {
      timeLeft -= dt;
      var h = stepWorld(dt, true);
      if (h) {
        knock(h, true);
        if (lives <= 0) { endOk = false; phase = 'stop'; phaseT = 0.5; }
      } else if (lvl >= NEEDED) {
        endOk = true; phase = 'stop'; phaseT = 0.45; focusX = laneX(lvl, lane); focusY = sy(wy(lvl));
        game.audio.tone('C6', 0.4, { wave: 'triangle', volume: 0.1 });
      } else if (timeLeft <= 0) {
        timeLeft = 0; endOk = false; phase = 'stop'; phaseT = 0.45; focusX = laneX(lvl, lane); focusY = sy(wy(lvl));
      }
    } else if (phase === 'stop') {
      phaseT -= dt;
      if (phaseT <= 0) {
        phase = 'end'; phaseT = 1.1;
        if (endOk) {
          game.feedback.good(focusX, focusY, { text: 'CLEAR', color: C.gold, count: 30 });
          game.audio.play('se_success', 0.6);
          game.fx.flash('#ffd86a', 0.3);
        } else {
          game.feedback.bad(focusX, focusY, { text: timeLeft <= 0 ? 'TIME UP' : 'MISS' });
          game.audio.play('se_failure', 0.6);
        }
      }
    } else if (phase === 'end') {
      phaseT -= dt;
      if (phaseT <= 0) {
        state = S.RESULT;
        if (endOk) game.end.success(scoreOf(), { levels: lvl, acorns: gotAcorns, lives: lives });
        else game.end.failure({ levels: lvl, acorns: gotAcorns });
        return;
      }
    }

    drawBg(); drawTower(); drawTiles(); drawClimber(); drawHud();
    if (phase === 'stop') {
      game.draw.circle(focusX, focusY - 50, 100 + (0.5 - phaseT) * 160, C.white, 0.5);
      game.draw.sprite(endOk ? SQ[2] : TILE, endOk ? SQ_PAL : TILE_PAL, focusX, focusY - 50, 18, { anchor: 'center' });
    }
    if (phase === 'ready') txt(phaseT > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.40, 110, C.gold);
    if (phase === 'end') drawResult();
  });

  game.onStart(function() {
    game.audio.melody([
      ['G4', 0.5], ['B4', 0.5], ['D5', 0.5], ['G5', 0.5], ['F#5', 1], ['D5', 1],
      ['E5', 0.5], ['C5', 0.5], ['A4', 0.5], ['C5', 0.5], ['B4', 1], ['G4', 1]
    ], { tempo: 136, wave: 'square', volume: 0.05, loop: true, bass: [['G2', 2], ['D3', 2], ['C3', 2], ['G2', 2]] });
    state = S.ATTRACT;
    initGame();
  });
})(game);
