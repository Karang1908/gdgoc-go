export interface CarOption {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  badgeColor: string;
  accentColor: string;
  image: string;
  spinImage: string;
  stats: {
    speed: number;      // 0 - 100
    handling: number;   // 0 - 100
    durability: number; // 0 - 100
  };
}

/**
 * 3D Models rendered directly from Unity Kenney CarKit:
 *   - 'sports' (sedan-sports.fbx) -> /branding/cars/car-sports-spin.webp
 *   - 'race' (race.fbx)           -> /branding/cars/car-race-spin.webp
 *   - 'suv' (suv-luxury.fbx)      -> /branding/cars/car-suv-spin.webp
 *   - 'taxi' (taxi.fbx)           -> /branding/cars/car-taxi-spin.webp
 */
export const CARS: CarOption[] = [
  {
    id: 'sports',
    name: 'Velocity GT',
    subtitle: 'High-Speed Interceptor',
    description: 'Ultra-lightweight aerodynamic chassis engineered for maximum boost speed and rapid lane shifts.',
    badgeColor: '#4285F4',
    accentColor: 'rgba(66, 133, 244, 0.12)',
    image: '/branding/cars/car-sports.png',
    spinImage: '/branding/cars/car-sports-spin.webp',
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
    accentColor: 'rgba(234, 67, 53, 0.12)',
    image: '/branding/cars/car-race.png',
    spinImage: '/branding/cars/car-race-spin.webp',
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
    accentColor: 'rgba(52, 168, 83, 0.12)',
    image: '/branding/cars/car-suv.png',
    spinImage: '/branding/cars/car-suv-spin.webp',
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
    badgeColor: '#FBBC04',
    accentColor: 'rgba(251, 188, 4, 0.12)',
    image: '/branding/cars/car-taxi.png',
    spinImage: '/branding/cars/car-taxi-spin.webp',
    stats: {
      speed: 82,
      handling: 94,
      durability: 70,
    },
  },
];
