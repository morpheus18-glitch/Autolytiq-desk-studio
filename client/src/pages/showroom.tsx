import { useState, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { DndContext, DragEndEvent, DragOverlay, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { format, isToday, isSameDay } from 'date-fns';
import { Plus, Search, Store, RefreshCw, CalendarIcon, Users, Clock, MapPin, Car, Phone, Video, User } from 'lucide-react';
import type { Customer, Appointment } from '@shared/schema';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  appointmentStatusColors,
  containerPadding,
  layoutSpacing,
  gridLayouts,
  premiumCardClasses,
  formSpacing,
  stickyHeaderClasses,
  pageTitleClasses,
  pageSubtitleClasses,
  heroIconContainerClasses,
  primaryButtonClasses,
} from '@/lib/design-tokens';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { PageHeader } from '@/components/core/page-header';
import { PageContent } from '@/components/core/page-content';
import { KanbanColumn } from '@/components/kanban-column';
import { KanbanCustomerCard } from '@/components/kanban-customer-card';

type CustomerStatus = 'prospect' | 'qualified' | 'active' | 'sold' | 'lost' | 'inactive';

const COLUMNS = [
  { id: 'prospect', title: 'New Prospects', color: 'blue' },
  { id: 'qualified', title: 'Qualified', color: 'purple' },
  { id: 'active', title: 'Active Deal', color: 'yellow' },
  { id: 'sold', title: 'Sold', color: 'green' },
  { id: 'lost', title: 'Lost', color: 'gray' },
] as const;

export default function Showroom() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCustomer, setActiveCustomer] = useState<Customer | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showAllCustomers, setShowAllCustomers] = useState(false);
  const [showNewAppointment, setShowNewAppointment] = useState(false);
  const [newAppointment, setNewAppointment] = useState({
    title: '',
    description: '',
    appointmentType: 'consultation',
    scheduledAt: '',
    duration: 30,
    location: 'dealership',
    customerId: '',
    notes: '',
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Fetch all customers
  const { data: customers = [], isLoading, refetch } = useQuery<Customer[]>({
    queryKey: ['/api/customers'],
  });

  // Fetch appointments for selected date
  const { data: appointments = [], refetch: refetchAppointments } = useQuery<Appointment[]>({
    queryKey: ['/api/appointments/date', format(selectedDate, 'yyyy-MM-dd')],
    queryFn: async () => {
      const response = await fetch(`/api/appointments/date/${format(selectedDate, 'yyyy-MM-dd')}`);
      if (!response.ok) throw new Error('Failed to fetch appointments');
      return response.json();
    },
  });

  // Create appointment mutation
  const createAppointmentMutation = useMutation({
    mutationFn: async (data: typeof newAppointment) => {
      return await apiRequest('POST', '/api/appointments', {
        ...data,
        customerId: data.customerId || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/appointments/date'] });
      toast({
        title: 'Appointment created',
        description: 'New appointment has been scheduled',
      });
      setShowNewAppointment(false);
      setNewAppointment({
        title: '',
        description: '',
        appointmentType: 'consultation',
        scheduledAt: '',
        duration: 30,
        location: 'dealership',
        customerId: '',
        notes: '',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to create appointment',
        description: error.message || 'Please try again',
        variant: 'destructive',
      });
    },
  });

  // Update appointment status mutation
  const updateAppointmentMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      return await apiRequest('PATCH', `/api/appointments/${id}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/appointments/date'] });
      toast({
        title: 'Appointment updated',
        description: 'Appointment status has been changed',
      });
    },
  });

  // Update customer status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ customerId, status }: { customerId: string; status: CustomerStatus }) => {
      return await apiRequest('PATCH', `/api/customers/${customerId}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/customers'] });
      toast({
        title: 'Status updated',
        description: 'Customer status has been updated successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Update failed',
        description: error.message || 'Failed to update customer status',
        variant: 'destructive',
      });
    },
  });

  // Filter customers by search and date
  const filteredCustomers = useMemo(() => {
    // Defensive check: ensure customers is always an array
    let result = customers || [];

    // Filter by date if not showing all customers
    if (!showAllCustomers) {
      result = result.filter(c => {
        const customerDate = new Date(c.createdAt);
        return isSameDay(customerDate, selectedDate);
      });
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(c =>
        c.firstName.toLowerCase().includes(query) ||
        c.lastName.toLowerCase().includes(query) ||
        c.email?.toLowerCase().includes(query) ||
        c.phone?.includes(query)
      );
    }

    return result;
  }, [customers, searchQuery, selectedDate, showAllCustomers]);

  // Group customers by status
  const customersByStatus = useMemo(() => {
    const grouped: Record<CustomerStatus, Customer[]> = {
      prospect: [],
      qualified: [],
      active: [],
      sold: [],
      lost: [],
      inactive: [],
    };

    filteredCustomers.forEach(customer => {
      const status = (customer.status || 'prospect') as CustomerStatus;
      if (grouped[status]) {
        grouped[status].push(customer);
      }
    });

    return grouped;
  }, [filteredCustomers]);

  // Handle drag end
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveCustomer(null);

    if (!over || active.id === over.id) return;

    const customerId = active.id as string;
    
    // Get the column ID from the droppable container
    // When dropping on a card, over.id is the card's ID, but we need the column ID
    const newStatus = (over.data.current?.sortable?.containerId || over.id) as CustomerStatus;
    
    // Validate that we got a valid status (not a customer ID)
    const validStatuses: CustomerStatus[] = ['prospect', 'qualified', 'active', 'sold', 'lost', 'inactive'];
    if (!validStatuses.includes(newStatus)) {
      console.warn('Invalid status detected:', newStatus);
      return;
    }

    // Find the customer
    const customer = customers.find(c => c.id === customerId);
    if (!customer) return;

    // Only update if status changed
    if (customer.status !== newStatus) {
      updateStatusMutation.mutate({ customerId, status: newStatus });
    }
  };

  const handleDragStart = (event: any) => {
    const customer = customers.find(c => c.id === event.active.id);
    setActiveCustomer(customer || null);
  };

  const totalCustomers = filteredCustomers.length;
  const prospectCount = customersByStatus.prospect.length;
  const qualifiedCount = customersByStatus.qualified.length;
  const activeCount = customersByStatus.active.length;

  return (
    <div className="h-full flex flex-col">
      <PageHeader
        title="Showroom Manager"
        subtitle="Manage your customer pipeline from prospect to sold"
        icon={<Store />}
        actions={
          <Button
            onClick={() => setLocation('/customers')}
            data-testid="button-add-customer"
            className={primaryButtonClasses}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Customer
          </Button>
        }
      />

      <PageContent>
        <div className="space-y-6">
          <div className="flex flex-col gap-4">

            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                {/* Date Picker */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "justify-start text-left font-normal min-w-[200px]",
                    !selectedDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {isToday(selectedDate) ? (
                    <span>Today - {format(selectedDate, 'MMM d, yyyy')}</span>
                  ) : (
                    format(selectedDate, 'EEEE, MMM d, yyyy')
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            {/* Show All Toggle */}
            <Button
              variant={showAllCustomers ? "default" : "outline"}
              size="sm"
              onClick={() => setShowAllCustomers(!showAllCustomers)}
              className="gap-2"
            >
              <Users className="h-4 w-4" />
              {showAllCustomers ? 'All Customers' : 'Daily View'}
            </Button>

            <div className="h-6 w-px bg-border" />

            {/* Stats */}
            <Badge variant="secondary" className="text-sm">
              {totalCustomers} Total
            </Badge>
            <Badge variant="outline" className="text-sm text-blue-600 dark:text-blue-400">
              {prospectCount} Prospects
            </Badge>
            <Badge variant="outline" className="text-sm text-purple-600 dark:text-purple-400 hidden md:inline-flex">
              {qualifiedCount} Qualified
            </Badge>
            <Badge variant="outline" className="text-sm text-yellow-600 dark:text-yellow-400 hidden md:inline-flex">
              {activeCount} Active
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search customers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-search-customers"
              />
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => refetch()}
              data-testid="button-refresh"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
          </div>

          {/* Kanban Board */}
        {isLoading ? (
          <div className={cn("grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4")}>
            {[1, 2, 3, 4, 5].map(i => (
              <Skeleton key={i} className="h-[600px]" />
            ))}
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {COLUMNS.map(column => (
                <KanbanColumn
                  key={column.id}
                  id={column.id}
                  title={column.title}
                  customers={customersByStatus[column.id as CustomerStatus] || []}
                  color={column.color}
                />
              ))}
            </div>

            <DragOverlay>
              {activeCustomer ? (
                <KanbanCustomerCard customer={activeCustomer} />
              ) : null}
            </DragOverlay>
          </DndContext>
        )}

        {/* Appointments Board */}
        <Card className={cn(premiumCardClasses, "mt-6")}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-medium flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                Today's Appointments
                {appointments.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {appointments.length}
                  </Badge>
                )}
              </CardTitle>
              <Dialog open={showNewAppointment} onOpenChange={setShowNewAppointment}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    New Appointment
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Schedule New Appointment</DialogTitle>
                  </DialogHeader>
                  <div className={cn(formSpacing.fields, "pt-4")}>
                    <div className={formSpacing.fieldGroup}>
                      <Label>Title</Label>
                      <Input
                        placeholder="e.g., Test Drive - 2024 Camry"
                        value={newAppointment.title}
                        onChange={(e) => setNewAppointment({ ...newAppointment, title: e.target.value })}
                      />
                    </div>
                    <div className={gridLayouts.twoCol}>
                      <div className={formSpacing.fieldGroup}>
                        <Label>Date & Time</Label>
                        <Input
                          type="datetime-local"
                          value={newAppointment.scheduledAt}
                          onChange={(e) => setNewAppointment({ ...newAppointment, scheduledAt: e.target.value })}
                        />
                      </div>
                      <div className={formSpacing.fieldGroup}>
                        <Label>Duration</Label>
                        <Select
                          value={String(newAppointment.duration)}
                          onValueChange={(v) => setNewAppointment({ ...newAppointment, duration: Number(v) })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="15">15 min</SelectItem>
                            <SelectItem value="30">30 min</SelectItem>
                            <SelectItem value="45">45 min</SelectItem>
                            <SelectItem value="60">1 hour</SelectItem>
                            <SelectItem value="90">1.5 hours</SelectItem>
                            <SelectItem value="120">2 hours</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className={gridLayouts.twoCol}>
                      <div className={formSpacing.fieldGroup}>
                        <Label>Type</Label>
                        <Select
                          value={newAppointment.appointmentType}
                          onValueChange={(v) => setNewAppointment({ ...newAppointment, appointmentType: v })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="test_drive">Test Drive</SelectItem>
                            <SelectItem value="delivery">Delivery</SelectItem>
                            <SelectItem value="consultation">Consultation</SelectItem>
                            <SelectItem value="follow_up">Follow-up</SelectItem>
                            <SelectItem value="phone_call">Phone Call</SelectItem>
                            <SelectItem value="walk_in">Walk-in</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className={formSpacing.fieldGroup}>
                        <Label>Location</Label>
                        <Select
                          value={newAppointment.location}
                          onValueChange={(v) => setNewAppointment({ ...newAppointment, location: v })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="dealership">Dealership</SelectItem>
                            <SelectItem value="customer_location">Customer Location</SelectItem>
                            <SelectItem value="phone">Phone</SelectItem>
                            <SelectItem value="virtual">Virtual</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className={formSpacing.fieldGroup}>
                      <Label>Notes</Label>
                      <Textarea
                        placeholder="Additional notes..."
                        value={newAppointment.notes}
                        onChange={(e) => setNewAppointment({ ...newAppointment, notes: e.target.value })}
                        rows={3}
                      />
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                      <Button variant="outline" onClick={() => setShowNewAppointment(false)}>
                        Cancel
                      </Button>
                      <Button
                        onClick={() => createAppointmentMutation.mutate(newAppointment)}
                        disabled={!newAppointment.title || !newAppointment.scheduledAt || createAppointmentMutation.isPending}
                      >
                        {createAppointmentMutation.isPending ? 'Scheduling...' : 'Schedule'}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {appointments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>No appointments scheduled for {isToday(selectedDate) ? 'today' : format(selectedDate, 'MMM d')}</p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowNewAppointment(true)}
                  className="mt-2"
                >
                  Schedule your first appointment
                </Button>
              </div>
            ) : (
              <div className={cn("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3")}>
                {appointments.map((apt) => (
                  <div
                    key={apt.id}
                    className={cn(
                      "p-4 rounded-lg border transition-colors",
                      appointmentStatusColors[apt.status] || ''
                    )}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        {apt.appointmentType === 'test_drive' && <Car className="h-4 w-4 text-blue-500" />}
                        {apt.appointmentType === 'phone_call' && <Phone className="h-4 w-4 text-green-500" />}
                        {apt.appointmentType === 'virtual' && <Video className="h-4 w-4 text-purple-500" />}
                        {apt.appointmentType === 'delivery' && <MapPin className="h-4 w-4 text-orange-500" />}
                        {['consultation', 'follow_up', 'walk_in'].includes(apt.appointmentType) && (
                          <User className="h-4 w-4 text-gray-500" />
                        )}
                        <span className="font-medium text-sm">{apt.title}</span>
                      </div>
                      <Badge
                        variant={
                          apt.status === 'completed' ? 'default' :
                          apt.status === 'confirmed' ? 'secondary' :
                          apt.status === 'cancelled' || apt.status === 'no_show' ? 'destructive' :
                          'outline'
                        }
                        className="text-xs"
                      >
                        {apt.status.replace('_', ' ')}
                      </Badge>
                    </div>
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Clock className="h-3.5 w-3.5" />
                        <span>
                          {format(new Date(apt.scheduledAt), 'h:mm a')} - {apt.duration} min
                        </span>
                      </div>
                      {apt.location && apt.location !== 'dealership' && (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-3.5 w-3.5" />
                          <span className="capitalize">{apt.location.replace('_', ' ')}</span>
                        </div>
                      )}
                    </div>
                    {apt.status === 'scheduled' && (
                      <div className="flex gap-1 mt-3">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 h-7 text-xs"
                          onClick={() => updateAppointmentMutation.mutate({ id: apt.id, status: 'confirmed' })}
                        >
                          Confirm
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 h-7 text-xs text-green-600 hover:text-green-700"
                          onClick={() => updateAppointmentMutation.mutate({ id: apt.id, status: 'completed' })}
                        >
                          Complete
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs text-red-500 hover:text-red-600"
                          onClick={() => updateAppointmentMutation.mutate({ id: apt.id, status: 'no_show' })}
                        >
                          No-show
                        </Button>
                      </div>
                    )}
                    {apt.status === 'confirmed' && (
                      <div className="flex gap-1 mt-3">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 h-7 text-xs text-green-600 hover:text-green-700"
                          onClick={() => updateAppointmentMutation.mutate({ id: apt.id, status: 'completed' })}
                        >
                          Complete
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs text-red-500 hover:text-red-600"
                          onClick={() => updateAppointmentMutation.mutate({ id: apt.id, status: 'no_show' })}
                        >
                          No-show
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        </div>
      </PageContent>
    </div>
  );
}
