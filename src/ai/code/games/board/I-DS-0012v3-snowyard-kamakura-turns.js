// I-DS-0012v3-snowyard-kamakura-turns.js
// かまくら交互積み — 祖父と1つずつ交互に雪のブロックを積み、自分の番では下の2つに支えられた崩れない場所を見極めて置く
// 操作: 自分の番(手袋の輪が光る間)に、空いた枠をタップしてブロックを置く。下の2つがそろっていない枠・ひびの入った雪に乗る枠は崩れる(社内メモ)
// 終わり: 自分の番で6個置ければ成功。崩して手袋を3つ失う/持ち時間切れを重ねる/全体の時間切れで失敗
// @mechanic: turn_attack
// @theme: snowyard_kamakura_turns
// 世界観: 雪国の庭先で、孫が祖父と交互に雪のブロックを1つずつ積み、とけかけてひびの入った段を避けながらかまくらの壁を組み上げていく
// 残るもの: 正誤(CLEAR/GAME OVER) + 置いた個数・早置きボーナス・残った手袋
// スタイル: 70s MONO

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 70s MONO: 白ドット + 画面帯ごとの単色オーバーレイ(セロハン)。矩形波の単音、無音の間が緊張
  var STYLE = { bg: ['#000000', '#0c0c10', '#18181e'], main: ['#ffffff', '#c8c8c8', '#7a7a7a'], accent: ['#5ac8ff', '#ffb04a'] };
  var Q = {
    black: STYLE.bg[0], night: STYLE.bg[1], ground: STYLE.bg[2],
    snow: STYLE.main[0], gray: STYLE.main[1], dim: STYLE.main[2],
    blue: STYLE.accent[0], amber: STYLE.accent[1], red: '#ff5a5a',
  };

  var GAME_TITLE = 'KAMAKURA';
  var TIME_LIMIT = 26;
  var NEEDED = 6;
  var MITTENS = 3;
  var ROWS = 6;
  var BW = 150, BH = 88;
  var BASE_Y = H * 0.66;
  var CX = W / 2;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var wall, turn, turnMax, turnLeft, mine, gramps, mittens, bonus, total, warm, freezeT, done, win, outT, posted;
  var gPick, gThink, crumbs, falling, culprit, cracking, crackWait, halfShown, why, pending;

  var KID_A = ['..rrrr..', '.rrrrrr.', '.ffffff.', '.fefeff.', '..ffff..', '.bbbbbb.', 'bbbbbbbb', '.bbbbbb.', '.bb..bb.', '.kk..kk.'];
  var KID_B = ['..rrrr..', '.rrrrrr.', '.ffffff.', '.ffffff.', '..ffff..', '.bbbbbb.', 'bbbbbbbb', '.bbbbbb.', '.bb..bb.', 'kk....kk'];
  var KID_YAY = ['b.rrrr.b', 'brrrrrrb', 'bffffffb', '.fefeff.', '..fmmf..', '..bbbb..', '.bbbbbb.', '.bbbbbb.', '.bb..bb.', 'kk....kk'];
  var KID_PAL = { r: '#ffb04a', f: '#e8e8e8', e: '#000000', m: '#000000', b: '#c8c8c8', k: '#7a7a7a' };
  var GRAN_A = ['..wwww..', '.wwwwww.', '.ffffff.', '.fefeff.', '.wfffff.', '..wwww..', '.cccccc.', 'cccccccc', '.cc..cc.', '.kk..kk.'];
  var GRAN_B = ['..wwww..', '.wwwwww.', '.ffffff.', '.ffffff.', '.wfffff.', '..wwww..', '.cccccc.', 'ccccccc.', '.cc..cc.', '.kk..kk.'];
  var GRAN_PAL = { w: '#ffffff', f: '#c8c8c8', e: '#000000', c: '#5ac8ff', k: '#7a7a7a' };
  var MITT = ['.mm...', 'mmmm.m', 'mmmmmm', 'mmmmm.', '.mmmm.', '.mmmm.'];

  function shout(str, x, y, sz, col) {
    game.draw.text(str, x + 4, y + 4, { size: sz, color: Q.black, bold: true, align: 'center' });
    game.draw.text(str, x, y, { size: sz, color: col, bold: true, align: 'center' });
  }

  // ---- 壁の構造: 段rは6-r個。段rのi番は、下の段のiとi+1の2つで支えられる ----
  function count(r) { return ROWS - r; }
  function slotPos(r, i) { return { x: CX - (count(r) - 1) / 2 * BW + i * BW, y: BASE_Y - r * BH }; }

  function emptyWall() {
    var w = [];
    for (var r = 0; r < ROWS; r++) {
      var row = [];
      for (var i = 0; i < count(r); i++) row.push(r === 0 ? { who: 'base', crack: 0, warn: 0 } : null);
      w.push(row);
    }
    return w;
  }

  function supportState(r, i) {
    if (r === 0) return 'base';
    var a = wall[r - 1][i], b = wall[r - 1][i + 1];
    if (!a || !b) return 'missing';
    if (a.crack > 0 || b.crack > 0) return 'cracked';
    return 'ok';
  }

  function stableSlots() {
    var out = [];
    for (var r = 1; r < ROWS; r++) for (var i = 0; i < count(r); i++) if (!wall[r][i] && supportState(r, i) === 'ok') out.push({ r: r, i: i });
    return out;
  }

  function slotAt(x, y) {
    for (var r = 1; r < ROWS; r++) for (var i = 0; i < count(r); i++) {
      var p = slotPos(r, i);
      if (Math.abs(x - p.x) < BW / 2 && Math.abs(y - (p.y - BH / 2)) < BH / 2 + 6) return { r: r, i: i };
    }
    return null;
  }

  function initGame() {
    wall = emptyWall();
    turn = 'kid'; turnMax = 2.8; turnLeft = turnMax; mine = 0; gramps = 0; mittens = MITTENS; bonus = 0;
    total = TIME_LIMIT; warm = 0.8; freezeT = 0; done = false; win = false; outT = 0; posted = false;
    gPick = null; gThink = 0; crumbs = []; falling = null; culprit = null; cracking = null; crackWait = 2.2;
    halfShown = false; why = ''; pending = null;
  }

  // ---- 置く(本番・祖父・デモ共通) ----
  function placeAt(r, i, who) {
    var p = slotPos(r, i);
    var st = supportState(r, i);
    if (st !== 'ok') {
      falling = { x: p.x, y: p.y - BH / 2, vy: -200, t: 0 };
      var cx = p.x, cy = p.y + BH / 2;
      if (st === 'missing') {
        var a = wall[r - 1][i];
        var bp = slotPos(r - 1, a ? i + 1 : i);
        cx = bp.x; cy = bp.y - BH / 2;
      } else {
        var c1 = wall[r - 1][i];
        var q = slotPos(r - 1, c1 && c1.crack > 0 ? i : i + 1);
        cx = q.x; cy = q.y - BH / 2;
      }
      culprit = { x: cx, y: cy, t: 0.5, missing: st === 'missing' };
      game.audio.play('se_break', 0.5);
      game.feedback.bad(p.x, p.y - BH, { text: 'MISS', size: 60 });
      for (var k = 0; k < 14; k++) crumbs.push({ x: p.x + game.random(-60, 60), y: p.y - BH / 2, vx: game.random(-300, 300), vy: game.random(-500, -100), t: 0 });
      return false;
    }
    wall[r][i] = { who: who, crack: 0, warn: 0, pop: 0.3 };
    game.audio.tone(who === 'kid' ? 'C5' : 'G4', 0.07, { wave: 'square', volume: 0.1 });
    return true;
  }

  function handToGramps() {
    turn = 'gramps'; gThink = 0.85; gPick = null;
  }

  function handToKid() {
    turn = 'kid';
    turnMax = Math.max(1.8, 2.8 - mine * 0.18);
    turnLeft = turnMax;
    ensureOption();
  }

  // 置ける枠が1つも無くならないよう、祖父がひびを手で直す
  function ensureOption() {
    if (stableSlots().length > 0) return;
    for (var r = 0; r < ROWS; r++) for (var i = 0; i < count(r); i++) {
      var b = wall[r][i];
      if (b && b.crack > 0) { b.crack = 0; game.fx.burst(slotPos(r, i).x, slotPos(r, i).y - BH / 2, { color: Q.blue, count: 8, speed: 160 }); return; }
    }
  }

  function grampsStep(dt) {
    if (turn !== 'gramps') return;
    if (!gPick) {
      var list = stableSlots();
      if (!list.length) { handToKid(); return; }
      list.sort(function(a, b) { return a.r - b.r; });
      var low = list[0].r, pool = [];
      for (var k = 0; k < list.length; k++) if (list[k].r === low) pool.push(list[k]);
      gPick = pool[Math.floor(game.random(0, pool.length)) % pool.length];
    }
    if (wall[gPick.r][gPick.i] || supportState(gPick.r, gPick.i) !== 'ok') { gPick = null; return; }
    gThink -= dt;
    if (gThink <= 0) {
      placeAt(gPick.r, gPick.i, 'gramps');
      gramps++;
      game.audio.play('se_tap', 0.3);
      handToKid();
    }
  }

  // ひび: 0.6秒の予告(しずく+点滅)のあと、上に空き枠を支えている雪がひび割れる
  function crackStep(dt, live) {
    if (!live || mine < 1) return;
    if (cracking) {
      cracking.t -= dt;
      if (cracking.t <= 0) {
        var b = wall[cracking.r][cracking.i];
        if (b) { b.crack = 1; b.warn = 0; }
        game.audio.tone('D3', 0.12, { wave: 'square', volume: 0.08 });
        cracking = null;
        if (turn === 'kid') ensureOption();
      }
      return;
    }
    crackWait -= dt;
    if (crackWait > 0) return;
    crackWait = Math.max(1.4, 3 - mine * 0.25);
    var cand = [];
    for (var r = 0; r < ROWS - 1; r++) for (var i = 0; i < count(r); i++) {
      var blk = wall[r][i];
      if (!blk || blk.crack > 0) continue;
      var aboveL = i - 1 >= 0 ? wall[r + 1][i - 1] : 'x';
      var aboveR = i < count(r + 1) ? wall[r + 1][i] : 'x';
      if (aboveL === null || aboveR === null) cand.push({ r: r, i: i });
    }
    if (!cand.length) return;
    var pick = cand[Math.floor(game.random(0, cand.length)) % cand.length];
    wall[pick.r][pick.i].warn = 0.65;
    cracking = { r: pick.r, i: pick.i, t: 0.65 };
    game.audio.tone('A5', 0.05, { wave: 'square', volume: 0.06 });
  }

  function stepBits(dt) {
    for (var r = 0; r < ROWS; r++) for (var i = 0; i < count(r); i++) {
      var b = wall[r][i];
      if (b && b.pop > 0) b.pop -= dt;
      if (b && b.warn > 0) b.warn -= dt;
    }
    for (var k = crumbs.length - 1; k >= 0; k--) {
      var c = crumbs[k];
      c.t += dt; c.vy += 1600 * dt; c.x += c.vx * dt; c.y += c.vy * dt;
      if (c.t > 1.2) crumbs.splice(k, 1);
    }
    if (falling) { falling.t += dt; falling.vy += 1800 * dt; falling.y += falling.vy * dt; if (falling.t > 0.9) falling = null; }
    if (culprit) { culprit.t -= dt; if (culprit.t <= 0) culprit = null; }
  }

  function finish(ok, reason) {
    if (done) return;
    done = true; win = ok; why = reason;
    if (!freezeT) freezeT = 0.45;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.55);
    if (ok) bonus += mittens * 200 + Math.round(total * 20);
  }

  function score() { return mine * 100 + bonus; }

  function loseMitten(reason) {
    mittens--;
    freezeT = 0.45;
    if (mittens <= 0) finish(false, reason);
    else handToGramps();
  }

  // ---- 入力 ----
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) {
      if (!posted) return;
      state = S.ATTRACT; initGame(); demo.t = 0; return;
    }
    if (done || freezeT > 0) return;
    if (warm > 0 || turn !== 'kid') {
      game.audio.play('se_tap', 0.08);
      game.fx.burst(x, y, { color: Q.dim, count: 3, speed: 70 });
      return;
    }
    var s = slotAt(x, y);
    if (!s || wall[s.r][s.i]) {
      game.audio.tone('E3', 0.04, { wave: 'square', volume: 0.05 });
      game.fx.burst(x, y, { color: Q.gray, count: 4, speed: 90 });
      return;
    }
    if (placeAt(s.r, s.i, 'kid')) {
      mine++;
      var quick = turnLeft > turnMax * 0.5;
      bonus += Math.round(turnLeft * 40);
      var p = slotPos(s.r, s.i);
      game.feedback.good(p.x, p.y - BH, { text: quick ? 'PERFECT' : 'GOOD', color: quick ? Q.amber : Q.blue, size: 50 });
      if (!halfShown && mine >= NEEDED / 2) {
        halfShown = true;
        game.fx.popup('NICE', W / 2, H * 0.26, { color: Q.amber, size: 84 });
        game.audio.play('se_milestone', 0.5);
      }
      if (mine >= NEEDED) { freezeT = 0.4; culprit = { x: p.x, y: p.y - BH / 2, t: 0.5, good: true }; finish(true, 'built'); return; }
      handToGramps();
    } else {
      loseMitten('fall');
    }
  });

  // ---- 描画 ----
  var FLAKES = [];
  for (var f = 0; f < 60; f++) FLAKES.push({ x: (f * 211) % W, y: (f * 977) % H, s: 2 + (f % 3) * 2, v: 40 + (f % 5) * 22 });

  function yard() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, Q.black], [0.6, Q.night], [1, Q.ground]]);
    // 遠くの家並み(白線の屋根)
    for (var h = 0; h < 5; h++) {
      var hx = 60 + h * 220, hy = H * 0.3;
      game.draw.line(hx, hy, hx + 90, hy - 60, Q.dim, 4);
      game.draw.line(hx + 90, hy - 60, hx + 180, hy, Q.dim, 4);
      game.draw.rect(hx + 20, hy, 140, 70, Q.night);
      if (Math.floor(t * 0.5 + h) % 3) game.draw.rect(hx + 70, hy + 20, 40, 30, Q.amber, 0.35);
    }
    // 雪原
    game.draw.rect(0, BASE_Y, W, H - BASE_Y, '#202026');
    for (var d = 0; d < 30; d++) game.draw.rect((d * 137) % W, BASE_Y + 20 + (d * 61) % 400, 6, 6, Q.snow, 0.25);
    for (var i = 0; i < FLAKES.length; i++) {
      var fl = FLAKES[i];
      var y = (fl.y + t * fl.v) % H;
      var x = fl.x + Math.sin(t + i) * 20;
      game.draw.rect(x, y, fl.s, fl.s, Q.snow, 0.7);
    }
  }

  function block(x, y, b, alpha) {
    var a = alpha === undefined ? 1 : alpha;
    var grow = b && b.pop > 0 ? 1 + b.pop * 0.4 : 1;
    var w = (BW - 8) * grow, hgt = (BH - 8) * grow;
    var bx = x - w / 2, by = y - BH / 2 - hgt / 2;
    game.draw.rect(bx, by, w, hgt, b && b.who === 'gramps' ? Q.gray : Q.snow, a);
    game.draw.rect(bx, by + hgt - 10, w, 10, Q.dim, 0.6 * a);
    game.draw.rect(bx + 10, by + 8, w * 0.3, 8, Q.snow, 0.8 * a);
    if (b && b.crack > 0) {
      game.draw.line(bx + w * 0.3, by, bx + w * 0.45, by + hgt * 0.5, Q.black, 6);
      game.draw.line(bx + w * 0.45, by + hgt * 0.5, bx + w * 0.38, by + hgt, Q.black, 6);
      game.draw.line(bx + w * 0.45, by + hgt * 0.5, bx + w * 0.7, by + hgt * 0.35, Q.black, 5);
    }
    if (b && b.warn > 0 && Math.floor(b.warn * 14) % 2 === 0) {
      game.draw.rect(bx - 6, by - 6, w + 12, hgt + 12, Q.red, 0.35);
      game.draw.circle(bx + w * 0.5, by + hgt + 10 + (0.65 - b.warn) * 60, 7, Q.blue);
    }
  }

  function drawWall() {
    var kidTurn = turn === 'kid' && !done && warm <= 0;
    for (var r = 0; r < ROWS; r++) for (var i = 0; i < count(r); i++) {
      var p = slotPos(r, i);
      var b = wall[r][i];
      if (b) { block(p.x, p.y, b); continue; }
      // 空き枠: 見た目は全部同じ(支えは自分で見て判断する)
      var blink = kidTurn ? 0.35 + 0.25 * Math.sin(game.time.elapsed * 6 + r + i) : 0.15;
      game.draw.rect(p.x - BW / 2 + 8, p.y - BH + 8, BW - 16, 4, Q.snow, blink);
      game.draw.rect(p.x - BW / 2 + 8, p.y - 12, BW - 16, 4, Q.snow, blink);
      game.draw.rect(p.x - BW / 2 + 8, p.y - BH + 8, 4, BH - 16, Q.snow, blink);
      game.draw.rect(p.x + BW / 2 - 12, p.y - BH + 8, 4, BH - 16, Q.snow, blink);
    }
    // 入口のくぼみ
    game.draw.rect(CX - 60, BASE_Y - 70, 120, 70, Q.black, 0.85);
    game.draw.circle(CX, BASE_Y - 70, 60, Q.black, 0.85);
    if (falling) block(falling.x, falling.y + BH / 2, { who: 'kid' }, Math.max(0, 1 - falling.t));
    for (var k = 0; k < crumbs.length; k++) game.draw.rect(crumbs[k].x, crumbs[k].y, 12, 12, Q.snow, Math.max(0, 1 - crumbs[k].t));
    if (culprit) {
      var g = 1 + (0.5 - culprit.t) * 0.7;
      var col = culprit.good ? Q.amber : Q.snow;
      game.draw.rect(culprit.x - BW * g / 2, culprit.y - BH * g / 2, BW * g, BH * g, col, culprit.missing ? 0.3 : 0.6);
      if (culprit.missing) game.draw.rect(culprit.x - BW * g / 2, culprit.y - BH * g / 2, BW * g, 8, Q.red);
    }
    if (turn === 'gramps' && gPick && !done) {
      var gp = slotPos(gPick.r, gPick.i);
      var hov = Math.sin(game.time.elapsed * 10) * 6;
      game.draw.sprite(MITT, { m: Q.blue }, gp.x, gp.y - BH / 2 + hov - 60 * Math.max(0, gThink), 14, { anchor: 'center' });
    }
  }

  function drawFolks() {
    var t = game.time.elapsed;
    var kidOn = turn === 'kid' && !done;
    var kf = Math.floor(t * 3) % 2 === 0 ? KID_A : KID_B;
    if (done && win) kf = KID_YAY;
    var kdy = done && !win ? 24 : 0;
    game.draw.sprite(kf, KID_PAL, W * 0.12, H * 0.74 + kdy + (kidOn ? Math.sin(t * 8) * 6 : 0), 13, { anchor: 'center' });
    var gf = turn === 'gramps' && Math.floor(t * 5) % 2 === 0 ? GRAN_B : GRAN_A;
    game.draw.sprite(gf, GRAN_PAL, W * 0.88, H * 0.74 + Math.sin(t * 2) * 3, 13, { anchor: 'center', flipX: true });
    // 自分の番の輪(親指ゾーン)
    var rx = W / 2, ry = H * 0.86;
    game.draw.circle(rx, ry, 120, Q.night);
    var frac = kidOn && warm <= 0 ? turnLeft / turnMax : 0;
    var hurry = kidOn && turnLeft < 0.9 && Math.floor(t * 10) % 2 === 0;
    for (var d = 0; d < 24; d++) {
      var ang = -Math.PI / 2 + d / 24 * Math.PI * 2;
      game.draw.rect(rx + Math.cos(ang) * 100 - 8, ry + Math.sin(ang) * 100 - 8, 16, 16, d / 24 < frac ? (hurry ? Q.red : Q.amber) : Q.dim, d / 24 < frac ? 1 : 0.4);
    }
    game.draw.sprite(MITT, { m: kidOn ? Q.amber : Q.dim }, rx, ry, 22, { anchor: 'center' });
    for (var m = 0; m < MITTENS; m++) game.draw.sprite(MITT, { m: m < mittens ? Q.amber : '#303036' }, W * 0.12 + m * 70 - 70, H * 0.93, 10, { anchor: 'center' });
    game.draw.sprite(MITT, { m: Q.blue }, W * 0.88, H * 0.93, 10, { anchor: 'center' });
    game.draw.text('' + gramps, W * 0.88 + 50, H * 0.93 - 18, { size: 36, color: Q.blue, bold: true, align: 'left' });
  }

  function drawHud() {
    shout(mine + ' / ' + NEEDED, W / 2, 64, 58, Q.snow);
    game.draw.text('SCORE ' + score(), W - 40, 44, { size: 30, color: Q.gray, bold: true, align: 'right' });
    game.draw.rect(60, 124, W - 120, 18, Q.dim, 0.5);
    game.draw.rect(62, 126, (W - 124) * Math.max(0, total / TIME_LIMIT), 14, total < 5 && Math.floor(game.time.elapsed * 8) % 2 ? Q.red : Q.snow);
  }

  function cellophane() {
    game.draw.rect(0, 0, W, H * 0.24, Q.blue, 0.16);
    game.draw.rect(0, H * 0.7, W, H * 0.3, Q.amber, 0.12);
  }

  function drawResult() {
    game.draw.rect(0, H * 0.14, W, H * 0.38, Q.black, 0.75);
    shout(win ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.2, 108, win ? Q.amber : Q.red);
    shout('SCORE ' + score(), W / 2, H * 0.29, 60, Q.snow);
    shout(mine + ' / ' + NEEDED + '   x' + mittens, W / 2, H * 0.35, 44, Q.blue);
    if (win && score() > game.best) {
      if (Math.floor(outT * 4) % 2 === 0) shout('NEW RECORD', W / 2, H * 0.42, 64, Q.amber);
    } else {
      shout('BEST ' + Math.max(game.best, win ? score() : 0), W / 2, H * 0.42, 42, Q.amber);
    }
    if (!win) shout('あと' + (NEEDED - mine) + '個!', W / 2, H * 0.48, 64, Q.amber);
    if (posted && Math.floor(game.time.elapsed * 2) % 2 === 0) shout('TAP TO CONTINUE', W / 2, H * 0.975, 34, Q.snow);
  }

  // ---- ATTRACT: placeAt() を使って 支えのある枠→祖父→支えの欠けた枠(崩れる)→祖父→支えのある枠 ----
  var demo = { t: 0, gx: W / 2, gy: H * 0.8, press: false, step: 0, wait: 0 };
  var DEMO_TAPS = [{ r: 2, i: 2 }, { r: 2, i: 0 }, null];
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 8.6;
    if (cyc < dt || demo.t <= dt) {
      initGame(); warm = 0; demo.step = 0; demo.wait = 0.6; DEMO_TAPS[2] = null;
      wall[1][0] = { who: 'gramps', crack: 0, warn: 0 };
      wall[1][1] = { who: 'gramps', crack: 0, warn: 0 };
      wall[1][3] = { who: 'gramps', crack: 0, warn: 0 };
    }
    stepBits(dt);
    demo.press = false;
    if (turn === 'gramps') { grampsStep(dt); return; }
    if (demo.step >= DEMO_TAPS.length) {
      demo.gx += (W * 0.5 - demo.gx) * Math.min(1, dt * 2);
      demo.gy += (H * 0.86 - demo.gy) * Math.min(1, dt * 2);
      return;
    }
    var tgt = DEMO_TAPS[demo.step];
    if (!tgt) {
      var opts = stableSlots();
      if (!opts.length) { demo.step++; return; }
      tgt = opts[opts.length - 1];
      DEMO_TAPS[demo.step] = tgt;
    }
    var p = slotPos(tgt.r, tgt.i);
    demo.gx += (p.x - demo.gx) * Math.min(1, dt * 5);
    demo.gy += (p.y - BH / 2 - demo.gy) * Math.min(1, dt * 5);
    if (demo.wait > 0) { demo.wait -= dt; return; }
    if (Math.abs(demo.gx - p.x) < 10 && Math.abs(demo.gy - (p.y - BH / 2)) < 10) {
      demo.press = true;
      if (wall[tgt.r][tgt.i]) { demo.step++; return; }
      var ok = placeAt(tgt.r, tgt.i, 'kid');
      if (ok) game.fx.burst(p.x, p.y - BH, { color: Q.amber, count: 10, speed: 200 });
      demo.step++; demo.wait = 0.5;
      handToGramps();
    }
  }

  // ---- メインループ ----
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      stepDemo(dt);
      yard();
      drawWall();
      drawFolks();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 14 });
      shout(GAME_TITLE, W / 2, H * 0.08 + Math.sin(game.time.elapsed * 2) * 5, 100, Q.snow);
      shout('HI-SCORE ' + game.best, W / 2, H * 0.135, 40, Q.amber);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) shout('► 100円 投入 ◄', W / 2, H * 0.975, 44, Q.amber);
      else shout('TAP TO START', W / 2, H * 0.975, 40, Q.snow);
      cellophane();
      return;
    }

    if (state === S.RESULT) {
      outT += dt;
      stepBits(dt);
      yard(); drawWall(); drawFolks(); drawHud();
      if (win && Math.floor(outT * 6) !== Math.floor((outT - dt) * 6)) {
        game.fx.burst(game.random(160, W - 160), game.random(H * 0.25, H * 0.55), { color: [Q.snow, Q.amber, Q.blue][Math.floor(game.random(0, 3)) % 3], count: 16, speed: 420 });
      }
      drawResult();
      cellophane();
      if (!posted && outT >= 1.3) {
        posted = true;
        var st = { placed: mine, gramps: gramps, mittens: mittens, bonus: bonus };
        if (win) game.end.success(score(), st); else game.end.failure(st);
      }
      return;
    }

    if (freezeT > 0) {
      freezeT -= dt;
      if (culprit) culprit.t = Math.max(0.08, culprit.t - dt * 0.3);
      if (freezeT <= 0 && done) { state = S.RESULT; outT = 0; }
    } else if (done) {
      state = S.RESULT; outT = 0;
    } else if (warm > 0) {
      warm -= dt;
      if (warm <= 0) game.audio.play('se_tap', 0.4);
    } else {
      total -= dt;
      stepBits(dt);
      grampsStep(dt);
      crackStep(dt, true);
      if (turn === 'kid') {
        var before = turnLeft;
        turnLeft -= dt;
        if (turnLeft < 0.9 && Math.floor(before * 5) !== Math.floor(turnLeft * 5)) game.audio.tone('E6', 0.04, { wave: 'square', volume: 0.07 });
        if (turnLeft <= 0) {
          turnLeft = 0;
          culprit = { x: W / 2, y: H * 0.86, t: 0.5 };
          game.feedback.bad(W / 2, H * 0.8, { text: 'TIME UP', size: 56 });
          loseMitten('turn');
        }
      }
      if (!done && total <= 0) {
        total = 0;
        game.feedback.bad(W / 2, H * 0.4, { text: 'TIME UP', size: 64 });
        freezeT = 0.45;
        finish(false, 'time');
      }
    }

    yard();
    drawWall();
    drawFolks();
    drawHud();
    if (warm > 0) shout(warm > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.24, 108, Q.amber);
    cellophane();
  });

  game.onStart(function() {
    game.audio.melody([
      ['A4', 1], ['R', 0.5], ['C5', 0.5], ['E5', 1], ['R', 1],
      ['D5', 0.5], ['C5', 0.5], ['A4', 1], ['G4', 1], ['R', 1],
    ], { tempo: 104, wave: 'square', volume: 0.045, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
