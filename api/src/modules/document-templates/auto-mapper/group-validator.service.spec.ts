// Author: Robert Massey | Created: 2026-07-13 | Module: AutoMapper / Tests
// Geometric rules for yes/no/na checkbox groups — a bad group must never be
// auto-placed, so every rule gets a positive and a negative case.

import { GroupValidatorService, type GroupEntry } from './group-validator.service';

function entry(overrides: Partial<GroupEntry> = {}): GroupEntry {
  return {
    fieldId: 'f1',
    answerOption: 'yes',
    page: 0,
    x: 100,
    y: 200,
    width: 12,
    height: 12,
    ...overrides,
  };
}

function validGroup(): GroupEntry[] {
  return [
    entry({ answerOption: 'yes', x: 100 }),
    entry({ answerOption: 'no', x: 140 }),
    entry({ answerOption: 'na', x: 180 }),
  ];
}

describe('GroupValidatorService', () => {
  const validator = new GroupValidatorService();

  it('accepts a well-formed same-row group', () => {
    const result = validator.validateYesNoGroup(validGroup());
    expect(result.valid).toBe(true);
    expect(result.reasons).toHaveLength(0);
  });

  it('accepts a same-column group', () => {
    const result = validator.validateYesNoGroup([
      entry({ answerOption: 'yes', y: 100 }),
      entry({ answerOption: 'no', y: 140 }),
      entry({ answerOption: 'na', y: 180 }),
    ]);
    expect(result.valid).toBe(true);
  });

  it('rejects a group missing an option', () => {
    const result = validator.validateYesNoGroup(validGroup().slice(0, 2));
    expect(result.valid).toBe(false);
    expect(result.reasons.join(' ')).toContain('Missing answer option: "na"');
  });

  it('rejects duplicate options', () => {
    const group = validGroup();
    group[1] = entry({ answerOption: 'yes', x: 140 });
    const result = validator.validateYesNoGroup(group);
    expect(result.valid).toBe(false);
    expect(result.reasons.join(' ')).toContain('Duplicate');
  });

  it('rejects boxes that are neither same-row nor same-column', () => {
    const result = validator.validateYesNoGroup([
      entry({ answerOption: 'yes', x: 100, y: 200 }),
      entry({ answerOption: 'no', x: 140, y: 260 }),
      entry({ answerOption: 'na', x: 180, y: 320 }),
    ]);
    expect(result.valid).toBe(false);
    expect(result.reasons.join(' ')).toContain('not co-located');
  });

  it('rejects overlapping boxes', () => {
    const result = validator.validateYesNoGroup([
      entry({ answerOption: 'yes', x: 100 }),
      entry({ answerOption: 'no', x: 105 }),
      entry({ answerOption: 'na', x: 180 }),
    ]);
    expect(result.valid).toBe(false);
    expect(result.reasons.join(' ')).toContain('overlap');
  });

  it('rejects implausible checkbox dimensions', () => {
    const group = validGroup();
    group[0] = entry({ answerOption: 'yes', x: 100, width: 60, height: 12 });
    const result = validator.validateYesNoGroup(group);
    expect(result.valid).toBe(false);
    expect(result.reasons.join(' ')).toContain('width');
  });

  it('rejects a group spanning more than 250pt', () => {
    const result = validator.validateYesNoGroup([
      entry({ answerOption: 'yes', x: 100 }),
      entry({ answerOption: 'no', x: 250 }),
      entry({ answerOption: 'na', x: 400 }),
    ]);
    expect(result.valid).toBe(false);
    expect(result.reasons.join(' ')).toContain('span');
  });

  it('validateAll maps results per field', () => {
    const groups = new Map<string, GroupEntry[]>([
      ['good', validGroup()],
      ['bad', validGroup().slice(0, 1)],
    ]);
    const results = validator.validateAll(groups);
    expect(results.get('good')?.valid).toBe(true);
    expect(results.get('bad')?.valid).toBe(false);
  });
});
