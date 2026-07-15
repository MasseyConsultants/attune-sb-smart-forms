// Author: Robert Massey | Created: 2026-07-13 | Module: Library / Tests
// Every curated seed template must clone cleanly: valid category, unique slug,
// a schema that passes the publish-time validator, and (when bundled) a
// workflow graph that passes graph validation. A bad seed row would ship a
// broken "Use this template" button to every new signup.

import { LIBRARY_CATEGORIES } from '@attune-sb/shared-types';

import { LIBRARY_SEED_TEMPLATES } from '../../../prisma/library-seed-data';

import { FormsService } from '@/modules/forms/forms.service';
import { generateLibraryDocumentBlueprint } from '@/modules/library/document-blueprints';
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

      it('bundled workflow (if any) has no unlabeled fan-out', () => {
        // The run walker follows ONE edge per node; a second unlabeled edge
        // from the same source would be silently dropped at runtime.
        if (!template.workflow) {
          return;
        }
        const unlabeledBySource = new Map<string, number>();
        for (const edge of template.workflow.edges) {
          if (!edge.label) {
            unlabeledBySource.set(edge.source, (unlabeledBySource.get(edge.source) ?? 0) + 1);
          }
        }
        for (const [source, count] of unlabeledBySource) {
          expect({ source, count }).toEqual({ source, count: 1 });
        }
      });

      it('bundled document blueprint (if any) maps only real schema fields', async () => {
        if (!template.document) {
          return;
        }
        const generated = await generateLibraryDocumentBlueprint(template.document.blueprint);
        expect(generated.pdf.length).toBeGreaterThan(1000);
        expect(generated.mappings.length).toBeGreaterThan(0);

        const fieldsById = new Map(template.schema.fields.map((f) => [f.id, f]));
        for (const mapping of generated.mappings) {
          const field = fieldsById.get(mapping.fieldId);
          // Every stamped box must target a field the form actually collects.
          expect(field).toBeDefined();
          if (mapping.answerOption !== undefined) {
            const options = (field?.config['options'] as string[] | undefined) ?? [];
            expect(options).toContain(mapping.answerOption);
          }
        }
      });
    },
  );
});
