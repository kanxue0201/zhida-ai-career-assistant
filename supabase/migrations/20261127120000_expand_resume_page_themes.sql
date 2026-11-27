-- Allow the eight structural resume themes supported by the application.
alter table public.resume_pages
  drop constraint resume_pages_theme_check;

alter table public.resume_pages
  add constraint resume_pages_theme_check
  check (theme in (
    'clean-pro',
    'product-launch',
    'creative-portfolio',
    'enterprise-tech',
    'editorial-story',
    'career-timeline',
    'minimal-swiss',
    'developer-docs'
  ));
