// Author: Robert Massey | Created: 2026-07-16 | Module: Field App Login (Phase 0 stub)
import { MOBILE_BRAND } from '@attune-sb/mobile-shared';
import { Link } from 'expo-router';
import React from 'react';
import { Image, Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';

export default function LoginScreen(): React.ReactElement {
  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.hero}>
        <Image
          source={require('../../assets/attune-icon.png')}
          style={styles.logo}
          accessibilityLabel={`${MOBILE_BRAND.appName} logo`}
        />
        <Text style={styles.brand}>{MOBILE_BRAND.appName}</Text>
        <Text style={styles.tagline}>Forms, documents, and workflows — in the field.</Text>
      </View>

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Sign in</Text>
        <Text style={styles.panelBody}>
          Auth against the SMB API ships in mobile phase M1. This shell confirms branding,
          navigation, and store-ready config.
        </Text>

        <Link href="/(tabs)/home" asChild>
          <Pressable style={styles.cta} accessibilityRole="button">
            <Text style={styles.ctaText}>Continue to app shell</Text>
          </Pressable>
        </Link>

        <Text style={styles.footer}>{MOBILE_BRAND.copyright}</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: MOBILE_BRAND.primaryDark,
  },
  hero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  logo: {
    width: 88,
    height: 88,
    borderRadius: 20,
    marginBottom: 20,
  },
  brand: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
  },
  tagline: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 22,
  },
  panel: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 36,
  },
  panelTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  panelBody: {
    fontSize: 15,
    color: '#4B5563',
    lineHeight: 22,
    marginBottom: 24,
  },
  cta: {
    backgroundColor: MOBILE_BRAND.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  ctaText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    marginTop: 20,
    textAlign: 'center',
    fontSize: 12,
    color: '#9CA3AF',
  },
});
