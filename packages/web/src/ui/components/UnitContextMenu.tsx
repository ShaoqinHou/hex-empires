import { useEffect, useRef } from 'react';
import type { UnitState } from '@hex/engine';
import type { Registry } from '@hex/engine';
import type { UnitDef } from '@hex/engine';

interface UnitContextMenuProps {
  x: number;
  y: number;
  unit: UnitState;
  onClose: () => void;
  onFortify: () => void;
  onFoundCity: () => void;
  onSkipTurn: () => void;
  onDeleteUnit: () => void;
  unitRegistry: Registry<UnitDef>;
}

export function UnitContextMenu({
  x, y, unit, onClose,
  onFortify, onFoundCity, onSkipTurn, onDeleteUnit,
  unitRegistry,
}: UnitContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const unitDef = unitRegistry.get(unit.typeId);
  const isSettler = unitDef?.abilities.includes('found_city') ?? false;
  const isCivilian = unitDef?.category === 'civilian';

  // Close when clicking outside
  useEffect(() => {
    const handlePointerDown = (e: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    // Delay slightly so the right-click that opened the menu doesn't immediately close it
    const id = setTimeout(() => {
      document.addEventListener('pointerdown', handlePointerDown);
    }, 50);
    return () => {
      clearTimeout(id);
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [onClose]);

  // Keep menu within viewport
  const menuWidth = 180;
  const menuHeight = isSettler ? 160 : 132;
  const left = Math.min(x, window.innerWidth - menuWidth - 8);
  const top = Math.min(y, window.innerHeight - menuHeight - 8);

  const unitLabel = unitDef?.name ?? unit.typeId;

  return (
    <div
      ref={menuRef}
      className="fixed z-50 select-none"
      style={{ left, top }}
    >
      {/* Header */}
      <div className="bg-gray-900 border border-gray-600 rounded shadow-2xl overflow-hidden min-w-[180px]">
        <div className="px-3 py-1.5 bg-gray-800 border-b border-gray-600">
          <span className="text-xs font-semibold text-amber-400 uppercase tracking-wide">
            {unitLabel}
          </span>
        </div>

        <div className="py-1">
          {/* Fortify — only for military units */}
          {!isCivilian && (
            <button
              className="w-full flex items-center justify-between px-3 py-1.5 text-sm text-gray-200 hover:bg-gray-700 hover:text-white transition-colors"
              onClick={onFortify}
            >
              <span>Fortify</span>
              <span className="text-xs text-gray-500 ml-4">[F]</span>
            </button>
          )}

          {/* Found City — only for settlers */}
          {isSettler && (
            <button
              className="w-full flex items-center justify-between px-3 py-1.5 text-sm text-gray-200 hover:bg-gray-700 hover:text-white transition-colors"
              onClick={onFoundCity}
            >
              <span>Found City</span>
              <span className="text-xs text-gray-500 ml-4">[B]</span>
            </button>
          )}

          {/* Skip Turn */}
          <button
            className="w-full flex items-center justify-between px-3 py-1.5 text-sm text-gray-200 hover:bg-gray-700 hover:text-white transition-colors"
            onClick={onSkipTurn}
          >
            <span>Skip Turn</span>
            <span className="text-xs text-gray-500 ml-4">[S]</span>
          </button>

          <div className="my-1 border-t border-gray-700" />

          {/* Delete Unit */}
          <button
            className="w-full flex items-center justify-between px-3 py-1.5 text-sm text-red-400 hover:bg-red-900/40 hover:text-red-300 transition-colors"
            onClick={onDeleteUnit}
          >
            <span>Delete Unit</span>
            <span className="text-xs text-red-600 ml-4">Del</span>
          </button>
        </div>
      </div>
    </div>
  );
}
