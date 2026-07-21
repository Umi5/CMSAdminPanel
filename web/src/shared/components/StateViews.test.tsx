import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EmptyState, ErrorState, LoadingState } from "./StateViews";

describe("StateViews", () => {
  it("LoadingState shows its label", () => {
    render(<LoadingState label="Loading entries…" />);
    expect(screen.getByText("Loading entries…")).toBeInTheDocument();
  });

  it("ErrorState shows the message and retries on click", async () => {
    const onRetry = vi.fn();
    render(<ErrorState message="Boom" onRetry={onRetry} />);

    expect(screen.getByText("Boom")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("ErrorState hides the retry button when no handler is given", () => {
    render(<ErrorState message="Boom" />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("EmptyState renders title, description and action", () => {
    render(
      <EmptyState
        title="No entries yet"
        description="Create the first one."
        action={<button>New entry</button>}
      />,
    );

    expect(screen.getByText("No entries yet")).toBeInTheDocument();
    expect(screen.getByText("Create the first one.")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "New entry" }),
    ).toBeInTheDocument();
  });
});
