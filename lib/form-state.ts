/**
 * Shared vocabulary for form-handling server actions: the state shape consumed
 * by useActionState, the parse-result union returned by the form parsers, and
 * the zod-issue → per-field message mapping. Pure types plus one pure function;
 * lib/habit-schema.ts and lib/auth-schema.ts build on these.
 */

/** State returned by form server actions for useActionState. */
export type FormState<Field extends string, Values> = {
  status: "idle" | "error";
  /** At most one message per invalid field (the first zod issue wins). */
  fieldErrors?: Partial<Record<Field, string>>;
  /** Form-wide error not attributable to a single field. */
  formError?: string;
  /** Submitted values echoed back so the form can re-render what was typed. */
  values?: Values;
};

/** Result of parsing a form: validated data, or a ready-to-render error state. */
export type ParsedForm<Data, State> =
  { success: true; data: Data } | { success: false; state: State };

/** The structural slice of a zod issue this module maps (path head + message). */
type IssueLike = { path: ReadonlyArray<PropertyKey>; message: string };

/** Maps zod issues to at most one message per top-level field (first issue wins). */
export function firstIssuePerField<Field extends string>(
  issues: readonly IssueLike[],
): Partial<Record<Field, string>> {
  const fieldErrors: Partial<Record<Field, string>> = {};
  for (const issue of issues) {
    const field = issue.path[0] as Field;
    fieldErrors[field] ??= issue.message;
  }
  return fieldErrors;
}
