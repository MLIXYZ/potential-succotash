import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App";
import { ChatError, sendMessage as realSendMessage } from "./api";

vi.mock("./api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./api")>()),
  sendMessage: vi.fn(),
}));

const sendMessage = vi.mocked(realSendMessage);

async function ask(question: string) {
  await userEvent.type(screen.getByLabelText("Ask a question"), `${question}{Enter}`);
}

describe("App", () => {
  beforeEach(() => {
    sendMessage.mockReset();
  });

  it("shows the question, then the answer with its sources", async () => {
    sendMessage.mockResolvedValue({
      answer: "The library is open.",
      sources: [{ title: "Library", url: "https://library.sfsu.edu/" }],
    });
    render(<App />);

    await ask("library hours?");

    expect(screen.getByText("library hours?")).toBeInTheDocument();
    expect(await screen.findByText("The library is open.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Library" })).toBeInTheDocument();
    expect(sendMessage).toHaveBeenCalledWith("library hours?", expect.any(AbortSignal));
  });

  it("shows the ChatError message when the request fails", async () => {
    sendMessage.mockRejectedValue(new ChatError("The assistant is temporarily unavailable."));
    render(<App />);

    await ask("anything");

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "The assistant is temporarily unavailable.",
    );
  });

  it("shows a generic message for unexpected errors", async () => {
    sendMessage.mockRejectedValue(new Error("boom"));
    render(<App />);

    await ask("anything");

    expect(await screen.findByRole("alert")).toHaveTextContent("Unexpected error");
  });
});
