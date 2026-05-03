// lib/talent/mockTalentData.ts
// Extended talent pool for the Talent Search page.
// Combines the existing portfolio users with 10 additional profiles.
// All fields match PortfolioUser — easy to swap with a real DB query.

import { PortfolioUser } from '@/lib/types'
import { MOCK_PORTFOLIO_USERS } from '@/lib/portfolio/mockPortfolioData'

const EXTRA_TALENT: PortfolioUser[] = [
  {
    uid: 'user-saurav',
    name: 'Saurav Thapa',
    username: 'sauravt',
    bio: 'Esports champion & game developer. 3× KHOJ Esports title holder. Coaching the next generation of competitive players.',
    field: 'Esports',
    availableForOpportunities: true,
    contactEmail: 'saurav@example.com',
    location: 'Kathmandu, Nepal',
    country: 'Nepal',
    verifiedChampion: true,
    xp: 3100,
    rank: 1,
    wins: 11,
    matchesPlayed: 15,
    skills: ['Game Design', 'Unity', 'C#', 'Competitive Gaming', 'Streaming', 'Coaching'],
    createdAt: new Date(Date.now() - 300 * 24 * 60 * 60 * 1000).toISOString(),
    achievements: [
      {
        id: 'a1',
        title: 'KHOJ Esports 3× Champion',
        description: 'Won three consecutive KHOJ Esports titles — a first in platform history.',
        date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        icon: '🎮',
        xpValue: 900,
      },
    ],
    projects: [
      {
        id: 'p1',
        title: 'ArenaAI',
        description: 'AI-powered matchmaking engine for competitive gaming platforms.',
        techStack: ['Python', 'FastAPI', 'Redis', 'Unity'],
        liveUrl: 'https://arenaai.demo',
        builtAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
        featured: true,
      },
    ],
    competitions: [
      {
        id: 'c1',
        tournamentId: 'tourn-esports-s3',
        tournamentTitle: 'KHOJ Esports Championship S3',
        category: 'Esports',
        placement: '1st',
        xpEarned: 600,
        date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        prize: 15000,
      },
    ],
    socialLinks: {
      twitter: 'https://twitter.com/sauravt_gg',
      github: 'https://github.com/sauravt',
    },
  },

  {
    uid: 'user-anisha',
    name: 'Anisha Rana',
    username: 'anishar',
    bio: 'Product designer with a systems thinking approach. Top-ranked in KHOJ Design circuit. Available for contract & full-time.',
    field: 'Design',
    availableForOpportunities: true,
    contactEmail: 'anisha@example.com',
    location: 'Pokhara, Nepal',
    country: 'Nepal',
    verifiedChampion: false,
    xp: 1220,
    rank: 15,
    wins: 3,
    matchesPlayed: 7,
    skills: ['Figma', 'Product Design', 'Design Systems', 'Prototyping', 'User Research'],
    createdAt: new Date(Date.now() - 150 * 24 * 60 * 60 * 1000).toISOString(),
    achievements: [
      {
        id: 'a1',
        title: 'Design Systems Badge',
        description: 'Built a production-ready design system used by 3 KHOJ community projects.',
        date: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString(),
        icon: '◉',
        xpValue: 200,
      },
    ],
    projects: [
      {
        id: 'p1',
        title: 'Naya Design System',
        description: 'Open-source component library tailored for Nepali SaaS products.',
        techStack: ['Figma', 'React', 'Storybook', 'Tailwind'],
        liveUrl: 'https://naya.design',
        repoUrl: 'https://github.com/anishar/naya',
        builtAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        featured: true,
      },
    ],
    competitions: [
      {
        id: 'c1',
        tournamentId: 'tourn-design-s2',
        tournamentTitle: 'KHOJ Design Sprint S2',
        category: 'Design',
        placement: '3rd',
        xpEarned: 200,
        date: new Date(Date.now() - 55 * 24 * 60 * 60 * 1000).toISOString(),
        prize: 1500,
      },
    ],
    socialLinks: {
      linkedin: 'https://linkedin.com/in/anishar',
      website: 'https://anisha.design',
    },
  },

  {
    uid: 'user-bikash',
    name: 'Bikash Chaudhary',
    username: 'bikashc',
    bio: 'Backend & infrastructure engineer. Kubernetes nerd. Built systems that handle 1M+ daily requests for a Nepali fintech.',
    field: 'Coding',
    availableForOpportunities: false,
    location: 'Biratnagar, Nepal',
    country: 'Nepal',
    verifiedChampion: false,
    xp: 980,
    rank: 22,
    wins: 2,
    matchesPlayed: 6,
    skills: ['Go', 'Kubernetes', 'AWS', 'PostgreSQL', 'gRPC', 'Terraform'],
    createdAt: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString(),
    achievements: [
      {
        id: 'a1',
        title: 'Infrastructure Architect',
        description: 'Designed and deployed zero-downtime infra for a production Nepali fintech.',
        date: new Date(Date.now() - 50 * 24 * 60 * 60 * 1000).toISOString(),
        icon: '⚙️',
        xpValue: 180,
      },
    ],
    projects: [
      {
        id: 'p1',
        title: 'GoShield',
        description: 'Rate-limiting and DDoS protection middleware for Go HTTP services.',
        techStack: ['Go', 'Redis', 'Prometheus'],
        repoUrl: 'https://github.com/bikashc/goshield',
        builtAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
        featured: true,
      },
    ],
    competitions: [],
    socialLinks: {
      github: 'https://github.com/bikashc',
      linkedin: 'https://linkedin.com/in/bikashc',
    },
  },

  {
    uid: 'user-sneha',
    name: 'Sneha Verma',
    username: 'snehav',
    bio: 'ML engineer & data scientist. Turning competition datasets into winning models. Top 5 in KHOJ AI championship.',
    field: 'Coding',
    availableForOpportunities: true,
    contactEmail: 'sneha@example.com',
    location: 'Pune, India',
    country: 'India',
    verifiedChampion: false,
    xp: 1640,
    rank: 11,
    wins: 4,
    matchesPlayed: 8,
    skills: ['Python', 'TensorFlow', 'PyTorch', 'Machine Learning', 'Data Science', 'SQL'],
    createdAt: new Date(Date.now() - 200 * 24 * 60 * 60 * 1000).toISOString(),
    achievements: [
      {
        id: 'a1',
        title: 'AI Championship Top 5',
        description: 'Ranked 4th in KHOJ AI Championship Season 1 out of 200+ participants.',
        date: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString(),
        icon: '🤖',
        xpValue: 350,
      },
    ],
    projects: [
      {
        id: 'p1',
        title: 'NepSent',
        description: 'Sentiment analysis model fine-tuned on Nepali and Hindi social media text.',
        techStack: ['Python', 'HuggingFace', 'FastAPI', 'Docker'],
        repoUrl: 'https://github.com/snehav/nepsent',
        builtAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
        featured: true,
      },
    ],
    competitions: [
      {
        id: 'c1',
        tournamentId: 'tourn-ai-s1',
        tournamentTitle: 'KHOJ AI Championship S1',
        category: 'Coding',
        placement: 'top10',
        xpEarned: 350,
        date: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ],
    socialLinks: {
      github: 'https://github.com/snehav',
      linkedin: 'https://linkedin.com/in/snehav',
      twitter: 'https://twitter.com/snehav_ml',
    },
  },

  {
    uid: 'user-rohan',
    name: 'Rohan Pradhan',
    username: 'rohanp',
    bio: 'Mobile-first developer. React Native + Flutter specialist. 2 apps with 50k+ downloads on Play Store.',
    field: 'Coding',
    availableForOpportunities: true,
    contactEmail: 'rohan@example.com',
    location: 'Butwal, Nepal',
    country: 'Nepal',
    verifiedChampion: false,
    xp: 870,
    rank: 26,
    wins: 2,
    matchesPlayed: 5,
    skills: ['React Native', 'Flutter', 'TypeScript', 'Firebase', 'Dart', 'iOS'],
    createdAt: new Date(Date.now() - 110 * 24 * 60 * 60 * 1000).toISOString(),
    achievements: [
      {
        id: 'a1',
        title: '50k Downloads Milestone',
        description: 'Combined Play Store downloads crossed 50,000 for two published apps.',
        date: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
        icon: '📱',
        xpValue: 150,
      },
    ],
    projects: [
      {
        id: 'p1',
        title: 'YatraNP',
        description: 'Offline-first travel companion app for trekking routes in Nepal. 30k downloads.',
        techStack: ['React Native', 'SQLite', 'MapLibre', 'Firebase'],
        liveUrl: 'https://play.google.com/store/apps/yatranp',
        builtAt: new Date(Date.now() - 80 * 24 * 60 * 60 * 1000).toISOString(),
        featured: true,
      },
    ],
    competitions: [],
    socialLinks: {
      github: 'https://github.com/rohanp',
      linkedin: 'https://linkedin.com/in/rohanp',
    },
  },

  {
    uid: 'user-aarav',
    name: 'Aarav Singh',
    username: 'aaravs',
    bio: 'Startup builder & community leader. Founded 2 companies, both profitable. Mentor to 30+ founders in KHOJ.',
    field: 'Startups',
    availableForOpportunities: false,
    location: 'Delhi, India',
    country: 'India',
    verifiedChampion: true,
    xp: 2750,
    rank: 2,
    wins: 8,
    matchesPlayed: 13,
    skills: ['Product Strategy', 'Growth', 'Fundraising', 'TypeScript', 'No-Code', 'Go-to-Market'],
    createdAt: new Date(Date.now() - 380 * 24 * 60 * 60 * 1000).toISOString(),
    achievements: [
      {
        id: 'a1',
        title: 'Startup Circuit Champion',
        description: 'Won KHOJ Startup Circuit Season 2 with highest judge scores on record.',
        date: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
        icon: '⚡',
        xpValue: 600,
      },
    ],
    projects: [
      {
        id: 'p1',
        title: 'Founders.np',
        description: 'Community platform connecting Nepali startup founders with mentors and investors.',
        techStack: ['Next.js', 'Supabase', 'Stripe', 'Resend'],
        liveUrl: 'https://founders.np',
        builtAt: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString(),
        featured: true,
      },
    ],
    competitions: [
      {
        id: 'c1',
        tournamentId: 'tourn-startup-s2',
        tournamentTitle: 'Startup Circuit S2',
        category: 'Startups',
        placement: '1st',
        xpEarned: 600,
        date: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
        prize: 20000,
      },
    ],
    socialLinks: {
      linkedin: 'https://linkedin.com/in/aaravs',
      twitter: 'https://twitter.com/aaravs_builds',
      website: 'https://founders.np',
    },
  },

  {
    uid: 'user-kritika',
    name: 'Kritika Joshi',
    username: 'kritikaj',
    bio: 'Frontend architect. Accessibility advocate. Turned a KHOJ community project into an open-source library with 2k+ GitHub stars.',
    field: 'Coding',
    availableForOpportunities: true,
    contactEmail: 'kritika@example.com',
    location: 'Bhaktapur, Nepal',
    country: 'Nepal',
    verifiedChampion: false,
    xp: 1380,
    rank: 13,
    wins: 3,
    matchesPlayed: 7,
    skills: ['React', 'TypeScript', 'Accessibility', 'CSS', 'Web Performance', 'Testing'],
    createdAt: new Date(Date.now() - 165 * 24 * 60 * 60 * 1000).toISOString(),
    achievements: [
      {
        id: 'a1',
        title: '2k GitHub Stars',
        description: 'Open-source a11y component library hit 2,000 stars after KHOJ community shoutout.',
        date: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
        icon: '⭐',
        xpValue: 250,
      },
    ],
    projects: [
      {
        id: 'p1',
        title: 'reach-ui-np',
        description: 'Accessible, keyboard-navigable React component library optimised for South Asian web apps.',
        techStack: ['React', 'TypeScript', 'Radix UI', 'Tailwind', 'Vitest'],
        repoUrl: 'https://github.com/kritikaj/reach-ui-np',
        builtAt: new Date(Date.now() - 70 * 24 * 60 * 60 * 1000).toISOString(),
        featured: true,
      },
    ],
    competitions: [
      {
        id: 'c1',
        tournamentId: 'tourn-webdev-s3',
        tournamentTitle: 'Web Dev Championship S3',
        category: 'Coding',
        placement: '3rd',
        xpEarned: 250,
        date: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString(),
        prize: 2000,
      },
    ],
    socialLinks: {
      github: 'https://github.com/kritikaj',
      linkedin: 'https://linkedin.com/in/kritikaj',
    },
  },

  {
    uid: 'user-dev',
    name: 'Dev Sharma',
    username: 'devs',
    bio: 'Blockchain & Web3 developer. Smart contract auditor. Building trustless infrastructure for South Asia.',
    field: 'Coding',
    availableForOpportunities: true,
    contactEmail: 'dev@example.com',
    location: 'Bengaluru, India',
    country: 'India',
    verifiedChampion: false,
    xp: 720,
    rank: 34,
    wins: 1,
    matchesPlayed: 4,
    skills: ['Solidity', 'Rust', 'Web3.js', 'Ethereum', 'Smart Contracts', 'Hardhat'],
    createdAt: new Date(Date.now() - 85 * 24 * 60 * 60 * 1000).toISOString(),
    achievements: [
      {
        id: 'a1',
        title: 'Smart Contract Auditor',
        description: 'Found and responsibly disclosed 3 critical vulnerabilities in DeFi protocols.',
        date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        icon: '🔐',
        xpValue: 130,
      },
    ],
    projects: [
      {
        id: 'p1',
        title: 'NepPay Protocol',
        description: 'Decentralised payment rails for NPR stablecoin transactions using Layer 2.',
        techStack: ['Solidity', 'Hardhat', 'React', 'ethers.js'],
        repoUrl: 'https://github.com/devs/neppay',
        builtAt: new Date(Date.now() - 50 * 24 * 60 * 60 * 1000).toISOString(),
        featured: true,
      },
    ],
    competitions: [],
    socialLinks: {
      github: 'https://github.com/devs',
      twitter: 'https://twitter.com/devs_web3',
    },
  },

  {
    uid: 'user-lila',
    name: 'Lila Tamang',
    username: 'lilat',
    bio: 'Career growth coach & HR tech builder. Helping 200+ KHOJ members land jobs at top companies.',
    field: 'Career',
    availableForOpportunities: true,
    contactEmail: 'lila@example.com',
    location: 'Dharan, Nepal',
    country: 'Nepal',
    verifiedChampion: false,
    xp: 640,
    rank: 38,
    wins: 1,
    matchesPlayed: 4,
    skills: ['Career Coaching', 'Interview Prep', 'Resume Building', 'LinkedIn Optimisation', 'HR Tech'],
    createdAt: new Date(Date.now() - 75 * 24 * 60 * 60 * 1000).toISOString(),
    achievements: [
      {
        id: 'a1',
        title: 'Community Coach Badge',
        description: 'Coached 200+ KHOJ members — highest engagement in Career circle.',
        date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
        icon: '🌟',
        xpValue: 120,
      },
    ],
    projects: [],
    competitions: [],
    socialLinks: {
      linkedin: 'https://linkedin.com/in/lilat',
    },
  },

  {
    uid: 'user-aditya',
    name: 'Aditya Rawat',
    username: 'aditya_r',
    bio: 'Competitive programmer & systems engineer. ICPC regionalist. Top-rated on Codeforces. Loves hard problems.',
    field: 'Coding',
    availableForOpportunities: false,
    location: 'Noida, India',
    country: 'India',
    verifiedChampion: false,
    xp: 1100,
    rank: 19,
    wins: 3,
    matchesPlayed: 6,
    skills: ['C++', 'Competitive Programming', 'Algorithms', 'Java', 'System Design', 'Python'],
    createdAt: new Date(Date.now() - 140 * 24 * 60 * 60 * 1000).toISOString(),
    achievements: [
      {
        id: 'a1',
        title: 'ICPC Regionalist',
        description: 'Qualified for ICPC Asia Regional round as team lead.',
        date: new Date(Date.now() - 65 * 24 * 60 * 60 * 1000).toISOString(),
        icon: '🏅',
        xpValue: 220,
      },
    ],
    projects: [
      {
        id: 'p1',
        title: 'CP Vault',
        description: 'Searchable archive of editorial solutions for 3000+ competitive programming problems.',
        techStack: ['Next.js', 'TypeScript', 'Algolia', 'PostgreSQL'],
        liveUrl: 'https://cpvault.dev',
        repoUrl: 'https://github.com/adityar/cpvault',
        builtAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
        featured: true,
      },
    ],
    competitions: [
      {
        id: 'c1',
        tournamentId: 'tourn-algo-s2',
        tournamentTitle: 'Algorithm Blitz S2',
        category: 'Coding',
        placement: '2nd',
        xpEarned: 280,
        date: new Date(Date.now() - 50 * 24 * 60 * 60 * 1000).toISOString(),
        prize: 3500,
      },
    ],
    socialLinks: {
      github: 'https://github.com/adityar',
      linkedin: 'https://linkedin.com/in/adityar',
    },
  },
]

/** Full talent pool: existing portfolio users + extra talent */
export const ALL_TALENT: PortfolioUser[] = [
  ...Object.values(MOCK_PORTFOLIO_USERS),
  ...EXTRA_TALENT,
]

/** All unique fields/categories in the talent pool */
export const TALENT_FIELDS = Array.from(
  new Set(ALL_TALENT.map((u) => u.field).filter(Boolean))
).sort() as string[]

/** All unique countries */
export const TALENT_COUNTRIES = Array.from(
  new Set(ALL_TALENT.map((u) => u.country).filter(Boolean))
).sort() as string[]

/** All unique skills (flattened + deduplicated + sorted) */
export const TALENT_SKILLS = Array.from(
  new Set(ALL_TALENT.flatMap((u) => u.skills))
).sort()
