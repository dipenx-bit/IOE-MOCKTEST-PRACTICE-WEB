"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";

export interface Breadcrumb {
  label: string;
  href?: string;
}

interface BreadcrumbNavProps {
  items: Breadcrumb[];
  className?: string;
}

export function BreadcrumbNav({ items, className = "" }: BreadcrumbNavProps) {
  return (
    <nav className={`flex items-center gap-1 text-sm text-gray-600 ${className}`} aria-label="Breadcrumb">
      {items.map((item, index) => (
        <div key={index} className="flex items-center gap-1">
          {index > 0 && <ChevronRight className="h-4 w-4 text-gray-400 mx-1" />}
          {item.href ? (
            <Link href={item.href} className="text-blue-600 hover:text-blue-800 hover:underline transition-colors">
              {item.label}
            </Link>
          ) : (
            <span className="text-gray-900 font-medium">{item.label}</span>
          )}
        </div>
      ))}
    </nav>
  );
}
