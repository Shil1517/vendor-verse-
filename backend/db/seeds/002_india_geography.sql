-- India launch geography (F-GEO-01, D-008): Jaipur, Ajmer, Sikar and Delhi NCR.
-- Every market is seeded NOT LIVE. Going live is an admin action on
-- market_activations (F-GEO-03, CFG-13); this seed never activates a market.
-- Idempotent: safe to re-run.
INSERT INTO countries (iso_code, name, localized_names)
VALUES ('IN', 'India', '{"hi": "भारत"}'::jsonb)
ON CONFLICT (iso_code) DO NOTHING;

INSERT INTO regions (country_id, name, localized_names, region_type)
SELECT c.id, v.name, v.localized_names, v.region_type
FROM countries c
CROSS JOIN (VALUES
    ('Rajasthan', '{"hi": "राजस्थान"}'::jsonb, 'state'),
    ('Delhi', '{"hi": "दिल्ली"}'::jsonb, 'union_territory')
) AS v(name, localized_names, region_type)
WHERE c.iso_code = 'IN'
ON CONFLICT (country_id, name) DO NOTHING;

INSERT INTO cities (country_id, region_id, name, localized_names, time_zone)
SELECT c.id, r.id, v.city, v.localized_names, 'Asia/Kolkata'
FROM countries c
JOIN regions r ON r.country_id = c.id
JOIN (VALUES
    ('Rajasthan', 'Jaipur', '{"hi": "जयपुर"}'::jsonb),
    ('Rajasthan', 'Ajmer', '{"hi": "अजमेर"}'::jsonb),
    ('Rajasthan', 'Sikar', '{"hi": "सीकर"}'::jsonb),
    ('Delhi', 'Delhi NCR', '{"hi": "दिल्ली एनसीआर"}'::jsonb)
) AS v(region, city, localized_names) ON v.region = r.name
WHERE c.iso_code = 'IN'
  AND NOT EXISTS (
      SELECT 1 FROM cities x
      WHERE x.country_id = c.id AND x.region_id = r.id AND x.name = v.city
  );

INSERT INTO market_activations (country_id, city_id, status)
SELECT c.country_id, c.id, 'not_live'
FROM cities c
JOIN countries co ON co.id = c.country_id AND co.iso_code = 'IN'
WHERE NOT EXISTS (SELECT 1 FROM market_activations m WHERE m.city_id = c.id);
