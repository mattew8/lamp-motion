import type { Meta, StoryObj } from "@storybook/react";
import { motion } from "framer-motion";
import { LampMotion } from "../src";

function StoryCard() {
  return (
    <div
      style={{
        minHeight: "320px",
        display: "grid",
        placeItems: "center",
        background: "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)",
        fontFamily: "Inter, system-ui, sans-serif",
      }}
    >
      <LampMotion>
        <LampMotion.Trigger>
          <button
            type="button"
            style={{
              padding: "12px 24px",
              borderRadius: "999px",
              border: "1px solid #0f172a",
              background: "black",
              color: "white",
              cursor: "pointer",
            }}
          >
            Open card
          </button>
        </LampMotion.Trigger>

        <LampMotion.Portal>
          <LampMotion.Content>
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
              style={{
                position: "fixed",
                inset: 0,
                display: "grid",
                placeItems: "center",
                background: "rgba(15, 23, 42, 0.35)",
              }}
            >
              <div
                style={{
                  width: "320px",
                  padding: "24px",
                  borderRadius: "18px",
                  background: "white",
                  boxShadow: "0 24px 72px rgba(15, 23, 42, 0.22)",
                  display: "grid",
                  gap: "16px",
                }}
              >
                <header
                  style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
                >
                  <div>
                    <p style={{ margin: 0, fontSize: "12px", color: "#64748b" }}>LampMotion</p>
                    <h3 style={{ margin: "4px 0 0", fontSize: "18px" }}>Compound example</h3>
                  </div>
                  <LampMotion.Trigger>
                    <button
                      type="button"
                      style={{
                        border: "none",
                        background: "transparent",
                        color: "#0f172a",
                        fontSize: "18px",
                        cursor: "pointer",
                      }}
                      aria-label="Close"
                    >
                      ×
                    </button>
                  </LampMotion.Trigger>
                </header>

                <p style={{ margin: 0, fontSize: "14px", color: "#475569" }}>
                  Click the trigger again or press Escape to close. The component manages focus,
                  outside clicks, and scroll locking for you.
                </p>

                <footer style={{ display: "flex", gap: "12px" }}>
                  <LampMotion.Trigger>
                    <button
                      type="button"
                      style={{
                        flex: 1,
                        padding: "10px 16px",
                        borderRadius: "12px",
                        border: "1px solid #cbd5f5",
                        background: "#f8fafc",
                        color: "#0f172a",
                        cursor: "pointer",
                      }}
                    >
                      Close
                    </button>
                  </LampMotion.Trigger>

                  <button
                    type="button"
                    style={{
                      flex: 1,
                      padding: "10px 16px",
                      borderRadius: "12px",
                      border: "1px solid #0ea5e9",
                      background: "#38bdf8",
                      color: "white",
                      cursor: "pointer",
                    }}
                  >
                    Continue
                  </button>
                </footer>
              </div>
            </motion.div>
          </LampMotion.Content>
        </LampMotion.Portal>
      </LampMotion>
    </div>
  );
}

const meta: Meta<typeof StoryCard> = {
  title: "Components/LampMotion",
  component: StoryCard,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component: "Minimal composition of LampMotion.Trigger, .Portal, and .Content.",
      },
    },
  },
};

type Story = StoryObj<typeof StoryCard>;

export default meta;

export const Overlay: Story = {
  render: () => <StoryCard />,
};
