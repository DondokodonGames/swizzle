// K-DS-0023v2-deepsea-tag-scanner.js
// 深海の標識読み取り — 1拍ごとに左・中・右・中と往復する読み取り枠が、拍の頭で標識付きの深海魚に重なった瞬間だけタップして記録する
// 操作: 画面のどこでもタップ(下の記録ボタンが反応)。読み取り枠は拍の頭ちょうどに左→中→右→中の位置へ来る。標識が点滅して待っている魚の位置に枠が来る拍の頭でタップ(ずれでPERFECT/GOOD)。標識のない魚・何もない所・ずれすぎはMISS、読み逃して魚が去ってもMISS
// 終わり: 7小節(28拍・14秒)を乗り切ればCLEAR(判定点+コンボ+残りライフ)。MISS 3回でGAME OVER
// @mechanic: timing_window
// @theme: deep_sea_tag_scanner
// 世界観: 深海探査艇の操縦席で、探査員が左右に往復する読み取り枠に、のぞき窓の外で待つ深海魚の標識を拍の頭で捉えて記録していく
// 残るもの: 正誤(CLEAR/GAME OVER) + スコア・読み取った標識の数・PERFECT/GOOD/MISS数・最大コンボ
// スタイル: NEO-RETRO

(function(game) {
  var STYLE = { bg: ['#0a1030', '#16406a'], main: ['#2f8f8a', '#bfeedd', '#1b2348'], accent: ['#ff6a1a', '#fff4e0'] };
  var W = game.canvas.width;
  var H = game.canvas.height;

  // NEO-RETRO: 先に決めた5色だけで描く。大きいドット(12〜16px)。差し色は読み取り枠と標識の橙1色だけ
  var C = {
    deep: STYLE.bg[0], sea: STYLE.bg[1], teal: STYLE.main[0], mint: STYLE.main[1], hull: STYLE.main[2],
    orange: STYLE.accent[0], cream: STYLE.accent[1]
  };
  var DOT = 12;

  var GAME_TITLE = 'TAG SCAN';
  var BPM = 120, SPB = 60 / BPM, BEATS = 28;
  var TIME_LIMIT = 14;                 // 7小節 × 4拍 × 0.5秒
  var READY_T = 0.8;
  var PERFECT_W = 0.05, GOOD_W = 0.12;
  var LIVES = 3;
  var SEQ = [0, 1, 2, 1];              // 拍の頭で枠が来る位置(左・中・右・中)
  var COL_X = [280, 540, 800];
  var FY = 790;                        // 枠と魚の高さ
  var FRAME_HALF = 74;
  // 標識付きの魚が待つ拍(位置は SEQ で決まる)と、標識のない魚が枠の通り道に浮かぶ拍
  var TAGS = [2, 4, 6, 8, 10, 11, 13, 14, 16, 18, 19, 20, 22, 24, 25, 26];
  var DECOYS = [9, 12, 15, 21];
  var DEMO_TAGS = [2, 4, 5], DEMO_DECOYS = [3];
  var DEMO_BEATS = 7;
  var DEMO_CYCLE = DEMO_BEATS * SPB + 1.0;
  var ARRIVE = 1.6, BLINK = 1.4;       // 何拍前に現れるか / 標識が点滅し始める拍(0.7秒前)

  // 伴奏(オリジナル): 低いベースを拍ごと、8分の分散和音、小節頭にソナーの音
  var BASS = ['A2', 'A2', 'A2', 'A2', 'F2', 'F2', 'G2', 'G2', 'A2', 'A2', 'C3', 'C3', 'D3', 'D3', 'E3', 'E3'];
  var ARP = [['A3', 'C4', 'E4', 'C4'], ['F3', 'A3', 'C4', 'A3'], ['G3', 'B3', 'D4', 'B3'], ['A3', 'C4', 'E4', 'A4']];

  // ── スプライト(大きいドット) ─────────────────────────
  var LANT = [
    ['...tttttt...', '.tttttttttt.', 'tmktttttttt.', 'tttttttttttt', '.tmmttttttt.', '...tttttt...'],
    ['...tttttt...', '.tttttttttt.', 'tmktttttttt.', 'ttttttttttt.', '.tmmttttttt.', '...tttttt...']
  ];
  var ANGL = [
    ['..c.........', '...c........', '..tttttt....', '.tmkttttt..t', 'tttttttttttt', 'tmmmtttttt.t', '.tttttttt...'],
    ['..c.........', '...c........', '..tttttt....', '.tmkttttt...', 'ttttttttttt.', 'tmmmtttttttt', '.tttttttt...']
  ];
  var PAL_T = { t: C.teal, k: C.deep, m: C.mint, c: C.cream };
  var PAL_W = { t: C.cream, k: C.cream, m: C.cream, c: C.cream };
  // 探査員(後ろ姿)。フード付きの作業着にヘッドセット
  var PILOT = [
    '....hhhhhh....', '...hhhhhhhh...', '..mhhhhhhhhm..', '.mmhhhhhhhhmm.', '.mmhhhhhhhhmm.', '..mhhhhhhhhm..',
    '....hhhhhh....', '...ssssssss...', '.ssssssssssss.', 'ssssssssssssss', 'ssssssssssssss', 'ssssssssssssss'
  ];
  var PILOT_PAL = { h: C.cream, m: C.orange, s: C.teal };

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var R = null;
  var demo = { t: 0, cyc: 0, ti: 0, plan: [], press: 0 };
  var SNOW = [];
  for (var sn = 0; sn < 26; sn++) SNOW.push({ x: (sn * 137) % 940 + 70, y: (sn * 211) % 780 + 400, v: 14 + (sn % 5) * 6 });

  function txt(str, x, y, sz, col, align) {
    game.draw.text(str, x + 4, y + 4, { size: sz, color: C.deep, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: col, bold: true, align: align || 'center' });
  }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function colAt(b) { return SEQ[((b % 4) + 4) % 4]; }
  function frameX(clock) {
    var b = clock / SPB, f = Math.floor(b), u = b - f;
    var a = COL_X[colAt(f)], c = COL_X[colAt(f + 1)];
    return a + (c - a) * u;
  }

  // ── 進行 ───────────────────────────────────────────────
  function newRun(isDemo) {
    var tags = isDemo ? DEMO_TAGS : TAGS, decs = isDemo ? DEMO_DECOYS : DECOYS;
    var fish = [], i;
    for (i = 0; i < tags.length; i++) fish.push({ t: tags[i], col: colAt(tags[i]), tag: true, st: 'wait', kind: i % 3 === 2 ? 1 : 0, from: i % 2 === 0 ? -1 : 1, outT: 0 });
    for (i = 0; i < decs.length; i++) fish.push({ t: decs[i], col: colAt(decs[i]), tag: false, st: 'wait', kind: 1 - (i % 2), from: i % 2 === 0 ? 1 : -1, outT: 0 });
    return {
      demo: isDemo, fish: fish, beats: isDemo ? DEMO_BEATS : BEATS, total: tags.length,
      clock: isDemo ? -0.3 : -READY_T, beatIdx: isDemo ? -1 : -2, eIdx: isDemo ? -1 : -4,
      lives: LIVES, score: 0, combo: 0, maxCombo: 0, perfect: 0, good: 0, miss: 0, read: 0,
      stop: 0, stopFish: null, flash: 0, press: 0, pulse: 0, ping: 0,
      over: false, ok: false, endWait: 0, prevBest: game.best
    };
  }

  function initGame() {
    R = newRun(state !== S.PLAYING);
    game.audio.stopBgm();
    if (state === S.PLAYING) game.audio.melody([['A4', 0.5], ['E5', 0.5], ['A5', 1]], { tempo: BPM * 2, wave: 'triangle', volume: 0.06 });
  }

  function onEighth(i8) {
    var b = Math.floor(i8 / 2), odd = i8 % 2 === 1;
    var v = R.demo ? 0.35 : 1;
    if (i8 < 0) {
      if (!odd && !R.demo) game.audio.tone(b === -1 ? 'A5' : 'E5', 0.07, { wave: 'square', volume: 0.07 });
      return;
    }
    if (b >= R.beats) return;
    var bar = Math.floor(b / 4);
    var arp = ARP[bar % 4];
    game.audio.tone(arp[(i8 % 4)], SPB * 0.4, { wave: 'square', volume: 0.025 * v });
    if (!odd) {
      R.pulse = 1;
      game.audio.tone(BASS[(b >> 1) % BASS.length], SPB * 0.9, { wave: 'triangle', volume: 0.12 * v });
      if (b % 4 === 0) { R.ping = 1; game.audio.tone('E6', 0.25, { wave: 'sine', volume: 0.05 * v, slide: -400 }); }
      // 標識が待っている拍の1拍前: 短い予告音
      for (var i = 0; i < R.fish.length; i++) {
        var f = R.fish[i];
        if (f.tag && f.st === 'wait' && f.t === b + 1 && !R.demo) game.audio.tone('B5', 0.05, { wave: 'triangle', volume: 0.05 });
      }
    }
  }

  // 読み取る(本番の指も ATTRACT のゴーストも同じ関数)
  function scan() {
    if (!R || R.over || R.stop > 0 || R.clock < -0.05) return 'locked';
    R.press = 0.16;
    var best = null, bd = 1e9;
    for (var i = 0; i < R.fish.length; i++) {
      var f = R.fish[i];
      if (!f.tag || f.st !== 'wait') continue;
      var d = R.clock - f.t * SPB;
      if (Math.abs(d) < Math.abs(bd)) { bd = d; best = f; }
    }
    if (best && Math.abs(bd) <= GOOD_W) { readFish(best, Math.abs(bd) <= PERFECT_W ? 'PERFECT' : 'GOOD'); return 'hit'; }
    // 標識のない魚 / 何もない所 / ずれすぎ
    var fx = frameX(R.clock), hitDecoy = null;
    for (var k = 0; k < R.fish.length; k++) {
      var g = R.fish[k];
      if (!g.tag && Math.abs(R.clock - g.t * SPB) < SPB * 0.6) hitDecoy = g;
    }
    missAt(hitDecoy, hitDecoy ? COL_X[hitDecoy.col] : fx);
    return 'miss';
  }

  function readFish(f, grade) {
    f.st = 'read'; f.outT = 0;
    R.read++; R.combo++;
    if (R.combo > R.maxCombo) R.maxCombo = R.combo;
    if (grade === 'PERFECT') { R.perfect++; R.score += 100 + Math.min(10, R.combo) * 10; }
    else { R.good++; R.score += 50 + Math.min(10, R.combo) * 5; }
    var x = COL_X[f.col];
    game.feedback.good(x, FY - 150, { text: grade, color: grade === 'PERFECT' ? C.orange : C.mint, size: grade === 'PERFECT' ? 52 : 42, count: grade === 'PERFECT' ? 14 : 8, volume: R.demo ? 0.04 : 0.45 });
    game.fx.burst(x, FY, { color: C.cream, count: 8, speed: 240 });
    if (!R.demo) {
      game.audio.tone(grade === 'PERFECT' ? 'A6' : 'E6', 0.08, { wave: 'square', volume: 0.05 });
      if (R.combo % 5 === 0) {
        game.fx.popup(R.combo + ' COMBO', W / 2, 470, { color: C.orange, size: 70 });
        game.audio.play('se_milestone', 0.5);
      }
    }
  }

  function missAt(f, x) {
    R.combo = 0; R.miss++; R.lives--;
    R.stop = 0.4; R.flash = 0.4; R.stopFish = f; R.stopX = x;
    if (f && !f.tag) f.st = 'poked';
    if (!R.demo) game.audio.tone(130, 0.25, { wave: 'sawtooth', volume: 0.1, slide: -50 });
  }

  function releaseStop() {
    game.feedback.bad(R.stopX, FY - 150, { text: 'MISS', shake: R.demo ? 3 : 10, volume: R.demo ? 0.03 : 0.6 });
    R.stopFish = null;
    if (R.lives <= 0 && !R.demo) endRun(false);
  }

  function endRun(ok) {
    if (R.over) return;
    R.over = true; R.ok = ok; R.endWait = 1.8;
    if (ok) R.score += R.lives * 100;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    if (ok) for (var i = 0; i < 3; i++) game.fx.burst(COL_X[i], FY, { color: i === 1 ? C.orange : C.mint, count: 22, speed: 420 });
    if (R.score > R.prevBest && R.prevBest > 0) {
      game.fx.popup('NEW RECORD', W / 2, 520, { color: C.orange, size: 76 });
      game.audio.play('se_milestone', 0.5);
    }
  }

  function stepRun(dt) {
    R.pulse = Math.max(0, R.pulse - dt * 4);
    R.ping = Math.max(0, R.ping - dt * 1.4);
    R.flash = Math.max(0, R.flash - dt);
    R.press = Math.max(0, R.press - dt);
    for (var j = 0; j < R.fish.length; j++) if (R.fish[j].st !== 'wait') R.fish[j].outT += dt;
    if (R.over) return;
    if (R.stop > 0) {
      R.stop -= dt;
      if (R.stop <= 0) releaseStop();
      return;
    }
    var was = R.clock;
    R.clock += dt;
    if (!R.demo && was < -0.35 && R.clock >= -0.35) game.audio.play('se_tap', 0.4);
    var i8 = Math.floor(R.clock / (SPB / 2));
    while (R.eIdx < i8) { R.eIdx++; onEighth(R.eIdx); }
    for (var i = 0; i < R.fish.length; i++) {
      var f = R.fish[i];
      if (f.st !== 'wait') continue;
      if (f.tag && R.clock > f.t * SPB + GOOD_W) { f.st = 'gone'; f.outT = 0; missAt(f, COL_X[f.col]); return; }
      if (!f.tag && R.clock > f.t * SPB + SPB * 0.7) { f.st = 'gone'; f.outT = 0; }
    }
    if (!R.demo && (R.clock >= R.beats * SPB + 0.1 || R.clock > TIME_LIMIT + 0.5)) endRun(R.lives > 0);
  }

  // ATTRACT: 実ロジックをゴーストが遊ぶ。2・4・5拍目の標識を読む。偶数周は途中で標識のない魚(3拍目)にも押してしまいMISS
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % DEMO_CYCLE;
    if (cyc < dt || demo.t <= dt) {
      R = newRun(true); demo.cyc++; demo.ti = 0;
      demo.plan = demo.cyc % 2 === 1 ? [2, 4, 5] : [2, 3, 4, 5];
    }
    stepRun(dt);
    if (demo.ti < demo.plan.length && R.stop <= 0 && R.clock >= demo.plan[demo.ti] * SPB - 0.004) {
      scan(); demo.ti++; demo.press = 0.15;
    }
    demo.press = Math.max(0, demo.press - dt);
  }

  // ── 描画 ───────────────────────────────────────────────
  var VX0 = 70, VX1 = 1010, VY0 = 400, VY1 = 1180;
  function drawSea() {
    var e = game.time.elapsed;
    game.draw.gradient(VY0, VY1, [[0, C.sea], [1, C.deep]]);
    // 遠くの岩棚(大きいドット)
    for (var x = VX0; x < VX1; x += DOT * 2) {
      var hgt = 3 + Math.round(2 * Math.sin(x * 0.013) + Math.sin(x * 0.041));
      game.draw.rect(x, VY1 - hgt * DOT * 2, DOT * 2, hgt * DOT * 2, C.hull);
    }
    // マリンスノー
    for (var i = 0; i < SNOW.length; i++) {
      var s = SNOW[i];
      var y = VY0 + ((s.y - VY0 + e * s.v) % (VY1 - VY0));
      game.draw.rect(s.x + Math.sin(e + i) * 10, y, DOT / 2, DOT / 2, C.mint, 0.35);
    }
    // ソナーの輪(小節頭)
    if (R.ping > 0) {
      var rr = (1 - R.ping) * 520;
      for (var a = 0; a < 24; a++) {
        var ang = a / 24 * Math.PI * 2;
        game.draw.rect(540 + Math.cos(ang) * rr - 6, FY + Math.sin(ang) * rr * 0.7 - 6, 12, 12, C.teal, R.ping * 0.6);
      }
    }
    // 読み取り位置の目印(3か所)
    for (var c = 0; c < 3; c++) {
      game.draw.rect(COL_X[c] - 6, VY0 + 24, 12, 24, C.teal);
      game.draw.rect(COL_X[c] - 6, VY1 - 48, 12, 24, C.teal);
    }
  }

  function fishPos(f) {
    var b = R.clock / SPB;
    var x = COL_X[f.col], y = FY + Math.sin(game.time.elapsed * 2 + f.t) * 10;
    var arrive = f.t - ARRIVE;
    if (b < arrive + 0.8) {
      var u = clamp((b - arrive) / 0.8, 0, 1);
      var sx = f.from < 0 ? VX0 - 160 : VX1 + 160;
      x = sx + (x - sx) * (1 - (1 - u) * (1 - u));
    }
    if (f.st !== 'wait' && f.st !== 'poked') {
      var o = f.outT;
      if (f.st === 'read') { y -= o * o * 900; x += f.from * o * 120; }
      else { x += -f.from * o * 1100; }
    }
    if (f.st === 'poked') x += -f.from * f.outT * 900;
    return { x: x, y: y };
  }

  function drawFish() {
    var e = game.time.elapsed;
    var b = R.clock / SPB;
    for (var i = 0; i < R.fish.length; i++) {
      var f = R.fish[i];
      if (b < f.t - ARRIVE) continue;
      if (f.st !== 'wait' && f.outT > 1.2) continue;
      var p = fishPos(f);
      var frames = f.kind === 1 ? ANGL : LANT;
      var fr = frames[Math.floor(e * 4 + i) % 2];
      var stopHere = R.stop > 0 && R.stopFish === f;
      var pal = stopHere ? PAL_W : PAL_T;
      var px = stopHere ? DOT + 3 : DOT;
      game.draw.sprite(fr, pal, p.x, p.y, px, { anchor: 'center', flipX: f.from < 0 });
      if (f.tag && f.st === 'wait') {
        // 標識(背びれの橙の札)。0.7秒前から点滅し、拍の頭で一番明るい
        var due = f.t - b;
        var on = due > BLINK ? true : Math.floor(e * 12) % 2 === 0 || due < 0.3;
        var tx = p.x + (f.from > 0 ? 14 : -14), ty = p.y - 54;
        game.draw.rect(tx - 4, ty + 18, 8, 16, C.cream);
        if (on) game.draw.rect(tx - 18, ty - 12, 36, 32, C.orange);
        else game.draw.rect(tx - 18, ty - 12, 36, 32, C.hull);
        game.draw.rect(tx - 8, ty - 4, 16, 8, C.cream);
        if (due < BLINK && due > -0.2) game.draw.rect(tx - 30, ty - 24, 60, 56, C.orange, 0.25);
      }
      if (f.st === 'read' && f.outT < 0.5) game.draw.rect(p.x - 70, p.y - 70, 140, 140, C.cream, 0.4 * (1 - f.outT * 2));
    }
  }

  function drawFrame() {
    var x = frameX(R.clock);
    var hot = false;
    for (var i = 0; i < R.fish.length; i++) {
      var f = R.fish[i];
      if (f.tag && f.st === 'wait' && Math.abs(R.clock - f.t * SPB) <= GOOD_W) hot = true;
    }
    var col = R.flash > 0 ? C.cream : C.orange;
    var s = FRAME_HALF, t = 14, l = 44;
    if (hot) game.draw.rect(x - s, FY - s, s * 2, s * 2, C.orange, 0.3);
    // 四隅の括弧
    game.draw.rect(x - s, FY - s, l, t, col); game.draw.rect(x - s, FY - s, t, l, col);
    game.draw.rect(x + s - l, FY - s, l, t, col); game.draw.rect(x + s - t, FY - s, t, l, col);
    game.draw.rect(x - s, FY + s - t, l, t, col); game.draw.rect(x - s, FY + s - l, t, l, col);
    game.draw.rect(x + s - l, FY + s - t, l, t, col); game.draw.rect(x + s - t, FY + s - l, t, l, col);
    game.draw.rect(x - 4, FY - 4, 8, 8, col);
    // 枠の通り道(横の線)
    game.draw.rect(VX0 + 40, FY + s + 30, VX1 - VX0 - 80, 4, C.teal, 0.5);
    game.draw.rect(x - 20, FY + s + 24, 40, 16, col);
  }

  function drawCockpit() {
    var e = game.time.elapsed;
    // のぞき窓の外側(船殻)を上下左右の帯で塗る。角は段々の大きいドット
    game.draw.rect(0, 230, W, VY0 - 230, C.hull);
    game.draw.rect(0, VY1, W, H - VY1, C.hull);
    game.draw.rect(0, VY0, VX0, VY1 - VY0, C.hull);
    game.draw.rect(VX1, VY0, W - VX1, VY1 - VY0, C.hull);
    for (var k = 0; k < 3; k++) {
      var d = (3 - k) * DOT * 2;
      game.draw.rect(VX0, VY0 + k * DOT * 2, d, DOT * 2, C.hull);
      game.draw.rect(VX1 - d, VY0 + k * DOT * 2, d, DOT * 2, C.hull);
      game.draw.rect(VX0, VY1 - (k + 1) * DOT * 2, d, DOT * 2, C.hull);
      game.draw.rect(VX1 - d, VY1 - (k + 1) * DOT * 2, d, DOT * 2, C.hull);
    }
    // 窓枠のリベット
    for (var x = VX0 + 30; x < VX1; x += 72) { game.draw.rect(x, VY0 - 30, DOT, DOT, C.teal); game.draw.rect(x, VY1 + 18, DOT, DOT, C.teal); }
    // 計器盤: 4拍のランプ
    var b = Math.floor(R.clock / SPB), inBar = ((b % 4) + 4) % 4;
    for (var i = 0; i < 4; i++) {
      var lx = 300 + i * 160, on = R.clock >= 0 && i === inBar;
      var sz = i === 0 ? 48 : 36;
      game.draw.rect(lx - sz / 2, 1250 - sz / 2, sz, sz, on ? C.orange : C.deep);
      if (on) game.draw.rect(lx - sz / 2 - 12, 1250 - sz / 2 - 12, sz + 24, sz + 24, C.orange, 0.25 * R.pulse);
      // 枠が来る位置(左・中・右)の小さな印
      var cpos = colAt(b - inBar + i);
      game.draw.rect(lx - 24 + cpos * 18, 1300, DOT, DOT, on ? C.cream : C.teal);
    }
    // 探査員(後ろ姿・ヘッドセット)
    var bob = Math.sin(e * 2) * 3 + R.pulse * 4;
    game.draw.rect(110, 1380, 240, 300, C.deep);
    game.draw.rect(130, 1400, 200, 12, C.teal);
    game.draw.sprite(PILOT, PILOT_PAL, 230, 1540 + bob, 14, { anchor: 'center' });
    // 記録ボタン(親指ゾーン)
    var bx = 720, by = Math.round(H * 0.84);
    var push = R.press > 0 ? 12 : 0;
    game.draw.rect(bx - 150, by - 110, 300, 240, C.deep);
    game.draw.rect(bx - 120, by - 84 + push, 240, 180, R.press > 0 ? C.cream : C.orange);
    game.draw.rect(bx - 120, by + 96, 240, 24 - push, C.teal);
    game.draw.rect(bx - 36, by - 30 + push, 72, 72, C.deep);
    game.draw.rect(bx - 20, by - 14 + push, 40, 40, R.press > 0 ? C.orange : C.cream);
    // 探査員の腕がボタンへ伸びる
    game.draw.line(320, 1560 + bob, bx - 40, by - 20 + push, C.teal, 28);
    game.draw.rect(bx - 66, by - 44 + push, 48, 40, C.mint);
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 230, C.deep);
    game.draw.rect(0, 222, W, 8, C.orange);
    txt('SCORE ' + R.score, 40, 72, 46, C.cream, 'left');
    for (var i = 0; i < LIVES; i++) {
      var on = i < R.lives;
      game.draw.rect(W - 92 - i * 72, 46, 48, 40, on ? C.orange : C.hull);
      game.draw.rect(W - 80 - i * 72, 58, 24, 12, on ? C.cream : C.teal);
    }
    txt(R.read + ' / ' + R.total, W / 2, 150, 42, C.orange);
    if (R.combo >= 2) txt(R.combo + ' COMBO', 40, 150, 36, C.mint, 'left');
    var progress = clamp(R.clock / (R.beats * SPB), 0, 1);
    game.draw.rect(40, 192, W - 80, 16, C.hull);
    for (var q = 0; q < Math.floor((W - 80) * progress / 24); q++) game.draw.rect(40 + q * 24, 192, 18, 16, C.mint);
    if (R.clock < 0 && !R.over) {
      game.draw.rect(0, H * 0.47, W, H * 0.08, C.deep, 0.85);
      txt(R.clock < -0.35 ? 'READY?' : 'GO!', W / 2, H * 0.525, 96, C.orange);
    }
  }

  function drawResult() {
    game.draw.rect(80, H * 0.21, W - 160, H * 0.37, C.deep, 0.92);
    game.draw.rect(80, H * 0.21, W - 160, 12, R.ok ? C.mint : C.orange);
    txt(R.ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.27, 92, R.ok ? C.mint : C.orange);
    txt('SCORE ' + R.score, W / 2, H * 0.335, 58, C.cream);
    txt('PERFECT ' + R.perfect + '  GOOD ' + R.good + '  MISS ' + R.miss, W / 2, H * 0.385, 34, C.mint);
    txt(R.read + ' / ' + R.total + '   COMBO ' + R.maxCombo, W / 2, H * 0.43, 40, C.orange);
    if (R.ok && R.score > R.prevBest && R.prevBest > 0) txt('NEW RECORD', W / 2, H * 0.485, 54, C.orange);
    else txt('BEST ' + Math.max(R.prevBest, R.ok ? R.score : 0), W / 2, H * 0.485, 42, C.cream);
    if (!R.ok) txt('あと' + Math.max(1, R.total - R.read) + '匹', W / 2, H * 0.535, 46, C.orange);
  }

  function drawAttractHud() {
    var e = game.time.elapsed;
    game.draw.rect(0, 0, W, 230, C.deep);
    game.draw.rect(0, 222, W, 8, C.orange);
    var bob = Math.round(Math.sin(e * 2.2) * 2) * 4;
    game.draw.text(GAME_TITLE, W / 2 + 8, 108 + bob, { size: 104, color: C.hull, bold: true, align: 'center' });
    game.draw.text(GAME_TITLE, W / 2, 100 + bob, { size: 104, color: C.orange, bold: true, align: 'center' });
    txt('HI-SCORE ' + game.best, W / 2, 190, 38, C.mint);
    if (Math.floor(e * 2) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.975, 46, C.orange);
    else txt('TAP TO START', W / 2, H * 0.975, 42, C.cream);
  }

  function drawWorld() {
    drawSea();
    drawFish();
    drawFrame();
    drawCockpit();
  }

  // ── 入力 ───────────────────────────────────────────────
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.3); state = S.ATTRACT; initGame(); demo.t = 0; demo.cyc = 0; return; }
    var res = scan();
    if (res === 'locked') {
      game.audio.play('se_tap', 0.2);
      game.fx.burst(720, Math.round(H * 0.84), { color: C.teal, count: 4, speed: 90 });
    }
  });

  game.onUpdate(function(dt) {
    if (!R) initGame();
    if (state === S.ATTRACT) {
      stepDemo(dt);
      drawWorld();
      game.draw.hand(720 + 20, Math.round(H * 0.84) + 30 - (demo.press > 0 ? 18 : 0), { press: demo.press > 0, scale: 16 });
      drawAttractHud();
      return;
    }
    if (state === S.RESULT) {
      drawWorld();
      drawHud();
      drawResult();
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.975, 40, C.cream);
      return;
    }
    stepRun(dt);
    drawWorld();
    drawHud();
    if (R.over) {
      drawResult();
      R.endWait -= dt;
      if (R.endWait <= 0) {
        state = S.RESULT;
        var stats = { score: R.score, read: R.read, total: R.total, perfect: R.perfect, good: R.good, miss: R.miss, maxCombo: R.maxCombo };
        if (R.ok) game.end.success(R.score, stats);
        else game.end.failure(stats);
      }
    }
  });

  game.onStart(function() {
    state = S.ATTRACT;
    initGame();
    demo.t = 0; demo.cyc = 0;
  });
})(game);
