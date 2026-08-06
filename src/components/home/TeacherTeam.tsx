// ============================================================
// 首页教师团队头像行
// ============================================================

'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import type { Teacher } from '@/types';

interface TeacherTeamProps {
  visible: boolean;
}

export default function TeacherTeam({ visible }: TeacherTeamProps) {
  const router = useRouter();
  const [teachers, setTeachers] = useState<Teacher[]>([]);

  useEffect(() => {
    fetch('/api/teachers')
      .then((res) => res.json())
      .then((data) => {
        if (data.teachers) setTeachers(data.teachers);
      })
      .catch(() => {});
  }, []);

  if (!visible || teachers.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1, duration: 0.8 }}
      className="flex flex-col items-center gap-3"
    >
      <p className="text-xs text-slate-500">致敬我们的老师</p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        {teachers.map((teacher, i) => (
          <motion.button
            key={teacher.id}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 1 + i * 0.1, duration: 0.4 }}
            onClick={() => router.push(`/teacher/${teacher.id}`)}
            className="flex flex-col items-center gap-1.5 group"
          >
            {teacher.avatar_url ? (
              <div className="h-14 w-14 rounded-full ring-2 ring-accent/20 overflow-hidden group-hover:ring-accent/60 transition-all duration-300">
                <img
                  src={teacher.avatar_url}
                  alt={teacher.name}
                  className="h-full w-full object-cover"
                />
              </div>
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/20 text-lg font-bold text-primary-light ring-2 ring-primary/10 group-hover:ring-primary/40 transition-all duration-300">
                {teacher.name[0]}
              </div>
            )}
            <span className="text-xs text-slate-400 group-hover:text-white transition-colors">
              {teacher.name}
            </span>
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}
