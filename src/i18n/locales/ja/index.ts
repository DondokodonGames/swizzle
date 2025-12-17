/**
 * Japanese (ja) locale - Split files merged
 *
 * Structure:
 * - common.json: common, errors, success
 * - auth.json: auth
 * - editor.json: editor
 * - gameLogic.json: conditions, actions, movements, effects, positions, speeds, durations, difficulties
 * - social.json: gameFeed, profile
 * - monetization.json: monetization, pricing
 * - game.json: game, bridge
 */

import common from './common.json';
import auth from './auth.json';
import editor from './editor.json';
import gameLogic from './gameLogic.json';
import social from './social.json';
import monetization from './monetization.json';
import game from './game.json';

const ja = {
  ...common,
  ...auth,
  ...editor,
  ...gameLogic,
  ...social,
  ...monetization,
  ...game,
};

export default ja;
