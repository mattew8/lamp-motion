import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { LampMotion } from "..";

describe("LampMotion", () => {
  it("opens content when trigger is activated", async () => {
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

  it("closes on escape and restores focus", async () => {
    const user = userEvent.setup();

    render(
      <LampMotion>
        <LampMotion.Trigger>
          <button type="button">Open modal</button>
        </LampMotion.Trigger>

        <LampMotion.Portal>
          <LampMotion.Content>
            <div>
              <button type="button">Inner action</button>
            </div>
          </LampMotion.Content>
        </LampMotion.Portal>
      </LampMotion>,
    );

    const button = screen.getByRole("button", { name: /open modal/i });

    await act(async () => {
      await user.click(button);
    });

    const innerAction = screen.getByRole("button", { name: /inner action/i });
    expect(innerAction).toHaveFocus();

    await act(async () => {
      await user.keyboard("{Escape}");
    });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(button).toHaveFocus();
  });

  it("closes when clicking outside the content", async () => {
    const user = userEvent.setup();

    render(
      <>
        <LampMotion>
          <LampMotion.Trigger>
            <button type="button">Open modal</button>
          </LampMotion.Trigger>

          <LampMotion.Portal>
            <LampMotion.Content>
              <div>Dialog body</div>
            </LampMotion.Content>
          </LampMotion.Portal>
        </LampMotion>

        <button type="button">Outside</button>
      </>,
    );

    const button = screen.getByRole("button", { name: /open modal/i });
    const outside = screen.getByRole("button", { name: /outside/i });

    await act(async () => {
      await user.click(button);
    });
    expect(screen.getByText("Dialog body")).toBeInTheDocument();

    await act(async () => {
      await user.click(outside);
    });

    expect(screen.queryByText("Dialog body")).not.toBeInTheDocument();
    expect(button).toHaveFocus();
  });
});
