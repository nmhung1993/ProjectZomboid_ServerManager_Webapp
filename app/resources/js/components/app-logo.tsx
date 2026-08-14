import { usePage } from '@inertiajs/react';
import { Skull } from 'lucide-react';

export default function AppLogo() {
    const { site } = usePage().props;

    return (
        <>
            <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-transparent text-primary transition-transform duration-200 group-hover/logo:scale-105 group-data-[collapsible=icon]:size-8">
                {site.logo_url ? (
                    <img src={site.logo_url} alt={site.name} className="size-10 object-contain group-data-[collapsible=icon]:size-8" />
                ) : (
                    <Skull className="size-5" strokeWidth={2.5} />
                )}
            </div>
            <div className="ml-1 grid flex-1 text-left text-sm group-data-[collapsible=icon]:hidden">
                <span className="mb-0.5 truncate text-[15px] leading-tight font-bold tracking-[-0.01em]">
                    {site.name}
                </span>
            </div>
        </>
    );
}
