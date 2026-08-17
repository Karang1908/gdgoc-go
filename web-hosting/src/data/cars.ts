export interface CarOption {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  badgeColor: string;
  stats: {
    speed: number;      // 0 - 100
    handling: number;   // 0 - 100
    durability: number; // 0 - 100
  };
  accentColor: string;
  icon: string;
}

/**
 * Aligned with SelectableCars in PrefabsBuilder:
 *   - 'sports' (sedan-sports.fbx)
 *   - 'race' (race.fbx)
 *   - 'suv' (suv-luxury.fbx)
 *   - 'taxi' (taxi.fbx)
 */
export const CARS: CarOption[] = [
  {
    id: 'sports',
    name: 'Velocity GT',
    subtitle: 'High-Speed Interceptor',
    description: 'Ultra-lightweight aerodynamic chassis engineered for maximum boost speed and rapid lane shifts.',
    badgeColor: '#4285F4',
    accentColor: 'rgba(66, 133, 244, 0.25)',
    icon: '🏎️',
    stats: {
      speed: 95,
      handling: 85,
      durability: 60,
    },
  },
  {
    id: 'race',
    name: 'Apex Racer',
    subtitle: 'Track Precision Formula',
    description: 'Downforce-tuned racer designed for cutting corners at blistering speeds with immediate lateral response.',
    badgeColor: '#EA4335',
    accentColor: 'rgba(234, 67, 53, 0.25)',
    icon: '🏁',
    stats: {
      speed: 98,
      handling: 90,
      durability: 50,
    },
  },
  {
    id: 'suv',
    name: 'Titan Enforcer',
    subtitle: 'Heavy Armor Cruiser',
    description: 'Armored frame built to withstand aggressive police PIT maneuvers and heavy traffic encounters.',
    badgeColor: '#34A853',
    accentColor: 'rgba(52, 168, 83, 0.25)',
    icon: '🚙',
    stats: {
      speed: 72,
      handling: 65,
      durability: 95,
    },
  },
  {
    id: 'taxi',
    name: 'Metro Sprinter',
    subtitle: 'Urban Drift Specialist',
    description: 'Nimble city taxi with responsive suspension for razor-sharp dodging between oncoming obstacles.',
    badgeColor: '#FBBC05',
    accentColor: 'rgba(251, 188, 5, 0.25)',
    icon: '🚕',
    stats: {
      speed: 82,
      handling: 94,
      durability: 70,
    },
  },
];
