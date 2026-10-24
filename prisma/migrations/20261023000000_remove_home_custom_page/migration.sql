-- The site home page is owned by the Homepage Customizer (slug 'home' is lazily
-- re-seeded by findBySlug and hidden from the Custom Pages Builder list).
DELETE FROM "page_section"
  WHERE "custom_page_id" IN (SELECT "id" FROM "custom_page" WHERE "slug" = 'home');
DELETE FROM "custom_page" WHERE "slug" = 'home';
