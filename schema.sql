-- Instruments table
CREATE TABLE instruments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    symbol TEXT,
    sector TEXT
);

-- Price entries table
CREATE TABLE price_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    instrument_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    buy_price REAL,
    current_price REAL,
    shares REAL,
    FOREIGN KEY (instrument_id) REFERENCES instruments(id)
);
