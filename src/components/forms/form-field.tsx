"use client";

import type { ReactNode } from "react";

import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { cn } from "@/lib/utils";

type FormFieldProps = {
  id: string;
  label?: ReactNode;
  description?: ReactNode;
  hint?: ReactNode;
  error?: string;
  required?: boolean;
  optional?: boolean;
  children: ReactNode;
  className?: string;
  labelClassName?: string;
};

export function FormField({
  id,
  label,
  description,
  hint,
  error,
  required,
  optional,
  children,
  className,
  labelClassName,
}: FormFieldProps) {
  return (
    <Field data-invalid={Boolean(error)} className={cn("gap-2", className)}>
      {label ? (
        <FieldLabel htmlFor={id} className={cn("gap-1.5", labelClassName)}>
          <span>{label}</span>
          {required ? (
            <span aria-hidden className="text-destructive">
              *
            </span>
          ) : null}
          {optional ? (
            <span className="text-xs font-normal text-muted-foreground">Optional</span>
          ) : null}
        </FieldLabel>
      ) : null}

      {description ? (
        <FieldDescription id={`${id}-description`}>{description}</FieldDescription>
      ) : null}

      {children}

      {hint && !error ? (
        <FieldDescription id={`${id}-hint`} className="text-xs">
          {hint}
        </FieldDescription>
      ) : null}

      {error ? (
        <FieldError id={`${id}-error`} className="text-xs">
          {error}
        </FieldError>
      ) : null}
    </Field>
  );
}
