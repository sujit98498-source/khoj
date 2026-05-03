export interface KhojKnowledgeSnippet {
	id: string
	topic: string
	bullets: string[]
}

export interface KhojFaqEntry {
	id: string
	question: string
	answer: string
}

export const khojKnowledgeSnippets: KhojKnowledgeSnippet[] = [
	{
		id: 'overview',
		topic: 'KHOJ Overview',
		bullets: [
			'KHOJ is an AI-powered talent, startup, and opportunity operating system.',
			'Core journey: Learning -> Proof -> Teams -> Startups -> Opportunities.',
		],
	},
	{
		id: 'dashboard',
		topic: 'Dashboard',
		bullets: [
			'Dashboard is the user command center for progress, XP, rank, and key actions.',
		],
	},
	{
		id: 'proof-tracks',
		topic: 'Proof Tracks',
		bullets: [
			'Proof Tracks are mission-based practical proof, not passive courses.',
			'Users complete tasks, submit outcomes, and earn XP for portfolio credibility.',
		],
	},
	{
		id: 'arena-studio',
		topic: 'Arena and Studio',
		bullets: [
			'Arena is for uploading results, streaming, and discovering performance content.',
			'Studio is for managing uploads, proof artifacts, analytics, and creator growth.',
		],
	},
	{
		id: 'startup-rooms',
		topic: 'Startup Rooms',
		bullets: [
			'Startup Rooms let teams post roles, accept co-founders, assign tasks, share files, and collaborate.',
		],
	},
	{
		id: 'ai-builder',
		topic: 'KHOJ AI Builder',
		bullets: [
			'Evaluates startup ideas and provides Validation Readiness Score.',
			'Builds roadmap, tasks, and launch readiness steps for Beta, MVP, Public Launch, and Funding.',
		],
	},
	{
		id: 'progress-board',
		topic: 'Progress Board',
		bullets: [
			'Kanban-style board tracking Beta, MVP, Public Launch, and Funding readiness.',
		],
	},
	{
		id: 'opportunity-market',
		topic: 'Opportunity Market',
		bullets: [
			'Includes co-founder roles, jobs, internships, projects, funding, competitions, and mentors.',
		],
	},
	{
		id: 'profile-portfolio',
		topic: 'Profile and Portfolio',
		bullets: [
			'Shows completed tracks, projects, startup roles, XP, rank, and achievements as proof.',
		],
	},
	{
		id: 'tournaments',
		topic: 'Tournaments',
		bullets: [
			'Challenges where users demonstrate real skills and competitive proof.',
		],
	},
]

export const khojFaqEntries: KhojFaqEntry[] = [
	{
		id: 'what-is-khoj-ai',
		question: 'What does KHOJ AI do?',
		answer:
			'KHOJ AI helps users improve profiles, evaluate startup ideas, plan validation, prepare investor answers, and choose practical next steps inside KHOJ.',
	},
	{
		id: 'proof-tracks-vs-courses',
		question: 'Are Proof Tracks normal courses?',
		answer:
			'No. Proof Tracks are practical missions where users create outcomes that can become profile, portfolio, startup-room, or opportunity-market proof.',
	},
	{
		id: 'startup-room-purpose',
		question: 'What are Startup Rooms for?',
		answer:
			'Startup Rooms let users form teams, define roles, review collaborators, manage files, plan milestones, and build with KHOJ AI Builder support.',
	},
	{
		id: 'live-research',
		question: 'Can KHOJ AI do live web research?',
		answer:
			'Only when a web-search tool is connected. Otherwise it should clearly say it is using user-provided context, built-in KHOJ knowledge, and model reasoning.',
	},
]

export const khojFeatureKnowledge = [
	'KHOJ PLATFORM KNOWLEDGE',
	...khojKnowledgeSnippets.map((snippet, index) => {
		const lines = [`${index + 1}. ${snippet.topic}`]
		for (const bullet of snippet.bullets) {
			lines.push(`- ${bullet}`)
		}
		return lines.join('\n')
	}),
	'KHOJ FAQ',
	...khojFaqEntries.map((entry) => `Q: ${entry.question}\nA: ${entry.answer}`),
].join('\n\n').trim()
