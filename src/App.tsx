import Canvas from './components/Canvas';
import Toolbar from './components/Toolbar/Toolbar';
import ToolPalette from './components/Toolbar/ToolPalette';
import ColorPalette from './components/Toolbar/ColorPalette';
import ShortcutsHelp from './components/ShortcutsHelp';
import useKeyboardShortcuts from './hooks/useKeyboardShortcuts';
import './index.css';

export default function App() {
    const { showShortcuts, setShowShortcuts } = useKeyboardShortcuts();

    return (
        <div className="w-screen h-screen overflow-hidden bg-background">
            <Toolbar />
            <ToolPalette />
            <ColorPalette />

            <main className="w-full h-full pt-14">
                <Canvas />
            </main>

            <ShortcutsHelp isOpen={showShortcuts} onClose={() => setShowShortcuts(false)} />
        </div>
    );
}
