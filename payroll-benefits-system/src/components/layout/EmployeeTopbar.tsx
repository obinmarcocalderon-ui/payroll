import { GlobalSearch } from './GlobalSearch';
import { EmployeeNotificationBell } from './EmployeeNotificationBell';
import { ThemeToggle } from './ThemeToggle';
import { AccountMenu } from './AccountMenu';

interface EmployeeTopbarProps {
  title: string;
  subtitle?: string;
}

export function EmployeeTopbar({ title, subtitle }: EmployeeTopbarProps) {
  return (
    <header className="flex items-center justify-between gap-4 border-b border-line bg-surface px-8 py-5">
      <div className="min-w-0">
        <h1 className="truncate text-xl font-bold text-ink-900">{title}</h1>
        {subtitle && <p className="text-sm text-ink-500">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-4">
        <GlobalSearch />
        <EmployeeNotificationBell />
        <ThemeToggle />
        <AccountMenu />
      </div>
    </header>
  );
}
