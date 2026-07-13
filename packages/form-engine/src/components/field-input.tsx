// Author: Robert Massey | Created: 2026-07-13 | Module: @attune-sb/form-engine
// Purpose: Web field dispatcher — maps FieldType → the correct DOM input.
// Adapted from the enterprise portal's form simulator (pure web, no react-native).
// Styling uses the app's shadcn/Tailwind theme tokens; the consuming app must
// include this package's src in its Tailwind content globs.

'use client';

import type { FieldType } from '@attune-sb/shared-types';
import React, { useRef, useState } from 'react';

import { normalizeOptions, type BaseFieldProps } from './field-props';

function cx(...parts: Array<string | false | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

function inputClass(hasError: boolean): string {
  return cx(
    'w-full rounded-lg border bg-background px-3 py-2.5 text-sm transition-colors',
    'focus:outline-none focus:ring-2 placeholder:text-muted-foreground/60',
    'disabled:cursor-not-allowed disabled:opacity-60',
    hasError
      ? 'border-destructive focus:ring-destructive/30'
      : 'border-input focus:ring-ring/30 focus:border-ring',
  );
}

const HTML_TYPE_MAP: Partial<Record<FieldType, string>> = {
  email: 'email',
  phone: 'tel',
  url: 'url',
  number: 'number',
  date: 'date',
  time: 'time',
  datetime: 'datetime-local',
  eventtimestamp: 'datetime-local',
};

function TextInput({
  field,
  value,
  onChange,
  error,
  disabled,
}: BaseFieldProps): React.ReactElement {
  const htmlType = HTML_TYPE_MAP[field.type] ?? 'text';
  const extra: React.InputHTMLAttributes<HTMLInputElement> = {};
  if (field.type === 'number') {
    if (field.config.min !== null && field.config.min !== undefined) {
      extra.min = String(field.config.min);
    }
    if (field.config.max !== null && field.config.max !== undefined) {
      extra.max = String(field.config.max);
    }
  }
  return (
    <input
      type={htmlType}
      value={String(value ?? '')}
      onChange={(e) =>
        onChange(
          field.type === 'number'
            ? e.target.value === ''
              ? ''
              : Number(e.target.value)
            : e.target.value,
        )
      }
      placeholder={String(field.config.placeholder ?? '')}
      disabled={disabled}
      className={inputClass(Boolean(error))}
      aria-invalid={Boolean(error)}
      {...extra}
    />
  );
}

function TextareaInput({
  field,
  value,
  onChange,
  error,
  disabled,
}: BaseFieldProps): React.ReactElement {
  const rows = Number(field.config.rows ?? 4);
  return (
    <textarea
      value={String(value ?? '')}
      onChange={(e) => onChange(e.target.value)}
      placeholder={String(field.config.placeholder ?? '')}
      rows={Number.isFinite(rows) && rows > 0 ? rows : 4}
      disabled={disabled}
      className={cx(inputClass(Boolean(error)), 'resize-none')}
      aria-invalid={Boolean(error)}
    />
  );
}

function NoOptionsHint(): React.ReactElement {
  return (
    <p className="text-muted-foreground text-xs italic">
      No options configured — add them in the field settings.
    </p>
  );
}

function SelectInput({
  field,
  value,
  onChange,
  error,
  disabled,
}: BaseFieldProps): React.ReactElement {
  const opts = normalizeOptions(field.config.options);
  if (opts.length === 0) {
    return <NoOptionsHint />;
  }
  return (
    <select
      value={String(value ?? '')}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className={inputClass(Boolean(error))}
      aria-invalid={Boolean(error)}
    >
      <option value="">— Select —</option>
      {opts.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

function MultiSelectInput({
  field,
  value,
  onChange,
  error,
  disabled,
}: BaseFieldProps): React.ReactElement {
  const opts = normalizeOptions(field.config.options);
  const selected = Array.isArray(value) ? (value as string[]) : [];

  if (opts.length === 0) {
    return <NoOptionsHint />;
  }

  const toggle = (v: string): void => {
    onChange(selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v]);
  };

  return (
    <div
      className={cx(
        'space-y-1.5 rounded-lg border p-2.5',
        error ? 'border-destructive' : 'border-input',
      )}
    >
      {opts.map((o) => (
        <label
          key={o.value}
          className="hover:bg-muted/50 flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors"
        >
          <input
            type="checkbox"
            checked={selected.includes(o.value)}
            onChange={() => toggle(o.value)}
            disabled={disabled}
            className="border-input accent-primary h-4 w-4 rounded"
          />
          {o.label}
        </label>
      ))}
    </div>
  );
}

function RadioInput({
  field,
  value,
  onChange,
  error,
  disabled,
}: BaseFieldProps): React.ReactElement {
  const opts = normalizeOptions(field.config.options);
  if (opts.length === 0) {
    return <NoOptionsHint />;
  }
  return (
    <div
      className={cx(
        'space-y-1.5 rounded-lg border p-2.5',
        error ? 'border-destructive' : 'border-input',
      )}
      role="radiogroup"
      aria-label={field.label}
    >
      {opts.map((o) => (
        <label
          key={o.value}
          className="hover:bg-muted/50 flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors"
        >
          <input
            type="radio"
            name={`radio-${field.id}`}
            value={o.value}
            checked={value === o.value}
            onChange={() => onChange(o.value)}
            disabled={disabled}
            className="accent-primary h-4 w-4"
          />
          {o.label}
        </label>
      ))}
    </div>
  );
}

function CheckboxInput({ field, value, onChange, disabled }: BaseFieldProps): React.ReactElement {
  // Single-checkbox mode when no options are configured; otherwise multi-select.
  const opts = normalizeOptions(field.config.options);
  if (opts.length > 0) {
    return <MultiSelectInput field={field} value={value} onChange={onChange} disabled={disabled} />;
  }
  return (
    <label className="flex cursor-pointer items-center gap-2.5 text-sm">
      <input
        type="checkbox"
        checked={Boolean(value)}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className="border-input accent-primary h-4 w-4 rounded"
      />
      {String(field.config.checkboxLabel ?? field.label)}
    </label>
  );
}

function YesNoInput({ value, onChange, error, disabled }: BaseFieldProps): React.ReactElement {
  return (
    <div className="flex gap-2">
      {(['Yes', 'No'] as const).map((opt) => (
        <button
          key={opt}
          type="button"
          disabled={disabled}
          onClick={() => onChange(opt)}
          className={cx(
            'flex-1 rounded-lg border py-2.5 text-sm font-medium transition-all disabled:cursor-not-allowed disabled:opacity-60',
            value === opt
              ? opt === 'Yes'
                ? 'border-green-500 bg-green-50 text-green-700 ring-1 ring-green-300'
                : 'border-destructive bg-destructive/5 text-destructive ring-destructive/40 ring-1'
              : cx(
                  'border-input text-muted-foreground hover:bg-muted/50',
                  Boolean(error) && 'border-destructive',
                ),
          )}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

function ToggleInput({ value, onChange, disabled }: BaseFieldProps): React.ReactElement {
  const on = Boolean(value);
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        role="switch"
        aria-checked={on}
        disabled={disabled}
        onClick={() => onChange(!on)}
        className={cx(
          'focus:ring-ring/40 relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2',
          'disabled:cursor-not-allowed disabled:opacity-60',
          on ? 'bg-primary' : 'bg-muted',
        )}
      >
        <span
          className={cx(
            'inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform',
            on ? 'translate-x-6' : 'translate-x-1',
          )}
        />
      </button>
      <span className="text-muted-foreground text-sm">{on ? 'On' : 'Off'}</span>
    </div>
  );
}

function RatingInput({
  field,
  value,
  onChange,
  error,
  disabled,
}: BaseFieldProps): React.ReactElement {
  const max = Number(field.config.max ?? 5);
  const current = Number(value ?? 0);
  const [hovered, setHovered] = useState(0);

  return (
    <div className={cx('flex gap-1', Boolean(error) && 'border-destructive rounded-md border p-1')}>
      {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
        <button
          key={n}
          type="button"
          disabled={disabled}
          onMouseEnter={() => setHovered(n)}
          onMouseLeave={() => setHovered(0)}
          onClick={() => onChange(current === n ? 0 : n)}
          className="transition-transform hover:scale-110 disabled:cursor-not-allowed"
          aria-label={`Rate ${n}`}
        >
          <svg
            viewBox="0 0 24 24"
            className={cx(
              'h-7 w-7 transition-colors',
              n <= (hovered || current)
                ? 'fill-amber-400 stroke-amber-400'
                : 'stroke-muted-foreground/40 fill-transparent',
            )}
            strokeWidth={1.5}
          >
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        </button>
      ))}
      {current > 0 && (
        <span className="text-muted-foreground ml-2 self-center text-sm">
          {current} / {max}
        </span>
      )}
    </div>
  );
}

function AddressInput({ value, onChange, error, disabled }: BaseFieldProps): React.ReactElement {
  const addr = (value as Record<string, string> | undefined) ?? {};
  const set = (key: string, v: string): void => {
    onChange({ ...addr, [key]: v });
  };
  const base = inputClass(Boolean(error));

  return (
    <div className="space-y-1.5">
      <input
        value={addr.street ?? ''}
        onChange={(e) => set('street', e.target.value)}
        placeholder="Street address"
        disabled={disabled}
        className={base}
      />
      <div className="grid grid-cols-2 gap-1.5">
        <input
          value={addr.city ?? ''}
          onChange={(e) => set('city', e.target.value)}
          placeholder="City"
          disabled={disabled}
          className={base}
        />
        <input
          value={addr.state ?? ''}
          onChange={(e) => set('state', e.target.value)}
          placeholder="State / Region"
          disabled={disabled}
          className={base}
        />
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        <input
          value={addr.postcode ?? ''}
          onChange={(e) => set('postcode', e.target.value)}
          placeholder="Post code"
          disabled={disabled}
          className={base}
        />
        <input
          value={addr.country ?? ''}
          onChange={(e) => set('country', e.target.value)}
          placeholder="Country"
          disabled={disabled}
          className={base}
        />
      </div>
    </div>
  );
}

/** Signature pad — HTML5 canvas with mouse + touch support; stores a data URL. */
function SignatureInput({ value, onChange, error, disabled }: BaseFieldProps): React.ReactElement {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const hasSig = Boolean(value);

  const pointFromEvent = (e: React.PointerEvent<HTMLCanvasElement>): { x: number; y: number } => {
    const canvas = e.currentTarget;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  };

  const startDraw = (e: React.PointerEvent<HTMLCanvasElement>): void => {
    if (disabled) {
      return;
    }
    drawing.current = true;
    canvasRef.current?.setPointerCapture(e.pointerId);
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) {
      return;
    }
    const { x, y } = pointFromEvent(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.PointerEvent<HTMLCanvasElement>): void => {
    if (!drawing.current) {
      return;
    }
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) {
      return;
    }
    const { x, y } = pointFromEvent(e);
    ctx.lineTo(x, y);
    ctx.strokeStyle = '#1e1e2e';
    ctx.lineWidth = 1.5;
    ctx.lineCap = 'round';
    ctx.stroke();
  };

  const endDraw = (): void => {
    if (!drawing.current) {
      return;
    }
    drawing.current = false;
    const dataUrl = canvasRef.current?.toDataURL();
    if (dataUrl) {
      onChange(dataUrl);
    }
  };

  const clear = (): void => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx || !canvasRef.current) {
      return;
    }
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    onChange(null);
  };

  return (
    <div>
      <div
        className={cx(
          'overflow-hidden rounded-lg border bg-white',
          error ? 'border-destructive' : 'border-input',
        )}
      >
        <canvas
          ref={canvasRef}
          width={340}
          height={120}
          className="w-full cursor-crosshair touch-none"
          onPointerDown={startDraw}
          onPointerMove={draw}
          onPointerUp={endDraw}
          onPointerLeave={endDraw}
        />
      </div>
      <div className="mt-1 flex items-center justify-between">
        <span className="text-muted-foreground text-xs">Sign above</span>
        {hasSig && !disabled && (
          <button
            onClick={clear}
            type="button"
            className="text-destructive text-xs hover:underline"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
}

/** Photo upload — file input with client-side preview data URL. */
function PhotoInput({ value, onChange, error, disabled }: BaseFieldProps): React.ReactElement {
  const fileRef = useRef<HTMLInputElement>(null);
  const preview = typeof value === 'string' && value.startsWith('data:image') ? value : null;

  const handleFile = (file: File | undefined): void => {
    if (!file) {
      return;
    }
    const reader = new FileReader();
    reader.onload = () => onChange(reader.result);
    reader.readAsDataURL(file);
  };

  return (
    <div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      <button
        type="button"
        disabled={disabled}
        onClick={() => fileRef.current?.click()}
        className={cx(
          'w-full rounded-lg border-2 border-dashed py-5 text-center transition-colors',
          'hover:border-primary/50 hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-60',
          error ? 'border-destructive bg-destructive/5' : 'border-input bg-muted/30',
        )}
      >
        {preview ? (
          // Data-URL preview — next/image is not applicable inside the package.
          <img src={preview} alt="Selected" className="mx-auto max-h-40 rounded-md" />
        ) : (
          <span className="text-muted-foreground text-sm font-medium">
            Tap to take or upload a photo
          </span>
        )}
      </button>
      {preview && !disabled && (
        <button
          type="button"
          onClick={() => onChange(null)}
          className="text-destructive mt-1 text-xs hover:underline"
        >
          Remove photo
        </button>
      )}
    </div>
  );
}

/** GPS capture using the browser geolocation API. */
function GpsInput({ value, onChange, error, disabled }: BaseFieldProps): React.ReactElement {
  const [busy, setBusy] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const captured = typeof value === 'string' ? value : null;

  const capture = (): void => {
    if (!navigator.geolocation) {
      setGeoError('Geolocation is not supported by this browser');
      return;
    }
    setBusy(true);
    setGeoError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setBusy(false);
        onChange(`${pos.coords.latitude.toFixed(6)}, ${pos.coords.longitude.toFixed(6)}`);
      },
      (err) => {
        setBusy(false);
        setGeoError(err.message);
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  };

  return (
    <div>
      <button
        type="button"
        disabled={disabled || busy}
        onClick={capture}
        className={cx(
          'w-full rounded-lg border-2 border-dashed py-5 text-center transition-colors',
          'hover:border-primary/50 hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-60',
          error ? 'border-destructive bg-destructive/5' : 'border-input bg-muted/30',
        )}
      >
        <span className="text-muted-foreground text-sm font-medium">
          {busy ? 'Locating…' : captured ? `✓ ${captured}` : 'Tap to capture GPS location'}
        </span>
      </button>
      {geoError && <p className="text-destructive mt-1 text-xs">{geoError}</p>}
    </div>
  );
}

/** Barcode — manual entry on web (camera scanning is a native capability). */
function BarcodeInput({
  field,
  value,
  onChange,
  error,
  disabled,
}: BaseFieldProps): React.ReactElement {
  return (
    <input
      type="text"
      value={String(value ?? '')}
      onChange={(e) => onChange(e.target.value)}
      placeholder={String(field.config.placeholder ?? 'Enter or scan a barcode value')}
      disabled={disabled}
      className={inputClass(Boolean(error))}
      aria-invalid={Boolean(error)}
    />
  );
}

function CalculatedDisplay({ field }: BaseFieldProps): React.ReactElement {
  return (
    <div className="border-input bg-muted/30 flex items-center gap-2 rounded-lg border px-3 py-2.5">
      <span className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
        Auto
      </span>
      <span className="text-muted-foreground text-sm">
        {field.config.formula ? `= ${String(field.config.formula)}` : '(no formula configured)'}
      </span>
    </div>
  );
}

function CurrentUserDisplay({ value }: BaseFieldProps): React.ReactElement {
  return (
    <div className="border-input bg-muted/30 flex items-center gap-2 rounded-lg border px-3 py-2.5 opacity-70">
      <span className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
        Auto
      </span>
      <span className="text-muted-foreground text-sm italic">
        {typeof value === 'string' && value ? value : "Submitter's name (filled at runtime)"}
      </span>
    </div>
  );
}

/**
 * The field dispatcher. Every FieldType renders a real web input; the
 * exhaustive switch guarantees new field types fail the build until handled.
 */
export function FieldInput(props: BaseFieldProps): React.ReactElement {
  const type: FieldType = props.field.type;
  switch (type) {
    case 'text':
    case 'email':
    case 'phone':
    case 'url':
    case 'number':
    case 'date':
    case 'time':
    case 'datetime':
    case 'eventtimestamp':
      return <TextInput {...props} />;
    case 'multiline':
    case 'textarea':
      return <TextareaInput {...props} />;
    case 'dropdown':
    case 'select':
    case 'dynamiclist':
      return <SelectInput {...props} />;
    case 'multiselect':
      return <MultiSelectInput {...props} />;
    case 'checkbox':
      return <CheckboxInput {...props} />;
    case 'radio':
      return <RadioInput {...props} />;
    case 'yesno':
      return <YesNoInput {...props} />;
    case 'toggle':
      return <ToggleInput {...props} />;
    case 'rating':
      return <RatingInput {...props} />;
    case 'address':
      return <AddressInput {...props} />;
    case 'signature':
      return <SignatureInput {...props} />;
    case 'photo':
      return <PhotoInput {...props} />;
    case 'gps':
      return <GpsInput {...props} />;
    case 'barcode':
      return <BarcodeInput {...props} />;
    case 'calculated':
      return <CalculatedDisplay {...props} />;
    case 'currentuser':
      return <CurrentUserDisplay {...props} />;
    // Layout fields are rendered by FieldWrapper, never dispatched here —
    // returning empty keeps the switch exhaustive.
    case 'section':
    case 'pagebreak':
    case 'thankyou':
      return <></>;
    default: {
      const exhaustive: never = type;
      throw new Error(`Unhandled field type: ${String(exhaustive)}`);
    }
  }
}
