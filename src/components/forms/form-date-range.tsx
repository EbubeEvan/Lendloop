"use client";

import { startOfToday } from "date-fns";
import { CalendarIcon, XIcon } from "lucide-react";
import { type ReactNode, useState } from "react";
import type { DateRange } from "react-day-picker";
import { type Control, Controller, type FieldPath, type FieldValues } from "react-hook-form";

import { FormField } from "@/components/forms/form-field";
import { useFieldIds } from "@/components/forms/use-field-ids";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

type FormDateRangeProps<T extends FieldValues> = {
  control: Control<T>;
  name: FieldPath<T>;
  label?: ReactNode;
  description?: ReactNode;
  hint?: ReactNode;
  placeholder?: string;
  required?: boolean;
  optional?: boolean;
  id?: string;
  className?: string;
  disabled?: boolean;
};

export function FormDateRange<T extends FieldValues>({
  control,
  name,
  label,
  description,
  hint,
  placeholder = "Pick a start and end date",
  required,
  optional,
  id,
  className,
  disabled,
}: FormDateRangeProps<T>) {
  const ids = useFieldIds(name, id);
  const [open, setOpen] = useState(false);

  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => {
        const range = field.value as DateRange | undefined;
        const display = range?.from
          ? range.to
            ? `${formatDate(range.from)} – ${formatDate(range.to)}`
            : `${formatDate(range.from)} – pick end date`
          : placeholder;

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
              <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                  <Button
                    id={ids.fieldId}
                    type="button"
                    variant="outline"
                    disabled={disabled}
                    aria-invalid={Boolean(fieldState.error)}
                    aria-describedby={ids.describedBy}
                    className={cn(
                      "h-10 w-full justify-start gap-2 bg-card px-3 font-normal",
                      !range?.from && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon
                      data-icon="inline-start"
                      className="size-4 text-muted-foreground"
                    />
                    <span className="truncate">{display}</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="range"
                    numberOfMonths={1}
                    autoFocus
                    selected={range}
                    onSelect={(next) => {
                      field.onChange(next);
                      if (next?.from && next.to) {
                        setOpen(false);
                      }
                    }}
                    disabled={{ before: startOfToday() }}
                    className="p-2"
                  />
                </PopoverContent>
              </Popover>

              {range?.from && !disabled ? (
                <button
                  type="button"
                  onClick={() => field.onChange(undefined)}
                  className="absolute top-1/2 right-2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  aria-label="Clear date range"
                >
                  <XIcon className="size-3.5" />
                </button>
              ) : null}
            </div>
          </FormField>
        );
      }}
    />
  );
}
