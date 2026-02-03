import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import DashboardLayout from '../components/DashboardLayout';

export default async function MyClassPage() {
  const session = await auth();

  if (!session) {
    redirect('/login');
  }

  return (
    <DashboardLayout
      user={{
        firstName: session.user.firstName,
        lastName: session.user.lastName,
        iin: session.user.iin || undefined,
        role: session.user.role,
        switchToken: (session.user as any).switchToken || undefined,
      }}
      titleKey="myClass.title"
    >
      <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <p className="text-gray-800 dark:text-gray-200 font-medium mb-2">🚧 В разработке</p>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Этот раздел для родителей - здесь можно будет отслеживать успеваемость ребенка
        </p>
      </div>
    </DashboardLayout>
  );
}
