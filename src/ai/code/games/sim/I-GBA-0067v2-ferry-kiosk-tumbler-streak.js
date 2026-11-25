// I-GBA-0067v2-ferry-kiosk-tumbler-streak.js
// 連絡船の起き上がり棚 — 波の揺れで倒れていく起き上がり人形を、揺り返しが一番起きた瞬間にタップして次々立て直す。続けて起こすほど倍率が上がる
// 操作: 倒れた人形は横倒しのまま揺れている。揺り返しで頭が一番持ち上がった瞬間(顔が明るくなり輪が光る)にその人形をタップすると立ち上がる。揺れの途中で叩くとべたっと寝てしまい倍率が1に戻る。丸窓に大波がせり上がって汽笛が鳴ると、揺れている印の人形が倒れる。倒れたまま放っておくと赤く点滅して棚から転げ落ちる
// 終わり: 船が着く20秒後までに10体以上立て直し、人形を3体落とさなければCLEAR。3体落とすか10体に届かなければGAME OVER
// @mechanic: jackpot_combo
// @theme: ferry_kiosk_tumbler_dolls
// 世界観: 冬の連絡船の売店で、売り子の娘が、波の揺れで棚から倒れていく起き上がり人形を揺り返しの瞬間に次々と起こし、続けて起こすほど売り場がにぎわう
// 残るもの: 正誤(CLEAR/GAME OVER) + 立て直した数・最大連続・最高倍率・落とした数・スコア
// スタイル: MODERN AD-GAME

(function (game) {
  var STYLE = { bg: ['#1e88e5', '#64c8ff', '#fff4e0'], main: ['#ff3b5c', '#ffd400', '#ffffff'], accent: ['#00d17a', '#ff8a00', '#1a1a2e'] };
  var W = game.canvas.width;
  var H = game.canvas.height;
  var SEA = STYLE.bg[0], SKY = STYLE.bg[1], WALL = STYLE.bg[2];
  var RED = STYLE.main[0], YEL = STYLE.main[1], WHITE = STYLE.main[2];
  var GREEN = STYLE.accent[0], ORANGE = STYLE.accent[1], INK = STYLE.accent[2];
  var WOOD = '#c47a3a', WOOD2 = '#8a4a1e', SKIN = '#ffe0c0';

  var TITLE = 'TUMBLER STREAK';
  var TIME_LIMIT = 20;
  var NEEDED = 10;
  var LIVES = 3;
  var R1 = 66, R2 = 44;
  var SLOTS = [
    { x: W * 0.2, y: H * 0.47 }, { x: W * 0.5, y: H * 0.47 }, { x: W * 0.8, y: H * 0.47 },
    { x: W * 0.2, y: H * 0.665 }, { x: W * 0.5, y: H * 0.665 }, { x: W * 0.8, y: H * 0.665 },
  ];
  var COLORS = [RED, GREEN, ORANGE, SEA, RED, GREEN];
  var DOWN_MAX = 3.4, DOWN_WARN = 0.8, RESTOCK = 1.4, WAVE_WARN = 0.75;
  var WIN_K = 0.75, PERF_K = 0.95;
  var MULTS = [0, 3, 6, 10, 15];

  var GIRL = [
    ['...hhhhh...', '..hhhhhhh..', '..hsssssh..', '..skssks...', '...ssss....', '...rrrrr...', '..rrwwwrr..', '.s.rwwwr.s.', '...rrrrr...', '...bb.bb...', '...bb.bb...'],
    ['...hhhhh...', '..hhhhhhh..', '..hsssssh..', '..skssks...', '...ssss..s.', '...rrrrr.s.', '..rrwwwrrs.', '.s.rwwwr...', '...rrrrr...', '...bb.bb...', '...bb.bb...'],
    ['s..hhhhh..s', '.shhhhhhhs.', '..hsssssh..', '..sksskss..', '...swwss...', '...rrrrr...', '..rrwwwrr..', '...rwwwr...', '...rrrrr...', '..bb...bb..', '..bb...bb..'],
  ];
  var G_PAL = { h: INK, s: SKIN, k: INK, r: RED, w: WHITE, b: SEA };
  var GULL = [['w...w', '.w.w.', '..w..'], ['.....', 'ww.ww', '..w..']];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var dolls, combo, bestCombo, mult, maxMult, upCount, lost, score, timeLeft, waveT, waveN, warnOn, tilt, gFrame, gT, rt;
  var ready, halt, over, won, endT, resT, sent, prevBest;

  function multFor(c) { var m = 1; for (var i = 1; i < MULTS.length; i++) if (c >= MULTS[i]) m = i + 1; return m; }
  function level() { return rt < 7 ? 0 : rt < 14 ? 1 : 2; }
  function omega() { return [6.3, 7.4, 8.6][level()]; }
  function waveGap() { return [2.6, 2.2, 1.8][level()]; }
  function waveSize() { return [2, 3, 3][level()]; }

  function freshDoll(i) { return { x: SLOTS[i].x, y: SLOTS[i].y, st: 'up', dir: 1, ph: 0, downT: 0, mark: false, restock: 0, pop: 0, col: COLORS[i] }; }

  function initGame() {
    dolls = [];
    for (var i = 0; i < SLOTS.length; i++) dolls.push(freshDoll(i));
    combo = 0; bestCombo = 0; mult = 1; maxMult = 1; upCount = 0; lost = 0; score = 0; timeLeft = TIME_LIMIT;
    waveT = 1.2; waveN = 0; warnOn = false; tilt = 0; gFrame = 0; gT = 0; rt = 0;
    ready = 0.8; halt = null; over = false; won = false; endT = 0; resT = 0; sent = false; prevBest = game.best || 0;
  }

  function rock(d) { return Math.max(0, Math.sin(d.ph)); }

  // ── 波と人形(プレイ・デモ共通)。棚から落ちた人形を返す ──
  function stepShelf(dt, vol, pick) {
    rt += dt;
    waveT -= dt;
    if (!warnOn && waveT <= WAVE_WARN) {
      warnOn = true;
      var cand = [];
      for (var i = 0; i < dolls.length; i++) if (dolls[i].st === 'up') cand.push(i);
      var n = Math.min(cand.length, waveSize());
      for (var k = 0; k < n; k++) {
        var j = pick ? pick(cand, k) : Math.floor(game.random(0, cand.length));
        dolls[cand[j]].mark = true; cand.splice(j, 1);
      }
      game.audio.tone(196, 0.5, { wave: 'sawtooth', volume: 0.05 * vol });
      game.audio.tone(147, 0.5, { wave: 'square', volume: 0.04 * vol });
    }
    if (waveT <= 0) {
      warnOn = false; waveN++; waveT = waveGap(); tilt = 0.5;
      for (var m = 0; m < dolls.length; m++) {
        var d = dolls[m];
        if (d.mark && d.st === 'up') { d.st = 'down'; d.dir = m % 2 ? 1 : -1; d.ph = -Math.PI / 2; d.downT = 0; }
        d.mark = false;
      }
      game.audio.tone(110, 0.25, { wave: 'triangle', volume: 0.08 * vol, slide: -40 });
    }
    if (tilt > 0) tilt -= dt;
    var fell = null;
    for (var q = 0; q < dolls.length; q++) {
      var e = dolls[q];
      if (e.pop > 0) e.pop -= dt;
      if (e.st === 'down') {
        e.ph += omega() * dt; e.downT += dt;
        if (e.downT >= DOWN_MAX - DOWN_WARN && e.downT - dt < DOWN_MAX - DOWN_WARN) game.audio.tone(880, 0.1, { wave: 'square', volume: 0.04 * vol });
        if (e.downT >= DOWN_MAX && !fell) { e.st = 'gone'; e.restock = RESTOCK; fell = e; }
      } else if (e.st === 'gone') {
        e.restock -= dt;
        if (e.restock <= 0) { var nd = freshDoll(q); nd.pop = 0.3; dolls[q] = nd; }
      }
    }
    return fell;
  }

  function dollAt(x, y) {
    var best = null, bd = 140;
    for (var i = 0; i < dolls.length; i++) {
      var d = dolls[i];
      if (d.st === 'gone') continue;
      var dd = Math.hypot(x - d.x, y - (d.y - R1));
      if (dd < bd) { bd = dd; best = d; }
    }
    return best;
  }

  // ── 人形を揺する(プレイ・デモ共通)。'up' | 'perfect' | 'flop' | 'none' ──
  function shake(d, vol) {
    if (!d || d.st !== 'down') { game.audio.tone(330, 0.04, { wave: 'triangle', volume: 0.04 * vol }); return 'none'; }
    var k = rock(d);
    if (k >= WIN_K) {
      var perfect = k >= PERF_K;
      d.st = 'up'; d.pop = 0.35; d.downT = 0;
      combo++; if (combo > bestCombo) bestCombo = combo;
      var nm = multFor(combo);
      gFrame = 2; gT = 0.4;
      game.feedback.good(d.x, d.y - R1 * 3, { text: perfect ? 'PERFECT' : 'GOOD', color: perfect ? YEL : GREEN, count: perfect ? 16 : 10, volume: 0.5 * vol });
      if (nm > mult) {
        mult = nm; if (mult > maxMult) maxMult = mult;
        game.fx.popup('COMBO x' + mult, W / 2, H * 0.36, { color: YEL, size: 84 });
        game.audio.play('se_powerup', 0.45 * vol);
        if (mult === 3 && state === S.PLAYING) game.audio.play('se_milestone', 0.5);
      }
      return perfect ? 'perfect' : 'up';
    }
    return 'flop';
  }

  function breakCombo(d) {
    if (d) { d.ph = -Math.PI / 2; }
    combo = 0; mult = 1;
  }

  function finish() {
    if (over) return;
    over = true; won = lost < LIVES && upCount >= NEEDED; endT = 1.3;
    if (won) score += bestCombo * 50;
    gFrame = won ? 2 : 0; gT = 9;
    game.audio.stopBgm();
    game.audio.play(won ? 'se_success' : 'se_failure', 0.55);
    if (won) for (var i = 0; i < 6; i++) game.fx.burst(SLOTS[i].x, SLOTS[i].y - 120, { color: i % 2 ? YEL : RED, count: 16, speed: 420 });
  }

  function sendEnd() {
    if (sent) return;
    sent = true;
    var stats = { upright: upCount, bestCombo: bestCombo, maxMult: maxMult, dropped: lost };
    if (won) game.end.success(score, stats); else game.end.failure(stats);
  }

  // ── 入力 ──
  game.onTap(function (x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.5); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.2); sendEnd(); state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (over || halt || ready > 0) { game.audio.play('se_tap', 0.05); return; }
    var d = dollAt(x, y);
    var r = shake(d, 1);
    if (r === 'up' || r === 'perfect') {
      upCount++;
      var gain = (r === 'perfect' ? 150 : 100) * mult;
      score += gain;
      game.fx.popup('+' + gain, d.x + 90, d.y - R1 * 2, { color: WHITE, size: 52 });
    } else if (r === 'flop') {
      halt = { t: 0.3, max: 0.3, d: d, cause: 'flop' };
      game.fx.flash(WHITE, 0.1);
    }
  });

  // ── 描画 ──
  function big(s, x, y, sz, col) {
    game.draw.text(s, x + 5, y + 5, { size: sz, color: INK, bold: true, align: 'center' });
    game.draw.text(s, x, y, { size: sz, color: col, bold: true, align: 'center' });
  }

  function drawCabin() {
    var t = game.time.elapsed;
    var roll = Math.sin(t * 1.3) * 6 + tilt * 30;
    game.draw.gradient(0, H, [[0, WALL], [0.7, '#ffe6c0'], [0.72, WOOD], [1, WOOD2]]);
    // 丸窓(遠景の海と大波の予告)
    var px = W / 2, py = H * 0.2;
    game.draw.circle(px, py, 128, INK);
    game.draw.circle(px, py, 112, SKY);
    var lvl = py + 20 + Math.sin(t * 1.3) * 18 + (warnOn ? -(1 - waveT / WAVE_WARN) * 80 : 0) + tilt * 40;
    for (var s = 0; s < 14; s++) {
      var yy = lvl + s * 16;
      var hw = Math.sqrt(Math.max(0, 112 * 112 - (yy - py) * (yy - py)));
      if (hw > 0) game.draw.rect(px - hw, yy, hw * 2, 16, s === 0 && warnOn ? WHITE : SEA);
    }
    game.draw.sprite(GULL[Math.floor(t * 4) % 2], { w: WHITE }, px - 50 + Math.sin(t) * 30, py - 50, 6, { anchor: 'center' });
    for (var b = 0; b < 8; b++) { var ba = b * Math.PI / 4; game.draw.circle(px + Math.cos(ba) * 120, py + Math.sin(ba) * 120, 9, YEL); }
    if (warnOn && Math.floor(t * 10) % 2 === 0) { game.draw.circle(px + 150, py - 70, 34, RED); game.draw.rect(px + 145, py - 92, 10, 28, WHITE); game.draw.rect(px + 145, py - 58, 10, 10, WHITE); }
    // 吊り下げの浮き輪とポスター(揺れ)
    game.draw.circle(W * 0.12 + roll, H * 0.2, 70, RED);
    game.draw.circle(W * 0.12 + roll, H * 0.2, 40, WALL);
    game.draw.rect(W * 0.78 - roll, H * 0.14, 150, 190, YEL);
    game.draw.rect(W * 0.78 + 15 - roll, H * 0.14 + 15, 120, 100, SEA);
    // 棚板
    for (var r = 0; r < 2; r++) {
      var sy = SLOTS[r * 3].y;
      game.draw.rect(W * 0.05, sy, W * 0.9, 34, INK);
      game.draw.rect(W * 0.05 + 6, sy + 4, W * 0.9 - 12, 22, WOOD);
    }
  }

  function dollGeom(d) {
    var th;
    if (d.st === 'up') th = Math.sin(game.time.elapsed * 3 + d.x) * 0.06 + (d.mark ? Math.sin(game.time.elapsed * 30) * 0.12 : 0) + (d.pop > 0 ? Math.sin(d.pop * 40) * 0.2 : 0);
    else th = d.dir * (Math.PI / 2 - 0.95 * rock(d));
    var bx = d.x + Math.sin(th) * R1, by = d.y - R1 * (0.55 + 0.45 * Math.cos(th));
    var hx = bx + Math.sin(th) * (R1 + R2 * 0.7), hy = by - Math.cos(th) * (R1 + R2 * 0.7);
    return { th: th, bx: bx, by: by, hx: hx, hy: hy };
  }

  function drawDoll(d, hl) {
    if (d.st === 'gone') {
      if (halt && halt.d === d && hl > 0) {
        game.draw.circle(d.x + d.dir * 60, d.y - R1, (R1 + 30) * (1 + hl * 0.4), WHITE, 0.6);
        game.draw.circle(d.x + d.dir * 60, d.y - R1 * 0.5, R1 * (1 + hl * 0.3), WHITE);
        return;
      }
      if (d.restock < RESTOCK - 0.35) return;
      var k = (RESTOCK - d.restock) / 0.35;
      game.draw.circle(d.x + d.dir * 80, d.y + k * 200, R1 * (1 - k * 0.4), d.col, 1 - k);
      return;
    }
    var g = dollGeom(d);
    var isH = halt && halt.d === d && hl > 0;
    var sc = isH ? 1 + hl * 0.35 : 1;
    var inWin = d.st === 'down' && rock(d) >= WIN_K;
    var warn = d.st === 'down' && d.downT > DOWN_MAX - DOWN_WARN && Math.floor(game.time.elapsed * 10) % 2 === 0;
    if (inWin) game.draw.circle(g.hx, g.hy, R2 + 34, YEL, 0.7);
    game.draw.rect(d.x - R1 * 0.8 + Math.sin(g.th) * R1 * 0.5, d.y - 6, R1 * 1.6, 8, INK, 0.25);
    var body = isH ? WHITE : warn ? '#ff8080' : d.col;
    game.draw.circle(g.bx, g.by, R1 * sc + 8, INK);
    game.draw.circle(g.bx, g.by, R1 * sc, body);
    game.draw.circle(g.bx - 18, g.by - 22, R1 * 0.28, WHITE, 0.45);
    game.draw.circle(g.hx, g.hy, R2 * sc + 7, INK);
    game.draw.circle(g.hx, g.hy, R2 * sc, isH ? WHITE : body);
    var face = d.st === 'up' || inWin ? SKIN : '#d8b090';
    game.draw.circle(g.hx, g.hy + 4, R2 * 0.68 * sc, face);
    var ex = Math.cos(g.th) * 13, ey = Math.sin(g.th) * 13;
    if (d.st === 'up' || inWin) {
      game.draw.circle(g.hx - ex, g.hy - ey, 6, INK); game.draw.circle(g.hx + ex, g.hy + ey, 6, INK);
    } else {
      game.draw.line(g.hx - ex - 6, g.hy - ey, g.hx - ex + 6, g.hy - ey, INK, 4); game.draw.line(g.hx + ex - 6, g.hy + ey, g.hx + ex + 6, g.hy + ey, INK, 4);
    }
  }

  function drawCounter() {
    // 親指ゾーン: カウンターと売り子、倍率メーター
    game.draw.rect(0, H * 0.76, W, 16, INK);
    var f = gT > 0 ? gFrame : (Math.floor(game.time.elapsed * 1.6) % 2 ? 1 : 0);
    game.draw.sprite(GIRL[f], G_PAL, W * 0.15, H * 0.86 + Math.sin(game.time.elapsed * 2.5) * 6, 17, { anchor: 'center' });
    var mx = W * 0.35, my = H * 0.84, mw = W * 0.58;
    game.draw.rect(mx - 8, my - 8, mw + 16, 76, INK);
    for (var i = 0; i < 5; i++) {
      var on = mult > i;
      game.draw.rect(mx + i * (mw / 5) + 4, my, mw / 5 - 8, 60, on ? [GREEN, YEL, ORANGE, RED, '#ff3bd8'][i] : '#5a5a6e');
    }
    var nextAt = mult < MULTS.length ? MULTS[mult] : 0;
    var prevAt = MULTS[mult - 1] || 0;
    var fr = mult < MULTS.length ? (combo - prevAt) / Math.max(1, nextAt - prevAt) : 1;
    game.draw.rect(mx, my + 78, mw * fr, 16, WHITE);
    big('x' + mult, W * 0.64, H * 0.95, 70 + mult * 8, [WHITE, GREEN, YEL, ORANGE, RED][mult - 1]);
  }

  function drawHud() {
    big(String(score), W / 2, 112, 70, INK);
    for (var i = 0; i < LIVES; i++) game.draw.circle(70 + i * 70, 92, 24, i < LIVES - lost ? RED : '#9a9aaa');
    big(upCount + ' / ' + NEEDED, W - 160, 108, 50, upCount >= NEEDED ? GREEN : INK);
    var fr = Math.max(0, timeLeft / TIME_LIMIT);
    game.draw.rect(56, 176, W - 112, 30, INK);
    game.draw.rect(62, 182, (W - 124) * fr, 18, timeLeft < 4 && Math.floor(game.time.elapsed * 8) % 2 === 0 ? RED : GREEN);
    if (combo > 1) big('COMBO ' + combo, W / 2, H * 0.31, 50, RED);
  }

  // ── ATTRACT デモ: 揺り返しの瞬間に起こして倍率を上げる → 1度だけ揺れの途中で叩いて倍率が戻る ──
  var demo = { t: 0, press: 0, gx: W / 2, gy: H * 0.6, haltT: 0, n: 0 };
  function demoPick(cand, k) { return (k * 2 + Math.floor(demo.t)) % cand.length; }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 9;
    if (cyc < dt || demo.t <= dt) { initGame(); ready = 0; waveT = 0.9; demo.n = 0; demo.haltT = 0; halt = null; }
    if (demo.press > 0) demo.press -= dt;
    if (gT > 0) gT -= dt;
    if (demo.haltT > 0) {
      demo.haltT -= dt;
      if (demo.haltT <= 0) { var hd = halt.d; halt = null; breakCombo(hd); game.feedback.bad(hd.x, hd.y - R1 * 2, { text: 'MISS', volume: 0.3, shake: 4 }); }
      return;
    }
    stepShelf(dt, 0.3, demoPick);
    for (var i = 0; i < dolls.length; i++) {
      var d = dolls[i];
      if (d.st !== 'down' || demo.press > 0) continue;
      var g = dollGeom(d);
      var mistap = demo.n === 4 && rock(d) < 0.2 && d.ph > 0;
      if (rock(d) > 0.93 || mistap) {
        demo.gx = g.hx; demo.gy = g.hy + 40; demo.press = 0.25; demo.n++;
        var r = shake(d, 0.3);
        if (r === 'flop') { halt = { t: 0.3, max: 0.3, d: d }; demo.haltT = 0.3; }
        break;
      }
    }
  }

  game.onUpdate(function (dt) {
    if (state === S.ATTRACT) {
      stepDemo(dt);
      var hlA = halt ? Math.max(0, demo.haltT / 0.3) : 0;
      drawCabin();
      for (var i = 0; i < dolls.length; i++) drawDoll(dolls[i], hlA);
      drawCounter();
      game.draw.hand(demo.gx, demo.gy + Math.sin(game.time.elapsed * 3) * 6, { press: demo.press > 0, scale: 15 });
      big(TITLE, W / 2, H * 0.06, 92, RED);
      big('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.096, 42, INK);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) big('► 100円 投入 ◄', W / 2, H * 0.985, 44, YEL);
      else big('INSERT COIN', W / 2, H * 0.985, 38, WHITE);
      return;
    }

    if (state === S.RESULT) {
      resT += dt;
      if (resT > 1.2) sendEnd();
      drawCabin();
      for (var j = 0; j < dolls.length; j++) drawDoll(dolls[j], 0);
      drawCounter();
      game.draw.rect(60, H * 0.12, W - 120, H * 0.25, INK, 0.85);
      big(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.17, 104, won ? YEL : RED);
      big('SCORE ' + score, W / 2, H * 0.22, 56, WHITE);
      big(upCount + ' / ' + NEEDED + '   COMBO ' + bestCombo + '   x' + maxMult, W / 2, H * 0.265, 42, SKY);
      if (won && score > prevBest) big('NEW RECORD', W / 2, H * 0.31, 60, YEL);
      else big('BEST ' + Math.max(prevBest, won ? score : 0), W / 2, H * 0.31, 42, WALL);
      if (!won) big(lost >= LIVES ? 'あと1体!' : 'あと' + Math.max(1, NEEDED - upCount) + '体!', W / 2, H * 0.355, 58, YEL);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) big('TAP TO CONTINUE', W / 2, H * 0.985, 38, WHITE);
      return;
    }

    // ── PLAYING ──
    var hl = 0;
    if (over) {
      endT -= dt;
      if (gT > 0 && gT < 9) gT -= dt;
      if (endT <= 0) { state = S.RESULT; resT = 0; }
    } else if (halt) {
      halt.t -= dt;
      hl = Math.max(0, halt.t / halt.max);
      if (halt.t <= 0) {
        var hd = halt.d, cause = halt.cause;
        halt = null;
        game.feedback.bad(hd.x, hd.y - R1 * 2, { text: 'MISS' });
        if (cause === 'flop') breakCombo(hd);
        else { breakCombo(null); lost++; game.audio.play('se_break', 0.35); if (lost >= LIVES) finish(); }
      }
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap', 0.4);
    } else {
      timeLeft -= dt;
      if (timeLeft <= 4 && Math.floor((timeLeft + dt) * 2) !== Math.floor(timeLeft * 2)) game.audio.tone(990, 0.05, { wave: 'square', volume: 0.05 });
      if (gT > 0) gT -= dt;
      var fell = stepShelf(dt, 1);
      if (fell) { halt = { t: 0.4, max: 0.4, d: fell, cause: 'fell' }; game.fx.flash(WHITE, 0.12); }
      if (timeLeft <= 0) { timeLeft = 0; finish(); game.fx.popup('FINISH', W / 2, H * 0.36, { color: YEL, size: 90 }); }
    }

    drawCabin();
    for (var k = 0; k < dolls.length; k++) drawDoll(dolls[k], hl);
    drawCounter();
    drawHud();
    if (upCount === 0 && ready <= 0 && !over) {
      for (var q = 0; q < dolls.length; q++) {
        if (dolls[q].st === 'down') { var gq = dollGeom(dolls[q]); game.draw.hand(gq.hx, gq.hy + 40, { press: rock(dolls[q]) >= WIN_K, scale: 12, alpha: 0.5 }); break; }
      }
    }
    if (ready > 0) big(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.4, 120, RED);
  });

  game.onStart(function () {
    game.audio.melody([
      ['F5', 0.5], ['A5', 0.5], ['C6', 0.5], ['A5', 0.5], ['Bb5', 0.5], ['G5', 0.5], ['F5', 1],
      ['E5', 0.5], ['G5', 0.5], ['Bb5', 0.5], ['G5', 0.5], ['A5', 1], ['F5', 1],
      ['D5', 0.5], ['F5', 0.5], ['A5', 0.5], ['C6', 0.5], ['Bb5', 0.5], ['A5', 0.5], ['G5', 0.5], ['E5', 0.5], ['F5', 2],
    ], { tempo: 168, wave: 'square', volume: 0.045, loop: true, bass: [['F3', 1], ['C3', 1], ['Bb2', 1], ['C3', 1]] });
    state = S.ATTRACT;
    initGame();
  });
})(game);
