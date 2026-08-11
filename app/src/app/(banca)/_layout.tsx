/**
 * As cinco abas do produto. Sem sessão, não se entra: a rota volta para o
 * login (RNF09 — a sessão também morre sozinha por inatividade).
 */

import { Redirect, Tabs } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSessao } from '@/contexts/SessaoContext';
import { alturaBarraDeAbas, cores, fontes } from '@/theme';

export default function LayoutBanca() {
  const { restaurando, autenticado } = useSessao();
  const insets = useSafeAreaInsets();

  if (restaurando) return null;
  if (!autenticado) return <Redirect href="/entrar" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: cores.olive,
        tabBarInactiveTintColor: cores.tintaFraca,
        tabBarStyle: {
          backgroundColor: cores.papelCartao,
          borderTopColor: cores.linha,
          // A altura é fixada aqui para que `TelaModulo` saiba quanto
          // reservar no fim da rolagem.
          height: alturaBarraDeAbas + insets.bottom,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontFamily: fontes.corpoMedio,
          fontSize: 11,
        },
        sceneStyle: { backgroundColor: cores.papel },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'A banca',
          tabBarIcon: ({ color, size }) => <Feather name="home" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="despensa"
        options={{
          title: 'Despensa',
          tabBarIcon: ({ color, size }) => <Feather name="box" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="grana"
        options={{
          title: 'Grana',
          tabBarIcon: ({ color, size }) => (
            <Feather name="dollar-sign" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="cabeca"
        options={{
          title: 'Cabeça',
          tabBarIcon: ({ color, size }) => <Feather name="book-open" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="roupa"
        options={{
          title: 'Roupa',
          tabBarIcon: ({ color, size }) => <Feather name="wind" color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
