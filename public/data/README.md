# Kodinga Range public data

The Range Information Centre uses a verified, normalized public dataset derived from `Kodinga Range Infromation(2).xlsx`.

The compressed dataset is stored as five ordered base64 text parts under `/public/data/range-data/`. The application concatenates those parts, decodes the gzip stream, and loads the normalized records in the browser.

## Coverage

- 29 information sheets from the approved workbook
- 1,002 non-empty source-derived records after removing blank rows, serial-only placeholders and total rows
- Source sheet and Excel row references preserved for traceability
- Administrative hierarchy: 2 Sections and 6 Beats
- Range-wide sheets remain available without being silently assigned to a Section or Beat

## Access

Viewing the Range Information Centre is public. Excel export, printing and handbook generation are gated to registered users in the application.

## Updating the data

When a new approved workbook is received, regenerate the normalized dataset and replace the five ordered data parts plus the metadata index. Preserve raw source values and source-row traceability; do not silently correct source spellings.