// ============================================================
// 教师主页 — 教师信息 + 收到的祝福（SSR）
// ============================================================

import { notFound } from 'next/navigation';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/server';
import type { Teacher, Blessing } from '@/types';
import { formatDate } from '@/lib/utils';
import { Metadata } from 'next';

/** 教师页面按需 SSR（未来可改为 ISR） */
export const dynamic = 'force-dynamic';

interface TeacherPageProps {
  params: { id: string };
}

/** 动态生成元数据 */
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

export default async function TeacherPage({ params }: TeacherPageProps) {
  const supabase = createClient();

  // 并行获取教师信息和祝福列表
  const [teacherResult, blessingsResult] = await Promise.all([
    supabase.from('teachers').select('*').eq('id', params.id).single(),
    supabase
      .from('blessings')
      .select('*')
      .eq('teacher_id', params.id)
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .limit(50),
  ]);

  if (teacherResult.error || !teacherResult.data) {
    notFound();
  }

  const teacher = teacherResult.data as Teacher;
  const blessings = (blessingsResult.data || []) as Blessing[];

  return (
    <main className="min-h-screen bg-night">
      {/* 顶部导航 */}
      <header className="glass sticky top-0 z-30 border-b border-white/5 backdrop-blur-xl">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
          <a href="/" className="text-lg font-bold text-white">
            🌟 教师节祝福墙
          </a>
          <a href="/wall" className="text-sm text-slate-400 hover:text-white transition-colors">
            返回祝福墙 →
          </a>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-12">
        {/* 教师信息卡片 */}
        <div className="glass-card mb-12 text-center">
          <div className="mx-auto mb-4 relative flex h-24 w-24 items-center justify-center rounded-full bg-primary/20 text-4xl overflow-hidden">
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
          <h1 className="text-3xl font-bold text-white">{teacher.name}老师</h1>
          {teacher.department && <p className="mt-2 text-slate-400">{teacher.department}</p>}
          {teacher.description && (
            <p className="mt-4 text-sm leading-relaxed text-slate-300">{teacher.description}</p>
          )}
          <p className="mt-6 text-lg font-semibold text-accent-light">
            收到 {blessings.length} 条祝福
          </p>
        </div>

        {/* 祝福列表 */}
        {blessings.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-slate-500">还没有祝福，快来送上第一条吧 💌</p>
          </div>
        ) : (
          <div className="space-y-4">
            {blessings.map((blessing) => (
              <div
                key={blessing.id}
                className="glass-card"
                style={{ '--hover': 'none' } as React.CSSProperties}
              >
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm font-medium text-white">
                    {blessing.is_anonymous ? '匿名同学' : blessing.nickname || '匿名同学'}
                  </span>
                  <span className="text-xs text-slate-500">{formatDate(blessing.created_at)}</span>
                </div>
                <p className="text-slate-200">{blessing.content}</p>
                <div className="mt-3 flex items-center gap-2 text-sm text-pink-400">
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
