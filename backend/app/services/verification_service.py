"""
Compares the text read from a medicine pack with the medicines table.

Every check is True (agrees with the database), False (disagrees) or
None (could not be checked, for example the batch was not readable).

The medicines table keeps the strength inside the name ("Paracetamol 500mg"),
so this file splits it into a base name ("Paracetamol") and a strength ("500mg").

IMPORTANT: this gives EVIDENCE only. "Match" means the printed details agree
with your database. It does not prove the medicine is genuine.
"""
import re
from datetime import date
from decimal import Decimal

from sqlalchemy import text

from app.services.barcode_reader import best_code, normalize_gtin
from app.services.medicine_parser import (
    match_known_makers,
    parse_medicine_text,
    same_batch,
)

try:
    from rapidfuzz import fuzz
except ImportError:
    fuzz = None

ALL_CHECKS = [
    "medicine_found",
    "strength_match",
    "manufacturer_match",
    "batch_match",
    "mfg_date_match",
    "expiry_match",
    "expiry_valid",
    # from the barcode / QR code (None when no code could be read)
    "barcode_batch_match",
    "barcode_expiry_match",
    "barcode_gtin_match",
]

# All of these must be True for the result "Match"
CORE_CHECKS = ["medicine_found", "manufacturer_match", "batch_match", "expiry_valid"]

# Any of these being False makes the result "Suspicious"
RED_FLAG_CHECKS = [
    "strength_match",
    "manufacturer_match",
    "batch_match",
    "mfg_date_match",
    "expiry_match",
    "expiry_valid",
    "barcode_batch_match",
    "barcode_expiry_match",
    "barcode_gtin_match",
]

NOTE = (
    "These checks compare the printed text with your database. "
    "A match is evidence, not proof that a medicine is genuine."
)

# ------------------------------------------------------------------
# Risk scoring
# Points are added when a check FAILS. The weights were chosen by hand
# (they are not learned from data), so the percentage is a rule-based
# risk score, not a statistical probability that a medicine is fake.
# ------------------------------------------------------------------

RISK_POINTS = {
    "batch_match": 55,
    "expiry_valid": 50,
    "manufacturer_match": 50,
    "strength_match": 40,
    "expiry_match": 20,
    "mfg_date_match": 20,
    "barcode_batch_match": 45,
    "barcode_expiry_match": 35,
    "barcode_gtin_match": 40,
}

REASONS = {
    "batch_match": "Batch number does not match any record for this medicine",
    "expiry_valid": "The pack is expired",
    "manufacturer_match": "Manufacturer does not match the database",
    "strength_match": "Strength does not match the database",
    "expiry_match": "Expiry date differs from the database record",
    "mfg_date_match": "Manufacturing date differs from the database record",
    "barcode_batch_match": "The batch printed on the pack differs from the batch in its barcode / QR code",
    "barcode_expiry_match": "The expiry date printed on the pack differs from the one in its barcode / QR code",
    "barcode_gtin_match": "The product code in the barcode does not match this medicine in the database",
}

NOT_FOUND_POINTS = 50    # medicine missing from the database / name unreadable
CATALOGUE_BATCH_POINTS = 20  # medicine is in the catalogue but has no batch records
UNCHECKED_POINTS = 5     # an important detail could not be read from the pack
LOW_BELOW = 50           # 0-49   -> Low
HIGH_FROM = 75           # 50-74  -> Medium, 75-100 -> High

UNCHECKED_LABELS = {
    "manufacturer_match": "Manufacturer could not be checked",
    "batch_match": "Batch number could not be checked",
    "expiry_valid": "Expiry date could not be checked",
}

# 'Paracetamol 500mg' -> name 'Paracetamol', strength '500mg'
STRENGTH_AT_END = re.compile(
    r"^(.*?)[\s\-]*(\d+(?:\.\d+)?\s*(?:mg|mcg|g|kg|ml|iu))\s*$",
    re.IGNORECASE,
)

COMPANY_SUFFIXES = {"ltd", "limited", "pvt", "private", "inc", "llp"}


# ------------------------------------------------------------------
# Small helpers
# ------------------------------------------------------------------

def split_name(db_name):
    """'Paracetamol 500mg' -> ('Paracetamol', '500mg'); 'Ibuprofen' -> ('Ibuprofen', None)."""
    db_name = (db_name or "").strip()
    match = STRENGTH_AT_END.match(db_name)

    if match and match.group(1).strip():
        return match.group(1).strip(), match.group(2).replace(" ", "")

    return db_name, None


def norm(value):
    """Lower-case letters and digits only, so '650 mg' == '650mg'."""
    return re.sub(r"[^a-z0-9]", "", str(value or "").lower())


def company_key(value):
    """Company name without punctuation and Ltd / Limited / Pvt."""
    words = re.findall(r"[a-z0-9]+", str(value or "").lower())
    return "".join(w for w in words if w not in COMPANY_SUFFIXES)


def same_company(a, b):
    """'Cipla Ltd.' == 'Cipla Limited'; small OCR slips are tolerated."""
    key_a, key_b = company_key(a), company_key(b)

    if not key_a or not key_b:
        return False

    if key_a == key_b:
        return True

    return fuzz is not None and fuzz.ratio(key_a, key_b) >= 90


def year_month(value):
    """'YYYY-MM' from a date (PostgreSQL) or a date string."""
    if value is None:
        return None
    if hasattr(value, "strftime"):
        return value.strftime("%Y-%m")
    return str(value)[:7]


def to_json(row):
    """Make a database row safe to return as JSON."""
    if row is None:
        return None

    out = {}
    for key, value in row.items():
        if isinstance(value, Decimal):
            value = float(value)
        elif hasattr(value, "isoformat"):
            value = value.isoformat()
        out[key] = value
    return out


# ------------------------------------------------------------------
# Database access
# ------------------------------------------------------------------

def load_known(db):
    """Base medicine names and manufacturers, used to correct OCR spelling."""
    raw_names = [
        r[0]
        for r in db.execute(text("SELECT DISTINCT medicine_name FROM medicines"))
        if r[0]
    ]
    names = sorted({split_name(n)[0] for n in raw_names})

    makers = [
        r[0]
        for r in db.execute(text("SELECT DISTINCT manufacturer FROM medicines"))
        if r[0]
    ]
    return names, makers


def find_rows(db, base_name):
    """
    All rows for this medicine, whatever the strength:
    'Paracetamol' finds 'Paracetamol 500mg' and 'Paracetamol 650mg'.
    """
    result = db.execute(
        text(
            "SELECT medicine_id, medicine_name, manufacturer, batch_number, "
            "mfg_date, expiry_date, mrp, barcode FROM medicines "
            "WHERE LOWER(medicine_name) = LOWER(:name) "
            "OR LOWER(medicine_name) LIKE LOWER(:name) || ' %'"
        ),
        {"name": base_name},
    )

    rows = []
    for row in result.mappings().all():
        row = dict(row)
        name, strength = split_name(row["medicine_name"])

        if name.lower() == base_name.lower():
            row["strength"] = strength
            rows.append(row)

    return rows


# ------------------------------------------------------------------
# Medicine catalogue (imported from a CSV with import_catalogue.py)
# It lists which medicines exist, who makes them and their composition.
# It has NO batch numbers, so it can recognise a product but never a batch.
# ------------------------------------------------------------------

UNIT_NUMBER = re.compile(r"(\d+(?:\.\d+)?)\s*(mg|mcg|g|ml|iu)", re.IGNORECASE)


def strengths_in(value):
    """{'500mg', '125mg'} from 'Amoxycillin (500mg) + Clavulanic Acid (125mg)'."""
    return {norm(f"{n}{u}") for n, u in UNIT_NUMBER.findall(value or "")}


def loose_same_company(a, b):
    """Like same_company, but 'Alembic' also matches 'Alembic Pharmaceuticals'."""
    if same_company(a, b):
        return True

    key_a, key_b = company_key(a), company_key(b)
    short, long_ = sorted((key_a, key_b), key=len)

    return len(short) >= 5 and short in long_


FORM_WORDS = {
    "tablet", "tablets", "capsule", "capsules", "syrup", "injection", "cream",
    "ointment", "gel", "drops", "suspension", "ip", "bp", "usp", "film", "coated",
    "strip", "of", "rx",
}

SKIP_LINE = re.compile(
    r"batch|b\.?\s*no|mfg|exp|date|mrp|price|manufactur|marketed|licen|store|dosage|each|contains",
    re.IGNORECASE,
)


def base_words(value):
    """'Azithromycin Tablets IP' -> 'Azithromycin'; keeps the brand/generic words."""
    words = re.findall(r"[A-Za-z][A-Za-z\-]+", value or "")
    kept = [w for w in words if w.lower() not in FORM_WORDS]
    return " ".join(kept[:2]).strip()


def candidate_names(parsed, ocr_results):
    """Names to try in the catalogue: the parsed name first, then pack lines."""
    names = []

    def add(value):
        value = base_words(value)
        if len(value) >= 4 and value.lower() not in [n.lower() for n in names]:
            names.append(value)

    add(parsed.get("medicine_name"))

    for item in ocr_results or []:
        line = item.get("text", "")
        if not SKIP_LINE.search(line):
            add(line)
            # also the first word alone ("Azithral 500" -> "Azithral")
            first = base_words(line).split(" ")[0] if base_words(line) else ""
            if len(first) >= 5 and first.lower() not in [n.lower() for n in names]:
                names.append(first)

    return names[:12]


def query_catalogue(db, name):
    """Rows for one name, by brand then by generic name."""
    columns = (
        "catalogue_id, name, manufacturer, med_type, pack_size, composition, discontinued"
    )

    rows = db.execute(
        text(
            f"SELECT {columns} FROM medicine_catalogue "
            "WHERE LOWER(name) = LOWER(:n) OR LOWER(name) LIKE LOWER(:n) || ' %' "
            "LIMIT 200"
        ),
        {"n": name},
    ).mappings().all()

    if rows:
        return rows, "brand"

    rows = db.execute(
        text(
            f"SELECT {columns} FROM medicine_catalogue "
            "WHERE generic = LOWER(:n) LIMIT 500"
        ),
        {"n": name},
    ).mappings().all()

    return rows, "generic"


def catalogue_makers(db, parsed, ocr_results):
    """Manufacturers the catalogue lists for the names on this pack."""
    makers = set()

    try:
        for name in candidate_names(parsed, ocr_results)[:6]:
            rows, _ = query_catalogue(db, name)
            makers |= {r["manufacturer"] for r in rows if r["manufacturer"]}
            if makers:
                break
    except Exception:
        db.rollback()  # catalogue table not created yet
        return set()

    return makers


def lookup_catalogue(db, parsed, ocr_results=None):
    """
    Look the medicine up in the catalogue by brand name, then by generic name.
    Returns None when the table is missing or nothing is found.
    Fills parsed["medicine_name"] / parsed["manufacturer"] only with text
    that was actually found on the pack.
    """
    rows, found_by, used_name = [], "brand", None

    try:
        for name in candidate_names(parsed, ocr_results):
            rows, found_by = query_catalogue(db, name)
            if rows:
                used_name = name
                break
    except Exception:
        # The table has not been created yet: carry on without the catalogue
        db.rollback()
        return None

    rows = [dict(r) for r in rows]

    if not rows:
        return None

    if not parsed.get("medicine_name"):
        parsed["medicine_name"] = used_name

    # The maker is often printed over two lines: look for the catalogue's
    # makers for this product in the pack text
    if not parsed.get("manufacturer") and ocr_results:
        makers = sorted({r["manufacturer"] for r in rows if r["manufacturer"]})
        found = match_known_makers(ocr_results, makers)
        if found:
            parsed["manufacturer"] = found

    # Strength: True when it is listed, False when the listed strengths differ
    strength_match = None
    if parsed.get("strength"):
        want = norm(parsed["strength"])
        known = set()
        for r in rows:
            known |= strengths_in(r["composition"]) | strengths_in(r["name"])
        numbers = set(re.findall(r"\d+(?:\.\d+)?", " ".join(r["name"] for r in rows)))
        bare = re.sub(r"[a-z]+$", "", want)

        if want in known or bare in numbers:
            strength_match = True
        elif known:
            strength_match = False

    # Manufacturer: a difference is only a warning for a brand name
    manufacturer_match = None
    chosen = rows[0]
    if parsed.get("manufacturer"):
        same = [
            r for r in rows
            if loose_same_company(r["manufacturer"], parsed["manufacturer"])
        ]
        if same:
            manufacturer_match = True
            chosen = same[0]
        elif found_by == "brand":
            manufacturer_match = False

    return {
        "found_by": found_by,
        "strength_match": strength_match,
        "manufacturer_match": manufacturer_match,
        "entry": {
            "name": chosen["name"],
            "manufacturer": chosen["manufacturer"],
            "type": chosen["med_type"],
            "pack_size": chosen["pack_size"],
            "composition": chosen["composition"],
            "discontinued": bool(chosen["discontinued"]),
        },
    }


def save_verification(db, user_id, medicine_id, result, confidence_score, details=None):
    """
    Insert one row into the verification table and return its id.

    details (optional): what was read from the pack, e.g. the "extracted"
    dictionary from verify_medicine(). Saved so the History and My Medicines
    pages can show the name, strength, manufacturer, batch and expiry.
    """
    details = details or {}

    def clip(value, size):
        value = (str(value).strip() if value else "")
        return value[:size] or None

    row = db.execute(
        text(
            "INSERT INTO verification "
            "(user_id, medicine_id, result, confidence_score, "
            " medicine_name, strength, manufacturer, batch_number, expiry_date) "
            "VALUES (:user_id, :medicine_id, :result, :score, "
            " :medicine_name, :strength, :manufacturer, :batch_number, :expiry_date) "
            "RETURNING verification_id"
        ),
        {
            "user_id": user_id,
            "medicine_id": medicine_id,
            "result": result,
            "score": confidence_score,
            "medicine_name": clip(details.get("medicine_name"), 200),
            "strength": clip(details.get("strength"), 50),
            "manufacturer": clip(details.get("manufacturer"), 200),
            "batch_number": clip(details.get("batch_number"), 100),
            "expiry_date": clip(details.get("expiry_date"), 50),
        },
    ).first()
    db.commit()
    return row[0]


# ------------------------------------------------------------------
# Is this photo a medicine pack at all?
# ------------------------------------------------------------------

class NotAMedicinePack(Exception):
    """The photo does not look like a medicine pack (no medicine-style text)."""


# Words that only appear on medicine packaging
MEDICINE_WORDS = re.compile(
    r"\b(tablets?|capsules?|caplets?|syrup|suspension|injection|ointment|"
    r"drops|sachets?|i\.?\s?p\.?|b\.?\s?p\.?|u\.?\s?s\.?\s?p\.?|rx|"
    r"schedule\s?h1?|dosage|composition|prescription|physician|pharmacist)\b",
    re.IGNORECASE,
)

# Label words found on most packaging (not specific to medicine)
LABEL_WORDS = re.compile(
    r"\b(batch|b\.?\s?no|lot|mfg|mfd|manufactured|marketed|exp|expiry|"
    r"use\s+before|m\.?r\.?p|store|keep\s+out\s+of\s+reach)\b",
    re.IGNORECASE,
)

MG_STRENGTH = re.compile(r"\d\s*(?:mg|mcg|\u00b5g)\b", re.IGNORECASE)


def looks_like_medicine_pack(parsed, ocr_results):
    """
    True when the OCR text has medicine-style clues.

    Needs at least ONE medicine-specific clue (a known medicine name, a word
    such as tablets / capsules / I.P., or a strength in mg) PLUS at least one
    more clue of any kind (batch, dates, manufacturer, label words...).
    A drink can or a shampoo bottle has batch and date words but nothing
    medicine-specific, so it is rejected.
    """
    all_text = " ".join(
        item["text"] for item in ocr_results
        if item["confidence"] >= 0.30 and item["text"].strip()
    )

    specific = 0
    other = 0

    if parsed.get("name_source") == "database":
        specific += 1
    if MEDICINE_WORDS.search(all_text):
        specific += 1
    if MG_STRENGTH.search(all_text):
        specific += 1

    if LABEL_WORDS.search(all_text):
        other += 1
    for key in ("batch_number", "mfg_date", "expiry_date", "manufacturer", "strength"):
        if parsed.get(key):
            other += 1

    return specific >= 1 and specific + other >= 2


# ------------------------------------------------------------------
# Risk calculation
# ------------------------------------------------------------------

def compute_risk(checks, catalogue_used=False, unlisted_batch=False):
    """Return (risk_percent, risk_level, reasons) from the check results."""
    points = 0
    reasons = []
    has_mismatch = False

    for name, value in RISK_POINTS.items():
        if checks[name] is False:
            points += value
            reasons.append(REASONS[name])
            has_mismatch = True

    if catalogue_used and checks["medicine_found"]:
        points += CATALOGUE_BATCH_POINTS
        reasons.append(
            "This batch is not in our records, so it could not be verified"
            if unlisted_batch
            else "This medicine is in the catalogue, but no batch records exist, "
            "so the batch could not be verified"
        )
    elif checks["medicine_found"] is False:
        points += NOT_FOUND_POINTS
        reasons.append("Medicine was not found in the database")
    elif checks["medicine_found"] is None:
        points += NOT_FOUND_POINTS
        reasons.append("Medicine name could not be read from the pack")

    for name, label in UNCHECKED_LABELS.items():
        if name == "batch_match" and catalogue_used:
            continue  # already counted above
        if checks[name] is None:
            points += UNCHECKED_POINTS
            reasons.append(label)

    # Any detail that disagrees with the database is at least Medium risk,
    # so a "Suspicious" result is never shown as Low risk.
    if has_mismatch:
        points = max(points, LOW_BELOW)

    risk_percent = min(100, points)

    if risk_percent >= HIGH_FROM:
        level = "High"
    elif risk_percent >= LOW_BELOW:
        level = "Medium"
    else:
        level = "Low"

    return risk_percent, level, reasons


# ------------------------------------------------------------------
# Main function
# ------------------------------------------------------------------

def verify_medicine(db, ocr_results, codes=None):
    """
    db: a SQLAlchemy session.
    ocr_results: list of OCR lines (see ocr_runner.read_image_bytes).
    codes: optional barcodes / QR codes read from the photo
           (see barcode_reader.read_barcodes).
    """

    names, makers = load_known(db)
    parsed = parse_medicine_text(ocr_results, names, makers)

    # Stop early when the photo is not a medicine pack (nothing is saved)
    if not looks_like_medicine_pack(parsed, ocr_results):
        raise NotAMedicinePack()

    checks = {name: None for name in ALL_CHECKS}
    matched = None
    unlisted_batch = False

    # ------------------------------------------------------------------
    # Barcode / QR code: a second source for the batch and expiry.
    # It is compared with the printed text. It only fills a gap when the
    # printed text could not be read, and the response says so.
    # ------------------------------------------------------------------
    code = best_code(codes) if codes else None
    printed_batch = parsed["batch_number"]
    printed_expiry = parsed["expiry_iso"]

    if code:
        if printed_batch and code["batch"]:
            checks["barcode_batch_match"] = same_batch(printed_batch, code["batch"])

        if printed_expiry and code["expiry_iso"]:
            checks["barcode_expiry_match"] = printed_expiry == code["expiry_iso"]

        if not printed_batch and code["batch"]:
            parsed["batch_number"] = code["batch"]
            parsed["batch_source"] = "barcode"

        if not printed_expiry and code["expiry_iso"]:
            parsed["expiry_iso"] = code["expiry_iso"]
            parsed["expiry_date"] = code["expiry_iso"]
            parsed["expiry_source"] = "barcode"

    # Expiry against today's date needs no database
    if parsed["expiry_iso"]:
        checks["expiry_valid"] = parsed["expiry_iso"] >= date.today().strftime("%Y-%m")

    # Is the medicine in the database?
    rows = []

    if parsed["medicine_name"]:
        # Look the name up whichever way it was found: a name read from the
        # pack (brand or ingredient) can still exist in the table.
        rows = find_rows(db, parsed["medicine_name"])
        checks["medicine_found"] = bool(rows)

    if rows:
        candidates = rows

        # Strength (only for rows where the database name has a strength)
        if parsed["strength"]:
            with_strength = [r for r in candidates if r["strength"]]

            if with_strength:
                same = [
                    r for r in with_strength
                    if norm(r["strength"]) == norm(parsed["strength"])
                ]
                checks["strength_match"] = bool(same)
                if same:
                    candidates = same

        # Manufacturer. If it was not read as a line, look for the makers of
        # this medicine (database + catalogue) in the pack text.
        extra_makers = None
        if not parsed["manufacturer"] and ocr_results:
            extra_makers = catalogue_makers(db, parsed, ocr_results)
            known = sorted(
                {r["manufacturer"] for r in candidates if r["manufacturer"]}
                | extra_makers
            )
            found = match_known_makers(ocr_results, known)
            if found:
                parsed["manufacturer"] = found

        if parsed["manufacturer"]:
            same = [
                r for r in candidates
                if same_company(r["manufacturer"], parsed["manufacturer"])
            ]
            if same:
                candidates = same
                checks["manufacturer_match"] = True
            else:
                # The catalogue may list this maker for the same medicine
                if extra_makers is None:
                    extra_makers = catalogue_makers(db, parsed, ocr_results)
                checks["manufacturer_match"] = any(
                    loose_same_company(m, parsed["manufacturer"]) for m in extra_makers
                )

        # Batch number (O/0, I/1 and S/5 slips are allowed)
        if parsed["batch_number"]:
            hits = [
                r for r in candidates
                if same_batch(parsed["batch_number"], r["batch_number"])
            ]
            if hits:
                checks["batch_match"] = True
                matched = hits[0]
            elif any(same_batch(parsed["batch_number"], r["batch_number"]) for r in rows):
                # The batch exists, but under different details: a real mismatch
                checks["batch_match"] = False
            else:
                # The batch is not in our records at all. Our table only holds
                # some batches, so this is "could not verify", not "mismatch".
                unlisted_batch = True

        # Dates are compared with the batch that matched
        if matched:
            if parsed["mfg_date_iso"] and matched["mfg_date"]:
                checks["mfg_date_match"] = (
                    parsed["mfg_date_iso"] == year_month(matched["mfg_date"])
                )

            if parsed["expiry_iso"] and matched["expiry_date"]:
                checks["expiry_match"] = (
                    parsed["expiry_iso"] == year_month(matched["expiry_date"])
                )

    # Product code in the barcode against the code stored for this medicine
    if code and code["gtin"] and rows:
        stored = [r for r in rows if normalize_gtin(r.get("barcode"))]
        if stored:
            checks["barcode_gtin_match"] = any(
                normalize_gtin(r["barcode"]) == code["gtin"] for r in stored
            )

    # Not in the medicines table: try the catalogue (product level only)
    catalogue = None
    if not rows:
        catalogue = lookup_catalogue(db, parsed, ocr_results)

        if catalogue:
            checks["medicine_found"] = True
            checks["strength_match"] = catalogue["strength_match"]
            checks["manufacturer_match"] = catalogue["manufacturer_match"]

    red_flags = [name for name in RED_FLAG_CHECKS if checks[name] is False]

    if red_flags:
        result = "Suspicious"
    elif all(checks[name] is True for name in CORE_CHECKS):
        result = "Match"
    elif (
        (catalogue or unlisted_batch)
        and checks["manufacturer_match"] is True
        and checks["expiry_valid"] is not False
    ):
        # Name, strength and maker match a known medicine, but the catalogue
        # has no batch records, so the batch itself cannot be verified.
        result = "Partial"
    else:
        result = "Inconclusive"

    risk_percent, risk_level, risk_reasons = compute_risk(
        checks,
        catalogue_used=bool(catalogue) or unlisted_batch,
        unlisted_batch=unlisted_batch,
    )

    return {
        "result": result,
        "risk_level": risk_level,
        "risk_percent": risk_percent,
        "risk_reasons": risk_reasons,
        "confidence_score": round(100 - risk_percent, 2),
        "checks": checks,
        "red_flags": red_flags,
        "extracted": parsed,
        "matched_medicine": to_json(matched),
        "catalogue": catalogue,
        "barcode": code,
        "note": NOTE,
    }
