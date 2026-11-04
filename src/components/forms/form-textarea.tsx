"use client";

import type { ReactNode } from "react";
import { type Control, Controller, type FieldPath, type FieldValues } from "react-hook-form";

import { FormField } from "@/components/forms/form-field";
import { useFieldIds } from "@/components/forms/use-field-ids";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type FormTextareaProps<T extends FieldValues> = {
  control: Control<T>;
  name: FieldPath<T>;
  label?: ReactNode;
  description?: ReactNode;
  hint?: ReactNode;
  required?: boolean;
  optional?: boolean;
  id?: string;
  className?: string;
  textareaClassName?: string;
  showCount?: boolean;
} & Omit<React.ComponentProps<"textarea">, "name" | "defaultValue" | "id" | "value" | "onChange">;

export function FormTextarea<T extends FieldValues>({
  control,
  name,
  label,
  description,
  hint,
  required,
  optional,
  id,
  className,
  textareaClassName,
  showCount,
  maxLength,
  ...textareaProps
}: FormTextareaProps<T>) {
  const ids = useFieldIds(name, id);

  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => {
        const value = (field.value ?? "") as string;
        return (
          <FormField
            id={ids.fieldId}
            label={label}
            description={description}
            hint={
              showCount ? (
                <span className="flex w-full items-center justify-between gap-3">
                  <span>{hint}</span>
                  <span className="tabular-nums">
                    {value.length}
                    {maxLength ? `/${maxLength}` : ""}
                  </span>
                </span>
              ) : (
                hint
              )
            }
            error={fieldState.error?.message}
            required={required}
            optional={optional}
            className={className}
          >
            <Textarea
              {...textareaProps}
              {...field}
              id={ids.fieldId}
              ref={field.ref}
              value={value}
              maxLength={maxLength}
              onChange={(event) => field.onChange(event.target.value)}
              aria-invalid={Boolean(fieldState.error)}
              aria-describedby={ids.describedBy}
              className={cn("min-h-24 resize-y bg-card px-3 py-2", textareaClassName)}
            />
          </FormField>
        );
      }}
    />
  );
}
