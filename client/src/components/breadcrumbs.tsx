import { ChevronRight, Home } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  href: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  return (
    <nav aria-label="Breadcrumb" className="py-4">
      <ol className="flex items-center space-x-2 text-sm text-slate-400" itemScope itemType="https://schema.org/BreadcrumbList">
        <li itemProp="itemListElement" itemScope itemType="https://schema.org/ListItem">
          <a 
            href="/" 
            itemProp="item"
            className="flex items-center hover:text-cyan-400 transition-colors" 
            data-testid="breadcrumb-home"
          >
            <Home className="h-4 w-4" />
            <span className="sr-only" itemProp="name">Home</span>
          </a>
          <meta itemProp="position" content="1" />
        </li>
        
        {items.map((item, index) => (
          <li key={item.href} className="flex items-center" itemProp="itemListElement" itemScope itemType="https://schema.org/ListItem">
            <ChevronRight className="h-4 w-4 mx-2" />
            {index === items.length - 1 ? (
              <>
                <span className="text-cyan-400 font-medium" itemProp="name" data-testid={`breadcrumb-${index}`}>
                  {item.label}
                </span>
                <meta itemProp="item" content={`https://typemaster-ai.replit.app${item.href}`} />
              </>
            ) : (
              <a 
                href={item.href} 
                itemProp="item"
                className="hover:text-cyan-400 transition-colors" 
                data-testid={`breadcrumb-${index}`}
              >
                <span itemProp="name">{item.label}</span>
              </a>
            )}
            <meta itemProp="position" content={String(index + 2)} />
          </li>
        ))}
      </ol>
    </nav>
  );
}
