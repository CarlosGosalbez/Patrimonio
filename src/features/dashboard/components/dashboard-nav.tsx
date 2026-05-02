"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/shared/lib/supabase/client";
import { Button } from "@/shared/components/ui/button";
import {
    Home,
    CreditCard,
    TrendingUp,
    FileText,
    Settings,
    LogOut,
} from "lucide-react";
import { cn } from "@/shared/lib/utils";
import type { User } from "@supabase/supabase-js";

interface DashboardNavProps {
    user: User;
}

const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: Home },
    { href: "/dashboard/accounts", label: "Cuentas", icon: CreditCard },
    { href: "/dashboard/portfolio", label: "Cartera", icon: TrendingUp },
    { href: "/dashboard/transactions", label: "Transacciones", icon: FileText },
    { href: "/dashboard/settings", label: "Ajustes", icon: Settings },
];

export function DashboardNav({ user }: DashboardNavProps) {
    const router = useRouter();
    const pathname = usePathname();

    const handleLogout = async () => {
        const supabase = createClient();
        await supabase.auth.signOut();
        router.push("/auth/login");
        router.refresh();
    };

    return (
        <nav className="border-b bg-background">
            <div className="container mx-auto flex items-center justify-between p-4">
                <div className="flex items-center gap-6">
                    <Link href="/dashboard" className="text-xl font-bold">
                        Patrimonio
                    </Link>
                    <div className="hidden gap-1 md:flex">
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = pathname === item.href;
                            return (
                                <Link key={item.href} href={item.href}>
                                    <Button
                                        variant={isActive ? "secondary" : "ghost"}
                                        className={cn(
                                            "gap-2",
                                            isActive && "bg-secondary"
                                        )}
                                        aria-label={item.label}
                                        aria-current={isActive ? "page" : undefined}
                                    >
                                        <Icon className="h-4 w-4" />
                                        <span className="hidden lg:inline">{item.label}</span>
                                    </Button>
                                </Link>
                            );
                        })}
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="hidden text-sm md:block">
                        <p className="font-medium">{user.email}</p>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleLogout}
                        aria-label="Cerrar sesión"
                    >
                        <LogOut className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Mobile Navigation */}
            <div className="flex gap-1 overflow-x-auto p-2 md:hidden">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href;
                    return (
                        <Link key={item.href} href={item.href}>
                            <Button
                                variant={isActive ? "secondary" : "ghost"}
                                size="sm"
                                className="gap-2"
                                aria-label={item.label}
                                aria-current={isActive ? "page" : undefined}
                            >
                                <Icon className="h-4 w-4" />
                                {item.label}
                            </Button>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
