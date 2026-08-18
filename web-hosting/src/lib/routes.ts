export type AppRoute = 'home' | 'leaderboard' | 'controls';

export function routeFromPath(pathname: string): AppRoute {
  const path = pathname.toLowerCase();
  if (path.startsWith('/controls')) return 'controls';
  if (path.startsWith('/leaderboard')) return 'leaderboard';
  return 'home';
}

export function pathForRoute(route: AppRoute): string {
  if (route === 'controls') return '/controls';
  if (route === 'leaderboard') return '/leaderboard';
  return '/';
}
