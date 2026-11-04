"use client";

import { useId } from "react";

export function useFieldIds(name: string, providedId?: string) {
  const reactId = useId().replace(/:/g, "");
  const fieldId = providedId ?? `field-${name.replace(/[^a-zA-Z0-9]/g, "-")}-${reactId}`;
  return {
    fieldId,
    descriptionId: `${fieldId}-description`,
    hintId: `${fieldId}-hint`,
    errorId: `${fieldId}-error`,
    describedBy: `${fieldId}-description ${fieldId}-hint ${fieldId}-error`,
  };
}
