CREATE TABLE IF NOT EXISTS imdb.title_ratings_indexed2 AS (
  SELECT
    *
  FROM
    imdb.title_ratings
);
CREATE INDEX IF NOT EXISTS title_ratings_idx2 ON imdb.title_ratings_indexed2 (averagerating);