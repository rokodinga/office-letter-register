# Kodinga Range public data

The Range Information Centre uses the normalized public dataset at:

`/data/kodinga-range-information.txt`

The file contains a base64-encoded gzip payload. The application decodes and decompresses it in the browser.

The dataset covers all 29 information sheets from `Kodinga Range Infromation(2).xlsx`. Source sheet names and source Excel row references are preserved in the normalized records for traceability.

Section/Beat filters are deliberately conservative: a record is included in a selected Section or Beat only when the source data provides a matching Section/Beat value. Records without those source fields are not silently attributed to a narrower scope.

The source workbook is not required at runtime and is not committed as a binary file. Viewing is public; Excel export, printing and handbook generation are gated to registered users in the application.
