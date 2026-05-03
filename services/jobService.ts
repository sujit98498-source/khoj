// services/jobService.ts
// Legacy XP-gated job definitions — used only by the admin seed API route.
// The active job board uses hiringService.ts (recruiter-posted jobs).
// This file intentionally has NO Firebase imports to avoid runtime errors.
//
// To switch from mock to live recruiter jobs, see services/hiringService.ts.

import { Job } from '@/lib/types'

/**
 * Default XP-gated job definitions for the admin seed route.
 * These are seeded into Firestore once during development setup.
 */
export const DEFAULT_JOBS: Omit<Job, 'id'>[] = [
  {
    title: 'Junior Frontend Developer',
    company: 'TechStart Inc.',
    description: 'Build beautiful, responsive user interfaces with React and modern CSS.',
    requiredXP: 100,
    salary: '$60k - $80k',
    location: 'Remote',
    type: 'full-time',
    skills: ['React', 'CSS', 'JavaScript'],
    postedAt: new Date().toISOString(),
    isActive: true,
  },
  {
    title: 'Full-Stack Engineer',
    company: 'ScaleUp Labs',
    description: 'Work across the entire stack — from databases to React UIs.',
    requiredXP: 300,
    salary: '$90k - $120k',
    location: 'Hybrid (NYC)',
    type: 'full-time',
    skills: ['Node.js', 'React', 'PostgreSQL'],
    postedAt: new Date().toISOString(),
    isActive: true,
  },
  {
    title: 'Senior Software Engineer',
    company: 'Apex Systems',
    description: 'Lead complex technical projects and mentor junior engineers.',
    requiredXP: 600,
    salary: '$140k - $180k',
    location: 'San Francisco, CA',
    type: 'full-time',
    skills: ['System Design', 'TypeScript', 'AWS'],
    postedAt: new Date().toISOString(),
    isActive: true,
  },
  {
    title: 'Engineering Manager',
    company: 'Unicorn Corp',
    description: 'Lead an engineering team of 8-12 engineers across multiple products.',
    requiredXP: 1000,
    salary: '$180k - $240k',
    location: 'Remote (US only)',
    type: 'full-time',
    skills: ['Leadership', 'Architecture', 'Roadmapping'],
    postedAt: new Date().toISOString(),
    isActive: true,
  },
  {
    title: 'CTO',
    company: 'Stealth Startup',
    description: 'Join as founding CTO and shape the technical vision of the next big thing.',
    requiredXP: 2000,
    salary: '$200k + equity',
    location: 'New York, NY',
    type: 'full-time',
    skills: ['Vision', 'Architecture', 'Fundraising'],
    postedAt: new Date().toISOString(),
    isActive: true,
  },
]




