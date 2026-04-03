import type { Metadata } from 'next';
import { AuthLayout } from '@/components/auth/auth-layout';
import { LoginForm } from '@/components/auth/login-form';

export const metadata: Metadata = {
  title: 'Connexion | One Peace Shop',
  description: 'Connexion à votre compte One Peace Shop',
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
    <AuthLayout title="Connexion" subtitle="Bienvenue sur la boutique">
      <LoginForm />
    </AuthLayout>
  );
}
