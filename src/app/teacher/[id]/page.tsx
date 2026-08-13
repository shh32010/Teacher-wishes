// ============================================================
// 教师主页 — 教师信息 + 收到的祝福（SSR）
// 暖色主题
// ============================================================

import { notFound } from 'next/navigation';
import Image from 'next/image';
import dynamicImport from 'next/dynamic';
import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import NavHeader from '@/components/ui/NavHeader';
import type { Teacher, Blessing } from '@/types';
import { formatDate } from '@/lib/utils';
import { Metadata } from 'next';

const ShareButton = dynamicImport(() => import('@/components/ui/ShareButton'), { ssr: false });
const SortToggle = dynamicImport(() => import('@/components/blessing/SortToggle'), { ssr: false });

export const dynamic = 'force-dynamic';

interface TeacherPageProps {
  params: { id: string };
  searchParams: { sort?: string };
}

export async function generateMetadata({ params }: TeacherPageProps): Promise<Metadata> {
  const supabase = createClient();
  const { data: teacher } = await supabase
    .from('teachers')
    .select('name')
    .eq('id', params.id)
    .single();

  if (!teacher) return { title: '教师未找到' };

  return {
    title: `${teacher.name}老师 — 收到的祝福`,
    description: `查看${teacher.name}老师收到的教师节祝福`,
  };
}

export default async function TeacherPage({ params, searchParams }: TeacherPageProps) {
  const supabase = createClient();
  const sort = searchParams.sort === 'likes' ? 'likes' : 'time';
  const sortField = sort === 'likes' ? 'likes' : 'created_at';

  const [teacherResult, blessingsResult, countResult] = await Promise.all([
    supabase.from('teachers').select('*').eq('id', params.id).single(),
    supabase
      .from('blessings')
      .select('*')
      .eq('teacher_id', params.id)
      .eq('status', 'approved')
      .order('is_featured', { ascending: false })
      .order(sortField, { ascending: false })
      .limit(50),
    supabase
      .from('blessings')
      .select('id', { count: 'exact', head: true })
      .eq('teacher_id', params.id)
      .eq('status', 'approved'),
  ]);

  if (teacherResult.error || !teacherResult.data) {
    notFound();
  }

  const teacher = teacherResult.data as Teacher;
  const blessings = (blessingsResult.data || []) as Blessing[];
  const totalCount = countResult.count || blessings.length;
  const truncated = totalCount > blessings.length;

  return (
    <main className="min-h-screen">
      {/* 顶部导航 */}
      <NavHeader
        left={
          <a href="/" className="text-lg font-bold text-ink">
            🌟 教师节祝福墙
          </a>
        }
        right={
          <a href="/wall" className="text-sm text-ink-muted hover:text-ink transition-colors">
            返回祝福墙 →
          </a>
        }
      />

      <div className="mx-auto max-w-3xl px-4 py-12">
        {/* 教师信息卡片 */}
        <div className="glass-card mb-12 text-center">
          <div className="mx-auto mb-4 relative flex h-24 w-24 items-center justify-center rounded-full bg-primary/15 text-4xl overflow-hidden">
            {teacher.avatar_url ? (
              <Image
                src={teacher.avatar_url}
                alt={teacher.name}
                fill
                className="object-cover"
                sizes="96px"
              />
            ) : (
              '👩‍🏫'
            )}
          </div>
          <h1 className="text-3xl font-bold text-ink">{teacher.name}老师</h1>
          {teacher.department && <p className="mt-2 text-ink-light">{teacher.department}</p>}
          {teacher.description && (
            <p className="mt-4 text-sm leading-relaxed text-ink">{teacher.description}</p>
          )}
          <div className="mt-6 flex items-center justify-center gap-4">
            <p className="text-lg font-semibold text-accent">收到 {totalCount} 条祝福</p>
            <ShareButton />
          </div>
        </div>

        {/* 排序切换 + 祝福列表 */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-medium text-ink-light">
            {truncated
              ? `展示前 ${blessings.length} 条（共 ${totalCount} 条）`
              : `${blessings.length} 条祝福`}
          </h2>
          <Suspense fallback={<div className="h-8 w-24 rounded-lg bg-ink/5" />}>
            <SortToggle />
          </Suspense>
        </div>

        {blessings.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-ink-muted">还没有祝福，快来送上第一条吧 💌</p>
          </div>
        ) : (
          <div className="space-y-4">
            {blessings.map((blessing) => (
              <div
                key={blessing.id}
                className={`glass-card relative ${
                  blessing.is_featured
                    ? 'border-amber-400/40 bg-amber-400/8 ring-1 ring-amber-400/30'
                    : ''
                }`}
                style={{ '--hover': 'none' } as React.CSSProperties}
              >
                {blessing.is_featured && (
                  <div className="absolute -right-2 -top-2 rounded-full bg-amber-400 px-2.5 py-0.5 text-xs font-bold text-amber-900 shadow-lg shadow-amber-400/30">
                    ⭐ 精选
                  </div>
                )}
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm font-medium text-ink">
                    {blessing.is_anonymous ? '匿名同学' : blessing.nickname || '匿名同学'}
                  </span>
                  <span className="text-xs text-ink-muted">{formatDate(blessing.created_at)}</span>
                </div>
                <p className="text-ink">{blessing.content}</p>
                <div className="mt-3 flex items-center gap-2 text-sm text-like">
                  <span>❤️</span>
                  <span>{blessing.likes}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
