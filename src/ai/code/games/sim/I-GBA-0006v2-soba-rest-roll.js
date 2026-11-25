// I-GBA-0006v2-soba-rest-roll.js
// 夜明けの蕎麦のし — 麺棒をひと押しするたび生地は休みに入る。舞った打ち粉が降り切って生地が落ち着いた合図の瞬間だけ、次のひと押しを入れる
// 操作: タップで麺棒がひと押し転がり生地が一回り広がる。押した直後は打ち粉が舞い生地が張る(休み中=赤い張り筋)。粉が降り切り生地の縁と手元の麺棒パッドが白く光ったら次のタップ。休み中に押すと生地が破れて休み直し。窓から突風が来ると粉が舞い戻る
// 終わり: 14秒以内に9回のして点線の枠まで広げればCLEAR。休み中に押して3回破る/時間切れでGAME OVER
// @mechanic: cooldown_tap
// @theme: dawn_soba_workshop_rest
// 世界観: 早朝の蕎麦打ち場で、見習いの弟子が麺棒でのすたびに休ませる生地を見守り、打ち粉が降りて生地が落ち着いた合図の瞬間だけ次のひと押しを入れて、師匠が起きる前に一枚を板いっぱいにのし広げる
// 残るもの: 正誤(CLEAR/GAME OVER) + のした回数・破れ数・PERFECT数・スコア
// スタイル: HD POST 3D

(function (game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // HD POST 3D: 褐色に寄せた低彩度。朝日のブルーム(半透明円の重ね)と四辺のビネットでコントラストを潰す
  var STYLE = { bg: ['#2b241c', '#14100c'], main: ['#cdbb9c', '#8c7c64', '#564a3a'], accent: ['#f4e6c8', '#c8684a'] };
  var DOUGH = STYLE.main[0], WOOD = STYLE.main[1], WOOD_D = STYLE.main[2];
  var FLOUR = STYLE.accent[0], RUST = STYLE.accent[1];

  var LOGO = 'SOBA REST ROLL';
  var NEEDED = 9;
  var TIME_LIMIT = 14;
  var TEAR_MAX = 3;
  var PERFECT_WIN = 0.3;

  var CX = W * 0.5;
  var SHEET_TOP = H * 0.37;
  var SHEET_MIN = 300, SHEET_MAX = 840;
  var PAD_Y = H * 0.84;
  var REST_BASE = [0.55, 0.62, 0.7, 0.62, 0.92, 0.7, 1.0, 0.86, 1.08];

  var PH = { ATTRACT: 'attract', PLAYING: 'playing', RESULT: 'result' };
  var phase = PH.ATTRACT;

  // ── スプライト: 手ぬぐい鉢巻の弟子(待機 / 前のめり / 驚き) ──
  var DESHI = [
    ['....WWWW....', '...WWWWWW...', '...SSSSSS...', '...SKSSKS...', '...SSSSSS...', '....SMMS....', '..IIIIIIII..', '.IIIIIIIIII.', '.IIIIIIIIII.', '.IIIIIIIIII.'],
    ['............', '....WWWW....', '...WWWWWW...', '...SSSSSS...', '...SKSSKS...', '...SSSSSS...', '..IIIIIIII..', '.IIIIIIIIII.', '.IIIIIIIIII.', '.IIIIIIIIII.'],
    ['....WWWW....', '...WWWWWW...', '...SSSSSS...', '...KSSSSK...', '...SSKKSS...', '....SKKS....', '..IIIIIIII..', '.IIIIIIIIII.', '.IIIIIIIIII.', '.IIIIIIIIII.'],
  ];
  var DESHI_PAL = { W: '#efe6d4', S: '#d9b48c', K: '#2a1f16', M: '#9c5a44', I: '#3c4656' };
  var PIN_ICON = ['HH..........HH', 'HHBBBBBBBBBBHH', 'HHBLLLLLLLLBHH', 'HHBBBBBBBBBBHH', 'HH..........HH'];
  var PIN_PAL = { H: '#4a3a2c', B: '#b89a72', L: '#e6d2ae' };

  var DUST = [];
  for (var di = 0; di < 34; di++) DUST.push({ ox: Math.random() - 0.5, oy: Math.random(), ph: Math.random() * 6, k: 0.5 + Math.random() * 0.8 });

  // ── 生地モデル(本番もデモもこれを動かす) ──
  function makeDough() {
    return { rolled: 0, tears: 0, perfect: 0, rest: 0, restLen: 0.6, age: 0, ready: false, readyT: 0,
      roll: 0, gustAt: -1, warned: false, gusted: false, rips: [] };
  }
  function beginRest(d, len, gust) {
    d.restLen = len; d.rest = len; d.age = 0; d.ready = false; d.readyT = 0;
    d.gustAt = gust ? len - 0.15 : -1; d.warned = false; d.gusted = false;
  }
  function restProgress(d) { return d.ready ? 1 : Math.max(0, Math.min(1, 1 - d.rest / d.restLen)); }
  function sheetSize(d) { return SHEET_MIN + (SHEET_MAX - SHEET_MIN) * Math.min(1, d.rolled / NEEDED); }

  function tickDough(d, dt) {
    if (d.roll > 0) { d.roll = Math.max(0, d.roll - dt); return ''; }
    if (d.ready) { d.readyT += dt; return ''; }
    var ev = '';
    d.age += dt;
    if (d.gustAt > 0 && !d.gusted) {
      if (!d.warned && d.age >= d.gustAt - 0.6) { d.warned = true; ev = 'warn'; }
      if (d.age >= d.gustAt) { d.gusted = true; d.rest = Math.min(d.restLen, d.rest + d.restLen * 0.55); ev = 'gust'; }
    }
    d.rest -= dt;
    if (d.rest <= 0) { d.rest = 0; d.ready = true; d.readyT = 0; ev = 'ready'; }
    return ev;
  }

  function tryRoll(d) {
    if (d.roll > 0) return 'busy';
    if (!d.ready) {
      d.tears++;
      d.rips.push({ fx: game.random(-0.32, 0.32), fy: game.random(0.25, 0.75), fw: game.random(0.12, 0.2) });
      d.rest = d.restLen; d.age = 0; d.gustAt = -1;
      return 'early';
    }
    var perfect = d.readyT <= PERFECT_WIN;
    d.rolled++;
    if (perfect) d.perfect++;
    d.roll = 0.28;
    return perfect ? 'perfect' : 'good';
  }

  // ── 状態 ──
  var dough, timeLeft, countIn, stop, over, won, endT, score, prevBest, tempoUp, celebT, resultT;

  function initGame() {
    dough = makeDough();
    beginRest(dough, 0.5, false);
    timeLeft = TIME_LIMIT; countIn = 0.8; stop = null; over = false; won = false; endT = 0;
    score = 0; prevBest = game.best || 0; tempoUp = false; celebT = 0; resultT = 0;
  }

  function ink(str, x, y, sz, col) {
    game.draw.text(str, x + 3, y + 4, { size: sz, color: '#0c0906', bold: true, align: 'center' });
    game.draw.text(str, x, y, { size: sz, color: col || FLOUR, bold: true, align: 'center' });
  }

  // ── 描画 ──
  function drawRoom(gustWarn, gustNow) {
    game.draw.gradient(0, H, [[0, '#3c3227'], [0.42, '#251e17'], [1, STYLE.bg[1]]]);
    // 奥の壁と棚
    game.draw.rect(0, H * 0.13, W, 8, WOOD_D, 0.6);
    for (var b = 0; b < 4; b++) game.draw.rect(W * 0.08 + b * 70, H * 0.17, 52, 70, WOOD_D, 0.5);
    // 夜明けの格子窓(突風の前はガタつく)
    var jx = gustWarn ? Math.sin(game.time.elapsed * 60) * 5 : 0;
    var wx = W * 0.6 + jx, wy = H * 0.135;
    game.draw.rect(wx, wy, 300, 210, '#e9d2a4', 0.75);
    for (var gx = 1; gx < 4; gx++) game.draw.rect(wx + gx * 75 - 3, wy, 6, 210, WOOD_D, 0.9);
    game.draw.rect(wx, wy + 102, 300, 6, WOOD_D, 0.9);
    // ブルーム
    game.draw.circle(wx + 150, wy + 105, 330, FLOUR, 0.04);
    game.draw.circle(wx + 150, wy + 105, 220, FLOUR, 0.06);
    game.draw.circle(wx + 150, wy + 105, 130, '#fff4dc', 0.09);
    if (gustWarn || gustNow) {
      for (var i = 0; i < 6; i++) {
        var p = (game.time.elapsed * 2.2 + i / 6) % 1;
        var ly = wy + 40 + i * 30;
        game.draw.line(wx - p * 500, ly, wx - p * 500 - 120, ly + 30, FLOUR, 4);
      }
    }
  }

  function drawBoard() {
    game.draw.rect(W * 0.05, H * 0.335, W * 0.9, H * 0.385, WOOD);
    for (var g = 0; g < 9; g++) game.draw.rect(W * 0.05, H * 0.35 + g * 78, W * 0.9, 3, WOOD_D, 0.35);
    game.draw.rect(W * 0.05, H * 0.72, W * 0.9, 34, WOOD_D);
    // ゴール: 板いっぱいの点線枠
    var s = SHEET_MAX, sh = s * 0.72, x0 = CX - s / 2;
    for (var k = 0; k < 14; k++) {
      game.draw.rect(x0 + k * (s / 14), SHEET_TOP - 4, s / 28, 6, FLOUR, 0.45);
      game.draw.rect(x0 + k * (s / 14), SHEET_TOP + sh - 2, s / 28, 6, FLOUR, 0.45);
    }
    for (var m = 0; m < 10; m++) {
      game.draw.rect(x0 - 3, SHEET_TOP + m * (sh / 10), 6, sh / 20, FLOUR, 0.45);
      game.draw.rect(x0 + s - 3, SHEET_TOP + m * (sh / 10), 6, sh / 20, FLOUR, 0.45);
    }
  }

  function drawSheet(d, highlightRip) {
    var s = sheetSize(d), sh = s * 0.72;
    var p = restProgress(d);
    var tense = !d.ready && d.roll <= 0;
    var wob = tense ? Math.sin(game.time.elapsed * 22) * 6 * (1 - p) : 0;
    var x0 = CX - s / 2 - wob, w = s + wob * 2;
    game.draw.rect(x0 + 14, SHEET_TOP + 18, w, sh, '#0c0906', 0.35);
    game.draw.rect(x0 - 6, SHEET_TOP - 6, w + 12, sh + 12, DOUGH, 0.35);
    game.draw.rect(x0, SHEET_TOP, w, sh, DOUGH);
    game.draw.rect(x0, SHEET_TOP, w, sh * 0.18, '#e3d4b8', 0.5);
    for (var i = 0; i < 26; i++) {
      var sx = x0 + ((i * 137) % 100) / 100 * w, sy = SHEET_TOP + ((i * 61) % 100) / 100 * sh;
      game.draw.rect(sx, sy, 6, 6, '#6e5e48', 0.5);
    }
    // 休み中: 赤い張り筋(触ると破れる記号)
    if (tense) {
      var a = 0.25 + 0.5 * (1 - p) * (0.6 + 0.4 * Math.sin(game.time.elapsed * 14));
      for (var t = 0; t < 4; t++) {
        var tx = x0 + w * (0.18 + t * 0.21), ty = SHEET_TOP + sh * (0.35 + (t % 2) * 0.25);
        for (var z = 0; z < 4; z++) {
          game.draw.line(tx + z * 22, ty + (z % 2 ? -14 : 14), tx + (z + 1) * 22, ty + (z % 2 ? 14 : -14), RUST, 5);
        }
        game.draw.circle(tx, ty, 4, RUST, a);
      }
      game.draw.rect(x0, SHEET_TOP, w, sh, RUST, a * 0.18);
    }
    // 落ち着いた合図: 縁が白く光る
    if (d.ready) {
      var g = 0.5 + 0.5 * Math.sin(game.time.elapsed * 10);
      game.draw.rect(x0 - 10, SHEET_TOP - 10, w + 20, 8, '#ffffff', 0.5 + g * 0.4);
      game.draw.rect(x0 - 10, SHEET_TOP + sh + 2, w + 20, 8, '#ffffff', 0.5 + g * 0.4);
      game.draw.rect(x0 - 10, SHEET_TOP - 10, 8, sh + 20, '#ffffff', 0.5 + g * 0.4);
      game.draw.rect(x0 + w + 2, SHEET_TOP - 10, 8, sh + 20, '#ffffff', 0.5 + g * 0.4);
      game.draw.circle(CX, SHEET_TOP + sh * 0.5, s * 0.36, '#fff4dc', 0.08);
    }
    // 破れ跡
    for (var r = 0; r < d.rips.length; r++) {
      var rp = d.rips[r];
      var rx = CX + rp.fx * s, ry = SHEET_TOP + rp.fy * sh, rw = rp.fw * s;
      var hl = highlightRip === rp;
      for (var q = 0; q < 5; q++) {
        game.draw.line(rx - rw / 2 + q * rw / 5, ry + (q % 2 ? -10 : 10), rx - rw / 2 + (q + 1) * rw / 5, ry + (q % 2 ? 10 : -10), hl ? '#ffffff' : '#2a1f16', hl ? 14 : 8);
      }
    }
    return { x0: x0, w: w, sh: sh };
  }

  function drawDust(d, geo) {
    if (d.ready) return;
    var p = restProgress(d);
    var lift = Math.pow(1 - p, 1.2);
    for (var i = 0; i < DUST.length; i++) {
      var q = DUST[i];
      var hgt = lift * 260 * q.k + 6;
      var x = CX + q.ox * geo.w + Math.sin(game.time.elapsed * 2 + q.ph) * 16 * lift;
      var y = SHEET_TOP + q.oy * geo.sh - hgt;
      game.draw.circle(x, y, 5 + 5 * q.k, FLOUR, 0.25 + 0.45 * lift);
    }
  }

  function drawPinAndDeshi(d, geo, mood) {
    var rollK = d.roll > 0 ? Math.sin((1 - d.roll / 0.28) * Math.PI) : 0;
    var pinY = SHEET_TOP + 30 + rollK * (geo.sh - 60);
    var pw = geo.w + 150;
    var bob = Math.sin(game.time.elapsed * 2.4) * 4;
    var frame = mood === 'shock' ? 2 : (rollK > 0.1 ? 1 : 0);
    var dy = mood === 'joy' ? -Math.abs(Math.sin(game.time.elapsed * 9)) * 40 : (mood === 'slump' ? 26 : 0);
    var px = CX, py = H * 0.282 + bob + dy;
    game.draw.sprite(DESHI[frame], DESHI_PAL, px, py, 15, { anchor: 'center' });
    // 腕(肩から麺棒へ)
    game.draw.line(px - 70, py + 30, CX - 120, pinY, '#3c4656', 22);
    game.draw.line(px + 70, py + 30, CX + 120, pinY, '#3c4656', 22);
    // 麺棒
    game.draw.rect(CX - pw / 2, pinY - 18, pw, 36, '#b89a72');
    game.draw.rect(CX - pw / 2, pinY - 18, pw, 10, '#e6d2ae', 0.8);
    game.draw.rect(CX - pw / 2, pinY + 10, pw, 8, '#4a3a2c', 0.6);
    game.draw.circle(CX - 120, pinY, 22, DESHI_PAL.S);
    game.draw.circle(CX + 120, pinY, 22, DESHI_PAL.S);
  }

  function drawPad(d, pressed) {
    var ready = d.ready && d.roll <= 0;
    var p = restProgress(d);
    var bounce = ready ? Math.sin(game.time.elapsed * 9) * 8 : 0;
    var y = PAD_Y + bounce + (pressed ? 10 : 0);
    var hw = 300;
    game.draw.circle(CX - hw, y, 90, ready ? '#e6d2ae' : '#4a3a2c', ready ? 1 : 0.8);
    game.draw.circle(CX + hw, y, 90, ready ? '#e6d2ae' : '#4a3a2c', ready ? 1 : 0.8);
    game.draw.rect(CX - hw, y - 90, hw * 2, 180, ready ? '#e6d2ae' : '#4a3a2c', ready ? 1 : 0.8);
    if (ready) {
      var g = 0.5 + 0.5 * Math.sin(game.time.elapsed * 10);
      game.draw.rect(CX - hw, y - 100, hw * 2, 8, '#ffffff', 0.6 + g * 0.4);
      game.draw.rect(CX - hw, y + 92, hw * 2, 8, '#ffffff', 0.6 + g * 0.4);
      game.draw.circle(CX, y, 260, '#fff4dc', 0.07);
    }
    game.draw.sprite(PIN_ICON, PIN_PAL, CX, y, 26, { anchor: 'center', alpha: ready ? 1 : 0.45 });
    // 休みリング(打ち粉が降りるほど満ちる)
    var n = 36;
    for (var i = 0; i < n; i++) {
      var on = i / n < p;
      var ang = -Math.PI / 2 + (i / n) * Math.PI * 2;
      game.draw.circle(CX + Math.cos(ang) * 150, y + Math.sin(ang) * 150 * 0.55, 9, on ? FLOUR : RUST, on ? 0.95 : 0.35);
    }
  }

  function drawVignette() {
    game.draw.rect(0, 0, W, 90, '#000000', 0.35);
    game.draw.rect(0, H - 120, W, 120, '#000000', 0.4);
    game.draw.rect(0, 0, 50, H, '#000000', 0.3);
    game.draw.rect(W - 50, 0, 50, H, '#000000', 0.3);
    game.draw.rect(0, 0, 24, H, '#000000', 0.3);
    game.draw.rect(W - 24, 0, 24, H, '#000000', 0.3);
  }

  function drawHud() {
    ink(dough.rolled + ' / ' + NEEDED, W * 0.2, 96, 52, FLOUR);
    ink(String(score), CX, 96, 44, '#e6d2ae');
    for (var i = 0; i < TEAR_MAX; i++) {
      var lost = i < dough.tears;
      game.draw.circle(W * 0.72 + i * 66, 96, 24, lost ? RUST : DOUGH, lost ? 0.9 : 1);
      if (lost) game.draw.line(W * 0.72 + i * 66 - 18, 80, W * 0.72 + i * 66 + 18, 112, '#2a1f16', 7);
    }
    var fr = Math.max(0, timeLeft / TIME_LIMIT);
    var low = timeLeft < 4 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(70, 170, W - 140, 22, '#000000', 0.4);
    game.draw.rect(70, 170, (W - 140) * fr, 22, low ? RUST : FLOUR);
  }

  function drawScene(d, opts) {
    var warn = d.warned && !d.gusted && !d.ready;
    drawRoom(warn, d.gusted && !d.ready && restProgress(d) < 0.6);
    drawBoard();
    var geo = drawSheet(d, opts.rip);
    drawDust(d, geo);
    drawPinAndDeshi(d, geo, opts.mood);
    drawPad(d, opts.pressed);
    if (opts.rip) {
      var k = opts.k;
      var s = sheetSize(d);
      var rx = CX + opts.rip.fx * s, ry = SHEET_TOP + opts.rip.fy * s * 0.72;
      game.draw.circle(rx, ry, 40 + k * 120, '#ffffff', 0.5 * (1 - k) + 0.15);
    }
  }

  // ── 入力 ──
  function haltThen(kind, rip, after) {
    stop = { t: 0.42, max: 0.42, kind: kind, rip: rip, after: after };
  }

  function nextRest() {
    var i = dough.rolled;
    var len = REST_BASE[Math.min(REST_BASE.length - 1, i)] + game.random(-0.07, 0.07);
    var gust = len >= 0.84 && (i === 4 || i === 7 || game.random(0, 1) < 0.4);
    beginRest(dough, len, gust);
  }

  function pressPin() {
    if (over || stop) { game.audio.play('se_tap', 0.06); return; }
    if (countIn > 0) { game.audio.tone('D4', 0.05, { wave: 'triangle', volume: 0.06 }); return; }
    var r = tryRoll(dough);
    if (r === 'busy') { game.audio.tone('A3', 0.04, { wave: 'triangle', volume: 0.05 }); return; }
    if (r === 'early') {
      var rip = dough.rips[dough.rips.length - 1];
      game.audio.play('se_break', 0.55);
      game.fx.flash('#ffffff', 0.12);
      haltThen('tear', rip, function () {
        game.feedback.bad(CX, SHEET_TOP + rip.fy * sheetSize(dough) * 0.72, { text: 'MISS', shake: 14 });
        if (dough.tears >= TEAR_MAX) { won = false; wrapUp(); }
      });
      return;
    }
    var perfect = r === 'perfect';
    game.audio.play('se_tap', 0.25);
    score += perfect ? 150 : 100;
    game.feedback.good(CX, SHEET_TOP + 120, { text: perfect ? 'PERFECT' : 'GOOD', color: FLOUR, count: perfect ? 18 : 10 });
    if (dough.rolled === 5) {
      game.fx.popup('5 / ' + NEEDED, CX, H * 0.25, { color: '#fff4dc', size: 64 });
      game.audio.play('se_milestone', 0.4);
    }
    if (dough.rolled >= NEEDED) { won = true; wrapUp(); return; }
    nextRest();
  }

  game.onPress(function (x, y) {
    if (phase === PH.ATTRACT) { game.audio.play('se_coin', 0.45); phase = PH.PLAYING; initGame(); return; }
    if (phase === PH.RESULT) { game.audio.play('se_tap', 0.2); phase = PH.ATTRACT; initGame(); demo.t = 0; return; }
    pressPin();
  });

  function wrapUp() {
    if (over) return;
    over = true;
    endT = 1.4;
    if (won) score += Math.floor(timeLeft * 20) + dough.perfect * 30;
    game.audio.stopBgm();
    game.audio.play(won ? 'se_success' : 'se_failure', 0.55);
    if (won) game.fx.flash('#fff4dc', 0.3);
  }

  function enterResult() {
    phase = PH.RESULT;
    resultT = 0;
    var stats = { rolled: dough.rolled, tears: dough.tears, perfect: dough.perfect, timeLeft: Math.round(timeLeft * 10) / 10 };
    if (won) game.end.success(score, stats);
    else game.end.failure(stats);
  }

  function soundFor(ev) {
    if (ev === 'ready') game.audio.tone('G5', 0.09, { wave: 'triangle', volume: 0.12 });
    else if (ev === 'warn') game.audio.tone('E3', 0.3, { wave: 'sawtooth', volume: 0.05, slide: 60 });
    else if (ev === 'gust') game.audio.tone('B3', 0.2, { wave: 'triangle', volume: 0.06, slide: -120 });
  }

  // ── ATTRACT ゴースト実演(同じ生地モデルを手が操作する) ──
  var demo = { t: 0, d: null, step: 0, hx: CX + 40, hy: PAD_Y - 70, press: 0, freeze: 0, rip: null };
  var DEMO_CYCLE = 4.0;
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % DEMO_CYCLE;
    if (cyc < dt || demo.t <= dt || !demo.d) {
      demo.d = makeDough(); demo.d.rolled = 3;
      beginRest(demo.d, 0.75, false);
      demo.step = 0; demo.freeze = 0; demo.rip = null;
    }
    if (demo.press > 0) demo.press -= dt;
    var d = demo.d;
    if (demo.freeze > 0) { demo.freeze -= dt; if (demo.freeze <= 0) demo.rip = null; }
    else {
      tickDough(d, dt);
      var want = (demo.step === 0 || demo.step === 2) && d.ready && d.readyT > 0.12;
      var early = demo.step === 1 && !d.ready && d.roll <= 0 && restProgress(d) > 0.4;
      if (want) {
        tryRoll(d); beginRest(d, 0.75, false); demo.press = 0.22; demo.step++;
        game.feedback.good(CX, SHEET_TOP + 120, { text: 'GOOD', color: FLOUR, count: 8, volume: 0.2 });
      } else if (early) {
        tryRoll(d); demo.press = 0.22; demo.step++; demo.freeze = 0.4;
        demo.rip = d.rips[d.rips.length - 1];
        game.feedback.bad(CX, SHEET_TOP + 200, { text: 'MISS', volume: 0.15, shake: 4 });
      }
    }
    var ty = PAD_Y + (demo.press > 0 ? 0 : -80);
    demo.hy += (ty - demo.hy) * Math.min(1, dt * 14);
  }

  game.onUpdate(function (dt) {
    if (phase === PH.ATTRACT) {
      stepDemo(dt);
      drawScene(demo.d, { mood: demo.rip ? 'shock' : '', pressed: demo.press > 0, rip: demo.rip, k: demo.freeze > 0 ? 1 - demo.freeze / 0.4 : 0 });
      drawVignette();
      game.draw.hand(demo.hx, demo.hy, { press: demo.press > 0, scale: 16 });
      ink(LOGO, CX, H * 0.07, 70, '#fff4dc');
      ink('BEST ' + (game.best > 0 ? game.best : '-'), CX, H * 0.115, 36, '#e6d2ae');
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) ink('► 100円 投入 ◄', CX, H * 0.95, 46, '#fff4dc');
      else ink('TAP TO START', CX, H * 0.95, 40, FLOUR);
      return;
    }

    if (phase === PH.RESULT) {
      resultT += dt;
      drawScene(dough, { mood: won ? 'joy' : 'slump', pressed: false, rip: null, k: 0 });
      drawVignette();
      game.draw.rect(0, H * 0.16, W, H * 0.2, '#000000', 0.45);
      ink(won ? 'CLEAR' : 'GAME OVER', CX, H * 0.2, 104, won ? '#fff4dc' : RUST);
      ink(dough.rolled + ' / ' + NEEDED, CX, H * 0.27, 60, FLOUR);
      ink('SCORE ' + score, CX, H * 0.32, 48, '#e6d2ae');
      if (won && score > prevBest) ink('NEW RECORD', CX, H * 0.765, 56, '#fff4dc');
      else ink('BEST ' + Math.max(prevBest, score), CX, H * 0.765, 40, '#e6d2ae');
      if (!won) ink('あと' + (NEEDED - dough.rolled) + '回!', CX, H * 0.665, 60, '#fff4dc');
      else ink('PERFECT ' + dough.perfect, CX, H * 0.665, 48, '#fff4dc');
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) ink('TAP TO CONTINUE', CX, H * 0.95, 40, FLOUR);
      return;
    }

    // ── PLAYING ──
    if (over) {
      endT -= dt;
      if (won) {
        celebT -= dt;
        if (celebT <= 0) {
          celebT = 0.18;
          game.fx.burst(game.random(W * 0.15, W * 0.85), game.random(H * 0.4, H * 0.68), { color: FLOUR, count: 14, speed: 420 });
        }
      }
      if (endT <= 0) { enterResult(); return; }
    } else if (stop) {
      stop.t -= dt;
      if (stop.t <= 0) { var fn = stop.after; stop = null; fn(); }
    } else if (countIn > 0) {
      countIn -= dt;
      if (countIn <= 0) game.audio.tone('D5', 0.12, { wave: 'triangle', volume: 0.12 });
    } else {
      timeLeft -= dt;
      if (!tempoUp && timeLeft < 4) {
        tempoUp = true;
        game.audio.melody(TUNE, { tempo: 126, wave: 'triangle', volume: 0.06, loop: true, bass: TUNE_BASS });
      }
      if (timeLeft <= 0) {
        timeLeft = 0;
        haltThen('time', null, function () {
          game.feedback.bad(CX, H * 0.5, { text: 'TIME UP' });
          won = false; wrapUp();
        });
      } else {
        soundFor(tickDough(dough, dt));
      }
    }

    var k = stop ? 1 - stop.t / stop.max : 0;
    var mood = stop && stop.kind === 'tear' ? 'shock' : (over ? (won ? 'joy' : 'slump') : '');
    drawScene(dough, { mood: mood, pressed: false, rip: stop ? stop.rip : null, k: k });
    if (stop && stop.kind === 'time') {
      var s = sheetSize(dough);
      game.draw.rect(CX - s / 2 - 20, SHEET_TOP - 20, s + 40, s * 0.72 + 40, '#ffffff', 0.25 * (1 - k));
    }
    drawVignette();
    drawHud();
    if (countIn > 0) ink(countIn > 0.35 ? 'READY?' : 'GO!', CX, H * 0.55, 110, '#fff4dc');
  });

  var TUNE = [['D4', 1], ['E4', 0.5], ['G4', 0.5], ['A4', 1], ['G4', 0.5], ['E4', 0.5], ['D4', 1], ['R', 0.5], ['B3', 0.5], ['D4', 2],
    ['G4', 1], ['A4', 0.5], ['B4', 0.5], ['A4', 1], ['G4', 0.5], ['E4', 0.5], ['D4', 3]];
  var TUNE_BASS = [['D3', 2], ['A2', 2], ['G2', 2], ['D3', 2], ['G2', 2], ['A2', 2], ['D3', 4]];

  game.onStart(function () {
    game.audio.melody(TUNE, { tempo: 84, wave: 'triangle', volume: 0.06, loop: true, bass: TUNE_BASS });
    phase = PH.ATTRACT;
    initGame();
  });
})(game);
