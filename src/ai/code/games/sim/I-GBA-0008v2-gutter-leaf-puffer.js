// I-GBA-0008v2-gutter-leaf-puffer.js
// ガターリーフ・パファー — 手押しふいごを連打して、雨樋に詰まった枯れ葉を3区画ぶん吹き飛ばす
// 操作: 画面のどこでも連打するとふいごが1回ずつ風を送る。速く叩き続けると風が強まる(フィーバー)。手を止めると風で葉が戻ってくる
// 終わり: 13秒以内に3区画の詰まりを全部吹き飛ばせばCLEAR。時間切れでGAME OVER
// @mechanic: mash
// @theme: autumn_roof_gutter_bellows
// 世界観: 秋の古民家の屋根で、屋根職人が落ち葉で詰まった雨樋の口に手押しふいごを差し込み、連打の風で区画ごとに枯れ葉を押し流して軒先から吹き飛ばす
// 残るもの: 正誤(CLEAR/GAME OVER) + 吹き飛ばした区画数・総ポンプ回数・最高連打速度
// スタイル: MODERN AD-GAME

(function (game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // MODERN AD-GAME: 高彩度・太い黒縁・飛ぶ数字。3秒で伝わる画面
  var STYLE = { bg: ['#39b6ff', '#bfe9ff'], main: ['#ff7a1a', '#ffd23f', '#e8412c'], accent: ['#1b1b1b', '#ffffff'] };
  var ORANGE = STYLE.main[0], YELLOW = STYLE.main[1], RED = STYLE.main[2], INK = STYLE.accent[0], WHITE = STYLE.accent[1];
  var ROOF = '#7a4b2f', TILE = '#5b3522', METAL = '#9fb3c2', GREEN = '#33d17a';

  var TITLE = 'LEAF PUFFER';
  var TIME_LIMIT = 13;
  var SECTIONS = [12, 16, 20];
  var REFILL = 1.4; // 手が止まると毎秒戻る葉の量

  var GUTTER_Y = H * 0.47;
  var GUT_X0 = 250, GUT_X1 = W - 90;

  var PH = { ATTRACT: 'A', PLAYING: 'P', RESULT: 'R' };
  var phase = PH.ATTRACT;

  var ROOFER = [
    ['..rrr...', '.rrrrr..', '..sss...', '..s.s...', '.bbbbb..', 'b.bbb.b.', '..bbb...', '..b.b...', '.bb.bb..'],
    ['..rrr...', '.rrrrr..', '..sss...', '..s.s...', '.bbbbb..', '.bbbbbb.', '..bbb.b.', '..b.b...', '.bb.bb..'],
  ];
  var ROOFER_PAL = { r: RED, s: '#ffd0a8', b: '#2b62d9' };
  var BELLOWS = [
    ['kkkkkkkk', 'kwwwwwwk', 'kwkwkwkk', 'kwwwwwwk', 'kwkwkwkk', 'kwwwwwwk', 'kkkkkkkk'],
    ['kkkkkkkk', 'kwkwkwkk', 'kwwwwwwk', 'kkkkkkkk'],
  ];
  var BELLOWS_PAL = { k: INK, w: '#c98b52' };
  var LEAF = [
    ['..o..', '.ooo.', 'ooooo', '.ooo.', '..k..'],
    ['.o...', 'oooo.', '.oooo', '..oo.', '...k.'],
  ];

  var leaves = [];
  for (var l = 0; l < 22; l++) leaves.push({ x: Math.random() * W, y: Math.random() * H * 0.4 + 240, vx: -20 - Math.random() * 30, vy: 40 + Math.random() * 40, f: l % 2, c: l % 3 });

  // ── 状態 ──
  var sec, clog, timeLeft, ready, pumps, rate, tapTimes, fever, puffs, blast, halt, over, won, endT, score, prevBest, pumpAnim, gustT, gustWarn;

  function initGame() {
    sec = 0; clog = SECTIONS[0]; timeLeft = TIME_LIMIT; ready = 0.8;
    pumps = 0; rate = 0; tapTimes = []; fever = false; puffs = []; blast = 0;
    halt = null; over = false; won = false; endT = 0; score = 0; pumpAnim = 0;
    gustT = 3.2; gustWarn = 0;
    prevBest = game.best || 0;
  }

  function outline(x, y, w, h, col) {
    game.draw.rect(x - 6, y - 6, w + 12, h + 12, INK);
    game.draw.rect(x, y, w, h, col);
  }

  function pop(s, x, y, sz, col) {
    game.draw.text(s, x, y + 5, { size: sz, color: INK, bold: true, align: 'center' });
    game.draw.text(s, x - 3, y, { size: sz, color: col, bold: true, align: 'center' });
  }

  // 1回ポンプ(プレイ/デモ共通)。戻り値=吹き飛ばした量
  function pump(power) {
    pumpAnim = 0.12;
    puffs.push({ x: GUT_X0 + 20, life: 0.5, p: power });
    clog = Math.max(0, clog - power);
    return power;
  }

  function pileFrac() { return clog / SECTIONS[Math.min(sec, SECTIONS.length - 1)]; }

  // ── 描画 ──
  function drawScene(mframe, frac, secIdx) {
    game.draw.gradient(0, H, [[0, STYLE.bg[0]], [0.55, STYLE.bg[1]], [1, '#ffe7c2']]);
    // 遠景: 紅葉の山と柿の木
    for (var m = 0; m < 5; m++) game.draw.circle(80 + m * 240, H * 0.33, 200, m % 2 ? '#e3702a' : '#c9531f', 0.5);
    game.draw.rect(0, H * 0.33, W, 30, '#b8431b', 0.4);
    // 舞う落ち葉
    for (var i = 0; i < leaves.length; i++) {
      var lf = leaves[i];
      game.draw.sprite(LEAF[(lf.f + Math.floor(game.time.elapsed * 3)) % 2], { o: lf.c === 0 ? ORANGE : lf.c === 1 ? YELLOW : RED, k: INK }, lf.x, lf.y, 7, { anchor: 'center' });
    }
    // 屋根(瓦の段)
    for (var r = 0; r < 6; r++) {
      var ry = GUTTER_Y - 200 + r * 32;
      outline(0, ry, W, 22, r % 2 ? ROOF : TILE);
    }
    // 雨樋
    outline(GUT_X0, GUTTER_Y, GUT_X1 - GUT_X0, 70, METAL);
    game.draw.rect(GUT_X0, GUTTER_Y + 8, GUT_X1 - GUT_X0, 10, WHITE, 0.5);
    // 区画の仕切り
    for (var s = 1; s < 3; s++) game.draw.rect(GUT_X0 + (GUT_X1 - GUT_X0) * s / 3, GUTTER_Y - 4, 8, 78, INK);
    // 済んだ区画はきれいな銀
    for (var d = 0; d < secIdx && d < 3; d++) game.draw.rect(GUT_X0 + (GUT_X1 - GUT_X0) * d / 3 + 12, GUTTER_Y + 30, (GUT_X1 - GUT_X0) / 3 - 24, 20, GREEN, 0.5);
    // 軒先の出口
    outline(GUT_X1 - 10, GUTTER_Y + 60, 60, 200, METAL);
    // 詰まった葉の山(現在区画)
    if (secIdx < 3) {
      var zx = GUT_X0 + (GUT_X1 - GUT_X0) * secIdx / 3;
      var zw = (GUT_X1 - GUT_X0) / 3;
      var n = Math.ceil(frac * 14);
      var push = (1 - frac) * zw * 0.45;
      for (var k = 0; k < n; k++) {
        var lx = zx + 40 + push + (k % 5) * (zw * 0.5 / 5) + ((k * 37) % 17);
        var ly = GUTTER_Y + 30 - Math.floor(k / 5) * 26 - ((k * 13) % 9);
        game.draw.sprite(LEAF[k % 2], { o: k % 3 === 0 ? ORANGE : k % 3 === 1 ? YELLOW : RED, k: INK }, lx, ly, 9, { anchor: 'center' });
      }
    }
    // 風の塊
    for (var p = 0; p < puffs.length; p++) {
      var pf = puffs[p];
      game.draw.circle(pf.x, GUTTER_Y + 34, 18 + pf.p * 6, WHITE, pf.life * 1.2);
      game.draw.circle(pf.x - 26, GUTTER_Y + 34, 10 + pf.p * 3, WHITE, pf.life);
    }
    // 屋根職人とふいご
    var rbob = Math.sin(game.time.elapsed * 3) * 5;
    game.draw.sprite(ROOFER[mframe], ROOFER_PAL, 130, GUTTER_Y - 70 + rbob, 18, { anchor: 'center' });
    game.draw.sprite(pumpAnim > 0 ? BELLOWS[1] : BELLOWS[0], BELLOWS_PAL, 200, GUTTER_Y + 50 + (pumpAnim > 0 ? 16 : 0), 14, { anchor: 'center' });
    game.draw.rect(250, GUTTER_Y + 30, 30, 14, INK);
    // 吹き飛ばし演出
    if (blast > 0) {
      for (var b = 0; b < 8; b++) {
        var bx = GUT_X1 + 40 + (0.7 - blast) * 900 * (0.5 + (b % 4) * 0.2);
        var by = GUTTER_Y + 80 - (0.7 - blast) * 400 * ((b % 3) * 0.4 + 0.3) + (0.7 - blast) * (0.7 - blast) * 900;
        game.draw.sprite(LEAF[b % 2], { o: b % 2 ? ORANGE : RED, k: INK }, bx, by, 9, { anchor: 'center' });
      }
    }
    // 親指ゾーン: 大きなふいごの取っ手
    var hy = H * 0.84 + (pumpAnim > 0 ? 24 : 0);
    outline(W / 2 - 230, hy - 60, 460, 120, fever ? YELLOW : ORANGE);
    game.draw.rect(W / 2 - 230, hy - 60, 460, 18, WHITE, 0.45);
    for (var g = 0; g < 5; g++) game.draw.rect(W / 2 - 190 + g * 90, hy - 30, 12, 60, INK, 0.5);
    game.draw.rect(W / 2 - 20, hy + 60, 40, H * 0.97 - hy - 60, INK);
  }

  function drawHud() {
    for (var s = 0; s < 3; s++) {
      var col = s < sec ? GREEN : s === sec ? YELLOW : WHITE;
      outline(80 + s * 120, 60, 90, 60, col);
      pop(String(s + 1), 125 + s * 120, 94, 40, INK);
    }
    pop(String(score), W - 170, 94, 56, YELLOW);
    var fr = Math.max(0, timeLeft / TIME_LIMIT);
    outline(60, 160, W - 120, 26, WHITE);
    game.draw.rect(60, 160, (W - 120) * fr, 26, timeLeft < 4 && Math.floor(game.time.elapsed * 8) % 2 === 0 ? RED : GREEN);
    // 連打メーター
    var rf = Math.min(1, rate / 8);
    outline(160, H * 0.66, W - 420, 34, WHITE);
    game.draw.rect(160, H * 0.66, (W - 420) * rf, 34, fever ? YELLOW : ORANGE);
    game.draw.rect(160 + (W - 420) * 7 / 8, H * 0.66 - 10, 6, 54, INK);
    if (fever) pop('FEVER', W / 2 - 50, H * 0.64, 40, YELLOW);
  }

  function stepAmbient(dt) {
    for (var i = 0; i < leaves.length; i++) {
      var lf = leaves[i];
      lf.x += lf.vx * dt + Math.sin(game.time.elapsed * 2 + i) * 30 * dt;
      lf.y += lf.vy * dt;
      if (lf.y > H * 0.78 || lf.x < -30) { lf.y = 240; lf.x = Math.random() * W + 100; }
    }
    for (var p = puffs.length - 1; p >= 0; p--) {
      puffs[p].x += 1100 * dt; puffs[p].life -= dt;
      if (puffs[p].life <= 0) puffs.splice(p, 1);
    }
    if (pumpAnim > 0) pumpAnim -= dt;
    if (blast > 0) blast -= dt;
  }

  // ── 入力 ──
  game.onTap(function (x, y) {
    if (phase === PH.ATTRACT) { game.audio.play('se_coin', 0.45); phase = PH.PLAYING; initGame(); return; }
    if (phase === PH.RESULT) { game.audio.play('se_tap', 0.2); phase = PH.ATTRACT; initGame(); demo.t = 0; return; }
    if (over || halt || blast > 0.35) { game.audio.play('se_tap', 0.05); return; }
    if (ready > 0) { game.audio.play('se_tap', 0.08); pumpAnim = 0.08; return; }
    var now = game.time.elapsed;
    tapTimes.push(now);
    while (tapTimes.length && now - tapTimes[0] > 1) tapTimes.shift();
    rate = tapTimes.length;
    var wasFever = fever;
    fever = rate >= 7;
    if (fever && !wasFever) { game.audio.play('se_powerup', 0.35); game.fx.flash(YELLOW, 0.12); }
    var power = fever ? 2 : 1;
    pumps++;
    pump(power);
    score += 10 * power;
    game.audio.tone(fever ? 'A5' : 'E5', 0.05, { wave: 'square', volume: 0.07 });
    game.fx.popup('+' + power, GUT_X0 + 140 + Math.random() * 200, GUTTER_Y - 30, { color: fever ? YELLOW : WHITE, size: 44 });
    if (clog <= 0) clearSection();
  });

  function clearSection() {
    blast = 0.7;
    score += 150;
    game.feedback.good(GUT_X1, GUTTER_Y, { text: sec === 2 ? 'PERFECT' : 'NICE', color: YELLOW, count: 20 });
    game.audio.play('se_break', 0.4);
    sec++;
    if (sec === 2) { game.fx.popup('2 / 3', W / 2, H * 0.3, { color: YELLOW, size: 64 }); game.audio.play('se_milestone', 0.4); }
    if (sec >= 3) { won = true; finish(); }
    else clog = SECTIONS[sec];
  }

  function finish() {
    if (over) return;
    over = true; endT = 1.4;
    if (won) score += Math.floor(timeLeft * 40);
    game.audio.stopBgm();
    game.audio.play(won ? 'se_success' : 'se_failure', 0.55);
  }

  // ── ATTRACT: ゴーストが下の取っ手を連打 → 1区画ぶん吹き飛ばす ──
  var demo = { t: 0, gx: W / 2, gy: H * 0.84, press: false, next: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.2;
    if (cyc < dt || demo.t <= dt) { sec = 0; clog = 8; demo.next = 0.5; fever = false; }
    demo.press = false;
    if (cyc >= demo.next && cyc < 2.4 && clog > 0) {
      demo.next = cyc + 0.16;
      demo.press = true;
      pump(1);
      game.audio.play('se_tap', 0.05);
      if (clog <= 0) { blast = 0.7; game.feedback.good(GUT_X1, GUTTER_Y, { text: 'NICE', color: YELLOW, count: 10, volume: 0.2 }); }
    }
    if (cyc - (demo.next - 0.16) < 0.08) demo.press = true;
    demo.gy = H * 0.84 + (demo.press ? 20 : -10);
  }

  game.onUpdate(function (dt) {
    stepAmbient(dt);
    var mf = pumpAnim > 0 ? 1 : 0;

    if (phase === PH.ATTRACT) {
      stepDemo(dt);
      drawScene(mf, clog / 8, 0);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 16 });
      pop(TITLE, W / 2, H * 0.08, 76, YELLOW);
      pop('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.13, 38, WHITE);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) pop('► 100円 投入 ◄', W / 2, H * 0.955, 44, YELLOW);
      else pop('INSERT COIN', W / 2, H * 0.955, 38, WHITE);
      return;
    }

    if (phase === PH.RESULT) {
      drawScene(0, won ? 0 : pileFrac(), sec);
      outline(90, H * 0.14, W - 180, H * 0.2, won ? GREEN : RED);
      pop(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.19, 96, WHITE);
      pop(sec + ' / 3', W / 2, H * 0.25, 50, INK);
      pop('SCORE ' + score, W / 2, H * 0.3, 44, INK);
      if (won && score > prevBest) pop('NEW RECORD', W / 2, H * 0.38, 56, YELLOW);
      else pop('BEST ' + Math.max(prevBest, game.best || 0), W / 2, H * 0.38, 40, WHITE);
      if (!won) pop('あと' + Math.ceil(pileFrac() * 100) + '%!', W / 2, H * 0.62, 60, RED);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) pop('TAP TO CONTINUE', W / 2, H * 0.955, 38, WHITE);
      return;
    }

    // ── PLAYING ──
    if (over) {
      endT -= dt;
      if (endT <= 0) {
        phase = PH.RESULT;
        var stats = { sections: sec, pumps: pumps, remainPct: won ? 0 : Math.ceil(pileFrac() * 100) };
        if (won) game.end.success(score, stats); else game.end.failure(stats);
      }
    } else if (halt) {
      halt.t -= dt;
      if (halt.t <= 0) { halt = null; game.feedback.bad(GUT_X0 + (GUT_X1 - GUT_X0) * (sec + 0.5) / 3, GUTTER_Y, { text: 'TIME UP' }); finish(); }
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_jump', 0.3);
    } else {
      timeLeft -= dt;
      // 手が止まると葉が戻る(連打速度が落ちたときだけ)
      while (tapTimes.length && game.time.elapsed - tapTimes[0] > 1) tapTimes.shift();
      rate = tapTimes.length;
      fever = rate >= 7;
      if (rate < 3) clog = Math.min(SECTIONS[sec], clog + REFILL * dt);
      // 突風: 0.7秒前に葉の渦で予告 → 葉がどさっと戻る
      gustT -= dt;
      if (gustT <= 0.7 && gustWarn === 0) { gustWarn = 1; game.audio.tone('C4', 0.3, { wave: 'sawtooth', volume: 0.05, slide: 200 }); }
      if (gustT <= 0) { gustT = 3.5; gustWarn = 0; clog = Math.min(SECTIONS[sec], clog + 3); game.fx.shake(6, 0.2); }
      if (timeLeft <= 0) { timeLeft = 0; won = false; halt = { t: 0.45, max: 0.45 }; }
    }

    drawScene(mf, over && won ? 0 : pileFrac(), sec);
    if (gustWarn && !over) {
      var wx = GUT_X0 + (GUT_X1 - GUT_X0) * (sec + 0.5) / 3;
      var blink = Math.floor(game.time.elapsed * 10) % 2 === 0;
      for (var q = 0; q < 6; q++) {
        var a = game.time.elapsed * 8 + q;
        game.draw.sprite(LEAF[q % 2], { o: blink ? WHITE : ORANGE, k: INK }, wx + Math.cos(a) * 90, GUTTER_Y - 170 + Math.sin(a) * 40, 8, { anchor: 'center' });
      }
    }
    if (halt) {
      var k = 1 - halt.t / halt.max;
      var hx = GUT_X0 + (GUT_X1 - GUT_X0) * (sec + 0.5) / 3;
      game.draw.circle(hx, GUTTER_Y + 20, 100 + k * 80, WHITE, 0.7 * (1 - k) + 0.1);
      game.draw.sprite(LEAF[0], { o: WHITE, k: INK }, hx, GUTTER_Y + 20, 20 + k * 10, { anchor: 'center' });
    }
    drawHud();
    if (ready > 0) pop(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.34, 110, YELLOW);
  });

  game.onStart(function () {
    game.audio.melody([['G4', 0.5], ['A4', 0.5], ['C5', 0.5], ['A4', 0.5], ['D5', 0.5], ['C5', 0.5], ['A4', 1], ['G4', 0.5], ['E4', 0.5], ['G4', 0.5], ['A4', 0.5], ['C5', 1.5], ['R', 0.5]], { tempo: 150, wave: 'square', volume: 0.05, loop: true });
    phase = PH.ATTRACT;
    initGame();
  });
})(game);
