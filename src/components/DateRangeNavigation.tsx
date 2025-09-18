import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface DateRangeNavigationProps {
  dateFrom: Date;
  dateTo: Date;
  onDateFromChange: (date: Date) => void;
  onDateToChange: (date: Date) => void;
}

export function DateRangeNavigation({
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange
}: DateRangeNavigationProps) {
  const setCurrentMonth = () => {
    const currentDate = new Date();
    const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    onDateFromChange(firstDay);
    onDateToChange(lastDay);
  };

  const setPreviousMonth = () => {
    const currentDate = new Date(dateFrom);
    const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
    const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 0);
    onDateFromChange(firstDay);
    onDateToChange(lastDay);
  };

  const setNextMonth = () => {
    const currentDate = new Date(dateFrom);
    const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
    const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 2, 0);
    onDateFromChange(firstDay);
    onDateToChange(lastDay);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-4 mb-6 p-4 bg-muted/30 rounded-lg">
      {/* Quick Navigation */}
      <div className="flex items-center gap-2">
        <Button
          onClick={setPreviousMonth}
          variant="outline"
          size="sm"
          className="h-9"
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </Button>
        <Button
          onClick={setCurrentMonth}
          variant="outline"
          size="sm"
          className="h-9"
        >
          Current Month
        </Button>
        <Button
          onClick={setNextMonth}
          variant="outline"
          size="sm"
          className="h-9"
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Custom Date Range */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="space-y-2">
          <Label>From Date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-[240px] justify-start text-left font-normal",
                  !dateFrom && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateFrom ? format(dateFrom, "PPP") : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dateFrom}
                onSelect={(date) => date && onDateFromChange(date)}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
        </div>
        
        <div className="space-y-2">
          <Label>To Date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-[240px] justify-start text-left font-normal",
                  !dateTo && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateTo ? format(dateTo, "PPP") : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dateTo}
                onSelect={(date) => date && onDateToChange(date)}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </div>
  );
}