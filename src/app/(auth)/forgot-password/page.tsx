import type { Metadata } from 'next';
import { AuthLayout } from '@/components/auth/auth-layout';
import { ForgotPasswordForm } from '@/components/auth/forgot-password-form';

export const metadata: Metadata = {
  title: 'Mot de passe oublié | One Peace Shop',
  description: 'Réinitialiser votre mot de passe',
  robots: { index: false, follow: false },
};

export default function ForgotPasswordPage() {
  return (
    <AuthLayout
      title="Mot de passe oublié"
      subtitle="Nous vous enverrons un lien si un compte correspond à cet e-mail"
    >
      <ForgotPasswordForm />
    </AuthLayout>
  );
}
