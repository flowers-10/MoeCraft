import type { InjectionKey, Ref } from "vue";

export type UiFormValidator = (value: unknown, model: unknown) => boolean | string | Promise<boolean | string>;
export type UiFormRule = { required?: boolean; min?: number; max?: number; minLength?: number; maxLength?: number; message: string; validator?: UiFormValidator };
export type UiFormRules = Record<string, UiFormRule | UiFormRule[]>;
export type UiFormValidateOn = "submit" | "blur" | "input";
export type UiFormContext = { errors: Readonly<Ref<Record<string, string>>>; validateField: (name: string) => Promise<boolean>; validate: () => Promise<boolean>; validateOn: UiFormValidateOn };

export const UI_FORM_CONTEXT: InjectionKey<UiFormContext> = Symbol("mc-form-context");

export function getFormValue(model: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((current, segment) => {
    if (current === null || current === undefined || typeof current !== "object") return undefined;
    return (current as Record<string, unknown>)[segment];
  }, model);
}

export function isEmptyFormValue(value: unknown): boolean {
  return value === null || value === undefined || (typeof value === "string" && value.trim() === "") || (Array.isArray(value) && value.length === 0);
}

export async function validateFormRule(rule: UiFormRule, value: unknown, model: unknown): Promise<string | undefined> {
  if (rule.required && isEmptyFormValue(value)) return rule.message;
  if (!isEmptyFormValue(value)) {
    const numericValue = typeof value === "number" ? value : typeof value === "string" && value.trim() !== "" ? Number(value) : undefined;
    if (numericValue !== undefined && Number.isFinite(numericValue) && rule.min !== undefined && numericValue < rule.min) return rule.message;
    if (numericValue !== undefined && Number.isFinite(numericValue) && rule.max !== undefined && numericValue > rule.max) return rule.message;
    if (typeof value === "string" && rule.minLength !== undefined && value.length < rule.minLength) return rule.message;
    if (typeof value === "string" && rule.maxLength !== undefined && value.length > rule.maxLength) return rule.message;
    if (rule.validator) {
      const result = await rule.validator(value, model);
      if (result !== true) return typeof result === "string" ? result : rule.message;
    }
  }
  return undefined;
}
