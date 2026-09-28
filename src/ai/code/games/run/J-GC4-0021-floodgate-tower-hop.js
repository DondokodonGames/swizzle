// J-GC4-0021-floodgate-tower-hop.js
// 水門塔ぴょん登り — せり上がる水から逃げて、左右に互い違いの足場を跳び登る。噴き出す放水の足場は避けて待つ
// 操作: 次の足場がある側(左/右)をタップして跳ぶ。反対側を叩くと足を滑らせる。しぶきが立った足場は放水が来る前に離れる
// 終わり: 時間いっぱい水に追いつかれなければCLEAR。水に足元まで浸かるとGAME OVER
// @mechanic: camera_climb
// @theme: floodgate_tower_climb
// 世界観: 大雨の夜、水門塔の見回りに来た水番の見習いが、塔の中でせり上がる水と壁から噴く放水をかわしながら、ブロック積みの足場を跳び登って屋上の見張り台を目指す
// 残るもの: 正誤(CLEAR/GAME OVER) + 登った段数・水との最大差のスコア
// スタイル: VOXEL BLOCK

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // VOXEL BLOCK: 立方体を上面/左面/右面の3明度で
  var STYLE = { bg: ['#1a2238', '#2c3a5a', '#46587a'], main: ['#9aa8b8', '#6a7888'], accent: ['#3cc8e8', '#ffb43c'] };
  var C = {
    bg0: '#1a2238', bg1: '#2c3a5a', bg2: '#46587a', top: '#c8d0d8', left: '#9aa8b8', right: '#6a7888',
    water: '#3cc8e8', waterDeep: '#1a78a8', foam: '#e8f8ff', ink: '#f0f4f8', good: '#6ae08a', bad: '#ff5a5a', gold: '#ffb43c'
  };

  var GAME_TITLE = 'FLOODGATE HOP';
  var TIME_LIMIT = 18;
  var STEP = 170;
  var LEDGE_L = Math.round(W * 0.3), LEDGE_R = Math.round(W * 0.7);
  var PLAYER_SCREEN_Y = Math.round(H * 0.58);
  var HUD_Y = Math.round(H * 0.06);
  var PAD_Y = Math.round(H * 0.88);

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var KEEPER = [
    ['..yyyy..', '.yyyyyy.', '..ffff..', '..fkfk..', '.oooooo.', 'oooooooo', '..bb.bb.', '..bb.bb.'],
    ['..yyyy..', '.yyyyyy.', '..ffff..', '..fkfk..', 'o.oooo.o', '.oooooo.', '.bb...bb', 'bb.....b']
  ];
  var KEEPER_PAL = { y: '#ffb43c', f: '#f0c8a0', k: '#1a2238', o: '#e8e050', b: '#3a4a68' };
  var LAMP = ['.gg.', 'gyyg', 'gyyg', '.gg.'];

  var ledges, level, playerY, hopT, hopFrom, hopTo, stun, waterY, waterSpeed, best, timeLeft, t0, gap, drops;
  var ready, hitStop, finished, done, endWait, ok, milestone, flashT;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 4, y + 4, { size: sz, color: '#0a1020', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function ledgeX(i) { return ledges[i].side < 0 ? LEDGE_L : LEDGE_R; }
  function ledgeY(i) { return -i * STEP; }

  function ensureLedges(n) {
    while (ledges.length < n) {
      var i = ledges.length;
      var prev = i > 0 ? ledges[i - 1].side : -1;
      var side = i === 0 ? -1 : (Math.random() < 0.62 ? -prev : prev);
      ledges.push({ side: side, jet: i > 3 && Math.random() < 0.3, off: game.random(0, 2.1) });
    }
  }

  // 放水の周期: 0-1.0 静か / 1.0-1.6 予告(しぶき) / 1.6-2.1 放水
  function jetPhase(i) {
    if (!ledges[i] || !ledges[i].jet) return 0;
    var p = (t0 + ledges[i].off) % 2.1;
    return p < 1.0 ? 0 : (p < 1.6 ? 1 : 2);
  }

  function initGame() {
    ledges = []; ensureLedges(30);
    level = 0; playerY = 0; hopT = 0; hopFrom = 0; hopTo = 0; stun = 0;
    waterY = 420; waterSpeed = 55; best = 0; timeLeft = TIME_LIMIT; t0 = 0; gap = 420; drops = [];
    ready = 0.8; hitStop = 0; finished = false; done = false; endWait = 0; ok = false; milestone = 0; flashT = 0;
  }

  // 実ロジック: 左右どちらかへ跳ぶ
  function hop(side, isDemo) {
    if (hopT > 0 || stun > 0) return false;
    ensureLedges(level + 12);
    var next = level + 1;
    if (ledges[next].side === side) {
      hopFrom = level; hopTo = next; hopT = 0.2; level = next;
      game.audio.play('se_jump', 0.3);
      game.fx.burst(ledgeX(hopFrom), PLAYER_SCREEN_Y + 40, { color: C.top, count: 4, speed: 120 });
      if (level > best) best = level;
      if (!isDemo && level % 10 === 0) {
        game.audio.play('se_milestone', 0.45);
        game.fx.popup(level + '段', W / 2, H * 0.34, { color: C.gold, size: 64 });
        game.feedback.good(ledgeX(level), PLAYER_SCREEN_Y - 120, { text: 'NICE', color: C.gold, count: 10 });
      }
    } else {
      stun = 0.45;
      game.feedback.bad(side < 0 ? LEDGE_L : LEDGE_R, PLAYER_SCREEN_Y - 60, { text: 'MISS', color: C.bad, shake: 4 });
    }
    return true;
  }

  function stepWorld(dt, isDemo) {
    t0 += dt;
    if (stun > 0) stun -= dt;
    if (flashT > 0) flashT -= dt;
    if (hopT > 0) { hopT -= dt; if (hopT < 0) hopT = 0; }
    var target = ledgeY(level);
    var p = hopT > 0 ? 1 - hopT / 0.2 : 1;
    playerY = ledgeY(hopFrom) + (target - ledgeY(hopFrom)) * p - Math.sin(Math.PI * p) * (hopT > 0 ? 60 : 0);
    // 放水に当たったら1段押し落とされる
    if (hopT <= 0 && stun <= 0 && jetPhase(level) === 2 && level > 0) {
      flashT = 0.3;
      game.audio.play('se_break', 0.4);
      game.feedback.bad(ledgeX(level), PLAYER_SCREEN_Y - 60, { text: 'MISS', color: C.bad, shake: 10 });
      hopFrom = level; level = Math.max(0, level - 1); hopT = 0.2; stun = 0.4;
    }
    // 水位
    waterSpeed = 55 + Math.min(1, t0 / TIME_LIMIT) * 115;
    waterY -= waterSpeed * dt;
    gap = waterY - playerY;
    if (isDemo && gap < 150) waterY = playerY + 420;
    for (var d = drops.length - 1; d >= 0; d--) {
      drops[d].y += 900 * dt; drops[d].t -= dt;
      if (drops[d].t <= 0) drops.splice(d, 1);
    }
    if (Math.random() < dt * 8) drops.push({ x: game.random(0, W), y: game.random(-100, H * 0.4), t: 0.6 });
  }

  function winGame() {
    finished = true; ok = true; hitStop = 0.4;
    game.feedback.good(ledgeX(level), PLAYER_SCREEN_Y - 120, { text: 'CLEAR', color: C.gold, count: 30, flashColor: '#f0f4f8' });
    game.audio.play('se_success', 0.55);
    finish();
  }

  function loseGame() {
    if (finished) return;
    finished = true; ok = false; hitStop = 0.55; flashT = 0.5;
    game.feedback.bad(ledgeX(level), PLAYER_SCREEN_Y, { text: 'GAME OVER', color: C.bad, shake: 12 });
    game.audio.play('se_failure', 0.5);
    finish();
  }

  function finish() {
    if (done) return;
    done = true; endWait = 1.2;
    game.audio.stopBgm();
  }

  function scoreNow() { return best * 50 + (ok ? 500 : 0); }

  function cube(x, y, w, h, d) {
    game.draw.rect(x, y, w, d, C.top);
    game.draw.rect(x, y + d, w * 0.5, h, C.left);
    game.draw.rect(x + w * 0.5, y + d, w * 0.5, h, C.right);
  }

  function drawScene() {
    var t = game.time.elapsed;
    var cam = playerY - PLAYER_SCREEN_Y;
    game.draw.gradient(0, H, [[0, C.bg0], [0.6, C.bg1], [1, C.bg2]]);
    game.draw.rect(0, 0, W, H, C.water, 0.02 + 0.02 * Math.sin(t * 1.6));
    // 塔の壁(ブロック積み、奥)
    var wallOff = ((-cam * 0.5) % 120 + 120) % 120;
    for (var by = -120; by < H; by += 120) {
      for (var bx = 0; bx < W; bx += 180) {
        var sh = ((bx / 180 + Math.floor((by - wallOff) / 120)) % 2) ? '#24304c' : '#28365a';
        game.draw.rect(bx + 4, by + wallOff + 4, 172, 112, sh);
      }
    }
    for (var d = 0; d < drops.length; d++) game.draw.line(drops[d].x, drops[d].y, drops[d].x - 6, drops[d].y + 30, C.foam, 3);
    // 足場
    var first = Math.max(0, level - 6), last = level + 10;
    ensureLedges(last + 2);
    for (var i = first; i <= last; i++) {
      var sy = ledgeY(i) - cam;
      if (sy < -80 || sy > H) continue;
      var lx = ledgeX(i);
      var jp = jetPhase(i);
      cube(lx - 110, sy, 220, 50, 26);
      // 壁の放水口
      var nozzleX = ledges[i].side < 0 ? 20 : W - 60;
      if (ledges[i].jet) {
        game.draw.rect(nozzleX, sy - 70, 40, 40, '#4a5a78');
        if (jp === 1) {
          var a = Math.floor(t * 14) % 2 ? 0.9 : 0.3;
          game.draw.circle(nozzleX + 20, sy - 50, 30, C.foam, a);
          game.draw.circle(lx, sy - 10, 40, C.foam, a * 0.5);
        } else if (jp === 2) {
          var x1 = ledges[i].side < 0 ? 60 : lx + 110, x2 = ledges[i].side < 0 ? lx - 110 : W - 60;
          game.draw.rect(Math.min(x1, lx - 110), sy - 80, Math.abs(x2 - x1) + 220, 70, C.water, 0.8);
        }
      }
      if (i > 0 && i % 10 === 0) game.draw.sprite(LAMP, { g: '#4a5a78', y: C.gold }, lx, sy - 40, 10, { anchor: 'center' });
    }
    // 見習い
    var pf = hopT > 0 ? 1 : 0;
    var px = hopT > 0 ? ledgeX(hopFrom) + (ledgeX(level) - ledgeX(hopFrom)) * (1 - hopT / 0.2) : ledgeX(level);
    var wob = stun > 0 ? Math.sin(t * 50) * 10 : 0;
    game.draw.sprite(KEEPER[pf], KEEPER_PAL, px + wob, playerY - cam - 60 + (hopT > 0 ? 0 : Math.sin(t * 4) * 3), 14, { anchor: 'center', flipX: ledges[level].side > 0 });
    if (flashT > 0) game.draw.circle(px, playerY - cam - 60, 120, '#ffffff', flashT * 1.5);
    // 水
    var wy = waterY - cam;
    if (wy < H) {
      game.draw.gradient(Math.max(0, wy), H, [[0, C.water], [1, C.waterDeep]]);
      for (var w = 0; w < 9; w++) game.draw.rect(w * 130 + Math.sin(t * 3 + w) * 20, wy - 8 + Math.sin(t * 4 + w) * 6, 100, 16, C.foam, 0.7);
      if (gap < 200 && Math.floor(t * 8) % 2 === 0) game.draw.rect(0, wy - 30, W, 12, C.bad, 0.8);
    }
    // 親指ゾーン: 左右のパッド(次の足場の側が光る)
    ensureLedges(level + 3);
    var nextSide = ledges[level + 1].side;
    for (var s = 0; s < 2; s++) {
      var side = s === 0 ? -1 : 1;
      var cx = s === 0 ? W * 0.25 : W * 0.75;
      var lit = side === nextSide;
      game.draw.rect(cx - 170, PAD_Y - 90, 340, 180, '#0a1020', 0.55);
      cube(cx - 150, PAD_Y - 80, 300, 110, 40);
      if (lit) game.draw.rect(cx - 150, PAD_Y - 80, 300, 40, C.gold, 0.35 + 0.2 * Math.sin(t * 8));
      game.draw.line(cx, PAD_Y + 10, cx, PAD_Y - 50, '#1a2238', 16);
      game.draw.line(cx - 30, PAD_Y - 20, cx, PAD_Y - 55, '#1a2238', 16);
      game.draw.line(cx + 30, PAD_Y - 20, cx, PAD_Y - 55, '#1a2238', 16);
    }
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 220, '#0a1020', 0.5);
    txt(best + '段', 60, HUD_Y + 20, 60, C.ink, 'left');
    txt('SCORE ' + scoreNow(), W - 60, HUD_Y + 20, 40, C.gold, 'right');
    var low = gap < 200 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(60, 170, W - 120, 22, '#0a1020');
    game.draw.rect(60, 170, (W - 120) * (1 - Math.max(0, timeLeft / TIME_LIMIT)), 22, low ? C.bad : C.water);
  }

  // ---- ATTRACT デモ: 次の足場の側を叩いて登る(放水は待つ/時々滑る) ----
  var demo = { t: 0, gx: W * 0.25, gy: PAD_Y, press: 0, cool: 0, n: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    if (demo.t <= dt || level > 22) initGame();
    stepWorld(dt, true);
    demo.cool -= dt;
    ensureLedges(level + 3);
    var ns = ledges[level + 1].side;
    var jn = jetPhase(level + 1);
    if (demo.cool <= 0 && hopT <= 0 && stun <= 0 && jn === 0) {
      demo.n++;
      var slip = demo.n % 7 === 0;
      var side = slip ? -ns : ns;
      demo.gx = side < 0 ? W * 0.25 : W * 0.75;
      hop(side, true);
      demo.press = 0.15; demo.cool = 0.42;
    }
    if (demo.press > 0) demo.press -= dt;
    demo.gy = PAD_Y - 20;
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.5); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (finished || ready > 0) { game.audio.play('se_tap', 0.15); return; }
    if (!hop(x < W / 2 ? -1 : 1, false)) {
      game.audio.play('se_tap', 0.12);
      game.fx.burst(x, y, { color: C.foam, count: 3, speed: 80 });
    }
  });

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (ledges === undefined) initGame();
      stepDemo(dt);
      drawScene();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press > 0, scale: 13 });
      txt(GAME_TITLE, W / 2, H * 0.1, 84, C.gold);
      txt('BEST ' + (game.best || 0), W / 2, H * 0.145, 40, C.ink);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.975, 44, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.975, 34, C.ink);
      return;
    }

    if (state === S.RESULT) {
      drawScene();
      game.draw.rect(0, H * 0.12, W, H * 0.2, '#0a1020', 0.7);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.17, 100, ok ? C.gold : C.bad);
      txt('SCORE ' + scoreNow(), W / 2, H * 0.225, 48, C.ink);
      txt(best + '段', W / 2, H * 0.265, 40, C.water);
      if (!ok) txt('あと' + Math.max(1, Math.ceil(timeLeft)) + '秒!', W / 2, H * 0.305, 46, C.bad);
      else if (scoreNow() > (game.best || 0)) txt('NEW RECORD', W / 2, H * 0.305, 50, C.gold);
      else txt('BEST ' + (game.best || 0), W / 2, H * 0.305, 40, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.975, 40, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (hitStop > 0) hitStop -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        var stats = { height: best, timeLeft: Math.round(timeLeft * 10) / 10 };
        if (ok) game.end.success(scoreNow(), stats);
        else game.end.failure(stats);
      }
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap', 0.3);
    } else if (!finished) {
      timeLeft -= dt;
      stepWorld(dt, false);
      if (gap < 10) loseGame();
      else if (timeLeft <= 0) { timeLeft = 0; winGame(); }
    }

    drawScene();
    drawHud();
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.4, 110, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([
      ['C4', 0.5], ['E4', 0.5], ['G4', 0.5], ['C5', 0.5], ['B4', 0.5], ['G4', 0.5], ['E4', 1],
      ['F4', 0.5], ['A4', 0.5], ['C5', 0.5], ['A4', 0.5], ['G4', 2]
    ], { tempo: 168, wave: 'square', volume: 0.05, loop: true, bass: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
