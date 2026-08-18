import { Head, Link } from '@inertiajs/react';
import {
    Battery,
    Car,
    Fuel,
    Gauge,
    MapPin,
    Shield,
    Sparkles,
    Wrench,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslation } from '@/hooks/use-translation';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

interface VehicleItem {
    id: number;
    sql_id: number;
    name: string;
    model: string | null;
    x: number;
    y: number;
    z: number;
    engine_condition: number;
    fuel_level: number;
    battery_charge: number;
    last_seen_at: string | null;
}

interface Props {
    vehicles: VehicleItem[];
}

export default function PortalVehiclesPage({ vehicles }: Props) {
    const { t } = useTranslation();

    const breadcrumbs: BreadcrumbItem[] = [
        { title: t('nav.player_portal'), href: '/portal' },
        { title: t('portal.vehicles.title'), href: '/portal/vehicles' },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('portal.vehicles.title')} />

            <div className="space-y-6 p-6">
                {/* Header */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                            <Car className="size-7 text-primary" />
                            {t('portal.vehicles.title')}
                        </h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            {t('portal.vehicles.subtitle')}
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <Badge variant="outline" className="px-3 py-1.5 text-sm gap-1.5">
                            <Car className="size-4 text-primary" />
                            {vehicles.length} Xe đã Claim
                        </Badge>
                    </div>
                </div>

                {/* Vehicle Cards Grid */}
                {vehicles.length === 0 ? (
                    <Card className="py-16 text-center">
                        <CardContent className="space-y-3">
                            <Car className="mx-auto size-12 text-muted-foreground/50" />
                            <p className="text-base font-semibold">{t('portal.vehicles.no_vehicles')}</p>
                            <p className="text-xs text-muted-foreground max-w-md mx-auto">
                                Sử dụng <strong>Claim Orb</strong> trong game để đăng ký quyền sở hữu phương tiện của bạn.
                            </p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {vehicles.map((v) => (
                            <Card key={v.id} className="hover:border-primary/50 transition-all flex flex-col justify-between">
                                <CardHeader className="pb-3">
                                    <div className="flex items-center justify-between">
                                        <Badge variant="default" className="gap-1">
                                            <Shield className="size-3" />
                                            Đã bảo vệ (AVCS)
                                        </Badge>
                                        <span className="font-mono text-xs text-muted-foreground">
                                            ID: #{v.sql_id}
                                        </span>
                                    </div>
                                    <CardTitle className="text-lg font-bold pt-2 flex items-center gap-2">
                                        <Car className="size-5 text-primary" />
                                        {v.name}
                                    </CardTitle>
                                    <CardDescription className="text-xs font-mono">
                                        {v.model || 'Base.Car'}
                                    </CardDescription>
                                </CardHeader>

                                <CardContent className="space-y-4">
                                    {/* Stats grid */}
                                    <div className="grid grid-cols-3 gap-2 rounded-lg border bg-muted/40 p-3 text-center">
                                        <div>
                                            <div className="flex items-center justify-center gap-1 text-[11px] text-muted-foreground">
                                                <Gauge className="size-3 text-blue-500" />
                                                Động cơ
                                            </div>
                                            <span className={`text-sm font-bold ${v.engine_condition < 30 ? 'text-red-500' : 'text-foreground'}`}>
                                                {Math.round(v.engine_condition)}%
                                            </span>
                                        </div>

                                        <div>
                                            <div className="flex items-center justify-center gap-1 text-[11px] text-muted-foreground">
                                                <Fuel className="size-3 text-amber-500" />
                                                Xăng
                                            </div>
                                            <span className="text-sm font-bold text-foreground">
                                                {Math.round(v.fuel_level)}%
                                            </span>
                                        </div>

                                        <div>
                                            <div className="flex items-center justify-center gap-1 text-[11px] text-muted-foreground">
                                                <Battery className="size-3 text-emerald-500" />
                                                Ắc quy
                                            </div>
                                            <span className="text-sm font-bold text-foreground">
                                                {Math.round(v.battery_charge)}%
                                            </span>
                                        </div>
                                    </div>

                                    {/* Location */}
                                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                                        <span className="flex items-center gap-1 font-mono">
                                            <MapPin className="size-3.5 text-primary" />
                                            X: {Math.round(v.x)}, Y: {Math.round(v.y)}
                                        </span>
                                        <span>
                                            {v.last_seen_at ? new Date(v.last_seen_at).toLocaleTimeString() : '—'}
                                        </span>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
