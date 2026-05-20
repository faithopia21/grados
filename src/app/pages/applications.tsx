import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Progress } from '../components/ui/progress';
import { Input } from '../components/ui/input';
import { Checkbox } from '../components/ui/checkbox';
import { AddSchoolDialog, SchoolFormData } from '../components/add-school-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator } from '../components/ui/dropdown-menu';
import { useApplications } from '../../contexts/ApplicationContext';
import { getDaysUntil, formatDate } from '../../lib/utils';
import { Plus, ArrowRight, Search, ChevronDown } from 'lucide-react';
import { FABButton } from '../components/layout/fab-button';
import { toast } from 'sonner';
import { ApplicationStatus } from '../../types';

type StatusFilter = 'all' | ApplicationStatus;
type SortOption = 'deadline' | 'recent' | 'progress-high' | 'progress-low' | 'name';

export function Applications() {
  const [isAddSchoolOpen, setIsAddSchoolOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [countryFilters, setCountryFilters] = useState<string[]>([]);
  const [degreeFilters, setDegreeFilters] = useState<string[]>([]);
  const [fundingFilter, setFundingFilter] = useState<string[]>([]);
  const [deadlineFilter, setDeadlineFilter] = useState('all');
  const [sortBy, setSortBy] = useState<SortOption>('deadline');
  const [editingAppId, setEditingAppId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<SchoolFormData | undefined>(undefined);

  const navigate = useNavigate();
  const { applications, universities, programs, addApplication, addUniversity, addProgram, updateApplication, updateUniversity, updateProgram } =
    useApplications();

  const handleAddSchool = (data: SchoolFormData) => {
    if (editingAppId) {
      // Edit mode: update existing application
      const app = applications.find(a => a.id === editingAppId);
      if (app) {
        updateUniversity(app.universityId, {
          name: data.universityName,
          country: data.country,
        });
        updateProgram(app.programId, {
          name: data.programName,
          degree: data.degree,
          department: data.department,
          fundingAvailable: data.fundingAvailable,
        });
        updateApplication(app.id, {
          deadline: data.applicationDeadline,
          portalLink: data.portalUrl,
          notes: data.notes,
        });
        toast.success('Application updated successfully');
      }
      setEditingAppId(null);
      setEditFormData(undefined);
    } else {
      // Add mode: create new application
      const universityId = addUniversity({
        name: data.universityName,
        location: '',
        country: data.country,
      });

      const programId = addProgram({
        universityId,
        name: data.programName,
        degree: data.degree,
        department: data.department,
        fundingAvailable: data.fundingAvailable,
      });

      const defaultRequirements = [
        { id: `req-${Date.now()}-1`, name: 'Statement of Purpose', completed: false, required: true, status: 'not_started' as const },
        { id: `req-${Date.now()}-2`, name: 'CV/Resume', completed: false, required: true, status: 'not_started' as const },
        { id: `req-${Date.now()}-3`, name: 'Transcripts', completed: false, required: true, status: 'not_started' as const },
        { id: `req-${Date.now()}-4`, name: 'Letters of Recommendation', completed: false, required: true, status: 'not_started' as const },
        { id: `req-${Date.now()}-5`, name: 'English Test (TOEFL/IELTS)', completed: false, required: true, status: 'not_started' as const },
      ];

      addApplication({
        universityId,
        programId,
        status: 'not_started',
        deadline: data.applicationDeadline,
        portalLink: data.portalUrl,
        notes: data.notes,
        requirements: defaultRequirements,
        documents: [],
        supervisors: [],
        matchScore: 0,
        fundingLikelihood: data.fundingAvailable ? 50 : 0,
      });

      toast.success(`Added ${data.universityName} - ${data.degree} in ${data.programName}`);
    }
  };

  const handleEditApplication = (app: any) => {
    const university = universities.find(u => u.id === app.universityId);
    const program = programs.find(p => p.id === app.programId);

    if (university && program) {
      setEditFormData({
        universityName: university.name,
        programName: program.name,
        degree: program.degree,
        country: university.country,
        department: program.department,
        portalUrl: app.portalLink || '',
        applicationDeadline: app.deadline,
        fundingDeadline: '',
        fundingAvailable: program.fundingAvailable,
        notes: app.notes || '',
      });
      setEditingAppId(app.id);
      setIsAddSchoolOpen(true);
    }
  };
  // Get unique countries and degrees for filter options
  const availableCountries = useMemo(() => {
    const countries = new Set(universities.map(u => u.country));
    return Array.from(countries).sort();
  }, [universities]);

  const availableDegrees = useMemo(() => {
    const degrees = new Set(programs.map(p => p.degree));
    return Array.from(degrees).sort();
  }, [programs]);

  // Filter and sort applications
  const filteredApplications = useMemo(() => {
    let filtered = applications.map(app => ({
      ...app,
      university: universities.find(u => u.id === app.universityId)!,
      program: programs.find(p => p.id === app.programId)!,
      daysUntil: getDaysUntil(app.deadline),
    }));

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(app =>
        app.university?.name.toLowerCase().includes(query) ||
        app.program?.name.toLowerCase().includes(query) ||
        app.university?.country.toLowerCase().includes(query)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(app => app.status === statusFilter);
    }

    // Country filter
    if (countryFilters.length > 0) {
      filtered = filtered.filter(app => countryFilters.includes(app.university?.country));
    }

    // Degree filter
    if (degreeFilters.length > 0) {
      filtered = filtered.filter(app => degreeFilters.includes(app.program?.degree));
    }

    // Funding filter
    if (fundingFilter.length > 0) {
      if (fundingFilter.includes('yes') && !fundingFilter.includes('no')) {
        filtered = filtered.filter(app => app.program?.fundingAvailable);
      } else if (fundingFilter.includes('no') && !fundingFilter.includes('yes')) {
        filtered = filtered.filter(app => !app.program?.fundingAvailable);
      }
    }

    // Deadline range filter
    if (deadlineFilter === 'this_month') {
      filtered = filtered.filter(app => app.daysUntil >= 0 && app.daysUntil <= 30);
    } else if (deadlineFilter === 'next_3_months') {
      filtered = filtered.filter(app => app.daysUntil >= 0 && app.daysUntil <= 90);
    }

    // Sort
    filtered.sort((a, b) => {
      if (sortBy === 'deadline') {
        return a.daysUntil - b.daysUntil;
      } else if (sortBy === 'recent') {
        return b.id.localeCompare(a.id);
      } else if (sortBy === 'progress-high') {
        const aProgress = a.requirements.filter(r => r.completed).length / a.requirements.length;
        const bProgress = b.requirements.filter(r => r.completed).length / b.requirements.length;
        return bProgress - aProgress;
      } else if (sortBy === 'progress-low') {
        const aProgress = a.requirements.filter(r => r.completed).length / a.requirements.length;
        const bProgress = b.requirements.filter(r => r.completed).length / b.requirements.length;
        return aProgress - bProgress;
      } else if (sortBy === 'name') {
        return a.university?.name.localeCompare(b.university?.name);
      }
      return 0;
    });

    return filtered;
  }, [applications, universities, programs, searchQuery, statusFilter, countryFilters, degreeFilters, fundingFilter, deadlineFilter, sortBy]);

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; label: string }> = {
      not_started: { variant: 'outline', label: 'Not Started' },
      in_progress: { variant: 'warning', label: 'In Progress' },
      ready_to_submit: { variant: 'default', label: 'Ready' },
      submitted: { variant: 'success', label: 'Submitted' },
      accepted: { variant: 'success', label: 'Accepted' },
      rejected: { variant: 'destructive', label: 'Rejected' },
    };
    const config = variants[status] || { variant: 'outline', label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1>All Applications</h1>
          <p className="text-muted-foreground mt-2">
            Manage all your graduate school applications
          </p>
        </div>
        <Button onClick={() => setIsAddSchoolOpen(true)} className="hidden md:flex">
          <Plus className="h-4 w-4 mr-2" />
          Add New School
        </Button>
      </div>

      <FABButton onClick={() => setIsAddSchoolOpen(true)} />

      <AddSchoolDialog
        open={isAddSchoolOpen}
        onOpenChange={(open) => {
          setIsAddSchoolOpen(open);
          if (!open) {
            setEditingAppId(null);
            setEditFormData(undefined);
          }
        }}
        onSubmit={handleAddSchool}
        initialData={editFormData}
        isEditing={!!editingAppId}
      />

      <div className="space-y-4">
        {/* Search bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search by university, program, or country..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Status chips and filter/sort buttons */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Status filter dropdown */}
          <div>
            <DropdownMenu>
              <DropdownMenuTrigger className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all border bg-background text-foreground hover:bg-accent hover:text-accent-foreground h-8 px-3">
                {statusFilter === 'all' ? 'All' :
                 statusFilter === 'not_started' ? 'Not Started' :
                 statusFilter === 'in_progress' ? 'In Progress' :
                 statusFilter === 'ready_to_submit' ? 'Ready to Submit' :
                 statusFilter === 'submitted' ? 'Submitted' :
                 statusFilter === 'accepted' ? 'Accepted' :
                 statusFilter === 'rejected' ? 'Rejected' : 'All'
                } <ChevronDown className="h-4 w-4 ml-1" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuCheckboxItem
                  checked={statusFilter === 'all'}
                  onCheckedChange={() => setStatusFilter('all')}
                >
                  All
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={statusFilter === 'not_started'}
                  onCheckedChange={() => setStatusFilter('not_started')}
                >
                  Not Started
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={statusFilter === 'in_progress'}
                  onCheckedChange={() => setStatusFilter('in_progress')}
                >
                  In Progress
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={statusFilter === 'ready_to_submit'}
                  onCheckedChange={() => setStatusFilter('ready_to_submit')}
                >
                  Ready to Submit
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={statusFilter === 'submitted'}
                  onCheckedChange={() => setStatusFilter('submitted')}
                >
                  Submitted
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={statusFilter === 'accepted'}
                  onCheckedChange={() => setStatusFilter('accepted')}
                >
                  Accepted
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={statusFilter === 'rejected'}
                  onCheckedChange={() => setStatusFilter('rejected')}
                >
                  Rejected
                </DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Filter and Sort buttons */}
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all border bg-background text-foreground hover:bg-accent hover:text-accent-foreground h-8 px-3">
                Filter <ChevronDown className="h-4 w-4 ml-1" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Country</DropdownMenuLabel>
                {availableCountries.map(country => (
                  <DropdownMenuCheckboxItem
                    key={country}
                    checked={countryFilters.includes(country)}
                    onCheckedChange={(checked) => {
                      setCountryFilters(prev =>
                        checked ? [...prev, country] : prev.filter(c => c !== country)
                      );
                    }}
                  >
                    {country}
                  </DropdownMenuCheckboxItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Degree Type</DropdownMenuLabel>
                {availableDegrees.map(degree => (
                  <DropdownMenuCheckboxItem
                    key={degree}
                    checked={degreeFilters.includes(degree)}
                    onCheckedChange={(checked) => {
                      setDegreeFilters(prev =>
                        checked ? [...prev, degree] : prev.filter(d => d !== degree)
                      );
                    }}
                  >
                    {degree}
                  </DropdownMenuCheckboxItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Funding Available</DropdownMenuLabel>
                <DropdownMenuCheckboxItem
                  checked={fundingFilter.includes('yes')}
                  onCheckedChange={(checked) => {
                    setFundingFilter(prev =>
                      checked ? [...prev, 'yes'] : prev.filter(f => f !== 'yes')
                    );
                  }}
                >
                  Yes
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={fundingFilter.includes('no')}
                  onCheckedChange={(checked) => {
                    setFundingFilter(prev =>
                      checked ? [...prev, 'no'] : prev.filter(f => f !== 'no')
                    );
                  }}
                >
                  No
                </DropdownMenuCheckboxItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Deadline Range</DropdownMenuLabel>
                <DropdownMenuRadioGroup value={deadlineFilter} onValueChange={setDeadlineFilter}>
                  <DropdownMenuRadioItem value="this_month">This month</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="next_3_months">Next 3 months</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="all">All</DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all border bg-background text-foreground hover:bg-accent hover:text-accent-foreground h-8 px-3">
                Sort <ChevronDown className="h-4 w-4 ml-1" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuRadioGroup value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
                  <DropdownMenuRadioItem value="deadline">Nearest deadline</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="recent">Recently added</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="progress-high">Progress high to low</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="progress-low">Progress low to high</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="name">University name A–Z</DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Results count */}
        <p className="text-[13px] text-muted-foreground">
          Showing {filteredApplications.length} {filteredApplications.length === 1 ? 'application' : 'applications'}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {filteredApplications.map(app => {
          const university = app.university;
          const program = app.program;
          const daysUntil = app.daysUntil;
          const completedReqs = app.requirements.filter(r => r.completed).length;
          const totalReqs = app.requirements.length;
          const progress = totalReqs > 0 ? (completedReqs / totalReqs) * 100 : 0;

          return (
            <Card key={app.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4 md:p-6">
                <div className="flex flex-col md:flex-row md:items-start gap-4 md:gap-6">
                  <div className="flex-1 space-y-4">
                    <div>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <h3 className="text-base md:text-lg">{university?.name}</h3>
                          <p className="text-sm text-muted-foreground mt-1">
                            {program?.degree} in {program?.name}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {university?.location ? `${university.location}, ` : ''}{university?.country}
                          </p>
                        </div>
                        {getStatusBadge(app.status)}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground">Deadline</p>
                        <p className="text-sm mt-1">{formatDate(app.deadline)}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {daysUntil >= 0 ? `${daysUntil} days left` : 'Passed'}
                        </p>
                      </div>
                    </div>

                    {totalReqs > 0 && (
                      <div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                          <span>Progress</span>
                          <span>
                            {completedReqs}/{totalReqs} requirements
                          </span>
                        </div>
                        <Progress value={progress} />
                      </div>
                    )}
                  </div>

                  <div className="flex md:flex-col gap-2 justify-end md:justify-start">
                    <Button
                      variant="outline"
                      className="flex-1 md:w-full"
                      onClick={() => navigate(`/application/${app.id}`)}
                    >
                      View
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                    {app.status === 'ready_to_submit' && (
                      <Button
                        size="sm"
                        className="flex-1 md:w-full"
                        onClick={() => {
                          updateApplication(app.id, {
                            status: 'submitted',
                            submittedDate: new Date().toISOString().split('T')[0],
                          });
                          toast.success('Application marked as submitted!');
                        }}
                      >
                        Mark Submitted
                      </Button>
                    )}
                    {app.status !== 'submitted' && app.status !== 'ready_to_submit' && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="flex-1 md:w-full"
                        onClick={() => handleEditApplication(app)}
                      >
                        Edit
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
