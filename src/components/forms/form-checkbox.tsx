"use client";

import type { ReactNode } from "react";
import { type Control, Controller, type FieldPath, type FieldValues } from "react-hook-form";

import { useFieldIds } from "@/components/forms/use-field-ids";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { cn } from "@/lib/utils";

type FormCheckboxProps<T extends FieldValues> = {
  control: Control<T>;
  name: FieldPath<T>;
  label: ReactNode;
  description?: ReactNode;
  hint?: ReactNode;
  required?: boolean;
  id?: string;
  className?: string;
  disabled?: boolean;
};

export function FormCheckbox<T extends FieldValues>({
  control,
  name,
  label,
  description,
  hint,
  required,
  id,
  className,
  disabled,
}: Readonly<FormCheckboxProps<T>>) {
  const ids = useFieldIds(name, id);

  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Field
          data-disabled={disabled}
          data-invalid={Boolean(fieldState.error)}
          className={cn("gap-1.5", className)}
        >
          <div className="flex items-start gap-2.5">
            <Checkbox
              id={ids.fieldId}
              checked={Boolean(field.value)}
              onCheckedChange={(checked) => field.onChange(checked === true)}
              onBlur={field.onBlur}
              ref={field.ref}
              disabled={disabled}
              aria-invalid={Boolean(fieldState.error)}
              aria-describedby={ids.describedBy}
              className="mt-0.5"
            />
            <div className="flex flex-col gap-0.5">
              <FieldLabel htmlFor={ids.fieldId} className="leading-snug">
                <span>{label}</span>
                {required ? (
                  <span aria-hidden className="text-destructive">
                    *
                  </span>
                ) : null}
              </FieldLabel>
              {description ? (
                <FieldDescription id={ids.descriptionId}>{description}</FieldDescription>
              ) : null}
            </div>
          </div>
          {hint && !fieldState.error ? (
            <FieldDescription id={ids.hintId} className="text-xs">
              {hint}
            </FieldDescription>
          ) : null}
          {fieldState.error ? (
            <FieldError id={ids.errorId} className="text-xs">
              {fieldState.error.message}
            </FieldError>
          ) : null}
        </Field>
      )}
    />
  );
}
