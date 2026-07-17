// Author: Robert Massey | Created: 2026-07-16 | Module: Field App Tabs
import { MOBILE_BRAND } from '@attune-sb/mobile-shared';
import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';

export default function TabsLayout(): React.ReactElement {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: MOBILE_BRAND.primary,
        tabBarInactiveTintColor: '#9CA3AF',
        headerStyle: { backgroundColor: MOBILE_BRAND.primaryDark },
        headerTintColor: '#FFFFFF',
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="forms"
        options={{
          title: 'Forms',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="document-text-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
