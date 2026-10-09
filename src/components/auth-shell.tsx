import { Logo } from '@/components/logo';

const pitchPoints = ['Verified pro profiles', 'Free, no-obligation quotes', 'Message pros directly'];

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[calc(100vh-15rem)] flex-col md:flex-row">
      <div className="hidden flex-col justify-center bg-gray-950 px-12 py-16 md:flex md:w-2/5">
        <Logo size={32} className="text-2xl" />
        <p className="mt-4 max-w-xs text-gray-400">
          Home repairs, handled by trusted local pros. Get quotes, compare pros, and book with confidence.
        </p>
        <ul className="mt-8 flex flex-col gap-3">
          {pitchPoints.map((point) => (
            <li key={point} className="flex items-center gap-2 text-sm text-gray-300">
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 flex-shrink-0 text-brand-400">
                <path
                  fillRule="evenodd"
                  d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                  clipRule="evenodd"
                />
              </svg>
              {point}
            </li>
          ))}
        </ul>
      </div>
      <div className="flex flex-1 items-center justify-center bg-gray-50 px-4 py-16">{children}</div>
    </div>
  );
}
