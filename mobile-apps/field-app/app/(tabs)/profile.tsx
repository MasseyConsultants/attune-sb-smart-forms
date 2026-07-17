// Author: Robert Massey | Created: 2026-07-16 | Module: Field App Profile (Phase 0 stub)
import { MOBILE_BRAND } from '@attune-sb/mobile-shared';
import { Link } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export default function ProfileScreen(): React.ReactElement {
  return (
    <View style={styles.root}>
      <Text style={styles.title}>Profile</Text>
      <Text style={styles.body}>
        Org membership, plan, and sign-out wire up in M1. Privacy policy lives on the web app.
      </Text>
      <Link href="/(auth)/login" asChild>
        <Pressable style={styles.link} accessibilityRole="button">
          <Text style={styles.linkText}>Back to login shell</Text>
        </Pressable>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    padding: 24,
    backgroundColor: '#FFFFFF',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  body: {
    fontSize: 16,
    color: '#4B5563',
    lineHeight: 24,
    marginBottom: 24,
  },
  link: {
    alignSelf: 'flex-start',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: MOBILE_BRAND.primary,
  },
  linkText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
