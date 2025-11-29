/**
 * Player Search Dropdown - Compact searchable dropdown for selecting players
 */

import React, { useState, useRef, useEffect, useMemo } from "react";
import { LuSearch, LuX, LuChevronDown } from "react-icons/lu";
import type { PlayerWithId } from "../../types";

interface PlayerSearchDropdownProps {
  players: PlayerWithId[];
  selectedPlayerId?: string;
  onSelect: (playerId: string | undefined) => void;
  placeholder?: string;
  position: "qb" | "rb" | "wr";
  playerMap?: Map<string, PlayerWithId>;
}

const positionColors = {
  qb: { bg: "bg-red-50", border: "border-red-200", text: "text-red-600", ring: "ring-red-200" },
  rb: { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-600", ring: "ring-blue-200" },
  wr: { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-600", ring: "ring-amber-200" },
};

export const PlayerSearchDropdown: React.FC<PlayerSearchDropdownProps> = ({
  players,
  selectedPlayerId,
  onSelect,
  placeholder = "Select...",
  position,
  playerMap,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const colors = positionColors[position];

  // Find selected player - use map if available for O(1) lookup
  const selectedPlayer = useMemo(() => {
    if (playerMap && selectedPlayerId) {
      return playerMap.get(selectedPlayerId);
    }
    return players.find(p => p.id === selectedPlayerId);
  }, [players, selectedPlayerId, playerMap]);

  // Filter players by search query
  const filteredPlayers = useMemo(() => {
    if (!searchQuery.trim()) return players.slice(0, 50); // Limit initial list
    const query = searchQuery.toLowerCase();
    return players
      .filter(p => 
        p.name.toLowerCase().includes(query) ||
        p.teamName?.toLowerCase().includes(query)
      )
      .slice(0, 50);
  }, [players, searchQuery]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearchQuery("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Focus input when opening
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSelect = (playerId: string) => {
    onSelect(playerId);
    setIsOpen(false);
    setSearchQuery("");
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(undefined);
    setSearchQuery("");
  };

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger Button - Compact */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between px-2 py-1.5 text-left border rounded transition-colors ${
          selectedPlayer
            ? `${colors.bg} ${colors.border}`
            : "bg-white border-border hover:border-text-muted"
        } ${isOpen ? `ring-2 ${colors.ring}` : ""}`}
      >
        <span className={`text-caption truncate ${selectedPlayer ? `${colors.text} font-medium` : "text-text-muted"}`}>
          {selectedPlayer ? selectedPlayer.name : placeholder}
        </span>
        <div className="flex items-center gap-0.5 flex-shrink-0 ml-1">
          {selectedPlayer && (
            <button
              type="button"
              onClick={handleClear}
              className="p-0.5 hover:bg-border rounded"
            >
              <LuX className="w-3 h-3 text-text-muted" />
            </button>
          )}
          <LuChevronDown className={`w-3 h-3 text-text-muted transition-transform ${isOpen ? "rotate-180" : ""}`} />
        </div>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-64 mt-1 bg-surface border border-border rounded-card shadow-lg max-h-72 overflow-hidden">
          {/* Search Input */}
          <div className="p-2 border-b border-border">
            <div className="relative">
              <LuSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name or team..."
                className="w-full pl-8 pr-3 py-1.5 text-body-sm bg-subtle border border-border rounded-button focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          </div>

          {/* Player List */}
          <div className="overflow-y-auto max-h-48">
            {filteredPlayers.length === 0 ? (
              <div className="p-4 text-center text-body-sm text-text-muted">
                No players found
              </div>
            ) : (
              filteredPlayers.filter(p => p.id).map(player => (
                <button
                  key={player.id}
                  type="button"
                  onClick={() => handleSelect(player.id!)}
                  className={`w-full flex items-center justify-between px-3 py-2 text-left hover:bg-subtle transition-colors ${
                    player.id === selectedPlayerId ? colors.bg : ""
                  }`}
                >
                  <div className="min-w-0">
                    <p className="text-body-sm font-medium text-text-primary truncate">
                      {player.name}
                    </p>
                    <p className="text-caption text-text-muted truncate">
                      {player.teamName || player.teamId} • {player.position}
                    </p>
                  </div>
                  {player.id === selectedPlayerId && (
                    <span className={`text-caption font-medium ${colors.text}`}>Selected</span>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PlayerSearchDropdown;

