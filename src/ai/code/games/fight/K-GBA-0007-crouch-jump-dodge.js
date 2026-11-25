// K-GBA-0007-crouch-jump-dodge.js
// クラウチ&ジャンプ避け — 迫る攻撃の高さを見て、しゃがむか跳ぶかを選んでかわす
// 操作: 相手が下段/上段どちらで来るか予告動作を見て、下段には上スワイプ・上段には下スワイプでかわす
// 終わり: 5連撃すべて正しくかわせば成功。1回でも被弾すれば失敗
// @mechanic: swipe_direction
// @theme: dueling_ring_dodge
// 世界観: 円形の決闘リング。相手が放つ下段の薙ぎ払いと上段の振り下ろしを、跳ぶかしゃがむかで見切り続ける
// 残るもの: 正誤(CLEAR/GAME OVER) + かわした回数
// スタイル: PIXEL HD

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // PIXEL HD: 高解像度ドット、柔らかい陰影、彩度の高い3色+アクセント2色
  var C = {
    bg: '#241830', bg2: '#140c1c', ring: '#4a3a5a', ringEdge: '#6a5480',
    foe: '#e05858', foeDark: '#8a2c2c', hero: '#58c8e0', heroDark: '#2c7a8a',
    good: '#3dff8a', bad: '#ff3d5a', gold: '#ffe600', white: '#f4eefa', ink: '#0a0610',
  };

  var GAME_TITLE = 'CROUCH & JUMP';
  var TOTAL = 5;
  var CX = W * 0.5, FY = H * 0.5;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var dodged, done, endWait, finished, ready, hitStop, shake, round, atk, pose, poseVel;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    game.draw.circle(CX, FY, 420, C.ring, 0.25);
    game.draw.circle(CX, FY, 420, C.ringEdge, 0.08);
  }

  var HERO_STAND = ['.##.', '####', '.##.', '####', '#.##'];
  var HERO_CROUCH = ['####', '#.##', '####'];
  var HERO_JUMP = ['.##.', '####', '.##.', '.##.'];
  var FOE_LOW = ['#....', '####.', '#....', '#....'];
  var FOE_HIGH = ['....#', '.####', '....#', '....#'];

  function newAtk(rnd) {
    var low = Math.random() < 0.5;
    var dur = Math.max(0.62, 1.05 - rnd * 0.08);
    return { t: 0, dur: dur, low: low, resolved: false, telegraphed: false };
  }

  function initGame() {
    dodged = 0; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; round = 0; pose = 0; poseVel = 0;
    atk = newAtk(0);
  }

  function resolveDodge(dir) {
    if (!atk || atk.resolved || ready > 0 || done || finished) return;
    atk.resolved = true;
    var correct = (atk.low && dir === 'up') || (!atk.low && dir === 'down');
    hitStop = correct ? 0.12 : 0.35;
    if (correct) {
      dodged++;
      poseVel = atk.low ? -1 : 1;
      game.feedback.good(CX, FY, { text: 'DODGE', color: C.good });
      game.fx.burst(CX, FY, { color: C.gold, count: 14, speed: 320 });
      game.audio.play('se_good', 0.4);
      if (dodged === Math.ceil(TOTAL / 2)) game.fx.popup('HALFWAY!', CX, FY - 200, { color: C.gold, size: 40 });
    } else {
      game.feedback.bad(CX, FY, { text: 'HIT' });
      shake = 0.3;
      game.audio.play('se_bad', 0.4);
    }
    if (!correct) { ok = false; finished = true; finish(); return; }
    if (dodged >= TOTAL) { ok = true; finished = true; finish(); return; }
    round++;
    atk = newAtk(round);
  }

  game.onSwipe(function(dir) {
    if (state !== S.PLAYING) return;
    resolveDodge(dir);
  });

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

  function drawHero(p) {
    var sp = p < -0.3 ? HERO_JUMP : (p > 0.3 ? HERO_CROUCH : HERO_STAND);
    var y = FY + 130 - (p < -0.3 ? 60 : 0) + (p > 0.3 ? 30 : 0);
    game.draw.sprite(sp, { '#': C.hero }, CX, y, 24, { anchor: 'center' });
  }

  function drawAtk(a) {
    if (!a) return;
    var p = Math.min(1, a.t / a.dur);
    var x = -100 + (CX - 160 - -100) * p;
    if (p > 0.4) {
      var blink = Math.floor(game.time.elapsed * 10) % 2 === 0;
      if (blink) game.draw.line(CX - 220, a.low ? FY + 130 : FY - 130, CX + 220, a.low ? FY + 130 : FY - 130, C.bad, 8);
    }
    game.draw.sprite(a.low ? FOE_LOW : FOE_HIGH, { '#': C.foeDark }, x, a.low ? FY + 100 : FY - 100, 26, { anchor: 'center' });
  }

  var demo = { t: 0, gx: CX, gy: H * 0.86, dir: 'up', press: false, a: null };
  function stepDemo(dt) {
    demo.t += dt;
    if (round === undefined || round === null) initGame();
    if (!demo.a) { demo.a = newAtk(0); demo.a.dur = 0.9; round = 0; }
    demo.a.t += dt;
    atk = demo.a;
    pose += (0 - pose) * Math.min(1, dt * 5);
    var p = demo.a.t / demo.a.dur;
    if (p > 0.5 && p < 0.62 && !demo.a.telegraphed) {
      demo.a.telegraphed = true;
      demo.dir = demo.a.low ? 'up' : 'down';
      demo.gx = CX + (demo.dir === 'up' ? 0 : 0);
      demo.gy = demo.a.low ? H * 0.86 - 220 : H * 0.86 + 60;
      demo.press = true;
      pose = demo.a.low ? -1 : 1;
      game.feedback.good(CX, FY, { text: 'DODGE', color: C.good });
      game.audio.play('se_good', 0.25);
    }
    if (p >= 1) { demo.a = null; demo.press = false; demo.gy = H * 0.86; }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      bg();
      stepDemo(dt);
      drawHero(pose);
      drawAtk(atk);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 42, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.92, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.92, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawHero(0);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      txt(dodged + ' / ' + TOTAL, W / 2, H * 0.13, 32, C.gold);
      if (!ok) txt('あと' + (TOTAL - dodged) + '回!', W / 2, H * 0.18, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.92, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(dodged, { dodged: dodged, total: TOTAL });
        else game.end.failure({ dodged: dodged, total: TOTAL });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      atk.t += dt;
      if (atk.t / atk.dur >= 1 && !atk.resolved) {
        atk.resolved = true;
        hitStop = 0.35;
        game.feedback.bad(CX, FY, { text: 'HIT' });
        shake = 0.3;
        game.audio.play('se_bad', 0.4);
        ok = false; finished = true; finish();
      }
    }
    if (poseVel !== 0) { pose += poseVel * dt * 1.8; if (Math.abs(pose) > 1) pose = poseVel > 0 ? 1 : -1; }
    else pose *= 0.85;
    if (shake > 0) shake -= dt;

    bg();
    drawHero(pose);
    if (!finished) drawAtk(atk);

    txt(dodged + ' / ' + TOTAL, W / 2, H * 0.06, 32, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * (dodged / TOTAL), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.72, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['A3', 0.3], ['C4', 0.3], ['E4', 0.6]], { tempo: 128, wave: 'sawtooth', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
