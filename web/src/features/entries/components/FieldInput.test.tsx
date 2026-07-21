import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Field } from "@cms/shared";
import { FieldInput } from "./FieldInput";

const field = (extra: Partial<Field>): Field => ({
  id: "f_1",
  name: "Stock",
  type: "number",
  required: false,
  ...extra,
});

describe("FieldInput", () => {
  it("renders a number field and parses input to a number", async () => {
    const onChange = vi.fn();
    render(
      <FieldInput field={field({})} value={undefined} onChange={onChange} />,
    );

    await userEvent.type(screen.getByLabelText("Stock"), "7");
    expect(onChange).toHaveBeenCalledWith(7);
  });

  it("clears a number field to undefined when emptied", async () => {
    const onChange = vi.fn();
    render(<FieldInput field={field({})} value={3} onChange={onChange} />);

    await userEvent.clear(screen.getByLabelText("Stock"));
    expect(onChange).toHaveBeenCalledWith(undefined);
  });

  it("blocks stepping below 0 on a nonNegative number field", async () => {
    const onChange = vi.fn();
    render(
      <FieldInput
        field={field({ nonNegative: true })}
        value={0}
        onChange={onChange}
      />,
    );

    await userEvent.click(screen.getByLabelText("Decrement"));
    expect(onChange).not.toHaveBeenCalled();
  });

  it("allows stepping below 0 when nonNegative is off", async () => {
    const onChange = vi.fn();
    render(<FieldInput field={field({})} value={0} onChange={onChange} />);

    await userEvent.click(screen.getByLabelText("Decrement"));
    expect(onChange).toHaveBeenCalledWith(-1);
  });

  it("renders a boolean field as a toggle", async () => {
    const onChange = vi.fn();
    render(
      <FieldInput
        field={field({ type: "boolean", name: "In stock" })}
        value={false}
        onChange={onChange}
      />,
    );

    const toggle = screen.getByRole("checkbox");
    expect(toggle).not.toBeChecked();
    await userEvent.click(toggle);
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it("shows the validation error as helper text", () => {
    render(
      <FieldInput
        field={field({})}
        value={undefined}
        error="Must be 0 or greater"
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByText("Must be 0 or greater")).toBeInTheDocument();
  });
});
