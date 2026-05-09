export type Modpack = {
  category: "adventure" | "featured" | "performance";
  downloads: string;
  id: string;
  installed: boolean;
  loader: "Fabric" | "Forge" | "NeoForge" | "Quilt" | "Unknown";
  minecraft: string;
  name: string;
  performance: string;
  summary: string;
  tags: Array<string>;
  updated: string;
};

export type WorldEntry = {
  backups: number;
  difficulty: string;
  gameMode: "Adventure" | "Creative" | "Survival";
  id: string;
  lastPlayed: string;
  name: string;
  seed: string;
  size: string;
  status: "Backed up" | "Needs backup" | "Syncing";
};

export type ServerEntry = {
  address: string;
  favorite: boolean;
  id: string;
  latencyMs: number | null;
  name: string;
  players: string;
  status: "Maintenance" | "Offline" | "Online";
  tags: Array<string>;
  version: string;
};

export type ModEntry = {
  category: "Content" | "Library" | "Optimization" | "Utility";
  enabled: boolean;
  id: string;
  name: string;
  scope: "Client" | "Client + Server" | "Server";
  summary: string;
  updateAvailable: boolean;
  version: string;
};

export type ScreenshotEntry = {
  captured: string;
  favorite: boolean;
  id: string;
  instance: string;
  name: string;
  path: string;
  resolution: string;
  tags: Array<string>;
  world: string;
};

export const MODPACKS: Array<Modpack> = [
  {
    category: "featured",
    downloads: "12.4M",
    id: "valhelsia-six",
    installed: true,
    loader: "Forge",
    minecraft: "1.20.1",
    name: "Valhelsia 6",
    performance: "Balanced",
    summary:
      "A broad kitchen-sink pack tuned for long-running survival worlds and co-op servers.",
    tags: ["Tech", "Magic", "Exploration"],
    updated: "Updated 4d ago",
  },
  {
    category: "performance",
    downloads: "8.8M",
    id: "fabulously-optimized",
    installed: false,
    loader: "Fabric",
    minecraft: "1.21.5",
    name: "Fabulously Optimized",
    performance: "Fast",
    summary:
      "Client-side optimization stack for high frame rates, shaders, and vanilla parity.",
    tags: ["FPS", "Client", "Shaders"],
    updated: "Updated yesterday",
  },
  {
    category: "adventure",
    downloads: "5.1M",
    id: "prominence-two",
    installed: false,
    loader: "Fabric",
    minecraft: "1.20.1",
    name: "Prominence II",
    performance: "Demanding",
    summary:
      "Quest-driven progression with dimensions, bosses, skills, and curated world generation.",
    tags: ["Quests", "RPG", "Bosses"],
    updated: "Updated 1w ago",
  },
  {
    category: "featured",
    downloads: "18.2M",
    id: "all-the-mods-nine",
    installed: false,
    loader: "NeoForge",
    minecraft: "1.20.1",
    name: "All the Mods 9",
    performance: "Heavy",
    summary:
      "A large curated sandbox for automation, storage, magic, exploration, and late-game crafting.",
    tags: ["Automation", "Storage", "Magic"],
    updated: "Updated 3d ago",
  },
  {
    category: "performance",
    downloads: "3.6M",
    id: "simply-optimized",
    installed: false,
    loader: "Quilt",
    minecraft: "1.20.4",
    name: "Simply Optimized",
    performance: "Fast",
    summary:
      "Minimal performance-focused loadout for players who want vanilla mechanics and smooth play.",
    tags: ["Vanilla+", "FPS", "Lightweight"],
    updated: "Updated 2w ago",
  },
  {
    category: "adventure",
    downloads: "2.9M",
    id: "dawncraft",
    installed: false,
    loader: "Forge",
    minecraft: "1.18.2",
    name: "DawnCraft",
    performance: "Demanding",
    summary:
      "Action RPG combat, guided quests, structure hunting, and a slower survival cadence.",
    tags: ["Combat", "RPG", "Structures"],
    updated: "Updated 1mo ago",
  },
];

export const WORLDS: Array<WorldEntry> = [
  {
    backups: 12,
    difficulty: "Hard",
    gameMode: "Survival",
    id: "redstone-basin",
    lastPlayed: "2h ago",
    name: "Redstone Basin",
    seed: "-438199",
    size: "842 MB",
    status: "Backed up",
  },
  {
    backups: 4,
    difficulty: "Normal",
    gameMode: "Creative",
    id: "creative-flat",
    lastPlayed: "Yesterday",
    name: "Creative Flat",
    seed: "superflat",
    size: "96 MB",
    status: "Needs backup",
  },
  {
    backups: 8,
    difficulty: "Hard",
    gameMode: "Adventure",
    id: "winter-vault",
    lastPlayed: "3d ago",
    name: "Winter Vault",
    seed: "vault-17",
    size: "1.3 GB",
    status: "Syncing",
  },
  {
    backups: 6,
    difficulty: "Peaceful",
    gameMode: "Survival",
    id: "meadow-works",
    lastPlayed: "1w ago",
    name: "Meadow Works",
    seed: "771204",
    size: "510 MB",
    status: "Backed up",
  },
];

export const SERVERS: Array<ServerEntry> = [
  {
    address: "play.nyxen.local",
    favorite: true,
    id: "nyxen-realms",
    latencyMs: 24,
    name: "Nyxen Realms",
    players: "18 / 80",
    status: "Online",
    tags: ["Survival", "Whitelist"],
    version: "1.21.5",
  },
  {
    address: "modded.core.example",
    favorite: true,
    id: "core-modded",
    latencyMs: 68,
    name: "Core Modded",
    players: "7 / 32",
    status: "Online",
    tags: ["NeoForge", "ATM9"],
    version: "1.20.1",
  },
  {
    address: "buildbox.example",
    favorite: false,
    id: "build-box",
    latencyMs: 42,
    name: "Build Box",
    players: "2 / 20",
    status: "Online",
    tags: ["Creative", "Plots"],
    version: "1.20.4",
  },
  {
    address: "events.example",
    favorite: false,
    id: "event-node",
    latencyMs: null,
    name: "Event Node",
    players: "0 / 120",
    status: "Maintenance",
    tags: ["Events", "Minigames"],
    version: "1.21.x",
  },
];

export const MODS: Array<ModEntry> = [
  {
    category: "Optimization",
    enabled: true,
    id: "sodium",
    name: "Sodium",
    scope: "Client",
    summary: "Modern renderer rewrite focused on smoother frame pacing.",
    updateAvailable: false,
    version: "0.6.13",
  },
  {
    category: "Optimization",
    enabled: true,
    id: "lithium",
    name: "Lithium",
    scope: "Client + Server",
    summary: "Game logic optimizations that preserve vanilla behavior.",
    updateAvailable: true,
    version: "0.14.8",
  },
  {
    category: "Utility",
    enabled: true,
    id: "jade",
    name: "Jade",
    scope: "Client",
    summary: "Contextual block and entity inspection overlay.",
    updateAvailable: false,
    version: "15.10.0",
  },
  {
    category: "Content",
    enabled: false,
    id: "create",
    name: "Create",
    scope: "Client + Server",
    summary: "Mechanical automation, kinetic contraptions, and factory builds.",
    updateAvailable: true,
    version: "0.5.1",
  },
  {
    category: "Library",
    enabled: true,
    id: "fabric-api",
    name: "Fabric API",
    scope: "Client + Server",
    summary: "Shared hooks and APIs required by many Fabric mods.",
    updateAvailable: false,
    version: "0.119.2",
  },
];

export const SCREENSHOTS: Array<ScreenshotEntry> = [
  {
    captured: "Today, 14:10",
    favorite: true,
    id: "basin-nether-rail",
    instance: "Valhelsia 6",
    name: "Nether rail approach",
    path: "instances/valhelsia/screenshots/2026-05-08_14.10.22.png",
    resolution: "2560 x 1440",
    tags: ["Nether", "Rail"],
    world: "Redstone Basin",
  },
  {
    captured: "Yesterday, 21:42",
    favorite: false,
    id: "factory-floor",
    instance: "All the Mods 9",
    name: "Factory floor",
    path: "instances/atm9/screenshots/2026-05-07_21.42.03.png",
    resolution: "2560 x 1440",
    tags: ["Factory", "Storage"],
    world: "Meadow Works",
  },
  {
    captured: "May 5, 2026",
    favorite: false,
    id: "winter-vault-gate",
    instance: "Prominence II",
    name: "Vault gate",
    path: "instances/prominence/screenshots/2026-05-05_18.18.48.png",
    resolution: "1920 x 1080",
    tags: ["Boss", "Snow"],
    world: "Winter Vault",
  },
  {
    captured: "May 1, 2026",
    favorite: true,
    id: "creative-skyline",
    instance: "Vanilla Builder",
    name: "Creative skyline",
    path: "instances/builder/screenshots/2026-05-01_11.02.10.png",
    resolution: "3440 x 1440",
    tags: ["Build", "City"],
    world: "Creative Flat",
  },
];
