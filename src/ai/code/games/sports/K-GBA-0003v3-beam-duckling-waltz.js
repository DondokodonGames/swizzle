// K-GBA-0003v3-beam-duckling-waltz.js
// アヒルの子の平均台ワルツ — 3拍子に乗って左右の足踏みを続け、揺れる平均台の上で重心を真ん中に戻しながら端まで渡る
// 操作: 拍の頭で画面の左半分=左足/右半分=右足を押す。2拍目・3拍目は左右交互。1拍目(強拍)は体が傾いている側の足を踏んで重心を真ん中に戻す
// 終わり: 12小節(36拍)を落ちずに歩き切ればCLEAR。傾きが限界に達して台から落ちたらGAME OVER
// @mechanic: balance
// @theme: gym_beam_duckling_waltz
// 世界観: 体操教室の平均台の上で、行進の稽古をするアヒルの子が3拍子の足踏みで重心を真ん中に保ち、落ちずに端で待つ先生のもとまで渡り切る
// 残るもの: 正誤(CLEAR/GAME OVER) + スコア・PERFECT/GOOD/MISS数・渡れた小節数
// スタイル: HYPERCASUAL 3D

(function (game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // HYPERCASUAL 3D: 白〜淡色の背景に単色の丸い塊。真下に柔らかい影。見た目どおりの判定
  var STYLE = { bg: ['#f7f8fc', '#e1e7f0'], main: ['#ffc93c', '#97a9c4', '#ffffff'], accent: ['#ff6b5a', '#3b4a63'] };
  var PAPER = STYLE.bg[0], HAZE = STYLE.bg[1], DUCK = STYLE.main[0], BEAM = STYLE.main[1], WHITE = STYLE.main[2], CORAL = STYLE.accent[0], INK = STYLE.accent[1];
  var DUCK_DARK = '#efa920';

  var TITLE = 'BEAM WALTZ';
  var BPM = 120;
  var SPB = 60 / BPM;                 // 3拍子(waltz)の1拍 = 0.5秒、1小節 = 1.5秒
  var BAR = SPB * 3;
  var BARS = 12;
  var NB = BARS * 3;
  var TIME_LIMIT = 18;                // 12小節 x 1.5秒。放置でも READY 0.8 + 前奏1小節 1.5 + 18 + 結果 1.8 = 22.1秒で終わる
  var PERF_WIN = 0.06, GOOD_WIN = 0.13;
  var CENTER_TOL = 0.15;              // これより真ん中に近ければ1拍目はどちらの足でもよい
  var GRAVITY = 0.4;                  // 傾きは放っておくと自分で大きくなる
  // 小節ごとの台の揺れ [向き, 強さ]。同じ向きが2小節続くところが「いつもの交互」では外れる罠
  var SWAY = [[-1, 0.25], [1, 0.3], [-1, 0.34], [1, 0.38], [1, 0.38], [-1, 0.42], [1, 0.44], [-1, 0.46], [-1, 0.46], [1, 0.48], [-1, 0.48], [1, 0.48]];
  var DEMO_SWAY = [[-1, 0.3], [1, 0.3], [-1, 0.3], [1, 0.3]];
  var DEMO_WRONG_BAR = 1;             // デモはこの小節の1拍目で反対の足を踏み、ぐらつく失敗例を見せる

  var BEAM_X = W / 2;
  var NEAR_Y = H * 0.70;
  var DUCK_Y = H * 0.6;
  var GAUGE_Y = H * 0.765, GAUGE_HALF = W * 0.32;
  var PAD_Y = H * 0.885, PAD_R = 138, PAD_LX = W * 0.27, PAD_RX = W * 0.73;
  var TRI_X = W - 170, TRI_Y = H * 0.2;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  // ── キャラ(後ろ姿のアヒルの子・紙の帽子)と先生 ──
  var BODY_BOTH = ['....yyyy....', '..yyyyyyyy..', '.yyyyyyyyyy.', 'dyyyyyyyyyyd', 'dyyyyyyyyyyd', 'yyyyyyyyyyyy', '.yyyyyyyyyy.', '..yyyyyyyy..', '...oo..oo...', '..ooo..ooo..'];
  var BODY_LUP = ['....yyyy....', '..yyyyyyyy..', '.yyyyyyyyyy.', 'dyyyyyyyyyyd', 'dyyyyyyyyyyd', 'yyyyyyyyyyyy', '.yyyyyyyyyy.', '..yyyyyyyy..', '..ooo..oo...', '.......ooo..'];
  var BODY_RUP = ['....yyyy....', '..yyyyyyyy..', '.yyyyyyyyyy.', 'dyyyyyyyyyyd', 'dyyyyyyyyyyd', 'yyyyyyyyyyyy', '.yyyyyyyyyy.', '..yyyyyyyy..', '...oo..ooo..', '..ooo.......'];
  var BODY_FLAP = ['....yyyy....', 'd.yyyyyyyy.d', 'ddyyyyyyyydd', '.dyyyyyyyyd.', '.yyyyyyyyyy.', 'yyyyyyyyyyyy', '.yyyyyyyyyy.', '..yyyyyyyy..', '...oo..oo...', '..ooo..ooo..'];
  var HEAD = ['...cc...', '..cccc..', '.cccccc.', '.yyyyyy.', 'yyyyyyyy', 'yyyyyyyy', '.yyyyyy.', '..yyyy..'];
  var MOM_A = ['...yyy..', '..yyyyy.', '..ykyyk.', '..yyooy.', '.yyyyyy.', 'dyyyyyyd', 'yyyyyyyy', '.yyyyyy.', '..o..o..'];
  var MOM_B = ['...yyy..', '..yyyyy.', '..ykyyk.', '..yyooy.', 'dyyyyyyd', 'dyyyyyyd', '.yyyyyy.', '.yyyyyy.', '..o..o..'];
  var PAL = { y: DUCK, d: DUCK_DARK, o: CORAL, c: CORAL, k: INK };
  var PAL_FLASH = { y: '#ffffff', d: '#ffffff', o: '#ffffff', c: '#ffffff', k: '#ffffff' };

  // ── 伴奏: 自作の3拍子ワルツ(ズン・チャッ・チャッ)。24拍で1周、拍クロックから頭出しして拍とずらさない ──
  var WALTZ = [
    ['C5', 2], ['A4', 1], ['Bb4', 1], ['C5', 1], ['D5', 1], ['C5', 2], ['F4', 1], ['G4', 2], ['R', 1],
    ['A4', 2], ['C5', 1], ['F5', 1], ['E5', 1], ['D5', 1], ['C5', 1.5], ['Bb4', 0.5], ['G4', 1], ['F4', 2], ['R', 1],
  ];
  var WALTZ_BASS = [
    ['F2', 1], ['A3', 1], ['A3', 1], ['Bb2', 1], ['F3', 1], ['F3', 1], ['F2', 1], ['A3', 1], ['A3', 1], ['C3', 1], ['E3', 1], ['E3', 1],
    ['F2', 1], ['A3', 1], ['A3', 1], ['Bb2', 1], ['D3', 1], ['D3', 1], ['C3', 1], ['E3', 1], ['E3', 1], ['F2', 1], ['A3', 1], ['F3', 1],
  ];
  function startTune() {
    game.audio.melody(WALTZ, { tempo: BPM, wave: 'triangle', volume: 0.07, loop: true, bass: WALTZ_BASS, bassWave: 'sine', bassVolume: 0.09 });
  }

  function txt(s, x, y, size, col, align) {
    game.draw.text(s, x + 3, y + 4, { size: size, color: HAZE, bold: true, align: align || 'center' });
    game.draw.text(s, x, y, { size: size, color: col, bold: true, align: align || 'center' });
  }

  function ellipse(x, y, rx, ry, col, alpha) {
    var n = 7;
    for (var i = -n; i < n; i++) {
      var f = (i + 0.5) / n;
      var w = rx * Math.sqrt(Math.max(0, 1 - f * f));
      game.draw.rect(x - w, y + i * ry / n, w * 2, ry / n + 0.6, col, alpha);
    }
  }

  function ring(x, y, r, col, w) {
    var n = 40;
    for (var i = 0; i < n; i++) {
      var a0 = i / n * Math.PI * 2, a1 = (i + 1) / n * Math.PI * 2;
      game.draw.line(x + Math.cos(a0) * r, y + Math.sin(a0) * r, x + Math.cos(a1) * r, y + Math.sin(a1) * r, col, w);
    }
  }

  // ── 拍と重心(プレイとデモで共通の実ロジック) ──
  function swayOf(r, m) {
    if (m < 0) return [0, 0];
    if (r.loop) return r.sway[m % r.sway.length];
    return m < r.sway.length ? r.sway[m] : [0, 0];
  }
  function side(v) { return v < 0 ? 'L' : 'R'; }
  function sgn(f) { return f === 'L' ? -1 : 1; }
  function opp(f) { return f === 'L' ? 'R' : 'L'; }

  function expectedFoot(r, k) {
    var pos = k % 3, m = Math.floor(k / 3);
    if (pos === 0) return Math.abs(r.lean) < CENTER_TOL ? 'A' : side(r.lean);
    var df = r.downFoot[m] || side(r.lean);
    return pos === 1 ? opp(df) : df;
  }

  function newRun(sway, loop, vol) {
    return {
      sway: sway, loop: loop, vol: vol, play: false, nb: loop ? 1e9 : NB,
      t: -BAR, lastBeat: -4, next: 0, judged: {}, downFoot: {},
      lean: 0, combo: 0, maxCombo: 0, perfect: 0, good: 0, miss: 0, score: 0,
      lastFoot: 'R', stepT: 0, flashT: 0, pulse: 0, teleT: 0, teleSide: 0, padT: 0, padSide: 0,
    };
  }

  function rockOf(r) {
    if (r.t < 0) return 0;
    var m = Math.floor(r.t / BAR);
    var sw = swayOf(r, m);
    var ph = (r.t - m * BAR) / BAR;
    return sw[0] * sw[1] * 60 * Math.sin(Math.PI * ph);
  }
  function duckX(r) { return BEAM_X + rockOf(r) + r.lean * 70; }

  function checkFall(r) {
    if (Math.abs(r.lean) < 1) return false;
    if (!r.play) { r.lean = r.lean < 0 ? -0.95 : 0.95; return false; }
    if (!fatal) {
      // 落下の瞬間: ヒットストップで止め、白く拡大してから feedback.bad
      fatal = true; hitStop = 0.5; r.flashT = 0.5;
      r.lean = r.lean < 0 ? -1 : 1;
      game.audio.stopBgm();
      game.audio.tone(170, 0.32, { wave: 'sawtooth', volume: 0.12, slide: -80 });
    }
    return true;
  }

  function hitBeat(r, k, foot, d) {
    r.judged[k] = true;
    var perfect = Math.abs(d) <= PERF_WIN;
    var pos = k % 3, m = Math.floor(k / 3);
    // 重心を戻せるのは1拍目だけ。2・3拍目の交互は拍を保つだけで、傾きはほとんど戻らない
    if (pos === 0) { r.downFoot[m] = foot; r.lean *= perfect ? 0.08 : 0.3; }
    else r.lean *= perfect ? 0.96 : 0.98;
    if (perfect) r.perfect++; else r.good++;
    r.combo++;
    if (r.combo > r.maxCombo) r.maxCombo = r.combo;
    r.score += (perfect ? 100 : 60) + Math.min(r.combo, 20) * 5 + (pos === 0 ? 40 : 0);
    r.lastFoot = foot; r.stepT = 0.25;
    game.audio.tone(pos === 0 ? 'F4' : 'C5', 0.07, { wave: 'triangle', volume: 0.12 * r.vol });
    game.feedback.good(duckX(r), DUCK_Y - 330, { text: perfect ? 'PERFECT' : 'GOOD', color: perfect ? CORAL : DUCK_DARK, size: perfect ? 60 : 48, count: perfect ? 14 : 8, sound: perfect ? 'se_good' : 'se_tap', volume: 0.3 * r.vol });
    if (pos === 0 && perfect) game.fx.burst(duckX(r), DUCK_Y, { color: WHITE, count: 10, speed: 200 });
    if (r.combo % 9 === 0) {
      game.fx.popup(r.combo + ' COMBO', W / 2, H * 0.21, { color: CORAL, size: 70 });
      game.audio.play('se_milestone', 0.45 * r.vol);
    }
  }

  function missBeat(r, k, foot, kind) {
    if (r.play && fatal) return;
    r.judged[k] = true;
    var pos = k % 3, m = Math.floor(k / 3);
    var swaySide = swayOf(r, m)[0] || 1;
    // よろけは今傾いている側へさらに傾ける(ほぼ真ん中なら台の揺れの側へ)。外し続けると必ず落ちる
    var ls = Math.abs(r.lean) < 0.05 ? swaySide : (r.lean < 0 ? -1 : 1);
    if (pos === 0) {
      r.downFoot[m] = foot && kind === 'wrong' ? foot : side(ls);
      r.lean += (kind === 'wrong' ? 0.3 : 0.22) * ls;    // 傾いていない側へ踏むと、大きく傾く
    } else {
      r.lean += 0.22 * ls;                               // 交互を外す・拍を外すとよろける
    }
    if (foot) r.lastFoot = foot;
    r.miss++; r.combo = 0; r.flashT = 0.35;
    if (checkFall(r)) return;
    game.feedback.bad(duckX(r), DUCK_Y - 330, { text: 'MISS', volume: 0.5 * r.vol, shake: 8 });
  }

  function stray(r) {
    game.audio.tone(520, 0.03, { wave: 'sine', volume: 0.04 * r.vol });
  }

  function pressRun(r, foot) {
    r.padSide = sgn(foot); r.padT = 0.16;
    var k = Math.round(r.t / SPB);
    if (k < 0 || k >= r.nb || r.judged[k]) { stray(r); return 'stray'; }
    var d = r.t - k * SPB;
    if (Math.abs(d) > GOOD_WIN) { missBeat(r, k, foot, 'off'); return 'miss'; }
    var want = expectedFoot(r, k);
    if (want !== 'A' && want !== foot) { missBeat(r, k, foot, 'wrong'); return 'miss'; }
    hitBeat(r, k, foot, d);
    return 'hit';
  }

  function onBeat(r, b) {
    var pos = ((b % 3) + 3) % 3;
    r.pulse = 1;
    // 3拍子の拍クロック: 1拍目は低く強く、2・3拍目は軽く(ズン・チャッ・チャッ)
    if (pos === 0) game.audio.tone(b < 0 ? 'C5' : 'F3', 0.12, { wave: 'triangle', volume: 0.2 * r.vol });
    else game.audio.tone(b < 0 ? 'G5' : 'C5', 0.04, { wave: 'sine', volume: 0.07 * r.vol });
    // 次の小節の揺れを3拍目(0.5秒前)にきしむ音と台の傾きで予告
    if (pos === 2 && b + 1 < r.nb) {
      var nx = swayOf(r, Math.floor((b + 1) / 3));
      if (nx[1] > 0) {
        r.teleSide = nx[0]; r.teleT = SPB;
        game.audio.tone(nx[0] < 0 ? 300 : 240, 0.22, { wave: 'sawtooth', volume: 0.05 * r.vol, slide: nx[0] < 0 ? -90 : 90 });
      }
    }
    if (b >= 0 && b < r.nb && Math.abs(r.lean) > 0.65) game.audio.tone(1200, 0.05, { wave: 'square', volume: 0.06 * r.vol });
    if (b >= 0 && b % 24 === 0 && b < r.nb) startTune();
  }

  function stepRun(r, dt) {
    r.t += dt;
    var bi = Math.floor(r.t / SPB + 1e-6);
    while (r.lastBeat < bi) { r.lastBeat++; onBeat(r, r.lastBeat); }
    if (r.t >= 0 && r.next < r.nb) {
      var sw = swayOf(r, Math.floor(r.t / BAR));
      r.lean += (sw[0] * sw[1] / BAR + r.lean * GRAVITY) * dt;
    }
    while (r.next < r.nb && (r.judged[r.next] || r.t > r.next * SPB + GOOD_WIN)) {
      if (!r.judged[r.next]) missBeat(r, r.next, null, 'late');
      r.next++;
      if (r.loop && r.next > 12) delete r.judged[r.next - 12];
      if (r.play && fatal) break;
    }
    checkFall(r);
    if (r.stepT > 0) r.stepT -= dt;
    if (r.padT > 0) r.padT -= dt;
    if (r.teleT > 0) r.teleT -= dt;
    if (r.flashT > 0 && !(r.play && fatal)) r.flashT -= dt;
    if (r.pulse > 0) r.pulse = Math.max(0, r.pulse - dt * 4);
  }

  // ── 描画 ──
  function farY(r) {
    var prog = Math.max(0, Math.min(1, r.t / (NB * SPB)));
    if (r.loop) prog = 0.15;
    return H * 0.27 + prog * (H * 0.55 - H * 0.27);
  }

  function drawGym(r) {
    var t = game.time.elapsed;
    game.draw.clear(PAPER);
    game.draw.gradient(0, H, [[0, PAPER], [0.45, HAZE], [0.46, '#d6deea'], [1, PAPER]]);
    // 丸窓と肋木(遠景)
    for (var i = 0; i < 2; i++) {
      game.draw.circle(W * (0.16 + i * 0.3), H * 0.2, 92, WHITE, 0.85);
      game.draw.circle(W * (0.16 + i * 0.3) - 24, H * 0.2 - 24, 30, WHITE);
    }
    for (var b = 0; b < 5; b++) {
      game.draw.rect(30 + b * 34, H * 0.28, 14, H * 0.18, BEAM, 0.45);
      game.draw.rect(W - 44 - b * 34, H * 0.28, 14, H * 0.18, BEAM, 0.45);
    }
    // 床の丸いマット(柔らかい影つき)
    ellipse(W * 0.17, H * 0.64, 150, 46, BEAM, 0.22);
    ellipse(W * 0.83, H * 0.64, 150, 46, BEAM, 0.22);
    // 漂う光の粒(常時動いている)
    for (var p = 0; p < 7; p++) {
      var px = (p * 173 + t * (20 + p * 6)) % W;
      var py = H * 0.32 + ((p * 97 + t * 30) % (H * 0.28));
      game.draw.circle(px, py, 6 + (p % 3) * 3, WHITE, 0.8);
    }
  }

  function drawBeam(r) {
    var fy = farY(r);
    var rock = rockOf(r);
    var tele = r.teleT > 0 ? r.teleSide * 26 * (r.teleT / SPB) : 0;
    // 柔らかい影と脚
    ellipse(BEAM_X + rock * 0.5, NEAR_Y + 46, 170, 26, INK, 0.12);
    game.draw.rect(BEAM_X + rock - 40, NEAR_Y, 80, 52, BEAM);
    game.draw.rect(BEAM_X + rock * 0.4 + tele - 16, fy, 32, 40, BEAM, 0.8);
    // 台本体(奥ほど細い)
    for (var y = fy; y < NEAR_Y; y += 6) {
      var u = (y - fy) / (NEAR_Y - fy);
      var w = 12 + u * 56;
      var cx = BEAM_X + rock * (0.4 + 0.6 * u) + tele * (1 - u);
      game.draw.rect(cx - w, y, w * 2, 7, u > 0.5 ? BEAM : '#a9b8cf');
      game.draw.rect(cx - w, y, w * 0.5, 7, WHITE, 0.3);
    }
    // 前へ流れてくる継ぎ目(1歩ごとに一枚)
    var ph = r.t / SPB - Math.floor(r.t / SPB);
    for (var i = 0; i < 8; i++) {
      var uu = Math.pow((i + ph) / 8, 1.6);
      var sy = fy + (NEAR_Y - fy) * uu;
      var sw = 12 + uu * 56;
      var scx = BEAM_X + rock * (0.4 + 0.6 * uu) + tele * (1 - uu);
      game.draw.rect(scx - sw, sy, sw * 2, 3, INK, 0.18);
    }
    // 予告: 次の小節で台が傾く側の縁が赤く光る
    if (r.teleT > 0 && Math.floor(game.time.elapsed * 12) % 2 === 0) {
      var ex = BEAM_X + rock + r.teleSide * 64;
      game.draw.rect(ex - 8, DUCK_Y - 10, 16, NEAR_Y - DUCK_Y + 10, CORAL, 0.8);
    }
    // 端で待つ先生(近づくほど大きい)
    var mpx = 7 + (fy - H * 0.27) / (H * 0.28) * 7;
    var mom = Math.floor(r.t / SPB) % 3 === 0 ? MOM_B : MOM_A;
    ellipse(BEAM_X + rock * 0.4 + tele, fy + 10, mpx * 5, mpx * 1.4, INK, 0.12);
    game.draw.sprite(mom, PAL, BEAM_X + rock * 0.4 + tele, fy - mpx * 4.5, mpx, { anchor: 'center' });
  }

  function drawDuck(r, frozen) {
    var x = duckX(r);
    var bob = r.stepT > 0 ? -Math.sin(r.stepT / 0.25 * Math.PI) * 18 : 0;
    var fall = r.fallT || 0;
    var fx = x + (r.lean < 0 ? -1 : 1) * fall * 520;
    var fy = DUCK_Y + fall * fall * 1500;
    // 重心の影: 台の上を左右に動く。台の幅からはみ出すほど危ない
    var shx = BEAM_X + rockOf(r) + r.lean * 110;
    if (fall <= 0) {
      ellipse(shx, DUCK_Y + 8, 74, 16, Math.abs(r.lean) > 0.65 ? CORAL : INK, 0.25);
      game.draw.circle(shx, DUCK_Y + 8, 9, CORAL);
    }
    var flapping = Math.abs(r.lean) > 0.5 && Math.floor(game.time.elapsed * 10) % 2 === 0;
    var body = flapping ? BODY_FLAP : r.stepT > 0 ? (r.lastFoot === 'L' ? BODY_RUP : BODY_LUP) : BODY_BOTH;
    var flash = frozen || (r.flashT > 0 && Math.floor(r.flashT * 20) % 2 === 0);
    var px = frozen ? 18 : 14;
    var pal = flash ? PAL_FLASH : PAL;
    game.draw.sprite(body, pal, fx, fy - 5 * px + bob, px, { anchor: 'center' });
    game.draw.sprite(HEAD, pal, fx + r.lean * 56, fy - 10 * px - 3.5 * px + bob * 1.2, px, { anchor: 'center' });
    if (Math.abs(r.lean) > 0.65 && fall <= 0) {
      var sd = (game.time.elapsed * 3) % 1;
      game.draw.circle(fx - r.lean * 90, fy - 230 + sd * 60, 10, BEAM, 1 - sd);
    }
  }

  function drawTriangle(r) {
    // 3拍子の指揮: 1(下)→2(右)→3(上) を拍の頭ぴったりに玉が打つ
    var P = [[TRI_X, TRI_Y + 70], [TRI_X + 74, TRI_Y + 4], [TRI_X - 20, TRI_Y - 70]];
    game.draw.circle(TRI_X + 10, TRI_Y, 120, WHITE, 0.7);
    game.draw.line(P[0][0], P[0][1], P[1][0], P[1][1], BEAM, 12);
    game.draw.line(P[1][0], P[1][1], P[2][0], P[2][1], BEAM, 12);
    game.draw.line(P[2][0], P[2][1], P[0][0], P[0][1], BEAM, 12);
    var bp = r.t / SPB;
    var k = Math.floor(bp), f = bp - k;
    var pos = ((k % 3) + 3) % 3;
    for (var i = 0; i < 3; i++) {
      var on = i === pos;
      game.draw.circle(P[i][0], P[i][1], (i === 0 ? 24 : 16) + (on ? r.pulse * 14 : 0), on ? (i === 0 ? CORAL : DUCK) : WHITE);
    }
    var a = P[pos], b = P[(pos + 1) % 3];
    var e = 1 - (1 - f) * (1 - f);
    game.draw.circle(a[0] + (b[0] - a[0]) * e, a[1] + (b[1] - a[1]) * e, 14, INK);
  }

  function drawPads(r) {
    // 重心ゲージ(親指ゾーンの上): 影が端の赤い帯に入ると落ちる寸前
    game.draw.rect(BEAM_X - GAUGE_HALF, GAUGE_Y - 14, GAUGE_HALF * 2, 28, WHITE);
    game.draw.rect(BEAM_X - GAUGE_HALF, GAUGE_Y - 14, GAUGE_HALF * 0.3, 28, CORAL, 0.35);
    game.draw.rect(BEAM_X + GAUGE_HALF * 0.7, GAUGE_Y - 14, GAUGE_HALF * 0.3, 28, CORAL, 0.35);
    game.draw.rect(BEAM_X - 3, GAUGE_Y - 26, 6, 52, INK, 0.5);
    var gx = BEAM_X + Math.max(-1, Math.min(1, r.lean)) * GAUGE_HALF;
    ellipse(gx, GAUGE_Y, 44, 18, Math.abs(r.lean) > 0.65 ? CORAL : INK, 0.55);

    var k = r.next;
    var want = k < r.nb ? expectedFoot(r, k) : 'N';
    var dtb = k * SPB - r.t;
    for (var s = 0; s < 2; s++) {
      var foot = s === 0 ? 'L' : 'R';
      var x = s === 0 ? PAD_LX : PAD_RX;
      var pressed = r.padT > 0 && r.padSide === sgn(foot);
      var R = PAD_R * (pressed ? 0.92 : 1);
      // 2・3拍目は踏む足が光る。1拍目(強拍)は両方が黄色 = どちらへ踏むかは重心の影を見て決める
      var free = k % 3 === 0 && want !== 'N';
      var lit = !free && want === foot;
      ellipse(x, PAD_Y + R * 0.9, R * 0.9, 22, INK, 0.12);
      game.draw.circle(x, PAD_Y, R, lit ? CORAL : free ? DUCK : WHITE);
      game.draw.circle(x - R * 0.3, PAD_Y - R * 0.3, R * 0.28, WHITE, 0.5);
      // 水かきの足あと
      var ic = lit ? WHITE : DUCK_DARK;
      game.draw.circle(x, PAD_Y + 26, 40, ic);
      game.draw.circle(x - 42, PAD_Y - 30, 20, ic);
      game.draw.circle(x, PAD_Y - 46, 20, ic);
      game.draw.circle(x + 42, PAD_Y - 30, 20, ic);
      // 拍の頭へ縮む輪(縁に重なった瞬間が拍の頭)
      if (want !== 'N' && dtb > -GOOD_WIN && dtb < SPB * 1.2 && (lit || free) && r.t > -BAR) {
        ring(x, PAD_Y, R + 8 + Math.max(0, dtb) / SPB * 120, lit ? CORAL : DUCK_DARK, 10);
      }
    }
  }

  function drawHud(r) {
    var bars = Math.min(BARS, Math.floor(r.next / 3));
    txt('SCORE ' + r.score, 40, 66, 44, INK, 'left');
    txt(bars + ' / ' + BARS, W - 40, 66, 44, INK, 'right');
    if (r.combo >= 3) txt(r.combo + ' COMBO', 40, 142, 40, CORAL, 'left');
    var progress = Math.max(0, Math.min(1, r.t / (NB * SPB)));
    game.draw.rect(40, 200, W - 80, 18, HAZE);
    game.draw.rect(40, 200, (W - 80) * progress, 18, DUCK);
    game.draw.circle(40 + (W - 80) * progress, 209, 16, CORAL);
  }

  function drawResult() {
    game.draw.rect(80, H * 0.26, W - 160, H * 0.27, WHITE, 0.94);
    ellipse(W / 2, H * 0.54, (W - 160) / 2, 26, INK, 0.08);
    txt(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.3, 100, won ? DUCK_DARK : CORAL);
    txt('SCORE ' + finalScore, W / 2, H * 0.355, 58, INK);
    txt('PERFECT ' + run.perfect + '  GOOD ' + run.good + '  MISS ' + run.miss, W / 2, H * 0.4, 38, INK);
    txt('COMBO ' + run.maxCombo, W / 2, H * 0.44, 42, CORAL);
    if (newRecord) txt('NEW RECORD', W / 2, H * 0.485, 56, CORAL);
    else txt('BEST ' + Math.max(prevBest, game.best || 0), W / 2, H * 0.485, 44, BEAM);
    if (!won) txt('あと' + Math.max(1, BARS - Math.floor(run.next / 3)) + '小節!', W / 2, H * 0.515, 42, DUCK_DARK);
  }

  // ── 状態 ──
  var run, ready, hitStop, fatal, over, won, endT, prevBest, finalScore, newRecord, confT;

  function initGame() {
    run = newRun(SWAY, false, 1);
    run.play = true; run.fallT = 0;
    ready = 0.8; hitStop = 0; fatal = false; over = false; won = false; endT = 0;
    prevBest = game.best || 0; finalScore = 0; newRecord = false; confT = 0;
  }

  function finish(win) {
    if (over) return;
    over = true; won = win; endT = 1.8;
    finalScore = win ? run.score + Math.round((1 - Math.abs(run.lean)) * 400) : run.score;
    newRecord = win && finalScore > prevBest;
    game.audio.stopBgm();
    game.audio.play(win ? 'se_success' : 'se_failure', 0.6);
    if (newRecord) game.fx.popup('NEW RECORD', W / 2, H * 0.23, { color: CORAL, size: 76 });
  }

  // ── ATTRACT: 実ロジックでゴーストが足を踏む。2小節目の1拍目だけ反対の足を踏み、ぐらついて見せる ──
  var demo = { t: 0, run: null, pb: 0, foot: 'L', gx: PAD_LX, pressT: 0 };
  function resetDemo() {
    demo.run = newRun(DEMO_SWAY, true, 0.35);
    demo.run.t = -SPB; demo.run.lastBeat = -2;
    demo.pb = 0; demo.foot = 'L'; demo.gx = PAD_LX; demo.pressT = 0;
  }
  function stepDemo(dt) {
    demo.t += dt;
    if (!demo.run || demo.t <= dt) resetDemo();
    var r = demo.run;
    stepRun(r, dt);
    var k = demo.pb;
    var want = expectedFoot(r, k);
    if (want === 'A') want = opp(r.lastFoot);
    if (k % 3 === 0 && Math.floor(k / 3) % DEMO_SWAY.length === DEMO_WRONG_BAR) want = opp(want);
    demo.foot = want;
    if (r.t >= k * SPB - 0.008) { pressRun(r, want); demo.pb++; demo.pressT = 0.14; }
    if (demo.pressT > 0) demo.pressT -= dt;
    var tx = demo.foot === 'L' ? PAD_LX : PAD_RX;
    demo.gx += (tx - demo.gx) * Math.min(1, dt * 14);
  }

  function canPlay() { return state === S.PLAYING && !over && hitStop <= 0; }

  game.onTap(function () {
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.6); game.audio.stopBgm(); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.3); state = S.ATTRACT; initGame(); demo.t = 0; resetDemo(); return; }
  });

  game.onPress(function (x) {
    if (!canPlay()) return;
    if (ready > 0) { game.audio.tone(440, 0.03, { wave: 'sine', volume: 0.04 }); return; }
    var res = pressRun(run, x < W / 2 ? 'L' : 'R');
    if (res === 'hit') game.fx.burst(x < W / 2 ? PAD_LX : PAD_RX, PAD_Y, { color: DUCK, count: 6, speed: 200 });
  });

  game.onUpdate(function (dt) {
    if (dt > 0.05) dt = 0.05;

    if (state === S.ATTRACT) {
      stepDemo(dt);
      var dr = demo.run;
      drawGym(dr);
      drawBeam(dr);
      drawDuck(dr, false);
      drawTriangle(dr);
      drawPads(dr);
      var toNext = demo.pb * SPB - dr.t;
      var lift = demo.pressT > 0 ? 0 : Math.min(1, Math.max(0, toNext) / 0.2) * 70;
      game.draw.hand(demo.gx, PAD_Y - 10 - lift, { press: demo.pressT > 0, scale: 16 });
      txt(TITLE, W / 2, 96, 92, CORAL);
      txt('HI-SCORE ' + (game.best || 0), W / 2, 186, 40, INK);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.972, 44, CORAL);
      else txt('TAP TO START', W / 2, H * 0.972, 40, INK);
      return;
    }

    if (state === S.PLAYING) {
      if (over) {
        endT -= dt;
        if (!won) run.fallT = Math.min(0.6, run.fallT + dt);
        else {
          confT -= dt;
          if (confT <= 0) { confT = 0.16; game.fx.burst(game.random(140, W - 140), game.random(H * 0.2, H * 0.5), { color: [DUCK, CORAL, BEAM][Math.floor(game.random(0, 3))], count: 14, speed: 340 }); }
        }
        if (endT <= 0) {
          state = S.RESULT;
          var stats = { perfect: run.perfect, good: run.good, miss: run.miss, maxCombo: run.maxCombo, bars: Math.min(BARS, Math.floor(run.next / 3)), score: finalScore };
          if (won) game.end.success(finalScore, stats);
          else game.end.failure(stats);
        }
      } else if (hitStop > 0) {
        hitStop -= dt;
        if (hitStop <= 0) {
          run.flashT = 0;
          game.feedback.bad(duckX(run), DUCK_Y - 330, { text: 'MISS', size: 76, shake: 18 });
          finish(false);
        }
      } else if (ready > 0) {
        ready -= dt;
        if (ready <= 0) game.audio.play('se_tap', 0.4);
      } else {
        stepRun(run, dt);
        if (!fatal && run.next >= NB) finish(true);
      }
    }

    drawGym(run);
    drawBeam(run);
    drawDuck(run, hitStop > 0);
    drawTriangle(run);
    drawPads(run);
    drawHud(run);
    if (state === S.PLAYING && ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.42, 116, CORAL);
    if (over || state === S.RESULT) drawResult();
    if (state === S.RESULT) txt('TAP TO CONTINUE', W / 2, H * 0.972, 40, INK);
  });

  game.onStart(function () {
    state = S.ATTRACT;
    initGame();
    resetDemo();
    startTune();
  });
})(game);
