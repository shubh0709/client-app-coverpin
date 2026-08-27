'use client';

import { CircleHelpIcon, ExternalLinkIcon, MailIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

const PORTFOLIO_URL = 'https://singhshubham.com/';
const CONTACT_EMAIL = 'shubhsingh0709@gmail.com';

export function HelpContact() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label="Help and contact">
          <CircleHelpIcon />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Help &amp; Contact</DialogTitle>
          <DialogDescription>
            Running into an issue or have a question about this project? Reach out.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          <Button asChild variant="outline" className="justify-start">
            <a href={PORTFOLIO_URL} target="_blank" rel="noopener noreferrer">
              <ExternalLinkIcon /> Portfolio
            </a>
          </Button>
          <Button asChild variant="outline" className="justify-start">
            <a href={`mailto:${CONTACT_EMAIL}`}>
              <MailIcon /> {CONTACT_EMAIL}
            </a>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
