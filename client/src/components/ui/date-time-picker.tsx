import * as React from "react";
import { format, isWeekend, addMinutes } from "date-fns";
import { Calendar as CalendarIcon, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface DateTimePickerProps {
  date: Date | undefined;
  setDate: (date: Date | undefined) => void;
  placeholder?: string;
}

interface RangeTimePickerProps {
  startDate: Date | undefined;
  endDate: Date | undefined;
  onRangeChange: (start: Date | undefined, end: Date | undefined) => void;
  placeholder?: string;
}

export function RangeTimePicker({
  startDate,
  endDate,
  onRangeChange,
  placeholder = "Pick date and time range",
}: RangeTimePickerProps) {
  const minuteOptions = Array.from({ length: 4 }, (_, i) => i * 15);
  const hourOptions = Array.from({ length: 11 }, (_, i) => i + 8); // 8 AM to 6 PM

  const handleStartTimeChange = (date: Date) => {
    onRangeChange(date, endDate && date > endDate ? addMinutes(date, 30) : endDate);
  };

  const handleEndTimeChange = (date: Date) => {
    onRangeChange(startDate, date);
  };

  const formatTimeRange = () => {
    if (!startDate && !endDate) return "Select time";
    const start = startDate ? format(startDate, "HH:mm") : "--:--";
    const end = endDate ? format(endDate, "HH:mm") : "--:--";
    return `${start}-${end}`;
  };

  return (
    <div className="flex gap-2 w-full">
      {/* Date Selection */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant={"outline"}
            className={cn(
              "justify-start text-left font-normal w-[50%]",
              !startDate && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {startDate ? format(startDate, "MMMM do") : "Pick a date"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={startDate}
            onSelect={(selectedDate) => {
              if (selectedDate) {
                const newDate = new Date(selectedDate);
                if (startDate) {
                  newDate.setHours(startDate.getHours());
                  newDate.setMinutes(startDate.getMinutes());
                }
                handleStartTimeChange(newDate);
              }
            }}
            disabled={(date) => isWeekend(date)}
            initialFocus
            weekStartsOn={1}
          />
        </PopoverContent>
      </Popover>

      {/* Time Range Selection */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant={"outline"}
            className={cn(
              "justify-start text-left font-normal w-[50%]",
              !startDate && "text-muted-foreground"
            )}
          >
            <Clock className="mr-2 h-4 w-4" />
            {formatTimeRange()}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-3" align="start">
          <div className="space-y-4">
            {/* Start Time */}
            <div>
              <div className="text-sm font-medium mb-2">Start Time</div>
              <div className="flex gap-2">
                <Select
                  value={startDate ? startDate.getHours().toString() : undefined}
                  onValueChange={(value) => {
                    const newDate = new Date(startDate || new Date());
                    newDate.setHours(parseInt(value));
                    handleStartTimeChange(newDate);
                  }}
                >
                  <SelectTrigger className="w-[100px]">
                    <SelectValue placeholder="Hour" />
                  </SelectTrigger>
                  <SelectContent>
                    {hourOptions.map((hour) => (
                      <SelectItem key={hour} value={hour.toString()}>
                        {hour.toString().padStart(2, "0")}:00
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={startDate ? (Math.floor(startDate.getMinutes() / 15) * 15).toString() : undefined}
                  onValueChange={(value) => {
                    const newDate = new Date(startDate || new Date());
                    newDate.setMinutes(parseInt(value));
                    handleStartTimeChange(newDate);
                  }}
                >
                  <SelectTrigger className="w-[100px]">
                    <SelectValue placeholder="Minute" />
                  </SelectTrigger>
                  <SelectContent>
                    {minuteOptions.map((minute) => (
                      <SelectItem key={minute} value={minute.toString()}>
                        :{minute.toString().padStart(2, "0")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* End Time */}
            <div>
              <div className="text-sm font-medium mb-2">End Time</div>
              <div className="flex gap-2">
                <Select
                  value={endDate ? endDate.getHours().toString() : undefined}
                  onValueChange={(value) => {
                    const newDate = new Date(endDate || startDate || new Date());
                    newDate.setHours(parseInt(value));
                    handleEndTimeChange(newDate);
                  }}
                >
                  <SelectTrigger className="w-[100px]">
                    <SelectValue placeholder="Hour" />
                  </SelectTrigger>
                  <SelectContent>
                    {hourOptions.map((hour) => (
                      <SelectItem key={hour} value={hour.toString()}>
                        {hour.toString().padStart(2, "0")}:00
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={endDate ? (Math.floor(endDate.getMinutes() / 15) * 15).toString() : undefined}
                  onValueChange={(value) => {
                    const newDate = new Date(endDate || startDate || new Date());
                    newDate.setMinutes(parseInt(value));
                    handleEndTimeChange(newDate);
                  }}
                >
                  <SelectTrigger className="w-[100px]">
                    <SelectValue placeholder="Minute" />
                  </SelectTrigger>
                  <SelectContent>
                    {minuteOptions.map((minute) => (
                      <SelectItem key={minute} value={minute.toString()}>
                        :{minute.toString().padStart(2, "0")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

// Keep the original DateTimePicker for other use cases
export function DateTimePicker({
  date,
  setDate,
  placeholder = "Pick a date and time",
}: DateTimePickerProps) {
  const minuteOptions = Array.from({ length: 4 }, (_, i) => i * 15);
  const hourOptions = Array.from({ length: 24 }, (_, i) => i);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-full justify-start text-left font-normal",
            !date && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, "PPp") : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={(selectedDate) => {
            if (selectedDate) {
              const newDate = new Date(selectedDate);
              if (date) {
                newDate.setHours(date.getHours());
                newDate.setMinutes(date.getMinutes());
              }
              setDate(newDate);
            } else {
              setDate(undefined);
            }
          }}
          disabled={(date) => isWeekend(date)}
          initialFocus
          weekStartsOn={1}
        />
        <div className="border-t border-gray-200 p-3 flex gap-2">
          <Select
            value={date ? date.getHours().toString() : undefined}
            onValueChange={(value) => {
              const newDate = new Date(date || new Date());
              newDate.setHours(parseInt(value));
              setDate(newDate);
            }}
          >
            <SelectTrigger className="w-[100px]">
              <SelectValue placeholder="Hour" />
            </SelectTrigger>
            <SelectContent>
              {hourOptions.map((hour) => (
                <SelectItem key={hour} value={hour.toString()}>
                  {hour.toString().padStart(2, "0")}:00
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={date ? (Math.floor(date.getMinutes() / 15) * 15).toString() : undefined}
            onValueChange={(value) => {
              const newDate = new Date(date || new Date());
              newDate.setMinutes(parseInt(value));
              setDate(newDate);
            }}
          >
            <SelectTrigger className="w-[100px]">
              <SelectValue placeholder="Minute" />
            </SelectTrigger>
            <SelectContent>
              {minuteOptions.map((minute) => (
                <SelectItem key={minute} value={minute.toString()}>
                  :{minute.toString().padStart(2, "0")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </PopoverContent>
    </Popover>
  );
} 