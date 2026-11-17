// K-GBA-0005v2-riverbank-sandlot-swing.js
// 河川敷スイング — 拍子木の跳ねるリズムで投げられる緩い球の落下点を読み、弾んだ直後の拍の頭で打ち返す
// 操作: 画面を左・中・右の3列に分けた打席のうち、球が弾む列を押すとそこへ踏み込んで振る(押した瞬間で判定)。球は拍の頭で投げられ、跳ねる8分の裏で地面に弾み、次の拍の頭で打点に来る。打席違い・拍外れ・見送りはMISS、球が無い時の空振りは罰なし。後半の球は終盤で列へ曲がり、落下点の印は弾む0.65秒前まで出ない
// 終わり: 7小節(約16秒・10球)を投げ切ればCLEAR。MISSが3つでGAME OVER
// @mechanic: trajectory
// @theme: riverbank_sandlot_swing
// 世界観: 夕暮れの河川敷の草野球で、補欠の打者が拍子木の跳ねる拍に乗って投げられる緩い球の落下点を読み、弾んだ直後の拍の頭で打ち返す
// 残るもの: 正誤(CLEAR/GAME OVER) + 打ち返した数・PERFECT数・最大コンボ・スコア
// スタイル: 8bit HOME
(function (game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 8bit HOME: 3〜4色+黒、8x8ドットのタイル反復背景、階段状の輪郭
  var STYLE = { bg: ['#fc9838', '#a83860'], main: ['#38a038', '#c87830', '#2038a8'], accent: ['#f83800', '#fcfcfc'] };
  var SKY1 = STYLE.bg[0], SKY2 = STYLE.bg[1], GRASS = STYLE.main[0], DIRT = STYLE.main[1], RIVER = STYLE.main[2];
  var RED = STYLE.accent[0], WHITE = STYLE.accent[1];
  var BLACK = '#000000', GRASS_D = '#186818', YEL = '#f8d878', SKIN = '#fcb8a0', NAVY = '#0828a0', DIRT_D = '#884010', DUSK = '#580848';

  var GAME_TITLE = 'SANDLOT SWING';
  var BPM = 108;
  var SPB = 60 / BPM;
  var SWING = 2 / 3;             // 跳ねる8分: 裏は拍の2/3の位置
  var BARS = 7;                  // 1小節目は拍子木のカウント
  var TIME_LIMIT = BARS * 4 * SPB;
  var PERF = 0.07, GOODW = 0.14, EDGE = 0.22;
  var LIVES = 3;
  var LANES = [W * 0.2, W * 0.5, W * 0.8];
  var PITCH_X = W * 0.5, PITCH_Y = H * 0.34;
  var BOUNCE_Y = H * 0.6, HIT_Y = H * 0.69, BAT_Y = H * 0.755;
  var BOX_Y = H * 0.875, BOX_W = 300, BOX_H = 210;
  // [投げる拍, 飛ぶ拍数, 列, 1=印を最初から出す / 0=終盤で曲がり印は遅れて出る, (デモ)ゴーストが振る列]
  var CHART = [
    [4, 2, 1, 1], [8, 2, 0, 1], [11, 2, 2, 1], [14, 2, 1, 0], [16, 2, 0, 0],
    [18, 3, 2, 0], [20, 2, 1, 0], [22, 2, 0, 0], [23, 2, 2, 0], [25, 2, 1, 0]
  ];
  var DEMO_CHART = [[4, 2, 0, 1, 0], [7, 2, 2, 1, 2], [10, 2, 1, 0, 0]];
  var DEMO_BEATS = 14;

  // 跳ねる8分の伴奏(独自の旋律)。1小節=4拍、長短=2/3+1/3
  var L = 2 / 3, U = 1 / 3;
  var PHRASES = [
    [['E5', L], ['G5', U], ['A5', L], ['G5', U], ['E5', L], ['D5', U], ['C5', 1]],
    [['D5', L], ['E5', U], ['G5', 1], ['E5', L], ['D5', U], ['C5', 1]],
    [['A5', L], ['G5', U], ['E5', L], ['G5', U], ['A5', 1], ['C6', 1]],
    [['G5', L], ['E5', U], ['D5', L], ['C5', U], ['D5', 1], ['R', 1]]
  ];
  var BASSES = [
    [['C3', L], ['C3', U], ['G2', L], ['G2', U], ['A2', L], ['A2', U], ['G2', 1]],
    [['F2', L], ['F2', U], ['C3', L], ['C3', U], ['G2', L], ['G2', U], ['C3', 1]],
    [['A2', L], ['A2', U], ['E2', L], ['E2', U], ['F2', L], ['F2', U], ['G2', 1]],
    [['C3', L], ['C3', U], ['G2', L], ['G2', U], ['C3', 1], ['G2', 1]]
  ];

  var BATTER = [
    ['...cccc...', '..cccccc..', '..cccccccc', '..sksks...', '..sssss...', '...wwwbb..', '..wwwwbb..', '..wwwwb...', '..wwwww...', '..nnnnn...', '..nn.nn...', '..nn.nn...', '.kkk.kkk..'],
    ['...cccc...', '..cccccc..', '..cccccccc', '..sksks...', '..sssss...', '..wwwww...', 'bbbbbwwww.', '..wwwww...', '..wwwww...', '..nnnnn...', '.nn...nn..', '.nn...nn..', 'kkk...kkk.']
  ];
  var BAT_PAL = { c: NAVY, s: SKIN, k: BLACK, w: WHITE, b: YEL, n: NAVY };
  var PITCHER = [
    ['....cc....', '...cccc...', '...ssss...', '...kssk...', '.s.ssss...', '.swwwwww..', '..wwwwwws.', '...wwww...', '...nnnn...', '...n..n...', '..nn..nn..', '..kk..kk..'],
    ['....cc....', '...cccc...', '...ssss...', '...kssk...', '...ssss...', '.wwwwwww..', 's.wwwwww..', '...wwwwws.', '...nnnn...', '..nn..n...', '.nn....nn.', '.kk....kk.']
  ];
  var PIT_PAL = { c: RED, s: SKIN, k: BLACK, w: WHITE, n: DIRT_D };
  var COACH = [
    ['.y......y.', '.y......y.', '.s......s.', '..s.hh.s..', '...hhhh...', '...ssss...', '...kssk...', '..rrrrrr..', '..rrrrrr..', '...rrrr...', '...n..n...', '..kk..kk..'],
    ['....yy....', '....yy....', '...ssss...', '...shhs...', '...hhhh...', '...ssss...', '...kssk...', '..rrrrrr..', '..rrrrrr..', '...rrrr...', '...n..n...', '..kk..kk..']
  ];
  var COACH_PAL = { y: YEL, s: SKIN, h: WHITE, k: BLACK, r: RED, n: NAVY };
  var MATE = [
    ['..cc..', '.cccc.', '.ssss.', '.wwww.', '.wwww.', '.n..n.'],
    ['s.cc.s', 's.cc.s', '.ssss.', '.wwww.', '.wwww.', 'n....n']
  ];
  var BALL = ['.ww.', 'wwww', 'wrww', '.ww.'];
  var BALL_PAL = { w: WHITE, r: RED };
  var BALL_FLASH = { w: WHITE, r: WHITE };
  var MARK = ['x...x', '.x.x.', '..x..', '.x.x.', 'x...x'];
  var PLATE = ['pppppp', 'pppppp', '.pppp.', '..pp..'];
  var GRASS_TILE = ['........', '..g.....', '.g.g....', '........', '.....g..', '....g.g.', '........', '........'];
  var WAVE_TILE = ['........', '.ww.....', 'w..w....', '........'];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var run, readyT, halt, haltBall, over, won, endT, prevBest, sent, sparkT;
  var audioOk = false;

  function txt(s, x, y, sz, col, align) {
    game.draw.text(s, x + 4, y + 4, { size: sz, color: BLACK, bold: true, align: align || 'center' });
    game.draw.text(s, x, y, { size: sz, color: col, bold: true, align: align || 'center' });
  }

  function newRun(chart, demo) {
    var balls = [];
    for (var i = 0; i < chart.length; i++) {
      var c = chart[i];
      balls.push({
        tThrow: c[0] * SPB, tBounce: (c[0] + c[1] - 1 + SWING) * SPB, tHit: (c[0] + c[1]) * SPB,
        lane: c[2], early: c[3] === 1, ghost: c[4] !== undefined ? c[4] : c[2], arc: c[1] >= 3 ? 560 : 380,
        thrown: false, bounced: false, marked: c[3] === 1, res: '', freeze: 0, post: 0, fly: 0, fx: 0, fy: 0, side: 1, final: false
      });
    }
    return {
      demo: demo, balls: balls, songT: 0, lastBeat: -1, lastAnd: -1, lastBar: 0, beatK: -1,
      hits: 0, perfects: 0, goods: 0, misses: 0, combo: 0, maxCombo: 0, score: 0, milestone: false,
      batLane: 1, batX: LANES[1], swingT: 0, throwT: 0, clapT: 0, andT: 0, cheerT: 0
    };
  }

  function initGame() {
    run = newRun(CHART, false);
    readyT = 0.8; halt = 0; haltBall = null; over = false; won = false; endT = 0; sent = false; sparkT = 0;
    prevBest = game.best || 0;
  }

  // ── 拍クロックが鳴らす音(拍子木・跳ねる裏・小節ごとの伴奏) ──
  function playBar(bar) {
    var i = (bar - 1) % PHRASES.length;
    game.audio.melody(PHRASES[i], { tempo: BPM, wave: 'square', volume: 0.045, bass: BASSES[i], bassWave: 'triangle', bassVolume: 0.07 });
  }
  function onBeat(r, k, loud) {
    r.beatK = k; r.clapT = 0.12;
    if (!loud) return;
    game.audio.tone(k % 4 === 0 ? 1900 : 1500, 0.035, { wave: 'square', volume: k % 4 === 0 ? 0.07 : 0.045 });
    if (k < 4) game.audio.tone(k === 3 ? 'C5' : 'G4', 0.12, { wave: 'triangle', volume: 0.08 });
  }
  function onAnd(r, loud) {
    r.andT = 0.12;
    if (loud) game.audio.tone(1150, 0.025, { wave: 'square', volume: 0.03 });
  }

  function ballPos(b, t) {
    var lx = LANES[b.lane];
    if (t < b.tBounce) {
      var p = Math.max(0, (t - b.tThrow) / (b.tBounce - b.tThrow));
      var e = b.early ? p : p * p;
      return { x: PITCH_X + (lx - PITCH_X) * e, y: PITCH_Y - 40 + (BOUNCE_Y - PITCH_Y + 40) * p - Math.sin(p * Math.PI) * b.arc, gy: PITCH_Y + (BOUNCE_Y - PITCH_Y) * p, s: 0.4 + 0.6 * p };
    }
    var q = (t - b.tBounce) / (b.tHit - b.tBounce);
    return { x: lx, y: BOUNCE_Y + (HIT_Y - BOUNCE_Y) * q - Math.sin(Math.min(1, q) * Math.PI) * 60, gy: BOUNCE_Y + (HIT_Y - BOUNCE_Y) * q, s: 1 };
  }

  function stepRun(r, dt, loud) {
    r.songT += dt;
    var t = r.songT;
    var k = Math.floor(t / SPB);
    if (k > r.lastBeat) { r.lastBeat = k; onBeat(r, k, loud); }
    var ka = Math.floor(t / SPB - SWING);
    if (ka > r.lastAnd) { r.lastAnd = ka; onAnd(r, loud); }
    var nb = Math.floor((t + 0.06) / (4 * SPB));
    if (nb > r.lastBar) { r.lastBar = nb; if (loud && nb < BARS) playBar(nb); }
    for (var i = 0; i < r.balls.length; i++) {
      var b = r.balls[i];
      if (!b.thrown && t >= b.tThrow) {
        b.thrown = true; r.throwT = 0.25;
        if (loud) game.audio.tone(420, 0.09, { wave: 'triangle', volume: 0.06, slide: 260 });
      }
      if (!b.marked && t >= b.tBounce - 0.65) {
        b.marked = true;
        if (loud) game.audio.tone(2200, 0.05, { wave: 'square', volume: 0.035 });
      }
      if (!b.bounced && t >= b.tBounce && b.res === '') {
        b.bounced = true;
        game.fx.burst(LANES[b.lane], BOUNCE_Y + 10, { color: DIRT, count: 5, speed: 120 });
        if (loud) game.audio.tone(180, 0.06, { wave: 'triangle', volume: 0.09 });
      }
      if (b.res === '' && b.thrown && t > b.tHit + EDGE) missBall(r, b, loud);
      if (b.res === 'miss') {
        if (b.freeze > 0 && !b.final) {
          b.freeze -= dt;
          if (b.freeze <= 0) game.feedback.bad(b.fx, b.fy, { text: 'MISS', volume: loud ? 0.4 : 0, shake: 8 });
        } else if (b.freeze <= 0) b.post += dt;
      }
      if (b.res === 'hit') b.fly += dt;
    }
    if (r.swingT > 0) r.swingT -= dt;
    if (r.throwT > 0) r.throwT -= dt;
    if (r.clapT > 0) r.clapT -= dt;
    if (r.andT > 0) r.andT -= dt;
    if (r.cheerT > 0) r.cheerT -= dt;
    r.batX += (LANES[r.batLane] - r.batX) * Math.min(1, dt * 28);
  }

  function nearestBall(r) {
    var best = null, bd = 99;
    for (var i = 0; i < r.balls.length; i++) {
      var b = r.balls[i];
      if (b.res !== '' || !b.thrown) continue;
      var d = Math.abs(r.songT - b.tHit);
      if (d <= EDGE && d < bd) { bd = d; best = b; }
    }
    return best;
  }

  function swing(r, lane, loud) {
    r.batLane = lane; r.swingT = 0.22;
    var b = nearestBall(r);
    if (!b) {
      // 球が来ていない時の空振り(罰なし・音と土ぼこりだけ)
      if (loud) game.audio.tone(260, 0.06, { wave: 'triangle', volume: 0.06, slide: -80 });
      game.fx.burst(LANES[lane], HIT_Y + 50, { color: DIRT, count: 4, speed: 110 });
      return;
    }
    var d = r.songT - b.tHit, ad = Math.abs(d);
    if (b.lane !== lane || ad > GOODW) { missBall(r, b, loud); return; }
    var perfect = ad <= PERF;
    b.res = 'hit'; b.fly = 0; b.side = lane === 0 ? -1 : lane === 2 ? 1 : (d < 0 ? -0.5 : 0.5);
    r.hits++; r.combo++; r.maxCombo = Math.max(r.maxCombo, r.combo); r.cheerT = 0.6;
    if (perfect) r.perfects++; else r.goods++;
    r.score += (perfect ? 300 : 150) + r.combo * 20;
    game.feedback.good(LANES[lane], HIT_Y, { text: perfect ? 'PERFECT' : 'GOOD', color: perfect ? YEL : WHITE, count: perfect ? 16 : 10, volume: loud ? 0.4 : 0 });
    if (loud) game.audio.tone(perfect ? 1320 : 990, 0.07, { wave: 'square', volume: 0.07 });
    if (r.hits === 5 && !r.milestone) {
      r.milestone = true;
      game.fx.popup('NICE 5', W / 2, H * 0.47, { color: YEL, size: 80 });
      if (loud) game.audio.play('se_milestone', 0.45);
    }
  }

  function missBall(r, b, loud) {
    if (b.res !== '') return;
    var p = ballPos(b, r.songT);
    b.res = 'miss'; b.freeze = 0.35; b.post = 0; b.fx = p.x; b.fy = p.y;
    r.misses++; r.combo = 0;
    if (loud) game.audio.tone(140, 0.12, { wave: 'sawtooth', volume: 0.08 });
    if (!r.demo && r.misses >= LIVES) { b.final = true; halt = 0.45; haltBall = b; }
  }

  function finish(ok) {
    if (over) return;
    over = true; won = ok; endT = 1.4;
    if (ok) run.score += (LIVES - run.misses) * 200;
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.55);
  }

  function sendEnd() {
    if (sent) return;
    sent = true;
    var stats = { hits: run.hits, total: CHART.length, perfect: run.perfects, good: run.goods, miss: run.misses, maxCombo: run.maxCombo };
    if (won) game.end.success(run.score, stats);
    else game.end.failure(stats);
  }

  // ── 入力: 押した瞬間で判定(列は画面の左・中・右) ──
  game.onPress(function (x, y) {
    audioOk = true;
    if (state !== S.PLAYING) return;
    if (over || halt > 0 || readyT > 0) { game.audio.tone(330, 0.03, { wave: 'square', volume: 0.03 }); return; }
    var lane = x < W / 3 ? 0 : x < W * 2 / 3 ? 1 : 2;
    game.fx.burst(LANES[lane], BOX_Y - 60, { color: WHITE, count: 3, speed: 80 });
    swing(run, lane, true);
  });

  game.onTap(function () {
    audioOk = true;
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.5); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.3); state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });

  // ── ATTRACT: 本物の拍クロックで3球。2球は読みどおりに打ち、3球目は曲がりを読み違えてMISS ──
  var demo = { t: 0, run: null, hx: W / 2, hy: H * 0.93, press: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % (DEMO_BEATS * SPB);
    if (cyc < dt || demo.t <= dt || !demo.run) demo.run = newRun(DEMO_CHART, true);
    var r = demo.run;
    stepRun(r, dt, audioOk);
    var next = null;
    for (var i = 0; i < r.balls.length; i++) if (r.balls[i].res === '') { next = r.balls[i]; break; }
    var tx = W / 2 + Math.sin(game.time.elapsed * 2) * 30, ty = H * 0.93;
    if (next && next.thrown && (next.early || next.marked)) {
      tx = LANES[next.ghost]; ty = BOX_Y;
      if (r.songT >= next.tHit) { swing(r, next.ghost, audioOk); demo.press = 0.16; }
    }
    demo.hx += (tx - demo.hx) * Math.min(1, dt * 9);
    demo.hy += (ty - demo.hy) * Math.min(1, dt * 9);
    if (demo.press > 0) demo.press -= dt;
  }

  // ── 描画 ──
  function drawWorld(r) {
    var tt = game.time.elapsed;
    // 夕焼けの空・沈む日・対岸と鉄橋
    game.draw.gradient(0, H * 0.2, [[0, DUSK], [0.5, SKY2], [1, SKY1]]);
    game.draw.circle(W * 0.72, H * 0.175, 118, SKY1, 0.6);
    game.draw.circle(W * 0.72, H * 0.175, 96, YEL);
    game.draw.rect(0, H * 0.165, W, H * 0.03, DUSK);
    for (var p = 0; p < W; p += 96) game.draw.rect(p, H * 0.145, 12, H * 0.03, DUSK);
    game.draw.rect(0, H * 0.143, W, 14, DUSK);
    // 川(タイルの波が流れる)
    game.draw.rect(0, H * 0.195, W, H * 0.055, RIVER);
    var off = Math.floor((tt * 40) % 64);
    for (var wy = 0; wy < 3; wy++) for (var wx = -64; wx < W; wx += 64) game.draw.sprite(WAVE_TILE, { w: WHITE }, wx + off + wy * 21, H * 0.2 + wy * 34, 8, { anchor: 'topleft', alpha: 0.6 });
    // 土手と草(8x8タイル反復)
    game.draw.rect(0, H * 0.25, W, H * 0.75, GRASS);
    for (var gy = H * 0.25; gy < H; gy += 64) for (var gx = ((gy / 64) % 2) * 64; gx < W; gx += 128) game.draw.sprite(GRASS_TILE, { g: GRASS_D }, gx, gy, 8, { anchor: 'topleft' });
    // マウンド(階段状の円)
    for (var m = 0; m < 6; m++) { var mw = [80, 120, 140, 140, 120, 80][m]; game.draw.rect(PITCH_X - mw, PITCH_Y + 10 + m * 16, mw * 2, 16, DIRT); }
    // 打席側の土(階段状の縁)
    for (var s = 0; s < 4; s++) game.draw.rect(s * 32, H * 0.655 + s * 16, W - s * 64, H * 0.14 - s * 16, DIRT);
    game.draw.rect(0, H * 0.655, W, 8, DIRT_D);
    // 3列の白線(打席の区切り)
    for (var c = 1; c < 3; c++) for (var dy = H * 0.56; dy < H * 0.79; dy += 48) game.draw.rect(W * c / 3 - 4, dy, 8, 26, WHITE, 0.7);
    // 打点の輪: 拍の頭で光る
    var pulse = r ? Math.max(0, r.clapT / 0.12) : 0;
    for (var l = 0; l < 3; l++) {
      game.draw.circle(LANES[l], HIT_Y, 52 + pulse * 14, WHITE, 0.25 + 0.35 * pulse);
      game.draw.circle(LANES[l], HIT_Y, 40, DIRT);
    }
    if (!r) return;
    // 拍子木の監督(拍で打ち合わせる)と、ベンチの仲間
    game.draw.sprite(COACH[r.clapT > 0 ? 1 : 0], COACH_PAL, W * 0.11, H * 0.31, 10, { anchor: 'center' });
    var hop = r.cheerT > 0 ? Math.abs(Math.sin(tt * 14)) * 24 : Math.sin(tt * 3) * 4;
    game.draw.sprite(MATE[r.cheerT > 0 ? 1 : 0], { c: NAVY, s: SKIN, w: WHITE, n: NAVY }, W * 0.88, H * 0.315 - hop, 10, { anchor: 'center' });
    game.draw.sprite(MATE[r.cheerT > 0 ? 1 : 0], { c: NAVY, s: SKIN, w: WHITE, n: NAVY }, W * 0.95, H * 0.32 - hop * 0.7, 9, { anchor: 'center', flipX: true });
    game.draw.sprite(PITCHER[r.throwT > 0 ? 1 : 0], PIT_PAL, PITCH_X, PITCH_Y - 30, 10, { anchor: 'center' });
    // 落下点の印・影・球
    for (var i = 0; i < r.balls.length; i++) {
      var b = r.balls[i];
      if (!b.thrown) continue;
      if (b.res === '' && !b.bounced && b.marked) {
        var blink = b.early || Math.floor(tt * 10) % 2 === 0;
        if (blink) game.draw.sprite(MARK, { x: RED }, LANES[b.lane], BOUNCE_Y, 10, { anchor: 'center' });
      }
      if (b.res === '') {
        var bp = ballPos(b, r.songT);
        game.draw.rect(bp.x - 18 * bp.s, bp.gy - 5, 36 * bp.s, 10, BLACK, 0.35);
        game.draw.sprite(BALL, BALL_PAL, bp.x, bp.y, Math.round(4 + 4 * bp.s), { anchor: 'center' });
      } else if (b.res === 'hit' && b.fly < 1.1) {
        var fx = LANES[b.lane] + b.side * b.fly * 700, fy = HIT_Y - b.fly * 1500 + b.fly * b.fly * 700;
        game.draw.sprite(BALL, BALL_PAL, fx, fy, Math.max(3, Math.round(8 - b.fly * 4)), { anchor: 'center' });
      } else if (b.res === 'miss') {
        if (b.freeze > 0) {
          game.draw.circle(b.fx, b.fy, 50, WHITE, 0.5);
          game.draw.sprite(BALL, BALL_FLASH, b.fx, b.fy, 12, { anchor: 'center' });
        } else if (b.post < 0.6) {
          game.draw.sprite(BALL, BALL_PAL, b.fx + b.post * 120, b.fy + b.post * 420, 7, { anchor: 'center', alpha: 1 - b.post / 0.6 });
        }
      }
    }
    // 打者
    game.draw.sprite(BATTER[r.swingT > 0 ? 1 : 0], BAT_PAL, r.batX, BAT_Y, 10, { anchor: 'center' });
    if (r.swingT > 0) game.draw.line(r.batX - 20, BAT_Y - 10, r.batX - 150, HIT_Y + 10, YEL, 14);
    // 打席の箱(親指ゾーン)
    for (var j = 0; j < 3; j++) {
      var bx = LANES[j], on = r.swingT > 0 && r.batLane === j;
      game.draw.rect(bx - BOX_W / 2, BOX_Y - BOX_H / 2, BOX_W, BOX_H, on ? YEL : BLACK, on ? 0.35 : 0.18);
      game.draw.rect(bx - BOX_W / 2, BOX_Y - BOX_H / 2, BOX_W, 8, WHITE);
      game.draw.rect(bx - BOX_W / 2, BOX_Y + BOX_H / 2 - 8, BOX_W, 8, WHITE);
      game.draw.rect(bx - BOX_W / 2, BOX_Y - BOX_H / 2, 8, BOX_H, WHITE);
      game.draw.rect(bx + BOX_W / 2 - 8, BOX_Y - BOX_H / 2, 8, BOX_H, WHITE);
      game.draw.sprite(PLATE, { p: WHITE }, bx, BOX_Y, 14, { anchor: 'center' });
    }
  }

  function drawHud(r) {
    game.draw.rect(0, 0, W, H * 0.118, BLACK, 0.45);
    txt(String(r.score), 40, 64, 52, WHITE, 'left');
    for (var i = 0; i < LIVES; i++) {
      var lx = W - 70 - i * 74;
      game.draw.sprite(BALL, BALL_PAL, lx, 64, 12, { anchor: 'center', alpha: i < LIVES - r.misses ? 1 : 0.25 });
      if (i >= LIVES - r.misses) game.draw.sprite(MARK, { x: RED }, lx, 64, 9, { anchor: 'center' });
    }
    // 拍の見える化: 4つの拍ランプ + 跳ねる裏の小ランプ(拍の2/3の位置)
    var x0 = W * 0.17, gap = W * 0.2, y = H * 0.088;
    var bk = r.beatK >= 0 ? r.beatK % 4 : -1;
    for (var k = 0; k < 4; k++) {
      var x = x0 + k * gap, on = k === bk && r.clapT > 0;
      game.draw.rect(x - 28, y - 28, 56, 56, BLACK);
      game.draw.rect(x - 22, y - 22, 44, 44, on ? (k === 0 ? RED : YEL) : k === bk ? DIRT_D : DUSK);
      var ax = x + gap * SWING;
      game.draw.rect(ax - 11, y - 11, 22, 22, BLACK);
      game.draw.rect(ax - 7, y - 7, 14, 14, k === bk && r.andT > 0 ? WHITE : DUSK);
    }
    txt(r.hits + ' / ' + r.balls.length, W * 0.5, 64, 40, YEL);
    if (r.combo >= 2) txt('x' + r.combo, r.batX + 120, BAT_Y - 90, 44, YEL);
  }

  function drawResult() {
    if (state !== S.RESULT) {
      txt(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.45, 110, won ? YEL : RED);
      return;
    }
    game.draw.rect(70, H * 0.2, W - 140, H * 0.36, BLACK, 0.8);
    game.draw.rect(70, H * 0.2, W - 140, 10, won ? YEL : RED);
    txt(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.25, 100, won ? YEL : RED);
    txt(run.hits + ' / ' + CHART.length, W / 2, H * 0.315, 64, WHITE);
    txt('SCORE ' + run.score, W / 2, H * 0.37, 52, WHITE);
    txt('PERFECT ' + run.perfects + '   COMBO ' + run.maxCombo, W / 2, H * 0.415, 38, YEL);
    if (won && run.score > prevBest) txt('NEW RECORD', W / 2, H * 0.465, 56, YEL);
    else txt('BEST ' + Math.max(prevBest, game.best || 0), W / 2, H * 0.465, 44, WHITE);
    if (!won) {
      var left = 0;
      for (var i = 0; i < run.balls.length; i++) if (run.balls[i].res === '') left++;
      txt('あと' + left + '球!', W / 2, H * 0.52, 50, YEL);
    }
    if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.965, 44, WHITE);
  }

  game.onUpdate(function (dt) {
    if (state === S.ATTRACT) {
      stepDemo(dt);
      drawWorld(demo.run);
      drawHud(demo.run);
      game.draw.hand(demo.hx, demo.hy, { press: demo.press > 0, scale: 16 });
      game.draw.rect(0, H * 0.125, W, 170, BLACK, 0.5);
      txt(GAME_TITLE, W / 2, H * 0.155, 96, YEL);
      txt('HI-SCORE ' + (game.best || 0), W / 2, H * 0.198, 40, WHITE);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.965, 46, YEL);
      else txt('TAP TO START', W / 2, H * 0.965, 44, WHITE);
      return;
    }

    if (state === S.PLAYING) {
      if (over) {
        endT -= dt;
        if (won) {
          sparkT -= dt;
          if (sparkT <= 0) { sparkT = 0.2; game.fx.burst(game.random(120, W - 120), game.random(H * 0.25, H * 0.5), { color: [YEL, WHITE, RED][Math.floor(game.random(0, 3))], count: 14, speed: 320 }); }
        }
        if (endT <= 0) { state = S.RESULT; sendEnd(); }
      } else if (halt > 0) {
        halt -= dt;
        if (halt <= 0) {
          game.feedback.bad(haltBall.fx, haltBall.fy, { text: 'MISS' });
          haltBall.freeze = 0;
          finish(false);
        }
      } else if (readyT > 0) {
        readyT -= dt;
        if (readyT <= 0) game.audio.play('se_jump', 0.3);
      } else {
        stepRun(run, dt, true);
        if (run.songT >= TIME_LIMIT + 0.4) finish(true);
      }
    }

    drawWorld(run);
    drawHud(run);
    if (state === S.PLAYING && readyT > 0) txt(readyT > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.47, 120, YEL);
    if (over || state === S.RESULT) drawResult();
  });

  game.onStart(function () {
    state = S.ATTRACT;
    initGame();
    demo.t = 0;
  });
})(game);
