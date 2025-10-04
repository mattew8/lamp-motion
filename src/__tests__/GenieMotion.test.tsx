import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GenieMotion } from "..";
import { GENIE_DURATION_MS } from "../components/genie-motion/GenieMotionRoot";

describe("GenieMotion", () => {
  let rafSpy: ReturnType<typeof vi.spyOn>;
  let rafQueue: FrameRequestCallback[];
  let originalCSS: typeof window.CSS;

  beforeEach(() => {
    rafQueue = [];
    rafSpy = vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
      rafQueue.push(cb);
      return rafQueue.length as unknown as number;
    });
    originalCSS = window.CSS;
    setClipPathSupport(true);
  });

  afterEach(() => {
    rafSpy.mockRestore();
    if (originalCSS) {
      window.CSS = originalCSS;
    } else {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete (window as typeof window & { CSS?: typeof window.CSS }).CSS;
    }
  });

  it("opens content when the trigger is activated", async () => {
    const user = userEvent.setup();

    render(
      <GenieMotion>
        <GenieMotion.Trigger>
          <button type="button">Open modal</button>
        </GenieMotion.Trigger>

        <GenieMotion.Portal>
          <GenieMotion.Content>
            <div>Dialog body</div>
          </GenieMotion.Content>
        </GenieMotion.Portal>
      </GenieMotion>,
    );

    const button = screen.getByRole("button", { name: /open modal/i });
    expect(screen.queryByText("Dialog body")).not.toBeInTheDocument();

    await act(async () => {
      await user.click(button);
    });

    await flushRafs();

    expect(screen.getByText("Dialog body")).toBeInTheDocument();
    expect(button).toHaveAttribute("aria-expanded", "true");
  });

  it("uses a genie neck path when clip-path path() is supported", async () => {
    setClipPathSupport(true);
    const user = userEvent.setup();

    render(
      <GenieMotion>
        <GenieMotion.Trigger>
          <button type="button">Open modal</button>
        </GenieMotion.Trigger>

        <GenieMotion.Portal>
          <GenieMotion.Content>
            <div data-testid="dialog">Dialog body</div>
          </GenieMotion.Content>
        </GenieMotion.Portal>
      </GenieMotion>,
    );

    const button = screen.getByRole("button", { name: /open modal/i });

    await act(async () => {
      await user.click(button);
    });

    const dialog = screen.getByTestId("dialog");
    const initialClip = dialog.style.clipPath;
    expect(initialClip.startsWith("path(")).toBe(true);

    await flushRafs(1);
    const midClip = dialog.style.clipPath;
    expect(midClip.startsWith("path(")).toBe(true);

    await flushRafs();
    const finalClip = dialog.style.clipPath;
    expect(finalClip.startsWith("path(")).toBe(true);
    expect(finalClip).not.toEqual(initialClip);
    expect(dialog.style.transformOrigin).toMatch(/px \d+(?:\.\d+)?px/);
  });

  it("falls back to circular clip-path when path() is unsupported and closes via ESC", async () => {
    setClipPathSupport(false);
    vi.useFakeTimers();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

    render(
      <GenieMotion>
        <GenieMotion.Trigger>
          <button type="button">Open modal</button>
        </GenieMotion.Trigger>

        <GenieMotion.Portal>
          <GenieMotion.Content>
            <div data-testid="dialog">Dialog body</div>
          </GenieMotion.Content>
        </GenieMotion.Portal>
      </GenieMotion>,
    );

    const button = screen.getByRole("button", { name: /open modal/i });

    await act(async () => {
      await user.click(button);
    });

    await flushRafs();

    const dialog = screen.getByTestId("dialog");
    expect(dialog.style.clipPath).toMatch(/^circle\(/);

    await act(async () => {
      await user.keyboard("{Escape}");
    });

    await flushRafs();

    expect(dialog.style.transform).toContain("skewY(-3deg)");
    expect(dialog.style.clipPath).toMatch(/^circle\(/);
    expect(button).toHaveAttribute("aria-expanded", "false");

    await act(async () => {
      fireEvent.transitionEnd(dialog, { propertyName: "transform" });
    });

    await act(async () => {
      vi.advanceTimersByTime(GENIE_DURATION_MS + 50);
    });

    expect(screen.queryByText("Dialog body")).not.toBeInTheDocument();
    vi.useRealTimers();
  });

  async function flushRafs(steps?: number) {
    if (typeof steps === "number") {
      for (let i = 0; i < steps; i += 1) {
        const callback = rafQueue.shift();
        if (!callback) break;
        await act(async () => {
          callback(performance.now());
        });
      }
      return;
    }

    while (rafQueue.length > 0) {
      const callback = rafQueue.shift();
      if (!callback) break;
      await act(async () => {
        callback(performance.now());
      });
    }
  }

  function setClipPathSupport(supported: boolean) {
    window.CSS = {
      supports: vi.fn((property: string, value: string) => {
        if (property === "clip-path" && value.startsWith("path(")) {
          return supported;
        }
        return true;
      }),
    } as typeof window.CSS;
  }
});
