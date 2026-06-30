# Stroke ✏️

A real-time collaborative whiteboard for sketching ideas, doodling, and explaining concepts visually — right in the browser.

**[Try it live →](https://stroke-black.vercel.app)**

## Features

### Drawing Tools
- **Freehand drawing** with smooth, pressure-aware strokes
- **Shape tools** — rectangles, circles, ellipses, and diamonds
- **Arrows** for connecting ideas and flow diagrams
- **Text labels** anywhere on the canvas
- **Precision eraser** with animated trail feedback

### Customization
- Custom colors, stroke widths, and fill colors
- Dark mode for comfortable late-night sessions
- Optional grid with snap-to-grid alignment
- Adaptive zoom from 30% to 500%

### Real-Time Collaboration
- **Live cursors** — see where everyone is pointing, with names displayed
- **Live drawing preview** — watch shapes and strokes appear as others draw them (before they even finish)
- **Room-based sessions** — share a link and start collaborating instantly
- **Up to 50 users** per room
- Nickname support with inline editing

### Quality of Life
- Undo / Redo with full history
- Keyboard shortcuts for every tool
- Marquee selection and multi-element drag
- Resize handles on shapes and text
- Context menu with duplicate, delete, bring-to-front, send-to-back

## Getting Started

### Run locally

```bash
git clone https://github.com/Spaceboy-ren/Stroke.git
cd Stroke
npm install

# Start the collaboration server
npm run server

# In a separate terminal, start the frontend
npm run dev
```

Open `http://localhost:5173` — the Share button copies a room link you can open in another tab to test collaboration.

### Deploy your own

| Component | Platform | Command |
|-----------|----------|---------|
| WebSocket server | [Render](https://render.com) | `node server/index.js` |
| Frontend | [Vercel](https://vercel.com) | Auto-detected as Vite |

Set `VITE_WS_URL=wss://your-server.onrender.com` as an environment variable on Vercel.

## Tech Stack

- **React** + **TypeScript** — UI and type safety
- **Vite** — fast dev server and builds
- **Zustand** — lightweight state management
- **Canvas API** — hardware-accelerated 2D rendering
- **WebSockets** — real-time collaboration server (Node.js)
- **Tailwind CSS** — utility-first styling
- **Framer Motion** — smooth animations
- **Lucide React** — icon set

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `V` | Select tool |
| `P` | Draw tool |
| `R` | Rectangle |
| `O` | Circle / Ellipse |
| `D` | Diamond |
| `A` | Arrow |
| `T` | Text |
| `E` | Eraser |
| `Ctrl+Z` | Undo |
| `Ctrl+Shift+Z` | Redo |
| `Ctrl+'` | Toggle grid |
| `Ctrl+Shift+L` | Toggle dark mode |
| `Delete` | Delete selected |
| `Ctrl+Click` / `Middle mouse` | Pan canvas |
| `Scroll wheel` | Zoom in/out |

## Why the Name

Every drawing begins with a single stroke. The name reflects simplicity and focus.

## License

MIT License. Free to use, modify, and distribute.
