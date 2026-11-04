import { expect, type Page, test } from "@playwright/test";

import {
  cardFor,
  expectToast,
  listTool,
  removeOwnListing,
  requestToBorrow,
  sessionFor,
  uniqueToolName,
} from "./helpers";

test.describe("lending between two neighbors", () => {
  let owner: Page;
  let borrower: Page;
  const created: string[] = [];

  test.beforeEach(async ({ browser }) => {
    owner = await sessionFor(browser, "owner");
    borrower = await sessionFor(browser, "borrower");
  });

  test.afterEach(async () => {
    // Listings count toward the owner's limit, so always clean up.
    for (const name of created.splice(0)) {
      await removeOwnListing(owner, name);
    }
    await owner.context().close();
    await borrower.context().close();
  });

  test("list → request → approve → return, seen correctly by both sides", async () => {
    const name = uniqueToolName("drill");
    created.push(name);
    await listTool(owner, {
      name,
      category: "Garden",
      condition: "Like new",
      description: "Created by the Playwright e2e suite. Safe to delete.",
    });

    // The owner sees their own tool on the board but cannot request it.
    await owner.goto("/browse");
    await owner.getByLabel("Search tools").fill(name);
    const ownCard = cardFor(owner, name);
    await expect(ownCard.getByText("Your listing")).toBeVisible();
    await expect(ownCard.getByRole("button", { name: "Request to borrow" })).toHaveCount(0);

    // The borrower can find it by category and sees it as available.
    await borrower.goto("/browse");
    await borrower.getByLabel("Search tools").fill(name);
    await borrower.getByRole("button", { name: "Kitchen", exact: true }).click();
    await expect(cardFor(borrower, name)).toHaveCount(0);
    await borrower.getByRole("button", { name: "Garden", exact: true }).click();
    await expect(cardFor(borrower, name).getByText("Available")).toBeVisible();

    await requestToBorrow(borrower, name, { from: 1, to: 3 }, "Weekend project, e2e run.");

    await borrower.goto("/requests");
    await expect(cardFor(borrower, name).getByText("Pending")).toBeVisible();

    // Owner approves from "Incoming requests".
    await owner.goto("/incoming");
    const incoming = cardFor(owner, name);
    await expect(incoming.getByText("Weekend project, e2e run.")).toBeVisible();
    await incoming.getByRole("button", { name: "Approve" }).click();
    await expectToast(owner, "Request approved");
    await expect(incoming).toHaveCount(0); // leaves the "Needs a response" tab

    // Borrower sees an active loan and the automation activity for it.
    await borrower.goto("/loans");
    const loan = cardFor(borrower, name);
    await expect(loan.getByText("Approved")).toBeVisible();
    await expect(loan.getByText(/Approval notification|Request notification/).first()).toBeVisible({
      timeout: 15_000,
    });

    await loan.getByRole("button", { name: "Mark returned" }).click();
    await borrower.getByRole("alertdialog").getByRole("button", { name: "Mark returned" }).click();
    await expectToast(borrower, "Loan closed");
    await expect(loan.getByText("Returned")).toBeVisible();

    await owner.goto("/loans");
    await expect(cardFor(owner, name).getByText("Returned")).toBeVisible();
  });

  test("owner rejects and borrower cancels", async () => {
    const rejected = uniqueToolName("ladder");
    const cancelled = uniqueToolName("tent");
    created.push(rejected, cancelled);
    for (const name of [rejected, cancelled]) {
      await listTool(owner, {
        name,
        category: "Camping",
        description: "Created by the Playwright e2e suite. Safe to delete.",
      });
      await requestToBorrow(borrower, name, { from: 2, to: 4 });
    }

    await owner.goto("/incoming");
    await cardFor(owner, rejected).getByRole("button", { name: "Reject" }).click();
    await owner.getByRole("alertdialog").getByRole("button", { name: "Reject request" }).click();
    await expectToast(owner, "Request rejected");
    // The request closes immediately: it leaves the owner's queue…
    await expect(cardFor(owner, rejected)).toHaveCount(0);

    // …and the borrower sees it as rejected, with no actions left.
    await borrower.goto("/requests");
    const rejectedCard = cardFor(borrower, rejected);
    await expect(rejectedCard.getByText("Rejected")).toBeVisible();
    await expect(rejectedCard.getByRole("button")).toHaveCount(0);

    const pending = cardFor(borrower, cancelled);
    await pending.getByRole("button", { name: "Cancel request" }).click();
    await borrower.getByRole("alertdialog").getByRole("button", { name: "Cancel request" }).click();
    await expectToast(borrower, "Request cancelled");
    await expect(pending.getByText("Cancelled")).toBeVisible();

    await owner.goto("/incoming");
    await expect(cardFor(owner, cancelled)).toHaveCount(0);
  });

  test("owner edits a listing and neighbors see the change", async () => {
    const name = uniqueToolName("sander");
    const renamed = `${name} v2`;
    created.push(renamed);
    await listTool(owner, {
      name,
      category: "Power tools",
      description: "Created by the Playwright e2e suite. Safe to delete.",
    });

    await cardFor(owner, name).getByRole("button", { name: "Edit" }).click();
    const dialog = owner.getByRole("dialog", { name: "Edit listing" });
    await dialog.getByLabel("Tool name").fill(renamed);
    await dialog.getByRole("button", { name: "Save changes" }).click();
    await expectToast(owner, "Listing updated");

    await borrower.goto("/browse");
    await borrower.getByLabel("Search tools").fill(renamed);
    await expect(cardFor(borrower, renamed)).toBeVisible();
  });

  test("a regular user cannot see or reach admin screens", async () => {
    await borrower.goto("/browse");
    await expect(borrower.getByRole("link", { name: /Admin|Overview|Neighbors/ })).toHaveCount(0);

    for (const route of ["/admin", "/admin/loans", "/admin/neighbors", "/admin/automation"]) {
      const response = await borrower.goto(route);
      expect(response?.status(), route).toBe(404);
      await expect(
        borrower.getByRole("heading", { name: "This page isn't on the block" }),
      ).toBeVisible();
      await expect(borrower.getByText(/Administrators only|admin/i)).toHaveCount(0);
    }
  });
});

test("signed-out visitors are sent to sign in", async ({ page }) => {
  for (const route of ["/browse", "/listings", "/loans"]) {
    await page.goto(route);
    await expect(page).toHaveURL(/\/sign-in/);
  }
});
