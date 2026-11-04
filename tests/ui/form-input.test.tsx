import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { describe, expect, test } from "vitest";

import { FormInput } from "@/components/forms/form-input";

type Values = { email: string; password: string };

function EmailHarness() {
  const form = useForm<Values>({ defaultValues: { email: "", password: "" } });

  useEffect(() => {
    form.setError("email", { type: "manual", message: "Enter a valid email." });
  }, [form]);

  return (
    <FormInput
      control={form.control}
      name="email"
      label="Email"
      description="We only use this for loan updates."
      hint="No newsletters."
      placeholder="you@example.com"
      startIcon={<span data-testid="start-icon">@</span>}
      clearable
    />
  );
}

function PasswordHarness() {
  const form = useForm<Values>({ defaultValues: { email: "", password: "" } });
  return (
    <FormInput
      control={form.control}
      name="password"
      label="Password"
      type="password"
      showPasswordToggle
    />
  );
}

describe("FormInput", () => {
  test("associates the label, description, hint, and error", async () => {
    render(<EmailHarness />);

    const input = screen.getByLabelText("Email");
    expect(input).toHaveAttribute("placeholder", "you@example.com");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText("We only use this for loan updates.")).toBeInTheDocument();
    expect(screen.getByText("Enter a valid email.")).toBeInTheDocument();
    expect(screen.getByTestId("start-icon")).toBeInTheDocument();

    await userEvent.type(input, "neighbor@example.com");
    expect(input).toHaveValue("neighbor@example.com");

    await userEvent.click(screen.getByRole("button", { name: "Clear input" }));
    expect(input).toHaveValue("");
  });

  test("toggles password visibility", async () => {
    render(<PasswordHarness />);

    const input = screen.getByLabelText("Password");
    expect(input).toHaveAttribute("type", "password");

    await userEvent.click(screen.getByRole("button", { name: "Show password" }));
    expect(input).toHaveAttribute("type", "text");

    await userEvent.click(screen.getByRole("button", { name: "Hide password" }));
    expect(input).toHaveAttribute("type", "password");
  });
});
