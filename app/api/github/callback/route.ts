import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabaseServer'; // Adjust path if necessary

export async function GET(req: NextRequest) {
  const supabase = await createServerClient();

  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const installation_id = searchParams.get('installation_id');
  const setup_action = searchParams.get('setup_action');
  const state = searchParams.get('state');

  // Basic validation
  if (!installation_id || !setup_action || !state) {
    console.error('Missing required query parameters for GitHub App callback.');
    // Redirect to a generic error page or back to projects page with an error
    return NextResponse.redirect(new URL('/dashboard/error', req.url));
  }

  let orgSlug: string | undefined;
  let organizationId: string | undefined; // Declare organizationId
  try {
    const parsedState = JSON.parse(decodeURIComponent(state));
    orgSlug = parsedState.orgSlug;
  } catch (error) {
    console.error('Failed to parse state parameter:', error);
    return NextResponse.redirect(new URL('/dashboard/error', req.url));
  }

  // Fetch organization_id using orgSlug
  if (orgSlug) {
    const { data: orgData, error: orgError } = await supabase
      .from('organizations')
      .select('id')
      .eq('slug', orgSlug)
      .single();

    if (orgError || !orgData) {
      console.error('Error fetching organization ID:', orgError);
      return NextResponse.redirect(new URL('/dashboard/error', req.url));
    }
    organizationId = orgData.id;
  }

  // Handle different setup actions (e.g., "install", "update", "request")
  if (setup_action === 'install') {
    if (!organizationId) {
      console.error('Organization ID not found for GitHub App installation.');
      return NextResponse.redirect(new URL('/dashboard/error', req.url));
    }

    console.log(`GitHub App installed for organization slug: ${orgSlug}, Installation ID: ${installation_id}`);

    const { error } = await supabase
      .from('github_app_installations') // Your table name
      .upsert({
        organization_id: organizationId, // Use organization_id here
        installation_id: installation_id,
        // other relevant data like user_id, installed_at etc.
      }, { onConflict: 'organization_id' }); // Use organization_id for conflict resolution

    if (error) {
      console.error('Error saving GitHub App installation:', error);
      return NextResponse.redirect(new URL('/dashboard/error', req.url));
    }

  } else if (setup_action === 'update') {
    console.log(`GitHub App updated for organization slug: ${orgSlug}, Installation ID: ${installation_id}`);
    // Handle updates to the installation (e.g., new repositories added/removed)
  } else if (setup_action === 'request') {
    // User requested to install the app
    console.log(`GitHub App installation requested for organization slug: ${orgSlug}`);
  }

  // Redirect the user back to the projects page for the specific organization
  if (orgSlug) {
    return NextResponse.redirect(new URL(`/dashboard/organizations/${orgSlug}/projects`, req.url));
  } else {
    return NextResponse.redirect(new URL('/dashboard', req.url)); // Fallback redirect
  }
}