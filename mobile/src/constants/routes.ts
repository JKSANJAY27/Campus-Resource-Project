/**
 * Mobile Navigation Routes & Section Metadata
 * Defines all 10 core application sections and route contracts.
 */

export interface NavigationSection {
  id: string;
  title: string;
  desc: string;
  route: string;
  emoji: string;
  isTab: boolean;
}

export const SECTIONS: NavigationSection[] = [
  {
    id: '1',
    title: '1. Home Dashboard',
    desc: 'Profile summary, top role spotlight & goal progress',
    route: '/(tabs)',
    emoji: '🏠',
    isTab: true,
  },
  {
    id: '2',
    title: '2. My Profile',
    desc: 'Verified skills, completed courses, projects & certs',
    route: '/(tabs)/profile',
    emoji: '👤',
    isTab: true,
  },
  {
    id: '3',
    title: '3. Career Discovery',
    desc: 'AI-free multi-role recommendations & compatibility audit',
    route: '/(tabs)/discovery',
    emoji: '🎯',
    isTab: true,
  },
  {
    id: '4',
    title: '4. Explore Specific Role',
    desc: 'Detailed role specifications, core requirements & skill gap',
    route: '/role/role_backend_developer',
    emoji: '🗺️',
    isTab: false,
  },
  {
    id: '5',
    title: '5. Learning Paths',
    desc: 'Sequential learning roadmaps respecting graph prerequisites',
    route: '/(tabs)/learning',
    emoji: '📚',
    isTab: true,
  },
  {
    id: '6',
    title: '6. Live Jobs',
    desc: 'Browse, filter & evaluate real-time industry postings',
    route: '/(tabs)/jobs',
    emoji: '💼',
    isTab: true,
  },
  {
    id: '7',
    title: '7. Job Skill Analysis',
    desc: 'Paste custom JD text & audit match with evidence tiers',
    route: '/job-analysis',
    emoji: '🔬',
    isTab: false,
  },
  {
    id: '8',
    title: '8. Saved Roles & Jobs',
    desc: 'Bookmarked career pathways and saved job listings',
    route: '/saved',
    emoji: '⭐',
    isTab: false,
  },
  {
    id: '9',
    title: '9. Learning Progress',
    desc: 'Active goal tracker, skill mastery bar & milestones',
    route: '/progress',
    emoji: '📈',
    isTab: false,
  },
  {
    id: '10',
    title: '10. Settings',
    desc: 'Backend API URL config, student switcher & diagnostics',
    route: '/settings',
    emoji: '⚙️',
    isTab: false,
  },
];
