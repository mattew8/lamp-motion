# GenieMotion

macOS의 Genie(램프) 효과를 웹에서 구현하는 React 기반 headless UI 라이브러리.

## ✨ Features

- 🎨 **macOS Genie Effect**: 실제 macOS의 램프 효과를 웹에서 구현
- 🧩 **Compound Components**: Radix UI 스타일의 유연한 API
- 🪶 **Zero Dependencies**: React 외 추가 라이브러리 불필요
- 📦 **Small Bundle**: 최소한의 번들 크기 (~10KB gzipped 목표)
- 🎯 **TypeScript**: 완벽한 타입 지원
- ⚡ **60fps Animation**: requestAnimationFrame 기반 부드러운 애니메이션

## 📦 Installation

```bash
npm install genie-motion
```

## 🚀 Quick Start

```tsx
import { GenieMotion } from 'genie-motion';

function App() {
  return (
    <GenieMotion.Root>
      <GenieMotion.Trigger>
        Open Modal
      </GenieMotion.Trigger>

      <GenieMotion.Content>
        <div style={{
          width: 400,
          height: 300,
          backgroundColor: 'white',
          borderRadius: 8,
          padding: 24,
        }}>
          <h2>Modal Title</h2>
          <p>Modal content goes here...</p>
        </div>
      </GenieMotion.Content>
    </GenieMotion.Root>
  );
}
```

## 📚 API Reference

### GenieMotion.Root

루트 컴포넌트로 모든 하위 컴포넌트를 감싸는 컨테이너입니다.

```tsx
interface GenieMotionRootProps {
  children: React.ReactNode;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}
```

**Props:**
- `children`: 하위 컴포넌트들
- `defaultOpen`: 초기 열림 상태 (기본값: `false`)
- `onOpenChange`: 상태 변경 콜백 함수

**Example:**
```tsx
<GenieMotion.Root defaultOpen={false} onOpenChange={(open) => console.log(open)}>
  {/* ... */}
</GenieMotion.Root>
```

### GenieMotion.Trigger

Genie 애니메이션을 트리거하는 버튼 컴포넌트입니다.

```tsx
interface GenieMotionTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
  children: React.ReactNode;
}
```

**Props:**
- `asChild`: 자식 요소를 버튼 대신 사용 (기본값: `false`)
- 모든 HTML 버튼 속성 지원

**Example:**
```tsx
<GenieMotion.Trigger>Click Me</GenieMotion.Trigger>

{/* Custom element with asChild */}
<GenieMotion.Trigger asChild>
  <button className="custom-button">Custom Button</button>
</GenieMotion.Trigger>
```

### GenieMotion.Content

Genie 애니메이션이 적용되는 콘텐츠 컴포넌트입니다.

```tsx
interface GenieMotionContentProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}
```

**Props:**
- `children`: 표시할 콘텐츠
- `className`: CSS 클래스명
- `style`: 인라인 스타일

**Example:**
```tsx
<GenieMotion.Content className="modal" style={{ zIndex: 9999 }}>
  <div>Your content here</div>
</GenieMotion.Content>
```

## 🎨 Advanced Usage

### Controlled State

```tsx
function ControlledExample() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <GenieMotion.Root
      defaultOpen={isOpen}
      onOpenChange={setIsOpen}
    >
      <GenieMotion.Trigger>Toggle</GenieMotion.Trigger>
      <GenieMotion.Content>
        <button onClick={() => setIsOpen(false)}>
          Close
        </button>
      </GenieMotion.Content>
    </GenieMotion.Root>
  );
}
```

### Custom Styling

```tsx
<GenieMotion.Content
  className="my-modal"
  style={{
    width: '80vw',
    maxWidth: 600,
    height: '60vh',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 32,
  }}
>
  <h1>Custom Styled Modal</h1>
</GenieMotion.Content>
```

### Using Context

```tsx
import { useGenieMotionContext } from 'genie-motion';

function CustomCloseButton() {
  const { close } = useGenieMotionContext();

  return (
    <button onClick={close}>
      Close Modal
    </button>
  );
}
```

## 🏗️ Architecture

### Compound Component Pattern

GenieMotion은 Radix UI와 유사한 Compound Component 패턴을 사용합니다:

```
GenieMotion.Root (Context Provider)
  ├── GenieMotion.Trigger (Button)
  └── GenieMotion.Content (Animated Container)
```

### Animation Algorithm

macOS Genie 효과의 핵심:
1. **Transform**: translate + scale + skew 조합
2. **Easing**: cubic-bezier 기반 부드러운 전환
3. **GPU Acceleration**: `transform` 속성 사용으로 성능 최적화

```typescript
// 핵심 계산 로직
transform = `
  translate(${x}px, ${y}px)
  scale(${scaleX}, ${scaleY})
  skewY(${skew}deg)
`;
```

## 🔧 Development

```bash
# Install dependencies
npm install

# Type check
npm run typecheck

# Build
npm run build

# Watch mode
npm run dev
```

## 📊 Browser Support

- Chrome (latest)
- Safari (latest)
- Firefox (latest)
- Edge (latest)

## 📝 License

MIT

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 🔗 Related Projects

- [Radix UI](https://www.radix-ui.com/) - Headless UI 라이브러리 영감
- [Framer Motion](https://www.framer.com/motion/) - 애니메이션 라이브러리
