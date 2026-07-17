// Author: Robert Massey | Created: 2026-07-16 | Module: Field App Home (Phase 0 stub)
import { MOBILE_BRAND, MOBILE_SHARED_VERSION } from '@attune-sb/mobile-shared';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export default function HomeScreen(): React.ReactElement {
  return (
    <View style={styles.root}>
      <Text style={styles.title}>Welcome</Text>
      <Text style={styles.body}>
        {MOBILE_BRAND.appName} field app scaffold is ready. Next: M1 auth against the SMB API.
      </Text>
      <Text style={styles.meta}>mobile-shared v{MOBILE_SHARED_VERSION}</Text>
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
  },
  meta: {
    marginTop: 24,
    fontSize: 12,
    color: '#9CA3AF',
  },
});
