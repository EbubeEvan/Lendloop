import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const PROTECTED_ROUTES = ["/browse", "/listings", "/requests", "/incoming", "/loans", "/admin"];

test.describe("public landing page", () => {
  test("shows the brand, tagline, and a sign-in call to action", async ({ page }) => {
    await page.goto("/");

    await expect(page).toHaveTitle(/LendLoop/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Borrow what you need.");

    const cta = page.getByRole("link", { name: /Sign in to lend or borrow/ }).first();
    await expect(cta).toBeVisible();
    await expect(cta).toHaveAttribute("href", "/sign-in");
  });

  test("the public board lists names and categories only", async ({ page }) => {
    await page.goto("/");
    const board = page.locator("#board");
    await board.scrollIntoViewIfNeeded();

    const items = board.getByRole("listitem");
    await expect(items.first()).toBeVisible();
    expect(await items.count()).toBeGreaterThan(0);

    // Each card has exactly a name and a category label — nothing about owners.
    const firstCard = (await items.first().innerText()).split("\n").filter(Boolean);
    expect(firstCard).toHaveLength(2);
    await expect(board).not.toContainText(/@|owner:|lent by/i);
  });

  test("category filters narrow the board", async ({ page }) => {
    await page.goto("/");
    const board = page.locator("#board");
    const items = board.getByRole("listitem");
    const total = await items.count();

    const kitchen = board.getByRole("button", { name: /Kitchen/ });
    await kitchen.click();
    await expect(kitchen).toHaveAttribute("aria-pressed", "true");
    await expect.poll(() => items.count()).toBeLessThan(total);
    for (const text of await items.allInnerTexts()) {
      expect(text).toMatch(/Kitchen/);
    }

    await board.getByRole("button", { name: /^All/ }).click();
    await expect.poll(() => items.count()).toBe(total);
  });

  test("has no serious accessibility violations", async ({ page }) => {
    await page.goto("/");
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    const serious = results.violations.filter((violation) =>
      ["serious", "critical"].includes(violation.impact ?? ""),
    );
    expect(
      serious.map((violation) => `${violation.id}: ${violation.nodes.length} node(s)`),
    ).toEqual([]);
  });

  test("does not scroll horizontally", async ({ page }) => {
    await page.goto("/");
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});

test("the public site never links to admin screens", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator('a[href^="/admin"]')).toHaveCount(0);
});

test("unknown routes get a branded 404 with a real 404 status", async ({ page }) => {
  const response = await page.goto("/this-route-does-not-exist");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "This page isn't on the block" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Back to LendLoop" })).toHaveAttribute("href", "/");
});

test.describe("app without keys", () => {
  for (const route of PROTECTED_ROUTES) {
    test(`${route} shows the setup notice instead of crashing`, async ({ page }) => {
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));

      const response = await page.goto(route);
      expect(response?.status()).toBe(200);
      await expect(
        page.getByRole("heading", { name: "Connect LendLoop to your stack" }),
      ).toBeVisible();
      expect(errors).toEqual([]);
    });
  }
});
