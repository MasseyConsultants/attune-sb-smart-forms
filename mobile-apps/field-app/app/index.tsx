// Author: Robert Massey | Created: 2026-07-16 | Module: Field App Index
// Phase 0: route to login stub. M1 will hydrate SecureStore and branch on session.
import { Redirect } from 'expo-router';
import React from 'react';

export default function Index(): React.ReactElement {
  return <Redirect href="/(auth)/login" />;
}
