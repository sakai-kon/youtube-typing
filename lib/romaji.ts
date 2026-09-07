const hiraMap: Record<string, string[]> = {
  'あ':['a'],'い':['i'],'う':['u'],'え':['e'],'お':['o'],
  'か':['ka'],'き':['ki'],'く':['ku'],'け':['ke'],'こ':['ko'],
  'さ':['sa'],'し':['shi','si'],'す':['su'],'せ':['se'],'そ':['so'],
  'た':['ta'],'ち':['chi','ti'],'つ':['tsu','tu'],'て':['te'],'と':['to'],
  'な':['na'],'に':['ni'],'ぬ':['nu'],'ね':['ne'],'の':['no'],
  'は':['ha'],'ひ':['hi'],'ふ':['fu','hu'],'へ':['he'],'ほ':['ho'],
  'ま':['ma'],'み':['mi'],'む':['mu'],'め':['me'],'も':['mo'],
  'や':['ya'],'ゆ':['yu'],'よ':['yo'],
  'ら':['ra'],'り':['ri'],'る':['ru'],'れ':['re'],'ろ':['ro'],
  'わ':['wa'],'を':['wo','o'],'ん':['n','nn'],
  'が':['ga'],'ぎ':['gi'],'ぐ':['gu'],'げ':['ge'],'ご':['go'],
  'ざ':['za'],'じ':['ji','zi'],'ず':['zu'],'ぜ':['ze'],'ぞ':['zo'],
  'だ':['da'],'ぢ':['di','ji'],'づ':['du','zu'],'で':['de'],'ど':['do'],
  'ば':['ba'],'び':['bi'],'ぶ':['bu'],'べ':['be'],'ぼ':['bo'],
  'ぱ':['pa'],'ぴ':['pi'],'ぷ':['pu'],'ぺ':['pe'],'ぽ':['po'],
  'ゔ':['vu'],'ゐ':['wi'],'ゑ':['we'],
  'ぁ':['xa','la'],'ぃ':['xi','li'],'ぅ':['xu','lu'],'ぇ':['xe','le'],'ぉ':['xo','lo'],
  'ゃ':['xya','lya'],'ゅ':['xyu','lyu'],'ょ':['xyo','lyo'],
  'ゎ':['xwa','lwa'],'っ':['xtsu','xtu','ltsu','ltu'],
  'ゕ':['xka','lka'],'ゖ':['xke','lke'],
};

const digraphMap: Record<string, string[]> = {
  'きゃ':['kya'],'きゅ':['kyu'],'きょ':['kyo'],
  'しゃ':['sha','sya'],'しゅ':['shu','syu'],'しょ':['sho','syo'],
  'ちゃ':['cha','cya','tya'],'ちゅ':['chu','cyu','tyu'],'ちょ':['cho','cyo','tyo'],
  'にゃ':['nya'],'にゅ':['nyu'],'にょ':['nyo'],
  'ひゃ':['hya'],'ひゅ':['hyu'],'ひょ':['hyo'],
  'みゃ':['mya'],'みゅ':['myu'],'みょ':['myo'],
  'りゃ':['rya'],'りゅ':['ryu'],'りょ':['ryo'],
  'ぎゃ':['gya'],'ぎゅ':['gyu'],'ぎょ':['gyo'],
  'じゃ':['ja','jya','zya'],'じゅ':['ju','jyu','zyu'],'じょ':['jo','jyo','zyo'],
  'びゃ':['bya'],'びゅ':['byu'],'びょ':['byo'],
  'ぴゃ':['pya'],'ぴゅ':['pyu'],'ぴょ':['pyo'],
  'でぃ':['di','dhi'],'どぅ':['du','dwu'],'てぃ':['thi','ti'],'とぅ':['twu'],
  'うぃ':['wi'],'うぇ':['we'],'うぉ':['who','wo'],'いぇ':['ye'],
  'ゔぁ':['va'],'ゔぃ':['vi'],'ゔぇ':['ve'],'ゔぉ':['vo'],'ゔゅ':['vyu'],
  'ふぁ':['fa','fwa'],'ふぃ':['fi','fwi'],'ふぇ':['fe','fwe'],'ふぉ':['fo','fwo'],'ふゅ':['fyu'],
  'つぁ':['tsa'],'つぃ':['tsi'],'つぇ':['tse'],'つぉ':['tso'],
  'すぃ':['si','swi'],'ずぃ':['zi','zwi'],'てゅ':['thu','tyu'],'でゅ':['dhu','dyu'],
  'くぁ':['qa','kwa'],'くぃ':['qi','kwi'],'くぇ':['qe','kwe'],'くぉ':['qo','kwo'],'くゅ':['qyu','kyu'],
  'ぐぁ':['gwa'],'ぐぃ':['gwi'],'ぐぇ':['gwe'],'ぐぉ':['gwo'],'ぐゅ':['gwyu'],
  'しぇ':['she'],'じぇ':['je','jye','zye'],
};

const symbolMap: Record<string, string[]> = {
  'ー':['-'],'。':['.'],'、':[','],'！':['!'],'？':['?'],'（':['('],'）':[')'],
  '「':['['],'」':[']'],'『':['['],'』':[']'],'・':['/'],'：':[':'],'；':[';'],
  '　':[' '],' ':[' '],'〜':['~'],'～':['~'],
};

type RomajiOption = { text: string; advance: number };

function toHiragana(input: string): string {
  return input.replace(/[ァ-ヶ]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0x60));
}

function uniq(values: string[]): string[] {
  return [...new Set(values)];
}

export function normalizeReading(input: string): string {
  return toHiragana(input.normalize('NFKC')).trim();
}

function expandToken(token: string): string[] {
  if (digraphMap[token]) return digraphMap[token];
  if (hiraMap[token]) return hiraMap[token];
  if (symbolMap[token]) return symbolMap[token];
  return [token.toLowerCase()];
}

/** Convert kana text into atomic romaji alternatives without losing consumption information. */
function buildOptions(reading: string): RomajiOption[][] {
  const normalized = normalizeReading(reading);
  const result: RomajiOption[][] = [];

  for (let i = 0; i < normalized.length;) {
    const ch = normalized[i];
    const next = normalized[i + 1] ?? '';
    const pair = ch + next;

    if (digraphMap[pair]) {
      result.push(digraphMap[pair].map((text) => ({ text, advance: 2 })));
      i += 2;
      continue;
    }

    if (ch === 'っ') {
      if (!next) {
        result.push(['xtsu','xtu','ltsu','ltu'].map((text) => ({ text, advance: 1 })));
        i += 1;
        continue;
      }

      const nextPair = next + (normalized[i + 2] ?? '');
      const nextVariants = digraphMap[nextPair] ?? expandToken(next);
      const doubled = uniq(nextVariants.flatMap((text) => {
        const consonant = text.match(/^[a-z]/i)?.[0] ?? '';
        return consonant ? [consonant + text] : [];
      }));
      const options: RomajiOption[] = [
        ...doubled.map((text) => ({ text, advance: digraphMap[nextPair] ? 3 : 2 })),
        ...['xtsu','xtu','ltsu','ltu'].map((text) => ({ text, advance: 1 })),
      ];
      result.push(options);
      i += digraphMap[nextPair] ? 1 : 1;
      continue;
    }

    if (ch === 'ん') {
      const variants = 'aiueoy'.includes(next) ? ['nn', "n'"] : ['n','nn',"n'"];
      result.push(variants.map((text) => ({ text, advance: 1 })));
      i += 1;
      continue;
    }

    result.push(expandToken(ch).map((text) => ({ text, advance: 1 })));
    i += 1;
  }

  return result;
}

/** Generate common valid keyboard paths. This remains bounded for callers that need concrete candidates. */
export function romajiVariants(reading: string, maxVariants = 1024): string[] {
  const options = buildOptions(reading);
  let paths: string[] = [''];
  let tokenIndex = 0;
  const normalized = normalizeReading(reading);

  while (tokenIndex < options.length) {
    const nextPaths: string[] = [];
    for (const base of paths) {
      for (const option of options[tokenIndex]) {
        nextPaths.push(base + option.text);
        if (nextPaths.length >= maxVariants * 2) break;
      }
      if (nextPaths.length >= maxVariants * 2) break;
    }
    paths = uniq(nextPaths).slice(0, maxVariants);
    if (!paths.length) break;

    let advance = options[tokenIndex][0]?.advance ?? 1;
    // buildOptions has one entry per logical token, so one result entry advances exactly once here.
    // The actual kana cursor is already accounted for while constructing options.
    void advance;
    tokenIndex += 1;
  }

  void normalized;
  return paths.length ? paths : [''];
}

function inputStatus(options: RomajiOption[][], typed: string): { prefix: boolean; done: boolean } {
  const memo = new Map<string, { prefix: boolean; done: boolean }>();

  const visit = (tokenIndex: number, inputIndex: number): { prefix: boolean; done: boolean } => {
    const key = `${tokenIndex}:${inputIndex}`;
    const cached = memo.get(key);
    if (cached) return cached;

    if (inputIndex === typed.length) {
      const done = tokenIndex === options.length;
      const result = { prefix: true, done };
      memo.set(key, result);
      return result;
    }
    if (tokenIndex >= options.length) {
      const result = { prefix: false, done: false };
      memo.set(key, result);
      return result;
    }

    for (const option of options[tokenIndex]) {
      let cursor = inputIndex;
      let matches = true;
      for (let j = 0; j < option.text.length && cursor < typed.length; j += 1, cursor += 1) {
        if (typed[cursor] !== option.text[j].toLowerCase()) {
          matches = false;
          break;
        }
      }
      if (!matches) continue;

      // The typed input ends inside this option, so it is a valid prefix even if
      // that option itself has not been completed yet.
      if (cursor === typed.length && typed.length - inputIndex < option.text.length) {
        const result = { prefix: true, done: false };
        memo.set(key, result);
        return result;
      }

      // The option was fully matched; continue with the next logical kana token.
      if (cursor === typed.length) {
        const child = visit(tokenIndex + 1, cursor);
        if (child.prefix || child.done) {
          memo.set(key, child);
          return child;
        }
      }
    }

    const result = { prefix: false, done: false };
    memo.set(key, result);
    return result;
  };

  return visit(0, 0);
}

export function isAcceptedInput(reading: string, typed: string): boolean {
  const input = typed.toLowerCase();
  return inputStatus(buildOptions(reading), input).done;
}

export function nextInputState(reading: string, typed: string): {
  status: 'correct' | 'wrong';
  done: boolean;
  candidates: string[];
} {
  const input = typed.toLowerCase();
  const options = buildOptions(reading);
  const status = inputStatus(options, input);

  // Candidates are informational only; the actual judge above does NOT depend on
  // candidate enumeration, so large maps can never lose a valid path because of a cap.
  const candidates = romajiVariants(reading, 64).filter((candidate) => candidate.startsWith(input));
  return {
    status: status.prefix ? 'correct' : 'wrong',
    done: status.done,
    candidates,
  };
}
