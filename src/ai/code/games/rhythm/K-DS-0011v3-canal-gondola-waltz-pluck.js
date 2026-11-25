// K-DS-0011v3-canal-gondola-waltz-pluck.js
// 運河のワルツ弾き — 三拍子の拍ごとに上の弦と下の弦を交互に弾き、舟がアーチの下をくぐる暗がりでも拍を崩さず伴奏を続ける
// 操作: 画面下の2本の弦(上=金・下=青)を、1拍ごとに上・下・上…と交互に押して弾く。3拍子なので小節の1拍目に来る弦が小節ごとに入れ替わる。押した瞬間を拍の頭からのずれで判定(PERFECT/GOOD/MISS)。同じ弦を続けて弾く・拍から外れる・弾き損ねはMISS。7〜8小節目は舟が長いアーチの下をくぐり、拍の灯と刻みの和音が消えて1拍目のベースだけになる(入る0.6秒前に鐘が鳴る)
// 終わり: 12小節(14.4秒)を弾き切ってMISS 4回以内ならCLEAR(判定の点×連続ボーナス、暗がりは2倍)。MISS 5回でGAME OVER
// @mechanic: alternate_tap
// @theme: canal_gondola_waltz_accompanist
// 世界観: 夕暮れの運河をゆくゴンドラの上で、舟歌の伴奏者が小さな弦楽器の上の弦と下の弦を三拍子の拍ごとに交互に弾き、アーチの暗がりでも曲を止めずに弾き続ける
// 残るもの: 正誤(CLEAR/GAME OVER) + スコア・PERFECT/GOOD/MISS数・最大コンボ・暗がりで弾けた拍数
// スタイル: VOXEL BLOCK

(function(game) {
  var STYLE = { bg: ['#ffcf8a', '#f2906a', '#5a4a78'], main: ['#e9d7b8', '#c4a982', '#8d7556'], accent: ['#ffc23d', '#3fb6c8'] };
  var W = game.canvas.width;
  var H = game.canvas.height;

  // VOXEL BLOCK: 立方体を上面/左面/右面の3明度で等角に積む。影は落とさず明度差だけで立体を出す
  var C = {
    sky: STYLE.bg[0], dusk: STYLE.bg[1], night: STYLE.bg[2],
    gold: STYLE.accent[0], teal: STYLE.accent[1], ink: '#2a2238', white: '#fff6e8', red: '#e8505b'
  };
  var F_WALL = [[STYLE.main[0], STYLE.main[1], STYLE.main[2]], ['#f0b8a0', '#d48c74', '#a8644f'], ['#f5e2a0', '#d7bd72', '#a88f4c'], ['#c9d8e8', '#9fb3ca', '#71869e']];
  var F_STONE = ['#d9d2c4', '#aea594', '#857c6c'];
  var F_BOAT = ['#4a4658', '#2e2b3a', '#1d1b26'];
  var F_GOLD = ['#ffe08a', C.gold, '#c98e14'];
  var F_TEAL = ['#9fe6ef', C.teal, '#23808e'];
  var F_DIM = ['#8a8498', '#6a6478', '#4c475a'];
  var F_BRIDGE = ['#e7c9a4', '#c49d74', '#93704e'];

  var GAME_TITLE = 'GONDOLA WALTZ';
  var BPM = 150;
  var SPB = 60 / BPM;
  var BAR = 3;
  var LEAD = 0.06;
  var PERFECT_W = 0.05;
  var GOOD_W = 0.11;
  var TOTAL_BEATS = 36;        // 12小節
  var TIME_LIMIT = 14.4;
  var JUDGE_FROM = 3;          // 1小節目は前奏
  var DARK_A = 18, DARK_B = 24; // 7〜8小節目はアーチの下
  var MISS_MAX = 5;
  var DEMO_BEATS = 12;
  var DEMO_WRONG = 7;          // デモはこの拍で同じ弦を続けて弾いてMISS
  var SPEED = 90;              // 舟の進み(px/秒)

  var BOAT_X = 540, BOAT_Y = Math.round(H * 0.6);
  var PAD_U = Math.round(H * 0.765), PAD_L = Math.round(H * 0.87), PAD_H = 170;
  var LAMP_Y = 330;

  // ワルツ(オリジナル): 小節ごとの和音 [ベース, 刻み2音, 歌の音, 上の弦3音, 下の弦3音]
  var CH = [
    ['F2', 'A4', 'C5', 'C5', ['F5', 'A5', 'C6'], ['F4', 'A4', 'C5']],
    ['C3', 'G4', 'Bb4', 'E5', ['E5', 'G5', 'Bb5'], ['C4', 'E4', 'G4']],
    ['F2', 'A4', 'C5', 'F5', ['A5', 'C6', 'A5'], ['F4', 'C4', 'F4']],
    ['Bb2', 'D5', 'F5', 'D5', ['D5', 'F5', 'Bb5'], ['Bb3', 'D4', 'F4']],
    ['F2', 'A4', 'C5', 'C5', ['C6', 'A5', 'F5'], ['A4', 'F4', 'C4']],
    ['C3', 'G4', 'Bb4', 'G5', ['G5', 'E5', 'C5'], ['E4', 'C4', 'G3']],
    ['D3', 'A4', 'D5', 'F5', ['F5', 'A5', 'D6'], ['D4', 'F4', 'A4']],
    ['Bb2', 'D5', 'F5', 'D5', ['D5', 'Bb4', 'F5'], ['Bb3', 'F4', 'D4']],
    ['F2', 'A4', 'C5', 'A5', ['A5', 'C6', 'F6'], ['F4', 'A4', 'C5']],
    ['C3', 'G4', 'Bb4', 'G5', ['Bb5', 'G5', 'E5'], ['C4', 'G4', 'E4']],
    ['F2', 'A4', 'C5', 'F5', ['F5', 'C6', 'A5'], ['F4', 'C5', 'A4']],
    ['F2', 'A4', 'C5', 'F5', ['F6', 'C6', 'F5'], ['F4', 'C4', 'F3']]
  ];

  // ---- スプライト(3明度) ----
  var PLAYER_IDLE = ['..hhhh..', '.hhhhhh.', '..ssss..', '..sese..', '..ssss..', '.rrrrrr.', 'rrrrrrrr', 'rrmmmmrs', '.rmmmm..', '.rrrrrr.', '..b..b..'];
  var PLAYER_UP = ['..hhhh..', '.hhhhhh.', '..ssss..', '..sese..', '..ssss..', '.rrrrrrs', 'rrrrrrr.', 'rrmmmmr.', '.rmmmm..', '.rrrrrr.', '..b..b..'];
  var PLAYER_DN = ['..hhhh..', '.hhhhhh.', '..ssss..', '..sese..', '..ssss..', '.rrrrrr.', 'rrrrrrrr', 'rrmmmmrr', '.rmmmm.s', '.rrrrrr.', '..b..b..'];
  var PLAYER_OOPS = ['s.hhhh.s', '.hhhhhh.', '..ssss..', '..seese.', '..ssss..', '.rrrrrr.', 'rrrrrrrr', 'rrmmmmrr', '.rmmmm..', '.rrrrrr.', '.b....b.'];
  var GONDOLIER_A = ['.kkkkkk.', '..kkkk..', '..ssss..', '..sese..', '..ssss..', '.wwwwww.', 'swnnnnws', '.wwwwww.', '.nnnnnn.', '..nn.nn.', '..k..k..'];
  var GONDOLIER_B = ['.kkkkkk.', '..kkkk..', '..ssss..', '..sese..', '..ssss..', 'swwwwwws', '.wnnnnw.', '.wwwwww.', '.nnnnnn.', '.nn..nn.', '.k....k.'];
  var PAL_P = { h: '#5a3a28', s: '#f4c9a0', e: C.ink, r: '#3f6fb0', m: '#c98e14', b: C.ink };
  var PAL_G = { k: C.ink, s: '#f4c9a0', e: C.ink, w: C.white, n: '#2c3e78' };

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var demoMode, endBeats, running, songT, beatN, schedB, readyT, hitStop, flashT, beatPulse, bellDone;
  var hit, score, perfects, goods, misses, combo, maxCombo, darkOk, over, won, outroT, prevBest, milestone, pluck, padFlash, lastStr;

  function expected(b) { return (b - JUDGE_FROM) % 2 === 0 ? 0 : 1; } // 0=上の弦 1=下の弦
  function isDark(b) { return !demoMode && b >= DARK_A && b < DARK_B; }
  function dist() { return songT * SPEED; }

  function initGame(isDemo) {
    demoMode = !!isDemo;
    endBeats = demoMode ? DEMO_BEATS : TOTAL_BEATS;
    running = false; songT = 0; beatN = 0; schedB = 0;
    readyT = demoMode ? 0 : 0.8;
    hitStop = 0; flashT = 0; beatPulse = 0; bellDone = false;
    hit = {}; score = 0; perfects = 0; goods = 0; misses = 0; combo = 0; maxCombo = 0; darkOk = 0;
    over = false; won = false; outroT = 0; prevBest = game.best; milestone = false;
    pluck = { s: -1, t: 0, oops: 0 }; padFlash = [0, 0]; lastStr = -1;
    if (demoMode) startClock();
  }

  function startClock() { running = true; songT = 0; beatN = 0; schedB = 0; onBeat(0); }

  function sfxTone(f, d, o) { if (!demoMode) game.audio.tone(f, d, o); }

  // 伴奏は1拍ずつ拍クロックから積む: 1拍目 = ベース+歌、2・3拍目 = 刻みの和音(アーチの下では1拍目のベースだけ)
  function playBeatMusic(b) {
    if (demoMode) return;
    var ch = CH[Math.floor(b / BAR) % CH.length], i = b % BAR;
    if (i === 0) {
      game.audio.melody(isDark(b) ? [['R', 1]] : [[ch[3], 0.9], ['R', 0.1]], { tempo: BPM, wave: 'sine', volume: 0.05, bass: [[ch[0], 0.8], ['R', 0.2]], bassWave: 'triangle', bassVolume: 0.11 });
    } else if (!isDark(b)) {
      game.audio.melody([[ch[1], 0.35], ['R', 0.65]], { tempo: BPM, wave: 'square', volume: 0.025, bass: [[ch[2], 0.35], ['R', 0.65]], bassWave: 'square', bassVolume: 0.02 });
    }
  }

  // ---- 拍クロック(1本だけ) ----
  function onBeat(b) {
    if (isDark(b)) return;
    beatPulse = 1;
  }

  function stepPlay(dt) {
    if (!running) return;
    songT += dt;
    while (schedB < endBeats && songT >= schedB * SPB - LEAD) { playBeatMusic(schedB); schedB++; }
    while (songT >= (beatN + 1) * SPB) { beatN++; onBeat(beatN); }
    // 予告: アーチに入る0.6秒前に鐘
    if (!demoMode && !bellDone && songT >= DARK_A * SPB - 0.6) {
      bellDone = true;
      sfxTone(1320, 0.5, { wave: 'sine', volume: 0.08 });
      sfxTone(660, 0.6, { wave: 'triangle', volume: 0.05 });
    }
    // 弾き損ね
    for (var b = JUDGE_FROM; b < endBeats; b++) {
      if (hit[b] || songT <= b * SPB + GOOD_W) continue;
      hit[b] = 'skip';
      missAt(expected(b), false);
      break;
    }
    if (songT >= endBeats * SPB + GOOD_W + 0.05) {
      running = false;
      if (!demoMode && !over) finish(misses < MISS_MAX);
    }
    if (!demoMode && !over && songT > TIME_LIMIT + 0.6) finish(misses < MISS_MAX);
  }

  function judge(off) {
    var a = Math.abs(off);
    return a <= PERFECT_W ? 'PERFECT' : (a <= GOOD_W ? 'GOOD' : 'MISS');
  }

  function padY(s) { return s === 0 ? PAD_U : PAD_L; }

  function missAt(s, wrong) {
    misses++; combo = 0;
    pluck.oops = 0.5;
    hitStop = 0.36; flashT = 0.36; padFlash[s] = 0.36;
    if (wrong) sfxTone(110, 0.25, { wave: 'sawtooth', volume: 0.06, slide: -30 });
    if (demoMode) { game.fx.popup('MISS', W / 2, padY(s) - 40, { color: C.red, size: 56 }); game.fx.shake(4, 0.2); }
    else game.feedback.bad(W / 2, padY(s) - 40, { text: 'MISS', shake: 8 });
    if (!demoMode && misses >= MISS_MAX) finish(false);
  }

  function pluckAction(s) {
    if (!running || hitStop > 0) return 'none';
    var b = Math.round(songT / SPB);
    if (b < JUDGE_FROM || b >= endBeats) return 'none';
    var off = songT - b * SPB;
    var w = judge(off);
    pluck = { s: s, t: 0.18, oops: 0 };
    if (hit[b] === 'skip' || hit[b] === 'late') return 'late';   // その拍のMISSはもう数えた
    if (hit[b]) { missAt(s, false); return 'miss'; }              // 同じ拍の2度弾き
    if (w === 'MISS') { if (off > 0) hit[b] = 'late'; missAt(s, false); return 'miss'; }
    if (s !== expected(b)) { hit[b] = 'wrong'; missAt(s, true); return 'miss'; }
    hit[b] = w;
    lastStr = s;
    combo++; if (combo > maxCombo) maxCombo = combo;
    var mult = 1 + Math.floor(combo / 9) * 0.5;
    var dk = isDark(b);
    if (dk) darkOk++;
    var base = w === 'PERFECT' ? 100 : 50;
    score += Math.round(base * mult * (dk ? 2 : 1));
    if (w === 'PERFECT') perfects++; else goods++;
    var ch = CH[Math.floor(b / BAR) % CH.length];
    sfxTone((s === 0 ? ch[4] : ch[5])[b % BAR], 0.35, { wave: s === 0 ? 'triangle' : 'square', volume: s === 0 ? 0.09 : 0.04 });
    var col = s === 0 ? C.gold : C.teal;
    if (demoMode) { game.fx.popup(w, W / 2 + (s === 0 ? -180 : 180), padY(s) - 30, { color: col, size: 44 }); }
    else game.feedback.good(W / 2 + (s === 0 ? -180 : 180), padY(s) - 30, { text: w, color: col, size: w === 'PERFECT' ? 50 : 42, count: 8, volume: 0.15 });
    padFlash[s] = 0.15;
    if (!demoMode && combo === 18 && !milestone) {
      milestone = true;
      game.audio.play('se_milestone', 0.45);
      game.fx.popup(combo + ' COMBO', W / 2, H * 0.36, { color: C.gold, size: 76 });
    }
    return 'ok';
  }

  function finish(ok) {
    if (over) return;
    over = true; won = ok; outroT = 1.6; running = false;
    if (ok) {
      score += (MISS_MAX - misses) * 100;
      game.audio.play('se_success', 0.55);
      for (var i = 0; i < 5; i++) game.fx.burst(game.random(200, 880), game.random(700, 1200), { color: i % 2 ? C.gold : C.teal, count: 18, speed: 420 });
    } else {
      game.audio.play('se_failure', 0.5);
    }
  }

  function tickWorld(dt) {
    if (hitStop > 0) { hitStop -= dt; return; }
    stepPlay(dt);
    if (pluck.t > 0) pluck.t -= dt;
    if (pluck.oops > 0) pluck.oops -= dt;
    for (var i = 0; i < 2; i++) if (padFlash[i] > 0) padFlash[i] -= dt;
  }

  // ---- 入力 ----
  game.onPress(function(x, y) {
    if (state !== S.PLAYING || over || readyT > 0) return;
    var s = y < (PAD_U + PAD_L + PAD_H) / 2 ? 0 : 1;
    var res = pluckAction(s);
    if (res === 'none' || res === 'late') game.audio.tone(s === 0 ? 880 : 440, 0.04, { wave: 'triangle', volume: 0.03 });
  });
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(false); return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.3); state = S.ATTRACT; initGame(true); demo.t = 0; return; }
  });

  // ---- 描画: 等角ボクセル ----
  // (x, y) = 上面のひし形の中心、a = 半幅、h = 高さ、f = [上面, 左面, 右面]
  function cube(x, y, a, h, f) {
    var st = 4, i;
    for (i = 0; i < a; i += st) game.draw.rect(x - a + i, y + i * 0.5, st + 0.6, h, f[1]);
    for (i = 0; i < a; i += st) game.draw.rect(x + i, y + a * 0.5 - (i + st) * 0.5, st + 0.6, h + st * 0.5, f[2]);
    for (var dy = -a * 0.5; dy < a * 0.5; dy += st) {
      var hw = a * (1 - Math.abs(dy + st * 0.5) / (a * 0.5));
      game.draw.rect(x - hw, y + dy, hw * 2, st + 0.6, f[0]);
    }
  }
  function tower(x, baseY, n, a, f, win) {
    for (var k = 0; k < n; k++) {
      var y = baseY - k * a;
      cube(x, y, a, a, f);
      if (win) game.draw.rect(x + a * 0.35, y + a * 0.35, a * 0.25, a * 0.4, win, 0.9);
    }
  }
  function label(str, x, y, sz, col, align) {
    game.draw.text(str, x + 3, y + 4, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: col, bold: true, align: align || 'center' });
  }
  function hash(i) { var v = Math.sin(i * 12.9898) * 43758.5453; return v - Math.floor(v); }

  function drawCanal() {
    var t = game.time.elapsed, d = dist();
    var dark = running && isDark(beatN);
    game.draw.gradient(0, H, [[0, C.sky], [0.2, C.dusk], [0.45, C.night], [1, C.night]]);
    // 水面(縦にのびる運河)と流れるひし形の波
    game.draw.rect(250, 420, 580, 1060, '#3a6f8c');
    for (var r = 0; r < 14; r++) {
      var wy = 420 + ((r * 97 + d * 1.0) % 1060);
      var wx = 300 + hash(r) * 480;
      cube(wx, wy, 24, 0, ['#5d93ad', '#5d93ad', '#5d93ad']);
    }
    // 両岸の家並み(遠いものから)。舟が進むと下へ流れる
    for (var side = 0; side < 2; side++) {
      var bx = side ? 940 : 140;
      var first = Math.floor((d - 300) / 112);
      for (var k = first + 14; k >= first; k--) {
        var by = BOAT_Y + 120 - (k * 112 - d);
        if (by < 380 || by > 1560) continue;
        var n = 2 + Math.floor(hash(k * 2 + side) * 4);
        var f = F_WALL[Math.floor(hash(k * 3 + side * 7) * F_WALL.length)];
        tower(bx, by, n, 56, f, hash(k + side) > 0.4 ? C.gold : null);
        cube(side ? 820 : 260, by + 40, 28, 18, F_STONE);
      }
    }
    // アーチ(長い屋根付きの橋)
    var bf = BOAT_Y + 60 - (DARK_A * SPB * SPEED - d);   // 手前の縁
    var depth = (DARK_B - DARK_A) * SPB * SPEED;
    if (!demoMode && bf - depth < 1500 && bf > 300) {
      for (var row = 0; row < 2; row++) {
        var yy = bf - depth + row * 40;
        for (var c = 0; c < 9; c++) cube(260 + c * 70 + row * 35, yy, 35, 50, F_BRIDGE);
      }
      for (var c2 = 0; c2 < 9; c2++) cube(260 + c2 * 70, bf, 35, 50, F_BRIDGE);
    }
    return dark;
  }

  function drawBoat() {
    var bob = Math.sin(game.time.elapsed * 2) * 4;
    for (var k = 6; k >= 0; k--) cube(BOAT_X, BOAT_Y - 200 + k * 44 + bob, 46, 28, F_BOAT);
    cube(BOAT_X, BOAT_Y - 250 + bob, 26, 46, ['#f0f0f4', '#c8c8d2', '#9a9aa8']);
    // 伴奏者(真ん中に座る)
    var art = pluck.oops > 0 ? PLAYER_OOPS : (pluck.t > 0 ? (pluck.s === 0 ? PLAYER_UP : PLAYER_DN) : PLAYER_IDLE);
    var fl = flashT > 0 && Math.floor(flashT * 20) % 2 === 0;
    game.draw.sprite(art, fl ? { h: C.white, s: C.white, e: C.white, r: C.white, m: C.white, b: C.white } : PAL_P, BOAT_X, BOAT_Y - 120 + bob - beatPulse * 6, fl ? 15 : 13, { anchor: 'center' });
    // 漕ぎ手(後ろに立つ)。1拍目で櫂を押す
    var stroke = Math.floor(songT / SPB) % BAR === 0;
    game.draw.sprite(stroke ? GONDOLIER_B : GONDOLIER_A, PAL_G, BOAT_X + 70, BOAT_Y + 30 + bob, 12, { anchor: 'center' });
    game.draw.line(BOAT_X + 130, BOAT_Y - 30 + bob, BOAT_X + (stroke ? 210 : 160), BOAT_Y + 190, '#6b4a2a', 9);
  }

  // 拍の灯: 3つの立方体(1拍目が大きい)。上面の色 = その拍で弾く弦
  function drawLamps(dark) {
    var bar = Math.floor(beatN / BAR), cur = beatN % BAR;
    for (var i = 0; i < BAR; i++) {
      var b = bar * BAR + i;
      var a = i === 0 ? 70 : 54;
      var lift = running && i === cur && !dark ? beatPulse * 30 : 0;
      var f = dark || b < JUDGE_FROM ? F_DIM : (expected(b) === 0 ? F_GOLD : F_TEAL);
      cube(340 + i * 200, LAMP_Y - lift, a, 40, f);
      if (hit[b] === 'PERFECT' || hit[b] === 'GOOD') game.draw.circle(340 + i * 200, LAMP_Y - lift, 12, C.white);
    }
  }

  function drawPads(dark) {
    var down = state === S.ATTRACT ? demo.press : -1;
    var nb = Math.round(songT / SPB);
    var want = running && !dark && nb >= JUDGE_FROM ? expected(nb) : -1;
    game.draw.rect(0, PAD_U - 50, W, H - PAD_U + 50, C.night);
    for (var s = 0; s < 2; s++) {
      var y = padY(s), pressed = down === s || padFlash[s] > 0;
      var f = s === 0 ? F_GOLD : F_TEAL;
      var top = pressed ? y + 14 : y;
      // 前面(暗)と上面(明)で厚みのある板
      game.draw.rect(90, top + 60, W - 180, PAD_H - 70 - (pressed ? 14 : 0), f[2]);
      game.draw.rect(90, top, W - 180, 60, f[0]);
      game.draw.rect(90, top + 60, W - 180, 10, f[1]);
      game.draw.line(110, top + 30, W - 110, top + 30, C.white, s === 0 ? 4 : 7);
      if (want === s) {
        var p = 0.5 + 0.5 * Math.sin(game.time.elapsed * 14);
        game.draw.rect(80, top - 10, W - 160, 6, C.white, 0.5 + p * 0.5);
        game.draw.rect(80, top + PAD_H - 20, W - 160, 6, C.white, 0.5 + p * 0.5);
      }
      if (padFlash[s] > 0 && flashT > 0) game.draw.rect(90, top, W - 180, PAD_H - 10, C.red, 0.35);
    }
  }

  function drawScene() {
    var dark = drawCanal();
    drawBoat();
    if (dark) game.draw.rect(0, 380, W, PAD_U - 430, '#1a1428', 0.55);
    drawLamps(dark);
    drawPads(dark);
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 230, C.ink, 0.85);
    label('SCORE ' + score, 60, 96, 54, C.white, 'left');
    label('BEST ' + prevBest, 60, 168, 32, C.gold, 'left');
    label(Math.min(12, Math.floor(beatN / BAR) + 1) + ' / ' + 12, W - 60, 96, 52, C.teal, 'right');
    for (var i = 0; i < MISS_MAX; i++) cube(W - 330 + i * 64, 160, 22, 16, i < misses ? ['#ff8a90', C.red, '#9e2e36'] : F_DIM);
    var progress = Math.min(1, songT / (endBeats * SPB));
    game.draw.rect(0, 222, W, 8, '#4c475a');
    game.draw.rect(0, 222, W * progress, 8, C.gold);
  }

  // ---- ATTRACT: 実ロジックで上下交互に弾き、7拍目で同じ弦を続けてMISSを見せる ----
  var demo = { t: 0, press: -1, pt: 0, hx: W / 2, hy: 0, last: 0 };
  var DEMO_LEN = DEMO_BEATS * SPB + 0.6;
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % DEMO_LEN;
    if (cyc < dt || demo.t <= dt) { initGame(true); demo.press = -1; demo.pt = 0; demo.last = 0; }
    if (demo.pt > 0) { demo.pt -= dt; if (demo.pt <= 0) demo.press = -1; }
    if (running && hitStop <= 0) {
      var nt = songT + dt;
      var nb = Math.round(nt / SPB);
      if (nb >= JUDGE_FROM && nb < endBeats && !hit[nb] && nt >= nb * SPB - 0.01) {
        var s = nb === DEMO_WRONG ? demo.last : expected(nb);
        pluckAction(s); demo.press = s; demo.pt = 0.15; demo.last = s;
      }
      var target = nb + (nt > nb * SPB ? 1 : 0);
      var ns = target === DEMO_WRONG ? demo.last : expected(Math.max(JUDGE_FROM, target));
      var ty = padY(demo.press >= 0 ? demo.press : ns) + 80;
      demo.hy += (ty - demo.hy) * Math.min(1, dt * 12);
    }
    tickWorld(dt);
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;
    if (flashT > 0) flashT -= dt;
    if (beatPulse > 0) beatPulse = Math.max(0, beatPulse - dt * 5);

    if (state === S.ATTRACT) {
      stepDemo(dt);
      drawScene();
      game.draw.hand(W / 2 + 60, demo.hy || PAD_U + 80, { press: demo.press >= 0, scale: 15 });
      game.draw.rect(0, 0, W, 230, C.ink, 0.85);
      label(GAME_TITLE, W / 2, 112, 80 + Math.sin(t * 3) * 3, C.gold);
      label('HI-SCORE ' + (game.best > 0 ? game.best : 0), W / 2, 192, 36, C.teal);
      if (Math.floor(t * 2) % 2 === 0) label('► 100円 投入 ◄', W / 2, PAD_U - 80, 50, C.gold);
      else label('TAP TO START', W / 2, PAD_U - 80, 46, C.white);
      return;
    }

    if (state === S.RESULT) {
      drawScene();
      game.draw.rect(70, H * 0.25, W - 140, H * 0.35, C.ink, 0.9);
      label(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.31, 100, won ? C.gold : C.red);
      label('SCORE ' + score, W / 2, H * 0.37, 58, C.white);
      label('PERFECT ' + perfects + '  GOOD ' + goods + '  MISS ' + misses, W / 2, H * 0.415, 34, C.teal);
      label(maxCombo + ' COMBO', W / 2, H * 0.455, 40, C.gold);
      label(darkOk + ' / ' + (DARK_B - DARK_A), W / 2, H * 0.495, 40, C.teal);
      if (won && score > prevBest) label('NEW RECORD', W / 2, H * 0.54, 50, C.gold);
      else label('BEST ' + Math.max(prevBest, won ? score : 0), W / 2, H * 0.54, 40, C.gold);
      if (!won) label('あと' + Math.max(1, 12 - Math.floor(beatN / BAR)) + '小節!', W / 2, H * 0.22, 56, C.red);
      if (Math.floor(t * 2) % 2 === 0) label('TAP TO CONTINUE', W / 2, H * 0.585, 36, C.white);
      return;
    }

    // ---- PLAYING ----
    if (over) {
      outroT -= dt;
      if (hitStop > 0) hitStop -= dt;
      if (outroT <= 0) {
        state = S.RESULT;
        var stats = { score: score, perfect: perfects, good: goods, miss: misses, maxCombo: maxCombo, darkBeats: darkOk };
        if (won) game.end.success(score, stats);
        else game.end.failure(stats);
      }
    } else if (readyT > 0) {
      readyT -= dt;
      if (readyT <= 0) startClock();
    } else {
      tickWorld(dt);
    }

    drawScene();
    drawHud();
    if (readyT > 0) label(readyT > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.34, 110, C.gold);
    if (over && won) label('FINISH', W / 2, H * 0.34, 100, C.gold);
  });

  game.onStart(function() {
    state = S.ATTRACT;
    initGame(true);
  });
})(game);
