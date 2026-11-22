// K-DS-0026v2-moving-truck-box-stack.js
// 引っ越し荷台の積み上げ — 拍の頭ごとに滑車で吊った段ボールを落として荷台へ積み、崩さずに荷台の縁まで積み上げる。満杯になるとトラックが入れ替わり、箱は小さく拍は詰まる
// 操作: 画面下の大きなレバー(道路より下ならどこでも)を押すと、頭上の滑車に吊った段ボールが真下へ落ちる。滑車は積み山の真上を左右に振れ、拍の頭でちょうど真上を通る。拍の頭からのずれが小さいほど真っすぐ積め(PERFECT/GOOD)、ずれ過ぎる(MISS)と箱は山の端から転げ落ちる。押さずに拍を見送っても箱は地面へ落ちる。箱の無い拍(拍ランプが灰色)に押しても何も起きない
// 終わり: 3台(前奏1小節+20秒・22箱、1台目は2拍に1箱→2・3台目は毎拍)を積み切ってMISS 3回以内ならCLEAR(判定の点×連続ボーナス+満杯の荷台ボーナス)。MISS 4回で荷崩れしてGAME OVER
// @mechanic: stack
// @theme: moving_truck_box_stack
// 世界観: 引っ越しの朝、家の前に横付けしたトラックの荷台で、作業員が滑車で吊った段ボールを拍ごとに落とし、崩さず荷台の縁まで積み上げては次のトラックを送り出す
// 残るもの: 正誤(CLEAR/GAME OVER) + スコア・PERFECT/GOOD/MISS数・最大コンボ・満杯にした荷台の台数
// スタイル: VOXEL BLOCK

(function(game) {
  var STYLE = { bg: ['#bfe6ff', '#fff2d6', '#cbb89a'], main: ['#ecc88e', '#c99a5a', '#94692f'], accent: ['#ffcf3a', '#36b3a8'] };
  var W = game.canvas.width;
  var H = game.canvas.height;

  // VOXEL BLOCK: 箱・トラック・家並みをすべて上面(明)/正面(中)/側面(暗)の3明度の立方体で描く。影は落とさない
  var C = { sky: STYLE.bg[0], haze: STYLE.bg[1], ground: STYLE.bg[2], gold: STYLE.accent[0], teal: STYLE.accent[1], ink: '#2b2430', white: '#fffaf0', red: '#e4504e', road: '#7d766c' };
  var F_BOX = [STYLE.main[0], STYLE.main[1], STYLE.main[2]];
  var F_TRUCK = [['#8fe0d6', '#36b3a8', '#22766f'], ['#ffd27a', '#f0a030', '#b06f14'], ['#c6c8ff', '#7b80e8', '#4f53a8']];
  var F_DIM = ['#c9c2b6', '#a29b90', '#7a746a'];
  var F_RED = ['#ff9a90', C.red, '#a52e2c'];
  var F_GOLD = ['#fff0a8', C.gold, '#c79a12'];
  var F_HOUSE = [['#f6ead6', '#dccaa9', '#ae9b78'], ['#e8f0f8', '#bfcedc', '#8e9fb2'], ['#f8dcd2', '#dcb0a4', '#ab7e72']];
  var F_ROOF = ['#d8785e', '#ac5642', '#7e3c2e'];
  var F_RAIL = ['#a9b2bc', '#78818b', '#525a63'];
  var F_CLOUD = ['#ffffff', '#eef6ff', '#d4e4f2'];

  var GAME_TITLE = 'TRUCK STACK';
  var BPM = 120;
  var SPB = 60 / BPM;
  var LEAD = 0.06;
  var TOTAL_BEATS = 40;        // 前奏1小節 + 9小節 = 20秒
  var MISS_MAX = 4;
  var SKIP_AFTER = 0.22;       // 拍の頭からこれだけ過ぎても落とさなければ見送り
  // 3台のトラック: 1台目は大箱を2拍に1つ、2・3台目は小箱を毎拍。3台目は箱がさらに細く窓が狭い
  var TRUCKS = [
    { from: 4, to: 16, every: 2, bw: 200, bh: 110, perfect: 0.055, good: 0.12 },
    { from: 20, to: 28, every: 1, bw: 160, bh: 82.5, perfect: 0.05, good: 0.11 },
    { from: 32, to: 40, every: 1, bw: 140, bh: 82.5, perfect: 0.045, good: 0.095 }
  ];
  var DEMO_BEATS = 16;
  var DEMO_LATE = 10;          // デモはこの拍をわざと遅らせて箱が転げ落ちるのを見せる

  var CX = 540, FLOOR_Y = 1360, BED_L = 268, BED_R = 812, RIM_Y = 700;
  var RAIL_Y = 446, HANG = 150, LAMP_Y = 318, PAD_TOP = 1300;

  // オリジナル伴奏(C-Am-F-G の8分アルペジオ + 四分のベース)
  var MEL = [
    ['E5', 'G5', 'C6', 'G5', 'A5', 'G5', 'E5', 'D5'],
    ['C5', 'E5', 'A5', 'E5', 'G5', 'E5', 'C5', 'B4'],
    ['A4', 'C5', 'F5', 'C5', 'E5', 'F5', 'A5', 'G5'],
    ['G4', 'B4', 'D5', 'G5', 'F5', 'D5', 'B4', 'D5']
  ];
  var BASS = [['C3', 'G2', 'C3', 'G2'], ['A2', 'E2', 'A2', 'E2'], ['F2', 'C3', 'F2', 'C3'], ['G2', 'D3', 'G2', 'B2']];

  // ---- 作業員(帽子・顔・つなぎ) ----
  var WK_A = ['..cccc..', '.cccccc.', '..ssss..', '..sese..', '..ssss..', '.oooooo.', 'soooooos', '..oooo..', '..pppp..', '..p..p..'];
  var WK_B = ['..cccc..', '.cccccc.', '..ssss..', '..sese..', '..ssss..', '.oooooo.', 'soooooos', '..oooo..', '..pppp..', '.p....p.'];
  var WK_PULL = ['..cccc..', '.cccccc.', '..ssss..', '..sese..', '..ssss..', 'soooooos', '.oooooo.', '..oooo..', '..pppp..', '..p..p..'];
  var WK_OOPS = ['s.cccc.s', '.cccccc.', '..ssss..', '.seesee.', '..ssss..', '.oooooo.', '.oooooo.', '..oooo..', '..pppp..', '.p....p.'];
  var PAL_W = { c: C.teal, s: '#f2c49a', e: C.ink, o: '#f08a2c', p: '#3d4a6a' };
  var PAL_FLASH = { c: C.white, s: C.white, e: C.white, o: C.white, p: C.white };

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var demoMode, endBeats, running, songT, beatN, schedB, readyT, hitStop, flashT, beatPulse;
  var done, stacks, fallers, pile, score, perfects, goods, misses, combo, maxCombo, fullTrucks, judged;
  var over, won, outroT, prevBest, comboPop, hornDone, railX, leverT, oopsT;

  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function ease(p) { p = clamp(p, 0, 1); return p * p * (3 - 2 * p); }

  function dropTruck(b) {
    if (demoMode && b >= DEMO_BEATS) return -1;
    for (var k = 0; k < TRUCKS.length; k++) {
      var T = TRUCKS[k];
      if (b >= T.from && b < T.to && (b - T.from) % T.every === 0) return k;
    }
    return -1;
  }
  function dropCount(k) { return Math.ceil((TRUCKS[k].to - TRUCKS[k].from) / TRUCKS[k].every); }
  function totalDrops() { var n = 0; for (var k = 0; k < TRUCKS.length; k++) n += dropCount(k); return n; }
  function swapIndex(b) {
    for (var k = 0; k < TRUCKS.length - 1; k++) if (b >= TRUCKS[k].to && b < TRUCKS[k + 1].from) return k;
    return -1;
  }
  // 見えているトラックと横ずれ(入れ替えの小節は左へ走り去り、次の車が右から入る)
  function truckView() {
    var bt = songT / SPB;
    for (var k = 0; k < TRUCKS.length - 1; k++) {
      var s = TRUCKS[k].to, e = TRUCKS[k + 1].from;
      if (bt < s) return { k: k, off: 0 };
      if (bt < e) {
        var p = (bt - s) / (e - s);
        if (p < 0.45) return { k: k, off: -ease(p / 0.45) * 1250 };
        return { k: k + 1, off: (1 - ease((p - 0.45) / 0.55)) * 1250 };
      }
    }
    return { k: TRUCKS.length - 1, off: 0 };
  }
  function topX(k) { var st = stacks[k]; return st.length ? st[st.length - 1].x : CX; }
  function swingAmp(k) { return TRUCKS[k].bw * 0.75; }
  function carriageX() { var v = truckView(); return railX + swingAmp(v.k) * Math.sin(Math.PI * songT / SPB); }
  function nextDrop() {
    for (var b = Math.max(0, beatN - 1); b < endBeats; b++) if (dropTruck(b) >= 0 && !done[b]) return b;
    return -1;
  }

  function initGame(isDemo) {
    demoMode = !!isDemo;
    endBeats = demoMode ? DEMO_BEATS : TOTAL_BEATS;
    running = false; songT = 0; beatN = 0; schedB = 0;
    readyT = demoMode ? 0 : 0.8;
    hitStop = 0; flashT = 0; beatPulse = 0;
    done = {}; stacks = [[], [], []]; fallers = []; pile = [];
    score = 0; perfects = 0; goods = 0; misses = 0; combo = 0; maxCombo = 0; fullTrucks = 0; judged = 0;
    over = false; won = false; outroT = 0; prevBest = game.best; comboPop = false; hornDone = {};
    railX = CX; leverT = 0; oopsT = 0;
    if (demoMode) startClock();
  }

  function startClock() { running = true; songT = 0; beatN = 0; schedB = 0; beatPulse = 1; }

  function sfx(id, v) { if (!demoMode) game.audio.play(id, v); }
  function sfxTone(f, d, o) { if (!demoMode) game.audio.tone(f, d, o); }

  // 伴奏は拍クロックから1拍ずつ積む。入れ替えの小節はメロディの代わりにバック誘導の電子音
  function playBeatMusic(b) {
    if (demoMode) return;
    var bar = Math.floor(b / 4) % 4, i = b % 4;
    var swap = swapIndex(b) >= 0;
    var mel = b < 4 ? [['R', 1]] : (swap ? [['B5', 0.2], ['R', 0.8]] : [[MEL[bar][i * 2], 0.5], [MEL[bar][i * 2 + 1], 0.5]]);
    game.audio.melody(mel, { tempo: BPM, wave: swap ? 'sine' : 'square', volume: swap ? 0.05 : 0.035, bass: [[BASS[bar][i], 0.45], ['R', 0.55]], bassWave: 'triangle', bassVolume: 0.12 });
  }

  function horn() {
    sfxTone(311, 0.28, { wave: 'square', volume: 0.06 });
    sfxTone(392, 0.28, { wave: 'square', volume: 0.05 });
  }

  // ---- 拍クロック(1本だけ) ----
  function stepPlay(dt) {
    if (!running) return;
    songT += dt;
    while (schedB < endBeats && songT >= schedB * SPB - LEAD) { playBeatMusic(schedB); schedB++; }
    while (songT >= (beatN + 1) * SPB) { beatN++; beatPulse = 1; }
    // 予告: トラックが出る0.6秒前にクラクションとランプ点滅
    for (var k = 0; k < TRUCKS.length - 1; k++) {
      if (!demoMode && !hornDone[k] && songT >= TRUCKS[k].to * SPB - 0.6) { hornDone[k] = true; horn(); }
    }
    // 見送った箱は手からすべって地面へ
    for (var b = Math.max(0, beatN - 2); b <= beatN; b++) {
      var kk = dropTruck(b);
      if (kk < 0 || done[b] || songT <= b * SPB + SKIP_AFTER) continue;
      done[b] = 'skip'; judged++;
      var cx = carriageX();
      missBox(kk, cx, RAIL_Y + HANG + TRUCKS[kk].bh * 0.5, cx >= topX(kk) ? 1 : -1);
      if (over) return;
    }
    if (songT >= endBeats * SPB + 0.15) {
      running = false;
      if (!demoMode && !over) finish(misses < MISS_MAX);
    }
  }

  function missBox(k, x, y, dir) {
    var T = TRUCKS[k];
    fallers.push({ x: x, y: y, vx: dir * 420, vy: -420, w: T.bw, h: T.bh, flash: 0.4 });
    misses++; combo = 0; oopsT = 0.7;
    hitStop = 0.38; flashT = 0.38;
    sfx('se_break', 0.45);
    if (demoMode) { game.fx.popup('MISS', x, y - 90, { color: C.red, size: 58 }); game.fx.shake(5, 0.2); }
    else game.feedback.bad(x, y - 90, { text: 'MISS', shake: 10 });
    if (!demoMode && misses >= MISS_MAX) collapse(k);
  }

  // 4回目のMISSで荷崩れ: 積んだ箱が全部転げ落ちる
  function collapse(k) {
    var T = TRUCKS[k], st = stacks[k];
    for (var i = st.length - 1; i >= 0; i--) {
      fallers.push({ x: st[i].x, y: FLOOR_Y - (i + 0.5) * T.bh, vx: (i % 2 ? 1 : -1) * (200 + i * 40), vy: -300 - i * 30, w: T.bw, h: T.bh, flash: 0.4 });
    }
    stacks[k] = [];
    game.fx.shake(14, 0.4);
    finish(false);
  }

  function dropAction() {
    if (!running || hitStop > 0 || over) return 'none';
    var b = Math.round(songT / SPB);
    var k = dropTruck(b);
    if (k < 0 || done[b]) return 'none';
    var T = TRUCKS[k];
    var off = songT - b * SPB, a = Math.abs(off);
    var w = a <= T.perfect ? 'PERFECT' : (a <= T.good ? 'GOOD' : 'MISS');
    done[b] = w; judged++;
    leverT = 0.18;
    var top = topX(k);
    var x = top + swingAmp(k) * Math.sin(Math.PI * songT / SPB);
    if (w === 'MISS') { missBox(k, x, RAIL_Y + HANG + T.bh * 0.5, x >= top ? 1 : -1); return 'miss'; }
    x = clamp(x, BED_L + T.bw / 2, BED_R - T.bw / 2);
    stacks[k].push({ x: x, fall: 0.14 });
    combo++; if (combo > maxCombo) maxCombo = combo;
    var mult = 1 + Math.floor(combo / 6) * 0.5;
    score += Math.round((w === 'PERFECT' ? 100 : 50) * mult);
    if (w === 'PERFECT') perfects++; else goods++;
    var ly = FLOOR_Y - stacks[k].length * T.bh;
    var col = w === 'PERFECT' ? C.gold : C.teal;
    if (demoMode) game.fx.popup(w, x, ly - 30, { color: col, size: 46 });
    else game.feedback.good(x, ly - 30, { text: w, color: col, size: w === 'PERFECT' ? 52 : 44, count: 10, volume: 0.15 });
    sfxTone(w === 'PERFECT' ? 'C4' : 'G3', 0.12, { wave: 'triangle', volume: 0.12 });
    if (stacks[k].length === dropCount(k)) {
      // 荷台が縁まで満杯
      fullTrucks++; score += 300;
      sfx('se_milestone', 0.5);
      game.fx.popup('BONUS +300', W / 2, RIM_Y - 110, { color: C.gold, size: 66 });
      game.fx.burst(CX, RIM_Y, { color: C.gold, count: 22, speed: 420 });
    } else if (!demoMode && combo === 10 && !comboPop) {
      comboPop = true;
      sfx('se_milestone', 0.45);
      game.fx.popup('10 COMBO', W / 2, RIM_Y - 110, { color: C.teal, size: 70 });
    }
    return 'ok';
  }

  function finish(ok) {
    if (over) return;
    over = true; won = ok; outroT = 2.3; running = false;
    if (ok) {
      score += (MISS_MAX - 1 - misses) * 100;
      game.audio.play('se_success', 0.55);
      for (var i = 0; i < 5; i++) game.fx.burst(game.random(180, 900), game.random(600, 1100), { color: i % 2 ? C.gold : C.teal, count: 18, speed: 420 });
    } else {
      game.audio.play('se_failure', 0.5);
    }
  }

  function tickWorld(dt) {
    if (hitStop > 0) { hitStop -= dt; return; }
    stepPlay(dt);
    var v = truckView();
    railX += (topX(v.k) - railX) * Math.min(1, dt * 9);
    for (var k = 0; k < stacks.length; k++) for (var i = 0; i < stacks[k].length; i++) if (stacks[k][i].fall > 0) stacks[k][i].fall -= dt;
    for (var j = fallers.length - 1; j >= 0; j--) {
      var f = fallers[j];
      if (f.flash > 0) f.flash -= dt;
      f.vy += 2600 * dt; f.x += f.vx * dt; f.y += f.vy * dt;
      if (f.y >= 1440) { pile.push(clamp(f.x, 60, W - 60)); fallers.splice(j, 1); }
    }
    if (leverT > 0) leverT -= dt;
    if (oopsT > 0) oopsT -= dt;
  }

  // ---- 入力 ----
  game.onPress(function(x, y) {
    if (state !== S.PLAYING || over || readyT > 0) return;
    if (y < PAD_TOP) { game.audio.tone(330, 0.04, { wave: 'triangle', volume: 0.03 }); return; }
    var r = dropAction();
    if (r === 'none') { leverT = 0.12; game.audio.play('se_tap', 0.2); }
  });
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(false); return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.3); state = S.ATTRACT; initGame(true); demo.t = 0; return; }
  });

  // ---- 描画: 斜め見下ろしのボクセル ----
  // (x = 正面の中心, yb = 正面の下端, w/h = 正面の幅/高さ, d = 奥行き, f = [上面, 正面, 側面])
  function vox(x, yb, w, h, d, f) {
    var x0 = x - w / 2, yt = yb - h, dx = d * 0.6, dy = d * 0.45, st = 3, i;
    for (i = 0; i < dx; i += st) game.draw.rect(x0 + w + i, yt - dy * (i / dx), st + 0.5, h, f[2]);
    for (i = 0; i < dy; i += st) game.draw.rect(x0 + dx * (i / dy), yt - i - st, w, st + 0.5, f[0]);
    game.draw.rect(x0, yt, w, h, f[1]);
  }
  function label(str, x, y, sz, col, align) {
    game.draw.text(str, x + 3, y + 4, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: col, bold: true, align: align || 'center' });
  }

  function drawStreet() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, C.sky], [0.4, C.haze], [0.64, '#e4d6bc'], [1, C.ground]]);
    for (var c = 0; c < 3; c++) {
      var cx = ((c * 420 + t * 26) % 1500) - 200;
      vox(cx, 520 + c * 40, 150, 34, 40, F_CLOUD);
      vox(cx + 70, 500 + c * 40, 90, 30, 40, F_CLOUD);
    }
    for (var i = 0; i < 5; i++) {
      var hx = 110 + i * 215, hh = 380 + (i % 3) * 80;
      vox(hx, 1190, 186, hh, 60, F_HOUSE[i % 3]);
      vox(hx, 1190 - hh, 200, 40, 60, F_ROOF);
      for (var r = 0; r < 3; r++) {
        game.draw.rect(hx - 64, 1190 - hh + 60 + r * 110, 42, 58, '#7fb6d8');
        game.draw.rect(hx + 22, 1190 - hh + 60 + r * 110, 42, 58, '#7fb6d8');
      }
    }
    game.draw.rect(0, 1190, W, 36, '#ddd0ba');
    game.draw.rect(0, 1226, W, 254, C.road);
    for (var s = 0; s < 6; s++) game.draw.rect(s * 200 + 40, 1452, 110, 10, '#e8e0cc');
  }

  function drawBox(x, yb, bw, bh, flash, scale) {
    var sc = scale || 1;
    var f = flash ? [C.white, C.white, '#ffe0d8'] : F_BOX;
    vox(x, yb, (bw - 8) * sc, (bh - 6) * sc, 44 * sc, f);
    if (!flash) {
      game.draw.rect(x - 7 * sc, yb - (bh - 6) * sc, 14 * sc, (bh - 6) * sc, '#b07c3e', 0.7);
      game.draw.rect(x - 26 * sc, yb - (bh - 6) * sc * 0.55, 52 * sc, 10 * sc, '#7a5426', 0.6);
    }
  }

  function drawTruck(k, ox) {
    var f = F_TRUCK[k], T = TRUCKS[k];
    var honk = !demoMode && running && swapIndex(Math.floor(songT / SPB + 0.6 / SPB)) === k && Math.floor(game.time.elapsed * 12) % 2 === 0;
    // 運転席
    vox(150 + ox, FLOOR_Y + 40, 150, 330, 40, f);
    game.draw.rect(96 + ox, FLOOR_Y - 270, 110, 110, '#bfe8ff');
    game.draw.rect(96 + ox, FLOOR_Y - 270, 110, 18, '#ffffff', 0.6);
    game.draw.rect(84 + ox, FLOOR_Y - 24, 28, 22, honk ? C.gold : '#fff6c8');
    // 荷台の奥の壁・床・左右の壁
    game.draw.rect(BED_L - 6 + ox, RIM_Y - 26, BED_R - BED_L + 44, FLOOR_Y - RIM_Y + 4, f[2]);
    for (var l = 0; l < 6; l++) game.draw.rect(BED_L + 4 + ox, RIM_Y + 30 + l * 110, BED_R - BED_L + 24, 6, f[1], 0.5);
    vox(CX + ox, FLOOR_Y + 40, BED_R - BED_L + 64, 40, 40, f);
    vox(BED_L - 16 + ox, FLOOR_Y, 32, FLOOR_Y - RIM_Y, 40, f);
    // 積み山
    var st = stacks[k];
    var hangB = RAIL_Y + HANG + T.bh;
    for (var i = 0; i < st.length; i++) {
      var yb = FLOOR_Y - i * T.bh;
      if (st[i].fall > 0) yb = hangB + (yb - hangB) * (1 - st[i].fall / 0.14);
      drawBox(st[i].x + ox, yb, T.bw, T.bh, false, 1);
    }
    vox(BED_R + 16 + ox, FLOOR_Y, 32, FLOOR_Y - RIM_Y, 40, f);
    // 縁(ゴール線): 残り2箱から点滅
    var near = st.length >= dropCount(k) - 2;
    var pulse = near ? 0.5 + 0.5 * Math.sin(game.time.elapsed * 12) : 0.35;
    for (var d = BED_L; d < BED_R; d += 44) game.draw.rect(d + ox, RIM_Y - 4, 26, 8, C.gold, pulse);
    if (st.length >= dropCount(k)) game.draw.rect(BED_L + ox, RIM_Y - 10, BED_R - BED_L, 20, C.gold, 0.6);
    // 車輪
    var wx = [180, 430, 720];
    for (var w = 0; w < 3; w++) {
      game.draw.circle(wx[w] + ox, FLOOR_Y + 74, 50, '#2e2a30');
      game.draw.circle(wx[w] + ox, FLOOR_Y + 74, 20, '#a9b2bc');
    }
  }

  function drawCarriage() {
    var v = truckView(), T = TRUCKS[v.k];
    var cx = running || over ? carriageX() : railX;
    var bob = beatPulse * 8;
    vox(CX, RAIL_Y, 900, 22, 24, F_RAIL);
    vox(CX - 440, RAIL_Y + 300, 30, 300, 24, F_RAIL);
    vox(CX + 440, RAIL_Y + 300, 30, 300, 24, F_RAIL);
    vox(cx, RAIL_Y + 34, 96, 30, 24, F_RAIL);
    var art = oopsT > 0 ? WK_OOPS : (leverT > 0 ? WK_PULL : (beatN % 2 ? WK_B : WK_A));
    var fl = flashT > 0 && Math.floor(flashT * 20) % 2 === 0;
    game.draw.sprite(art, fl ? PAL_FLASH : PAL_W, cx, RAIL_Y - 64 - bob, 12, { anchor: 'center' });
    var nb = nextDrop();
    var hasBox = !over && nb >= 0 && nb * SPB - songT < 1.1 && (running || demoMode);
    var st = stacks[v.k];
    if (st.length && st[st.length - 1].fall > 0) hasBox = false;
    var hangB = RAIL_Y + HANG + T.bh;
    game.draw.line(cx, RAIL_Y + 34, cx, hasBox ? hangB - T.bh + 6 : RAIL_Y + 120, '#4c454a', 5);
    if (hasBox) {
      drawBox(cx, hangB, T.bw, T.bh, false, 1);
      // 縮む枠: 拍の頭でちょうど箱の輪郭に重なる
      var tt = nb * SPB - songT;
      if (tt > 0 && tt < 1.0) {
        var m = 10 + 150 * tt;
        var x0 = cx - T.bw / 2 - m, y0 = hangB - T.bh - m, ww = T.bw + m * 2, hh = T.bh + m * 2;
        game.draw.rect(x0, y0, ww, 6, C.white, 0.85);
        game.draw.rect(x0, y0 + hh - 6, ww, 6, C.white, 0.85);
        game.draw.rect(x0, y0, 6, hh, C.white, 0.85);
        game.draw.rect(x0 + ww - 6, y0, 6, hh, C.white, 0.85);
      }
    }
  }

  function drawFallers() {
    for (var j = 0; j < fallers.length; j++) {
      var f = fallers[j];
      var fl = f.flash > 0;
      drawBox(f.x, f.y + f.h / 2, f.w, f.h, fl && hitStop > 0, fl && hitStop > 0 ? 1.2 : 0.9);
    }
    for (var p = 0; p < pile.length; p++) {
      var px = pile[p], lvl = 0;
      for (var q = 0; q < p; q++) if (Math.abs(pile[q] - px) < 70) lvl++;
      vox(px, 1478 - lvl * 40, 90, 40, 30, F_BOX);
    }
  }

  // 拍ランプ: 1小節4つ。箱の来る拍は段ボール色、来ない拍は灰色、入れ替えの拍は金色
  function drawLamps() {
    var bar = Math.floor(beatN / 4), cur = beatN % 4;
    for (var i = 0; i < 4; i++) {
      var b = bar * 4 + i;
      var f = dropTruck(b) >= 0 ? F_BOX : (swapIndex(b) >= 0 && !demoMode ? F_GOLD : F_DIM);
      var lift = running && i === cur ? beatPulse * 26 : 0;
      vox(300 + i * 160, LAMP_Y + 40 - lift, i === 0 ? 92 : 76, 40, 40, f);
      var r = done[b];
      if (r === 'PERFECT' || r === 'GOOD') game.draw.circle(300 + i * 160, LAMP_Y + 20 - lift, 12, C.white);
      else if (r) game.draw.circle(300 + i * 160, LAMP_Y + 20 - lift, 12, C.red);
    }
  }

  function drawLever(pressFromDemo) {
    var pressed = leverT > 0 || pressFromDemo;
    game.draw.rect(0, 1490, W, H - 1490, '#4d4741');
    for (var s = 0; s < 9; s++) game.draw.rect(s * 130, 1490, 6, H - 1490, '#5c564f');
    vox(CX, 1900, 760, 130, 60, F_RAIL);
    var nb = nextDrop();
    var soon = nb >= 0 && nb * SPB - songT < 0.6 && running;
    var h = pressed ? 70 : 110;
    vox(CX, 1770, 460, h, 70, soon ? F_GOLD : F_RED);
    if (soon) {
      var p = 0.5 + 0.5 * Math.sin(game.time.elapsed * 16);
      game.draw.rect(CX - 240, 1770 - h - 46, 480, 6, C.white, 0.5 + p * 0.5);
    }
  }

  function drawScene(pressFromDemo) {
    drawStreet();
    var v = truckView();
    drawTruck(v.k, v.off);
    drawCarriage();
    drawFallers();
    drawLamps();
    drawLever(pressFromDemo);
  }

  function drawHud() {
    var v = truckView();
    game.draw.rect(0, 0, W, 230, C.ink, 0.86);
    label('SCORE ' + score, 60, 96, 54, C.white, 'left');
    label('BEST ' + prevBest, 60, 168, 32, C.gold, 'left');
    vox(W - 300, 112, 70, 40, 30, F_TRUCK[v.k]);
    label((v.k + 1) + ' / 3', W - 60, 104, 52, C.teal, 'right');
    for (var i = 0; i < MISS_MAX; i++) vox(W - 330 + i * 70, 196, 40, 26, 24, i < misses ? F_RED : F_DIM);
    game.draw.rect(0, 222, W, 8, '#4c475a');
    game.draw.rect(0, 222, W * Math.min(1, songT / (endBeats * SPB)), 8, C.gold);
  }

  function drawResult(t) {
    game.draw.rect(70, H * 0.25, W - 140, H * 0.36, C.ink, 0.9);
    label(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.31, 100, won ? C.gold : C.red);
    label('SCORE ' + score, W / 2, H * 0.37, 58, C.white);
    label('PERFECT ' + perfects + '  GOOD ' + goods + '  MISS ' + misses, W / 2, H * 0.415, 34, C.teal);
    label(maxCombo + ' COMBO', W / 2, H * 0.455, 40, C.gold);
    for (var k = 0; k < 3; k++) vox(W / 2 - 150 + k * 150, H * 0.505, 90, 50, 34, k < fullTrucks ? F_GOLD : F_DIM);
    label(fullTrucks + ' / 3', W / 2 + 300, H * 0.495, 40, C.gold, 'left');
    if (won && score > prevBest) label('NEW RECORD', W / 2, H * 0.55, 50, C.gold);
    else label('BEST ' + Math.max(prevBest, won ? score : 0), W / 2, H * 0.55, 40, C.gold);
    if (!won) label('あと' + Math.max(1, totalDrops() - judged) + '箱', W / 2, H * 0.22, 60, C.red);
    if (Math.floor(t * 2) % 2 === 0) label('TAP TO CONTINUE', W / 2, H * 0.59, 36, C.white);
  }

  // ---- ATTRACT: 実ロジックで1台目を積み、10拍目をわざと遅らせて転げ落ちを見せる ----
  var demo = { t: 0, press: 0 };
  var DEMO_LEN = DEMO_BEATS * SPB + 1.4;
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % DEMO_LEN;
    if (cyc < dt || demo.t <= dt) { initGame(true); demo.press = 0; }
    if (demo.press > 0) demo.press -= dt;
    tickWorld(dt);
    if (running && hitStop <= 0) {
      var b = Math.round(songT / SPB);
      if (dropTruck(b) >= 0 && !done[b]) {
        var tp = b * SPB + (b === DEMO_LATE ? 0.18 : 0);
        if (songT >= tp - 0.008) { dropAction(); demo.press = 0.16; }
      }
    }
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;
    if (flashT > 0) flashT -= dt;
    if (beatPulse > 0) beatPulse = Math.max(0, beatPulse - dt * 5);

    if (state === S.ATTRACT) {
      stepDemo(dt);
      drawScene(demo.press > 0);
      game.draw.hand(CX + 70, 1720, { press: demo.press > 0, scale: 15 });
      game.draw.rect(0, 0, W, 230, C.ink, 0.86);
      label(GAME_TITLE, W / 2, 112, 84 + Math.sin(t * 3) * 3, C.gold);
      label('HI-SCORE ' + (game.best > 0 ? game.best : 0), W / 2, 192, 36, C.teal);
      if (Math.floor(t * 2) % 2 === 0) label('► 100円 投入 ◄', W / 2, 1560, 50, C.gold);
      else label('TAP TO START', W / 2, 1560, 46, C.white);
      return;
    }

    if (state === S.RESULT) {
      drawScene(false);
      drawResult(t);
      return;
    }

    // ---- PLAYING ----
    if (over) {
      outroT -= dt;
      tickWorld(dt);
      if (outroT <= 0) {
        state = S.RESULT;
        var stats = { score: score, perfect: perfects, good: goods, miss: misses, maxCombo: maxCombo, fullTrucks: fullTrucks };
        if (won) game.end.success(score, stats);
        else game.end.failure(stats);
      }
    } else if (readyT > 0) {
      readyT -= dt;
      if (readyT <= 0) startClock();
    } else {
      tickWorld(dt);
    }

    drawScene(false);
    drawHud();
    if (readyT > 0) label(readyT > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.34, 110, C.gold);
    if (over && outroT > 1.5) label(won ? 'FINISH' : 'GAME OVER', W / 2, H * 0.34, 100, won ? C.gold : C.red);
    else if (over || state === S.RESULT) drawResult(t);
  });

  game.onStart(function() {
    state = S.ATTRACT;
    initGame(true);
  });
})(game);
