import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import DashboardLayout from '../components/DashboardLayout';

export default async function StorePage() {
  const session = await auth();

  if (!session) {
    redirect('/login');
  }

  return (
    <DashboardLayout
      user={{
        firstName: session.user.firstName,
        lastName: session.user.lastName,
        email: session.user.email,
        role: session.user.role,
      }}
      title="Ertis Store"
    >
      <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
        <p className="text-gray-800 font-medium mb-2">🛍️ В разработке</p>
        <p className="text-sm text-gray-600">
          Магазин учебных материалов и ресурсов
        </p>
      </div>
    </DashboardLayout>
  );
}
