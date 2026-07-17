// Author: Robert Massey | Created: 2026-07-16 | Module: Web / Dashboard
// Purpose: Day-0 aha checklist — form → map PDF → first filled document.

import Link from 'next/link';
import { Check, Circle, Rocket } from 'lucide-react';
import type { DashboardOnboarding } from '@attune-sb/shared-types';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface Step {
  readonly key: keyof DashboardOnboarding;
  readonly label: string;
  readonly href: string;
  readonly done: boolean;
}

interface OnboardingChecklistProps {
  readonly onboarding: DashboardOnboarding;
  readonly canCreate: boolean;
}

export function OnboardingChecklist({
  onboarding,
  canCreate,
}: OnboardingChecklistProps): React.ReactElement | null {
  if (onboarding.complete) return null;

  const steps: Step[] = [
    {
      key: 'hasForm',
      label: 'Create a form',
      href: '/forms',
      done: onboarding.hasForm,
    },
    {
      key: 'hasPublishedForm',
      label: 'Publish it so customers can fill it',
      href: '/forms',
      done: onboarding.hasPublishedForm,
    },
    {
      key: 'hasTemplate',
      label: 'Upload your existing PDF',
      href: '/templates',
      done: onboarding.hasTemplate,
    },
    {
      key: 'hasMappedTemplate',
      label: 'Map fields onto the PDF',
      href: '/templates',
      done: onboarding.hasMappedTemplate,
    },
    {
      key: 'hasSubmission',
      label: 'Collect a first submission',
      href: '/submissions',
      done: onboarding.hasSubmission,
    },
    {
      key: 'hasDocumentFill',
      label: 'See a filled document generated',
      href: '/submissions',
      done: onboarding.hasDocumentFill,
    },
  ];

  const doneCount = steps.filter((s) => s.done).length;

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Rocket className="h-4 w-4 text-primary" />
          Get to your first filled PDF
        </CardTitle>
        <CardDescription>
          {doneCount} of {steps.length} complete — this is the value moment for your trial.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ol className="space-y-2">
          {steps.map((step) => {
            const body = (
              <span className="flex items-start gap-3">
                {step.done ? (
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                ) : (
                  <Circle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                )}
                <span
                  className={`text-sm ${step.done ? 'text-muted-foreground line-through' : 'text-foreground'}`}
                >
                  {step.label}
                </span>
              </span>
            );

            if (step.done || !canCreate) {
              return (
                <li key={step.key} className="rounded-md px-2 py-1.5">
                  {body}
                </li>
              );
            }

            return (
              <li key={step.key}>
                <Link
                  href={step.href}
                  className="block rounded-md px-2 py-1.5 transition-colors hover:bg-background/80"
                >
                  {body}
                </Link>
              </li>
            );
          })}
        </ol>
      </CardContent>
    </Card>
  );
}
