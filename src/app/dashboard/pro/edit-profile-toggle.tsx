'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

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
}

export function EditProfileToggle({
  categories,
  initialValues,
}: {
  categories: CategoryOption[];
  initialValues: ProfileValues;
}) {
  const [editing, setEditing] = useState(false);

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
        <ProProfileForm categories={categories} initialValues={initialValues} onSaved={() => setEditing(false)} />
      </CardContent>
    </Card>
  );
}
