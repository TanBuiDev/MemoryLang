"use client";

import * as React from "react";
import { format, isValid } from "date-fns";
import { CalendarIcon, Clock } from "lucide-react";
import { cn } from "@/utils/cn";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";

export interface DateTimePickerProps {
  value: string; // "YYYY-MM-DDTHH:MM" format (like HTML datetime-local value)
  onChange: (value: string) => void;
  className?: string;
  id?: string;
  placeholder?: string;
}

export function DateTimePicker({
  value,
  onChange,
  className,
  id,
  placeholder = "Chọn ngày..."
}: DateTimePickerProps) {
  const [open, setOpen] = React.useState(false);

  // Parse current value
  const parsedDate = React.useMemo(() => {
    if (!value) return undefined;
    const d = new Date(value);
    return isValid(d) ? d : undefined;
  }, [value]);

  // Handle date selection
  const handleDateSelect = (selectedDate: Date | undefined) => {
    if (!selectedDate) return;
    
    // Maintain current time or default to 00:00
    let hours = "00";
    let minutes = "00";
    if (parsedDate) {
      hours = parsedDate.getHours().toString().padStart(2, "0");
      minutes = parsedDate.getMinutes().toString().padStart(2, "0");
    }
    
    const year = selectedDate.getFullYear();
    const month = (selectedDate.getMonth() + 1).toString().padStart(2, "0");
    const day = selectedDate.getDate().toString().padStart(2, "0");
    
    onChange(`${year}-${month}-${day}T${hours}:${minutes}`);
    setOpen(false);
  };

  // Handle time selection
  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const timeVal = e.target.value; // "HH:MM"
    if (!timeVal) return;

    let targetDate = parsedDate || new Date();
    const year = targetDate.getFullYear();
    const month = (targetDate.getMonth() + 1).toString().padStart(2, "0");
    const day = targetDate.getDate().toString().padStart(2, "0");

    onChange(`${year}-${month}-${day}T${timeVal}`);
  };

  const timeString = React.useMemo(() => {
    if (!parsedDate) return "00:00";
    const hours = parsedDate.getHours().toString().padStart(2, "0");
    const minutes = parsedDate.getMinutes().toString().padStart(2, "0");
    return `${hours}:${minutes}`;
  }, [parsedDate]);

  return (
    <div className={cn("flex items-center gap-2 w-full max-w-xs", className)} id={id}>
      <div className="flex-1 min-w-0">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              type="button"
              className={cn(
                "w-full justify-start text-left font-normal h-10 transition-all hover:bg-muted/50 cursor-pointer text-ellipsis overflow-hidden whitespace-nowrap",
                !parsedDate && "text-muted-foreground",
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4 opacity-70 shrink-0" />
              <span className="truncate">
                {parsedDate ? format(parsedDate, "PPP") : <span>{placeholder}</span>}
              </span>
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="w-auto p-0 border-muted-foreground/10 shadow-2xl bg-card border-2 border-border"
            align="start"
          >
            <Calendar
              mode="single"
              selected={parsedDate}
              onSelect={handleDateSelect}
              className="rounded-md border-none"
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="relative flex items-center shrink-0">
        <Clock className="absolute left-3 size-4 text-muted-foreground pointer-events-none z-10" />
        <Input
          type="time"
          value={timeString}
          onChange={handleTimeChange}
          className="h-10 pl-9 bg-background appearance-none transition-all w-28 focus:ring-2 focus:ring-primary/20"
        />
      </div>
    </div>
  );
}
