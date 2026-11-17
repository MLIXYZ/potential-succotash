import { describe, expect, it, vi } from "vitest";
import { ChatError, sendMessage } from "./api";

function mockFetch(impl: () => Promise<Response>) {
  return vi.spyOn(globalThis, "fetch").mockImplementation(impl);
}

async function rejection(promise: Promise<unknown>): Promise<Error> {
  try {
    await promise;
  } catch (err) {
    return err as Error;
  }
  throw new Error("expected the promise to reject");
}

describe("sendMessage", () => {
  it("posts the message and returns the parsed body", async () => {
    const body = { answer: "Hi", sources: [] };
    const fetchSpy = mockFetch(async () => new Response(JSON.stringify(body), { status: 200 }));

    await expect(sendMessage("hello")).resolves.toEqual(body);

    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe("/api/chat");
    expect(init?.method).toBe("POST");
    expect(JSON.parse(String(init?.body))).toEqual({ message: "hello" });
  });

  it("maps a 502 to the temporarily-unavailable message", async () => {
    mockFetch(async () => new Response("", { status: 502 }));

    const err = await rejection(sendMessage("q"));
    expect(err).toBeInstanceOf(ChatError);
    expect(err.message).toMatch(/temporarily unavailable/);
  });

  it("maps other errors to a generic message", async () => {
    mockFetch(async () => new Response("", { status: 422 }));

    const err = await rejection(sendMessage("q"));
    expect(err).toBeInstanceOf(ChatError);
    expect(err.message).toMatch(/Something went wrong/);
  });

  it("turns a network failure into a ChatError", async () => {
    mockFetch(async () => {
      throw new TypeError("Failed to fetch");
    });

    const err = await rejection(sendMessage("q"));
    expect(err).toBeInstanceOf(ChatError);
    expect(err.message).toMatch(/Can't reach the assistant/);
  });

  it("rethrows an abort unchanged", async () => {
    const abort = new DOMException("Aborted", "AbortError");
    mockFetch(async () => {
      throw abort;
    });

    await expect(sendMessage("q")).rejects.toBe(abort);
  });
});
