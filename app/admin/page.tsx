'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { SiteHeader } from '@/components/site-header';
import { getSupabase } from '@/lib/supabase/client';
import CopyrightRequests from './copyright-requests';

type Report = {
  id: number;
  map_id: string;
  reason: string;
  details: string;
  status: string;
  created_at: string;
};
type Profile = {
  id: string;
  username: string | null;
  display_name: string | null;
  role: string;
  created_at: string;
};
type AdminProfileRow = Pick<Profile, 'role'>;
type ReportFilter = 'all' | 'open' | 'closed';

const statusLabels: Record<string, string> = {
  pending: '未確認',
  reviewing: '確認中',
  resolved: '解決済み',
  dismissed: '却下',
};
const statusLabel = (status: string) => statusLabels[status] ?? status;

export default function AdminPage() {
  const supabase = getSupabase();
  const [allowed, setAllowed] = useState(false);
  const [currentUserId, setCurrentUserId] = useState('');
  const [reports, setReports] = useState<Report[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [message, setMessage] = useState('管理者権限を確認しています…');
  const [isLoading, setIsLoading] = useState(true);
  const [reportFilter, setReportFilter] = useState<ReportFilter>('open');
  const [reportSearch, setReportSearch] = useState('');
  const [profileSearch, setProfileSearch] = useState('');

  const load = async () => {
    setIsLoading(true);
    setMessage('');
    try {
      if (!supabase) {
        setAllowed(false);
        setMessage('Supabaseが設定されていません。');
        return;
      }

      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        setAllowed(false);
        setMessage('管理者画面を開くには、管理者アカウントでログインしてください。');
        return;
      }
      setCurrentUserId(user.id);

      const { data: meData, error: roleError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();
      const me = meData as AdminProfileRow | null;
      if (roleError || me?.role !== 'admin') {
        setAllowed(false);
        setMessage(roleError ? \`権限を確認できませんでした: \${roleError.message}\` : 'このアカウントには管理者権限がありません。');
        return;
      }

      setAllowed(true);
      const [
        { data: reportData, error: reportError },
        { data: profileData, error: profileError },
      ] = await Promise.all([
        supabase
          .from('reports')
          .select('id, map_id, reason, details, status, created_at')
          .order('created_at', { ascending: false })
          .limit(100),
        supabase
          .from('profiles')
          .select('id, username, display_name, role, created_at')
          .order('created_at', { ascending: false })
          .limit(500),
      ]);

      if (reportError) setMessage(\`通報の読み込みに失敗しました: \${reportError.message}\`);
      else setReports(reportData ?? []);

      if (profileError) {
        setMessage((previous) => previous
          ? \`\${previous} / ユーザー一覧の読み込みに失敗しました: \${profileError.message}\`
          : \`ユーザー一覧の読み込みに失敗しました: \${profileError.message}\`);
      } else {
        setProfiles(profileData ?? []);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'データの読み込みに失敗しました。');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const updateReport = async (id: number, status: string) => {
    if (!supabase) return;
    const { error } = await supabase
      .from('reports')
      .update({
        status,
        resolved_at: status === 'resolved' || status === 'dismissed' ? new Date().toISOString() : null,
      })
      .eq('id', id);
    if (error) {
      setMessage(\`通報の更新に失敗しました: \${error.message}\`);
      return;
    }
    await load();
    setMessage('通報の状態を更新しました。');
  };

  const unpublish = async (mapId: string) => {
    if (!supabase || !window.confirm('この譜面を非公開にしますか？')) return;
    const { error } = await supabase.from('maps').update({ visibility: 'private' }).eq('id', mapId);
    if (error) {
      setMessage(\`非公開化に失敗しました: \${error.message}\`);
      return;
    }
    await load();
    setMessage('譜面を非公開にしました。');
  };

  const deleteMap = async (mapId: string) => {
    if (!supabase || !window.confirm('この譜面を削除しますか？この操作は元に戻せません。')) return;
    const { error } = await supabase.from('maps').delete().eq('id', mapId);
    if (error) {
      setMessage(\`譜面の削除に失敗しました: \${error.message}\`);
      return;
    }
    await load();
    setMessage('譜面を削除しました。');
  };

  const setRole = async (id: string, role: 'user' | 'admin') => {
    if (!supabase || id === currentUserId) return;
    const { error } = await supabase.from('profiles').update({ role }).eq('id', id);
    if (error) {
      setMessage(\`権限の更新に失敗しました: \${error.message}\`);
      return;
    }
    await load();
    setMessage('ユーザー権限を更新しました。');
  };

  const visibleReports = reports.filter((report) => {
    const isClosed = report.status === 'resolved' || report.status === 'dismissed';
    if (reportFilter === 'open' && isClosed) return false;
    if (reportFilter === 'closed' && !isClosed) return false;
    const query = reportSearch.trim().toLowerCase();
    return !query || [report.reason, report.map_id, report.details, report.status]
      .some((value) => (value ?? '').toLowerCase().includes(query));
  });

  const visibleProfiles = profiles.filter((profile) => {
    const query = profileSearch.trim().toLowerCase();
    return !query || [
      profile.display_name ?? '',
      profile.username ?? '',
      profile.id,
      profile.role,
    ].some((value) => value.toLowerCase().includes(query));
  });
  const openReports = reports.filter((report) => report.status !== 'resolved' && report.status !== 'dismissed').length;

  if (!allowed) {
    return (
      <>
        <SiteHeader />
        <main className="container section admin-page">
          <div className="admin-access-card">
            <div className="admin-access-icon" aria-hidden="true">⌁</div>
            <p className="admin-eyebrow">YOUTUBE TYPING / ADMIN</p>
            <h1 className="page-title">管理センター</h1>
            <p className="admin-lead">{message}</p>
            <div className="cta-row">
              <Link className="btn primary" href="/login/">ログイン画面へ</Link>
              <Link className="btn" href="/profile/?id=me">プロフィールへ</Link>
              <Link className="btn" href="/">トップへ戻る</Link>
            </div>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <SiteHeader />
      <main className="container section admin-page">
        <div className="admin-hero">
          <div className="admin-hero-icon" aria-hidden="true">⌘</div>
          <div className="admin-hero-copy">
            <p className="admin-eyebrow">YOUTUBE TYPING / CONTROL CENTER</p>
            <h1 className="page-title">管理センター</h1>
            <p className="admin-lead">通報への対応、ユーザー権限、著作権申立てをひとつの場所から管理できます。</p>
            <div className="admin-access-note"><span className="admin-live-dot" />管理者としてログイン中</div>
          </div>
          <button type="button" className="btn admin-refresh" onClick={() => void load()} disabled={isLoading}>
            <span aria-hidden="true">↻</span>{isLoading ? '更新中…' : 'データを更新'}
          </button>
        </div>

        {message && <div className="notice admin-message" role="status">{message}</div>}

        <div className="admin-stats">
          <article className="admin-stat">
            <span className="admin-stat-label">対応が必要な通報</span>
            <strong className="admin-stat-value">{openReports}</strong>
            <span className="admin-stat-foot">直近100件から集計</span>
          </article>
          <article className="admin-stat">
            <span className="admin-stat-label">読み込み済みユーザー</span>
            <strong className="admin-stat-value">{profiles.length}</strong>
            <span className="admin-stat-foot">最大500件を表示</span>
          </article>
          <article className="admin-stat">
            <span className="admin-stat-label">取得した通報</span>
            <strong className="admin-stat-value">{reports.length}</strong>
            <span className="admin-stat-foot">新しい順に表示</span>
          </article>
        </div>

        <CopyrightRequests />

        <div className="admin-workspace">
          <section className="admin-panel">
            <div className="admin-panel-heading">
              <div>
                <p className="admin-eyebrow">MODERATION</p>
                <h2>通報管理</h2>
                <p className="muted">譜面の通報を確認し、必要に応じて対応します。</p>
              </div>
              <span className="admin-count">{visibleReports.length}件</span>
            </div>

            <div className="admin-toolbar">
              <label className="admin-search">
                <span className="admin-search-icon" aria-hidden="true">⌕</span>
                <input
                  type="search"
                  value={reportSearch}
                  onChange={(event) => setReportSearch(event.target.value)}
                  placeholder="理由・譜面ID・詳細を検索"
                  aria-label="通報を検索"
                />
              </label>
              <div className="admin-filter-tabs" aria-label="通報の絞り込み">
                <button type="button" className={reportFilter === 'open' ? 'selected' : ''} onClick={() => setReportFilter('open')}>未対応</button>
                <button type="button" className={reportFilter === 'all' ? 'selected' : ''} onClick={() => setReportFilter('all')}>すべて</button>
                <button type="button" className={reportFilter === 'closed' ? 'selected' : ''} onClick={() => setReportFilter('closed')}>対応済み</button>
              </div>
            </div>

            {isLoading && reports.length === 0 ? <div className="admin-empty">通報を読み込んでいます…</div>
              : visibleReports.length === 0 ? <div className="admin-empty"><strong>表示する通報はありません</strong><span>検索条件や絞り込みを変更してください。</span></div>
              : <div className="admin-list">
                {visibleReports.map((report) => {
                  const closed = report.status === 'resolved' || report.status === 'dismissed';
                  return (
                    <article className="admin-list-card" key={report.id}>
                      <div className="admin-list-topline">
                        <span className="admin-item-id">REPORT / {report.id}</span>
                        <span className={\`admin-status-chip \${closed ? 'is-closed' : 'is-open'}\`}>{statusLabel(report.status)}</span>
                      </div>
                      <h3 className="admin-item-title">{report.reason || '理由未設定'}</h3>
                      <p className="admin-item-description">{report.details || '詳細は記載されていません。'}</p>
                      <div className="admin-item-meta">
                        <span>譜面 ID: <code>{report.map_id}</code></span>
                        <span>{new Date(report.created_at).toLocaleString('ja-JP')}</span>
                      </div>
                      <div className="admin-action-row">
                        <button type="button" className="btn btn-small" onClick={() => void unpublish(report.map_id)}>非公開化</button>
                        <button type="button" className="btn btn-small btn-danger" onClick={() => void deleteMap(report.map_id)}>譜面を削除</button>
                        <span className="admin-action-spacer" />
                        <button type="button" className="btn btn-small" onClick={() => void updateReport(report.id, 'reviewing')}>確認中にする</button>
                        <button type="button" className="btn btn-small" onClick={() => void updateReport(report.id, 'resolved')}>解決</button>
                        <button type="button" className="btn btn-small" onClick={() => void updateReport(report.id, 'dismissed')}>却下</button>
                      </div>
                    </article>
                  );
                })}
              </div>}
          </section>

          <section className="admin-panel">
            <div className="admin-panel-heading">
              <div>
                <p className="admin-eyebrow">ACCESS CONTROL</p>
                <h2>ユーザー管理</h2>
                <p className="muted">管理者権限を付与・解除できます。</p>
              </div>
              <span className="admin-count">{visibleProfiles.length}件</span>
            </div>

            <label className="admin-search admin-user-search">
              <span className="admin-search-icon" aria-hidden="true">⌕</span>
              <input
                type="search"
                value={profileSearch}
                onChange={(event) => setProfileSearch(event.target.value)}
                placeholder="名前・ユーザー名・IDで検索"
                aria-label="ユーザーを検索"
              />
            </label>

            {isLoading && profiles.length === 0 ? <div className="admin-empty">ユーザーを読み込んでいます…</div>
              : visibleProfiles.length === 0 ? <div className="admin-empty"><strong>該当するユーザーがいません</strong><span>検索語を変更してください。</span></div>
              : <div className="admin-list admin-user-list">
                {visibleProfiles.map((profile) => {
                  const isSelf = profile.id === currentUserId;
                  return (
                    <article className="admin-user-row" key={profile.id}>
                      <div className="admin-user-avatar" aria-hidden="true">
                        {(profile.display_name || profile.username || '?').slice(0, 1).toUpperCase()}
                      </div>
                      <div className="admin-user-info">
                        <strong>{profile.display_name || profile.username || '名前未設定'}</strong>
                        <span>{profile.username ? \`@\${profile.username}\` : 'ユーザー名未設定'}</span>
                        {isSelf && <span className="admin-self-label">あなたのアカウント</span>}
                      </div>
                      <label className="admin-role-control">
                        <span>権限</span>
                        <select
                          value={profile.role}
                          disabled={isSelf || isLoading}
                          aria-label={\`\${profile.display_name || profile.username || profile.id} の権限\`}
                          onChange={(event) => void setRole(profile.id, event.target.value as 'user' | 'admin')}
                        >
                          <option value="user">一般ユーザー</option>
                          <option value="admin">管理者</option>
                        </select>
                      </label>
                    </article>
                  );
                })}
              </div>}
            <p className="admin-footnote">安全のため、自分自身の権限はこの画面から変更できません。</p>
          </section>
        </div>

        <div className="admin-bottom-links">
          <Link className="text-link" href="/profile/?id=me">← プロフィールに戻る</Link>
          <Link className="text-link" href="/copyright/">著作権申立てページを開く →</Link>
        </div>
      </main>
    </>
  );
}
