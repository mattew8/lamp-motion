import type { Meta, StoryObj } from "@storybook/react";
import React from "react";
import { GenieMotion } from "../index";
import "./genie-motion.css";

const meta = {
  title: "Components/GenieMotion",
  component: GenieMotion.Root,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof GenieMotion.Root>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Basic: Story = {
  render: () => (
    <div className="story-container">
      <GenieMotion.Root>
        <GenieMotion.Trigger className="trigger-button">Open Modal</GenieMotion.Trigger>

        <GenieMotion.Content>
          <div className="modal-content">
            <h2>Welcome to GenieMotion!</h2>
            <p>This is a modal with the macOS Genie effect.</p>
            <p>Click outside or press ESC to close.</p>
          </div>
        </GenieMotion.Content>
      </GenieMotion.Root>
    </div>
  ),
};

export const CustomStyling: Story = {
  render: () => (
    <div className="story-container">
      <GenieMotion.Root>
        <GenieMotion.Trigger
          className="trigger-button"
          style={{
            padding: "16px 32px",
            fontSize: "18px",
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            border: "none",
            borderRadius: "12px",
            color: "white",
            cursor: "pointer",
          }}
        >
          Open Gradient Modal
        </GenieMotion.Trigger>

        <GenieMotion.Content>
          <div
            className="modal-content"
            style={{
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              color: "white",
              maxWidth: "500px",
              borderRadius: "20px",
              padding: "40px",
            }}
          >
            <h2 style={{ marginTop: 0 }}>Custom Styled Modal</h2>
            <p>This modal has custom gradient styling!</p>
            <button
              style={{
                marginTop: "20px",
                padding: "12px 24px",
                background: "white",
                color: "#667eea",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                fontWeight: "bold",
              }}
            >
              Custom Button
            </button>
          </div>
        </GenieMotion.Content>
      </GenieMotion.Root>
    </div>
  ),
};

export const LargeContent: Story = {
  render: () => (
    <div className="story-container">
      <GenieMotion.Root>
        <GenieMotion.Trigger className="trigger-button">Open Large Modal</GenieMotion.Trigger>

        <GenieMotion.Content>
          <div className="modal-content modal-large">
            <h2>Large Modal Content</h2>
            <p>This modal demonstrates the Genie effect with larger content.</p>
            <div>
              <h3>Features</h3>
              <ul>
                <li>macOS-inspired Genie animation</li>
                <li>Smooth 60fps performance</li>
                <li>Customizable styling</li>
                <li>TypeScript support</li>
                <li>Zero dependencies (except React)</li>
              </ul>
            </div>
            <div>
              <h3>Usage Example</h3>
              <pre
                style={{
                  background: "#f5f5f5",
                  padding: "16px",
                  borderRadius: "8px",
                  overflow: "auto",
                }}
              >
                {`<GenieMotion.Root>
  <GenieMotion.Trigger>
    Click Me
  </GenieMotion.Trigger>
  <GenieMotion.Content>
    Your content here
  </GenieMotion.Content>
</GenieMotion.Root>`}
              </pre>
            </div>
          </div>
        </GenieMotion.Content>
      </GenieMotion.Root>
    </div>
  ),
};

export const PositionedTrigger: Story = {
  render: () => (
    <div className="story-container">
      <div style={{ display: "flex", gap: "40px", flexWrap: "wrap" }}>
        {/* Top Left */}
        <GenieMotion.Root>
          <GenieMotion.Trigger className="trigger-button trigger-small">
            Top Left
          </GenieMotion.Trigger>
          <GenieMotion.Content>
            <div className="modal-content">
              <h3>From Top Left</h3>
              <p>The Genie effect animates from the trigger position.</p>
            </div>
          </GenieMotion.Content>
        </GenieMotion.Root>

        {/* Top Right */}
        <GenieMotion.Root>
          <GenieMotion.Trigger className="trigger-button trigger-small">
            Top Right
          </GenieMotion.Trigger>
          <GenieMotion.Content>
            <div className="modal-content">
              <h3>From Top Right</h3>
              <p>Notice how the animation originates from the button.</p>
            </div>
          </GenieMotion.Content>
        </GenieMotion.Root>

        {/* Bottom Left */}
        <GenieMotion.Root>
          <GenieMotion.Trigger className="trigger-button trigger-small">
            Bottom Left
          </GenieMotion.Trigger>
          <GenieMotion.Content>
            <div className="modal-content">
              <h3>From Bottom</h3>
              <p>The Genie effect works from any position!</p>
            </div>
          </GenieMotion.Content>
        </GenieMotion.Root>

        {/* Bottom Right */}
        <GenieMotion.Root>
          <GenieMotion.Trigger className="trigger-button trigger-small">
            Bottom Right
          </GenieMotion.Trigger>
          <GenieMotion.Content>
            <div className="modal-content">
              <h3>Dynamic Origin</h3>
              <p>Each trigger creates a unique animation path.</p>
            </div>
          </GenieMotion.Content>
        </GenieMotion.Root>
      </div>
    </div>
  ),
};

export const ControlledState: Story = {
  render: function ControlledExample() {
    const [isOpen, setIsOpen] = React.useState(false);

    return (
      <div className="story-container">
        <div style={{ marginBottom: "20px" }}>
          <p>
            Modal is currently: <strong>{isOpen ? "OPEN" : "CLOSED"}</strong>
          </p>
          <button
            onClick={() => setIsOpen(!isOpen)}
            style={{
              padding: "8px 16px",
              marginRight: "10px",
              background: "#666",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            Toggle from Outside
          </button>
        </div>

        <GenieMotion.Root defaultOpen={isOpen} onOpenChange={setIsOpen}>
          <GenieMotion.Trigger className="trigger-button">
            Open Modal (Controlled)
          </GenieMotion.Trigger>

          <GenieMotion.Content>
            <div className="modal-content">
              <h2>Controlled Modal</h2>
              <p>This modal's state is controlled from outside.</p>
              <button
                onClick={() => setIsOpen(false)}
                style={{
                  padding: "8px 16px",
                  background: "#f44336",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                Close
              </button>
            </div>
          </GenieMotion.Content>
        </GenieMotion.Root>
      </div>
    );
  },
};
