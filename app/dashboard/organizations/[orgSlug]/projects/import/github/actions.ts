import { createServerClient } from '@/lib/supabaseServer';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { UUID } from 'crypto'; // Import UUID type

interface ImportGitHubProjectProps {
  orgSlug: string;
  organizationId: UUID; // Use UUID for organizationId
  repoId: number;
  repoFullName: string;
  repoHtmlUrl: string;
  repoDescription: string | null;
}

export async function importGitHubProject({ orgSlug, organizationId, repoId, repoFullName, repoHtmlUrl, repoDescription }: ImportGitHubProjectProps) {
  'use server';

  const supabase = await createServerClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login'); // Redirect to login if not authenticated
  }

  // Check if the user is a member of the organization
  const { data: organizationMember, error: memberError } = await supabase
    .from('organization_members')
    .select('role') // Select role to check for admin/owner if needed in future
    .eq('organization_id', organizationId) // Use organization_id here
    .eq('user_id', user.id)
    .single();

  if (memberError || !organizationMember) {
    console.error('User is not a member of this organization or error fetching member status:', memberError);
    redirect(`/dashboard/organizations/${orgSlug}/projects`); // Redirect if not authorized
  }

  // Insert the new project into the 'projects' table
  const { data: newProject, error } = await supabase
    .from('projects')
    .insert({
      name: repoFullName.split('/')[1], // Use repo name as project name
      slug: repoFullName.split('/')[1].toLowerCase().replace(/[^a-z0-9-]+/g, '').replace(/^-+|-+$/g, ''), // Generate a slug
      description: repoDescription,
      organization_id: organizationId, // Use organization_id here
      github_repo_id: repoId,
      github_repo_full_name: repoFullName,
      github_repo_url: repoHtmlUrl,
      visibility: 'private', // Set a default visibility
      created_by: user.id, // Assuming created_by is part of your projects table and references auth.users.id
    })
    .select()
    .single();

  if (error) {
    console.error('Error importing GitHub project:', error);
    redirect(`/dashboard/organizations/${orgSlug}/projects?error=import_failed`); // Redirect with error
  }

  revalidatePath(`/dashboard/organizations/${orgSlug}/projects`);
  revalidatePath(`/dashboard/organizations/${orgSlug}/projects/${newProject.slug}`);
  redirect(`/dashboard/organizations/${orgSlug}/projects/${newProject.slug}`);
}
