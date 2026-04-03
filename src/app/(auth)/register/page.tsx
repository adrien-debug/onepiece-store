import type { Metadata } from 'next';
import { AuthLayout } from '@/components/auth/auth-layout';
import { RegisterForm } from '@/components/auth/register-form';

export const metadata: Metadata = {
  title: 'Inscription | One Peace Shop',
  description: 'Créer un compte One Peace Shop',
  robots: { index: false, follow: false },
};

export default function RegisterPage() {
  return (
    <AuthLayout title="Créer un compte" subtitle="Rejoignez l’équipage en quelques secondes">
      <RegisterForm />
    </AuthLayout>
  );
}
