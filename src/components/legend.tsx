interface LegendProps {
  showCopyEvents?: boolean;
  onCopyEventsToggle?: (show: boolean) => void;
}

export default function Legend({ showCopyEvents = false, onCopyEventsToggle }: LegendProps) {
  return (
    <div className="h-full">
      <h3 className="text-lg font-bold text-gray-900 mb-4">Timeline Legend</h3>
      <div className="space-y-4 text-sm text-gray-700">
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="show-copy-events"
            checked={showCopyEvents}
            onChange={(e) => onCopyEventsToggle?.(e.target.checked)}
            className="w-4 h-4 text-amber-500 rounded border-gray-300 focus:ring-amber-500 cursor-pointer"
          />
          <div
            className={`w-4 h-4 bg-[#f59e0b] flex-shrink-0 ${!showCopyEvents ? 'opacity-40' : ''}`}
            style={{ clipPath: "polygon(0% 0%, 50% 100%, 100% 0%)" }}
          ></div>
          <div>
            <label htmlFor="show-copy-events" className="font-semibold cursor-pointer">Copy Event</label>
            <p className="text-xs text-gray-600">
              Text was copied to clipboard
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div
            className="w-4 h-4 bg-[#8b5cf6] flex-shrink-0"
            style={{ clipPath: "polygon(0% 0%, 50% 100%, 100% 0%)" }}
          ></div>
          <div>
            <p className="font-semibold">Paste to Editor</p>
            <p className="text-xs text-gray-600">Text was pasted into the editor</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div
            className="w-4 h-4 bg-[#ec4899] flex-shrink-0"
            style={{ clipPath: "polygon(0% 0%, 50% 100%, 100% 0%)" }}
          ></div>
          <div>
            <p className="font-semibold">Paste to GPT</p>
            <p className="text-xs text-gray-600">Text was pasted into ChatGPT</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div
            className="w-4 h-4 bg-[#10a37f] flex-shrink-0"
            style={{ clipPath: "polygon(0% 0%, 50% 100%, 100% 0%)" }}
          ></div>
          <div>
            <p className="font-semibold">GPT Inquiry</p>
            <p className="text-xs text-gray-600">
              User asked ChatGPT a question
            </p>
          </div>
        </div>
        <div className="mt-6 pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-600 italic">
            Click on any annotation marker on the timeline to jump to that
            event.
          </p>
        </div>
      </div>
    </div>
  );
}
