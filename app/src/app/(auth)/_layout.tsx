/** Telas públicas. Quem já tem sessão válida não passa por aqui. */

import { Redirect, Stack } from 'expo-router';
import { useSessao } from '@/contexts/SessaoContext';
import { cores } from '@/theme';

export default function LayoutAutenticacao() {
  const { restaurando, autenticado } = useSessao();

  if (restaurando) return null;
  if (autenticado) return <Redirect href="/" />;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: cores.papel },
      }}
    />
  );
}
