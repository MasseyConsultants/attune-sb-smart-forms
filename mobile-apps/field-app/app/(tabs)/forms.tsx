// Author: Robert Massey | Created: 2026-07-16 | Module: Field App Forms (Phase 0 stub)
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export default function FormsScreen(): React.ReactElement {
  return (
    <View style={styles.root}>
      <Text style={styles.title}>Forms</Text>
      <Text style={styles.body}>
        Published forms list and native fill land in mobile phase M2 (RN form-engine renderer).
      </Text>
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
});
