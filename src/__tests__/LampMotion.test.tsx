import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LampMotion } from "..";

describe("LampMotion", () => {
  let rafSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    rafSpy = vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
      cb(performance.now());
      return 0 as unknown as number;
    });
  });

  afterEach(() => {
    rafSpy.mockRestore();
  });

  it("opens content when the trigger is activated", async () => {
    const user = userEvent.setup();

    render(
      <LampMotion>
        <LampMotion.Trigger>
          <button type="button">Open modal</button>
        </LampMotion.Trigger>

        <LampMotion.Portal>
          <LampMotion.Content>
            <div>Dialog body</div>
          </LampMotion.Content>
        </LampMotion.Portal>
      </LampMotion>,
    );

    const button = screen.getByRole("button", { name: /open modal/i });
    expect(screen.queryByText("Dialog body")).not.toBeInTheDocument();

    await act(async () => {
      await user.click(button);
    });

    expect(screen.getByText("Dialog body")).toBeInTheDocument();
    expect(button).toHaveAttribute("aria-expanded", "true");
  });

  it("closes when the trigger is toggled a second time", async () => {
    const user = userEvent.setup();

    render(
      <LampMotion>
        <LampMotion.Trigger>
          <button type="button">Open modal</button>
        </LampMotion.Trigger>

        <LampMotion.Portal>
          <LampMotion.Content>
            <div>Dialog body</div>
          </LampMotion.Content>
        </LampMotion.Portal>
      </LampMotion>,
    );

    const button = screen.getByRole("button", { name: /open modal/i });

    await act(async () => {
      await user.click(button);
    });
    const content = screen.getByText("Dialog body");
    expect(content).toBeInTheDocument();

    await act(async () => {
      await user.click(button);
    });

    await act(async () => {
      fireEvent.transitionEnd(content, { propertyName: "transform" });
    });

    await waitFor(() => {
      expect(screen.queryByText("Dialog body")).not.toBeInTheDocument();
    });
    expect(button).toHaveAttribute("aria-expanded", "false");
  });

  it("does not re-open while an animation is running", async () => {
    const user = userEvent.setup();

    render(
      <LampMotion>
        <LampMotion.Trigger>
          <button type="button">Open modal</button>
        </LampMotion.Trigger>

        <LampMotion.Portal>
          <LampMotion.Content>
            <div>Dialog body</div>
          </LampMotion.Content>
        </LampMotion.Portal>
      </LampMotion>,
    );

    const button = screen.getByRole("button", { name: /open modal/i });

    await act(async () => {
      await user.click(button);
    });
    const content = screen.getByText("Dialog body");

    await act(async () => {
      await user.click(button);
    });

    await act(async () => {
      await user.click(button);
    });

    expect(button).toHaveAttribute("aria-expanded", "false");

    await act(async () => {
      fireEvent.transitionEnd(content, { propertyName: "transform" });
    });

    await waitFor(() => {
      expect(screen.queryByText("Dialog body")).not.toBeInTheDocument();
    });

    await act(async () => {
      await user.click(button);
    });

    await waitFor(() => {
      expect(screen.getByText("Dialog body")).toBeInTheDocument();
    });
    expect(button).toHaveAttribute("aria-expanded", "true");
  });
});
