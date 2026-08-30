// ============================================================
// 教师管理组件 — 头像上传 + 列表管理 · 暖色主题
// ============================================================

'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import type { Teacher } from '@/types';
import { getCsrfToken } from '@/lib/csrf-client';

export default function TeacherManager() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [uploading, setUploading] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [targetTeacher, setTargetTeacher] = useState<string>('');

  const loadTeachers = async () => {
    const res = await fetch('/api/teachers');
    if (res.ok) {
      const data = await res.json();
      setTeachers(data.teachers || []);
    }
  };

  useEffect(() => {
    loadTeachers();
  }, []);

  const handleFileSelect = (teacherId: string) => {
    setTargetTeacher(teacherId);
    fileRef.current?.click();
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !targetTeacher) return;

    setUploading(targetTeacher);

    const formData = new FormData();
    formData.append('teacher_id', targetTeacher);
    formData.append('file', file);

    try {
      const csrfToken = await getCsrfToken();
      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        headers: csrfToken ? { 'X-CSRF-Token': csrfToken } : {},
        body: formData,
      });
      if (res.ok) {
        await loadTeachers();
      } else {
        const err = await res.json();
        alert(err.error || '上传失败');
      }
    } catch {
      alert('网络错误');
    } finally {
      setUploading(null);
      setTargetTeacher('');
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  if (teachers.length === 0) {
    return <p className="py-8 text-center text-ink-muted">暂无教师数据</p>;
  }

  const withAvatar = teachers.filter((t) => t.avatar_url).length;
  const avatarPct = teachers.length > 0 ? Math.round((withAvatar / teachers.length) * 100) : 0;

  return (
    <div>
      <h2 className="mb-4 text-lg font-bold text-ink">教师管理</h2>

      {/* 统计看板 */}
      <div className="mb-6 grid grid-cols-3 gap-4">
        <div className="glass-card text-center">
          <p className="text-3xl font-bold text-accent">{teachers.length}</p>
          <p className="text-sm text-ink-muted">教师总数</p>
        </div>
        <div className="glass-card text-center">
          <p className="text-3xl font-bold text-primary">{withAvatar}</p>
          <p className="text-sm text-ink-muted">已有头像</p>
        </div>
        <div className="glass-card text-center">
          <p className="text-3xl font-bold text-secondary">{avatarPct}%</p>
          <p className="text-sm text-ink-muted">头像覆盖率</p>
        </div>
      </div>

      <div className="glass overflow-hidden rounded-2xl">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-ink/10 text-ink-muted">
            <tr>
              <th className="p-4">头像</th>
              <th className="p-4">姓名</th>
              <th className="p-4">部门</th>
              <th className="p-4">操作</th>
            </tr>
          </thead>
          <tbody>
            {teachers.map((teacher) => (
              <tr
                key={teacher.id}
                className="border-b border-ink/5 hover:bg-ink/5 transition-colors"
              >
                <td className="p-4">
                  {teacher.avatar_url ? (
                    <Image
                      src={teacher.avatar_url}
                      alt={teacher.name}
                      width={40}
                      height={40}
                      className="rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-sm text-primary">
                      {teacher.name[0]}
                    </div>
                  )}
                </td>
                <td className="p-4 text-ink">{teacher.name}</td>
                <td className="p-4 text-ink-light">{teacher.department || '-'}</td>
                <td className="p-4">
                  <button
                    onClick={() => handleFileSelect(teacher.id)}
                    disabled={uploading === teacher.id}
                    className="rounded-lg bg-primary/15 px-3 py-1 text-xs text-primary hover:bg-primary/25 disabled:opacity-50"
                  >
                    {uploading === teacher.id ? '上传中...' : '📷 上传头像'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleUpload}
      />
    </div>
  );
}
