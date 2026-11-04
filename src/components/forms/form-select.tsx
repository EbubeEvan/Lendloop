"use client";

import type { ReactNode } from "react";
import { type Control, Controller, type FieldPath, type FieldValues } from "react-hook-form";

import { FormField } from "@/components/forms/form-field";
import { useFieldIds } from "@/components/forms/use-field-ids";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type FormSelectOption = {
  value: string;
  label: string;
  description?: string;
  icon?: ReactNode;
};

type FormSelectProps<T extends FieldValues> = {
  control: Control<T>;
  name: FieldPath<T>;
  label?: ReactNode;
  description?: ReactNode;
  hint?: ReactNode;
  placeholder?: string;
  options: FormSelectOption[];
  required?: boolean;
  optional?: boolean;
  id?: string;
  className?: string;
  triggerClassName?: string;
  disabled?: boolean;
};

export function FormSelect<T extends FieldValues>({
  control,
  name,
  label,
  description,
  hint,
  placeholder = "Select…",
  options,
  required,
  optional,
  id,
  className,
  triggerClassName,
  disabled,
}: FormSelectProps<T>) {
  const ids = useFieldIds(name, id);

  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <FormField
          id={ids.fieldId}
          label={label}
          description={description}
          hint={hint}
          error={fieldState.error?.message}
          required={required}
          optional={optional}
          className={className}
        >
          <Select
            value={(field.value as string | undefined) ?? ""}
            onValueChange={field.onChange}
            disabled={disabled}
          >
            <SelectTrigger
              id={ids.fieldId}
              aria-invalid={Boolean(fieldState.error)}
              aria-describedby={ids.describedBy}
              className={cn("h-10 w-full bg-card px-3", triggerClassName)}
            >
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  <span className="flex items-center gap-2">
                    {option.icon}
                    <span className="flex flex-col">
                      <span>{option.label}</span>
                      {option.description ? (
                        <span className="text-xs text-muted-foreground">{option.description}</span>
                      ) : null}
                    </span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
      )}
    />
  );
}
