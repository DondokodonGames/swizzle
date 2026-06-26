// 421-hot-potato.js
// ホットポテト — 燃えるじゃがいもを素早く投げ渡す
// 操作: スワイプ方向にじゃがいもを投げる、3人の間でパスし続ける
// 成功: 30回パス成功  失敗: 持ちすぎて爆発 or 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#0f0500',
    hot0:   '#f97316',
    hot1:   '#ef4444',
    hot2:   '#dc2626',
    hot3:   '#7f1d1d',
    potato: '#92400e',
    potatoHi:'#d97706',
    person: '#4ade80',
    personHi:'#86efac',
    active: '#fbbf24',
    flame:  '#fef08a',
    text:   '#f1f5f9',
    ui:     '#475569',
    wrong:  '#ef4444'
  };

  // 3 people positions
  var people = [
    { x: W*0.5, y: H*0.2, name: 'A', hasPotato: true, heat: 0 },
    { x: W*0.15, y: H*0.7, name: 'B', hasPotato: false, heat: 0 },
    { x: W*0.85, y: H*0.7, name: 'C', hasPotato: false, heat: 0 }
  ];

  var MAX_HEAT = 4.0;  // seconds before explosion
  var HEAT_RATE = 1.0;  // heat per second
  var passes = 0;
  var NEEDED = 30;
  var done = false;
  var timeLeft = 60;
  var elapsed = 0;
  var particles = [];
  var flashAnim = 0;
  var flashCol = C.active;

  // Potato in flight
  var potato = null;  // { x, y, tx, ty, vx, vy, fromIdx, toIdx }

  function getHolder() {
    for (var i = 0; i < people.length; i++) {
      if (people[i].hasPotato) return i;
    }
    return -1;
  }

  function throwTo(fromIdx, toIdx) {
    var from = people[fromIdx];
    var to = people[toIdx];
    from.hasPotato = false;
    var dx = to.x - from.x;
    var dy = to.y - from.y;
    var dist = Math.sqrt(dx*dx + dy*dy);
    var speed = dist * 2.5;
    potato = {
      x: from.x, y: from.y,
      vx: dx/dist * speed,
      vy: dy/dist * speed,
      toIdx: toIdx,
      heat: from.heat
    };
    from.heat = 0;
    passes++;
    game.audio.play('se_tap', 0.4);

    if (passes >= NEEDED && !done) {
      done = true;
      game.audio.play('se_success', 0.9);
      setTimeout(function() { game.end.success(passes * 200 + Math.ceil(timeLeft) * 80); }, 500);
    }
  }

  game.onSwipe(function(dir) {
    if (done || potato) return;
    var holderIdx = getHolder();
    if (holderIdx < 0) return;

    var holder = people[holderIdx];

    // Determine target based on swipe direction and holder
    var targetIdx = -1;
    if (holderIdx === 0) {
      // Top person — left goes to B, right goes to C
      if (dir === 'left' || dir === 'down') targetIdx = 1;
      else if (dir === 'right') targetIdx = 2;
    } else if (holderIdx === 1) {
      // Bottom left — right goes to C, up goes to A
      if (dir === 'right') targetIdx = 2;
      else if (dir === 'up') targetIdx = 0;
    } else if (holderIdx === 2) {
      // Bottom right — left goes to B, up goes to A
      if (dir === 'left') targetIdx = 1;
      else if (dir === 'up') targetIdx = 0;
    }

    if (targetIdx >= 0) throwTo(holderIdx, targetIdx);
  });

  game.onTap(function(tx, ty) {
    if (done || potato) return;
    var holderIdx = getHolder();
    if (holderIdx < 0) return;

    // Find nearest person that isn't holder
    var best = -1;
    var bestDist = 999999;
    for (var i = 0; i < people.length; i++) {
      if (i === holderIdx) continue;
      var dx = tx - people[i].x;
      var dy = ty - people[i].y;
      var d = Math.sqrt(dx*dx + dy*dy);
      if (d < bestDist) { bestDist = d; best = i; }
    }
    if (best >= 0 && bestDist < 280) throwTo(holderIdx, best);
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) {
        done = true;
        game.audio.play('se_failure', 0.6);
        game.end.failure();
        return;
      }
    }

    if (flashAnim > 0) flashAnim -= dt * 2;

    // Heat up holder
    var holderIdx = getHolder();
    if (holderIdx >= 0) {
      var holder = people[holderIdx];
      holder.heat += HEAT_RATE * dt * (1 + passes * 0.02);  // gets faster
      if (holder.heat >= MAX_HEAT && !done) {
        done = true;
        // Explosion
        for (var pi = 0; pi < 20; pi++) {
          var ang = Math.random() * Math.PI * 2;
          particles.push({ x: holder.x, y: holder.y, vx: Math.cos(ang)*300, vy: Math.sin(ang)*300-100, life: 0.9, col: Math.random() < 0.5 ? C.hot0 : C.flame });
        }
        game.audio.play('se_failure', 0.9);
        setTimeout(function() { game.end.failure(); }, 800);
      }
    }

    // Potato in flight
    if (potato) {
      potato.x += potato.vx * dt;
      potato.y += potato.vy * dt;
      var target = people[potato.toIdx];
      var dx = target.x - potato.x;
      var dy = target.y - potato.y;
      if (Math.sqrt(dx*dx + dy*dy) < 60) {
        target.hasPotato = true;
        target.heat = potato.heat;
        potato = null;
        flashCol = C.active;
        flashAnim = 0.3;
      }
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].vy += 400 * dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // People
    for (var pi2 = 0; pi2 < people.length; pi2++) {
      var p = people[pi2];
      var isHolder = p.hasPotato;
      var heatRatio = isHolder ? p.heat / MAX_HEAT : 0;
      var personCol = isHolder ? C.active : C.person;
      var bodyR = 70;

      // Body
      game.draw.circle(p.x, p.y, bodyR + 8, personCol, 0.1);
      game.draw.circle(p.x, p.y, bodyR, personCol, isHolder ? 0.8 + Math.sin(elapsed*8)*0.1 : 0.6);
      game.draw.circle(p.x, p.y - 55, 38, personCol, 0.8);
      game.draw.circle(p.x - 15, p.y - 65, 15, '#fff', 0.5);

      // Name
      game.draw.text(p.name, p.x, p.y + 20, { size: 52, color: isHolder ? C.active : C.personHi, bold: true });

      // Heat indicator
      if (isHolder) {
        game.draw.rect(p.x - 60, p.y + bodyR + 16, 120, 20, '#1a0a00', 0.9);
        var heatCol = heatRatio > 0.7 ? C.hot1 : heatRatio > 0.4 ? C.hot0 : '#fbbf24';
        game.draw.rect(p.x - 60, p.y + bodyR + 16, 120 * heatRatio, 20, heatCol, 0.9);
      }
    }

    // Flying potato
    if (potato) {
      var heatR = potato.heat / MAX_HEAT;
      game.draw.circle(potato.x, potato.y, 36, C.potato, 0.9);
      game.draw.circle(potato.x - 10, potato.y - 14, 14, C.potatoHi, 0.5);
      // Flame
      var fR = 20 + heatR * 30;
      game.draw.circle(potato.x, potato.y - 20, fR, C.hot0, 0.7);
      game.draw.circle(potato.x, potato.y - 30, fR * 0.6, C.flame, 0.5);
    }

    // Potato on holder
    var h = getHolder();
    if (h >= 0 && !potato) {
      var hp = people[h];
      var hr2 = hp.heat / MAX_HEAT;
      game.draw.circle(hp.x, hp.y - 80, 36, C.potato, 0.9);
      game.draw.circle(hp.x - 10, hp.y - 94, 14, C.potatoHi, 0.5);
      if (hr2 > 0.2) {
        var fR2 = 15 + hr2 * 35;
        game.draw.circle(hp.x, hp.y - 116, fR2, C.hot0, hr2 * 0.8);
        game.draw.circle(hp.x, hp.y - 130, fR2 * 0.6, C.flame, hr2 * 0.6);
        // Sparks
        for (var si = 0; si < 3; si++) {
          game.draw.circle(hp.x + (Math.sin(elapsed * 5 + si * 2))*20, hp.y - 130 - si*10, 4, C.flame, hr2);
        }
      }
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p2 = particles[pp2];
      game.draw.circle(p2.x, p2.y, 12 * p2.life, p2.col, p2.life * 0.8);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.08);

    game.draw.text(passes + ' / ' + NEEDED, W/2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.hot0 : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W/2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.12);
  });
})(game);
