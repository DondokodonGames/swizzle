// K-GBA-0029v3-lodge-whistle-turn.js
// 山の家の笛向き — 裏拍で足踏みする輪の中、先生の笛が鳴った瞬間に、輪の誰より早くその向きへ向き直る
// 操作: 画面下の真ん中の足パッドを裏拍(拍と拍の間)の頭ごとに押して足踏みする(ずれでPERFECT/GOOD)。先生が笛をくわえた1拍後の裏拍で笛が鳴り旗の向きのパッドが光るので、上下左右の光ったパッドを誰より早く押す。笛の前に向きを押す(フライング)・向き違い・他の子より遅い・押さないはMISS
// 終わり: 5回の笛を乗り切ればCLEAR(一番に向けた回数+反応の速さ+足踏みの点+残り命)。MISS3回でGAME OVER
// @mechanic: reaction_duel
// @theme: lodge_ring_whistle_turn
// 世界観: 林間学校の雨の日、山の家の板張りホールで輪になって裏拍の足踏みをする子どもたちの中、係の子が先生の笛に輪の誰より早くその向きへ向き直る
// 残るもの: 正誤(CLEAR/GAME OVER) + スコア・一番に向けた回数・最速の反応秒・足踏みのPERFECT/GOOD/MISS数
// スタイル: HYPERCASUAL 3D

(function(game) {
  var STYLE = { bg: ['#fbf8f2', '#efe6d6'], main: ['#ff8a3d', '#8fb8de', '#d8c6a8'], accent: ['#ff4d6d', '#4a4440'] };
  var W = game.canvas.width;
  var H = game.canvas.height;

  // HYPERCASUAL 3D: 淡い背景に単色の丸い塊。真下に柔らかい影(半透明の楕円)。当たり判定は見た目どおりの円
  var C = {
    paper: STYLE.bg[0], floor: STYLE.bg[1], me: STYLE.main[0], kid: STYLE.main[1], wood: STYLE.main[2],
    hot: STYLE.accent[0], ink: STYLE.accent[1], white: '#ffffff', teach: '#6cc28a', plank: '#e2d4bc', rain: '#b9d2e6'
  };
  var KID_COL = [C.me, '#8fb8de', '#c7a2e0', '#f2c45a', '#7fcfc0', '#f29bb5'];

  var GAME_TITLE = 'WHISTLE TURN';
  var BPM = 110, SPB = 60 / BPM, BAR = SPB * 4;
  var PERFECT_W = 0.05, GOOD_W = 0.11;
  var REACT_PERFECT = 0.42, REACT_MAX = 0.95;
  var READY_T = 0.8;
  var TOTAL_BEATS = 24;
  var TIME_LIMIT = 13.1;                     // 24拍
  var LIVES = 3;
  // 笛は裏拍に鳴る(拍の位置)。後半ほど間が詰まる
  var WHISTLES = [5.5, 10.5, 14.5, 18.5, 21.5];
  var RIVAL_BEST = [0.68, 0.62, 0.57, 0.53, 0.5];   // 回ごとの輪で一番速い子の反応秒
  var SPREAD = [0, 0.05, 0.09, 0.14, 0.2];
  var DEMO_WHISTLES = [3.5, 7.5], DEMO_DIRS = [3, 1], DEMO_BEATS = 10;
  var DEMO_CYC = DEMO_BEATS * SPB + 0.4;
  var RING_X = W / 2, RING_Y = Math.round(H * 0.45), RX = 330, RY = 190;
  var ANG = [90, 30, -30, -90, -150, 150];
  var PAD_X = W / 2, PAD_Y = Math.round(H * 0.86), PAD_R = 105;
  var ARROW_R = 82, AOX = 245, AOY = 185;
  var DX = [0, 1, 0, -1], DY = [-1, 0, 1, 0];
  var BUBBLE_Y = Math.round(H * 0.155);

  // 伴奏(オリジナル): 表拍はベースだけ、和音の刻みと旋律は裏拍(足踏みと同じ位置)に置く
  var TUNE = [
    [['R', 0.5], ['D5', 0.5], ['R', 0.5], ['B4', 0.5], ['R', 0.5], ['D5', 0.5], ['R', 0.5], ['E5', 0.5]],
    [['R', 0.5], ['G5', 0.5], ['R', 0.5], ['E5', 0.5], ['R', 0.5], ['D5', 0.5], ['R', 0.5], ['B4', 0.5]],
    [['R', 0.5], ['C5', 0.5], ['R', 0.5], ['E5', 0.5], ['R', 0.5], ['G5', 0.5], ['R', 0.5], ['E5', 0.5]],
    [['R', 0.5], ['D5', 0.5], ['R', 0.5], ['F#5', 0.5], ['R', 0.5], ['A5', 0.5], ['R', 0.5], ['F#5', 0.5]]
  ];
  var BASS = [
    [['G2', 1], ['G2', 1], ['D3', 1], ['D3', 1]],
    [['E2', 1], ['E2', 1], ['B2', 1], ['B2', 1]],
    [['C3', 1], ['C3', 1], ['G2', 1], ['G2', 1]],
    [['D3', 1], ['D3', 1], ['A2', 1], ['A2', 1]]
  ];

  // ---- スプライト ----
  // 顔(目と口): ふつう / まばたき / 驚き(笛の瞬間)
  var FACE = [
    ['.k...k.', '.k...k.', '.......', '..rrr..'],
    ['.......', 'kk...kk', '.......', '..rrr..'],
    ['kk...kk', 'kk...kk', '...r...', '..r.r..', '...r...']
  ];
  var TUFT = ['..k.k..', '.k.k.k.', '..kkk..'];
  var FOOT = ['.##.', '####', '####', '####', '.##.', '.....', '.##.', '####', '.##.'];
  var ARROW = ['...#...', '..###..', '.#####.', '#######', '..###..', '..###..', '..###..'];
  var WHISTLE = ['..####.', '.#....#', '#######', '.####..'];
  function rotArt(a) {
    var out = [], h = a.length, w = a[0].length;
    for (var x = 0; x < w; x++) {
      var row = '';
      for (var y = h - 1; y >= 0; y--) row += a[y].charAt(x);
      out.push(row);
    }
    return out;
  }
  var ARROWS = [ARROW];
  for (var ai = 1; ai < 4; ai++) ARROWS.push(rotArt(ARROWS[ai - 1]));

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var clock, lastHalf, cuedBar, steps, duels, kids, lives, score, combo, maxCombo;
  var nP, nG, nM, wins, fastest, nearMiss, over, won, outroT, hitStop, demoMode, prevBest;
  var padFlash, stumble, myFace, myHop, curDuel, missFx, endBeats;
  var halfPulse = 0;

  function shuffle(a) {
    var b = a.slice();
    for (var i = b.length - 1; i > 0; i--) { var j = Math.min(i, Math.floor(game.random(0, i + 1))); var t = b[i]; b[i] = b[j]; b[j] = t; }
    return b;
  }

  function initRun(demo) {
    demoMode = !!demo;
    var ws = demoMode ? DEMO_WHISTLES : WHISTLES;
    endBeats = demoMode ? DEMO_BEATS : TOTAL_BEATS;
    duels = [];
    var prev = -1;
    for (var i = 0; i < ws.length; i++) {
      var d = demoMode ? DEMO_DIRS[i] : Math.floor(game.random(0, 4)) % 4;
      if (d === prev) d = (d + 1 + Math.floor(game.random(0, 3)) % 3) % 4;
      prev = d;
      var sp = shuffle(SPREAD), rv = [99];
      for (var k = 0; k < 5; k++) rv.push(RIVAL_BEST[i] + sp[k]);
      duels.push({ t: ws[i] * SPB, dir: d, rv: rv, res: 0, rt: -1, rank: 0 });
    }
    steps = [];
    for (var b = 0; b < endBeats; b++) {
      var off = b + 0.5, skip = false;
      for (var w = 0; w < ws.length; w++) if (off === ws[w] || off === ws[w] + 1) skip = true;
      if (!skip) steps.push({ t: off * SPB, res: 0 });
    }
    kids = [];
    for (var j = 0; j < 6; j++) {
      var a = ANG[j] * Math.PI / 180;
      var ix = -Math.cos(a), iy = -Math.sin(a);
      var face = Math.abs(ix) > Math.abs(iy) ? (ix > 0 ? 1 : 3) : (iy > 0 ? 2 : 0);
      kids.push({ x: RING_X + Math.cos(a) * RX, y: RING_Y + Math.sin(a) * RY, face: face, wrong: false });
    }
    clock = -READY_T; lastHalf = -99; cuedBar = -1;
    lives = LIVES; score = 0; combo = 0; maxCombo = 0; nP = 0; nG = 0; nM = 0; wins = 0; fastest = 9; nearMiss = 9;
    over = false; won = false; outroT = 0; hitStop = 0; prevBest = game.best;
    padFlash = [0, 0, 0, 0, 0]; stumble = 0; myFace = 0; myHop = 0; curDuel = -1; missFx = 0;
  }

  function sfxTone(f, d, o) { if (!demoMode) game.audio.tone(f, d, o); }

  // いまの笛の状態: 0=なし 1=笛をくわえた(予告1拍) 2=反応の受付中
  function duelPhase(i) {
    var du = duels[i];
    if (clock >= du.t - SPB && clock < du.t) return 1;
    if (clock >= du.t && clock <= du.t + REACT_MAX && !du.res) return 2;
    return 0;
  }
  function activeDuel() {
    for (var i = 0; i < duels.length; i++) if (duelPhase(i)) return i;
    return -1;
  }

  // ---- 足踏み(裏拍の頭からのずれで判定) ----
  function stepTap() {
    padFlash[4] = 0.15; myHop = 1;
    if (over || clock < -0.1) return 'idle';
    var ad = activeDuel();
    if (ad >= 0 && duelPhase(ad) === 2) return 'idle';    // 向き直る間は足を止めていてよい
    var best = null, bd = 9;
    for (var i = 0; i < steps.length; i++) {
      if (steps[i].res) continue;
      var d = Math.abs(clock - steps[i].t);
      if (d < bd) { bd = d; best = steps[i]; }
    }
    if (best && bd <= GOOD_W) {
      var g = bd <= PERFECT_W ? 1 : 2;
      best.res = g;
      combo++; maxCombo = Math.max(maxCombo, combo);
      if (g === 1) nP++; else nG++;
      score += Math.round((g === 1 ? 50 : 30) * (1 + Math.min(10, combo) * 0.1));
      game.feedback.good(PAD_X, PAD_Y - 150, { text: g === 1 ? 'PERFECT' : 'GOOD', color: g === 1 ? C.me : C.kid, size: g === 1 ? 46 : 38, count: g === 1 ? 10 : 6, volume: demoMode ? 0 : 0.12 });
      return 'hit';
    }
    misstep();
    return 'off';
  }

  function misstep() {
    combo = 0; nM++; stumble = 0.3;
    game.feedback.bad(PAD_X, PAD_Y - 150, { text: 'MISS', color: '#a89c90', shake: demoMode ? 2 : 5, volume: demoMode ? 0 : 0.3, flashColor: '#c8b8a8' });
  }

  // ---- 向き直り(反応の速さで輪の子と勝負) ----
  function dirTap(dir) {
    padFlash[dir] = 0.15;
    if (over || clock < 0) return 'idle';
    var ad = activeDuel();
    if (ad < 0) { misstep(); return 'off'; }
    var du = duels[ad], ph = duelPhase(ad);
    if (ph === 1) { du.res = 5; kids[0].face = dir; loseDuel(ad, 'early'); return 'fly'; }
    var rt = clock - du.t;
    du.rt = rt;
    kids[0].face = dir; myHop = 1;
    if (dir !== du.dir) { du.res = 4; kids[0].wrong = true; loseDuel(ad, 'wrong'); return 'wrong'; }
    var rank = 1;
    for (var k = 1; k < 6; k++) if (du.rv[k] < rt) rank++;
    du.rank = rank;
    if (rank > 1) {
      du.res = 3;
      nearMiss = Math.min(nearMiss, rt - RIVAL_BEST[Math.min(ad, RIVAL_BEST.length - 1)]);
      loseDuel(ad, 'slow');
      return 'slow';
    }
    du.res = rt <= REACT_PERFECT ? 1 : 2;
    wins++; fastest = Math.min(fastest, rt);
    combo++; maxCombo = Math.max(maxCombo, combo);
    score += 300 + Math.round(Math.max(0, 0.75 - rt) * 800);
    var k0 = kids[0];
    game.feedback.good(k0.x, k0.y - 230, { text: du.res === 1 ? 'PERFECT' : 'GOOD', color: C.me, size: du.res === 1 ? 64 : 52, count: 16, volume: demoMode ? 0 : 0.3 });
    if (!demoMode) {
      game.audio.play('se_jump', 0.3);
      if (wins === 3) { game.fx.popup('NICE', W / 2, BUBBLE_Y + 150, { color: C.hot, size: 84 }); game.audio.play('se_milestone', 0.45); }
    }
    return 'win';
  }

  function loseDuel(i, why) {
    var du = duels[i];
    combo = 0; lives--; missFx = 0.4;
    var k0 = kids[0];
    if (lives <= 0 && !demoMode) {
      hitStop = 0.5;
      game.feedback.bad(k0.x, k0.y - 230, { text: 'MISS', shake: 16 });
      game.audio.play('se_break', 0.4);
      finishRun(false);
    } else {
      game.feedback.bad(k0.x, k0.y - 230, { text: 'MISS', shake: demoMode ? 3 : 10, volume: demoMode ? 0 : 0.6 });
    }
    if (!du.res) du.res = 6;
  }

  function finishRun(ok) {
    if (over) return;
    over = true; won = ok; outroT = 1.8;
    if (demoMode) return;
    game.audio.stopBgm();
    if (ok) {
      score += lives * 150;
      for (var i = 0; i < 6; i++) game.fx.burst(kids[i].x, kids[i].y - 90, { color: KID_COL[i], count: 18, speed: 380 });
      game.fx.flash(C.me, 0.15);
      game.audio.play('se_success', 0.55);
    } else {
      game.audio.play('se_failure', 0.5);
    }
  }

  function endGame() {
    var stats = { score: score, wins: wins, duels: duels.length, fastest: fastest < 9 ? Math.round(fastest * 100) / 100 : 0, perfect: nP, good: nG, miss: nM, maxCombo: maxCombo, lives: Math.max(0, lives) };
    if (won) game.end.success(score, stats); else game.end.failure(stats);
  }

  // ---- 拍クロック(1つ)。半拍ごとに進み、表拍=ベース、裏拍=手拍子 ----
  function beatClock() {
    var nb = Math.floor((clock + 0.06) / BAR);
    if (!demoMode && nb > cuedBar && nb >= 0 && nb * 4 < endBeats) {
      cuedBar = nb;
      game.audio.melody(TUNE[nb % TUNE.length], { tempo: BPM, wave: 'triangle', volume: 0.06, bass: BASS[nb % BASS.length], bassVolume: 0.1 });
    }
    var hb = Math.floor(clock / (SPB / 2));
    if (hb !== lastHalf) {
      lastHalf = hb;
      if (clock >= 0 && hb < endBeats * 2) {
        halfPulse = 1;
        if (hb % 2 === 1) sfxTone(1250, 0.03, { wave: 'square', volume: 0.025 });
        // 笛をくわえる予告(1拍前)と笛
        for (var i = 0; i < duels.length; i++) {
          var hw = Math.round(duels[i].t / (SPB / 2));
          if (hb === hw - 2) sfxTone(392, 0.45, { wave: 'sine', volume: 0.06, slide: 360 });
          if (hb === hw) {
            curDuel = i;
            sfxTone(2300, 0.2, { wave: 'square', volume: 0.06, slide: 260 });
            sfxTone(1150, 0.2, { wave: 'triangle', volume: 0.05 });
          }
        }
      }
    }
  }

  function stepRun(dt) {
    clock += dt;
    for (var p = 0; p < 5; p++) if (padFlash[p] > 0) padFlash[p] -= dt;
    if (stumble > 0) stumble -= dt;
    if (missFx > 0) missFx -= dt;
    myHop = Math.max(0, myHop - dt * 5);
    beatClock();
    // 輪の子が反応時間どおりに向き直る
    for (var i = 0; i < duels.length; i++) {
      var du = duels[i];
      if (!du.tk) du.tk = [];
      for (var k = 1; k < 6; k++) if (!du.tk[k] && clock >= du.t + du.rv[k]) { du.tk[k] = true; kids[k].face = du.dir; }
    }
    if (over) return;
    for (var s = 0; s < steps.length; s++) {
      if (!steps[s].res && clock > steps[s].t + GOOD_W) { steps[s].res = 3; combo = 0; nM++; stumble = 0.3; }
    }
    for (var j = 0; j < duels.length; j++) {
      if (!duels[j].res && clock > duels[j].t + REACT_MAX) {
        duels[j].res = 6;
        loseDuel(j, 'none');
        if (over) return;
      }
    }
    if (clock >= endBeats * SPB || clock >= TIME_LIMIT + 0.3) finishRun(lives > 0);
  }

  // ---- 入力: 下の円パッド(真ん中=足、上下左右=向き)。当たりは見た目どおりの円+外側は角度 ----
  function padAt(x, y) {
    var dx = x - PAD_X, dy = y - PAD_Y;
    if (dx * dx + dy * dy <= (PAD_R + 20) * (PAD_R + 20)) return 4;
    if (y < PAD_Y - AOY - ARROW_R - 40) return -1;
    var nx = dx / AOX, ny = dy / AOY;
    return Math.abs(nx) > Math.abs(ny) ? (nx > 0 ? 1 : 3) : (ny > 0 ? 2 : 0);
  }
  function padPos(p) { return p === 4 ? [PAD_X, PAD_Y] : [PAD_X + DX[p] * AOX, PAD_Y + DY[p] * AOY]; }

  game.onPress(function(x, y) {
    if (state !== S.PLAYING || hitStop > 0) return;
    var p = padAt(x, y);
    if (p < 0) { game.audio.tone(260, 0.03, { wave: 'triangle', volume: 0.03 }); return; }
    var r = p === 4 ? stepTap() : dirTap(p);
    // 足は木の床のトン、向きは軽い掛け声の音(押した瞬間に鳴る)
    if (p === 4) game.audio.tone(r === 'hit' ? 196 : 150, 0.06, { wave: 'triangle', volume: 0.12 });
    else game.audio.tone(r === 'win' ? 784 : 440, 0.07, { wave: 'square', volume: 0.05 });
    var pp = padPos(p);
    if (r === 'idle') game.fx.burst(pp[0], pp[1], { color: C.wood, count: 4, speed: 90 });
  });

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initRun(false); return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.3); state = S.ATTRACT; initRun(true); demo.t = 0; return; }
  });

  // ---- 描画 ----
  function label(str, x, y, sz, col, align) {
    game.draw.text(str, x + 3, y + 4, { size: sz, color: '#00000022', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: col, bold: true, align: align || 'center' });
  }
  function ellipse(cx, cy, rx, ry, col, a) {
    for (var y = -ry; y < ry; y += 3) {
      var m = (y + 1.5) / ry, hw = rx * Math.sqrt(Math.max(0, 1 - m * m));
      game.draw.rect(cx - hw, cy + y, hw * 2, 3, col, a);
    }
  }
  function softShadow(x, y, r) {
    ellipse(x, y, r * 1.05, r * 0.34, '#5a4630', 0.08);
    ellipse(x, y, r * 0.8, r * 0.24, '#5a4630', 0.12);
  }
  function arc(x, y, r, col, w, frac) {
    var n = 28, lx = x + r, ly = y, m = Math.max(1, Math.round(n * (frac === undefined ? 1 : frac)));
    for (var i = 1; i <= m; i++) {
      var a = i / n * Math.PI * 2, nx = x + Math.cos(a) * r, ny = y + Math.sin(a) * r;
      game.draw.line(lx, ly, nx, ny, col, w);
      lx = nx; ly = ny;
    }
  }

  function hop() {
    // 裏拍の頭でぴょんと跳ねる(全員)
    if (clock < 0) return 0;
    var ph = (clock / SPB) % 1;
    var d = Math.abs(ph - 0.5);
    return d < 0.22 ? Math.cos(d / 0.22 * Math.PI / 2) * 16 : 0;
  }

  function drawHall() {
    var t = game.time.elapsed;
    game.draw.clear(C.paper);
    game.draw.gradient(0, H, [[0, C.paper], [0.55, '#f6efe4'], [1, C.floor]]);
    // 奥の壁と雨の窓
    game.draw.rect(0, 230, W, 170, '#f3ece0');
    for (var w = 0; w < 3; w++) {
      var wx = 150 + w * 300;
      game.draw.rect(wx, 258, 180, 112, '#e4eef6');
      for (var r = 0; r < 6; r++) {
        var ry = 262 + ((t * 260 + r * 37 + w * 50) % 100);
        game.draw.line(wx + 18 + r * 28, ry, wx + 10 + r * 28, ry + 14, C.rain, 3);
      }
      game.draw.rect(wx + 86, 258, 8, 112, '#ffffff');
    }
    game.draw.rect(0, 398, W, 6, C.wood, 0.6);
    // 板張りの床(奥ほど板が細い)
    var yy = 404, gap = 22;
    while (yy < H * 0.73) { game.draw.line(0, yy, W, yy, C.plank, 2); yy += gap; gap *= 1.09; }
    // 輪の白線
    for (var i = 0; i < 40; i++) {
      var a0 = i / 40 * Math.PI * 2, a1 = (i + 0.5) / 40 * Math.PI * 2;
      game.draw.line(RING_X + Math.cos(a0) * RX, RING_Y + Math.sin(a0) * RY, RING_X + Math.cos(a1) * RX, RING_Y + Math.sin(a1) * RY, C.white, 6);
    }
  }

  function drawKid(k, hopY) {
    var kd = kids[k], me = k === 0;
    var r = me ? 66 : 54;
    var h = me ? (hopY + myHop * 18) : hopY;
    var x = kd.x + (me && stumble > 0 ? Math.sin(game.time.elapsed * 60) * 6 : 0);
    softShadow(kd.x, kd.y, r * (1 - h / 120));
    var flash = me && hitStop > 0;
    if (flash) game.draw.circle(x, kd.y - r - h, r * 1.5, C.white, 0.7);
    var big = flash ? 1.2 : 1;
    game.draw.circle(x, kd.y - r - h, r * big, flash ? C.white : (me && kd.wrong && missFx > 0 ? C.hot : KID_COL[k]));
    game.draw.circle(x - r * 0.38, kd.y - r * 1.38 - h, r * 0.26, C.white, 0.45);
    if (me) game.draw.circle(x, kd.y - r * 2 - h - 10, 14, C.hot);     // 係の子の帽子のぽんぽん
    var f = kd.face;
    var fy = kd.y - r * 1.05 - h;
    if (f === 0) { game.draw.sprite(TUFT, { k: C.ink }, x, kd.y - r * 1.9 - h, 6, { anchor: 'center' }); return; }
    var fx = x + (f === 1 ? r * 0.42 : f === 3 ? -r * 0.42 : 0);
    var fr = clock >= 0 && curDuel >= 0 && clock - duels[curDuel].t < 0.4 && clock >= duels[curDuel].t ? 2 : (Math.floor(game.time.elapsed * 1.3 + k) % 5 === 0 ? 1 : 0);
    game.draw.sprite(FACE[fr], { k: C.ink, r: C.hot }, fx, fy, me ? 8 : 7, { anchor: 'center' });
  }

  function drawTeacher(hopY) {
    var ad = activeDuel();
    var ph = ad >= 0 ? duelPhase(ad) : 0;
    var x = RING_X, y = RING_Y + 40;
    softShadow(x, y, 80);
    game.draw.circle(x, y - 34, 80, '#e8dcc8');                   // 台
    game.draw.circle(x, y - 120 - hopY * 0.3, 62, C.teach);
    game.draw.circle(x - 22, y - 150 - hopY * 0.3, 16, C.white, 0.45);
    game.draw.sprite(FACE[ph === 2 ? 2 : 0], { k: C.ink, r: C.hot }, x, y - 116 - hopY * 0.3, 7, { anchor: 'center' });
    if (ph >= 1) game.draw.sprite(WHISTLE, { '#': '#c0c4c8' }, x + 40, y - 96, 6, { anchor: 'center' });
    // 予告: 笛をくわえた1拍は台のまわりに輪が広がる
    if (ph === 1) {
      var q = (clock - (duels[ad].t - SPB)) / SPB;
      arc(x, y - 120, 80 + q * 120, C.hot, 6, 1);
    }
  }

  function drawBubble() {
    var ad = activeDuel();
    var t = game.time.elapsed;
    var x = W / 2, y = BUBBLE_Y + 45;
    if (ad < 0 && curDuel < 0) return;
    var i = ad >= 0 ? ad : curDuel;
    var ph = ad >= 0 ? duelPhase(ad) : 0;
    var du = duels[i];
    if (ph === 1) {
      // 向きはまだ秘密: 「?」の代わりに4方向が回る
      var spin = Math.floor(t * 12) % 4;
      softShadow(x, y + 110, 60);
      game.draw.circle(x, y, 92, C.white);
      game.draw.sprite(ARROWS[spin], { '#': '#d8ccbc' }, x, y, 14, { anchor: 'center' });
      return;
    }
    if (ph === 2 || (du.res && clock - du.t < 1.3)) {
      var pop = Math.min(1, (clock - du.t) / 0.08);
      softShadow(x, y + 110, 70);
      game.draw.circle(x, y, 100 * pop, C.hot);
      game.draw.sprite(ARROWS[du.dir], { '#': C.white }, x, y, 16 * pop, { anchor: 'center' });
    }
  }

  function drawRanks() {
    if (curDuel < 0) return;
    var du = duels[curDuel];
    if (clock < du.t || clock > du.t + 1.9) return;
    for (var k = 1; k < 6; k++) {
      if (clock < du.t + du.rv[k]) continue;
      var rank = 1;
      for (var j = 1; j < 6; j++) if (du.rv[j] < du.rv[k]) rank++;
      if (du.res === 1 || du.res === 2) rank++;
      if (du.res === 3 && du.rt < du.rv[k]) rank++;
      var kd = kids[k];
      game.draw.circle(kd.x, kd.y - 175, 26, C.white);
      label('' + rank, kd.x, kd.y - 175, 34, C.ink);
    }
    if (du.rt >= 0 && (du.res === 1 || du.res === 2 || du.res === 3)) {
      var k0 = kids[0];
      game.draw.circle(k0.x, k0.y - 200, 32, du.res === 3 ? C.white : C.me);
      label('' + (du.res === 3 ? du.rank : 1), k0.x, k0.y - 200, 40, du.res === 3 ? C.ink : C.white);
    }
  }

  function drawPads() {
    var ad = activeDuel();
    var ph = ad >= 0 ? duelPhase(ad) : 0;
    var t = game.time.elapsed;
    // 足パッド: 次の裏拍に向かって輪が縮む
    var next = null;
    for (var i = 0; i < steps.length; i++) if (!steps[i].res && steps[i].t > clock - GOOD_W) { next = steps[i]; break; }
    softShadow(PAD_X, PAD_Y + PAD_R * 0.9, PAD_R);
    var pf = padFlash[4] > 0;
    game.draw.circle(PAD_X, PAD_Y + (pf ? 6 : 0), PAD_R, pf ? '#fff1e2' : C.white);
    game.draw.sprite(FOOT, { '#': ph === 2 ? '#e0d6c8' : C.me }, PAD_X - 26, PAD_Y + (pf ? 6 : 0), 13, { anchor: 'center' });
    game.draw.sprite(FOOT, { '#': ph === 2 ? '#e0d6c8' : C.me }, PAD_X + 30, PAD_Y - 12 + (pf ? 6 : 0), 13, { anchor: 'center', flipX: true });
    if (next && clock >= 0 && next.t - clock < SPB && ph !== 2) {
      var q = Math.max(0, (next.t - clock) / SPB);
      arc(PAD_X, PAD_Y, PAD_R + 6 + q * 90, C.me, 7, 1);
    }
    for (var d = 0; d < 4; d++) {
      var px = PAD_X + DX[d] * AOX, py = PAD_Y + DY[d] * AOY;
      var lit = ph === 2 && duels[ad].dir === d;
      var ready = ph === 1;
      softShadow(px, py + ARROW_R * 0.85, ARROW_R);
      var f2 = padFlash[d] > 0;
      game.draw.circle(px, py + (f2 ? 5 : 0), ARROW_R + (lit ? 8 : 0), lit ? C.hot : (ready ? '#fff4ec' : C.white));
      if (ready) arc(px, py, ARROW_R + 6 + Math.sin(t * 20) * 3, C.hot, 3, 1);
      game.draw.sprite(ARROWS[d], { '#': lit ? C.white : '#cbbca8' }, px, py + (f2 ? 5 : 0), 10, { anchor: 'center' });
    }
  }

  function drawBeatRow() {
    // 1小節ぶんの半拍の点。裏拍(足踏み)は大きく、笛の裏拍は赤
    var y = Math.round(H * 0.7);
    var bar = Math.max(0, Math.floor(clock / BAR));
    for (var i = 0; i < 8; i++) {
      var tt = bar * BAR + i * SPB / 2;
      var off = i % 2 === 1;
      var isW = false;
      for (var j = 0; j < duels.length; j++) if (Math.abs(duels[j].t - tt) < 0.01) isW = true;
      var cur = clock >= 0 && lastHalf === bar * 8 + i;
      var x = W / 2 - 280 + i * 80;
      var r = (off ? 15 : 8) + (cur ? halfPulse * 8 : 0);
      game.draw.circle(x, y + 3, r, '#5a4630', 0.1);
      game.draw.circle(x, y, r, isW ? C.hot : (off ? (cur ? C.me : '#f2c8a8') : '#d8ccbc'));
    }
  }

  function drawScene() {
    drawHall();
    var hy = hop();
    // 奥の子から順に
    var order = [3, 2, 4, 1, 5];
    for (var i = 0; i < 2; i++) drawKid(order[i], hy);
    drawTeacher(hy);
    for (var j = 2; j < order.length; j++) drawKid(order[j], hy);
    drawKid(0, hy);
    drawBubble();
    drawRanks();
    drawBeatRow();
    drawPads();
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 230, C.white, 0.85);
    label('SCORE ' + score, 48, 70, 42, C.ink, 'left');
    for (var i = 0; i < LIVES; i++) game.draw.circle(W - 70 - i * 64, 70, 22, i < lives ? C.me : '#e6ddd0');
    for (var d = 0; d < duels.length; d++) {
      var res = duels[d].res, col = res === 1 || res === 2 ? C.me : (res ? '#cbbca8' : '#efe6d6');
      game.draw.circle(W / 2 - 160 + d * 80, 160, 24, col);
    }
    if (combo >= 3) label('COMBO ' + combo, 48, 160, 32, C.me, 'left');
  }

  function drawResult(showTap) {
    var y0 = H * 0.27, y1 = H * 0.62;
    ellipse(W / 2, y1 + 10, 440, 30, '#5a4630', 0.1);
    game.draw.rect(70, y0, W - 140, y1 - y0, C.white, 0.96);
    label(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.32, 96, won ? C.me : C.hot);
    label('SCORE ' + score, W / 2, H * 0.385, 58, C.ink);
    label('NICE ' + wins + ' / ' + duels.length, W / 2, H * 0.43, 44, C.me);
    if (fastest < 9) {
      game.draw.sprite(WHISTLE, { '#': '#a0a4a8' }, W / 2 - 110, H * 0.47, 8, { anchor: 'center' });
      label(fastest.toFixed(2), W / 2 + 30, H * 0.47, 44, C.ink);
    }
    label('PERFECT ' + nP + '  GOOD ' + nG + '  MISS ' + nM, W / 2, H * 0.51, 32, '#8a7e72');
    if (won && score > prevBest) label('NEW RECORD', W / 2, H * 0.55, 54, C.hot);
    else label('BEST ' + Math.max(prevBest, won ? score : 0), W / 2, H * 0.55, 40, '#8a7e72');
    if (!won) {
      if (nearMiss < 1) label('あと' + Math.max(0.01, nearMiss).toFixed(2) + '秒!', W / 2, H * 0.59, 44, C.hot);
      else label('あと' + Math.max(1, duels.length - wins) + '回!', W / 2, H * 0.59, 44, C.hot);
    }
    if (showTap && Math.floor(game.time.elapsed * 2) % 2 === 0) label('TAP TO CONTINUE', W / 2, H * 0.645, 34, C.ink);
  }

  // ---- ATTRACT: 実ロジックで1サイクル。裏拍で足踏み→1回目の笛は一番に向き直り、2回目は向きを間違えてMISS ----
  var demo = { t: 0, x: PAD_X, y: PAD_Y, press: 0, plan: [], gi: 0 };
  function demoReset() {
    initRun(true);
    clock = -0.3;
    demo.plan = [];
    for (var i = 0; i < steps.length; i++) demo.plan.push({ t: steps[i].t, p: 4 });
    demo.plan.push({ t: duels[0].t + 0.34, p: DEMO_DIRS[0] });
    demo.plan.push({ t: duels[1].t + 0.38, p: 0 });
    demo.plan.sort(function(a, b) { return a.t - b.t; });
    demo.gi = 0;
  }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % DEMO_CYC;
    if (cyc < dt || demo.t <= dt) demoReset();
    stepRun(dt);
    if (demo.press > 0) demo.press -= dt;
    var tx = PAD_X, ty = PAD_Y;
    if (demo.gi < demo.plan.length) {
      var a = demo.plan[demo.gi];
      var pp = padPos(a.p);
      if (a.t - clock < 0.3) { tx = pp[0]; ty = pp[1]; }
      if (clock >= a.t) {
        if (a.p === 4) stepTap(); else dirTap(a.p);
        demo.gi++; demo.press = 0.12;
      }
    }
    demo.x += (tx - demo.x) * Math.min(1, dt * 14);
    demo.y += (ty - demo.y) * Math.min(1, dt * 14);
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;
    halfPulse = Math.max(0, halfPulse - dt * 5);

    if (state === S.ATTRACT) {
      if (!duels) initRun(true);
      stepDemo(dt);
      drawScene();
      game.draw.hand(demo.x, demo.y + 20, { press: demo.press > 0, scale: 14 });
      game.draw.rect(0, 0, W, 230, C.white, 0.9);
      label(GAME_TITLE, W / 2, 86, 84 + Math.sin(t * 3) * 3, C.me);
      label('HI-SCORE ' + game.best, W / 2, 176, 36, C.ink);
      if (Math.floor(t * 2) % 2 === 0) label('► 100円 投入 ◄', W / 2, H * 0.66, 50, C.hot);
      else label('TAP TO START', W / 2, H * 0.66, 46, C.ink);
      return;
    }

    if (state === S.RESULT) {
      drawScene();
      drawHud();
      drawResult(true);
      return;
    }

    // ---- PLAYING ----
    if (hitStop > 0) {
      hitStop -= dt;
    } else if (over) {
      outroT -= dt;
      stepRun(dt);
      if (outroT <= 0) { state = S.RESULT; endGame(); }
    } else {
      var wasReady = clock < -0.35;
      stepRun(dt);
      if (wasReady && clock >= -0.35) game.audio.play('se_tap', 0.4);
    }

    drawScene();
    drawHud();
    if (clock < 0) {
      game.draw.rect(0, H * 0.46, W, 150, C.white, 0.85);
      label(clock < -0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 100, C.me);
    }
    // 開始時お手本: 最初の2回の裏拍だけ、足パッドに薄い手を出す
    if (!over && clock > 0 && clock < 1.7 * SPB) {
      var q = (clock / SPB) % 1;
      game.draw.hand(PAD_X, PAD_Y + 20, { press: Math.abs(q - 0.5) < 0.12, scale: 13, alpha: 0.6 });
    }
    if (over && hitStop <= 0 && outroT < 0.9) drawResult(false);
  });

  game.onStart(function() {
    state = S.ATTRACT;
    initRun(true);
    demo.t = 0;
  });
})(game);
