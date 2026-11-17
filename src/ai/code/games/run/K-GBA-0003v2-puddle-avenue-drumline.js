// K-GBA-0003v2-puddle-avenue-drumline.js
// 水たまり並木マーチ — 小太鼓の拍ごとに一歩ずつ進み、水たまりは拍の頭で跳び越えて鼓笛隊の最後尾について行く
// 操作: 拍の頭ごとに画面を押して一歩進む。足元に水たまりが来る拍は押したまま次の拍まで保って跳び越す(早く離すと水たまりに落ちる)
// 終わり: 36拍(9小節)を歩き切って隊列に残ればCLEAR。踏み外し・水たまり落ちで遅れが3歩に達したらGAME OVER
// @mechanic: camera_run
// @theme: rainy_avenue_drumline_tail
// 世界観: 雨上がりの並木道を行進する鼓笛隊の最後尾で、小太鼓を抱えた新入りが拍ごとに一歩ずつ進み、水たまりを跳び越えて列から遅れずについて行く
// 残るもの: 正誤(CLEAR/GAME OVER) + スコア・PERFECT/GOOD/MISS数・最大コンボ
// スタイル: NEO-RETRO

(function (game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // NEO-RETRO: パレットはこの7色だけで完結。大きいドット(12〜13px)。強い差し色は鼓笛隊の赤ひとつ
  var STYLE = { bg: ['#9dbbca', '#e5e8db'], main: ['#2c4552', '#6c977a', '#eee7d2'], accent: ['#e03a3f', '#f0b846'] };
  var SKY = STYLE.bg[0], MIST = STYLE.bg[1], INK = STYLE.main[0], LEAF = STYLE.main[1], CREAM = STYLE.main[2], RED = STYLE.accent[0], BRASS = STYLE.accent[1];

  var TITLE = 'DRUM LINE MARCH';
  var BPM = 120;
  var SPB = 60 / BPM;                 // 表拍(straight)のクロック: 1拍0.5秒
  // 1小節4拍。P = 水たまりの拍(拍の頭で押して踏み切り、次の拍まで保つ)。P の次の拍は着地(入力なし)
  var BARS = ['....', '...P', '..P.', 'P...', '.P..', 'P.P.', '..P.', 'P.P.', '..P.'];
  var COURSE = BARS.join('');
  var TIME_LIMIT = 18;                // 36拍 x 0.5秒。放置でも READY 0.8 + 前奏 1.0 + 18 + 結果 1.8 = 21.6秒で終わる
  var LEAD_BEATS = 2;                 // GO! の後、太鼓のスティック2拍で入る
  var PERF_WIN = 0.06, GOOD_WIN = 0.13;
  var GAP_LIMIT = 3;                  // 遅れ3歩で隊列を見失う
  var CATCH_STREAK = 6;               // 6連続で拍に乗ると1歩追いつく
  var TILE = 160;                     // 石畳1枚 = 1拍
  var KX = 262;                       // 新入りの足元(画面x)。カメラは新入りに付いて行く
  var ROAD_Y = H * 0.635;
  var DRUM_X = W / 2, DRUM_Y = H * 0.835, DRUM_R = 150;
  var DEMO_COURSE = '...P....P...P...';
  var DEMO_SPLASH = 8;                // デモはこの拍の水たまりで指を早く離して落ちて見せる

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  // ── ドット絵(1マス 12〜13px) ──
  var KID_A = ['...yy....', '..kkkk...', '..kkkk...', '..cccc...', '..ckck...', '..cccc...', '.rrcrr...', 'crrrcrryy', '.rrrrryyy', '.rrrrryyy', '..kk.kk..', '..kk..kk.', '.kkk..kkk'];
  var KID_B = ['...yy....', '..kkkk...', '..kkkk...', '..cccc...', '..ckck...', '..cccc...', '.rrcrr...', 'crrrcrryy', '.rrrrryyy', '.rrrrryyy', '..kk.kk..', '.kk..kk..', 'kkk..kkk.'];
  var KID_JUMP = ['...yy....', '..kkkk...', '..kkkk...', '..cccc...', '..ckck...', '..cccc...', 'crrcrrc..', '.rrrcrryy', '.rrrrryyy', '.rrrrryyy', '..kkkkk..', '..kk.kk..', '.........'];
  var MAN_A = ['...yy....', '..kkkk...', '..kkkk...', '..kkkk...', '..cccc...', '..ckck...', '..cccc...', '.rrcrr...', 'crrrcrrc.', '.rrrrrr..', '.rrrrrr..', '..kk.kk..', '..kk..kk.', '.kkk..kkk'];
  var MAN_B = ['...yy....', '..kkkk...', '..kkkk...', '..kkkk...', '..cccc...', '..ckck...', '..cccc...', '.rrcrr...', 'crrrcrrc.', '.rrrrrr..', '.rrrrrr..', '..kk.kk..', '.kk..kk..', 'kkk..kkk.'];
  var MAN_HOP = ['...yy....', '..kkkk...', '..kkkk...', '..kkkk...', '..cccc...', '..ckck...', '..cccc...', 'crrcrrc..', '.rrrcrr..', '.rrrrrr..', '.rrrrrr..', '..kkkkk..', '..kk.kk..', '.........'];
  var PAL = { k: INK, c: CREAM, r: RED, y: BRASS };
  var PAL_FLASH = { k: '#ffffff', c: '#ffffff', r: '#ffffff', y: '#ffffff' };

  // ── 伴奏(笛の行進曲・自作)。16拍で1周、拍クロックから16拍ごとに頭出しして拍とずらさない ──
  var TUNE = [
    ['G4', 0.5], ['C5', 0.5], ['E5', 1], ['D5', 0.5], ['C5', 0.5], ['D5', 1],
    ['E5', 0.5], ['G5', 0.5], ['E5', 0.5], ['C5', 0.5], ['D5', 2],
    ['G4', 0.5], ['C5', 0.5], ['E5', 1], ['F5', 0.5], ['E5', 0.5], ['D5', 1],
    ['C5', 0.5], ['D5', 0.5], ['E5', 0.5], ['D5', 0.5], ['C5', 2],
  ];
  var TUNE_BASS = [['C3', 1], ['G2', 1], ['C3', 1], ['G2', 1], ['C3', 1], ['G2', 1], ['G2', 1], ['D3', 1],
    ['C3', 1], ['G2', 1], ['F2', 1], ['C3', 1], ['G2', 1], ['D3', 1], ['C3', 1], ['C3', 1]];
  function startTune() {
    game.audio.melody(TUNE, { tempo: BPM, wave: 'square', volume: 0.045, loop: true, bass: TUNE_BASS, bassWave: 'triangle', bassVolume: 0.07 });
  }

  function txt(s, x, y, size, col, align) {
    game.draw.text(s, x + 4, y + 4, { size: size, color: INK, bold: true, align: align || 'center' });
    game.draw.text(s, x, y, { size: size, color: col, bold: true, align: align || 'center' });
  }

  function ring(x, y, r, col, w) {
    var n = 40;
    for (var i = 0; i < n; i++) {
      var a0 = i / n * Math.PI * 2, a1 = (i + 1) / n * Math.PI * 2;
      game.draw.line(x + Math.cos(a0) * r, y + Math.sin(a0) * r, x + Math.cos(a1) * r, y + Math.sin(a1) * r, col, w);
    }
  }

  function snap(v) { return Math.round(v / 12) * 12; }

  // ── コースと判定(プレイとデモで共通の実ロジック) ──
  function charAt(r, b) {
    var n = r.course.length;
    if (r.loop) return r.course.charAt(((b % n) + n) % n);
    if (b < 0 || b >= n) return '.';
    return r.course.charAt(b);
  }
  function needOf(r, b) {
    if (b < 0) return 'N';
    if (charAt(r, b) === 'P') return 'J';
    if (charAt(r, b - 1) === 'P') return 'L';
    return 'S';
  }

  function newRun(course, loop, vol) {
    return {
      course: course, loop: loop, vol: vol, play: false, nb: loop ? 1e9 : course.length,
      t: -LEAD_BEATS * SPB, lastBeat: -LEAD_BEATS - 1, next: 0, judged: {},
      gap: 0, gapVis: 0, combo: 0, maxCombo: 0, streak: 0, perfect: 0, good: 0, miss: 0, score: 0,
      air: -1, holding: false, splashT: 0, flashT: 0, foot: 0, hitT: 0, pulse: 0,
    };
  }

  function splashFx(r) {
    game.fx.burst(KX + 40, ROAD_Y + 10, { color: SKY, count: 18, speed: 420 });
    game.fx.burst(KX + 40, ROAD_Y + 10, { color: CREAM, count: 8, speed: 260 });
    game.audio.tone(900, 0.18, { wave: 'triangle', volume: 0.12 * r.vol, slide: -700 });
  }

  function hitBeat(r, k, d) {
    r.judged[k] = true;
    var perfect = Math.abs(d) <= PERF_WIN;
    if (perfect) r.perfect++; else r.good++;
    r.combo++; r.streak++;
    if (r.combo > r.maxCombo) r.maxCombo = r.combo;
    r.score += (perfect ? 100 : 50) + Math.min(r.combo, 20) * 5;
    r.hitT = 0.25;
    if (needOf(r, k) === 'J') { r.air = k; game.audio.play('se_jump', 0.3 * r.vol); }
    else r.foot = 1 - r.foot;
    game.audio.tone(perfect ? 1250 : 980, 0.05, { wave: 'square', volume: 0.07 * r.vol }); // 小太鼓のひと打ち
    game.feedback.good(KX, ROAD_Y - 250, { text: perfect ? 'PERFECT' : 'GOOD', color: perfect ? BRASS : CREAM, size: perfect ? 58 : 46, count: perfect ? 14 : 8, sound: perfect ? 'se_good' : 'se_tap', volume: 0.3 * r.vol });
    if (r.gap > 0 && r.streak >= CATCH_STREAK) {
      r.gap--; r.streak = 0;
      game.fx.popup('NICE', KX + 260, ROAD_Y - 360, { color: BRASS, size: 56 });
      game.audio.play('se_powerup', 0.4 * r.vol);
    }
    if (r.combo === 10 || r.combo === 20 || r.combo === 30) {
      game.fx.popup(r.combo + ' COMBO', W / 2, H * 0.3, { color: RED, size: 72 });
      game.audio.play('se_milestone', 0.45 * r.vol);
    }
  }

  function missBeat(r, k, kind) {
    if (r.play && fatal) return;
    r.judged[k] = true;
    r.miss++; r.combo = 0; r.streak = 0; r.gap++; r.flashT = 0.35;
    var wet = kind === 'splash' || needOf(r, k) === 'J';
    if (wet) { r.splashT = 0.45; splashFx(r); }
    if (r.play && r.gap >= GAP_LIMIT) {
      // 致命の踏み外し: ヒットストップで止めて白く拡大 → 解けた瞬間に feedback.bad
      fatal = true; hitStop = 0.45; r.flashT = 0.45;
      game.audio.stopBgm();
      game.audio.tone(150, 0.3, { wave: 'sawtooth', volume: 0.12, slide: -70 });
      return;
    }
    game.feedback.bad(KX, ROAD_Y - 250, { text: 'MISS', volume: 0.5 * r.vol, shake: wet ? 10 : 6 });
  }

  function stray(r) {
    game.audio.tone(520, 0.03, { wave: 'square', volume: 0.04 * r.vol });
    game.fx.burst(DRUM_X, DRUM_Y, { color: CREAM, count: 3, speed: 90 });
  }

  function pressRun(r) {
    r.holding = true;
    var k = Math.round(r.t / SPB);
    var nd = needOf(r, k);
    if (k >= r.nb || r.judged[k] || nd === 'L' || nd === 'N') { stray(r); return 'stray'; }
    var d = r.t - k * SPB;
    if (Math.abs(d) <= GOOD_WIN) { hitBeat(r, k, d); return 'hit'; }
    missBeat(r, k, 'off');
    return 'miss';
  }

  function releaseRun(r) {
    r.holding = false;
    if (r.air < 0) return 'free';
    if (r.t < (r.air + 1) * SPB - GOOD_WIN) {
      var b = r.air;
      r.air = -1;
      missBeat(r, b, 'splash');
      return 'early';
    }
    return 'hold';
  }

  function onBeat(r, b) {
    r.pulse = 1;
    // 拍クロックそのものを大太鼓で鳴らす(小節頭は強く)
    game.audio.tone(b % 4 === 0 ? 98 : 82, 0.1, { wave: 'triangle', volume: (b % 4 === 0 ? 0.26 : 0.18) * r.vol });
    if (b < 0) game.audio.tone(1568, 0.03, { wave: 'square', volume: 0.05 * r.vol });
    // 次の拍が水たまり: 1拍前(0.5秒前)にしずく音で予告
    if (b + 1 < r.nb && needOf(r, b + 1) === 'J') game.audio.tone(1760, 0.08, { wave: 'sine', volume: 0.08 * r.vol, slide: -900 });
    if (b >= 0 && b % 16 === 0 && b < r.nb) startTune();
  }

  function stepRun(r, dt) {
    r.t += dt;
    var bi = Math.floor(r.t / SPB + 1e-6);
    while (r.lastBeat < bi) { r.lastBeat++; onBeat(r, r.lastBeat); }
    if (r.air >= 0 && r.t >= (r.air + 1) * SPB) {
      var lb = r.air + 1;
      r.air = -1; r.judged[lb] = true; r.foot = 1 - r.foot;
      game.audio.tone(330, 0.05, { wave: 'triangle', volume: 0.12 * r.vol });
      game.fx.burst(KX + 30, ROAD_Y, { color: CREAM, count: 6, speed: 160 });
    }
    while (r.next < r.nb && (r.judged[r.next] || r.t > r.next * SPB + GOOD_WIN)) {
      var b = r.next;
      if (!r.judged[b]) {
        var nd = needOf(r, b);
        if (nd === 'L') r.judged[b] = true;
        else missBeat(r, b, nd === 'J' ? 'splash' : 'late');
      }
      r.next++;
      if (r.loop && r.next > 16) delete r.judged[r.next - 16];
      if (r.play && fatal) break;
    }
    if (r.splashT > 0) r.splashT -= dt;
    if (r.flashT > 0 && !(r.play && fatal)) r.flashT -= dt;
    if (r.hitT > 0) r.hitT -= dt;
    if (r.pulse > 0) r.pulse = Math.max(0, r.pulse - dt * 4);
    r.gapVis += (r.gap - r.gapVis) * Math.min(1, dt * 4);
  }

  // ── 描画 ──
  function drawTree(x, base, i) {
    var top = base - 520;
    game.draw.rect(snap(x - 18), top + 200, 36, base - top - 200, INK);
    game.draw.circle(x, top + 170, 132, LEAF);
    game.draw.circle(x - 84, top + 236, 92, LEAF);
    game.draw.circle(x + 84, top + 230, 96, LEAF);
    game.draw.rect(snap(x - 60), snap(top + 120), 24, 24, INK, 0.35);
    game.draw.rect(snap(x + 36), snap(top + 204), 24, 24, INK, 0.35);
    game.draw.rect(snap(x - 12), snap(top + 60), 24, 24, CREAM, 0.35);
    // 葉から落ちるしずく(常時動いている)
    for (var d = 0; d < 2; d++) {
      var dy = (game.time.elapsed * 420 + i * 97 + d * 151) % 230;
      game.draw.rect(snap(x - 70 + d * 120), top + 300 + dy, 10, 22, CREAM, 0.8);
    }
  }

  function drawPuddle(r, x, b) {
    var px = x + 14, pw = TILE - 28;
    game.draw.circle(px + 18, ROAD_Y + 22, 18, SKY);
    game.draw.circle(px + pw - 18, ROAD_Y + 22, 18, SKY);
    game.draw.rect(px + 18, ROAD_Y + 4, pw - 36, 36, SKY);
    game.draw.rect(px + 30, ROAD_Y + 12, pw * 0.4, 6, CREAM, 0.8);
    var rip = (game.time.elapsed * 1.6 + b * 0.37) % 1;
    game.draw.rect(px + pw * 0.5 - rip * 40, ROAD_Y + 26, rip * 80, 4, CREAM, 0.6 * (1 - rip));
    // 踏み切りの予告: 次に来る水たまりは縁が金色に点滅し、跳び越す弧を点線で見せる
    var dtb = b * SPB - r.t;
    if (!r.judged[b] && dtb > -GOOD_WIN && dtb < 0.8) {
      if (Math.floor(game.time.elapsed * 10) % 2 === 0) {
        game.draw.rect(px, ROAD_Y - 2, pw, 6, BRASS);
        game.draw.rect(px, ROAD_Y + 40, pw, 6, BRASS);
      }
    }
    if (!r.judged[b] && dtb > -GOOD_WIN && dtb < 1.6) {
      for (var k = 0; k <= 8; k++) {
        var f = k / 8;
        game.draw.rect(x + f * TILE - 6, ROAD_Y - 30 - Math.sin(Math.PI * f) * 130, 12, 12, BRASS, 0.85);
      }
    }
  }

  function drawScene(r) {
    var beatPos = r.t / SPB;
    var cam = beatPos * TILE;
    game.draw.clear(MIST);
    game.draw.gradient(0, ROAD_Y, [[0, SKY], [0.7, MIST], [1, CREAM]]);
    for (var c = 0; c < 4; c++) {
      var cx = ((c * 340 - cam * 0.15) % 1360 + 1360) % 1360 - 160;
      var cy = H * 0.15 + (c % 2) * 96;
      game.draw.rect(snap(cx), snap(cy), 192, 48, CREAM, 0.8);
      game.draw.rect(snap(cx + 48), snap(cy - 36), 108, 36, CREAM, 0.8);
    }
    // 遠景の生け垣
    for (var g = 0; g < 9; g++) {
      var gx = ((g * 150 - cam * 0.35) % 1350 + 1350) % 1350 - 120;
      game.draw.circle(gx, ROAD_Y - 40, 92, LEAF, 0.55);
    }
    for (var i = 0; i < 6; i++) {
      var tx = ((i * 270 - cam * 0.6) % 1620 + 1620) % 1620 - 170;
      drawTree(tx, ROAD_Y - 20, i);
    }
    // 街灯(近景寄り)
    for (var l = 0; l < 3; l++) {
      var lx = ((l * 520 - cam * 0.85) % 1560 + 1560) % 1560 - 120;
      game.draw.rect(snap(lx), ROAD_Y - 430, 16, 430, INK);
      game.draw.rect(snap(lx) - 30, ROAD_Y - 460, 76, 36, INK);
      game.draw.rect(snap(lx) - 18, ROAD_Y - 448, 52, 18, BRASS, 0.9);
    }
    // 濡れた石畳: 1枚 = 1拍。継ぎ目が足元を通る瞬間が拍の頭
    game.draw.rect(0, ROAD_Y, W, 86, INK);
    var first = Math.floor(beatPos) - 3;
    for (var b = first; b < first + 12; b++) {
      var x = KX + (b - beatPos) * TILE;
      if (x > W || x + TILE < 0) continue;
      game.draw.rect(x + 6, ROAD_Y + 8, TILE - 12, 66, CREAM, 0.14);
      game.draw.rect(x + 6, ROAD_Y + 8, TILE - 12, 8, CREAM, 0.12);
      if (charAt(r, b) === 'P' && b >= 0 && b < r.nb) drawPuddle(r, x, b);
    }
    // 縁石 = 拍の譜面(四角 = 一歩 / 金の帯 = 押したまま跳ぶ)
    var cy0 = ROAD_Y + 94;
    game.draw.rect(0, cy0, W, 56, CREAM, 0.92);
    game.draw.rect(0, cy0 + 56, W, 10, INK);
    for (b = first; b < first + 12; b++) {
      x = KX + (b - beatPos) * TILE;
      if (x > W + TILE || x < -TILE || b < 0 || b >= r.nb) continue;
      var nd = needOf(r, b);
      var done = r.judged[b];
      if (nd === 'J') {
        game.draw.rect(x, cy0 + 14, TILE, 28, BRASS, done ? 0.3 : 1);
        game.draw.circle(x, cy0 + 28, 18, done ? CREAM : RED);
        game.draw.circle(x + TILE, cy0 + 28, 12, BRASS, done ? 0.3 : 1);
      } else if (nd === 'S') {
        game.draw.rect(x - 14, cy0 + 14, 28, 28, done ? LEAF : INK, done ? 0.4 : 1);
      }
    }
    game.draw.rect(KX - 5, cy0 - 10, 10, 78, RED);
    // 芝と親指ゾーン
    game.draw.gradient(cy0 + 66, H, [[0, LEAF], [1, INK]]);
  }

  function drawBand(r) {
    var beatPos = r.t / SPB;
    var ph = beatPos - Math.floor(beatPos);
    for (var i = 3; i >= 0; i--) {
      var mx = KX + (i + 1) * TILE + r.gapVis * TILE;
      if (mx > W + 120) continue;
      var u = beatPos + (i + 1) + r.gapVis;   // その隊員の足元の拍
      var ub = Math.floor(u);
      var inPuddle = charAt(r, ub) === 'P' && ub >= 0 && ub < r.nb;
      var hop = inPuddle ? Math.sin(Math.PI * (u - ub)) * 96 : 0;   // 前の隊員が先に跳ぶ = 跳ぶ拍の手本
      var bob = hop > 0 ? 0 : Math.sin(Math.PI * ph) * 10;
      var frame = hop > 0 ? MAN_HOP : (ub % 2 === 0 ? MAN_A : MAN_B);
      var y = ROAD_Y - 84 - hop - bob;
      game.draw.rect(mx - 48, ROAD_Y + 2, 96, 12, INK, 0.45);
      game.draw.sprite(frame, PAL, mx, y, 12, { anchor: 'center' });
      if (i === 0) {
        game.draw.circle(mx + 34, y + 14, 52, RED);
        game.draw.circle(mx + 34, y + 14, 40, CREAM);
        game.draw.rect(mx + 30, y - 38, 8, 104, BRASS);
      } else if (i === 3) {
        // 指揮杖: 拍の頭で振り下ろし、拍の間に持ち上がる(目に見える拍)
        var lift = 40 + 110 * Math.min(1, ph / 0.85);
        if (ph > 0.85) lift = 150 - (ph - 0.85) / 0.15 * 110;
        game.draw.line(mx + 40, y - 6, mx + 64, y - 6 - lift, INK, 10);
        game.draw.circle(mx + 64, y - 6 - lift, 18, BRASS);
        game.draw.rect(mx - 10, y - 124, 20, 30, RED);
      } else {
        game.draw.line(mx + 18, y - 36, mx + 92, y - 44, CREAM, 8);
      }
    }
  }

  function drawKid(r, frozen) {
    var air = 0;
    if (r.air >= 0) air = Math.sin(Math.PI * Math.min(1, Math.max(0, (r.t - r.air * SPB) / SPB))) * 130;
    var ph = r.t / SPB - Math.floor(r.t / SPB);
    var bob = r.air >= 0 ? 0 : Math.sin(Math.PI * ph) * 8;
    var low = r.splashT > 0 ? 28 : 0;
    var frame = r.air >= 0 ? KID_JUMP : (r.foot ? KID_B : KID_A);
    var flash = frozen || (r.flashT > 0 && Math.floor(r.flashT * 20) % 2 === 0);
    var px = frozen ? 17 : 13;
    var y = ROAD_Y - 84 - air - bob + low;
    game.draw.rect(KX - 44, ROAD_Y + 2, 88, 12, INK, 0.45);
    game.draw.sprite(frame, flash ? PAL_FLASH : PAL, KX + 20, y - (px - 13) * 6, px, { anchor: 'center' });
    if (r.splashT > 0) {
      game.draw.circle(KX + 10, ROAD_Y + 4, 54, SKY, 0.85);
      game.draw.rect(KX - 40, ROAD_Y - 26, 12, 30, CREAM);
      game.draw.rect(KX + 50, ROAD_Y - 34, 12, 38, CREAM);
    }
  }

  function drawDrum(r) {
    var R = DRUM_R + (r.hitT > 0 ? r.hitT * 50 : 0) + r.pulse * 6;
    game.draw.circle(DRUM_X, DRUM_Y + 26, R + 16, RED);
    game.draw.circle(DRUM_X, DRUM_Y, R + 16, BRASS);
    game.draw.circle(DRUM_X, DRUM_Y, R, CREAM);
    for (var s = 0; s < 8; s++) {
      var a = s / 8 * Math.PI * 2;
      game.draw.rect(DRUM_X + Math.cos(a) * (R + 8) - 7, DRUM_Y + Math.sin(a) * (R + 8) - 7, 14, 14, INK);
    }
    // 跳んでいる間は太鼓の面に金の円が残り、縮み切ったら着地(押したまま保つ長さ)
    if (r.air >= 0) {
      var rem = 1 - (r.t - r.air * SPB) / SPB;
      game.draw.circle(DRUM_X, DRUM_Y, Math.max(0, R * rem), BRASS, 0.85);
    }
    // 次の拍へ縮んでくる輪: 太鼓の縁に重なった瞬間が拍の頭。二重の金輪 = 水たまり(押したまま)
    for (var b = Math.max(0, r.next); b < r.next + 4; b++) {
      var nd = needOf(r, b);
      if (nd === 'L' || nd === 'N' || r.judged[b] || b >= r.nb) continue;
      var dtb = b * SPB - r.t;
      if (dtb < -GOOD_WIN || dtb > SPB * 1.6) continue;
      var rr = R + 16 + Math.max(0, dtb) / SPB * 170;
      ring(DRUM_X, DRUM_Y, rr, nd === 'J' ? BRASS : INK, nd === 'J' ? 14 : 10);
      if (nd === 'J') ring(DRUM_X, DRUM_Y, rr + 26, BRASS, 6);
    }
    game.draw.circle(DRUM_X, DRUM_Y, 26 + r.pulse * 14, RED, 0.5 + r.pulse * 0.5);
  }

  function drawHud(r) {
    game.draw.rect(0, 0, W, 230, INK, 0.6);
    txt('SCORE ' + r.score, 40, 66, 44, CREAM, 'left');
    for (var i = 0; i < GAP_LIMIT; i++) {
      var lost = i >= GAP_LIMIT - r.gap;
      game.draw.circle(W - 64 - i * 84, 66, 30, lost ? INK : RED);
      game.draw.circle(W - 64 - i * 84, 66, 19, lost ? LEAF : CREAM);
    }
    var bb = Math.floor(r.t / SPB);
    var inBar = ((bb % 4) + 4) % 4;
    for (var k = 0; k < 4; k++) {
      var on = inBar === k && r.t >= -LEAD_BEATS * SPB;
      game.draw.rect(W / 2 - 150 + k * 80 - (on ? 6 : 0), 128 - (on ? 6 : 0), on ? 52 : 40, on ? 52 : 40, on ? (k === 0 ? RED : BRASS) : CREAM, on ? 1 : 0.35);
    }
    if (r.combo >= 2) txt(r.combo + ' COMBO', W - 40, 150, 40, BRASS, 'right');
    var progress = Math.max(0, Math.min(1, r.t / (r.nb * SPB)));
    game.draw.rect(40, 198, W - 80, 16, CREAM, 0.3);
    game.draw.rect(40, 198, (W - 80) * progress, 16, BRASS);
    game.draw.rect(40 + (W - 80) * progress - 8, 190, 16, 32, RED);
  }

  function drawResult() {
    game.draw.rect(70, H * 0.25, W - 140, H * 0.27, INK, 0.9);
    txt(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.29, 100, won ? BRASS : RED);
    txt('SCORE ' + finalScore, W / 2, H * 0.345, 60, CREAM);
    txt('PERFECT ' + run.perfect + '  GOOD ' + run.good + '  MISS ' + run.miss, W / 2, H * 0.39, 40, CREAM);
    txt('COMBO ' + run.maxCombo, W / 2, H * 0.43, 44, BRASS);
    if (newRecord) txt('NEW RECORD', W / 2, H * 0.475, 56, RED);
    else txt('BEST ' + Math.max(prevBest, game.best || 0), W / 2, H * 0.475, 44, LEAF);
    if (!won) txt('あと' + Math.max(1, run.nb - run.next) + '拍!', W / 2, H * 0.505, 44, BRASS);
  }

  // ── 状態 ──
  var run, ready, hitStop, fatal, over, won, endT, prevBest, finalScore, newRecord, confT;

  function initGame() {
    run = newRun(COURSE, false, 1);
    run.play = true;
    ready = 0.8; hitStop = 0; fatal = false; over = false; won = false; endT = 0;
    prevBest = game.best || 0; finalScore = 0; newRecord = false; confT = 0;
  }

  function finish(win) {
    if (over) return;
    over = true; won = win; endT = 1.8;
    finalScore = win ? run.score + (GAP_LIMIT - run.gap) * 150 : run.score;
    newRecord = win && finalScore > prevBest;
    game.audio.stopBgm();
    game.audio.play(win ? 'se_success' : 'se_failure', 0.6);
    if (newRecord) game.fx.popup('NEW RECORD', W / 2, H * 0.22, { color: BRASS, size: 76 });
  }

  // ── ATTRACT: 実ロジックでゴーストが太鼓を叩く。2つ目の水たまりは指を早く離して落ち、遅れて見せる ──
  var demo = { t: 0, run: null, pb: 0, relAt: -1, lastPress: -9 };
  function resetDemo() {
    demo.run = newRun(DEMO_COURSE, true, 0.35);
    demo.run.t = -SPB; demo.run.lastBeat = -2;
    demo.pb = 0; demo.relAt = -1; demo.lastPress = -9;
  }
  function stepDemo(dt) {
    demo.t += dt;
    if (!demo.run || demo.t <= dt) resetDemo();
    var r = demo.run;
    stepRun(r, dt);
    while (needOf(r, demo.pb) === 'L') demo.pb++;
    if (!r.holding && r.t >= demo.pb * SPB - 0.008) {
      var nd = needOf(r, demo.pb);
      var k = demo.pb % DEMO_COURSE.length;
      pressRun(r);
      demo.lastPress = r.t;
      if (nd === 'J') demo.relAt = k === DEMO_SPLASH ? r.t + 0.14 : (demo.pb + 1) * SPB + 0.04;
      else demo.relAt = r.t + 0.12;
      demo.pb++;
    }
    if (r.holding && demo.relAt >= 0 && r.t >= demo.relAt) { releaseRun(r); demo.relAt = -1; }
  }

  function canPlay() { return state === S.PLAYING && !over && hitStop <= 0; }

  game.onTap(function () {
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.6); game.audio.stopBgm(); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.3); state = S.ATTRACT; initGame(); demo.t = 0; resetDemo(); return; }
  });

  game.onPress(function () {
    if (!canPlay()) return;
    if (ready > 0) { game.audio.tone(440, 0.03, { wave: 'square', volume: 0.04 }); return; }
    var res = pressRun(run);
    if (res === 'hit') game.fx.burst(DRUM_X, DRUM_Y - 30, { color: BRASS, count: 6, speed: 220 });
  });

  game.onRelease(function () {
    if (!canPlay() || ready > 0) return;
    var res = releaseRun(run);
    if (res === 'hold') game.audio.tone(392, 0.04, { wave: 'triangle', volume: 0.06 });
  });

  game.onUpdate(function (dt) {
    if (dt > 0.05) dt = 0.05;

    if (state === S.ATTRACT) {
      stepDemo(dt);
      var dr = demo.run;
      drawScene(dr);
      drawBand(dr);
      drawKid(dr, false);
      drawDrum(dr);
      var toNext = demo.pb * SPB - dr.t;
      var lift = dr.holding ? 0 : Math.min(1, Math.max(0, toNext) / 0.22) * 70;
      game.draw.hand(DRUM_X + 40, DRUM_Y - 10 - lift, { press: dr.holding, scale: 16 });
      game.draw.rect(0, 0, W, 230, INK, 0.6);
      txt(TITLE, W / 2, 92, 78, RED);
      txt('HI-SCORE ' + (game.best || 0), W / 2, 180, 40, CREAM);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.965, 44, BRASS);
      else txt('TAP TO START', W / 2, H * 0.965, 40, CREAM);
      return;
    }

    if (state === S.PLAYING) {
      if (over) {
        endT -= dt;
        if (won) {
          confT -= dt;
          if (confT <= 0) { confT = 0.16; game.fx.burst(game.random(140, W - 140), game.random(H * 0.16, H * 0.5), { color: [RED, BRASS, CREAM][Math.floor(game.random(0, 3))], count: 14, speed: 340 }); }
        }
        if (endT <= 0) {
          state = S.RESULT;
          var stats = { perfect: run.perfect, good: run.good, miss: run.miss, maxCombo: run.maxCombo, gap: run.gap, score: finalScore };
          if (won) game.end.success(finalScore, stats);
          else game.end.failure(stats);
        }
      } else if (hitStop > 0) {
        hitStop -= dt;
        if (hitStop <= 0) {
          run.flashT = 0;
          game.feedback.bad(KX, ROAD_Y - 260, { text: 'MISS', size: 76, shake: 18 });
          finish(false);
        }
      } else if (ready > 0) {
        ready -= dt;
        if (ready <= 0) game.audio.play('se_tap', 0.4);
      } else {
        stepRun(run, dt);
        if (!fatal && run.next >= run.nb && run.air < 0) finish(true);
      }
    }

    drawScene(run);
    drawBand(run);
    drawKid(run, hitStop > 0);
    drawDrum(run);
    drawHud(run);
    if (state === S.PLAYING && ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.42, 116, RED);
    if (over || state === S.RESULT) drawResult();
    if (state === S.RESULT) txt('TAP TO CONTINUE', W / 2, H * 0.965, 40, CREAM);
  });

  game.onStart(function () {
    state = S.ATTRACT;
    initGame();
    resetDemo();
    startTune();
  });
})(game);
