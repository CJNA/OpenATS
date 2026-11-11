"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ReplyToInputProps {
  value: string;
  onChange: (value: string) => void;
}

/** Where candidates' replies to this job's automatic emails go. Never shown to the public. */
export function ReplyToInput({ value, onChange }: ReplyToInputProps) {
  return (
    <div className="space-y-2.5">
      <Label
        htmlFor="job-reply-to"
        className="text-sm font-semibold text-slate-700 dark:text-neutral-300"
      >
        Replies go to <span className="font-normal text-slate-500 dark:text-neutral-400">(optional)</span>
      </Label>
      <Input
        id="job-reply-to"
        type="email"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="For example jay@example.com"
        aria-describedby="job-reply-to-help"
        className="h-10! bg-gray-100 dark:bg-neutral-800 border border-slate-300 dark:border-neutral-600 shadow-none rounded-lg placeholder:text-slate-400 dark:placeholder:text-neutral-500 focus-visible:ring-0"
      />
      <p id="job-reply-to-help" className="text-xs text-slate-500 dark:text-neutral-400">
        When a candidate replies to an automatic email about this job, the reply goes here.
        Leave it empty to send replies to your company&apos;s sending address. Emails you write
        yourself always take replies to you.
      </p>
    </div>
  );
}
