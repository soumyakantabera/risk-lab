import { ValidationError } from "@/data/errors";
import type { NormalizedFinancials } from "@/data/types";

export const SCHEMA_VERSION = "1.0.0";

export type ValidationResult = {
  valid: boolean;
  errors: string[];
};

export function validateNormalizedFinancials(data: NormalizedFinancials): ValidationResult {
  const errors: string[] = [];

  if (!data.meta?.ticker) errors.push("Missing meta.ticker");
  if (!data.meta?.currency) errors.push("Missing meta.currency");
  if (!data.meta?.fiscalYearEnd) errors.push("Missing meta.fiscalYearEnd");
  if (!data.meta?.source) errors.push("Missing meta.source");
  if (!data.meta?.asOfDate) errors.push("Missing meta.asOfDate");

  if (!data.incomeStatement) errors.push("Missing incomeStatement");
  if (!data.balanceSheet) errors.push("Missing balanceSheet");

  if (!Array.isArray(data.incomeStatement?.yearly)) errors.push("incomeStatement.yearly must be an array");
  if (!Array.isArray(data.incomeStatement?.quarterly)) errors.push("incomeStatement.quarterly must be an array");
  if (!Array.isArray(data.balanceSheet?.yearly)) errors.push("balanceSheet.yearly must be an array");
  if (!Array.isArray(data.balanceSheet?.quarterly)) errors.push("balanceSheet.quarterly must be an array");

  if (!data.lineItemMap || typeof data.lineItemMap !== "object") errors.push("Missing lineItemMap");

  return { valid: errors.length === 0, errors };
}

export function assertValidNormalizedFinancials(data: NormalizedFinancials) {
  const result = validateNormalizedFinancials(data);
  if (!result.valid) {
    throw new ValidationError(
      "Yahoo data format changed or import mapping is incomplete.",
      "Use sample data or import your own. If using proxy, update the proxy parser.",
      { details: result.errors.join("; ") }
    );
  }
}
