"use client";

import { EyeIcon, EyeOffIcon, XIcon } from "lucide-react";
import { type ReactNode, useState } from "react";
import { type Control, Controller, type FieldPath, type FieldValues } from "react-hook-form";

import { FormField } from "@/components/forms/form-field";
import { useFieldIds } from "@/components/forms/use-field-ids";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type FormInputProps<T extends FieldValues> = {
  control: Control<T>;
  name: FieldPath<T>;
  label?: ReactNode;
  description?: ReactNode;
  hint?: ReactNode;
  required?: boolean;
  optional?: boolean;
  id?: string;
  className?: string;
  inputClassName?: string;
  startIcon?: ReactNode;
  endIcon?: ReactNode;
  showPasswordToggle?: boolean;
  clearable?: boolean;
} & Omit<React.ComponentProps<"input">, "name" | "defaultValue" | "id" | "value" | "onChange">;

export function FormInput<T extends FieldValues>({
  control,
  name,
  label,
  description,
  hint,
  required,
  optional,
  id,
  className,
  inputClassName,
  startIcon,
  endIcon,
  showPasswordToggle,
  clearable,
  type = "text",
  ...inputProps
}: FormInputProps<T>) {
  const [revealed, setRevealed] = useState(false);
  const ids = useFieldIds(name, id);

  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => {
        const value = (field.value ?? "") as string;
        const isPassword = type === "password";
        const resolvedType = isPassword && revealed ? "text" : type;
        const showClear = clearable && value.length > 0 && !inputProps.disabled;

        return (
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
            <div className="relative">
              {startIcon ? (
                <span className="pointer-events-none absolute top-1/2 left-3 flex -translate-y-1/2 text-muted-foreground [&_svg]:size-4">
                  {startIcon}
                </span>
              ) : null}

              <Input
                {...inputProps}
                {...field}
                id={ids.fieldId}
                ref={field.ref}
                type={resolvedType}
                value={value}
                onChange={(event) => field.onChange(event.target.value)}
                aria-invalid={Boolean(fieldState.error)}
                aria-describedby={ids.describedBy}
                className={cn(
                  "h-10 bg-card px-3",
                  startIcon && "pl-9",
                  (endIcon || showPasswordToggle || showClear) && "pr-10",
                  inputClassName,
                )}
              />

              <div className="absolute top-1/2 right-2 flex -translate-y-1/2 items-center gap-0.5">
                {showClear ? (
                  <button
                    type="button"
                    onClick={() => field.onChange("")}
                    className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                    aria-label="Clear input"
                  >
                    <XIcon className="size-3.5" />
                  </button>
                ) : null}

                {isPassword && showPasswordToggle ? (
                  <button
                    type="button"
                    onClick={() => setRevealed((current) => !current)}
                    className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                    aria-label={revealed ? "Hide password" : "Show password"}
                    aria-pressed={revealed}
                  >
                    {revealed ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
                  </button>
                ) : endIcon ? (
                  <span className="pointer-events-none flex text-muted-foreground [&_svg]:size-4">
                    {endIcon}
                  </span>
                ) : null}
              </div>
            </div>
          </FormField>
        );
      }}
    />
  );
}
