import Link from 'next/link';
import type { TypingMap } from '@/lib/types';

const visibilityLabel: Record<TypingMap['visibility'], string> = { public: '公開', unlisted: '共有', private: '非公開' };

export function MapCard({ map, editable = false }: { map: TypingMap; editable?: boolean }) {
  return (
    <article className="card map-card">
      <h3>{map.title}</h3>
      <p className="muted">{map.description || '説明なし'}</p>
      <div className="tag-row">
        <span className="tag">{visibilityLabel[map.visibility]}</span>
        <span className="tag">{map.lines.length}行</span>
        {map.tags.slice(0, 4).map((tag) => <span className="tag" key={tag}>#{tag}</span>)}
      </div>
      <div className="cta-row">
        <Link className="btn primary" href={`/play/?id=${encodeURIComponent(map.id)}`}>プレイ</Link>
        {editable && <Link className="btn" href={`/create/?edit=${encodeURIComponent(map.id)}`}>編集</Link>}
      </div>
    </article>
  );
}
