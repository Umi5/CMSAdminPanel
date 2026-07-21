import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NumberField } from "./NumberField";

describe("NumberField", () => {
  it("shows the value and reports typed input", async () => {
    const onChange = vi.fn();
    render(<NumberField label="Stock" value="5" onChange={onChange} />);

    expect(screen.getByLabelText("Stock")).toHaveValue(5);

    await userEvent.type(screen.getByLabelText("Stock"), "1");
    expect(onChange).toHaveBeenCalledWith("51");
  });

  it("steps up and down by one", async () => {
    const onChange = vi.fn();
    render(<NumberField label="Stock" value="5" onChange={onChange} />);

    await userEvent.click(screen.getByLabelText("Increment"));
    expect(onChange).toHaveBeenCalledWith("6");

    await userEvent.click(screen.getByLabelText("Decrement"));
    expect(onChange).toHaveBeenCalledWith("4");
  });

  it("treats an empty value as 0 when stepping", async () => {
    const onChange = vi.fn();
    render(<NumberField label="Stock" value="" onChange={onChange} />);

    await userEvent.click(screen.getByLabelText("Increment"));
    expect(onChange).toHaveBeenCalledWith("1");
  });

  it("will not step below min", async () => {
    const onChange = vi.fn();
    render(<NumberField label="Stock" value="0" onChange={onChange} min={0} />);

    await userEvent.click(screen.getByLabelText("Decrement"));
    expect(onChange).not.toHaveBeenCalled();

    await userEvent.click(screen.getByLabelText("Increment"));
    expect(onChange).toHaveBeenCalledWith("1");
  });
});
