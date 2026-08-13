import { usePage } from '@inertiajs/react';
import { Skull } from 'lucide-react';

export default function AppLogo() {
    const { site } = usePage().props;

    return (
        <>
            <div className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-primary text-primary-foreground shadow-soft">
                {site.logo_url ? (
                    <img src={site.logo_url} alt={site.name} className="size-9 object-contain" />
                ) : (
                    <Skull className="size-5" />
                )}
            </div>
            <div className="ml-1 grid flex-1 text-left text-sm">
                <span className="mb-0.5 truncate leading-tight font-semibold">
                    {site.name}
                </span>
            </div>
        </>
    );
}
