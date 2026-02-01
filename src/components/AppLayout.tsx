import { ReactNode } from 'react';
import { SidebarProvider, SidebarTrigger, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { CampaignFloatingStatus } from '@/components/CampaignFloatingStatus';
import { CampaignModal } from '@/components/CampaignModal';
import { ImportFloatingStatus } from '@/components/ImportFloatingStatus';
import { ImportModal } from '@/components/ImportModal';
import { BulkOperationFloatingStatus } from '@/components/BulkOperationFloatingStatus';
import { BulkOperationModal } from '@/components/BulkOperationModal';
import { ModeToggle } from '@/components/mode-toggle';

interface AppLayoutProps {
  children: ReactNode;
  title?: string;
}

export function AppLayout({ children, title }: AppLayoutProps) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-border/30 bg-background/80 backdrop-blur-xl px-6 py-4 shrink-0">
          <div className="flex items-center gap-4">
            <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
            {title && <h1 className="text-xl font-semibold">{title}</h1>}
          </div>
          <ModeToggle />
        </header>
        <div className="flex-1 overflow-y-auto p-6">{children}</div>
      </SidebarInset>
      <CampaignFloatingStatus />
      <CampaignModal />
      <ImportFloatingStatus />
      <ImportModal />
      <BulkOperationFloatingStatus />
      <BulkOperationModal />
    </SidebarProvider>
  );
}
