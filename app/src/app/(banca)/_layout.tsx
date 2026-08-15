/**
 * As cinco abas do produto. Sem sessão, não se entra: a rota volta para o
 * login (RNF09 — a sessão também morre sozinha por inatividade).
 */

import { Redirect, Tabs } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSessao } from '@/contexts/SessaoContext';
import { alturaBarraDeAbas, cores, fontes, raio, sombra } from '@/theme';

export default function LayoutBanca() {
  const { restaurando, autenticado } = useSessao();
  const insets = useSafeAreaInsets();

  if (restaurando) return null;
  if (!autenticado) return <Redirect href="/entrar" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: cores.lilas,
        tabBarInactiveTintColor: cores.tintaFraca,
        tabBarStyle: {
          backgroundColor: cores.superficie,
          // No template a barra é uma superfície solta: cantos de cima
          // arredondados e sombra subindo, sem filete de borda.
          borderTopWidth: 0,
          borderTopLeftRadius: raio.md,
          borderTopRightRadius: raio.md,
          position: 'absolute',
          ...sombra.barra,
          // A altura é fixada aqui para que `TelaModulo` saiba quanto
          // reservar no fim da rolagem.
          height: alturaBarraDeAbas + insets.bottom,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontFamily: fontes.corpoForte,
          fontSize: 12,
        },
        tabBarIconStyle: { height: 24 },
        sceneStyle: { backgroundColor: cores.fundo },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'A banca',
          tabBarIcon: ({ color }) => <Feather name="home" color={color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="despensa"
        options={{
          title: 'Despensa',
          tabBarIcon: ({ color }) => <Feather name="box" color={color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="grana"
        options={{
          title: 'Grana',
          tabBarIcon: ({ color }) => (
            <Feather name="dollar-sign" color={color} size={24} />
          ),
        }}
      />
      <Tabs.Screen
        name="cabeca"
        options={{
          title: 'Cabeça',
          tabBarIcon: ({ color }) => <Feather name="book-open" color={color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="roupa"
        options={{
          title: 'Roupa',
          tabBarIcon: ({ color }) => <Feather name="wind" color={color} size={24} />,
        }}
      />
    </Tabs>
  );
}
