// K-DS-0002v2-kamakura-candle-chant.js
// かまくらの手燭まわし — 三拍子で輪を巡る手燭。仲間が一人ずつ唱えて回し、自分に回ってきた拍でだけ唱えて灯を次の子へ渡す
// 操作: 画面のどこでも押すと唱える(押した瞬間で判定)。手燭が手前の自分の席に届く拍の頭で押す。眠っている子(Z)は飛ばされて灯が早く回り、灯の印が2つの子は2拍続けて持つ(下画面の拍の列にも順番が出る)。仲間の拍に押す・自分の拍を外す/押し漏らすとMISS
// 終わり: 11小節(三拍子・約18秒・自分の番8回)を回し切って MISS 2回以内ならCLEAR(判定の点+番ごとの連続ボーナス)。MISS 3回でGAME OVER
// @mechanic: turn_attack
// @theme: kamakura_candle_chant
// 世界観: 雪の夜のかまくらの中で、輪になった子どもたちが一人ずつ手燭を回し、三拍子の唱えごとを自分の番の拍でだけ唱えて灯を次の子へ渡していく
// 残るもの: 正誤(CLEAR/GAME OVER) + スコア・PERFECT/GOOD/MISS数・唱えられた番の数
// スタイル: 2000s HANDHELD PASTEL
var STYLE = { bg: ['#2e3266', '#8d95d6', '#eef1ff'], main: ['#ffd3e1', '#c6f1df', '#fff0b3'], accent: ['#ff6f9c', '#ffad42'] };

(function (game) {
  // 2000s HANDHELD PASTEL: 白縁の丸い形とパステル。上画面=かまくらの輪(遊び) / 下画面=拍と手番の列+自分の手元(情報と入力)に分ける
  var W = game.canvas.width;
  var H = game.canvas.height;
  var C = {
    night: STYLE.bg[0], lav: STYLE.bg[1], snow: STYLE.bg[2],
    pink: STYLE.main[0], mint: STYLE.main[1], butter: STYLE.main[2],
    rose: STYLE.accent[0], flame: STYLE.accent[1],
    white: '#ffffff', ink: '#3b3560', wall: '#dfe5ff', wall2: '#c3cbf2', mat: '#f4e2ad', matLine: '#e2c27f',
    grey: '#b4b2cf', shell: '#efe7ff', shell2: '#ddd2fb', hinge: '#c2bce0', peach: '#ffc9a3', padBg: '#ffe6ef'
  };

  var GAME_TITLE = 'CANDLE WALTZ';
  var BPM = 112;
  var SPB = 60 / BPM;
  var METER = 3;
  var TIME_LIMIT = 18;
  var PERFECT_W = 0.07;
  var GOOD_W = 0.15;
  var RUSH_W = 0.36;
  var MISS_MAX = 3;
  var HIT_STOP = 0.4;
  var INTRO = 3;                 // 最初の1小節は灯が真ん中の雪灯籠にある(カウント)
  // 1周 = 席1(左)→席2(奥)→席3(右)→席0(自分)。数字はその子が灯を持つ拍数(0=眠っていて飛ばされる / 2=2拍続けて唱える)
  var LAPS = [
    [1, 1, 1, 1],
    [1, 1, 1, 1],
    [2, 1, 1, 1],
    [1, 0, 1, 1],
    [1, 1, 2, 2],
    [0, 2, 1, 1],
    [1, 0, 0, 1],
    [1, 1]
  ];

  // ---- 手燭の巡りを拍の列に展開(拍クロックはこの列を1拍ずつ進むだけ) ----
  var TURNS = [], HOLD = [], ANG = [], P_BEATS = [], PIDX = {};
  var SONG_BEATS = 0;
  (function () {
    var b, i, j, n, prev = -1, ang = 0;
    for (b = 0; b < INTRO; b++) { HOLD.push(-1); ANG.push(null); }
    for (i = 0; i < LAPS.length; i++) {
      for (j = 0; j < LAPS[i].length; j++) {
        var seat = (j + 1) % 4, len = LAPS[i][j];
        TURNS.push({ seat: seat, start: b, len: len });
        for (n = 0; n < len; n++) {
          ang = prev < 0 ? 180 : ang + ((seat - prev + 4) % 4) * 90;
          prev = seat;
          HOLD.push(seat); ANG.push(ang);
          if (seat === 0) { PIDX[b] = P_BEATS.length; P_BEATS.push(b); }
          b++;
        }
      }
    }
    SONG_BEATS = b;              // この小節頭で全員が唱えて灯を雪灯籠へ戻す
  })();
  var TURNS_TOTAL = P_BEATS.length;

  // 伴奏(オリジナル)。ワルツのズン・チャッ・チャッ: 1拍目=低音、2・3拍目=和音の刻み
  var MEL = [
    [['D5', 1], ['F#5', 1], ['A5', 1]],
    [['B5', 2], ['A5', 1]],
    [['G5', 1], ['F#5', 1], ['E5', 1]],
    [['F#5', 2], ['D5', 1]],
    [['E5', 3]],
    [['D5', 1], ['E5', 1], ['F#5', 1]],
    [['G5', 2], ['B5', 1]],
    [['A5', 1], ['G5', 1], ['F#5', 1]],
    [['E5', 2], ['C#5', 1]],
    [['D5', 1], ['F#5', 1], ['E5', 1]],
    [['A4', 1], ['C#5', 1], ['E5', 1]],
    [['D5', 1.5], ['A5', 1.5]]
  ];
  var BASS = ['D3', 'G2', 'E3', 'D3', 'A2', 'D3', 'G2', 'D3', 'A2', 'D3', 'A2', 'D3'];
  var PAH = [['F#4', 'A4'], ['B3', 'D4'], ['G4', 'B4'], ['F#4', 'A4'], ['C#4', 'E4'], ['F#4', 'A4'], ['B3', 'D4'], ['F#4', 'A4'], ['C#4', 'G4'], ['F#4', 'A4'], ['C#4', 'E4'], ['F#4', 'A4']];
  var VOICE = ['A5', 'A4', 'D5', 'F#5'];   // 席ごとの唱えの高さ

  // ---- ドット絵 ----
  var KID = ['.....ww.....', '....hhhh....', '...hhhhhh...', '..hhhhhhhh..', '..wwwwwwww..', '..ffffffff..', '..fkffffkf..',
    '..frffffrf..', '...ffmmff...', '..cccccccc..', '.cccccccccc.', '.cccccccccc.', '.cccccccccc.', '..cc....cc..'];
  function variant(base, rows) { var o = base.slice(); for (var k in rows) o[+k] = rows[k]; return o; }
  var KID_CHANT = variant(KID, { 8: '...ffooff...', 10: 'ccccccccccc.' });
  var KID_SLEEP = variant(KID, { 6: '..fkkffkkf..', 8: '...ffffff...' });
  var BACK = ['.....ww.....', '....hhhh....', '...hhhhhh...', '..hhhhhhhh..', '..wwwwwwww..', '..bbbbbbbb..', '..bbbbbbbb..',
    '...bbbbbb...', '....ffff....', '..cccccccc..', '.cccccccccc.', '.cccccccccc.', '.cccccccccc.', '..cc....cc..'];
  var BACK_CHANT = variant(BACK, { 10: 'ccccccccccc.', 9: '.ccccccccc..' });
  var FACE = ['..hhhh..', '.hhhhhh.', 'wwwwwwww', 'ffffffff', 'fkffffkf', 'ffffffff', '.ffmmff.', '..ffff..'];
  var NOTE = ['..##.', '..#.#', '..#..', '..#..', '###..', '###..', '.#...'];
  var ZZ = ['#####', '...#.', '..#..', '.#...', '#####'];
  var MITTEN = ['.mmm....', 'mmmmm...', 'mmmmm.mm', 'mmmmmmmm', 'mmmmmmmm', '.mmmmmm.', '.wwwwww.', '.wwwwww.'];
  var KPAL = [
    { w: '#ffffff', h: '#ff8fb1', f: '#ffe1cc', k: C.ink, r: '#ffb3c6', m: '#e86a8a', o: C.ink, c: '#ffc4d6', b: '#6b4a3a' },
    { w: '#ffffff', h: '#5fcfae', f: '#ffe1cc', k: C.ink, r: '#ffb3c6', m: '#e86a8a', o: C.ink, c: '#c6f1df', b: '#6b4a3a' },
    { w: '#ffffff', h: '#a58cff', f: '#ffe1cc', k: C.ink, r: '#ffb3c6', m: '#e86a8a', o: C.ink, c: '#ddd2ff', b: '#6b4a3a' },
    { w: '#ffffff', h: '#ffb54d', f: '#ffe1cc', k: C.ink, r: '#ffb3c6', m: '#e86a8a', o: C.ink, c: '#ffe3b0', b: '#6b4a3a' }
  ];
  var MPAL = { m: '#ff8fb1', w: '#ffffff' };

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var armed = false;

  var demoMode, running, beatN, beatT, songT, nextBar, readyT, hitStop, smokeT, flareT, pressFx, lampT;
  var res, chantT, notes, score, combo, maxCombo, perfects, goods, misses, hits, over, won, outroT, prevBest, milestone, finaleT;

  function vol() { return demoMode ? 0.45 : 1; }
  function tone(f, d, o) { if (armed) game.audio.tone(f, d, o); }

  function initGame(isDemo) {
    demoMode = !!isDemo;
    running = false; beatN = 0; beatT = 0; songT = 0; nextBar = 0;
    readyT = isDemo ? 0 : 0.8;
    hitStop = 0; smokeT = 0; flareT = 0; pressFx = 0; lampT = 0;
    res = []; chantT = [0, 0, 0, 0]; notes = [];
    score = 0; combo = 0; maxCombo = 0; perfects = 0; goods = 0; misses = 0; hits = 0;
    over = false; won = false; outroT = 0; prevBest = game.best || 0; milestone = false; finaleT = 0;
    if (isDemo) startClock();
  }

  // ---- 拍クロック(1本だけ) ----
  function playBar(b) {
    if (!armed || b >= MEL.length) return;
    game.audio.melody(MEL[b], { tempo: BPM, wave: 'triangle', volume: 0.05 * vol(), bass: [[BASS[b], 1], ['R', 2]], bassWave: 'sine', bassVolume: 0.13 * vol() });
  }

  function startClock() {
    running = true; beatN = 0; beatT = 0; songT = 0; nextBar = 1;
    playBar(0);
    onBeat(0);
  }

  function onBeat(k) {
    if (k > SONG_BEATS) return;
    lampT = 1;
    var bar = Math.floor(k / METER), pos = k % METER;
    if (pos !== 0 && bar < PAH.length) {
      // チャッ・チャッ(和音の刻み)
      tone(PAH[bar][0], 0.07, { wave: 'square', volume: 0.025 * vol() });
      tone(PAH[bar][1], 0.07, { wave: 'square', volume: 0.025 * vol() });
    }
    if (k === SONG_BEATS) { finale(); return; }
    var h = HOLD[k];
    if (h > 0) aiChant(h);
    // 次の拍で自分に届く: 鈴の合図(1拍前)
    if (HOLD[k + 1] === 0 && h !== 0) tone(1568, 0.08, { wave: 'triangle', volume: 0.05 * vol() });
  }

  function aiChant(s) {
    chantT[s] = 0.32;
    var p = seatPt(s);
    notes.push({ x: p.x + 30, y: p.y - 90, t: 0.8, col: KPAL[s].h });
    tone(VOICE[s], 0.16, { wave: 'square', volume: 0.06 * vol(), slide: -40 });
  }

  function finale() {
    for (var s = 0; s < 4; s++) chantT[s] = 0.5;
    finaleT = 1.2;
    tone('D5', 0.4, { wave: 'triangle', volume: 0.08 * vol() });
    tone('F#5', 0.4, { wave: 'triangle', volume: 0.06 * vol() });
    tone('A5', 0.4, { wave: 'triangle', volume: 0.06 * vol() });
    game.fx.burst(540, 650, { color: C.flame, count: 26, speed: 380 });
    if (!demoMode) finish(misses < MISS_MAX);
  }

  function stepPlay(dt) {
    if (!running) return;
    beatT += dt;
    while (beatT >= SPB) { beatT -= SPB; beatN++; onBeat(beatN); if (!running) return; }
    songT = beatN * SPB + beatT;
    if (nextBar * METER <= SONG_BEATS && songT >= nextBar * METER * SPB - 0.06) { playBar(nextBar); nextBar++; }
    for (var i = 0; i < TURNS_TOTAL; i++) {
      if (!res[i] && songT > P_BEATS[i] * SPB + GOOD_W) { missTurn(i, 'late'); if (over) return; }
    }
  }

  // ---- 判定(押した瞬間 vs 自分の拍の頭) ----
  function chant() {
    if (!running || over) return;
    pressFx = 0.18;
    var best = -1, bd = 99;
    for (var i = 0; i < TURNS_TOTAL; i++) {
      var d = songT - P_BEATS[i] * SPB;
      if (Math.abs(d) < Math.abs(bd)) { bd = d; best = i; }
    }
    if (best >= 0 && !res[best] && Math.abs(bd) <= GOOD_W) { hitTurn(best, bd); return; }
    if (best >= 0 && res[best] && Math.abs(bd) <= RUSH_W) { tone(660, 0.03, { wave: 'triangle', volume: 0.03 }); return; }
    if (best >= 0 && !res[best] && Math.abs(bd) <= RUSH_W) { missTurn(best, bd < 0 ? 'rush' : 'late'); return; }
    missCommon('out');              // 仲間の番に唱えてしまった
  }

  function hitTurn(i, off) {
    var perfect = Math.abs(off) <= PERFECT_W;
    res[i] = perfect ? 'perfect' : 'good';
    hits++; combo++;
    if (combo > maxCombo) maxCombo = combo;
    chantT[0] = 0.32; flareT = 0.35;
    var p = seatPt(0);
    notes.push({ x: p.x + 40, y: p.y - 110, t: 0.9, col: C.rose });
    tone(VOICE[0], 0.2, { wave: 'square', volume: 0.08 * vol(), slide: -60 });
    if (perfect) {
      perfects++; score += 100 + Math.min(combo, 6) * 10;
      game.feedback.good(p.x, p.y - 170, { text: 'PERFECT', color: C.rose, size: 54, count: 12, volume: armed ? 0.22 : 0.001 });
    } else {
      goods++; score += 50;
      game.feedback.good(p.x, p.y - 170, { text: 'GOOD', color: C.lav, size: 48, count: 7, volume: armed ? 0.18 : 0.001 });
    }
    game.fx.burst(540, 1470, { color: C.flame, count: 10, speed: 260 });
    if (!demoMode && hits === 4 && !milestone) {
      milestone = true;
      game.audio.play('se_milestone', 0.45);
      game.fx.popup(hits + ' / ' + TURNS_TOTAL, W / 2, 400, { color: C.rose, size: 76 });
    }
  }

  function missTurn(i, why) {
    res[i] = 'miss';
    if (why === 'late') smokeT = 0.45;
    missCommon(why);
  }

  function missCommon(why) {
    misses++; combo = 0;
    hitStop = HIT_STOP;
    var p = seatPt(0);
    game.feedback.bad(p.x, p.y - 170, { text: 'MISS', shake: demoMode ? 4 : 10, volume: armed ? 0.5 : 0.001 });
    if (why === 'out') tone(185, 0.12, { wave: 'sawtooth', volume: 0.05 * vol() });
    if (!demoMode && misses >= MISS_MAX) finish(false);
  }

  function finish(ok) {
    if (over) return;
    over = true; won = ok; outroT = 1.5; running = false;
    game.audio.stopBgm();
    if (ok) {
      score += hits * 20;
      game.audio.play('se_success', 0.55);
      for (var i = 0; i < 4; i++) game.fx.burst(game.random(200, 880), game.random(420, 900), { color: i % 2 ? C.rose : C.flame, count: 22, speed: 420 });
      if (score > prevBest && prevBest > 0) game.fx.popup('NEW RECORD', W / 2, 420, { color: C.rose, size: 70 });
    } else {
      game.audio.play('se_failure', 0.5);
    }
  }

  // ---- 入力 ----
  game.onPress(function (x, y) {
    armed = true;
    if (state !== S.PLAYING || over) return;
    if (readyT > 0) { game.audio.play('se_tap', 0.2); return; }
    game.fx.burst(x, y, { color: C.white, count: 4, speed: 120 });
    chant();
  });
  game.onTap(function (x, y) {
    armed = true;
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(false); return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.3); state = S.ATTRACT; initGame(true); demo.t = 0; demo.i = 0; return; }
  });

  // ---- 位置 ----
  var RCX = 540, RCY = 700, RX = 330, RY = 205;
  function ringPt(angDeg, f) { var a = angDeg * Math.PI / 180; return { x: RCX + Math.cos(a) * RX * f, y: RCY + Math.sin(a) * RY * f }; }
  function seatPt(s) { return ringPt(90 + 90 * s, 1); }
  function ease(u) { return u * u * (3 - 2 * u); }

  function nextTurn(seat, B) {
    for (var i = 0; i < TURNS.length; i++) {
      var tr = TURNS[i];
      if (tr.seat !== seat) continue;
      if (tr.len > 0 ? tr.start + tr.len > B : tr.start > B) return tr;
    }
    return null;
  }

  // 灯は「拍の頭で次の席に届く」ように、前の拍の後ろ30%で移動する
  function lightPos() {
    if (!running && !over) return { x: RCX, y: RCY - 40, f: 0 };
    var k = Math.min(beatN, SONG_BEATS), u = running ? beatT / SPB : 1;
    var a0 = k < SONG_BEATS ? ANG[k] : null, a1 = k + 1 < SONG_BEATS ? ANG[k + 1] : null;
    var ang = a0 === null ? (a1 === null ? 90 : a1) : a0, f = a0 === null ? 0 : 0.55;
    if (u > 0.7 && a1 !== a0) {
      var m = ease((u - 0.7) / 0.3);
      if (a0 !== null && a1 !== null) { ang = a0 + (a1 - a0) * m; f = 0.55; }
      else if (a0 === null) { ang = a1; f = 0.55 * m; }
      else { ang = a0; f = 0.55 * (1 - m); }
    }
    if (f < 0.05) return { x: RCX, y: RCY - 40, f: f };
    var p = ringPt(ang, f);
    return { x: p.x, y: p.y - 30, f: f };
  }

  function timeToMine() {
    for (var i = 0; i < TURNS_TOTAL; i++) {
      if (res[i]) continue;
      var tl = P_BEATS[i] * SPB - songT;
      if (tl >= -GOOD_W) return tl;
    }
    return 99;
  }

  // ---- 描画 ----
  function label(str, x, y, sz, col, align) {
    var o = { size: sz, color: C.white, bold: true, align: align || 'center' };
    game.draw.text(str, x - 3, y, o); game.draw.text(str, x + 3, y, o);
    game.draw.text(str, x, y - 3, o); game.draw.text(str, x, y + 4, o);
    game.draw.text(str, x, y, { size: sz, color: col, bold: true, align: align || 'center' });
  }
  function rrect(x, y, w, h, r, col) {
    game.draw.rect(x + r, y, w - 2 * r, h, col);
    game.draw.rect(x, y + r, w, h - 2 * r, col);
    game.draw.circle(x + r, y + r, r, col); game.draw.circle(x + w - r, y + r, r, col);
    game.draw.circle(x + r, y + h - r, r, col); game.draw.circle(x + w - r, y + h - r, r, col);
  }
  function rimRect(x, y, w, h, r, col) { rrect(x - 6, y - 6, w + 12, h + 12, r + 6, C.white); rrect(x, y, w, h, r, col); }
  function blob(x, y, r, col, a) { game.draw.circle(x, y, r + 5, C.white, a); game.draw.circle(x, y, r, col, a); }
  function oval(x, y, rx, ry, col, a) { for (var i = -2; i <= 2; i++) game.draw.rect(x - rx * (1 - Math.abs(i) * 0.22), y + i * ry * 0.4 - ry * 0.2, rx * 2 * (1 - Math.abs(i) * 0.22), ry * 0.4, col, a); }

  function drawFlame(x, y, sz, t) {
    var fl = 1 + Math.sin(t * 23) * 0.08 + Math.sin(t * 37) * 0.05;
    game.draw.circle(x, y, 70 * sz, C.flame, 0.16);
    game.draw.circle(x, y, 38 * sz * fl, C.flame, 0.45);
    game.draw.circle(x, y + 4 * sz, 20 * sz * fl, C.butter);
    game.draw.circle(x, y + 8 * sz, 9 * sz, C.white);
  }

  function drawShell() {
    game.draw.gradient(0, H, [[0, C.shell], [0.5, '#f7e9f6'], [1, C.shell2]]);
  }

  function drawTop(t) {
    // 上画面の地: かまくらの雪壁(奥ほど影)
    game.draw.gradient(250, 1052, [[0, '#9aa5e0'], [0.4, C.wall2], [1, '#f6f2ff']]);
    game.draw.circle(540, 1160, 830, C.wall);
    game.draw.circle(540, 1160, 770, '#e9edff');
    // 入口(外は雪の夜)
    var ex = 250, ey = 500, er = 92;
    for (var y = ey - er; y < ey; y += 4) {
      var hw = Math.sqrt(Math.max(0, er * er - (ey - y) * (ey - y)));
      game.draw.rect(ex - hw, y, hw * 2, 4, C.night);
    }
    game.draw.rect(ex - er, ey, er * 2, 50, C.night);
    for (var f = 0; f < 14; f++) {
      var sx = ex - er + ((f * 53) % (er * 2));
      var sy = ey - er + ((t * (40 + f * 3) + f * 37) % (er + 50));
      var dx = sx - ex, dy = sy - ey;
      if (sy < ey && dx * dx + dy * dy > er * er) continue;
      game.draw.rect(sx, sy, 5, 5, C.white, 0.85);
    }
    game.draw.rect(ex - er, ey + 40, er * 2, 12, C.snow);
    // 敷き藁のござ(楕円)
    for (var my = 455; my < 985; my += 6) {
      var u = (my + 3 - 720) / 265;
      var w2 = 460 * Math.sqrt(Math.max(0, 1 - u * u));
      game.draw.rect(540 - w2, my, w2 * 2, 6, Math.floor(my / 12) % 2 ? C.mat : '#f0d898');
    }
    // 灯の暖かい照り返し
    var lp = lightPos();
    game.draw.circle(lp.x, lp.y + 40, 260, C.flame, 0.08);
  }

  function drawLantern(t, lit) {
    var x = RCX, y = RCY - 10;
    oval(x, y + 52, 70, 20, C.wall2, 0.8);
    blob(x, y + 30, 40, C.white);
    rimRect(x - 38, y - 40, 76, 56, 12, C.snow);
    game.draw.rect(x - 18, y - 28, 36, 28, lit ? C.butter : C.wall2);
    if (lit) game.draw.circle(x, y - 14, 40, C.flame, 0.3 + Math.sin(t * 9) * 0.05);
    rimRect(x - 62, y - 70, 124, 28, 14, C.white);
  }

  function drawKid(s, t) {
    var p = seatPt(s);
    var px = s === 2 ? 8 : (s === 0 ? 12 : 10);
    var B = running ? beatN + beatT / SPB : 0;
    var tr = nextTurn(s, B);
    var asleep = !!(tr && tr.len === 0);
    var hop = chantT[s] > 0 ? Math.sin(Math.min(1, chantT[s] / 0.32) * Math.PI) * 16 : 0;
    var bob = asleep ? Math.sin(t * 1.5 + s) * 2 : Math.sin(t * 2.6 + s * 1.3) * 4;
    var y = p.y - hop + bob;
    oval(p.x, p.y + 7 * px - 4, 6 * px, 12, '#b9a979', 0.45);
    if (s === 0) {
      var shock = hitStop > 0;
      var sx = shock ? Math.sin(t * 70) * 6 : 0;
      if (shock) game.draw.circle(p.x, y, 120 * (1.1 - hitStop / HIT_STOP * 0.3), C.white, 0.65 * hitStop / HIT_STOP);
      game.draw.sprite(chantT[0] > 0 ? BACK_CHANT : BACK, KPAL[0], p.x + sx, y, shock ? px * 1.2 : px, { anchor: 'center' });
    } else {
      game.draw.sprite(asleep ? KID_SLEEP : (chantT[s] > 0 ? KID_CHANT : KID), KPAL[s], p.x, y, px, { anchor: 'center' });
    }
    var top = y - 7 * px - 26;
    if (asleep) {
      for (var z = 0; z < 2; z++) {
        var ph = (t * 0.8 + z * 0.5) % 1;
        game.draw.sprite(ZZ, { '#': C.lav }, p.x + 30 + ph * 30, top - ph * 60, 5 + z * 2, { anchor: 'center', alpha: 1 - ph });
      }
    } else if (tr && tr.len === 2) {
      var left = tr.start + 2 - B;
      blob(p.x - 20, top, 11, left > 1 ? C.flame : C.grey);
      blob(p.x + 20, top, 11, C.flame);
    }
  }

  function drawLight(t) {
    var lp = lightPos();
    if (lp.f < 0.05) return;
    var x = lp.x, y = lp.y;
    rimRect(x - 26, y + 26, 52, 12, 6, C.peach);
    game.draw.rect(x - 9, y - 4, 18, 32, C.white);
    if (smokeT > 0 && running && HOLD[beatN] === 0) {
      for (var i = 0; i < 3; i++) game.draw.circle(x + Math.sin(t * 5 + i) * 10, y - 20 - i * 22 - (0.45 - smokeT) * 60, 12 + i * 5, C.grey, 0.5);
    } else {
      drawFlame(x, y - 16, 0.55, t);
    }
  }

  function drawNotes() {
    for (var i = 0; i < notes.length; i++) {
      var n = notes[i];
      game.draw.sprite(NOTE, { '#': n.col }, n.x, n.y, 8, { anchor: 'center', alpha: Math.min(1, n.t * 2) });
    }
  }
  function stepNotes(dt) {
    for (var i = notes.length - 1; i >= 0; i--) {
      notes[i].t -= dt; notes[i].y -= 90 * dt; notes[i].x += Math.sin(notes[i].t * 8) * 1.5;
      if (notes[i].t <= 0) notes.splice(i, 1);
    }
  }

  function drawStaff(t) {
    // 下画面の上段: 2小節ぶんの拍の列。どの子が唱えるかを顔で並べる(三拍子の区切り)
    var B = running ? beatN : 0;
    var bar = Math.floor(Math.min(B, SONG_BEATS) / METER);
    rimRect(56, 1140, 968, 230, 26, '#fff9fc');
    game.draw.rect(536, 1156, 8, 198, C.pink);
    for (var i = 0; i < 6; i++) {
      var kb = bar * METER + i;
      var x = 81 + i * 150 + (i >= 3 ? 40 : 0), y = 1160;
      var cur = running && kb === beatN;
      var hold = kb < SONG_BEATS ? HOLD[kb] : (kb === SONG_BEATS ? -1 : -2);
      var cellCol = hold === 0 ? C.pink : (hold > 0 ? KPAL[hold].c : (hold === -1 ? C.butter : '#f1eef8'));
      var grow = cur ? 6 + lampT * 6 : 0;
      if (cur) rrect(x - 8 - grow, y - 8 - grow, 144 + grow * 2, 144 + grow * 2, 26, C.rose);
      rrect(x - grow * 0.4, y - grow * 0.4, 128 + grow * 0.8, 128 + grow * 0.8, 20, cellCol);
      if (hold > 0) game.draw.sprite(FACE, KPAL[hold], x + 64, y + 64, 11, { anchor: 'center' });
      else if (hold === 0) {
        game.draw.rect(x + 54, y + 58, 20, 44, C.white);
        rrect(x + 36, y + 98, 56, 14, 7, C.peach);
        game.draw.circle(x + 64, y + 42, 15, C.flame);
        game.draw.circle(x + 64, y + 46, 7, C.butter);
        if (PIDX[kb] !== undefined && res[PIDX[kb]]) blob(x + 110, y + 18, 14, res[PIDX[kb]] === 'miss' ? C.grey : C.mint);
      } else if (hold === -1) {
        rrect(x + 34, y + 40, 60, 54, 10, C.white);
        game.draw.circle(x + 64, y + 66, 14, C.flame);
      }
      if (running && kb < beatN) rrect(x, y, 128, 128, 20, C.shell);
      if (running && kb < beatN) { if (hold > 0) game.draw.sprite(FACE, KPAL[hold], x + 64, y + 64, 7, { anchor: 'center', alpha: 0.5 }); }
      // 三拍子のランプ(1拍目は大きい)
      var lr = i % 3 === 0 ? 15 : 10;
      blob(x + 64, 1336, lr, cur ? C.flame : C.grey);
    }
  }

  function drawHands(t) {
    var cx = 540, cy = 1600;
    var mine = running && beatN < SONG_BEATS && HOLD[beatN] === 0;
    var sh = hitStop > 0 ? Math.sin(t * 60) * 10 : 0;
    var tl = running ? timeToMine() : 99;
    blob(cx, cy + 10, 250, C.padBg);
    if (tl > 0 && tl < SPB) {
      // 自分に届くまでの残り(縮む輪 = 拍の頭で閉じる)
      var rr = 60 + 190 * (tl / SPB);
      for (var s = 0; s < 20; s++) {
        var an = s / 20 * Math.PI * 2 + t;
        game.draw.circle(cx + Math.cos(an) * rr, cy - 150 + Math.sin(an) * rr * 0.8, 8, C.rose, 0.85);
      }
    }
    if (pressFx > 0) game.draw.circle(cx, cy - 40, 260 - pressFx * 400, C.white, pressFx * 2);
    rimRect(cx - 160 + sh, cy + 40, 320, 40, 20, C.peach);
    blob(cx + 190 + sh, cy + 60, 30, C.peach);
    game.draw.circle(cx + 190 + sh, cy + 60, 14, C.padBg);
    rimRect(cx - 40 + sh, cy - 120, 80, 160, 20, C.white);
    game.draw.rect(cx + 16 + sh, cy - 108, 14, 140, '#ece8f8');
    game.draw.rect(cx - 3 + sh, cy - 146, 6, 28, C.ink);
    if (hitStop > 0) game.draw.circle(cx, cy - 60, 150, C.white, 0.6 * hitStop / HIT_STOP);
    if (smokeT > 0) {
      for (var i = 0; i < 4; i++) game.draw.circle(cx + Math.sin(t * 4 + i) * 16, cy - 180 - i * 40 - (0.45 - smokeT) * 80, 22 + i * 8, C.grey, 0.5);
    } else if (mine || flareT > 0) {
      drawFlame(cx + sh, cy - 175, flareT > 0 ? 1.5 : 1.05, t);
    } else if (tl > 0 && tl < SPB) {
      game.draw.circle(cx, cy - 150, 10 + Math.sin(t * 30) * 4, C.butter, 0.9);
    }
    game.draw.sprite(MITTEN, MPAL, cx - 210 + sh, cy + 100, 14, { anchor: 'center' });
    game.draw.sprite(MITTEN, MPAL, cx + 210 + sh, cy + 100, 14, { anchor: 'center', flipX: true });
  }

  function drawScene(t) {
    drawShell();
    drawTop(t);
    drawKid(2, t);
    drawLantern(t, (!running && !over) || HOLD[Math.min(beatN, SONG_BEATS)] === -1 || beatN >= SONG_BEATS || finaleT > 0);
    drawKid(1, t);
    drawKid(3, t);
    drawKid(0, t);
    drawLight(t);
    drawNotes();
    // 上画面の外枠(白縁)と筐体
    game.draw.rect(0, 236, 34, 830, C.shell);
    game.draw.rect(W - 34, 236, 34, 830, C.shell);
    game.draw.rect(34, 244, 8, 814, C.white);
    game.draw.rect(W - 42, 244, 8, 814, C.white);
    game.draw.rect(0, 1052, W, 74, C.shell);
    game.draw.rect(34, 1050, W - 68, 8, C.white);
    rrect(150, 1070, 150, 34, 17, C.hinge);
    rrect(W - 300, 1070, 150, 34, 17, C.hinge);
    // 下画面
    rimRect(40, 1126, 1000, 770, 30, '#fff2f7');
    drawStaff(t);
    drawHands(t);
    for (var s = 1134; s < 1890; s += 8) game.draw.rect(40, s, 1000, 1, C.white, 0.18);
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 236, C.shell);
    game.draw.rect(0, 228, W, 8, C.white);
    label('SCORE ' + score, 60, 96, 50, C.rose, 'left');
    label('BEST ' + prevBest, 60, 168, 32, C.lav, 'left');
    label(hits + ' / ' + TURNS_TOTAL, W - 60, 96, 54, C.ink, 'right');
    for (var m = 0; m < MISS_MAX; m++) blob(W - 210 + m * 66, 160, 20, m < misses ? C.rose : C.grey);
    var progress = Math.min(1, songT / (SONG_BEATS * SPB));
    game.draw.rect(0, 228, W * progress, 8, C.mint);
  }

  // ---- ATTRACT: 実ロジックで2回は拍どおりに唱える → 仲間の拍に唱えてMISS → 自分の拍で唱え直す ----
  var DEMO_TAPS = [[6, 0], [10, 0.09], [14, 0], [15, -0.02]];
  var DEMO_BEATS = 17;
  var demo = { t: 0, i: 0, pressT: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % (DEMO_BEATS * SPB);
    if (cyc < dt || demo.t <= dt) { initGame(true); demo.i = 0; }
    stepPlay(dt);
    if (demo.i < DEMO_TAPS.length && songT >= DEMO_TAPS[demo.i][0] * SPB + DEMO_TAPS[demo.i][1]) {
      demo.i++; demo.pressT = 0.18; chant();
    }
    if (demo.pressT > 0) demo.pressT -= dt;
  }

  game.onUpdate(function (dt) {
    var t = game.time.elapsed;
    if (hitStop > 0) hitStop -= dt;
    if (smokeT > 0) smokeT -= dt;
    if (flareT > 0) flareT -= dt;
    if (pressFx > 0) pressFx -= dt;
    if (lampT > 0) lampT -= dt * 4;
    if (finaleT > 0) finaleT -= dt;
    for (var i = 0; i < 4; i++) if (chantT[i] > 0) chantT[i] -= dt;
    stepNotes(dt);

    if (state === S.ATTRACT) {
      stepDemo(dt);
      drawScene(t);
      var near = demo.pressT > 0;
      game.draw.hand(560, near ? 1470 : 1420 + Math.sin(t * 3) * 14, { press: near, scale: 15 });
      game.draw.rect(0, 0, W, 236, C.shell);
      game.draw.rect(0, 228, W, 8, C.white);
      label(GAME_TITLE, W / 2, 112, 84 + Math.sin(t * 3) * 3, C.rose);
      label('HI-SCORE ' + (game.best > 0 ? game.best : 0), W / 2, 192, 34, C.lav);
      if (Math.floor(t * 2) % 2 === 0) label('► 100円 投入 ◄', W / 2, H * 0.965, 44, C.rose);
      else label('TAP TO START', W / 2, H * 0.965, 42, C.ink);
      return;
    }

    if (state === S.RESULT) {
      drawScene(t);
      drawHud();
      rimRect(110, H * 0.17, W - 220, H * 0.33, 40, '#fff7fb');
      label(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.23, 96, won ? C.rose : C.lav);
      label('SCORE ' + score, W / 2, H * 0.29, 60, C.ink);
      label('PERFECT ' + perfects + '  GOOD ' + goods + '  MISS ' + misses, W / 2, H * 0.335, 34, C.lav);
      if (won && score > prevBest) label('NEW RECORD', W / 2, H * 0.385, 54, C.rose);
      else label('BEST ' + Math.max(prevBest, won ? score : 0), W / 2, H * 0.385, 42, C.ink);
      if (!won) label('あと' + Math.max(1, TURNS_TOTAL - hits) + '回!', W / 2, H * 0.44, 52, C.rose);
      if (Math.floor(t * 2) % 2 === 0) label('TAP TO CONTINUE', W / 2, H * 0.965, 40, C.ink);
      return;
    }

    // ---- PLAYING ----
    if (over) {
      outroT -= dt;
      if (outroT <= 0) {
        state = S.RESULT;
        var stats = { score: score, turns: hits, total: TURNS_TOTAL, perfect: perfects, good: goods, miss: misses, maxCombo: maxCombo };
        if (won) game.end.success(score, stats);
        else game.end.failure(stats);
      }
    } else if (readyT > 0) {
      readyT -= dt;
      if (readyT <= 0) startClock();
    } else {
      stepPlay(dt);
      if (!over && songT > TIME_LIMIT) finish(misses < MISS_MAX);
    }

    drawScene(t);
    drawHud();
    if (readyT > 0) label(readyT > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.4, 110, C.rose);
    if (over && won) label('FINISH', W / 2, H * 0.4, 100, C.rose);
  });

  game.onStart(function () {
    state = S.ATTRACT;
    initGame(true);
  });
})(game);
