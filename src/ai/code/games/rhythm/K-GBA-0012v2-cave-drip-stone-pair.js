// K-GBA-0012v2-cave-drip-stone-pair.js
// 滴り石のつい — 精霊が滴で鳴らした1小節の拍の型と同じ型で光る石を二つ見つけ、次の小節でその型の拍の頭に一つずつ打ち返す
// 操作: 1回は2小節。1小節目(お手本)は精霊の滴が4拍のうち2拍に落ち、同時に石たちもそれぞれ自分の型の拍で光って鳴る(石の下の4マスに型が残る)。滴と同じ2拍で光った石が二つある。2小節目(返し)で、お手本の1つ目の拍の頭に片方の石、2つ目の拍の頭にもう片方の石を叩く。拍の頭からのずれでPERFECT/GOOD、ずれすぎ・型にない拍・違う石・同じ石の二度打ち・打ち逃しはMISSでその回は終わり
// 終わり: 4回(石4個→5個→6個→6個・似た型が増える)を通して MISS 2回以内ならCLEAR(判定の点+対ボーナス)。MISS 3回でGAME OVER
// @mechanic: pair_match
// @theme: cave_drip_stone_pair
// 世界観: 鍾乳洞の奥で、ヘルメットに灯りをつけた探検隊の少女が、洞の精霊が滴で鳴らした拍と同じ響きを持つ石を二つ探し出し、次の小節で打ち合わせて鳴らし返す
// 残るもの: 正誤(CLEAR/GAME OVER) + スコア・PERFECT/GOOD/MISS数・そろえた対の数
// スタイル: 8bit HOME

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 8bit HOME: 3〜4色+黒、輪郭線なし、粗いドット、タイル反復の背景、1方向スクロール
  var STYLE = { bg: ['#000000', '#1c2a6c', '#0c1440'], main: ['#3cbcfc', '#fcfcfc', '#7c7c7c'], accent: ['#f8b800', '#d82800'] };
  var C = {
    black: STYLE.bg[0], cave: STYLE.bg[1], cave2: STYLE.bg[2],
    water: STYLE.main[0], white: STYLE.main[1], grey: STYLE.main[2],
    amber: STYLE.accent[0], red: STYLE.accent[1], dim: '#3c3c3c',
  };

  var GAME_TITLE = 'DRIP PAIR';
  var BPM = 116;
  var SPB = 60 / BPM;
  var PERFECT_W = 0.08;
  var GOOD_W = 0.17;
  var MISS_MAX = 3;
  var TIME_LIMIT = 17;
  var ROUND_BEATS = 8;          // お手本1小節 + 返し1小節
  var PATS = [[1, 1, 0, 0], [1, 0, 1, 0], [1, 0, 0, 1], [0, 1, 1, 0], [0, 1, 0, 1], [0, 0, 1, 1]];
  var ROUND_CFG = [{ n: 4, twin: false, close: false }, { n: 5, twin: false, close: false }, { n: 6, twin: true, close: false }, { n: 6, twin: true, close: true }];
  var SLOTS = [[220, 900], [540, 870], [860, 900], [220, 1150], [540, 1120], [860, 1150]];
  var PITCH = ['C5', 'D5', 'E5', 'G5', 'A5', 'C6'];
  var CALL_Y = Math.round(H * 0.31), ANS_Y = Math.round(H * 0.715);

  // 洞の歌(オリジナル)。4小節 = 16拍
  var SONG = [
    ['E5', 1], ['R', 0.5], ['B4', 0.5], ['E5', 1], ['G5', 1], ['F#5', 1], ['E5', 0.5], ['D5', 0.5], ['B4', 2],
    ['E5', 1], ['R', 0.5], ['G5', 0.5], ['A5', 1], ['B5', 1], ['A5', 1], ['G5', 0.5], ['F#5', 0.5], ['E5', 2],
  ];
  var SONG_BASS = [
    ['E2', 1], ['E3', 1], ['E2', 1], ['E3', 1], ['D2', 1], ['D3', 1], ['D2', 1], ['D3', 1],
    ['C2', 1], ['C3', 1], ['C2', 1], ['C3', 1], ['B1', 1], ['B2', 1], ['B1', 1], ['B2', 1],
  ];
  function startSong() {
    game.audio.melody(SONG, { tempo: BPM, wave: 'square', volume: 0.035, loop: true, bass: SONG_BASS, bassVolume: 0.06 });
  }

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var demoMode, running, beatN, beatT, songT, readyT, hitStop, flashT, flashX, flashY;
  var r, rs, stones, spiritT, girlT, tileOff;
  var score, perfects, goods, misses, pairs, over, won, outroT, prevBest, milestone;

  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(game.random(0, i + 1)) % (i + 1); var tmp = a[i]; a[i] = a[j]; a[j] = tmp; }
    return a;
  }
  function overlap(a, b) { var c = 0; for (var i = 0; i < 4; i++) if (a[i] && b[i]) c++; return c; }

  function buildRound(i) {
    r = i;
    var cfg = ROUND_CFG[i];
    var p = Math.floor(game.random(0, 6)) % 6;
    var pool = [];
    for (var k = 0; k < 6; k++) if (k !== p && (!cfg.close || overlap(PATS[k], PATS[p]) === 1)) pool.push(k);
    shuffle(pool);
    var pats = [p, p];
    if (cfg.twin) { var q = pool.shift(); pats.push(q, q); }
    while (pats.length < cfg.n) pats.push(pool.shift());
    var slots = shuffle([0, 1, 2, 3, 4, 5]);
    stones = [];
    for (var j = 0; j < pats.length; j++) {
      var sl = SLOTS[slots[j]];
      stones.push({ pat: pats[j], x: sl[0], y: sl[1], pitch: PITCH[slots[j]], used: false, glow: 0, shake: 0, rise: 0 });
    }
    rs = { call: p, answered: [false, false, false, false], failed: false, done: false, turnCue: false, failCell: -1 };
  }

  function initGame(isDemo) {
    demoMode = !!isDemo;
    running = false; beatN = 0; beatT = 0; songT = 0;
    readyT = isDemo ? 0 : 0.8;
    hitStop = 0; flashT = 0; flashX = 0; flashY = 0;
    spiritT = 0; girlT = 0; tileOff = tileOff || 0;
    score = 0; perfects = 0; goods = 0; misses = 0; pairs = 0;
    over = false; won = false; outroT = 0; prevBest = game.best; milestone = false;
    buildRound(0);
    if (isDemo) startClock();
  }

  function startClock() {
    running = true; beatN = 0; beatT = 0; songT = 0;
    startSong();
    onBeat(0);
  }

  function relBeat() { return beatN - r * ROUND_BEATS; }
  function ansHead(k) { return (r * ROUND_BEATS + 4 + k) * SPB; }

  // ---- 拍クロック(1本だけ) ----
  function onBeat(b) {
    var ri = Math.floor(b / ROUND_BEATS);
    if (ri !== r && ri < ROUND_CFG.length) buildRound(ri);
    var rel = b - r * ROUND_BEATS;
    var vol = demoMode ? 0.5 : 1;
    girlT = 0.15;
    game.audio.tone(rel % 4 === 0 ? 220 : 330, 0.03, { wave: 'square', volume: (rel % 4 === 0 ? 0.07 : 0.04) * vol });
    if (rel >= 0 && rel < 4) {
      // お手本の小節: 精霊の滴 + 石がそれぞれの型で光って鳴る
      if (PATS[rs.call][rel]) {
        spiritT = 0.3;
        game.audio.tone(1760, 0.07, { wave: 'sine', volume: 0.16 * vol, slide: -600 });
      }
      for (var i = 0; i < stones.length; i++) {
        if (PATS[stones[i].pat][rel]) {
          stones[i].glow = 1;
          game.audio.tone(stones[i].pitch, 0.12, { wave: 'triangle', volume: 0.025 * vol });
        }
      }
    }
  }

  function stepPlay(dt) {
    if (!running) return;
    beatT += dt;
    while (beatT >= SPB) { beatT -= SPB; beatN++; onBeat(beatN); }
    songT = beatN * SPB + beatT;
    for (var i = 0; i < stones.length; i++) {
      if (stones[i].glow > 0) stones[i].glow -= dt * 2.2;
      if (stones[i].shake > 0) stones[i].shake -= dt;
      if (stones[i].rise < 1) stones[i].rise = Math.min(1, stones[i].rise + dt * 4);
    }
    var rel = relBeat();
    // 返しの番の予告: お手本4拍目の裏で上がる音
    if (rel === 3 && beatT >= SPB * 0.5 && !rs.turnCue) {
      rs.turnCue = true;
      game.audio.tone(880, 0.12, { wave: 'square', volume: demoMode ? 0.03 : 0.06, slide: 440 });
    }
    if (!rs.failed && !rs.done) {
      for (var k = 0; k < 4; k++) {
        if (PATS[rs.call][k] && !rs.answered[k] && songT > ansHead(k) + GOOD_W) { missRound(k, -1); break; }
      }
    }
    if (!demoMode && !over && r === ROUND_CFG.length - 1 && (rs.done || rs.failed) && hitStop <= 0) finish(misses < MISS_MAX);
    if (!demoMode && !over && songT > TIME_LIMIT + 1) finish(misses < MISS_MAX);
  }

  function missRound(cell, stoneIdx) {
    rs.failed = true; rs.failCell = cell;
    misses++;
    hitStop = 0.42; flashT = 0.42;
    if (stoneIdx >= 0) { flashX = stones[stoneIdx].x; flashY = stones[stoneIdx].y; stones[stoneIdx].shake = 0.42; }
    else { flashX = W / 2 - 165 + Math.max(0, cell) * 110; flashY = ANS_Y; }
    game.feedback.bad(flashX, flashY - 110, { text: 'MISS', shake: demoMode ? 4 : 10 });
    if (!demoMode && misses >= MISS_MAX) finish(false);
  }

  // 石を叩く(入力とデモで共通)
  function hitStone(idx) {
    if (!running || hitStop > 0) return 'none';
    var st = stones[idx];
    var tRel = songT - (r * ROUND_BEATS + 4) * SPB;
    if (tRel < -GOOD_W || tRel > 4 * SPB || rs.failed || rs.done) { st.shake = 0.15; return 'none'; }
    var k = Math.max(0, Math.min(3, Math.round(tRel / SPB)));
    var off = tRel - k * SPB;
    if (Math.abs(off) > GOOD_W || !PATS[rs.call][k] || st.pat !== rs.call || st.used) { missRound(k, idx); return 'miss'; }
    if (rs.answered[k]) { st.shake = 0.15; return 'none'; }
    rs.answered[k] = true; st.used = true; st.glow = 1;
    game.audio.tone(st.pitch, 0.3, { wave: 'square', volume: 0.12 });
    if (Math.abs(off) <= PERFECT_W) { perfects++; score += 100; game.feedback.good(st.x, st.y - 110, { text: 'PERFECT', color: C.amber, size: 50, count: 10, volume: 0.25 }); }
    else { goods++; score += 50; game.feedback.good(st.x, st.y - 110, { text: 'GOOD', color: C.water, size: 44, count: 6, volume: 0.2 }); }
    var all = true;
    for (var j = 0; j < 4; j++) if (PATS[rs.call][j] && !rs.answered[j]) all = false;
    if (all) {
      rs.done = true; pairs++;
      score += 200 + r * 50;
      for (var s = 0; s < stones.length; s++) if (stones[s].used) game.fx.burst(stones[s].x, stones[s].y, { color: C.water, count: 14, speed: 320 });
      if (!demoMode && pairs === 2 && !milestone) {
        milestone = true;
        game.audio.play('se_milestone', 0.45);
        game.fx.popup(pairs + ' / ' + ROUND_CFG.length, W / 2, H * 0.25, { color: C.amber, size: 76 });
      }
    }
    return 'ok';
  }

  function finish(ok) {
    if (over) return;
    over = true; won = ok; outroT = 1.6; running = false;
    game.audio.stopBgm();
    if (ok) {
      score += pairs * 100;
      game.audio.play('se_success', 0.55);
      for (var i = 0; i < 4; i++) game.fx.burst(game.random(200, 880), game.random(700, 1200), { color: i % 2 ? C.water : C.amber, count: 20, speed: 420 });
    } else {
      game.audio.play('se_failure', 0.5);
    }
  }

  function nearestStone(x, y) {
    var best = -1, bd = 140;
    for (var i = 0; i < stones.length; i++) {
      var d = Math.hypot(x - stones[i].x, y - stones[i].y);
      if (d < bd) { bd = d; best = i; }
    }
    return best;
  }

  // ---- 入力 ----
  game.onPress(function(x, y) {
    if (state !== S.PLAYING || over || readyT > 0) return;
    var idx = nearestStone(x, y);
    if (idx < 0) { game.audio.tone(140, 0.04, { wave: 'square', volume: 0.04 }); return; }
    var res = hitStone(idx);
    if (res === 'ok') game.audio.play('se_tap', 0.2);
    else if (res === 'none') game.audio.tone(180, 0.05, { wave: 'square', volume: 0.05 });
  });
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(false); return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.3); state = S.ATTRACT; initGame(true); demo.t = 0; return; }
  });

  // ---- 描画 ----
  function label(str, x, y, sz, col, align) {
    game.draw.text(str, x + 4, y + 4, { size: sz, color: C.black, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: col, bold: true, align: align || 'center' });
  }

  var SPIRIT = [
    ['....cc....', '...cccc...', '..cccccc..', '.cccccccc.', '.cwkccwkc.', 'cccccccccc', 'cccckkcccc', '.cccccccc.', '..cccccc..'],
    ['....cc....', '...cccc...', '..cccccc..', '.cccccccc.', '.cwkccwkc.', 'cccccccccc', 'ccckkkkccc', '.ccckkccc.', '..cccccc..'],
  ];
  var SPAL = { c: C.water, w: C.white, k: C.black };
  var STONE = ['...gg...', '..gggg..', '..ggwg..', '.gggggg.', '.gggggg.', 'gggggggg', 'gggggggg', '.gggggg.'];
  var GIRL = [
    ['...yyyy...', '..yyyyyy..', '.yyyyyyyyl', '..hsssshh.', '..sksks...', '...sss....', '..oooooo..', '.oooooooo.', '.s.oooo.s.', '...oooo...', '...o..o...', '..bb..bb..'],
    ['...yyyy...', '..yyyyyy..', '.yyyyyyyyl', '..hsssshh.', '..sksks...', '...sss...s', '..oooooo.s', '.ooooooos.', '.s.oooo...', '...oooo...', '..o....o..', '.bb....bb.'],
  ];
  var GPAL = { y: C.amber, l: C.white, h: '#7c3c00', s: '#fcbcb0', k: C.black, o: C.red, b: '#7c3c00' };

  function drawCave(dt) {
    // タイル反復の岩壁(下へゆっくり1方向スクロール)
    tileOff = (tileOff + dt * 24) % 64;
    game.draw.gradient(0, H, [[0, C.cave2], [1, C.black]]);
    for (var ty = -1; ty < 31; ty++) {
      for (var tx = 0; tx < 17; tx++) {
        var y = ty * 64 + tileOff;
        if ((tx + ty) % 2 === 0) game.draw.rect(tx * 64, y, 64, 64, C.cave, 0.4);
        if ((tx * 7 + ty * 3) % 5 === 0) game.draw.rect(tx * 64 + 16, y + 24, 16, 16, C.black, 0.6);
      }
    }
    // 鍾乳石(上から段々に細くなる矩形)
    for (var i = 0; i < 6; i++) {
      var sx = 60 + i * 190;
      for (var s = 0; s < 5; s++) game.draw.rect(sx + s * 8, 230 + s * 40, 64 - s * 16, 40, C.grey);
    }
    // 精霊の泉と精霊
    var t = game.time.elapsed;
    game.draw.rect(W / 2 - 220, 500, 440, 40, C.water);
    game.draw.rect(W / 2 - 180, 540, 360, 16, C.cave);
    if (spiritT > 0) { var k = 1 - spiritT / 0.3; game.draw.circle(W / 2, 515, 30 + k * 160, C.white, 0.4 * (1 - k)); }
    game.draw.sprite(SPIRIT[spiritT > 0 ? 1 : 0], SPAL, W / 2, 400 + Math.sin(t * 2.4) * 10, 14, { anchor: 'center' });
    if (spiritT > 0) game.draw.rect(W / 2 - 8, 470 + (0.3 - spiritT) * 100, 16, 24, C.white);
  }

  function drawCells(cx, cy, size, gap, pat, upto, col, bgCol) {
    var w = 4 * size + 3 * gap;
    for (var k = 0; k < 4; k++) {
      var x = cx - w / 2 + k * (size + gap);
      game.draw.rect(x, cy - size / 2, size, size, bgCol);
      if (pat[k] && k <= upto) game.draw.rect(x + 4, cy - size / 2 + 4, size - 8, size - 8, col);
    }
  }

  function drawStones() {
    var rel = relBeat();
    var upto = running ? Math.min(3, rel) : (over ? 3 : -1);
    for (var i = 0; i < stones.length; i++) {
      var st = stones[i];
      var sx = st.x + (st.shake > 0 ? Math.sin(st.shake * 80) * 10 : 0);
      var sy = st.y + (1 - st.rise) * 80;
      var lit = st.glow > 0;
      var hl = flashT > 0 && st.shake > 0 && Math.abs(st.x - flashX) < 2;
      var pal = hl ? { g: C.white, w: C.white } : (st.used ? { g: C.amber, w: C.white } : (lit ? { g: C.water, w: C.white } : { g: C.grey, w: '#bcbcbc' }));
      game.draw.rect(sx - 70, sy + 50, 140, 16, C.black);
      game.draw.sprite(STONE, pal, sx, sy, hl ? 22 : 18, { anchor: 'center' });
      drawCells(sx, sy + 108, 36, 8, PATS[st.pat], upto, st.used ? C.amber : C.water, C.dim);
    }
  }

  function drawRows() {
    var rel = relBeat();
    var callUpto = running ? Math.min(3, rel) : (over ? 3 : -1);
    game.draw.rect(W / 2 - 220, CALL_Y - 56, 440, 124, C.black, 0.85);
    game.draw.rect(40, 780, W - 80, 540, C.black, 0.7);
    game.draw.rect(W / 2 - 250, ANS_Y - 66, 500, 132, C.black, 0.85);
    // お手本の型(精霊の滴)
    drawCells(W / 2, CALL_Y, 70, 22, PATS[rs.call], callUpto, C.white, C.cave2);
    if (running && rel >= 0 && rel < 4) game.draw.rect(W / 2 - 173 + rel * 92, CALL_Y + 46, 70, 10, C.amber);
    // 返しの小節
    var cs = 90, gap = 20, w = 4 * cs + 3 * gap;
    for (var k = 0; k < 4; k++) {
      var x = W / 2 - w / 2 + k * (cs + gap);
      var hit = PATS[rs.call][k];
      var cur = running && rel - 4 === k;
      var soon = running && hit && !rs.answered[k] && !rs.failed && songT > ansHead(k) - SPB * 0.5 && songT < ansHead(k);
      game.draw.rect(x, ANS_Y - cs / 2, cs, cs, cur ? C.grey : C.cave2);
      if (hit && rel >= 3) game.draw.rect(x + 8, ANS_Y - cs / 2 + 8, cs - 16, cs - 16, rs.answered[k] ? C.amber : (soon && Math.floor(game.time.elapsed * 14) % 2 === 0 ? C.white : C.dim));
      if (rs.failed && rs.failCell === k) game.draw.rect(x + 20, ANS_Y - 10, cs - 40, 20, C.red);
    }
  }

  function drawGirl() {
    var t = game.time.elapsed;
    var y = H * 0.845 + Math.sin(t * 3) * 4 - (girlT > 0 ? 10 : 0);
    game.draw.rect(W / 2 - 90, H * 0.845 + 80, 180, 16, C.black);
    game.draw.sprite(GIRL[girlT > 0 ? 1 : 0], GPAL, W / 2, y, 14, { anchor: 'center' });
    // ヘルメットの灯り
    game.draw.circle(W / 2 + 70, y - 60, 30 + Math.sin(t * 5) * 4, C.amber, 0.25);
  }

  function drawFlash() {
    if (flashT <= 0) return;
    var k = flashT / 0.42;
    game.draw.circle(flashX, flashY, 60 + (1 - k) * 140, C.white, 0.7 * k);
  }

  function drawScene(dt) {
    drawCave(dt);
    drawRows();
    drawStones();
    drawGirl();
    drawFlash();
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 230, C.black);
    label('SCORE ' + score, 60, 96, 52, C.white, 'left');
    label('BEST ' + prevBest, 60, 172, 32, C.grey, 'left');
    label(Math.min(r + 1, ROUND_CFG.length) + ' / ' + ROUND_CFG.length, W - 60, 96, 56, C.water, 'right');
    for (var i = 0; i < MISS_MAX; i++) game.draw.rect(W - 250 + i * 70, 150, 40, 40, i < misses ? C.red : C.dim);
    var progress = Math.min(1, songT / (ROUND_CFG.length * ROUND_BEATS * SPB));
    game.draw.rect(0, 220, W, 10, C.cave);
    game.draw.rect(0, 220, W * progress, 10, C.amber);
  }

  // ---- ATTRACT: 実ロジックで1回目は正しい対を拍の頭に、2回目は似た型の石を叩いてMISS、3回目はまた揃える ----
  var demo = { t: 0, press: false, hx: W / 2, hy: H * 0.6 };
  var DEMO_LEN = 3 * ROUND_BEATS * SPB + 0.3;
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % DEMO_LEN;
    if (cyc < dt || demo.t <= dt) { initGame(true); demo.hx = W / 2; demo.hy = H * 0.6; }
    demo.press = false;
    var nt = songT + dt;
    var target = -1, when = 1e9;
    if (!rs.failed && !rs.done) {
      for (var k = 0; k < 4; k++) {
        if (PATS[rs.call][k] && !rs.answered[k]) { when = ansHead(k); break; }
      }
      // 次に叩く石: 正しい対のうち未使用のもの。2回目だけは型の似た別の石を選ぶ
      for (var i = 0; i < stones.length; i++) {
        var good = stones[i].pat === rs.call && !stones[i].used;
        var wrong = stones[i].pat !== rs.call;
        if ((r === 1 && wrong) || (r !== 1 && good)) { target = i; break; }
      }
    }
    if (target >= 0 && relBeat() >= 3) {
      demo.hx += (stones[target].x + 20 - demo.hx) * Math.min(1, dt * 8);
      demo.hy += (stones[target].y + 30 - demo.hy) * Math.min(1, dt * 8);
      if (nt >= when - 0.01 && hitStop <= 0) { hitStone(target); demo.press = true; }
    } else {
      demo.hx += (W / 2 + 160 - demo.hx) * Math.min(1, dt * 3);
      demo.hy += (H * 0.6 - demo.hy) * Math.min(1, dt * 3);
    }
    stepPlay(dt);
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;
    if (spiritT > 0) spiritT -= dt;
    if (girlT > 0) girlT -= dt;
    if (hitStop > 0) hitStop -= dt;
    if (flashT > 0) flashT -= dt;

    if (state === S.ATTRACT) {
      stepDemo(dt);
      drawScene(dt);
      game.draw.hand(demo.hx, demo.hy, { press: demo.press, scale: 15 });
      game.draw.rect(0, 0, W, 230, C.black);
      label(GAME_TITLE, W / 2, 112, 80 + Math.sin(t * 3) * 3, C.water);
      label('HI-SCORE ' + (game.best > 0 ? game.best : 0), W / 2, 192, 36, C.amber);
      if (Math.floor(t * 2) % 2 === 0) label('► 100円 投入 ◄', W / 2, H * 0.775, 50, C.amber);
      else label('TAP TO START', W / 2, H * 0.775, 44, C.white);
      return;
    }

    if (state === S.RESULT) {
      drawScene(dt);
      game.draw.rect(0, H * 0.27, W, H * 0.3, C.black, 0.9);
      label(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.33, 100, won ? C.water : C.red);
      label('SCORE ' + score, W / 2, H * 0.39, 56, C.white);
      label('PERFECT ' + perfects + '  GOOD ' + goods + '  MISS ' + misses, W / 2, H * 0.435, 36, C.amber);
      if (won && score > prevBest) label('NEW RECORD', W / 2, H * 0.49, 50, C.amber);
      else label('BEST ' + Math.max(prevBest, won ? score : 0), W / 2, H * 0.49, 38, C.grey);
      if (!won) label('あと' + Math.max(1, ROUND_CFG.length - pairs) + '対!', W / 2, H * 0.25, 56, C.amber);
      if (Math.floor(t * 2) % 2 === 0) label('TAP TO CONTINUE', W / 2, H * 0.55, 36, C.white);
      return;
    }

    // ---- PLAYING ----
    if (over) {
      outroT -= dt;
      if (outroT <= 0) {
        state = S.RESULT;
        var stats = { score: score, pairs: pairs, perfect: perfects, good: goods, miss: misses };
        if (won) game.end.success(score, stats);
        else game.end.failure(stats);
      }
    } else if (readyT > 0) {
      readyT -= dt;
      if (readyT <= 0) startClock();
    } else {
      stepPlay(dt);
    }

    drawScene(dt);
    drawHud();
    if (readyT > 0) label(readyT > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 110, C.amber);
    if (over && won) label('FINISH', W / 2, H * 0.5, 100, C.amber);
  });

  game.onStart(function() {
    state = S.ATTRACT;
    initGame(true);
  });
})(game);
