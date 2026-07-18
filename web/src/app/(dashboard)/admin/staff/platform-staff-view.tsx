// Author: Robert Massey | Created: 2026-07-18 | Module: Web / Admin
// Purpose: Invite / grant / revoke PLATFORM_ADMIN peers (SB-030).

'use client';

import { FormEvent, useState } from 'react';

import { Loader2, ShieldPlus, UserMinus, UserPlus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  useGrantPlatformAdmin,
  useInvitePlatformAdmin,
  usePlatformStaff,
  useRevokePlatformAdmin,
} from '@/hooks/use-admin';

export function PlatformStaffView({
  currentUserId,
}: {
  currentUserId: string;
}): React.ReactElement {
  const staff = usePlatformStaff();
  const invite = useInvitePlatformAdmin();
  const grant = useGrantPlatformAdmin();
  const revoke = useRevokePlatformAdmin();

  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [formOk, setFormOk] = useState<string | null>(null);

  async function onInvite(e: FormEvent): Promise<void> {
    e.preventDefault();
    setFormError(null);
    setFormOk(null);
    try {
      await invite.mutateAsync({ email, firstName, lastName });
      setEmail('');
      setFirstName('');
      setLastName('');
      setFormOk("Invitation sent. They'll set a password from the email link.");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Invite failed');
    }
  }

  const members = staff.data?.members ?? [];
  const pending = staff.data?.pendingInvites ?? [];
  const adminCount = staff.data?.platformAdminCount ?? 0;

  return (
    <div className="space-y-6">
      <form onSubmit={onInvite} className="space-y-3 rounded-lg border p-4">
        <div className="flex items-center gap-2">
          <ShieldPlus className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold">Invite platform admin</h2>
        </div>
        <p className="text-xs text-muted-foreground">
          Sends an invite into the Attune platform org with full admin + ops access. Use a company
          email (e.g. @attuneitus.com).
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          <input
            required
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-9 rounded-md border bg-background px-3 text-sm"
          />
          <input
            required
            placeholder="First name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="h-9 rounded-md border bg-background px-3 text-sm"
          />
          <input
            required
            placeholder="Last name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className="h-9 rounded-md border bg-background px-3 text-sm"
          />
        </div>
        {formError && <p className="text-xs text-red-600">{formError}</p>}
        {formOk && <p className="text-xs text-green-700">{formOk}</p>}
        <Button type="submit" size="sm" disabled={invite.isPending}>
          {invite.isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
          Send invite
        </Button>
      </form>

      <section className="overflow-hidden rounded-lg border">
        <h2 className="border-b bg-muted/40 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Platform staff ({members.length}) · {adminCount} admin
          {adminCount === 1 ? '' : 's'}
        </h2>
        {staff.isLoading ? (
          <div className="flex justify-center p-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium">Email</th>
                <th className="px-4 py-2 font-medium">Role</th>
                <th className="px-4 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => {
                const isSelf = m.id === currentUserId;
                const isAdmin = m.role === 'PLATFORM_ADMIN';
                return (
                  <tr key={m.id} className="border-b last:border-0">
                    <td className="px-4 py-2.5">
                      {m.firstName} {m.lastName}
                      {isSelf ? (
                        <span className="ml-1.5 text-xs text-muted-foreground">(you)</span>
                      ) : null}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">{m.email}</td>
                    <td className="px-4 py-2.5">
                      <span
                        className={
                          isAdmin
                            ? 'rounded bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary'
                            : 'text-xs text-muted-foreground'
                        }
                      >
                        {m.role}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      {!isAdmin && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={grant.isPending}
                          onClick={() => grant.mutate(m.id)}
                        >
                          <UserPlus className="mr-1 h-3.5 w-3.5" />
                          Make admin
                        </Button>
                      )}
                      {isAdmin && !isSelf && (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          disabled={revoke.isPending || adminCount <= 1}
                          onClick={() => {
                            if (
                              window.confirm(
                                `Revoke platform admin from ${m.email}? They will become ADMIN in the platform org.`,
                              )
                            ) {
                              revoke.mutate(m.id);
                            }
                          }}
                        >
                          <UserMinus className="mr-1 h-3.5 w-3.5" />
                          Revoke
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>

      {pending.length > 0 && (
        <section className="overflow-hidden rounded-lg border">
          <h2 className="border-b bg-muted/40 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Pending platform invites ({pending.length})
          </h2>
          <ul className="divide-y text-sm">
            {pending.map((i) => (
              <li key={i.id} className="flex items-center justify-between px-4 py-2.5">
                <span>
                  {i.firstName} {i.lastName}{' '}
                  <span className="text-muted-foreground">({i.email})</span>
                </span>
                <span className="text-xs text-muted-foreground">
                  Expires {new Date(i.expiresAt).toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {(grant.error || revoke.error) && (
        <p className="text-xs text-red-600">
          {grant.error instanceof Error
            ? grant.error.message
            : revoke.error instanceof Error
              ? revoke.error.message
              : 'Action failed'}
        </p>
      )}
    </div>
  );
}
