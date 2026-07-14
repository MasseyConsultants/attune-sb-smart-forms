// Author: Robert Massey | Created: 2026-07-13 | Module: Library / Tests
// Every curated seed template must clone cleanly: valid category, unique slug,
// a schema that passes the publish-time validator, and (when bundled) a
// workflow graph that passes graph validation. A bad seed row would ship a
// broken "Use this template" button to every new signup.

import { LIBRARY_CATEGORIES } from '@attune-sb/shared-types';

import { LIBRARY_SEED_TEMPLATES } from '../../../prisma/library-seed-data';

import { FormsService } from '@/modules/forms/forms.service';
import { validateGraph } from '@/modules/workflows/workflow-validation';

// Reason: validateSchema is a pure method — no collaborators needed.
const formsService = new FormsService(
  undefined as any,
  undefined as any,
  undefined as any,
  undefined as any,
);

describe('curated library seed data', () => {
  it('contains at least 35 templates', () => {
    expect(LIBRARY_SEED_TEMPLATES.length).toBeGreaterThanOrEqual(35);
  });

  it('ships at least 10 document-producing workflows (pdf_generate or fill_document)', () => {
    const docWorkflows = LIBRARY_SEED_TEMPLATES.filter((t) =>
      t.workflow?.nodes.some((n) => n.type === 'pdf_generate' || n.type === 'fill_document'),
    );
    expect(docWorkflows.length).toBeGreaterThanOrEqual(10);
  });

  it('has unique slugs', () => {
    const slugs = LIBRARY_SEED_TEMPLATES.map((t) => t.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('covers every category at least once', () => {
    const used = new Set(LIBRARY_SEED_TEMPLATES.map((t) => t.category));
    for (const category of LIBRARY_CATEGORIES) {
      expect(used).toContain(category);
    }
  });

  describe.each(LIBRARY_SEED_TEMPLATES.map((t) => [t.slug, t] as const))(
    '%s',
    (_slug, template) => {
      it('has a valid category, name, and description', () => {
        expect(LIBRARY_CATEGORIES).toContain(template.category);
        expect(template.name.trim().length).toBeGreaterThan(0);
        expect(template.description.trim().length).toBeGreaterThan(0);
      });

      it('schema passes the publish-time validator', () => {
        expect(() => formsService.validateSchema(template.schema)).not.toThrow();
      });

      it('bundled workflow (if any) passes graph validation', () => {
        if (!template.workflow) {
          return;
        }
        const errors = validateGraph(template.workflow.nodes, template.workflow.edges);
        expect(errors).toEqual([]);
      });
    },
  );
});
