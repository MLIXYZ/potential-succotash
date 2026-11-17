import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Composer, { type ComposerProps } from "./Composer";

function setup(props: Partial<ComposerProps> = {}) {
  const onSend = vi.fn();
  render(<Composer onSend={onSend} disabled={false} {...props} />);
  return {
    onSend,
    input: screen.getByLabelText("Ask a question"),
    button: screen.getByRole("button", { name: "Send message" }),
  };
}

describe("Composer", () => {
  it("sends the trimmed text on Enter and clears the box", async () => {
    const { onSend, input } = setup();

    await userEvent.type(input, "  where is the library?  {Enter}");

    expect(onSend).toHaveBeenCalledWith("where is the library?");
    expect(input).toHaveValue("");
  });

  it("adds a newline on Shift+Enter instead of sending", async () => {
    const { onSend, input } = setup();

    await userEvent.type(input, "line one{Shift>}{Enter}{/Shift}line two");

    expect(onSend).not.toHaveBeenCalled();
    expect(input).toHaveValue("line one\nline two");
  });

  it("disables the button for blank input", async () => {
    const { button, input } = setup();
    expect(button).toBeDisabled();

    await userEvent.type(input, "   ");
    expect(button).toBeDisabled();
  });

  it("does not send while disabled", async () => {
    const { onSend, input, button } = setup({ disabled: true });

    await userEvent.type(input, "hello{Enter}");

    expect(button).toBeDisabled();
    expect(onSend).not.toHaveBeenCalled();
  });
});
