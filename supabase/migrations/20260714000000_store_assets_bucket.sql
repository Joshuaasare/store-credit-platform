-- Store assets bucket for merchant logos + cover images.
-- Public bucket: objects are readable via their public URL without auth.
-- Writes happen through the backend with the service-role key (bypasses RLS),
-- so no public-write policy is needed.

insert into storage.buckets (id, name, public)
values ('store-assets', 'store-assets', true)
on conflict (id) do nothing;