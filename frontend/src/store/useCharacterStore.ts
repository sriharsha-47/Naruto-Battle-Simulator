import { create } from 'zustand';
import { Character, ChakraNature } from '../types/character';
import { CHARACTERS } from '../api/mockData';
import { api } from '../api/client';

interface CharacterStore {
  characters: Character[];
  selectedCharacter: Character | null;
  comparisonSlot1: Character | null;
  comparisonSlot2: Character | null;
  searchQuery: string;
  filterNature: ChakraNature | 'All';
  isLoading: boolean;
  error: string | null;

  loadCharacters: () => Promise<void>;
  setSelectedCharacter: (character: Character | null) => void;
  setComparisonSlot1: (character: Character | null) => void;
  setComparisonSlot2: (character: Character | null) => void;
  setSearchQuery: (query: string) => void;
  setFilterNature: (nature: ChakraNature | 'All') => void;
}

export const useCharacterStore = create<CharacterStore>((set, get) => ({
  characters: CHARACTERS,
  selectedCharacter: CHARACTERS[0],
  comparisonSlot1: CHARACTERS[0],
  comparisonSlot2: CHARACTERS[1],
  searchQuery: '',
  filterNature: 'All',
  isLoading: false,
  error: null,

  loadCharacters: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await api.fetchCharacters();
      set({
        characters: data,
        selectedCharacter: data[0] || null,
        comparisonSlot1: data[0] || null,
        comparisonSlot2: data[1] || null,
        isLoading: false,
      });
    } catch (err: unknown) {
      set({
        error: (err as Error).message || 'Failed to load characters',
        isLoading: false,
      });
    }
  },

  setSelectedCharacter: (character) => set({ selectedCharacter: character }),
  setComparisonSlot1: (character) => set({ comparisonSlot1: character }),
  setComparisonSlot2: (character) => set({ comparisonSlot2: character }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setFilterNature: (filterNature) => set({ filterNature }),
}));
