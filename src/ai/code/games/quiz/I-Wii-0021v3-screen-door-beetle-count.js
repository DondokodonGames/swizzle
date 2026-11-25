// I-Wii-0021v3-screen-door-beetle-count.js
// 網戸のカブトムシ数え — 揺れる灯りに寄ってきて網戸にとまるカブトムシだけを数え、下の桟の数字まで灯りをずらして答える
// 操作: 見ている間は触らない(灯りが揺れて虫が寄ってくる)。灯りが下の桟に降りたら、指で押さえて左右にずらし、数えた数の目盛りで離すと答えになる(目盛りを直接タップしてもよい)
// 終わり: 3夜(虫が増え、ガやクワガタが混ざり、とまる時間が短くなる)を答え切ればCLEAR。数え違い/答えそびれが2回でGAME OVER
// @mechanic: counting
// @theme: summer_screen_door_beetles
// 世界観: 夏の夜、縁側の網戸の前で、虫好きの少女が吊るした灯りを揺らし、寄ってきて網戸にとまるカブトムシだけを数え(ガやクワガタは数えない)、桟の目盛りに灯りを掛けて頭数を記録する
// 残るもの: 正誤(CLEAR/GAME OVER) + 正しく数えた夜の数・スコア
// スタイル: TOON SHADE

(function (game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // TOON SHADE: 黒の太い輪郭+明暗2色だけの塗り
  var STYLE = { bg: ['#14243a', '#0a1220'], main: ['#ffcf4a', '#8a4a20', '#3a8a5a'], accent: ['#ff5a5a', '#ffffff'] };
  var LAMP = STYLE.main[0], BROWN = STYLE.main[1], LEAF = STYLE.main[2], RED = STYLE.accent[0], WHITE = STYLE.accent[1];
  var INK = '#101010';

  var TITLE = 'BEETLE COUNT';
  var TIME_LIMIT = 15;
  var NIGHTS = 3;
  var LIVES = 2;
  var MESH_T = Math.round(H * 0.14), MESH_B = Math.round(H * 0.6);
  var MESH_L = 70, MESH_R = W - 70;
  var PIV_X = W / 2, PIV_Y = MESH_T - 10, ROPE = 470;
  var RAIL_Y = Math.round(H * 0.86);
  var PEGS = 9;
  var ANSWER_TIME = 2.6;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var KABUTO = [
    ['.....kk.....', '....kHHk....', '....kHHk....', '...kkHHkk...', 'k.kBBBBBBk.k', '.kBBBBBBBBk.', 'kkBBbBBbBBkk', '.kBBbBBbBBk.', 'kkBBbBBbBBkk', '.kBBBbbBBBk.', '..kBBBBBBk..', '...kkkkkk...'],
    ['.....kk.....', '....kHHk....', '....kHHk....', '...kkHHkk...', '.kkBBBBBBkk.', 'k.kBBBBBBk.k', '.kBBbBBbBBk.', 'kkBBbBBbBBkk', '.kBBbBBbBBk.', 'kkBBBbbBBBkk', '..kBBBBBBk..', '...kkkkkk...'],
  ];
  var KUWA = [
    ['..kk....kk..', '..kHk..kHk..', '...kHkkHk...', '...kkHHkk...', '..kBBBBBBk..', '.kBBBBBBBBk.', 'kkBBbBBbBBkk', '.kBBbBBbBBk.', 'kkBBbBBbBBkk', '.kBBBBBBBBk.', '..kkkkkkkk..'],
    ['.kk......kk.', '.kHk....kHk.', '..kHk..kHk..', '...kkHHkk...', '..kBBBBBBk..', 'k.kBBBBBBk.k', '.kBBbBBbBBk.', 'kkBBbBBbBBkk', '.kBBbBBbBBk.', 'kkBBBBBBBBkk', '..kkkkkkkk..'],
  ];
  var MOTH = [
    ['kk.......kk', 'kWWk...kWWk', 'kWWWkkkWWWk', 'kWwWkBkWwWk', '.kWWkBkWWk.', '..kkkBkkk..', '....kkk....'],
    ['...........', 'kkk.....kkk', 'kWWWkkkWWWk', 'kWwWkBkWwWk', 'kWWWkBkWWWk', '.kkkkBkkkk.', '....kkk....'],
  ];
  var KPAL = { k: INK, H: '#5a2a10', B: '#a8602a', b: '#6a3416' };
  var QPAL = { k: INK, H: '#3a2a1a', B: '#4a3a2a', b: '#2a2018' };
  var MPAL = { k: INK, W: '#e8dcc0', w: '#b8a888', B: '#8a7a5a' };
  var GIRL = [
    ['...hhhh...', '..hhhhhh..', '..hffffh..', '..fkffkf..', '...fmmf...', '..yyyyyy..', '.yyRyyRyy.', 'f.yyyyyy.f', '..yyyyyy..', '..yyyyyy..', '...f..f...'],
    ['...hhhh...', '..hhhhhh..', '..hffffh..', '..fkffkf..', '...fmmf...', '..yyyyyy..', 'fyyRyyRyy.', '..yyyyyy.f', '..yyyyyy..', '..yyyyyy..', '...f..f...'],
  ];
  var GPAL = { h: '#202020', f: '#ffd8b8', k: INK, m: '#d0405a', y: '#5a8ad8', R: '#ff8ab0' };
  var CAGE = ['.kkkk.', 'kgkgkk', 'kgkgkk', 'kgkgkk', 'kkkkkk'];

  function txt(s, x, y, sz, col) {
    var o = { size: sz, color: INK, bold: true, align: 'center' };
    game.draw.text(s, x - 4, y, o); game.draw.text(s, x + 4, y, o); game.draw.text(s, x, y - 4, o); game.draw.text(s, x, y + 5, o);
    game.draw.text(s, x, y, { size: sz, color: col, bold: true, align: 'center' });
  }
  function toonRect(x, y, w, h, light, dark) {
    game.draw.rect(x - 6, y - 6, w + 12, h + 12, INK);
    game.draw.rect(x, y, w, h, light);
    game.draw.rect(x, y + h * 0.6, w, h * 0.4, dark);
  }

  // ── 灯りの揺れ(本番もデモも同じ振り子) ──
  function lampPos(t, amp) {
    var a = Math.sin(t * Math.PI * 2 / 1.7) * amp;
    return { x: PIV_X + Math.sin(a) * ROPE, y: PIV_Y + Math.cos(a) * ROPE };
  }

  // ── 1夜の段取り ──
  function makeNight(n) {
    var obs = [2.5, 2.7, 2.9][n];
    var beetles = [2 + Math.floor(Math.random() * 2), 3 + Math.floor(Math.random() * 2), 4 + Math.floor(Math.random() * 3)][n];
    var moths = [1, 2, 2][n], kuwa = [0, 1, 2][n];
    var stay = [1.3, 1.1, 0.85][n];
    var list = [];
    function add(type, k) { list.push({ type: type, land: 0.25 + (obs - 1.3) * k, stay: stay * (0.85 + Math.random() * 0.3) }); }
    var total = beetles + moths + kuwa, order = [];
    for (var i = 0; i < beetles; i++) order.push('kabuto');
    for (var j = 0; j < moths; j++) order.push('moth');
    for (var q = 0; q < kuwa; q++) order.push('kuwa');
    for (var s = order.length - 1; s > 0; s--) { var r = Math.floor(Math.random() * (s + 1)); var tmp = order[s]; order[s] = order[r]; order[r] = tmp; }
    for (var o = 0; o < order.length; o++) add(order[o], o / Math.max(1, total - 1) + (Math.random() - 0.5) * 0.08);
    // 3夜目: 2匹同時にとまる
    if (n === 2 && list.length > 3) list[2].land = list[1].land;
    for (var b = 0; b < list.length; b++) {
      var lp = lampPos(list[b].land, 0.55);
      var bug = list[b];
      bug.x = Math.max(MESH_L + 70, Math.min(MESH_R - 70, lp.x + (Math.random() - 0.5) * 260));
      bug.y = Math.max(MESH_T + 90, Math.min(MESH_B - 80, lp.y - 120 + (Math.random() - 0.5) * 300));
      bug.fromX = Math.random() < 0.5 ? -80 : W + 80;
      bug.fromY = MESH_T + Math.random() * 300;
      bug.toX = bug.x + (bug.fromX < 0 ? 400 : -400);
    }
    // 同時に網戸にいる虫どうしが重ならないようにずらす
    for (var u = 0; u < list.length; u++) {
      for (var v = 0; v < u; v++) {
        var A = list[u], B = list[v];
        var overlap = A.land < B.land + B.stay + 0.3 && B.land < A.land + A.stay + 0.3;
        if (overlap && Math.abs(A.x - B.x) < 170 && Math.abs(A.y - B.y) < 150) {
          A.x = B.x + (B.x < W / 2 ? 230 : -230);
          A.toX = A.x + (A.fromX < 0 ? 400 : -400);
        }
      }
    }
    return { obs: obs, list: list, beetles: beetles };
  }

  function drawYard(t) {
    game.draw.gradient(0, H, [[0, STYLE.bg[0]], [0.6, STYLE.bg[1]], [1, '#2a1a12']]);
    game.draw.circle(W * 0.78, H * 0.2, 60, '#fff2b0');
    game.draw.circle(W * 0.78, H * 0.2, 46, '#ffe680');
    // 庭木のシルエット(輪郭つき)
    for (var i = 0; i < 4; i++) {
      var tx = 120 + i * 280, ty = H * 0.42 + (i % 2) * 40;
      game.draw.circle(tx, ty, 150, INK);
      game.draw.circle(tx, ty, 140, '#16301e');
      game.draw.circle(tx - 30, ty - 40, 80, '#1e4028');
    }
    for (var f = 0; f < 6; f++) {
      var fx = (f * 173 + t * 20) % W, fy = H * 0.3 + Math.sin(t * 2 + f) * 120 + f * 40;
      game.draw.circle(fx, fy, 5, '#d8ff8a');
    }
  }

  function drawMesh(lp, k) {
    // 灯りの当たる網戸(光の輪)
    game.draw.circle(lp.x, lp.y - 100, 330, '#ffcf4a10');
    game.draw.circle(lp.x, lp.y - 100, 230, '#ffcf4a18');
    game.draw.circle(lp.x, lp.y - 100, 140, '#ffe68a20');
    for (var x = MESH_L; x <= MESH_R; x += 36) game.draw.line(x, MESH_T, x, MESH_B, '#6a7a8a55', 2);
    for (var y = MESH_T; y <= MESH_B; y += 36) game.draw.line(MESH_L, y, MESH_R, y, '#6a7a8a55', 2);
    // 窓枠(太い輪郭+2色)
    toonRect(MESH_L - 40, MESH_T - 40, MESH_R - MESH_L + 80, 34, '#c8925a', '#8a5a30');
    toonRect(MESH_L - 40, MESH_B + 6, MESH_R - MESH_L + 80, 40, '#c8925a', '#8a5a30');
    toonRect(MESH_L - 40, MESH_T - 6, 34, MESH_B - MESH_T + 12, '#c8925a', '#8a5a30');
    toonRect(MESH_R + 6, MESH_T - 6, 34, MESH_B - MESH_T + 12, '#c8925a', '#8a5a30');
  }

  function bugArt(type, fr) {
    if (type === 'kabuto') return { art: KABUTO[fr], pal: KPAL, px: 9 };
    if (type === 'kuwa') return { art: KUWA[fr], pal: QPAL, px: 9 };
    return { art: MOTH[fr], pal: MPAL, px: 9 };
  }

  function drawBugs(night, t, lp) {
    for (var i = 0; i < night.list.length; i++) {
      var b = night.list[i];
      var a = bugArt(b.type, Math.floor(t * 10 + i) % 2);
      var bx, by, alpha = 1;
      if (t < b.land - 0.5 || t > b.land + b.stay + 0.6) continue;
      if (t < b.land) {
        var k = 1 - (b.land - t) / 0.5;
        bx = b.fromX + (b.x - b.fromX) * k; by = b.fromY + (b.y - b.fromY) * k - Math.sin(k * Math.PI) * 80;
      } else if (t < b.land + b.stay) {
        bx = b.x; by = b.y;
        a = bugArt(b.type, b.type === 'moth' ? Math.floor(t * 6) % 2 : 0);
        if (t - b.land < 0.12) game.draw.circle(bx, by, 70 * (t - b.land) / 0.12, '#ffffff55');
      } else {
        var k2 = (t - b.land - b.stay) / 0.6;
        bx = b.x + (b.toX - b.x) * k2; by = b.y - k2 * 500;
      }
      var d = Math.sqrt((bx - lp.x) * (bx - lp.x) + (by - lp.y + 100) * (by - lp.y + 100));
      alpha = d < 300 ? 1 : 0.6;
      game.draw.sprite(a.art, a.pal, bx, by, a.px, { anchor: 'center', alpha: alpha });
    }
  }

  function drawLamp(x, y, swingT, hl) {
    game.draw.line(x, y - 60, x, y - 60 - (hl === 'rail' ? 50 : 0), INK, 6);
    var sc = 1 + (hl === 'hit' ? 0.4 : 0);
    game.draw.circle(x, y, 58 * sc, INK);
    game.draw.circle(x, y, 50 * sc, hl === 'hit' ? WHITE : LAMP);
    game.draw.circle(x - 12, y - 14, 18 * sc, '#fff6c8');
    game.draw.rect(x - 30, y - 70 * sc, 60, 18, INK);
  }

  function drawRail(sel, live, ansK) {
    toonRect(60, RAIL_Y - 20, W - 120, 40, '#c8925a', '#8a5a30');
    for (var i = 0; i < PEGS; i++) {
      var px = pegX(i);
      var on = i === sel;
      game.draw.circle(px, RAIL_Y, on ? 30 : 22, INK);
      game.draw.circle(px, RAIL_Y, on ? 22 : 15, on ? LAMP : (live ? '#f4e2b8' : '#a8907a'));
      txt(String(i), px, RAIL_Y + 80, 48, on ? LAMP : WHITE);
    }
    if (ansK !== null) {
      // 答えの残り時間(桟の上の縮むバー)
      game.draw.rect(80, RAIL_Y - 70, (W - 160) * ansK, 14, ansK < 0.3 ? RED : LEAF);
    }
  }
  function pegX(i) { return 120 + i * ((W - 240) / (PEGS - 1)); }
  function nearestPeg(x) {
    var best = 0, bd = 1e9;
    for (var i = 0; i < PEGS; i++) { var d = Math.abs(x - pegX(i)); if (d < bd) { bd = d; best = i; } }
    return best;
  }

  function drawGirl(t, happy) {
    var fr = Math.floor(t * (happy ? 6 : 2)) % 2;
    game.draw.sprite(GIRL[fr], GPAL, W * 0.14, H * 0.7 + (happy ? -Math.abs(Math.sin(t * 8)) * 30 : 0), 12, { anchor: 'center' });
  }

  function drawLineup(night, k, okCol) {
    // 答え合わせ: とまったカブトムシだけを桟の上に順に並べて見せる
    var n = Math.min(night.beetles, Math.floor(k));
    for (var i = 0; i < n; i++) {
      var x = W / 2 - (night.beetles - 1) * 60 + i * 120;
      game.draw.sprite(KABUTO[0], KPAL, x, H * 0.69, 8, { anchor: 'center' });
    }
    if (k >= night.beetles) txt(String(night.beetles), W / 2, H * 0.64, 70, okCol);
  }

  // ── ゲーム状態 ──
  var nightNo, night, phase, phaseT, sel, holding, lives, rightN, timeLeft, ready, over, won, endT, score, prevBest, lastTickPeg;

  function initGame() {
    nightNo = 0; lives = LIVES; rightN = 0; timeLeft = TIME_LIMIT; ready = 0.8;
    over = false; won = false; endT = 0; score = 0; prevBest = game.best || 0;
    startNight();
  }
  function startNight() {
    night = makeNight(nightNo); phase = 'watch'; phaseT = 0; sel = -1; holding = false; lastTickPeg = -1;
  }
  function finish(ok) {
    if (over) return;
    over = true; won = ok; endT = 1.5;
    if (ok) score += Math.floor(timeLeft * 30) + lives * 150;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.55);
  }

  function submit() {
    if (phase !== 'answer') return;
    holding = false;
    if (sel === night.beetles) {
      rightN++;
      score += 200 + Math.floor((ANSWER_TIME - phaseT) * 80) + nightNo * 100;
      game.feedback.good(pegX(sel), RAIL_Y - 140, { text: 'GOOD', color: LAMP, count: 14 });
      if (rightN === 2) { game.fx.popup(rightN + ' / ' + NIGHTS, W / 2, H * 0.36, { color: LAMP, size: 64 }); game.audio.play('se_milestone', 0.4); }
      phase = 'reveal'; phaseT = 0;
    } else {
      game.audio.tone('D3', 0.1, { wave: 'square', volume: 0.08 });
      phase = 'stop'; phaseT = 0;
    }
  }

  game.onTap(function (x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.45); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.2); state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (phase === 'watch' && !over && ready <= 0) game.audio.tone('C4', 0.03, { wave: 'sine', volume: 0.03 });
  });
  game.onPress(function (x, y) {
    if (state !== S.PLAYING || over || ready > 0 || phase !== 'answer') return;
    if (y < H * 0.62) { game.audio.tone('C4', 0.03, { wave: 'sine', volume: 0.03 }); return; }
    holding = true;
    sel = nearestPeg(x); lastTickPeg = sel;
    game.audio.play('se_tap', 0.25);
  });
  game.onMove(function (x, y) {
    if (!holding || state !== S.PLAYING || phase !== 'answer') return;
    sel = nearestPeg(x);
    if (sel !== lastTickPeg) { lastTickPeg = sel; game.audio.tone(330 + sel * 40, 0.03, { wave: 'square', volume: 0.04 }); }
  });
  game.onRelease(function (x, y) {
    if (!holding || state !== S.PLAYING) return;
    sel = nearestPeg(x);
    game.audio.tone(330 + sel * 40, 0.06, { wave: 'triangle', volume: 0.07 });
    submit();
  });

  // ── ATTRACT ゴースト実演: 見て数える → 灯りを桟の目盛りへずらして離す(偶数周は正解、奇数周は1つ多く答えて失敗) ──
  var demo = { t: 0, night: null, n: 0, phase: 'watch', pt: 0, sel: 0, gx: W / 2, gy: H * 0.9, press: false, judged: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 5.4;
    if (cyc < dt || demo.t <= dt || !demo.night) {
      demo.n = Math.floor(demo.t / 5.4);
      demo.night = makeNight(0); demo.night.obs = 2.5; demo.phase = 'watch'; demo.pt = 0; demo.sel = 0; demo.judged = false;
    }
    demo.pt = cyc;
    var want = demo.night.beetles + (demo.n % 2 === 1 ? 1 : 0);
    if (cyc < demo.night.obs) { demo.phase = 'watch'; demo.press = false; demo.gx += (W * 0.86 - demo.gx) * dt * 3; demo.gy += (H * 0.93 - demo.gy) * dt * 3; }
    else if (cyc < demo.night.obs + 1.3) {
      demo.phase = 'answer';
      var k = (cyc - demo.night.obs) / 1.3;
      demo.press = k > 0.15;
      var tx = k < 0.15 ? pegX(0) : pegX(0) + (pegX(want) - pegX(0)) * Math.min(1, (k - 0.15) / 0.7);
      demo.gx += (tx - demo.gx) * Math.min(1, dt * 10); demo.gy += (RAIL_Y + 10 - demo.gy) * Math.min(1, dt * 8);
      demo.sel = nearestPeg(demo.gx);
    } else {
      demo.phase = 'reveal'; demo.press = false;
      if (!demo.judged) {
        demo.judged = true; demo.sel = want;
        if (want === demo.night.beetles) game.feedback.good(pegX(want), RAIL_Y - 140, { text: 'GOOD', color: LAMP, count: 10, volume: 0.2 });
        else game.feedback.bad(pegX(want), RAIL_Y - 140, { text: 'MISS', volume: 0.2, shake: 4 });
      }
    }
  }

  function drawScene(nt, t, ph, selPeg, ansK, revealK, hl) {
    var lp = ph === 'watch' ? lampPos(t, 0.55) : { x: pegX(Math.max(0, selPeg)), y: RAIL_Y - 120 };
    drawYard(game.time.elapsed);
    drawMesh(ph === 'watch' ? lp : { x: W / 2, y: H * 0.4 }, 0);
    if (ph === 'watch') drawBugs(nt, t, lp);
    if (ph === 'watch') game.draw.line(PIV_X, PIV_Y, lp.x, lp.y - 60, INK, 6);
    drawLamp(lp.x, lp.y, t, hl ? 'hit' : (ph === 'watch' ? null : 'rail'));
    drawGirl(game.time.elapsed, ph === 'reveal' && revealK >= nt.beetles && selPeg === nt.beetles);
    drawRail(selPeg, ph === 'answer', ansK);
    if (ph === 'reveal' || ph === 'stop') drawLineup(nt, revealK, selPeg === nt.beetles ? LAMP : RED);
  }

  function drawHud() {
    for (var i = 0; i < NIGHTS; i++) {
      var x = 110 + i * 110;
      game.draw.circle(x, 90, 40, INK);
      game.draw.circle(x, 90, 32, i < nightNo || (i === nightNo && (phase === 'reveal')) ? LAMP : '#3a4a5a');
    }
    for (var l = 0; l < LIVES; l++) game.draw.sprite(CAGE, { k: INK, g: l < lives ? LEAF : '#5a5a5a' }, W - 300 + l * 110, 90, 12, { anchor: 'center' });
    txt(String(score), W / 2, 90, 48, LAMP);
    var fr = Math.max(0, timeLeft / TIME_LIMIT);
    game.draw.rect(60, 176, W - 120, 20, INK);
    game.draw.rect(64, 180, (W - 128) * fr, 12, timeLeft < 4 && Math.floor(game.time.elapsed * 6) % 2 === 0 ? RED : WHITE);
  }

  function drawResult() {
    toonRect(90, H * 0.2, W - 180, 380, '#1e2a40', '#16203a');
    txt(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.2 + 80, 96, won ? LAMP : RED);
    txt(rightN + ' / ' + NIGHTS, W / 2, H * 0.2 + 170, 52, WHITE);
    if (score > prevBest && prevBest > 0) txt('NEW RECORD ' + score, W / 2, H * 0.2 + 250, 48, LAMP);
    else txt('SCORE ' + score + '  BEST ' + Math.max(prevBest, score), W / 2, H * 0.2 + 250, 40, WHITE);
    if (!won) txt('あと' + (NIGHTS - rightN) + '夜!', W / 2, H * 0.2 + 330, 52, RED);
  }

  game.onUpdate(function (dt) {
    var t = game.time.elapsed;
    if (state === S.ATTRACT) {
      stepDemo(dt);
      var dk = demo.phase === 'reveal' ? (demo.pt - demo.night.obs - 1.3) / 0.18 : 0;
      drawScene(demo.night, demo.pt, demo.phase, demo.phase === 'watch' ? -1 : demo.sel, demo.phase === 'answer' ? 1 - (demo.pt - demo.night.obs) / ANSWER_TIME : null, dk, false);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 14 });
      txt(TITLE, W / 2, H * 0.05, 84, LAMP);
      txt('HI-SCORE ' + (game.best || 0), W / 2, H * 0.1, 38, WHITE);
      if (Math.floor(t * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.975, 42, LAMP);
      else txt('TAP TO START', W / 2, H * 0.975, 40, WHITE);
      return;
    }
    if (state === S.RESULT) {
      drawYard(t); drawMesh({ x: W / 2, y: H * 0.4 }, 0); drawGirl(t, won);
      drawResult();
      if (Math.floor(t * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.975, 36, WHITE);
      return;
    }

    // ── PLAYING ──
    if (over) {
      endT -= dt;
      if (endT <= 0) {
        state = S.RESULT;
        var stats = { nights: rightN, lives: lives };
        if (won) game.end.success(score, stats); else game.end.failure(stats);
      }
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_jump', 0.25);
    } else {
      phaseT += dt;
      if (phase === 'watch' || phase === 'answer') timeLeft -= dt;
      if (phase === 'watch') {
        for (var i = 0; i < night.list.length; i++) {
          var b = night.list[i];
          if (phaseT - dt < b.land && phaseT >= b.land) game.audio.tone(b.type === 'kabuto' ? 'G3' : 'C5', 0.05, { wave: b.type === 'moth' ? 'sine' : 'square', volume: 0.05 });
        }
        if (phaseT >= night.obs) { phase = 'answer'; phaseT = 0; sel = 0; game.audio.play('se_powerup', 0.25); }
      } else if (phase === 'answer') {
        if (phaseT >= ANSWER_TIME) { holding = false; sel = -1; phase = 'stop'; phaseT = 0; game.audio.tone('A2', 0.2, { wave: 'square', volume: 0.06 }); }
      } else if (phase === 'stop') {
        if (phaseT >= 0.45) {
          lives--;
          game.feedback.bad(sel >= 0 ? pegX(sel) : W / 2, RAIL_Y - 140, { text: 'MISS' });
          game.audio.play('se_break', 0.25);
          phase = 'reveal'; phaseT = 0;
        }
      } else if (phase === 'reveal') {
        var cnt = Math.floor(phaseT / 0.16);
        if (cnt <= night.beetles && Math.floor((phaseT - dt) / 0.16) !== cnt && cnt > 0) game.audio.tone(392 + cnt * 50, 0.06, { wave: 'triangle', volume: 0.06 });
        if (phaseT >= 0.16 * night.beetles + 0.6) {
          if (lives <= 0) finish(false);
          else if (nightNo + 1 >= NIGHTS) finish(true);
          else { nightNo++; startNight(); }
        }
      }
      if (timeLeft <= 0 && !over) { timeLeft = 0; game.feedback.bad(W / 2, H * 0.4, { text: 'TIME UP' }); finish(false); }
    }

    var ansK = phase === 'answer' ? Math.max(0, 1 - phaseT / ANSWER_TIME) : null;
    var revK = phase === 'reveal' ? phaseT / 0.16 : (phase === 'stop' ? 0 : 0);
    drawScene(night, ready > 0 ? 0 : phaseT, phase, phase === 'watch' ? -1 : sel, ansK, revK, phase === 'stop' && Math.floor(t * 14) % 2 === 0);
    // 答える番の最初: 灯りが白く明滅(押さえる物の合図)
    if (phase === 'answer' && !holding && phaseT < 1 && Math.floor(t * 6) % 2 === 0) game.draw.circle(pegX(Math.max(0, sel)), RAIL_Y - 120, 80, '#ffffff44');
    drawHud();
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.4, 120, LAMP);
    if (over) drawResult();
  });

  game.onStart(function () {
    game.audio.melody([
      ['E5', 1], ['G5', 0.5], ['E5', 0.5], ['D5', 1], ['C5', 1], ['D5', 0.5], ['E5', 0.5], ['G4', 1], ['A4', 2], ['R', 1],
    ], { tempo: 90, wave: 'sine', volume: 0.05, loop: true, bass: [['A2', 2], ['E2', 2], ['F2', 2], ['E2', 2]] });
    state = S.ATTRACT;
    initGame();
  });
})(game);
