import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import Message from "./Message";
import type { ChatMessage } from "../types";

describe("Message", () => {
  it("renders a user bubble without sources", () => {
    render(<Message message={{ role: "user", text: "hello" }} />);
    expect(screen.getByText("hello")).toBeInTheDocument();
    expect(screen.queryByText("Sources")).not.toBeInTheDocument();
  });

  it("links only http(s) sources", () => {
    const message: ChatMessage = {
      role: "assistant",
      text: "Answer",
      sources: [
        { title: "Library", url: "https://library.sfsu.edu/" },
        { title: "Evil", url: "javascript:alert(1)" },
      ],
    };
    render(<Message message={message} />);

    const link = screen.getByRole("link", { name: "Library" });
    expect(link).toHaveAttribute("href", "https://library.sfsu.edu/");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
    expect(screen.queryByText("Evil")).not.toBeInTheDocument();
  });

  it("hides the sources row when nothing is linkable", () => {
    const message: ChatMessage = {
      role: "assistant",
      text: "Answer",
      sources: [{ title: "Evil", url: "javascript:alert(1)" }],
    };
    render(<Message message={message} />);
    expect(screen.queryByText("Sources")).not.toBeInTheDocument();
  });

  it("shows a map card when a location is present", () => {
    const message: ChatMessage = {
      role: "assistant",
      text: "It's here",
      location: { name: "J. Paul Leonard Library" },
    };
    render(<Message message={message} />);

    expect(screen.getByRole("link", { name: "Open in Google Maps" })).toHaveAttribute(
      "href",
      "https://www.google.com/maps/search/?api=1&query=J.%20Paul%20Leonard%20Library",
    );
  });
});
