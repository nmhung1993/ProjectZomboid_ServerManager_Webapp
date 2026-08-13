import { Breadcrumbs } from '@/components/breadcrumbs';
import { LanguageSwitcher } from '@/components/language-switcher';
import { SidebarTrigger } from '@/components/ui/sidebar';
import type { BreadcrumbItem as BreadcrumbItemType } from '@/types';

export function AppSidebarHeader({
    breadcrumbs = [],
}: {
    breadcrumbs?: BreadcrumbItemType[];
}) {
    return (
        <header className="flex h-[72px] shrink-0 items-center justify-between gap-2 border-b border-border/60 bg-background/95 px-5 backdrop-blur transition-[width,height] ease-linear md:px-8">
            <div className="flex min-w-0 items-center gap-3">
                <SidebarTrigger className="size-9 rounded-xl" />
                <Breadcrumbs breadcrumbs={breadcrumbs} />
            </div>
            <LanguageSwitcher />
        </header>
    );
}
