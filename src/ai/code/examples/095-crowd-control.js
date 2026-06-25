// 095-crowd-control.js
// 群衆整列 — バラバラに動く人々を全員ゴールに誘導する満足感
// 操作: タップで障害物を置いて群衆の流れを制御する
// 成功: 全15人をゴールへ誘導  失敗: 30秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#080c18',
    person:  '#3b82f6',
    personHi:'#93c5fd',
    goal:    '#22c55e',
    goalHi:  '#86efac',
    wall:    '#475569',
    wallHi:  '#64748b',
    wrong:   '#ef4444',
    ui:      '#334155'
  };

  var NUM_PEOPLE = 15;
  var PERSON_R = 24;
  var GOAL_X = W * 0.82;
  var GOAL_Y = H * 0.5;
  var GOAL_R = 80;
  var SPAWN_X = W * 0.12;

  var people = [];
  var walls = []; // { x, y, r }
  var score = 0;
  var timeLeft = 30;
  var done = false;
  var MAX_WALLS = 8;

  function initPeople() {
    people = [];
    for (var i = 0; i < NUM_PEOPLE; i++) {
      var y = H * 0.25 + (i % 5) * ((H * 0.5) / 5) + Math.random() * 60;
      people.push({
        x: SPAWN_X + Math.random() * 40 - 20,
        y: y,
        vx: 60 + Math.random() * 40,
        vy: (Math.random() - 0.5) * 40,
        reached: false
      });
    }
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    if (walls.length < MAX_WALLS) {
      walls.push({ x: tx, y: ty, r: 40 });
      game.audio.play('se_tap', 0.4);
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) {
        done = true;
        game.audio.play('se_failure');
        game.end.failure();
        return;
      }
    }

    // Update people
    for (var i = 0; i < people.length; i++) {
      var p = people[i];
      if (p.reached) continue;

      // Bias toward goal
      var dx = GOAL_X - p.x;
      var dy = GOAL_Y - p.y;
      var dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < GOAL_R) {
        p.reached = true;
        score++;
        game.audio.play('se_tap', 0.7);
        if (score >= NUM_PEOPLE && !done) {
          done = true;
          game.audio.play('se_success');
          setTimeout(function() { game.end.success(500 + Math.ceil(timeLeft) * 20); }, 400);
        }
        continue;
      }

      // Move toward goal with some randomness
      var spd = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
      var goalBias = 0.03;
      p.vx += (dx / dist) * spd * goalBias + (Math.random() - 0.5) * 20 * dt;
      p.vy += (dy / dist) * spd * goalBias + (Math.random() - 0.5) * 20 * dt;

      // Clamp speed
      var newSpd = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
      if (newSpd > 120) { p.vx *= 120 / newSpd; p.vy *= 120 / newSpd; }
      if (newSpd < 40) { p.vx *= 40 / newSpd; p.vy *= 40 / newSpd; }

      // Repel from walls
      for (var w = 0; w < walls.length; w++) {
        var wdx = p.x - walls[w].x;
        var wdy = p.y - walls[w].y;
        var wdist = Math.sqrt(wdx * wdx + wdy * wdy);
        if (wdist < walls[w].r + PERSON_R + 20) {
          var force = (walls[w].r + PERSON_R + 20 - wdist) * 3;
          p.vx += (wdx / wdist) * force * dt;
          p.vy += (wdy / wdist) * force * dt;
        }
      }

      // Repel from other people
      for (var j = 0; j < people.length; j++) {
        if (i === j || people[j].reached) continue;
        var pdx = p.x - people[j].x;
        var pdy = p.y - people[j].y;
        var pdist = Math.sqrt(pdx * pdx + pdy * pdy);
        if (pdist < PERSON_R * 2.5 && pdist > 0.1) {
          var pf = (PERSON_R * 2.5 - pdist) * 2;
          p.vx += (pdx / pdist) * pf * dt;
          p.vy += (pdy / pdist) * pf * dt;
        }
      }

      // Bounce off screen edges
      if (p.x < 50) { p.vx = Math.abs(p.vx); }
      if (p.x > W - 50) { p.vx = -Math.abs(p.vx); }
      if (p.y < H * 0.15) { p.vy = Math.abs(p.vy); }
      if (p.y > H * 0.85) { p.vy = -Math.abs(p.vy); }

      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Goal zone
    var gPulse = 0.3 + 0.2 * Math.abs(Math.sin(game.time.elapsed * 2));
    game.draw.circle(GOAL_X, GOAL_Y, GOAL_R + 16, C.goalHi, gPulse);
    game.draw.circle(GOAL_X, GOAL_Y, GOAL_R, C.goal, 0.3);
    game.draw.text('GOAL', GOAL_X, GOAL_Y, { size: 44, color: C.goalHi, bold: true });
    game.draw.text(score + '/' + NUM_PEOPLE, GOAL_X, GOAL_Y + 56, { size: 36, color: C.goalHi });

    // Walls
    for (var w = 0; w < walls.length; w++) {
      game.draw.circle(walls[w].x, walls[w].y, walls[w].r, C.wall);
      game.draw.circle(walls[w].x, walls[w].y, walls[w].r - 8, C.wallHi, 0.3);
    }

    // People
    for (var pi = 0; pi < people.length; pi++) {
      var per = people[pi];
      if (per.reached) continue;
      var pulse2 = 0.7 + 0.3 * Math.abs(Math.sin(game.time.elapsed * 4 + pi));
      game.draw.circle(per.x, per.y, PERSON_R + 4, C.personHi, pulse2 * 0.2);
      game.draw.circle(per.x, per.y, PERSON_R, C.person);
      // Head
      game.draw.circle(per.x, per.y - PERSON_R * 0.5, PERSON_R * 0.5, C.personHi, 0.6);
    }

    // Wall count indicator
    var wallsLeft = MAX_WALLS - walls.length;
    game.draw.text('障害物: ' + wallsLeft + '個残り', W * 0.15, H * 0.90, { size: 40, color: C.wall, bold: true });

    // Timer bar
    var ratio = Math.max(0, timeLeft / 30);
    game.draw.rect(0, 0, W, 72, '#080c18');
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? '#1d4ed8' : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });

    // Guide
    game.draw.text('タップで障害物を配置！', W / 2, H * 0.95, { size: 40, color: C.ui });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
    initPeople();
  });
})(game);
