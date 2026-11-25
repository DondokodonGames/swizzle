// J-3DSDSDSTOP10-0006-mossy-shy-finder.js
// 苔の森の恥ずかしがり撮影 — ファインダーを逃げ回る毛玉に重ね続け、こちらを向いた瞬間に写す
// 操作: 指でファインダーを動かし、毛玉に重ねてピントを溜める。耳がピンと立った後に振り向いた瞬間、ピントが満ちていれば自動で撮れる
// 終わり: 20秒で5枚撮ればCLEAR。届かなければGAME OVER(ピント不足で振り向かれるとMISS)
// @mechanic: drag_follow
// @theme: moss_forest_shy_photo
// 世界観: 霧深い苔の森の調査員が、人の気配を嫌って茂みを渡り歩く毛玉獣「モスポフ」の正面写真を、日が落ちる前に図鑑用に5枚そろえようと追いかける
// 残るもの: 正誤(CLEAR/GAME OVER) + 撮れた枚数・逃した回数・最高ピント連続
// スタイル: PIXEL HD

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // PIXEL HD: 多色+光、パララックス、ライティング、細かいアニメ
  var STYLE = { bg: ['#1c3b3a', '#2f6a55', '#8fc27a'], main: ['#e8f4d0', '#5aa06a', '#3a2a1a'], accent: ['#ffe07a', '#ff7aa0'] };
  var C = { fog: '#dff0e0', leaf: '#3f8a4f', leafD: '#24583a', moss: '#7ab85a', bark: '#4a3424', fur: '#c9e0a0', furD: '#8fb070', eye: '#1a1a1a', blush: '#ff9ab0', light: '#fff2b0', good: '#8aff9a', bad: '#ff5a6a', ink: '#10201c', white: '#ffffff' };

  var GAME_TITLE = 'MOSS FINDER';
  var TIME_LIMIT = 20;
  var NEEDED = 5;
  var FOCUS_TIME = 0.8;
  var FW = 300, FH = 240;
  var FIELD_T = H * 0.24, FIELD_B = H * 0.7;

  var PUFF_SIDE = ['..#......#..', '..##....##..', '.##########.', '############', '####o#######', '############', '############', '.##########.', '..##....##..'];
  var PUFF_SIDE2 = ['..#......#..', '..##....##..', '.##########.', '############', '####o#######', '############', '############', '.##########.', '...##..##...'];
  var PUFF_FACE = ['.#........#.', '.##......##.', '.##########.', '############', '###o####o###', '##pp####pp##', '#####vv#####', '.##########.', '..##....##..'];
  var PUFF_EARS = ['.#........#.', '.#........#.', '.##......##.', '.##########.', '####o#######', '############', '############', '.##########.', '..##....##..'];
  var BUSH = ['...####...', '.########.', '##########', '##########', '.########.'];
  var SCOUT = ['..####..', '.#oooo#.', '.######.', '..#..#..', '.######.', '#.####.#', '..#..#..'];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var puff, finder, target, focus, photos, missed, timeLeft, ready, ended, ok, hitStop, endWait, score, milestone, shutter, lookCd, bushes, idleT;

  function initGame() {
    puff = { x: W * 0.5, y: H * 0.47, tx: W * 0.5, ty: H * 0.47, spd: 220, mode: 'walk', t: 0, hide: 0, face: 1, wig: 0 };
    finder = { x: W * 0.5, y: H * 0.6 }; target = { x: W * 0.5, y: H * 0.6 };
    focus = 0; photos = []; missed = 0; timeLeft = TIME_LIMIT; ready = 0.8;
    ended = false; ok = false; hitStop = 0; endWait = 0; score = 0; milestone = false; shutter = 0; idleT = 0;
    lookCd = 1.8;
    bushes = [{ x: W * 0.2, y: H * 0.56 }, { x: W * 0.78, y: H * 0.42 }, { x: W * 0.5, y: H * 0.64 }];
  }

  function pickDest() {
    puff.tx = game.random(W * 0.15, W * 0.85);
    puff.ty = game.random(FIELD_T + 120, FIELD_B - 80);
    if (Math.random() < 0.25) { var b = bushes[Math.floor(game.random(0, bushes.length))]; puff.tx = b.x; puff.ty = b.y; }
  }

  function overlap() {
    return Math.abs(puff.x - finder.x) < FW / 2 - 40 && Math.abs(puff.y - finder.y) < FH / 2 - 30 && puff.hide <= 0;
  }

  function behindBush() {
    for (var i = 0; i < bushes.length; i++) if (Math.abs(puff.x - bushes[i].x) < 90 && Math.abs(puff.y - bushes[i].y) < 50) return true;
    return false;
  }

  // 実ロジック: 毛玉の行動(歩く→耳が立つ(予告)→振り向く)と撮影判定。デモも同じ関数
  function stepPuff(dt, demoMode) {
    puff.t += dt; puff.wig += dt;
    if (puff.mode === 'walk') {
      var dx = puff.tx - puff.x, dy = puff.ty - puff.y, d = Math.hypot(dx, dy);
      if (d < 12) pickDest();
      else { puff.x += dx / d * puff.spd * dt; puff.y += dy / d * puff.spd * dt; puff.face = dx < 0 ? -1 : 1; }
      puff.hide = behindBush() ? 0.2 : Math.max(0, puff.hide - dt);
      lookCd -= dt;
      if (lookCd <= 0 && puff.hide <= 0) { puff.mode = 'ears'; puff.t = 0; if (!demoMode) game.audio.tone('A5', 0.1, { wave: 'sine', volume: 0.06 }); }
    } else if (puff.mode === 'ears') {
      if (puff.t >= 0.55) { puff.mode = 'look'; puff.t = 0; judgeSnap(demoMode); }
    } else if (puff.mode === 'look') {
      if (puff.t >= 0.5) { puff.mode = 'walk'; puff.t = 0; pickDest(); lookCd = demoMode ? 0.9 : game.random(1.6, 2.4); puff.spd = demoMode ? 200 : Math.min(420, 240 + photos.length * 40); }
    }
    // ピント: 重なっている間だけ溜まる
    if (overlap()) focus = Math.min(1, focus + dt / FOCUS_TIME);
    else focus = Math.max(0, focus - dt / (FOCUS_TIME * 0.7));
    if (shutter > 0) shutter -= dt;
  }

  function judgeSnap(demoMode) {
    if (focus >= 1 && overlap()) {
      shutter = 0.3;
      if (!demoMode) {
        photos.push({ x: puff.x });
        score += 300 + Math.round(timeLeft * 10);
        game.feedback.good(puff.x, puff.y - 90, { text: 'NICE', color: C.light, sound: 'se_good' });
        game.audio.play('se_coin', 0.4);
        if (!milestone && photos.length >= 3) {
          milestone = true; game.audio.play('se_milestone', 0.6);
          game.fx.popup(photos.length + ' / ' + NEEDED, W / 2, H * 0.3, { color: C.light, size: 70 });
        }
      } else {
        game.fx.burst(puff.x, puff.y, { color: C.light, count: 14 });
      }
    } else {
      if (!demoMode) { missed++; game.feedback.bad(puff.x, puff.y - 90, { text: 'MISS' }); }
      else game.fx.burst(puff.x, puff.y, { color: C.bad, count: 8 });
    }
  }

  function txt(str, x, y, sz, color) {
    game.draw.text(str, x + 3, y + 4, { size: sz, color: C.ink, bold: true, align: 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: 'center' });
  }

  function drawForest(t) {
    game.draw.gradient(0, H, [[0, STYLE.bg[0]], [0.45, STYLE.bg[1]], [0.75, STYLE.bg[2]], [1, '#2a4a30']]);
    // 奥の幹(パララックス: 遠いほど遅く揺れる)
    for (var i = 0; i < 6; i++) {
      var bx = i * 200 + Math.sin(t * 0.3 + i) * 10;
      game.draw.rect(bx, 0, 60, H * 0.72, '#20443a', 0.8);
    }
    for (var j = 0; j < 4; j++) {
      var fx = j * 300 + 80 + Math.sin(t * 0.5 + j) * 18;
      game.draw.rect(fx, 0, 90, H * 0.74, C.bark, 1);
      game.draw.rect(fx + 10, 0, 18, H * 0.74, '#6a4a30', 0.8);
    }
    // 木漏れ日
    for (var r = 0; r < 4; r++) {
      var rx = W * (0.15 + r * 0.25) + Math.sin(t * 0.7 + r) * 30;
      game.draw.rect(rx - 30, 0, 60, H * 0.72, C.light, 0.06 + 0.04 * Math.sin(t * 1.5 + r));
    }
    // 地面の苔
    game.draw.gradient(H * 0.6, H * 0.74, [[0, C.moss], [1, C.leafD]]);
    // 手前の下草(親指ゾーン)
    game.draw.rect(0, H * 0.74, W, H * 0.26, '#1a3424', 1);
    for (var g = 0; g < 14; g++) {
      var gx = g * 80 + Math.sin(t * 2 + g) * 6;
      game.draw.rect(gx, H * 0.72 + (g % 3) * 10, 30, 70, C.leaf, 1);
    }
    game.draw.rect(0, 0, W, H, C.fog, 0.05 + 0.04 * Math.sin(t * 0.9));
    game.draw.sprite(SCOUT, { '#': '#c89a60', 'o': '#202020' }, W * 0.86, H * 0.84 + Math.sin(t * 2.2) * 6, 12, { anchor: 'center' });
  }

  function drawBushes(t, front) {
    for (var i = 0; i < bushes.length; i++) {
      var b = bushes[i];
      var sw = Math.sin(t * 1.8 + i) * 5 + (puff && Math.abs(puff.x - b.x) < 110 && Math.abs(puff.y - b.y) < 70 ? Math.sin(t * 25) * 6 : 0);
      game.draw.sprite(BUSH, { '#': front ? C.leaf : C.leafD }, b.x + sw, b.y + 20, 22, { anchor: 'center' });
    }
  }

  function drawPuff(t) {
    var art = PUFF_SIDE;
    if (puff.mode === 'walk') art = Math.floor(puff.wig * 8) % 2 === 0 ? PUFF_SIDE : PUFF_SIDE2;
    if (puff.mode === 'ears') art = PUFF_EARS;
    if (puff.mode === 'look') art = PUFF_FACE;
    var hop = puff.mode === 'walk' ? Math.abs(Math.sin(puff.wig * 8)) * 12 : Math.sin(t * 3) * 3;
    var sc = (ended && hitStop > 0 && !ok) ? 18 : 14;
    game.draw.circle(puff.x, puff.y + 56, 55, C.ink, 0.25);
    game.draw.sprite(art, { '#': C.fur, 'o': C.eye, 'p': C.blush, 'v': '#a05050' }, puff.x, puff.y - hop, sc, { anchor: 'center', flipX: puff.mode === 'walk' && puff.face < 0 });
    if (puff.mode === 'ears') {
      var blink = Math.floor(t * 12) % 2 === 0;
      if (blink) { game.draw.circle(puff.x - 60, puff.y - 90, 10, C.light, 1); game.draw.circle(puff.x + 60, puff.y - 90, 10, C.light, 1); }
    }
  }

  function drawFinder(t) {
    var x0 = finder.x - FW / 2, y0 = finder.y - FH / 2, L = 60;
    var col = focus >= 1 ? C.good : C.white;
    var wdt = 10;
    game.draw.rect(x0, y0, L, wdt, col); game.draw.rect(x0, y0, wdt, L, col);
    game.draw.rect(x0 + FW - L, y0, L, wdt, col); game.draw.rect(x0 + FW - wdt, y0, wdt, L, col);
    game.draw.rect(x0, y0 + FH - wdt, L, wdt, col); game.draw.rect(x0, y0 + FH - L, wdt, L, col);
    game.draw.rect(x0 + FW - L, y0 + FH - wdt, L, wdt, col); game.draw.rect(x0 + FW - wdt, y0 + FH - L, wdt, L, col);
    game.draw.circle(finder.x, finder.y, 8, col, 0.8);
    // ピントの輪(満ちると緑)
    game.draw.rect(x0, y0 + FH + 14, FW, 14, C.ink, 0.5);
    game.draw.rect(x0, y0 + FH + 14, FW * focus, 14, col, 1);
    if (shutter > 0) game.draw.rect(0, 0, W, H, C.white, shutter * 2);
  }

  function drawHud(t) {
    txt(photos.length + ' / ' + NEEDED, W / 2, H * 0.05, 62, C.white);
    txt('SCORE ' + score, W * 0.18, H * 0.05, 30, C.white);
    game.draw.rect(60, 150, W - 120, 20, C.ink, 0.6);
    var low = timeLeft < 4 && Math.floor(t * 6) % 2 === 0;
    game.draw.rect(60, 150, (W - 120) * Math.max(0, timeLeft / TIME_LIMIT), 20, low ? C.bad : C.light);
    // 撮れた写真の札
    for (var i = 0; i < NEEDED; i++) {
      var px = W * 0.2 + i * 150, py = H * 0.11;
      game.draw.rect(px - 55, py - 45, 110, 90, C.white, i < photos.length ? 1 : 0.25);
      if (i < photos.length) game.draw.sprite(PUFF_FACE, { '#': C.fur, 'o': C.eye, 'p': C.blush, 'v': '#a05050' }, px, py, 6, { anchor: 'center' });
    }
  }

  // ── 入力(ファインダーは指に追従。移動量は onUpdate の1か所で補間) ──
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { game.audio.play('se_tap'); state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function(x, y) {
    if (state !== S.PLAYING || ready > 0 || ended) return;
    target.x = x; target.y = Math.min(FIELD_B, Math.max(FIELD_T, y - 120)); idleT = 0;
    game.audio.play('se_tap', 0.2);
  });
  game.onMove(function(x, y) {
    if (state !== S.PLAYING || ended) return;
    target.x = x; target.y = Math.min(FIELD_B, Math.max(FIELD_T, y - 120)); idleT = 0;
    if (overlap() && Math.random() < 0.1) game.audio.tone('C6', 0.03, { wave: 'sine', volume: 0.03 });
  });
  game.onRelease(function(x, y) {
    if (state !== S.PLAYING || ended) return;
    if (focus > 0.5) game.audio.tone('G4', 0.05, { wave: 'triangle', volume: 0.04 });
    else game.audio.play('se_tap', 0.08);
  });

  // ── ATTRACT ゴースト実演(毛玉を追いかけて振り向きで撮る → 2回目は置いていかれてMISS) ──
  var demo = { t: 0, gx: W / 2, gy: H * 0.7, lag: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.6;
    if (cyc < dt || demo.t <= dt) {
      initGame(); ready = 0; lookCd = 1.0;
      puff.x = W * 0.3; puff.y = H * 0.45; puff.tx = W * 0.7; puff.ty = H * 0.5; puff.spd = 200;
      finder.x = W * 0.5; finder.y = H * 0.6;
    }
    // 1回目はぴったり追う、2回目の振り向き前は遅れて追う
    var chase = cyc < 2.0 ? 5 : 0.6;
    target.x += (puff.x - target.x) * Math.min(1, dt * chase);
    target.y += (puff.y - target.y) * Math.min(1, dt * chase);
    finder.x += (target.x - finder.x) * Math.min(1, dt * 12);
    finder.y += (target.y - finder.y) * Math.min(1, dt * 12);
    stepPuff(dt, true);
    demo.gx = finder.x + 40; demo.gy = finder.y + 170;
  }

  function finish(success) {
    ended = true; ok = success; hitStop = 0.45; endWait = 1.1;
    game.fx.flash('#ffffff', 0.2);
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;
    if (state === S.ATTRACT) {
      if (puff === undefined) initGame();
      stepDemo(dt);
      drawForest(t); drawPuff(t); drawBushes(t, true); drawFinder(t);
      game.draw.hand(demo.gx, demo.gy, { press: true, scale: 14 });
      txt(GAME_TITLE, W / 2, H * 0.08 + Math.sin(t * 2) * 6, 88, C.light);
      txt('HI-SCORE ' + (game.best || 0), W / 2, H * 0.135, 36, C.white);
      if (Math.floor(t * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.95, 48, C.light);
      else txt('INSERT COIN', W / 2, H * 0.95, 42, C.white);
      return;
    }
    if (state === S.RESULT) { drawForest(t); drawPuff(t); drawBushes(t, true); drawResult(t); return; }

    if (ended) {
      if (hitStop > 0) {
        hitStop -= dt;
        if (hitStop <= 0) {
          if (ok) { game.audio.play('se_success', 0.7); game.fx.burst(W / 2, H * 0.45, { color: C.light, count: 50, speed: 700 }); }
          else { game.feedback.bad(puff.x, puff.y, { text: 'TIME UP' }); game.audio.play('se_failure', 0.6); }
        }
      } else {
        endWait -= dt;
        if (endWait <= 0) {
          state = S.RESULT;
          var stats = { photos: photos.length, missed: missed, needed: NEEDED };
          drawForest(t); drawPuff(t); drawBushes(t, true); drawResult(t);
          if (ok) game.end.success(score, stats); else game.end.failure(stats);
          return;
        }
      }
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap', 0.5);
    } else {
      timeLeft -= dt;
      finder.x += (target.x - finder.x) * Math.min(1, dt * 14);
      finder.y += (target.y - finder.y) * Math.min(1, dt * 14);
      stepPuff(dt, false);
      if (photos.length >= NEEDED) finish(true);
      else if (timeLeft <= 0) { timeLeft = 0; finish(false); }
    }

    drawForest(t); drawPuff(t); drawBushes(t, true); drawFinder(t); drawHud(t);
    if (ended && hitStop > 0 && !ok) game.draw.circle(puff.x, puff.y, 130, C.white, 0.3);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.4, 110, C.light);
  });

  function drawResult(t) {
    game.draw.rect(60, H * 0.3, W - 120, H * 0.38, C.ink, 0.82);
    if (ok) {
      txt('CLEAR', W / 2, H * 0.37, 130, C.good);
      game.draw.sprite(PUFF_FACE, { '#': C.fur, 'o': C.eye, 'p': C.blush, 'v': '#a05050' }, W / 2, H * 0.46 + Math.sin(t * 4) * 10, 12, { anchor: 'center' });
    } else {
      txt('GAME OVER', W / 2, H * 0.37, 104, C.bad);
      txt('あと' + Math.max(0, NEEDED - photos.length) + '枚!', W / 2, H * 0.46, 64, C.light);
    }
    txt(photos.length + ' / ' + NEEDED, W / 2, H * 0.53, 58, C.white);
    txt('SCORE ' + score, W / 2, H * 0.59, 46, C.white);
    var isNew = ok && score > (game.best || 0);
    txt(isNew ? 'NEW RECORD' : 'BEST ' + (game.best || 0), W / 2, H * 0.645, 44, isNew ? C.light : C.white);
    if (Math.floor(t * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.93, 44, C.white);
  }

  game.onStart(function() {
    game.audio.melody([
      ['G4', 1], ['B4', 0.5], ['D5', 0.5], ['E5', 1], ['D5', 1],
      ['B4', 0.5], ['A4', 0.5], ['G4', 1], ['E4', 1], ['G4', 2]
    ], { tempo: 110, wave: 'triangle', volume: 0.06, loop: true, bass: [['G2', 2], ['E2', 2], ['C3', 2], ['D3', 2]] });
    state = S.ATTRACT;
    initGame();
  });
})(game);
