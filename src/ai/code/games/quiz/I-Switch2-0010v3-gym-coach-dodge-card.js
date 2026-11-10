// I-Switch2-0010v3-gym-coach-dodge-card.js
// 体育館のはずし札 — 踊りながら迫ってくるコーチの向きを見て、手札の中で1枚だけ違う向きを指す札を瞬時に出して出し抜く
// 操作: コーチは頭上の矢印の向きに振りを決めながら床を迫ってくる。下に配られた札のうち、コーチと同じ向きの札ではなく、1枚だけ違う向きの札をタップする。後半は札が4枚になり、違う向きが斜め45度だけの小さな差になる(社内メモ。画面には出さない)
// 終わり: 6回出し抜けばCLEAR。同じ向きの札を出す/コーチが目の前に着くとシューズを1足失い、2足失うか15秒切れでGAME OVER
// @mechanic: judge
// @theme: gym_dance_coach_dodge_card
// 世界観: 放課後の体育館で、ダンス部員が床板を踊りながら迫ってくるコーチの振りの向きを見て、手元の向き札からあえて違う向きの1枚を瞬時に選び、すれ違いざまにコーチを出し抜く
// 残るもの: 正誤(CLEAR/GAME OVER) + 出し抜いた回数・PERFECT数・最大コンボ・スコア
// スタイル: SKEUOMORPH

(function(game) {
  var STYLE = { bg: ['#e8dcc4', '#c89a5a', '#8a5a2a'], main: ['#2a5aa8', '#f4ead8', '#d8402a'], accent: ['#ffd23a', '#ffffff'] };
  var W = game.canvas.width;
  var H = game.canvas.height;
  var INK = '#2a1a10';

  var GAME_TITLE = 'DODGE CARD';
  var TIME_LIMIT = 15;
  var NEEDED = 6;
  var LIVES = 2;
  var HOR = H * 0.17;
  var FLOOR_B = H * 0.74;
  var ME = { x: W * 0.5, y: H * 0.69 };
  var CARD_Y = H * 0.85;

  // 迫る速さ・札の枚数・違い方(逆向き → 直角 → 斜め45度)
  var ROUNDS = [
    { n: 3, odd: 'opp', dur: 2.2, diag: false },
    { n: 3, odd: 'perp', dur: 2.0, diag: false },
    { n: 4, odd: 'perp', dur: 1.8, diag: false },
    { n: 4, odd: 'opp', dur: 1.6, diag: true },
    { n: 4, odd: 'diag', dur: 1.5, diag: false },
    { n: 4, odd: 'diag', dur: 1.4, diag: true },
  ];

  var A_UP = ['....k....', '...kfk...', '..kfffk..', '.kfffffk.', 'kfffffffk', 'kkkfffkkk', '..kfffk..', '..kfffk..', '..kkkkk..'];
  var A_R = ['....k....', '....kk...', 'kkkkkfk..', 'kffffffk.', 'kfffffffk', 'kffffffk.', 'kkkkkfk..', '....kk...', '....k....'];
  var A_UR = ['...kkkkkk', '....kfffk', '.....kffk', '....kfffk', '...kfffkk', '..kfffk.k', '.kfffk...', 'kfffk....', '.kfk.....'];
  var COACH_A = ['...kkkk...', '..khhhhkk.', '..khsshkhk', '..ksesek.k', '..kssssk..', '...kmmk...', '..kjjjjk..', '.kjjwwjjk.', 'kjjjyjjjjk', 'ks.kjjk.sk', '...kjjk...', '...kjjk...', '..kpp.ppk.', '..kpp.ppk.', '..kk...kk.'];
  var COACH_B = ['...kkkk...', '..khhhhkk.', '..khsshk.h', '..ksesek.k', '..kssssk..', '...kmmk...', '.skjjjjks.', '.kjjwwjjk.', '.kjjyjjjk.', '..kjjjjk..', '...kjjk...', '..kpp.pk..', '.kpp...pk.', '.kpp...pk.', '.kk.....kk'];
  var COACH_PAL = { k: INK, h: '#3a2418', s: '#f2c8a0', e: INK, m: '#c8402a', j: '#2a5aa8', w: '#ffffff', y: '#ffd23a', p: '#1a3a78' };
  var ME_A = ['..kkkk..', '.khhhhk.', '.khhhhk.', '..khhk..', '.krrrrk.', 'krrrrrrk', 's.krrk.s', '..krrk..', '.kb..bk.', '.kb..bk.', '.kk..kk.'];
  var ME_B = ['..kkkk..', '.khhhhk.', '.khhhhk.', '..khhk..', 'skrrrrks', '.krrrrk.', '..krrk..', '..krrk..', '.kb..bk.', 'kb....bk', 'kk....kk'];
  var ME_PAL = { k: INK, h: '#2a1a14', r: '#d8402a', s: '#f2c8a0', b: '#f4ead8' };
  var SHOE = ['.....kk.', '....kwwk', 'kkkkkwwk', 'kbbbbbbk', 'kkkkkkkk'];

  var STATE = { ATTRACT: 'ATTRACT', PLAYING: 'PLAYING', RESULT: 'RESULT' };
  var state = STATE.ATTRACT;

  var cards = [], coachDir = 0, oddCard = 0, round = 0, approach = 0, dur = 1, dealT = 0;
  var phase = 'come', phaseT = 0, pickIdx = -1, dodgeDir = -1;
  var wins = 0, lives = LIVES, score = 0, perfects = 0, combo = 0, maxCombo = 0;
  var left = TIME_LIMIT, count = 0, holdT = 0, fadeT = 0, celebT = 0;
  var on = false, cleared = false, bestAtStart = 0, spin = 0;

  function write(str, x, y, size, color) {
    game.draw.text(str, x + 3, y + 4, { size: size, color: '#00000066', bold: true, align: 'center' });
    game.draw.text(str, x, y, { size: size, color: color, bold: true, align: 'center' });
  }

  function rd() { return ROUNDS[Math.min(ROUNDS.length - 1, round)]; }
  function vecOf(d) { var a = d * Math.PI / 4; return { x: Math.sin(a), y: -Math.cos(a) }; }

  function drawArrow(d, x, y, px, col, alpha) {
    var spr = d % 2 === 0 ? (d % 4 === 0 ? A_UP : A_R) : A_UR;
    var fx = d === 6 || d === 5 || d === 7;
    var fy = d === 4 || d === 3 || d === 5;
    game.draw.sprite(spr, { k: INK, f: col }, x, y, px, { anchor: 'center', flipX: fx, flipY: fy, alpha: alpha === undefined ? 1 : alpha });
  }

  // 1回分を配る: コーチの向き + 同じ向きの札(n-1枚) + 違う向きの札(1枚)
  function deal() {
    var r = rd();
    coachDir = r.odd === 'diag' ? Math.min(7, Math.floor(game.random(0, 8))) : 2 * Math.min(3, Math.floor(game.random(0, 4)));
    var side = game.random(0, 1) < 0.5 ? -1 : 1;
    var oddDir = r.odd === 'opp' ? (coachDir + 4) % 8 : r.odd === 'perp' ? (coachDir + 8 + 2 * side) % 8 : (coachDir + 8 + side) % 8;
    oddCard = Math.min(r.n - 1, Math.floor(game.random(0, r.n)));
    var cw = r.n === 3 ? 230 : 196, gap = r.n === 3 ? 60 : 42;
    var total = r.n * cw + (r.n - 1) * gap;
    cards = [];
    for (var i = 0; i < r.n; i++) {
      cards.push({ x: (W - total) / 2 + i * (cw + gap), w: cw, h: 270, dir: i === oddCard ? oddDir : coachDir, delay: i * 0.06 });
    }
    approach = 0; dur = r.dur; dealT = 0.28;
    phase = 'come'; pickIdx = -1; dodgeDir = -1; spin = 0;
  }

  function cardAt(x, y) {
    for (var i = 0; i < cards.length; i++) {
      var c = cards[i];
      if (x > c.x - 12 && x < c.x + c.w + 12 && y > CARD_Y - c.h / 2 - 16 && y < CARD_Y + c.h / 2 + 16) return i;
    }
    return -1;
  }

  function coachPos() {
    var k = Math.min(1, approach / dur);
    var e = k * k;
    var v = vecOf(coachDir);
    return { x: W / 2 + v.x * 70 * Math.sin(game.time.elapsed * 6) * (1 - e), y: HOR + 90 + (ME.y - 150 - HOR - 90) * e, s: 0.45 + 0.75 * e, k: k };
  }

  // 実ロジック: 札を出した結果
  function playCard(i, live) {
    var c = cards[i];
    pickIdx = i;
    if (i === oddCard) {
      var quick = approach < dur * 0.45;
      phase = 'won'; phaseT = 0.5; dodgeDir = c.dir; spin = 1;
      game.feedback.good(c.x + c.w / 2, CARD_Y - 170, { text: quick ? 'PERFECT' : 'GOOD', color: quick ? STYLE.accent[0] : STYLE.main[0], count: quick ? 18 : 10, volume: live ? 1 : 0.4 });
      if (!live) return;
      wins++; combo++; maxCombo = Math.max(maxCombo, combo);
      if (quick) perfects++;
      score += Math.round((100 + (dur - approach) * 120 + (quick ? 80 : 0)) * (1 + (combo - 1) * 0.25));
      if (combo >= 3) game.fx.popup('COMBO x' + combo, W / 2, H * 0.36, { color: STYLE.accent[0], size: 54 });
      if (wins === 3) { game.fx.popup('3 / ' + NEEDED, W / 2, H * 0.2, { color: STYLE.main[0], size: 60 }); game.audio.play('se_milestone', 0.5); }
      if (wins >= NEEDED) { cleared = true; finishRun(); }
    } else {
      missRound(live, c.x + c.w / 2);
    }
  }

  function missRound(live, x) {
    phase = 'stop'; phaseT = 0.55; combo = 0;
    var p = coachPos();
    game.feedback.bad(x || p.x, pickIdx >= 0 ? CARD_Y - 170 : p.y, { text: 'MISS', shake: live ? 12 : 4, volume: live ? 1 : 0.4 });
    if (!live) return;
    lives--;
    if (lives <= 0) { cleared = false; finishRun(); }
  }

  // 実ロジック: 時間経過。戻り値 'caught' | 'next' | null
  function stepRound(dt) {
    if (dealT > 0) dealT -= dt;
    if (spin > 0) spin -= dt * 1.6;
    if (phase === 'come') {
      approach += dt;
      if (approach >= dur) return 'caught';
    } else {
      phaseT -= dt;
      if (phaseT <= 0) return 'next';
    }
    return null;
  }

  function finishRun() {
    on = false; holdT = 0.55; celebT = 0;
    game.audio.stopBgm();
    if (cleared) { score += Math.round(left * 40); game.audio.play('se_success', 0.5); }
    else game.audio.play('se_failure', 0.45);
  }

  function startBgm() {
    game.audio.melody([
      ['A4', 0.5], ['R', 0.25], ['A4', 0.25], ['C5', 0.5], ['E5', 0.5], ['D5', 0.5], ['C5', 0.25], ['A4', 0.25], ['G4', 1],
      ['A4', 0.5], ['R', 0.25], ['A4', 0.25], ['C5', 0.5], ['G5', 0.5], ['E5', 1], ['A4', 1],
    ], { tempo: 128, wave: 'square', volume: 0.045, loop: true, bass: [['A2', 1], ['A2', 1], ['F2', 1], ['G2', 1]] });
  }

  function initGame() {
    round = 0; wins = 0; lives = LIVES; score = 0; perfects = 0; combo = 0; maxCombo = 0;
    left = TIME_LIMIT; count = 0.8; holdT = 0; fadeT = 0; celebT = 0;
    on = false; cleared = false;
    bestAtStart = game.best || 0;
    deal();
  }

  game.onTap(function(x, y) {
    if (state === STATE.ATTRACT) { game.audio.play('se_coin', 0.5); state = STATE.PLAYING; initGame(); startBgm(); return; }
    if (state === STATE.RESULT) { state = STATE.ATTRACT; initGame(); demo.t = 0; return; }
    if (!on || phase !== 'come') { game.audio.play('se_tap', 0.08); return; }
    var i = cardAt(x, y);
    if (i < 0) { game.audio.tone('E4', 0.04, { wave: 'triangle', volume: 0.06 }); game.fx.burst(x, y, { color: STYLE.main[1], count: 3, speed: 80 }); return; }
    game.audio.play('se_jump', 0.3);
    playCard(i, true);
  });

  // ── ATTRACT ゴースト実演: 本番の配札と判定。2周に1回は同じ向きの札を出してコーチにつかまる ──
  var demo = { t: 0, gx: W / 2, gy: H * 0.95, press: 0, n: 0, wrong: false, done: false };
  function demoDeal() {
    round = demo.n % 4; deal(); demo.done = false;
    demo.wrong = demo.n % 3 === 2;
    demo.n++;
  }
  function stepDemo(dt) {
    demo.t += dt;
    if (demo.t <= dt || cards.length === 0) { demo.n = 0; demoDeal(); }
    if (demo.press > 0) demo.press -= dt;
    var ev = stepRound(dt);
    if (ev === 'caught') { pickIdx = -1; missRound(false); }
    if (ev === 'next') { demoDeal(); return; }
    if (phase !== 'come') return;
    var target = demo.wrong ? (oddCard + 1) % cards.length : oddCard;
    var c = cards[target];
    var aim = approach > dur * 0.25;
    var tx = aim ? c.x + c.w / 2 : W / 2, ty = aim ? CARD_Y + 20 : H * 0.95;
    demo.gx += (tx - demo.gx) * Math.min(1, dt * 7);
    demo.gy += (ty - demo.gy) * Math.min(1, dt * 7);
    if (!demo.done && approach > dur * 0.5) { demo.done = true; demo.press = 0.25; playCard(target, false); }
  }

  // ── 描画 ──
  function drawGym() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, STYLE.bg[0]], [0.16, '#d8c8a8'], [0.17, STYLE.bg[1]], [0.74, STYLE.bg[2]], [1, '#5a3a1a']]);
    // 高窓
    for (var i = 0; i < 5; i++) {
      game.draw.rect(60 + i * 200, 40, 160, 150, '#5a4a3a');
      game.draw.rect(68 + i * 200, 48, 144, 134, '#bfe4ff');
      game.draw.rect(68 + i * 200, 48, 144, 50, '#e8f6ff');
      game.draw.rect(136 + i * 200, 48, 8, 134, '#5a4a3a');
      game.draw.line(76 + i * 200, 170, 120 + i * 200, 60, '#ffffff', 4);
    }
    game.draw.rect(0, HOR - 14, W, 14, '#6a4a2a');
    game.draw.rect(0, HOR - 14, W, 4, '#a8825a');
    // 床板(遠いほど細い帯)+木目
    var y = HOR;
    var n = 0;
    while (y < FLOOR_B) {
      var k = (y - HOR) / (FLOOR_B - HOR);
      var hh = 10 + k * 42;
      game.draw.rect(0, y, W, hh, n % 2 ? '#c08a4a' : '#b47c3e');
      game.draw.rect(0, y, W, 2, '#7a4a20', 0.5);
      game.draw.rect(0, y + hh * 0.35, W, 1, '#e8b878', 0.35);
      y += hh; n++;
    }
    for (var p = -4; p <= 4; p++) {
      game.draw.line(W / 2 + p * 60, HOR, W / 2 + p * 260, FLOOR_B, '#7a4a20', 2);
    }
    // コートのライン
    game.draw.line(W * 0.2, HOR + 40, -40, FLOOR_B, STYLE.main[1], 6);
    game.draw.line(W * 0.8, HOR + 40, W + 40, FLOOR_B, STYLE.main[1], 6);
    game.draw.line(W * 0.1, H * 0.45, W * 0.9, H * 0.45, STYLE.main[2], 6);
    game.draw.rect(0, H * 0.3, W, H * 0.12, '#ffffff', 0.05 + 0.02 * Math.sin(t));
    // 手元の台(札置き)
    game.draw.rect(0, FLOOR_B, W, H - FLOOR_B, '#4a2a12');
    game.draw.rect(0, FLOOR_B, W, 10, '#a8825a');
    game.draw.rect(30, FLOOR_B + 30, W - 60, H * 0.21, '#2a6a3a');
    game.draw.rect(30, FLOOR_B + 30, W - 60, 8, '#4a8a5a');
    for (var f = 0; f < 30; f++) game.draw.rect(40 + (f * 73) % (W - 80), FLOOR_B + 50 + (f * 41) % (H * 0.18), 3, 3, '#1a4a2a', 0.6);
  }

  function drawCoach(hl) {
    var p = coachPos();
    var t = game.time.elapsed;
    var fr = Math.floor(t * 6) % 2 ? COACH_A : COACH_B;
    var px = 14 * p.s;
    game.draw.rect(p.x - 70 * p.s, p.y + 110 * p.s, 140 * p.s, 18 * p.s, '#000000', 0.25);
    if (hl) game.draw.circle(p.x, p.y, 190 * p.s, '#ffffff', 0.55);
    game.draw.sprite(fr, COACH_PAL, p.x + (spin > 0 ? Math.sin(spin * 30) * 40 : 0), p.y, px, { anchor: 'center', flipX: spin > 0 && Math.sin(spin * 30) > 0 });
    // 頭上の向き(振りの向き)
    var bob = Math.sin(t * 8) * 6;
    var v = vecOf(coachDir);
    var ax = p.x + v.x * 20, ay = p.y - 180 * p.s - 60 + bob + v.y * 10;
    game.draw.circle(ax, ay, 70, STYLE.main[1], 0.92);
    game.draw.circle(ax, ay, 70, STYLE.main[0], 0.18);
    drawArrow(coachDir, ax, ay, 11, STYLE.main[0]);
    // 迫ってくる危険の輪(近いほど赤く点滅)
    if (phase === 'come' && p.k > 0.55 && Math.floor(t * 12) % 2 === 0) game.draw.circle(ME.x, ME.y + 40, 120, STYLE.main[2], 0.25);
  }

  function drawMe() {
    var t = game.time.elapsed;
    var v = dodgeDir >= 0 ? vecOf(dodgeDir) : { x: 0, y: 0 };
    var off = (phase === 'won') ? (1 - phaseT / 0.5) : 0;
    var x = ME.x + v.x * 260 * off, y = ME.y + v.y * 80 * off;
    game.draw.rect(x - 50, ME.y + 70, 100, 14, '#000000', 0.25);
    game.draw.sprite(Math.floor(t * 4) % 2 ? ME_A : ME_B, ME_PAL, x, y, 13, { anchor: 'center' });
  }

  function drawCards(hl) {
    var t = game.time.elapsed;
    for (var i = 0; i < cards.length; i++) {
      var c = cards[i];
      var drop = Math.max(0, (dealT + c.delay) / 0.34);
      var y = CARD_Y - drop * 260;
      var lift = (pickIdx === i) ? -26 : (phase === 'come' ? Math.sin(t * 5 + i) * 5 : 0);
      var x = c.x, w = c.w, h = c.h;
      var cy = y + lift;
      if (hl && i === oddCard) { game.draw.rect(x - 22, cy - h / 2 - 22, w + 44, h + 44, '#ffffff', 0.6); }
      game.draw.rect(x + 10, cy - h / 2 + 14, w, h, '#000000', 0.3);
      game.draw.rect(x - 4, cy - h / 2 - 4, w + 8, h + 8, '#6a4a2a');
      game.draw.rect(x, cy - h / 2, w, h, '#fff8e8');
      game.draw.rect(x, cy - h / 2 + h * 0.55, w, h * 0.45, '#efe2c4');
      game.draw.rect(x, cy - h / 2, w, 10, '#ffffff');
      game.draw.rect(x + 14, cy - h / 2 + 14, w - 28, h - 28, phase === 'come' ? '#ffffff' : '#f4ead8', 0.0 + (phase === 'come' ? 0.35 : 0));
      drawArrow(c.dir, x + w / 2, cy, 15, i === pickIdx && hl ? STYLE.main[2] : STYLE.main[0]);
      if (hl && i === pickIdx && i !== oddCard) game.draw.rect(x, cy - h / 2, w, h, STYLE.main[2], 0.35);
      if (phase === 'come' && Math.floor(t * 3) % 2 === 0) game.draw.rect(x - 4, cy - h / 2 - 4, w + 8, 4, '#ffffff');
    }
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 230, '#000000', 0.25);
    write(wins + ' / ' + NEEDED, W / 2, 98, 56, STYLE.accent[1]);
    write(String(score), W - 140, 98, 36, STYLE.accent[0]);
    for (var i = 0; i < LIVES; i++) game.draw.sprite(SHOE, { k: INK, w: '#ffffff', b: STYLE.main[2] }, 80 + i * 100, 98, 11, { anchor: 'center', alpha: i < lives ? 1 : 0.2 });
    var bw = W - 160;
    var low = left < 4 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(80, 166, bw, 20, '#3a2a1a');
    game.draw.rect(80, 166, bw * Math.max(0, left / TIME_LIMIT), 20, low ? STYLE.main[2] : STYLE.accent[0]);
    game.draw.rect(80, 166, bw * Math.max(0, left / TIME_LIMIT), 6, '#ffffff', 0.5);
  }

  game.onUpdate(function(dt) {
    if (state === STATE.ATTRACT) {
      stepDemo(dt);
      drawGym();
      drawCoach(phase === 'stop');
      drawMe();
      drawCards(phase === 'stop');
      game.draw.hand(demo.gx, demo.gy, { press: demo.press > 0, scale: 15 });
      var bob = Math.sin(game.time.elapsed * 2) * 6;
      game.draw.rect(0, 0, W, 240, '#000000', 0.3);
      write(GAME_TITLE, W / 2, H * 0.06 + bob, 78, STYLE.accent[0]);
      write('HI-SCORE ' + Math.round(game.best || 0), W / 2, H * 0.105, 32, STYLE.accent[1]);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) write('► 100円 投入 ◄', W / 2, H * 0.975, 40, STYLE.accent[0]);
      else write('INSERT COIN', W / 2, H * 0.975, 32, STYLE.accent[1]);
      return;
    }

    if (state === STATE.RESULT) {
      celebT -= dt;
      if (cleared && celebT <= 0) {
        celebT = 0.3;
        game.fx.burst(game.random(W * 0.1, W * 0.9), game.random(H * 0.2, H * 0.6), { color: game.random(0, 1) < 0.5 ? STYLE.accent[0] : STYLE.main[0], count: 14, speed: 380 });
      }
      if (cleared) { dodgeDir = Math.floor(game.time.elapsed * 2) % 8; phase = 'won'; phaseT = 0.25 + 0.25 * Math.sin(game.time.elapsed * 6); }
      drawGym();
      drawCoach(!cleared);
      drawMe();
      drawCards(!cleared);
      game.draw.rect(0, 0, W, 250, '#000000', 0.35);
      write(cleared ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.06, 80, cleared ? STYLE.accent[0] : STYLE.main[2]);
      write(wins + ' / ' + NEEDED + '   SCORE ' + score, W / 2, H * 0.1, 36, STYLE.accent[1]);
      if (!cleared) write('あと' + (NEEDED - wins) + '回!', W / 2, H * 0.4, 50, STYLE.main[2]);
      else write('PERFECT ' + perfects + '  COMBO ' + maxCombo, W / 2, H * 0.4, 40, STYLE.main[0]);
      if (score > bestAtStart && score > 0) write('NEW RECORD', W / 2, H * 0.122, 32, Math.floor(game.time.elapsed * 4) % 2 ? STYLE.accent[0] : STYLE.accent[1]);
      else write('BEST ' + Math.round(game.best || 0), W / 2, H * 0.122, 28, STYLE.accent[1]);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) write('TAP TO CONTINUE', W / 2, H * 0.975, 32, STYLE.accent[1]);
      return;
    }

    // ── PLAYING ──
    if (fadeT > 0) {
      fadeT -= dt;
      if (fadeT <= 0) {
        state = STATE.RESULT;
        var stats = { wins: wins, perfect: perfects, maxCombo: maxCombo };
        if (cleared) game.end.success(score, stats); else game.end.failure(stats);
        if (cleared && score > bestAtStart) game.audio.play('se_milestone', 0.5);
      }
    } else if (holdT > 0) {
      holdT -= dt;
      if (holdT <= 0) fadeT = 1.0;
    } else if (count > 0) {
      count -= dt;
      if (count <= 0) { on = true; game.audio.play('se_tap', 0.35); }
    } else if (on) {
      if (phase === 'come') left -= dt;
      var before = approach;
      var ev = stepRound(dt);
      if (phase === 'come' && before < dur * 0.55 && approach >= dur * 0.55) game.audio.tone('B5', 0.06, { wave: 'square', volume: 0.08 });
      if (ev === 'caught') { pickIdx = -1; missRound(true); }
      else if (ev === 'next') { if (pickIdx === oddCard) round = wins; deal(); }
      if (on && left <= 0) {
        left = 0; cleared = false; phase = 'stop';
        game.feedback.bad(W / 2, H * 0.45, { text: 'TIME UP', shake: 10 });
        finishRun();
      }
    }

    drawGym();
    drawCoach(phase === 'stop' && !cleared);
    drawMe();
    drawCards(phase === 'stop' && !cleared);
    drawHud();
    if (count > 0) write(count > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 96, STYLE.accent[0]);
  });

  game.onStart(function() {
    startBgm();
    state = STATE.ATTRACT;
    initGame();
  });
})(game);
