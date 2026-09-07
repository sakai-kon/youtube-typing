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
  'でぃ':['di','dhi'],'どぅ':['du','dwu'],'てぃ':['thi','ti'],'とぅ':['twu','twu'],
  'うぃ':['wi'],'うぇ':['we'],'うぉ':['who','wo'],
  'いぇ':['ye'],'ゔぁ':['va'],'ゔぃ':['vi'],'ゔぇ':['ve'],'ゔぉ':['vo'],
  'ふぁ':['fa','fwa'],'ふぃ':['fi','fwi'],'ふぇ':['fe','fwe'],'ふぉ':['fo','fwo'],
  'ふゅ':['fyu'],
  'つぁ':['tsa'],'つぃ':['tsi'],'つぇ':['tse'],'つぉ':['tso'],
  'すぃ':['si'],'ずぃ':['zi'],'てゅ':['thu','tyu'],'でゅ':['dhu','dyu'],
  'くぁ':['qa','kwa'],'くぃ':['qi','kwi'],'くぇ':['qe','kwe'],'くぉ':['qo','kwo'],
  'ぐぁ':['gwa'],'ぐぃ':['gwi'],'ぐぇ':['gwe'],'ぐぉ':['gwo'],
  'しぇ':['she'],'じぇ':['je','jye','zye'],
};

const symbolMap: Record<string, string[]> = {
  'ー':['-'],'。':['.'],'、':[','],'！':['!'],'？':['?'],'（':['('],'）':[')'],
  '「':['['],'」':[']'],'『':['['],'』':[']'],'・':['/'],'：':[':'],'；':[';'],
  '　':[' '], ' ':[' '], '〜':['~'],'～':['~'],
};

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

function appendPaths(paths: string[], variants: string[], maxVariants: number): string[] {
  const nextPaths: string[] = [];
  for (const base of paths) {
    for (const variant of variants) {
      nextPaths.push(base + variant);
      if (nextPaths.length >= maxVariants * 2) break;
    }
    if (nextPaths.length >= maxVariants * 2) break;
  }
  return uniq(nextPaths).slice(0, maxVariants);
}

/** Generate common valid keyboard paths. Supports alternate IME-style spellings. */
export function romajiVariants(reading: string, maxVariants = 256): string[] {
  const normalized = normalizeReading(reading);
  let paths: string[] = [''];

  for (let i = 0; i < normalized.length;) {
    const ch = normalized[i];
    const next = normalized[i + 1] ?? '';
    const pair = ch + next;

    // Longest token first: digraphs such as しゃ, ふぁ, でゅ, etc.
    if (digraphMap[pair]) {
      paths = appendPaths(paths, digraphMap[pair], maxVariants);
      i += 2;
      continue;
    }

    // Small tsu (っ): consume it together with the following kana so that
    // the following kana is NOT appended a second time. This fixes cases like
    // ぼくだってさ -> bokudattesa instead of bokudattetesa.
    if (ch === 'っ') {
      if (!next) {
        paths = appendPaths(paths, ['xtsu','xtu','ltsu','ltu'], maxVariants);
        i += 1;
        continue;
      }

      const nextPair = next + (normalized[i + 2] ?? '');
      const nextVariants = digraphMap[nextPair] ?? expandToken(next);
      const doubled = uniq(nextVariants.flatMap((v) => {
        const consonant = v.match(/^[a-z]/i)?.[0] ?? '';
        return consonant ? [consonant + v] : [];
      }));

      paths = appendPaths(paths, [...doubled, 'xtsu','xtu','ltsu','ltu'], maxVariants);
      i += digraphMap[nextPair] ? 3 : 2;
      continue;
    }

    // ん before a vowel or y needs a disambiguating spelling in IME-style input.
    if (ch === 'ん') {
      const variants = 'aiueoy'.includes(next) ? ['nn'] : ['n','nn'];
      paths = appendPaths(paths, variants, maxVariants);
      i += 1;
      continue;
    }

    paths = appendPaths(paths, expandToken(ch), maxVariants);
    i += 1;
  }

  return paths.length ? paths : [''];
}

export function isAcceptedInput(reading: string, typed: string): boolean {
  const normalizedTyped = typed.toLowerCase();
  return romajiVariants(reading).some((candidate) => candidate === normalizedTyped);
}

export function nextInputState(reading: string, typed: string): {
  status: 'correct' | 'wrong';
  done: boolean;
  candidates: string[];
} {
  const input = typed.toLowerCase();
  const candidates = romajiVariants(reading);
  const prefixes = candidates.filter((candidate) => candidate.startsWith(input));
  return {
    status: prefixes.length ? 'correct' : 'wrong',
    done: candidates.includes(input),
    candidates: prefixes,
  };
}
