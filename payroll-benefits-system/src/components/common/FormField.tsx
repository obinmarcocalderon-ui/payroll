import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes, ReactNode } from 'react';

const baseInput =
  'w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink-900 outline-none transition focus:border-teal-500';

interface FieldWrapperProps {
  label: string;
  required?: boolean;
  children: ReactNode;
}

function FieldWrapper({ label, required, children }: FieldWrapperProps) {
  return (
    <label className="block text-sm">
      <span className="mb-1.5 block font-medium text-ink-900">
        {label}
        {required && <span className="text-clay-600"> *</span>}
      </span>
      {children}
    </label>
  );
}

export function TextField({
  label,
  required,
  ...props
}: Omit<FieldWrapperProps, 'children'> & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <FieldWrapper label={label} required={required}>
      <input className={baseInput} {...props} />
    </FieldWrapper>
  );
}

export function SelectField({
  label,
  required,
  children,
  ...props
}: FieldWrapperProps & SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <FieldWrapper label={label} required={required}>
      <select className={baseInput} {...props}>
        {children}
      </select>
    </FieldWrapper>
  );
}

export function TextAreaField({
  label,
  required,
  ...props
}: Omit<FieldWrapperProps, 'children'> & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <FieldWrapper label={label} required={required}>
      <textarea className={`${baseInput} min-h-24 resize-y`} {...props} />
    </FieldWrapper>
  );
}
