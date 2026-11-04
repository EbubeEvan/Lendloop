/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as crons from "../crons.js";
import type * as features_admin_mutations from "../features/admin/mutations.js";
import type * as features_admin_queries from "../features/admin/queries.js";
import type * as features_auth_users from "../features/auth/users.js";
import type * as features_automation_actions from "../features/automation/actions.js";
import type * as features_automation_internal from "../features/automation/internal.js";
import type * as features_automation_queries from "../features/automation/queries.js";
import type * as features_loans_queries from "../features/loans/queries.js";
import type * as features_requests_mutations from "../features/requests/mutations.js";
import type * as features_requests_queries from "../features/requests/queries.js";
import type * as features_tools_mutations from "../features/tools/mutations.js";
import type * as features_tools_queries from "../features/tools/queries.js";
import type * as features_tools_validators from "../features/tools/validators.js";
import type * as http from "../http.js";
import type * as lib_audit from "../lib/audit.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_dates from "../lib/dates.js";
import type * as lib_env from "../lib/env.js";
import type * as lib_errors from "../lib/errors.js";
import type * as lib_hmac from "../lib/hmac.js";
import type * as lib_requestQueries from "../lib/requestQueries.js";
import type * as lib_requests from "../lib/requests.js";
import type * as lib_validation from "../lib/validation.js";
import type * as seed from "../seed.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  crons: typeof crons;
  "features/admin/mutations": typeof features_admin_mutations;
  "features/admin/queries": typeof features_admin_queries;
  "features/auth/users": typeof features_auth_users;
  "features/automation/actions": typeof features_automation_actions;
  "features/automation/internal": typeof features_automation_internal;
  "features/automation/queries": typeof features_automation_queries;
  "features/loans/queries": typeof features_loans_queries;
  "features/requests/mutations": typeof features_requests_mutations;
  "features/requests/queries": typeof features_requests_queries;
  "features/tools/mutations": typeof features_tools_mutations;
  "features/tools/queries": typeof features_tools_queries;
  "features/tools/validators": typeof features_tools_validators;
  http: typeof http;
  "lib/audit": typeof lib_audit;
  "lib/auth": typeof lib_auth;
  "lib/dates": typeof lib_dates;
  "lib/env": typeof lib_env;
  "lib/errors": typeof lib_errors;
  "lib/hmac": typeof lib_hmac;
  "lib/requestQueries": typeof lib_requestQueries;
  "lib/requests": typeof lib_requests;
  "lib/validation": typeof lib_validation;
  seed: typeof seed;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
