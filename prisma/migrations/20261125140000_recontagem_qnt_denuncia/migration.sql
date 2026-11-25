-- Recount qnt_denuncia from the reports: the report endpoint incremented it twice on the
-- first report of an authorized review. Only the reviews with a wrong counter change.
UPDATE "Review" r
SET "qnt_denuncia" = c.total
FROM (
    SELECT r2."id", COUNT(d."id")::int AS total
    FROM "Review" r2
    LEFT JOIN "Denuncia" d ON d."id_review" = r2."id"
    GROUP BY r2."id"
) c
WHERE c."id" = r."id" AND r."qnt_denuncia" <> c.total;
