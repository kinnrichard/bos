export interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: string;
  type: 'navigation' | 'client' | 'footer';
  isExternal?: boolean;
}

// Main navigation items
export const mainNavItems: NavItem[] = [
  {
    id: 'people',
    label: 'People',
    href: '/clients',
    icon: '👥',
    type: 'navigation'
  },
  {
    id: 'devices', 
    label: 'Devices',
    href: '/devices',
    icon: '💻',
    type: 'navigation'
  },
  {
    id: 'jobs',
    label: 'Jobs', 
    href: '/jobs',
    icon: '💼',
    type: 'navigation'
  }
];

// Footer navigation items
export const footerNavItems: NavItem[] = [
  {
    id: 'logs',
    label: "Vital Planet's Logs",
    href: '/logs',
    icon: '📜',
    type: 'footer'
  }
];

// Get active navigation item based on current route
export function getActiveNavItem(currentPath: string): string | null {
  // Handle exact matches first
  const exactMatch = mainNavItems.find(item => item.href === currentPath);
  if (exactMatch) return exactMatch.id;

  // Handle route-based matches (e.g., /jobs/123 should match jobs)
  if (currentPath.startsWith('/jobs')) return 'jobs';
  if (currentPath.startsWith('/people')) return 'people'; 
  if (currentPath === '/clients') return 'people'; // Only highlight for clients listing, not client details
  if (currentPath.startsWith('/devices')) return 'devices';
  if (currentPath.startsWith('/logs')) return 'logs';

  return null;
}

// Brand/Logo configuration
export const brandConfig = {
  name: 'FAULTLESS',
  logoIcon: '⚡', // Lightning bolt matching the image
  homeHref: '/'
};