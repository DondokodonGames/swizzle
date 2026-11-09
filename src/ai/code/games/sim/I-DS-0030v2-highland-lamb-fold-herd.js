// I-DS-0030v2-highland-lamb-fold-herd.js
// 子羊おいこみ — 牧羊犬を回り込ませて子羊の逃げる向きを決め、石積みの囲いの入口へ押し込む
// 操作: 画面のどこかを押して指をずらすと、ずらした向きへ牧羊犬が走る(離すと止まる。押した所に輪が出る)。子羊は犬から真反対へ逃げるので、入れたい向きの反対側へ回り込んでから近づく。子羊が森の縁(手前の左右の辺)の外へ出ると逃げられる(社内メモ。画面には出さない)
// 終わり: 子羊を4頭囲いに入れればCLEAR。森へ2頭逃がす、または23秒を超えるとGAME OVER
// @mechanic: push_out
// @theme: highland_pasture_sheepdog_fold
// 世界観: 霧の降りる前の高原の放牧地で、若い牧羊犬が散らばった子羊の背後へ回り込み、逃げる向きを読んで石積みの囲いの入口へ一頭ずつ押し込んでいく
// 残るもの: 正誤(CLEAR/GAME OVER) + 囲いに入れた頭数・逃がした頭数・スコア
// スタイル: 80s ISO

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 80s ISO: 菱形グリッドの床、高さは影の距離で示す(奥ほど小さくしない)
  var STYLE = { bg: ['#2a3a5a', '#4a6a7a'], main: ['#7ac860', '#4a9a4a', '#a8a090'], accent: ['#ff4a4a', '#fff4d8'] };
  var C = {
    grass: STYLE.main[0], grassDk: STYLE.main[1], stone: STYLE.main[2], stoneDk: '#6a6458', red: STYLE.accent[0], cream: STYLE.accent[1],
    ink: '#1a1a24', wood: '#2a5a3a', woodHi: '#3a7a4a', dirt: '#8a6a4a', gold: '#ffd84a',
  };

  var GAME_TITLE = 'HERD DOG';
  var TIME_LIMIT = 23;
  var NEEDED = 4;
  var MISS_MAX = 2;
  var KX = 0.52, KY = 0.46, OX = W / 2, OY = 330;
  var PEN = 260;
  var FLEE_R = 330;
  var GOAL = { x: 130, y: 200 };
  var ROUNDS = [
    { lambs: [[620, 640]], gate: [55, 205], jink: 0, sp: 1.0 },
    { lambs: [[780, 330]], gate: [65, 195], jink: 0.35, sp: 1.08 },
    { lambs: [[540, 760], [760, 540]], gate: [70, 190], jink: 0.5, sp: 1.12 },
    { lambs: [[360, 800]], gate: [80, 180], jink: 0.75, sp: 1.2 },
  ];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var mode = S.ATTRACT;

  var dog, lambs, round, rcfg, roundGap, stick, penned, lost, score, finalScore, timeLeft, readyT, stopT, stopKind, culprit, fin, cleared, postT, warnT, stepT, joyT, milestone, elapsedP, roundT;

  var DOG_A = ['..........', 'kk......kk', 'kwk....kwk', 'kkkkkkkkkk', '.kwwkkkkkk', '..wwwkkkk.', '..k.k..k.k', '.k..k..k..'];
  var DOG_B = ['..........', 'kk......kk', 'kwk....kwk', 'kkkkkkkkkk', '.kwwkkkkkk', '..wwwkkkk.', '..kk...kk.', '..k....k..'];
  var DOG_SIT = ['kk........', 'kwk.......', 'kkkk......', 'kwwkk.....', '.wwwkkk...', '.wwkkkkk..', '.kk.kkkkk.', '.kk.kk.kk.'];
  var DOG_PAL = { k: '#1a1a24', w: '#fff4d8' };
  var LAMB_A = ['..wwww..', '.wwwwwww', 'kkwwwwww', 'kekwwwww', '.kkwwww.', '..k..k..'];
  var LAMB_B = ['..wwww..', '.wwwwwww', 'kkwwwwww', 'kekwwwww', '.kkwwww.', '.k....k.'];
  var LAMB_SCARED = ['.w.ww.w.', '.wwwwwww', 'kkwwwwww', 'kxkwwwww', '.kkwwww.', 'k......k'];
  var LAMB_PAL = { w: '#fff4d8', k: '#3a3030', e: '#fff4d8', x: '#ff4a4a' };
  var TREE = ['...gg...', '..gggg..', '.gggggg.', 'gggggggg', '.gggggg.', '...tt...', '...tt...'];
  var HEART = ['.r.r.', 'rrrrr', '.rrr.', '..r..'];

  function out(str, x, y, sz, color) {
    game.draw.text(str, x + 4, y + 4, { size: sz, color: '#00000088', bold: true, align: 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: 'center' });
  }
  function iso(wx, wy) { return { x: OX + (wx - wy) * KX, y: OY + (wx + wy) * KY }; }
  function unIsoDelta(dx, dy) { return { x: (dx / KX + dy / KY) / 2, y: (dy / KY - dx / KX) / 2 }; }

  function setupRound(k) {
    round = k; rcfg = ROUNDS[Math.min(k, ROUNDS.length - 1)]; roundGap = 0; roundT = 0;
    // 囲いに入った子羊は残して見せる
    lambs = (k > 0 && lambs) ? lambs.filter(function(o) { return o.state === 'in'; }) : [];
    for (var i = 0; i < rcfg.lambs.length; i++) {
      var p = rcfg.lambs[i], x = p[0], y = p[1];
      if (Math.hypot(x - dog.x, y - dog.y) < 320) { var t = x; x = y; y = t; }
      lambs.push({ x: x, y: y, vx: 0, vy: 0, wa: game.random(0, 6.28), jinkT: 0.6, jx: 0, jy: 0, jt: 0, state: 'free', t: 0, warned: false, scared: 0 });
    }
  }

  function initGame() {
    dog = { x: 880, y: 860, vx: 0, vy: 0, run: 0, face: 1 };
    stick = null; penned = 0; lost = 0; score = 0; finalScore = 0;
    timeLeft = TIME_LIMIT; readyT = 0.8; stopT = 0; stopKind = ''; culprit = null; fin = false; cleared = false;
    postT = 0; warnT = 0; stepT = 0; joyT = 0; milestone = false; elapsedP = 0;
    setupRound(0);
  }

  // 犬の移動: スティック(押した所からのずれ)を画面の向き→地面の向きに直して走る
  function driveDog(dx, dy, dt) {
    var len = Math.hypot(dx, dy);
    var tvx = 0, tvy = 0;
    if (len > 14) {
      var wv = unIsoDelta(dx / len, dy / len), wl = Math.hypot(wv.x, wv.y) || 1;
      var sp = 640 * Math.min(1, len / 110);
      tvx = wv.x / wl * sp; tvy = wv.y / wl * sp;
    }
    dog.vx += (tvx - dog.vx) * Math.min(1, dt * 10);
    dog.vy += (tvy - dog.vy) * Math.min(1, dt * 10);
    dog.x = Math.max(0, Math.min(1000, dog.x + dog.vx * dt));
    dog.y = Math.max(0, Math.min(1000, dog.y + dog.vy * dt));
    var spd = Math.hypot(dog.vx, dog.vy);
    dog.run = spd;
    var sdx = (dog.vx - dog.vy) * KX;
    if (Math.abs(sdx) > 20) dog.face = sdx > 0 ? 1 : -1;
    return spd;
  }

  function blockWalls(l, px, py) {
    var g0 = rcfg.gate[0], g1 = rcfg.gate[1];
    // 囲いの横壁(x=PEN)と前壁(y=PEN、入口だけ開いている)
    if (l.y < PEN && ((px >= PEN && l.x < PEN) || (px < PEN && l.x >= PEN))) { l.x = px; l.vx *= -0.3; }
    if (l.x < PEN && ((py >= PEN && l.y < PEN) || (py < PEN && l.y >= PEN)) && !(l.x > g0 + 20 && l.x < g1 - 20)) { l.y = py; l.vy *= -0.3; }
    if (l.x < 0) { l.x = 0; l.vx = Math.abs(l.vx) * 0.3; }
    if (l.y < 0) { l.y = 0; l.vy = Math.abs(l.vy) * 0.3; }
  }

  function stepLambs(dt) {
    var alive = 0;
    for (var i = 0; i < lambs.length; i++) {
      var l = lambs[i];
      l.t += dt;
      if (l.scared > 0) l.scared -= dt;
      if (l.state !== 'free') continue;
      alive++;
      var dx = l.x - dog.x, dy = l.y - dog.y, d = Math.hypot(dx, dy) || 1;
      var maxS = 430 * rcfg.sp, tx, ty;
      if (d < FLEE_R) {
        var k = 0.35 + 0.65 * (1 - d / FLEE_R);
        tx = dx / d * maxS * k; ty = dy / d * maxS * k;
        if (l.scared <= 0) { l.scared = 0.6; game.audio.tone(880 + Math.random() * 200, 0.05, { wave: 'triangle', volume: 0.04, slide: 200 }); }
        // 跳ねる子羊: 時々横へ跳ぶ
        l.jinkT -= dt;
        if (rcfg.jink > 0 && l.jinkT <= 0) {
          l.jinkT = game.random(0.5, 0.9);
          var s = Math.random() < 0.5 ? -1 : 1;
          l.jx = -dy / d * s * maxS * rcfg.jink; l.jy = dx / d * s * maxS * rcfg.jink; l.jt = 0.28;
        }
      } else {
        l.wa += game.random(-1.5, 1.5) * dt;
        tx = Math.cos(l.wa) * 60; ty = Math.sin(l.wa) * 60;
      }
      if (l.jt > 0) { l.jt -= dt; tx += l.jx; ty += l.jy; }
      l.vx += (tx - l.vx) * Math.min(1, dt * 5);
      l.vy += (ty - l.vy) * Math.min(1, dt * 5);
      var px = l.x, py = l.y;
      l.x += l.vx * dt; l.y += l.vy * dt;
      blockWalls(l, px, py);
      // 囲いに入った
      if (l.x < PEN - 30 && l.y < PEN - 40) {
        l.state = 'in'; l.t = 0; penned++; joyT = 0.6;
        var quick = roundT < 4;
        var pts = quick ? 400 : 250;
        score += pts;
        var p = iso(l.x, l.y);
        game.feedback.good(p.x, p.y - 60, { text: quick ? 'PERFECT' : 'GOOD', color: C.gold, size: 58 });
        game.audio.play('se_coin', 0.4);
        game.fx.popup('+' + pts, p.x + 120, p.y - 140, { color: C.cream, size: 44 });
        if (mode === S.PLAYING && !milestone && penned >= 2) {
          milestone = true;
          game.audio.play('se_milestone', 0.5);
          game.fx.popup('NICE', W / 2, H * 0.2, { color: C.gold, size: 84 });
        }
        if (mode === S.PLAYING && penned >= NEEDED && stopT <= 0) { stopT = 0.45; stopKind = 'win'; game.audio.play('se_powerup', 0.45); }
        continue;
      }
      // 森の縁: 近づくと警告、越えたら逃げられる
      var edge = Math.max(l.x, l.y);
      if (edge > 830 && !l.warned) { l.warned = true; game.audio.tone('E6', 0.1, { wave: 'square', volume: 0.07 }); }
      if (edge < 780) l.warned = false;
      if (edge > 1000) {
        l.state = 'lost'; l.t = 0; lost++;
        var q = iso(l.x, l.y);
        game.audio.play('se_break', 0.3);
        if (mode === S.PLAYING && lost >= MISS_MAX) {
          stopT = 0.5; stopKind = 'lost'; culprit = l;
          game.fx.flash('#ffffff', 0.2);
        } else game.feedback.bad(q.x, q.y - 60, { text: 'MISS', color: C.red, size: 58 });
      }
    }
    return alive;
  }

  function stepWorld(dt, sx, sy) {
    roundT += dt;
    if (joyT > 0) joyT -= dt;
    var spd = driveDog(sx, sy, dt);
    if (spd > 200) { stepT -= dt; if (stepT <= 0) { stepT = 0.16; game.audio.tone('C3', 0.03, { wave: 'triangle', volume: 0.04 }); } }
    var alive = stepLambs(dt);
    if (alive === 0 && stopT <= 0) {
      roundGap += dt;
      if (roundGap > 0.6 && round < ROUNDS.length - 1) { setupRound(round + 1); game.audio.play('se_jump', 0.3); }
    }
  }

  function ending(win) {
    if (fin) return;
    fin = true; cleared = win; postT = 1.4;
    finalScore = score + (win ? Math.ceil(timeLeft) * 50 + (lost === 0 ? 300 : 0) : 0);
    game.audio.stopBgm();
    game.audio.play(win ? 'se_success' : 'se_failure', 0.55);
    if (win) {
      for (var i = 0; i < 6; i++) game.fx.burst(150 + i * 155, H * 0.35 + (i % 2) * 160, { color: i % 2 ? C.gold : C.cream, count: 18, speed: 520 });
      game.fx.flash(C.cream, 0.25);
    }
  }

  function canPlay() { return mode === S.PLAYING && !fin && stopT <= 0 && readyT <= 0; }

  game.onPress(function(x, y) {
    if (!canPlay()) return;
    stick = { x0: x, y0: y, x: x, y: y };
    game.audio.play('se_tap', 0.2);
    game.fx.burst(x, y, { color: C.cream, count: 5, speed: 140 });
  });
  game.onMove(function(x, y) {
    if (!stick) return;
    stick.x = x; stick.y = y;
    if (Math.random() < 0.08) game.audio.tone(330 + Math.hypot(x - stick.x0, y - stick.y0), 0.02, { wave: 'triangle', volume: 0.025 });
  });
  game.onRelease(function(x, y) {
    if (!stick) return;
    stick = null;
    game.audio.tone('G3', 0.05, { wave: 'triangle', volume: 0.05 });
  });
  game.onTap(function(x, y) {
    if (mode === S.ATTRACT) { game.audio.play('se_coin'); mode = S.PLAYING; initGame(); return; }
    if (mode === S.RESULT) { game.audio.play('se_tap'); mode = S.ATTRACT; initGame(); demo.t = 0; return; }
  });

  // ---- 描画 ----
  function field(t) {
    game.draw.gradient(0, H, [[0, '#8ab0c8'], [0.18, '#c8d8d8'], [0.2, STYLE.bg[1]], [1, STYLE.bg[0]]]);
    // 遠景の山並み
    for (var m = 0; m < 6; m++) game.draw.circle(m * 220, 420, 200 + (m % 2) * 60, '#6a8a9a', 0.6);
    // 菱形の牧草地(横1pxストリップ)
    var top = OY, mid = OY + 1000 * KY, bot = OY + 2000 * KY;
    for (var y = top; y < bot; y += 6) {
      var hw = (y < mid ? (y - top) : (bot - y)) / KY * KX;
      game.draw.rect(OX - hw, y, hw * 2, 6, Math.floor((y - top) / 46) % 2 ? C.grass : '#86d06a');
    }
    // 菱形グリッド
    for (var i = 0; i <= 10; i++) {
      var a = iso(i * 100, 0), b = iso(i * 100, 1000), c = iso(0, i * 100), d = iso(1000, i * 100);
      game.draw.line(a.x, a.y, b.x, b.y, C.grassDk, 2);
      game.draw.line(c.x, c.y, d.x, d.y, C.grassDk, 2);
    }
    // 森の縁(逃げられる所): 子羊が近いと赤く瞬く
    var hot = false;
    for (var k = 0; k < lambs.length; k++) if (lambs[k].state === 'free' && Math.max(lambs[k].x, lambs[k].y) > 830) hot = true;
    var on = hot && Math.floor(t * 12) % 2 === 0;
    for (var s = 0; s <= 20; s++) {
      var p1 = iso(1000, s * 50), p2 = iso(s * 50, 1000);
      game.draw.circle(p1.x, p1.y, 18, on ? C.red : C.grassDk, on ? 0.7 : 0.6);
      game.draw.circle(p2.x, p2.y, 18, on ? C.red : C.grassDk, on ? 0.7 : 0.6);
    }
    // 囲いの床(土)と光る入口
    for (var yy = 0; yy < PEN; yy += 10) {
      var l = iso(0, yy), r = iso(PEN, yy);
      game.draw.line(l.x, l.y, r.x, r.y, C.dirt, 12);
    }
    var g0 = iso(rcfg.gate[0], PEN), g1 = iso(rcfg.gate[1], PEN);
    var pulse = 0.4 + Math.sin(t * 6) * 0.25;
    game.draw.line(g0.x, g0.y, g1.x, g1.y, C.cream, 16);
    game.draw.circle((g0.x + g1.x) / 2, (g0.y + g1.y) / 2, 50, C.gold, pulse * 0.6);
  }

  function wallStone(wx, wy) {
    var p = iso(wx, wy);
    game.draw.rect(p.x - 18, p.y - 46, 36, 46, C.stoneDk);
    game.draw.rect(p.x - 18, p.y - 56, 36, 14, C.stone);
  }

  function drawObjects(t) {
    var list = [];
    // 囲いの石垣
    for (var s = 0; s <= PEN; s += 26) {
      list.push({ d: PEN + s, f: wallStone, a: PEN, b: s });
      if (s < rcfg.gate[0] || s > rcfg.gate[1]) list.push({ d: s + PEN, f: wallStone, a: s, b: PEN });
    }
    for (var i = 0; i < lambs.length; i++) list.push({ d: lambs[i].x + lambs[i].y, lamb: lambs[i] });
    list.push({ d: dog.x + dog.y, dogp: true });
    for (var tr = 0; tr <= 10; tr++) {
      list.push({ d: 1060 + tr * 100, tree: iso(1060, tr * 100) });
      list.push({ d: 1060 + tr * 100, tree: iso(tr * 100, 1060) });
    }
    list.sort(function(p, q) { return p.d - q.d; });
    for (var k = 0; k < list.length; k++) {
      var o = list[k];
      if (o.f) o.f(o.a, o.b);
      else if (o.tree) game.draw.sprite(TREE, { g: k % 3 ? C.wood : C.woodHi, t: C.dirt }, o.tree.x, o.tree.y - 50 + Math.sin(t + k) * 2, 14, { anchor: 'center' });
      else if (o.lamb) drawLamb(o.lamb, t);
      else drawDog(t);
    }
  }

  function drawLamb(l, t) {
    var p = iso(l.x, l.y);
    if (l.state === 'lost') {
      var a = Math.max(0, 1 - l.t / 1.0);
      var big = culprit === l && stopT > 0;
      var hl = big && Math.floor(t * 16) % 2 === 0;
      var q = iso(l.x + l.vx * l.t * 0.5, l.y + l.vy * l.t * 0.5);
      game.draw.sprite(LAMB_SCARED, hl ? { w: '#ffffff', k: '#ffffff', e: '#ffffff', x: '#ffffff' } : LAMB_PAL, q.x, q.y - 30, big ? 22 : 11, { anchor: 'center', alpha: big ? 1 : a });
      if (big) game.draw.circle(q.x, q.y - 30, 90 + (0.5 - stopT) * 200, C.red, 0.25);
      return;
    }
    var hop = l.state === 'in' ? -Math.abs(Math.sin(t * 6 + l.x)) * 14 : -Math.abs(Math.sin(l.t * 12)) * (Math.hypot(l.vx, l.vy) > 100 ? 14 : 3);
    game.draw.circle(p.x, p.y, 30, '#000000', 0.25);
    var fr = l.state === 'free' && l.scared > 0 ? LAMB_SCARED : (Math.floor(l.t * 8) % 2 ? LAMB_A : LAMB_B);
    var sdx = (l.vx - l.vy) * KX;
    game.draw.sprite(fr, LAMB_PAL, p.x, p.y - 30 + hop, 11, { anchor: 'center', flipX: sdx > 0 });
    if (l.state === 'in') game.draw.sprite(HEART, { r: C.red }, p.x, p.y - 90 + Math.sin(t * 4) * 6, 8, { anchor: 'center' });
    if (l.state === 'free' && Math.max(l.x, l.y) > 830 && Math.floor(t * 12) % 2 === 0) {
      game.draw.rect(p.x - 6, p.y - 150, 12, 44, C.red); game.draw.rect(p.x - 6, p.y - 98, 12, 12, C.red);
    }
  }

  function drawDog(t) {
    var p = iso(dog.x, dog.y);
    var moving = dog.run > 60;
    var fr = moving ? (Math.floor(t * 12) % 2 ? DOG_A : DOG_B) : DOG_SIT;
    var hop = moving ? -Math.abs(Math.sin(t * 14)) * 10 : Math.sin(t * 3) * 2;
    if (fin && cleared) hop = -Math.abs(Math.sin(t * 10)) * 30;
    game.draw.circle(p.x, p.y, 34, '#000000', 0.3);
    game.draw.circle(p.x, p.y, FLEE_R * KX * 0.95, C.cream, 0.05);
    game.draw.sprite(fr, DOG_PAL, p.x, p.y - 34 + hop, 12, { anchor: 'center', flipX: dog.face < 0 });
  }

  function drawStick(sx, sy, press) {
    if (!press) { game.draw.circle(W / 2, H * 0.84, 120, C.cream, 0.08); game.draw.circle(W / 2, H * 0.84, 50, C.cream, 0.15); return; }
    var dx = sx.x - sx.x0, dy = sx.y - sx.y0, len = Math.hypot(dx, dy), k = len > 120 ? 120 / len : 1;
    game.draw.circle(sx.x0, sx.y0, 120, C.cream, 0.18);
    game.draw.circle(sx.x0 + dx * k, sx.y0 + dy * k, 54, C.cream, 0.55);
    game.draw.line(sx.x0, sx.y0, sx.x0 + dx * k, sx.y0 + dy * k, C.cream, 8);
  }

  function drawHud(t) {
    var low = timeLeft < 4 && Math.floor(t * 6) % 2 === 0;
    game.draw.rect(0, 0, W, 220, '#1a1a24', 0.5);
    game.draw.rect(70, 40, W - 140, 28, '#00000066');
    game.draw.rect(76, 46, (W - 152) * Math.max(0, timeLeft / TIME_LIMIT), 16, low ? C.red : C.cream);
    for (var n = 0; n < NEEDED; n++) game.draw.sprite(LAMB_A, n < penned ? LAMB_PAL : { w: '#ffffff40', k: '#ffffff40', e: '#ffffff40' }, 300 + n * 110, 150, 9, { anchor: 'center' });
    out(penned + ' / ' + NEEDED, 140, 165, 44, C.cream);
    for (var m = 0; m < MISS_MAX; m++) game.draw.circle(W - 110 - m * 64, 150, 22, m < lost ? C.red : '#ffffff40');
  }

  function drawScene(t) {
    field(t);
    drawObjects(t);
    for (var sl = 0; sl < H; sl += 8) game.draw.rect(0, sl, W, 2, '#000000', 0.06);
  }

  // ---- ATTRACT: 本物の driveDog/stepLambs をゴーストのスティックで動かす。1頭目は回り込んで囲いへ、2頭目は逆側から追って森へ逃がす ----
  var demo = { t: 0, st: { x0: W / 2, y0: H * 0.84, x: W / 2, y: H * 0.84 }, press: false };
  function herdVec(l, gx, gy) {
    var ax = l.x - gx, ay = l.y - gy, al = Math.hypot(ax, ay) || 1;
    var want = Math.atan2(ay, ax), cur = Math.atan2(dog.y - l.y, dog.x - l.x);
    var diff = Math.atan2(Math.sin(want - cur), Math.cos(want - cur));
    var tx, ty;
    if (Math.abs(diff) > 0.5) { var a = cur + (diff > 0 ? 0.8 : -0.8); tx = l.x + Math.cos(a) * 360; ty = l.y + Math.sin(a) * 360; }
    else { tx = l.x + ax / al * 170; ty = l.y + ay / al * 170; }
    return { x: tx - dog.x, y: ty - dog.y };
  }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 9;
    if (cyc < dt || demo.t <= dt) { initGame(); readyT = 0; }
    var target = null;
    for (var i = 0; i < lambs.length; i++) if (lambs[i].state === 'free') { target = lambs[i]; break; }
    var sx = 0, sy = 0;
    demo.press = false;
    if (target && cyc > 0.4) {
      var v = round === 0 ? herdVec(target, GOAL.x, GOAL.y) : herdVec(target, 1500, target.y);
      var vl = Math.hypot(v.x, v.y);
      if (vl > 30) {
        var sv = { x: (v.x - v.y) * KX, y: (v.x + v.y) * KY }, svl = Math.hypot(sv.x, sv.y) || 1;
        sx = sv.x / svl * 110; sy = sv.y / svl * 110;
        demo.press = true;
      }
    }
    demo.st.x += (demo.st.x0 + sx - demo.st.x) * Math.min(1, dt * 8);
    demo.st.y += (demo.st.y0 + sy - demo.st.y) * Math.min(1, dt * 8);
    stepWorld(dt, demo.press ? demo.st.x - demo.st.x0 : 0, demo.press ? demo.st.y - demo.st.y0 : 0);
    if (round > 1) { /* デモは2頭目まで */ lambs = []; }
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;

    if (mode === S.ATTRACT) {
      stepDemo(dt);
      drawScene(t);
      drawStick(demo.st, demo.press);
      game.draw.hand(demo.st.x, demo.st.y, { press: demo.press, scale: 13 });
      game.draw.rect(0, 0, W, 240, '#1a1a24', 0.5);
      out(GAME_TITLE, W / 2, 120 + Math.sin(t * 2) * 5, 104, C.gold);
      out('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, 200, 40, C.cream);
      if (Math.floor(t * 1.8) % 2 === 0) out('► 100円 投入 ◄', W / 2, H * 0.965, 46, C.cream);
      else out('TAP TO START', W / 2, H * 0.965, 42, C.gold);
      return;
    }

    if (mode === S.RESULT) {
      stepWorld(dt, 0, 0);
      drawScene(t);
      game.draw.rect(90, H * 0.3, W - 180, 480, '#1a1a24', 0.88);
      out(cleared ? 'CLEAR' : (timeLeft <= 0 ? 'TIME UP' : 'GAME OVER'), W / 2, H * 0.36, 96, cleared ? C.gold : C.red);
      out('SCORE ' + finalScore, W / 2, H * 0.42, 60, C.cream);
      out(penned + ' / ' + NEEDED + '   MISS ' + lost, W / 2, H * 0.47, 42, C.grass);
      if (cleared && finalScore > game.best) out('NEW RECORD', W / 2, H * 0.52, 56, C.red);
      else out('BEST ' + Math.max(game.best, finalScore), W / 2, H * 0.52, 42, C.cream);
      if (!cleared) out('あと' + Math.max(1, NEEDED - penned) + '頭!', W / 2, H * 0.27, 64, C.red);
      if (Math.floor(t * 2) % 2 === 0) out('TAP TO CONTINUE', W / 2, H * 0.965, 40, C.cream);
      return;
    }

    // ---- PLAYING ----
    var sx = stick ? stick.x - stick.x0 : 0, sy = stick ? stick.y - stick.y0 : 0;
    if (fin) {
      postT -= dt;
      if (postT <= 0) {
        mode = S.RESULT;
        var stats = { penned: penned, lost: lost };
        if (cleared) game.end.success(finalScore, stats);
        else game.end.failure(stats);
      }
    } else if (stopT > 0) {
      stopT -= dt;
      if (stopT <= 0) {
        if (stopKind === 'win') ending(true);
        else {
          var cp = culprit ? iso(culprit.x, culprit.y) : iso(dog.x, dog.y);
          game.feedback.bad(cp.x, cp.y - 60, { text: stopKind === 'time' ? 'TIME UP' : 'MISS', color: C.red, size: 62 });
          ending(false);
        }
      }
    } else if (readyT > 0) {
      readyT -= dt;
      if (readyT <= 0) game.audio.play('se_tap', 0.4);
    } else {
      timeLeft -= dt; elapsedP += dt;
      stepWorld(dt, sx, sy);
      if (timeLeft < 4) {
        warnT -= dt;
        if (warnT <= 0) { warnT = 0.5; game.audio.tone(timeLeft < 2 ? 'A5' : 'E5', 0.06, { wave: 'square', volume: 0.07 }); }
      }
      if (timeLeft <= 0 && stopT <= 0) { timeLeft = 0; stick = null; stopT = 0.45; stopKind = 'time'; game.audio.tone('C4', 0.3, { wave: 'square', volume: 0.1, slide: -120 }); }
    }

    drawScene(t);
    drawStick(stick, !!stick);
    if (stopT > 0 && stopKind === 'win') { var gp = iso(GOAL.x, GOAL.y); game.draw.circle(gp.x, gp.y, 100 + (0.45 - stopT) * 1500, C.cream, 0.3); }
    // 開始直後のお手本: 押して上へずらす手
    if (!fin && readyT <= 0 && elapsedP < 1.6 && !stick) {
      var g = (elapsedP * 1.3) % 1;
      game.draw.hand(W / 2 - g * 80, H * 0.84 - g * 110, { press: true, scale: 11, alpha: 0.5 });
    }
    drawHud(t);
    if (readyT > 0) out(readyT > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.3, 120, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([
      ['G4', 0.5], ['B4', 0.5], ['D5', 0.5], ['G5', 0.5], ['E5', 1], ['D5', 1],
      ['C5', 0.5], ['E5', 0.5], ['D5', 0.5], ['B4', 0.5], ['A4', 2],
      ['B4', 0.5], ['D5', 0.5], ['G5', 1], ['F#5', 0.5], ['E5', 0.5], ['D5', 1], ['G4', 1],
    ], { tempo: 144, wave: 'square', volume: 0.05, loop: true, bass: [['G2', 1], ['D3', 1], ['C3', 1], ['D3', 1]] });
    mode = S.ATTRACT;
    initGame();
  });
})(game);
