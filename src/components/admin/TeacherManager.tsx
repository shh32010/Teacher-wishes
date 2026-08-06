// ============================================================
// 教师管理组件 — 头像上传 + 列表管理
// ============================================================

'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import type { Teacher } from '@/types';

export default function TeacherManager() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [uploading, setUploading] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [targetTeacher, setTargetTeacher] = useState<string>('');

  // 加载教师列表
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
      const res = await fetch('/api/admin/upload', {
        method: 'POST',
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
    return <p className="py-8 text-center text-slate-500">暂无教师数据</p>;
  }

  return (
    <div>
      <h2 className="mb-4 text-lg font-bold text-white">👩‍🏫 教师管理</h2>

      <div className="glass overflow-hidden rounded-2xl">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-white/10 text-slate-400">
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
                className="border-b border-white/5 hover:bg-white/5 transition-colors"
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
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20 text-sm">
                      {teacher.name[0]}
                    </div>
                  )}
                </td>
                <td className="p-4 text-white">{teacher.name}</td>
                <td className="p-4 text-slate-400">{teacher.department || '-'}</td>
                <td className="p-4">
                  <button
                    onClick={() => handleFileSelect(teacher.id)}
                    disabled={uploading === teacher.id}
                    className="rounded-lg bg-primary/20 px-3 py-1 text-xs text-primary-light hover:bg-primary/30 disabled:opacity-50"
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
