import { expect, type Page, test } from "@playwright/test";

import { E2E_USERS, hasAdminUser } from "./env";
import {
  cardFor,
  expectToast,
  listTool,
  removeOwnListing,
  sessionFor,
  uniqueToolName,
} from "./helpers";

test.describe("admin", () => {
  test.skip(!hasAdminUser, "Set E2E_ADMIN_EMAIL (and add it to ADMIN_EMAILS in Convex)");

  let admin: Page;
  let owner: Page;

  test.beforeEach(async ({ browser }) => {
    admin = await sessionFor(browser, "admin");
    owner = await sessionFor(browser, "owner");
  });

  test.afterEach(async () => {
    await admin.context().close();
    await owner.context().close();
  });

  test("can remove any neighbor's listing", async () => {
    const name = uniqueToolName("mixer");
    await listTool(owner, {
      name,
      category: "Kitchen",
      description: "Created by the Playwright e2e suite. Safe to delete.",
    });

    try {
      await admin.goto("/admin");
      const row = admin.getByRole("listitem").filter({ hasText: name });
      await row.getByRole("button", { name: "Remove" }).click();
      await admin.getByRole("alertdialog").getByRole("button", { name: "Remove listing" }).click();
      await expect(row).toHaveCount(0);

      await owner.goto("/listings");
      await expect(cardFor(owner, name)).toHaveCount(0);
    } finally {
      await removeOwnListing(owner, name);
    }
  });

  test("can mark a neighbor as a trusted lender and see all loans", async () => {
    const ownerEmail = E2E_USERS.owner!;

    await admin.goto("/admin/neighbors");
    await admin.getByLabel("Search neighbors").fill(ownerEmail);
    const toggle = admin.getByRole("switch", { name: /as a trusted lender/ }).first();
    const wasTrusted = (await toggle.getAttribute("aria-checked")) === "true";

    await toggle.click();
    await expectToast(admin, wasTrusted ? "Trusted status removed" : "is now a trusted lender");
    await expect(toggle).toHaveAttribute("aria-checked", String(!wasTrusted));

    // Restore the original state so reruns start clean.
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-checked", String(wasTrusted));

    await admin.goto("/admin/loans");
    await expect(
      admin.getByRole("heading", { name: "Every loan in the neighborhood" }),
    ).toBeVisible();
  });
});
