// I-GBA-0016v2-acorn-oak-climb.js
// どんぐり樫のぼり — 降ってくるどんぐりの真下を避けながら、左右の枝を蹴って梢の巣まで登る
// 操作: 画面の左半分タップで一段上の左の枝へ、右半分タップで一段上の右の枝へ跳ぶ。葉が揺れた列にはどんぐりが降ってくる
// 終わり: 12段上の巣に着けば成功。どんぐりに当たる/時間切れで失敗
// @mechanic: camera_climb
// @theme: autumn_oak_squirrel_climb
// 世界観: 秋の大樫の木で、子リスが梢から降ってくるどんぐりの真下を避けながら左右の枝を蹴り分けて、てっぺんの巣まで登る
// 残るもの: 正誤(CLEAR/GAME OVER) + 登った段数と残り時間
// スタイル: MODERN AD-GAME

(function(game) {
  var STYLE = { bg: ['#ffb347', '#ff7a3d', '#7a2e8a'], main: ['#6b3a1e', '#2a1408'], accent: ['#ffe14d', '#27d9a0'] };
  var W = game.canvas.width;
  var H = game.canvas.height;

  var GAME_TITLE = 'OAK CLIMB';
  var TIME_LIMIT = 20;
  var NEEDED = 12;
  var LV = 270;
  var ANCHOR = H * 0.64;
  var COL_X = [W * 0.24, W * 0.76];
  var HOP_T = 0.2;
  var FALL_V = 1500;
  var WARN_T = 0.7;

  var MODE = { ATTRACT: 'ATTRACT', PLAYING: 'PLAYING', RESULT: 'RESULT' };
  var mode = MODE.ATTRACT;

  var sq = { lv: 0, side: 0, from: 0, fromLv: 0, hop: 0 };
  var nuts = [];
  var camY = 0, spawnT = 1, clock = TIME_LIMIT, ready = 0, stopT = 0, leaveT = 0;
  var alive = false, won = false, hitNut = null, dodged = 0;

  var SQ_SIT = [
    '..tt......',
    '.tttt..ee.',
    'tttt..eeee',
    'tt...eewee',
    'tt..eeeeee',
    'ttt.eeee..',
    '.tteeeee..',
    '..eeeeee..',
    '..ee..ee..',
  ];
  var SQ_HOP = [
    'tt........',
    'ttt....ee.',
    '.ttt..eeee',
    '..tt.eewee',
    '...tteeeee',
    '....eeee..',
    '...eeeeee.',
    '..ee....ee',
    '.ee......e',
  ];
  var SQ_PAL = { 't': '#c8642a', 'e': '#e07a34', 'w': '#2a1408' };
  var NUT = ['.cc.', 'cccc', 'nnnn', 'nnnn', '.nn.'];
  var NUT_PAL = { 'c': '#6b3a1e', 'n': '#d8903a' };
  var NEST = ['#..#..#..#', '##########', '.########.', '..######..'];
  var PAW = ['#.#.#', '#####', '.###.', '.###.'];

  function big(str, x, y, size, color) {
    game.draw.text(str, x - 3, y, { size: size, color: '#2a1408', bold: true, align: 'center' });
    game.draw.text(str, x + 3, y, { size: size, color: '#2a1408', bold: true, align: 'center' });
    game.draw.text(str, x, y + 4, { size: size, color: '#2a1408', bold: true, align: 'center' });
    game.draw.text(str, x, y, { size: size, color: color, bold: true, align: 'center' });
  }

  function worldY(lv) { return -lv * LV; }
  function toScreen(wy) { return ANCHOR + (wy - camY); }
  function sqWorld() {
    var k = sq.hop > 0 ? 1 - sq.hop / HOP_T : 1;
    var x = COL_X[sq.from] + (COL_X[sq.side] - COL_X[sq.from]) * k;
    var y = worldY(sq.fromLv) + (worldY(sq.lv) - worldY(sq.fromLv)) * k - Math.sin(k * Math.PI) * 60;
    return { x: x, y: y };
  }

  function resetTree() {
    sq.lv = 0; sq.side = 0; sq.from = 0; sq.fromLv = 0; sq.hop = 0;
    nuts = []; camY = worldY(0); spawnT = 1.0; hitNut = null; dodged = 0;
  }

  function startGame() {
    resetTree();
    clock = TIME_LIMIT; ready = 0.8; stopT = 0; leaveT = 0;
    alive = false; won = false;
  }

  function hopTo(side, live) {
    if (sq.hop > 0 || sq.lv >= NEEDED) return false;
    sq.from = sq.side; sq.fromLv = sq.lv;
    sq.side = side; sq.lv++; sq.hop = HOP_T;
    if (live) {
      game.audio.play('se_jump', 0.3);
      if (sq.lv % 4 === 0 && sq.lv < NEEDED) {
        game.fx.popup(sq.lv + ' / ' + NEEDED, W / 2, H * 0.30, { color: STYLE.accent[0], size: 56 });
        game.audio.play('se_milestone', 0.45);
      } else {
        game.fx.popup('+100', COL_X[side], toScreen(worldY(sq.lv)) - 120, { color: STYLE.accent[0], size: 40 });
      }
    }
    return true;
  }

  // 列に危険(予告中 or 落下中でまだ頭上)があるか
  function danger(side) {
    var me = worldY(sq.lv);
    for (var i = 0; i < nuts.length; i++) {
      var n = nuts[i];
      if (n.side !== side) continue;
      if (n.warn > 0 || n.y < me + 80) return true;
    }
    return false;
  }

  function spawnNut() {
    var lvl = Math.min(1, sq.lv / NEEDED);
    var side = game.random(0, 1) < 0.6 ? sq.side : 1 - sq.side;
    nuts.push({ side: side, warn: WARN_T, y: camY - ANCHOR - 160, passed: false });
    if (lvl > 0.45 && game.random(0, 1) < 0.35) nuts.push({ side: 1 - side, warn: WARN_T + 0.45, y: camY - ANCHOR - 160, passed: false });
    spawnT = 1.15 - lvl * 0.45;
  }

  // 実ロジック: どんぐり・カメラ・当たり判定。戻り値 'hit' | 'nest' | null
  function stepTree(dt, live) {
    if (sq.hop > 0) sq.hop = Math.max(0, sq.hop - dt);
    var target = worldY(sq.lv);
    camY += (target - camY) * Math.min(1, dt * 7);
    spawnT -= dt;
    if (spawnT <= 0 && sq.lv < NEEDED) spawnNut();
    var p = sqWorld();
    for (var i = nuts.length - 1; i >= 0; i--) {
      var n = nuts[i];
      if (n.warn > 0) {
        n.warn -= dt;
        n.y = camY - ANCHOR - 160;
        if (n.warn <= 0 && live) game.audio.tone('B5', 0.08, { wave: 'triangle', volume: 0.08, slide: -300 });
        continue;
      }
      n.y += FALL_V * dt;
      var col = sq.hop > 0 ? (sq.hop < HOP_T * 0.5 ? sq.side : sq.from) : sq.side;
      if (n.side === col && Math.abs(n.y - p.y) < 70) { hitNut = n; return 'hit'; }
      if (!n.passed && n.y > p.y + 70) { n.passed = true; dodged++; }
      if (n.y > camY + H) nuts.splice(i, 1);
    }
    if (sq.lv >= NEEDED && sq.hop <= 0) return 'nest';
    return null;
  }

  function closeGame(win) {
    alive = false; won = win; stopT = win ? 0.4 : 0.55;
    game.audio.stopBgm();
    var p = sqWorld();
    if (win) {
      game.feedback.good(p.x, toScreen(p.y), { text: 'CLEAR', color: STYLE.accent[0], count: 30 });
      game.audio.play('se_success', 0.5);
    } else {
      game.feedback.bad(p.x, toScreen(p.y), { text: hitNut ? 'MISS' : 'TIME UP', shake: 18 });
      game.audio.play('se_failure', 0.45);
    }
  }

  game.onTap(function(x, y) {
    if (mode === MODE.ATTRACT) { game.audio.play('se_coin', 0.5); mode = MODE.PLAYING; startGame(); return; }
    if (mode === MODE.RESULT) { mode = MODE.ATTRACT; startGame(); demo.t = 0; return; }
    if (!alive) return;
    var side = x < W / 2 ? 0 : 1;
    if (!hopTo(side, true)) {
      game.audio.play('se_tap', 0.12);
      game.fx.burst(x, y, { color: STYLE.accent[1], count: 4, speed: 100 });
    }
  });

  // ── ATTRACT ゴースト実演: danger()/hopTo()/stepTree() で安全な列を選んで登る。偶数周の4段目は予告を無視して当たる ──
  var demo = { t: 0, gx: W * 0.3, gy: H * 0.86, press: 0, careless: false, hitShow: 0, think: 0.4 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 7;
    if (cyc < dt || demo.t <= dt) {
      resetTree();
      demo.careless = Math.floor(demo.t / 7) % 2 === 1;
      demo.hitShow = 0; demo.think = 0.4;
    }
    if (demo.press > 0) demo.press -= dt;
    if (demo.hitShow > 0) {
      demo.hitShow -= dt;
      if (demo.hitShow <= 0) resetTree();
      return;
    }
    demo.think -= dt;
    var stay = demo.careless && sq.lv === 4;
    if (!stay && demo.think <= 0 && sq.hop <= 0) {
      var pick = danger(sq.side) ? 1 - sq.side : (danger(1 - sq.side) ? sq.side : (sq.lv % 3 === 0 ? 1 - sq.side : sq.side));
      if (!danger(pick)) {
        hopTo(pick, false);
        demo.gx = pick === 0 ? W * 0.28 : W * 0.72;
        demo.press = 0.22; demo.think = 0.42;
      }
    }
    if (stay && !danger(sq.side)) nuts.push({ side: sq.side, warn: WARN_T, y: camY - ANCHOR - 160, passed: false });
    var r = stepTree(dt, false);
    if (r === 'hit') demo.hitShow = 0.9;
    if (r === 'nest') resetTree();
  }

  // ── 描画 ──
  function drawTree(highlight) {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, '#7fd4ff'], [0.5, STYLE.bg[0]], [1, STYLE.bg[1]]]);
    // 遠景の木々(パララックス)
    for (var i = 0; i < 6; i++) {
      var fy = ((i * 420 - camY * 0.25) % 2520 + 2520) % 2520 - 300;
      game.draw.circle(i % 2 ? W * 0.08 : W * 0.93, fy, 150, '#e0602a', 0.35);
    }
    // 幹(太い縁取り → 中身)
    game.draw.rect(W / 2 - 104, 0, 208, H, STYLE.main[1], 1);
    game.draw.rect(W / 2 - 92, 0, 184, H, STYLE.main[0], 1);
    for (var b = 0; b < 12; b++) {
      var by = ((b * 190 - camY) % 2280 + 2280) % 2280 - 180;
      game.draw.rect(W / 2 - 60 + (b % 3) * 30, by, 12, 90, STYLE.main[1], 0.6);
    }
    // 枝(各段、左右)
    var lo = Math.floor(-(camY + H - ANCHOR) / LV) - 1, hi = Math.ceil(-(camY - ANCHOR) / LV) + 1;
    for (var lv = Math.max(0, lo); lv <= Math.min(NEEDED, hi); lv++) {
      var y = toScreen(worldY(lv));
      for (var s = 0; s < 2; s++) {
        var x0 = s === 0 ? COL_X[0] - 130 : W / 2;
        var len = s === 0 ? W / 2 - COL_X[0] + 130 : COL_X[1] + 130 - W / 2;
        game.draw.rect(x0, y + 26, len, 40, STYLE.main[1], 1);
        game.draw.rect(x0 + 4, y + 30, len - 8, 30, STYLE.main[0], 1);
        var lx = s === 0 ? COL_X[0] - 140 : COL_X[1] + 140;
        game.draw.circle(lx, y + 20, 56, STYLE.main[1], 1);
        game.draw.circle(lx, y + 20, 50, lv % 2 ? '#e8482a' : '#ffa630', 1);
      }
      if (lv === NEEDED) game.draw.sprite(NEST, { '#': '#8a5a2a' }, W / 2, y - 10, 22, { anchor: 'center' });
    }
    // 予告: 梢の葉が揺れる + 列に落下線
    for (var i2 = 0; i2 < nuts.length; i2++) {
      var n = nuts[i2];
      var cx = COL_X[n.side];
      if (n.warn > 0) {
        var shake = Math.sin(t * 50) * 14;
        game.draw.circle(cx + shake, 250, 80, STYLE.main[1], 1);
        game.draw.circle(cx + shake, 250, 72, '#3fae4a', 1);
        if (Math.floor(t * 12) % 2 === 0) game.draw.rect(cx - 6, 330, 12, H * 0.6, STYLE.accent[0], 0.55);
      } else {
        var ny = toScreen(n.y);
        var hot = highlight && n === hitNut;
        if (hot) game.draw.circle(cx, ny, 90, '#ffffff', 0.7);
        game.draw.sprite(NUT, NUT_PAL, cx, ny, hot ? 26 : 18, { anchor: 'center' });
        game.draw.rect(cx - 4, ny - 150, 8, 110, '#ffffff', 0.35);
      }
    }
  }

  function drawSquirrel(highlight) {
    var p = sqWorld();
    var sy = toScreen(p.y);
    var bob = sq.hop > 0 ? 0 : Math.sin(game.time.elapsed * 5) * 4;
    if (highlight) game.draw.circle(p.x, sy - 20, 110, '#ffffff', 0.55);
    game.draw.sprite(sq.hop > 0 ? SQ_HOP : SQ_SIT, SQ_PAL, p.x, sy - 30 + bob, 14, { anchor: 'center', flipX: sq.side === 1 });
  }

  function drawPads(pressSide) {
    var y = H * 0.87;
    for (var s = 0; s < 2; s++) {
      var cx = s === 0 ? W * 0.25 : W * 0.75;
      var on = pressSide === s;
      game.draw.circle(cx, y, 128, STYLE.main[1], 1);
      game.draw.circle(cx, y, 118, on ? STYLE.accent[0] : STYLE.accent[1], 1);
      game.draw.sprite(PAW, { '#': STYLE.main[1] }, cx, y + (on ? 6 : 0), 20, { anchor: 'center' });
    }
  }

  function drawHud() {
    big(Math.min(sq.lv, NEEDED) + ' / ' + NEEDED, W / 2, 96, 54, '#ffffff');
    var bw = W - 160;
    var low = clock < 4 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(76, 150, bw + 8, 26, STYLE.main[1], 1);
    game.draw.rect(80, 154, bw * Math.max(0, clock / TIME_LIMIT), 18, low ? '#ff3030' : STYLE.accent[1], 1);
    game.draw.rect(76, 196, bw + 8, 16, STYLE.main[1], 1);
    game.draw.rect(80, 199, bw * Math.min(1, sq.lv / NEEDED), 10, STYLE.accent[0], 1);
  }

  game.onUpdate(function(dt) {
    if (mode === MODE.ATTRACT) {
      stepDemo(dt);
      drawTree(demo.hitShow > 0);
      drawSquirrel(demo.hitShow > 0);
      drawPads(demo.press > 0 ? (demo.gx < W / 2 ? 0 : 1) : -1);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press > 0, scale: 15 });
      var sway = Math.sin(game.time.elapsed * 1.8) * 8;
      big(GAME_TITLE, W / 2 + sway, H * 0.08, 70, STYLE.accent[0]);
      big('HI-SCORE ' + Math.round(game.best || 0), W / 2, H * 0.13, 32, '#ffffff');
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) big('► 100円 投入 ◄', W / 2, H * 0.965, 40, STYLE.accent[0]);
      else big('INSERT COIN', W / 2, H * 0.965, 32, '#ffffff');
      return;
    }

    if (mode === MODE.RESULT) {
      drawTree(!won);
      drawSquirrel(false);
      big(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.09, 72, won ? STYLE.accent[0] : '#ff3030');
      big(sq.lv + ' / ' + NEEDED, W / 2, H * 0.14, 44, '#ffffff');
      if (won) big('SCORE ' + (sq.lv * 100 + Math.round(clock * 20)), W / 2, H * 0.18, 36, STYLE.accent[0]);
      else big('あと' + (NEEDED - sq.lv) + '段!', W / 2, H * 0.18, 36, STYLE.accent[0]);
      big('BEST ' + Math.round(game.best || 0), W / 2, H * 0.215, 28, '#ffffff');
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) big('TAP TO CONTINUE', W / 2, H * 0.965, 32, '#ffffff');
      return;
    }

    // ── PLAYING ──
    if (leaveT > 0) {
      leaveT -= dt;
      if (leaveT <= 0) {
        mode = MODE.RESULT;
        var stats = { height: sq.lv, dodged: dodged };
        if (won) game.end.success(sq.lv * 100 + Math.round(clock * 20), stats);
        else game.end.failure(stats);
      }
    } else if (stopT > 0) {
      stopT -= dt;
      if (stopT <= 0) leaveT = 1.0;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) { alive = true; game.audio.play('se_tap', 0.35); }
    } else if (alive) {
      clock -= dt;
      var r = stepTree(dt, true);
      if (r === 'hit') closeGame(false);
      else if (r === 'nest') closeGame(true);
      else if (clock <= 0) { clock = 0; closeGame(false); }
    }

    drawTree(stopT > 0 && !won);
    drawSquirrel(stopT > 0 && !won);
    drawPads(-1);
    drawHud();
    if (ready > 0) big(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.42, 90, STYLE.accent[0]);
  });

  game.onStart(function() {
    game.audio.melody([['C5', 0.25], ['E5', 0.25], ['G5', 0.5], ['E5', 0.25], ['F5', 0.25], ['A5', 0.5], ['G5', 0.25], ['E5', 0.25], ['C5', 0.5], ['D5', 0.5]], { tempo: 160, wave: 'square', volume: 0.045, loop: true, bass: true });
    mode = MODE.ATTRACT;
    startGame();
  });
})(game);
