import { setupClerkTestingToken } from "@clerk/testing/playwright";
import { type Browser, expect, type Locator, type Page } from "@playwright/test";

import { type Role, storageStatePath } from "./env";

/** Opens a page already signed in as `role`, in its own browser context. */
export async function sessionFor(browser: Browser, role: Role): Promise<Page> {
  const context = await browser.newContext({ storageState: storageStatePath(role) });
  const page = await context.newPage();
  await setupClerkTestingToken({ page });
  return page;
}

/**
 * Unique, recognizable tool names so parallel or repeated runs never collide.
 * The leading digit sorts them first in admin lists, which show the top 10.
 */
export function uniqueToolName(label: string): string {
  const stamp = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
  return `0 e2e ${label} ${stamp}`;
}

/** The request or tool card whose heading is `name`. */
export function cardFor(page: Page, name: string): Locator {
  return page.locator("article").filter({ has: page.getByRole("heading", { name, exact: true }) });
}

export async function expectToast(page: Page, title: string): Promise<void> {
  await expect(page.getByText(title, { exact: true }).first()).toBeVisible();
}

export function isoDaysFromToday(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

/** Picks a start and end day in the form-kit date range popover. */
export async function pickDateRange(
  page: Page,
  fromDays: number,
  toDays: number,
  label = "Loan dates",
): Promise<void> {
  await page.getByLabel(label).click();
  for (const offset of [fromDays, toDays]) {
    const iso = isoDaysFromToday(offset);
    const day = page.locator(`td[data-day="${iso}"]:not([data-outside]) button`);
    for (let step = 0; step < 3 && (await day.count()) === 0; step += 1) {
      await page.getByRole("button", { name: "Go to the Next Month" }).click();
    }
    await day.click();
  }
}

export async function listTool(
  page: Page,
  tool: { name: string; category: string; condition?: string; description: string },
): Promise<void> {
  await page.goto("/listings");
  await page
    .getByRole("button", { name: /Add a tool|Share your first tool/ })
    .first()
    .click();

  const dialog = page.getByRole("dialog", { name: "Share a tool" });
  await dialog.getByLabel("Tool name").fill(tool.name);
  await dialog.getByLabel("Category").click();
  await page.getByRole("option", { name: new RegExp(`^${tool.category}`) }).click();
  if (tool.condition) {
    await dialog.getByLabel("Condition").click();
    await page.getByRole("option", { name: new RegExp(`^${tool.condition}`) }).click();
  }
  await dialog.getByLabel("Description").fill(tool.description);
  await dialog.getByRole("button", { name: "Publish listing" }).click();

  await expectToast(page, "Tool listed");
  await expect(cardFor(page, tool.name)).toBeVisible();
}

/** Removes a listing from "My listings"; used to clean up after each flow. */
export async function removeOwnListing(page: Page, name: string): Promise<void> {
  await page.goto("/listings");
  const card = cardFor(page, name);
  if ((await card.count()) === 0) {
    return;
  }
  await card.getByRole("button", { name: "Remove" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Remove listing" }).click();
  await expectToast(page, "Listing removed");
  await expect(card).toHaveCount(0);
}

export async function requestToBorrow(
  page: Page,
  name: string,
  days: { from: number; to: number },
  note?: string,
): Promise<void> {
  await page.goto("/browse");
  await page.getByLabel("Search tools").fill(name);
  const card = cardFor(page, name);
  await card.getByRole("button", { name: "Request to borrow" }).click();

  const dialog = page.getByRole("dialog", { name: `Borrow ${name}` });
  await pickDateRange(page, days.from, days.to);
  if (note) {
    await dialog.getByLabel(/Note for the lender/).fill(note);
  }
  await dialog.getByRole("button", { name: "Send request" }).click();
  await expectToast(page, "Request sent");
}
