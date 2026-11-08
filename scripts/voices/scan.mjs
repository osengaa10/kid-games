// Finds what a game says by reading its source: the sentences inside say(), sayN() and sayP()
// calls (and `say:` properties), and every sentence-like string anywhere in a file, so a test can
// catch a new line that someone added but didn't voice. It's a small tokenizer, not a full JS
// parser: it knows strings, template literals, comments and parentheses, which is all this needs.

// A string literal, a template literal (only kept whole when it has no ${...}), or a piece of code.
export function tokens(src) {
  const out = [];
  let i = 0;
  let code = '';
  const flush = () => {
    if (code) out.push({ type: 'code', text: code });
    code = '';
  };
  while (i < src.length) {
    const c = src[i];
    const next = src[i + 1];
    if (c === '/' && next === '/') {
      const end = src.indexOf('\n', i);
      i = end < 0 ? src.length : end;
      continue;
    }
    if (c === '/' && next === '*') {
      const end = src.indexOf('*/', i + 2);
      i = end < 0 ? src.length : end + 2;
      continue;
    }
    if (c === "'" || c === '"') {
      flush();
      let j = i + 1;
      let s = '';
      while (j < src.length && src[j] !== c && src[j] !== '\n') {
        if (src[j] === '\\') {
          s += src[j + 1];
          j += 2;
        } else s += src[j++];
      }
      out.push({ type: 'string', text: s, at: i });
      i = j + 1;
      continue;
    }
    if (c === '`') {
      flush();
      let j = i + 1;
      let s = '';
      let dynamic = false;
      while (j < src.length && src[j] !== '`') {
        if (src[j] === '\\') {
          s += src[j + 1];
          j += 2;
        } else if (src[j] === '$' && src[j + 1] === '{') {
          dynamic = true;
          let depth = 1;
          j += 2;
          while (j < src.length && depth) {
            if (src[j] === '{') depth++;
            else if (src[j] === '}') depth--;
            j++;
          }
          s += '${…}';
        } else s += src[j++];
      }
      out.push({ type: dynamic ? 'template' : 'string', text: s, at: i });
      i = j + 1;
      continue;
    }
    code += c;
    i++;
  }
  flush();
  return out;
}

// Looks like something a person says out loud, not an id, a CSS value or a file name.
export function isSentence(s) {
  const t = s.trim();
  if (!/[A-Za-z]/.test(t) || /[<>{}=;#]|\.js$|^\.|\/\//.test(t)) return false;
  return /[!?…]$/.test(t) || (/^[A-Z]/.test(t) && / /.test(t) && /\.$/.test(t));
}

// The calls that speak: say(...), sayN(...), sayP(...), and the `say: ...` properties (hints that
// are spoken later). For each: which function, the sentences in its arguments, the templates
// (lines built from data, which the game's voice-lines.mjs has to list itself) and the raw code
// of the arguments (to tell the narrator from a patient in a plain say()).
export function sayCalls(src) {
  const toks = tokens(src);
  const calls = [];
  for (let k = 0; k < toks.length; k++) {
    const t = toks[k];
    if (t.type !== 'code') continue;
    const re = /\b(say[NP]?)\s*\(|\bsay\s*:/g;
    let m;
    while ((m = re.exec(t.text))) {
      const fn = m[1] || 'say:';
      const call = { fn, sentences: [], templates: [], code: '' };
      // walk forward from just after the match, through the arguments
      let depth = fn === 'say:' ? 0 : 1;
      let rest = t.text.slice(m.index + m[0].length);
      let kk = k;
      let done = false;
      const take = (code) => {
        for (let p = 0; p < code.length; p++) {
          const ch = code[p];
          if (ch === '(' || ch === '[' || ch === '{') depth++;
          else if (ch === ')' || ch === ']' || ch === '}') {
            depth--;
            if (depth < 0 || (fn !== 'say:' && depth === 0)) return true;
          } else if (fn === 'say:' && depth === 0 && (ch === ',' || ch === '\n')) return true;
          call.code += ch;
        }
        return false;
      };
      done = take(rest);
      while (!done && ++kk < toks.length) {
        const n = toks[kk];
        if (n.type === 'code') done = take(n.text);
        else if (n.type === 'string') {
          if (isSentence(n.text)) call.sentences.push(n.text);
        } else call.templates.push(n.text);
      }
      // a function definition (sayN(text, opts = {}) { ... }) says nothing
      if (call.sentences.length || call.templates.length) calls.push(call);
    }
  }
  return calls;
}

// Every sentence-like string in the file, wherever it is.
export function sentences(src) {
  return tokens(src)
    .filter((t) => t.type === 'string' && isSentence(t.text))
    .map((t) => t.text);
}

// What the game looks a clip up by: the text with its spaces tidied.
export const tidy = (text) => String(text).trim().replace(/\s+/g, ' ');
export const clipKey = (voice, text) => `${voice}|${tidy(text)}`;
