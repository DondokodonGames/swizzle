// K-GBA-0004v3-laundry-yard-wind-swat.js
// 干し場の風払い — 食い気味の拍で風に乗って飛んでくる洗濯物と木の実を見分け、硬い物は上へ、柔らかい物は下へ拍の頭で払い返す
// 操作: 飛来物が少年のうちわに届く瞬間(裏拍の食いを含む)に、木の実なら上へ・洗濯物なら下へ画面を払う
// 終わり: 5小節で飛んでくる15個を払い切ればCLEAR。向き違い・拍外れ・払い損ねが合計3回でGAME OVER
// @mechanic: swipe_direction
// @theme: windy_laundry_yard_swat
// 世界観: 風の強い洗濯屋の干し場で、店番の少年がうちわを手に、飛んでくる洗濯物は足元のかごへ、木の実は軒下の木箱へと拍に合わせて払い分ける
// 残るもの: 正誤(CLEAR/GAME OVER) + スコア・PERFECT/GOOD/MISS数・最大コンボ
// スタイル: 90s HANDHELD COLOR

(function (game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s HANDHELD COLOR: 低彩度・少色。小画面前提の太く単純な形、日焼けした液晶の色味
  var STYLE = { bg: ['#c9d3a8', '#e8e3c2'], main: ['#7c8f5a', '#b4875a', '#f2ecd2'], accent: ['#c96f58', '#3a4232'] };
  var SKY = STYLE.bg[0], PALE = STYLE.bg[1], OLIVE = STYLE.main[0], WOOD = STYLE.main[1], CLOTH = STYLE.main[2], RUST = STYLE.accent[0], INK = STYLE.accent[1];
  var DUSK = '#8fa3a8', NUT = '#8a5a34';

  var TITLE = 'WIND SWAT';
  var BPM = 100;
  var SPB = 60 / BPM;                 // 1拍0.6秒。判定は8分の格子(拍の頭と裏)で、食いの音は裏拍に来る
  // 着弾する拍(4拍=1小節)。x.5 が裏拍の食い。小節頭を食って前の小節の 4拍裏 に来るところが山場
  var HITS = [2, 3, 4, 5.5, 7, 8, 9.5, 11, 11.5, 13, 14.5, 15.5, 17, 18.5, 19.5];
  var END_BEAT = 20;
  var TIME_LIMIT = 12;                // 20拍 x 0.6秒。放置でも READY 0.8 + 前奏1.2 + 12 + 結果1.8 = 15.8秒で終わる
  var LEAD_BEATS = 2;
  var PERF_WIN = 0.06, GOOD_WIN = 0.13, EARLY_WIN = 0.26;
  var MISS_LIMIT = 3;
  var PX_PER_BEAT = 375;              // 風に乗る速さ: 1拍で375px(画面右端から2拍で届く)
  var HIT_X = 330, HIT_Y = H * 0.5;
  var LINE_Y = H * 0.36;
  var UP_X = HIT_X + 40, UP_Y = H * 0.27;     // 軒下の木箱(木の実)
  var DOWN_X = HIT_X + 40, DOWN_Y = H * 0.635; // 足元のかご(洗濯物)
  var SWIPE_PX = 60;
  var PAD_X = W / 2, PAD_TOP = H * 0.765, PAD_BOT = H * 0.935;
  var DEMO_BEATS = [0, 1.5, 3, 4, 5.5, 7];
  var DEMO_HARD = [true, false, true, false, false, true];
  var DEMO_WRONG = 4;                 // デモは5個目を逆向きに払って失敗して見せる

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  // ── ドット絵: 店番の少年(はちまき・前掛け)、木の実2種、洗濯物2種 ──
  var BOY_IDLE = ['..rrrrrr..', '..hhhhhh..', '..ssssss..', '..skssks..', '..ssssss..', '...ssss...', '.oooooooo.', 'oocccccoss', 'oocccccoss', '.oocccccc.', '..cccccc..', '..kk..kk..', '.kkk..kkk.'];
  var BOY_UP = ['..rrrrrr.s', '..hhhhhhss', '..ssssssso', '..skssksoo', '..sssssoo.', '...ssssoo.', '.oooooooo.', 'oocccccoo.', 'oocccccoo.', '.oocccccc.', '..cccccc..', '..kk..kk..', '.kkk..kkk.'];
  var BOY_DOWN = ['..rrrrrr..', '..hhhhhh..', '..ssssss..', '..skssks..', '..ssssss..', '...ssss...', '.oooooooo.', 'ooccccccoo', 'oocccccso.', '.ooccccsso', '..ccccccs.', '..kk..kk..', '.kkk..kkk.'];
  var BOY_PAL = { r: RUST, h: INK, s: '#e9c39a', k: INK, o: OLIVE, c: CLOTH };
  var WALNUT = [['.nnnn.', 'nNnnNn', 'nnNNnn', 'nNnnNn', 'nnnnnn', '.nnnn.'], ['.nnnn.', 'nnNNnn', 'nNnnNn', 'nnNNnn', 'nNnnNn', '.nnnn.']];
  var ACORN = [['.kkkk.', 'kkkkkk', '.nnnn.', 'nnNnnn', 'nnnnnn', '.nnnn.', '..nn..'], ['.kkkk.', 'kkkkkk', '.nnnn.', 'nnnnNn', 'nnnnnn', '.nnnn.', '..nn..']];
  var TOWEL = [['cccccccc', 'cbcccbcc', 'cccccccc', 'bbbbbbbb', '.cccccc.', '..cccc..'], ['.ccccccc', 'ccbcccbc', 'cccccccc', 'bbbbbbbb', 'cccccc..', '.cccc...']];
  var SHIRT = [['bb....bb', 'bbbbbbbb', '.bbbbbb.', '.bbccbb.', '.bbbbbb.', '.bbbbbb.'], ['.b....bb', 'bbbbbbbb', 'bbbbbbb.', '.bbccbb.', '.bbbbbb.', '..bbbbb.']];
  var OBJ_PAL = { n: WOOD, N: NUT, k: '#6b4a2c', c: CLOTH, b: DUSK };
  var WHITE_PAL = { n: '#ffffff', N: '#ffffff', k: '#ffffff', c: '#ffffff', b: '#ffffff', r: '#ffffff', h: '#ffffff', s: '#ffffff', o: '#ffffff' };

  // ── 伴奏: 自作の食いのメロディ(ニ短調)+ トレシージョ(3+3+2)のベース。16拍で1周、拍クロックから頭出し ──
  var WIND_TUNE = [
    ['D5', 0.5], ['F5', 1], ['E5', 1], ['C5', 0.5], ['D5', 1],
    ['A4', 0.5], ['C5', 1], ['D5', 1], ['F5', 1.5],
    ['E5', 0.5], ['G5', 1], ['F5', 1], ['D5', 0.5], ['E5', 1],
    ['C5', 0.5], ['A4', 1], ['D5', 2.5],
  ];
  var WIND_BASS = [['D3', 1.5], ['D3', 1.5], ['A2', 1], ['F2', 1.5], ['F2', 1.5], ['C3', 1], ['G2', 1.5], ['G2', 1.5], ['D3', 1], ['A2', 1.5], ['A2', 1.5], ['A2', 1]];
  function startTune() {
    game.audio.melody(WIND_TUNE, { tempo: BPM, wave: 'square', volume: 0.045, loop: true, bass: WIND_BASS, bassWave: 'triangle', bassVolume: 0.09 });
  }

  function txt(s, x, y, size, col, align) {
    game.draw.text(s, x + 4, y + 4, { size: size, color: INK, bold: true, align: align || 'center' });
    game.draw.text(s, x, y, { size: size, color: col, bold: true, align: align || 'center' });
  }

  // ── 飛来物と判定(プレイとデモで共通の実ロジック) ──
  function targetOf(r, i) {
    if (!r.loop) return r.targets[i];
    if (!r.targets[i]) {
      var n = DEMO_BEATS.length;
      var c = Math.floor(i / n), j = i - c * n;
      r.targets[i] = { beat: c * 8 + DEMO_BEATS[j], hard: DEMO_HARD[j], kind: j % 2, res: null, rt: 0, idx: j };
      delete r.targets[i - 16];
    }
    return r.targets[i];
  }
  function tHit(r, i) { return targetOf(r, i).beat * SPB; }
  function isOff(tg) { return tg.beat - Math.floor(tg.beat) > 0.25; }

  function makeTargets() {
    var arr = [], lastHard = null, same = 0;
    for (var i = 0; i < HITS.length; i++) {
      var hard = game.random(0, 1) < 0.5;
      if (hard === lastHard) { same++; if (same >= 3) { hard = !hard; same = 1; } } else same = 1;
      lastHard = hard;
      arr.push({ beat: HITS[i], hard: hard, kind: Math.floor(game.random(0, 2)), res: null, rt: 0 });
    }
    return arr;
  }

  function newRun(loop, vol) {
    return {
      loop: loop, vol: vol, play: false, targets: loop ? {} : makeTargets(), count: loop ? 1e9 : HITS.length,
      t: -LEAD_BEATS * SPB, lastBeat: -LEAD_BEATS - 1, next: 0,
      combo: 0, maxCombo: 0, perfect: 0, good: 0, miss: 0, score: 0,
      swingT: 0, swingDir: 'up', pulse: 0, flashIdx: -1, boxN: 0, basketN: 0,
    };
  }

  function hitTarget(r, i, d, dir) {
    var tg = targetOf(r, i);
    tg.res = 'hit'; tg.rt = r.t; tg.dir = dir;
    var perfect = Math.abs(d) <= PERF_WIN;
    if (perfect) r.perfect++; else r.good++;
    r.combo++;
    if (r.combo > r.maxCombo) r.maxCombo = r.combo;
    r.score += Math.round(((perfect ? 100 : 60) + Math.min(r.combo, 15) * 6) * (isOff(tg) ? 1.5 : 1));
    if (tg.hard) r.boxN++; else r.basketN++;
    game.audio.tone(tg.hard ? 880 : 392, 0.06, { wave: tg.hard ? 'square' : 'triangle', volume: 0.1 * r.vol, slide: tg.hard ? 300 : -150 });
    game.feedback.good(HIT_X + 60, HIT_Y - 150, { text: perfect ? 'PERFECT' : 'GOOD', color: perfect ? RUST : OLIVE, size: perfect ? 58 : 46, count: perfect ? 12 : 7, sound: perfect ? 'se_good' : 'se_tap', volume: 0.3 * r.vol });
    if (r.combo === 5 || r.combo === 10 || r.combo === 15) {
      game.fx.popup(r.combo + ' COMBO', W * 0.62, H * 0.3, { color: RUST, size: 68 });
      game.audio.play('se_milestone', 0.45 * r.vol);
    }
  }

  function missTarget(r, i, kind, dir) {
    if (r.play && fatal) return;
    var tg = targetOf(r, i);
    tg.res = kind; tg.rt = r.t; tg.dir = dir || null;
    r.miss++; r.combo = 0;
    if (r.play && r.miss >= MISS_LIMIT) {
      // 3回目: ヒットストップで止め、外した飛来物を白く拡大してから feedback.bad
      fatal = true; hitStop = 0.5; r.flashIdx = i;
      game.audio.stopBgm();
      game.audio.tone(160, 0.3, { wave: 'sawtooth', volume: 0.12, slide: -70 });
      return;
    }
    game.feedback.bad(HIT_X + 60, HIT_Y - 150, { text: 'MISS', volume: 0.5 * r.vol, shake: 8 });
  }

  function swipeRun(r, dir) {
    r.swingT = 0.22; r.swingDir = dir;
    var i = r.next;
    if (i >= r.count) { whiff(r); return 'stray'; }
    var d = r.t - tHit(r, i);
    if (Math.abs(d) <= GOOD_WIN) {
      var want = targetOf(r, i).hard ? 'up' : 'down';
      if (dir === want) hitTarget(r, i, d, dir);
      else missTarget(r, i, 'wrong', dir);
      r.next++;
      return 'judged';
    }
    if (d < 0 && d > -EARLY_WIN) { missTarget(r, i, 'early', dir); r.next++; return 'judged'; }
    whiff(r);
    return 'stray';
  }

  function whiff(r) {
    game.audio.tone(500, 0.05, { wave: 'triangle', volume: 0.04 * r.vol, slide: 160 });
  }

  function onBeat(r, b) {
    r.pulse = 1;
    // 拍クロック: 店先の鈴が表拍ごとに鳴る(小節頭は低く強く)
    if (b % 4 === 0) game.audio.tone(b < 0 ? 'A5' : 'D4', 0.12, { wave: 'triangle', volume: 0.18 * r.vol });
    else game.audio.tone('A5', 0.05, { wave: 'sine', volume: 0.07 * r.vol });
    if (b >= 0 && b % 16 === 0 && (r.loop || b < END_BEAT)) startTune();
  }

  function stepRun(r, dt) {
    r.t += dt;
    var bi = Math.floor(r.t / SPB + 1e-6);
    while (r.lastBeat < bi) { r.lastBeat++; onBeat(r, r.lastBeat); }
    while (r.next < r.count && r.t > tHit(r, r.next) + GOOD_WIN) {
      missTarget(r, r.next, 'late', null);
      r.next++;
      if (r.play && fatal) break;
    }
    if (r.swingT > 0) r.swingT -= dt;
    if (r.pulse > 0) r.pulse = Math.max(0, r.pulse - dt * 4);
  }

  // ── 描画 ──
  function drawYard(r) {
    var t = game.time.elapsed;
    var beatPos = r.t / SPB;
    game.draw.clear(PALE);
    game.draw.gradient(0, H * 0.6, [[0, SKY], [1, PALE]]);
    // 風の筋(右から左へ流れ続ける)
    for (var w = 0; w < 7; w++) {
      var wy = H * 0.14 + w * 70;
      var wx = W - ((t * (300 + w * 40) + w * 260) % (W + 400));
      game.draw.rect(wx, wy, 150 + (w % 3) * 50, 6, CLOTH, 0.7);
    }
    // 遠景の木(木の実はここから飛んでくる)
    game.draw.rect(W - 120, H * 0.2, 44, H * 0.4, WOOD);
    game.draw.circle(W - 98, H * 0.2, 150, OLIVE);
    game.draw.circle(W - 210, H * 0.26, 100, OLIVE);
    for (var n = 0; n < 4; n++) game.draw.circle(W - 150 + (n % 2) * 70, H * 0.17 + n * 40, 14, NUT);
    // 店の軒(左上)と軒下の木箱 = 上へ払う行き先
    game.draw.rect(0, H * 0.12, 420, 44, RUST);
    game.draw.rect(0, H * 0.12 + 44, 420, 16, INK);
    for (var s = 0; s < 6; s++) game.draw.rect(s * 72, H * 0.12, 8, 44, INK, 0.35);
    game.draw.rect(0, H * 0.12 + 60, 70, H * 0.48, WOOD);
    game.draw.line(UP_X - 70, H * 0.12 + 60, UP_X - 70, UP_Y - 50, INK, 6);
    game.draw.line(UP_X + 70, H * 0.12 + 60, UP_X + 70, UP_Y - 50, INK, 6);
    game.draw.rect(UP_X - 90, UP_Y - 50, 180, 90, WOOD);
    game.draw.rect(UP_X - 90, UP_Y - 50, 180, 14, INK);
    for (var b = 0; b < Math.min(r.boxN, 8); b++) game.draw.circle(UP_X - 60 + (b % 4) * 40, UP_Y - 60 - Math.floor(b / 4) * 24, 18, NUT);
    // 滑車の物干しロープ = 拍の譜面。大きい洗濯ばさみが表拍、小さい点が裏拍。手元の赤い線に重なる瞬間が拍の頭
    game.draw.rect(0, LINE_Y - 3, W, 6, INK);
    var first = Math.floor(beatPos) - 1;
    for (var k = first; k < first + 5; k++) {
      var px = HIT_X + (k - beatPos) * PX_PER_BEAT;
      var bar = ((k % 4) + 4) % 4 === 0;
      game.draw.rect(px - 10, LINE_Y - 30, 20, bar ? 64 : 48, bar ? RUST : WOOD);
      if (bar) game.draw.rect(px - 40, LINE_Y + 34, 80, 70, CLOTH, 0.9);
      game.draw.circle(px + PX_PER_BEAT / 2, LINE_Y, 9, WOOD);
    }
    game.draw.rect(HIT_X - 4, LINE_Y - 40, 8, HIT_Y - LINE_Y + 40, RUST, 0.55);
    // 地面と足元のかご = 下へ払う行き先
    game.draw.rect(0, H * 0.6, W, H * 0.4, '#b3a77e');
    for (var g = 0; g < 8; g++) game.draw.rect(((g * 160 + t * 30) % (W + 160)) - 80, H * 0.62 + (g % 3) * 30, 60, 6, INK, 0.12);
    game.draw.rect(DOWN_X - 110, DOWN_Y - 30, 220, 110, WOOD);
    game.draw.rect(DOWN_X - 120, DOWN_Y - 40, 240, 20, NUT);
    for (var c = 0; c < Math.min(r.basketN, 8); c++) game.draw.rect(DOWN_X - 90 + (c % 4) * 46, DOWN_Y - 60 - Math.floor(c / 4) * 20, 40, 26, c % 2 ? DUSK : CLOTH);
  }

  function objSprite(tg, frame) {
    if (tg.hard) return tg.kind ? ACORN[frame] : WALNUT[frame];
    return tg.kind ? SHIRT[frame] : TOWEL[frame];
  }

  function drawTargets(r, frozen) {
    var lo = Math.max(0, r.next - 4);
    for (var i = lo; i < Math.min(r.count, r.next + 8); i++) {
      var tg = targetOf(r, i);
      var th = tg.beat * SPB;
      var x, y, scale = tg.hard ? 13 : 14;
      var frame = Math.floor(game.time.elapsed * (tg.hard ? 10 : 7) + i) % 2;
      if (!tg.res) {
        x = HIT_X + (th - r.t) / SPB * PX_PER_BEAT;
        if (x > W + 120) continue;
        y = HIT_Y + (tg.hard ? 0 : Math.sin(r.t * 7 + i) * 22);
        // 食いの音(裏拍)は尾の帯が黄みを帯びる
        game.draw.rect(x + 50, y - 6, 90, 12, isOff(tg) ? '#e0c060' : CLOTH, 0.6);
      } else {
        var e = r.t - tg.rt;
        if (e > 0.7) continue;
        var f = Math.min(1, e / 0.4);
        if (tg.res === 'hit') {
          var dx = tg.hard ? UP_X : DOWN_X, dy = tg.hard ? UP_Y - 70 : DOWN_Y - 70;
          x = HIT_X + (dx - HIT_X) * f;
          y = HIT_Y + (dy - HIT_Y) * f;
          if (f >= 1) continue;
        } else if (tg.res === 'wrong') {
          x = HIT_X + 40 * f;
          y = HIT_Y + (tg.dir === 'up' ? -1 : 1) * 260 * f;
          if (e > 0.35) y += (e - 0.35) * (e - 0.35) * 2600;     // 行き先違いで跳ね返って落ちる
        } else {
          x = HIT_X - e * PX_PER_BEAT / SPB;                          // 払い損ねると後ろへ飛んでいく
          y = HIT_Y + e * 200;
        }
      }
      var pal = OBJ_PAL;
      if (frozen && i === r.flashIdx) { pal = WHITE_PAL; scale *= 1.4; }
      game.draw.sprite(objSprite(tg, frame), pal, x, y, scale, { anchor: 'center' });
    }
  }

  function drawBoy(r, frozen) {
    var sw = r.swingT > 0;
    var spr = sw ? (r.swingDir === 'up' ? BOY_UP : BOY_DOWN) : BOY_IDLE;
    var bob = Math.sin(r.t / SPB * Math.PI) * 6;
    game.draw.rect(110, H * 0.6 - 8, 180, 16, INK, 0.2);
    game.draw.sprite(spr, frozen ? WHITE_PAL : BOY_PAL, 200, H * 0.6 - 98 + Math.abs(bob), 15, { anchor: 'center' });
    // うちわ: 構え → 払った向きへ振り抜く
    var k = sw ? r.swingT / 0.22 : 0;
    var fx = HIT_X, fy = HIT_Y;
    if (sw) fy = HIT_Y + (r.swingDir === 'up' ? -1 : 1) * (1 - k) * 170;
    game.draw.line(250, H * 0.6 - 120, fx - 20, fy + 20, WOOD, 12);
    game.draw.circle(fx, fy, 62, frozen ? '#ffffff' : RUST);
    game.draw.circle(fx, fy, 46, CLOTH);
    game.draw.circle(fx, fy, 16 + r.pulse * 10, RUST, 0.6);
  }

  function drawPad(r) {
    // 親指ゾーンの払い板: 上端に木の実、下端に洗濯物。拍ごとに溝が光る
    game.draw.rect(PAD_X - 210, PAD_TOP - 40, 420, PAD_BOT - PAD_TOP + 80, WOOD);
    game.draw.rect(PAD_X - 200, PAD_TOP - 30, 400, PAD_BOT - PAD_TOP + 60, '#c79a68');
    game.draw.rect(PAD_X - 26, PAD_TOP + 40, 52, PAD_BOT - PAD_TOP - 80, INK, 0.25 + r.pulse * 0.35);
    game.draw.sprite(WALNUT[0], OBJ_PAL, PAD_X, PAD_TOP + 10, 14, { anchor: 'center' });
    game.draw.sprite(TOWEL[0], OBJ_PAL, PAD_X, PAD_BOT - 10, 14, { anchor: 'center' });
    for (var a = 0; a < 3; a++) {
      game.draw.rect(PAD_X - 14 + a * 0, PAD_TOP + 70 + a * 16, 28, 8, INK, 0.3);
      game.draw.rect(PAD_X - 14, PAD_BOT - 78 - a * 16, 28, 8, INK, 0.3);
    }
  }

  function drawHud(r) {
    game.draw.rect(0, 0, W, 230, INK, 0.85);
    txt('SCORE ' + r.score, 40, 66, 44, PALE, 'left');
    for (var m = 0; m < MISS_LIMIT; m++) {
      var used = m < r.miss;
      game.draw.rect(W - 96 - m * 76, 40, 56, 52, used ? RUST : OLIVE);
      game.draw.rect(W - 86 - m * 76, 50, 36, 32, used ? INK : PALE, 0.6);
    }
    var bb = Math.floor(r.t / SPB);
    var inBar = ((bb % 4) + 4) % 4;
    for (var q = 0; q < 4; q++) {
      var on = q === inBar && r.t >= -LEAD_BEATS * SPB;
      game.draw.rect(W / 2 - 150 + q * 80, 118, 48, 40, on ? (q === 0 ? RUST : PALE) : OLIVE, on ? 1 : 0.5);
    }
    var done = Math.min(r.count, r.next);
    if (r.combo >= 2) txt(r.combo + ' COMBO', 40, 142, 38, RUST, 'left');
    txt(done + ' / ' + HITS.length, W - 40, 142, 38, PALE, 'right');
    var progress = Math.max(0, Math.min(1, r.t / (END_BEAT * SPB)));
    game.draw.rect(40, 198, W - 80, 16, PALE, 0.3);
    game.draw.rect(40, 198, (W - 80) * progress, 16, RUST);
  }

  function drawResult() {
    game.draw.rect(70, H * 0.24, W - 140, H * 0.27, INK, 0.92);
    txt(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.28, 100, won ? PALE : RUST);
    txt('SCORE ' + finalScore, W / 2, H * 0.335, 58, PALE);
    txt('PERFECT ' + run.perfect + '  GOOD ' + run.good + '  MISS ' + run.miss, W / 2, H * 0.38, 38, PALE);
    txt('COMBO ' + run.maxCombo, W / 2, H * 0.42, 42, RUST);
    if (newRecord) txt('NEW RECORD', W / 2, H * 0.465, 56, RUST);
    else txt('BEST ' + Math.max(prevBest, game.best || 0), W / 2, H * 0.465, 44, SKY);
    if (!won) txt('あと' + Math.max(1, HITS.length - Math.min(HITS.length, run.next)) + '個!', W / 2, H * 0.497, 42, CLOTH);
  }

  // ── 状態 ──
  var run, ready, hitStop, fatal, over, won, endT, prevBest, finalScore, newRecord, confT, sw;

  function initGame() {
    run = newRun(false, 1);
    run.play = true;
    ready = 0.8; hitStop = 0; fatal = false; over = false; won = false; endT = 0;
    prevBest = game.best || 0; finalScore = 0; newRecord = false; confT = 0; sw = null;
  }

  function finish(win) {
    if (over) return;
    over = true; won = win; endT = 1.8;
    finalScore = win ? run.score + (MISS_LIMIT - run.miss) * 200 : run.score;
    newRecord = win && finalScore > prevBest;
    game.audio.stopBgm();
    game.audio.play(win ? 'se_success' : 'se_failure', 0.6);
    if (newRecord) game.fx.popup('NEW RECORD', W / 2, H * 0.2, { color: RUST, size: 76 });
  }

  // ── ATTRACT: 実ロジックでゴーストが払い板を上下に払う。5個目だけ逆向きに払って失敗して見せる ──
  var demo = { t: 0, run: null, hy: 0, dir: 'up', swipeT: 0 };
  function resetDemo() {
    demo.run = newRun(true, 0.35);
    demo.run.t = -SPB; demo.run.lastBeat = -2;
    demo.hy = 0; demo.dir = 'up'; demo.swipeT = 0;
  }
  function stepDemo(dt) {
    demo.t += dt;
    if (!demo.run || demo.t <= dt) resetDemo();
    var r = demo.run;
    stepRun(r, dt);
    var tg = targetOf(r, r.next);
    var dir = tg.hard ? 'up' : 'down';
    if (tg.idx === DEMO_WRONG) dir = dir === 'up' ? 'down' : 'up';
    var dtHit = tHit(r, r.next) - r.t;
    if (dtHit < 0.09 && demo.swipeT <= 0) { demo.dir = dir; demo.swipeT = 0.2; }
    if (dtHit <= 0.004) swipeRun(r, dir);
    if (demo.swipeT > 0) demo.swipeT -= dt;
  }

  function canPlay() { return state === S.PLAYING && !over && hitStop <= 0; }

  function doSwipe(dir) {
    if (ready > 0) { whiff(run); return; }
    swipeRun(run, dir);
  }

  game.onTap(function () {
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.6); game.audio.stopBgm(); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.3); state = S.ATTRACT; initGame(); demo.t = 0; resetDemo(); return; }
  });

  game.onPress(function (x, y) {
    if (!canPlay()) return;
    sw = { x0: x, y0: y, fired: false };
    game.audio.tone(330, 0.02, { wave: 'triangle', volume: 0.03 });
  });

  game.onMove(function (x, y) {
    if (!sw || sw.fired || !canPlay()) return;
    var dx = x - sw.x0, dy = y - sw.y0;
    if (Math.abs(dy) >= SWIPE_PX && Math.abs(dy) >= Math.abs(dx)) {
      sw.fired = true;
      game.audio.tone(dy < 0 ? 700 : 300, 0.05, { wave: 'triangle', volume: 0.05, slide: dy < 0 ? 300 : -120 });
      doSwipe(dy < 0 ? 'up' : 'down');
    } else if (Math.abs(dx) >= SWIPE_PX * 1.5 && Math.abs(dx) > Math.abs(dy)) {
      sw.fired = true;
      whiff(run);
    }
  });

  game.onRelease(function (x, y) {
    if (!sw || !canPlay()) { sw = null; return; }
    if (!sw.fired) {
      var dx = x - sw.x0, dy = y - sw.y0;
      if (Math.abs(dy) >= 30 && Math.abs(dy) >= Math.abs(dx)) doSwipe(dy < 0 ? 'up' : 'down');
      else game.fx.burst(x, y, { color: CLOTH, count: 3, speed: 80 });
    }
    sw = null;
  });

  game.onUpdate(function (dt) {
    if (dt > 0.05) dt = 0.05;

    if (state === S.ATTRACT) {
      stepDemo(dt);
      var dr = demo.run;
      drawYard(dr);
      drawTargets(dr, false);
      drawBoy(dr, false);
      drawPad(dr);
      var k = demo.swipeT > 0 ? 1 - demo.swipeT / 0.2 : 0;
      var mid = (PAD_TOP + PAD_BOT) / 2;
      var hy = demo.swipeT > 0 ? mid + (demo.dir === 'up' ? -1 : 1) * k * 200 : mid;
      game.draw.hand(PAD_X + 30, hy, { press: demo.swipeT > 0, scale: 16 });
      game.draw.rect(0, 0, W, 230, INK, 0.85);
      txt(TITLE, W / 2, 92, 88, RUST);
      txt('HI-SCORE ' + (game.best || 0), W / 2, 182, 40, PALE);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.972, 44, RUST);
      else txt('TAP TO START', W / 2, H * 0.972, 40, PALE);
      return;
    }

    if (state === S.PLAYING) {
      if (over) {
        endT -= dt;
        if (won) {
          confT -= dt;
          if (confT <= 0) { confT = 0.16; game.fx.burst(game.random(140, W - 140), game.random(H * 0.2, H * 0.5), { color: [RUST, CLOTH, OLIVE][Math.floor(game.random(0, 3))], count: 14, speed: 340 }); }
        }
        if (endT <= 0) {
          state = S.RESULT;
          var stats = { perfect: run.perfect, good: run.good, miss: run.miss, maxCombo: run.maxCombo, swatted: run.boxN + run.basketN, score: finalScore };
          if (won) game.end.success(finalScore, stats);
          else game.end.failure(stats);
        }
      } else if (hitStop > 0) {
        hitStop -= dt;
        if (hitStop <= 0) {
          game.feedback.bad(HIT_X + 60, HIT_Y - 150, { text: 'MISS', size: 76, shake: 18 });
          run.flashIdx = -1;
          finish(false);
        }
      } else if (ready > 0) {
        ready -= dt;
        if (ready <= 0) game.audio.play('se_tap', 0.4);
      } else {
        stepRun(run, dt);
        if (!fatal && run.next >= run.count && run.t >= END_BEAT * SPB) {
          game.audio.tone('D5', 0.3, { wave: 'triangle', volume: 0.15 });
          finish(true);
        }
      }
    }

    drawYard(run);
    drawTargets(run, hitStop > 0);
    drawBoy(run, hitStop > 0);
    drawPad(run);
    drawHud(run);
    if (state === S.PLAYING && ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.43, 116, RUST);
    if (over || state === S.RESULT) drawResult();
    if (state === S.RESULT) txt('TAP TO CONTINUE', W / 2, H * 0.972, 40, PALE);
  });

  game.onStart(function () {
    state = S.ATTRACT;
    initGame();
    resetDemo();
    startTune();
  });
})(game);
