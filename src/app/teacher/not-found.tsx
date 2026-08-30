import Link from 'next/link';

export default function TeacherNotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <p className="text-6xl">👩‍🏫</p>
      <h1 className="mt-4 text-2xl font-bold text-ink">找不到这位老师</h1>
      <p className="mt-2 text-ink-muted">请检查链接是否正确</p>
      <Link href="/" className="btn-primary mt-8 inline-block">
        返回首页
      </Link>
    </main>
  );
}
