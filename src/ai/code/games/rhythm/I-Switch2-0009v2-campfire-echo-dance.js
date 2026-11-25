// I-Switch2-0009v2-campfire-echo-dance.js
// ファイヤーエコー — キャンプファイヤーをはさんでリーダーとたいまつを受け渡し、リーダーが見せた振りを自分の番にそのまま返し続ける
// 操作: リーダーの番は見るだけ。たいまつが自分に回ったら同じ振りを返す(上下左右のスワイプ=バンザイ/しゃがみ/左右に体を倒す、タップ=手拍子)。5回目からは2手の振りを順に返す。7回目からはリーダーが途中で向きを変えるフェイントが混ざり、最後に光った振りだけを返す(社内メモ。画面には出さない)
// 終わり: 10回の掛け合いを返し切ればCLEAR。違う振り/返しそびれでマシュマロを1本失い、3本失うか24秒切れでGAME OVER
// @mechanic: turn_attack
// @theme: campfire_echo_dance_turns
// 世界観: 夏のキャンプ場の夜、キャンプファイヤーの輪で、参加の子どもがレンジャー帽のリーダーとたいまつを受け渡しながら交互に振り付けを見せ合い、リーダーの振りを同じ振りで返していく
// 残るもの: 正誤(CLEAR/GAME OVER) + 返した掛け合いの数・PERFECT数・スコア
// スタイル: TOON SHADE

(function(game) {
  var STYLE = { bg: ['#0b1430', '#15284a', '#1e3a2c'], main: ['#ff8a2a', '#ffd84a', '#3aa868'], accent: ['#ffffff', '#e8405a'] };
  var W = game.canvas.width;
  var H = game.canvas.height;
  var INK = '#0a0a12';

  var GAME_TITLE = 'FIRE ECHO';
  var TIME_LIMIT = 24;
  var NEEDED = 10;
  var LIVES = 3;
  var LEADER = { x: W * 0.5, y: H * 0.30 };
  var FIRE = { x: W * 0.5, y: H * 0.47 };
  var KID = { x: W * 0.5, y: H * 0.66 };
  var MAT_Y = H * 0.86;
  var SIDE_X = W * 0.82;
  var TORCH_X = W * 0.16;
  var MOVES = ['up', 'down', 'left', 'right', 'clap'];
  var MOVE_TONE = { up: 'E6', down: 'C5', left: 'G5', right: 'A5', clap: 'D6' };
  var DIRV = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 }, clap: { x: 0, y: 0 } };
  var WRONG = { up: 'down', down: 'up', left: 'right', right: 'left', clap: 'up' };

  // 姿勢: la/ra=画面左/右の腕の角度(真下0・外向き+)、lean=体の傾き、squat=しゃがみ
  var POSES = {
    idle: { la: 0.3, ra: 0.3, lean: 0, squat: 0 },
    up: { la: 2.75, ra: 2.75, lean: 0, squat: 0 },
    down: { la: 1.4, ra: 1.4, lean: 0, squat: 1 },
    left: { la: 2.1, ra: -0.4, lean: -1, squat: 0 },
    right: { la: -0.4, ra: 2.1, lean: 1, squat: 0 },
    clap: { la: -0.6, ra: -0.6, lean: 0, squat: 0.15 },
  };

  var FACE_A = ['..kkkk..', '.khhhhk.', 'khhhhhhk', 'ksessesk', 'kssssssk', 'kssmmssk', '.kssssk.', '..kkkk..'];
  var FACE_B = ['..kkkk..', '.khhhhk.', 'khhhhhhk', 'kskssksk', 'kssssssk', 'ksmmmmsk', '.kssmsk.', '..kkkk..'];
  var FACE_SAD = ['..kkkk..', '.khhhhk.', 'khhhhhhk', 'ksessesk', 'kssssssk', 'kssssssk', '.ksmmsk.', '..kkkk..'];
  var HAT = ['...kk...', '.kggggk.', 'kggyyggk', 'kkkkkkkk'];
  var ARROW_UP = ['...kk...', '..kffk..', '.kffffk.', 'kffffffk', 'kkkffkkk', '..kffk..', '..kffk..', '..kkkk..'];
  var ARROW_R = ['....k...', '....kk..', 'kkkkkfk.', 'kffffffk', 'kffffffk', 'kkkkkfk.', '....kk..', '....k...'];
  var STAR = ['...kk...', '..kffk..', 'kkkffkkk', 'kffffffk', '.kffffk.', '.kfkkfk.', 'kfk..kfk', 'kk....kk'];
  var TORCH_A = ['..y..', '.yoy.', '.ooo.', 'kkkkk', '.kwk.', '.kwk.', '.kwk.', '.kwk.'];
  var TORCH_B = ['.y...', '..yo.', '.ooo.', 'kkkkk', '.kwk.', '.kwk.', '.kwk.', '.kwk.'];
  var MALLOW = ['.kkk.', 'kwwwk', 'kwwwk', '.kkk.', '..b..', '..b..', '..b..'];
  var TORCH_PAL = { y: '#fff6a0', o: STYLE.main[0], k: INK, w: '#8a5a30' };

  var PAL_LEADER = { shirt: '#3a8a5a', shirtDark: '#24603c', sleeve: '#3a8a5a', pants: '#6a5038', hand: '#f0c8a0', face: { k: INK, h: '#4a2e1a', s: '#f0c8a0', e: INK, m: '#c84a3a' } };
  var PAL_KID = { shirt: '#ff8a2a', shirtDark: '#c85a14', sleeve: '#ff8a2a', pants: '#2a4a8a', hand: '#f6d0a8', face: { k: INK, h: '#1a1a24', s: '#f6d0a8', e: INK, m: '#d84a4a' } };

  var STATE = { ATTRACT: 'ATTRACT', PLAYING: 'PLAYING', RESULT: 'RESULT' };
  var state = STATE.ATTRACT;

  var leader = mkDancer(), kid = mkDancer();
  var EX = [], ex = 0, phase = 'idle', phaseT = 0, leadIdx = 0, leadSub = 'pose', echoIdx = 0, echoT = 0, echoMax = 1;
  var lives = LIVES, combo = 0, fever = false, score = 0, perfects = 0, echoed = 0;
  var left = TIME_LIMIT, count = 0, stopT = 0, holdT = 0, fadeT = 0, celebT = 0;
  var on = false, cleared = false, hurried = false, bestAtStart = 0;
  var ember = { dir: '', t: 0 }, torchK = 0, fail = null;

  function mkDancer() {
    var p = POSES.idle;
    return { cur: { la: p.la, ra: p.ra, lean: p.lean, squat: p.squat }, target: 'idle', half: false, flash: 0 };
  }

  function write(str, x, y, size, color) {
    game.draw.text(str, x + 4, y + 4, { size: size, color: INK, bold: true, align: 'center' });
    game.draw.text(str, x, y, { size: size, color: color, bold: true, align: 'center' });
  }

  function outlineLine(x1, y1, x2, y2, col, w) {
    game.draw.line(x1, y1, x2, y2, INK, w + 12);
    game.draw.line(x1, y1, x2, y2, col, w);
  }

  function startBgm(fast) {
    game.audio.melody([
      ['G4', 0.5], ['B4', 0.5], ['D5', 1], ['B4', 0.5], ['A4', 0.5], ['G4', 1],
      ['E4', 0.5], ['G4', 0.5], ['A4', 1], ['B4', 0.5], ['A4', 0.5], ['D4', 1],
    ], { tempo: fast ? 150 : 104, wave: 'triangle', volume: 0.05, loop: true, bass: [['G2', 2], ['C3', 2], ['E3', 2], ['D3', 2]] });
  }

  // ── 掛け合いの組み立て(後半ほど2手・フェイント) ──
  function pickMove(avoid) {
    var m = avoid;
    for (var n = 0; n < 8 && m === avoid; n++) m = MOVES[Math.min(MOVES.length - 1, Math.floor(game.random(0, MOVES.length)))];
    return m;
  }
  function buildExchanges() {
    EX = [];
    var prev = '';
    for (var i = 0; i < NEEDED + LIVES; i++) {
      var len = i < 4 ? 1 : 2;
      var mv = [];
      for (var k = 0; k < len; k++) { prev = pickMove(prev); mv.push(prev); }
      var feint = i >= 6 && game.random(0, 1) < 0.55;
      var fake = feint ? WRONG[mv[0]] : '';
      if (fake === 'up' && mv[0] === 'clap') fake = 'left';
      EX.push({ moves: mv, feint: feint, fake: fake });
    }
  }

  function leadDur() { return Math.max(0.34, 0.5 - ex * 0.014); }
  function echoWin() { return Math.max(0.72, 1.25 - ex * 0.05); }

  function showLead(live) {
    var m = EX[ex].moves[leadIdx];
    leader.half = false; leader.target = m; leader.flash = 0.2;
    ember.dir = m; ember.t = 0.6;
    phaseT = leadDur();
    game.audio.tone(MOVE_TONE[m], 0.1, { wave: 'triangle', volume: live ? 0.14 : 0.05 });
  }

  function beginExchange(live) {
    var e = EX[ex];
    phase = 'lead'; leadIdx = 0; echoIdx = 0; torchK = 0;
    kid.target = 'idle';
    if (e.feint) { leadSub = 'feint'; leader.target = e.fake; leader.half = true; phaseT = 0.26; }
    else { leadSub = 'pose'; showLead(live); }
  }

  // 実ロジック: リーダーの番 → たいまつ渡し → 自分の番 → たいまつ戻し。戻り値 'late' | 'next' | null
  function stepTurns(dt, live) {
    if (ember.t > 0) ember.t -= dt;
    if (phase === 'lead') {
      phaseT -= dt;
      if (phaseT > 0) return null;
      if (leadSub === 'feint') { leadSub = 'pose'; showLead(live); }
      else if (leadSub === 'pose') { leadSub = 'rest'; leader.target = 'idle'; phaseT = 0.1; }
      else {
        leadIdx++;
        if (leadIdx < EX[ex].moves.length) { leadSub = 'pose'; showLead(live); }
        else { phase = 'pass'; phaseT = 0.22; game.audio.tone('C5', 0.06, { wave: 'square', volume: live ? 0.08 : 0.03, slide: 400 }); }
      }
    } else if (phase === 'pass') {
      phaseT -= dt; torchK = Math.min(1, torchK + dt / 0.22);
      if (phaseT <= 0) { phase = 'echo'; echoIdx = 0; echoMax = echoWin(); echoT = echoMax; torchK = 1; }
    } else if (phase === 'echo') {
      echoT -= dt;
      if (echoT <= 0) return 'late';
    } else if (phase === 'back') {
      phaseT -= dt; torchK = Math.max(0, torchK - dt / 0.26);
      if (phaseT <= 0) return 'next';
    }
    return null;
  }

  function judgeMove(m) {
    if (phase !== 'echo') return 'wait';
    if (m !== EX[ex].moves[echoIdx]) return 'wrong';
    return echoT > echoMax * 0.55 ? 'perfect' : 'good';
  }

  function missEcho(got, live) {
    fail = { want: EX[ex].moves[echoIdx], got: got };
    combo = 0; fever = false;
    if (got) kid.target = got;
    stopT = 0.5; phase = 'stop';
    if (!live) { game.feedback.bad(KID.x, KID.y - 60, { text: 'MISS', shake: 4, volume: 0.4 }); return; }
    lives--;
    game.feedback.bad(KID.x, KID.y - 60, { text: 'MISS', shake: 12 });
    if (lives <= 0) { cleared = false; finishRun(); }
  }

  function applyMove(m, live) {
    kid.target = m; kid.flash = 0.15;
    var res = judgeMove(m);
    if (res === 'wait') {
      if (live) game.fx.burst(KID.x, KID.y + 120, { color: STYLE.accent[0], count: 3, speed: 80 });
      return res;
    }
    if (res === 'wrong') { missEcho(m, live); return res; }
    var pts = (res === 'perfect' ? 150 : 100) * (fever ? 2 : 1);
    if (live) { score += pts; if (res === 'perfect') perfects++; }
    game.feedback.good(SIDE_X, KID.y - 60, { text: res === 'perfect' ? 'PERFECT' : 'GOOD', color: res === 'perfect' ? STYLE.main[1] : STYLE.accent[0], count: res === 'perfect' ? 16 : 9, volume: live ? 1 : 0.4 });
    if (m === 'clap') game.fx.burst(KID.x, KID.y - 30, { color: STYLE.main[1], count: 8, speed: 220 });
    echoIdx++;
    if (echoIdx < EX[ex].moves.length) { echoMax = echoWin(); echoT = echoMax; return res; }
    echoed++; combo++;
    phase = 'back'; phaseT = 0.28;
    if (!live) return res;
    if (echoed === Math.ceil(NEEDED / 2)) {
      game.fx.popup(echoed + ' / ' + NEEDED, W / 2, H * 0.2, { color: STYLE.main[1], size: 56 });
      game.audio.play('se_milestone', 0.45);
    }
    if (!fever && combo >= 5) {
      fever = true;
      game.fx.popup('FEVER', FIRE.x, FIRE.y - 200, { color: STYLE.main[0], size: 72 });
      game.audio.play('se_powerup', 0.5);
    }
    if (echoed >= NEEDED) { cleared = true; finishRun(); }
    return res;
  }

  function finishRun() {
    on = false; holdT = 0.55; celebT = 0;
    game.audio.stopBgm();
    if (cleared) {
      score += Math.round(left * 20);
      game.audio.play('se_success', 0.5);
      game.fx.burst(FIRE.x, FIRE.y - 80, { color: STYLE.main[1], count: 30, speed: 520 });
      leader.target = 'up'; kid.target = 'up';
    } else {
      game.audio.play('se_failure', 0.45);
    }
  }

  function initGame() {
    buildExchanges();
    ex = 0; phase = 'idle'; lives = LIVES; combo = 0; fever = false; score = 0; perfects = 0; echoed = 0;
    left = TIME_LIMIT; count = 0.8; stopT = 0; holdT = 0; fadeT = 0; celebT = 0;
    on = false; cleared = false; hurried = false; fail = null; ember.t = 0; torchK = 0;
    bestAtStart = game.best || 0;
    leader = mkDancer(); kid = mkDancer();
  }

  game.onTap(function(x, y) {
    if (state === STATE.ATTRACT) { game.audio.play('se_coin', 0.5); state = STATE.PLAYING; initGame(); startBgm(false); return; }
    if (state === STATE.RESULT) { state = STATE.ATTRACT; initGame(); demo.t = 0; return; }
    if (!on || stopT > 0) { game.audio.play('se_tap', 0.08); return; }
    game.audio.play('se_tap', 0.25);
    applyMove('clap', true);
  });

  game.onSwipe(function(dir) {
    if (state !== STATE.PLAYING) return;
    if (!on || stopT > 0) { game.audio.tone('C4', 0.04, { wave: 'square', volume: 0.04 }); return; }
    game.audio.play('se_jump', 0.2);
    applyMove(dir, true);
  });

  // ── ATTRACT ゴースト実演: stepTurns/applyMove をそのまま回す。3回目の掛け合いではわざと逆の振りを返して失敗を見せる ──
  var demo = { t: 0, gx: W / 2, gy: MAT_Y, press: 0, act: -1, mv: '' };
  function demoReset() {
    buildExchanges();
    ex = 0; echoed = 0; combo = 0; fever = false; fail = null; stopT = 0; torchK = 0;
    leader = mkDancer(); kid = mkDancer();
    demo.act = -1; demo.gx = W / 2; demo.gy = MAT_Y;
    beginExchange(false);
  }
  function stepDemo(dt) {
    demo.t += dt;
    if (demo.t <= dt || phase === 'idle') demoReset();
    if (demo.press > 0) demo.press -= dt;
    if (stopT > 0) {
      stopT -= dt;
      if (stopT <= 0) { fail = null; ex++; beginExchange(false); }
      return;
    }
    var ev = stepTurns(dt, false);
    if (ev === 'late') missEcho('', false);
    else if (ev === 'next') { ex++; if (ex >= 4) demoReset(); else beginExchange(false); }
    if (phase === 'echo' && demo.act < 0 && echoMax - echoT > 0.3) {
      var want = EX[ex].moves[echoIdx];
      demo.mv = ex === 2 ? WRONG[want] : want;
      demo.act = 0.2;
    }
    if (demo.act >= 0) {
      demo.act -= dt;
      var k = 1 - Math.max(0, demo.act) / 0.2;
      var v = DIRV[demo.mv];
      demo.gx = W / 2 + v.x * 170 * k; demo.gy = MAT_Y + v.y * 150 * k; demo.press = 0.12;
      if (demo.act < 0) { applyMove(demo.mv, false); demo.act = -1; }
    } else if (demo.press <= 0) {
      demo.gx += (W / 2 - demo.gx) * Math.min(1, dt * 8); demo.gy += (MAT_Y - demo.gy) * Math.min(1, dt * 8);
    }
  }

  // ── 描画 ──
  function stepDancer(d, dt) {
    var p = POSES[d.target];
    var k = Math.min(1, dt * (d.half ? 5 : 18));
    d.cur.la += (p.la - d.cur.la) * k;
    d.cur.ra += (p.ra - d.cur.ra) * k;
    d.cur.lean += (p.lean - d.cur.lean) * k;
    d.cur.squat += (p.squat - d.cur.squat) * k;
    if (d.flash > 0) d.flash -= dt;
  }

  function pine(x, baseY, h, w, col) {
    for (var k = 0; k < h; k += 10) {
      var ww = w * ((k % 90) / 90 * 0.5 + k / h * 0.6);
      game.draw.rect(x - ww / 2, baseY - h + k, ww, 10, col);
    }
  }

  function drawBg() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, STYLE.bg[0]], [0.28, STYLE.bg[1]], [0.3, STYLE.bg[2]], [1, '#0c1c12']]);
    for (var i = 0; i < 24; i++) {
      var sx = (i * 397 + 40) % W, sy = 250 + (i * 131) % (H * 0.12);
      game.draw.rect(sx, sy, 6, 6, '#ffffff', 0.25 + 0.25 * Math.sin(t * 2 + i));
    }
    for (var p = 0; p < 8; p++) pine(60 + p * 140 + (p % 2) * 24, H * 0.30, 170 + (p % 3) * 50, 130, '#08140e');
    var glow = 0.07 + 0.03 * Math.sin(t * 7) + (fever ? 0.05 : 0);
    game.draw.circle(FIRE.x, FIRE.y + 60, 560, STYLE.main[0], glow);
    game.draw.circle(FIRE.x, FIRE.y + 60, 340, STYLE.main[0], glow);
    for (var j = 0; j < 4; j++) {
      var lx = j < 2 ? W * 0.12 : W * 0.88, ly = H * (0.42 + (j % 2) * 0.12);
      outlineLine(lx - 60, ly, lx + 60, ly, '#6a4426', 34);
    }
  }

  function drawFire() {
    var t = game.time.elapsed;
    var s = fever ? 1.35 : 1;
    outlineLine(FIRE.x - 130, FIRE.y + 80, FIRE.x + 130, FIRE.y + 40, '#7a4a28', 30);
    outlineLine(FIRE.x + 130, FIRE.y + 80, FIRE.x - 130, FIRE.y + 40, '#5a3418', 30);
    var L = [[0, 95, STYLE.accent[1]], [-60, 70, STYLE.main[0]], [-108, 46, STYLE.main[1]], [-142, 24, '#fff6c0']];
    var i;
    for (i = 0; i < L.length; i++) {
      game.draw.circle(FIRE.x + Math.sin(t * 9 + i * 1.7) * 10, FIRE.y + L[i][0] * s, L[i][1] * s * (1 + 0.08 * Math.sin(t * 11 + i)) + 8, INK);
    }
    for (i = 0; i < L.length; i++) {
      game.draw.circle(FIRE.x + Math.sin(t * 9 + i * 1.7) * 10, FIRE.y + L[i][0] * s, L[i][1] * s * (1 + 0.08 * Math.sin(t * 11 + i)), L[i][2]);
    }
    for (var k = 0; k < 6; k++) {
      var up = (t * 140 + k * 61) % 300;
      game.draw.rect(FIRE.x - 80 + k * 32 + Math.sin(t * 3 + k) * 20, FIRE.y - 120 * s - up, 8, 8, STYLE.main[1], 1 - up / 300);
    }
  }

  function limb(ax, ay, bx, by, cx, cy, col, w) {
    game.draw.line(ax, ay, bx, by, INK, w + 12);
    game.draw.line(bx, by, cx, cy, INK, w + 12);
    game.draw.line(ax, ay, bx, by, col, w);
    game.draw.line(bx, by, cx, cy, col, w);
  }

  function drawDancer(d, x, y, s, pal, isLeader, sad, hl) {
    var p = d.cur;
    var lean = p.lean * 34 * s;
    var groundY = y + 125 * s;
    var legLen = (95 - 45 * p.squat) * s;
    var hipY = groundY - legLen;
    var tw = 78 * s, th = 92 * s;
    var cx = x + lean * 0.6;
    var ty = hipY - th;
    if (d.flash > 0 || hl) game.draw.circle(x, y, (hl ? 190 : 160) * s, STYLE.accent[0], hl ? 0.5 : 0.3);
    game.draw.circle(x, groundY + 8, 64 * s, '#000000', 0.35);
    var kneeOut = (18 + 46 * p.squat) * s, footOut = (28 + 36 * p.squat) * s, kneeY = hipY + legLen * 0.5;
    limb(x - 16 * s, hipY, x - kneeOut, kneeY, x - footOut, groundY, pal.pants, 22 * s);
    limb(x + 16 * s, hipY, x + kneeOut, kneeY, x + footOut, groundY, pal.pants, 22 * s);
    game.draw.rect(cx - tw / 2 - 7, ty - 7, tw + 14, th + 14, INK);
    game.draw.rect(cx - tw / 2, ty, tw, th, pal.shirt);
    game.draw.rect(cx + tw * 0.12, ty, tw * 0.38, th, pal.shirtDark);
    var shY = ty + 16 * s, al = 80 * s;
    var shL = cx - 34 * s, shR = cx + 34 * s;
    var lhx = shL - Math.sin(p.la) * al, lhy = shY + Math.cos(p.la) * al;
    var rhx = shR + Math.sin(p.ra) * al, rhy = shY + Math.cos(p.ra) * al;
    outlineLine(shL, shY, lhx, lhy, pal.sleeve, 20 * s);
    outlineLine(shR, shY, rhx, rhy, pal.sleeve, 20 * s);
    game.draw.circle(lhx, lhy, 17 * s, INK); game.draw.circle(lhx, lhy, 12 * s, pal.hand);
    game.draw.circle(rhx, rhy, 17 * s, INK); game.draw.circle(rhx, rhy, 12 * s, pal.hand);
    var blink = Math.floor(game.time.elapsed * 1.3 + (isLeader ? 0.5 : 0)) % 4 === 0;
    var face = sad ? FACE_SAD : (d.flash > 0 || blink) ? FACE_B : FACE_A;
    var bob = Math.sin(game.time.elapsed * 4 + (isLeader ? 1 : 0)) * 3;
    game.draw.sprite(face, pal.face, x + lean, ty - 44 * s + bob, 11 * s, { anchor: 'center' });
    if (isLeader) game.draw.sprite(HAT, { k: INK, g: '#5a7a3a', y: STYLE.main[1] }, x + lean, ty - 92 * s + bob, 11 * s, { anchor: 'center' });
  }

  function drawMoveIcon(m, x, y, px, col, alpha) {
    if (!m) return;
    var spr = m === 'clap' ? STAR : (m === 'up' || m === 'down') ? ARROW_UP : ARROW_R;
    game.draw.sprite(spr, { k: INK, f: col }, x, y, px, { anchor: 'center', flipX: m === 'left', flipY: m === 'down', alpha: alpha });
  }

  function drawTurnUi(showHl) {
    var t = game.time.elapsed;
    var e = EX[ex];
    // たいまつ = 手番。リーダー側(上)⇔ 自分側(下)を行き来する
    var ty = LEADER.y + (KID.y - LEADER.y) * torchK;
    game.draw.circle(TORCH_X, ty - 40, 90, STYLE.main[0], 0.18 + 0.08 * Math.sin(t * 9));
    game.draw.sprite(Math.floor(t * 8) % 2 ? TORCH_A : TORCH_B, TORCH_PAL, TORCH_X, ty, 16, { anchor: 'center' });
    // リーダーの見せた振り(光るアイコン)と手数の灯
    if (ember.t > 0) {
      var pop = 1 + Math.max(0, ember.t - 0.45) * 3;
      game.draw.circle(SIDE_X, LEADER.y - 40, 92 * pop, STYLE.main[1], 0.25);
      drawMoveIcon(ember.dir, SIDE_X, LEADER.y - 40, 17 * pop, STYLE.main[1], 1);
    }
    if (e) {
      for (var i = 0; i < e.moves.length; i++) {
        var litL = phase === 'lead' ? i < leadIdx + (leadSub === 'feint' ? 0 : 1) : phase !== 'idle';
        game.draw.circle(SIDE_X - (e.moves.length - 1) * 34 + i * 68, LEADER.y + 80, 22, INK);
        game.draw.circle(SIDE_X - (e.moves.length - 1) * 34 + i * 68, LEADER.y + 80, 15, litL ? STYLE.main[1] : '#3a3a4a');
        var litK = (phase === 'echo' || phase === 'stop') ? i < echoIdx : phase === 'back';
        game.draw.circle(SIDE_X - (e.moves.length - 1) * 34 + i * 68, KID.y + 10, 22, INK);
        game.draw.circle(SIDE_X - (e.moves.length - 1) * 34 + i * 68, KID.y + 10, 15, litK ? STYLE.main[2] : '#3a3a4a');
      }
    }
    // 自分の番: 足もとのマットが光り、返す時間の輪が縮む
    var mine = phase === 'echo';
    game.draw.circle(W / 2, MAT_Y, 214, INK, 0.6);
    game.draw.circle(W / 2, MAT_Y, 200, mine ? '#3a2a18' : '#1a2a1e', 1);
    if (mine) {
      var k = Math.max(0, echoT / echoMax);
      game.draw.circle(W / 2, MAT_Y, 200, STYLE.main[0], 0.18 + 0.1 * Math.sin(t * 12));
      for (var a = 0; a < 40; a++) {
        if (a / 40 > k) break;
        var ang = -Math.PI / 2 + (a / 40) * Math.PI * 2;
        game.draw.circle(W / 2 + Math.cos(ang) * 186, MAT_Y + Math.sin(ang) * 186, 11, k < 0.3 ? STYLE.accent[1] : STYLE.main[1]);
      }
    }
    for (var q = 0; q < 4; q++) {
      var dv = DIRV[MOVES[q]];
      game.draw.circle(W / 2 + dv.x * 120, MAT_Y + dv.y * 120, 12, STYLE.accent[0], mine ? 0.6 : 0.2);
    }
    game.draw.circle(W / 2, MAT_Y, 16, STYLE.accent[0], mine ? 0.6 : 0.2);
    // 失敗の因果: 求められた振り(白)と返した振り(赤)
    if (showHl && fail) {
      game.draw.circle(SIDE_X, LEADER.y - 40, 100, STYLE.accent[0], 0.55);
      drawMoveIcon(fail.want, SIDE_X, LEADER.y - 40, 19, STYLE.accent[0], 1);
      if (fail.got) {
        game.draw.circle(SIDE_X, KID.y - 150, 84, STYLE.accent[1], 0.5);
        drawMoveIcon(fail.got, SIDE_X, KID.y - 150, 15, STYLE.accent[1], 1);
      }
    }
  }

  function drawStage(hl, sad) {
    drawBg();
    drawDancer(leader, LEADER.x, LEADER.y, 0.95, PAL_LEADER, true, false, false);
    drawFire();
    drawDancer(kid, KID.x, KID.y, 1.15, PAL_KID, false, sad, hl);
    drawTurnUi(hl);
  }

  function drawHud() {
    write(echoed + ' / ' + NEEDED, W / 2, 96, 52, STYLE.accent[0]);
    write(String(score), W - 130, 96, 34, STYLE.main[1]);
    for (var i = 0; i < LIVES; i++) {
      game.draw.sprite(MALLOW, { k: INK, w: '#fff4e8', b: '#8a5a30' }, 70 + i * 66, 96, 10, { anchor: 'center', alpha: i < lives ? 1 : 0.2 });
    }
    var bw = W - 160;
    var low = left < 5 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(80, 166, bw, 18, INK, 0.85);
    game.draw.rect(80, 166, bw * Math.max(0, left / TIME_LIMIT), 18, low ? STYLE.accent[1] : STYLE.main[0], 1);
    if (fever) write('FEVER', W / 2, 214, 30, STYLE.main[0]);
  }

  game.onUpdate(function(dt) {
    stepDancer(leader, dt);
    stepDancer(kid, dt);

    if (state === STATE.ATTRACT) {
      stepDemo(dt);
      drawStage(stopT > 0, false);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press > 0, scale: 15 });
      var bob = Math.sin(game.time.elapsed * 2) * 6;
      write(GAME_TITLE, W / 2, H * 0.07 + bob, 72, STYLE.main[0]);
      write('HI-SCORE ' + Math.round(game.best || 0), W / 2, H * 0.115, 32, STYLE.accent[0]);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) write('► 100円 投入 ◄', W / 2, H * 0.975, 40, STYLE.main[1]);
      else write('INSERT COIN', W / 2, H * 0.975, 32, STYLE.accent[0]);
      return;
    }

    if (state === STATE.RESULT) {
      celebT -= dt;
      if (cleared && celebT <= 0) {
        celebT = 0.35;
        game.fx.burst(game.random(W * 0.15, W * 0.85), game.random(H * 0.25, H * 0.55), { color: game.random(0, 1) < 0.5 ? STYLE.main[1] : STYLE.main[0], count: 12, speed: 360 });
      }
      if (cleared) { leader.target = Math.floor(game.time.elapsed * 3) % 2 ? 'up' : 'clap'; kid.target = Math.floor(game.time.elapsed * 3) % 2 ? 'clap' : 'up'; }
      else { kid.target = 'down'; leader.target = 'idle'; }
      drawStage(false, !cleared);
      write(cleared ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 76, cleared ? STYLE.main[1] : STYLE.accent[1]);
      write(echoed + ' / ' + NEEDED, W / 2, H * 0.125, 44, STYLE.accent[0]);
      write('SCORE ' + score, W / 2, H * 0.16, 36, STYLE.accent[0]);
      if (!cleared) write('あと' + (NEEDED - echoed) + '回!', W / 2, H * 0.195, 36, STYLE.main[0]);
      else write('PERFECT ' + perfects, W / 2, H * 0.195, 32, STYLE.main[1]);
      if (score > bestAtStart && score > 0) write('NEW RECORD', W / 2, H * 0.23, 34, Math.floor(game.time.elapsed * 4) % 2 ? STYLE.main[1] : STYLE.accent[0]);
      else write('BEST ' + Math.round(game.best || 0), W / 2, H * 0.23, 28, STYLE.accent[0]);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) write('TAP TO CONTINUE', W / 2, H * 0.975, 32, STYLE.accent[0]);
      return;
    }

    // ── PLAYING ──
    if (fadeT > 0) {
      fadeT -= dt;
      if (fadeT <= 0) {
        state = STATE.RESULT;
        var stats = { echoed: echoed, perfect: perfects, lives: lives };
        if (cleared) game.end.success(score, stats); else game.end.failure(stats);
        if (cleared && score > bestAtStart) game.audio.play('se_milestone', 0.5);
      }
    } else if (holdT > 0) {
      holdT -= dt;
      if (holdT <= 0) fadeT = 1.0;
    } else if (count > 0) {
      count -= dt;
      if (count <= 0) { on = true; game.audio.play('se_tap', 0.35); beginExchange(true); }
    } else if (on) {
      if (stopT > 0) {
        stopT -= dt;
        if (stopT <= 0) { fail = null; ex++; beginExchange(true); }
      } else {
        left -= dt;
        var ev = stepTurns(dt, true);
        if (ev === 'late') missEcho('', true);
        else if (ev === 'next') { ex++; beginExchange(true); }
        if (on && !hurried && left < 5) { hurried = true; startBgm(true); }
        if (on && left <= 0) {
          left = 0; cleared = false;
          fail = { want: EX[ex].moves[Math.min(echoIdx, EX[ex].moves.length - 1)], got: '' };
          game.feedback.bad(KID.x, KID.y - 60, { text: 'TIME UP', shake: 10 });
          finishRun();
        }
      }
    }

    drawStage((stopT > 0 || holdT > 0) && !cleared, false);
    drawHud();
    if (count > 0) write(count > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.575, 84, STYLE.main[1]);
  });

  game.onStart(function() {
    startBgm(false);
    state = STATE.ATTRACT;
    initGame();
  });
})(game);
