import { useState } from 'react';

function getPhotoCandidates(value?: string | null): string[] {
  const raw = value?.trim() || '';
  if (!raw) return [];

  try {
    const url = new URL(raw);
    const hostname = url.hostname.toLowerCase();

    if (hostname === 'drive.google.com' || hostname === 'www.drive.google.com') {
      const pathMatch = url.pathname.match(/\/file\/d\/([^/]+)/);
      const id = pathMatch?.[1] || url.searchParams.get('id');

      if (id) {
        const encodedId = encodeURIComponent(id);
        return [
          `https://drive.google.com/thumbnail?id=${encodedId}&sz=w400`,
          `https://drive.google.com/uc?export=view&id=${encodedId}`,
        ];
      }
    }

    return [raw];
  } catch {
    return [];
  }
}

export function ProfileAvatar({
  photoURL,
  name,
  size = 'md',
  className = '',
}: {
  photoURL?: string | null;
  name?: string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const candidates = getPhotoCandidates(photoURL);
  const [candidateIndex, setCandidateIndex] = useState(0);
  const [failed, setFailed] = useState(false);

  const sizeClass = size === 'lg' ? 'h-24 w-24 text-4xl' : size === 'sm' ? 'h-9 w-9 text-sm' : 'h-10 w-10 text-sm';
  const initials = (name?.trim() || 'User').charAt(0).toUpperCase();
  const src = candidates[candidateIndex];

  if (!src || failed) {
    return (
      <div
        className={`flex shrink-0 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-800 ring-1 ring-blue-200 ${sizeClass} ${className}`}
        aria-label={name || 'User'}
      >
        {initials}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={name || 'Profile'}
      className={`shrink-0 rounded-full object-cover ring-2 ring-blue-100 ${sizeClass} ${className}`}
      referrerPolicy="no-referrer"
      onError={() => {
        if (candidateIndex < candidates.length - 1) setCandidateIndex((index) => index + 1);
        else setFailed(true);
      }}
    />
  );
}
