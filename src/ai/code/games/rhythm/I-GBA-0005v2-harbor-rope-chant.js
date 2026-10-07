// I-GBA-0005v2-harbor-rope-chant.js
// ハーバーロープチャント — 回し手が歌う拍に乗り、足元を回ってくる縄を拍ごとに跳び続ける
// 操作: 回し手の歌の拍(縄が足元に来る瞬間)にタップして跳ぶ。歌の区切りごとにテンポが上がる
// 終わり: 18拍を跳び切れば成功。拍を3回外す(縄が足に掛かる)と失敗
// @mechanic: rhythm
// @theme: harbor_alley_rope_chant
// 世界観: 港町の路地裏で、縄跳び遊びの輪に入った漁師の娘が、回し手の子らが歌う舟歌の拍に合わせて跳び続け、歌が速くなっても最後まで輪から外れない
// 残るもの: 正誤(CLEAR/GAME OVER) + PERFECT/GOOD数と最大コンボ
// スタイル: 80s ISO

(function (game) {
  var W = game.canvas.width, H = game.canvas.height;
  // 80s ISO: 菱形グリッドの石畳、影で高さを示す、6〜8色
  var STYLE = { bg: ['#1f2a44', '#34507a', '#6b7fa8'], main: ['#c96b3c', '#e9d6a8', '#2b2b3a'], accent: ['#ffd24d', '#5fe0c8'] };

  var CX = W / 2, CY = H * 0.53;
  var TILE = 150;
  var SONG = [{ bpm: 100, n: 6 }, { bpm: 118, n: 6 }, { bpm: 138, n: 6 }];
  var COUNT_IN = 2;
  var LIVES = 3;
  var TIME_LIMIT = 14;
  var TUNE = ['A4', 'C5', 'E5', 'C5', 'D5', 'B4'];

  var GIRL = ['..##..', '.####.', '.#ee#.', '..##..', '######', '.####.', '.#..#.', '##..##'];
  var GIRL_UP = ['..##..', '.####.', '.#ee#.', '#.##.#', '.####.', '.####.', '..##..', '.#..#.'];
  var GIRL_PAL = { '#': STYLE.main[1], 'e': STYLE.main[2] };
  var GIRL_HIT = { '#': '#ffffff', 'e': '#ff4a4a' };
  var KID = ['.##.', '####', '#ee#', '.##.', '####', '#..#'];
  var KID_SING = ['.##.', '####', '#oo#', '.##.', '####', '#..#'];
  var KID_PAL = { '#': STYLE.main[0], 'e': STYLE.main[2], 'o': STYLE.accent[0] };
  var GULL = ['#...#', '.#.#.', '..#..'];

  var st = 'ATTRACT';
  var S;

  function buildSong() {
    var beats = [], t = 0;
    var first = 60 / SONG[0].bpm;
    for (var c = 0; c < COUNT_IN; c++) { beats.push({ at: t, judge: false, sec: -1, done: true }); t += first; }
    for (var s = 0; s < SONG.length; s++) {
      var gap = 60 / SONG[s].bpm;
      for (var i = 0; i < SONG[s].n; i++) { beats.push({ at: t, judge: true, sec: s, done: false, res: '' }); t += gap; }
    }
    beats.push({ at: t, judge: false, sec: 9, done: true });
    return beats;
  }

  function newSong() {
    return {
      beats: buildSong(), clock: -0.4, next: 0, lives: LIVES, perfect: 0, good: 0, miss: 0, combo: 0, maxCombo: 0,
      hop: 0, snag: 0, snagBeat: null, intro: 0.8, ended: false, win: false, hold: 0, secShown: 0, pulse: 0, total: TIME_LIMIT,
    };
  }

  function judgedCount() { return S.perfect + S.good + S.miss; }
  function totalBeats() { var n = 0; for (var i = 0; i < SONG.length; i++) n += SONG[i].n; return n; }

  // 縄の位相: 各拍の瞬間に足元(θ=0)を通る
  function ropeTheta() {
    var b = S.beats;
    for (var i = 1; i < b.length; i++) {
      if (S.clock < b[i].at) {
        var a0 = b[i - 1].at, a1 = b[i].at;
        var f = Math.max(0, (S.clock - a0) / (a1 - a0));
        return f * Math.PI * 2;
      }
    }
    return 0;
  }

  function jump() {
    S.hop = 0.3;
    var best = null, bd = 9;
    for (var i = 0; i < S.beats.length; i++) {
      var bt = S.beats[i];
      if (!bt.judge || bt.done) continue;
      var d = Math.abs(S.clock - bt.at);
      if (d < bd) { bd = d; best = bt; }
    }
    if (!best || bd > 0.2) { game.audio.play('se_tap', 0.2); return; }
    best.done = true;
    if (bd < 0.07) { best.res = 'P'; S.perfect++; } else { best.res = 'G'; S.good++; }
    S.combo++; S.maxCombo = Math.max(S.maxCombo, S.combo);
    game.feedback.good(CX, CY - 250, { text: bd < 0.07 ? 'PERFECT' : 'GOOD', color: bd < 0.07 ? STYLE.accent[0] : STYLE.accent[1], size: 46, count: 8 });
    game.audio.play('se_jump', 0.2);
    if (S.combo > 0 && S.combo % 6 === 0) game.fx.popup('x' + S.combo, CX + 220, CY - 330, { color: STYLE.accent[0], size: 44 });
    checkDone();
  }

  function checkDone() {
    if (judgedCount() >= totalBeats()) { S.ended = true; S.win = S.lives > 0; S.hold = 0.5; }
  }

  function songStep(dt) {
    S.clock += dt;
    S.total -= dt;
    if (S.hop > 0) S.hop -= dt;
    if (S.pulse > 0) S.pulse -= dt;
    // 回し手の歌: 拍ごとに1音
    while (S.next < S.beats.length && S.clock >= S.beats[S.next].at) {
      var bt = S.beats[S.next];
      var note = bt.sec < 0 ? 'E4' : TUNE[S.next % TUNE.length];
      game.audio.tone(note, 0.12, { wave: 'square', volume: 0.07 });
      S.pulse = 0.12;
      if (bt.sec > S.secShown && bt.sec < 9) {
        S.secShown = bt.sec;
        game.fx.popup(judgedCount() + ' / ' + totalBeats(), CX, CY - 420, { color: STYLE.accent[1], size: 48 });
        game.audio.play('se_milestone', 0.35);
      }
      S.next++;
    }
    // 速くなる直前の予告(次の区切りの1拍前に高い合図音)
    for (var k = 0; k < S.beats.length - 1; k++) {
      var cur = S.beats[k], nx = S.beats[k + 1];
      if (!cur.cue && nx.sec > cur.sec && cur.sec >= 0 && nx.sec < 9 && S.clock >= cur.at - 0.6) {
        cur.cue = true; game.audio.tone('A5', 0.05, { wave: 'triangle', volume: 0.05 });
      }
    }
    for (var i = 0; i < S.beats.length; i++) {
      var b = S.beats[i];
      if (b.judge && !b.done && S.clock > b.at + 0.16) {
        b.done = true; b.res = 'M'; S.miss++; S.combo = 0; S.lives--;
        S.snag = S.lives <= 0 ? 0.5 : 0.28; S.snagBeat = b;
        game.fx.flash('#ffffff', 0.1);
        game.feedback.bad(CX, CY - 40, { text: 'MISS', size: 46, shake: 5 });
        if (S.lives <= 0) { S.ended = true; S.win = false; S.hold = 0.1; }
        else checkDone();
        return;
      }
    }
    if (S.total <= 0 && !S.ended) { S.ended = true; S.win = false; S.hold = 0.5; }
  }

  function closeSong() {
    var stats = { perfect: S.perfect, good: S.good, miss: S.miss, combo: S.maxCombo };
    var score = S.perfect * 100 + S.good * 50 + S.maxCombo * 10;
    if (S.win) {
      game.feedback.good(CX, CY - 300, { text: 'CLEAR', color: STYLE.accent[0], size: 66 });
      game.audio.play('se_success', 0.6);
      game.end.success(score, stats);
    } else {
      game.audio.play('se_failure', 0.6);
      game.end.failure(stats);
    }
    st = 'RESULT';
  }

  // ── 描画(クォータービュー) ───────────────────
  function iso(gx, gy) { return { x: CX + (gx - gy) * TILE * 0.5, y: CY + (gx + gy) * TILE * 0.25 }; }

  function diamond(px, py, w, h, color, alpha) {
    for (var yy = -h / 2; yy < h / 2; yy += 4) {
      var k = 1 - Math.abs(yy) / (h / 2);
      game.draw.rect(px - w / 2 * k, py + yy, w * k, 4, color, alpha);
    }
  }

  function alley() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, STYLE.bg[0]], [0.35, STYLE.bg[1]], [1, STYLE.bg[0]]]);
    // 海と船の帆(奥)
    game.draw.rect(0, H * 0.24, W, H * 0.06, '#2f6fa8');
    for (var s = 0; s < 3; s++) {
      var sx = ((t * 20 + s * 380) % (W + 200)) - 100;
      game.draw.rect(sx, H * 0.2, 8, 70, STYLE.main[1]);
      game.draw.rect(sx + 8, H * 0.2, 50, 44, '#e8e8f0');
    }
    game.draw.sprite(GULL, { '#': '#ffffff' }, W * 0.2 + Math.sin(t * 0.7) * 120, H * 0.14 + Math.sin(t * 2) * 10, 8, { anchor: 'center' });
    // 路地の壁(左右の建物、影で高さ)
    game.draw.rect(0, H * 0.3, W * 0.18, H * 0.5, STYLE.main[0]);
    game.draw.rect(W * 0.82, H * 0.3, W * 0.18, H * 0.5, '#9e4f2a');
    for (var wn = 0; wn < 4; wn++) {
      game.draw.rect(W * 0.05, H * (0.34 + wn * 0.1), 70, 60, STYLE.accent[0], 0.35 + 0.25 * Math.sin(t * 1.4 + wn));
      game.draw.rect(W * 0.87, H * (0.34 + wn * 0.1), 70, 60, '#2b2b3a');
    }
    // 石畳(菱形グリッド)
    for (var gx = -3; gx <= 3; gx++) for (var gy = -3; gy <= 3; gy++) {
      var p = iso(gx, gy);
      diamond(p.x, p.y, TILE - 8, TILE * 0.5 - 4, (gx + gy) % 2 === 0 ? STYLE.bg[2] : '#56688f', 1);
    }
    // 拍に合わせて光る輪(地面の縁)
    diamond(CX, CY + 10, 300, 150, STYLE.accent[1], 0.15 + (S.pulse > 0 ? 0.35 : 0));
  }

  function ropeAndPeople() {
    var th = ropeTheta();
    var hL = iso(-2, 0), hR = iso(2, 0);
    var aL = { x: hL.x, y: hL.y - 120 }, aR = { x: hR.x, y: hR.y - 120 };
    var front = Math.sin(th) > 0;
    function rope() {
      var px = aL.x, py = aL.y;
      for (var i = 1; i <= 12; i++) {
        var s = i / 12;
        var bx = aL.x + (aR.x - aL.x) * s, by = aL.y + (aR.y - aL.y) * s;
        var bow = Math.sin(Math.PI * s);
        var x = bx + Math.sin(th) * 50 * bow;
        var y = by + (Math.cos(th) * 170 - 20) * bow + Math.sin(th) * 40 * bow;
        game.draw.line(px, py, x, y, S.snag > 0 ? '#ff4a4a' : '#f4e3b0', 8);
        px = x; py = y;
      }
    }
    var sing = S.pulse > 0;
    game.draw.circle(hL.x, hL.y + 10, 40, '#000000', 0.25);
    game.draw.circle(hR.x, hR.y + 10, 40, '#000000', 0.25);
    game.draw.sprite(sing ? KID_SING : KID, KID_PAL, hL.x, hL.y - 70, 18, { anchor: 'center' });
    game.draw.sprite(sing ? KID_SING : KID, KID_PAL, hR.x, hR.y - 70, 18, { anchor: 'center', flipX: true });
    if (!front) rope();
    var lift = S.hop > 0 ? Math.sin((S.hop / 0.3) * Math.PI) * 110 : 0;
    game.draw.circle(CX, CY + 20, 60 - lift * 0.25, '#000000', 0.3);
    var bob = Math.sin(game.time.elapsed * 5) * 3;
    game.draw.sprite(lift > 20 ? GIRL_UP : GIRL, S.snag > 0 ? GIRL_HIT : GIRL_PAL, CX, CY - 80 - lift + bob, S.snag > 0 ? 24 : 20, { anchor: 'center' });
    if (front) rope();
  }

  function beatLane() {
    // 親指ゾーン: 次の拍へ向かって縮む輪(拍の見える化)
    var y = H * 0.87;
    game.draw.circle(CX, y, 90, STYLE.main[2], 0.6);
    game.draw.circle(CX, y, 30, STYLE.accent[0], 0.9);
    for (var i = 0; i < S.beats.length; i++) {
      var b = S.beats[i];
      if (!b.judge || b.done) continue;
      var until = b.at - S.clock;
      if (until < -0.2 || until > 1.2) continue;
      var r = 30 + Math.max(0, until) * 200;
      game.draw.circle(CX, y, r, STYLE.accent[1], 0.25);
      game.draw.circle(CX + (until * 380), y, 22, SONG[b.sec] && b.sec === 2 ? STYLE.accent[0] : STYLE.accent[1], 0.9);
      game.draw.circle(CX - (until * 380), y, 22, SONG[b.sec] && b.sec === 2 ? STYLE.accent[0] : STYLE.accent[1], 0.9);
    }
  }

  function hud() {
    lettering(judgedCount() + ' / ' + totalBeats(), W * 0.2, 70, 46, STYLE.main[1]);
    for (var i = 0; i < LIVES; i++) game.draw.circle(W * 0.62 + i * 70, 70, 24, i < S.lives ? STYLE.main[0] : '#3a3a4a');
    lettering('x' + S.combo, W * 0.88, 70, 40, STYLE.accent[0]);
    game.draw.rect(60, 150, W - 120, 16, STYLE.main[2], 0.7);
    game.draw.rect(60, 150, (W - 120) * (judgedCount() / totalBeats()), 16, STYLE.accent[1]);
  }

  function lettering(s, x, y, size, color) {
    game.draw.text(s, x + 3, y + 3, { size: size, color: STYLE.main[2], bold: true, align: 'center' });
    game.draw.text(s, x, y, { size: size, color: color, bold: true, align: 'center' });
  }

  function paint() {
    alley();
    ropeAndPeople();
    beatLane();
  }

  // ── ATTRACT: 本物の songStep/jump をボットが拍で叩く(1拍わざと外す) ─────
  var demo = { t: 0, gx: CX, gy: H * 0.87, pressT: 0, missAt: 5 };
  function demoBeat(dt) {
    demo.t += dt;
    var cyc = demo.t % 7;
    if (cyc < dt || demo.t <= dt) { S = newSong(); S.intro = 0; S.clock = -0.2; }
    if (demo.pressT > 0) demo.pressT -= dt;
    if (S.snag > 0) { S.snag -= dt; return; }
    if (S.ended) { S.hold -= dt; return; }
    songStep(dt);
    for (var i = 0; i < S.beats.length; i++) {
      var b = S.beats[i];
      if (!b.judge || b.done || b.botSkip) continue;
      if (i === COUNT_IN + demo.missAt) { if (S.clock > b.at - 0.02) b.botSkip = true; continue; }
      if (S.clock >= b.at - 0.02) { demo.pressT = 0.2; jump(); }
      break;
    }
  }

  game.onTap(function (x, y) {
    if (st === 'ATTRACT') { game.audio.play('se_coin', 0.5); game.audio.stopBgm(); S = newSong(); st = 'PLAYING'; return; }
    if (st === 'RESULT') { game.audio.play('se_tap', 0.3); st = 'ATTRACT'; S = newSong(); demo.t = 0; startTune(); return; }
    if (S.intro > 0 || S.ended || S.snag > 0) { game.audio.play('se_tap', 0.1); return; }
    jump();
  });

  function startTune() {
    game.audio.melody([['A4', 0.5], ['C5', 0.5], ['E5', 1], ['D5', 0.5], ['C5', 0.5], ['B4', 1], ['A4', 0.5], ['E4', 0.5], ['A4', 1]], { tempo: 110, wave: 'square', volume: 0.045, loop: true, bass: true });
  }

  game.onUpdate(function (dt) {
    if (!S) S = newSong();
    if (st === 'ATTRACT') {
      demoBeat(dt);
      paint();
      game.draw.hand(demo.gx, demo.gy, { press: demo.pressT > 0, scale: 14 });
      lettering('ROPE CHANT', CX, 90, 66, STYLE.accent[0]);
      lettering('BEST ' + (game.best > 0 ? game.best : '-'), CX, 165, 34, STYLE.main[1]);
      if (Math.floor(game.time.elapsed * 1.6) % 2 === 0) lettering('► 100円 投入 ◄', CX, H * 0.965, 42, STYLE.accent[0]);
      else lettering('INSERT COIN', CX, H * 0.965, 36, STYLE.main[1]);
      return;
    }
    if (st === 'RESULT') {
      paint();
      game.draw.rect(0, H * 0.3, W, H * 0.28, STYLE.main[2], 0.85);
      lettering(S.win ? 'CLEAR' : 'GAME OVER', CX, H * 0.36, 88, S.win ? STYLE.accent[0] : '#ff5a4a');
      lettering('PERFECT ' + S.perfect + '  GOOD ' + S.good, CX, H * 0.43, 42, STYLE.main[1]);
      lettering('x' + S.maxCombo, CX, H * 0.475, 44, STYLE.accent[1]);
      var sc = S.perfect * 100 + S.good * 50 + S.maxCombo * 10;
      if (!S.win) lettering('あと' + (totalBeats() - judgedCount() + S.miss) + '拍!', CX, H * 0.525, 46, STYLE.accent[0]);
      else lettering(sc > game.best ? 'NEW RECORD' : 'BEST ' + game.best, CX, H * 0.525, 44, STYLE.accent[0]);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) lettering('TAP TO CONTINUE', CX, H * 0.965, 36, STYLE.main[1]);
      return;
    }
    if (S.intro > 0) {
      S.intro -= dt;
      if (S.intro <= 0) game.audio.play('se_tap', 0.3);
    } else if (S.snag > 0) {
      S.snag -= dt;
    } else if (S.ended) {
      S.hold -= dt;
      if (S.hold <= 0) { closeSong(); return; }
    } else {
      songStep(dt);
    }
    paint();
    hud();
    if (S.intro > 0) lettering(S.intro > 0.35 ? 'READY?' : 'GO!', CX, H * 0.36, 92, STYLE.accent[0]);
  });

  game.onStart(function () {
    startTune();
    st = 'ATTRACT';
    S = newSong();
    demo.t = 0;
  });
})(game);
