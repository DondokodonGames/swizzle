/**
 * Shared JSON extraction and parsing utility for LLM responses.
 *
 * Key improvement over per-file implementations:
 * - fixStringControlChars(): escapes real newlines/tabs inside string values
 *   (root cause of "Expected ',' or '}' after property value" errors)
 * - String-aware bracket balancing: doesn't count { } [ ] inside strings
 * - Bracket-aware extraction: finds the true end of the outermost object
 */

/**
 * Extract and parse JSON from an LLM response.
 * Applies a recovery chain on parse failure.
 */
export function robustParseJSON<T>(text: string): T {
  const jsonStr = extractJSONString(text);
  if (!jsonStr) throw new Error('No JSON object found in response');

  // 1. Direct parse
  try {
    return JSON.parse(jsonStr) as T;
  } catch (firstError) {
    // 2. Apply repairs
    const repaired = applyRepairs(jsonStr);
    try {
      return JSON.parse(repaired) as T;
    } catch {
      // 3. Balance brackets (string-aware)
      const balanced = balanceBracketsStringAware(repaired);
      try {
        return JSON.parse(balanced) as T;
      } catch (thirdError) {
        // 4. Truncate at error position
        const posMatch = String(thirdError).match(/position (\d+)/);
        if (posMatch) {
          const truncated = truncateAtValidPoint(balanced, parseInt(posMatch[1]));
          try {
            return JSON.parse(truncated) as T;
          } catch { /* fall through */ }
        }
        throw new Error(`JSON parse failed after all recovery attempts: ${firstError}`);
      }
    }
  }
}

/**
 * Extract and parse a JSON array from an LLM response.
 */
export function robustParseJSONArray<T>(text: string): T[] {
  // Try markdown code block first
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  let jsonStr = codeBlockMatch ? codeBlockMatch[1].trim() : text;

  // Find array bounds
  const start = jsonStr.indexOf('[');
  if (start !== -1) {
    jsonStr = jsonStr.substring(start);
    // Trim to matching ]
    const end = findMatchingBracket(jsonStr, 0, '[', ']');
    if (end !== -1) jsonStr = jsonStr.substring(0, end + 1);
  }

  try {
    return JSON.parse(applyRepairs(jsonStr)) as T[];
  } catch {
    return [];
  }
}

// ============================================================
// Internal helpers
// ============================================================

function extractJSONString(text: string): string {
  // Prefer markdown code block
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) return codeBlockMatch[1].trim();

  // Bracket-aware extraction of the outermost { ... }
  const start = text.indexOf('{');
  if (start === -1) return '';

  const end = findMatchingBracket(text, start, '{', '}');
  if (end !== -1) return text.substring(start, end + 1);

  // Fallback: take everything from first {
  return text.substring(start);
}

function findMatchingBracket(text: string, start: number, open: string, close: string): number {
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (escaped) { escaped = false; continue; }
    if (ch === '\\' && inString) { escaped = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (!inString) {
      if (ch === open) depth++;
      if (ch === close) { depth--; if (depth === 0) return i; }
    }
  }
  return -1;
}

function applyRepairs(jsonStr: string): string {
  let s = jsonStr;

  // Remove JS comments
  s = s.replace(/\/\/[^\n]*/g, '');
  s = s.replace(/\/\*[\s\S]*?\*\//g, '');

  // Escape unescaped control characters inside string values (THE main fix)
  s = fixStringControlChars(s);

  // Remove trailing commas before } or ]
  s = s.replace(/,(\s*[}\]])/g, '$1');

  return s;
}

/**
 * Walk the JSON character-by-character, tracking whether we're inside a string.
 * Any raw newline / carriage-return / tab inside a string gets escaped.
 * Other control chars (< 0x20) inside a string are dropped.
 */
function fixStringControlChars(json: string): string {
  let result = '';
  let inString = false;
  let escaped = false;

  for (let i = 0; i < json.length; i++) {
    const ch = json[i];
    const code = json.charCodeAt(i);

    if (escaped) {
      result += ch;
      escaped = false;
      continue;
    }

    if (ch === '\\' && inString) {
      result += ch;
      escaped = true;
      continue;
    }

    if (ch === '"') {
      inString = !inString;
      result += ch;
      continue;
    }

    if (inString) {
      if (ch === '\n') { result += '\\n'; continue; }
      if (ch === '\r') { result += '\\r'; continue; }
      if (ch === '\t') { result += '\\t'; continue; }
      if (code < 0x20) continue; // strip other control chars
    }

    result += ch;
  }

  return result;
}

function balanceBracketsStringAware(json: string): string {
  let openBraces = 0;
  let openBrackets = 0;
  let inString = false;
  let escaped = false;

  for (const ch of json) {
    if (escaped) { escaped = false; continue; }
    if (ch === '\\' && inString) { escaped = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (!inString) {
      if (ch === '{') openBraces++;
      if (ch === '}') openBraces--;
      if (ch === '[') openBrackets++;
      if (ch === ']') openBrackets--;
    }
  }

  let result = json;
  while (openBrackets > 0) { result += ']'; openBrackets--; }
  while (openBraces > 0) { result += '}'; openBraces--; }
  return result;
}

function truncateAtValidPoint(json: string, errorPosition: number): string {
  let pos = errorPosition;
  for (let i = errorPosition - 1; i > 0; i--) {
    if (json[i] === '}' || json[i] === ']' || json[i] === '"') {
      pos = i + 1;
      break;
    }
  }
  const truncated = json.substring(0, pos).replace(/,\s*$/, '');
  return balanceBracketsStringAware(truncated);
}
