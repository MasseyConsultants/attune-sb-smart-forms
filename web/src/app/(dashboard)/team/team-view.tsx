// Author: Robert Massey | Created: 2026-07-13 | Module: Web / Team
// Purpose: Members table (role change, deactivate), pending invites
// (resend/revoke), invite form with the seat-cap 402 rendered as an
// UpgradeCta, and a seats meter fed by the billing usage summary.

'use client';

import { useState } from 'react';

import type { Role, TeamInvite, UserProfile } from '@attune-sb/shared-types';
import { ASSIGNABLE_ROLES } from '@attune-sb/shared-types';
import { Loader2, MailPlus, RefreshCw, Trash2, UserX } from 'lucide-react';

import { UpgradeCta } from '@/components/billing/upgrade-cta';
import { Button } from '@/components/ui/button';
import { useUsage } from '@/hooks/use-billing';
import { LimitExceededError } from '@/hooks/use-forms';
import {
  useCreateInvite,
  useDeactivateMember,
  usePendingInvites,
  useResendInvite,
  useRevokeInvite,
  useTeamMembers,
  useUpdateMemberRole,
} from '@/hooks/use-team';
import { cn } from '@/lib/utils';

const ROLE_LABELS: Record<string, string> = {
  OWNER: 'Owner',
  ADMIN: 'Admin',
  BUILDER: 'Builder',
  VIEWER: 'Viewer',
  PLATFORM_ADMIN: 'Platform admin',
};

export function TeamView({ currentUserId }: { currentUserId: string }): React.ReactElement {
  const members = useTeamMembers();
  const invites = usePendingInvites();
  const usage = useUsage();
  const [seatLimit, setSeatLimit] = useState<LimitExceededError | null>(null);

  const seats = usage.data?.counted.users;
  const memberRows = members.data ?? [];
  const inviteRows = (invites.data ?? []).filter((i) => !i.acceptedAt);

  return (
    <div className="space-y-6">
      {seatLimit && (
        <UpgradeCta limitLabel="team seats" used={seatLimit.current} limit={seatLimit.limit} />
      )}

      {/* Seats meter */}
      {seats && (
        <div className="flex items-center gap-3 rounded-lg border bg-muted/30 px-4 py-3">
          <div className="flex-1">
            <div className="flex items-baseline justify-between text-xs">
              <span className="font-medium">Seats</span>
              <span className="tabular-nums text-muted-foreground">
                {seats.used} of {seats.limit} used
                {inviteRows.length > 0 && ` · ${inviteRows.length} pending`}
              </span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  'h-full rounded-full',
                  seats.used >= seats.limit
                    ? 'bg-red-500'
                    : seats.used / seats.limit >= 0.8
                      ? 'bg-amber-500'
                      : 'bg-green-500',
                )}
                style={{ width: `${Math.min(100, (seats.used / seats.limit) * 100)}%` }}
              />
            </div>
          </div>
        </div>
      )}

      <InviteForm onSeatLimit={setSeatLimit} />

      {/* Members */}
      <section className="overflow-hidden rounded-lg border">
        <h2 className="border-b bg-muted/40 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Members ({memberRows.length})
        </h2>
        {members.isLoading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <table className="w-full text-sm">
            <tbody className="divide-y">
              {memberRows.map((member) => (
                <MemberRow key={member.id} member={member} isSelf={member.id === currentUserId} />
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* Pending invites */}
      {inviteRows.length > 0 && (
        <section className="overflow-hidden rounded-lg border">
          <h2 className="border-b bg-muted/40 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Pending invitations ({inviteRows.length})
          </h2>
          <table className="w-full text-sm">
            <tbody className="divide-y">
              {inviteRows.map((invite) => (
                <InviteRow key={invite.id} invite={invite} />
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}

function MemberRow({
  member,
  isSelf,
}: {
  member: UserProfile;
  isSelf: boolean;
}): React.ReactElement {
  const updateRole = useUpdateMemberRole();
  const deactivate = useDeactivateMember();
  const [error, setError] = useState<string | null>(null);
  const roleLocked = member.role === 'OWNER' || member.role === 'PLATFORM_ADMIN' || isSelf;

  return (
    <tr className={cn(!member.isActive && 'opacity-50')}>
      <td className="px-4 py-3">
        <span className="font-medium">
          {member.firstName} {member.lastName}
          {isSelf && <span className="ml-1.5 text-[10px] text-muted-foreground">(you)</span>}
        </span>
        <p className="text-xs text-muted-foreground">{member.email}</p>
        {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
      </td>
      <td className="px-4 py-3">
        {roleLocked ? (
          <span className="text-xs font-medium">{ROLE_LABELS[member.role] ?? member.role}</span>
        ) : (
          <select
            value={member.role}
            aria-label={`Role for ${member.email}`}
            onChange={(e) => {
              setError(null);
              updateRole.mutate(
                { userId: member.id, role: e.target.value as Role },
                { onError: (err) => setError(err instanceof Error ? err.message : 'Failed') },
              );
            }}
            className="rounded-md border bg-background px-2 py-1 text-xs"
          >
            {ASSIGNABLE_ROLES.map((role) => (
              <option key={role} value={role}>
                {ROLE_LABELS[role]}
              </option>
            ))}
          </select>
        )}
      </td>
      <td className="px-4 py-3 text-right">
        {!roleLocked && (
          <Button
            size="sm"
            variant="ghost"
            aria-label={`Remove ${member.email}`}
            disabled={deactivate.isPending}
            onClick={() => {
              if (window.confirm(`Remove ${member.firstName} ${member.lastName} from the team?`)) {
                setError(null);
                deactivate.mutate(member.id, {
                  onError: (err) => setError(err instanceof Error ? err.message : 'Failed'),
                });
              }
            }}
          >
            <UserX className="h-4 w-4 text-muted-foreground" />
          </Button>
        )}
      </td>
    </tr>
  );
}

function InviteRow({ invite }: { invite: TeamInvite }): React.ReactElement {
  const resend = useResendInvite();
  const revoke = useRevokeInvite();
  const expired = new Date(invite.expiresAt) < new Date();

  return (
    <tr>
      <td className="px-4 py-3">
        <span className="font-medium">
          {invite.firstName} {invite.lastName}
        </span>
        <p className="text-xs text-muted-foreground">{invite.email}</p>
      </td>
      <td className="px-4 py-3 text-xs">{ROLE_LABELS[invite.role] ?? invite.role}</td>
      <td className="px-4 py-3 text-xs text-muted-foreground">
        {expired ? 'expired' : `expires ${new Date(invite.expiresAt).toLocaleDateString()}`}
      </td>
      <td className="px-4 py-3 text-right">
        <Button
          size="sm"
          variant="ghost"
          aria-label={`Resend invite to ${invite.email}`}
          disabled={resend.isPending}
          onClick={() => resend.mutate(invite.id)}
        >
          <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          aria-label={`Revoke invite to ${invite.email}`}
          disabled={revoke.isPending}
          onClick={() => {
            if (window.confirm(`Revoke the invitation to ${invite.email}?`)) {
              revoke.mutate(invite.id);
            }
          }}
        >
          <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
        </Button>
      </td>
    </tr>
  );
}

function InviteForm({
  onSeatLimit,
}: {
  onSeatLimit: (err: LimitExceededError | null) => void;
}): React.ReactElement {
  const createInvite = useCreateInvite();
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [role, setRole] = useState<Role>('BUILDER' as Role);
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const handleSubmit = (): void => {
    if (!email.trim() || !firstName.trim() || !lastName.trim()) {
      setError('Email, first name, and last name are required');
      return;
    }
    setError(null);
    setSentTo(null);
    onSeatLimit(null);
    createInvite.mutate(
      { email: email.trim(), firstName: firstName.trim(), lastName: lastName.trim(), role },
      {
        onSuccess: (result) => {
          setSentTo(result.email);
          setEmail('');
          setFirstName('');
          setLastName('');
        },
        onError: (err) => {
          if (err instanceof LimitExceededError) {
            onSeatLimit(err);
          } else {
            setError(err instanceof Error ? err.message : 'Invite failed');
          }
        },
      },
    );
  };

  return (
    <section className="rounded-lg border p-4">
      <h2 className="mb-3 text-sm font-semibold">Invite a teammate</h2>
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          placeholder="First name"
          className="w-36 rounded-md border bg-background px-3 py-1.5 text-sm"
        />
        <input
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          placeholder="Last name"
          className="w-36 rounded-md border bg-background px-3 py-1.5 text-sm"
        />
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          placeholder="email@company.com"
          className="w-56 rounded-md border bg-background px-3 py-1.5 text-sm"
        />
        <select
          value={role}
          aria-label="Invite role"
          onChange={(e) => setRole(e.target.value as Role)}
          className="rounded-md border bg-background px-2 py-1.5 text-sm"
        >
          {ASSIGNABLE_ROLES.map((r) => (
            <option key={r} value={r}>
              {ROLE_LABELS[r]}
            </option>
          ))}
        </select>
        <Button size="sm" onClick={handleSubmit} disabled={createInvite.isPending}>
          {createInvite.isPending ? (
            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
          ) : (
            <MailPlus className="mr-1.5 h-4 w-4" />
          )}
          Send invite
        </Button>
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground">
        Builders create and edit forms; viewers see data only; admins also manage the team.
        Invitations expire after 7 days.
      </p>
      {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
      {sentTo && <p className="mt-2 text-xs text-green-600">Invitation sent to {sentTo}.</p>}
    </section>
  );
}
