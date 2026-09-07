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
  'でぃ':['di'],'どぅ':['du'],'てぃ':['thi'],'とぅ':['twu'],
  'うぃ':['wi'],'うぇ':['we'],'うぉ':['who','wo'],
  'ふぁ':['fa','fwa'],'ふぃ':['fi'],'ふぇ':['fe'],'ふぉ':['fo'],
};

const symbolMap: Record<string, string[]> = {
  'ー':['-'],'。':['.'],'、':[','],'！':['!'],'？':['?'],'（':['('],'）':[')'],
  '「':['['],'」':[']'],'・':['/'],'　':[' '], ' ':[' '],
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

/** Generate common valid keyboard paths. Kept deterministic and capped. */
export function romajiVariants(reading: string, maxVariants = 128): string[] {
  const normalized = normalizeReading(reading);
  const paths: string[] = [''];

  for (let i = 0; i < normalized.length; i += 1) {
    const ch = normalized[i];
    const next = normalized[i + 1] ?? '';
    const pair = ch + next;
    let tokenLen = 1;
    let variants = expandToken(ch);

    if (digraphMap[pair]) {
      variants = digraphMap[pair];
      tokenLen = 2;
    } else if (ch === 'っ') {
      const nextPair = next + (normalized[i + 2] ?? '');
      const nextVariants = expandToken(digraphMap[nextPair] ? nextPair : next);
      const doubled = uniq(nextVariants.flatMap((v) => (v[0] ? [v[0] + v] : [])));
      variants = [...doubled, 'xtsu', 'ltu'];
    } else if (ch === 'ん') {
      // N can be ambiguous before vowels/y, so include the safe double-n route.
      variants = ['n','nn'];
      if ('aiueoy'.includes(next)) variants = ['nn'];
    }

    const nextPaths: string[] = [];
    for (const base of paths) {
      for (const variant of variants) {
        nextPaths.push(base + variant);
        if (nextPaths.length >= maxVariants) break;
      }
      if (nextPaths.length >= maxVariants) break;
    }
    paths.splice(0, paths.length, ...uniq(nextPaths).slice(0, maxVariants));
    i += tokenLen - 1;
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
