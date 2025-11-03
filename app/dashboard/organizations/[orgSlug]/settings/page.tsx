import React from "react";

export default function OrganizationSettingsPage({ params }: { params: { orgSlug: string } }) {
  const { orgSlug } = params;

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-xl font-bold">Settings for {orgSlug}</h1>
      <p>This is the settings page for the organization.</p>
    </div>
  );
}
