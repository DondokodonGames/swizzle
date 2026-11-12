// I-Switch2-0007v3-harvest-drum-call-return.js
// 掛け合い太鼓 — 長老が一打、自分が一打。長老の打った所(面の真ん中/縁)を次の拍で同じように打ち返し、掛け合いを途切れさせない
// 操作: 長老の番は見るだけ(撥の構えで次が真ん中の「ドン」か縁の「カッ」か、手を止める「休み」かが半拍前に分かる)。自分の番(長老の一打の次の拍)に、手元の大太鼓の真ん中をタップでドン、縁(左右の端)をタップでカッ。休みの次の拍は打たずに待つ。最初の4往復だけ手元の太鼓にお手本の光が出る。往復ごとに少しずつ速くなる
// 終わり: 16打を返せばCLEAR。違う所を打つ/返し遅れる/休みに打つ/長老の拍に割り込むが3回、または24秒の時間切れでGAME OVER
// @mechanic: turn_attack
// @theme: harvest_festival_drum_exchange
// 世界観: 秋祭りの神社の境内で、若い打ち手が向かいの長老と交互に一打ずつ太鼓を返し合い、だんだん速まる掛け合いを途切れさせずにつないでいく(相手は演出付きの長老AI)
// 残るもの: 正誤(CLEAR/GAME OVER) + 返した打数・PERFECT数・守れた休み・最大連続・スコア
// スタイル: MODERN AD-GAME

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // MODERN AD-GAME: 高彩度・太い縁取り・大きいアイコン・飛ぶ数字
  var STYLE = { bg: ['#ff8a3d', '#5a1e6e'], main: ['#ff3b3b', '#ffd400', '#1fb4ff'], accent: ['#ffffff', '#2b0a3d'] };
  var RED = STYLE.main[0], YEL = STYLE.main[1], BLU = STYLE.main[2], WHITE = STYLE.accent[0], INK = STYLE.accent[1];
  var HEAD = '#f5e2b8', RIM = '#8a4a22', MISSC = '#ff2d55', GREEN = '#3ddc84';

  var GAME_TITLE = 'DRUM RETURN';
  var TIME_LIMIT = 24;
  var NEEDED = 16;
  var LIVES = 3;
  var BPM0 = 96;
  var WIN = 0.18, PERF = 0.06, EWIN = 0.12, GUIDE_EX = 4;
  var MY_X = 540, MY_Y = 1390, MY_R = 190, MY_RIM = 260;
  var EL_X = 540, EL_Y = 880, EL_R = 110;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var mode = S.ATTRACT;

  var beats, pattern, songT, lastIdx, curE, myHit, myHitT, elHit, elHitT, teleE, stopT, stopKind, hlZone;
  var returns, perfects, restsKept, combo, maxCombo, lives, score, finalScore, timeLeft, readyT, fin, cleared, postT;
  var joyT, sadT, warnT, endWhy;

  // 長老: 構え(撥を上) / 真ん中を打つ / 縁を打つ / 手を止める
  var EL_UP = ['k..........k', '.k..wwww..k.', '..kwhhhhwk..', '...hhhhhh...', '...hskksh...', '....ssss....', '..rrrrrrrr..', '.srrrwwrrrs.', '.s.rrwwrr.s.', '...rrrrrr...', '...nnnnnn...', '...nn..nn...'];
  var EL_DON = ['....wwww....', '...whhhhw...', '...hhhhhh...', '...hskksh...', '....ssss....', '..rrrrrrrr..', '.srrrwwrrrs.', '.s.rrwwrr.s.', '..k.rrrr.k..', '...k.rr.k...', '....k..k....', '...nn..nn...'];
  var EL_KA = ['....wwww....', '...whhhhw...', '...hhhhhh...', '...hskksh...', '....ssss....', '..rrrrrrrr..', 'srrrrwwrrrrs', 's..rrwwrr..s', 'k..rrrrrr..k', 'k..rrrrrr..k', 'k..nnnnnn..k', '...nn..nn...'];
  var EL_REST = ['....wwww....', '...whhhhw...', '...hhhhhh...', '...hskksh...', '....ssss....', '.pprrrrrrpp.', '.pprrwwrrpp.', '..srrwwrrs..', '...rrrrrr...', '...rrrrrr...', '...nnnnnn...', '...nn..nn...'];
  var EL_PAL = { k: '#d8a060', w: WHITE, h: '#e8e8e8', s: '#e8b88a', r: '#2a5ad8', n: INK, p: '#ffd8b0' };
  var YOU = ['....wwww....', '...wbbbbw...', '...bbbbbb...', '...bbbbbb...', '..rrrrrrrr..', '.rrrrwwrrrr.', '.rr.rwwr.rr.', '...rrrrrr...', '...nn..nn...'];
  var YOU_PAL = { w: WHITE, b: '#3a2a1a', r: RED, n: INK };
  var PALM = ['.w.w.w.', '.w.w.w.', 'ww.w.w.', 'wwwwwww', 'wwwwwww', '.wwwww.', '..www..'];

  function out(str, x, y, sz, col) {
    game.draw.text(str, x - 4, y, { size: sz, color: INK, bold: true });
    game.draw.text(str, x + 4, y, { size: sz, color: INK, bold: true });
    game.draw.text(str, x, y + 5, { size: sz, color: INK, bold: true });
    game.draw.text(str, x, y, { size: sz, color: col, bold: true });
  }

  function makePattern(n, demo) {
    if (demo) return [0, 1, 0, 1];
    var p = [];
    for (var i = 0; i < n; i++) {
      var r = Math.random(), v = r < 0.38 ? 1 : 0;
      if (i >= 4 && r > 0.8 && p[i - 1] !== 2) v = 2;
      p.push(v);
    }
    return p;
  }
  function buildSchedule(pat) {
    beats = [];
    var t = 0, spb0 = 60 / BPM0;
    for (var i = 0; i < 4; i++) { beats.push({ t: t, kind: 'count', spb: spb0 }); t += spb0; }
    for (var e = 0; e < pat.length; e++) {
      var spb = 60 / Math.min(132, BPM0 + Math.floor(e / 4) * 9);
      beats.push({ t: t, kind: 'elder', e: e, spb: spb }); t += spb;
      beats.push({ t: t, kind: 'you', e: e, spb: spb, judged: false }); t += spb;
    }
  }

  function initGame(demo) {
    pattern = makePattern(28, demo);
    buildSchedule(pattern);
    songT = -0.0001; lastIdx = -1; curE = -1; myHit = -1; myHitT = 0; elHit = -1; elHitT = 0; teleE = -1;
    stopT = 0; stopKind = ''; hlZone = -1;
    returns = 0; perfects = 0; restsKept = 0; combo = 0; maxCombo = 0; lives = LIVES; score = 0; finalScore = 0;
    timeLeft = TIME_LIMIT; readyT = 0.8; fin = false; cleared = false; postT = 0; joyT = 0; sadT = 0; warnT = 0; endWhy = '';
  }

  function drumSound(type, mine) {
    if (type === 0) { game.audio.tone(mine ? 'A2' : 'G2', 0.22, { wave: 'triangle', volume: 0.22 }); game.audio.tone(80, 0.07, { wave: 'square', volume: 0.06 }); }
    else { game.audio.tone(mine ? 'E6' : 'D6', 0.04, { wave: 'square', volume: 0.08 }); game.audio.tone(mine ? 'B5' : 'A5', 0.03, { wave: 'square', volume: 0.05 }); }
  }

  function youBeatNear() {
    var best = -1, bd = 9;
    for (var i = 0; i < beats.length; i++) {
      var b = beats[i];
      if (b.kind !== 'you' || b.judged) continue;
      var d = Math.abs(songT - b.t);
      if (d < bd) { bd = d; best = i; }
      if (b.t > songT + 1) break;
    }
    return { i: best, d: bd };
  }
  function elderBeatNear() {
    for (var i = 0; i < beats.length; i++) if (beats[i].kind === 'elder' && Math.abs(songT - beats[i].t) < EWIN) return i;
    return -1;
  }

  // 自分の一打(本番もデモも同じ処理)。zone 0=真ん中(ドン) 1=縁(カッ)
  function hitDrum(zone) {
    if (stopT > 0 || fin || songT < 0) { game.audio.tone('C4', 0.03, { wave: 'square', volume: 0.04 }); return; }
    myHit = zone; myHitT = 0.18;
    drumSound(zone, true);
    var nb = youBeatNear();
    if (nb.i >= 0 && nb.d <= WIN) {
      var b = beats[nb.i], want = pattern[b.e];
      b.judged = true;
      if (want === 2) { drop('rest', 2); return; }
      if (want !== zone) { drop('wrong', want); return; }
      var perfect = nb.d <= PERF;
      returns++; combo++; if (combo > maxCombo) maxCombo = combo;
      if (perfect) perfects++;
      var pts = (perfect ? 100 : 60) + Math.min(combo, 10) * 10;
      if (mode === S.PLAYING) score += pts;
      game.feedback.good(MY_X + (zone ? 220 : 0), MY_Y - 260, { text: perfect ? 'PERFECT' : 'GOOD', color: perfect ? YEL : GREEN, size: 66, volume: 0.25 });
      game.fx.popup('+' + pts, MY_X + (zone ? 220 : 0), MY_Y - 340, { color: WHITE, size: 48 });
      if (combo >= 3) game.fx.popup('COMBO x' + combo, W / 2, 1060, { color: YEL, size: 44 });
      if (returns === 8 && mode === S.PLAYING) {
        game.audio.play('se_milestone', 0.5);
        game.fx.popup('NICE', W / 2, 640, { color: YEL, size: 100 });
      }
      if (mode === S.PLAYING && returns >= NEEDED) { stopT = 0.45; stopKind = 'win'; game.audio.play('se_powerup', 0.4); }
      return;
    }
    if (elderBeatNear() >= 0) { drop('cut', -1); return; }
    // どの拍でもない一打: 連続が切れるだけ
    combo = 0;
    game.fx.shake(4, 0.1);
  }

  function drop(kind, zone) {
    // 掛け合いが途切れた: 止めて、打つべきだった所を白く大きく
    stopT = 0.45; stopKind = kind; hlZone = zone; combo = 0;
    game.fx.flash(WHITE, 0.14);
    game.audio.tone('C3', 0.28, { wave: 'sawtooth', volume: 0.08, slide: -60 });
  }

  function resolveStop() {
    if (stopKind === 'win') { ending(true); return; }
    lives--; sadT = 0.9;
    game.feedback.bad(W / 2, 1100, { text: 'MISS', color: MISSC, size: 70 });
    hlZone = -1;
    if (mode === S.PLAYING && lives <= 0) { endWhy = 'miss'; ending(false); return; }
    // 次の往復の長老の拍まで巻き戻して、1拍半の間をとって再開
    var nextE = curE + 1, ni = -1;
    for (var i = 0; i < beats.length; i++) {
      if (beats[i].kind === 'you' && beats[i].e <= curE) beats[i].judged = true;
      if (ni < 0 && beats[i].kind === 'elder' && beats[i].e === nextE) ni = i;
    }
    if (ni < 0) { if (mode === S.PLAYING) { endWhy = 'miss'; ending(false); } return; }
    songT = beats[ni].t - beats[ni].spb * 1.5;
    lastIdx = ni - 1;
    game.audio.tone('G5', 0.05, { wave: 'square', volume: 0.08 });
  }

  function stepSong(dt) {
    if (myHitT > 0) myHitT -= dt;
    if (elHitT > 0) elHitT -= dt;
    if (joyT > 0) joyT -= dt;
    if (sadT > 0) sadT -= dt;
    if (fin) return;
    if (stopT > 0) { stopT -= dt; if (stopT <= 0) resolveStop(); return; }
    songT += dt;
    for (var i = lastIdx + 1; i < beats.length && beats[i].t <= songT; i++) {
      var b = beats[i];
      lastIdx = i;
      if (b.kind === 'count') game.audio.tone(i === 3 ? 'C6' : 'G5', 0.05, { wave: 'square', volume: 0.07 });
      else if (b.kind === 'elder') {
        curE = b.e;
        var ty = pattern[b.e];
        if (ty === 2) { elHit = 2; elHitT = b.spb; game.audio.tone('E4', 0.03, { wave: 'triangle', volume: 0.04 }); }
        else { elHit = ty; elHitT = 0.2; drumSound(ty, false); }
        game.audio.tone(['A2', 'C3', 'D3', 'E3'][b.e % 4], 0.3, { wave: 'triangle', volume: 0.06 });
      } else game.audio.tone(2600, 0.015, { wave: 'square', volume: 0.02 });
    }
    // 半拍前の構え(予告)
    for (var j = lastIdx + 1; j < beats.length && j <= lastIdx + 2; j++) {
      if (beats[j].kind === 'elder' && songT >= beats[j].t - beats[j].spb * 0.5) teleE = beats[j].e;
    }
    // 返しそびれ / 休みを守れた
    for (var k = 0; k <= lastIdx; k++) {
      var y = beats[k];
      if (y.kind !== 'you' || y.judged || songT <= y.t + WIN) continue;
      y.judged = true;
      if (pattern[y.e] === 2) {
        restsKept++;
        if (mode === S.PLAYING) score += 50;
        game.fx.popup('NICE', MY_X, MY_Y - 280, { color: BLU, size: 56 });
        game.audio.tone('C5', 0.06, { wave: 'triangle', volume: 0.07 });
      } else { drop('late', pattern[y.e]); return; }
    }
  }

  function ending(win) {
    if (fin) return;
    fin = true; cleared = win; postT = 1.4;
    finalScore = win ? score + Math.round(timeLeft * 40) + lives * 150 + maxCombo * 20 : 0;
    game.audio.stopBgm();
    game.audio.play(win ? 'se_success' : 'se_failure', 0.55);
    if (win) {
      for (var i = 0; i < 6; i++) game.fx.burst(120 + i * 170, 500 + (i % 2) * 160, { color: [RED, YEL, BLU][i % 3], count: 20, speed: 480 });
      game.fx.flash(YEL, 0.2);
      joyT = 3;
    } else sadT = 3;
  }

  function zoneOf(x, y) {
    var d = Math.hypot(x - MY_X, y - MY_Y);
    if (d < MY_R) return 0;
    if (y > 1000) return 1;
    return -1;
  }

  // ---- 入力 ----
  game.onPress(function(x, y) {
    if (mode !== S.PLAYING || fin || readyT > 0) return;
    var z = zoneOf(x, y);
    if (z < 0) { game.audio.play('se_tap', 0.08); return; }
    game.fx.burst(x, y, { color: z ? BLU : RED, count: 5, speed: 160 });
    hitDrum(z);
  });
  game.onTap(function(x, y) {
    if (mode === S.ATTRACT) { game.audio.play('se_coin'); game.audio.stopBgm(); mode = S.PLAYING; initGame(false); return; }
    if (mode === S.RESULT) { game.audio.play('se_tap'); mode = S.ATTRACT; initGame(true); demo.t = 0; startBgm(); return; }
  });

  // ---- 描画 ----
  function drawShrine(t) {
    game.draw.clear(STYLE.bg[1]);
    game.draw.gradient(0, H, [[0, STYLE.bg[1]], [0.45, STYLE.bg[0]], [1, '#7a2a1a']]);
    // 提灯の列
    for (var i = 0; i < 8; i++) {
      var lx = 70 + i * 135, ly = 300 + Math.sin(t * 2 + i) * 6;
      game.draw.line(lx, 260, lx, ly - 30, INK, 4);
      game.draw.circle(lx, ly, 40, INK);
      game.draw.circle(lx, ly, 34, i % 2 ? RED : YEL);
      game.draw.rect(lx - 30, ly - 4, 60, 8, WHITE, 0.6);
    }
    game.draw.line(0, 262, W, 262, INK, 6);
    // 鳥居の柱と紅葉
    game.draw.rect(60, 380, 50, 900, INK); game.draw.rect(68, 380, 34, 900, RED);
    game.draw.rect(W - 110, 380, 50, 900, INK); game.draw.rect(W - 102, 380, 34, 900, RED);
    for (var f = 0; f < 14; f++) {
      var fx = (f * 197 + t * 40) % W, fy = (f * 311 + t * 90) % H;
      game.draw.rect(fx, fy, 16, 16, f % 2 ? RED : YEL, 0.85);
    }
    // 石畳
    game.draw.rect(0, 1080, W, H - 1080, '#5a2a22');
    for (var s = 0; s < 6; s++) game.draw.rect(0, 1100 + s * 140, W, 6, '#4a1e18');
  }

  function drawElder(t) {
    // 長老の太鼓
    var on = elHitT > 0 && elHit !== 2;
    if (turnSide() === 1) game.draw.circle(EL_X, EL_Y, EL_R + 70 + Math.sin(t * 10) * 6, BLU, 0.35);
    var cut = stopT > 0 && stopKind === 'cut', cutF = cut && Math.floor(t * 16) % 2 === 0, cb = cut ? 1.25 : 1;
    game.draw.circle(EL_X, EL_Y, (EL_R + 30) * cb, INK);
    game.draw.circle(EL_X, EL_Y, (EL_R + 22) * cb, cutF ? WHITE : RIM);
    game.draw.circle(EL_X, EL_Y, EL_R * cb, (on && elHit === 0) || cutF ? WHITE : HEAD);
    if (on && elHit === 0) game.draw.circle(EL_X, EL_Y, EL_R + 60 * (1 - elHitT / 0.2), YEL, 0.3);
    if (on && elHit === 1) for (var a = 0; a < 8; a++) { var an = a / 8 * Math.PI * 2; game.draw.line(EL_X + Math.cos(an) * (EL_R + 30), EL_Y + Math.sin(an) * (EL_R + 30), EL_X + Math.cos(an) * (EL_R + 80), EL_Y + Math.sin(an) * (EL_R + 80), BLU, 8); }
    // 長老
    var tele = teleE >= 0 && teleE > curE ? pattern[teleE] : -1;
    var fr = EL_UP;
    if (elHitT > 0) fr = elHit === 0 ? EL_DON : elHit === 1 ? EL_KA : EL_REST;
    else if (tele === 2) fr = EL_REST;
    var nod = (fin && cleared) || joyT > 0 ? -Math.abs(Math.sin(t * 8)) * 12 : sadT > 0 ? 10 : Math.sin(t * 3) * 3;
    game.draw.sprite(fr, EL_PAL, EL_X, EL_Y - 210 + nod, 15, { anchor: 'center' });
    // 予告アイコン(半拍前): 赤丸=ドン / 青い輪=カッ / 手のひら=休み
    var icon = tele >= 0 ? tele : (elHitT > 0 ? elHit : -1);
    var restErr = stopT > 0 && stopKind === 'rest';
    if (restErr) icon = 2;
    if (icon >= 0 && !fin && (!restErr || Math.floor(t * 16) % 2 === 0)) {
      var ix = EL_X + 260, iy = EL_Y - 240, pop = restErr ? 1.5 : 1 + Math.max(0, Math.min(0.2, elHitT)) * 1.5;
      game.draw.circle(ix, iy, 76 * pop, INK);
      game.draw.circle(ix, iy, 68 * pop, WHITE);
      if (icon === 0) game.draw.circle(ix, iy, 46 * pop, RED);
      else if (icon === 1) { game.draw.circle(ix, iy, 50 * pop, BLU); game.draw.circle(ix, iy, 30 * pop, WHITE); }
      else game.draw.sprite(PALM, { w: '#e8a070' }, ix, iy, 13 * pop, { anchor: 'center' });
    }
  }

  function drawMine(t) {
    var guide = curE >= 0 && curE < GUIDE_EX && elHitT <= 0.2 && !fin && stopT <= 0 ? pattern[curE] : -1;
    var hlF = stopT > 0 && hlZone >= 0 && Math.floor(t * 16) % 2 === 0;
    var big = stopT > 0 && hlZone >= 0 ? 1.08 : 1;
    if (turnSide() === 2) game.draw.circle(MY_X, MY_Y, MY_RIM + 50 + Math.sin(t * 10) * 6, YEL, 0.35);
    // 縁(カッ)
    game.draw.circle(MY_X, MY_Y, MY_RIM * big + 12, INK);
    game.draw.circle(MY_X, MY_Y, MY_RIM * big, hlF && hlZone === 1 ? WHITE : (myHitT > 0 && myHit === 1 ? BLU : RIM));
    for (var a = 0; a < 16; a++) { var an = a / 16 * Math.PI * 2; game.draw.circle(MY_X + Math.cos(an) * (MY_R + 34), MY_Y + Math.sin(an) * (MY_R + 34), 9, YEL); }
    // 面(ドン)
    game.draw.circle(MY_X, MY_Y, MY_R * big + 6, INK);
    game.draw.circle(MY_X, MY_Y, MY_R * big, hlF && hlZone === 0 ? WHITE : (myHitT > 0 && myHit === 0 ? '#fff4d8' : HEAD));
    game.draw.circle(MY_X, MY_Y, 60, RED, 0.25);
    if (myHitT > 0) game.draw.circle(MY_X, MY_Y, MY_R + 100 * (1 - myHitT / 0.18), myHit ? BLU : YEL, 0.3);
    // 最初の往復だけお手本の光
    if (guide === 0 && Math.floor(t * 8) % 2 === 0) game.draw.circle(MY_X, MY_Y, MY_R - 20, YEL, 0.4);
    if (guide === 1 && Math.floor(t * 8) % 2 === 0) { game.draw.rect(MY_X - MY_RIM - 40, MY_Y - 60, 70, 120, BLU, 0.6); game.draw.rect(MY_X + MY_RIM - 30, MY_Y - 60, 70, 120, BLU, 0.6); }
    // 縁のタップ域(左右)
    game.draw.rect(0, 1180, 60, 420, BLU, 0.25);
    game.draw.rect(W - 60, 1180, 60, 420, BLU, 0.25);
    // 自分(背中)と撥
    var sw = myHitT > 0 ? 40 : 0;
    game.draw.line(180, 1820, MY_X - 120, MY_Y + 120 - sw, '#d8a060', 18);
    game.draw.line(W - 180, 1820, MY_X + 120, MY_Y + 120 - sw, '#d8a060', 18);
    var hop = joyT > 0 ? -Math.abs(Math.sin(t * 10)) * 16 : sadT > 0 ? 12 : 0;
    game.draw.sprite(YOU, YOU_PAL, 150, 1760 + hop, 13, { anchor: 'center' });
  }

  function drawHud(t) {
    var low = timeLeft < 5 && Math.floor(t * 6) % 2 === 0;
    game.draw.rect(56, 26, W - 112, 30, INK);
    game.draw.rect(60, 30, (W - 120) * Math.max(0, timeLeft / TIME_LIMIT), 22, low ? MISSC : YEL);
    out(returns + ' / ' + NEEDED, W / 2, 130, 56, WHITE);
    for (var l = 0; l < LIVES; l++) { game.draw.circle(80 + l * 64, 120, 26, INK); game.draw.circle(80 + l * 64, 120, 20, l < lives ? RED : '#5a3a5a'); }
    out('' + score, W - 150, 130, 48, YEL);
  }

  // 番の表示: いま打つ側の太鼓の後ろが光る
  function turnSide() {
    if (fin || songT <= 0 || lastIdx < 0 || !beats[lastIdx]) return 0;
    return beats[lastIdx].kind === 'elder' ? 2 : 1;
  }

  function drawScene(t) {
    drawShrine(t);
    drawElder(t);
    drawMine(t);
  }

  // ---- ATTRACT: 本物の hitDrum() で実演。ドン→真ん中PERFECT、カッ→縁、ドン→縁を打ってMISS ----
  var demo = { t: 0, x: MY_X, y: MY_Y, press: false, done: -1 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 8;
    if (cyc < dt || demo.t <= dt) { initGame(true); readyT = 0; demo.done = -1; }
    stepSong(dt);
    var tx = MY_X, ty = MY_Y + 40;
    demo.press = false;
    for (var i = 0; i < beats.length; i++) {
      var b = beats[i];
      if (b.kind !== 'you' || b.e > 2 || b.judged || demo.done >= b.e) continue;
      var zone = b.e === 2 ? 1 : pattern[b.e];
      tx = zone ? MY_X + MY_RIM - 20 : MY_X; ty = MY_Y + 40;
      var d = b.t - songT;
      if (d < 0.12 && d > -0.1) demo.press = true;
      if (d <= 0.01 && stopT <= 0) { hitDrum(zone); demo.done = b.e; }
      break;
    }
    demo.x += (tx - demo.x) * Math.min(1, dt * 10);
    demo.y += (ty - demo.y) * Math.min(1, dt * 10);
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;

    if (mode === S.ATTRACT) {
      stepDemo(dt);
      drawScene(t);
      game.draw.hand(demo.x, demo.y, { press: demo.press, scale: 13 });
      out(GAME_TITLE, W / 2, 120 + Math.sin(t * 2) * 6, 96, YEL);
      out('HI-SCORE ' + game.best, W / 2, 200, 40, WHITE);
      if (Math.floor(t * 1.8) % 2 === 0) out('► 100円 投入 ◄', W / 2, H * 0.975, 46, YEL);
      else out('TAP TO START', W / 2, H * 0.975, 40, WHITE);
      return;
    }

    if (mode === S.RESULT) {
      drawScene(t);
      game.draw.rect(84, H * 0.3 - 6, W - 168, 552, INK);
      game.draw.rect(90, H * 0.3, W - 180, 540, '#3a1450');
      out(cleared ? 'CLEAR' : (endWhy === 'time' ? 'TIME UP' : 'GAME OVER'), W / 2, H * 0.35, 100, cleared ? YEL : MISSC);
      out('SCORE ' + finalScore, W / 2, H * 0.41, 60, WHITE);
      out(returns + ' / ' + NEEDED + '   PERFECT ' + perfects, W / 2, H * 0.46, 44, WHITE);
      if (cleared && finalScore > game.best) out('NEW RECORD', W / 2, H * 0.51, 56, YEL);
      else out('BEST ' + Math.max(game.best, finalScore), W / 2, H * 0.51, 42, YEL);
      if (!cleared) out('あと' + (NEEDED - returns) + '打!', W / 2, H * 0.27, 64, MISSC);
      if (Math.floor(t * 2) % 2 === 0) out('TAP TO CONTINUE', W / 2, H * 0.975, 40, WHITE);
      return;
    }

    // ---- PLAYING ----
    if (fin) {
      postT -= dt;
      stepSong(dt);
      if (postT <= 0) {
        mode = S.RESULT;
        var stats = { returns: returns, perfect: perfects, restsKept: restsKept, maxCombo: maxCombo, drops: LIVES - lives };
        if (cleared) game.end.success(finalScore, stats);
        else game.end.failure(stats);
      }
    } else if (readyT > 0) {
      readyT -= dt;
      if (readyT <= 0) game.audio.play('se_tap', 0.4);
    } else {
      if (stopT <= 0) timeLeft -= dt;
      stepSong(dt);
      if (!fin && timeLeft < 5) {
        warnT -= dt;
        if (warnT <= 0) { warnT = 0.5; game.audio.tone(timeLeft < 2 ? 'A5' : 'E5', 0.04, { wave: 'square', volume: 0.05 }); }
      }
      if (!fin && stopT <= 0 && timeLeft <= 0) {
        timeLeft = 0; endWhy = 'time';
        game.feedback.bad(W / 2, H * 0.3, { text: 'TIME UP', color: MISSC, size: 72 });
        ending(false);
      }
    }

    drawScene(t);
    drawHud(t);
    if (readyT > 0) out(readyT > 0.35 ? 'READY?' : 'GO!', W / 2, 1090, 120, YEL);
  });

  function startBgm() {
    game.audio.melody([
      ['A4', 0.5], ['C5', 0.5], ['D5', 1], ['C5', 0.5], ['A4', 0.5], ['G4', 1],
      ['A4', 0.5], ['D5', 0.5], ['E5', 1], ['D5', 0.5], ['C5', 0.5], ['A4', 1],
      ['G4', 0.5], ['A4', 0.5], ['C5', 1], ['A4', 0.5], ['G4', 0.5], ['E4', 1],
      ['G4', 0.5], ['A4', 0.5], ['A4', 2],
    ], { tempo: BPM0, wave: 'square', volume: 0.035, loop: true, bass: [['A2', 2], ['D3', 2], ['A2', 2], ['E2', 2], ['G2', 2], ['A2', 2], ['E2', 2], ['A2', 2]] });
  }

  game.onStart(function() {
    startBgm();
    mode = S.ATTRACT;
    initGame(true);
  });
})(game);
