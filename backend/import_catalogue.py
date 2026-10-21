"""
Load the medicine catalogue CSV into a new table called medicine_catalogue.

Run it once from the backend folder (venv active):

    python import_catalogue.py "C:\\path\\to\\A_Z_medicines_dataset_of_India.csv"

It does NOT touch your existing medicines table. Running it again replaces
the catalogue with the file you give it.
"""
import csv
import re
import sys

from sqlalchemy import text

from app.database import engine

CREATE = """
CREATE TABLE IF NOT EXISTS medicine_catalogue (
    catalogue_id  SERIAL PRIMARY KEY,
    name          TEXT NOT NULL,
    manufacturer  TEXT,
    med_type      TEXT,
    pack_size     TEXT,
    composition   TEXT,
    generic       TEXT,
    price         NUMERIC(10, 2),
    discontinued  BOOLEAN DEFAULT FALSE
);
CREATE INDEX IF NOT EXISTS idx_cat_name ON medicine_catalogue (LOWER(name) text_pattern_ops);
CREATE INDEX IF NOT EXISTS idx_cat_generic ON medicine_catalogue (generic);
"""

COMPOSITION_NAME = re.compile(r"^\s*([^()]+?)\s*(?:\(|$)")


def clean(value):
    return re.sub(r"\s+", " ", (value or "")).strip()


def column(row, start):
    """Value of the first column whose header starts with `start` (e.g. 'price')."""
    for key, value in row.items():
        if key and key.strip().lower().startswith(start):
            return value
    return None


def to_number(value):
    try:
        return float(str(value).replace(",", "").strip())
    except ValueError:
        return None


def main(path):
    with open(path, newline="", encoding="utf-8-sig") as handle:
        reader = csv.DictReader(handle)
        rows = []

        for row in reader:
            name = clean(column(row, "name"))
            if not name:
                continue

            parts = [clean(column(row, "short_composition1")), clean(column(row, "short_composition2"))]
            parts = [p for p in parts if p]
            composition = " + ".join(parts)

            generic = None
            if parts:
                match = COMPOSITION_NAME.match(parts[0])
                generic = match.group(1).strip().lower() if match else None

            rows.append(
                (
                    name,
                    clean(column(row, "manufacturer")),
                    clean(column(row, "type")),
                    clean(column(row, "pack_size")),
                    composition,
                    generic,
                    to_number(column(row, "price")),
                    str(column(row, "is_discontinued")).strip().lower() == "true",
                )
            )

    print(f"Read {len(rows)} medicines from the file.")

    connection = engine.raw_connection()
    try:
        cursor = connection.cursor()

        for statement in CREATE.strip().split(";"):
            if statement.strip():
                cursor.execute(statement)

        cursor.execute("TRUNCATE medicine_catalogue RESTART IDENTITY")

        from psycopg2.extras import execute_values

        execute_values(
            cursor,
            "INSERT INTO medicine_catalogue "
            "(name, manufacturer, med_type, pack_size, composition, generic, price, discontinued) "
            "VALUES %s",
            rows,
            page_size=2000,
        )

        connection.commit()
        print("Done. The catalogue is ready.")
    finally:
        connection.close()


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print('Usage: python import_catalogue.py "path\\to\\file.csv"')
        sys.exit(1)

    main(sys.argv[1])
