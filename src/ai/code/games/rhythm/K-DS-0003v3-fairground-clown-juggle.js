// K-DS-0003v3-fairground-clown-juggle.js
// 夜の遊園地の玉さばき — 道化師ふうの芸人が光る球を左右の手で弾く。拍の頭で球が来た側を押すたびに倍率が上がり、外すと倍率が戻る。拍は2小節ごとに速くなる
// 操作: 画面の左半分/右半分を押すと芸人のその側の手が球を弾く(押した瞬間で判定)。弾いた瞬間に次に球が落ちる側の手と下の押し場所が光る(左右交互が基本、同じ側に小さく上げることもある)。拍の頭で光った側を押せばPERFECT/GOOD、倍率+1(最大x9)。反対側・拍の外れ・押し漏らしはMISSで倍率x1に戻る。テンポは2小節ごとに上がる(2拍前から回転木馬の電飾が速く点滅し、1拍前に太鼓の連打で予告)
// 終わり: 9小節(約19秒・32回弾く)を終えて MISS 3回以内ならCLEAR(得点 = 判定点 × その時の倍率 の合計)。MISS 4回で球が転がり去ってGAME OVER
// @mechanic: jackpot_combo
// @theme: fairground_clown_juggle
// 世界観: 夜の遊園地の回転木馬前の広場で、道化師ふうのパフォーマーが光る球を左右の手で弾き続け、拍に乗るほど客席の歓声と手拍子が高まっていく
// 残るもの: 正誤(CLEAR/GAME OVER) + スコア(倍率込み)・最大倍率・PERFECT/GOOD/MISS数
// スタイル: 70s MONO
var STYLE = { bg: ['#000000', '#0b0b0b'], main: ['#ffffff', '#ffd23a', '#46e07a'], accent: ['#ff4a3a', '#8a8a8a'] };

(function (game) {
  // 70s MONO: 黒いブラウン管に白ドットだけで描き、画面の帯ごとに色セロハンの単色で染める(上=赤 / 木馬=黄 / 舞台=白 / 客席=緑)。音は矩形波の単音
  var W = game.canvas.width;
  var H = game.canvas.height;
  var WHITE = STYLE.main[0], YEL = STYLE.main[1], GRN = STYLE.main[2], RED = STYLE.accent[0], GREY = STYLE.accent[1];
  var INK = '#000000';
  var BAND_TOP = 236, BAND_RIDE = 700, BAND_CROWD = 1360;
  function bandCol(y) { return y < BAND_TOP ? RED : (y < BAND_RIDE ? YEL : (y < BAND_CROWD ? WHITE : GRN)); }

  var GAME_TITLE = 'CLOWN BOUNCE';
  var TIME_LIMIT = 20;
  var INTRO = 4;                       // 1小節: 芸人が右手で球をついてカウント
  var SIDES = 'LRLRLRLR' + 'LRLLRLRR' + 'LRRLRLLR' + 'LRLRRLRL';   // 4〜35拍目に球が落ちる側
  var FIRST = INTRO, LASTB = INTRO + SIDES.length - 1, SONG_BEATS = LASTB + 1;
  var STAGES = [[0, 96], [12, 112], [20, 128], [28, 144]];          // [始まる拍, BPM] 2小節ごとに加速
  var PERFECT_W = 0.05;
  var GOOD_W = 0.11;
  var RUSH_W = 0.18;
  var MISS_MAX = 4;
  var MULT_MAX = 9;
  var HIT_STOP = 0.35;
  var HAND = { L: { x: 330, y: 990 }, R: { x: 750, y: 990 }, C: { x: 540, y: 820 } };
  var PAD = { L: { x: 270, y: 1700 }, R: { x: 810, y: 1700 } };

  function bpmOf(k) { var b = STAGES[0][1]; for (var i = 0; i < STAGES.length; i++) if (k >= STAGES[i][0]) b = STAGES[i][1]; return b; }
  function stageOf(k) { var s = 0; for (var i = 0; i < STAGES.length; i++) if (k >= STAGES[i][0]) s = i; return s; }
  var BT = [0];                        // 各拍の頭の時刻(拍クロックの目盛り)
  for (var bk = 0; bk <= SONG_BEATS + 2; bk++) BT.push(BT[bk] + 60 / bpmOf(bk));
  function sideAt(k) { return k < FIRST ? 'R' : (k > LASTB ? 'C' : SIDES.charAt(k - FIRST)); }

  // 伴奏(オリジナル)。遊園地ふうの単音メロディ。小節ごとにその段のテンポで鳴らす
  var MEL = [
    [['G4', 1], ['C5', 1], ['E5', 1], ['G5', 1]],
    [['E5', 0.5], ['F5', 0.5], ['G5', 1], ['E5', 1], ['C5', 1]],
    [['D5', 0.5], ['E5', 0.5], ['F5', 1], ['D5', 1], ['B4', 1]],
    [['C5', 0.5], ['E5', 0.5], ['G5', 1], ['A5', 1], ['G5', 1]],
    [['F5', 0.5], ['E5', 0.5], ['D5', 1], ['G4', 1], ['B4', 1]],
    [['E5', 0.5], ['G5', 0.5], ['C6', 1], ['B5', 1], ['G5', 1]],
    [['A5', 0.5], ['G5', 0.5], ['F5', 1], ['D5', 1], ['F5', 1]],
    [['E5', 0.5], ['F5', 0.5], ['G5', 0.5], ['A5', 0.5], ['B5', 1], ['G5', 1]],
    [['C6', 0.5], ['B5', 0.5], ['A5', 0.5], ['G5', 0.5], ['F5', 0.5], ['E5', 0.5], ['D5', 1]],
    [['C6', 2]]
  ];
  var BASS = ['C3', 'C3', 'G2', 'C3', 'G2', 'C3', 'F2', 'G2', 'G2', 'C3'];

  // ---- ドット絵(白ドット。帯の色で染める) ----
  // 道化師ふう: とんがり帽子 / 白塗りの顔(目と口は抜き) / ひだ襟 / 大きなボタン / 大きな靴。赤い鼻は別に描く
  var CLOWN = ['.......##.......', '......####......', '.......##.......', '......####......', '.....######.....', '....########....',
    '..############..', '...##########...', '...#.##..##.#...', '...##########...', '...#........#...', '....########....',
    '.....######.....', '.#.#.#.#.#.#.#.#', '..############..', '..#####..#####..', '..############..', '..#####..#####..',
    '...####..####...', '.######..######.'];
  function variant(base, rows) { var o = base.slice(); for (var k in rows) o[+k] = rows[k]; return o; }
  var CLOWN_JOY = variant(CLOWN, { 8: '...##.#..#.##...', 10: '...#........#...', 11: '....#......#....' });
  var CLOWN_OOPS = variant(CLOWN, { 8: '...#..#..#..#...', 10: '...#####.#####..', 11: '....###..###....' });
  var HORSE = [['..##........', '.####.......', '##.#########', '...########.', '...#......#.', '...#......#.'],
    ['..##........', '.####.......', '##.#########', '...########.', '..#........#', '.#..........#']];
  var HEAD = ['.###.', '#####', '#####', '.###.'];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var armed = false;

  var demoMode, running, beatN, beatT, now, nextBar, readyT, hitStop, lampT, warnT, rollT, bumpT, padT, missAt;
  var res, mult, maxMult, score, perfects, goods, misses, hits, over, won, outroT, prevBest, fever, cheerLv;

  function vol() { return demoMode ? 0.45 : 1; }
  function tone(f, d, o) { if (armed) game.audio.tone(f, d, o); }
  function spb() { return 60 / bpmOf(beatN); }

  function initGame(isDemo) {
    demoMode = !!isDemo;
    running = false; beatN = 0; beatT = 0; now = 0; nextBar = 0;
    readyT = isDemo ? 0 : 0.8;
    hitStop = 0; lampT = 0; warnT = 0; rollT = 0; bumpT = { L: 0, R: 0 }; padT = { L: 0, R: 0 }; missAt = null;
    res = []; mult = 1; maxMult = 1; score = 0; perfects = 0; goods = 0; misses = 0; hits = 0;
    over = false; won = false; outroT = 0; prevBest = game.best || 0; fever = false; cheerLv = 0;
    if (isDemo) startClock();
  }

  // ---- 拍クロック(1本だけ。段ごとに1拍の長さが縮む) ----
  function playBar(b) {
    if (!armed || b >= MEL.length) return;
    game.audio.melody(MEL[b], { tempo: bpmOf(b * 4), wave: 'square', volume: 0.04 * vol() });
  }
  function startClock() {
    running = true; beatN = 0; beatT = 0; now = 0; nextBar = 1;
    playBar(0);
    onBeat(0);
  }
  function onBeat(k) {
    if (k === SONG_BEATS) { catchBall(); return; }
    if (k > SONG_BEATS) return;
    lampT = 1;
    tone(BASS[Math.floor(k / 4)] || 'C3', 0.08, { wave: 'square', volume: 0.07 * vol() });
    if (k < FIRST) { bumpT.R = 0.15; tone('C6', 0.03, { wave: 'square', volume: 0.04 * vol() }); }
    // テンポ変化の予告: 2拍前から電飾が速く点滅、1拍前に太鼓の連打
    for (var i = 1; i < STAGES.length; i++) {
      if (k === STAGES[i][0] - 2) warnT = BT[k + 2] - BT[k];
      if (k === STAGES[i][0] - 1 && armed) game.audio.melody([['C6', 0.25], ['C6', 0.25], ['C6', 0.25], ['C6', 0.25]], { tempo: bpmOf(k), wave: 'square', volume: 0.035 * vol() });
      if (k === STAGES[i][0]) {
        rollT = 0.5;
        if (armed) game.audio.play('se_powerup', 0.35 * vol());
        game.fx.popup('▶▶', W / 2, 560, { color: YEL, size: 90 });
        game.fx.flash(YEL, 0.1);
      }
    }
  }

  function catchBall() {
    tone('C6', 0.3, { wave: 'square', volume: 0.07 * vol() });
    game.fx.burst(HAND.C.x, HAND.C.y, { color: WHITE, count: 26, speed: 400 });
    if (!demoMode) finish(misses < MISS_MAX);
  }

  function stepPlay(dt) {
    if (!running) return;
    beatT += dt;
    while (beatT >= spb()) { beatT -= spb(); beatN++; onBeat(beatN); if (!running) return; }
    now = BT[beatN] + beatT;
    if (nextBar < MEL.length && now >= BT[nextBar * 4] - 0.06) { playBar(nextBar); nextBar++; }
    for (var k = FIRST; k <= LASTB; k++) {
      if (!res[k] && now > BT[k] + GOOD_W) { missContact(k, 'drop'); if (over) return; }
    }
  }

  // ---- 判定(押した側 + 押した瞬間 vs 球が落ちる拍の頭) ----
  function bump(side) {
    if (!running || over) return;
    padT[side] = 0.18;
    var best = -1, bd = 99;
    for (var k = FIRST; k <= LASTB; k++) {
      var d = now - BT[k];
      if (Math.abs(d) < Math.abs(bd)) { bd = d; best = k; }
    }
    if (best >= 0 && !res[best] && Math.abs(bd) <= GOOD_W) {
      if (side === sideAt(best)) hitContact(best, bd);
      else missContact(best, 'wrong');
      return;
    }
    if (best >= 0 && res[best] && Math.abs(bd) <= RUSH_W) { tone(330, 0.03, { wave: 'square', volume: 0.03 }); return; }
    if (best >= 0 && !res[best] && Math.abs(bd) <= RUSH_W) { missContact(best, bd < 0 ? 'rush' : 'late'); return; }
    // 拍の外で手を出した(倍率は戻るが、次の球はそのまま来る)
    missCommon(HAND[side].x, HAND[side].y, side);
  }

  function hitContact(k, off) {
    var perfect = Math.abs(off) <= PERFECT_W;
    var side = sideAt(k);
    res[k] = perfect ? 'perfect' : 'good';
    hits++;
    var gain = (perfect ? 100 : 60) * mult;
    score += gain;
    if (perfect) perfects++; else goods++;
    bumpT[side] = 0.2;
    // 倍率が上がるほど弾く音の高さが上がる
    tone(440 * Math.pow(2, (mult + (perfect ? 2 : 0)) / 12), 0.07, { wave: 'square', volume: 0.08 * vol() });
    var h = HAND[side];
    game.feedback.good(h.x, h.y - 120, { text: (perfect ? 'PERFECT' : 'GOOD') + ' x' + mult, color: perfect ? WHITE : GREY, size: 46, count: perfect ? 12 : 7, volume: armed ? 0.18 : 0.001 });
    mult = Math.min(MULT_MAX, mult + 1);
    if (mult > maxMult) maxMult = mult;
    cheerLv = Math.min(1, cheerLv + 0.25);
    if (mult >= 4) tone(1200 + mult * 90, 0.05, { wave: 'square', volume: 0.025 * vol(), slide: 300 });
    if (!demoMode && mult === MULT_MAX && !fever) {
      fever = true;
      game.audio.play('se_milestone', 0.5);
      game.fx.popup('FEVER x' + MULT_MAX, W / 2, 640, { color: YEL, size: 84 });
    } else if (!demoMode && mult === 5) {
      game.fx.popup('x5', W / 2, 640, { color: YEL, size: 80 });
    }
  }

  function missContact(k, why) {
    res[k] = 'miss';
    var side = sideAt(k);
    missCommon(HAND[side].x, why === 'drop' ? HAND[side].y + 160 : HAND[side].y, null);
  }

  function missCommon(x, y, fumbleSide) {
    misses++;
    var lost = mult > 1;
    mult = 1; fever = false; cheerLv = 0;
    hitStop = HIT_STOP;
    missAt = { x: x, y: y, side: fumbleSide };
    if (lost) tone(660, 0.3, { wave: 'square', volume: 0.05 * vol(), slide: -420 });   // 客席の「あーあ」
    game.feedback.bad(x, y - 120, { text: 'MISS', shake: demoMode ? 4 : 10, volume: armed ? 0.5 : 0.001 });
    if (!demoMode && misses >= MISS_MAX) finish(false);
  }

  function finish(ok) {
    if (over) return;
    over = true; won = ok; outroT = 1.6; running = false;
    game.audio.stopBgm();
    if (ok) {
      game.audio.play('se_success', 0.55);
      for (var i = 0; i < 5; i++) game.fx.burst(game.random(160, 920), game.random(300, 1300), { color: i % 2 ? YEL : WHITE, count: 22, speed: 440 });
      if (score > prevBest && prevBest > 0) game.fx.popup('NEW RECORD', W / 2, 420, { color: YEL, size: 70 });
    } else {
      game.audio.play('se_failure', 0.5);
    }
  }

  // ---- 入力 ----
  game.onPress(function (x, y) {
    armed = true;
    if (state !== S.PLAYING || over) return;
    if (readyT > 0) { game.audio.play('se_tap', 0.2); return; }
    var side = x < W / 2 ? 'L' : 'R';
    game.fx.burst(PAD[side].x, PAD[side].y, { color: GRN, count: 5, speed: 160 });
    bump(side);
  });
  game.onTap(function (x, y) {
    armed = true;
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(false); return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.3); state = S.ATTRACT; initGame(true); demo.t = 0; demo.i = 0; return; }
  });

  // ---- 球の位置(拍クロックに固定: 弾いた拍の頭に出て、次の拍の頭に次の手へ落ちる) ----
  function ballPos() {
    if (!running && !over) return { x: HAND.R.x, y: HAND.R.y - 30 - Math.abs(Math.sin(game.time.elapsed * 4)) * 100 };
    if (beatN < FIRST - 1) {
      var u0 = beatT / spb();
      return { x: HAND.R.x, y: HAND.R.y - 30 - Math.sin(u0 * Math.PI) * 110 };
    }
    if (beatN >= SONG_BEATS || (!running && beatN >= SONG_BEATS - 1 && won)) return { x: HAND.C.x, y: HAND.C.y };
    var a = HAND[sideAt(beatN)], b = HAND[sideAt(beatN + 1)];
    var u = Math.min(1, beatT / spb());
    var arc = sideAt(beatN) === sideAt(beatN + 1) ? 230 : (beatN + 1 >= SONG_BEATS ? 260 : 320);
    return { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u - 30 - arc * 4 * u * (1 - u) };
  }

  // ---- 描画 ----
  function label(str, x, y, sz, col, align) {
    game.draw.text(str, x + 4, y + 4, { size: sz, color: INK, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: col || bandCol(y), bold: true, align: align || 'center' });
  }
  function dot(x, y, r, a) { game.draw.circle(x, y, r, bandCol(y), a); }

  function drawBack(t) {
    game.draw.gradient(0, H, [[0, STYLE.bg[0]], [0.5, STYLE.bg[1]], [1, STYLE.bg[0]]]);
    // セロハンの帯(ごく薄く色がのる)
    game.draw.rect(0, 0, W, BAND_TOP, RED, 0.07);
    game.draw.rect(0, BAND_TOP, W, BAND_RIDE - BAND_TOP, YEL, 0.06);
    game.draw.rect(0, BAND_RIDE, W, BAND_CROWD - BAND_RIDE, WHITE, 0.03);
    game.draw.rect(0, BAND_CROWD, W, H - BAND_CROWD, GRN, 0.06);
  }

  function drawRide(t) {
    // 回転木馬: 天幕の輪郭を電球の点で、柱と木馬が段のテンポで回る
    var spd = 0.6 + stageOf(beatN) * 0.45;
    var blink = warnT > 0 ? Math.floor(t * 16) % 2 : Math.floor(t * 4) % 2;
    var i, x, y;
    for (i = 0; i <= 24; i++) {
      x = 140 + i * 33.3; y = 420 - Math.sin(i / 24 * Math.PI) * 120;
      dot(x, y, (i + blink) % 2 ? 9 : 5);
    }
    for (i = 0; i <= 24; i++) { x = 140 + i * 33.3; dot(x, 470, (i + blink + 1) % 2 ? 7 : 4); }
    for (i = 0; i < 12; i++) dot(540 + (i - 6) * 8, 290 - Math.abs(i - 6) * 3, 6);
    dot(540, 268, 12);
    var cnt = 6;
    for (i = 0; i < cnt; i++) {
      var a = t * spd + i / cnt * Math.PI * 2;
      var cx = 540 + Math.sin(a) * 380, depth = Math.cos(a);
      if (depth < -0.2) continue;
      var bob = Math.sin(t * 3 * spd + i) * 18;
      game.draw.line(cx, 474, cx, 660, YEL, 3);
      game.draw.sprite(HORSE[Math.floor(t * 4 * spd + i) % 2], { '#': YEL }, cx, 580 + bob, 6 + depth * 2, { anchor: 'center', flipX: Math.sin(a + 0.5) < 0, alpha: 0.5 + depth * 0.5 });
    }
    game.draw.rect(120, 662, 840, 8, YEL);
  }

  function drawStage(t) {
    // 舞台の床(白い点線) と 芸人
    for (var i = 0; i < 18; i++) dot(80 + i * 54, 1290, 4);
    var shake = hitStop > 0 ? Math.sin(t * 70) * 8 : 0;
    var spr = hitStop > 0 ? CLOWN_OOPS : (bumpT.L > 0 || bumpT.R > 0 ? CLOWN_JOY : CLOWN);
    var bob = Math.abs(Math.sin(t * 5)) * 6;
    var cx = 540 + shake, cy = 1130 - bob;
    // 腕(肩 → 手)。弾いた手は持ち上がる
    var lh = { x: HAND.L.x, y: HAND.L.y - (bumpT.L > 0 ? 40 : 0) }, rh = { x: HAND.R.x, y: HAND.R.y - (bumpT.R > 0 ? 40 : 0) };
    game.draw.line(cx - 90, cy + 50, lh.x, lh.y + 20, WHITE, 16);
    game.draw.line(cx + 90, cy + 50, rh.x, rh.y + 20, WHITE, 16);
    game.draw.sprite(spr, { '#': WHITE }, cx, cy, 14, { anchor: 'center' });
    game.draw.circle(cx, cy - 7, 14, RED);      // 赤い鼻
    // 手(白い手袋)。次に球が落ちる側は点滅で光る
    var next = running && beatN + 1 >= FIRST && beatN + 1 <= LASTB ? sideAt(beatN + 1) : '';
    var glow = Math.floor(t * 10) % 2 === 0;
    var sides = ['L', 'R'];
    for (var s = 0; s < 2; s++) {
      var hp = sides[s] === 'L' ? lh : rh;
      if (sides[s] === next) game.draw.circle(hp.x, hp.y, glow ? 62 : 52, WHITE, 0.25);
      game.draw.circle(hp.x, hp.y + 20, 30, WHITE);
      game.draw.circle(hp.x, hp.y + 20, 18, GREY);
    }
    // 倍率(歓声メーター)を芸人の頭上に
    if (mult > 1) label('x' + mult, cx, 800 - (bumpT.L > 0 || bumpT.R > 0 ? 10 : 0), 60 + mult * 4, mult >= MULT_MAX ? YEL : WHITE);
  }

  function drawBall(t) {
    var p = hitStop > 0 && missAt && !missAt.side ? { x: missAt.x, y: missAt.y } : ballPos();
    var r = 30;
    if (hitStop > 0 && missAt && !missAt.side) {
      var g = 1 + (1 - hitStop / HIT_STOP) * 0.6;
      game.draw.circle(p.x, p.y, r * 2.6 * g, WHITE, 0.6 * hitStop / HIT_STOP);
      r *= 1.4;
    }
    game.draw.circle(p.x, p.y, r * 2, bandCol(p.y), 0.15 + mult * 0.03);
    game.draw.circle(p.x, p.y, r, bandCol(p.y));
    game.draw.circle(p.x - 9, p.y - 9, 8, INK);
  }

  function drawCrowd(t) {
    // 客席: 倍率が上がるほど立ち上がり、手を振る
    var rows = 3;
    for (var r = 0; r < rows; r++) {
      var stand = Math.min(1, Math.max(0, (mult - 1 - r * 2) / 2));
      for (var i = 0; i < 9; i++) {
        var x = 80 + i * 115 + (r % 2) * 55, base = 1410 + r * 52;
        var hop = stand > 0 ? Math.abs(Math.sin(t * 8 + i + r)) * 16 * stand : 0;
        var y = base - stand * 24 - hop;
        game.draw.sprite(HEAD, { '#': GRN }, x, y, 9, { anchor: 'center', alpha: 0.55 + r * 0.15 });
        if (stand > 0.5) {
          var wave = Math.sin(t * 9 + i) * 14;
          game.draw.line(x - 16, y + 10, x - 30 + wave, y - 40, GRN, 5);
          game.draw.line(x + 16, y + 10, x + 30 + wave, y - 40, GRN, 5);
        }
      }
    }
    // 押し場所(左右)。次に球が落ちる側の円が点滅
    var next = running && beatN + 1 >= FIRST && beatN + 1 <= LASTB ? sideAt(beatN + 1) : '';
    var sides = ['L', 'R'];
    for (var s = 0; s < 2; s++) {
      var pd = PAD[sides[s]], lit = sides[s] === next, pr = padT[sides[s]] > 0;
      var rad = pr ? 150 : 165;
      for (var k = 0; k < 28; k++) {
        var a = k / 28 * Math.PI * 2 + t * (lit ? 1.5 : 0.3);
        dot(pd.x + Math.cos(a) * rad, pd.y + Math.sin(a) * rad * 0.55, lit ? 9 : 5);
      }
      if (lit || pr) game.draw.circle(pd.x, pd.y, 120, GRN, pr ? 0.45 : 0.18);
      game.draw.circle(pd.x, pd.y, 30, GRN, lit ? 1 : 0.4);
      if (hitStop > 0 && missAt && missAt.side === sides[s]) game.draw.circle(pd.x, pd.y, 140, WHITE, 0.5);
    }
  }

  function drawScene(t) {
    drawBack(t);
    drawRide(t);
    drawStage(t);
    drawBall(t);
    drawCrowd(t);
    if (rollT > 0) game.draw.rect(0, BAND_RIDE - 10, W, 10, YEL, rollT * 2);
    for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, INK, 0.22);
  }

  function drawHud() {
    game.draw.rect(0, 0, W, BAND_TOP, INK, 0.7);
    label('SCORE ' + score, 56, 92, 52, RED, 'left');
    label('BEST ' + prevBest, 56, 162, 32, RED, 'left');
    label('x' + mult, W / 2 + 80, 120, 80, mult >= MULT_MAX ? YEL : RED);
    var done = Math.max(0, Math.min(SIDES.length, beatN - FIRST + 1));
    label(done + ' / ' + SIDES.length, W - 56, 92, 46, RED, 'right');
    for (var m = 0; m < MISS_MAX; m++) game.draw.circle(W - 210 + m * 50, 160, 14, m < misses ? RED : GREY);
    // テンポの段(▶の数)
    var st = running ? stageOf(beatN) : 0;
    for (var i = 0; i <= st; i++) {
      var x = W / 2 - 160 + i * 36;
      game.draw.line(x, 190, x + 22, 204, RED, 6);
      game.draw.line(x + 22, 204, x, 218, RED, 6);
    }
    var progress = Math.min(1, now / BT[SONG_BEATS]);
    game.draw.rect(0, BAND_TOP - 8, W * progress, 8, RED);
  }

  // ---- ATTRACT: 実ロジックで 光った側を拍どおりに弾いて倍率を上げる → 反対側を押してMISS(倍率が戻る) → テンポが上がっても続ける ----
  var DEMO_TAPS = [[4, 'L', 0], [5, 'R', 0.02], [6, 'L', -0.01], [7, 'R', 0], [8, 'L', 0.06], [9, 'R', 0], [10, 'R', 0], [11, 'R', 0.01], [12, 'L', 0], [13, 'R', -0.02]];
  var DEMO_BEATS = 14;
  var demo = { t: 0, i: 0, pressT: 0, side: 'R' };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % BT[DEMO_BEATS];
    if (cyc < dt || demo.t <= dt) { initGame(true); demo.i = 0; }
    stepPlay(dt);
    if (demo.i < DEMO_TAPS.length) {
      var dtp = DEMO_TAPS[demo.i];
      demo.side = dtp[1];
      if (now >= BT[dtp[0]] + dtp[2]) { demo.i++; demo.pressT = 0.16; bump(dtp[1]); }
    }
    if (demo.pressT > 0) demo.pressT -= dt;
  }

  game.onUpdate(function (dt) {
    var t = game.time.elapsed;
    if (hitStop > 0) hitStop -= dt;
    if (lampT > 0) lampT -= dt * 4;
    if (warnT > 0) warnT -= dt;
    if (rollT > 0) rollT -= dt;
    bumpT.L -= dt; bumpT.R -= dt; padT.L -= dt; padT.R -= dt;

    if (state === S.ATTRACT) {
      stepDemo(dt);
      drawScene(t);
      var pd = PAD[demo.side], near = demo.pressT > 0;
      game.draw.hand(pd.x, near ? pd.y : pd.y - 40 + Math.sin(t * 4) * 10, { press: near, scale: 15 });
      game.draw.rect(0, 0, W, BAND_TOP, INK, 0.75);
      label(GAME_TITLE, W / 2, 112, 84 + Math.sin(t * 3) * 3, RED);
      label('HI-SCORE ' + (game.best > 0 ? game.best : 0), W / 2, 190, 34, RED);
      if (Math.floor(t * 2) % 2 === 0) label('► 100円 投入 ◄', W / 2, H * 0.955, 46, GRN);
      else label('INSERT COIN', W / 2, H * 0.955, 42, WHITE);
      return;
    }

    if (state === S.RESULT) {
      drawScene(t);
      drawHud();
      game.draw.rect(90, H * 0.4, W - 180, H * 0.27, INK, 0.88);
      label(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.455, 100, won ? YEL : RED);
      label('SCORE ' + score, W / 2, H * 0.51, 60, WHITE);
      label('PERFECT ' + perfects + '  GOOD ' + goods + '  MISS ' + misses, W / 2, H * 0.55, 34, WHITE);
      label('COMBO x' + maxMult, W / 2, H * 0.585, 40, YEL);
      if (won && score > prevBest) label('NEW RECORD', W / 2, H * 0.63, 54, GRN);
      else label('BEST ' + Math.max(prevBest, won ? score : 0), W / 2, H * 0.63, 42, GRN);
      if (!won) label('あと' + Math.max(1, SIDES.length - (beatN - FIRST)) + '回!', W / 2, H * 0.37, 52, YEL);
      if (Math.floor(t * 2) % 2 === 0) label('TAP TO CONTINUE', W / 2, H * 0.955, 40, GRN);
      return;
    }

    // ---- PLAYING ----
    if (over) {
      outroT -= dt;
      if (outroT <= 0) {
        state = S.RESULT;
        var stats = { score: score, maxMult: maxMult, hits: hits, total: SIDES.length, perfect: perfects, good: goods, miss: misses };
        if (won) game.end.success(score, stats);
        else game.end.failure(stats);
      }
    } else if (readyT > 0) {
      readyT -= dt;
      if (readyT <= 0) startClock();
    } else {
      stepPlay(dt);
      if (!over && now > TIME_LIMIT) finish(misses < MISS_MAX);
    }

    drawScene(t);
    drawHud();
    if (readyT > 0) label(readyT > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.4, 110, WHITE);
    if (over && won) label('FINISH', W / 2, H * 0.4, 100, YEL);
  });

  game.onStart(function () {
    state = S.ATTRACT;
    initGame(true);
  });
})(game);
