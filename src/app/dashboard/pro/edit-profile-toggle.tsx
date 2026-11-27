'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { PortfolioPhoto } from '@/components/portfolio-photo-uploader';

import { ProProfileForm } from './profile-form';

interface CategoryOption {
  id: string;
  name: string;
}

interface ProfileValues {
  businessName: string;
  bio: string;
  yearsExperience: number;
  hourlyRateCents: number | null;
  serviceZip: string;
  serviceRadiusMiles: number;
  categoryIds: string[];
  photoUrl: string | null;
  licenseNumber: string | null;
  isLicensed: boolean;
  isInsured: boolean;
  licenseDocumentUrls: string[];
  portfolioPhotos: PortfolioPhoto[];
}

export function EditProfileToggle({
  categories,
  initialValues,
  fullCategoryIds = [],
  waitlistedCategoryIds = [],
}: {
  categories: CategoryOption[];
  initialValues: ProfileValues;
  fullCategoryIds?: string[];
  waitlistedCategoryIds?: string[];
}) {
  const searchParams = useSearchParams();
  const openOnLoad = searchParams.get('editProfile') === 'portfolio';
  const [editing, setEditing] = useState(openOnLoad);

  // Lets a link elsewhere on the dashboard (e.g. the "add portfolio photos"
  // nudge) deep-link straight into this form, already open and scrolled to
  // the right section, instead of making the pro find and click "Edit
  // business profile" themselves first. A plain `useState(openOnLoad)`
  // initializer only captures the value at first mount — this component
  // stays mounted across a same-page client navigation (only the query
  // string changes), so an effect is needed to react to openOnLoad flipping
  // true afterward too, not just on first render.
  useEffect(() => {
    if (openOnLoad) setEditing(true);
  }, [openOnLoad]);

  useEffect(() => {
    if (!editing || !openOnLoad) return;
    const id = requestAnimationFrame(() => {
      document.getElementById('portfolio-photos')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    return () => cancelAnimationFrame(id);
  }, [editing, openOnLoad]);

  if (!editing) {
    return (
      <Button type="button" variant="outline" size="sm" onClick={() => setEditing(true)}>
        Edit business profile
      </Button>
    );
  }

  return (
    <Card className="mb-8">
      <CardContent>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Edit business profile</h2>
          <button type="button" onClick={() => setEditing(false)} className="text-sm text-gray-400 hover:text-gray-600">
            Close
          </button>
        </div>
        <ProProfileForm
          categories={categories}
          initialValues={initialValues}
          fullCategoryIds={fullCategoryIds}
          waitlistedCategoryIds={waitlistedCategoryIds}
          onSaved={() => setEditing(false)}
        />
      </CardContent>
    </Card>
  );
}
