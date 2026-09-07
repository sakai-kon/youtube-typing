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

/** Return all valid romaji spellings for the kana beginning at index. */
function optionsAt(reading: string, index: number): RomajiOption[] {
  const normalized = normalizeReading(reading);
  const ch = normalized[index] ?? '';
  const next = normalized[index + 1] ?? '';
  const pair = ch + next;

  if (!ch) return [];

  if (digraphMap[pair]) {
    return digraphMap[pair].map((text) => ({ text, advance: 2 }));
  }

  if (ch === 'っ') {
    if (!next) return ['xtsu','xtu','ltsu','ltu'].map((text) => ({ text, advance: 1 }));

    const nextPair = next + (normalized[index + 2] ?? '');
    const nextVariants = digraphMap[nextPair] ?? expandToken(next);
    const doubled = uniq(nextVariants.flatMap((text) => {
      const consonant = text.match(/^[a-z]/i)?.[0] ?? '';
      return consonant ? [consonant + text] : [];
    }));

    return [
      ...doubled.map((text) => ({ text, advance: digraphMap[nextPair] ? 3 : 2 })),
      ...['xtsu','xtu','ltsu','ltu'].map((text) => ({ text, advance: 1 })),
    ];
  }

  if (ch === 'ん') {
    const variants = 'aiueoy'.includes(next) ? ['nn', "n'"] : ['n','nn',"n'"];
    return variants.map((text) => ({ text, advance: 1 }));
  }

  return expandToken(ch).map((text) => ({ text, advance: 1 }));
}

/** Generate concrete valid keyboard paths. Capped only for callers that need the actual list. */
export function romajiVariants(reading: string, maxVariants = 1024): string[] {
  const normalized = normalizeReading(reading);
  const paths: string[] = [];

  const visit = (index: number, built: string): void => {
    if (paths.length >= maxVariants) return;
    if (index >= normalized.length) {
      paths.push(built);
      return;
    }
    for (const option of optionsAt(normalized, index)) {
      visit(index + option.advance, built + option.text);
      if (paths.length >= maxVariants) return;
    }
  };

  visit(0, '');
  return paths.length ? uniq(paths).slice(0, maxVariants) : [''];
}

/**
 * Judge typed input directly against the romaji state graph.
 * This deliberately does not depend on romajiVariants(), so candidate-count
 * limits can never make a valid input path invalid.
 */
function inputStatus(reading: string, typed: string): { prefix: boolean; done: boolean } {
  const normalized = normalizeReading(reading);
  const input = typed.toLowerCase();
  const memo = new Map<string, { prefix: boolean; done: boolean }>();

  const visit = (kanaIndex: number, inputIndex: number): { prefix: boolean; done: boolean } => {
    const key = `${kanaIndex}:${inputIndex}`;
    const cached = memo.get(key);
    if (cached) return cached;

    if (inputIndex === input.length) {
      const result = { prefix: true, done: kanaIndex >= normalized.length };
      memo.set(key, result);
      return result;
    }
    if (kanaIndex >= normalized.length) {
      const result = { prefix: false, done: false };
      memo.set(key, result);
      return result;
    }

    for (const option of optionsAt(normalized, kanaIndex)) {
      const remaining = input.length - inputIndex;
      if (remaining <= option.text.length) {
        const partial = input.slice(inputIndex);
        if (option.text.startsWith(partial)) {
          const completeOption = remaining === option.text.length;
          if (!completeOption) {
            const result = { prefix: true, done: false };
            memo.set(key, result);
            return result;
          }
          const child = visit(kanaIndex + option.advance, input.length);
          if (child.prefix || child.done) {
            memo.set(key, child);
            return child;
          }
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
  return inputStatus(reading, typed).done;
}

export function nextInputState(reading: string, typed: string): {
  status: 'correct' | 'wrong';
  done: boolean;
  candidates: string[];
} {
  const status = inputStatus(reading, typed);
  const input = typed.toLowerCase();
  const candidates = romajiVariants(reading, 64).filter((candidate) => candidate.startsWith(input));
  return {
    status: status.prefix ? 'correct' : 'wrong',
    done: status.done,
    candidates,
  };
}
