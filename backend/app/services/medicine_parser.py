import re

try:
    from rapidfuzz import fuzz, process
except ImportError:  # parser still works without fuzzy matching
    fuzz = process = None


# OCR lines below this confidence are ignored
MIN_CONFIDENCE = 0.30

# A line must be this many times taller than the typical line
# to count as a prominent title (brand / product name)
PROMINENT_RATIO = 1.5

MONTHS = "JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC"

MONTH_NUMBERS = {
    "JAN": 1, "FEB": 2, "MAR": 3, "APR": 4, "MAY": 5, "JUN": 6,
    "JUL": 7, "AUG": 8, "SEP": 9, "OCT": 10, "NOV": 11, "DEC": 12,
}

# OCR often reads the digit 0 as the letter O (and 1 as I or L) inside dates
DIGIT_FIX = str.maketrans({"O": "0", "I": "1", "L": "1"})

# Matches dates such as 12/08/2025, 2025-08-12, 08/2027, 08.2027 or AUG 2027
DATE_VALUE = (
    r"([\dOIl]{4}[\/\-\.][\dOIl]{1,2}(?:[\/\-\.][\dOIl]{1,2})?(?![\dOIl])"
    r"|[\dOIl]{1,2}[\/\-\.][\dOIl]{1,2}[\/\-\.][\dOIl]{2,4}"
    r"|[\dOIl]{1,2}[\/\-\.][\dOIl]{2,4}"
    rf"|[\dOIl]{{1,2}}[\s\-\/\.]+(?:{MONTHS})[A-Z]*\.?[\s\-\/,]*[\dOIl]{{2,4}}"
    rf"|(?:{MONTHS})[A-Z]*\.?[\s\-\/]*[\dOIl]{{2,4}})"
)

# Stock-photo watermarks and web text that are never part of a label.
# (A photo from alamy.com made "alamy" look like the medicine name.)
WATERMARK = re.compile(
    r"alamy|shutterstock|dreamstime|istock|getty|adobe\s*stock|123rf|"
    r"depositphotos|\bwww\b|\.com\b|\bcom\b|image\s*id",
    re.IGNORECASE
)

# Words that end a company name (Pharma, Ltd, Laboratories ...)
COMPANY_WORD = re.compile(
    r"\b(?:Pharmaceuticals?|Pharma|Laboratories|Labs?|Healthcare|"
    r"Lifesciences?|Remedies|Drugs|Industries|Limited|Ltd\.?|Pvt\.?)"
    r"(?![A-Za-z])",
    re.IGNORECASE
)

# 'Manufactured in India by' / 'Marketed by'.
# The word is matched loosely because OCR often misreads a letter
# (for example 'Manulactured').
BY_PATTERN = (
    r"(?:(?:manu\w{2,12}|market\w{2,8}|mfd\.?|mfg\.?)"
    r"\s*[:.]?\s*(?:in\s+\w+\s+)?by\b"
    r"|\bin\s+india\s+by\b)"
)

# A strength on its own line, for example '5 mg'
STRENGTH_ONLY = re.compile(
    r"^\d+(?:\.\d+)?\s*(?:mg|mcg|g|kg|ml|iu)\.?$",
    re.IGNORECASE
)

# A strength anywhere in a line, for example '500 mg'
STRENGTH_ANYWHERE = re.compile(
    r"\b\d+(?:\.\d+)?\s*(?:mg|mcg|g|kg|ml|iu)\b\.?",
    re.IGNORECASE
)

# Pharmacopoeia marks printed after a name: IP, I.P., BP, USP.
# OCR often reads "I.P." as "LP".
PHARMACOPOEIA_SUFFIX = re.compile(
    r"[\s,]+(?:I\.?\s?P|L\.?\s?P|B\.?\s?P|U\.?S\.?P)\.?\s*$",
    re.IGNORECASE
)


def clean_name(text):
    """'Calcium Carbonate IP 500 mg' -> 'Calcium Carbonate'"""

    name = STRENGTH_ANYWHERE.sub(" ", text)
    name = re.sub(r"\s+", " ", name).strip(" .,:;-")
    name = PHARMACOPOEIA_SUFFIX.sub("", name).strip(" .,:;-")

    return name


def tidy_name(text):
    """clean_name(), but never return an empty name."""

    return clean_name(text) or text.strip()


# OCR lines containing these are not the medicine name
NON_NAME_PHRASES = [
    "MANUFACTURED",
    "MARKETED",
    "COMPOSITION",
    "EACH",
    "CONTAINS",
    "STORE",
    "KEEP",
    "DOSAGE",
    "PROTECT",
    "WARNING",
    "CAUTION",
    "SCHEDULE",
    "PRESCRIPTION",
    "PHYSICIAN",
    "DIRECTED",
    "COLOUR",
    "COLOR",
    "EXCIPIENT",
    "REACH OF",
    "CHILDREN",
    "EQUIVALENT",
    "PER STRIP",
    "INCL",
    "TAXES",
    "REGISTERED",
    "TRADEMARK",
    "BATCH",
    "B.NO",
    "MRP",
    "M.R.P",
    "MFG",
    "MFD",
    "EXPIRY",
    "EXP.",
]

# Single words that are never the medicine name
IGNORED_WORDS = {
    "TABLET",
    "TABLETS",
    "CAPSULE",
    "CAPSULES",
    "SYRUP",
    "SUSPENSION",
    "INJECTION",
    "CREAM",
    "GEL",
    "OINTMENT",
    "ORAL",
    "SOLUTION",
    "PAIN",
    "RELIEF",
    "MEDICINE",
    "PHARMACEUTICAL",
    "PHARMA",
    "IP",
}

# Ordinary words found in label sentences. A line made only of
# these words (for example 'dry' or 'Store in a cool and') is
# label text, not a medicine name.
COMMON_WORDS = {
    "a", "an", "and", "or", "to", "of", "the", "in", "by", "for", "with",
    "as", "at", "on", "from", "out", "is", "be", "not", "do", "only",
    "dry", "cool", "place", "store", "stored", "light", "sunlight",
    "direct", "moisture", "heat", "humidity", "away", "below", "above",
    "protect", "keep", "reach", "children", "directed", "physician",
    "dosage", "each", "contains", "film", "coated", "tablet", "tablets",
    "capsule", "capsules", "use", "see", "leaflet", "strip", "per",
    "incl", "all", "taxes", "tax", "date", "batch", "expiry", "mfg",
    "mrp", "no", "colours", "colour", "colors", "color", "under",
    "supervision", "registered", "medical", "practitioner",
    "prescription", "sold", "retail", "without", "schedule", "warning",
    "caution", "exceed", "recommended", "dose", "temperature",
    "degrees", "shake", "well", "before", "after", "food", "meals",
}

# Advertising words printed on packs. They are never the product name.
MARKETING_WORDS = {
    "swallow", "effective", "fast", "quick", "relief", "pain", "fever",
    "headache", "easy", "acting", "action", "safe", "gentle", "new",
    "extra", "advanced", "strong", "trusted", "total", "complete",
}

# A line starting with one of these words is a continuation line
CONTINUATION_WORDS = {
    "and", "or", "to", "of", "the", "per", "in", "with", "for", "each",
}


# ------------------------------------------------------------------
# Main entry point
# ------------------------------------------------------------------

def parse_medicine_text(ocr_results, known_names=None, known_manufacturers=None):
    """
    Convert raw OCR results into structured medicine information.

    ocr_results: list of dicts with "text", "confidence", "bounding_box".
    known_names / known_manufacturers: optional lists loaded from the
    medicines table. When given, misspelt OCR text ("PARACITAMOL") is
    matched to the database spelling ("Paracetamol").
    """

    # Keep only reasonably confident, non-empty, non-watermark lines
    good_items = [
        item
        for item in ocr_results
        if item["confidence"] >= MIN_CONFIDENCE
        and item["text"].strip()
        and not WATERMARK.search(item["text"])
    ]

    # Combine all OCR text
    full_text = " ".join(
        item["text"].strip()
        for item in good_items
    )

    medicine_data = {
        "medicine_name": None,
        "name_source": None,      # database / title / composition / guess
        "strength": None,
        "batch_number": None,
        "manufacturer": None,
        "mfg_date": None,         # as printed, e.g. "AUG 2026"
        "mfg_date_iso": None,     # normalised, e.g. "2026-08"
        "expiry_date": None,      # as printed
        "expiry_iso": None,       # normalised, e.g. "2028-05"
        "mrp": None
    }

    # --------------------------------
    # 1. STRENGTH
    # --------------------------------

    match = re.search(
        r"\b\d+(?:\.\d+)?\s*(?:mg|mcg|g|kg|ml|iu)\b",
        full_text,
        re.IGNORECASE
    )

    # ORS powders and similar sachets list several ingredient weights, and the
    # weight of the whole sachet is not a strength, so no single strength is chosen.
    is_sachet = re.search(r"\bsache[t:]", full_text, re.IGNORECASE)

    if match and not is_sachet:
        medicine_data["strength"] = match.group(0)

    # --------------------------------
    # 2. BATCH NUMBER
    # The value must contain at least one digit.
    # --------------------------------

    match = re.search(
        r"\b(?:batch\s*(?:no|number)?|b\.?\s*no|lot\s*(?:no|number)?)"
        r"\.?\s*[:\-]?\s*"
        r"(?:[a-z]{1,2}(?=[\s.:,\-])[.:,\-]?\s*)?"
        r"(?=[A-Z0-9\/\-]*\d)([A-Z0-9][A-Z0-9\/\-]{2,})",
        full_text,
        re.IGNORECASE
    )

    if match:
        medicine_data["batch_number"] = match.group(1)

    # --------------------------------
    # 3. MRP
    # --------------------------------

    medicine_data["mrp"] = find_mrp(full_text)

    # --------------------------------
    # 4. MANUFACTURING DATE
    # 'D\w{2,3}' also accepts OCR slips such as 'Dale' for 'Date'.
    # --------------------------------

    match = re.search(
        r"\b(?:[MN][FI]G|MFD|MANUFACTURING|MANUFACTURED)\.?"
        r"\s*[:\-]?\s*(?:D\w{2,3})?\.?\s*[:\-]?\s*"
        + DATE_VALUE,
        full_text,
        re.IGNORECASE
    )

    if match:
        medicine_data["mfg_date"] = match.group(1)
        medicine_data["mfg_date_iso"] = normalize_date(match.group(1))

    # --------------------------------
    # 5. EXPIRY DATE
    # --------------------------------

    match = re.search(
        r"\b(?:EXPIRY|EXPIRES|EXP|USE\s*BEFORE)\.?"
        r"\s*[:\-]?\s*(?:D\w{2,3})?\.?\s*[:\-]?\s*"
        + DATE_VALUE,
        full_text,
        re.IGNORECASE
    )

    if match:
        medicine_data["expiry_date"] = match.group(1)
        medicine_data["expiry_iso"] = normalize_date(match.group(1))

    # --------------------------------
    # 6. MANUFACTURER
    # --------------------------------

    manufacturer = find_manufacturer(good_items, full_text)

    if manufacturer:
        manufacturer = snap_to_known(manufacturer, known_manufacturers)
    elif known_manufacturers:
        manufacturer = match_known_makers(good_items, known_manufacturers)

        if not manufacturer:
            manufacturer = match_known(good_items, known_manufacturers, cutoff=88)

    medicine_data["manufacturer"] = manufacturer

    # --------------------------------
    # 7. MEDICINE NAME
    # Database spelling wins; otherwise use the layout heuristics.
    # --------------------------------

    db_name = match_known(good_items, known_names, cutoff=82)

    if db_name:
        medicine_data["medicine_name"] = db_name
        medicine_data["name_source"] = "database"
    else:
        name, source = find_medicine_name(good_items, medicine_data)
        medicine_data["medicine_name"] = name
        medicine_data["name_source"] = source

    return medicine_data


# ------------------------------------------------------------------
# Dates
# ------------------------------------------------------------------

def normalize_date(value):
    """
    Turn '05/2028', '12/08/2025', '2025-08-12', 'AUG 2027' or '08-27' into
    'YYYY-MM' so dates can be compared and checked for expiry.
    Returns None if the value is not a valid month/year.
    """

    if not value:
        return None

    s = value.upper().strip()

    # "28 AUG 2025" -> "AUG 2025" (the day is not needed, only month and year)
    day_first = re.match(
        r"^[\dOIL]{1,2}[\s\-\/\.]+([A-Z]{3})[A-Z]*\.?[\s\-\/,]*([\dOIL]{2,4})$", s
    )

    if day_first:
        s = f"{day_first.group(1)} {day_first.group(2)}"

    match = re.match(r"^([A-Z]{3})[A-Z]*\.?[\s\-\/]*([\dOIL]{2,4})$", s)

    if match and match.group(1) in MONTH_NUMBERS:
        month = MONTH_NUMBERS[match.group(1)]
        year = match.group(2).translate(DIGIT_FIX)
    else:
        parts = re.split(r"[\/\-\.]", s.translate(DIGIT_FIX))

        if len(parts) in (2, 3) and len(parts[0].strip()) == 4:
            year, month = parts[0], parts[1]       # yyyy-mm or yyyy-mm-dd
        elif len(parts) == 3:      # dd/mm/yyyy
            month, year = parts[1], parts[2]
        elif len(parts) == 2:      # mm/yyyy
            month, year = parts[0], parts[1]
        else:
            return None

        if not (month.strip().isdigit() and year.strip().isdigit()):
            return None

        month = int(month)

    year = int(year)

    if year < 100:
        year += 2000

    if not (1 <= month <= 12) or not (2000 <= year <= 2100):
        return None

    return f"{year:04d}-{month:02d}"


# ------------------------------------------------------------------
# Fuzzy matching against the database
# ------------------------------------------------------------------

def match_known(items, known, cutoff=82):
    """
    Find the OCR text that best matches a name from the database.
    Tries each whole line and each long word in it, so
    'PARACITAMOL TABLETS' still matches 'Paracetamol'.
    Returns the database spelling, or None if nothing is close.
    """

    if not known or process is None:
        return None

    lookup = {k.upper(): k for k in known if k}
    keys = list(lookup)

    best = None  # (score, database name)

    for item in items:

        text = item["text"].upper()

        pieces = [" ".join(re.findall(r"[A-Z0-9]+", text))]

        # the same line without strength and IP/BP/USP, so
        # 'CALCIUM CARBONATE IP 500 MG' can match 'Calcium Carbonate'
        cleaned = " ".join(re.findall(r"[A-Z0-9]+", clean_name(text).upper()))

        if cleaned and cleaned not in pieces:
            pieces.append(cleaned)

        pieces += re.findall(r"[A-Z]{5,}", text)

        for piece in pieces:

            if len(piece) < 5:
                continue

            result = process.extractOne(
                piece, keys, scorer=fuzz.ratio, score_cutoff=cutoff
            )

            if result and (best is None or result[1] > best[0]):
                best = (result[1], lookup[result[0]])

    return best[1] if best else None


COMPANY_ENDINGS = {"ltd", "limited", "pvt", "private", "inc", "llp"}

# Words that start many company names but are not a company on their own
NOT_COMPANY_WORDS = {
    "tablets", "tablet", "capsules", "capsule", "pharma", "pharmaceuticals",
    "pharmaceutical", "laboratories", "healthcare", "medicine", "limited",
    "batch", "expiry", "manufactured", "marketed", "storage",
}


def maker_key(value):
    """Company name in lower case, without punctuation and Ltd / Limited / Pvt."""
    words = re.findall(r"[a-z0-9]+", str(value or "").lower())
    return "".join(w for w in words if w not in COMPANY_ENDINGS)


def match_known_makers(items, known):
    """
    Find a manufacturer from the database in the OCR lines.

    Each line is tried on its own and also joined with the line below it,
    because packs often split a name over two lines:
    'Sun Pharmaceutical' + 'Industries Ltd.', or 'Torrent' + 'Pharmaceuticals'.
    'Cipla' matches 'Cipla Ltd.' because Ltd / Limited / Pvt are ignored.
    Returns the database spelling, or None.
    """

    if not known or process is None:
        return None

    keys = {}
    for name in known:
        key = maker_key(name)
        if len(key) >= 4:
            keys.setdefault(key, name)

    if not keys:
        return None

    ordered = sorted(
        (i for i in items if i["text"].strip()),
        key=lambda i: (box_top_left_height(i)[0], box_top_left_height(i)[1]),
    )

    candidates = [i["text"] for i in ordered]
    candidates += [
        f"{a['text']} {b['text']}" for a, b in zip(ordered, ordered[1:])
    ]

    best = None  # (score, database name)

    for text in candidates:
        key = maker_key(text)

        if len(key) < 4:
            continue

        result = process.extractOne(
            key, list(keys), scorer=fuzz.ratio, score_cutoff=90
        )

        if result and (best is None or result[1] > best[0]):
            best = (result[1], keys[result[0]])

        # A line with just the company's first word ("Alembic") is enough
        if len(key) >= 5 and key not in NOT_COMPANY_WORDS:
            for known_key, known_name in keys.items():
                if known_key.startswith(key) and (best is None or best[0] < 92):
                    best = (92, known_name)
                    break

    return best[1] if best else None


def snap_to_known(value, known, cutoff=85):
    """
    Replace a manufacturer read by OCR with the database spelling
    when it is close enough; otherwise keep what OCR read.
    """

    if not value or not known or process is None:
        return value

    lookup = {k.upper(): k for k in known if k}

    result = process.extractOne(
        value.upper(), list(lookup), scorer=fuzz.WRatio, score_cutoff=cutoff
    )

    return lookup[result[0]] if result else value


# ------------------------------------------------------------------
# MRP
# ------------------------------------------------------------------

def find_mrp(full_text):
    """
    Find the MRP value.

    OCR often misreads the rupee sign as a digit (for example
    'MRP Rs:' becomes 'MRP 7:'). To avoid reporting a wrong
    price, a value with no currency marker is only accepted
    when it has two or more digits or a decimal point, and a
    value followed by a colon is never accepted.
    """

    pattern = re.compile(
        r"\bM\.?\s*R\.?\s*P\.?\s*[:\-]?\s*"
        r"(Rs\.?|₹|INR)?\s*[:\-]?\s*"
        r"(\d+(?:\.\d{1,2})?)(?!\s*:)",
        re.IGNORECASE
    )

    for match in pattern.finditer(full_text):

        has_currency = match.group(1) is not None
        value = match.group(2)

        is_plausible = (
            has_currency
            or "." in value
            or len(value) >= 2
        )

        if is_plausible:
            return float(value)

    return None


# ------------------------------------------------------------------
# Layout helpers
# ------------------------------------------------------------------

def box_top_left_height(item):
    """
    Top, left and height of an OCR text box.
    """

    box = item.get("bounding_box") or []

    if not box:
        return 0, 0, 1

    xs = [point[0] for point in box]
    ys = [point[1] for point in box]

    return min(ys), min(xs), max(1, max(ys) - min(ys))


# ------------------------------------------------------------------
# Manufacturer
# ------------------------------------------------------------------

def company_from_text(text):
    """
    Read a company name from text like
    'Manufactured by: Some Pharma Ltd'. Returns None if the
    text does not contain one.
    """

    match = re.search(
        BY_PATTERN
        + r"\s*[:\-]?\s*"
        r"((?:[A-Za-z&.\-']+\s+){0,3}?"
        r"(?:Pharmaceuticals?|Pharma|Laboratories|Labs?|Healthcare|"
        r"Lifesciences?|Remedies|Drugs|Industries|Limited|Ltd\.?|Pvt\.?)"
        r"(?![A-Za-z])"
        r"(?:\s+(?:Pvt\.?|Ltd\.?|Limited|Private|International|India)"
        r"(?![A-Za-z]))*)",
        text,
        re.IGNORECASE
    )

    if match:
        return match.group(1).strip()

    return None


def find_manufacturer(items, full_text):
    """
    Find the manufacturer name.

    For each 'Manufactured by' line:
      a) if the company name is on the same line, use it;
      b) otherwise use the company line just below it in the
         same column (this also works when the left and right
         columns of a box are read in mixed order).
    As a last resort the joined text is searched.
    """

    for ref in items:

        if not re.search(BY_PATTERN, ref["text"], re.IGNORECASE):
            continue

        # a) company on the same line
        same_line = company_from_text(ref["text"])

        if same_line:
            return same_line

        # b) company line below, in the same column
        ref_top, ref_left, ref_height = box_top_left_height(ref)

        best = None

        for candidate in items:

            if candidate is ref:
                continue

            if not COMPANY_WORD.search(candidate["text"]):
                continue

            top, left, _ = box_top_left_height(candidate)

            distance_down = top - ref_top

            # must be just below (or on the same line as) 'Manufactured by'
            if distance_down < -ref_height * 0.5:
                continue

            if distance_down > ref_height * 6:
                continue

            # must be in the same column
            if abs(left - ref_left) > ref_height * 4:
                continue

            if best is None or abs(distance_down) < best[0]:
                best = (abs(distance_down), candidate)

        if best:
            return best[1]["text"].strip().rstrip(",;:")

    # last resort: search the joined text
    return company_from_text(full_text)


# ------------------------------------------------------------------
# Medicine name (layout heuristics, used when the database has no match)
# ------------------------------------------------------------------

def looks_like_name_line(text):
    """
    Quick checks that rule out lines which cannot be a
    medicine name (addresses, sentences, company names ...).
    """

    text = text.strip()
    upper = text.upper()

    # Skip very short text
    if len(text) < 3:
        return False

    # Skip common package words
    if upper in IGNORED_WORDS:
        return False

    # Skip label sentences (composition, storage, dates ...)
    if any(phrase in upper for phrase in NON_NAME_PHRASES):
        return False

    # Skip company names
    if COMPANY_WORD.search(text):
        return False

    # Skip a strength on its own, such as '5 mg'
    if STRENGTH_ONLY.match(text):
        return False

    # Names rarely contain commas, colons or many digits
    # (addresses, licence numbers and label fields do)
    if "," in text or ":" in text:
        return False

    # Digits that belong to a strength ("500 mg") do not count against a name
    no_strength = STRENGTH_ANYWHERE.sub(" ", text)

    if sum(char.isdigit() for char in no_strength) >= 3:
        return False

    # Skip text that is mostly numbers
    if sum(char.isdigit() for char in no_strength) > len(no_strength) / 2:
        return False

    words = re.findall(r"[A-Za-z]+", text)

    if not words:
        return False

    # Skip lines made only of ordinary label or advertising words
    if all(
        word.lower() in COMMON_WORDS or word.lower() in MARKETING_WORDS
        for word in words
    ):
        return False

    # A single very short word is not a reliable name
    if len(words) == 1 and len(words[0]) < 4:
        return False

    # Skip continuation lines such as 'and Titanium Dioxide IP'
    if text.split()[0].lower() in CONTINUATION_WORDS:
        return False

    return True


def find_composition_name(items):
    """
    Find the active ingredient: the line just below
    'Each ... tablet contains:' in the same column.
    Used when the package has no prominent brand name,
    for example on the back of a box.
    """

    for ref in items:

        if not re.search(r"\bcontains?\b", ref["text"], re.IGNORECASE):
            continue

        ref_top, ref_left, ref_height = box_top_left_height(ref)

        best = None

        for candidate in items:

            if candidate is ref:
                continue

            if not looks_like_name_line(candidate["text"]):
                continue

            top, left, _ = box_top_left_height(candidate)

            distance_down = top - ref_top

            # must be below the 'contains' line, but not far below
            if distance_down <= ref_height * 0.3:
                continue

            if distance_down > ref_height * 5:
                continue

            # must be in the same column
            if abs(left - ref_left) > ref_height * 4:
                continue

            if best is None or distance_down < best[0]:
                best = (distance_down, candidate)

        if best:
            return tidy_name(best[1]["text"])

    return None


def find_medicine_name(items, medicine_data):
    """
    Choose the medicine name. Returns (name, source).

    1. A clearly prominent title (much taller text than the rest
       of the package) is the brand / product name.
    2. Otherwise use the active ingredient listed under
       'Each tablet contains:'.
    3. Otherwise use the best remaining candidate, but only if
       the OCR is fairly confident about it.
    """

    manufacturer = medicine_data["manufacturer"]

    candidates = []

    for item in items:

        text = item["text"].strip()

        if not looks_like_name_line(text):
            continue

        # Skip the manufacturer line
        if manufacturer and manufacturer.upper() in text.upper():
            continue

        _, _, height = box_top_left_height(item)

        candidates.append(
            (height * item["confidence"], height, item)
        )

    composition_name = find_composition_name(items)

    if not candidates:
        if composition_name:
            return composition_name, "composition"
        return None, None

    # Typical text height on this package
    heights = sorted(
        box_top_left_height(item)[2] for item in items
    )

    median_height = heights[len(heights) // 2]

    best_score, best_height, best_item = max(
        candidates,
        key=lambda entry: entry[0]
    )

    # 1. prominent title
    if best_height >= PROMINENT_RATIO * median_height:
        return tidy_name(best_item["text"]), "title"

    # 2. active ingredient
    if composition_name:
        return composition_name, "composition"

    # 3. best remaining candidate, if the OCR is fairly sure
    if best_item["confidence"] >= 0.5:
        return tidy_name(best_item["text"]), "guess"

    return None, None


# ------------------------------------------------------------------
# Batch comparison (for the database check)
# ------------------------------------------------------------------

BATCH_FIX = str.maketrans({"O": "0", "I": "1", "S": "5"})


def batch_key(value):
    """
    Comparison key for a batch number. Ignores case, spaces and
    dashes, and treats O/0, I/1 and S/5 as the same character,
    because OCR confuses them. Use it only to COMPARE batches;
    never save the converted value as the batch number.
    """

    if not value:
        return None

    return re.sub(r"[^A-Z0-9]", "", value.upper()).translate(BATCH_FIX)


def same_batch(ocr_batch, db_batch):
    """True if two batch numbers match after allowing OCR slips."""

    if not ocr_batch or not db_batch:
        return False

    return batch_key(ocr_batch) == batch_key(db_batch)
