/**
 * Raiz do app: carrega as fontes do brand kit, monta o provedor de sessão e
 * segura a splash até tudo estar pronto.
 *
 * A decisão de para onde ir (login ou banca) é dos layouts de grupo — aqui
 * ainda não se sabe se existe sessão guardada no aparelho.
 */

import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { Anton_400Regular } from '@expo-google-fonts/anton';
import { PermanentMarker_400Regular } from '@expo-google-fonts/permanent-marker';
import {
  InstrumentSans_400Regular,
  InstrumentSans_500Medium,
  InstrumentSans_600SemiBold,
} from '@expo-google-fonts/instrument-sans';
import { SessaoProvider } from '@/contexts/SessaoContext';
import { cores } from '@/theme';

void SplashScreen.preventAutoHideAsync();

export default function LayoutRaiz() {
  const [fontesProntas, erroDeFonte] = useFonts({
    Anton_400Regular,
    PermanentMarker_400Regular,
    InstrumentSans_400Regular,
    InstrumentSans_500Medium,
    InstrumentSans_600SemiBold,
  });

  useEffect(() => {
    // Se a fonte falhar, seguimos com a de sistema — melhor que travar na splash.
    if (fontesProntas || erroDeFonte) void SplashScreen.hideAsync();
  }, [fontesProntas, erroDeFonte]);

  if (!fontesProntas && !erroDeFonte) return null;

  return (
    <SafeAreaProvider>
      <SessaoProvider>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: cores.papel },
          }}
        >
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(banca)" />
          <Stack.Screen name="perfil" options={{ presentation: 'modal' }} />
        </Stack>
      </SessaoProvider>
    </SafeAreaProvider>
  );
}
