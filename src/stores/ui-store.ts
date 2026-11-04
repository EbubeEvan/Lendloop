"use client";

import { create } from "zustand";

import type { ToolCategory } from "@/lib/categories";

type CategoryFilter = ToolCategory | "all";

type UiState = {
  mobileNavOpen: boolean;
  setMobileNavOpen: (open: boolean) => void;
  categoryFilter: CategoryFilter;
  setCategoryFilter: (category: CategoryFilter) => void;
  search: string;
  setSearch: (search: string) => void;
  onlyAvailable: boolean;
  setOnlyAvailable: (onlyAvailable: boolean) => void;
  resetBrowseFilters: () => void;
};

export const useUiStore = create<UiState>((set) => ({
  mobileNavOpen: false,
  setMobileNavOpen: (mobileNavOpen) => set({ mobileNavOpen }),
  categoryFilter: "all",
  setCategoryFilter: (categoryFilter) => set({ categoryFilter }),
  search: "",
  setSearch: (search) => set({ search }),
  onlyAvailable: false,
  setOnlyAvailable: (onlyAvailable) => set({ onlyAvailable }),
  resetBrowseFilters: () => set({ categoryFilter: "all", search: "", onlyAvailable: false }),
}));
