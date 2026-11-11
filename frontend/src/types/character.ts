export type ChakraNature = 'Fire' | 'Lightning' | 'Wind' | 'Earth' | 'Water' | 'Yin-Yang';

export type AbilityType = 'attack' | 'heal' | 'buff' | 'ultimate' | 'defense';

export interface Ability {
  id: string;
  name: string;
  japaneseName: string;
  chakraCost: number;
  cooldown: number; // in turns
  currentCooldown?: number;
  damage?: number;
  heal?: number;
  shield?: number;
  type: AbilityType;
  description: string;
  target: 'enemy' | 'self';
  criticalChance?: number; // 0 to 1
  effectName?: string;
}

export interface CharacterBaseStats {
  hp: number;
  maxHp: number;
  chakra: number;
  maxChakra: number;
  attack: number;
  defense: number;
  speed: number;
}

export interface Character {
  id: string;
  name: string;
  title: string;
  village: string;
  kanji: string;
  symbol: string; // unicode / icon descriptor
  chakraNature: ChakraNature;
  gradient: {
    from: string;
    via?: string;
    to: string;
    border: string;
    glow: string;
  };
  description: string;
  lore: string;
  stats: CharacterBaseStats;
  abilities: Ability[];
}
