// K-DS-0045v3-school-kitchen-breading-sort.js
// 調理実習の衣リレー — 拍ごとに台へ届く具材を拍の頭でつまみ、次の拍までに次の衣の鉢へ振り分ける。拍型が 行進→駆け足→連打 と切り替わる
// 操作: ベルトで流れてきた具材が中央の台に着く拍の頭にその具材を押さえてつまむ(拍の頭からのずれでPERFECT/GOOD、遅れてつまむと点なし)。下の三つの鉢(左=粉・中=卵・右=パン粉)のうち、具材の今の衣の次の鉢の上で指を離す。鉢の上に描かれた小さな具材の絵がその鉢に入れる具材(何も付いていない→粉、粉が付いた点々→卵、卵で濡れた横縞→パン粉)。鉢の外で離すと台へ戻る(やり直せる)。違う鉢・次の拍(+0.15秒)までに入れられない はMISS。台の具材のまわりの点の輪が減りきると締め切りで、残り0.5秒で点滅する
// 終わり: 前奏1小節のあと、行進3小節(1・3拍目に届く)→駆け足2小節(1・2拍目に続けて届く)→連打2小節(毎拍届く)の計18個(90BPM・8小節・約21秒)。切り替わりの2拍前に鐘が鳴り、上の拍型の札が白黒反転して次の型を予告する。18個を流し終えてMISS 2回以内ならCLEAR(判定の点+振り分けた数+連続ボーナス)。MISS 3回でGAME OVER
// @mechanic: drag_sort
// @theme: school_kitchen_breading_sort
// 世界観: 学校の調理実習室で、エプロン姿の班長が、拍ごとに台へ届く具材を粉・卵・パン粉の鉢へ衣の順に振り分け、班のみんなの揚げ物の下ごしらえを拍に乗って回していく
// 残るもの: 正誤(CLEAR/GAME OVER) + スコア・振り分けた数・PERFECT/GOOD/MISS数・最大連続
// スタイル: 1BIT INK

(function(game) {
  var STYLE = { bg: ['#f4f1ea', '#e9e5dc'], main: ['#141414', '#f4f1ea', '#6a6a6a'], accent: ['#000000', '#ffffff'] };
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 1BIT INK: 紙の白と墨の黒の2値だけ。中間の階調は点描と横縞の網で作り、線の太さで強さと近さを語る
  var C = { paper: STYLE.bg[0], paper2: STYLE.bg[1], ink: STYLE.main[0], white: STYLE.main[1], mid: STYLE.main[2], black: STYLE.accent[0], pure: STYLE.accent[1] };

  var GAME_TITLE = 'COAT CLASS';
  var BPM = 90;
  var SPB = 60 / BPM;
  var PERFECT_W = 0.08;
  var GOOD_W = 0.15;
  var MISS_MAX = 3;
  // 拍型(メドレー): 小節ごとの「届く拍」。前奏 → 行進 → 駆け足 → 連打
  var SECT = [
    { bar: 0, pat: [0, 0, 0, 0], tune: 0 },
    { bar: 1, pat: [1, 0, 1, 0], tune: 0 },
    { bar: 4, pat: [1, 1, 0, 0], tune: 1 },
    { bar: 6, pat: [1, 1, 1, 1], tune: 2 }
  ];
  var END_BAR = 8;
  var DEMO_SECT = [
    { bar: 0, pat: [0, 0, 1, 0], tune: 0 },
    { bar: 1, pat: [1, 0, 1, 0], tune: 0 },
    { bar: 2, pat: [1, 1, 0, 0], tune: 1 }
  ];
  var DEMO_END_BAR = 3;
  var TOTAL_ITEMS = 18;
  var TIME_LIMIT = 22;                 // 8小節 = 21.3秒 + 最後の締め切り
  var PASS_X = 540, PASS_Y = Math.round(H * 0.5);
  var BOWL_X = [190, 540, 890], BOWL_Y = Math.round(H * 0.835), BOWL_R = 150;
  var RULE_Y = Math.round(H * 0.725);
  var PAT_Y = 320;
  var ITEM_R = 72;

  // 実習室の拍(オリジナル)。拍型ごとに伴奏の刻みも変わる
  var TUNES = [
    { mel: [['C4', 1], ['G4', 1], ['E4', 1], ['G4', 1]], bass: [['C2', 1], ['R', 1], ['G2', 1], ['R', 1]] },
    { mel: [['A4', 0.75], ['A4', 0.25], ['C5', 0.75], ['A4', 0.25], ['G4', 1], ['E4', 1]], bass: [['A2', 0.75], ['A2', 0.25], ['E2', 0.75], ['E2', 0.25], ['A2', 1], ['R', 1]] },
    { mel: [['E5', 0.5], ['D5', 0.5], ['C5', 0.5], ['D5', 0.5], ['E5', 0.5], ['G5', 0.5], ['E5', 0.5], ['D5', 0.5]], bass: [['C2', 0.5], ['C3', 0.5], ['C2', 0.5], ['C3', 0.5], ['G2', 0.5], ['G3', 0.5], ['G2', 0.5], ['G3', 0.5]] }
  ];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var demoMode, running, beatN, beatT, songT, readyT, hitStop, animT, beatPulse, invertT, announce;
  var items, drag, flashItem, sect, endBar;
  var score, perfects, goods, misses, sorted, combo, maxCombo, over, won, outroT, prevBest, milestone;
  animT = 0;

  function ri(n) { return Math.floor(game.random(0, n)) % n; }

  function sectAt(bar) { var s = sect[0]; for (var i = 0; i < sect.length; i++) if (sect[i].bar <= bar) s = sect[i]; return s; }

  function initGame(isDemo) {
    demoMode = !!isDemo;
    sect = isDemo ? DEMO_SECT : SECT;
    endBar = isDemo ? DEMO_END_BAR : END_BAR;
    running = false; beatN = 0; beatT = 0; songT = 0;
    readyT = isDemo ? 0 : 0.8;
    hitStop = 0; beatPulse = 0; invertT = 0; announce = null; drag = null; flashItem = null;
    score = 0; perfects = 0; goods = 0; misses = 0; sorted = 0; combo = 0; maxCombo = 0;
    over = false; won = false; outroT = 0; prevBest = game.best || 0; milestone = false;
    items = [];
    var demoStates = [0, 2, 1, 0, 1];
    for (var b = 0; b < endBar; b++) {
      var p = sectAt(b).pat;
      for (var k = 0; k < 4; k++) {
        if (!p[k]) continue;
        var st;
        if (isDemo) st = demoStates[items.length % demoStates.length];
        else {
          do { st = ri(3); } while (items.length >= 2 && items[items.length - 1].state === st && items[items.length - 2].state === st);
        }
        items.push({ arr: b * 4 + k, state: st, sorted: false, missed: false, held: false, doneT: 0, missT: 0, bowl: -1, type: ri(3) });
      }
    }
    if (isDemo) startClock();
  }
  function arrT(it) { return it.arr * SPB; }
  function dlT(it) { return (it.arr + 1) * SPB + GOOD_W; }

  // ---- 拍クロック(1本だけ) ----
  function startClock() { running = true; beatN = 0; beatT = 0; songT = 0; onBeat(0); }
  function stepClock(dt) {
    beatT += dt;
    while (beatT >= SPB) { beatT -= SPB; beatN++; onBeat(beatN); }
    songT = beatN * SPB + beatT;
  }
  function onBeat(b) {
    if (b >= endBar * 4) return;
    var vol = demoMode ? 0.5 : 1;
    var bar = Math.floor(b / 4), k = b % 4;
    beatPulse = 0.15;
    game.audio.tone(k === 0 ? 1400 : 1000, 0.025, { wave: 'square', volume: (k === 0 ? 0.05 : 0.03) * vol });
    if (k === 0) {
      var s = sectAt(bar);
      var tn = TUNES[s.tune];
      game.audio.melody(tn.mel, { tempo: BPM, wave: 'square', volume: (bar === 0 ? 0.015 : 0.03) * vol, bass: tn.bass, bassWave: 'triangle', bassVolume: 0.09 * vol });
      if (s.bar === bar && bar > 0) {
        invertT = 0.35;
        if (!demoMode && bar > 1) {
          game.audio.play('se_milestone', 0.4);
          game.fx.popup(sorted + ' / ' + TOTAL_ITEMS, W / 2, PAT_Y + 150, { color: C.ink, size: 64 });
        }
      }
    }
    // 拍型の切り替え予告(2拍前): 鐘2打 + 次の型の札が反転点滅
    for (var i = 1; i < sect.length; i++) {
      if (b === sect[i].bar * 4 - 2) {
        announce = { pat: sect[i].pat, until: sect[i].bar * 4 * SPB };
        game.audio.tone('E6', 0.12, { wave: 'triangle', volume: 0.1 * vol });
        game.audio.tone('B5', 0.2, { wave: 'triangle', volume: 0.06 * vol });
      }
    }
    for (var j = 0; j < items.length; j++) {
      if (items[j].arr === b) game.audio.tone(300, 0.06, { wave: 'triangle', volume: 0.1 * vol, slide: -120 });
    }
  }

  function missItem(it, x, y) {
    it.missed = true; it.missT = songT; it.held = false;
    if (drag && drag.it === it) drag = null;
    misses++; combo = 0;
    hitStop = 0.42; flashItem = it;
    game.feedback.bad(x, y - 130, { text: 'MISS', shake: demoMode ? 4 : 12 });
    if (!demoMode && misses >= MISS_MAX) finish(false);
  }

  function stepPlay(dt) {
    if (!running) return;
    stepClock(dt);
    if (beatPulse > 0) beatPulse -= dt;
    if (invertT > 0) invertT -= dt;
    if (announce && songT >= announce.until) announce = null;
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      if (!it.sorted && !it.missed && songT > dlT(it)) {
        var p = itemPos(it);
        missItem(it, p.x, p.y);
        if (over) return;
      }
    }
    if (!demoMode && !over && (songT > endBar * 4 * SPB + GOOD_W + 0.05 || songT > TIME_LIMIT)) finish(misses < MISS_MAX);
  }

  // 台の上の位置(締め切り前の古い具材は左へずれて待つ)
  function itemPos(it) {
    if (it.held && drag) return { x: drag.x, y: drag.y };
    var lead = arrT(it) - songT;
    if (lead > 0) return { x: PASS_X + lead / SPB * 300, y: PASS_Y };
    var newer = false;
    for (var i = 0; i < items.length; i++) {
      var o = items[i];
      if (o !== it && !o.sorted && !o.missed && o.arr > it.arr && arrT(o) <= songT) newer = true;
    }
    var bounce = -lead < 0.12 ? Math.sin((-lead / 0.12) * Math.PI) * 26 : 0;
    return { x: newer ? PASS_X - 230 : PASS_X, y: PASS_Y - bounce };
  }

  function bowlAt(x, y) {
    for (var i = 0; i < 3; i++) if (Math.hypot(x - BOWL_X[i], y - BOWL_Y) <= BOWL_R + 30) return i;
    return -1;
  }

  // つまむ(入力とデモで共通)
  function pressAt(x, y) {
    if (!running || over || drag) return 'none';
    var best = null, bd = 1e9;
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      if (it.sorted || it.missed) continue;
      var p = itemPos(it);
      if (Math.hypot(x - p.x, y - p.y) > ITEM_R + 60) continue;
      var d = Math.abs(songT - arrT(it));
      if (d < bd) { bd = d; best = it; }
    }
    if (!best) return 'none';
    var off = songT - arrT(best);
    if (off < -GOOD_W) { game.audio.tone(200, 0.04, { wave: 'square', volume: 0.04 }); return 'early'; }
    best.held = true;
    drag = { it: best, x: x, y: y };
    if (Math.abs(off) <= PERFECT_W) {
      perfects++; score += 100;
      game.feedback.good(x, y - 140, { text: 'PERFECT', color: C.ink, size: 52, count: 8, volume: 0.22, sound: 'se_good' });
    } else if (Math.abs(off) <= GOOD_W) {
      goods++; score += 50;
      game.feedback.good(x, y - 140, { text: 'GOOD', color: C.mid, size: 46, count: 5, volume: 0.18, sound: 'se_good' });
    } else {
      score += 10;
      game.audio.play('se_tap', 0.25);
    }
    return 'ok';
  }

  // 鉢へ入れる(入力とデモで共通)
  function releaseAt(x, y) {
    if (!drag) return;
    var it = drag.it;
    drag = null; it.held = false;
    if (it.missed || it.sorted) return;
    var b = bowlAt(x, y);
    if (b < 0) { game.audio.tone(180, 0.05, { wave: 'triangle', volume: 0.05 }); return; }
    if (b !== it.state) { missItem(it, BOWL_X[b], BOWL_Y); return; }
    it.sorted = true; it.bowl = b; it.doneT = songT; it.state++;
    sorted++; combo++; if (combo > maxCombo) maxCombo = combo;
    score += 50 + Math.min(combo, 10) * 5;
    game.audio.tone(['C5', 'E5', 'G5'][b], 0.12, { wave: 'square', volume: 0.08 });
    game.fx.burst(BOWL_X[b], BOWL_Y - 40, { color: C.ink, count: 12, speed: 300 });
    if (combo > 0 && combo % 6 === 0) game.fx.popup('COMBO ' + combo, W / 2, PASS_Y - 260, { color: C.ink, size: 60 });
    if (!demoMode && sorted === 9 && !milestone) { milestone = true; game.audio.play('se_powerup', 0.4); }
  }

  function finish(ok) {
    if (over) return;
    over = true; won = ok; outroT = 1.6; running = false; drag = null;
    if (ok) {
      score += maxCombo * 20 + (MISS_MAX - 1 - misses) * 100;
      game.audio.play('se_success', 0.55);
      for (var i = 0; i < 5; i++) game.fx.burst(game.random(180, 900), game.random(800, 1500), { color: C.ink, count: 22, speed: 440 });
    } else {
      game.audio.play('se_failure', 0.5);
    }
  }

  // ---- 入力 ----
  game.onPress(function(x, y) {
    if (state !== S.PLAYING || readyT > 0) return;
    var res = pressAt(x, y);
    if (res === 'none') game.audio.tone(140, 0.03, { wave: 'square', volume: 0.03 });
  });
  game.onMove(function(x, y) {
    if (state !== S.PLAYING || !drag) return;
    var was = bowlAt(drag.x, drag.y);
    drag.x = x; drag.y = y;
    var now = bowlAt(x, y);
    if (now >= 0 && now !== was) game.audio.tone(700 + now * 120, 0.025, { wave: 'square', volume: 0.03 });
  });
  game.onRelease(function(x, y) {
    if (state !== S.PLAYING || !drag) return;
    game.audio.tone(260, 0.03, { wave: 'triangle', volume: 0.04 });
    releaseAt(x, y);
  });
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(false); return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.3); state = S.ATTRACT; initGame(true); demo.t = 0; return; }
  });

  // ---- 描画 ----
  function label(str, x, y, sz, col, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: col === C.ink ? C.paper2 : C.ink, bold: true, align: align || 'center', font: 'serif' });
    game.draw.text(str, x, y, { size: sz, color: col, bold: true, align: align || 'center', font: 'serif' });
  }

  function ring(x, y, r, w, col) {
    game.draw.circle(x, y, r, col || C.ink);
    game.draw.circle(x, y, r - w, C.paper);
  }
  // 横縞の網(卵で濡れた衣・卵の鉢)
  function hatch(x, y, r, step, w) {
    for (var dy = -r + step / 2; dy < r; dy += step) {
      var half = Math.sqrt(Math.max(0, r * r - dy * dy));
      game.draw.line(x - half, y + dy, x + half, y + dy, C.ink, w);
    }
  }
  // 点描(粉)
  function stipple(x, y, r, step, sz) {
    for (var dy = -r; dy <= r; dy += step) {
      var row = Math.round(dy / step);
      for (var dx = -r + (row % 2 ? step / 2 : 0); dx <= r; dx += step) {
        if (dx * dx + dy * dy <= r * r) game.draw.rect(x + dx - sz / 2, y + dy - sz / 2, sz, sz, C.ink);
      }
    }
  }
  // 粗いパン粉
  function crumbs(x, y, r, n, sz) {
    for (var k = 0; k < n; k++) {
      var a = k * 2.399, d = Math.sqrt((k + 0.5) / n) * r;
      game.draw.rect(x + Math.cos(a) * d - sz / 2, y + Math.sin(a) * d - sz / 2, sz, sz * 0.8, C.ink);
    }
  }

  // 具材(状態: 0 何も無し / 1 粉 / 2 卵 / 3 パン粉)
  function food(x, y, r, st, type, fl) {
    var lw = st === 0 ? 8 : 5;
    if (fl) { game.draw.circle(x, y, r * 1.15, C.ink); game.draw.circle(x, y, r * 1.15 - 6, C.pure); return; }
    if (st === 1) for (var f = 0; f < 16; f++) { var a = f / 16 * Math.PI * 2; game.draw.rect(x + Math.cos(a) * (r + 8) - 3, y + Math.sin(a) * (r + 8) - 3, 6, 6, C.ink); }
    if (st === 3) for (var g = 0; g < 12; g++) { var b = g / 12 * Math.PI * 2; game.draw.circle(x + Math.cos(b) * r, y + Math.sin(b) * r, r * 0.22, C.ink); }
    ring(x, y, r, lw);
    if (st === 1) stipple(x, y, r - 14, 16, 5);
    if (st === 2) { hatch(x, y, r - 10, 10, 4); game.draw.rect(x - r * 0.45, y - r * 0.5, r * 0.5, 10, C.pure); }
    if (st === 3) crumbs(x, y, r - 12, 22, 12);
    // 種類の印(海老のしっぽ / 俵のくぼみ / 切り身の筋)
    if (type === 0) { game.draw.line(x + r * 0.8, y - r * 0.2, x + r * 1.25, y - r * 0.55, C.ink, 8); game.draw.line(x + r * 0.8, y - r * 0.2, x + r * 1.3, y - r * 0.05, C.ink, 8); }
    else if (type === 1) game.draw.line(x - r * 0.3, y - r * 0.9, x + r * 0.3, y - r * 0.9, C.ink, 6);
    else game.draw.line(x - r * 0.5, y + r * 0.55, x + r * 0.5, y + r * 0.35, C.ink, 4);
    // 顔(白抜き)
    game.draw.circle(x - r * 0.28, y + r * 0.05, r * 0.13, C.pure);
    game.draw.circle(x + r * 0.28, y + r * 0.05, r * 0.13, C.pure);
    game.draw.circle(x - r * 0.28, y + r * 0.07, r * 0.07, C.ink);
    game.draw.circle(x + r * 0.28, y + r * 0.07, r * 0.07, C.ink);
  }

  var LEADER = [
    [
      '...kkkkkk...',
      '..kwkwkwkk..',
      '..kkkkkkkk..',
      '..kwwwwwwk..',
      '..kwkwwkwk..',
      '..kwwwwwwk..',
      '...kwkkwk...',
      '....kkkk....',
      '..kkwwwwkk..',
      '.kwkwkkwkwk.',
      '.k.kwwwwk.k.',
      '...kwwwwk...',
      '...kk..kk...'
    ],
    [
      '...kkkkkk...',
      '..kwkwkwkk..',
      '..kkkkkkkk..',
      '..kwwwwwwk..',
      '..kwkwwkwk..',
      '..kwwwwwwk..',
      '...kwkkwk...',
      '....kkkk....',
      '..kkwwwwkk..',
      '.kwkwkkwkwk.',
      '.k.kwwwwk.k.',
      '...kwwwwk...',
      '..kk....kk..'
    ]
  ];

  function drawRoom() {
    game.draw.gradient(0, H, [[0, C.paper], [1, C.paper2]]);
    // 黒板と窓の線画
    game.draw.rect(330, 450, 420, 230, C.ink);
    game.draw.rect(342, 462, 396, 206, C.paper);
    stipple(540, 565, 90, 22, 4);
    for (var w = 0; w < 3; w++) game.draw.line(360 + w * 130, 690, 400 + w * 130, 690, C.ink, 6);
    // 班長(拍に合わせて お玉を振る)
    var down = beatPulse > 0.06;
    var lx = 180, ly = 600 + Math.sin(animT * 3) * 4;
    game.draw.sprite(LEADER[down ? 1 : 0], { k: C.ink, w: C.pure }, lx, ly, 14, { anchor: 'center' });
    var hx = lx + 70, hy = ly + 20;
    var tx = down ? hx + 110 : hx + 60, ty = down ? hy + 40 : hy - 110;
    game.draw.line(hx, hy, tx, ty, C.ink, 10);
    game.draw.circle(tx, ty, 26, C.ink);
    game.draw.circle(tx, ty - 6, 16, C.pure);
    // メトロノーム
    var mx = 900, my = 640;
    game.draw.line(mx - 70, my + 70, mx, my - 110, C.ink, 8);
    game.draw.line(mx + 70, my + 70, mx, my - 110, C.ink, 8);
    game.draw.line(mx - 80, my + 70, mx + 80, my + 70, C.ink, 10);
    var ph = running ? Math.sin((songT / SPB) * Math.PI) : Math.sin(animT * 2);
    game.draw.line(mx, my + 50, mx + ph * 90, my - 100, C.ink, 6);
    game.draw.rect(mx + ph * 60 - 14, my - 50, 28, 22, C.ink);
    // ベルト(台)
    game.draw.rect(0, PASS_Y + 86, W, 10, C.ink);
    game.draw.rect(0, PASS_Y + 130, W, 4, C.ink);
    var off = running ? (songT / SPB * 300) % 60 : (animT * 120) % 60;
    for (var r = 0; r < 20; r++) game.draw.circle(r * 60 - off + 60, PASS_Y + 112, 10, C.ink);
    // 受け台(中央)
    game.draw.rect(PASS_X - 130, PASS_Y + 70, 260, 16, C.ink);
    game.draw.line(PASS_X - 130, PASS_Y + 66, PASS_X - 130, PASS_Y + 30, C.ink, 6);
    game.draw.line(PASS_X + 130, PASS_Y + 66, PASS_X + 130, PASS_Y + 30, C.ink, 6);
  }

  function drawPattern() {
    var bar = Math.floor(beatN / 4);
    var cur = sectAt(running ? bar : 1);
    var inv = invertT > 0;
    var x0 = W / 2 - 230;
    game.draw.rect(x0 - 30, PAT_Y - 70, 520, 140, inv ? C.ink : C.paper);
    game.draw.rect(x0 - 30, PAT_Y - 70, 520, 6, C.ink);
    game.draw.rect(x0 - 30, PAT_Y + 64, 520, 6, C.ink);
    for (var k = 0; k < 4; k++) {
      var x = x0 + k * 120 + 40;
      var now = running && beatN % 4 === k;
      var fg = inv ? C.pure : C.ink, bgc = inv ? C.ink : C.paper;
      ring(x, PAT_Y, now ? 46 : 38, now ? 12 : 6, fg);
      game.draw.circle(x, PAT_Y, (now ? 46 : 38) - (now ? 12 : 6), bgc);
      if (cur.pat[k]) game.draw.circle(x, PAT_Y, 22, fg);
    }
    // 予告: 次の拍型の札(鐘のしるし付き)
    if (announce && Math.floor(game.time.elapsed * 8) % 2 === 0) {
      var y2 = PAT_Y + 120;
      game.draw.rect(x0 - 30, y2 - 44, 520, 88, C.ink);
      for (var j = 0; j < 4; j++) {
        var xx = x0 + j * 120 + 40;
        game.draw.circle(xx, y2, 26, C.pure);
        if (announce.pat[j]) game.draw.circle(xx, y2, 14, C.ink);
      }
      game.draw.circle(x0 - 70, y2, 28, C.ink);
      game.draw.rect(x0 - 76, y2 + 20, 12, 14, C.ink);
    }
  }

  function drawBowls() {
    var hov = drag ? bowlAt(drag.x, drag.y) : -1;
    for (var i = 0; i < 3; i++) {
      var x = BOWL_X[i], y = BOWL_Y;
      // 入れる具材の絵(何も無し→粉 / 粉→卵 / 卵→パン粉) と下向きの矢
      food(x, RULE_Y, 40, i, 1, false);
      game.draw.line(x, RULE_Y + 52, x, RULE_Y + 92, C.ink, 6);
      game.draw.line(x - 16, RULE_Y + 76, x, RULE_Y + 94, C.ink, 6);
      game.draw.line(x + 16, RULE_Y + 76, x, RULE_Y + 94, C.ink, 6);
      // 鉢
      var lw = hov === i ? 16 : 9;
      ring(x, y, BOWL_R, lw);
      if (i === 0) { game.draw.circle(x, y, BOWL_R - 30, C.pure); stipple(x, y, BOWL_R - 34, 20, 5); }
      else if (i === 1) { hatch(x, y, BOWL_R - 22, 12, 4); ring(x + 20, y - 10, 42, 8); game.draw.circle(x + 20, y - 10, 14, C.ink); }
      else crumbs(x, y, BOWL_R - 26, 40, 16);
      game.draw.rect(x - BOWL_R - 10, y + BOWL_R * 0.55, BOWL_R * 2 + 20, 12, C.ink);
    }
  }

  function drawItems() {
    for (var i = items.length - 1; i >= 0; i--) {
      var it = items[i];
      if (it.held) continue;
      var fl = hitStop > 0 && flashItem === it;
      if (it.sorted) {
        var k = (songT - it.doneT) / 0.45;
        if (k < 1) food(BOWL_X[it.bowl], BOWL_Y - 60 - (1 - k) * 60, ITEM_R * (1 - k * 0.4), it.state, it.type, false);
        continue;
      }
      if (it.missed) {
        var m = (songT - it.missT) / 0.6;
        if (m < 1 || fl) {
          var p0 = itemPos(it);
          food(p0.x + m * 120, p0.y + m * m * 300, ITEM_R, it.state, it.type, fl);
        }
        continue;
      }
      var p = itemPos(it);
      if (p.x > W + 120) continue;
      food(p.x, p.y, ITEM_R, it.state, it.type, false);
      // 締め切りの点の輪(減っていく。残り0.5秒で点滅)
      if (songT >= arrT(it) - 0.05) {
        var left = (dlT(it) - songT) / (SPB + GOOD_W);
        var n = Math.max(0, Math.ceil(left * 16));
        var blink = dlT(it) - songT < 0.5 && Math.floor(game.time.elapsed * 12) % 2 === 0;
        if (!blink) for (var d = 0; d < n; d++) {
          var a = -Math.PI / 2 + d / 16 * Math.PI * 2;
          game.draw.rect(p.x + Math.cos(a) * (ITEM_R + 34) - 6, p.y + Math.sin(a) * (ITEM_R + 34) - 6, 12, 12, C.ink);
        }
      }
    }
    if (drag) food(drag.x, drag.y - 20, ITEM_R * 1.08, drag.it.state, drag.it.type, false);
  }

  function drawScene() {
    drawRoom();
    drawPattern();
    drawBowls();
    drawItems();
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 230, C.paper);
    game.draw.rect(0, 222, W, 8, C.ink);
    label('SCORE ' + score, 60, 90, 50, C.ink, 'left');
    label('BEST ' + prevBest, 60, 165, 32, C.mid, 'left');
    label(sorted + ' / ' + TOTAL_ITEMS, W - 60, 90, 54, C.ink, 'right');
    for (var i = 0; i < MISS_MAX; i++) {
      if (i < misses) game.draw.rect(W - 250 + i * 70, 148, 44, 44, C.ink);
      else ring(W - 228 + i * 70, 170, 22, 5);
    }
    var prog = Math.min(1, songT / (endBar * 4 * SPB));
    game.draw.rect(0, 222, W * prog, 8, C.mid);
  }

  // ---- ATTRACT: 実ロジックで拍の頭につまんで正しい鉢へ。3個目だけ違う鉢へ入れてMISS。途中で拍型の予告と切り替えも見せる ----
  var demo = { t: 0, hx: W / 2, hy: H * 0.75, press: false };
  var DEMO_LEN = DEMO_END_BAR * 4 * SPB + 0.4;
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % DEMO_LEN;
    if (cyc < dt || demo.t <= dt) { initGame(true); demo.hx = W / 2 + 200; demo.hy = H * 0.75; }
    stepPlay(dt);
    if (drag) {
      var it = drag.it;
      var idx = items.indexOf(it);
      var target = idx === 2 ? (it.state + 1) % 3 : it.state;
      var k = Math.min(1, Math.max(0, (songT - arrT(it)) / (SPB * 0.7)));
      var e = k * k * (3 - 2 * k);
      drag.x = PASS_X + (BOWL_X[target] - PASS_X) * e;
      drag.y = PASS_Y + (BOWL_Y - PASS_Y) * e;
      demo.hx = drag.x; demo.hy = drag.y; demo.press = true;
      if (k >= 1) releaseAt(drag.x, drag.y);
      return;
    }
    demo.press = false;
    var nxt = null;
    for (var i = 0; i < items.length; i++) if (!items[i].sorted && !items[i].missed) { nxt = items[i]; break; }
    var tx = W / 2 + 200, ty = H * 0.75;
    if (nxt && arrT(nxt) - songT < 0.6) { tx = PASS_X; ty = PASS_Y; }
    demo.hx += (tx - demo.hx) * Math.min(1, dt * 9);
    demo.hy += (ty - demo.hy) * Math.min(1, dt * 9);
    if (nxt && songT >= arrT(nxt) && hitStop <= 0) { pressAt(PASS_X, PASS_Y); demo.press = true; }
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;
    if (hitStop > 0) hitStop -= dt;
    else animT += dt;

    if (state === S.ATTRACT) {
      stepDemo(dt);
      drawScene();
      game.draw.hand(demo.hx, demo.hy, { press: demo.press, scale: 15 });
      game.draw.rect(0, 0, W, 230, C.paper);
      game.draw.rect(0, 222, W, 8, C.ink);
      game.draw.rect(W / 2 - 340, 36, 680, 128, C.ink);
      label(GAME_TITLE, W / 2, 102 + Math.sin(t * 3) * 3, 86, C.pure);
      label('HI-SCORE ' + (game.best > 0 ? game.best : 0), W / 2, 196, 34, C.ink);
      if (Math.floor(t * 2) % 2 === 0) label('► 100円 投入 ◄', W / 2, H * 0.955, 50, C.ink);
      else label('TAP TO START', W / 2, H * 0.955, 44, C.mid);
      return;
    }

    if (state === S.RESULT) {
      drawScene();
      game.draw.rect(60, H * 0.26, W - 120, H * 0.33, C.paper, 0.97);
      game.draw.rect(60, H * 0.26, W - 120, 10, C.ink);
      game.draw.rect(60, H * 0.58, W - 120, 10, C.ink);
      label(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.32, 100, C.ink);
      label('SCORE ' + score, W / 2, H * 0.385, 58, C.ink);
      label('PERFECT ' + perfects + '  GOOD ' + goods + '  MISS ' + misses, W / 2, H * 0.43, 34, C.mid);
      label(sorted + ' / ' + TOTAL_ITEMS + '   COMBO ' + maxCombo, W / 2, H * 0.475, 42, C.ink);
      if (won && score > prevBest) label('NEW RECORD', W / 2, H * 0.52, 52, C.ink);
      else label('BEST ' + Math.max(prevBest, won ? score : 0), W / 2, H * 0.52, 40, C.mid);
      if (!won) label('あと' + Math.max(1, TOTAL_ITEMS - sorted) + '個!', W / 2, H * 0.225, 60, C.ink);
      if (Math.floor(t * 2) % 2 === 0) label('TAP TO CONTINUE', W / 2, H * 0.565, 36, C.ink);
      return;
    }

    // ---- PLAYING ----
    if (over) {
      outroT -= dt;
      if (outroT <= 0) {
        state = S.RESULT;
        var stats = { score: score, sorted: sorted, perfect: perfects, good: goods, miss: misses, maxCombo: maxCombo };
        if (won) game.end.success(score, stats);
        else game.end.failure(stats);
      }
    } else if (readyT > 0) {
      readyT -= dt;
      if (readyT <= 0) startClock();
    } else {
      stepPlay(dt);
    }

    drawScene();
    drawHud();
    if (readyT > 0) label(readyT > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.4, 110, C.ink);
    if (over && won) label('FINISH', W / 2, H * 0.4, 100, C.ink);
  });

  game.onStart(function() {
    state = S.ATTRACT;
    initGame(true);
  });
})(game);
