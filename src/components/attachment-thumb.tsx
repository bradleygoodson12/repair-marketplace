import { filenameFromUrl, isPdfUrl } from '@/lib/attachments';

export function AttachmentThumb({ url, onRemove }: { url: string; onRemove?: () => void }) {
  const isPdf = isPdfUrl(url);

  return (
    <div className="group relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-lg border border-gray-200">
      {isPdf ? (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-full w-full flex-col items-center justify-center gap-1 bg-gray-50 px-2 text-center hover:bg-gray-100"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-6 w-6 text-gray-500">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
            />
          </svg>
          <span className="line-clamp-2 text-[10px] font-medium text-gray-600">{filenameFromUrl(url)}</span>
        </a>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="Attachment" className="h-full w-full object-cover" />
      )}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="absolute right-0.5 top-0.5 rounded-full bg-black/60 px-1.5 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100"
          aria-label="Remove attachment"
        >
          ×
        </button>
      )}
    </div>
  );
}
