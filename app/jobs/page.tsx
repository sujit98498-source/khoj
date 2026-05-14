// app/jobs/page.tsx
// KHOJ Jobs & Projects - project/service marketplace.

'use client'

import { FormEvent, type ReactNode, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import clsx from 'clsx'
import toast from 'react-hot-toast'
import { AppShell } from '@/components/layout/AppShell'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { HiringJobCard } from '@/components/jobs/HiringJobCard'
import { getActiveJobPosts } from '@/services/hiringService'
import { useAuth } from '@/hooks/useAuth'
import type { JobPost } from '@/lib/types'
import {
  createMarketplaceProject,
  createMarketplaceService,
  deleteMarketplaceService,
  saveMarketplaceProject,
  submitMarketplaceProposal,
  subscribeActiveServices,
  subscribeOpenProjects,
  subscribeSavedMarketplaceProjects,
  subscribeUserProposals,
  subscribeUserServices,
  unsaveMarketplaceProject,
  updateMarketplaceService,
  uploadServiceThumbnail,
  type BudgetType,
  type LocationType,
  type MarketplaceCategory,
  type MarketplaceProject,
  type MarketplaceProposal,
  type MarketplaceService,
  type PricingType,
  type SkillLevel,
} from '@/services/marketplaceService'

type TabId = 'find' | 'offer' | 'post' | 'my-services' | 'my-proposals' | 'saved'
type PriceFilter = 'all' | 'fixed' | 'hourly'

const TABS: { id: TabId; label: string }[] = [
  { id: 'find', label: 'Find Projects' },
  { id: 'offer', label: 'Offer Services' },
  { id: 'post', label: 'Post a Project' },
  { id: 'my-services', label: 'My Services' },
  { id: 'my-proposals', label: 'My Proposals' },
  { id: 'saved', label: 'Saved' },
]

const CATEGORIES: MarketplaceCategory[] = [
  'Development',
  'Design',
  'Marketing',
  'Content',
  'Data',
  'Product',
  'AI',
  'Business',
  'Other',
]

const SKILL_LEVELS: { value: SkillLevel; label: string }[] = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'expert', label: 'Expert' },
]

const EMPTY_SERVICE_FORM = {
  title: '',
  category: 'Development' as MarketplaceCategory,
  description: '',
  skills: '',
  pricingType: 'fixed' as PricingType,
  fixedPrice: '',
  hourlyRate: '',
  deliveryTime: '',
  availability: '',
  portfolioLink: '',
}

const EMPTY_PROJECT_FORM = {
  title: '',
  description: '',
  skills: '',
  category: 'Development' as MarketplaceCategory,
  budgetType: 'fixed' as BudgetType,
  budgetMin: '',
  budgetMax: '',
  fixedBudget: '',
  hourlyRate: '',
  deadline: '',
  locationType: 'remote' as LocationType,
  location: '',
  skillLevel: 'intermediate' as SkillLevel,
}

const EMPTY_PROPOSAL_FORM = {
  message: '',
  proposedRate: '',
  rateType: 'fixed' as BudgetType,
  deliveryTime: '',
}

function parseSkills(input: string): string[] {
  return input
    .split(',')
    .map((skill) => skill.trim())
    .filter(Boolean)
    .slice(0, 12)
}

function parseMoney(input: string): number | undefined {
  const value = Number(input)
  return Number.isFinite(value) && value > 0 ? value : undefined
}

function timestampLabel(value: unknown): string {
  if (!value) return 'Recently'
  if (typeof value === 'string') return new Date(value).toLocaleDateString()
  if (typeof value === 'object' && value !== null && 'seconds' in value) {
    return new Date(Number((value as { seconds: number }).seconds) * 1000).toLocaleDateString()
  }
  return 'Recently'
}

function servicePriceLabel(service: MarketplaceService): string {
  if (service.pricingType === 'hourly') return service.hourlyRate ? `$${service.hourlyRate}/hr` : 'Hourly'
  if (service.pricingType === 'both') {
    const fixed = service.fixedPrice ? `from $${service.fixedPrice}` : 'Fixed'
    const hourly = service.hourlyRate ? `$${service.hourlyRate}/hr` : 'hourly'
    return `${fixed} · ${hourly}`
  }
  return service.fixedPrice ? `from $${service.fixedPrice}` : 'Fixed price'
}

function projectBudgetLabel(project: MarketplaceProject): string {
  if (project.budgetType === 'hourly') return project.hourlyRate ? `$${project.hourlyRate}/hr` : 'Hourly'
  if (project.fixedBudget) return `$${project.fixedBudget} fixed`
  if (project.budgetMin || project.budgetMax) return `$${project.budgetMin ?? 0} - $${project.budgetMax ?? 'open'}`
  return 'Budget open'
}

function requireSignedIn(uid: string | undefined, message: string): uid is string {
  if (uid) return true
  toast.error(message)
  return false
}

export default function JobsPage() {
  const { firebaseUser, khojUser } = useAuth()
  const uid = firebaseUser?.uid
  const displayName = khojUser?.name ?? firebaseUser?.displayName ?? 'KHOJ User'
  const photo = khojUser?.avatarUrl ?? firebaseUser?.photoURL ?? undefined

  const [activeTab, setActiveTab] = useState<TabId>('find')
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<MarketplaceCategory | 'all'>('all')
  const [priceFilter, setPriceFilter] = useState<PriceFilter>('all')
  const [remoteOnly, setRemoteOnly] = useState(false)
  const [deadline, setDeadline] = useState('')
  const [budgetMin, setBudgetMin] = useState('')
  const [budgetMax, setBudgetMax] = useState('')
  const [skillLevel, setSkillLevel] = useState<SkillLevel | 'all'>('all')

  const [services, setServices] = useState<MarketplaceService[]>([])
  const [projects, setProjects] = useState<MarketplaceProject[]>([])
  const [myServices, setMyServices] = useState<MarketplaceService[]>([])
  const [myProposals, setMyProposals] = useState<MarketplaceProposal[]>([])
  const [savedProjectIds, setSavedProjectIds] = useState<Set<string>>(new Set())
  const [savedProjects, setSavedProjects] = useState<Array<{ projectId: string; projectTitle?: string; clientName?: string }>>([])
  const [startupJobs, setStartupJobs] = useState<JobPost[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [serviceForm, setServiceForm] = useState(EMPTY_SERVICE_FORM)
  const [serviceImage, setServiceImage] = useState<File | null>(null)
  const [editingService, setEditingService] = useState<MarketplaceService | null>(null)
  const [serviceSaving, setServiceSaving] = useState(false)

  const [projectForm, setProjectForm] = useState(EMPTY_PROJECT_FORM)
  const [projectAttachment, setProjectAttachment] = useState<File | null>(null)
  const [projectSaving, setProjectSaving] = useState(false)

  const [proposalProject, setProposalProject] = useState<MarketplaceProject | null>(null)
  const [proposalForm, setProposalForm] = useState(EMPTY_PROPOSAL_FORM)
  const [proposalSaving, setProposalSaving] = useState(false)

  useEffect(() => {
    setStartupJobs(getActiveJobPosts())
  }, [])

  useEffect(() => {
    setLoading(true)
    const unsubServices = subscribeActiveServices(
      (items) => setServices(items),
      (err) => setError(err.message),
    )
    const unsubProjects = subscribeOpenProjects(
      (items) => {
        setProjects(items)
        setLoading(false)
      },
      (err) => {
        setError(err.message)
        setLoading(false)
      },
    )

    return () => {
      unsubServices()
      unsubProjects()
    }
  }, [])

  useEffect(() => {
    if (!uid) {
      setMyServices([])
      setMyProposals([])
      setSavedProjectIds(new Set())
      setSavedProjects([])
      return
    }

    const unsubServices = subscribeUserServices(uid, setMyServices, (err) => setError(err.message))
    const unsubProposals = subscribeUserProposals(uid, setMyProposals, (err) => setError(err.message))
    const unsubSaved = subscribeSavedMarketplaceProjects(uid, (items) => {
      setSavedProjectIds(new Set(items.map((item) => item.projectId)))
      setSavedProjects(items.map((item) => ({
        projectId: item.projectId,
        projectTitle: item.projectTitle,
        clientName: item.clientName,
      })))
    }, (err) => setError(err.message))

    return () => {
      unsubServices()
      unsubProposals()
      unsubSaved()
    }
  }, [uid])

  const filteredProjects = useMemo(() => {
    const q = search.trim().toLowerCase()
    const min = parseMoney(budgetMin)
    const max = parseMoney(budgetMax)

    return projects.filter((project) => {
      if (category !== 'all' && project.category !== category) return false
      if (priceFilter !== 'all' && project.budgetType !== priceFilter) return false
      if (remoteOnly && project.locationType !== 'remote') return false
      if (skillLevel !== 'all' && project.skillLevel !== skillLevel) return false
      if (deadline && project.deadline && project.deadline > deadline) return false

      const projectMin = project.fixedBudget ?? project.budgetMin ?? project.hourlyRate ?? 0
      const projectMax = project.fixedBudget ?? project.budgetMax ?? project.hourlyRate ?? projectMin
      if (min && projectMax < min) return false
      if (max && projectMin > max) return false

      if (!q) return true
      return [
        project.title,
        project.description,
        project.clientName,
        project.category,
        project.location ?? '',
        ...project.skills,
      ].join(' ').toLowerCase().includes(q)
    })
  }, [projects, search, category, priceFilter, remoteOnly, skillLevel, deadline, budgetMin, budgetMax])

  const filteredServices = useMemo(() => {
    const q = search.trim().toLowerCase()
    return services.filter((service) => {
      if (category !== 'all' && service.category !== category) return false
      if (priceFilter !== 'all' && service.pricingType !== priceFilter && service.pricingType !== 'both') return false
      if (!q) return true
      return [
        service.title,
        service.description,
        service.ownerName,
        service.category,
        service.availability,
        ...service.skills,
      ].join(' ').toLowerCase().includes(q)
    })
  }, [services, search, category, priceFilter])

  const savedProjectRows = useMemo(() => {
    return savedProjects.map((saved) => ({
      saved,
      project: projects.find((project) => project.id === saved.projectId),
    }))
  }, [savedProjects, projects])

  function resetFilters() {
    setSearch('')
    setCategory('all')
    setPriceFilter('all')
    setRemoteOnly(false)
    setDeadline('')
    setBudgetMin('')
    setBudgetMax('')
    setSkillLevel('all')
  }

  function startEditService(service: MarketplaceService) {
    setEditingService(service)
    setServiceForm({
      title: service.title,
      category: service.category,
      description: service.description,
      skills: service.skills.join(', '),
      pricingType: service.pricingType,
      fixedPrice: service.fixedPrice ? String(service.fixedPrice) : '',
      hourlyRate: service.hourlyRate ? String(service.hourlyRate) : '',
      deliveryTime: service.deliveryTime,
      availability: service.availability,
      portfolioLink: service.portfolioLink ?? '',
    })
    setActiveTab('offer')
  }

  async function handleServiceSubmit(event: FormEvent) {
    event.preventDefault()
    if (!requireSignedIn(uid, 'Sign in to publish a service.')) return

    const skills = parseSkills(serviceForm.skills)
    if (!serviceForm.title.trim() || !serviceForm.description.trim() || skills.length === 0) {
      toast.error('Add a title, description, and at least one skill.')
      return
    }

    setServiceSaving(true)
    try {
      let thumbnailUrl = editingService?.thumbnailUrl
      if (serviceImage) {
        thumbnailUrl = await uploadServiceThumbnail(serviceImage, uid)
      }

      const payload = {
        ownerId: uid,
        ownerName: displayName,
        ownerPhoto: photo,
        title: serviceForm.title.trim(),
        category: serviceForm.category,
        description: serviceForm.description.trim(),
        skills,
        pricingType: serviceForm.pricingType,
        fixedPrice: parseMoney(serviceForm.fixedPrice),
        hourlyRate: parseMoney(serviceForm.hourlyRate),
        deliveryTime: serviceForm.deliveryTime.trim(),
        availability: serviceForm.availability.trim(),
        portfolioLink: serviceForm.portfolioLink.trim() || undefined,
        thumbnailUrl,
      }

      if (editingService) {
        await updateMarketplaceService(editingService.id, payload)
        toast.success('Service updated.')
      } else {
        await createMarketplaceService(payload)
        toast.success('Service published.')
      }

      setServiceForm(EMPTY_SERVICE_FORM)
      setServiceImage(null)
      setEditingService(null)
      setActiveTab('my-services')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save service.')
    } finally {
      setServiceSaving(false)
    }
  }

  async function handleProjectSubmit(event: FormEvent) {
    event.preventDefault()
    if (!requireSignedIn(uid, 'Sign in to post a project.')) return

    const skills = parseSkills(projectForm.skills)
    if (!projectForm.title.trim() || !projectForm.description.trim() || skills.length === 0) {
      toast.error('Add a project title, description, and required skills.')
      return
    }

    setProjectSaving(true)
    try {
      await createMarketplaceProject({
        clientId: uid,
        clientName: displayName,
        title: projectForm.title.trim(),
        description: projectForm.description.trim(),
        skills,
        category: projectForm.category,
        budgetType: projectForm.budgetType,
        budgetMin: parseMoney(projectForm.budgetMin),
        budgetMax: parseMoney(projectForm.budgetMax),
        fixedBudget: parseMoney(projectForm.fixedBudget),
        hourlyRate: parseMoney(projectForm.hourlyRate),
        deadline: projectForm.deadline || undefined,
        locationType: projectForm.locationType,
        location: projectForm.location.trim() || undefined,
        skillLevel: projectForm.skillLevel,
        attachmentName: projectAttachment?.name,
      })
      toast.success('Project posted.')
      setProjectForm(EMPTY_PROJECT_FORM)
      setProjectAttachment(null)
      setActiveTab('find')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not post project.')
    } finally {
      setProjectSaving(false)
    }
  }

  async function handleProposalSubmit(event: FormEvent) {
    event.preventDefault()
    if (!proposalProject) return
    if (!requireSignedIn(uid, 'Sign in to send a proposal.')) return
    if (!proposalForm.message.trim() || !parseMoney(proposalForm.proposedRate)) {
      toast.error('Add a proposal message and proposed rate.')
      return
    }

    setProposalSaving(true)
    try {
      await submitMarketplaceProposal({
        projectId: proposalProject.id,
        projectTitle: proposalProject.title,
        freelancerId: uid,
        freelancerName: displayName,
        message: proposalForm.message.trim(),
        proposedRate: parseMoney(proposalForm.proposedRate) ?? 0,
        rateType: proposalForm.rateType,
        deliveryTime: proposalForm.deliveryTime.trim(),
      })
      toast.success('Proposal sent.')
      setProposalProject(null)
      setProposalForm(EMPTY_PROPOSAL_FORM)
      setActiveTab('my-proposals')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not send proposal.')
    } finally {
      setProposalSaving(false)
    }
  }

  async function handleToggleSave(project: MarketplaceProject) {
    if (!requireSignedIn(uid, 'Sign in to save projects.')) return
    try {
      if (savedProjectIds.has(project.id)) {
        await unsaveMarketplaceProject(uid, project.id)
        toast.success('Removed from saved.')
      } else {
        await saveMarketplaceProject(uid, project)
        toast.success('Project saved.')
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not update saved project.')
    }
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <section className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-khoj-text">Jobs & Projects</h1>
            <p className="mt-1 max-w-2xl text-sm text-khoj-subtle">
              Find work, offer your skills, and get hired through proof of performance.
            </p>
          </div>
          <AiPricingCard compact />
        </section>

        <div className="flex gap-1 overflow-x-auto border-b border-khoj-border pb-0 scrollbar-none">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={clsx(
                'whitespace-nowrap border-b-2 px-3 py-2.5 text-xs font-semibold transition-colors',
                activeTab === tab.id
                  ? 'border-khoj-accent text-khoj-accent'
                  : 'border-transparent text-khoj-subtle hover:text-khoj-text',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <MarketplaceFilters
          search={search}
          setSearch={setSearch}
          category={category}
          setCategory={setCategory}
          priceFilter={priceFilter}
          setPriceFilter={setPriceFilter}
          remoteOnly={remoteOnly}
          setRemoteOnly={setRemoteOnly}
          deadline={deadline}
          setDeadline={setDeadline}
          budgetMin={budgetMin}
          setBudgetMin={setBudgetMin}
          budgetMax={budgetMax}
          setBudgetMax={setBudgetMax}
          skillLevel={skillLevel}
          setSkillLevel={setSkillLevel}
          onReset={resetFilters}
        />

        {error && (
          <div className="rounded-sm border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs text-red-300">
            {error}
          </div>
        )}

        {activeTab === 'find' && (
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
            <div className="space-y-5">
              <SectionHeader
                title="Find Projects"
                subtitle={`${filteredProjects.length} open project${filteredProjects.length === 1 ? '' : 's'} matched`}
              />
              {loading ? (
                <GridSkeleton />
              ) : filteredProjects.length === 0 ? (
                <EmptyState title="No projects found" body="Try changing your search, budget, category, or skill level filters." />
              ) : (
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  {filteredProjects.map((project) => (
                    <ProjectCard
                      key={project.id}
                      project={project}
                      saved={savedProjectIds.has(project.id)}
                      onApply={() => setProposalProject(project)}
                      onSave={() => void handleToggleSave(project)}
                    />
                  ))}
                </div>
              )}

              {startupJobs.length > 0 && (
                <div className="space-y-3 pt-2">
                  <SectionHeader
                    title="Startup hiring posts"
                    subtitle="Existing recruiter-posted roles are preserved here while Jobs evolves into project work."
                  />
                  <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                    {startupJobs.slice(0, 4).map((job) => (
                      <HiringJobCard key={job.id} job={job} expired={new Date(job.deadline) < new Date()} />
                    ))}
                  </div>
                </div>
              )}
            </div>
            <aside className="space-y-4">
              <AiPricingCard />
              <MarketplaceInfoCard />
            </aside>
          </div>
        )}

        {activeTab === 'offer' && (
          <div className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
            <ServiceForm
              form={serviceForm}
              setForm={setServiceForm}
              image={serviceImage}
              setImage={setServiceImage}
              editing={Boolean(editingService)}
              saving={serviceSaving}
              onCancelEdit={() => {
                setEditingService(null)
                setServiceForm(EMPTY_SERVICE_FORM)
                setServiceImage(null)
              }}
              onSubmit={handleServiceSubmit}
            />
            <div className="space-y-4">
              <SectionHeader title="Services marketplace" subtitle="Freelancers and builders offering skill-backed services." />
              {filteredServices.length === 0 ? (
                <EmptyState title="No services found" body="Publish the first service or adjust the search filters." />
              ) : (
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  {filteredServices.map((service) => (
                    <ServiceCard key={service.id} service={service} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'post' && (
          <div className="grid gap-6 xl:grid-cols-[minmax(0,560px)_1fr]">
            <ProjectForm
              form={projectForm}
              setForm={setProjectForm}
              attachment={projectAttachment}
              setAttachment={setProjectAttachment}
              saving={projectSaving}
              onSubmit={handleProjectSubmit}
            />
            <div className="space-y-4">
              <AiPricingCard />
              <Card>
                <h2 className="text-sm font-bold text-khoj-text">Good project posts get better proposals</h2>
                <p className="mt-2 text-xs leading-relaxed text-khoj-subtle">
                  Mention the outcome, required proof, budget type, deadline, and what a successful delivery looks like.
                  KHOJ is built around visible performance, so ask for Studio or Arena proof where useful.
                </p>
              </Card>
            </div>
          </div>
        )}

        {activeTab === 'my-services' && (
          <div className="space-y-4">
            <SectionHeader title="My Services" subtitle="Edit, pause, activate, or delete your published offers." />
            {!uid ? (
              <AuthRequired />
            ) : myServices.filter((service) => service.status !== 'deleted').length === 0 ? (
              <EmptyState title="No services yet" body="Create a service from the Offer Services tab to start earning." />
            ) : (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {myServices.filter((service) => service.status !== 'deleted').map((service) => (
                  <MyServiceCard
                    key={service.id}
                    service={service}
                    onEdit={() => startEditService(service)}
                    onToggleStatus={() => void updateMarketplaceService(service.id, {
                      status: service.status === 'active' ? 'paused' : 'active',
                    })}
                    onDelete={() => void deleteMarketplaceService(service.id)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'my-proposals' && (
          <div className="space-y-4">
            <SectionHeader title="My Proposals" subtitle="Track the status of project proposals you submitted." />
            {!uid ? (
              <AuthRequired />
            ) : myProposals.length === 0 ? (
              <EmptyState title="No proposals yet" body="Send a proposal from Find Projects and it will appear here." />
            ) : (
              <div className="space-y-3">
                {myProposals.map((proposal) => (
                  <ProposalRow key={proposal.id} proposal={proposal} />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'saved' && (
          <div className="space-y-4">
            <SectionHeader title="Saved Projects" subtitle="Projects you bookmarked for later." />
            {!uid ? (
              <AuthRequired />
            ) : savedProjectRows.length === 0 ? (
              <EmptyState title="No saved projects" body="Save project posts from Find Projects to review them later." />
            ) : (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {savedProjectRows.map(({ saved, project }) => (
                  project ? (
                    <ProjectCard
                      key={saved.projectId}
                      project={project}
                      saved
                      onApply={() => setProposalProject(project)}
                      onSave={() => void handleToggleSave(project)}
                    />
                  ) : (
                    <Card key={saved.projectId}>
                      <h3 className="text-sm font-bold text-khoj-text">{saved.projectTitle ?? 'Saved project'}</h3>
                      <p className="mt-1 text-xs text-khoj-subtle">Posted by {saved.clientName ?? 'KHOJ user'}</p>
                      <p className="mt-3 text-xs text-khoj-muted">This project is not currently open.</p>
                    </Card>
                  )
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {proposalProject && (
        <ProposalModal
          project={proposalProject}
          form={proposalForm}
          setForm={setProposalForm}
          saving={proposalSaving}
          onClose={() => {
            setProposalProject(null)
            setProposalForm(EMPTY_PROPOSAL_FORM)
          }}
          onSubmit={handleProposalSubmit}
        />
      )}
    </AppShell>
  )
}

function MarketplaceFilters(props: {
  search: string
  setSearch: (value: string) => void
  category: MarketplaceCategory | 'all'
  setCategory: (value: MarketplaceCategory | 'all') => void
  priceFilter: PriceFilter
  setPriceFilter: (value: PriceFilter) => void
  remoteOnly: boolean
  setRemoteOnly: (value: boolean) => void
  deadline: string
  setDeadline: (value: string) => void
  budgetMin: string
  setBudgetMin: (value: string) => void
  budgetMax: string
  setBudgetMax: (value: string) => void
  skillLevel: SkillLevel | 'all'
  setSkillLevel: (value: SkillLevel | 'all') => void
  onReset: () => void
}) {
  return (
    <Card className="space-y-3 p-4">
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-khoj-muted">◎</span>
        <input
          value={props.search}
          onChange={(event) => props.setSearch(event.target.value)}
          placeholder="Search projects, skills, freelancers..."
          className="w-full rounded-sm border border-khoj-border bg-khoj-bg py-2.5 pl-8 pr-3 text-sm text-khoj-text outline-none transition-colors placeholder:text-khoj-muted focus:border-khoj-accent/60"
        />
      </div>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-7">
        <Select value={props.category} onChange={(value) => props.setCategory(value as MarketplaceCategory | 'all')}>
          <option value="all">Category</option>
          {CATEGORIES.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
        </Select>
        <Select value={props.priceFilter} onChange={(value) => props.setPriceFilter(value as PriceFilter)}>
          <option value="all">Fixed price / Hourly</option>
          <option value="fixed">Fixed price</option>
          <option value="hourly">Hourly</option>
        </Select>
        <Select value={props.skillLevel} onChange={(value) => props.setSkillLevel(value as SkillLevel | 'all')}>
          <option value="all">Skill level</option>
          {SKILL_LEVELS.map((level) => <option key={level.value} value={level.value}>{level.label}</option>)}
        </Select>
        <input
          type="date"
          value={props.deadline}
          onChange={(event) => props.setDeadline(event.target.value)}
          className="rounded-sm border border-khoj-border bg-khoj-bg px-3 py-2 text-xs text-khoj-text outline-none focus:border-khoj-accent/60"
          aria-label="Deadline"
        />
        <Input value={props.budgetMin} onChange={props.setBudgetMin} placeholder="Budget min" type="number" />
        <Input value={props.budgetMax} onChange={props.setBudgetMax} placeholder="Budget max" type="number" />
        <button
          type="button"
          onClick={() => props.setRemoteOnly(!props.remoteOnly)}
          className={clsx(
            'rounded-sm border px-3 py-2 text-xs font-semibold transition-colors',
            props.remoteOnly
              ? 'border-khoj-accent/50 bg-khoj-accent/10 text-khoj-accent'
              : 'border-khoj-border text-khoj-subtle hover:text-khoj-text',
          )}
        >
          Remote
        </button>
      </div>
      <button type="button" onClick={props.onReset} className="text-xs text-khoj-muted hover:text-khoj-accent">
        Clear filters
      </button>
    </Card>
  )
}

function ServiceForm({
  form,
  setForm,
  image,
  setImage,
  editing,
  saving,
  onCancelEdit,
  onSubmit,
}: {
  form: typeof EMPTY_SERVICE_FORM
  setForm: (value: typeof EMPTY_SERVICE_FORM) => void
  image: File | null
  setImage: (value: File | null) => void
  editing: boolean
  saving: boolean
  onCancelEdit: () => void
  onSubmit: (event: FormEvent) => void
}) {
  return (
    <Card>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <h2 className="text-base font-bold text-khoj-text">{editing ? 'Edit Service' : 'Publish a Service'}</h2>
          <p className="mt-1 text-xs text-khoj-subtle">Offer proof-backed services with fixed, hourly, or blended pricing.</p>
        </div>
        <Input value={form.title} onChange={(value) => setForm({ ...form, title: value })} placeholder="Service title" />
        <Select value={form.category} onChange={(value) => setForm({ ...form, category: value as MarketplaceCategory })}>
          {CATEGORIES.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
        </Select>
        <Textarea value={form.description} onChange={(value) => setForm({ ...form, description: value })} placeholder="Description" />
        <Input value={form.skills} onChange={(value) => setForm({ ...form, skills: value })} placeholder="Skills, comma separated" />
        <Select value={form.pricingType} onChange={(value) => setForm({ ...form, pricingType: value as PricingType })}>
          <option value="fixed">Fixed price</option>
          <option value="hourly">Hourly</option>
          <option value="both">Both</option>
        </Select>
        <div className="grid grid-cols-2 gap-2">
          <Input value={form.fixedPrice} onChange={(value) => setForm({ ...form, fixedPrice: value })} placeholder="Fixed project price" type="number" />
          <Input value={form.hourlyRate} onChange={(value) => setForm({ ...form, hourlyRate: value })} placeholder="Hourly rate" type="number" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Input value={form.deliveryTime} onChange={(value) => setForm({ ...form, deliveryTime: value })} placeholder="Delivery time" />
          <Input value={form.availability} onChange={(value) => setForm({ ...form, availability: value })} placeholder="Availability" />
        </div>
        <Input value={form.portfolioLink} onChange={(value) => setForm({ ...form, portfolioLink: value })} placeholder="Portfolio or Studio proof link" />
        <label className="block rounded-sm border border-dashed border-khoj-border p-3 text-xs text-khoj-subtle">
          <span className="block font-semibold text-khoj-text">Upload image or thumbnail</span>
          <span className="mt-1 block">{image?.name ?? 'Optional service thumbnail. Uses Firebase Storage when configured.'}</span>
          <input
            type="file"
            accept="image/*"
            className="mt-2 block w-full text-xs"
            onChange={(event) => setImage(event.target.files?.[0] ?? null)}
          />
        </label>
        <div className="flex flex-wrap gap-2">
          <Button type="submit" loading={saving}>{editing ? 'Save Service' : 'Publish Service'}</Button>
          {editing && <Button type="button" variant="secondary" onClick={onCancelEdit}>Cancel</Button>}
        </div>
      </form>
    </Card>
  )
}

function ProjectForm({
  form,
  setForm,
  attachment,
  setAttachment,
  saving,
  onSubmit,
}: {
  form: typeof EMPTY_PROJECT_FORM
  setForm: (value: typeof EMPTY_PROJECT_FORM) => void
  attachment: File | null
  setAttachment: (value: File | null) => void
  saving: boolean
  onSubmit: (event: FormEvent) => void
}) {
  return (
    <Card>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <h2 className="text-base font-bold text-khoj-text">Post a Project</h2>
          <p className="mt-1 text-xs text-khoj-subtle">Describe the work, budget, deadline, and proof you expect from applicants.</p>
        </div>
        <Input value={form.title} onChange={(value) => setForm({ ...form, title: value })} placeholder="Project title" />
        <Textarea value={form.description} onChange={(value) => setForm({ ...form, description: value })} placeholder="Project description" />
        <Input value={form.skills} onChange={(value) => setForm({ ...form, skills: value })} placeholder="Required skills, comma separated" />
        <div className="grid grid-cols-2 gap-2">
          <Select value={form.category} onChange={(value) => setForm({ ...form, category: value as MarketplaceCategory })}>
            {CATEGORIES.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
          </Select>
          <Select value={form.budgetType} onChange={(value) => setForm({ ...form, budgetType: value as BudgetType })}>
            <option value="fixed">Fixed</option>
            <option value="hourly">Hourly</option>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Input value={form.fixedBudget} onChange={(value) => setForm({ ...form, fixedBudget: value })} placeholder="Fixed budget" type="number" />
          <Input value={form.hourlyRate} onChange={(value) => setForm({ ...form, hourlyRate: value })} placeholder="Hourly rate" type="number" />
          <Input value={form.budgetMin} onChange={(value) => setForm({ ...form, budgetMin: value })} placeholder="Budget min" type="number" />
          <Input value={form.budgetMax} onChange={(value) => setForm({ ...form, budgetMax: value })} placeholder="Budget max" type="number" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="date"
            value={form.deadline}
            onChange={(event) => setForm({ ...form, deadline: event.target.value })}
            className="rounded-sm border border-khoj-border bg-khoj-bg px-3 py-2.5 text-sm text-khoj-text outline-none focus:border-khoj-accent/60"
          />
          <Select value={form.skillLevel} onChange={(value) => setForm({ ...form, skillLevel: value as SkillLevel })}>
            {SKILL_LEVELS.map((level) => <option key={level.value} value={level.value}>{level.label}</option>)}
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Select value={form.locationType} onChange={(value) => setForm({ ...form, locationType: value as LocationType })}>
            <option value="remote">Remote</option>
            <option value="hybrid">Hybrid</option>
            <option value="onsite">On-site</option>
          </Select>
          <Input value={form.location} onChange={(value) => setForm({ ...form, location: value })} placeholder="Location" />
        </div>
        <label className="block rounded-sm border border-dashed border-khoj-border p-3 text-xs text-khoj-subtle">
          <span className="block font-semibold text-khoj-text">Attach file optional</span>
          <span className="mt-1 block">{attachment?.name ?? 'Attach a brief or reference file name for now.'}</span>
          <input type="file" className="mt-2 block w-full text-xs" onChange={(event) => setAttachment(event.target.files?.[0] ?? null)} />
        </label>
        <Button type="submit" loading={saving}>Post Project</Button>
      </form>
    </Card>
  )
}

function ProjectCard({
  project,
  saved,
  onApply,
  onSave,
}: {
  project: MarketplaceProject
  saved: boolean
  onApply: () => void
  onSave: () => void
}) {
  return (
    <Card hover className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-khoj-accent">{project.category}</p>
          <h3 className="mt-1 text-base font-bold text-khoj-text">{project.title}</h3>
          <p className="mt-1 text-xs text-khoj-subtle">Posted by {project.clientName}</p>
        </div>
        <span className="rounded-sm border border-khoj-border px-2 py-1 text-[10px] uppercase text-khoj-subtle">
          {project.locationType}
        </span>
      </div>
      <p className="line-clamp-3 text-sm leading-relaxed text-khoj-subtle">{project.description}</p>
      <SkillBadges skills={project.skills} />
      <div className="grid grid-cols-3 gap-2 text-xs">
        <Metric label="Budget" value={projectBudgetLabel(project)} />
        <Metric label="Deadline" value={project.deadline || 'Flexible'} />
        <Metric label="Level" value={project.skillLevel} />
      </div>
      <div className="mt-auto flex flex-wrap gap-2 border-t border-khoj-border pt-4">
        <Button size="sm" onClick={onApply}>Apply / Send Proposal</Button>
        <Button size="sm" variant="secondary" onClick={onSave}>{saved ? 'Saved' : 'Save'}</Button>
      </div>
    </Card>
  )
}

function ServiceCard({ service }: { service: MarketplaceService }) {
  const initial = service.ownerName.charAt(0).toUpperCase()
  return (
    <Card hover className="flex flex-col gap-4">
      {service.thumbnailUrl && (
        <img src={service.thumbnailUrl} alt="" className="h-36 w-full rounded-sm object-cover" />
      )}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 overflow-hidden rounded-sm border border-khoj-border bg-khoj-accent/10">
          {service.ownerPhoto ? (
            <img src={service.ownerPhoto} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-sm font-bold text-khoj-accent">{initial}</div>
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-khoj-text">{service.ownerName}</p>
          <p className="text-[11px] text-khoj-subtle">Rating coming soon</p>
        </div>
      </div>
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-khoj-accent">{service.category}</p>
        <h3 className="mt-1 text-base font-bold text-khoj-text">{service.title}</h3>
        <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-khoj-subtle">{service.description}</p>
      </div>
      <SkillBadges skills={service.skills} />
      <div className="grid grid-cols-2 gap-2 text-xs">
        <Metric label="Starting price" value={servicePriceLabel(service)} />
        <Metric label="Delivery" value={service.deliveryTime || 'Flexible'} />
      </div>
      <div className="mt-auto flex flex-wrap gap-2 border-t border-khoj-border pt-4">
        <Link href={service.portfolioLink || `/profile/${service.ownerId}`}>
          <Button size="sm" variant="secondary">View Service</Button>
        </Link>
        <Link href={`/messages?user=${service.ownerId}`}>
          <Button size="sm">Hire / Contact</Button>
        </Link>
      </div>
    </Card>
  )
}

function MyServiceCard({
  service,
  onEdit,
  onToggleStatus,
  onDelete,
}: {
  service: MarketplaceService
  onEdit: () => void
  onToggleStatus: () => void
  onDelete: () => void
}) {
  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-khoj-text">{service.title}</h3>
          <p className="mt-1 text-xs text-khoj-subtle">{servicePriceLabel(service)} · {service.deliveryTime}</p>
        </div>
        <span className={clsx(
          'rounded-sm px-2 py-1 text-[10px] font-bold uppercase',
          service.status === 'active' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-zinc-700 text-zinc-300',
        )}>
          {service.status}
        </span>
      </div>
      <SkillBadges skills={service.skills} />
      <div className="mt-4 flex flex-wrap gap-2">
        <Button size="sm" variant="secondary" onClick={onEdit}>Edit</Button>
        <Button size="sm" variant="secondary" onClick={onToggleStatus}>{service.status === 'active' ? 'Pause' : 'Activate'}</Button>
        <Button size="sm" variant="danger" onClick={onDelete}>Delete</Button>
      </div>
    </Card>
  )
}

function ProposalModal({
  project,
  form,
  setForm,
  saving,
  onClose,
  onSubmit,
}: {
  project: MarketplaceProject
  form: typeof EMPTY_PROPOSAL_FORM
  setForm: (value: typeof EMPTY_PROPOSAL_FORM) => void
  saving: boolean
  onClose: () => void
  onSubmit: (event: FormEvent) => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <Card className="w-full max-w-lg">
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-khoj-accent">Send Proposal</p>
              <h2 className="mt-1 text-lg font-bold text-khoj-text">{project.title}</h2>
            </div>
            <button type="button" onClick={onClose} className="text-khoj-subtle hover:text-khoj-text">×</button>
          </div>
          <Textarea value={form.message} onChange={(value) => setForm({ ...form, message: value })} placeholder="Short proposal message" />
          <div className="grid grid-cols-2 gap-2">
            <Input value={form.proposedRate} onChange={(value) => setForm({ ...form, proposedRate: value })} placeholder="Proposed rate" type="number" />
            <Select value={form.rateType} onChange={(value) => setForm({ ...form, rateType: value as BudgetType })}>
              <option value="fixed">Fixed</option>
              <option value="hourly">Hourly</option>
            </Select>
          </div>
          <Input value={form.deliveryTime} onChange={(value) => setForm({ ...form, deliveryTime: value })} placeholder="Estimated delivery time" />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
            <Button type="submit" loading={saving}>Submit Proposal</Button>
          </div>
        </form>
      </Card>
    </div>
  )
}

function ProposalRow({ proposal }: { proposal: MarketplaceProposal }) {
  return (
    <Card className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div>
        <h3 className="text-sm font-bold text-khoj-text">{proposal.projectTitle}</h3>
        <p className="mt-1 text-xs text-khoj-subtle">{proposal.rateType === 'hourly' ? `$${proposal.proposedRate}/hr` : `$${proposal.proposedRate}`} · {proposal.deliveryTime}</p>
        <p className="mt-2 line-clamp-2 text-xs text-khoj-muted">{proposal.message}</p>
      </div>
      <span className={clsx(
        'w-fit rounded-sm px-2 py-1 text-[10px] font-bold uppercase',
        proposal.status === 'accepted'
          ? 'bg-emerald-500/15 text-emerald-400'
          : proposal.status === 'rejected'
          ? 'bg-red-500/15 text-red-400'
          : 'bg-khoj-accent/10 text-khoj-accent',
      )}>
        {proposal.status}
      </span>
    </Card>
  )
}

function AiPricingCard({ compact = false }: { compact?: boolean }) {
  return (
    <Card glow className={clsx('space-y-3', compact && 'max-w-sm p-4')}>
      <div>
        <h2 className="text-sm font-bold text-khoj-text">Need help pricing your service?</h2>
        <p className="mt-1 text-xs leading-relaxed text-khoj-subtle">
          KHOJ AI can suggest a fair hourly or project rate based on your skill, experience, and project difficulty.
        </p>
      </div>
      <Link href="/khoj-ai">
        <Button size="sm">Ask KHOJ AI</Button>
      </Link>
    </Card>
  )
}

function MarketplaceInfoCard() {
  return (
    <Card>
      <h2 className="text-sm font-bold text-khoj-text">How Jobs works now</h2>
      <p className="mt-2 text-xs leading-relaxed text-khoj-subtle">
        Jobs is for paid projects, services, and freelance work. Studio is where users upload proof.
        Arena is where talent gets discovered. Payments and escrow are not enabled yet.
      </p>
    </Card>
  )
}

function SectionHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div>
      <h2 className="text-lg font-bold text-khoj-text">{title}</h2>
      <p className="mt-1 text-xs text-khoj-subtle">{subtitle}</p>
    </div>
  )
}

function SkillBadges({ skills }: { skills: string[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {skills.slice(0, 6).map((skill) => (
        <span key={skill} className="rounded-sm bg-khoj-border/60 px-2 py-1 text-[10px] font-semibold text-khoj-subtle">
          {skill}
        </span>
      ))}
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-sm border border-khoj-border bg-khoj-bg p-2">
      <p className="text-[10px] uppercase tracking-[0.12em] text-khoj-muted">{label}</p>
      <p className="mt-1 truncate text-xs font-semibold capitalize text-khoj-text">{value}</p>
    </div>
  )
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <Card className="py-14 text-center">
      <p className="text-3xl text-khoj-muted">◎</p>
      <h3 className="mt-3 text-sm font-bold text-khoj-text">{title}</h3>
      <p className="mx-auto mt-1 max-w-sm text-xs text-khoj-subtle">{body}</p>
    </Card>
  )
}

function AuthRequired() {
  return <EmptyState title="Sign in required" body="You must be logged in to create services, post projects, save projects, or send proposals." />
}

function GridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {[1, 2, 3, 4].map((item) => (
        <Card key={item} className="animate-pulse space-y-4">
          <div className="h-4 w-2/3 rounded bg-khoj-border" />
          <div className="h-16 rounded bg-khoj-border/60" />
          <div className="h-8 rounded bg-khoj-border/40" />
        </Card>
      ))}
    </div>
  )
}

function Input({
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  value: string
  onChange: (value: string) => void
  placeholder: string
  type?: string
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className="w-full rounded-sm border border-khoj-border bg-khoj-bg px-3 py-2.5 text-sm text-khoj-text outline-none transition-colors placeholder:text-khoj-muted focus:border-khoj-accent/60"
    />
  )
}

function Textarea({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (value: string) => void
  placeholder: string
}) {
  return (
    <textarea
      rows={4}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className="w-full resize-none rounded-sm border border-khoj-border bg-khoj-bg px-3 py-2.5 text-sm text-khoj-text outline-none transition-colors placeholder:text-khoj-muted focus:border-khoj-accent/60"
    />
  )
}

function Select({
  value,
  onChange,
  children,
}: {
  value: string
  onChange: (value: string) => void
  children: ReactNode
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="w-full rounded-sm border border-khoj-border bg-khoj-bg px-3 py-2.5 text-sm text-khoj-text outline-none transition-colors focus:border-khoj-accent/60"
    >
      {children}
    </select>
  )
}
