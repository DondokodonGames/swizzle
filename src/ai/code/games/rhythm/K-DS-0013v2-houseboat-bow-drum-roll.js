// K-DS-0013v2-houseboat-bow-drum-roll.js
// 屋形船の舳先太鼓 — 笛と鉦が1小節呼びかけると、次の連打の小節では拍の頭ごとに太鼓へ連打を詰め込んで波を轟かせる。段ごとにテンポが上がる
// 操作: 画面のどこでも押すと太鼓を打つ(押した瞬間で判定)。水平線から寄せる大波(泡が3つ乗った白波)が舳先の線に届く拍の頭で1打目を打ち、次の拍の頭までに泡の残りを打ち込む(1拍に3打)。笛と鉦の小節の小波は聞くだけ(打っても罰なし)。1打目の拍外れ・泡の打ち残しはMISS。段の終わりに笛が駆け上がり、船灯が点滅し、波の速さの数字が上がって次の段の加速を予告する
// 終わり: 3段(100→120→140BPM、各 呼びかけ1小節+連打1小節・約12秒)を打ち切ればCLEAR。MISS3回でGAME OVER
// @mechanic: mash
// @theme: houseboat_bow_drum_roll
// 世界観: 夜の海に浮かぶ屋形船の舳先で、若い太鼓打ちが笛と鉦の呼びかけに応え、寄せる波の拍に合わせて太鼓を連打して船の宴を盛り上げる
// 残るもの: 正誤(CLEAR/GAME OVER) + 判定スコア(PERFECT/GOOD/MISS数・打ち込んだ連打数・最大コンボ)
// スタイル: MODE7 PSEUDO

(function(game) {
  var STYLE = { bg: ['#0a0e2c', '#2c1c52'], main: ['#163478', '#3462b8', '#ece4cc'], accent: ['#ffb030', '#ff4a3a'] };
  var W = game.canvas.width;
  var H = game.canvas.height;

  // MODE7 PSEUDO: 水平線から手前へ横ストリップを並べ、奥ほど市松を詰める海面。速さはストリップの流れる量で見せる
  var C = {
    skyT: STYLE.bg[0], skyB: STYLE.bg[1],
    seaD: STYLE.main[0], seaL: STYLE.main[1], foam: STYLE.main[2],
    lamp: STYLE.accent[0], red: STYLE.accent[1],
    wood: '#7a4a28', woodD: '#4a2a14', woodL: '#b07a44', ink: '#06060e', skin: '#f0c49c', happi: '#2a58c8', white: '#ffffff'
  };
  var ST_COL = ['#4ee0d0', '#ffb030', '#ff5a4a'];

  var GAME_TITLE = 'BOW DRUM';
  var WIN_P = 0.06, WIN_G = 0.13, WIN_M = 0.3;
  var LIVES = 3;
  var NEED = 3;               // 1拍に打ち込む数(頭の1打+泡2つ)
  var PLAY_STAGES = [{ bpm: 100, from: 0 }, { bpm: 120, from: 8 }, { bpm: 140, from: 16 }];
  var PLAY_END = 24;
  var DEMO_STAGES = [{ bpm: 100, from: 0 }, { bpm: 128, from: 8 }];
  var DEMO_END = 16;
  var DEMO_FAIL_B = 14;       // ゴーストがここで1打足りずMISSする
  var DEMO_CYCLE = 8 * 0.6 + 8 * (60 / 128) + 1.4;

  var HY = 640;               // 水平線
  var BOW_Y = 1380;           // 舳先の線(拍の頭で波が届く)
  var DZ = 40000;
  var Z_BOW = DZ / (BOW_Y - HY);
  var Z_BEAT = 120;
  var DRUM = { x: 540, y: 1690, r: 190 };

  // 伴奏(自作): 呼びかけの小節は笛の句+鉦、連打の小節は鉦が拍の頭を刻み笛が伸ばす
  var FL_CALL = ['A5', 0, 'C6', 'A5', 'G5', 0, 'E5', 0];
  var FL_CALL2 = ['D5', 0, 'E5', 'G5', 'A5', 0, 0, 0];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var R = null;
  var demo = { t: 0, taps: [], ti: 0, press: 0 };

  // ── スプライト ─────────────────────────────────────────
  var MAN_UP = [
    'b..........b',
    '.b..wwww..b.',
    '..bwrrrrwb..',
    '..sssssssss.',
    '..seessees..',
    '..ssssssss..',
    '...ssmmss...',
    '.ss.ssss.ss.',
    '.sccccccccs.',
    '..cccwwccc..',
    '..cccwwccc..',
    '..cccccccc..'
  ];
  var MAN_DOWN = [
    '............',
    '....wwww....',
    '...wrrrrw...',
    '..sssssssss.',
    '..seessees..',
    '..ssssssss..',
    '...smmmms...',
    '....ssss....',
    'ssccccccccss',
    'b.cccwwccc.b',
    '.bcccwwcccb.',
    '..cccccccc..'
  ];
  var MAN_OOPS = MAN_UP.slice();
  MAN_OOPS[4] = '..sxssssxs..';
  MAN_OOPS[6] = '....smms....';
  var MAN_PAL = { b: C.woodL, w: C.white, r: C.red, s: C.skin, e: C.ink, x: C.ink, m: '#8a3a2a', c: C.happi };

  // ── 小道具 ─────────────────────────────────────────────
  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 4, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }
  function stageIdx(bp) {
    var st = R.stages, i = 0;
    while (i + 1 < st.length && bp >= st[i + 1].from) i++;
    return i;
  }
  function spbAt(bp) { return 60 / R.stages[stageIdx(Math.max(0, bp))].bpm; }

  // ── 進行 ───────────────────────────────────────────────
  function newRun(isDemo) {
    var stages = isDemo ? DEMO_STAGES : PLAY_STAGES;
    var rolls = [];
    for (var s = 0; s < stages.length; s++) {
      for (var k = 4; k < 8; k++) rolls.push({ b: stages[s].from + k, stage: s, need: NEED, head: null, taps: 0, st: 'wait', fx: 0 });
    }
    return {
      demo: isDemo, stages: stages, end: isDemo ? DEMO_END : PLAY_END, rolls: rolls,
      bp: 0, beatIdx: -1, stepIdx: -1, annIdx: 0, stDone: 0, scroll: 0,
      ready: isDemo ? 0 : 0.8, lives: LIVES, score: 0, combo: 0, maxCombo: 0,
      perfect: 0, good: 0, miss: 0, fills: 0, extra: 0, stMiss: [0, 0, 0],
      stop: 0, stopRoll: null, pulse: 0, hitT: 0, oops: 0, ann: 0, lampT: 0,
      over: false, ok: false, endWait: 0
    };
  }

  function startAttractBgm() {
    var notes = [], bass = [];
    for (var i = 0; i < 8; i++) notes.push([FL_CALL[i] || 'R', 0.5]);
    for (var j = 0; j < 8; j++) notes.push([FL_CALL2[j] || 'R', 0.5]);
    for (var b = 0; b < 8; b++) bass.push([b % 2 ? 'R' : 'A2', 1]);
    game.audio.melody(notes, { tempo: 100, wave: 'triangle', volume: 0.05, loop: true, bass: bass });
  }

  function initGame() {
    R = newRun(state !== S.PLAYING);
    if (state === S.PLAYING) game.audio.stopBgm();
    else startAttractBgm();
  }

  function kane(v) {
    game.audio.tone(1760, 0.05, { wave: 'square', volume: v });
    game.audio.tone(2640, 0.08, { wave: 'square', volume: v * 0.5 });
  }

  function playStep(s) {
    var b = s / 2;
    var si = stageIdx(b), st = R.stages[si];
    var pos = b - st.from;
    var p2 = Math.round(pos * 2);
    var spb = 60 / st.bpm;
    var head = p2 % 2 === 0;
    if (pos < 4) {
      if (head) { kane(0.05); R.lampT = 0.15; }
      if (p2 === 0) game.audio.tone(90, 0.16, { wave: 'sine', volume: 0.18, slide: -40 });
      var fl = (si % 2 ? FL_CALL2 : FL_CALL)[p2];
      if (fl) game.audio.tone(fl, spb * 0.45, { wave: 'triangle', volume: 0.07, slide: 8 });
      if (p2 === 4) game.audio.tone('A2', spb * 1.6, { wave: 'triangle', volume: 0.12 });
    } else {
      if (head) { kane(0.035); game.audio.tone(70, 0.08, { wave: 'sine', volume: 0.08, slide: -20 }); R.lampT = 0.15; }
      if (p2 === 8) game.audio.tone('A5', spb * 1.8, { wave: 'triangle', volume: 0.045 });
      if (p2 === 12) game.audio.tone('E5', spb * 1.5, { wave: 'triangle', volume: 0.045 });
      if (p2 === 8 || p2 === 12) game.audio.tone('A2', spb * 1.6, { wave: 'triangle', volume: 0.12 });
    }
  }

  function announce(i) {
    R.ann = 1.4;
    var bpm = R.stages[i].bpm;
    for (var k = 0; k < 4; k++) game.audio.tone(['E5', 'G5', 'A5', 'C6'][k], 0.07 + k * 0.03, { wave: 'triangle', volume: R.demo ? 0.03 : 0.07, slide: 30 });
    game.fx.popup('' + bpm, W / 2, HY - 70, { color: ST_COL[i], size: 90 });
    game.fx.burst(W / 2, HY, { color: ST_COL[i], count: 14, speed: 300 });
  }

  // 太鼓を打つ(押した瞬間で判定)
  function hitDrum() {
    if (!R || R.over || R.ready > 0 || R.stop > 0) return 'none';
    var spb = spbAt(R.bp);
    R.hitT = 0.09;
    var best = null, bd = 99, i, r;
    for (i = 0; i < R.rolls.length; i++) {
      r = R.rolls[i];
      if (r.st !== 'wait' || r.head) continue;
      var d = (R.bp - r.b) * spb;
      if (Math.abs(d) < Math.abs(bd)) { bd = d; best = r; }
    }
    if (best && Math.abs(bd) <= WIN_G) {
      var grade = Math.abs(bd) <= WIN_P ? 'PERFECT' : 'GOOD';
      best.head = grade; best.taps = 1;
      if (grade === 'PERFECT') { R.perfect++; R.score += 100; } else { R.good++; R.score += 60; }
      game.feedback.good(DRUM.x, BOW_Y - 120, { text: grade, color: grade === 'PERFECT' ? C.lamp : C.foam, count: grade === 'PERFECT' ? 14 : 8 });
      game.audio.tone(85, 0.18, { wave: 'sine', volume: 0.26, slide: -45 });
      return grade;
    }
    for (i = 0; i < R.rolls.length; i++) {
      r = R.rolls[i];
      if (r.st === 'wait' && r.head && R.bp < r.b + 1 - WIN_G / spb) {
        r.taps++;
        var pitch = Math.pow(2, Math.min(r.taps, 8) / 12);
        if (r.taps <= r.need) {
          R.fills++; R.score += 20;
          var fx = DRUM.x + (r.taps - 2.5) * 220;
          game.fx.burst(fx, BOW_Y, { color: C.foam, count: 9, speed: 260 });
          game.audio.tone(110 * pitch, 0.1, { wave: 'sine', volume: 0.2, slide: -50 });
        } else {
          R.extra++; R.score += 5;
          game.fx.burst(DRUM.x, DRUM.y - 60, { color: ST_COL[r.stage], count: 4, speed: 180 });
          game.audio.tone(130 * pitch, 0.07, { wave: 'sine', volume: 0.12, slide: -40 });
        }
        return 'fill';
      }
    }
    game.fx.burst(DRUM.x, DRUM.y, { color: C.foam, count: 3, speed: 90 });
    game.audio.tone(330, 0.05, { wave: 'triangle', volume: 0.06, slide: -120 });
    return 'air';
  }

  function missRoll(r) {
    r.st = 'miss'; r.fx = 0;
    R.combo = 0; R.miss++; R.lives--;
    R.stMiss[r.stage]++;
    R.stop = 0.42; R.stopRoll = r; R.oops = 1.2;
    game.audio.tone(98, 0.32, { wave: 'sawtooth', volume: 0.1, slide: -30 });
  }

  function fullRoll(r) {
    r.st = 'ok'; r.fx = 0;
    R.combo++;
    if (R.combo > R.maxCombo) R.maxCombo = R.combo;
    R.score += 30 * (r.stage + 1) + R.combo * 5;
    game.fx.burst(DRUM.x, BOW_Y - 20, { color: ST_COL[r.stage], count: 16, speed: 460 });
    game.audio.tone(60, 0.25, { wave: 'sine', volume: 0.2, slide: -20 });
    if (!R.demo && R.combo % 4 === 0) {
      game.fx.popup('x' + R.combo, DRUM.x, 1060, { color: C.lamp, size: 96 });
      game.audio.play('se_milestone', 0.5);
    }
  }

  function releaseStop() {
    R.stopRoll = null;
    game.feedback.bad(DRUM.x, BOW_Y - 120, { text: 'MISS' });
    if (R.lives <= 0 && !R.demo) endRun(false);
  }

  function endRun(ok) {
    if (R.over) return;
    R.over = true; R.ok = ok; R.endWait = 1.8;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    if (ok) {
      for (var i = 0; i < 5; i++) game.fx.burst(140 + i * 200, 420 + (i % 2) * 260, { color: [C.lamp, ST_COL[0], ST_COL[1], ST_COL[2], C.foam][i], count: 24, speed: 560 });
      game.fx.flash(C.lamp, 0.2);
    }
    if (R.score > game.best && game.best > 0) {
      game.fx.popup('NEW RECORD', W / 2, 560, { color: C.lamp, size: 80 });
      game.audio.play('se_milestone', 0.6);
    }
  }

  function stepRun(dt) {
    R.pulse = Math.max(0, R.pulse - dt * 3.5);
    R.hitT = Math.max(0, R.hitT - dt);
    R.oops = Math.max(0, R.oops - dt);
    R.ann = Math.max(0, R.ann - dt);
    R.lampT = Math.max(0, R.lampT - dt);
    for (var q = 0; q < R.rolls.length; q++) if (R.rolls[q].st !== 'wait' && R.rolls[q] !== R.stopRoll) R.rolls[q].fx += dt;
    if (R.over) return;
    if (R.stop > 0) {
      R.stop -= dt;
      if (R.stop <= 0) releaseStop();
      return;
    }
    if (R.ready > 0) {
      var was = R.ready;
      R.ready -= dt;
      if (was > 0.4 && R.ready <= 0.4) kane(0.08);
      if (R.ready <= 0) game.audio.play('se_tap', 0.6);
      return;
    }
    var spb = spbAt(R.bp);
    R.bp += dt / spb;
    R.scroll += dt / spb * 150;
    var bi = Math.floor(R.bp);
    while (R.beatIdx < bi) { R.beatIdx++; R.pulse = 1; }
    var si = Math.floor(R.bp * 2);
    while (R.stepIdx < si) { R.stepIdx++; if (!R.demo) playStep(R.stepIdx); }
    for (var a = R.annIdx + 1; a < R.stages.length; a++) {
      if (R.bp >= R.stages[a].from - 1) { R.annIdx = a; announce(a); }
    }
    spb = spbAt(R.bp);
    for (var i = 0; i < R.rolls.length; i++) {
      var r = R.rolls[i];
      if (r.st !== 'wait') continue;
      if (!r.head && (R.bp - r.b) * spb > WIN_G) { missRoll(r); return; }
      if (r.head && R.bp >= r.b + 1 - WIN_G / spb) {
        if (r.taps >= r.need) fullRoll(r);
        else { missRoll(r); return; }
      }
    }
    while (R.stDone < R.stages.length && R.bp >= R.stages[R.stDone].from + 8 - 0.2) {
      if (!R.demo && R.stMiss[R.stDone] === 0) {
        game.fx.popup('NICE', W / 2, 900, { color: ST_COL[R.stDone], size: 84 });
        game.audio.play('se_milestone', 0.45);
      }
      R.stDone++;
    }
    if (!R.demo && R.bp >= R.end + 0.3) endRun(true);
  }

  // ATTRACT: ゴーストが実ロジックで叩く(拍の頭+泡2つ。2段目の3拍目だけ1打足りずにMISS)
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % DEMO_CYCLE;
    if (cyc < dt || demo.t <= dt) {
      R = newRun(true);
      demo.taps = []; demo.ti = 0;
      for (var i = 0; i < R.rolls.length; i++) {
        var b = R.rolls[i].b;
        demo.taps.push(b, b + 0.3);
        if (b !== DEMO_FAIL_B) demo.taps.push(b + 0.6);
      }
    }
    demo.press = Math.max(0, demo.press - dt);
    if (R.stop > 0) return;
    while (demo.ti < demo.taps.length && R.bp >= demo.taps[demo.ti]) {
      demo.ti++;
      hitDrum();
      demo.press = 0.08;
    }
  }

  // ── 描画 ───────────────────────────────────────────────
  function drawSky() {
    var si = stageIdx(Math.max(0, R.bp));
    game.draw.gradient(0, HY, [[0, C.skyT], [1, C.skyB]]);
    for (var i = 0; i < 24; i++) game.draw.rect((i * 211) % W, 250 + (i * 97) % 300, 4, 4, C.foam, 0.4 + 0.3 * Math.sin(game.time.elapsed * 2 + i));
    game.draw.circle(820, 380, 120, C.foam, 0.08);
    game.draw.circle(820, 380, 80, C.foam, 0.15);
    game.draw.circle(820, 380, 54, '#fff4d8');
    // 遠くの岸の灯(拍型の色に揺れる)
    for (var k = 0; k < 18; k++) game.draw.rect(30 + k * 58, HY - 10 - (k % 3) * 6, 10, 8 + (k % 3) * 6, k % 4 ? C.lamp : ST_COL[si], 0.6);
  }

  function drawSea() {
    // 横ストリップを奥ほど圧縮して市松の海面を描く
    for (var y = HY + 2; y < 1480; y += 6) {
      var dy = y - HY;
      var z = DZ / dy;
      var v = Math.floor((z + R.scroll) / 90);
      var w = 320 * dy / 800;
      if (w < 20) {
        game.draw.rect(0, y, W, 6, v % 2 ? C.seaD : '#22448a');
        continue;
      }
      var n = Math.ceil(540 / w) + 1;
      for (var i = -n; i < n; i++) {
        var x = 540 + i * w;
        game.draw.rect(x, y, w + 1, 6, (v + i) % 2 === 0 ? C.seaD : C.seaL);
      }
    }
    // 水平線の霞
    for (var f = 0; f < 4; f++) game.draw.rect(0, HY, W, 40 + f * 40, C.skyB, 0.22);
  }

  function crestY(b) {
    var z = Z_BOW + (b - R.bp) * Z_BEAT;
    if (z <= 1) return null;
    return HY + DZ / z;
  }

  function rollAt(b) {
    for (var i = 0; i < R.rolls.length; i++) if (R.rolls[i].b === b) return R.rolls[i];
    return null;
  }

  function drawWaves() {
    var e = game.time.elapsed;
    var b0 = Math.floor(R.bp);
    for (var b = b0 + 6; b >= b0; b--) {
      var y = crestY(b);
      if (y === null || y > BOW_Y + 4) continue;
      var k = (y - HY) / (BOW_Y - HY);
      var r = rollAt(b);
      if (!r) {
        game.draw.rect(0, y - 2 - k * 6, W, 4 + k * 10, C.foam, 0.25 + k * 0.3);
        continue;
      }
      var si = r.stage;
      game.draw.rect(0, y - 4 - k * 18, W, 8 + k * 30, C.foam, 0.55 + k * 0.35);
      game.draw.rect(0, y - 4 - k * 18, W, 4 + k * 8, ST_COL[si], 0.6);
      // 乗っている泡(=打ち込む数)。押すたびに1つ弾ける
      var left = r.need - r.taps;
      if (r.st === 'miss' && r === R.stopRoll) left = r.need - r.taps;
      for (var i = 0; i < r.need; i++) {
        if (i < r.need - left) continue;
        var fx = 540 + (i - (r.need - 1) / 2) * 260 * k;
        var fl = r === R.stopRoll && Math.floor(e * 20) % 2 === 0;
        game.draw.circle(fx, y - 10 * k, (12 + 40 * k) * (fl ? 1.3 : 1), fl ? C.white : C.foam);
        game.draw.circle(fx - 8 * k, y - 18 * k, (4 + 12 * k), C.white, 0.8);
      }
      // 予告: 大波が近づくと縁が明滅
      if (r.st === 'wait' && !r.head && b - R.bp < 1.6 && Math.floor(e * 12) % 2 === 0) game.draw.rect(0, y - 8 - k * 22, W, 4, C.white, 0.9);
    }
    // 舳先に届いた波のしぶき(今の拍)
    var cur = null;
    for (var j = 0; j < R.rolls.length; j++) {
      var rr = R.rolls[j];
      if ((rr.st === 'wait' && rr.head) || rr === R.stopRoll) cur = rr;
    }
    if (cur) {
      var left2 = Math.max(0, cur.need - cur.taps);
      var flash = cur === R.stopRoll && Math.floor(e * 20) % 2 === 0;
      for (var m = 0; m < cur.need; m++) {
        var on = m >= cur.need - left2;
        var sx = 540 + (m - 1) * 220;
        game.draw.circle(sx, BOW_Y - 10, on ? (flash ? 64 : 50) : 26, flash ? C.white : (on ? C.foam : ST_COL[cur.stage]), on ? 0.95 : 0.6);
      }
    }
  }

  function drawBoat() {
    var e = game.time.elapsed;
    var si = stageIdx(Math.max(0, R.bp));
    // 舳先の甲板(奥へすぼまる板張り)
    for (var y = BOW_Y + 20; y < H; y += 8) {
      var k = (y - BOW_Y) / (H - BOW_Y);
      var half = 120 + k * 520;
      game.draw.rect(540 - half, y, half * 2, 8, Math.floor(y / 40) % 2 ? C.wood : C.woodD);
    }
    game.draw.line(540, BOW_Y + 10, 20, H, C.woodL, 16);
    game.draw.line(540, BOW_Y + 10, 1060, H, C.woodL, 16);
    // 船灯(鉦の拍と予告で明滅)
    for (var l = 0; l < 2; l++) {
      var lx = l === 0 ? 130 : 950, ly = 1290;
      var blink = R.ann > 0 && Math.floor(e * 10) % 2 === 0;
      var glow = 0.2 + R.lampT * 2.5 + (blink ? 0.5 : 0);
      game.draw.rect(lx - 6, ly, 12, 300, C.woodD);
      game.draw.circle(lx, ly - 30, 110, blink ? ST_COL[Math.min(R.annIdx, 2)] : C.lamp, glow * 0.35);
      game.draw.circle(lx, ly - 30, 64, blink ? ST_COL[Math.min(R.annIdx, 2)] : C.lamp, glow * 0.6);
      game.draw.rect(lx - 40, ly - 90, 80, 120, C.red);
      game.draw.rect(lx - 40, ly - 90, 80, 120, C.lamp, 0.3 + R.lampT * 3);
      for (var s = 0; s < 4; s++) game.draw.rect(lx - 40, ly - 80 + s * 30, 80, 4, C.woodD, 0.7);
    }
    // 太鼓打ち(太鼓の向こうに立つ)
    var frame = R.oops > 0 ? MAN_OOPS : (R.hitT > 0 ? MAN_DOWN : MAN_UP);
    var bob = Math.round((-R.pulse * 8 + Math.sin(e * 3) * 3) / 4) * 4;
    game.draw.sprite(frame, MAN_PAL, DRUM.x, DRUM.y - 260 + bob, 22, { anchor: 'center' });
    // 大太鼓
    var hit = R.hitT > 0;
    game.draw.rect(DRUM.x - 160, DRUM.y + 120, 40, 140, C.woodD);
    game.draw.rect(DRUM.x + 120, DRUM.y + 120, 40, 140, C.woodD);
    game.draw.circle(DRUM.x, DRUM.y, DRUM.r + 26, '#5a1a10');
    game.draw.circle(DRUM.x, DRUM.y, DRUM.r, hit ? '#fff8e8' : '#ecd8b0');
    game.draw.circle(DRUM.x, DRUM.y, DRUM.r * 0.4, ST_COL[si], hit ? 0.6 : 0.3);
    for (var i = 0; i < 14; i++) {
      var a = (i / 14) * Math.PI * 2;
      game.draw.circle(DRUM.x + Math.cos(a) * (DRUM.r + 13), DRUM.y + Math.sin(a) * (DRUM.r + 13), 8, C.lamp);
    }
    if (hit) game.draw.circle(DRUM.x, DRUM.y, DRUM.r + 40, C.white, 0.15);
  }

  function drawWorld() {
    drawSky();
    drawSea();
    drawWaves();
    game.draw.rect(0, BOW_Y - 3, W, 6, C.lamp, 0.35 + R.pulse * 0.5);
    drawBoat();
  }

  function speedBadge(x, y) {
    var si = stageIdx(Math.max(0, R.bp));
    var bpm = R.stages[si].bpm;
    for (var c = 0; c <= si; c++) {
      var cx = x - 120 + c * 34;
      game.draw.line(cx, y - 18, cx + 16, y, ST_COL[si], 8);
      game.draw.line(cx + 16, y, cx, y + 18, ST_COL[si], 8);
    }
    txt('' + bpm, x + 40, y + 16, 46, ST_COL[si], 'left');
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 232, C.ink, 0.65);
    txt('SCORE ' + R.score, 40, 74, 48, C.foam, 'left');
    txt('BEST ' + game.best, W - 40, 74, 34, C.lamp, 'right');
    for (var i = 0; i < LIVES; i++) {
      var on = i < R.lives;
      game.draw.circle(W - 80 - i * 76, 150, 28, on ? '#5a1a10' : '#2a2a3a');
      game.draw.circle(W - 80 - i * 76, 150, 20, on ? '#ecd8b0' : '#2a2a3a');
    }
    if (R.combo >= 2) txt('x' + R.combo, 40, 160, 54, C.lamp, 'left');
    speedBadge(560, 145);
    var progress = Math.max(0, Math.min(1, R.bp / R.end));
    game.draw.rect(40, 208, W - 80, 12, '#1a1a3a');
    for (var s = 0; s < R.stages.length; s++) {
      var a = R.stages[s].from / R.end, b = Math.min(progress, (R.stages[s].from + 8) / R.end);
      if (b > a) game.draw.rect(40 + (W - 80) * a, 208, (W - 80) * (b - a), 12, ST_COL[s]);
    }
    if (R.ready > 0) txt(R.ready > 0.4 ? 'READY?' : 'GO!', W / 2, 1000, 120, C.lamp);
  }

  function drawResult() {
    game.draw.rect(0, H * 0.25, W, H * 0.32, C.ink, 0.88);
    txt(R.ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.3, 96, R.ok ? C.lamp : C.red);
    txt('SCORE ' + R.score, W / 2, H * 0.37, 62, C.foam);
    txt('PERFECT ' + R.perfect + '   GOOD ' + R.good + '   MISS ' + R.miss, W / 2, H * 0.42, 34, C.lamp);
    txt((R.fills + R.perfect + R.good + R.extra) + '   x' + R.maxCombo, W / 2, H * 0.46, 44, ST_COL[0]);
    if (R.score > game.best && game.best > 0) txt('NEW RECORD', W / 2, H * 0.51, 54, C.lamp);
    else txt('BEST ' + Math.max(game.best, R.score), W / 2, H * 0.51, 42, C.foam);
    if (!R.ok) {
      var left = 0;
      for (var i = 0; i < R.rolls.length; i++) if (R.rolls[i].st === 'wait') left++;
      txt('あと' + left + '拍', W / 2, H * 0.55, 48, C.red);
    }
  }

  function drawAttractHud() {
    var e = game.time.elapsed;
    var bob = Math.round(Math.sin(e * 2.2) * 2) * 4;
    game.draw.rect(0, 0, W, 232, C.ink, 0.65);
    game.draw.text(GAME_TITLE, W / 2 + 8, 108 + bob, { size: 112, color: C.red, bold: true, align: 'center' });
    game.draw.text(GAME_TITLE, W / 2, 100 + bob, { size: 112, color: C.lamp, bold: true, align: 'center' });
    txt('BEST ' + game.best, W / 2, 200, 40, C.foam);
    speedBadge(560, 300);
    if (Math.floor(e * 2) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.965, 48, C.lamp);
    else txt('INSERT COIN', W / 2, H * 0.965, 40, C.foam);
  }

  // ── 入力 ───────────────────────────────────────────────
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function(x, y) {
    if (state !== S.PLAYING || !R || R.over) return;
    var res = hitDrum();
    if (res !== 'none') game.fx.burst(DRUM.x + game.random(-90, 90), DRUM.y - 60, { color: C.lamp, count: 3, speed: 140 });
    else game.audio.tone(260, 0.04, { wave: 'triangle', volume: 0.04 });
  });

  game.onUpdate(function(dt) {
    if (!R) initGame();
    if (state === S.ATTRACT) {
      stepDemo(dt);
      stepRun(dt);
      drawWorld();
      game.draw.hand(DRUM.x + 40, DRUM.y - 40 + (demo.press > 0 ? 20 : 0), { press: demo.press > 0, scale: 16 });
      drawAttractHud();
      return;
    }
    if (state === S.RESULT) {
      stepRun(dt);
      drawWorld();
      drawResult();
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.965, 40, C.foam);
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
        var stats = { score: R.score, perfect: R.perfect, good: R.good, miss: R.miss, fills: R.fills, extra: R.extra, maxCombo: R.maxCombo };
        if (R.ok) game.end.success(R.score, stats);
        else game.end.failure(stats);
      }
    }
  });

  game.onStart(function() {
    state = S.ATTRACT;
    initGame();
  });
})(game);
