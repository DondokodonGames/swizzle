// I-3DS-0011v2-ballpark-337-drum-board.js
// 三三七ドラム — 球場の電光掲示板の回ごとの列に灯る拍に合わせて大太鼓を叩き、休みの拍は叩かずに耐えて声援ゲージを押し上げる
// 操作: 掲示板の今の回の列で、灯りが上から順に拍ごとに進む。白く満ちた灯りの拍で画面を叩くと大太鼓が鳴る。点だけの拍は休み(叩くとMISS)。拍の頭に近いほどPERFECT
// 終わり: 応援1曲(数え1回+8回の列のうち7列・25打)が終わったとき声援ゲージが旗(70%)に届いていればCLEAR。届かなければGAME OVER
// @mechanic: rhythm
// @theme: ballpark_337_drum_board
// 世界観: 夏の地方大会の球場のスタンドで、吹奏楽部の打楽器係が電光掲示板の回の列に合わせて大太鼓で三三七の拍を刻み、拍どおりに叩くほど客席の声援を押し上げて打席の主将に届ける
// 残るもの: 正誤(CLEAR/GAME OVER) + 声援ゲージ%・PERFECT/GOOD/MISS数・最大コンボ
// スタイル: 70s MONO

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 70s MONO: 白いドットで描き、画面の帯ごとに単色のセロハンを重ねる。矩形波の単音、無音の間が緊張
  var STYLE = { bg: ['#000000', '#1a1a1a'], main: ['#f2f2f2', '#9a9a9a', '#4a4a4a'], accent: ['#ffb000', '#30d060', '#ff3a3a'] };
  var C = {
    black: STYLE.bg[0], dim: STYLE.bg[1], white: STYLE.main[0], gray: STYLE.main[1], dark: STYLE.main[2],
    amber: STYLE.accent[0], green: STYLE.accent[1], red: STYLE.accent[2],
  };

  var GAME_TITLE = '3-3-7 DRUM';
  var BPM = 140, SPB = 60 / BPM;
  // 列=回。0列目は数え(叩かない)。x=叩く拍 / .=休み
  var BARS = ['....', 'xxxx', 'xxxx', 'xxx.', 'xxx.', 'xxxx', 'xxx.', 'xxxx'];
  var TIME_LIMIT = 14;
  var SONG_END = BARS.length * 4 * SPB + 0.25;
  var PERFECT_W = 0.07, GOOD_W = 0.14;
  var GOAL = 0.7;
  var RIFF = ['G4', 'G4', 'C5', 'G4', 'A4', 'A4', 'D5', 'B4'];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var notes, clock, lastBeat, gauge, perfects, goods, misses, combo, maxCombo, score, readyT, over, won, outroT, stopT, playT, focus, drumT, swung, fans, batT, mood;

  function buildNotes() {
    notes = [];
    for (var b = 1; b < BARS.length; b++) {
      for (var k = 0; k < 4; k++) notes.push({ t: (b * 4 + k) * SPB, rest: BARS[b][k] === '.', res: 0, col: b, row: k });
    }
  }

  function initGame() {
    buildNotes();
    clock = -0.0001; lastBeat = -1; gauge = 0.1; perfects = 0; goods = 0; misses = 0; combo = 0; maxCombo = 0; score = 0;
    readyT = 0.8; over = false; won = false; outroT = 0; stopT = 0; playT = 0; focus = null; drumT = 0; swung = false; batT = -1; mood = 0;
  }

  // 拍クロック: 拍の頭で伴奏(休みの拍は鳴らさない=無音で知らせる)
  function stepBeat(dt) {
    clock += dt;
    var bi = Math.floor(clock / SPB);
    if (bi !== lastBeat && bi >= 0) {
      lastBeat = bi;
      var bar = Math.floor(bi / 4), k = bi % 4;
      if (bar === 0) game.audio.tone(k === 3 ? 'C5' : 'G4', 0.1, { wave: 'square', volume: 0.07 });
      else if (bar < BARS.length) {
        if (BARS[bar][k] === 'x') game.audio.tone(RIFF[bi % RIFF.length], 0.11, { wave: 'square', volume: 0.06 });
        if (k === 0) game.audio.tone('C3', 0.05, { wave: 'triangle', volume: 0.05 });
      }
    }
    // 叩かれずに過ぎた拍はMISS
    for (var i = 0; i < notes.length; i++) {
      var n = notes[i];
      if (n.res === 0 && !n.rest && clock - n.t > GOOD_W) {
        n.res = -1; onMiss(n, false);
      }
    }
  }

  function nearest() {
    var best = null, bd = 9;
    for (var i = 0; i < notes.length; i++) {
      var n = notes[i];
      if (n.res !== 0) continue;
      var d = Math.abs(clock - n.t);
      if (d < bd) { bd = d; best = n; }
    }
    return { n: best, d: bd };
  }

  function hitDrum(demo) {
    drumT = 0.12;
    var r = nearest();
    if (r.n && !r.n.rest && r.d <= GOOD_W) {
      var perfect = r.d <= PERFECT_W;
      r.n.res = perfect ? 2 : 1;
      combo++; maxCombo = Math.max(maxCombo, combo);
      gauge = Math.min(1, gauge + (perfect ? 0.04 : 0.025));
      if (perfect) perfects++; else goods++;
      score += (perfect ? 100 : 50) + combo * 5;
      mood = 1;
      game.audio.tone(98 + Math.min(combo, 12) * 4, 0.16, { wave: 'triangle', volume: 0.14, slide: -40 });
      game.feedback.good(540, 1480, { text: perfect ? 'PERFECT' : 'GOOD', color: perfect ? C.amber : C.white, size: 54, sound: perfect ? 'se_good' : 'se_tap' });
      if (combo > 0 && combo % 10 === 0) game.fx.popup('x' + combo, 540, 1360, { color: C.amber, size: 60 });
      checkBat();
    } else {
      // 休みの拍・拍のない所で叩いた
      if (r.n && r.n.rest && r.d <= GOOD_W) r.n.res = -2;
      game.audio.tone(70, 0.12, { wave: 'sawtooth', volume: 0.09 });
      gauge = Math.max(0, gauge - 0.04);
      combo = 0; mood = -0.6;
      if (!demo) misses++;
      game.feedback.bad(540, 1480, { text: 'MISS', shake: demo ? 3 : 6 });
    }
  }

  function onMiss(n, demo) {
    gauge = Math.max(0, gauge - 0.05);
    combo = 0; mood = -0.6;
    misses++;
    game.fx.popup('MISS', 160 + (n.col - 1) * 120, 420 + n.row * 74, { color: C.red, size: 40 });
    game.audio.play('se_bad', 0.25);
  }

  // 声援が半分を越えた瞬間、打席の主将が打つ
  function checkBat() {
    if (!swung && gauge >= 0.5) {
      swung = true; batT = 0;
      game.audio.play('se_milestone', 0.5);
      game.fx.popup('NICE', 540, 980, { color: C.amber, size: 70 });
      game.fx.burst(540, 1010, { color: C.white, count: 18, speed: 360 });
    }
  }

  function finish(ok) {
    over = true; won = ok; outroT = 1.6;
    if (ok) {
      score += Math.round(gauge * 1000);
      mood = 2;
      game.audio.play('se_success', 0.55);
      game.audio.melody([['C5', 0.5], ['E5', 0.5], ['G5', 0.5], ['C6', 1.5]], { tempo: 160, wave: 'square', volume: 0.07, loop: false });
      game.fx.burst(540, 900, { color: C.amber, count: 30, speed: 460 });
      game.fx.burst(540, 900, { color: C.green, count: 20, speed: 360 });
      game.fx.flash('#ffffff', 0.2);
    } else {
      focus = { gauge: true }; stopT = 0.5;
      game.feedback.bad(1000, 1050, { text: 'MISS', shake: 10 });
      game.audio.play('se_failure', 0.5);
    }
  }

  // ---- 入力 ----
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { game.audio.play('se_tap'); state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function(x, y) {
    if (state !== S.PLAYING) return;
    if (over || readyT > 0 || clock < 3.5 * SPB || y < 230) {
      game.audio.tone(200, 0.03, { wave: 'triangle', volume: 0.03 });
      return;
    }
    hitDrum(false);
  });

  // ---- 描画 ----
  function label(str, x, y, sz, col) {
    game.draw.text(str, x + 4, y + 4, { size: sz, color: C.black, bold: true, align: 'center' });
    game.draw.text(str, x, y, { size: sz, color: col, bold: true, align: 'center' });
  }

  var DRUMMER_A = ['..wwww..', '.wwwwww.', '..wddw..', '..wwww..', '.gggggg.', 'gwggggwg', 'g.gggg.g', '..g..g..', '..w..w..'];
  var DRUMMER_B = ['..wwww..', '.wwwwww.', '..wddw..', '..wwww..', 'wgggggg.', '.wggggwg', '..gggg.g', '..g..g..', '..w..w..'];
  var BATTER_A = ['..ww...', '..ww..w', '.wwww.w', '..ww.w.', '..ww...', '.w..w..'];
  var BATTER_B = ['..ww...', '..ww...', '.wwwwww', '..ww...', '..ww...', '.w..w..'];
  var FLAG = ['wwww', 'wwww', 'w...', 'w...'];

  function drawBoard() {
    var t = game.time.elapsed;
    var bi = Math.floor(clock / SPB), curBar = Math.floor(bi / 4), curK = bi % 4;
    var ph = (clock / SPB) - Math.floor(clock / SPB);
    game.draw.rect(40, 250, 1000, 470, C.dim);
    game.draw.rect(40, 250, 1000, 6, C.gray);
    for (var c = 0; c < BARS.length; c++) {
      var x = 110 + c * 123;
      var cur = c === curBar && clock >= 0;
      if (cur) game.draw.rect(x - 52, 268, 104, 438, C.dark);
      game.draw.text(c === 0 ? '0' : String(c), x, 300, { size: 40, color: cur ? C.white : C.gray, bold: true, align: 'center' });
      for (var k = 0; k < 4; k++) {
        var y = 380 + k * 86;
        var isCur = cur && k === curK;
        if (c === 0) {
          var lit = curBar > 0 || (cur && k <= curK);
          game.draw.circle(x, y, 22, lit ? C.white : C.dark);
          continue;
        }
        var n = notes[(c - 1) * 4 + k];
        if (n.rest) {
          game.draw.circle(x, y, 8, n.res === -2 ? C.red : C.gray);
          if (n.res === -2) { game.draw.line(x - 24, y - 24, x + 24, y + 24, C.red, 6); }
        } else if (n.res === 2) game.draw.circle(x, y, 30, C.amber);
        else if (n.res === 1) game.draw.circle(x, y, 27, C.white);
        else if (n.res === -1) {
          game.draw.circle(x, y, 26, C.dark);
          game.draw.line(x - 20, y - 20, x + 20, y + 20, C.red, 6);
          game.draw.line(x + 20, y - 20, x - 20, y + 20, C.red, 6);
        } else {
          game.draw.circle(x, y, 28, C.gray);
          game.draw.circle(x, y, 20, C.dim);
          game.draw.circle(x, y, 14, C.white);
        }
        // 次に叩く拍: 外輪が縮んで拍の頭で重なる
        if (!n.rest && n.res === 0 && n.t - clock < SPB * 1.2 && n.t - clock > -0.05) {
          var q = Math.max(0, (n.t - clock) / (SPB * 1.2));
          game.draw.circle(x, y, 30 + q * 50, C.white, 0.25 + (1 - q) * 0.25);
        }
        if (isCur) game.draw.circle(x, y, 40 + (1 - ph) * 8, C.white, 0.15);
      }
    }
  }

  function drawField() {
    var t = game.time.elapsed;
    var beatPh = Math.max(0, 1 - ((clock / SPB) % 1) * 3);
    game.draw.gradient(720, 1400, [[0, '#2a2a2a'], [0.35, '#3a3a3a'], [1, '#202020']]);
    // スタンドの観客(声援が上がるほど立ち上がる)
    for (var row = 0; row < 4; row++) {
      for (var i = 0; i < 18; i++) {
        var fx = 40 + i * 52 + (row % 2) * 26;
        var stand = gauge > (i % 6) / 6 * 0.9 ? 1 : 0;
        var fy = 760 + row * 44 - stand * (10 + beatPh * 12);
        game.draw.circle(fx, fy, 12, stand ? C.white : C.gray);
        game.draw.rect(fx - 10, fy + 12, 20, 18, stand ? C.gray : C.dark);
      }
    }
    // グラウンドと打席
    game.draw.line(240, 1360, 540, 1000, C.gray, 4);
    game.draw.line(840, 1360, 540, 1000, C.gray, 4);
    game.draw.rect(520, 1240, 40, 40, C.white);
    var fr = batT >= 0 && batT < 0.6 ? BATTER_B : BATTER_A;
    game.draw.sprite(fr, { w: C.white }, 470, 1190, 12, { anchor: 'center' });
    if (batT >= 0) {
      batT += game.time.delta;
      game.draw.circle(540 + batT * 600, 1150 - batT * 700 + batT * batT * 300, 12, C.white);
    }
    // 声援ゲージと旗
    var gx = 1000, top = 760, bot = 1340;
    var hl = focus && stopT > 0;
    game.draw.rect(gx - 30, top - 10, 60, bot - top + 20, C.dark);
    var gh = (bot - top) * gauge;
    for (var s = 0; s < 20; s++) {
      var sy = bot - (s + 1) * (bot - top) / 20;
      var on = (s + 1) / 20 <= gauge + 0.001;
      game.draw.rect(gx - 22, sy + 3, 44, (bot - top) / 20 - 6, hl ? '#ffffff' : (on ? C.white : C.dim));
    }
    var fy2 = bot - (bot - top) * GOAL;
    game.draw.rect(gx - 50, fy2 - 3, 100, 6, C.amber);
    game.draw.sprite(FLAG, { w: C.amber }, gx - 72, fy2 - 34, 8, {});
    if (hl) game.draw.rect(gx - 40, bot - gh - 8, 80, 16, '#ffffff');
  }

  function drawDrum() {
    var t = game.time.elapsed;
    var dy = Math.round(H * 0.85);
    var hit = drumT > 0;
    game.draw.circle(540, dy, 200, C.gray);
    game.draw.circle(540, dy, 184, hit ? '#ffffff' : C.white);
    game.draw.circle(540, dy, 120, hit ? C.white : '#dcdcdc');
    for (var k = 0; k < 12; k++) {
      var a = k / 12 * Math.PI * 2;
      game.draw.circle(540 + Math.cos(a) * 192, dy + Math.sin(a) * 192, 8, C.dark);
    }
    if (hit) game.draw.circle(540, dy, 220 + (0.12 - drumT) * 400, C.white, 0.3);
    var fr = drumT > 0 ? DRUMMER_B : DRUMMER_A;
    game.draw.sprite(fr, { w: C.white, d: C.black, g: C.gray }, 200, dy - 60 - (mood > 0.5 ? Math.abs(Math.sin(t * 10)) * 14 : 0), 20, { anchor: 'center' });
    // ばち
    var bx = drumT > 0 ? 470 : 330, by = drumT > 0 ? dy - 40 : dy - 220;
    game.draw.line(250, dy - 80, bx, by, C.white, 12);
    game.draw.circle(bx, by, 22, C.white);
  }

  function cellophane() {
    // 帯ごとの単色セロハン
    game.draw.rect(0, 0, W, 250, C.amber, 0.18);
    game.draw.rect(0, 250, W, 470, C.amber, 0.12);
    game.draw.rect(0, 720, W, 680, C.green, 0.2);
    game.draw.rect(0, 1400, W, H - 1400, C.red, 0.2);
    for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18);
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 230, C.black, 0.8);
    label('SCORE ' + score, 280, 70, 44, C.white);
    label(Math.round(gauge * 100) + '%', 280, 165, 56, C.amber);
    if (combo >= 2) label('COMBO ' + combo, 790, 70, 40, C.white);
    // 曲の進み(掲示板の回の進み)
    var progress = Math.max(0, Math.min(1, clock / SONG_END));
    game.draw.rect(620, 150, 400, 24, C.dark);
    game.draw.rect(620, 150, 400 * progress, 24, C.white);
  }

  function drawScene() {
    game.draw.gradient(0, H, [C.black, C.dim]);
    drawBoard();
    drawField();
    drawDrum();
  }

  // ---- ATTRACT: 本物の拍で叩いて見せる。最初の休みの拍だけわざと叩いてMISSを見せる ----
  var demo = { t: 0, press: 0, wrongDone: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % (SONG_END + 1);
    if (cyc < dt || demo.t <= dt) { initGame(); readyT = 0; demo.wrongDone = false; }
    if (drumT > 0) drumT -= dt;
    demo.press -= dt;
    if (clock > SONG_END) return;
    var prev = clock;
    stepBeat(dt);
    for (var i = 0; i < notes.length; i++) {
      var n = notes[i];
      if (n.res !== 0) continue;
      if (prev < n.t && clock >= n.t) {
        if (!n.rest) { hitDrum(true); demo.press = 0.12; }
        else if (!demo.wrongDone) { demo.wrongDone = true; hitDrum(true); demo.press = 0.12; }
      }
    }
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;
    mood += (0 - mood) * Math.min(1, dt * 1.5);

    if (state === S.ATTRACT) {
      stepDemo(dt);
      drawScene();
      game.draw.hand(540, Math.round(H * 0.85) - (demo.press > 0 ? 0 : 60), { press: demo.press > 0, scale: 15 });
      game.draw.rect(0, 0, W, 230, C.black, 0.85);
      label(GAME_TITLE, W / 2, 100, 92 + Math.sin(t * 3) * 3, C.amber);
      label('HI-SCORE ' + (game.best > 0 ? game.best : 0), W / 2, 188, 36, C.white);
      if (Math.floor(t * 2) % 2 === 0) label('► 100円 投入 ◄', W / 2, 1878, 48, C.amber);
      else label('TAP TO START', W / 2, 1878, 44, C.white);
      cellophane();
      return;
    }

    if (state === S.RESULT) {
      drawScene();
      game.draw.rect(0, H * 0.3, W, H * 0.27, C.black, 0.88);
      label(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.355, 96, won ? C.green : C.red);
      label('SCORE ' + score, W / 2, H * 0.41, 54, C.white);
      label(Math.round(gauge * 100) + '%', W / 2, H * 0.455, 46, C.amber);
      label('PERFECT ' + perfects + '  GOOD ' + goods + '  MISS ' + misses, W / 2, H * 0.49, 34, C.white);
      if (score > game.best && score > 0) label('NEW RECORD', W / 2, H * 0.525, 46, C.amber);
      else label('BEST ' + Math.max(game.best, score), W / 2, H * 0.525, 38, C.white);
      if (!won) label('あと' + Math.max(1, Math.ceil((GOAL - gauge) * 100)) + '%', W / 2, H * 0.56, 46, C.amber);
      if (Math.floor(t * 2) % 2 === 0) label('TAP TO CONTINUE', W / 2, H * 0.61, 38, C.white);
      cellophane();
      return;
    }

    // ---- PLAYING ----
    if (drumT > 0) drumT -= dt;
    if (over) {
      outroT -= dt;
      if (stopT > 0) stopT -= dt;
      if (outroT <= 0) {
        state = S.RESULT;
        var stats = { gauge: Math.round(gauge * 100), perfect: perfects, good: goods, miss: misses, maxCombo: maxCombo };
        if (won) game.end.success(score, stats);
        else game.end.failure(stats);
      }
    } else if (readyT > 0) {
      readyT -= dt;
      if (readyT <= 0) game.audio.play('se_tap', 0.5);
    } else {
      playT += dt;
      stepBeat(dt);
      if (clock >= SONG_END || playT >= TIME_LIMIT) finish(gauge >= GOAL);
    }

    drawScene();
    drawHud();
    // 開始直後のお手本: 数えの間だけ太鼓の上に手
    if (!over && readyT <= 0 && clock < 4 * SPB) {
      game.draw.hand(540, Math.round(H * 0.85) - 40, { press: (clock / SPB) % 1 < 0.3, scale: 12, alpha: 0.55 });
    }
    if (readyT > 0) label(readyT > 0.35 ? 'READY?' : 'GO!', W / 2, 1060, 100, C.amber);
    if (over) label(won ? 'FINISH' : 'GAME OVER', W / 2, 1060, 90, won ? C.green : C.red);
    cellophane();
  });

  game.onStart(function() {
    game.audio.stopBgm();
    state = S.ATTRACT;
    initGame();
  });
})(game);
