// K-GBA-0030-garden-sprout-pluck.js
// 双葉抜き取り — 次々に伸びる余分な双葉を、2本指でつまんで素早く抜き取る。テンポは徐々に速くなる
// 操作: 伸びてきた双葉が出ている場所を2本指(ピンチ)で同時にタップしてつまみ抜く
// 終わり: 規定数(10本)を抜き取れば成功。3本伸びきる(見逃す)と失敗
// @mechanic: pinch_zone
// @theme: garden_sprout_pluck
// 世界観: 小さな畑を手入れする庭師見習い。次々顔を出す余分な双葉を、テンポが速まる中で2本指のピンセット代わりに摘み続ける
// 残るもの: 正誤(CLEAR/GAME OVER) + 抜き取った本数
// スタイル: 2000s HANDHELD PASTEL

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2000s HANDHELD PASTEL: 淡いパステル、丸みの強い形、白フチ
  var C = {
    bg1: '#fdf3e0', bg2: '#f6e2c8', soil: '#d8b892', soilDark: '#c0a078',
    sprout: '#8fd98a', sproutRipe: '#ffb0c0', pot: '#f0a8b8',
    good: '#5ac98a', bad: '#ff7a90', gold: '#ffb64d', white: '#fffaf0', ink: '#4a3626',
  };

  var GAME_TITLE = 'SPROUT PLUCK';
  var TOTAL = 10;
  var MAX_MISS = 3;
  var SLOTS = [
    { x: W * 0.3, y: H * 0.36 }, { x: W * 0.7, y: H * 0.36 },
    { x: W * 0.3, y: H * 0.52 }, { x: W * 0.7, y: H * 0.52 },
  ];
  var PICK_R = 70;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var plucked, missed, done, endWait, finished, ready, hitStop, shake;
  var round, sprouts, spawnT;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.white, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var SPROUT_SPRITE = ['.#.#.', '##.##', '..#..'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg1], [1, C.bg2]]);
    for (var i = 0; i < 4; i++) {
      game.draw.rect(SLOTS[i].x - 90, SLOTS[i].y + 30, 180, 40, C.soilDark);
      game.draw.rect(SLOTS[i].x - 90, SLOTS[i].y + 30, 180, 10, C.soil);
    }
  }

  function newSprout(slot) {
    return { slot: slot, t: 0, dur: Math.max(0.9, 1.5 - round * 0.05), resolved: false };
  }

  function initGame() {
    plucked = 0; missed = 0; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
    round = 0; sprouts = []; spawnT = 0.5;
  }

  function slotAt(x, y) {
    for (var i = 0; i < SLOTS.length; i++) {
      if (Math.hypot(x - SLOTS[i].x, y - SLOTS[i].y) <= PICK_R) return i;
    }
    return -1;
  }

  // pinch_zone: 2本指の同時タップ(距離が近い2点、間隔差が小さい)を1回のつまみ入力として扱う
  var pendingPress = [];
  function onPressPt(x, y, id) {
    if (state !== S.PLAYING || ready > 0 || done || finished) return;
    game.audio.play('se_tap', 0.05);
    pendingPress.push({ x: x, y: y, id: id, t: game.time.elapsed });
    if (pendingPress.length > 6) pendingPress.shift();
    // 直近0.18秒以内に2本の指が同じ苗の位置に触れたらピンチ成立
    for (var i = pendingPress.length - 2; i >= 0; i--) {
      var a = pendingPress[i], b = pendingPress[pendingPress.length - 1];
      if (a.id === b.id) continue;
      if (Math.abs(a.t - b.t) <= 0.18 && Math.hypot(a.x - b.x, a.y - b.y) < 140) {
        var mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
        tryPluck(mx, my);
        pendingPress = [];
        break;
      }
    }
  }

  function tryPluck(x, y) {
    var slot = slotAt(x, y);
    var s = null;
    for (var i = 0; i < sprouts.length; i++) if (sprouts[i].slot === slot && !sprouts[i].resolved) { s = sprouts[i]; break; }
    if (slot < 0 || !s) {
      game.feedback.bad(x, y, { text: 'MISS' });
      shake = 0.15;
      game.audio.play('se_bad', 0.25);
      return;
    }
    s.resolved = true;
    plucked++;
    hitStop = 0.08;
    game.feedback.good(SLOTS[slot].x, SLOTS[slot].y, { text: 'PLUCK', color: C.good });
    game.fx.burst(SLOTS[slot].x, SLOTS[slot].y, { color: C.gold, count: 12, speed: 260 });
    game.audio.play('se_good', 0.35);
    if (plucked === Math.ceil(TOTAL / 2)) game.fx.popup('HALFWAY!', W * 0.5, H * 0.22, { color: C.gold, size: 40 });
    if (plucked >= TOTAL) { ok = true; finished = true; finish(); }
  }

  game.onPress(function(x, y, id) { onPressPt(x, y, id); });
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function updateSprouts(dt) {
    spawnT -= dt;
    var occupied = {};
    for (var i = 0; i < sprouts.length; i++) if (!sprouts[i].resolved) occupied[sprouts[i].slot] = true;
    if (spawnT <= 0) {
      var free = [];
      for (var k = 0; k < SLOTS.length; k++) if (!occupied[k]) free.push(k);
      if (free.length) {
        sprouts.push(newSprout(free[Math.floor(game.random(0, free.length))]));
        round++;
      }
      spawnT = Math.max(0.5, 0.95 - round * 0.02);
    }
    for (var j = sprouts.length - 1; j >= 0; j--) {
      var sp = sprouts[j];
      if (sp.resolved) { sprouts.splice(j, 1); continue; }
      sp.t += dt;
      if (sp.t >= sp.dur) {
        sp.resolved = true;
        missed++;
        hitStop = 0.3;
        game.feedback.bad(SLOTS[sp.slot].x, SLOTS[sp.slot].y, { text: 'MISS' });
        shake = 0.25;
        game.audio.play('se_bad', 0.4);
        sprouts.splice(j, 1);
        if (missed >= MAX_MISS) { ok = false; finished = true; finish(); return; }
      }
    }
  }

  function drawScene() {
    for (var i = 0; i < sprouts.length; i++) {
      var sp = sprouts[i];
      var p = Math.min(1, sp.t / sp.dur);
      var scale = 10 + p * 16;
      if (p > 0.6) {
        var blink = Math.floor(game.time.elapsed * 10) % 2 === 0;
        if (blink) game.draw.circle(SLOTS[sp.slot].x, SLOTS[sp.slot].y, 60, C.bad, 0.2);
      }
      game.draw.sprite(SPROUT_SPRITE, { '#': p > 0.6 ? C.sproutRipe : C.sprout }, SLOTS[sp.slot].x, SLOTS[sp.slot].y - p * 20, scale, { anchor: 'center' });
    }
  }

  var demo = { t: 0, gx: SLOTS[0].x, gy: SLOTS[0].y, gx2: SLOTS[0].x + 40, press: false, sp: null };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.6;
    if (cyc < dt || demo.t <= dt) { demo.sp = null; sprouts = []; round = 0; demo.press = false; }
    if (!demo.sp) { demo.sp = newSprout(0); demo.sp.dur = 1.2; sprouts = [demo.sp]; }
    demo.sp.t += dt;
    var p = demo.sp.t / demo.sp.dur;
    if (p > 0.55 && p < 0.7 && !demo.sp.telegraphed) {
      demo.sp.telegraphed = true;
      demo.gx = SLOTS[0].x - 20; demo.gy = SLOTS[0].y; demo.press = true;
      game.feedback.good(SLOTS[0].x, SLOTS[0].y, { text: 'PLUCK', color: C.good });
      game.audio.play('se_good', 0.25);
    }
    if (p >= 1) { demo.sp = null; sprouts = []; demo.press = false; }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      bg();
      stepDemo(dt);
      drawScene();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 13 });
      game.draw.hand(demo.gx + 44, demo.gy, { press: demo.press, scale: 13 });
      txt(GAME_TITLE, W / 2, H * 0.08, 42, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.92, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.92, 28, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawScene();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      txt(plucked + ' / ' + TOTAL, W / 2, H * 0.13, 32, C.gold);
      if (!ok) txt('あと' + (TOTAL - plucked) + '本!', W / 2, H * 0.18, 26, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.92, 26, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(plucked, { plucked: plucked, total: TOTAL, missed: missed }); else game.end.failure({ plucked: plucked, total: TOTAL, missed: missed });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      updateSprouts(dt);
    }
    if (shake > 0) shake -= dt;

    bg();
    if (!finished) drawScene();

    txt(plucked + ' / ' + TOTAL, W / 2, H * 0.06, 32, C.ink);
    game.draw.rect(60, 150, W - 120, 16, C.white, 0.6);
    game.draw.rect(60, 150, (W - 120) * (plucked / TOTAL), 16, C.gold);
    for (var i = 0; i < MAX_MISS; i++) {
      game.draw.circle(W - 100 - i * 46, 200, 12, i < missed ? C.bad : C.white, i < missed ? 1 : 0.6);
    }
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.72, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['E4', 0.25], ['G4', 0.25], ['B4', 0.25], ['E5', 0.5]], { tempo: 150, wave: 'sine', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
